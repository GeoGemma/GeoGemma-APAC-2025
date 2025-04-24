import ee
import logging
from typing import Tuple, Dict, Optional, Union, Any

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def add_built_up_area(geometry, year=2020):
    """
    Add built-up area layer using Global Human Settlement Layer (GHSL).
    
    Args:
        geometry: The region of interest
        year: Year for built-up area (1975, 1990, 2000, 2014, or 2018)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Map year to available GHSL epochs
        valid_years = {1975: 1975, 1990: 1990, 2000: 2000, 2014: 2014, 2018: 2018}
        
        # Find closest valid year
        closest_year = min(valid_years.keys(), key=lambda x: abs(x - year))
        year_band = f"built_up_{closest_year}"
        
        # Get the GHSL dataset
        ghsl = ee.Image('JRC/GHSL/P2016/BUILT_LDSMT_GLOBE_V1').select(year_band).clip(geometry)
        
        # GHSL values: 0=no data, 1=water, 2=not built-up, 3=built-up
        # Create a mask for built-up areas only
        built_up = ghsl.eq(3)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 1,
            'palette': ['000000', 'FF0000']
        }
        
        return built_up, vis_params
        
    except Exception as e:
        logging.error(f"Error processing built-up area: {e}")
        return None, None

def add_urban_change(geometry, start_year=2000, end_year=2018):
    """
    Add urban change layer using Global Human Settlement Layer (GHSL).
    
    Args:
        geometry: The region of interest
        start_year: Starting year (1975, 1990, 2000, 2014, or 2018)
        end_year: Ending year (1975, 1990, 2000, 2014, or 2018)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Map years to available GHSL epochs
        valid_years = {1975: 1975, 1990: 1990, 2000: 2000, 2014: 2014, 2018: 2018}
        
        # Find closest valid years
        start = min(valid_years.keys(), key=lambda x: abs(x - start_year))
        end = min(valid_years.keys(), key=lambda x: abs(x - end_year))
        
        # Make sure end year is after start year
        if end <= start:
            end = 2018  # Default to most recent
            start = 2000 if start > 2000 else start  # Use 2000 or earlier
        
        # Get band names
        start_band = f"built_up_{start}"
        end_band = f"built_up_{end}"
        
        # Get the GHSL dataset
        ghsl = ee.Image('JRC/GHSL/P2016/BUILT_LDSMT_GLOBE_V1')
        
        # GHSL values: 0=no data, 1=water, 2=not built-up, 3=built-up
        
        # Get built-up areas for each year
        start_built = ghsl.select(start_band).eq(3)
        end_built = ghsl.select(end_band).eq(3)
        
        # Calculate change
        # 1 = new development (not built in start, built in end)
        # 2 = persistent built-up (built in both periods)
        # 0 = not built-up (in either period)
        new_development = end_built.eq(1).and(start_built.eq(0)).multiply(1)
        persistent = end_built.eq(1).and(start_built.eq(1)).multiply(2)
        
        urban_change = new_development.add(persistent).clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 2,
            'palette': ['000000', 'FF0000', 'FFA500']
        }
        
        return urban_change, vis_params
        
    except Exception as e:
        logging.error(f"Error processing urban change: {e}")
        return None, None

