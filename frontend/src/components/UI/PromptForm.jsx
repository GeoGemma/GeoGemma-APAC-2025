// src/components/UI/PromptForm.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { geocodeLocation } from '../../services/api';
import { generateLayerId } from '../../utils/mapUtils';

const PromptForm = ({ showNotification, showLoading, hideLoading }) => {
  const [prompt, setPrompt] = useState('');
  const { addLayer, addMarker, flyToLocation, clearMarkers } = useMap();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      showNotification('Please enter a prompt', 'warning');
      return;
    }
    
    showLoading('Processing your request...');
    
    try {
      // Clear existing markers
      clearMarkers();
      
      // Use the API endpoint that we know works
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt })
      });
      
      console.log('Backend response status:', response.status);
      
      const result = await response.json();
      console.log('API response:', result);
      
      if (result.success && result.data) {
        const { location, processing_type, tile_url, latitude, longitude } = result.data;
        
        if (tile_url) {
          console.log('Tile URL:', tile_url);
          
          // Create a new layer ID
          const layerId = generateLayerId(location, processing_type || prompt);
          
          // Add the new layer to the map
          const newLayer = {
            id: layerId,
            tile_url: tile_url,
            location: location,
            processing_type: processing_type || prompt,
            latitude: latitude || null,
            longitude: longitude || null,
            opacity: 0.8,
            visibility: 'visible'
          };
          
          console.log("Adding new layer:", newLayer);
          addLayer(newLayer);
          
          // Handle location navigation
          if (location && location.trim() !== '') {
            if (latitude && longitude) {
              const lat = parseFloat(latitude);
              const lon = parseFloat(longitude);
              
              if (!isNaN(lat) && !isNaN(lon)) {
                addMarker(lat, lon);
                flyToLocation(location, lat, lon);
              }
            } else {
              // Try to geocode the location
              try {
                const geocodeResult = await geocodeLocation(location);
                if (geocodeResult) {
                  addMarker(geocodeResult.lat, geocodeResult.lon);
                  flyToLocation(location, geocodeResult.lat, geocodeResult.lon);
                }
              } catch (geocodeError) {
                console.error('Geocoding error:', geocodeError);
              }
            }
          }
          
          showNotification(`Added layer: ${location} (${processing_type || prompt})`, 'success');
        } else {
          showNotification('Error: No tile URL returned', 'error');
        }
      } else {
        showNotification(result.message || 'Error fetching image for this location', 'error');
      }
    } catch (error) {
      console.error('Error processing prompt:', error);
      showNotification('Failed to process the prompt: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-4/5 max-w-2xl z-10">
      <form 
        className="flex bg-background-sidebar/80 rounded-lg p-2 shadow-custom"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="prompt-input"
          placeholder="Examples: Show NDVI in Paris for 2020 | RGB imagery of Tokyo from Landsat 8"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button type="submit" className="prompt-button">
          <Search size={18} />
        </button>
      </form>
    </div>
  );
};

PromptForm.propTypes = {
  showNotification: PropTypes.func.isRequired,
  showLoading: PropTypes.func.isRequired,
  hideLoading: PropTypes.func.isRequired
};

export default PromptForm;