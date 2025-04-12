import ee
import logging
from typing import Tuple, Dict, Optional, Union, Any

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def add_temperature(geometry, year=2020, month=1, dataset_type='air'):
    """
    Add temperature layer using ERA5 or other climate datasets.
    
    Args:
        geometry: The region of interest
        year: Year for temperature data
        month: Month for temperature data (1-12)
        dataset_type: Type of temperature ('air', 'surface', or 'land')
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Determine start and end dates
        start_date = ee.Date.fromYMD(year, month, 1)
        if month == 12:
            end_date = ee.Date.fromYMD(year + 1, 1, 1)
        else:
            end_date = ee.Date.fromYMD(year, month + 1, 1)
        
        # Choose dataset based on type
        if dataset_type == 'surface':
            # ERA5 land surface temperature
            collection = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
            band_name = 'skin_temperature'
            unit_conversion = 1  # Kelvin
            min_value = 250
            max_value = 320
            
        elif dataset_type == 'land':
            # MODIS Land Surface Temperature
            collection = ee.ImageCollection('MODIS/006/MOD11A1')
            band_name = 'LST_Day_1km'
            unit_conversion = 0.02  # Scale factor
            min_value = 250
            max_value = 320
            
        else:
            # Default to ERA5 air temperature
            collection = ee.ImageCollection('ECMWF/ERA5/MONTHLY')
            band_name = 'mean_2m_air_temperature'
            unit_conversion = 1  # Kelvin
            min_value = 250
            max_value = 320
        
        # Filter collection by date
        filtered = collection.filterDate(start_date, end_date)
        
        # Check if collection has data
        count = filtered.size().getInfo()
        if count == 0:
            logging.warning(f"No data available for {dataset_type} temperature in {year}-{month}")
            return None, None
        
        # Calculate mean temperature for the period
        temp_image = filtered.select(band_name).mean()
        
        # Convert units to Kelvin if needed
        if unit_conversion != 1:
            temp_image = temp_image.multiply(unit_conversion)
        
        # Clip to geometry
        temp_image = temp_image.clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': min_value,
            'max': max_value,
            'palette': [
                '000080', '0000D9', '4000FF', '8000FF', 'C000FF', 'FF00FF', 'FF0040', 
                'FF0000', 'FF4000', 'FF8000', 'FFC000', 'FFFF00', 'C0FF00', '80FF00', 
                '40FF00', '00FF00', '00FF40', '00FF80', '00FFC0', '00FFFF', '00C0FF'
            ]
        }
        
        return temp_image, vis_params
        
    except Exception as e:
        logging.error(f"Error processing temperature: {e}")
        return None, None

def add_precipitation(geometry, year=2020, month=1, cumulative=True):
    """
    Add precipitation layer using ERA5 or CHIRPS datasets.
    
    Args:
        geometry: The region of interest
        year: Year for precipitation data
        month: Month for precipitation data (1-12)
        cumulative: Whether to show cumulative monthly precipitation (True) or daily mean (False)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Determine start and end dates
        start_date = ee.Date.fromYMD(year, month, 1)
        if month == 12:
            end_date = ee.Date.fromYMD(year + 1, 1, 1)
        else:
            end_date = ee.Date.fromYMD(year, month + 1, 1)
        
        # Use CHIRPS dataset for precipitation
        collection = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
        band_name = 'precipitation'
        
        # Filter collection by date
        filtered = collection.filterDate(start_date, end_date)
        
        # Check if collection has data
        count = filtered.size().getInfo()
        if count == 0:
            logging.warning(f"No precipitation data available for {year}-{month}")
            return None, None
        
        # Calculate precipitation
        if cumulative:
            # Sum all daily precipitation for the month
            precip_image = filtered.select(band_name).sum()
            min_value = 0
            max_value = 500  # mm per month
        else:
            # Calculate daily mean precipitation
            precip_image = filtered.select(band_name).mean()
            min_value = 0
            max_value = 25  # mm per day
        
        # Clip to geometry
        precip_image = precip_image.clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': min_value,
            'max': max_value,
            'palette': ['001137', '0aab1e', 'e7eb05', 'ff4a2d', 'e90000']
        }
        
        return precip_image, vis_params
        
    except Exception as e:
        logging.error(f"Error processing precipitation: {e}")
        return None, None

