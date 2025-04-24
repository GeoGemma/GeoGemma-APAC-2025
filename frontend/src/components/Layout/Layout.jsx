// src/components/Layout/Layout.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { 
  Settings, 
  HelpCircle, 
  Info
} from 'lucide-react';
import UserProfile from '../UI/UserProfile';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/header.css';
import '../../styles/layout.css';

const Layout = ({ children, sidebarExpanded, showNotification }) => {
  const { currentUser } = useAuth();
  
  // Determine header class based on sidebar state
  const headerClass = sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed';

  return (
    <div className={`layout-container app-layout ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
      {/* Top header - Google style */}
      <div className={`top-header ${headerClass}`}>
        <div className="top-header-logo">
          <div className="gegemma-logo">
            <img src="/geoshort.png" alt="GeoGemma Logo" className="logo-img" />
            <h1 className="top-header-title">GeoGemma</h1>
          </div>
        </div>
        <div className="top-header-actions">
          {currentUser && <UserProfile />}
          <button 
            className="top-header-button" 
            title="Settings"
            onClick={() => showNotification && showNotification('Settings will be available soon', 'info')}
          >
            <Settings size={20} />
          </button>
          <button 
            className="top-header-button" 
            title="Help"
            onClick={() => showNotification && showNotification('Help documentation will be available soon', 'info')}
          >
            <HelpCircle size={20} />
          </button>
          <button 
            className="top-header-button" 
            title="About"
            onClick={() => showNotification && showNotification('GeoGemma - A Google Research Project', 'info')}
          >
            <Info size={20} />
          </button>
        </div>
      </div>
      
      <main className={`layout-content ${headerClass}`}>
        {children}
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  sidebarExpanded: PropTypes.bool,
  showNotification: PropTypes.func
};

Layout.defaultProps = {
  sidebarExpanded: false,
  showNotification: null
};

export default Layout;