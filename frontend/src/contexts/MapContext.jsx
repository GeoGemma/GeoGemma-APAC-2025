// src/contexts/MapContext.jsx - Complete updated file with layer focus feature
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useAuth } from './AuthContext';
import { getMapLayers, saveMapLayer, deleteMapLayer, clearUserLayers } from '../services/api';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [layers, setLayers] = useState([]);
  const [markers, setMarkers] = useState([]);
  const mapInitializedRef = useRef(false);
  const { currentUser } = useAuth();
  
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

  // Fetch saved layers when user is authenticated
  useEffect(() => {
    const fetchUserLayers = async () => {
      if (currentUser && currentUser.uid) {
        try {
          console.log(`Fetching layers for user ${currentUser.uid}`);
          const response = await getMapLayers(currentUser.uid);
          
          if (response.success && response.data && Array.isArray(response.data)) {
            // Sort by timestamp if available, newest first
            const sortedLayers = [...response.data].sort((a, b) => 
              (b.timestamp || 0) - (a.timestamp || 0)
            );
            
            // Don't replace layers if there are no saved layers
            if (sortedLayers.length > 0) {
              console.log(`Loaded ${sortedLayers.length} layers from Firestore`);
              setLayers(sortedLayers);
              
              // Add each layer to the map if it exists
              if (map) {
                // Clear existing layers first to avoid duplicates
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
                
                // Add the loaded layers to the map (in reverse so newest is on top)
                [...sortedLayers].reverse().forEach(layer => {
                  if (layer.tile_url) {
                    addLayerToMap(map, layer, `ee-source-${layer.id}`, `ee-layer-${layer.id}`, setLayers);
                  }
                });
              }
            }
          } else {
            console.log('No saved layers found or error fetching layers');
          }
        } catch (error) {
          console.error('Error fetching user layers:', error);
        }
      }
    };
    
    fetchUserLayers();
  }, [currentUser, map]);

