// src/contexts/MapContext.jsx - Complete updated file with layer focus feature
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [layers, setLayers] = useState([]);
  const [markers, setMarkers] = useState([]);
  const mapInitializedRef = useRef(false);
  
  // Store map position
  const [mapState, setMapState] = useState({
    center: [0, 0],
    zoom: 2,
    lastGeocodedLocation: null,
    lastGeocodedCoords: null,
  });

  useEffect(() => {
    return () => {
      // Cleanup map on unmount
      if (map) map.remove();
    };
  }, [map]);

  const initializeMap = (container) => {
    if (mapInitializedRef.current) return;
    
    const newMap = new maplibregl.Map({
      container,
      style: 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json',
      center: mapState.center,
      zoom: mapState.zoom,
      attributionControl: false
    });

    // Add map controls
    newMap.addControl(new maplibregl.AttributionControl({ compact: true }));
    newMap.addControl(new maplibregl.NavigationControl(), 'top-left');
    newMap.addControl(new maplibregl.FullscreenControl());
    newMap.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }));
    newMap.addControl(new maplibregl.ScaleControl());

    newMap.on('load', () => {
      // Store map position on movement
      newMap.on('moveend', () => {
        setMapState(prev => ({
          ...prev,
          center: newMap.getCenter().toArray(),
          zoom: newMap.getZoom()
        }));
      });
    });

    setMap(newMap);
    mapInitializedRef.current = true;
  };

  const addLayer = (layerData) => {
    if (!map) {
      console.error("Map is not initialized yet");
      return;
    }
    
    console.log("Adding layer:", layerData);
    
    const sourceId = `ee-source-${layerData.id}`;
    const layerId = `ee-layer-${layerData.id}`;
  
    try {
      // Remove existing layer/source if they exist
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
  
      // Ensure the map is completely loaded before adding layers
      if (!map.loaded()) {
        console.log("Map not fully loaded, waiting...");
        map.once('load', () => {
          // Pass the map instance explicitly
          addLayerToMap(map, layerData, sourceId, layerId, setLayers);
        });
      } else {
        // Pass the map instance explicitly
        addLayerToMap(map, layerData, sourceId, layerId, setLayers);
      }
    } catch (error) {
      console.error("Error in addLayer:", error);
    }
  };
  
  // Helper function to actually add the layer to the map
  const addLayerToMap = (mapInstance, layerData, sourceId, layerId, setLayersFn) => {
    try {
      console.log(`Adding source: ${sourceId} with URL: ${layerData.tile_url}`);
      
      // Add the source for the layer
      mapInstance.addSource(sourceId, {
        'type': 'raster',
        'tiles': [layerData.tile_url],
        'tileSize': 256
      });
      
      console.log(`Adding layer: ${layerId}`);
      
      // Add the layer
      mapInstance.addLayer({
        'id': layerId,
        'type': 'raster',
        'source': sourceId,
        'paint': {
          'raster-opacity': layerData.opacity || 0.8
        },
        'layout': {
          'visibility': layerData.visibility || 'visible'
        }
      });
      
      console.log(`Layer added successfully: ${layerId}`);
      
      // Update state with new layer - putting most recent layer at the TOP of the array
      setLayersFn(prev => {
        // Remove any existing layer with same id
        const filtered = prev.filter(layer => layer.id !== layerData.id);
        // Add new layer at the beginning of the array (top of the stack)
        return [layerData, ...filtered];
      });
    } catch (error) {
      console.error(`Error adding layer ${layerId} to map:`, error);
    }
  };

  const removeLayer = (layerId) => {
    if (!map) return;
    
    const mapLayerId = `ee-layer-${layerId}`;
    const mapSourceId = `ee-source-${layerId}`;

    if (map.getLayer(mapLayerId)) {
      map.removeLayer(mapLayerId);
    }
    
    if (map.getSource(mapSourceId)) {
      map.removeSource(mapSourceId);
    }

    setLayers(prev => prev.filter(layer => layer.id !== layerId));
  };

  const clearLayers = () => {
    if (!map) return;
    
    // Remove all layers from the map
    layers.forEach(layer => {
      const layerId = `ee-layer-${layer.id}`;
      const sourceId = `ee-source-${layer.id}`;
      
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    setLayers([]);
    clearMarkers();
  };

  const toggleLayerVisibility = (layerId) => {
    if (!map) return;
    
    const mapLayerId = `ee-layer-${layerId}`;
    
    if (map.getLayer(mapLayerId)) {
      const currentVisibility = map.getLayoutProperty(mapLayerId, 'visibility');
      const newVisibility = currentVisibility === 'visible' ? 'none' : 'visible';
      
      map.setLayoutProperty(mapLayerId, 'visibility', newVisibility);
      
      setLayers(prev => prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, visibility: newVisibility } 
          : layer
      ));
    }
  };

  const setLayerOpacity = (layerId, opacity) => {
    if (!map) return;
    
    const mapLayerId = `ee-layer-${layerId}`;
    
    if (map.getLayer(mapLayerId)) {
      map.setPaintProperty(mapLayerId, 'raster-opacity', opacity);
      
      setLayers(prev => prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, opacity } 
          : layer
      ));
    }
  };
  
  // Function to reorder layers - Completely rewritten to fix the issue
  const reorderLayers = (newLayerOrder) => {
    if (!map) return;
    
    // First, save all the layer data
    const layerData = newLayerOrder.map(layer => ({
      id: layer.id,
      tile_url: layer.tile_url,
      opacity: layer.opacity || 0.8,
      visibility: layer.visibility || 'visible',
      location: layer.location,
      processing_type: layer.processing_type,
      latitude: layer.latitude,
      longitude: layer.longitude,
      metadata: layer.metadata
    }));
    
    // Remove all layers and sources from the map
    layers.forEach(layer => {
      const mapLayerId = `ee-layer-${layer.id}`;
      const mapSourceId = `ee-source-${layer.id}`;
      
      if (map.getLayer(mapLayerId)) {
        map.removeLayer(mapLayerId);
      }
      
      if (map.getSource(mapSourceId)) {
        map.removeSource(mapSourceId);
      }
    });
    
    // Now add layers back to the map in REVERSE order of the UI list
    // This is because in MapLibre, the last added layer appears on top
    // We want the first layer in our UI list to be visually on top
    [...layerData].reverse().forEach(layer => {
      const sourceId = `ee-source-${layer.id}`;
      const layerId = `ee-layer-${layer.id}`;
      
      // Add the source
      map.addSource(sourceId, {
        'type': 'raster',
        'tiles': [layer.tile_url],
        'tileSize': 256
      });
      
      // Add the layer
      map.addLayer({
        'id': layerId,
        'type': 'raster',
        'source': sourceId,
        'paint': {
          'raster-opacity': layer.opacity
        },
        'layout': {
          'visibility': layer.visibility
        }
      });
    });
    
    // Update the state with the new order
    setLayers(newLayerOrder);
    
    console.log("Layers reordered successfully");
  };

  // NEW FUNCTION: Focus on a specific layer's output area
  const focusOnLayer = (layerId) => {
    if (!map || !layerId) return;
    
    // Find the layer data
    const layer = layers.find(l => l.id === layerId);
    if (!layer) {
      console.error(`Layer with ID ${layerId} not found`);
      return;
    }
    
    try {
      // If the layer has a defined bounding box in its metadata, use that
      if (layer.metadata && (
          (layer.metadata.BOUNDING_BOX) || 
          (layer.metadata.bounding_box) ||
          (layer.metadata.GEOMETRY_BOUNDS) ||
          (layer.metadata.geometry_bounds)
        )) {
        // Get bounds from metadata
        const bounds = layer.metadata.BOUNDING_BOX || 
                      layer.metadata.bounding_box || 
                      layer.metadata.GEOMETRY_BOUNDS || 
                      layer.metadata.geometry_bounds;
        
        if (bounds && Array.isArray(bounds) && bounds.length === 4) {
          // Format: [west, south, east, north]
          map.fitBounds([
            [bounds[0], bounds[1]], // Southwest
            [bounds[2], bounds[3]]  // Northeast
          ], { 
            padding: 50,
            duration: 1000
          });
          return;
        }
      }
      
      // If no explicit bounds found, try to use the geometry centroid from metadata
      if (layer.metadata && layer.metadata.GEOMETRY_CENTROID) {
        const centroidStr = layer.metadata.GEOMETRY_CENTROID;
        const match = centroidStr.match(/Lon: ([-\d.]+), Lat: ([-\d.]+)/);
        
        if (match && match.length === 3) {
          const lon = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          
          // Just center on the point, but with an appropriately zoomed view
          map.flyTo({
            center: [lon, lat],
            zoom: 10,
            duration: 1000
          });
          return;
        }
      }
      
      // Fallback to the layer's stored coordinates
      if (layer.latitude !== undefined && layer.longitude !== undefined) {
        // Calculate a reasonable bounding box around the point based on the processing type
        // Different processing types might need different zoom levels
        let zoomLevel = 10; // Default zoom level
        
        // Adjust zoom level based on layer type
        switch(layer.processing_type) {
          case 'RGB':
            zoomLevel = 12; // Closer zoom for RGB imagery
            break;
          case 'NDVI':
            zoomLevel = 11;
            break;
          case 'SURFACE WATER':
            zoomLevel = 9; // Wider view for water features
            break;
          case 'LULC':
            zoomLevel = 10;
            break;
          case 'LST':
            zoomLevel = 9; // Land surface temperature tends to be viewed over larger areas
            break;
          case 'OPEN BUILDINGS':
            zoomLevel = 14; // Closer zoom for building details
            break;
          default:
            zoomLevel = 10;
        }
        
        map.flyTo({
          center: [layer.longitude, layer.latitude],
          zoom: zoomLevel,
          duration: 1500
        });
      } else {
        console.warn(`Layer ${layerId} has no coordinate or boundary information`);
      }
    } catch (error) {
      console.error(`Error focusing on layer ${layerId}:`, error);
    }
  };

  const addMarker = (lat, lon) => {
    if (!map) return;
    
    // Clear existing markers
    clearMarkers();
    
    // Add new marker
    const newMarker = new maplibregl.Marker()
      .setLngLat([lon, lat])
      .addTo(map);
    
    setMarkers([newMarker]);
  };

  const clearMarkers = () => {
    // Remove all existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);
  };

  const flyToLocation = (location, lat, lon, zoom = 10) => {
    if (!map) return;
    
    // Set default zoom level if not already at a good zoom level
    const targetZoom = mapState.zoom < 8 ? zoom : mapState.zoom;
    
    map.flyTo({
      center: [lon, lat],
      zoom: targetZoom,
      duration: 2000
    });
    
    // Update stored coordinates for this location
    setMapState(prev => ({
      ...prev,
      lastGeocodedLocation: location,
      lastGeocodedCoords: [lat, lon]
    }));
  };

  const value = {
    map,
    initializeMap,
    layers,
    addLayer,
    removeLayer,
    clearLayers,
    toggleLayerVisibility,
    setLayerOpacity,
    reorderLayers,
    focusOnLayer, // Added the new function
    addMarker,
    clearMarkers,
    flyToLocation,
    mapState
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
}