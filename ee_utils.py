import ee
import os
import re
import logging
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from ee_modules import rgb, ndvi, water, lulc, lst
import google.auth.credentials
from functools import lru_cache
from typing import Dict, Tuple, Optional, List, Union, Any
import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

@lru_cache(maxsize=128)
def _geocode_location(location: str) -> Optional[Tuple[float, float]]:
    """
    Geocodes a location using Geopy. This part is cached.
    Returns a tuple of (latitude, longitude) or None if geocoding fails.
    """
    try:
        geolocator = Nominatim(user_agent="earth_engine_map_app")
        geocode = geolocator.geocode(location, timeout=10)  # Added timeout
        if geocode:
            return geocode.latitude, geocode.longitude
        else:
            logging.warning(f"No geocoding results found for: {location}")
            return None
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        logging.error(f"Geocoding failed for {location}: {e}")
        return None
    except Exception as e:
        logging.error(f"Unexpected error during geocoding for {location}: {e}")
        return None


def get_admin_boundary(location: str, start_date: Optional[str] = None, end_date: Optional[str] = None, 
                      latitude: Optional[float] = None, longitude: Optional[float] = None, 
                      llm=None, LLM_INITIALIZED=False) -> Optional[ee.Geometry]:
    """
    Geocodes a location and retrieves its administrative boundary.
    Uses provided coordinates, then Geopy (cached), with LLM fallback.
    
    Returns an ee.Geometry object or None if lookup fails.
    """
    point = None

    # Try provided coordinates first
    if latitude is not None and longitude is not None:
        point = ee.Geometry.Point(longitude, latitude)
        logging.info(f"Using provided coordinates: {latitude}, {longitude}")
    else:
        # Try Geopy (cached)
        geopy_coords = _geocode_location(location)
        if geopy_coords:
            latitude, longitude = geopy_coords
            point = ee.Geometry.Point(longitude, latitude)
            logging.info(f"Using Geopy coordinates: {latitude}, {longitude}")
        else:
            # Fallback to LLM
            logging.warning("No coordinates found with Geopy, attempting LLM-assisted geocoding")
            if llm and LLM_INITIALIZED:
                llm_coords = get_llm_coordinates(location, start_date, end_date, llm, LLM_INITIALIZED)
                if llm_coords:
                    latitude, longitude = llm_coords
                    point = ee.Geometry.Point(longitude, latitude)
                    logging.info(f"LLM provided coordinates: {latitude}, {longitude}")
                else:
                    logging.warning("LLM could not provide coordinates.")
                    return None
            else:
                logging.warning("LLM not available for geocoding fallback")
                return None

    if point is None:  # Double-check we have a point
        return None

    try:
        # Load the FAO GAUL administrative boundaries dataset
        admin2 = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level2')

        # Find the feature that intersects the point
        feature = admin2.filterBounds(point).first()

        # Extract the geometry
        if feature is None:
            logging.warning(f"No admin boundary found for {location} at ({latitude}, {longitude})")
            # Fall back to a buffer around the point
            buffer_distance = 10000  # 10km buffer
            return point.buffer(buffer_distance)

        geometry = feature.geometry()
        return geometry
    except Exception as e:
        logging.error(f"Error retrieving admin boundary: {e}")
        # Fallback to point buffer if admin boundary lookup fails
        if point is not None:
            buffer_distance = 10000  # 10km buffer
            return point.buffer(buffer_distance)
        return None


