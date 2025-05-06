# src/api/routers/pixel_value_router.py
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import ee
import logging
from datetime import datetime

from src.services.earth_engine_service import initialize_earth_engine, run_ee_operation, EE_INITIALIZED
from src.config.settings import Settings

# Set up router
router = APIRouter()

# Pydantic model for the request body
class PixelValueRequest(BaseModel):
    layer_id: str
    coordinates: List[float]  # [longitude, latitude]
    processing_type: str
    ee_collection_id: Optional[str] = None
    image_date: Optional[str] = None

# Get settings
settings = Settings()

@router.post("/api/pixel-value")
async def get_pixel_value(request: PixelValueRequest = Body(...)):
    """Get the pixel value at specific coordinates for a layer."""
    try:
        # Ensure Earth Engine is initialized
        if not EE_INITIALIZED:
            success, error = await initialize_earth_engine(settings.ee_project_id)
            if not success:
                raise HTTPException(status_code=500, detail=f"Failed to initialize Earth Engine: {error}")
        
        # Extract coordinates
        if len(request.coordinates) != 2:
            raise HTTPException(status_code=400, detail="Coordinates must be [longitude, latitude]")
        
        lon, lat = request.coordinates
        point = ee.Geometry.Point(lon, lat)
        
        # Handle different processing types
        processing_type = request.processing_type.upper()
        
        async def get_image_and_sample():
            """Get the appropriate image and sample the pixel value"""
            # Get the appropriate collection or image
            image = None
            band_name = None
            
            if request.ee_collection_id:
                # Use the provided collection ID
                try:
                    collection = ee.ImageCollection(request.ee_collection_id)
                    
                    # Filter by date if provided
                    if request.image_date:
                        date = datetime.strptime(request.image_date, '%Y-%m-%d')
                        collection = collection.filterDate(
                            ee.Date(date.strftime('%Y-%m-%d')),
                            ee.Date(date.strftime('%Y-%m-%d')).advance(1, 'day')
                        )
                    
                    # Get the first image (or median composite if multiple)
                    collection_size = await run_ee_operation(lambda: collection.size().getInfo())
                    if collection_size > 1:
                        image = collection.median()
                    else:
                        image = collection.first()
                    
                except ee.EEException as e:
                    logging.error(f"Error accessing collection {request.ee_collection_id}: {e}")
                    raise HTTPException(status_code=500, detail=f"Error accessing Earth Engine collection: {str(e)}")
            else:
                # Use default collections based on processing type
                if processing_type == 'NDVI':
                    collection = ee.ImageCollection('MODIS/006/MOD13Q1')
                    if request.image_date:
                        date = datetime.strptime(request.image_date, '%Y-%m-%d')
                        collection = collection.filterDate(
                            ee.Date(date.strftime('%Y-%m')),
                            ee.Date(date.strftime('%Y-%m')).advance(1, 'month')
                        )
                    image = collection.select('NDVI').median()
                    band_name = 'NDVI'
                    
                elif processing_type == 'LST':
                    collection = ee.ImageCollection('MODIS/006/MOD11A1')
                    if request.image_date:
                        date = datetime.strptime(request.image_date, '%Y-%m-%d')
                        collection = collection.filterDate(
                            ee.Date(date.strftime('%Y-%m-%d')),
                            ee.Date(date.strftime('%Y-%m-%d')).advance(1, 'day')
                        )
                    image = collection.select('LST_Day_1km').median()
                    # Convert from Kelvin to Celsius
                    image = image.multiply(0.02).subtract(273.15).rename('LST_Celsius')
                    band_name = 'LST_Celsius'
                    
                elif processing_type == 'SURFACE WATER':
                    image = ee.Image('JRC/GSW1_3/GlobalSurfaceWater')
                    band_name = 'occurrence'
                    
                elif processing_type == 'LULC':
                    image = ee.Image('ESA/WorldCover/v100/2020')
                    band_name = 'Map'
                    
                elif processing_type == 'RGB':
                    collection = ee.ImageCollection('LANDSAT/LC08/C01/T1_TOA')
                    if request.image_date:
                        date = datetime.strptime(request.image_date, '%Y-%m-%d')
                        collection = collection.filterDate(
                            ee.Date(date.strftime('%Y-%m-%d')),
                            ee.Date(date.strftime('%Y-%m-%d')).advance(1, 'day')
                        ).sort('CLOUD_COVER')
                    image = collection.first()
                    # RGB bands
                    rgb_bands = ['B4', 'B3', 'B2']  # Landsat 8 bands
                    
                elif processing_type in ['CO', 'NO2', 'CH4', 'SO2']:
                    # Gas concentrations
                    if processing_type == 'CO':
                        collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_CO')
                        band_name = 'CO_column_number_density'
                    elif processing_type == 'NO2':
                        collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
                        band_name = 'NO2_column_number_density'
                    elif processing_type == 'CH4':
                        collection = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4')
                        band_name = 'CH4_column_volume_mixing_ratio_dry_air'
                    elif processing_type == 'SO2':
                        collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_SO2')
                        band_name = 'SO2_column_number_density'
                    
                    # Filter by date if provided
                    if request.image_date:
                        date = datetime.strptime(request.image_date, '%Y-%m-%d')
                        collection = collection.filterDate(
                            ee.Date(date.strftime('%Y-%m-%d')),
                            ee.Date(date.strftime('%Y-%m-%d')).advance(1, 'day')
                        )
                    
                    image = collection.select(band_name).median()
                    
                elif processing_type == 'ACTIVE_FIRE' or processing_type == 'ACTIVE FIRE':
                    collection = ee.ImageCollection('FIRMS')
                    if request.image_date:
                        date = datetime.strptime(request.image_date, '%Y-%m-%d')
                        collection = collection.filterDate(
                            ee.Date(date.strftime('%Y-%m-%d')),
                            ee.Date(date.strftime('%Y-%m-%d')).advance(1, 'day')
                        )
                    image = collection.select('T21').median()
                    band_name = 'T21'
                    
                else:
                    raise HTTPException(status_code=400, 
                                      detail=f"Unsupported processing type: {processing_type}")
            
            if image is None:
                raise HTTPException(status_code=404, 
                                  detail="No image found for the given parameters")
            
            # Sample the pixel value at the point
            if processing_type == 'RGB':
                # For RGB, sample Red, Green, Blue bands
                def sample_rgb():
                    rgb_bands = ['B4', 'B3', 'B2']  # Landsat 8 bands
                    sample = image.select(rgb_bands).sample(point, 30).first()
                    value_info = sample.getInfo()['properties']
                    
                    # Extract RGB values
                    r_val = int(value_info.get('B4', 0) * 255)  # Scale to 0-255
                    g_val = int(value_info.get('B3', 0) * 255)
                    b_val = int(value_info.get('B2', 0) * 255)
                    
                    return {
                        'r': r_val,
                        'g': g_val,
                        'b': b_val
                    }
                
                value = await run_ee_operation(sample_rgb)
                    
            else:
                # For single band, just get the value
                def sample_band():
                    sample = image.sample(point, 30).first()
                    value_info = sample.getInfo()['properties']
                    return value_info.get(band_name, None)
                
                value = await run_ee_operation(sample_band)
                
                # Special handling for LULC (categorical)
                if processing_type == 'LULC' and value is not None:
                    value = int(value)  # Ensure integer for classification
            
            return value
        
        # Get the pixel value using the async helper function
        value = await get_image_and_sample()

        # Return the result
        return {
            "success": True,
            "value": value,
            "processing_type": processing_type,
            "coordinates": request.coordinates
        }
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logging.exception(f"Error in pixel value endpoint: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to fetch pixel value: {str(e)}"
        }