// src/App.jsx
import { useState, useEffect } from 'react';
import { MapProvider } from './contexts/MapContext';
import Layout from './components/Layout/Layout';
import AppMap from './components/Map/AppMap';
import Sidebar from './components/Sidebar/Sidebar';
import RightSidebar from './components/Sidebar/RightSidebar';
import PromptForm from './components/UI/PromptForm';
import Notification from './components/UI/Notification.jsx';
import StatusIndicator from './components/UI/StatusIndicator.jsx';
import TimeSeriesAnalysis from './components/Analysis/TimeSeriesAnalysis.jsx';
import ComparisonAnalysis from './components/Analysis/ComparisonAnalysis.jsx';
import DrawingTools from './components/Map/DrawingTools.jsx';
import './styles/font.css';

// Define custom CSS variables for the theme
const GlobalStyles = () => {
  useEffect(() => {
    // Add CSS variables to root
    document.documentElement.style.setProperty('--color-primary', '100, 255, 218'); // teal
    document.documentElement.style.setProperty('--color-bg-dark', '10, 25, 47'); // dark blue
    document.documentElement.style.setProperty('--color-bg-medium', '23, 42, 70'); // medium blue
    document.documentElement.style.setProperty('--color-bg-light', '15, 23, 42'); // light blue
    document.documentElement.style.setProperty('--color-accent', '255, 107, 107'); // coral accent
    document.documentElement.style.setProperty('--color-text', '255, 255, 255'); // white text
    document.documentElement.style.setProperty('--color-text-light', '247, 250, 252'); // light gray text
    document.documentElement.style.setProperty('--color-error', '255, 107, 107'); // error color
    document.documentElement.style.setProperty('--color-success', '34, 197, 94'); // success color
    document.documentElement.style.setProperty('--transition-default', 'all 0.2s ease'); // transitions

    // Update body background
    document.body.style.backgroundColor = '#0a192f';
    document.body.style.color = 'white';
  }, []);

  return null;
};

function App() {
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showTimeSeries, setShowTimeSeries] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

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
    <MapProvider>
      <GlobalStyles />
      <Layout 
        showNotification={showNotification}
        toggleTimeSeries={toggleTimeSeries}
        toggleComparison={toggleComparison}
      >
        <AppMap />
        <Sidebar 
          showNotification={showNotification} 
          toggleTimeSeries={toggleTimeSeries}
          toggleComparison={toggleComparison}
        />
        <RightSidebar showNotification={showNotification} />
        <PromptForm 
          showNotification={showNotification} 
          showLoading={showLoading}
          hideLoading={hideLoading}
        />
        <DrawingTools showNotification={showNotification} />
        
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
  );
}

export default App;