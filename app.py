# --- START OF FILE app.py ---

import os
import re
import logging
from functools import lru_cache
from typing import Optional, List, Dict, Any, Union, Tuple
import json
import sys # Import sys for exit
import asyncio
from asyncio import Semaphore
import time

from fastapi import FastAPI, Request, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ee
from ee_utils import get_tile_url, process_time_series, get_admin_boundary  # Import additional functions
# Make sure ee_metadata is importable if needed directly, though utils uses it
# from ee_metadata import extract_metadata # Not directly needed here if ee_utils handles it
from langchain_ollama import OllamaLLM
from dotenv import load_dotenv
import google.auth.credentials
import datetime
from starlette.middleware.sessions import SessionMiddleware

# Add rate limiting middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response
from starlette.status import HTTP_429_TOO_MANY_REQUESTS
import time
from collections import defaultdict

# Rate limiting middleware
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute=60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_timestamps = defaultdict(list)

    async def dispatch(self, request: StarletteRequest, call_next):
        client_ip = request.client.host
        current_time = time.time()
        
        # Clear out timestamps that are older than 60 seconds
        self.request_timestamps[client_ip] = [
            timestamp for timestamp in self.request_timestamps[client_ip]
            if current_time - timestamp < 60
        ]
        
        # Check if too many requests
        if len(self.request_timestamps[client_ip]) >= self.requests_per_minute:
            return Response(
                content=json.dumps({
                    "error": "Too many requests",
                    "message": "Please try again in a moment"
                }),
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json"
            )
        
        # Record the current request timestamp
        self.request_timestamps[client_ip].append(current_time)
        
        # Process the request
        response = await call_next(request)
        return response

# MODIFIED: Pass project_id to initialize_ee
from authenticate_ee import initialize_ee

# Load environment variables FROM .env FILE FIRST
load_dotenv()

# --- Firestore Integration ---
import firestore_db

# --- REMOVED HARDCODED OVERRIDE ---
# os.environ['EE_PROJECT_ID'] = 'ee-hanzilabinyounasai' # NO LONGER NEEDED

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Earth Engine concurrency control
# Limit to a reasonable number of concurrent EE operations
# This helps prevent "Computation timed out" errors
EE_SEMAPHORE = Semaphore(5)  # Allow max 5 concurrent EE operations

# FastAPI app setup
app = FastAPI(
    title="Earth Engine Map App",
    description="A web app for visualizing Earth Engine data with Metadata", # Updated desc
    version="1.1.0", # Incremented version
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Add rate limiting middleware - limit to 60 requests per minute per IP
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# Middleware
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
    max_age=3600, # Session expires after 1 hour
    same_site="lax"
)

# Static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Project ID - READ FROM ENVIRONMENT (loaded by load_dotenv)
# MODIFIED: Critical check if ID is missing
PROJECT_ID = os.environ.get('EE_PROJECT_ID')
if not PROJECT_ID:
    logging.critical("CRITICAL: EE_PROJECT_ID environment variable is not set in .env or environment!")
    logging.critical("Earth Engine functionality will fail. Please set EE_PROJECT_ID.")
    # Optional: Exit here if EE is absolutely essential for the app to even start
    # sys.exit("EE_PROJECT_ID not configured. Exiting.")
    # Or let it continue and fail gracefully later, depending on desired behavior.
    # Setting PROJECT_ID to None to indicate failure clearly.
    PROJECT_ID = None
else:
    logging.info(f"Using Earth Engine Project ID: {PROJECT_ID}")


# Global variables
EE_INITIALIZED = False
EE_INITIALIZATION_ERROR = None
LLM_INITIALIZED = False
LLM_INITIALIZATION_ERROR = None
llm = None  # Global LLM instance

# Pydantic Models (no changes needed here)
class LayerInfo(BaseModel):
    id: str
    tile_url: Optional[str] = None # URL can be None if processing fails but metadata exists
    location: str
    processing_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opacity: float = 0.8
    visibility: str = "visible"
    metadata: Optional[Dict[str, Any]] = None # <--- Add metadata field

class AnalysisRequest(BaseModel):
    prompt: str
    user_id: Optional[str] = None
    save_result: bool = False # Default to False as DB is removed

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
    year: Optional[Union[int, str]] = None # Allow 'latest' string too
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


