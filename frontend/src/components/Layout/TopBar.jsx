// src/components/Layout/TopBar.jsx
import PropTypes from 'prop-types';
import { Settings, HelpCircle, Info } from 'lucide-react';
import ProfileMenu from '../UI/ProfileMenu';

const TopBar = ({ showNotification }) => {
  return (
    <div className="h-12 w-full bg-background-dark border-b border-background-light/10 flex items-center justify-between px-4 z-20 fixed top-0 left-0 right-0">
      {/* Left side - Logo */}
      <div className="flex items-center">
        <img 
          src="/geolong.png" 
          alt="GeoGemma Logo" 
          className="w-40 object-contain mr-2"
        />
        
      </div>
      
      {/* Right side - Actions */}
      <div className="flex items-center space-x-1">
        <button 
          className="p-1.5 text-google-grey-300 hover:text-white rounded-full hover:bg-background-light/40 transition-colors"
          onClick={() => showNotification('Settings will be available soon', 'info')}
          title="Settings"
        >
          <Settings size={18} />
        </button>
        
        <button 
          className="p-1.5 text-google-grey-300 hover:text-white rounded-full hover:bg-background-light/40 transition-colors"
          onClick={() => showNotification('Help documentation will be available soon', 'info')}
          title="Help"
        >
          <HelpCircle size={18} />
        </button>
        
        <button 
          className="p-1.5 text-google-grey-300 hover:text-white rounded-full hover:bg-background-light/40 transition-colors"
          onClick={() => showNotification('GeoGemma - A Google Research Project', 'info')}
          title="About"
        >
          <Info size={18} />
        </button>
        
        {/* Add ProfileMenu component */}
        <ProfileMenu />
      </div>
    </div>
  );
};

TopBar.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default TopBar;