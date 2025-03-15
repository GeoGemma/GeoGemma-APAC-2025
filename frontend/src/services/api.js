// src/services/api.js
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
    baseURL: 'http://localhost:8000', // Make sure this matches your backend URL
    headers: {
      'Content-Type': 'application/json',
    },
  });

export const geocodeLocation = async (location) => {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json`
    );
    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lon: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name,
      };
    }
    throw new Error('Location not found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

export const processPrompt = async (prompt) => {
  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    
    const response = await api.post('/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error processing prompt:', error);
    throw error;
  }
};

export const getLayers = async () => {
  try {
    const response = await api.get('/api/layers');
    return response.data;
  } catch (error) {
    console.error('Error fetching layers:', error);
    throw error;
  }
};

export const deleteLayer = async (layerId) => {
  try {
    const response = await api.delete(`/api/layers/${layerId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting layer:', error);
    throw error;
  }
};

export const clearLayers = async () => {
  try {
    const response = await api.post('/api/layers/clear');
    return response.data;
  } catch (error) {
    console.error('Error clearing layers:', error);
    throw error;
  }
};

export const analyzePrompt = async (prompt) => {
  try {
    const response = await api.post('/api/analyze', { prompt });
    return response.data;
  } catch (error) {
    console.error('Error analyzing prompt:', error);
    throw error;
  }
};

export default api;