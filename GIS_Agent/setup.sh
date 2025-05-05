#!/bin/bash
# Setup script for the GIS AI Agent

# Set up colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up the GIS AI Agent...${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create virtual environment. Please make sure you have Python 3 installed.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Virtual environment created successfully.${NC}"
else
    echo -e "${YELLOW}Virtual environment already exists. Skipping creation.${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to activate virtual environment.${NC}"
    exit 1
fi
echo -e "${GREEN}Virtual environment activated.${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies.${NC}"
    exit 1
fi
echo -e "${GREEN}Dependencies installed successfully.${NC}"

# Install development dependencies
echo -e "${YELLOW}Installing development dependencies...${NC}"
pip install -r requirements-dev.txt
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Failed to install development dependencies. Continuing...${NC}"
fi

# Create API keys configuration if it doesn't exist
if [ ! -f "GIS_Agent/config/api_keys.yaml" ]; then
    echo -e "${YELLOW}Creating API keys configuration...${NC}"
    cp GIS_Agent/config/api_keys.yaml.example GIS_Agent/config/api_keys.yaml
    echo -e "${GREEN}API keys configuration created. Please edit GIS_Agent/config/api_keys.yaml to add your API keys.${NC}"
else
    echo -e "${YELLOW}API keys configuration already exists. Skipping creation.${NC}"
fi

# Create cache directory if it doesn't exist
if [ ! -d "GIS_Agent/data/cache" ]; then
    echo -e "${YELLOW}Creating cache directory...${NC}"
    mkdir -p GIS_Agent/data/cache
    echo -e "${GREEN}Cache directory created successfully.${NC}"
fi

# Create static data directory if it doesn't exist
if [ ! -d "GIS_Agent/data/static" ]; then
    echo -e "${YELLOW}Creating static data directory...${NC}"
    mkdir -p GIS_Agent/data/static
    echo -e "${GREEN}Static data directory created successfully.${NC}"
fi

# Set up pre-commit hooks
echo -e "${YELLOW}Setting up pre-commit hooks...${NC}"
pre-commit install
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Failed to set up pre-commit hooks. If you want to use them, install pre-commit with 'pip install pre-commit' and run 'pre-commit install'.${NC}"
else
    echo -e "${GREEN}Pre-commit hooks set up successfully.${NC}"
fi

echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${YELLOW}To start using the GIS AI Agent:${NC}"
echo -e "1. Edit GIS_Agent/config/api_keys.yaml to add your API keys."
echo -e "2. Run the server with 'python GIS_Agent/run.py'."
echo -e "3. Try examples with 'python GIS_Agent/examples/basic_query.py --query \"What is the water stress level in California?\"'"
echo -e "${GREEN}Happy coding!${NC}" 