async def get_llm_coordinates(location: str, start_date: Optional[str] = None, end_date: Optional[str] = None, 
                              llm=None, LLM_INITIALIZED=False) -> Optional[Tuple[float, float]]:
    """
    Uses the LLM to obtain coordinates for a location.
    
    Returns a tuple of (latitude, longitude) or None if lookup fails.
    """
    if not llm or not LLM_INITIALIZED:
        logging.error("LLM not initialized, cannot get coordinates")
        return None

    try:
        # Build context-aware prompt
        date_context = ""
        if start_date and end_date:
            date_context = f" for the period between {start_date} and {end_date}"
        elif start_date:
            date_context = f" around the date {start_date}"

        prompt = f"What are the latitude and longitude coordinates for: {location}{date_context}? Return only the numbers, comma-separated (e.g., 34.0522,-118.2437) or None if unknown."
        logging.info(f"Sending coordinate request to LLM: {prompt}")
        
        # Get response from LLM
        response = await llm.ainvoke(prompt)
        logging.info(f"LLM coordinate response: {response}")

        # Extract coordinates using regex
        coords_match = re.search(r"([-+]?\d*\.\d+|[-+]?\d+),([-+]?\d*\.\d+|[-+]?\d+)", response)
        if coords_match:
            try:
                latitude = float(coords_match.group(1))
                longitude = float(coords_match.group(2))
                return latitude, longitude
            except ValueError:
                logging.error(f"Could not convert LLM response to coordinates: {response}")
                return None
        else:
            if "none" in response.lower():
                logging.warning(f"LLM indicates no coordinates found for: {location}")
                return None
            logging.warning(f"Could not extract coordinates from LLM response: {response}")
            return None

    except Exception as e:
        logging.exception(f"Error getting coordinates from LLM: {e}")
        return None


def get_clipped_tile_url(image: ee.Image, geometry: ee.Geometry, vis_params: Dict, project_id: str) -> Optional[str]:
    """
    Clips an Earth Engine image to a geometry and returns the tile URL.
    
    Returns a URL string or None if the operation fails.
    """
    try:
        # Clip the image to the geometry
        clipped_image = image.clip(geometry)

        # Get the Map ID
        map_id = clipped_image.getMapId(vis_params)

        return map_id['tile_fetcher'].url_format

    except Exception as e:
        logging.error(f"Error getting clipped tile URL: {e}")
        return None


def process_image(geometry: ee.Geometry, processing_type: str, satellite: Optional[str] = None, 
                 start_date: Optional[str] = None, end_date: Optional[str] = None, 
                 year: Optional[int] = None) -> Tuple[Optional[ee.Image], Optional[Dict]]:
    """
    Combines image retrieval and visualization parameter selection.
    Handles satellite and date options for all processing types.
    
    Returns a tuple of (ee.Image, visualization_parameters) or (None, None) if processing fails.
    """
    try:
        # Log input parameters for debugging
        logging.info(f"Processing image: type={processing_type}, satellite={satellite}, dates={start_date} to {end_date}, year={year}")

        # Process based on type
        if processing_type == 'RGB':
            # Pass year parameter to RGB module for month/year handling
            image, vis_params = rgb.add_rgb_imagery(geometry, satellite, start_date, end_date, year)
        elif processing_type == 'NDVI':
            logging.info(f"Calling NDVI with dates: {start_date} to {end_date}")
            image, vis_params = ndvi.add_sentinel_ndvi(geometry, start_date, end_date)
        elif processing_type == 'SURFACE WATER':
            image, vis_params = water.add_surface_water(geometry)
        elif processing_type == 'LULC':
            image, vis_params = lulc.add_lulc(geometry)
        elif processing_type == 'LST':
            if year is None:
                logging.error("Year must be specified for LST processing.")
                return None, None
            image, vis_params = lst.add_landsat_lst(geometry, year)
        else:
            logging.warning(f"Invalid processing type: {processing_type}")
            return None, None

        # Log result status
        if image is None:
            logging.warning(f"No image returned for {processing_type}")
        else:
            logging.info(f"Successfully processed {processing_type} image")

        return image, vis_params
    except Exception as e:
        logging.error(f"Error in process_image: {e}")
        return None, None

