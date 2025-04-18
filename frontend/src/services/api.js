// src/services/api.js
import axios from 'axios';

// Get base URL from environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false // Disable credentials when using '*' for CORS
});

// Handle API errors consistently
const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    return {
      success: false,
      message: error.response.data.message || 'Server error',
      status: error.response.status
    };
  } else if (error.request) {
    // The request was made but no response was received
    return {
      success: false,
      message: 'No response from server. Please check your connection.',
      status: 0
    };
  } else {
    // Something happened in setting up the request that triggered an Error
    return {
      success: false,
      message: error.message || 'Unknown error',
      status: 0
    };
  }
};

// API functions
export const analyzePrompt = async (prompt, options = {}) => {
  try {
    // First try with axios
    const response = await api.post('/api/analyze', {
      prompt,
      save_result: options.saveResult !== false,
      user_id: options.userId || null
    });
    
    return response.data;
  } catch (axiosError) {
    console.error('Failed with axios, trying with fetch:', axiosError);
    
    // If axios fails, try with direct fetch as fallback
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          save_result: options.saveResult !== false,
          user_id: options.userId || null
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (fetchError) {
      console.error('Fetch fallback also failed:', fetchError);
      return handleApiError(fetchError);
    }
  }
};

export const getLayers = async () => {
  try {
    const response = await api.get('/api/layers');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSavedLayers = async (userId = null, limit = 20, skip = 0) => {
  try {
    const params = { limit, skip };
    if (userId) params.user_id = userId;
    
    const response = await api.get('/api/saved-layers', { params });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const getAnalyses = async (userId = null, limit = 20, skip = 0) => {
  try {
    const params = { limit, skip };
    if (userId) params.user_id = userId;
    
    const response = await api.get('/api/analyses', { params });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteLayer = async (layerId) => {
  try {
    const response = await api.delete(`/api/layers/${layerId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const clearLayers = async () => {
  try {
    const response = await api.post('/api/layers/clear');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createTimeSeriesAnalysis = async (data) => {
  try {
    const response = await api.post('/api/time-series', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createComparisonAnalysis = async (data) => {
  try {
    const response = await api.post('/api/comparison', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const geocodeLocation = async (location) => {
  try {
    // Use a free geocoding service like Nominatim instead of Google Maps
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: location,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'GeoGemma Application'
      }
    });
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const exportMap = async (layerId, format = 'png') => {
  try {
    const response = await api.get(`/api/export/${layerId}`, {
      params: { format },
      responseType: 'blob'
    });
    
    // Create a download link for the blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `map-export-${layerId}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return {
      success: true,
      message: 'Export successful'
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSystemHealth = async () => {
  try {
    const response = await api.get('/health');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export default api;