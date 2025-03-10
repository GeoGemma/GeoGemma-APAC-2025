import ee
import os
import re
import logging
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from ee_modules import rgb, ndvi, water, lulc, lst
import google.auth.credentials
from functools import lru_cache
from typing import Dict, Tuple, Optional

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