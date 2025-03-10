import ee
import datetime
import os
import logging
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def parse_date_input(date_input):
    """
    Parses various date formats and returns a standardized YYYY-MM-DD string.
    Handles year-only, month-year, and "latest" inputs.
    """
    if date_input is None:
        return None
        
    # If "latest" is mentioned, return that as a special marker
    if isinstance(date_input, str) and "latest" in date_input.lower():
        return "latest"
        
    # Handle year-only input (e.g., "2022")
    if isinstance(date_input, str) and re.match(r'^\d{4}$', date_input):
        return f"{date_input}-01-01"
        
    # Handle month-year input (e.g., "March 2022" or "03/2022" or "03-2022")
    month_year_patterns = [
        r'(\w+)\s+(\d{4})',                   # March 2022
        r'(\d{1,2})[/-](\d{4})',              # 03/2022 or 03-2022
        r'(\d{4})[/-](\d{1,2})'               # 2022/03 or 2022-03
    ]
    
    for pattern in month_year_patterns:
        if isinstance(date_input, str):
            match = re.match(pattern, date_input)
            if match:
                # Extract month and year
                if match.group(1).isdigit():
                    # If the first group is a number
                    if int(match.group(1)) > 12:  # Format is YYYY-MM
                        year, month = int(match.group(1)), int(match.group(2))
                    else:  # Format is MM-YYYY
                        month, year = int(match.group(1)), int(match.group(2))
                else:
                    # If the first group is a month name
                    month_names = {
                        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
                        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
                    }
                    month = month_names.get(match.group(1).lower(), 1)
                    year = int(match.group(2))
                
                # Get the first day of the month
                return f"{year}-{month:02d}-01"
    
    # If it's already in YYYY-MM-DD format or none of the patterns match, return as is
    return date_input