// Modified initializeMap function in MapContext.jsx with dark theme
const initializeMap = (container) => {
  if (mapInitializedRef.current) return;
  
  // Define a dark style directly inline
  const darkStyle = {
    version: 8,
    name: 'Dark',
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }
    },
    layers: [
      {
        id: 'dark-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  };
  
  const newMap = new maplibregl.Map({
    container,
    style: darkStyle, // Use the dark style defined above
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

  const addLayer = async (layerData) => {
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
      
      // Save layer to Firestore if user is authenticated
      if (currentUser && currentUser.uid) {
        try {
          // Add timestamp for sorting
          const layerWithTimestamp = {
            ...layerData,
            timestamp: Date.now()
          };
          
          await saveMapLayer(currentUser.uid, layerData.id, layerWithTimestamp);
          console.log(`Layer ${layerData.id} saved to Firestore`);
        } catch (error) {
          console.error('Error saving layer to Firestore:', error);
        }
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

  const removeLayer = async (layerId) => {
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
    
    // Remove from Firestore if user is authenticated
    if (currentUser && currentUser.uid) {
      try {
        await deleteMapLayer(currentUser.uid, layerId);
        console.log(`Layer ${layerId} removed from Firestore`);
      } catch (error) {
        console.error('Error removing layer from Firestore:', error);
      }
    }
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
    
    // Clear layers from Firestore if the user is authenticated
    if (currentUser && currentUser.uid) {
      try {
        clearUserLayers(currentUser.uid)
          .then(response => {
            console.log('All layers cleared from Firestore');
          })
          .catch(error => {
            console.error('Error clearing layers from Firestore:', error);
          });
      } catch (error) {
        console.error('Error calling clearUserLayers:', error);
      }
    }
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
      
      // Update in Firestore if user is authenticated
      if (currentUser && currentUser.uid) {
        const updatedLayer = layers.find(layer => layer.id === layerId);
        if (updatedLayer) {
          try {
            saveMapLayer(currentUser.uid, layerId, {
              ...updatedLayer,
              visibility: newVisibility
            });
          } catch (error) {
            console.error('Error updating layer visibility in Firestore:', error);
          }
        }
      }
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
      
      // Update in Firestore if user is authenticated
      if (currentUser && currentUser.uid) {
        const updatedLayer = layers.find(layer => layer.id === layerId);
        if (updatedLayer) {
          try {
            saveMapLayer(currentUser.uid, layerId, {
              ...updatedLayer,
              opacity
            });
          } catch (error) {
            console.error('Error updating layer opacity in Firestore:', error);
          }
        }
      }
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
      metadata: layer.metadata,
      timestamp: layer.timestamp || Date.now()
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
      if (layer.tile_url) {
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
      }
    });
    
    // Update the state with the new order
    setLayers(newLayerOrder);
    
    // Update in Firestore if user is authenticated
    if (currentUser && currentUser.uid) {
      try {
        // This would require a batch update operation
        // For now, we'll just update the UI and skip Firestore update
        console.log("Layers reordered successfully in UI (Firestore batch update not implemented)");
      } catch (error) {
        console.error('Error updating layer order in Firestore:', error);
      }
    }
    
    console.log("Layers reordered successfully");
  };

  // NEW FUNCTION: Focus on a specific layer's output area
  // Helper for zoom level based on processing type
  const getAppropriateZoomLevel = (processingType) => {
    switch (processingType) {
      case 'RGB':
        return 12;
      case 'NDVI':
        return 11;
      case 'SURFACE WATER':
        return 9;
      case 'LULC':
        return 10;
      case 'LST':
        return 9;
      case 'OPEN BUILDINGS':
        return 14;
      default:
        return 10;
    }
  };

  // Updated focusOnLayer function as requested
  const focusOnLayer = (layerId) => {
    if (!map || !layerId) return;
    
    // Find the layer data
    const layer = layers.find(l => l.id === layerId);
    if (!layer) {
      console.error(`Layer with ID ${layerId} not found`);
      return;
    }
    
    try {
      console.log("Focusing on layer with metadata:", layer.metadata);
      
      // First priority: Check for 'GEOMETRY CENTROID' field in the exact format from ee_metadata.py
      if (layer.metadata && layer.metadata['GEOMETRY CENTROID']) {
        const centroidStr = layer.metadata['GEOMETRY CENTROID'];
        console.log("Found centroid string:", centroidStr);
        
        // Parse using regex that matches the exact format: "Lon: X.XXXX, Lat: Y.YYYY"
        const match = centroidStr.match(/Lon:\s*([-\d.]+),\s*Lat:\s*([-\d.]+)/);
        
        if (match && match.length === 3) {
          const lon = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          
          if (!isNaN(lon) && !isNaN(lat)) {
            // Get appropriate zoom level based on layer type
            let zoomLevel = getAppropriateZoomLevel(layer.processing_type);
            
            console.log(`Flying to layer ${layerId} using parsed centroid: Lon=${lon}, Lat=${lat}, Zoom=${zoomLevel}`);
            map.flyTo({
              center: [lon, lat],
              zoom: zoomLevel,
              duration: 1000
            });
            return;
          }
        }
      }
      
      // Second priority: Check for direct coordinates in layer object
      if (layer.latitude !== undefined && layer.longitude !== undefined) {
        const lat = parseFloat(layer.latitude);
        const lon = parseFloat(layer.longitude);
        
        if (!isNaN(lat) && !isNaN(lon)) {
          let zoomLevel = getAppropriateZoomLevel(layer.processing_type);
          
          console.log(`Flying to layer ${layerId} using layer coords: Lon=${lon}, Lat=${lat}, Zoom=${zoomLevel}`);
          map.flyTo({
            center: [lon, lat],
            zoom: zoomLevel,
            duration: 1000
          });
          return;
        }
      }
      
      // Third priority: Check for REQUEST_CENTER coordinates
      if (layer.metadata && layer.metadata.REQUEST_CENTER_LON && layer.metadata.REQUEST_CENTER_LAT) {
        const lon = parseFloat(layer.metadata.REQUEST_CENTER_LON);
        const lat = parseFloat(layer.metadata.REQUEST_CENTER_LAT);
        
        if (!isNaN(lon) && !isNaN(lat)) {
          let zoomLevel = getAppropriateZoomLevel(layer.processing_type);
          
          console.log(`Flying to layer ${layerId} using request center: Lon=${lon}, Lat=${lat}, Zoom=${zoomLevel}`);
          map.flyTo({
            center: [lon, lat],
            zoom: zoomLevel,
            duration: 1000
          });
          return;
        }
      }
      
      console.warn(`Couldn't find usable coordinates for layer ${layerId}`);
      console.log("Available metadata:", layer.metadata);
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