@app.on_event("startup")
async def startup_event():
    """Initialize Earth Engine and LLM on startup."""
    global EE_INITIALIZED, EE_INITIALIZATION_ERROR, LLM_INITIALIZED, LLM_INITIALIZATION_ERROR, llm, PROJECT_ID

    # Initialize Earth Engine only if PROJECT_ID was successfully loaded
    if PROJECT_ID:
        logging.info(f"Attempting EE initialization with Project ID: {PROJECT_ID}")
        try:
            # MODIFIED: Pass PROJECT_ID to the initialization function
            success, error = initialize_ee(PROJECT_ID)
            EE_INITIALIZED = success
            EE_INITIALIZATION_ERROR = error
            if success:
                # Test operation is now inside initialize_ee, just log success/failure here
                logging.info(f"Earth Engine initialization sequence completed successfully for project: {PROJECT_ID}")
            else:
                logging.error(f"Earth Engine initialization failed: {error}")
        except Exception as e:
            # Catch any unexpected error during the call itself
            EE_INITIALIZED = False
            EE_INITIALIZATION_ERROR = f"Unexpected error during EE initialization call: {str(e)}"
            logging.error(EE_INITIALIZATION_ERROR, exc_info=True)
    else:
        # PROJECT_ID was not found earlier
        logging.error("EE_PROJECT_ID not configured. Skipping Earth Engine initialization.")
        EE_INITIALIZED = False
        EE_INITIALIZATION_ERROR = "EE_PROJECT_ID not set in environment or .env file"

    # Initialize LLM (no changes here)
    try:
        ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        llm_model = os.environ.get("OLLAMA_MODEL", "gemma2:2b") # Allow configuring model via env
        llm = OllamaLLM(model=llm_model, base_url=ollama_base_url)
        # Test LLM (optional, can slow startup)
        # await llm.ainvoke("Test prompt")
        LLM_INITIALIZED = True
        logging.info(f"LLM initialized successfully (Model: {llm_model}, URL: {ollama_base_url})")
    except Exception as e:
        LLM_INITIALIZED = False
        LLM_INITIALIZATION_ERROR = str(e)
        logging.error(f"LLM initialization failed: {e}", exc_info=True)


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    logging.info("Shutting down application.")
    # Potential cleanup tasks can go here
    pass


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    status = "ok"
    # Ensure PROJECT_ID in diagnostics reflects the attempt, even if null
    current_project_id = PROJECT_ID if PROJECT_ID else "Not Set"
    diagnostics = {
        "ee_initialized": EE_INITIALIZED,
        "ee_error": EE_INITIALIZATION_ERROR,
        "ee_project_id_configured": current_project_id, # Report the configured ID
        "llm_initialized": LLM_INITIALIZED,
        "llm_error": LLM_INITIALIZATION_ERROR,
        "llm_model": os.environ.get("OLLAMA_MODEL", "gemma2:2b"),
        "llm_base_url": os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        "version": app.version,
    }
    if not EE_INITIALIZED or not LLM_INITIALIZED: # Check if EE init failed or LLM failed
        status = "degraded"
        logging.warning(f"Health check status: {status}. Diagnostics: {diagnostics}")
    else:
        logging.info(f"Health check status: {status}")

    return {"status": status, "diagnostics": diagnostics}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Render the home page."""
    layers = request.session.get("layers", [])
    last_metadata = layers[-1].get('metadata') if layers else None # Get metadata of last layer
    return templates.TemplateResponse("index.html", {
        "request": request,
        "tile_url": None, # Not needed directly if using layers
        "location": None, # "
        "error_message": None,
        "prompt": None,
        "layers": json.dumps(layers), # Pass all layers to frontend
        "latitude": None, # Not needed directly
        "longitude": None, # "
        "last_metadata": json.dumps(last_metadata) if last_metadata else None # Pass metadata of last layer
    })


async def check_services():
    """Check service availability and return list of errors."""
    errors = []
    # Use the global flags set during startup
    if not EE_INITIALIZED:
        errors.append(f"Earth Engine unavailable: {EE_INITIALIZATION_ERROR}")
    if not LLM_INITIALIZED:
        errors.append(f"LLM unavailable: {LLM_INITIALIZATION_ERROR}")
    # Check if PROJECT_ID was loaded, even if initialization failed later
    if not PROJECT_ID:
        errors.append("EE Project ID not configured in .env or environment.")
    return errors


@app.post("/", response_class=HTMLResponse)
async def process_prompt(request: Request, prompt: str = Form(...)):
    """Process user prompt, generate map layer with metadata."""
    tile_url = None
    metadata = None
    location = None
    error_message = None
    latitude = None
    longitude = None
    layers = request.session.get("layers", [])

    if not prompt or not prompt.strip():
        error_message = "Please enter a valid prompt."
        return templates.TemplateResponse("index.html", {
            "request": request, "error_message": error_message, "prompt": prompt,
            "layers": json.dumps(layers), "last_metadata": None
        })

    # Check services *after* basic prompt validation
    service_errors = await check_services()
    if service_errors:
        error_message = " ".join(service_errors)
        logging.error(f"Service check failed: {error_message}")
        # Ensure PROJECT_ID check error is prominent if it's the cause
        if not PROJECT_ID:
             error_message = f"Configuration Error: EE_PROJECT_ID not set. {error_message}"
        return templates.TemplateResponse("index.html", {
            "request": request, "error_message": error_message, "prompt": prompt,
            "layers": json.dumps(layers), "last_metadata": None
        })

    # If we reach here, EE_INITIALIZED is True and PROJECT_ID is set.

    try:
        logging.info(f"Processing prompt: '{prompt}'")
        # Analyze the prompt using LLM
        analysis_result = await analyze_prompt(prompt)
        if analysis_result:
            location = analysis_result.location
            processing_type = analysis_result.processing_type
            satellite = analysis_result.satellite
            start_date = analysis_result.start_date
            end_date = analysis_result.end_date
            year = analysis_result.year # Can be int or str ('latest')
            latitude = analysis_result.latitude
            longitude = analysis_result.longitude

            logging.info(f"Analysis Result: Loc={location}, Type={processing_type}, Sat={satellite}, Start={start_date}, End={end_date}, Year={year}, Lat={latitude}, Lon={longitude}")

            # Use the semaphore to limit concurrent Earth Engine operations
            async with EE_SEMAPHORE:
                # Get the tile URL and metadata
                # MODIFIED: Pass the PROJECT_ID read from environment
                tile_url, metadata = await get_tile_url(
                    location=location,
                    processing_type=processing_type,
                    project_id=PROJECT_ID, # <-- Pass loaded Project ID
                    satellite=satellite,
                    start_date=start_date,
                    end_date=end_date,
                    year=year,
                    latitude=latitude,
                    longitude=longitude,
                    llm=llm,
                    LLM_INITIALIZED=LLM_INITIALIZED
                )

            # Error handling based on tile_url/metadata remains the same
            if metadata and metadata.get("Status") and "fail" in metadata["Status"].lower():
                 error_message = metadata["Status"]
            elif not metadata and not tile_url:
                 error_message = f"Failed to get map data or metadata for {location} ({processing_type}). Check logs."
            elif not tile_url and metadata:
                 error_message = f"Could not generate map tile for {location} ({processing_type}), but metadata is available."
                 logging.warning(f"Tile URL generation failed, but metadata exists for {location}/{processing_type}")
                 # Proceed to add layer with metadata but no URL? Yes.
            elif not tile_url and not metadata: # Should be caught by earlier check but safety
                 error_message = f"Failed to retrieve data for {location} ({processing_type})."


            # Add a new layer (even if URL failed but metadata exists)
            layer_id = f"{location.replace(' ', '_').replace(',', '')}_{processing_type}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"
            new_layer = LayerInfo(
                id=layer_id,
                tile_url=tile_url, # Can be None
                location=location,
                processing_type=processing_type,
                latitude=latitude,
                longitude=longitude,
                metadata=metadata, # Add metadata here
                opacity=0.8,
                visibility="visible"
            ).dict() # Convert to dict for session storage

            layers.append(new_layer)
            request.session["layers"] = layers
            logging.info(f"Added layer '{layer_id}' to session.")

        else:
            error_message = "Failed to analyze prompt using LLM."
            logging.error(f"analyze_prompt returned None for prompt: '{prompt}'")

    except ee.EEException as e:
         # Include project ID in error message for easier debugging
         error_message = f"Earth Engine Error: {e}. Check EE console/permissions for project '{PROJECT_ID}'."
         logging.exception(f"EE Error processing prompt: {prompt}")
    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        logging.exception(f"Error processing prompt: {prompt}")

    # Pass the metadata of the *last added layer* to the template
    last_metadata = layers[-1].get('metadata') if layers else None

    return templates.TemplateResponse("index.html", {
        "request": request,
        "error_message": error_message,
        "prompt": prompt,
        "layers": json.dumps(layers), # Send updated layers list
        "last_metadata": json.dumps(last_metadata) if last_metadata else None, # Send metadata of last layer
        # These might not be needed if layer info handles center etc.
        "tile_url": tile_url,
        "location": location,
        "latitude": latitude,
        "longitude": longitude
    })


# --- OPTIONS endpoint remains the same ---
@app.options("/api/analyze")
async def options_analyze():
    """Handle OPTIONS requests for the /api/analyze endpoint."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


