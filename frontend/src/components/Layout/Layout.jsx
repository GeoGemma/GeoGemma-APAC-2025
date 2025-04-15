// src/components/Layout/Layout.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Layers, BarChart2, History, Download, GitCompare, Clock } from 'lucide-react';
import '../../styles/header.css';

const Layout = ({ children, toggleTimeSeries, toggleComparison }) => {
  const [activeTab, setActiveTab] = useState('layers');

  return (
    <div className="layout-container">
      <header className="app-header">
        <div className="logo-container">
          <Link to="/" className="app-logo">
            GeoGemma
          </Link>
        </div>
        
        <nav className="navbar">
          <div className="navbar-tabs">
            <div 
              className={`navbar-tab ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
              title="Layers"
            >
              <Layers size={22} />
              <span className="text-xs mt-1">Layers</span>
            </div>
            <div 
              className={`navbar-tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
              title="Analysis"
            >
              <BarChart2 size={22} />
              <span className="text-xs mt-1">Analysis</span>
            </div>
            <div 
              className={`navbar-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
              title="History"
            >
              <History size={22} />
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