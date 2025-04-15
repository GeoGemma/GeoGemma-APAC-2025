import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Document
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# MongoDB connection string from environment variable, with fallback
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb+srv://gdgocist:swJqwL5xmjxXCaxX@geogemma.bzbvzek.mongodb.net/")
DB_NAME = os.environ.get("MONGODB_DB_NAME", "geogemma")

# Database client
client = None
db = None

# Define MongoDB models as Beanie documents
class User(Document):
    username: str
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"

class AnalysisResult(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    prompt: str
    location: str
    processing_type: str
    satellite: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    year: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tile_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "analysis_results"

class SavedLayer(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    name: str
    location: str
    processing_type: str
    tile_url: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opacity: float = 0.8
    visibility: str = "visible"
    analysis_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "saved_layers"

class TimeSeriesAnalysis(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    location: str
    processing_type: str
    start_date: str
    end_date: str
    interval: str  # 'daily', 'weekly', 'monthly', 'yearly'
    results: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "time_series_analyses"

class CustomArea(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    geometry: Dict[str, Any]  # GeoJSON geometry
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "custom_areas"

async def connect_to_mongodb():
    """Connect to MongoDB and initialize models"""
    global client, db
    try:
        # Create client
        client = AsyncIOMotorClient(MONGODB_URI)
        db = client[DB_NAME]
        
        # Initialize Beanie with the document models
        await init_beanie(
            database=db,
            document_models=[
                User,
                AnalysisResult,
                SavedLayer,
                TimeSeriesAnalysis,
                CustomArea
            ]
        )
        
        logging.info(f"Connected to MongoDB at {MONGODB_URI}")
        return True
    except Exception as e:
        logging.error(f"Failed to connect to MongoDB: {e}")
        return False

async def close_mongodb_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        logging.info("Closed MongoDB connection")

# Utility functions for database operations
async def save_analysis_result(analysis_data):
    """Save an analysis result to the database"""
    try:
        analysis = AnalysisResult(**analysis_data)
        await analysis.insert()
        return analysis.id
    except Exception as e:
        logging.error(f"Error saving analysis result: {e}")
        return None

async def save_layer(layer_data):
    """Save a layer to the database"""
    try:
        layer = SavedLayer(**layer_data)
        await layer.insert()
        return layer.id
    except Exception as e:
        logging.error(f"Error saving layer: {e}")
        return None

async def get_user_analyses(user_id=None, limit=20, skip=0):
    """Get analyses for a user, or all analyses if user_id is None"""
    try:
        if user_id:
            results = await AnalysisResult.find(AnalysisResult.user_id == user_id)\
                                       .sort(-AnalysisResult.created_at)\
                                       .limit(limit)\
                                       .skip(skip)\
                                       .to_list()
        else:
            results = await AnalysisResult.find()\
                                       .sort(-AnalysisResult.created_at)\
                                       .limit(limit)\
                                       .skip(skip)\
                                       .to_list()
        return results
    except Exception as e:
        logging.error(f"Error retrieving analyses: {e}")
        return []

async def get_user_layers(user_id=None, limit=20, skip=0):
    """Get saved layers for a user, or all layers if user_id is None"""
    try:
        if user_id:
            layers = await SavedLayer.find(SavedLayer.user_id == user_id)\
                                   .sort(-SavedLayer.created_at)\
                                   .limit(limit)\
                                   .skip(skip)\
                                   .to_list()
        else:
            layers = await SavedLayer.find()\
                                   .sort(-SavedLayer.created_at)\
                                   .limit(limit)\
                                   .skip(skip)\
                                   .to_list()
        return layers
    except Exception as e:
        logging.error(f"Error retrieving saved layers: {e}")
        return []

async def save_custom_area(area_data):
    """Save a custom area to the database"""
    try:
        area = CustomArea(**area_data)
        await area.insert()
        return area.id
    except Exception as e:
        logging.error(f"Error saving custom area: {e}")
        return None 