#!/usr/bin/env python
"""
Test script to verify Firebase connectivity.

This script tests if Firebase is properly configured and can save/load/delete data.
"""

import asyncio
import logging
import sys
import os
import json
from typing import Dict, Any, List
import aiohttp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("firebase_test")

# Add the project root to Python path
sys.path.insert(0, '.')

# Import the necessary components
from src.utils.firebase_storage import get_firebase_storage
from src.config import get_config


async def check_firebase_database(url: str) -> Dict[str, Any]:
    """Check if the Firebase database exists and is accessible."""
    result = {
        "exists": False,
        "error": None,
        "message": ""
    }
    
    if not url:
        result["error"] = "No URL provided"
        return result
    
    # Ensure URL has correct format for direct access
    if not url.startswith("https://"):
        url = f"https://{url}"
    
    if not "firebaseio.com" in url:
        if not url.endswith("."):
            url = f"{url}."
        url = f"{url}firebaseio.com"
    
    # Add .json for REST API
    test_url = f"{url}/.json"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(test_url) as response:
                if response.status == 200:
                    result["exists"] = True
                    result["message"] = "Database exists and is accessible"
                elif response.status == 401 or response.status == 403:
                    result["message"] = "Database exists but requires authentication"
                    # This is actually good - it means the database exists but requires auth
                    result["exists"] = True
                elif response.status == 404:
                    result["error"] = "Database not found (404)"
                    result["message"] = "The specified database does not exist"
                else:
                    result["error"] = f"HTTP {response.status}"
                    result["message"] = await response.text()
    except aiohttp.ClientError as e:
        result["error"] = f"Connection error: {e}"
    except Exception as e:
        result["error"] = f"Unexpected error: {e}"
    
    return result


async def test_firebase_connection():
    """Test Firebase connectivity and operations."""
    
    # Get configuration
    config = get_config()
    
    # Log configuration status
    firebase_config = config.get_api_keys().get("firebase", {})
    if firebase_config:
        logger.info("Firebase configuration found in config file")
        
        # Print masked versions of the configuration
        db_url = firebase_config.get("database_url", "")
        if db_url:
            masked_url = db_url[:10] + "..." + db_url[-5:] if len(db_url) > 15 else "..."
            logger.info(f"Database URL: {masked_url}")
            
            # Check if the database exists
            db_check = await check_firebase_database(db_url)
            if db_check["exists"]:
                logger.info(f"✅ Database check: {db_check['message']}")
            else:
                logger.error(f"❌ Database check: {db_check['message']}")
                if db_check["error"]:
                    logger.error(f"   Error: {db_check['error']}")
                logger.info("\nPossible solutions:")
                logger.info("1. Check if the database URL is correct")
                logger.info("2. Make sure the database exists in Firebase console")
                logger.info("3. Check Firebase rules to ensure read/write access")
                logger.info("4. Verify that you're using the correct Firebase project")
        else:
            logger.warning("No database URL configured")
        
        has_api_key = bool(firebase_config.get("api_key"))
        logger.info(f"API Key configured: {has_api_key}")
        
        has_encryption = bool(firebase_config.get("encryption_key"))
        logger.info(f"Encryption key configured: {has_encryption}")
    else:
        logger.warning("No Firebase configuration found in config file")
    
    # Get Firebase storage instance
    firebase = get_firebase_storage()
    
    # Print environment variables (with masking for sensitive data)
    logger.info("\nEnvironment variables:")
    db_url_env = os.environ.get("FIREBASE_DB_URL")
    if db_url_env:
        masked_env_url = db_url_env[:10] + "..." + db_url_env[-5:] if len(db_url_env) > 15 else "..."
        logger.info(f"FIREBASE_DB_URL: {masked_env_url}")
    else:
        logger.info("FIREBASE_DB_URL: Not set")
    
    api_key_env = os.environ.get("FIREBASE_API_KEY")
    logger.info(f"FIREBASE_API_KEY: {'Set' if api_key_env else 'Not set'}")
    
    enc_key_env = os.environ.get("FIREBASE_ENCRYPTION_KEY")
    logger.info(f"FIREBASE_ENCRYPTION_KEY: {'Set' if enc_key_env else 'Not set'}")
    
    # Check if Firebase is configured
    if not firebase.is_configured:
        logger.error("Firebase is not fully configured")
        return
    
    logger.info("Firebase is properly configured")
    
    # Verify database connection
    connection_ok = await firebase.verify_database_connection()
    if not connection_ok:
        logger.error("❌ Could not connect to Firebase database")
        logger.info("\nPossible solutions:")
        logger.info("1. Check if the database URL is correct")
        logger.info("2. Make sure the database exists in Firebase console")
        logger.info("3. Check Firebase rules to ensure read/write access")
        logger.info("4. Verify that you're using the correct API key")
        return
    
    logger.info("✅ Successfully connected to Firebase database")
    
    # Test session ID
    test_session_id = "firebase_test_session"
    
    # Test data
    test_messages = [
        {"role": "system", "content": "This is a system message"},
        {"role": "user", "content": "Hello, this is a test message"},
        {"role": "assistant", "content": "This is a response to the test message"}
    ]
    
    # Test saving chat history
    logger.info("Testing save_chat_history...")
    save_result = await firebase.save_chat_history(test_session_id, test_messages)
    if save_result:
        logger.info("✅ Successfully saved chat history to Firebase")
    else:
        logger.error("❌ Failed to save chat history to Firebase")
    
    # Test loading chat history
    logger.info("Testing load_chat_history...")
    loaded_messages = await firebase.load_chat_history(test_session_id)
    if loaded_messages:
        logger.info("✅ Successfully loaded chat history from Firebase")
        logger.info(f"Loaded {len(loaded_messages)} messages")
        
        # Verify the content matches
        if loaded_messages == test_messages:
            logger.info("✅ Loaded messages match the saved messages")
        else:
            logger.error("❌ Loaded messages do not match the saved messages")
    else:
        logger.error("❌ Failed to load chat history from Firebase")
    
    # Test deleting chat history
    logger.info("Testing delete_chat_history...")
    delete_result = await firebase.delete_chat_history(test_session_id)
    if delete_result:
        logger.info("✅ Successfully deleted chat history from Firebase")
    else:
        logger.error("❌ Failed to delete chat history from Firebase")
    
    # Verify the deletion
    logger.info("Verifying deletion...")
    after_delete = await firebase.load_chat_history(test_session_id)
    if after_delete is None:
        logger.info("✅ Deletion verified - no data found after deletion")
    else:
        logger.error("❌ Deletion verification failed - data still exists after deletion")
    
    # Close Firebase session
    await firebase.close()
    logger.info("Firebase test completed")


if __name__ == "__main__":
    logger.info("Starting Firebase connection test")
    asyncio.run(test_firebase_connection()) 