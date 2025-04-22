import ee
import datetime
import logging
import re
from typing import Optional, Tuple, Dict, Union, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def parse_date_input(date_input):
    """
    Parse various date formats and return a standardized YYYY-MM-DD string.
    """
    if date_input is None:
        return None
        
    # Handle "latest" keyword
    if isinstance(date_input, str) and "latest" in date_input.lower():
        return "latest"
        
    # Handle year-only input (e.g., "2022")
    if isinstance(date_input, str) and re.match(r'^\d{4}$', date_input):
        return f"{date_input}-01-01"
        
    # Handle full date that's already formatted
    if isinstance(date_input, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', date_input):
        return date_input
        
    # Handle month-year combinations
    month_patterns = {
        r'(\w+)\s+(\d{4})': lambda m: f"{m.group(2)}-{get_month_number(m.group(1)):02d}-01",  # March 2022
        r'(\d{1,2})[/-](\d{4})': lambda m: f"{m.group(2)}-{int(m.group(1)):02d}-01",          # 03/2022 or 03-2022
        r'(\d{4})[/-](\d{1,2})': lambda m: f"{m.group(1)}-{int(m.group(2)):02d}-01"           # 2022/03 or 2022-03
    }
    
    for pattern, formatter in month_patterns.items():
        if isinstance(date_input, str):
            match = re.match(pattern, date_input)
            if match:
                return formatter(match)
    
    # If none of the patterns match
    return date_input

def get_month_number(month_name):
    """Convert month name to number."""
    month_names = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sep': 9, 'sept': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    }
    return month_names.get(month_name.lower(), 1)

def get_date_range(start_date, end_date, year=None, month=None):
    """
    Process start_date and end_date to handle various formats and return a normalized range.
    
    Args:
        start_date: Start date string
        end_date: End date string
        year: Year integer (used if start_date and end_date are None)
        month: Month integer (used with year if start_date and end_date are None)
    """
    today = datetime.date.today()
    
    # If we have a year but no dates, create date range for that year
    if start_date is None and end_date is None and year is not None:
        if month is not None:
            # If we have both year and month, create range for that specific month
            start_date = f"{year}-{month:02d}-01"
            # Calculate the last day of the month
            if month == 12:
                next_month_year = year + 1
                next_month = 1
            else:
                next_month_year = year
                next_month = month + 1
            
            # Last day = one day before the first day of next month
            end_date = (datetime.datetime(next_month_year, next_month, 1) - datetime.timedelta(days=1)).strftime('%Y-%m-%d')
            logging.info(f"Created date range for {year}-{month:02d}: {start_date} to {end_date}")
        else:
            # If we have year but no month, create range for the whole year
            start_date = f"{year}-01-01"
            end_date = f"{year}-12-31"
            logging.info(f"Created date range for year {year}: {start_date} to {end_date}")
        return start_date, end_date
    
    # Process start date
    start_date = parse_date_input(start_date)
    
    # Handle "latest" case
    if start_date == "latest":
        return "latest", "latest"
    
    # Default start date if not provided - IMPROVED: Use 90 days instead of 30 for better chance of finding images
    if start_date is None:
        start_date = (today - datetime.timedelta(days=90)).strftime('%Y-%m-%d')
    
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

def extract_month_from_prompt(prompt):
    """
    Extract month and year from a prompt string.
    Returns None if not found.
    """
    if not isinstance(prompt, str):
        return None, None
        
    # Try month name + year pattern (e.g., "April 2022")
    month_year_pattern = r'(?i)(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})'
    match = re.search(month_year_pattern, prompt)
    if match:
        month_name = match.group(1).lower()
        year = int(match.group(2))
        month = get_month_number(month_name)
        return month, year
        
    # Try numeric patterns (e.g., "04/2022" or "2022-04")
    numeric_patterns = [
        r'(\d{1,2})[/-](\d{4})',  # 04/2022
        r'(\d{4})[/-](\d{1,2})'   # 2022-04 or 2022/04
    ]
    
    for pattern in numeric_patterns:
        match = re.search(pattern, prompt)
        if match:
            if match.group(1).isdigit() and int(match.group(1)) <= 12:
                # Pattern is MM/YYYY
                month = int(match.group(1))
                year = int(match.group(2))
            else:
                # Pattern is YYYY/MM
                year = int(match.group(1))
                month = int(match.group(2))
            return month, year
            
    return None, None

def _add_sentinel2_rgb(geometry, start_date, end_date):
    """Adds Sentinel-2 RGB imagery (internal function)."""
    try:
        logging.info(f"Fetching Sentinel-2 imagery from {start_date} to {end_date}")
        s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                         .filterBounds(geometry)
                         .filterDate(start_date, end_date)
                         .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)))  # Increased cloud threshold to 30%
        
        # Check if collection is empty
        collection_size = s2_collection.size().getInfo()
        logging.info(f"Found {collection_size} Sentinel-2 images")
        
        if collection_size == 0:
            logging.warning(f"No Sentinel-2 images found for period {start_date} to {end_date}")
            
            # Try expanding the date range if specific dates were provided
            if start_date != "latest" and end_date != "latest":
                try:
                    start_dt = datetime.datetime.strptime(start_date, '%Y-%m-%d')
                    end_dt = datetime.datetime.strptime(end_date, '%Y-%m-%d')
                    
                    # If date range is less than 6 months, expand it
                    if (end_dt - start_dt).days < 180:
                        # Expand to 6 months centered on the original range
                        mid_point = start_dt + (end_dt - start_dt) / 2
                        expanded_start = (mid_point - datetime.timedelta(days=90)).strftime('%Y-%m-%d')
                        expanded_end = (mid_point + datetime.timedelta(days=90)).strftime('%Y-%m-%d')
                        
                        logging.info(f"Expanding date range to {expanded_start} to {expanded_end}")
                        
                        # Try again with expanded range
                        expanded_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                                             .filterBounds(geometry)
                                             .filterDate(expanded_start, expanded_end)
                                             .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)))
                        
                        expanded_size = expanded_collection.size().getInfo()
                        logging.info(f"Found {expanded_size} Sentinel-2 images in expanded range")
                        
                        if expanded_size > 0:
                            s2_collection = expanded_collection
                            collection_size = expanded_size
                        else:
                            # Fall back to Landsat if expanded range still returns no images
                            logging.info("No Sentinel-2 images in expanded range, falling back to Landsat")
                            return _add_landsat8_rgb(geometry, start_date, end_date)
                    else:
                        # Range already large, fall back to Landsat
                        logging.info("Large date range with no S2 images, falling back to Landsat")
                        return _add_landsat8_rgb(geometry, start_date, end_date)
                        
                except (ValueError, TypeError) as e:
                    logging.error(f"Error expanding date range: {e}")
                    # Fall back to Landsat
                    return _add_landsat8_rgb(geometry, start_date, end_date)
            else:
                # "Latest" case with no images, fall back to Landsat
                return _add_landsat8_rgb(geometry, start_date, end_date)
            
        # For latest imagery, use the most recent image
        if start_date == "latest" and end_date == "latest":
            # Sort by sensing date in descending order and get the most recent
            most_recent = s2_collection.sort('system:time_start', False).first()
            rgb_image = most_recent.select(['B4', 'B3', 'B2'])
            
            # Get the actual acquisition date for logging
            image_date = ee.Date(most_recent.get('system:time_start')).format('YYYY-MM-dd').getInfo()
            logging.info(f"Using most recent Sentinel-2 image from {image_date}")
        else:
            # Use median composite for date ranges
            median_composite = s2_collection.median()
            rgb_image = median_composite.select(['B4', 'B3', 'B2'])
            logging.info(f"Created median composite from {collection_size} Sentinel-2 images")

        vis_params = {
            'bands': ['B4', 'B3', 'B2'],
            'min': 0,
            'max': 3000,
            'gamma': 1.2
        }
        return rgb_image, vis_params
    except Exception as e:
        logging.error(f"Error in _add_sentinel2_rgb: {e}")
        return None, None

