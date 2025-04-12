import os
import re
import logging
from functools import lru_cache
from typing import Optional, List, Dict, Any, Union, Tuple
import json

from fastapi import FastAPI, Request, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ee
from ee_utils import get_tile_url, process_time_series, get_admin_boundary  # Import additional functions
from langchain_ollama import OllamaLLM
from dotenv import load_dotenv
import google.auth.credentials
import datetime
from starlette.middleware.sessions import SessionMiddleware

from authenticate_ee import initialize_ee
from database import (
    connect_to_mongodb, close_mongodb_connection, 
    save_analysis_result, save_layer, get_user_analyses, get_user_layers,
    save_custom_area, AnalysisResult as DBAnalysisResult,
    SavedLayer as DBSavedLayer, TimeSeriesAnalysis, CustomArea
)

# Load environment variables
load_dotenv()

# Override project ID - force use of the correct one
os.environ['EE_PROJECT_ID'] = 'ee-khalilzaryani007'

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# FastAPI app setup
app = FastAPI(
    title="Earth Engine Map App",
    description="A web app for visualizing Earth Engine data",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Middleware
# Update CORS configuration in app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SECRET_KEY", "a-very-secret-key"),
    max_age=3600,
    same_site="lax"
)

# Static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Project ID
PROJECT_ID = 'ee-khalilzaryani007'  # Hardcoded to ensure correct value
if not PROJECT_ID:
    logging.warning("EE_PROJECT_ID environment variable is not set!")

# Global variables
EE_INITIALIZED = False
EE_INITIALIZATION_ERROR = None
LLM_INITIALIZED = False
LLM_INITIALIZATION_ERROR = None
llm = None  # Global LLM instance
DB_INITIALIZED = False
DB_INITIALIZATION_ERROR = None

# Pydantic Models
class LayerInfo(BaseModel):
    id: str
    tile_url: str
    location: str
    processing_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opacity: float = 0.8
    visibility: str = "visible"

class AnalysisRequest(BaseModel):
    prompt: str
    user_id: Optional[str] = None
    save_result: bool = True

class TimeSeriesRequest(BaseModel):
    location: str
    processing_type: str
    start_date: str
    end_date: str
    interval: str = "monthly"
    user_id: Optional[str] = None

class CustomAreaRequest(BaseModel):
    name: str
    description: Optional[str] = None
    geometry: Dict[str, Any]  # GeoJSON geometry
    user_id: Optional[str] = None

class ComparisonRequest(BaseModel):
    location: str
    processing_type: str
    date1: str
    date2: str
    user_id: Optional[str] = None

class AnalysisResult(BaseModel):
    location: str
    processing_type: str
    satellite: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    year: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


