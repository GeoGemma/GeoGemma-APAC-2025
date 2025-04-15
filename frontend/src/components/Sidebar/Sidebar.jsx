// src/components/Sidebar/Sidebar.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Menu, X, Layers, Trash2, Download, LineChart, Split, History } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { clearLayers, getSavedLayers, getAnalyses } from '../../services/api';
import '../../styles/sidebar.css';

const Sidebar = ({ showNotification, toggleTimeSeries, toggleComparison }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('layers');
  const { layers, removeLayer, toggleLayerVisibility, setLayerOpacity } = useMap();

  const handleClearLayers = async () => {
    try {
      await clearLayers();
      showNotification('All layers cleared', 'success');
    } catch (error) {
      showNotification(`Error clearing layers: ${error.message}`, 'error');
    }
  };

  const handleLayerToggle = (layerId) => {
    toggleLayerVisibility(layerId);
  };

  const handleLayerRemove = async (layerId) => {
    try {
      await removeLayer(layerId);
      showNotification('Layer removed', 'success');
    } catch (error) {
      showNotification(`Error removing layer: ${error.message}`, 'error');
    }
  };

  const handleOpacityChange = (layerId, opacity) => {
    setLayerOpacity(layerId, opacity);
  };

  const handleToggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleLoadSavedLayers = async () => {
    try {
      const response = await getSavedLayers();
      if (response.success && response.data) {
        if (response.data.length === 0) {
          showNotification('No saved layers found', 'info');
        } else {
          showNotification(`Loaded ${response.data.length} saved layers`, 'success');
          // In a real implementation, we would load these layers onto the map
        }
      } else {
        showNotification('Failed to load saved layers', 'error');
      }
    } catch (error) {
      showNotification(`Error loading saved layers: ${error.message}`, 'error');
    }
  };

  const handleViewHistory = async () => {
    try {
      const response = await getAnalyses();
      if (response.success && response.data) {
        if (response.data.length === 0) {
          showNotification('No analysis history found', 'info');
        } else {
          showNotification(`Found ${response.data.length} past analyses`, 'success');
          // In a real implementation, we would display these analyses
        }
      } else {
        showNotification('Failed to load analysis history', 'error');
      }
    } catch (error) {
      showNotification(`Error loading history: ${error.message}`, 'error');
    }
  };

  const handleTimeSeriesClick = () => {
    toggleTimeSeries();
  };

  const handleComparisonClick = () => {
    toggleComparison();
  };

  return (
    <>
      <button 
        className="sidebar-toggle"
        onClick={handleToggleSidebar}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Geo Gemma</h2>
        </div>

        <div className="sidebar-tabs">
          <button 
            className={`sidebar-tab ${activeTab === 'layers' ? 'active' : ''}`}
            onClick={() => setActiveTab('layers')}
          >
            <Layers size={16} /> Layers
          </button>
          <button 
            className={`sidebar-tab ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            Tools
          </button>
          <button 
            className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} /> History
          </button>
        </div>

        <div className="sidebar-content">
          {activeTab === 'layers' && (
            <div className="layers-panel">
              <div className="layers-header">
                <h3>Map Layers</h3>
                <button 
                  className="action-button"
                  onClick={handleClearLayers}
                  title="Clear all layers"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {layers.length === 0 ? (
                <p className="empty-message">No layers added yet. Use the search bar to add layers.</p>
              ) : (
                <ul className="layers-list">
                  {layers.map((layer) => (
                    <li key={layer.id} className="layer-item">
                      <div className="layer-header">
                        <label className="layer-toggle">
                          <input 
                            type="checkbox"
                            checked={layer.visibility !== 'none'}
                            onChange={() => handleLayerToggle(layer.id)}
                          />
                          <span className="layer-name">{layer.location}</span>
                        </label>
                        <button 
                          className="layer-remove"
                          onClick={() => handleLayerRemove(layer.id)}
                          title="Remove layer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="layer-details">
                        <span className="layer-type">{layer.processing_type}</span>
                        <div className="layer-opacity">
                          <span>Opacity:</span>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={layer.opacity || 0.8}
                            onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="tools-panel">
              <h3>Analysis Tools</h3>
              <div className="tools-grid">
                <button
                  className="tool-button"
                  onClick={handleTimeSeriesClick}
                  title="Time Series Analysis"
                >
                  <LineChart size={24} />
                  <span>Time Series</span>
                </button>
                <button
                  className="tool-button"
                  onClick={handleComparisonClick}
                  title="Comparison Analysis"
                >
                  <Split size={24} />
                  <span>Compare</span>
                </button>
                <button
                  className="tool-button"
                  onClick={() => showNotification('Export feature coming soon', 'info')}
                  title="Export Data"
                >
                  <Download size={24} />
                  <span>Export</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-panel">
              <h3>Analysis History</h3>
              <button
                className="history-button"
                onClick={handleViewHistory}
              >
                <History size={16} /> View Past Analyses
              </button>
              <button
                className="history-button"
                onClick={handleLoadSavedLayers}
              >
                <Layers size={16} /> Load Saved Layers
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

Sidebar.propTypes = {
  showNotification: PropTypes.func.isRequired,
  toggleTimeSeries: PropTypes.func.isRequired,
  toggleComparison: PropTypes.func.isRequired
};

export default Sidebar;