def add_night_lights(geometry, year=2020, month=1):
    """
    Add night lights layer using VIIRS or DMSP-OLS data.
    
    Args:
        geometry: The region of interest
        year: Year for night lights (1992-2022)
        month: Month for night lights (1-12, only for VIIRS)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Choose dataset based on year
        if year >= 2012:
            # Use VIIRS for more recent data
            # Format date for filtering
            date_start = ee.Date.fromYMD(year, month, 1)
            date_end = date_start.advance(1, 'month')
            
            # Get the VIIRS dataset
            viirs = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
            
            # Filter by date and get average if multiple images
            night_lights = viirs.filterDate(date_start, date_end).select('avg_rad').mean().clip(geometry)
            
            # Define visualization parameters
            vis_params = {
                'min': 0,
                'max': 60,
                'palette': ['000000', '0000FF', '00FFFF', 'FFFF00', 'FF0000']
            }
            
        else:
            # Use DMSP-OLS for older data
            # Find closest available year
            available_years = list(range(1992, 2014))
            closest_year = min(available_years, key=lambda x: abs(x - year))
            
            # Get the DMSP-OLS dataset
            dataset_name = f"NOAA/DMSP-OLS/NIGHTTIME_LIGHTS/F{10 + (closest_year - 1992) // 4}"
            dmsp = ee.Image(f"{dataset_name}/{closest_year}")
            
            # Select stable lights band
            night_lights = dmsp.select('stable_lights').clip(geometry)
            
            # Define visualization parameters
            vis_params = {
                'min': 0,
                'max': 63,
                'palette': ['000000', '0000FF', '00FFFF', 'FFFF00', 'FF0000']
            }
        
        return night_lights, vis_params
        
    except Exception as e:
        logging.error(f"Error processing night lights: {e}")
        return None, None

def add_impervious_surface(geometry, year=2020):
    """
    Add impervious surface layer using USGS Impervious Surface dataset.
    
    Args:
        geometry: The region of interest
        year: Year for impervious surface (closest to 2001, 2006, 2011, 2016)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Map year to available dataset epochs
        if year <= 2003:
            collection_year = 2001
        elif year <= 2008:
            collection_year = 2006
        elif year <= 2013:
            collection_year = 2011
        else:
            collection_year = 2016
        
        # Get the USGS Impervious Surface dataset
        imp = ee.Image(f"USGS/NLCD/{collection_year}_IMP").select('impervious').clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 100,
            'palette': ['000000', '333333', '666666', '999999', 'CCCCCC', 'FFFFFF']
        }
        
        return imp, vis_params
        
    except Exception as e:
        logging.error(f"Error processing impervious surface: {e}")
        return None, None

def add_urban_density(geometry, year=2020):
    """
    Add urban density layer using Global Human Settlement Layer (GHSL) population dataset.
    
    Args:
        geometry: The region of interest
        year: Year for population density (closest to 1975, 1990, 2000, 2015)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Map year to available dataset epochs
        if year <= 1982:
            collection_year = 1975
        elif year <= 1995:
            collection_year = 1990
        elif year <= 2007:
            collection_year = 2000
        else:
            collection_year = 2015
        
        # Get the GHSL population dataset
        pop = ee.Image(f"JRC/GHSL/P2016/POP_GPW_GLOBE_V1/GHS_POP_GPW{collection_year}_GLOBE_R2016A_54009_1k").select('population').clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 1000,  # Adjust based on area density
            'palette': ['000000', '0000FF', '00FFFF', 'FFFF00', 'FF0000', 'FFFFFF']
        }
        
        return pop, vis_params
        
    except Exception as e:
        logging.error(f"Error processing urban density: {e}")
        return None, None

def calculate_urban_stats(image: ee.Image, geometry: ee.Geometry) -> Dict[str, Any]:
    """Calculate urban development statistics for an image within a geometry."""
    try:
        # Calculate total area
        total_area = geometry.area().divide(10000)  # convert to hectares
        
        # Calculate built-up area
        built_up = image.gt(0)  # Assuming 0 is not built-up
        built_up_area = built_up.multiply(ee.Image.pixelArea()).divide(10000)
        
        built_up_stats = built_up_area.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        )
        
        # Get the first band's name
        first_band = ee.List(built_up_stats.keys()).get(0)
        built_up_area_value = built_up_stats.get(first_band).getInfo()
        total_area_value = total_area.getInfo()
        
        return {
            'total_area_ha': total_area_value,
            'built_up_area_ha': built_up_area_value,
            'built_up_percentage': (built_up_area_value / total_area_value) * 100 if total_area_value > 0 else 0
        }
    except Exception as e:
        logging.error(f"Error calculating urban stats: {e}")
        return None 