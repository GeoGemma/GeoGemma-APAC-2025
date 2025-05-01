// src/components/Layout/Layout.jsx
import React from 'react';
import PropTypes from 'prop-types';
// --- Import LayoutGrid ---
import {
  Settings,
  HelpCircle,
  Info,
  LayoutGrid // Import the icon
} from 'lucide-react';
import ProfileMenu from '../UI/ProfileMenu';
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
            {/* Consider using a higher-res logo if available */}
            <img src="/geoshort.png" alt="GeoGemma Logo" className="logo-img h-6 w-auto" /> {/* Adjusted size slightly */}
            {/* Maybe remove the h1 if logo includes text, or adjust spacing */}
            <h1 className="top-header-title text-lg ml-2">GeoGemma</h1>
          </div>
        </div>
        <div className="top-header-actions"> {/* Icons on the right */}

          {/* --- NEW Dataset Explorer Button --- */}
          <button>
          <a
          href="http://127.0.0.1:5000/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2 bg-google-bg-light/70 text-white rounded-md hover:bg-google-bg-light/90 transition-colors border border-google-bg-light/30"
          title="Open Dataset Explorer"
          style={{ borderRadius: '10px' }}
        >
          Dataset Explorer
        </a>
          </button>
          {/* --- END NEW Button --- */}

          {/* Settings Button */}
          <button
            className="top-header-button"
            title="Settings"
            onClick={() => showNotification && showNotification('Settings will be available soon', 'info')}
          >
            <Settings size={20} />
          </button>

          {/* Help Button */}
          <button
            className="top-header-button"
            title="Help"
            onClick={() => showNotification && showNotification('Help documentation will be available soon', 'info')}
          >
            <HelpCircle size={20} />
          </button>

          {/* About Button */}
          <button
            className="top-header-button"
            title="About"
            onClick={() => showNotification && showNotification('GeoGemma - A Google Research Project', 'info')}
          >
            <Info size={20} />
          </button>

          {/* Profile Menu component */}
          <ProfileMenu />
        </div>
      </div>

      {/* Main content area where Sidebar, AppMap, RightSidebar are rendered */}
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