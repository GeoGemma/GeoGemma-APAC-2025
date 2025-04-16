// src/components/Layout/Layout.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Settings,
  HelpCircle,
  Info,
  Pencil
} from 'lucide-react';
import '../../styles/header.css';

const Layout = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  // Listen for sidebar toggle event from Sidebar component
  useEffect(() => {
    const handleSidebarToggle = (event) => {
      setSidebarExpanded(event.detail.expanded);
    };
    
    window.addEventListener('sidebar-toggle', handleSidebarToggle);
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle);
    };
  }, []);

  return (
    <div className="layout-container">
      {/* Top header - Google style */}
      <div className={`top-header ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
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
      
      {/* Floating Edit Button (positioned in top-right) */}
      <button className="floating-edit-button" title="Edit">
        <Pencil size={20} />
      </button>
      
      <main className={`layout-content ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
        {children}
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;