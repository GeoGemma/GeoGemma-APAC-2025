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
import StatusIndicator from './components/UI/StatusIndicator.jsx'; // Ensure this is imported
// --- Remove Analysis component imports if done previously ---
// import TimeSeriesAnalysis from './components/Analysis/TimeSeriesAnalysis.jsx';
// import ComparisonAnalysis from './components/Analysis/ComparisonAnalysis.jsx';
import './styles/font.css';
import './styles/mapLegend.css'; // Keep if needed
import './styles/metadata.css'; // Keep if needed
import './styles/profileMenu.css'; // Keep if needed

// GlobalStyles component remains the same
const GlobalStyles = () => { /* ... */ };

function App() {
  const [notification, setNotification] = useState(null);
  // --- RE-ADD isLoading and loadingMessage state ---
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  // --- END RE-ADD ---
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const toggleSidebar = (expanded) => {
    setSidebarExpanded(expanded);
  };

  const showNotification = (message, type = 'info', duration = 3000) => {
    setNotification({ id: Date.now(), message, type, duration });
  };

   const handleCloseNotification = () => {
     setNotification(null);
   }

  // --- RE-ADD showLoading and hideLoading functions ---
  const showLoading = (message = 'Processing...') => {
    console.log("Showing loading:", message); // Add console log
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    console.log("Hiding loading"); // Add console log
    setIsLoading(false);
    setLoadingMessage(''); // Clear message
  };
  // --- END RE-ADD ---

  // Removed toggleTimeSeries/toggleComparison if done previously

  return (
    <AuthProvider>
      <MapProvider>
        <GlobalStyles />
        <Layout sidebarExpanded={sidebarExpanded} showNotification={showNotification}>
          <Sidebar
            showNotification={showNotification}
            onToggleSidebar={toggleSidebar}
          />
          <AppMap />
          <RightSidebar showNotification={showNotification} />
          {/* --- RE-ADD showLoading/hideLoading props --- */}
          <PromptForm
            showNotification={showNotification}
            showLoading={showLoading} // Pass function
            hideLoading={hideLoading} // Pass function
          />

          {/* --- Render Notification component --- */}
          {notification && (
            <Notification
              key={notification.id}
              message={notification.message}
              type={notification.type}
              duration={notification.duration}
              onClose={handleCloseNotification}
            />
          )}

          {/* --- RE-ADD StatusIndicator conditional rendering --- */}
          {isLoading && (
            <StatusIndicator message={loadingMessage} />
          )}
          {/* --- END RE-ADD --- */}

          {/* Remove ProcessingNotification if you don't have it */}
          {/* <ProcessingNotification /> */}
        </Layout>
      </MapProvider>
    </AuthProvider>
  );
}

export default App;