def get_date_range(start_date, end_date):
    """
    Process start_date and end_date to handle various formats and return a normalized range.
    """
    today = datetime.date.today()
    
    # Process start date
    start_date = parse_date_input(start_date)
    
    # Handle "latest" case
    if start_date == "latest":
        return "latest", "latest"
    
    # Default start date if not provided
    if start_date is None:
        start_date = (today - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
    
    # Process end date
    end_date = parse_date_input(end_date)
    
    # Default end date if not provided
    if end_date is None:
        # If start date is a year-only input that was converted to YYYY-01-01
        if start_date and re.match(r'^\d{4}-01-01$', start_date):
            # Set end date to the end of that year
            year = start_date[:4]
            end_date = f"{year}-12-31"
        # If start date is a month-year input that was converted to YYYY-MM-01
        elif start_date and re.match(r'^\d{4}-\d{2}-01$', start_date):
            # Set end date to the end of that month
            year = int(start_date[:4])
            month = int(start_date[5:7])
            
            # Get the last day of the month
            if month == 12:
                next_month_year = year + 1
                next_month = 1
            else:
                next_month_year = year
                next_month = month + 1
            
            # Last day = one day before the first day of next month
            end_date = (datetime.datetime(next_month_year, next_month, 1) - datetime.timedelta(days=1)).strftime('%Y-%m-%d')
        else:
            end_date = today.strftime('%Y-%m-%d')
    
    logging.info(f"Normalized date range: {start_date} to {end_date}")
    return start_date, end_date

def add_sentinel_ndvi(geometry, start_date=None, end_date=None):
    """Add Sentinel-2 NDVI visualization with date range support."""
    try:
        # Normalize date inputs
        start_date, end_date = get_date_range(start_date, end_date)
        
        # Debug log
        logging.info(f"NDVI request with dates: start={start_date}, end={end_date}")
        
        # Handle "latest" case
        if start_date == "latest" and end_date == "latest":
            logging.info("Fetching latest NDVI imagery")
            # Set date range to last 90 days for searching the latest image
            today = datetime.date.today()
            search_start = (today - datetime.timedelta(days=90)).strftime('%Y-%m-%d')
            search_end = today.strftime('%Y-%m-%d')
            
            # Get Sentinel-2 data
            s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                            .filterBounds(geometry)
                            .filterDate(search_start, search_end)
                            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
            
            # Check if collection is empty
            collection_size = s2_collection.size().getInfo()
            logging.info(f"Sentinel-2 latest collection search size: {collection_size}")
            
            if collection_size == 0:
                logging.warning("No recent Sentinel-2 images found, falling back to Landsat")
                return add_landsat_ndvi(geometry, "latest", "latest")
            
            # Get the most recent image
            most_recent = s2_collection.sort('system:time_start', False).first()
            
            # Calculate NDVI
            ndvi = most_recent.normalizedDifference(['B8', 'B4'])
            
            # Get the actual acquisition date for logging
            image_date = ee.Date(most_recent.get('system:time_start')).format('YYYY-MM-dd').getInfo()
            logging.info(f"Using most recent Sentinel-2 image from {image_date}")
            
        else:
            # Check start date to decide which collection to use
            start_year = int(start_date.split('-')[0])
            
            # Use Sentinel-2 for dates after 2015
            if start_year >= 2015:
                logging.info(f"Using Sentinel-2 for NDVI (year >= 2015)")
                s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                                .filterBounds(geometry)
                                .filterDate(start_date, end_date)
                                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
                
                # Check if collection is empty
                collection_size = s2_collection.size().getInfo()
                logging.info(f"Sentinel-2 collection size: {collection_size}")
                
                if collection_size == 0:
                    logging.warning("Empty Sentinel-2 collection, falling back to Landsat")
                    return add_landsat_ndvi(geometry, start_date, end_date)
                
                median_composite = s2_collection.median()
                ndvi = median_composite.normalizedDifference(['B8', 'B4'])
                
            else:
                # For dates before 2015, use Landsat
                logging.info(f"Start year {start_year} < 2015, using Landsat for NDVI")
                return add_landsat_ndvi(geometry, start_date, end_date)
        
        # Define visualization parameters
        vis_params = {
            'min': -0.2,
            'max': 0.8,
            'palette': [
                'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
                '74A901', '66A000', '529400', '3E8601', '207401', '056201',
                '004C00', '023B01', '012E01', '011D01', '011301'
            ]
        }

        logging.info("Successfully created NDVI visualization")
        return ndvi, vis_params
    except Exception as e:
        logging.error(f"Error in add_sentinel_ndvi: {e}")
        return None, None

def add_landsat_ndvi(geometry, start_date=None, end_date=None):
    """Add Landsat NDVI visualization for historical data."""
    try:
        # Normalize date inputs
        start_date, end_date = get_date_range(start_date, end_date)
        
        logging.info(f"Landsat NDVI for date range: {start_date} to {end_date}")
        
        # Handle "latest" case
        if start_date == "latest" and end_date == "latest":
            logging.info("Fetching latest Landsat NDVI imagery")
            # Set date range to last 90 days for searching the latest image
            today = datetime.date.today()
            search_start = (today - datetime.timedelta(days=90)).strftime('%Y-%m-%d')
            search_end = today.strftime('%Y-%m-%d')
            
            # Try Landsat 9 first (newest)
            l9_collection = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
                            .filterBounds(geometry)
                            .filterDate(search_start, search_end))
            
            # Check if L9 collection is empty
            l9_size = l9_collection.size().getInfo()
            logging.info(f"Landsat 9 latest collection search size: {l9_size}")
            
            if l9_size > 0:
                # Process Landsat 9
                def apply_l9_scale_factors(image):
                    opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
                    thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0)
                    return image.addBands(opticalBands, None, True).addBands(thermalBands, None, True)
                
                l9_collection = l9_collection.map(apply_l9_scale_factors)
                most_recent = l9_collection.sort('system:time_start', False).first()
                ndvi = most_recent.normalizedDifference(['SR_B5', 'SR_B4'])
                
                # Get the actual acquisition date for logging
                image_date = ee.Date(most_recent.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                logging.info(f"Using most recent Landsat 9 image from {image_date}")
                
            else:
                # Try Landsat 8 if no L9 data
                l8_collection = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                                .filterBounds(geometry)
                                .filterDate(search_start, search_end))
                
                # Check if L8 collection is empty
                l8_size = l8_collection.size().getInfo()
                logging.info(f"Landsat 8 latest collection search size: {l8_size}")
                
                if l8_size > 0:
                    # Process Landsat 8
                    def apply_l8_scale_factors(image):
                        opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
                        thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0)
                        return image.addBands(opticalBands, None, True).addBands(thermalBands, None, True)
                    
                    l8_collection = l8_collection.map(apply_l8_scale_factors)
                    most_recent = l8_collection.sort('system:time_start', False).first()
                    ndvi = most_recent.normalizedDifference(['SR_B5', 'SR_B4'])
                    
                    # Get the actual acquisition date for logging
                    image_date = ee.Date(most_recent.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                    logging.info(f"Using most recent Landsat 8 image from {image_date}")
                    
                else:
                    # Try Landsat 7 as last resort
                    l7_collection = (ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
                                    .filterBounds(geometry)
                                    .filterDate(search_start, search_end))
                    
                    # Check if L7 collection is empty
                    l7_size = l7_collection.size().getInfo()
                    logging.info(f"Landsat 7 latest collection search size: {l7_size}")
                    
                    if l7_size > 0:
                        # Process Landsat 7
                        def apply_l7_scale_factors(image):
                            opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
                            thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0)
                            return image.addBands(opticalBands, None, True).addBands(thermalBands, None, True)
                        
                        l7_collection = l7_collection.map(apply_l7_scale_factors)
                        most_recent = l7_collection.sort('system:time_start', False).first()
                        ndvi = most_recent.normalizedDifference(['SR_B4', 'SR_B3'])
                        
                        # Get the actual acquisition date for logging
                        image_date = ee.Date(most_recent.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                        logging.info(f"Using most recent Landsat 7 image from {image_date}")
                        
                    else:
                        logging.warning("No recent Landsat imagery found")
                        return None, None
            
        else:
            # For dates before 2013 (Landsat 8 launch), use Landsat 7
            start_year = int(start_date.split('-')[0])
            
            if start_year < 2013:
                logging.info(f"Using Landsat 7 for years before 2013 (year: {start_year})")
                l_collection = (ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
                                .filterBounds(geometry)
                                .filterDate(start_date, end_date))
                                
                def apply_l7_scale_factors(image):
                    opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
                    thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0)
                    return image.addBands(opticalBands, None, True).addBands(thermalBands, None, True)
                
                l_collection = l_collection.map(apply_l7_scale_factors)
                
                # Check if collection is empty
                collection_size = l_collection.size().getInfo()
                logging.info(f"Landsat 7 collection size: {collection_size}")
                
                if collection_size > 0:
                    median_composite = l_collection.median()
                    # Landsat 7 bands for NDVI: B4 (NIR), B3 (Red)
                    ndvi = median_composite.normalizedDifference(['SR_B4', 'SR_B3'])
                else:
                    logging.warning("Empty Landsat 7 collection")
                    return None, None
                    
            else:
                # Use Landsat 8/9
                logging.info(f"Using Landsat 8/9 for years 2013+ (year: {start_year})")
                
                # Try Landsat 9 first for dates after its launch (2021-09-27)
                if start_date >= "2021-09-27":
                    l9_collection = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
                                    .filterBounds(geometry)
                                    .filterDate(start_date, end_date))
                    
                    l9_size = l9_collection.size().getInfo()
                    logging.info(f"Landsat 9 collection size: {l9_size}")
                    
                    if l9_size > 0:
                        def apply_l9_scale_factors(image):
                            opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
                            thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0)
                            return image.addBands(opticalBands, None, True).addBands(thermalBands, None, True)
                        
                        l9_collection = l9_collection.map(apply_l9_scale_factors)
                        median_composite = l9_collection.median()
                        ndvi = median_composite.normalizedDifference(['SR_B5', 'SR_B4'])
                        return ndvi, get_ndvi_vis_params()
                
                # Fall back to Landsat 8 if Landsat 9 failed or not applicable
                l8_collection = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                                .filterBounds(geometry)
                                .filterDate(start_date, end_date))
                                
                def apply_l8_scale_factors(image):
                    opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
                    thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0)
                    return image.addBands(opticalBands, None, True).addBands(thermalBands, None, True)
                
                l8_collection = l8_collection.map(apply_l8_scale_factors)
                
                # Check if collection is empty
                collection_size = l8_collection.size().getInfo()
                logging.info(f"Landsat 8 collection size: {collection_size}")
                
                if collection_size > 0:
                    median_composite = l8_collection.median()
                    # Landsat 8/9 bands for NDVI: B5 (NIR), B4 (Red)
                    ndvi = median_composite.normalizedDifference(['SR_B5', 'SR_B4'])
                else:
                    logging.warning("Empty Landsat 8 collection")
                    return None, None

        return ndvi, get_ndvi_vis_params()
    except Exception as e:
        logging.error(f"Error in add_landsat_ndvi: {e}")
        return None, None

def get_ndvi_vis_params():
    """Return standard NDVI visualization parameters for consistency"""
    return {
        'min': -0.2,
        'max': 0.8,
        'palette': [
            'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
            '74A901', '66A000', '529400', '3E8601', '207401', '056201',
            '004C00', '023B01', '012E01', '011D01', '011301'
        ]
    }