@app.on_event("startup")
async def startup_event():
    """Initialize Earth Engine, LLM, and MongoDB on startup."""
    global EE_INITIALIZED, EE_INITIALIZATION_ERROR, LLM_INITIALIZED, LLM_INITIALIZATION_ERROR, llm, DB_INITIALIZED, DB_INITIALIZATION_ERROR
    
    # Initialize Earth Engine
    if PROJECT_ID:
        try:
            success, error = initialize_ee()
            EE_INITIALIZED = success
            EE_INITIALIZATION_ERROR = error
            if success:
                logging.info("Earth Engine initialized successfully")
            else:
                logging.error(f"Earth Engine initialization failed: {error}")
        except Exception as e:
            EE_INITIALIZED = False
            EE_INITIALIZATION_ERROR = str(e)
            logging.error(f"Earth Engine initialization failed: {e}")
    else:
        logging.error("EE_PROJECT_ID not set")
        EE_INITIALIZED = False
        EE_INITIALIZATION_ERROR = "EE_PROJECT_ID not set"

    # Initialize LLM
    try:
        ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        llm = OllamaLLM(model="gemma2:2b", base_url=ollama_base_url)
        LLM_INITIALIZED = True
        logging.info("LLM initialized successfully")
    except Exception as e:
        LLM_INITIALIZED = False
        LLM_INITIALIZATION_ERROR = str(e)
        logging.error(f"LLM initialization failed: {e}")
    
    # Initialize MongoDB connection
    try:
        db_success = await connect_to_mongodb()
        DB_INITIALIZED = db_success
        if db_success:
            logging.info("MongoDB connection established successfully")
        else:
            DB_INITIALIZATION_ERROR = "Failed to connect to MongoDB"
            logging.error(DB_INITIALIZATION_ERROR)
    except Exception as e:
        DB_INITIALIZED = False
        DB_INITIALIZATION_ERROR = str(e)
        logging.error(f"MongoDB connection failed: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown."""
    await close_mongodb_connection()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    status = "ok"
    diagnostics = {
        "ee_initialized": EE_INITIALIZED,
        "ee_error": EE_INITIALIZATION_ERROR,
        "llm_initialized": LLM_INITIALIZED,
        "llm_error": LLM_INITIALIZATION_ERROR,
        "db_initialized": DB_INITIALIZED,
        "db_error": DB_INITIALIZATION_ERROR,
        "project_id_set": PROJECT_ID is not None,
        "version": "1.0.0",
        "ollama_base_url": os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    }
    if not all([EE_INITIALIZED, LLM_INITIALIZED, PROJECT_ID, DB_INITIALIZED]):
        status = "degraded"
    return {"status": status, "diagnostics": diagnostics}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Render the home page."""
    layers = request.session.get("layers", [])
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "tile_url": None, 
        "location": None, 
        "error_message": None, 
        "prompt": None, 
        "layers": json.dumps(layers), 
        "latitude": None, 
        "longitude": None
    })


async def check_services():
    """Check service availability."""
    errors = []
    if not EE_INITIALIZED:
        errors.append(f"Earth Engine unavailable: {EE_INITIALIZATION_ERROR}")
    if not LLM_INITIALIZED:
        errors.append(f"LLM unavailable: {LLM_INITIALIZATION_ERROR}")
    if not DB_INITIALIZED:
        errors.append(f"Database unavailable: {DB_INITIALIZATION_ERROR}")
    return errors


@app.post("/", response_class=HTMLResponse)
async def process_prompt(request: Request, prompt: str = Form(...)):
    """Process user prompt and generate map response."""
    tile_url = location = error_message = satellite = start_date = end_date = processing_type = year = latitude = longitude = None
    layers = request.session.get("layers", [])

    if not prompt.strip():
        error_message = "Please enter a valid prompt."
        return templates.TemplateResponse("index.html", {
            "request": request, 
            "tile_url": tile_url, 
            "location": location, 
            "error_message": error_message, 
            "prompt": prompt, 
            "layers": json.dumps(layers), 
            "latitude": latitude, 
            "longitude": longitude
        })

    service_errors = await check_services()
    if service_errors:
        error_message = " ".join(service_errors)
        return templates.TemplateResponse("index.html", {
            "request": request, 
            "tile_url": tile_url, 
            "location": location, 
            "error_message": error_message, 
            "prompt": prompt, 
            "layers": json.dumps(layers), 
            "latitude": latitude, 
            "longitude": longitude
        })

    try:
        # Analyze the prompt using LLM
        analysis_result = await analyze_prompt(prompt)
        if analysis_result:
            location, processing_type, satellite, start_date, end_date, year, latitude, longitude = (
                analysis_result.location, analysis_result.processing_type, analysis_result.satellite,
                analysis_result.start_date, analysis_result.end_date, analysis_result.year,
                analysis_result.latitude, analysis_result.longitude
            )
            logging.info(f"Analysis: location={location}, type={processing_type}, sat={satellite}, dates={start_date}-{end_date}, year={year}, lat={latitude}, lon={longitude}")
            
            if not PROJECT_ID:
                error_message = "EE_PROJECT_ID not set."
                return templates.TemplateResponse("index.html", {
                    "request": request, 
                    "tile_url": tile_url, 
                    "location": location, 
                    "error_message": error_message, 
                    "prompt": prompt, 
                    "layers": json.dumps(layers), 
                    "latitude": latitude, 
                    "longitude": longitude
                })

            # Get the tile URL
            tile_url = get_tile_url(
                location, processing_type, PROJECT_ID, satellite, start_date, end_date, 
                year, latitude, longitude, llm, LLM_INITIALIZED
            )
            
            if tile_url is None:
                error_message = f"Error fetching image for {location} ({processing_type})."
            else:
                # Add a new layer
                layer_id = f"{location.replace(' ', '_')}_{processing_type}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
                new_layer = {
                    'id': layer_id, 
                    'tile_url': tile_url, 
                    'location': location, 
                    'processing_type': processing_type, 
                    "latitude": latitude, 
                    "longitude": longitude,
                    "opacity": 0.8,
                    "visibility": "visible"
                }
                layers.append(new_layer)
                request.session["layers"] = layers
                
                # Save analysis result and layer to database
                if DB_INITIALIZED:
                    analysis_data = {
                        "prompt": prompt,
                        "location": location,
                        "processing_type": processing_type,
                        "satellite": satellite,
                        "start_date": start_date,
                        "end_date": end_date,
                        "year": year,
                        "latitude": latitude,
                        "longitude": longitude,
                        "tile_url": tile_url
                    }
                    analysis_id = await save_analysis_result(analysis_data)
                    
                    if analysis_id:
                        layer_data = {
                            "name": f"{location} {processing_type}",
                            "location": location,
                            "processing_type": processing_type,
                            "tile_url": tile_url,
                            "latitude": latitude,
                            "longitude": longitude,
                            "analysis_id": analysis_id
                        }
                        await save_layer(layer_data)
        else:
            error_message = "Failed to analyze prompt."
    except Exception as e:
        error_message = f"Error processing prompt: {e}"
        logging.exception("Error processing prompt")

    return templates.TemplateResponse("index.html", {
        "request": request, 
        "tile_url": tile_url, 
        "location": location, 
        "error_message": error_message, 
        "prompt": prompt, 
        "layers": json.dumps(layers), 
        "latitude": latitude, 
        "longitude": longitude
    })


@app.options("/api/analyze")
async def options_analyze():
    """Handle OPTIONS requests for the /api/analyze endpoint."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


@app.post("/api/analyze", response_model=ApiResponse)
async def api_analyze_prompt(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """API endpoint to analyze prompt."""
    if errors := await check_services():
        return ApiResponse(success=False, message=" ".join(errors))

    try:
        analysis_result = await analyze_prompt(request.prompt)
        if not analysis_result:
            return ApiResponse(success=False, message="Failed to analyze prompt.")
        
        data = analysis_result.dict()
        data["tile_url"] = get_tile_url(
            data["location"], data["processing_type"], PROJECT_ID, 
            data.get("satellite"), data.get("start_date"), data.get("end_date"), 
            data.get("year"), data.get("latitude"), data.get("longitude"), 
            llm, LLM_INITIALIZED
        )
        
        if data["tile_url"] is None:
            return ApiResponse(success=False, message="Error fetching image.")
            
        # Save analysis and layer to database if requested
        if request.save_result and DB_INITIALIZED:
            background_tasks.add_task(
                save_analysis_and_layer,
                request.prompt,
                data,
                request.user_id
            )
            
        return ApiResponse(success=True, message="Analysis complete", data=data)
    except Exception as e:
        return ApiResponse(success=False, message=f"Error: {e}")


@app.post("/api/time-series", response_model=ApiResponse)
async def create_time_series(request: TimeSeriesRequest):
    """API endpoint to create a time series analysis."""
    if errors := await check_services():
        return ApiResponse(success=False, message=" ".join(errors))
    
    try:
        # Get admin boundary
        geometry = get_admin_boundary(
            request.location, request.start_date, request.end_date, 
            None, None, llm, LLM_INITIALIZED
        )
        
        if not geometry:
            return ApiResponse(success=False, message=f"Could not find location: {request.location}")
        
        # Process time series
        result = process_time_series(
            geometry, request.processing_type, request.start_date, 
            request.end_date, request.interval, PROJECT_ID
        )
        
        if not result:
            return ApiResponse(success=False, message="Failed to process time series.")
            
        # Save to database
        if DB_INITIALIZED:
            time_series = TimeSeriesAnalysis(
                user_id=request.user_id,
                location=request.location,
                processing_type=request.processing_type,
                start_date=request.start_date,
                end_date=request.end_date,
                interval=request.interval,
                results=result
            )
            await time_series.insert()
            
        return ApiResponse(success=True, message="Time series created", data={
            "location": request.location,
            "processing_type": request.processing_type,
            "results": result
        })
    except Exception as e:
        logging.exception("Error creating time series")
        return ApiResponse(success=False, message=f"Error: {e}")


@app.post("/api/custom-area", response_model=ApiResponse)
async def create_custom_area(request: CustomAreaRequest):
    """API endpoint to create a custom area for analysis."""
    if not DB_INITIALIZED:
        return ApiResponse(success=False, message="Database not available")
    
    try:
        area_id = await save_custom_area({
            "name": request.name,
            "description": request.description,
            "geometry": request.geometry,
            "user_id": request.user_id
        })
        
        if not area_id:
            return ApiResponse(success=False, message="Failed to save custom area")
            
        return ApiResponse(success=True, message="Custom area created", data={
            "id": area_id,
            "name": request.name
        })
    except Exception as e:
        logging.exception("Error creating custom area")
        return ApiResponse(success=False, message=f"Error: {e}")


@app.post("/api/comparison", response_model=ApiResponse)
async def create_comparison(request: ComparisonRequest):
    """API endpoint to create a comparison between two dates."""
    if errors := await check_services():
        return ApiResponse(success=False, message=" ".join(errors))
    
    try:
        # Get admin boundary
        geometry = get_admin_boundary(
            request.location, None, None, None, None, llm, LLM_INITIALIZED
        )
        
        if not geometry:
            return ApiResponse(success=False, message=f"Could not find location: {request.location}")
        
        # Process first date
        date1_url = get_tile_url(
            request.location, request.processing_type, PROJECT_ID,
            None, request.date1, request.date1, None, None, None,
            llm, LLM_INITIALIZED
        )
        
        # Process second date
        date2_url = get_tile_url(
            request.location, request.processing_type, PROJECT_ID,
            None, request.date2, request.date2, None, None, None,
            llm, LLM_INITIALIZED
        )
        
        if not date1_url or not date2_url:
            return ApiResponse(success=False, message="Could not generate comparison images.")
            
        return ApiResponse(success=True, message="Comparison created", data={
            "location": request.location,
            "processing_type": request.processing_type,
            "date1": request.date1,
            "date2": request.date2,
            "date1_url": date1_url,
            "date2_url": date2_url
        })
    except Exception as e:
        logging.exception("Error creating comparison")
        return ApiResponse(success=False, message=f"Error: {e}")


@app.get("/api/layers", response_model=List[LayerInfo])
async def get_layers(request: Request):
    """API endpoint to get layers from the session."""
    return request.session.get("layers", [])


@app.get("/api/saved-layers")
async def get_saved_layers(user_id: Optional[str] = None, limit: int = 20, skip: int = 0):
    """API endpoint to get saved layers from the database."""
    if not DB_INITIALIZED:
        raise HTTPException(status_code=503, detail="Database not available")
        
    layers = await get_user_layers(user_id, limit, skip)
    return layers


@app.get("/api/analyses")
async def get_analyses(user_id: Optional[str] = None, limit: int = 20, skip: int = 0):
    """API endpoint to get saved analyses from the database."""
    if not DB_INITIALIZED:
        raise HTTPException(status_code=503, detail="Database not available")
        
    analyses = await get_user_analyses(user_id, limit, skip)
    return analyses


@app.delete("/api/layers/{layer_id}")
async def delete_layer(request: Request, layer_id: str):
    """API endpoint to delete a layer from the session."""
    layers = request.session.get("layers", [])
    updated_layers = [layer for layer in layers if layer["id"] != layer_id]
    request.session["layers"] = updated_layers
    return {"success": True, "message": f"Layer {layer_id} deleted"}


@app.post("/api/layers/clear")
async def clear_layers(request: Request):
    """API endpoint to clear layers from the session."""
    request.session["layers"] = []
    return {"success": True, "message": "All layers cleared"}


async def analyze_prompt(prompt: str) -> Optional[AnalysisResult]:
    """Analyze user prompt using LLM."""
    global llm, LLM_INITIALIZED

    if not llm or not LLM_INITIALIZED:
        logging.error("LLM not initialized.")
        return None

    analysis_prompt = f"""You are a geographical analysis tool.
Analyze the following prompt: '{prompt}'
Extract:
1. Location (city and country).
2. Imagery processing type (RGB, NDVI, Surface WATER, LULC, or LST).
3. Satellite (Sentinel-2 or Landsat 8), if specified for RGB (default: Sentinel-2).
4. Start date (YYYY-MM-DD, or None).  Handle year/month-year.
5. End date (YYYY-MM-DD, or None). Handle year/month-year.
6. Year (YYYY or None).  For LST, extract the year; default to start date year if none.
7. Latitude and Longitude.  If not explicitly mentioned, **infer the coordinates based on the Location**.  If too vague, return 'None'.

Respond EXACTLY:
Location: [city, country]
Processing: [RGB or NDVI or Surface WATER or LULC or LST]
Satellite: [Sentinel-2 or Landsat 8 or None]
Start Date: [YYYY-MM-DD or None]
End Date: [YYYY-MM-DD or None]
Year: [YYYY or None]
Latitude: [latitude or None]
Longitude: [longitude or None]
"""

    try:
        # Get response from LLM
        response = await llm.ainvoke(analysis_prompt)
        logging.info(f"LLM response: {response}")

        # Parse the response using regex
        match = re.search(
            r"Location:\s*([\w\s,]+)\s*"
            r"Processing:\s*([\w\s]+)\s*"
            r"Satellite:\s*([\w\s-]+|None)\s*"
            r"Start Date:\s*([\d\-]+|None)\s*"
            r"End Date:\s*([\d\-]+|None)\s*"
            r"Year:\s*(\d+|None)\s*"
            r"Latitude:\s*([-+]?\d*\.?\d+|None)\s*"
            r"Longitude:\s*([-+]?\d*\.?\d+|None)\s*",
            response,
            re.DOTALL
        )

        if not match:
            logging.error(f"Could not parse LLM response: {response}")
            return None

        # Extract matched groups
        location, processing_type, satellite, start_date, end_date, year, latitude, longitude = match.groups()

        # Data cleaning and validation
        location = location.strip()
        processing_type = processing_type.strip().upper()
        satellite = satellite.strip() if satellite.lower() != "none" else None
        start_date = start_date.strip() if start_date.lower() != "none" else None
        end_date = end_date.strip() if end_date.lower() != "none" else None
        
        # Convert year to int if possible
        try:
            year = int(year.strip()) if year.lower() != "none" else None
        except ValueError:
            year = None
            
        # Convert latitude and longitude to float if possible
        try:
            latitude = float(latitude.strip()) if latitude.lower() != "none" else None
            longitude = float(longitude.strip()) if longitude.lower() != "none" else None
        except ValueError:
            latitude = longitude = None

        # Date validation function
        def validate_date(date_str):
            if date_str:
                try:
                    # Handle year-only format
                    if date_str.isdigit() and len(date_str) == 4:
                        return f"{date_str}-01-01"
                    # Validate full date
                    datetime.datetime.strptime(date_str, '%Y-%m-%d')
                    return date_str
                except ValueError:
                    return None
            return None

        # Validate dates
        start_date = validate_date(start_date)
        end_date = validate_date(end_date)
        
        # Fix end date for year-only input
        if end_date and len(end_date) == 4:
            end_date = f"{end_date}-12-31"

        # Extract year from "for year" pattern
        if year_match := re.search(r"for\s+(19|20)\d{2}", prompt.lower()):
            year_str = year_match.group(0)[4:]
            year = int(year_str)
            # Set date range if not already specified
            if not start_date:
                start_date = f"{year_str}-01-01"
            if not end_date:
                end_date = f"{year_str}-12-31"

        # Create and return the analysis result
        return AnalysisResult(
            location=location, 
            processing_type=processing_type, 
            satellite=satellite,
            start_date=start_date, 
            end_date=end_date, 
            year=year, 
            latitude=latitude, 
            longitude=longitude
        )

    except Exception as e:
        logging.exception(f"Error analyzing prompt: {e}")
        return None


async def save_analysis_and_layer(prompt: str, analysis_data: Dict[str, Any], user_id: Optional[str] = None):
    """Background task to save analysis and layer to the database."""
    try:
        # Add user_id and prompt to analysis data
        analysis_data["user_id"] = user_id
        analysis_data["prompt"] = prompt
        
        # Save analysis result
        analysis_id = await save_analysis_result(analysis_data)
        
        if analysis_id:
            # Create layer data
            layer_data = {
                "name": f"{analysis_data['location']} {analysis_data['processing_type']}",
                "location": analysis_data["location"],
                "processing_type": analysis_data["processing_type"],
                "tile_url": analysis_data["tile_url"],
                "latitude": analysis_data.get("latitude"),
                "longitude": analysis_data.get("longitude"),
                "user_id": user_id,
                "analysis_id": analysis_id
            }
            
            # Save layer
            await save_layer(layer_data)
            logging.info(f"Saved analysis and layer for prompt: {prompt}")
    except Exception as e:
        logging.error(f"Error in background save task: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)