
# --- authenticate_ee.py ---
import ee
import logging
import os
import json
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('earth_engine_auth')

# MODIFIED: Function now requires project_id as an argument
def initialize_ee(project_id: str):
    """
    Simple Earth Engine authentication and initialization using the provided project ID.
    Returns a tuple (success, error_message).
    """
    # Project ID is now passed as an argument.

    if not project_id:
        error_msg = "Project ID was not provided to initialize_ee function."
        logger.error(error_msg)
        return False, error_msg

    try:
        logger.info(f"Attempting Earth Engine authentication/initialization with project ID: {project_id}")

        # Try to authenticate (might prompt user in console if no credentials found)
        # This step is often problematic in non-interactive environments.
        # Consider using service account credentials for deployment.
        try:
            # Check if credentials already exist (e.g., via gcloud auth application-default login)
            # If not, ee.Authenticate() will try to initiate the auth flow.
            # NOTE: ee.Credentials() check might not be strictly necessary if ee.Initialize handles it,
            # but can provide useful logging.
            if not ee.Credentials():
                 logger.info("No existing EE credentials explicitly found by ee.Credentials(), attempting ee.Authenticate()...")
                 # This might hang or fail in non-interactive environments
                 # Consider alternatives like service accounts for deployments.
                 try:
                     # Attempt authentication, prefer gcloud if available
                     ee.Authenticate(auth_mode='gcloud')
                     logger.info("Authentication flow attempted (or credentials found/reused by gcloud mode).")
                 except Exception as gcloud_auth_error:
                     logger.warning(f"ee.Authenticate(auth_mode='gcloud') failed: {gcloud_auth_error}. Trying default auth mode...")
                     try:
                        ee.Authenticate() # Try default auth mode as fallback
                        logger.info("Authentication flow attempted (or credentials found/reused by default mode).")
                     except Exception as default_auth_error:
                         logger.error(f"Both gcloud and default authentication attempts failed: {default_auth_error}")
                         # Don't return False yet, Initialize might still work with existing ADC.
                         logger.info("Proceeding with Initialize, hoping Application Default Credentials (ADC) exist...")

            else:
                 logger.info("Existing EE credentials found by ee.Credentials().")

        except Exception as auth_error:
            # This might catch errors during the ee.Credentials() check itself
            logger.warning(f"Error during credential check/authentication attempt: {auth_error}")
            logger.info("Proceeding with initialization using specified project, relying on ee.Initialize...")


        # Initialize with explicit project ID passed as argument
        # This is the crucial step. It uses the project for billing/quota.
        # Ensure Application Default Credentials (ADC) are set up correctly in the environment
        # (e.g., via `gcloud auth application-default login` or GOOGLE_APPLICATION_CREDENTIALS env var)
        ee.Initialize(project=project_id, opt_url='https://earthengine-highvolume.googleapis.com')
        logger.info(f"Earth Engine initialized successfully with project: {project_id} and High Volume endpoint.")

        # Verify the project is actually working with a simple test
        try:
            # Test with a simple operation that requires project context
            logger.info("Performing a simple EE operation to verify project access...")
            _ = ee.Image(1).getMapId() # getMapId requires project context
            logger.info("Earth Engine test operation successful.")
        except ee.EEException as test_error:
            # Provide more context on common errors
            err_str = str(test_error).lower()
            if "compute platform" in err_str or "project" in err_str or "permission" in err_str or "cloud project" in err_str:
                 error_msg = f"EE Test Failed: Project '{project_id}' might not exist, have EE API enabled, or Application Default Credentials lack permission for this project. Error: {test_error}"
            else:
                 error_msg = f"Earth Engine test operation failed: {test_error}"
            logger.error(error_msg)
            return False, error_msg
        except Exception as test_error: # Catch other potential errors
            error_msg = f"Unexpected error during EE test operation: {test_error}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg

        return True, None

    except ee.EEException as e:
         # Specific check for project-related initialization errors
         err_str = str(e).lower()
         if "cloud project" in err_str or "not found" in err_str or "permission" in err_str:
             error_msg = f"EE Initialization Failed: Could not initialize with project '{project_id}'. Check project existence, EE API enablement, and ADC permissions. Error: {e}"
         else:
             error_msg = f"Earth Engine initialization failed (EEException): {e}"
         logger.error(error_msg)
         return False, error_msg
    except Exception as e:
        # Catch potential errors like google.auth.exceptions.DefaultCredentialsError
        error_msg = f"Earth Engine initialization failed (Unexpected Error): {e}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg

if __name__ == "__main__":
    # This allows running this file directly to test authentication
    print("Running EE Authentication Test...")
    # MODIFIED: Load dotenv here specifically for the test script execution
    from dotenv import load_dotenv
    load_dotenv()
    test_project_id = os.environ.get('EE_PROJECT_ID')
    if not test_project_id:
        print("\nERROR: EE_PROJECT_ID not found in environment variables or .env file.")
        print("Please ensure EE_PROJECT_ID is set for testing.")
    else:
        print(f"Attempting initialization with Project ID: {test_project_id}")
        # Call the modified function with the ID from env
        success, error = initialize_ee(test_project_id)
        if success:
            print("\nAuthentication and initialization successful!")
        else:
            print(f"\nError: {error}")

# Don't automatically initialize at import time in FastAPI
# This will be called explicitly in the app startup event