@app.post("/api/analyze", response_model=ApiResponse)
async def api_analyze_prompt(request: AnalysisRequest):
    """API endpoint to analyze prompt and return data including metadata."""
    if errors := await check_services():
        # Ensure PROJECT_ID check error is prominent if it's the cause
        msg = " ".join(errors)
        if not PROJECT_ID: msg = f"Configuration Error: EE_PROJECT_ID not set. {msg}"
        return ApiResponse(success=False, message=msg)

    # If we reach here, EE_INITIALIZED is True and PROJECT_ID is set.

    try:
        analysis_result = await analyze_prompt(request.prompt)
        if not analysis_result:
            return ApiResponse(success=False, message="Failed to analyze prompt.")

        data = analysis_result.dict() # Includes location, type, dates, etc.

        # Use the semaphore to limit concurrent Earth Engine operations
        async with EE_SEMAPHORE:
            # Get tile URL and metadata
            # MODIFIED: Pass the PROJECT_ID read from environment
            tile_url, metadata = await get_tile_url(
                location=data["location"],
                processing_type=data["processing_type"],
                project_id=PROJECT_ID, # <-- Pass loaded Project ID
                satellite=data.get("satellite"),
                start_date=data.get("start_date"),
                end_date=data.get("end_date"),
                year=data.get("year"),
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                llm=llm,
                LLM_INITIALIZED=LLM_INITIALIZED
            )

        # Add results to the data dictionary
        data["tile_url"] = tile_url
        data["metadata"] = metadata

        # Logic for handling success/failure based on tile_url/metadata remains same
        if tile_url is None and metadata and "fail" in metadata.get("Status", "").lower():
             # Handle case where URL failed but metadata indicates why
             return ApiResponse(success=False, message=f"Error fetching map image: {metadata['Status']}", data=data)
        elif tile_url is None and metadata:
             # Handle case where URL failed but metadata exists (partial success?)
             return ApiResponse(success=True, message="Analysis complete, but map tile generation failed. Metadata available.", data=data)
        elif tile_url is None and not metadata:
             # Handle complete failure
             return ApiResponse(success=False, message="Error fetching map image and metadata.", data=data)

        # Database save operations removed

        return ApiResponse(success=True, message="Analysis complete", data=data)

    except ee.EEException as e:
         logging.exception("EE Error in /api/analyze")
         # Include project ID in error message
         return ApiResponse(success=False, message=f"Earth Engine Error (Project: {PROJECT_ID}): {e}", data={"prompt": request.prompt})
    except Exception as e:
        logging.exception("Error in /api/analyze")
        return ApiResponse(success=False, message=f"Unexpected Error: {e}", data={"prompt": request.prompt})


