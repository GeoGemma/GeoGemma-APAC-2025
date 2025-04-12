import ee
import logging
from typing import Tuple, Dict, Optional, Union, Any

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def add_elevation(geometry):
    """
    Add elevation layer using SRTM 30m global DEM.
    
    Args:
        geometry: The region of interest
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get SRTM digital elevation model
        srtm = ee.Image('USGS/SRTMGL1_003').clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 3000,  # Adjust based on your area's elevation range
            'palette': ['006633', '339966', '99cc66', 'cc9966', 'cc6633', 'ffffff']
        }
        
        return srtm, vis_params
        
    except Exception as e:
        logging.error(f"Error processing elevation: {e}")
        return None, None

def add_slope(geometry):
    """
    Add slope layer derived from SRTM data.
    
    Args:
        geometry: The region of interest
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get SRTM digital elevation model
        srtm = ee.Image('USGS/SRTMGL1_003')
        
        # Calculate slope
        slope = ee.Terrain.slope(srtm).clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 45,  # Degrees
            'palette': ['f7fcb9', 'addd8e', '31a354', '006837']
        }
        
        return slope, vis_params
        
    except Exception as e:
        logging.error(f"Error processing slope: {e}")
        return None, None

def add_aspect(geometry):
    """
    Add aspect layer derived from SRTM data.
    
    Args:
        geometry: The region of interest
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get SRTM digital elevation model
        srtm = ee.Image('USGS/SRTMGL1_003')
        
        # Calculate aspect
        aspect = ee.Terrain.aspect(srtm).clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 360,  # Degrees (0=north, 90=east, 180=south, 270=west)
            'palette': ['ff0000', 'ffff00', '00ff00', '00ffff', '0000ff', 'ff00ff', 'ff0000']
        }
        
        return aspect, vis_params
        
    except Exception as e:
        logging.error(f"Error processing aspect: {e}")
        return None, None

def add_hillshade(geometry):
    """
    Add hillshade visualization derived from SRTM data.
    
    Args:
        geometry: The region of interest
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get SRTM digital elevation model
        srtm = ee.Image('USGS/SRTMGL1_003')
        
        # Calculate hillshade with default parameters
        hillshade = ee.Terrain.hillshade(srtm).clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 255,
            'palette': ['000000', 'ffffff']
        }
        
        return hillshade, vis_params
        
    except Exception as e:
        logging.error(f"Error processing hillshade: {e}")
        return None, None

def add_terrain_analysis(geometry, analysis_type='elevation'):
    """
    Add terrain analysis layer, selecting the type of analysis.
    
    Args:
        geometry: The region of interest
        analysis_type: Type of terrain analysis ('elevation', 'slope', 'aspect', 'hillshade')
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Choose analysis type
        if analysis_type.lower() == 'slope':
            return add_slope(geometry)
        elif analysis_type.lower() == 'aspect':
            return add_aspect(geometry)
        elif analysis_type.lower() == 'hillshade':
            return add_hillshade(geometry)
        else:
            # Default to elevation
            return add_elevation(geometry)
            
    except Exception as e:
        logging.error(f"Error in terrain analysis: {e}")
        return None, None

def add_tpi(geometry):
    """
    Add Topographic Position Index (TPI) derived from SRTM data.
    
    Args:
        geometry: The region of interest
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get SRTM digital elevation model
        srtm = ee.Image('USGS/SRTMGL1_003')
        
        # Calculate focal mean with a kernel appropriate for TPI
        kernel = ee.Kernel.circle(radius=200, units='meters')
        neighborhood_mean = srtm.focal_mean(kernel=kernel)
        
        # TPI is the difference between the cell's value and the neighborhood mean
        tpi = srtm.subtract(neighborhood_mean).clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': -100,
            'max': 100,
            'palette': ['0000ff', 'ffffff', 'ff0000']
        }
        
        return tpi, vis_params
        
    except Exception as e:
        logging.error(f"Error processing TPI: {e}")
        return None, None

def add_roughness(geometry):
    """
    Add terrain roughness index derived from SRTM data.
    
    Args:
        geometry: The region of interest
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Get SRTM digital elevation model
        srtm = ee.Image('USGS/SRTMGL1_003')
        
        # Calculate focal standard deviation with a kernel
        kernel = ee.Kernel.circle(radius=100, units='meters')
        roughness = srtm.focal_std(kernel=kernel).clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 50,
            'palette': ['f7fcb9', 'd9f0a3', 'addd8e', '78c679', '41ab5d', '238443', '005a32']
        }
        
        return roughness, vis_params
        
    except Exception as e:
        logging.error(f"Error processing roughness: {e}")
        return None, None

def calculate_terrain_stats(image: ee.Image, geometry: ee.Geometry) -> Dict[str, Any]:
    """Calculate terrain statistics for an image within a geometry."""
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
            scale=30,  # 30m resolution (SRTM)
            maxPixels=1e9
        ).getInfo()
        
        # Format the results - extract the first band's stats
        band_name = list(stats.keys())[0].split('_')[0] if stats else 'elevation'
        
        return {
            'mean': stats.get(f'{band_name}_mean'),
            'std_dev': stats.get(f'{band_name}_stdDev'),
            'min': stats.get(f'{band_name}_min'),
            'max': stats.get(f'{band_name}_max')
        }
    except Exception as e:
        logging.error(f"Error calculating terrain stats: {e}")
        return None 