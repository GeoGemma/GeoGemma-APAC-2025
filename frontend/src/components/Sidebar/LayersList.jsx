// src/components/Sidebar/LayersList.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { deleteLayer as deleteLayerApi } from '../../services/api';
import { formatLayerLabel } from '../../utils/mapUtils.js';

const LayersList = ({ showNotification }) => {
  const { layers, toggleLayerVisibility, removeLayer, setLayerOpacity } = useMap();
  const [expandedLayers, setExpandedLayers] = useState({});

  const handleToggleVisibility = (layerId) => {
    toggleLayerVisibility(layerId);
  };

  const handleOpacityChange = (layerId, opacity) => {
    setLayerOpacity(layerId, opacity);
  };

  const handleDeleteLayer = async (layerId) => {
    try {
      await deleteLayerApi(layerId);
      removeLayer(layerId);
      showNotification('Layer removed', 'success');
    } catch (error) {
      showNotification('Error removing layer', 'error');
    }
  };

  const toggleLayerExpanded = (layerId) => {
    setExpandedLayers(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  // Color indicators for different layer types
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

  if (layers.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <p className="text-google-grey-300 text-sm">No layers available</p>
        <p className="text-google-grey-400 text-xs mt-1">Enter a query to add a layer</p>
      </div>
    );
  }

  return (
    <ul className="list-none p-2 space-y-2">
      {layers.map(layer => {
        const isVisible = layer.visibility !== 'none';
        const isExpanded = expandedLayers[layer.id];
        
        return (
          <li key={layer.id} className="bg-background-surface rounded-lg hover:bg-background-surface/80 transition-colors border border-background-light/30">
            <div className="p-2">
              {/* Layer header with controls */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getLayerTypeColor(layer.processing_type)}`}></div>
                  <span className="text-sm text-google-grey-100 font-medium truncate max-w-[120px]">
                    {layer.location}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button 
                    className="p-1 rounded-full text-google-grey-300 hover:text-google-grey-100 hover:bg-background-light/50"
                    onClick={() => handleToggleVisibility(layer.id)}
                    title={isVisible ? "Hide layer" : "Show layer"}
                  >
                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button 
                    className="p-1 rounded-full text-google-grey-300 hover:text-google-red hover:bg-background-light/50" 
                    onClick={() => handleDeleteLayer(layer.id)}
                    title="Remove layer"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    className="p-1 rounded-full text-google-grey-300 hover:text-google-grey-100 hover:bg-background-light/50"
                    onClick={() => toggleLayerExpanded(layer.id)}
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              
              {/* Layer type indicator */}
              <div className="mt-1 text-xs text-google-grey-300">
                {layer.processing_type}
              </div>
              
              {/* Expanded details */}
              {isExpanded && isVisible && (
                <div className="mt-3 pt-2 border-t border-background-light/30">
                  {/* Opacity slider */}
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
                    <span className="text-xs text-google-grey-300 w-8">
                      {Math.round((layer.opacity || 0.8) * 100)}%
                    </span>
                  </div>
                  
                  {/* Layer metadata */}
                  {layer.latitude && layer.longitude && (
                    <div className="mt-2 text-xs text-google-grey-300">
                      <div className="grid grid-cols-2 gap-1">
                        <span>Latitude:</span>
                        <span className="text-google-grey-200">{layer.latitude.toFixed(4)}</span>
                        <span>Longitude:</span>
                        <span className="text-google-grey-200">{layer.longitude.toFixed(4)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

LayersList.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default LayersList;