#!/bin/bash
# Simple script to run GIS_Agent locally

# Exit on error
set -e

# Configuration - modify these as needed
PORT=8081
HOST="0.0.0.0"
DEBUG=true

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print with color
echo_color() {
  echo -e "${GREEN}==>${NC} $1"
}

# Change to the GIS_Agent directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Check if .env file exists, create if it doesn't
if [ ! -f .env ]; then
  echo_color "Creating sample .env file..."
  cat > .env << EOL
# GIS Agent Environment Variables
PORT=${PORT}
DEBUG=${DEBUG}
# Add your API keys below
# GEMINI_API_KEY=your_key_here
# EE_PROJECT_ID=your_project_id
EOL
  echo -e "${YELLOW}Note:${NC} Created a sample .env file. You may need to edit it to add your API keys."
fi

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
  echo_color "Activating virtual environment..."
  source venv/bin/activate
else
  echo -e "${YELLOW}Warning:${NC} Virtual environment not found. Running with system Python."
  echo -e "${YELLOW}Tip:${NC} Create a virtual environment with: python -m venv venv"
fi

# Ensure required directories exist
mkdir -p logs data/cache data/temp

# Run the agent
echo_color "Starting GIS_Agent on ${HOST}:${PORT} (debug=${DEBUG})..."
python run.py --host=${HOST} --port=${PORT} $(if [ "$DEBUG" = true ]; then echo "--debug"; fi)

# Deactivate virtual environment if it was activated
if [ -d "venv" ]; then
  deactivate
fi 