def add_drought_index(geometry, year=2020, month=1):
    """
    Add standardized precipitation index (SPI) as drought indicator.
    
    Args:
        geometry: The region of interest
        year: Year for drought data
        month: Month for drought data (1-12)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # TerraClimate dataset includes PDSI (Palmer Drought Severity Index)
        # and other climate variables
        
        # Determine date
        date = ee.Date.fromYMD(year, month, 1)
        
        # Get TerraClimate dataset
        collection = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
        
        # Filter to specific month
        filtered = collection.filter(
            ee.Filter.calendarRange(year, year, 'year')
        ).filter(
            ee.Filter.calendarRange(month, month, 'month')
        )
        
        # Check if collection has data
        count = filtered.size().getInfo()
        if count == 0:
            logging.warning(f"No drought index data available for {year}-{month}")
            return None, None
        
        # Use Palmer Drought Severity Index
        pdsi = filtered.select('pdsi').first().clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': -6,  # Extreme drought
            'max': 6,   # Extreme wet
            'palette': ['a50026', 'd73027', 'f46d43', 'fdae61', 'fee090', 'ffffbf', 
                        'e0f3f8', 'abd9e9', '74add1', '4575b4', '313695']
        }
        
        return pdsi, vis_params
        
    except Exception as e:
        logging.error(f"Error processing drought index: {e}")
        return None, None

def add_soil_moisture(geometry, year=2020, month=1):
    """
    Add soil moisture layer using ERA5 Land dataset.
    
    Args:
        geometry: The region of interest
        year: Year for soil moisture data
        month: Month for soil moisture data (1-12)
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Determine start and end dates
        start_date = ee.Date.fromYMD(year, month, 1)
        if month == 12:
            end_date = ee.Date.fromYMD(year + 1, 1, 1)
        else:
            end_date = ee.Date.fromYMD(year, month + 1, 1)
        
        # Get ERA5-Land dataset
        collection = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY')
        
        # Filter collection by date
        filtered = collection.filterDate(start_date, end_date)
        
        # Check if collection has data
        count = filtered.size().getInfo()
        if count == 0:
            logging.warning(f"No soil moisture data available for {year}-{month}")
            return None, None
        
        # Get volumetric soil water layer 1 (0-7cm depth)
        soil_moisture = filtered.select('volumetric_soil_water_layer_1').first().clip(geometry)
        
        # Define visualization parameters
        vis_params = {
            'min': 0,
            'max': 0.5,  # m³/m³
            'palette': ['ff0000', 'ffff00', '00ff00', '0000ff', '000080']
        }
        
        return soil_moisture, vis_params
        
    except Exception as e:
        logging.error(f"Error processing soil moisture: {e}")
        return None, None

def add_climate_anomaly(geometry, variable='temperature', year=2020, month=1, reference_period=(1980, 2010)):
    """
    Add climate anomaly layer to show deviations from long-term mean.
    
    Args:
        geometry: The region of interest
        variable: Climate variable ('temperature', 'precipitation')
        year: Year for anomaly data
        month: Month for anomaly data (1-12)
        reference_period: Tuple with start and end years for reference period
        
    Returns:
        tuple: (ee.Image, vis_params) or (None, None) if processing fails
    """
    try:
        # Determine start and end dates for target month
        target_start = ee.Date.fromYMD(year, month, 1)
        if month == 12:
            target_end = ee.Date.fromYMD(year + 1, 1, 1)
        else:
            target_end = ee.Date.fromYMD(year, month + 1, 1)
            
        # Set up reference period
        ref_start = ee.Date.fromYMD(reference_period[0], 1, 1)
        ref_end = ee.Date.fromYMD(reference_period[1] + 1, 1, 1)
        
        # Choose dataset based on variable
        if variable == 'precipitation':
            # Use CHIRPS for precipitation
            collection = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD')
            band_name = 'precipitation'
            target_collection = collection.filterDate(target_start, target_end).select(band_name)
            
            # Calculate reference mean for the same month across reference period
            reference_mean = collection.filter(
                ee.Filter.calendarRange(month, month, 'month')
            ).filterDate(
                ref_start, ref_end
            ).select(band_name).mean()
            
            # Target image (mean for the month)
            target_image = target_collection.mean()
            
            # Calculate anomaly as percentage of normal
            anomaly = target_image.divide(reference_mean).multiply(100).subtract(100)
            
            # Visualization parameters
            vis_params = {
                'min': -80,  # 20% of normal
                'max': 80,   # 180% of normal
                'palette': ['a50026', 'd73027', 'f46d43', 'fdae61', 'fee090', 'f7f7f7', 
                           'e0f3f8', 'abd9e9', '74add1', '4575b4', '313695']
            }
            
        else:  # Default to temperature
            # Use ERA5 for temperature
            collection = ee.ImageCollection('ECMWF/ERA5/MONTHLY')
            band_name = 'mean_2m_air_temperature'
            
            target_collection = collection.filterDate(target_start, target_end).select(band_name)
            
            # Calculate reference mean for the same month across reference period
            reference_mean = collection.filter(
                ee.Filter.calendarRange(month, month, 'month')
            ).filterDate(
                ref_start, ref_end
            ).select(band_name).mean()
            
            # Target image (mean for the month)
            target_image = target_collection.mean()
            
            # Calculate anomaly in degrees Kelvin
            anomaly = target_image.subtract(reference_mean)
            
            # Visualization parameters
            vis_params = {
                'min': -3,  # 3K below normal
                'max': 3,   # 3K above normal
                'palette': ['a50026', 'd73027', 'f46d43', 'fdae61', 'fee090', 'f7f7f7', 
                           'e0f3f8', 'abd9e9', '74add1', '4575b4', '313695']
            }
            
        # Clip to geometry
        anomaly = anomaly.clip(geometry)
        
        return anomaly, vis_params
        
    except Exception as e:
        logging.error(f"Error processing climate anomaly: {e}")
        return None, None

def calculate_climate_stats(image: ee.Image, geometry: ee.Geometry) -> Dict[str, Any]:
    """Calculate climate statistics for an image within a geometry."""
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
            scale=1000,  # 1km resolution typical for climate data
            maxPixels=1e9
        ).getInfo()
        
        # Format the results - extract the first band's stats
        band_name = list(stats.keys())[0].split('_')[0] if stats else 'climate'
        
        return {
            'mean': stats.get(f'{band_name}_mean'),
            'std_dev': stats.get(f'{band_name}_stdDev'),
            'min': stats.get(f'{band_name}_min'),
            'max': stats.get(f'{band_name}_max')
        }
    except Exception as e:
        logging.error(f"Error calculating climate stats: {e}")
        return None 