import ee
import logging
import datetime
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def parse_year_input(year_input):
    """
    Parse various year formats and return a standardized year integer.
    Handles YYYY format, date strings, and "latest" keyword.
    """
    if year_input is None:
        return None
        
    # Handle "latest" keyword
    if isinstance(year_input, str) and "latest" in year_input.lower():
        return "latest"
        
    # Handle year as integer
    if isinstance(year_input, int):
        return year_input
        
    # Handle year as string in YYYY format
    if isinstance(year_input, str) and re.match(r'^\d{4}$', year_input):
        return int(year_input)
        
    # Handle YYYY-MM-DD format
    if isinstance(year_input, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', year_input):
        return int(year_input.split('-')[0])
    
    # Handle month-year combinations
    month_year_patterns = [
        r'(\w+)\s+(\d{4})',      # March 2022
        r'(\d{1,2})[/-](\d{4})',  # 03/2022 or 03-2022
        r'(\d{4})[/-](\d{1,2})'   # 2022/03 or 2022-03
    ]
    
    for pattern in month_year_patterns:
        if isinstance(year_input, str):
            match = re.match(pattern, year_input)
            if match:
                # Extract year from pattern
                if match.group(1).isdigit() and int(match.group(1)) > 12:
                    # Format is YYYY-MM
                    return int(match.group(1))
                else:
                    # Other formats where year is second group
                    return int(match.group(2))
    
    # If none of the patterns match, try to use current year
    logging.warning(f"Could not parse year from '{year_input}', using current year")
    return datetime.datetime.now().year

def get_latest_lst(geometry):
    """
    Fetches the most recent Landsat LST data available.
    
    Args:
        geometry (ee.Geometry): The region of interest.
        
    Returns:
        tuple: (ee.Image, dict) containing the LST image and visualization parameters,
               or (None, None) if an error occurred.
    """
    try:
        # Get today's date and date 90 days ago for search window
        today = datetime.date.today()
        search_start = (today - datetime.timedelta(days=90)).strftime('%Y-%m-%d')
        search_end = today.strftime('%Y-%m-%d')
        
        # Function for masking and preprocessing imagery
        def maskL89sr(image):
            qaMask = image.select('QA_PIXEL').bitwiseAnd(int('11111', 2)).eq(0)
            saturationMask = image.select('QA_RADSAT').eq(0)

            def getFactorImg(factorNames):
                factorList = image.toDictionary().select(factorNames).values()
                return ee.Image.constant(factorList)

            scaleImg = getFactorImg(['REFLECTANCE_MULT_BAND_.|TEMPERATURE_MULT_BAND_.*'])
            offsetImg = getFactorImg(['REFLECTANCE_ADD_BAND_.|TEMPERATURE_ADD_BAND_.*'])
            scaled = image.select('SR_B.|ST_B.*').multiply(scaleImg).add(offsetImg)

            return image.addBands(scaled, None, True).updateMask(qaMask).updateMask(saturationMask)

        def maskL457sr(image):
            qaMask = image.select('QA_PIXEL').bitwiseAnd(int('11111', 2)).eq(0)
            saturationMask = image.select('QA_RADSAT').eq(0)

            def getFactorImg(factorNames):
                factorList = image.toDictionary().select(factorNames).values()
                return ee.Image.constant(factorList)

            scaleImg = getFactorImg(['REFLECTANCE_MULT_BAND_.|TEMPERATURE_MULT_BAND_ST_B6'])
            offsetImg = getFactorImg(['REFLECTANCE_ADD_BAND_.|TEMPERATURE_ADD_BAND_ST_B6'])
            scaled = image.select('SR_B.|ST_B6').multiply(scaleImg).add(offsetImg)

            return image.addBands(scaled, None, True).updateMask(qaMask).updateMask(saturationMask)

        def addIndices(image):
            # L8/L9 indices
            ndviL89 = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
            eviL89 = image.expression(
                '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                    'NIR': image.select('SR_B5'),
                    'RED': image.select('SR_B4'),
                    'BLUE': image.select('SR_B2')
                }).rename('EVI')
            ndbiL89 = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI')

            # L7 indices
            ndviL7 = image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI')
            eviL7 = image.expression(
                '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                    'NIR': image.select('SR_B4'),
                    'RED': image.select('SR_B3'),
                    'BLUE': image.select('SR_B1')
                }).rename('EVI')
            ndbiL7 = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDBI')

            # Choose the correct indices based on satellite
            satelliteId = ee.String(image.get('SPACECRAFT_ID'))
            ndvi = ee.Image(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                ndviL7,
                ndviL89
            ))

            evi = ee.Image(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                eviL7,
                eviL89
            ))

            ndbi = ee.Image(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                ndbiL7,
                ndbiL89
            ))

            return image.addBands(ndvi).addBands(evi).addBands(ndbi)

        def getEmissivity(image):
            fvc = image.expression(
                '((NDVI - NDVI_soil) / (NDVI_veg - NDVI_soil))**2', {
                    'NDVI': image.select('NDVI'),
                    'NDVI_soil': 0.2,
                    'NDVI_veg': 0.86
                })
            fvc = fvc.max(0).min(1)

            emissivity = image.expression(
                '(e_v * FVC) + (e_s * (1 - FVC)) + (1 - e_s) * 0.05 * FVC', {
                    'FVC': fvc,
                    'e_v': 0.99,
                    'e_s': 0.95
                }).rename('emissivity')

            return image.addBands(emissivity)

        def addLST(image):
            satelliteId = ee.String(image.get('SPACECRAFT_ID'))
            thermalBand = ee.String(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                'ST_B6',
                'ST_B10'
            ))

            k1 = ee.Number(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                666.09,
                ee.Algorithms.If(
                    satelliteId.equals('LANDSAT_8'),
                    774.8853,
                    799.0289
                )
            ))

            k2 = ee.Number(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                1282.71,
                ee.Algorithms.If(
                    satelliteId.equals('LANDSAT_8'),
                    1321.0789,
                    1324.7999
                )
            ))

            brightnessTemp = image.select(thermalBand)

            lst = image.expression(
                '(TB / (1 + (0.00115 * TB / 1.4388) * log(e))) - 273.15', {
                    'TB': brightnessTemp,
                    'e': image.select('emissivity')
                }).rename('LST_Celsius')

            return image.addBands(lst)

        # Try Landsat 9 first (newest)
        l9Collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2') \
            .filterBounds(geometry) \
            .filterDate(search_start, search_end)
            
        l9Size = l9Collection.size().getInfo()
        logging.info(f"Found {l9Size} Landsat 9 images in the last 90 days")
        
        if l9Size > 0:
            # Process the most recent L9 image
            l9Collection = l9Collection.sort('system:time_start', False)
            most_recent_l9 = l9Collection.first()
            
            # Get image date for logging
            image_date = ee.Date(most_recent_l9.get('system:time_start')).format('YYYY-MM-dd').getInfo()
            logging.info(f"Using most recent Landsat 9 image from {image_date}")
            
            # Process the image
            processed_image = maskL89sr(most_recent_l9)
            processed_image = addIndices(processed_image)
            processed_image = getEmissivity(processed_image)
            processed_image = addLST(processed_image)
            
            # Select LST band
            lstImage = processed_image.select('LST_Celsius')
            
        else:
            # Try Landsat 8 if no L9 data
            l8Collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') \
                .filterBounds(geometry) \
                .filterDate(search_start, search_end)
                
            l8Size = l8Collection.size().getInfo()
            logging.info(f"Found {l8Size} Landsat 8 images in the last 90 days")
            
            if l8Size > 0:
                # Process the most recent L8 image
                l8Collection = l8Collection.sort('system:time_start', False)
                most_recent_l8 = l8Collection.first()
                
                # Get image date for logging
                image_date = ee.Date(most_recent_l8.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                logging.info(f"Using most recent Landsat 8 image from {image_date}")
                
                # Process the image
                processed_image = maskL89sr(most_recent_l8)
                processed_image = addIndices(processed_image)
                processed_image = getEmissivity(processed_image)
                processed_image = addLST(processed_image)
                
                # Select LST band
                lstImage = processed_image.select('LST_Celsius')
                
            else:
                # Try Landsat 7 as a last resort
                l7Collection = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2') \
                    .filterBounds(geometry) \
                    .filterDate(search_start, search_end)
                    
                l7Size = l7Collection.size().getInfo()
                logging.info(f"Found {l7Size} Landsat 7 images in the last 90 days")
                
                if l7Size > 0:
                    # Process the most recent L7 image
                    l7Collection = l7Collection.sort('system:time_start', False)
                    most_recent_l7 = l7Collection.first()
                    
                    # Get image date for logging
                    image_date = ee.Date(most_recent_l7.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                    logging.info(f"Using most recent Landsat 7 image from {image_date}")
                    
                    # Process the image
                    processed_image = maskL457sr(most_recent_l7)
                    processed_image = addIndices(processed_image)
                    processed_image = getEmissivity(processed_image)
                    processed_image = addLST(processed_image)
                    
                    # Select LST band
                    lstImage = processed_image.select('LST_Celsius')
                    
                else:
                    logging.warning("No recent Landsat imagery found")
                    return None, None
                    
        # Calculate min and max values for better visualization
        minMax = lstImage.reduceRegion(
            reducer=ee.Reducer.minMax(),
            geometry=geometry.buffer(50000),
            scale=100,
            maxPixels=1e9
        )

        # Extract min and max LST values
        minTemp = ee.Number(minMax.get('LST_Celsius_min'))
        maxTemp = ee.Number(minMax.get('LST_Celsius_max'))

        # Define visualization parameters using the calculated min/max
        lstVis = {
            'min': minTemp,
            'max': maxTemp,
            'palette': [
                '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
                '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
                '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
                'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
                'ff0000', 'de0101', 'c21301', 'a71001', '911003'
            ]
        }

        return lstImage, lstVis

    except Exception as e:
        logging.error(f"Error in get_latest_lst: {e}")
        return None, None

def add_landsat_lst(geometry, year=None):
    """
    Calculates Land Surface Temperature (LST) from Landsat data for a specific year.
    Now with support for "latest" and better year parsing.

    Args:
        geometry (ee.Geometry): The region of interest.
        year (int, str): The year for which to calculate LST. Can be:
            - Integer year (e.g., 2022)
            - String year (e.g., "2022")
            - "latest" for most recent data
            - Date string that includes year (e.g., "2022-01-01")
            - Month-year combination (e.g., "March 2022")

    Returns:
        tuple: (ee.Image, dict) containing the LST image and visualization parameters,
               or (None, None) if an error occurred.
    """
    try:
        # Parse year input
        parsed_year = parse_year_input(year)
        
        # Handle "latest" case
        if parsed_year == "latest":
            logging.info("Fetching latest LST imagery")
            return get_latest_lst(geometry)
            
        # Default to current year if not specified
        if parsed_year is None:
            parsed_year = datetime.datetime.now().year
            logging.info(f"No year specified for LST, using current year: {parsed_year}")
            
        # Validate year range (Landsat data available from 1982 onwards)
        current_year = datetime.datetime.now().year
        if parsed_year < 1982 or parsed_year > current_year:
            logging.error(f"Invalid year for LST: {parsed_year}. Must be between 1982 and {current_year}")
            return None, None
        
        logging.info(f"Creating LST visualization for year: {parsed_year}")
        
        # Continue with standard LST processing
        def maskL89sr(image):
            qaMask = image.select('QA_PIXEL').bitwiseAnd(int('11111', 2)).eq(0)
            saturationMask = image.select('QA_RADSAT').eq(0)

            def getFactorImg(factorNames):
                factorList = image.toDictionary().select(factorNames).values()
                return ee.Image.constant(factorList)

            scaleImg = getFactorImg(['REFLECTANCE_MULT_BAND_.|TEMPERATURE_MULT_BAND_.*'])
            offsetImg = getFactorImg(['REFLECTANCE_ADD_BAND_.|TEMPERATURE_ADD_BAND_.*'])
            scaled = image.select('SR_B.|ST_B.*').multiply(scaleImg).add(offsetImg)

            return image.addBands(scaled, None, True).updateMask(qaMask).updateMask(saturationMask)

        def maskL457sr(image):
            qaMask = image.select('QA_PIXEL').bitwiseAnd(int('11111', 2)).eq(0)
            saturationMask = image.select('QA_RADSAT').eq(0)

            def getFactorImg(factorNames):
                factorList = image.toDictionary().select(factorNames).values()
                return ee.Image.constant(factorList)

            scaleImg = getFactorImg(['REFLECTANCE_MULT_BAND_.|TEMPERATURE_MULT_BAND_ST_B6'])
            offsetImg = getFactorImg(['REFLECTANCE_ADD_BAND_.|TEMPERATURE_ADD_BAND_ST_B6'])
            scaled = image.select('SR_B.|ST_B6').multiply(scaleImg).add(offsetImg)

            return image.addBands(scaled, None, True).updateMask(qaMask).updateMask(saturationMask)

        def addIndices(image):
            # L8/L9 indices
            ndviL89 = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
            eviL89 = image.expression(
                '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                    'NIR': image.select('SR_B5'),
                    'RED': image.select('SR_B4'),
                    'BLUE': image.select('SR_B2')
                }).rename('EVI')
            ndbiL89 = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI')

            # L7 indices
            ndviL7 = image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI')
            eviL7 = image.expression(
                '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                    'NIR': image.select('SR_B4'),
                    'RED': image.select('SR_B3'),
                    'BLUE': image.select('SR_B1')
                }).rename('EVI')
            ndbiL7 = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDBI')

            # Choose the correct indices based on satellite
            satelliteId = ee.String(image.get('SPACECRAFT_ID'))
            ndvi = ee.Image(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                ndviL7,
                ndviL89
            ))

            evi = ee.Image(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                eviL7,
                eviL89
            ))

            ndbi = ee.Image(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                ndbiL7,
                ndbiL89
            ))

            return image.addBands(ndvi).addBands(evi).addBands(ndbi)

        def getEmissivity(image):
            fvc = image.expression(
                '((NDVI - NDVI_soil) / (NDVI_veg - NDVI_soil))**2', {
                    'NDVI': image.select('NDVI'),
                    'NDVI_soil': 0.2,
                    'NDVI_veg': 0.86
                })
            fvc = fvc.max(0).min(1)

            emissivity = image.expression(
                '(e_v * FVC) + (e_s * (1 - FVC)) + (1 - e_s) * 0.05 * FVC', {
                    'FVC': fvc,
                    'e_v': 0.99,
                    'e_s': 0.95
                }).rename('emissivity')

            return image.addBands(emissivity)

        def addLST(image):
            satelliteId = ee.String(image.get('SPACECRAFT_ID'))
            thermalBand = ee.String(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                'ST_B6',
                'ST_B10'
            ))

            k1 = ee.Number(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                666.09,
                ee.Algorithms.If(
                    satelliteId.equals('LANDSAT_8'),
                    774.8853,
                    799.0289
                )
            ))

            k2 = ee.Number(ee.Algorithms.If(
                satelliteId.equals('LANDSAT_7'),
                1282.71,
                ee.Algorithms.If(
                    satelliteId.equals('LANDSAT_8'),
                    1321.0789,
                    1324.7999
                )
            ))

            brightnessTemp = image.select(thermalBand)

            lst = image.expression(
                '(TB / (1 + (0.00115 * TB / 1.4388) * log(e))) - 273.15', {
                    'TB': brightnessTemp,
                    'e': image.select('emissivity')
                }).rename('LST_Celsius')

            return image.addBands(lst)

        startYearDate = ee.Date.fromYMD(parsed_year, 1, 1)
        endYearDate = ee.Date.fromYMD(parsed_year, 5, 31)

        # Check for Landsat 9 (launched September 2021)
        if parsed_year >= 2021:
            l9Collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2') \
                .filterBounds(geometry) \
                .filterDate(startYearDate, endYearDate)
            l9Size = l9Collection.size().getInfo()
            logging.info(f"Found {l9Size} Landsat 9 images for {parsed_year}")
        else:
            l9Size = 0

        # Check for Landsat 8 (launched February 2013)
        if parsed_year >= 2013:
            l8Collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') \
                .filterBounds(geometry) \
                .filterDate(startYearDate, endYearDate)
            l8Size = l8Collection.size().getInfo()
            logging.info(f"Found {l8Size} Landsat 8 images for {parsed_year}")
        else:
            l8Size = 0

        # Check for Landsat 7 (launched April 1999)
        if parsed_year >= 1999:
            l7Collection = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2') \
                .filterBounds(geometry) \
                .filterDate(startYearDate, endYearDate)
            l7Size = l7Collection.size().getInfo()
            logging.info(f"Found {l7Size} Landsat 7 images for {parsed_year}")
        else:
            l7Size = 0

        # Process images if available
        if l9Size > 0:
            l9 = l9Collection.map(maskL89sr).map(addIndices).map(getEmissivity).map(addLST).median()
            lstImage = l9.select('LST_Celsius')
            logging.info(f"Using Landsat 9 for LST in {parsed_year}")
        elif l8Size > 0:
            l8 = l8Collection.map(maskL89sr).map(addIndices).map(getEmissivity).map(addLST).median()
            lstImage = l8.select('LST_Celsius')
            logging.info(f"Using Landsat 8 for LST in {parsed_year}")
        elif l7Size > 0:
            l7 = l7Collection.map(maskL457sr).map(addIndices).map(getEmissivity).map(addLST).median()
            lstImage = l7.select('LST_Celsius')
            logging.info(f"Using Landsat 7 for LST in {parsed_year}")
        else:
            logging.warning(f"No Landsat imagery found for {parsed_year}")
            return None, None

        # Set year property
        lstImage = lstImage.set('year', parsed_year)

        # Calculate min and max values for better visualization
        minMax = lstImage.reduceRegion(
            reducer=ee.Reducer.minMax(),
            geometry=geometry.buffer(50000),
            scale=300,
            maxPixels=1e9
        )

        # Extract min and max LST values
        minTemp = ee.Number(minMax.get('LST_Celsius_min'))
        maxTemp = ee.Number(minMax.get('LST_Celsius_max'))

        # Define visualization parameters using the calculated min/max
        lstVis = {
            'min': minTemp,
            'max': maxTemp,
            'palette': [
                '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
                '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
                '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
                'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
                'ff0000', 'de0101', 'c21301', 'a71001', '911003'
            ]
        }

        return lstImage, lstVis

    except Exception as e:
        logging.error(f"Error in add_landsat_lst: {e}")
        return None, None