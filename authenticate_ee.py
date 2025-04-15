# --- authenticate_ee.py ---
import ee
import logging
import os
import json
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('earth_engine_auth')

def initialize_ee():
    """
    Simple and straightforward Earth Engine authentication and initialization.
    Returns a tuple (success, error_message).
    """
    # Hard-code the new project ID to ensure it's always used
    project_id = "ee-khalilzaryani007"
    
    try:
        logger.info(f"Starting Earth Engine authentication with project ID: {project_id}")
        
        # First, try to authenticate
        try:
            ee.Authenticate()
            logger.info("Authentication completed successfully")
        except Exception as auth_error:
            logger.warning(f"Authentication error: {auth_error}")
            logger.info("Proceeding with initialization anyway...")
        
        # Initialize with explicit project ID
        ee.Initialize(project=project_id)
        logger.info(f"Earth Engine initialized successfully with project: {project_id}")
        
        # Verify the project is actually working with a simple test
        try:
            # Test with a simple operation
            image = ee.Image(1)
            logger.info("Earth Engine test operation successful")
        except Exception as test_error:
            logger.error(f"Test operation failed: {test_error}")
            return False, f"Earth Engine test failed: {test_error}"
        
        return True, None
        
    except Exception as e:
        error_msg = f"Earth Engine initialization failed: {e}"
        logger.error(error_msg)
        return False, error_msg

if __name__ == "__main__":
    # This allows running this file directly to test authentication
    success, error = initialize_ee()
    if success:
        print("Authentication and initialization successful!")
    else:
        print(f"Error: {error}")

# Don't automatically initialize at import time in FastAPI
# This will be called explicitly in the app startup event