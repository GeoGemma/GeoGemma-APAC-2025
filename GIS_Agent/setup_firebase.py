#!/usr/bin/env python
"""
Firebase Setup Script.

This script helps set up a Firebase Realtime Database with the correct rules
for the GIS AI Agent.
"""

import asyncio
import aiohttp
import json
import logging
import os
import sys
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("firebase_setup")

# Add the project root to Python path
sys.path.insert(0, '.')

# Import the necessary components
from src.config import get_config


async def setup_firebase_database():
    """Set up Firebase database with proper rules."""
    
    # Get configuration
    config = get_config()
    
    # Get Firebase configuration
    firebase_config = config.get_api_keys().get("firebase", {})
    
    if not firebase_config:
        logger.error("No Firebase configuration found in config file.")
        return False
    
    # Get database URL and API key
    db_url = firebase_config.get("database_url")
    api_key = firebase_config.get("api_key")
    
    if not db_url:
        logger.error("No database URL configured.")
        return False
    
    if not api_key:
        logger.error("No API key configured.")
        return False
    
    # Normalize the database URL
    if not db_url.startswith("https://"):
        db_url = f"https://{db_url}"
    
    if not "firebaseio.com" in db_url:
        if not db_url.endswith("."):
            db_url = f"{db_url}."
        db_url = f"{db_url}firebaseio.com"
    
    logger.info(f"Using Firebase database URL: {db_url}")
    
    # Test database connection
    try:
        async with aiohttp.ClientSession() as session:
            # Try to access the root of the database
            test_url = f"{db_url}/.json?auth={api_key}"
            
            async with session.get(test_url) as response:
                if response.status in (401, 403):
                    logger.info("Database exists but requires authentication (this is normal).")
                elif response.status == 404:
                    logger.error("Database not found. Please create it in the Firebase console.")
                    logger.info("\nSteps to create a new Firebase Realtime Database:")
                    logger.info("1. Go to the Firebase console: https://console.firebase.google.com/")
                    logger.info("2. Select your project")
                    logger.info("3. Navigate to 'Realtime Database'")
                    logger.info("4. Click 'Create Database'")
                    logger.info("5. Choose a location")
                    logger.info("6. Start in test mode or with the rules below")
                    return False
                elif response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Error connecting to database: {response.status} - {error_text}")
                    return False
                else:
                    logger.info("Successfully connected to Firebase database.")
    
        # Create database rules
        rules = {
            "rules": {
                ".read": "auth != null",
                ".write": "auth != null",
                "chat_history": {
                    "$session_id": {
                        ".read": "auth != null",
                        ".write": "auth != null"
                    }
                },
                "sessions": {
                    "$session_id": {
                        ".read": "auth != null",
                        ".write": "auth != null"
                    }
                }
            }
        }
        
        # Set up database rules
        logger.info("Setting up database rules...")
        try:
            rules_url = f"{db_url}/.settings/rules.json?auth={api_key}"
            
            async with aiohttp.ClientSession() as session:
                async with session.put(rules_url, json=rules) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error setting rules: {response.status} - {error_text}")
                        return False
                    else:
                        logger.info("Successfully set database rules.")
                        return True
        except Exception as e:
            logger.error(f"Error setting database rules: {e}")
            return False
    
    except Exception as e:
        logger.error(f"Error setting up Firebase database: {e}")
        return False
    
    return True


if __name__ == "__main__":
    logger.info("Starting Firebase database setup")
    success = asyncio.run(setup_firebase_database())
    
    if success:
        logger.info("✅ Firebase database setup completed successfully")
    else:
        logger.error("❌ Firebase database setup failed")
        
    logger.info("\nIf you're having issues, try these manual steps:")
    logger.info("1. Go to the Firebase console: https://console.firebase.google.com/")
    logger.info("2. Create a new project if you don't have one")
    logger.info("3. Navigate to Realtime Database and create a new database")
    logger.info("4. Copy the database URL to your config/api_keys.yaml file")
    logger.info("5. Set database rules to allow authenticated access") 