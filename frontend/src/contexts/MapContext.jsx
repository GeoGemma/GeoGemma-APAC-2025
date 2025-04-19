// src/contexts/MapContext.jsx - Enhanced to better support the dynamic legend
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
  // Now accepts the map as a parameter
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
      
      // Update state with new layer - putting most recent layer at the top of the array
      setLayersFn(prev => {
        // Remove any existing layer with same id
        const filtered = prev.filter(layer => layer.id !== layerData.id);
        // Add new layer at the end of the array (top of the stack)
        return [...filtered, layerData];
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