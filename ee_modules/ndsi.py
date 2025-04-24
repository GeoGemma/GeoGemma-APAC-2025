import ee
import logging
from typing import Tuple, Dict, Optional, Union, Any

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def calculate_sentinel_ndsi(image):
    """Calculate Normalized Difference Snow Index (NDSI) for Sentinel-2 imagery."""
    # NDSI = (Green - SWIR1) / (Green + SWIR1)
    # For Sentinel-2: Green is B3, SWIR1 is B11
    ndsi = image.normalizedDifference(['B3', 'B11']).rename('NDSI')
    
    # Add the NDSI band to the image
    return image.addBands(ndsi)

def calculate_landsat_ndsi(image):
    """Calculate Normalized Difference Snow Index (NDSI) for Landsat 8 imagery."""
    # NDSI = (Green - SWIR1) / (Green + SWIR1)
    # For Landsat 8: Green is B3, SWIR1 is B6
    ndsi = image.normalizedDifference(['B3', 'B6']).rename('NDSI')
    
    # Add the NDSI band to the image
    return image.addBands(ndsi)

def add_sentinel_ndsi(geometry, start_date, end_date):
    """
    Add NDSI (Normalized Difference Snow Index) layer from Sentinel-2 imagery.
    
    Args:
        geometry: The region of interest
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get Sentinel-2 surface reflectance collection
        collection = ee.ImageCollection('COPERNICUS/S2_SR') \
            .filterBounds(geometry) \
            .filterDate(start_date, end_date) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
            .select(['B3', 'B11'])
        
        # Check if the collection has images
        count = collection.size().getInfo()
        if count == 0:
            logging.warning(f"No Sentinel-2 images found for date range {start_date} to {end_date}")
            return None, None
            
        # Compute NDSI for each image
        ndsi_collection = collection.map(calculate_sentinel_ndsi)
        
        # Get the median NDSI image
        ndsi_image = ndsi_collection.median().select('NDSI')
        
        # Define visualization parameters
        vis_params = {
            'min': -1.0,
            'max': 1.0,
            'palette': ['000088', '0000FF', '8888FF', 'FFFFFF']
        }
        
        return ndsi_image, vis_params
        
    except Exception as e:
        logging.error(f"Error processing NDSI: {e}")
        return None, None

def add_landsat_ndsi(geometry, start_date, end_date):
    """
    Add NDSI (Normalized Difference Snow Index) layer from Landsat 8 imagery.
    
    Args:
        geometry: The region of interest
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get Landsat 8 surface reflectance collection
        collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') \
            .filterBounds(geometry) \
            .filterDate(start_date, end_date) \
            .filter(ee.Filter.lt('CLOUD_COVER', 20)) \
            .select(['SR_B3', 'SR_B6'], ['B3', 'B6'])  # Rename bands for consistency
        
        # Check if the collection has images
        count = collection.size().getInfo()
        if count == 0:
            logging.warning(f"No Landsat 8 images found for date range {start_date} to {end_date}")
            return None, None
            
        # Scale the surface reflectance bands
        scaled_collection = collection.map(lambda img: 
            img.multiply(0.0000275).add(-0.2).copyProperties(img, ['system:time_start']))
        
        # Compute NDSI for each image
        ndsi_collection = scaled_collection.map(calculate_landsat_ndsi)
        
        # Get the median NDSI image
        ndsi_image = ndsi_collection.median().select('NDSI')
        
        # Define visualization parameters
        vis_params = {
            'min': -1.0,
            'max': 1.0,
            'palette': ['000088', '0000FF', '8888FF', 'FFFFFF']
        }
        
        return ndsi_image, vis_params
        
    except Exception as e:
        logging.error(f"Error processing NDSI: {e}")
        return None, None

def add_ndsi(geometry, start_date=None, end_date=None, satellite="sentinel"):
    """Add NDSI layer, choosing between Sentinel and Landsat based on parameters."""
    try:
        # Set default dates if not provided (last 3 months)
        if not start_date or not end_date:
            end_date = ee.Date(ee.Date.now())
            start_date = end_date.advance(-3, 'month')
            
            # Convert to strings
            end_date = ee.Date(end_date).format('YYYY-MM-dd').getInfo()
            start_date = ee.Date(start_date).format('YYYY-MM-dd').getInfo()
            
        # Choose satellite based on parameter
        if satellite and satellite.lower() == 'landsat':
            return add_landsat_ndsi(geometry, start_date, end_date)
        else:
            # Default to Sentinel-2
            return add_sentinel_ndsi(geometry, start_date, end_date)
            
    except Exception as e:
        logging.error(f"Error in add_ndsi: {e}")
        return None, None

def calculate_ndsi_stats(image: ee.Image, geometry: ee.Geometry) -> Dict[str, Any]:
    """Calculate NDSI statistics for an image within a geometry."""
    try:
        # Calculate statistics using Earth Engine
        reducer = ee.Reducer.mean().combine(
            reducer2=ee.Reducer.stdDev(),
            sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.minMax(),
            sharedInputs=True
        )
        
        stats = image.reduceRegion(
            reducer=reducer,
            geometry=geometry,
            scale=30,  # 30m resolution
            maxPixels=1e9
        ).getInfo()
        
        # Format the results
        return {
            'mean': stats.get('NDSI_mean'),
            'std_dev': stats.get('NDSI_stdDev'),
            'min': stats.get('NDSI_min'),
            'max': stats.get('NDSI_max')
        }
    except Exception as e:
        logging.error(f"Error calculating NDSI stats: {e}")
        return None 