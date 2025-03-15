// src/components/Sidebar/Sidebar.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, Menu, Ruler, Layers, Info, Trash2 } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import LayersList from './LayersList';
import MeasureToolControl from '../Map/MeasureToolControl';
import { clearLayers as clearLayersApi } from '../../services/api';
import './sidebar.css';

const Sidebar = ({ showNotification }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const { clearLayers } = useMap();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSection = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
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

  return (
    <div className={`fixed top-0 left-0 h-full bg-gray-900 shadow-lg transition-all duration-300 z-10 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
      {/* Logo Section */}
<div className="border-b border-gray-700 flex justify-center py-4">
  {isSidebarOpen ? (
    <div className="flex items-center justify-between w-full px-4">
      <div className="flex items-center">
        {/* Logo image */}
        <img 
          src="/geoshort.png" 
          alt="GeoGemma Logo" 
          className="h-8 w-8 object-contain"
        />
        <span className="ml-2 text-white font-semibold">GeoGemma</span>
      </div>
      <button onClick={toggleSidebar} className="text-gray-400 hover:text-white">
        <ChevronLeft size={20} />
      </button>
    </div>
  ) : (
    <div className="flex justify-center w-full">
      {/* Collapsed logo */}
      <img 
        src="/geoshort.png" 
        alt="GeoGemma Logo" 
        className="h-8 w-8 object-contain"
      />
    </div>
  )}
</div>

      {/* Main Sidebar Content */}
      <div className="flex flex-col">
        {/* Expand/Collapse button for small sidebar */}
        {!isSidebarOpen && (
          <button 
            className="mt-2 mx-auto text-gray-400 hover:text-white p-2" 
            onClick={toggleSidebar}
          >
            <ChevronRight size={20} />
          </button>
        )}
        
        {/* Tool Icons */}
        <div className="flex flex-col items-center py-5 gap-4">
          <div 
            className={`sidebar-tool-icon ${activeSection === 'measure' ? 'bg-blue-900/50' : 'bg-gray-800/60'}`}
            title="Measure"
            onClick={() => toggleSection('measure')}
          >
            <Ruler size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm">Measure</span>}
          </div>
          
          <div 
            className={`sidebar-tool-icon ${activeSection === 'layers' ? 'bg-blue-900/50' : 'bg-gray-800/60'}`}
            title="Layer Control"
            onClick={() => toggleSection('layers')}
          >
            <Layers size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm">Layers</span>}
          </div>
          
          <div 
            className="sidebar-tool-icon bg-gray-800/60"
            title="Feature Information"
          >
            <Info size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm">Information</span>}
          </div>
          
          <div 
            className="sidebar-tool-icon bg-red-900/30 hover:bg-red-800/50 mt-4"
            title="Clear Layers"
            onClick={handleClearLayers}
          >
            <Trash2 size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm">Clear Layers</span>}
          </div>
        </div>
      </div>
      
      {/* Panel Content */}
      {isSidebarOpen && (
        <div className="px-2">
          {/* Layers Panel */}
          {activeSection === 'layers' && (
            <div className="bg-gray-800/70 rounded-md overflow-hidden">
              <h3 className="text-center text-sm border-b border-gray-700 py-2 bg-gray-800">Layers</h3>
              <div className="max-h-[60vh] overflow-y-auto">
                <LayersList showNotification={showNotification} />
              </div>
            </div>
          )}
          
          {/* Measure Tools Panel */}
          {activeSection === 'measure' && (
            <div className="bg-gray-800/70 rounded-md overflow-hidden">
              <h3 className="text-center text-sm border-b border-gray-700 py-2 bg-gray-800">Measure</h3>
              <div className="p-2">
                <MeasureToolControl showNotification={showNotification} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

Sidebar.propTypes = {
  showNotification: PropTypes.func.isRequired
};

// Add this CSS to your global styles or create a new CSS module
const styles = `
.sidebar-tool-icon {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.375rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  width: 90%;
}

.sidebar-tool-icon:hover {
  background-color: rgba(59, 130, 246, 0.5);
}
`;

// You can add this to your component as a style tag if needed
// or import it as a CSS module

export default Sidebar;