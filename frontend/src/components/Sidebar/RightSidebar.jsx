// src/components/Sidebar/RightSidebar.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, Layers, Ruler, Info, Trash2, Eye, EyeOff } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import MeasureToolControl from '../Map/MeasureToolControl';
import { clearLayers as clearLayersApi, deleteLayer as deleteLayerApi } from '../../services/api';
import '../../styles/topbar.css';
import './sidebar.css'; // Fixed import path

const RightSidebar = ({ showNotification }) => {
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

  // Get layer type color
  const getLayerTypeColor = (type) => {
    const typeColors = {
      'RGB': 'bg-google-blue',
      'NDVI': 'bg-google-green',
      'SURFACE WATER': 'bg-blue-500',
      'LULC': 'bg-google-yellow',
      'LST': 'bg-google-red'
    };
    
    return typeColors[type] || 'bg-google-grey-300';
  };

  return (
    <div className={`fixed right-0 sidebar-with-topbar bg-background-dark z-10 transition-all duration-300 ${isExpanded ? 'w-80' : 'w-16'}`}>
      <div className="flex flex-col h-full">
        {/* Sidebar Toggle (only shown when collapsed) */}
        {!isExpanded && (
          <button 
            onClick={toggleSidebar}
            className="absolute top-4 left-0 right-0 text-google-grey-300 hover:text-white p-1 mx-auto flex justify-center"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Expanded Sidebar Content */}
        {isExpanded && (
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-background-light/20">
              <h2 className="text-google-grey-100 font-google-sans font-medium">Layers</h2>
              <button 
                onClick={toggleSidebar}
                className="text-google-grey-300 hover:text-white p-1 rounded-full hover:bg-background-light/40"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Tool Tabs */}
            <div className="flex border-b border-background-light/20">
              <button 
                className={`flex-1 py-2 px-3 text-sm font-medium ${activeSection === 'layers' ? 'border-b-2 border-primary text-primary' : 'text-google-grey-300'}`}
                onClick={() => setActiveSection('layers')}
              >
                Layers
              </button>
              <button 
                className={`flex-1 py-2 px-3 text-sm font-medium ${activeSection === 'measure' ? 'border-b-2 border-primary text-primary' : 'text-google-grey-300'}`}
                onClick={() => setActiveSection('measure')}
              >
                Measure
              </button>
              <button 
                className={`flex-1 py-2 px-3 text-sm font-medium ${activeSection === 'info' ? 'border-b-2 border-primary text-primary' : 'text-google-grey-300'}`}
                onClick={() => setActiveSection('info')}
              >
                Info
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-custom">
              {/* Layers Panel */}
              {activeSection === 'layers' && (
                <div className="p-3">
                  {layers.length > 0 ? (
                    <div className="space-y-2">
                      {layers.map(layer => {
                        const isVisible = layer.visibility !== 'none';
                        return (
                          <div key={layer.id} className="bg-background-surface rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 border-b border-background-light/20">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 ${getLayerTypeColor(layer.processing_type)}`}></div>
                                <span className="text-sm font-medium text-google-grey-100 truncate max-w-[120px]">{layer.location}</span>
                              </div>
                              <div className="flex space-x-1">
                                <button 
                                  className="p-1 rounded-full text-google-grey-300 hover:text-google-grey-100 hover:bg-background-light/50"
                                  onClick={(e) => handleToggleVisibility(e, layer.id)}
                                  title={isVisible ? "Hide layer" : "Show layer"}
                                >
                                  {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button 
                                  className="p-1 rounded-full text-google-grey-300 hover:text-google-red hover:bg-background-light/50" 
                                  onClick={(e) => handleDeleteLayer(e, layer.id)}
                                  title="Remove layer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="p-3">
                              <div className="text-xs text-google-grey-300 uppercase font-medium mb-2">
                                {layer.processing_type}
                              </div>
                              
                              {/* Opacity control */}
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-google-grey-300 w-14">Opacity:</label>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="1" 
                                  step="0.1" 
                                  defaultValue={layer.opacity || 0.8}
                                  className="w-full h-1 bg-background-light rounded-lg appearance-none cursor-pointer"
                                  onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                                />
                                <span className="text-xs text-google-grey-300 w-10 text-right">
                                  {Math.round((layer.opacity || 0.8) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-background-surface rounded-lg p-4">
                      <div className="text-center text-google-grey-300 py-8">
                        <p className="mb-2">No layers available</p>
                        <p className="text-xs text-google-grey-400">Enter a query to add a layer</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Clear Layers Button */}
                  {layers.length > 0 && (
                    <div className="pt-3">
                      <button 
                        className="w-full py-2 text-sm text-google-red bg-google-red/10 hover:bg-google-red/20 rounded-md transition-colors"
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
                <div className="p-3">
                  <MeasureToolControl showNotification={showNotification} />
                </div>
              )}
              
              {/* Info Panel */}
              {activeSection === 'info' && (
                <div className="p-3">
                  <div className="bg-background-surface rounded-lg p-4">
                    <p className="text-sm text-google-grey-300">
                      Click on the map to view feature information.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed Sidebar Icons */}
        {!isExpanded && (
          <div className="mt-12 flex flex-col items-center py-5 gap-6">
            <button 
              className="p-2.5 bg-primary/20 text-primary rounded-md hover:bg-primary/30 transition-colors"
              onClick={() => {
                setActiveSection('layers');
                toggleSidebar();
              }}
              title="Layers"
            >
              <Layers size={20} />
            </button>
            
            <button 
              className="p-2.5 text-google-grey-300 hover:text-white rounded-md hover:bg-background-light/40 transition-colors"
              onClick={() => {
                setActiveSection('measure');
                toggleSidebar();
              }}
              title="Measure"
            >
              <Ruler size={20} />
            </button>
            
            <button 
              className="p-2.5 text-google-grey-300 hover:text-white rounded-md hover:bg-background-light/40 transition-colors"
              onClick={() => {
                setActiveSection('info');
                toggleSidebar();
              }}
              title="Information"
            >
              <Info size={20} />
            </button>
            
            {layers.length > 0 && (
              <button 
                className="p-2.5 text-google-grey-300 hover:text-google-red rounded-md hover:bg-background-light/40 transition-colors mt-auto mb-5"
                onClick={handleClearLayers}
                title="Clear Layers"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

RightSidebar.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default RightSidebar;