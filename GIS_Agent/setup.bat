@echo off
REM Setup script for the GIS AI Agent on Windows

echo Setting up the GIS AI Agent...

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment. Please make sure you have Python 3 installed.
        exit /b 1
    )
    echo Virtual environment created successfully.
) else (
    echo Virtual environment already exists. Skipping creation.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate
if errorlevel 1 (
    echo Failed to activate virtual environment.
    exit /b 1
)
echo Virtual environment activated.

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install dependencies.
    exit /b 1
)
echo Dependencies installed successfully.

REM Install development dependencies
echo Installing development dependencies...
pip install -r requirements-dev.txt
if errorlevel 1 (
    echo Warning: Failed to install development dependencies. Continuing...
)

REM Create API keys configuration if it doesn't exist
if not exist GIS_Agent\config\api_keys.yaml (
    echo Creating API keys configuration...
    copy GIS_Agent\config\api_keys.yaml.example GIS_Agent\config\api_keys.yaml
    echo API keys configuration created. Please edit GIS_Agent\config\api_keys.yaml to add your API keys.
) else (
    echo API keys configuration already exists. Skipping creation.
)

REM Create cache directory if it doesn't exist
if not exist GIS_Agent\data\cache (
    echo Creating cache directory...
    mkdir GIS_Agent\data\cache
    echo Cache directory created successfully.
)

REM Create static data directory if it doesn't exist
if not exist GIS_Agent\data\static (
    echo Creating static data directory...
    mkdir GIS_Agent\data\static
    echo Static data directory created successfully.
)

REM Set up pre-commit hooks
echo Setting up pre-commit hooks...
pre-commit install
if errorlevel 1 (
    echo Warning: Failed to set up pre-commit hooks. If you want to use them, install pre-commit with 'pip install pre-commit' and run 'pre-commit install'.
)

echo Setup completed successfully!
echo To start using the GIS AI Agent:
echo 1. Edit GIS_Agent\config\api_keys.yaml to add your API keys.
echo 2. Run the server with 'python GIS_Agent\run.py'.
echo 3. Try examples with 'python GIS_Agent\examples\basic_query.py --query "What is the water stress level in California?"'
echo Happy coding! 