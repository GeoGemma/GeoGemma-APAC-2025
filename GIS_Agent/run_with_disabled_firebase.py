#!/usr/bin/env python
"""
Run GIS Agent with Firebase Disabled.

This script runs the GIS Agent server with Firebase storage explicitly disabled,
allowing the application to run without requiring a Firebase database connection.
"""

import os
import sys
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("run_helper")

def main():
    """Run the GIS Agent server with Firebase disabled."""
    # Set environment variable to disable Firebase
    os.environ["DISABLE_FIREBASE"] = "true"
    
    logger.info("Setting DISABLE_FIREBASE=true environment variable")
    
    # Determine the server script path
    server_script = "./src/mcp_server/server.py"
    if not os.path.exists(server_script):
        # Try to find the server script
        for root, dirs, files in os.walk("."):
            for file in files:
                if file == "server.py" and "mcp_server" in root:
                    server_script = os.path.join(root, file)
                    break
            if os.path.exists(server_script):
                break
    
    if not os.path.exists(server_script):
        logger.error("Could not find server.py script. Make sure you're in the GIS Agent directory.")
        return 1
    
    logger.info(f"Running server with Firebase disabled: {server_script}")
    
    # Run the server script
    try:
        # Pass through all command line arguments to the server script
        cmd = [sys.executable, server_script] + sys.argv[1:]
        logger.info(f"Command: {' '.join(cmd)}")
        
        # Run the server, inheriting stdio from parent process
        return subprocess.call(cmd)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        return 0
    except Exception as e:
        logger.error(f"Error running server: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 