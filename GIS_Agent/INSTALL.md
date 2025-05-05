# GIS AI Agent Installation Guide

This guide provides step-by-step instructions for installing and setting up the GIS AI Agent on your system.

## Prerequisites

Before installing the GIS AI Agent, ensure you have the following prerequisites:

- Python 3.10 or higher
- pip (Python package installer)
- Git (for cloning the repository)
- API keys for the services:
  - Google Gemini API key
  - Google Earth Engine service account credentials (optional)
  - NASA EOSDIS account (optional)
  - USGS Earth Explorer account (optional)
  - Copernicus Open Access Hub account (optional)
  - OpenWeatherMap API key (optional)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gis-agent.git
cd gis-agent
```

### 2. Create and Activate a Virtual Environment

#### On macOS/Linux:
```bash
python -m venv venv
source venv/bin/activate
```

#### On Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure API Keys

Copy the example API keys configuration file and add your actual API keys:

```bash
cp GIS_Agent/config/api_keys.yaml.example GIS_Agent/config/api_keys.yaml
```

Edit the `api_keys.yaml` file to include your actual API keys:

```yaml
# Google Gemini API
gemini:
  api_key: "YOUR_GEMINI_API_KEY"

# Add other API keys as needed
```

Alternatively, you can set the API keys as environment variables:

```bash
export GEMINI_API_KEY="your_gemini_api_key"
export OPENWEATHERMAP_API_KEY="your_openweathermap_api_key"
```

### 5. Install the Package (Optional)

If you want to install the GIS Agent as a package for easier access:

```bash
pip install -e .
```

## Running the GIS AI Agent

### Starting the Server

To start the MCP server:

```bash
python GIS_Agent/run.py
```

This will start the server with default settings. For more options, use:

```bash
python GIS_Agent/run.py --help
```

### Using the Examples

The `examples` directory contains several example scripts demonstrating how to use the GIS AI Agent:

- Basic query example:
  ```bash
  python GIS_Agent/examples/basic_query.py --query "What is the water stress level in California?"
  ```

- Sustainability assessment example:
  ```bash
  python GIS_Agent/examples/sustainability_assessment.py --area "New York City" --type water_resources
  ```

- Map visualization example:
  ```bash
  python GIS_Agent/examples/map_visualization.py --area "London" --type map --format html
  ```

## Troubleshooting

### Common Issues

1. **API Key Issues**:
   - Ensure that your API keys are correctly set in the `api_keys.yaml` file or as environment variables.
   - Check that the API services are accessible from your network.

2. **Module Not Found Errors**:
   - Make sure you've installed all dependencies with `pip install -r requirements.txt`.
   - Ensure you're running the scripts from the correct directory.

3. **Visualization Issues**:
   - For map visualizations, ensure you're using HTML format for the most reliable results.
   - If using other formats, additional dependencies may be required.

### Getting Help

If you encounter issues not covered in this guide, please:

1. Check the documentation in the `docs` directory.
2. Open an issue on the GitHub repository.
3. Contact the maintainers for support.

## Next Steps

After installation, check the documentation to learn more about:

- Advanced configuration options
- Creating custom tools
- Extending the GIS AI Agent with additional data sources
- Contributing to the project 