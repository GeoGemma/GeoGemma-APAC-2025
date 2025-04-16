// src/components/Layout/Layout.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { 
  Settings, 
  HelpCircle, 
  Info
} from 'lucide-react';
import '../../styles/header.css';

const Layout = ({ children, sidebarExpanded }) => {
  // Determine header class based on sidebar state
  const headerClass = sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed';

  return (
    <div className="layout-container">
      {/* Top header - Google style */}
      <div className={`top-header ${headerClass}`}>
        <div className="top-header-logo">
          <div className="gegemma-logo">
            <img src="/geoshort.png" alt="GeoGemma Logo" className="logo-img" />
            <h1 className="top-header-title">GeoGemma</h1>
          </div>
        </div>
        <div className="top-header-actions">
          <button className="top-header-button" title="Settings">
            <Settings size={20} />
          </button>
          <button className="top-header-button" title="Help">
            <HelpCircle size={20} />
          </button>
          <button className="top-header-button" title="About">
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
  sidebarExpanded: PropTypes.bool
};

Layout.defaultProps = {
  sidebarExpanded: false
};

export default Layout;