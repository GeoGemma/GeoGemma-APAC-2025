// src/components/Layout/Layout.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  BarChart2, 
  History, 
  Download, 
  GitCompare, 
  Clock, 
  Settings,
  HelpCircle,
  Info,
  User
} from 'lucide-react';
import '../../styles/header.css';

const Layout = ({ children, toggleTimeSeries, toggleComparison }) => {
  const [activeTab, setActiveTab] = useState('layers');

  return (
    <div className="layout-container">
      {/* Top header - Google style */}
      <div className="top-header">
        <div className="top-header-logo">
          <img src="/geoshort.png" alt="GeoGemma Logo" />
          <h1 className="top-header-title">GeoGemma</h1>
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
          <button className="top-header-button" title="Account">
            <User size={20} />
          </button>
        </div>
      </div>
      
      {/* Side navigation */}
      <header className="app-header">
        <div className="logo-container">
          <Link to="/" className="app-logo">
            G
          </Link>
        </div>
        
        <nav className="navbar">
          <div className="navbar-tabs">
            <div 
              className={`navbar-tab ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
              title="Layers"
            >
              <Layers size={20} />
              <span className="text-xs mt-1">Layers</span>
            </div>
            <div 
              className={`navbar-tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
              title="Analysis"
            >
              <BarChart2 size={20} />
              <span className="text-xs mt-1">Analysis</span>
            </div>
            <div 
              className={`navbar-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
              title="History"
            >
              <History size={20} />
              <span className="text-xs mt-1">History</span>
            </div>
          </div>
          
          <div className="right-controls">
            <button 
              className="nav-button" 
              title="Time Series Analysis"
              onClick={toggleTimeSeries}
            >
              <Clock size={20} />
            </button>
            <button 
              className="nav-button" 
              title="Comparison Analysis"
              onClick={toggleComparison}
            >
              <GitCompare size={20} />
            </button>
            <button 
              className="nav-button" 
              title="Export Data"
              onClick={() => console.log('Export data')}
            >
              <Download size={20} />
            </button>
          </div>
        </nav>
      </header>
      
      <main className="layout-content">
        {children}
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  toggleTimeSeries: PropTypes.func,
  toggleComparison: PropTypes.func,
};

Layout.defaultProps = {
  toggleTimeSeries: () => {},
  toggleComparison: () => {},
};

export default Layout;