// src/App.jsx
import { useState, useEffect } from 'react';
import { MapProvider } from './contexts/MapContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import AppMap from './components/Map/AppMap';
import Sidebar from './components/Sidebar/Sidebar';
import RightSidebar from './components/Sidebar/RightSidebar';
import PromptForm from './components/UI/PromptForm';
import Notification from './components/UI/Notification.jsx';
import StatusIndicator from './components/UI/StatusIndicator.jsx';
import TimeSeriesAnalysis from './components/Analysis/TimeSeriesAnalysis.jsx';
import ComparisonAnalysis from './components/Analysis/ComparisonAnalysis.jsx';
// The MapLegend import is removed as it's now integrated in the RightSidebar
import './styles/font.css';
// Keeping mapLegend.css for styling that might be used by MapLegendInfo
import './styles/mapLegend.css';
// Add new metadata styling
import './styles/metadata.css';

// Define custom CSS variables for the Google theme
const GlobalStyles = () => {
  useEffect(() => {
    // Add CSS variables to root - Google Dark Theme
    document.documentElement.style.setProperty('--color-primary', '138, 180, 248'); // Google blue #8ab4f8
    document.documentElement.style.setProperty('--color-bg-dark', '24, 24, 24'); // Google dark background #181818
    document.documentElement.style.setProperty('--color-bg-medium', '48, 49, 52'); // Google dark surface #303134
    document.documentElement.style.setProperty('--color-bg-light', '60, 64, 67'); // Slightly lighter surface #3c4043
    document.documentElement.style.setProperty('--color-accent', '253, 214, 99'); // Google yellow #fdd663
    document.documentElement.style.setProperty('--color-text', '232, 234, 237'); // Google light text #e8eaed
    document.documentElement.style.setProperty('--color-text-light', '154, 160, 166'); // Google secondary text #9aa0a6
    document.documentElement.style.setProperty('--color-error', '242, 139, 130'); // Google red #f28b82
    document.documentElement.style.setProperty('--color-success', '129, 201, 149'); // Google green #81c995
    document.documentElement.style.setProperty('--transition-default', 'all 0.2s ease'); // transitions

    // Update body background to Google dark theme
    document.body.style.backgroundColor = '#181818';
    document.body.style.color = '#e8eaed';
  }, []);

  return null;
};

function App() {
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showTimeSeries, setShowTimeSeries] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const toggleSidebar = (expanded) => {
    setSidebarExpanded(expanded);
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const showLoading = (message = 'Processing...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  const toggleTimeSeries = () => {
    setShowTimeSeries(!showTimeSeries);
    if (!showTimeSeries) {
      setShowComparison(false);
    }
  };

  const toggleComparison = () => {
    setShowComparison(!showComparison);
    if (!showComparison) {
      setShowTimeSeries(false);
    }
  };

  return (
    <AuthProvider>
      <MapProvider>
        <GlobalStyles />
        <Layout sidebarExpanded={sidebarExpanded}>
          <Sidebar 
            showNotification={showNotification} 
            toggleTimeSeries={toggleTimeSeries}
            toggleComparison={toggleComparison}
            onToggleSidebar={toggleSidebar}
          />
          <AppMap />
          <RightSidebar showNotification={showNotification} />
          <PromptForm 
            showNotification={showNotification} 
            showLoading={showLoading}
            hideLoading={hideLoading}
          />
          
          {/* The standalone MapLegend component is removed, as it's now integrated into the RightSidebar */}
          
          {showTimeSeries && (
            <TimeSeriesAnalysis 
              showNotification={showNotification}
              showLoading={showLoading}
              hideLoading={hideLoading}
            />
          )}
          
          {showComparison && (
            <ComparisonAnalysis 
              showNotification={showNotification}
              showLoading={showLoading}
              hideLoading={hideLoading}
            />
          )}
          
          {notification && (
            <Notification 
              message={notification.message} 
              type={notification.type} 
            />
          )}
          {isLoading && (
            <StatusIndicator message={loadingMessage} />
          )}
        </Layout>
      </MapProvider>
    </AuthProvider>
  );
}

export default App;