@app.post("/api/time-series", response_model=ApiResponse)
async def create_time_series(request: TimeSeriesRequest):
    """API endpoint to create a time series analysis including metadata."""
    if errors := await check_services():
        # Ensure PROJECT_ID check error is prominent if it's the cause
        msg = " ".join(errors)
        if not PROJECT_ID: msg = f"Configuration Error: EE_PROJECT_ID not set. {msg}"
        return ApiResponse(success=False, message=msg)

    # If we reach here, EE_INITIALIZED is True and PROJECT_ID is set.

    try:
        # Get admin boundary (no change needed here)
        geometry = get_admin_boundary(
            request.location, request.start_date, request.end_date,
            None, None, llm, LLM_INITIALIZED
        )

        if not geometry:
            return ApiResponse(success=False, message=f"Could not find location or geometry for: {request.location}")

        # Process time series (now includes metadata extraction within)
        # MODIFIED: Pass the PROJECT_ID read from environment
        time_series_results = process_time_series(
            geometry=geometry,
            processing_type=request.processing_type,
            start_date=request.start_date,
            end_date=request.end_date,
            interval=request.interval,
            project_id=PROJECT_ID # <-- Pass loaded Project ID
        )

        # Logic for handling results remains the same
        if not time_series_results or (isinstance(time_series_results, list) and time_series_results[0].get("error")):
            error_msg = time_series_results[0].get("error") if time_series_results else "Failed to process time series."
            return ApiResponse(success=False, message=error_msg, data={"request": request.dict()})

        # Database save operations removed

        return ApiResponse(success=True, message="Time series created successfully", data={
            "location": request.location,
            "processing_type": request.processing_type,
            "interval": request.interval,
            "time_steps": time_series_results # Contains URL and metadata per step
        })
    except ee.EEException as e:
        logging.exception("EE Error creating time series")
        # Include project ID in error message
        return ApiResponse(success=False, message=f"Earth Engine Error (Project: {PROJECT_ID}): {e}", data={"request": request.dict()})
    except Exception as e:
        logging.exception("Error creating time series")
        return ApiResponse(success=False, message=f"Unexpected Error: {e}", data={"request": request.dict()})


