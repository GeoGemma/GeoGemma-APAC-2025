// src/components/Map/FloatingDrawingTools.jsx
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useMap } from '../../contexts/MapContext';
import { 
  Pencil, 
  Square, 
  Circle, 
  Hexagon, 
  Ruler, 
  Trash2, 
  Undo2, 
  RotateCcw,
  Pointer,
  Save,
  Download,
  PencilRuler
} from 'lucide-react';
import '../../styles/drawingTools.css';
import * as turf from '@turf/turf';

const DrawingTools = ({ showNotification }) => {
  const { map } = useMap();
  const [activeMode, setActiveMode] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentFeatures, setCurrentFeatures] = useState([]);
  const [drawHistory, setDrawHistory] = useState([]);
  const [measurementInfo, setMeasurementInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Refs to store current drawing state
  const pointsRef = useRef([]);
  const currentFeatureRef = useRef(null);
  const currentSourceRef = useRef(null);
  const currentLayerRef = useRef(null);
  const popupRef = useRef(null);

  // Draw mode constants
  const DRAW_MODES = {
    POINT: 'point',
    LINE: 'line',
    POLYGON: 'polygon',
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    MEASURE: 'measure',
    SELECT: 'select'
  };

  // Colors for drawing features
  const COLORS = {
    POINT: '#FF5733',
    LINE: '#33A1FF',
    POLYGON: '#33FF57',
    RECTANGLE: '#FF33E9',
    CIRCLE: '#FFCE33',
    MEASURE: '#33FFCE'
  };

  useEffect(() => {
    if (!map) return;

    // Clean up on unmount
    return () => {
      cleanupDrawing();
    };
  }, [map]);

  // Effect for handling active draw mode
  useEffect(() => {
    if (!map) return;

    if (activeMode) {
      // Set cursor style based on mode
      map.getCanvas().style.cursor = 
        activeMode === DRAW_MODES.SELECT ? 'pointer' : 'crosshair';
      
      // Add map event listeners for the active mode
      setupEventListeners();
    } else {
      // Reset cursor and remove event listeners
      map.getCanvas().style.cursor = '';
      removeEventListeners();
    }

    return () => {
      // Clean up event listeners when active mode changes
      removeEventListeners();
    };
  }, [activeMode, map]);

  // Set up event listeners based on active mode
  const setupEventListeners = () => {
    if (!map) return;

    // Remove existing listeners first
    removeEventListeners();

    // Add appropriate listeners based on mode
    if (activeMode === DRAW_MODES.POINT) {
      map.on('click', handlePointClick);
    } else if (activeMode === DRAW_MODES.LINE || activeMode === DRAW_MODES.POLYGON || activeMode === DRAW_MODES.MEASURE) {
      map.on('click', handleLineOrPolygonClick);
      map.on('mousemove', handleMouseMove);
      map.on('dblclick', handleDoubleClick);
    } else if (activeMode === DRAW_MODES.RECTANGLE) {
      map.on('mousedown', handleRectangleStart);
      map.on('mousemove', handleRectangleMove);
      map.on('mouseup', handleRectangleEnd);
    } else if (activeMode === DRAW_MODES.CIRCLE) {
      map.on('mousedown', handleCircleStart);
      map.on('mousemove', handleCircleMove);
      map.on('mouseup', handleCircleEnd);
    } else if (activeMode === DRAW_MODES.SELECT) {
      map.on('click', handleSelect);
    }
  };

  // Remove all event listeners
  const removeEventListeners = () => {
    if (!map) return;

    map.off('click', handlePointClick);
    map.off('click', handleLineOrPolygonClick);
    map.off('mousemove', handleMouseMove);
    map.off('dblclick', handleDoubleClick);
    map.off('mousedown', handleRectangleStart);
    map.off('mousemove', handleRectangleMove);
    map.off('mouseup', handleRectangleEnd);
    map.off('mousedown', handleCircleStart);
    map.off('mousemove', handleCircleMove);
    map.off('mouseup', handleCircleEnd);
    map.off('click', handleSelect);
  };

  // Handle point drawing
  const handlePointClick = (e) => {
    const coordinates = [e.lngLat.lng, e.lngLat.lat];
    addFeature({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates
      },
      properties: {
        drawType: DRAW_MODES.POINT,
        color: COLORS.POINT
      }
    });
    
    showNotification('Point added', 'success');
  };

  // Handle line or polygon drawing - adds points on click
  const handleLineOrPolygonClick = (e) => {
    const coordinates = [e.lngLat.lng, e.lngLat.lat];
    pointsRef.current.push(coordinates);
    
    updateActiveFeature();
  };

  // Update the currently active feature based on collected points
  const updateActiveFeature = () => {
    // If no points, return
    if (pointsRef.current.length === 0) return;
    
    let geometryType = 'LineString';
    let coordinates = [...pointsRef.current];
    let properties = {
      drawType: activeMode,
      color: activeMode === DRAW_MODES.MEASURE ? COLORS.MEASURE : 
            activeMode === DRAW_MODES.POLYGON ? COLORS.POLYGON : COLORS.LINE
    };
    
    // If it's a polygon, close the shape
    if (activeMode === DRAW_MODES.POLYGON && pointsRef.current.length > 2) {
      geometryType = 'Polygon';
      // Create a closed polygon by adding the first point at the end
      coordinates = [[...pointsRef.current, [...pointsRef.current[0]]]];
    }
    
    // For measurement mode, calculate and display distance
    if (activeMode === DRAW_MODES.MEASURE && pointsRef.current.length > 1) {
      let totalDistance = 0;
      for (let i = 1; i < pointsRef.current.length; i++) {
        const from = turf.point(pointsRef.current[i-1]);
        const to = turf.point(pointsRef.current[i]);
        totalDistance += turf.distance(from, to, {units: 'kilometers'});
      }
      
      properties.measurement = totalDistance;
      setMeasurementInfo({
        distance: totalDistance,
        position: pointsRef.current[pointsRef.current.length - 1]
      });
    }
    
    // Create/update the feature
    const feature = {
      type: 'Feature',
      geometry: {
        type: geometryType,
        coordinates
      },
      properties
    };
    
    // Remove existing temporary feature
    cleanupTemporaryFeature();
    
    // Create a new temporary feature
    currentFeatureRef.current = feature;
    addTemporaryFeature(feature);
  };

  // Handle mouse movement for line/polygon/measure tools to show preview
  const handleMouseMove = (e) => {
    if (!isDrawing && pointsRef.current.length > 0) {
      // Create a preview line/polygon that follows the cursor
      const coordinates = [...pointsRef.current, [e.lngLat.lng, e.lngLat.lat]];
      let geometryType = 'LineString';
      let finalCoords = coordinates;
      
      // If it's a polygon with enough points, close the shape in the preview
      if (activeMode === DRAW_MODES.POLYGON && pointsRef.current.length > 1) {
        geometryType = 'Polygon';
        // Create a closed polygon with the moving point
        finalCoords = [[...coordinates, [...pointsRef.current[0]]]];
      }
      
      // For measurement, update the measurement info
      if (activeMode === DRAW_MODES.MEASURE && pointsRef.current.length > 0) {
        let totalDistance = 0;
        for (let i = 1; i < coordinates.length; i++) {
          const from = turf.point(coordinates[i-1]);
          const to = turf.point(coordinates[i]);
          totalDistance += turf.distance(from, to, {units: 'kilometers'});
        }
        
        setMeasurementInfo({
          distance: totalDistance,
          position: [e.lngLat.lng, e.lngLat.lat]
        });
      }
      
      const previewFeature = {
        type: 'Feature',
        geometry: {
          type: geometryType,
          coordinates: finalCoords
        },
        properties: {
          drawType: activeMode,
          isPreview: true,
          color: activeMode === DRAW_MODES.MEASURE ? COLORS.MEASURE : 
                activeMode === DRAW_MODES.POLYGON ? COLORS.POLYGON : COLORS.LINE
        }
      };
      
      // Update the temporary feature
      cleanupTemporaryFeature();
      addTemporaryFeature(previewFeature);
    }
  };

  // Handle double click to complete line/polygon/measure
  const handleDoubleClick = (e) => {
    e.preventDefault(); // Prevent the map from zooming
    
    if (pointsRef.current.length < 2) {
      showNotification('Need at least 2 points to create a shape', 'error');
      return;
    }
    
    // Get the final coordinates
    let geometryType = 'LineString';
    let coordinates = [...pointsRef.current];
    let properties = {
      drawType: activeMode,
      color: activeMode === DRAW_MODES.MEASURE ? COLORS.MEASURE : 
            activeMode === DRAW_MODES.POLYGON ? COLORS.POLYGON : COLORS.LINE
    };
    
    // For polygons, ensure it's closed
    if (activeMode === DRAW_MODES.POLYGON) {
      geometryType = 'Polygon';
      coordinates = [[...coordinates, [...coordinates[0]]]];
    }
    
    // For measurements, calculate the final distance
    if (activeMode === DRAW_MODES.MEASURE) {
      let totalDistance = 0;
      for (let i = 1; i < coordinates.length; i++) {
        const from = turf.point(coordinates[i-1]);
        const to = turf.point(coordinates[i]);
        totalDistance += turf.distance(from, to, {units: 'kilometers'});
      }
      properties.measurement = totalDistance;
      
      // Show a notification with the total distance
      showNotification(`Total distance: ${totalDistance.toFixed(2)} km`, 'info');
    }
    
    // Create the final feature
    const feature = {
      type: 'Feature',
      geometry: {
        type: geometryType,
        coordinates
      },
      properties
    };
    
    // Add it to permanent features
    addFeature(feature);
    
    // Reset drawing state
    pointsRef.current = [];
    setIsDrawing(false);
    setMeasurementInfo(null);
    cleanupTemporaryFeature();
  };

  // Start drawing a rectangle
  const handleRectangleStart = (e) => {
    if (activeMode !== DRAW_MODES.RECTANGLE) return;
    
    setIsDrawing(true);
    pointsRef.current = [[e.lngLat.lng, e.lngLat.lat]];
  };

  // Update rectangle preview during drag
  const handleRectangleMove = (e) => {
    if (activeMode !== DRAW_MODES.RECTANGLE || !isDrawing || pointsRef.current.length === 0) return;
    
    const startPoint = pointsRef.current[0];
    const currentPoint = [e.lngLat.lng, e.lngLat.lat];
    
    // Create a rectangle from the start and current points
    const minX = Math.min(startPoint[0], currentPoint[0]);
    const minY = Math.min(startPoint[1], currentPoint[1]);
    const maxX = Math.max(startPoint[0], currentPoint[0]);
    const maxY = Math.max(startPoint[1], currentPoint[1]);
    
    const coordinates = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
      [minX, minY]
    ];
    
    const rectangleFeature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      },
      properties: {
        drawType: DRAW_MODES.RECTANGLE,
        isPreview: true,
        color: COLORS.RECTANGLE
      }
    };
    
    // Update the temporary feature
    cleanupTemporaryFeature();
    addTemporaryFeature(rectangleFeature);
  };

  // Finalize rectangle on mouse up
  const handleRectangleEnd = (e) => {
    if (activeMode !== DRAW_MODES.RECTANGLE || !isDrawing || pointsRef.current.length === 0) return;
    
    const startPoint = pointsRef.current[0];
    const currentPoint = [e.lngLat.lng, e.lngLat.lat];
    
    // Skip if the rectangle is too small (likely an accidental click)
    if (Math.abs(startPoint[0] - currentPoint[0]) < 0.0001 && 
        Math.abs(startPoint[1] - currentPoint[1]) < 0.0001) {
      setIsDrawing(false);
      pointsRef.current = [];
      cleanupTemporaryFeature();
      return;
    }
    
    // Create a rectangle from the start and current points
    const minX = Math.min(startPoint[0], currentPoint[0]);
    const minY = Math.min(startPoint[1], currentPoint[1]);
    const maxX = Math.max(startPoint[0], currentPoint[0]);
    const maxY = Math.max(startPoint[1], currentPoint[1]);
    
    const coordinates = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
      [minX, minY]
    ];
    
    const rectangleFeature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      },
      properties: {
        drawType: DRAW_MODES.RECTANGLE,
        color: COLORS.RECTANGLE
      }
    };
    
    // Add the feature to permanent features
    addFeature(rectangleFeature);
    
    // Reset drawing state
    setIsDrawing(false);
    pointsRef.current = [];
    cleanupTemporaryFeature();
  };

  // Start drawing a circle
  const handleCircleStart = (e) => {
    if (activeMode !== DRAW_MODES.CIRCLE) return;
    
    setIsDrawing(true);
    pointsRef.current = [[e.lngLat.lng, e.lngLat.lat]];
  };

  // Update circle preview during drag
  const handleCircleMove = (e) => {
    if (activeMode !== DRAW_MODES.CIRCLE || !isDrawing || pointsRef.current.length === 0) return;
    
    const center = pointsRef.current[0];
    const currentPoint = [e.lngLat.lng, e.lngLat.lat];
    
    // Calculate radius in kilometers
    const centerPoint = turf.point(center);
    const currentTurfPoint = turf.point(currentPoint);
    const radius = turf.distance(centerPoint, currentTurfPoint, {units: 'kilometers'});
    
    // Convert center to a turf point
    const turfCenter = turf.point(center);
    // Create a circle using turf with the calculated radius
    const turfCircle = turf.circle(turfCenter, radius, {steps: 64});
    
    const circleFeature = {
      ...turfCircle,
      properties: {
        ...turfCircle.properties,
        drawType: DRAW_MODES.CIRCLE,
        isPreview: true,
        color: COLORS.CIRCLE,
        radius: radius
      }
    };
    
    // Update the temporary feature
    cleanupTemporaryFeature();
    addTemporaryFeature(circleFeature);
  };

  // Finalize circle on mouse up
  const handleCircleEnd = (e) => {
    if (activeMode !== DRAW_MODES.CIRCLE || !isDrawing || pointsRef.current.length === 0) return;
    
    const center = pointsRef.current[0];
    const currentPoint = [e.lngLat.lng, e.lngLat.lat];
    
    // Calculate radius in kilometers
    const centerPoint = turf.point(center);
    const currentTurfPoint = turf.point(currentPoint);
    const radius = turf.distance(centerPoint, currentTurfPoint, {units: 'kilometers'});
    
    // Skip if the circle is too small (likely an accidental click)
    if (radius < 0.01) {
      setIsDrawing(false);
      pointsRef.current = [];
      cleanupTemporaryFeature();
      return;
    }
    
    // Convert center to a turf point
    const turfCenter = turf.point(center);
    // Create a circle using turf with the calculated radius
    const turfCircle = turf.circle(turfCenter, radius, {steps: 64});
    
    const circleFeature = {
      ...turfCircle,
      properties: {
        ...turfCircle.properties,
        drawType: DRAW_MODES.CIRCLE,
        color: COLORS.CIRCLE,
        radius: radius,
        center: center
      }
    };
    
    // Add the feature to permanent features
    addFeature(circleFeature);
    
    // Show notification with circle info
    showNotification(`Circle created with radius: ${radius.toFixed(2)} km`, 'success');
    
    // Reset drawing state
    setIsDrawing(false);
    pointsRef.current = [];
    cleanupTemporaryFeature();
  };

  // Handle selecting features
  const handleSelect = (e) => {
    // Implement selection logic
    showNotification('Selection feature coming soon!', 'info');
  };

  // Add a feature to the map
  const addFeature = (feature) => {
    const featureId = Date.now().toString();
    feature.id = featureId;
    
    // Add to features state
    setCurrentFeatures(prev => [...prev, feature]);
    setDrawHistory(prev => [...prev, feature]);
    
    renderFeatures([...currentFeatures, feature]);
  };

  // Add a temporary feature to the map (for previewing)
  const addTemporaryFeature = (feature) => {
    const sourceId = 'temp-source';
    const layerId = 'temp-layer';
    
    // Store refs for cleanup
    currentFeatureRef.current = feature;
    currentSourceRef.current = sourceId;
    currentLayerRef.current = layerId;
    
    // Add source and layer if they don't exist
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [feature]
        }
      });
    } else {
      map.getSource(sourceId).setData({
        type: 'FeatureCollection',
        features: [feature]
      });
    }
    
    // Add layer if it doesn't exist
    if (!map.getLayer(layerId)) {
      // Determine the layer type based on geometry type
      if (feature.geometry.type === 'Point') {
        map.addLayer({
          id: layerId,
          source: sourceId,
          type: 'circle',
          paint: {
            'circle-radius': 6,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      } else if (feature.geometry.type === 'LineString') {
        map.addLayer({
          id: layerId,
          source: sourceId,
          type: 'line',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 3,
            'line-dasharray': [1, 1]
          }
        });
      } else if (feature.geometry.type === 'Polygon') {
        map.addLayer({
          id: layerId,
          source: sourceId,
          type: 'fill',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.3,
            'fill-outline-color': ['get', 'color']
          }
        });
        
        // Add an outline layer
        map.addLayer({
          id: `${layerId}-outline`,
          source: sourceId,
          type: 'line',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2
          }
        });
      }
    }
  };

  // Cleanup temporary feature
  const cleanupTemporaryFeature = () => {
    if (!map) return;
    
    const layerId = currentLayerRef.current;
    const sourceId = currentSourceRef.current;
    
    if (map.getLayer(`${layerId}-outline`)) {
      map.removeLayer(`${layerId}-outline`);
    }
    
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
    
    currentFeatureRef.current = null;
  };

  // Render all features
  const renderFeatures = (features) => {
    if (!map) return;
    
    // Remove existing layers and sources
    if (map.getLayer('draw-layer-points')) map.removeLayer('draw-layer-points');
    if (map.getLayer('draw-layer-lines')) map.removeLayer('draw-layer-lines');
    if (map.getLayer('draw-layer-polygons-fill')) map.removeLayer('draw-layer-polygons-fill');
    if (map.getLayer('draw-layer-polygons-outline')) map.removeLayer('draw-layer-polygons-outline');
    if (map.getSource('draw-source')) map.removeSource('draw-source');
    
    if (features.length === 0) return;
    
    // Create collections for each geometry type
    const pointFeatures = [];
    const lineFeatures = [];
    const polygonFeatures = [];
    
    features.forEach(feature => {
      if (feature.geometry.type === 'Point') {
        pointFeatures.push(feature);
      } else if (feature.geometry.type === 'LineString') {
        lineFeatures.push(feature);
      } else if (feature.geometry.type === 'Polygon') {
        polygonFeatures.push(feature);
      }
    });
    
    // Add source
    map.addSource('draw-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features
      }
    });
    
    // Add layers for each geometry type
    if (pointFeatures.length > 0) {
      map.addLayer({
        id: 'draw-layer-points',
        source: 'draw-source',
        type: 'circle',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }
    
    if (lineFeatures.length > 0) {
      map.addLayer({
        id: 'draw-layer-lines',
        source: 'draw-source',
        type: 'line',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3
        }
      });
    }
    
    if (polygonFeatures.length > 0) {
      map.addLayer({
        id: 'draw-layer-polygons-fill',
        source: 'draw-source',
        type: 'fill',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.3
        }
      });
      
      map.addLayer({
        id: 'draw-layer-polygons-outline',
        source: 'draw-source',
        type: 'line',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2
        }
      });
    }
  };

  // Delete all features
  const handleClearAll = () => {
    if (currentFeatures.length === 0) {
      showNotification('No features to clear', 'info');
      return;
    }
    
    setCurrentFeatures([]);
    setDrawHistory([]);
    setMeasurementInfo(null);
    pointsRef.current = [];
    
    if (map) {
      if (map.getLayer('draw-layer-points')) map.removeLayer('draw-layer-points');
      if (map.getLayer('draw-layer-lines')) map.removeLayer('draw-layer-lines');
      if (map.getLayer('draw-layer-polygons-fill')) map.removeLayer('draw-layer-polygons-fill');
      if (map.getLayer('draw-layer-polygons-outline')) map.removeLayer('draw-layer-polygons-outline');
      if (map.getSource('draw-source')) map.removeSource('draw-source');
    }
    
    showNotification('All features cleared', 'success');
  };

  // Undo last action
  const handleUndo = () => {
    if (drawHistory.length === 0) {
      showNotification('Nothing to undo', 'info');
      return;
    }
    
    // Remove the last feature from history
    const newHistory = [...drawHistory.slice(0, -1)];
    setDrawHistory(newHistory);
    setCurrentFeatures(newHistory);
    
    // Redraw features
    renderFeatures(newHistory);
    
    showNotification('Last action undone', 'success');
  };

  // Cancel current drawing
  const handleCancel = () => {
    pointsRef.current = [];
    setIsDrawing(false);
    setMeasurementInfo(null);
    cleanupTemporaryFeature();
    
    showNotification('Drawing cancelled', 'info');
  };

  // Export features as GeoJSON
  const handleExport = () => {
    if (currentFeatures.length === 0) {
      showNotification('No features to export', 'warning');
      return;
    }
    
    const geojson = {
      type: 'FeatureCollection',
      features: currentFeatures
    };
    
    const json = JSON.stringify(geojson, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'geogemma_features.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Features exported as GeoJSON', 'success');
  };

  // Clean up all drawing resources
  const cleanupDrawing = () => {
    if (!map) return;
    
    // Remove temporary features
    cleanupTemporaryFeature();
    
    // Remove permanent features
    if (map.getLayer('draw-layer-points')) map.removeLayer('draw-layer-points');
    if (map.getLayer('draw-layer-lines')) map.removeLayer('draw-layer-lines');
    if (map.getLayer('draw-layer-polygons-fill')) map.removeLayer('draw-layer-polygons-fill');
    if (map.getLayer('draw-layer-polygons-outline')) map.removeLayer('draw-layer-polygons-outline');
    if (map.getSource('draw-source')) map.removeSource('draw-source');
    
    // Remove event listeners
    removeEventListeners();
    
    // Reset state
    pointsRef.current = [];
    setActiveMode(null);
    setIsDrawing(false);
    setMeasurementInfo(null);
  };

  // Set the active drawing mode
  const setMode = (mode) => {
    if (activeMode === mode) {
      // Toggle off if already active
      setActiveMode(null);
      map.getCanvas().style.cursor = '';
    } else {
      setActiveMode(mode);
      // Reset drawing state when switching modes
      pointsRef.current = [];
      setIsDrawing(false);
      setMeasurementInfo(null);
      cleanupTemporaryFeature();
    }
  };

  // Toggle the expanded state of the toolbar
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`floating-drawing-tools ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Main toggle button */}
      <button 
        className="floating-tools-toggle"
        onClick={toggleExpanded}
        title={isExpanded ? "Collapse drawing tools" : "Expand drawing tools"}
      >
        <PencilRuler size={18} />
      </button>
      
      {/* Tools panel - visible when expanded */}
      {isExpanded && (
        <div className="floating-tools-panel">
          <div className="floating-tools-row">
            <button
              className={`floating-tool-btn ${activeMode === DRAW_MODES.POINT ? 'active' : ''}`}
              onClick={() => setMode(DRAW_MODES.POINT)}
              title="Draw Point"
            >
              <Pencil size={16} />
            </button>
            <button
              className={`floating-tool-btn ${activeMode === DRAW_MODES.LINE ? 'active' : ''}`}
              onClick={() => setMode(DRAW_MODES.LINE)}
              title="Draw Line"
            >
              <Ruler size={16} />
            </button>
            <button
              className={`floating-tool-btn ${activeMode === DRAW_MODES.POLYGON ? 'active' : ''}`}
              onClick={() => setMode(DRAW_MODES.POLYGON)}
              title="Draw Polygon"
            >
              <Hexagon size={16} />
            </button>
            <button
              className={`floating-tool-btn ${activeMode === DRAW_MODES.RECTANGLE ? 'active' : ''}`}
              onClick={() => setMode(DRAW_MODES.RECTANGLE)}
              title="Draw Rectangle"
            >
              <Square size={16} />
            </button>
          </div>
          
          <div className="floating-tools-row">
            <button
              className={`floating-tool-btn ${activeMode === DRAW_MODES.CIRCLE ? 'active' : ''}`}
              onClick={() => setMode(DRAW_MODES.CIRCLE)}
              title="Draw Circle"
            >
              <Circle size={16} />
            </button>
            <button
              className={`floating-tool-btn ${activeMode === DRAW_MODES.MEASURE ? 'active' : ''}`}
              onClick={() => setMode(DRAW_MODES.MEASURE)}
              title="Measure Distance"
            >
              <Ruler size={16} />
            </button>
            <button
              className="floating-tool-btn"
              onClick={handleUndo}
              title="Undo Last Action"
              disabled={drawHistory.length === 0}
            >
              <Undo2 size={16} />
            </button>
          </div>
          
          <div className="floating-tools-row">
            <button
              className="floating-tool-btn"
              onClick={handleClearAll}
              title="Clear All Features"
              disabled={currentFeatures.length === 0}
            >
              <Trash2 size={16} />
            </button>
            <button
              className="floating-tool-btn"
              onClick={handleCancel}
              title="Cancel Current Drawing"
              disabled={!isDrawing && pointsRef.current.length === 0}
            >
              <RotateCcw size={16} />
            </button>
            <button
              className="floating-tool-btn"
              onClick={handleExport}
              title="Export as GeoJSON"
              disabled={currentFeatures.length === 0}
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Measurement info popup */}
      {measurementInfo && (
        <div className="measurement-popup">
          <span>{measurementInfo.distance.toFixed(2)} km</span>
        </div>
      )}
    </div>
  );
};

DrawingTools.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default DrawingTools;