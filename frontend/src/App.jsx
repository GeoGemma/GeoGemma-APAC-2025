// src/App.jsx
import { useState } from 'react';
import { MapProvider } from './contexts/MapContext';
import Layout from './components/Layout/Layout';
import AppMap from './components/Map/AppMap';
import Sidebar from './components/Sidebar/Sidebar';
import PromptForm from './components/UI/PromptForm';
import Notification from './components/UI/Notification.jsx';
import StatusIndicator from './components/UI/StatusIndicator.jsx';

function App() {
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

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

  return (
    <MapProvider>
      <Layout>
        <AppMap />
        <Sidebar showNotification={showNotification} />
        <PromptForm 
          showNotification={showNotification} 
          showLoading={showLoading}
          hideLoading={hideLoading}
        />
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