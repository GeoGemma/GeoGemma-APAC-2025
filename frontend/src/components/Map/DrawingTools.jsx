import React, { useEffect, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Pencil,
  MapPin,
  Circle,
  Square,
  Hexagon,
  Type,
  X,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { saveCustomArea } from '../../services/api';
import '../../styles/drawing.css';

// Helper to calculate area of a feature
const calculateArea = (feature) => {
  if (!feature) return "0 sq km";
  
  // For a real implementation, we would use turf.js to calculate the area
  // This is a simplified example
  if (feature.geometry.type === 'Polygon') {
    // Simulate area calculation
    const coords = feature.geometry.coordinates[0];
    if (!coords || coords.length < 3) return "0 sq km";
    
    // Simple approximation - in a real app we'd use proper spherical geometry
    const estimatedArea = Math.random() * 10 + 1; // Random area between 1-11 sq km
    return `${estimatedArea.toFixed(2)} sq km`;
  } 
  else if (feature.properties && feature.properties.radius) {
    // For circles
    const radius = feature.properties.radius / 1000; // Convert to km
    const area = Math.PI * radius * radius;
    return `${area.toFixed(2)} sq km`;
  }
  
  return "0 sq km";
};

// Helper function to convert map click to GeoJSON feature
const createFeatureFromClick = (lngLat, type) => {
  if (type === 'draw_point') {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [lngLat.lng, lngLat.lat]
      }
    };
  } else if (type === 'draw_circle') {
    // Simulate a circle (GeoJSON doesn't natively support circles)
    return {
      type: 'Feature',
      properties: { radius: 1000 }, // 1km radius
      geometry: {
        type: 'Point',
        coordinates: [lngLat.lng, lngLat.lat]
      }
    };
  } else if (type === 'draw_rectangle') {
    // Create a rectangular polygon around the point
    const offset = 0.01;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lngLat.lng - offset, lngLat.lat - offset],
          [lngLat.lng + offset, lngLat.lat - offset],
          [lngLat.lng + offset, lngLat.lat + offset],
          [lngLat.lng - offset, lngLat.lat + offset],
          [lngLat.lng - offset, lngLat.lat - offset] // close the polygon
        ]]
      }
    };
  } else if (type === 'draw_polygon') {
    // Create a triangular polygon
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lngLat.lng, lngLat.lat],
          [lngLat.lng + 0.01, lngLat.lat + 0.01],
          [lngLat.lng + 0.01, lngLat.lat - 0.01],
          [lngLat.lng, lngLat.lat] // close the polygon
        ]]
      }
    };
  }
  
  return null;
};