# --- /api/custom-area remains the same (no EE interaction) ---
@app.post("/api/custom-area", response_model=ApiResponse)
async def create_custom_area(request: CustomAreaRequest):
    """API endpoint to create a custom area for analysis."""
    # Database dependency removed, using in-memory storage instead
    try:
        # Create a simple ID for the custom area
        area_id = f"area_{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"

        # Here you might store the custom area details in memory or a simple file if needed
        # For now, just return success confirmation.
        logging.info(f"Custom area '{request.name}' defined (ID: {area_id}). Geometry: {request.geometry['type']}")

        return ApiResponse(success=True, message="Custom area defined (not saved)", data={
            "id": area_id,
            "name": request.name,
            "description": request.description,
            # "geometry": request.geometry # Optionally return geometry
        })
    except Exception as e:
        logging.exception("Error creating custom area")
        return ApiResponse(success=False, message=f"Error: {e}")


@app.post("/api/comparison", response_model=ApiResponse)
async def create_comparison(request: ComparisonRequest):
    """API endpoint to create a comparison between two dates, including metadata."""
    if errors := await check_services():
        # Ensure PROJECT_ID check error is prominent if it's the cause
        msg = " ".join(errors)
        if not PROJECT_ID: msg = f"Configuration Error: EE_PROJECT_ID not set. {msg}"
        return ApiResponse(success=False, message=msg)

    # If we reach here, EE_INITIALIZED is True and PROJECT_ID is set.

    try:
        # Get admin boundary (no change needed here)
        geometry = get_admin_boundary(
            request.location, None, None, None, None, llm, LLM_INITIALIZED
        )

        if not geometry:
            return ApiResponse(success=False, message=f"Could not find location or geometry for: {request.location}")

        # Process first date
        logging.info(f"Processing comparison date 1: {request.date1}")
        year1 = int(request.date1.split('-')[0]) if request.processing_type == 'LST' else None
        # MODIFIED: Pass the PROJECT_ID read from environment
        date1_url, metadata1 = get_tile_url(
            location=request.location,
            processing_type=request.processing_type,
            project_id=PROJECT_ID, # <-- Pass loaded Project ID
            satellite=None, # Assume default satellite for the type
            start_date=request.date1,
            end_date=request.date1, # Use same date for start/end for single point in time
            year=year1, # Pass year if LST
            llm=llm, LLM_INITIALIZED=LLM_INITIALIZED
        )

        # Process second date
        logging.info(f"Processing comparison date 2: {request.date2}")
        year2 = int(request.date2.split('-')[0]) if request.processing_type == 'LST' else None
        # MODIFIED: Pass the PROJECT_ID read from environment
        date2_url, metadata2 = get_tile_url(
            location=request.location,
            processing_type=request.processing_type,
            project_id=PROJECT_ID, # <-- Pass loaded Project ID
            satellite=None,
            start_date=request.date2,
            end_date=request.date2,
            year=year2,
            llm=llm, LLM_INITIALIZED=LLM_INITIALIZED
        )

        # Error checking logic remains the same
        error_messages = []
        if date1_url is None:
            msg = f"Could not generate image for {request.date1}."
            if metadata1 and "fail" in metadata1.get("Status","").lower(): msg += f" Reason: {metadata1['Status']}"
            error_messages.append(msg)
        if date2_url is None:
            msg = f"Could not generate image for {request.date2}."
            if metadata2 and "fail" in metadata2.get("Status","").lower(): msg += f" Reason: {metadata2['Status']}"
            error_messages.append(msg)

        if error_messages:
            return ApiResponse(success=False, message=" ".join(error_messages), data={
                 "location": request.location, "processing_type": request.processing_type,
                 "date1": request.date1, "date2": request.date2,
                 "date1_url": date1_url, "metadata1": metadata1,
                 "date2_url": date2_url, "metadata2": metadata2
            })

        # Return logic remains the same
        return ApiResponse(success=True, message="Comparison created", data={
            "location": request.location,
            "processing_type": request.processing_type,
            "date1": request.date1,
            "date2": request.date2,
            "date1_url": date1_url,
            "metadata1": metadata1, # Include metadata
            "date2_url": date2_url,
            "metadata2": metadata2  # Include metadata
        })
    except ee.EEException as e:
        logging.exception("EE Error creating comparison")
        # Include project ID in error message
        return ApiResponse(success=False, message=f"Earth Engine Error (Project: {PROJECT_ID}): {e}", data={"request": request.dict()})
    except Exception as e:
        logging.exception("Error creating comparison")
        return ApiResponse(success=False, message=f"Unexpected Error: {e}", data={"request": request.dict()})


