# --- START OF FILE authenticate_ee.py ---
import ee
import logging
import os
from typing import Tuple
from functools import lru_cache

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

@lru_cache(maxsize=1)
def initialize_ee() -> Tuple[bool, str]:
    """
    Authenticates and initializes Earth Engine.
    Returns a tuple (success, error_message).
    """
    try:
        ee.Initialize()
        logging.info("Earth Engine already initialized.")
        return True, None
    except Exception as e:
        try:
            ee.Authenticate()
            project_id = os.environ.get('EE_PROJECT_ID')
            if not project_id:
                error_msg = "EE_PROJECT_ID environment variable not set."
                logging.error(error_msg)
                return False, error_msg

            ee.Initialize(project=project_id)
            logging.info("Earth Engine authenticated and initialized.")
            return True, None
        except Exception as e2:
            error_msg = f"Error authenticating or initializing Earth Engine: {e2}"
            logging.error(error_msg)
            return False, error_msg

# Don't automatically initialize at import time in FastAPI
# This will be called explicitly in the app startup event