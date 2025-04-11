// src/components/Sidebar/Sidebar.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, Menu, Ruler, Layers, Info, Trash2 } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import LayersList from './LayersList';
import MeasureToolControl from '../Map/MeasureToolControl';
import { clearLayers as clearLayersApi } from '../../services/api';

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
    <div className={`fixed top-0 left-0 h-full transition-all duration-300 z-10 ${isSidebarOpen ? 'w-64' : 'w-16'} bg-background-dark elevation-2`}>
      {/* Logo Section */}
      <div className="border-b border-background-light flex justify-center py-4">
        {isSidebarOpen ? (
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center">
              {/* Logo image */}
              <img 
                src="/geoshort.png" 
                alt="GeoGemma Logo" 
                className="h-8 w-8 object-contain"
              />
              <span className="ml-2 text-google-grey-100 font-google-sans">GeoGemma</span>
            </div>
            <button onClick={toggleSidebar} className="text-google-grey-300 hover:text-white p-1 rounded-full hover:bg-background-light">
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
            className="mt-2 mx-auto text-google-grey-300 hover:text-white p-2 rounded-full hover:bg-background-light" 
            onClick={toggleSidebar}
          >
            <ChevronRight size={20} />
          </button>
        )}
        
        {/* Tool Icons */}
        <div className="flex flex-col items-center py-5 gap-4">
          <div 
            className={`sidebar-tool-icon ${activeSection === 'measure' ? 'active' : ''}`}
            title="Measure"
            onClick={() => toggleSection('measure')}
          >
            <Ruler size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm font-roboto">Measure</span>}
          </div>
          
          <div 
            className={`sidebar-tool-icon ${activeSection === 'layers' ? 'active' : ''}`}
            title="Layer Control"
            onClick={() => toggleSection('layers')}
          >
            <Layers size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm font-roboto">Layers</span>}
          </div>
          
          <div 
            className="sidebar-tool-icon"
            title="Feature Information"
          >
            <Info size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm font-roboto">Information</span>}
          </div>
          
          <div 
            className="sidebar-tool-icon bg-google-red/10 hover:bg-google-red/20 hover:text-google-red mt-4"
            title="Clear Layers"
            onClick={handleClearLayers}
          >
            <Trash2 size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm font-roboto">Clear Layers</span>}
          </div>
        </div>
      </div>
      
      {/* Panel Content */}
      {isSidebarOpen && (
        <div className="px-2">
          {/* Layers Panel */}
          {activeSection === 'layers' && (
            <div className="bg-background-light rounded-lg overflow-hidden elevation-1">
              <h3 className="text-center text-sm border-b border-background-surface py-2 font-google-sans">Layers</h3>
              <div className="max-h-[60vh] overflow-y-auto scrollbar-custom">
                <LayersList showNotification={showNotification} />
              </div>
            </div>
          )}
          
          {/* Measure Tools Panel */}
          {activeSection === 'measure' && (
            <div className="bg-background-light rounded-lg overflow-hidden elevation-1">
              <h3 className="text-center text-sm border-b border-background-surface py-2 font-google-sans">Measure</h3>
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

export default Sidebar;