@app.get("/api/layers", response_model=List[LayerInfo])
async def get_layers(request: Request):
    """API endpoint to get layers (including metadata) from the session."""
    layers_data = request.session.get("layers", [])
    # Validate data against Pydantic model (optional, but good practice)
    validated_layers = []
    for layer in layers_data:
         try:
              validated_layers.append(LayerInfo(**layer))
         except Exception as e:
              logging.warning(f"Skipping invalid layer data in session: {layer}. Error: {e}")
    return validated_layers


# --- Saved layers/analyses endpoints remain the same (placeholders) ---
@app.get("/api/saved-layers")
async def get_saved_layers(user_id: Optional[str] = None, limit: int = 20, skip: int = 0):
    """API endpoint to get saved layers (placeholder)."""
    logging.info("Accessed /api/saved-layers (DB removed, returning empty list)")
    return []

@app.get("/api/analyses")
async def get_analyses(user_id: Optional[str] = None, limit: int = 20, skip: int = 0):
    """API endpoint to get saved analyses (placeholder)."""
    logging.info("Accessed /api/analyses (DB removed, returning empty list)")
    return []


@app.delete("/api/layers/{layer_id}")
async def delete_layer(request: Request, layer_id: str):
    """API endpoint to delete a layer from the session."""
    layers = request.session.get("layers", [])
    initial_length = len(layers)
    updated_layers = [layer for layer in layers if layer.get("id") != layer_id]
    if len(updated_layers) < initial_length:
        request.session["layers"] = updated_layers
        logging.info(f"Deleted layer {layer_id} from session.")
        return {"success": True, "message": f"Layer {layer_id} deleted"}
    else:
        logging.warning(f"Attempted to delete non-existent layer ID: {layer_id}")
        return {"success": False, "message": f"Layer {layer_id} not found"}


@app.post("/api/layers/clear")
async def clear_layers(request: Request):
    """API endpoint to clear all layers from the session."""
    request.session["layers"] = []
    logging.info("Cleared all layers from session.")
    return {"success": True, "message": "All layers cleared"}


