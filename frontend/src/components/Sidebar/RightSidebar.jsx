// src/components/Sidebar/RightSidebar.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Ruler, 
  Info, 
  Trash2, 
  Eye, 
  EyeOff,
  Maximize,
  Link
} from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import MeasureToolControl from '../Map/MeasureToolControl';
import { clearLayers as clearLayersApi, deleteLayer as deleteLayerApi } from '../../services/api';
import './RightSidebar.css';

const RightSidebar = ({ showNotification }) => {
  // Changed default to false (closed by default)
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('layers'); // Default to layers
  const { layers, toggleLayerVisibility, removeLayer, setLayerOpacity, clearLayers } = useMap();

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
    
    // Auto-expand sidebar when section is selected
    if (!isExpanded && section) {
      setIsExpanded(true);
    }
  };

  const handleToggleVisibility = (e, layerId) => {
    e.stopPropagation();
    toggleLayerVisibility(layerId);
  };

  const handleDeleteLayer = async (e, layerId) => {
    e.stopPropagation();
    try {
      await deleteLayerApi(layerId);
      removeLayer(layerId);
      showNotification('Layer removed', 'success');
    } catch (error) {
      showNotification('Error removing layer', 'error');
    }
  };

  const handleOpacityChange = (layerId, opacity) => {
    setLayerOpacity(layerId, opacity);
  };

  const handleClearLayers = async () => {
    try {
      await clearLayersApi();
      clearLayers();
      showNotification('All layers cleared successfully', 'success');
    } catch (error) {
      showNotification('Error clearing layers', 'error');
    }
  };

  const handleFullscreen = () => {
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) { /* Safari */
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) { /* IE11 */
        element.msRequestFullscreen();
      }
      showNotification('Entered fullscreen mode', 'info');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
      showNotification('Exited fullscreen mode', 'info');
    }
  };

  const handleShare = () => {
    // Share functionality
    showNotification('Sharing feature coming soon', 'info');
  };

  // Get layer type color
  const getLayerTypeColor = (type) => {
    const typeColors = {
      'RGB': 'rgb-color rgb-blue',
      'NDVI': 'rgb-color rgb-green',
      'SURFACE WATER': 'rgb-color rgb-cyan',
      'LULC': 'rgb-color rgb-yellow',
      'LST': 'rgb-color rgb-red'
    };
    
    return typeColors[type] || 'rgb-color rgb-gray';
  };

  return (
    <div className={`right-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Toggle Button */}
      <div className="sidebar-toggle-container">
        <button 
          onClick={toggleSidebar}
          className="sidebar-toggle-btn"
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      {/* Sidebar Content - Only rendered when expanded */}
      {isExpanded ? (
        <div className="right-sidebar-content">
          {/* Sidebar Header */}
          <div className="sidebar-header">
            <h2 className="sidebar-title">Layers</h2>
          </div>

          {/* Tool Tabs */}
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${activeSection === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveSection('layers')}
            >
              Layers
            </button>
            <button 
              className={`sidebar-tab ${activeSection === 'measure' ? 'active' : ''}`}
              onClick={() => setActiveSection('measure')}
            >
              Measure
            </button>
            <button 
              className={`sidebar-tab ${activeSection === 'info' ? 'active' : ''}`}
              onClick={() => setActiveSection('info')}
            >
              Info
            </button>
          </div>

          {/* Content Area */}
          <div className="sidebar-content-area">
            {/* Layers Panel */}
            {activeSection === 'layers' && (
              <div className="content-panel">
                {layers.length > 0 ? (
                  <div className="layers-list">
                    {layers.map(layer => {
                      const isVisible = layer.visibility !== 'none';
                      return (
                        <div key={layer.id} className="layer-item">
                          <div className="layer-item-header">
                            <div className="layer-item-title">
                              <div className={`layer-color ${getLayerTypeColor(layer.processing_type)}`}></div>
                              <span className="layer-name">{layer.location}</span>
                            </div>
                            <div className="layer-actions">
                              <button 
                                className="layer-action-btn visibility-btn"
                                onClick={(e) => handleToggleVisibility(e, layer.id)}
                                title={isVisible ? "Hide layer" : "Show layer"}
                              >
                                {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                              </button>
                              <button 
                                className="layer-action-btn delete-btn"
                                onClick={(e) => handleDeleteLayer(e, layer.id)}
                                title="Remove layer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="layer-item-body">
                            <div className="layer-type">
                              {layer.processing_type}
                            </div>
                            
                            {/* Opacity control */}
                            <div className="opacity-control">
                              <label className="opacity-label">Opacity:</label>
                              <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                defaultValue={layer.opacity || 0.8}
                                className="opacity-slider"
                                onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                              />
                              <span className="opacity-value">
                                {Math.round((layer.opacity || 0.8) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-message">
                      <p className="primary-message">No layers available</p>
                      <p className="secondary-message">Enter a query to add a layer</p>
                    </div>
                  </div>
                )}
                
                {/* Clear Layers Button */}
                {layers.length > 0 && (
                  <div className="clear-layers-container">
                    <button 
                      className="clear-layers-btn"
                      onClick={handleClearLayers}
                    >
                      Clear Layers
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Measure Panel */}
            {activeSection === 'measure' && (
              <div className="content-panel">
                <MeasureToolControl showNotification={showNotification} />
              </div>
            )}
            
            {/* Info Panel */}
            {activeSection === 'info' && (
              <div className="content-panel">
                <div className="info-container">
                  <p className="info-text">
                    Click on the map to view feature information.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Collapsed sidebar with icons
        <div className="sidebar-collapsed-content">
          <div className="sidebar-icon-group">
            <button 
              className="sidebar-icon-btn"
              onClick={() => {
                setActiveSection('layers');
                toggleSidebar();
              }}
              title="Layers"
            >
              <Layers size={20} />
            </button>
            
            <button 
              className="sidebar-icon-btn"
              onClick={() => {
                setActiveSection('info');
                toggleSidebar();
              }}
              title="Information"
            >
              <Info size={20} />
            </button>
            
            <button 
              className="sidebar-icon-btn"
              onClick={handleFullscreen}
              title="Fullscreen"
            >
              <Maximize size={20} />
            </button>
            
            <button 
              className="sidebar-icon-btn"
              onClick={handleShare}
              title="Share"
            >
              <Link size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

RightSidebar.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default RightSidebar;