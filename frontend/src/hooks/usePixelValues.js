// src/hooks/usePixelValues.js
import { useState, useCallback } from 'react';
import { useMap } from '../contexts/MapContext';

/**
 * Custom hook for retrieving pixel values from map layers
 * In a production environment, this would make API calls to fetch real values from Earth Engine
 */
const usePixelValues = () => {
  const { map, layers } = useMap();
  const [isLoading, setIsLoading] = useState(false);
  const [pixelValues, setPixelValues] = useState({});
  const [error, setError] = useState(null);

  /**
   * Fetch pixel values for a specific layer at given coordinates
   * @param {string} layerId - The ID of the layer to get values for
   * @param {Array} coordinates - [longitude, latitude] coordinates
   */
  const fetchPixelValue = useCallback(async (layerId, coordinates) => {
    if (!map || !layerId || !coordinates) {
      setError("Missing required parameters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const layer = layers.find(l => l.id === layerId);
      if (!layer) {
        setError(`Layer with ID ${layerId} not found`);
        setIsLoading(false);
        return;
      }

      // In a real implementation, this would make an API call to a backend
      // that would fetch the actual pixel value from Earth Engine or a tile server
      
      // For prototype purposes, we'll create a deterministic but realistic mock value
      // based on the coordinates and layer type
      const mockValue = generateMockValue(coordinates, layer);
      
      // Set the value - maintain any previous values for other layers
      setPixelValues(prev => ({
        ...prev,
        [layerId]: mockValue
      }));
      
    } catch (err) {
      console.error("Error fetching pixel value:", err);
      setError(err.message || "Failed to fetch pixel value");
    } finally {
      setIsLoading(false);
    }
  }, [map, layers]);

  /**
   * Clear pixel values for all or specific layers
   * @param {string} [layerId] - Optional specific layer ID to clear, clears all if not provided
   */
  const clearPixelValues = useCallback((layerId = null) => {
    if (layerId) {
      setPixelValues(prev => {
        const newValues = { ...prev };
        delete newValues[layerId];
        return newValues;
      });
    } else {
      setPixelValues({});
    }
    setError(null);
  }, []);

  /**
   * Generate realistic mock value based on layer type and coordinates
   * This function creates deterministic values based on coordinates
   * so clicking the same spot gives the same value
   */
  const generateMockValue = (coordinates, layer) => {
    const [lng, lat] = coordinates;
    const layerType = layer.processing_type;
    
    // Create a deterministic seed from coordinates
    // This ensures the same spot returns the same value
    const seed = Math.abs(Math.sin(lng * 100) * Math.cos(lat * 100));
    const normalizedSeed = seed - Math.floor(seed); // Value between 0-1
    
    switch(layerType) {
      case 'NDVI':
        // NDVI typically ranges from -0.2 to 0.8
        return {
          type: 'NDVI',
          value: (normalizedSeed * 0.9 - 0.2).toFixed(3),
          unit: '',
          min: -0.2,
          max: 0.8,
          metadata: layer.metadata
        };
        
      case 'LST':
        // Land Surface Temperature in Celsius
        return {
          type: 'Land Surface Temperature',
          value: (normalizedSeed * 40 + 5).toFixed(1),
          unit: '°C',
          min: 0,
          max: 50,
          metadata: layer.metadata
        };
        
      case 'SURFACE WATER':
        // Water occurrence percentage
        return {
          type: 'Surface Water Occurrence',
          value: Math.floor(normalizedSeed * 100),
          unit: '%',
          min: 0,
          max: 100,
          metadata: layer.metadata
        };
        
      case 'LULC':
        // Land cover classification
        const lulcClasses = {
          1: 'Cultivated Land',
          2: 'Forest',
          3: 'Grassland',
          4: 'Shrubland',
          5: 'Water',
          6: 'Wetlands',
          7: 'Tundra',
          8: 'Artificial Surface',
          9: 'Bareland',
          10: 'Snow and Ice'
        };
        const classId = Math.floor(normalizedSeed * 10) + 1;
        return {
          type: 'Land Use / Land Cover',
          value: classId,
          className: lulcClasses[classId],
          unit: '',
          categorical: true,
          metadata: layer.metadata
        };
        
      case 'RGB':
        // RGB color values 
        return {
          type: 'RGB Values',
          r: Math.floor(normalizedSeed * 255),
          g: Math.floor((normalizedSeed + 0.33) % 1 * 255),
          b: Math.floor((normalizedSeed + 0.66) % 1 * 255),
          categorical: false,
          metadata: layer.metadata
        };
        
      case 'OPEN BUILDINGS':
        // Building height in meters
        return {
          type: 'Building Height',
          value: (normalizedSeed * 50).toFixed(1),
          unit: 'm',
          min: 0,
          max: 50,
          metadata: layer.metadata
        };
        
      default:
        return {
          type: layerType || 'Unknown',
          value: normalizedSeed.toFixed(3),
          unit: '',
          metadata: layer.metadata
        };
    }
  };

  return {
    pixelValues,
    isLoading,
    error,
    fetchPixelValue,
    clearPixelValues
  };
};

export default usePixelValues;