def _add_landsat8_rgb(geometry, start_date, end_date):
    """Adds Landsat 8/9 RGB imagery (internal function)."""
    try:
        logging.info(f"Fetching Landsat imagery from {start_date} to {end_date}")
        
        # Try Landsat 9 first (newer)
        l9_collection = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
                      .filterBounds(geometry)
                      .filterDate(start_date, end_date)
                      .filter(ee.Filter.lt('CLOUD_COVER', 35)))  # Increased cloud threshold
        
        l9_size = l9_collection.size().getInfo()
        logging.info(f"Found {l9_size} Landsat 9 images")
        
        # Fall back to Landsat 8 if no L9 images
        if l9_size == 0:
            l8_collection = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                          .filterBounds(geometry)
                          .filterDate(start_date, end_date)
                          .filter(ee.Filter.lt('CLOUD_COVER', 35)))  # Increased cloud threshold
            
            l8_size = l8_collection.size().getInfo()
            logging.info(f"Found {l8_size} Landsat 8 images")
            
            if l8_size == 0:
                # If specific dates were provided, try expanding the range
                if start_date != "latest" and end_date != "latest":
                    try:
                        start_dt = datetime.datetime.strptime(start_date, '%Y-%m-%d')
                        end_dt = datetime.datetime.strptime(end_date, '%Y-%m-%d')
                        
                        # If date range is less than 6 months, expand it
                        if (end_dt - start_dt).days < 180:
                            # Expand to 6 months centered on the original range
                            mid_point = start_dt + (end_dt - start_dt) / 2
                            expanded_start = (mid_point - datetime.timedelta(days=120)).strftime('%Y-%m-%d')
                            expanded_end = (mid_point + datetime.timedelta(days=120)).strftime('%Y-%m-%d')
                            
                            logging.info(f"Expanding date range for Landsat to {expanded_start} to {expanded_end}")
                            
                            # Try again with expanded range - combined L8 & L9
                            l9_expanded = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
                                         .filterBounds(geometry)
                                         .filterDate(expanded_start, expanded_end)
                                         .filter(ee.Filter.lt('CLOUD_COVER', 40)))
                            
                            l8_expanded = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                                         .filterBounds(geometry)
                                         .filterDate(expanded_start, expanded_end)
                                         .filter(ee.Filter.lt('CLOUD_COVER', 40)))
                            
                            # Merge collections
                            merged_collection = l9_expanded.merge(l8_expanded)
                            merged_size = merged_collection.size().getInfo()
                            
                            logging.info(f"Found {merged_size} Landsat 8/9 images in expanded range")
                            
                            if merged_size > 0:
                                # We have images, now use L9 or L8 based on what was found
                                if l9_expanded.size().getInfo() > 0:
                                    l9_collection = l9_expanded
                                    l9_size = l9_expanded.size().getInfo()
                                else:
                                    l8_collection = l8_expanded
                                    l8_size = l8_expanded.size().getInfo()
                            else:
                                logging.error("No Landsat 8/9 images found even in expanded range")
                                return None, None
                    except (ValueError, TypeError) as e:
                        logging.error(f"Error expanding date range for Landsat: {e}")
                        return None, None
                else:
                    logging.error("No Landsat 8/9 images found for 'latest' request")
                    return None, None
            
        # Select the appropriate collection and apply scale factors
        def apply_scale_factors(image):
            opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
            thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0)
            return image.addBands(opticalBands, None, True).addBands(thermalBands, None, True)

        # Process Landsat 9 if available
        if l9_size > 0:
            l9_collection = l9_collection.map(apply_scale_factors)
            
            # For latest imagery, use the most recent image
            if start_date == "latest" and end_date == "latest":
                most_recent = l9_collection.sort('system:time_start', False).first()
                rgb_image = most_recent.select(['SR_B4', 'SR_B3', 'SR_B2'])
                
                # Get acquisition date for logging
                image_date = ee.Date(most_recent.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                logging.info(f"Using most recent Landsat 9 image from {image_date}")
            else:
                # Use median composite for date ranges
                median_composite = l9_collection.median()
                rgb_image = median_composite.select(['SR_B4', 'SR_B3', 'SR_B2'])
                logging.info(f"Created median composite from {l9_size} Landsat 9 images")
        
        # Process Landsat 8 if no L9 available
        else:
            l8_collection = l8_collection.map(apply_scale_factors)
            
            # For latest imagery, use the most recent image
            if start_date == "latest" and end_date == "latest":
                most_recent = l8_collection.sort('system:time_start', False).first()
                rgb_image = most_recent.select(['SR_B4', 'SR_B3', 'SR_B2'])
                
                # Get acquisition date for logging
                image_date = ee.Date(most_recent.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                logging.info(f"Using most recent Landsat 8 image from {image_date}")
            else:
                # Use median composite for date ranges
                median_composite = l8_collection.median()
                rgb_image = median_composite.select(['SR_B4', 'SR_B3', 'SR_B2'])
                logging.info(f"Created median composite from {l8_size} Landsat 8 images")

        vis_params = {
            'bands': ['SR_B4', 'SR_B3', 'SR_B2'],
            'min': 0,
            'max': 0.3,
            'gamma': 1.2
        }
        return rgb_image, vis_params
    except Exception as e:
        logging.error(f"Error in _add_landsat8_rgb: {e}", exc_info=True)
        return None, None

def add_rgb_imagery(geometry, satellite="Sentinel-2", start_date=None, end_date=None, year=None):
    """
    Adds RGB imagery. Allows selecting Sentinel-2 or Landsat 8/9 with improved fallback.

    Args:
        geometry: The region of interest (ee.Geometry).
        satellite: "Sentinel-2" (default) or "Landsat 8".
        start_date: Start date (YYYY-MM-DD string). Defaults to 90 days ago.
          Can be "latest" to fetch most recent imagery.
        end_date: End date (YYYY-MM-DD string). Defaults to today.
        year: Year (integer) to use if start_date/end_date not specified.

    Returns:
        A tuple: (ee.Image, vis_params) or (None, None) on error.
    """
    # First, check if we have a start_date that includes month/year info in the string
    if isinstance(start_date, str):
        month, extracted_year = extract_month_from_prompt(start_date)
        if month is not None and extracted_year is not None:
            # We found month and year in the string, use those to create a date range
            start_date, end_date = get_date_range(None, None, extracted_year, month)
            logging.info(f"Extracted date from string: Month {month}, Year {extracted_year}")
    
    # If not, check if we have a year parameter
    elif year is not None:
        # For "April 2022" type prompts identified by LLM, month might be encoded in start_date
        # Let's have a fallback check on LLM output directly
        month = 4 if "april" in str(start_date).lower() else None
        
        # Create date range based on year and month (if available)
        start_date, end_date = get_date_range(start_date, end_date, year, month)
        logging.info(f"Using year from parameter: {year}, month: {month if month else 'whole year'}")
    
    # Handle "latest" keyword
    elif isinstance(start_date, str) and "latest" in start_date.lower():
        logging.info("Latest imagery requested")
        # Set both dates to "latest" marker
        start_date = end_date = "latest"
    else:
        # Regular date handling
        start_date, end_date = get_date_range(start_date, end_date)
    
    # Log the final date range
    logging.info(f"Final date range: {start_date} to {end_date}")

    # Select the appropriate satellite imagery
    if satellite and satellite.lower() == "landsat 8":
        return _add_landsat8_rgb(geometry, start_date, end_date)
    else:
        # Default to Sentinel-2 first, with Landsat fallback handled inside _add_sentinel2_rgb
        image, vis_params = _add_sentinel2_rgb(geometry, start_date, end_date)
        
        # If Sentinel-2 failed and there's no fallback result yet, try Landsat explicitly
        if image is None:
            logging.info("No Sentinel-2 image found, falling back to Landsat")
            return _add_landsat8_rgb(geometry, start_date, end_date)
        
        return image, vis_params