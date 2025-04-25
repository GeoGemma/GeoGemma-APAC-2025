# ee_modules/sar.py
import ee
import logging
import datetime
from typing import Tuple, Optional, Dict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DATASET_START_DATE = datetime.datetime(2014, 10, 3)
DATASET_END_DATE = datetime.datetime(2026, 12, 25) #Approximate

def add_sar_imagery(geometry: ee.Geometry, start_date_str: Optional[str] = None, end_date_str: Optional[str] = None) -> Tuple[Optional[ee.Image], Optional[Dict]]:
    """
    Visualizes Sentinel-1 SAR data, applying temporal filters (spring, late spring, summer).
    Provides range checking.
    """
    try:
        #Check date range
        if start_date_str is None or end_date_str is None:
            start_date = DATASET_START_DATE
            end_date = DATASET_END_DATE
            logging.info("No Dates Selected, using full range by default.")
        else:
            try:
                start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d')
            except ValueError:
                logging.error("Invalid date format. Use YYYY-MM-DD.")
                return None, {"Status": "Error: Invalid date format. Use YYYY-MM-DD."}

        if start_date < DATASET_START_DATE or end_date > DATASET_END_DATE:
            data_start_str = DATASET_START_DATE.strftime('%Y-%m-%d')
            data_end_str = DATASET_END_DATE.strftime('%Y-%m-%d')
            logging.warning("Date out of range. Sentinel-1 data is available from {} to {}.".format(data_start_str, data_end_str))
            return None, {"Status": "Date out of range. Sentinel-1 data is available from {} to {}.".format(data_start_str, data_end_str)}

        #Sentinel-1 preprocessing steps
        imgVV = ee.ImageCollection('COPERNICUS/S1_GRD') \
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
            .filter(ee.Filter.eq('instrumentMode', 'IW')) \
            .filterDate(start_date, end_date) \
            .filterBounds(geometry) \
            .select('VV') \
            .map(lambda image: image.updateMask(image.mask().And(image.lt(-30.0).Not())))

        desc = imgVV.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
        asc = imgVV.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))

        #Define temporal filters for visualization
        spring = ee.Filter.date(datetime.datetime(2024,3,1), datetime.datetime(2024,4,20))
        lateSpring = ee.Filter.date(datetime.datetime(2024,4,21), datetime.datetime(2024,6,10))
        summer = ee.Filter.date(datetime.datetime(2024,6,11), datetime.datetime(2024,8,31))

        #Concatenate the images
        descChange = ee.Image.cat(
            desc.filter(spring).mean(),
            desc.filter(lateSpring).mean(),
            desc.filter(summer).mean())

        ascChange = ee.Image.cat(
            asc.filter(spring).mean(),
            asc.filter(lateSpring).mean(),
            asc.filter(summer).mean())

        # Define visualization parameters
        vis_params = {'min': -25, 'max': 5}

        return ascChange, vis_params #Returning data

    except Exception as e:
        logging.error(f"Error in add_sar_imagery: {e}", exc_info=True)
        return None, None