# --- analyze_prompt function remains the same ---
async def analyze_prompt(prompt: str) -> Optional[AnalysisResult]:
    """Analyze user prompt using LLM to extract geographical parameters."""
    global llm, LLM_INITIALIZED

    if not llm or not LLM_INITIALIZED:
        logging.error("LLM not initialized, cannot analyze prompt.")
        return None

    # Enhanced prompt for better parsing and coordinate inference
    analysis_prompt = f"""Analyze the geographical request: '{prompt}'

Extract the following parameters:
1.  **Location:** City and country (e.g., "Paris, France"). If ambiguous, state the ambiguity.
2.  **Processing Type:** Choose ONE from: RGB, NDVI, Surface WATER, LULC, LST, OPEN BUILDINGS.
    - Use 'RGB' for general satellite views, true color, visual imagery.
    - Use 'NDVI' for vegetation health, greenery.
    - Use 'Surface WATER' for water body mapping (rivers, lakes).
    - Use 'LULC' for land cover / land use classification.
    - Use 'LST' for land surface temperature, thermal variations etc.
    - Use 'OPEN BUILDINGS' for building footprints or heights.
    - If unsure, default to 'RGB'.
3.  **Satellite (for RGB only):** Specify 'Sentinel-2' or 'Landsat 8' if mentioned. Default to 'Sentinel-2' if RGB is chosen and no satellite specified. Otherwise, output 'None'.
4.  **Start Date:** Extract and return in format (YYYY-MM-DD). Apply the following rules:
    - If both start and end dates are clearly provided, return both in (YYYY-MM-DD) format.
    - If only a **year** is given → Start: YYYY-01-01. End: one year from start.
    - If **month + year** → Start: YYYY-MM-01. End: two months from start.
    - If **season** is mentioned → Use:
        - Spring = YYYY-03-01  
        - Summer = YYYY-06-01  
        - Fall/Autumn = YYYY-09-01  
        - Winter = YYYY-12-01  
        → End date = +2 months
    - If range like “July 2023 to Oct 2023” is mentioned → convert both to full (YYYY-MM-DD).
    - If keywords like "latest", "updated", or "most recent" → Start: 2025-01-01, End: 2025-12-12.
    - If unclear, missing, or ambiguous → Start: 2024-01-01, End: 2024-12-30.

5.  **End Date:** Follows from above logic:
    - If not explicitly given, infer from start date.
    - If start is a full year → End = start + 1 year.
    - If start includes month → End = start + 2 months.
    - If season → End = start + 2 months.
    - If keywords like “latest”, “updated” → use End: 2025-12-12.
    - If unclear or missing → End: 2024-12-30.

6.  **Year (primarily for LST):**
    - If LST is chosen, extract the year (YYYY).
    - If no year given but LST is requested, use year from Start Date.
    - For other types, output year only if clearly mentioned for composite or multi-temporal analysis.


Respond ONLY in the following format, ensuring each field is on a new line:
Location: [Location string or None]  
Processing: [Processing Type]  
Satellite: [Sentinel-2 or Landsat 8 or None]  
Start Date: [YYYY-MM-DD]  
End Date: [YYYY-MM-DD]   


"""

    try:
        # Get response from LLM
        logging.info("Sending prompt analysis request to LLM...")
        response = await llm.ainvoke(analysis_prompt)
        logging.info(f"LLM analysis response:\n{response}")

        # Parse the response using regex - stricter matching
        data = {}
        keys = ["Location", "Processing", "Satellite", "Start Date", "End Date", "Year", "Latitude", "Longitude"]
        lines = response.strip().split('\n')
        parsed_data = {}

        for line in lines:
             parts = line.split(':', 1)
             if len(parts) == 2:
                  key = parts[0].strip()
                  value = parts[1].strip()
                  # Map parsed keys to expected keys, handling case variations
                  for expected_key in keys:
                       if key.lower() == expected_key.lower():
                            parsed_data[expected_key] = value
                            break

        # Data cleaning and validation
        location = parsed_data.get("Location", "None")
        processing_type = parsed_data.get("Processing", "RGB") # Default to RGB
        satellite = parsed_data.get("Satellite", "None")
        start_date = parsed_data.get("Start Date", "None")
        end_date = parsed_data.get("End Date", "None")
        year_str = parsed_data.get("Year", "None")
        latitude_str = parsed_data.get("Latitude", "None")
        longitude_str = parsed_data.get("Longitude", "None")

        # --- Clean and Validate ---
        location = None if location.lower() == 'none' else location.strip()
        processing_type = processing_type.strip().upper()
        satellite = None if satellite.lower() == 'none' else satellite.strip()
        start_date = None if start_date.lower() == 'none' else start_date.strip()
        end_date = None if end_date.lower() == 'none' else end_date.strip()
        year_str = None if year_str.lower() == 'none' else year_str.strip()
        latitude_str = None if latitude_str.lower() == 'none' else latitude_str.strip()
        longitude_str = None if longitude_str.lower() == 'none' else longitude_str.strip()

        # Validate processing type
        valid_processing = ['RGB', 'NDVI', 'SURFACE WATER', 'LULC', 'LST', 'OPEN BUILDINGS']
        if processing_type not in valid_processing:
             logging.warning(f"LLM returned invalid processing type '{processing_type}', defaulting to RGB.")
             processing_type = 'RGB'

        # Handle satellite logic based on processing type
        if processing_type != 'RGB':
             satellite = None # Only RGB uses satellite choice for now

        # Convert year to int if possible, keep 'latest' as string
        year = None
        if year_str == 'latest':
            year = 'latest'
        elif year_str and year_str.isdigit():
            try:
                year = int(year_str)
            except ValueError:
                year = None # Should not happen if isdigit() is true

        # Convert latitude and longitude to float if possible
        latitude = None
        longitude = None
        try:
            if latitude_str: latitude = float(latitude_str)
            if longitude_str: longitude = float(longitude_str)
             # Coordinate sanity check
            if latitude is not None and not (-90 <= latitude <= 90):
                 logging.warning(f"LLM returned invalid latitude {latitude}, setting to None.")
                 latitude = None
            if longitude is not None and not (-180 <= longitude <= 180):
                 logging.warning(f"LLM returned invalid longitude {longitude}, setting to None.")
                 longitude = None
        except (ValueError, TypeError):
            logging.warning(f"Could not parse lat/lon from LLM response: lat='{latitude_str}', lon='{longitude_str}'")
            latitude = longitude = None

        # Handle 'latest' date propagation
        if start_date == 'latest' or end_date == 'latest':
             start_date = 'latest'
             end_date = 'latest'
             if processing_type == 'LST': # LST module handles 'latest' year directly
                  year = 'latest'


        # Validate/Normalize date strings (YYYY-MM-DD or latest)
        def normalize_date(date_str):
            if date_str == 'latest': return 'latest'
            if date_str:
                try:
                    # Attempt to parse as YYYY-MM-DD
                    datetime.datetime.strptime(date_str, '%Y-%m-%d')
                    return date_str
                except ValueError:
                    # If parsing fails, log warning and return None
                    logging.warning(f"LLM returned invalid date format '{date_str}', expected YYYY-MM-DD or 'latest'. Setting to None.")
                    return None
            return None

        start_date = normalize_date(start_date)
        end_date = normalize_date(end_date)

        # Special case: If only year was specified, ensure start/end dates reflect that
        # This might conflict slightly with the LLM prompt, but ensures consistency
        if year and isinstance(year, int) and start_date is None and end_date is None:
             start_date = f"{year}-01-01"
             end_date = f"{year}-12-31"
             logging.info(f"LLM provided year {year} but no dates, setting range: {start_date} - {end_date}")


        # Final check: If no location, cannot proceed
        if not location:
             logging.error("LLM analysis failed to identify a location.")
             return None

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
        logging.exception(f"Error analyzing prompt with LLM: {e}")
        return None