def get_tile_url(location: str, processing_type: str, project_id: str, satellite: Optional[str] = None, 
                start_date: Optional[str] = None, end_date: Optional[str] = None, year: Optional[int] = None, 
                latitude: Optional[float] = None, longitude: Optional[float] = None, 
                llm=None, LLM_INITIALIZED=False) -> Optional[str]:
    """
    Fetches an Earth Engine tile URL.
    Includes options for satellite, start_date, and end_date for all processing types.
    Uses provided coordinates if available.
    
    Returns a URL string or None if the operation fails.
    """
    try:
        # Get the administrative boundary
        geometry = get_admin_boundary(location, start_date, end_date, latitude, longitude, llm, LLM_INITIALIZED)
        if geometry is None:
            logging.warning(f"Could not retrieve administrative boundary for {location}")
            return None

        # Get the Earth Engine image and visualization parameters
        image, vis_params = process_image(geometry, processing_type, satellite, start_date, end_date, year)
        if image is None or vis_params is None:
            logging.warning(f"Could not retrieve image or visualization parameters for {location} and {processing_type}")
            return None

        # Get the clipped tile URL
        tile_url = get_clipped_tile_url(image, geometry, vis_params, project_id)
        if tile_url is None:
            logging.warning(f"Could not generate tile URL for {location} and {processing_type}")
            
        return tile_url

    except Exception as e:
        logging.error(f"Error in get_tile_url: {e}")
        return None


def process_time_series(geometry: ee.Geometry, processing_type: str, start_date: str, end_date: str, 
                       interval: str = "monthly", project_id: str = None) -> List[Dict[str, Any]]:
    """
    Process a time series of images for a given location and processing type.
    
    Args:
        geometry: Earth Engine geometry object
        processing_type: Type of processing (RGB, NDVI, etc.)
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        interval: Time interval ('daily', 'weekly', 'monthly', 'yearly')
        project_id: GCP project ID
        
    Returns:
        List of dictionaries with time series data and URLs
    """
    try:
        # Parse dates
        start = datetime.datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.datetime.strptime(end_date, '%Y-%m-%d')
        
        # Generate date intervals
        dates = []
        if interval == 'daily':
            # For daily, create a list of dates from start to end
            delta = datetime.timedelta(days=1)
            current = start
            while current <= end:
                dates.append(current.strftime('%Y-%m-%d'))
                current += delta
        elif interval == 'weekly':
            # For weekly, create dates at 7-day intervals
            delta = datetime.timedelta(days=7)
            current = start
            while current <= end:
                dates.append(current.strftime('%Y-%m-%d'))
                current += delta
        elif interval == 'monthly':
            # For monthly, create dates at the 1st of each month
            current = datetime.datetime(start.year, start.month, 1)
            while current <= end:
                dates.append(current.strftime('%Y-%m-%d'))
                # Move to next month (handle year rollover)
                if current.month == 12:
                    current = datetime.datetime(current.year + 1, 1, 1)
                else:
                    current = datetime.datetime(current.year, current.month + 1, 1)
        elif interval == 'yearly':
            # For yearly, create dates at the 1st of January each year
            for year in range(start.year, end.year + 1):
                dates.append(f"{year}-01-01")
        else:
            logging.error(f"Invalid interval: {interval}")
            return []
            
        logging.info(f"Generated {len(dates)} dates for time series")
        
        # Process each date and generate time series data
        results = []
        for i, date_str in enumerate(dates):
            logging.info(f"Processing time series date {i+1}/{len(dates)}: {date_str}")
            
            # For RGB and simple visualizations, we need a small date range
            # For intervals like NDVI, we might want to use a range
            date_end = date_str
            
            # For monthly/yearly, use the entire month/year
            if interval == 'monthly':
                date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d')
                if date_obj.month == 12:
                    next_month = datetime.datetime(date_obj.year + 1, 1, 1) - datetime.timedelta(days=1)
                else:
                    next_month = datetime.datetime(date_obj.year, date_obj.month + 1, 1) - datetime.timedelta(days=1)
                date_end = next_month.strftime('%Y-%m-%d')
            elif interval == 'yearly':
                date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d')
                date_end = f"{date_obj.year}-12-31"
                
            # Extract year for LST processing
            year = datetime.datetime.strptime(date_str, '%Y-%m-%d').year
                
            # Get image and visualization parameters
            image, vis_params = process_image(geometry, processing_type, None, date_str, date_end, year)
            
            if image is not None and vis_params is not None:
                # Get tile URL
                tile_url = get_clipped_tile_url(image, geometry, vis_params, project_id)
                
                # For certain processing types, calculate statistics
                stats = None
                if processing_type == 'NDVI':
                    stats = calculate_ndvi_stats(image, geometry)
                elif processing_type == 'LST':
                    stats = calculate_lst_stats(image, geometry)
                
                # Save result including date, URL and stats
                result = {
                    'date': date_str,
                    'end_date': date_end,
                    'tile_url': tile_url,
                    'statistics': stats
                }
                results.append(result)
            else:
                logging.warning(f"Could not process image for date: {date_str}")
                # Add placeholder for missing data
                results.append({
                    'date': date_str,
                    'end_date': date_end,
                    'tile_url': None,
                    'statistics': None,
                    'error': 'Could not process image for this date'
                })
        
        return results
    except Exception as e:
        logging.exception(f"Error processing time series: {e}")
        return []