const DrawingTools = ({ showNotification: propShowNotification }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [drawMode, setDrawMode] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [drawedFeature, setDrawedFeature] = useState(null);
  const [areaName, setAreaName] = useState('');
  const drawingPanelRef = useRef(null);
  const notificationTimeout = useRef(null);
  const { map } = useMap();
  const mapClickHandlerRef = useRef(null);
  
  // Initialize the drawing tools
  useEffect(() => {
    if (!map) return;
    
    // Define the map click handler
    const handleMapClick = (e) => {
      if (!drawMode) return;
      
      // Create feature from click
      const feature = createFeatureFromClick(e.lngLat, drawMode);
      
      if (feature) {
        setDrawedFeature(feature);
        setDrawMode(null); // Reset draw mode after feature is created
        
        // Show success message
        showNotificationMessage('success', 'Area drawn! Please give it a name');
      }
    };
    
    // Store the handler reference
    mapClickHandlerRef.current = handleMapClick;
    
    // Add click event listener
    if (drawMode) {
      map.on('click', handleMapClick);
    }
    
    return () => {
      // Cleanup click handler
      if (map && mapClickHandlerRef.current) {
        map.off('click', mapClickHandlerRef.current);
      }
    };
  }, [map, drawMode]);

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawingPanelRef.current && !drawingPanelRef.current.contains(event.target) && 
          !event.target.closest('.drawing-tools-toggle')) {
        if (isOpen && !drawMode) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, drawMode]);
  
  const toggleDrawingTools = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleDrawingMode = useCallback((mode) => {
    if (drawMode === mode) {
      // Turn off the current draw mode
      setDrawMode(null);
      // Remove click handler
      if (map && mapClickHandlerRef.current) {
        map.off('click', mapClickHandlerRef.current);
      }
    } else {
      // Turn off previous mode if any
      if (map && mapClickHandlerRef.current && drawMode) {
        map.off('click', mapClickHandlerRef.current);
      }
      
      // Turn on new draw mode
      setDrawMode(mode);
      setDrawedFeature(null);
      
      // Add click handler for new mode
      if (map && mapClickHandlerRef.current) {
        map.on('click', mapClickHandlerRef.current);
      }
    }
  }, [drawMode, map]);
  
  // Show notification with auto-dismiss
  const showNotificationMessage = useCallback((type, message) => {
    if (propShowNotification) {
      propShowNotification(message, type);
    } else {
      setNotification({ type, message });
      setShowNotification(true);
      
      if (notificationTimeout.current) {
        clearTimeout(notificationTimeout.current);
      }
      
      notificationTimeout.current = setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    }
  }, [propShowNotification]);

  const handleSaveArea = useCallback(() => {
    if (!drawedFeature) {
      showNotificationMessage('error', 'Please draw an area first');
      return;
    }

    if (!areaName.trim()) {
      showNotificationMessage('error', 'Please provide a name for this area');
      return;
    }

    const areaData = {
      name: areaName,
      geometry: drawedFeature.geometry,
      properties: { ...drawedFeature.properties, name: areaName },
      area: calculateArea(drawedFeature)
    };

    // In a real implementation, we would save this to the backend
    saveCustomArea(areaData)
      .then(() => {
        showNotificationMessage('success', 'Area saved successfully!');
        
        // Reset after saving
        setAreaName('');
        setDrawedFeature(null);
      })
      .catch(error => {
        showNotificationMessage('error', 'Failed to save area');
        console.error("Error saving area:", error);
      });
  }, [drawedFeature, areaName, showNotificationMessage]);

  const handleClearDrawing = useCallback(() => {
    setDrawedFeature(null);
    setAreaName('');
    setDrawMode(null);
    showNotificationMessage('info', 'Drawing cleared');
  }, [showNotificationMessage]);

  return (
    <div className="drawing-tools-container">
      {isOpen && (
        <div className="drawing-tools-panel" ref={drawingPanelRef}>
          <h4 className="drawing-panel-title">Drawing Tools</h4>
          <div className="drawing-tools-buttons">
            <button
              className={`drawing-tool-button ${drawMode === 'draw_point' ? 'active' : ''}`}
              onClick={() => handleDrawingMode('draw_point')}
              title="Place a point"
            >
              <MapPin size={20} />
              <span className="drawing-button-label">Point</span>
            </button>
            <button
              className={`drawing-tool-button ${drawMode === 'draw_polygon' ? 'active' : ''}`}
              onClick={() => handleDrawingMode('draw_polygon')}
              title="Draw a polygon"
            >
              <Pencil size={20} />
              <span className="drawing-button-label">Polygon</span>
            </button>
            <button
              className={`drawing-tool-button ${drawMode === 'draw_circle' ? 'active' : ''}`}
              onClick={() => handleDrawingMode('draw_circle')}
              title="Draw a circle"
            >
              <Circle size={20} />
              <span className="drawing-button-label">Circle</span>
            </button>
            <button
              className={`drawing-tool-button ${drawMode === 'draw_rectangle' ? 'active' : ''}`}
              onClick={() => handleDrawingMode('draw_rectangle')}
              title="Draw a rectangle"
            >
              <Square size={20} />
              <span className="drawing-button-label">Rectangle</span>
            </button>
          </div>
          
          {drawedFeature && (
            <div className="area-info fade-in">
              <div className="area-details">
                <p>Area: {calculateArea(drawedFeature)}</p>
              </div>
            </div>
          )}
          
          <div className="drawing-save-container">
            <input
              type="text"
              className="drawing-area-name-input"
              placeholder="Enter area name"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
            />
            <button 
              className="drawing-save-button"
              onClick={handleSaveArea}
              disabled={!drawedFeature || !areaName.trim()}
            >
              <Save size={16} />
              Save
            </button>
          </div>
          
          <button
            className="drawing-clear-button"
            onClick={handleClearDrawing}
            disabled={!drawedFeature}
          >
            <Trash2 size={16} />
            Clear Drawing
          </button>
        </div>
      )}
      
      {showNotification && !propShowNotification && (
        <div className={`drawing-notification ${notification.type} slide-up`}>
          {notification.type === 'error' && <AlertCircle size={18} />}
          {notification.type === 'success' && <CheckCircle2 size={18} />}
          {notification.type === 'info' && <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}
      
      <button
        className={`drawing-tools-toggle ${isOpen ? 'active' : ''} ${!isOpen && !drawMode ? 'animate-pulse-subtle' : ''}`}
        onClick={toggleDrawingTools}
        title={isOpen ? "Close drawing tools" : "Open drawing tools"}
      >
        {isOpen ? <X size={20} /> : <Pencil size={20} />}
      </button>
    </div>
  );
};

DrawingTools.propTypes = {
  showNotification: PropTypes.func
};

export default DrawingTools;