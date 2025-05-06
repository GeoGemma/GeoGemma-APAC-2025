@echo off
REM Simple script to run GIS_Agent locally on Windows

REM Configuration - modify these as needed
set PORT=8081
set HOST=0.0.0.0
set DEBUG=true

REM Change to the GIS_Agent directory
cd %~dp0

REM Check if .env file exists, create if it doesn't
if not exist .env (
  echo Creating sample .env file...
  (
    echo # GIS Agent Environment Variables
    echo PORT=%PORT%
    echo DEBUG=%DEBUG%
    echo # Add your API keys below
    echo # GEMINI_API_KEY=your_key_here
    echo # EE_PROJECT_ID=your_project_id
  ) > .env
  echo Note: Created a sample .env file. You may need to edit it to add your API keys.
)

REM Check if virtual environment exists and activate it
if exist venv\Scripts\activate.bat (
  echo Activating virtual environment...
  call venv\Scripts\activate.bat
) else (
  echo Warning: Virtual environment not found. Running with system Python.
  echo Tip: Create a virtual environment with: python -m venv venv
)

REM Ensure required directories exist
if not exist logs mkdir logs
if not exist data\cache mkdir data\cache
if not exist data\temp mkdir data\temp

REM Run the agent
echo Starting GIS_Agent on %HOST%:%PORT% (debug=%DEBUG%)...
if "%DEBUG%"=="true" (
  python run.py --host=%HOST% --port=%PORT% --debug
) else (
  python run.py --host=%HOST% --port=%PORT%
)

REM Deactivate virtual environment if it was activated
if exist venv\Scripts\activate.bat (
  call venv\Scripts\deactivate.bat
)

echo Done.
pause 