# --- Firestore-backed API Endpoints ---

from pydantic import BaseModel

class UserProfile(BaseModel):
    user_id: str
    profile: dict

@app.post("/api/user-profile")
async def create_user_profile(profile: UserProfile):
    firestore_db.create_user_profile(profile.user_id, profile.profile)
    return {"status": "success"}

@app.get("/api/user-profile/{user_id}")
async def get_user_profile(user_id: str):
    profile = firestore_db.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile

@app.patch("/api/user-profile/{user_id}")
async def update_user_profile(user_id: str, updates: dict):
    firestore_db.update_user_profile(user_id, updates)
    return {"status": "updated"}

class LayerData(BaseModel):
    user_id: str
    layer_id: str
    layer: dict

@app.post("/api/layers")
async def save_map_layer(data: LayerData):
    firestore_db.save_map_layer(data.user_id, data.layer_id, data.layer)
    return {"status": "success"}

@app.get("/api/layers/{user_id}")
async def get_map_layers(user_id: str):
    return firestore_db.get_map_layers(user_id)

class AnalysisData(BaseModel):
    user_id: str
    analysis_id: str
    analysis: dict

@app.post("/api/analyses")
async def save_analysis(data: AnalysisData):
    firestore_db.save_analysis(data.user_id, data.analysis_id, data.analysis)
    return {"status": "success"}

@app.get("/api/analyses/{user_id}")
async def get_analyses(user_id: str):
    return firestore_db.get_analyses(user_id)

class ChatMessage(BaseModel):
    user_id: str
    message_id: str
    message: dict

@app.post("/api/chat-history")
async def save_chat_message(data: ChatMessage):
    firestore_db.save_chat_message(data.user_id, data.message_id, data.message)
    return {"status": "success"}

@app.get("/api/chat-history/{user_id}")
async def get_chat_history(user_id: str):
    return firestore_db.get_chat_history(user_id)

class CustomAreaData(BaseModel):
    user_id: str
    area_id: str
    area: dict

@app.post("/api/custom-areas")
async def save_custom_area(data: CustomAreaData):
    firestore_db.save_custom_area(data.user_id, data.area_id, data.area)
    return {"status": "success"}

@app.get("/api/custom-areas/{user_id}")
async def get_custom_areas(user_id: str):
    return firestore_db.get_custom_areas(user_id)

class AnalyticsEvent(BaseModel):
    event: dict

@app.post("/api/analytics")
async def log_analytics(event: AnalyticsEvent):
    firestore_db.log_usage(event.event)
    return {"status": "logged"}

# Delete a specific layer for a user
@app.delete("/api/layers/{user_id}/{layer_id}")
async def delete_user_layer(user_id: str, layer_id: str):
    try:
        firestore_db.delete_map_layer(user_id, layer_id)
        return {"status": "success", "message": f"Layer {layer_id} deleted for user {user_id}"}
    except Exception as e:
        logging.error(f"Error deleting layer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete layer: {str(e)}")

# Clear all layers for a user
@app.delete("/api/layers/{user_id}")
async def clear_user_layers(user_id: str):
    try:
        firestore_db.clear_user_layers(user_id)
        return {"status": "success", "message": f"All layers cleared for user {user_id}"}
    except Exception as e:
        logging.error(f"Error clearing layers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear layers: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Use environment variable for port or default to 8000
    port = int(os.environ.get("PORT", 8000))
    # Use environment variable for host or default to "0.0.0.0"
    host = os.environ.get("HOST", "0.0.0.0")
    # Use environment variable for reload flag or default to True for development
    reload = os.environ.get("RELOAD", "true").lower() == "true"

    # Log startup details including the crucial Project ID check
    logging.info(f"Starting Uvicorn server on {host}:{port} with reload={reload}")
    if not PROJECT_ID:
        logging.critical("******************************************************")
        logging.critical("SERVER STARTING WITHOUT EE_PROJECT_ID CONFIGURED!")
        logging.critical("Earth Engine features will be unavailable.")
        logging.critical("Set EE_PROJECT_ID in your .env file or environment.")
        logging.critical("******************************************************")
    else:
        logging.info(f"Using EE Project ID: {PROJECT_ID}")

    uvicorn.run("app:app", host=host, port=port, reload=reload)

# --- END OF FILE app.py ---