def calculate_ndvi_stats(image: ee.Image, geometry: ee.Geometry) -> Dict[str, Any]:
    """Calculate NDVI statistics for an image within a geometry."""
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
            scale=30,  # 30m resolution for Sentinel-2
            maxPixels=1e9
        ).getInfo()
        
        # Format the results
        return {
            'mean': stats.get('NDVI_mean'),
            'std_dev': stats.get('NDVI_stdDev'),
            'min': stats.get('NDVI_min'),
            'max': stats.get('NDVI_max')
        }
    except Exception as e:
        logging.error(f"Error calculating NDVI stats: {e}")
        return None


def calculate_lst_stats(image: ee.Image, geometry: ee.Geometry) -> Dict[str, Any]:
    """Calculate land surface temperature statistics for an image within a geometry."""
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
            'mean': stats.get('LST_mean'),
            'std_dev': stats.get('LST_stdDev'),
            'min': stats.get('LST_min'),
            'max': stats.get('LST_max')
        }
    except Exception as e:
        logging.error(f"Error calculating LST stats: {e}")
        return None


def get_area_statistics(geometry: ee.Geometry, image_collection: str, band_name: str, 
                       start_date: str, end_date: str) -> Dict[str, Any]:
    """
    Get statistics for a custom area and time period.
    
    Args:
        geometry: Earth Engine geometry
        image_collection: Name of EE image collection
        band_name: Band to analyze
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        
    Returns:
        Dictionary with area statistics
    """
    try:
        # Load the image collection
        collection = ee.ImageCollection(image_collection)\
            .filterDate(start_date, end_date)\
            .filterBounds(geometry)\
            .select(band_name)
        
        # Calculate mean over time
        mean_image = collection.mean()
        
        # Calculate statistics
        stats = mean_image.reduceRegion(
            reducer=ee.Reducer.mean().combine(
                reducer2=ee.Reducer.stdDev(),
                sharedInputs=True
            ).combine(
                reducer2=ee.Reducer.minMax(),
                sharedInputs=True
            ),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        ).getInfo()
        
        # Calculate area
        area_m2 = geometry.area().getInfo()
        area_km2 = area_m2 / 1000000
        
        return {
            'statistics': stats,
            'area_m2': area_m2,
            'area_km2': area_km2,
            'timespan': {
                'start_date': start_date,
                'end_date': end_date
            }
        }
    except Exception as e:
        logging.exception(f"Error calculating area statistics: {e}")
        return None