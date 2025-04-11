// src/components/Sidebar/RightSidebar.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, InfoIcon, HelpCircle, History, Settings } from 'lucide-react';

const RightSidebar = ({ showNotification }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleSection = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

  return (
    <div className={`fixed top-0 right-0 h-full transition-all duration-300 z-10 ${isOpen ? 'w-64' : 'w-16'} bg-background-dark elevation-2`}>
      {/* Header Section */}
      <div className="border-b border-background-light flex justify-center py-4">
        {isOpen ? (
          <div className="flex items-center justify-between w-full px-4">
            <button onClick={toggleSidebar} className="text-google-grey-300 hover:text-white p-1 rounded-full hover:bg-background-light">
              <ChevronRight size={20} />
            </button>
            <span className="text-google-grey-100 font-google-sans font-medium">Information</span>
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <button 
              className="text-google-grey-300 hover:text-white p-2 rounded-full hover:bg-background-light" 
              onClick={toggleSidebar}
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Tool Icons */}
        <div className="flex flex-col items-center py-5 gap-4">
          <div 
            className={`sidebar-tool-icon ${activeSection === 'history' ? 'active' : ''}`}
            title="History"
            onClick={() => toggleSection('history')}
          >
            <History size={20} />
            {isOpen && <span className="ml-3 text-sm font-roboto">History</span>}
          </div>
          
          <div 
            className={`sidebar-tool-icon ${activeSection === 'settings' ? 'active' : ''}`}
            title="Settings"
            onClick={() => toggleSection('settings')}
          >
            <Settings size={20} />
            {isOpen && <span className="ml-3 text-sm font-roboto">Settings</span>}
          </div>
          
          <div 
            className={`sidebar-tool-icon ${activeSection === 'help' ? 'active' : ''}`}
            title="Help"
            onClick={() => toggleSection('help')}
          >
            <HelpCircle size={20} />
            {isOpen && <span className="ml-3 text-sm font-roboto">Help</span>}
          </div>
          
          <div 
            className={`sidebar-tool-icon ${activeSection === 'about' ? 'active' : ''}`}
            title="About"
            onClick={() => toggleSection('about')}
          >
            <InfoIcon size={20} />
            {isOpen && <span className="ml-3 text-sm font-roboto">About</span>}
          </div>
        </div>
      </div>
      
      {/* Panel Content */}
      {isOpen && (
        <div className="px-2">
          {/* History Panel */}
          {activeSection === 'history' && (
            <div className="bg-background-light rounded-lg overflow-hidden elevation-1">
              <h3 className="text-center text-sm border-b border-background-surface py-2 font-google-sans">Search History</h3>
              <div className="p-3 text-sm text-google-grey-200">
                <p className="text-center text-google-grey-300 italic">Your search history will appear here</p>
              </div>
            </div>
          )}
          
          {/* Settings Panel */}
          {activeSection === 'settings' && (
            <div className="bg-background-light rounded-lg overflow-hidden elevation-1">
              <h3 className="text-center text-sm border-b border-background-surface py-2 font-google-sans">Settings</h3>
              <div className="p-3 text-sm text-google-grey-200">
                <p className="text-center text-google-grey-300 italic">Settings panel coming soon</p>
              </div>
            </div>
          )}
          
          {/* Help Panel */}
          {activeSection === 'help' && (
            <div className="bg-background-light rounded-lg overflow-hidden elevation-1">
              <h3 className="text-center text-sm border-b border-background-surface py-2 font-google-sans">Help</h3>
              <div className="p-3 text-sm text-google-grey-200">
                <h4 className="font-medium mb-2 text-google-grey-100">Example Queries:</h4>
                <ul className="space-y-1 text-xs ml-2">
                  <li>• "Show NDVI in Paris for 2022"</li>
                  <li>• "RGB imagery of Tokyo from Landsat 8"</li>
                  <li>• "Surface water in Amsterdam"</li>
                  <li>• "LULC for Berlin"</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* About Panel */}
          {activeSection === 'about' && (
            <div className="bg-background-light rounded-lg overflow-hidden elevation-1">
              <h3 className="text-center text-sm border-b border-background-surface py-2 font-google-sans">About</h3>
              <div className="p-3 text-sm text-google-grey-200">
                <p className="mb-2">GeoGemma integrates Google Earth Engine with Gemma to provide AI-powered geospatial analysis.</p>
                <p className="text-xs text-google-grey-300">© 2025 Google Research</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

RightSidebar.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default RightSidebar;