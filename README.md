# GeoGemma: Earth Observation with Google Earth & Gemma

![GeoGemma Logo](public/geoshort.png)

**GeoGemma** is an innovative Earth observation application that combines Google Earth Engine's powerful imagery analysis with Google Gemini's conversational AI. It enables users to explore satellite imagery, analyze geospatial data, and extract insights through natural language prompts.

## 📍 Features

- **Natural Language Search**: Query Earth imagery using plain English (e.g., "Show NDVI in Paris for 2022")
- **Multiple Data Layers**:
  - RGB Satellite Imagery from Sentinel-2 and Landsat
  - Normalized Difference Vegetation Index (NDVI) 
  - Surface Water Analysis
  - Land Use/Land Cover Classification (LULC)
  - Land Surface Temperature (LST)
  - Open Buildings Dataset
- **Time Series Analysis**: Track changes over time for any supported data type
- **Comparison Analysis**: Compare imagery between different dates
- **Measurement Tools**: Calculate distances on the map
- **Layer Management**: Control opacity and visibility of multiple layers
- **Detailed Metadata**: Access comprehensive information about each layer
- **AI Assistant Chat**: Discuss Earth science topics with the embedded Gemini AI

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- Python 3.8+
- Google Earth Engine account with access to the Earth Engine API
- Google Gemini API key

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/geogemma.git
   cd geogemma
   ```

2. Create and configure environment files:

   #### Backend (.env)
   ```
   EE_PROJECT_ID="your-ee-project-id"
   SECRET_KEY="your-secret-key"
   OLLAMA_BASE_URL="http://localhost:11434"  # If using Ollama
   OLLAMA_MODEL="gemma2:2b"  # If using Ollama
   ```

   #### Frontend (.env)
   ```
   VITE_API_URL=http://localhost:8000
   VITE_BACKEND_URL=http://localhost:8000
   VITE_GEMINI_API_KEY=your-gemini-api-key
   ```

3. Install dependencies:

   #### Backend
   ```bash
   pip install -r requirements.txt
   ```

   #### Frontend
   ```bash
   npm install
   ```

4. Authenticate with Earth Engine:
   ```bash
   earthengine authenticate
   ```

### Running the Application

1. Start the backend server:
   ```bash
   python app.py
   ```

2. Start the frontend development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## 🔍 Usage Examples

### Basic Queries

- "Show RGB imagery of Tokyo from Landsat 8"
- "NDVI in Amazon rainforest for 2023"
- "Surface water in Amsterdam"
- "Land use classification for Berlin"
- "Land surface temperature in Rio de Janeiro for 2020"
- "Building heights in New York City"

### Advanced Queries

- "Compare NDVI in California between 2018 and 2023"
- "Time series of surface water in Lake Mead from 2000 to 2023"
- "LST changes in Phoenix during summer months"
- "Vegetation loss in the Amazon from 2015 to 2022"

## 🏗️ Project Architecture

### Frontend (React + Vite)

- **Context API**: MapContext for global state management
- **Components**:
  - Map visualization using MapLibre GL JS
  - Chat interface with Google Gemini integration
  - Analysis tools for time series and comparisons
  - Layer management sidebar
  - Responsive UI design with Google styling

### Backend (FastAPI)

- **Earth Engine Integration**: Processes and serves Earth Engine imagery
- **API Endpoints**:
  - `/api/analyze`: Natural language prompt analysis
  - `/api/time-series`: Time series generation
  - `/api/comparison`: Date comparison analysis
  - `/api/layers`: Layer management
- **Prompt Analysis**: Uses LLM to extract geospatial parameters from natural language

## 📁 Project Structure

```
geogemma/
├── app.py                  # FastAPI backend entry point
├── authenticate_ee.py      # Earth Engine authentication
├── ee_metadata.py          # Metadata extraction utilities
├── ee_modules/             # Earth Engine processing modules
│   ├── rgb.py              # RGB imagery processing
│   ├── ndvi.py             # NDVI processing
│   ├── water.py            # Surface water processing
│   ├── lulc.py             # Land use/cover processing
│   ├── lst.py              # Land surface temperature
│   └── openbuildings.py    # Building height analysis
├── ee_utils.py             # Earth Engine utility functions
├── src/                    # Frontend React application
│   ├── components/         # UI components
│   ├── contexts/           # React contexts
│   ├── services/           # API services
│   ├── styles/             # CSS styles
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main React component
│   └── main.jsx            # Frontend entry point
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json            # NPM configuration
├── vite.config.js          # Vite configuration
└── README.md               # Project documentation
```

## 🛠️ Key Technologies

### Frontend
- **React**: UI library
- **MapLibre GL JS**: Interactive mapping
- **Google Generative AI SDK**: Gemini integration
- **TailwindCSS**: Styling
- **Vite**: Build tool and development server

### Backend
- **FastAPI**: API framework
- **Earth Engine Python API**: Satellite imagery processing
- **LangChain + Ollama**: Local LLM integration (optional)
- **Pydantic**: Data validation
- **Geopy**: Geocoding

## 🌐 Earth Engine Data Sources

- **Sentinel-2**: 10m resolution optical imagery (since 2015)
- **Landsat**: 30m resolution imagery (historical data since 1982)
- **JRC Global Surface Water**: Water presence and seasonality
- **ESA WorldCover**: Land cover classification
- **LST datasets**: Land surface temperature from Landsat thermal bands
- **Google Open Buildings**: Building footprints and heights

## 🔒 Authentication

The application requires authentication with Google Earth Engine:

1. Ensure you have an active Google Cloud account with Earth Engine API enabled
2. Create a service account with Earth Engine access
3. Set the `EE_PROJECT_ID` environment variable
4. Use `earthengine authenticate` or provide service account credentials

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Google Earth Engine for satellite imagery and analysis capabilities
- Google Gemini for the conversational AI component
- MapLibre GL JS for the mapping visualization
- The open-source community for various libraries and tools used in this project
