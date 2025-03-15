// src/components/Sidebar/LayersList.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { deleteLayer as deleteLayerApi } from '../../services/api';
import { formatLayerLabel } from '../../utils/mapUtils.js';

const LayersList = ({ showNotification }) => {
  const { layers, toggleLayerVisibility, removeLayer, setLayerOpacity } = useMap();

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
      showNotification('Layer deleted successfully', 'success');
    } catch (error) {
      showNotification('Error deleting layer', 'error');
    }
  };

  if (layers.length === 0) {
    return <p className="text-center p-4 text-sm text-gray-400">No layers available</p>;
  }

  return (
    <ul className="list-none p-2 space-y-2">
      {layers.map(layer => {
        const isVisible = layer.visibility !== 'none';
        return (
          <li key={layer.id} className="layer-item">
            <div className="flex justify-between items-center">
              <span className="text-sm">{formatLayerLabel(layer)}</span>
              <div className="flex">
                <button 
                  className="layer-control-button"
                  onClick={() => handleToggleVisibility(layer.id)}
                >
                  {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button 
                  className="layer-control-button" 
                  onClick={() => handleDeleteLayer(layer.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {isVisible && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-400">Opacity:</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  defaultValue={layer.opacity || 0.8}
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                  onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                />
              </div>
            )}
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