// src/components/Sidebar/Sidebar.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Menu, Ruler, Layers, Info, Trash2 } from 'lucide-react';
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
    <div className={`fixed top-0 left-0 h-full bg-background-sidebar shadow-lg transition-all duration-300 z-10 ${isSidebarOpen ? 'w-60' : 'w-12'}`}>
      <div className="p-3 border-b border-white/10 text-center cursor-pointer" onClick={toggleSidebar}>
        <Menu size={20} />
      </div>
      
      <div className="flex flex-col items-center pt-5">
        <div 
          className={`sidebar-icon ${activeSection === 'measure' ? 'active' : ''}`}
          title="Measure"
          onClick={() => toggleSection('measure')}
        >
          <Ruler size={20} />
        </div>
        
        <div 
          className={`sidebar-icon ${activeSection === 'layers' ? 'active' : ''}`}
          title="Layer Control"
          onClick={() => toggleSection('layers')}
        >
          <Layers size={20} />
        </div>
        
        <div 
          className="sidebar-icon"
          title="Feature Information"
        >
          <Info size={20} />
        </div>
        
        <div 
          className="sidebar-icon mt-5 bg-red-600/30 hover:bg-red-600/50"
          title="Clear Layers"
          onClick={handleClearLayers}
        >
          <Trash2 size={20} />
        </div>
      </div>
      
      {/* Layers Panel */}
      {activeSection === 'layers' && isSidebarOpen && (
        <div className="bg-black/50 rounded m-2 max-h-[60vh] overflow-y-auto scrollbar-custom">
          <h3 className="text-center border-b border-white/10 py-2 sticky top-0 bg-black/70 z-10">Layers</h3>
          <LayersList showNotification={showNotification} />
        </div>
      )}
      
      {/* Measure Tools Panel */}
      {activeSection === 'measure' && isSidebarOpen && (
        <div className="bg-black/50 rounded m-2">
          <h3 className="text-center border-b border-white/10 py-2">Measure</h3>
          <MeasureToolControl showNotification={showNotification} />
        </div>
      )}
    </div>
  );
};

Sidebar.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default Sidebar;