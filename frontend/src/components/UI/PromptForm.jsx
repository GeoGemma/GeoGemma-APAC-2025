// src/components/UI/PromptForm.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Search, Mic } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { geocodeLocation } from '../../services/api';
import { generateLayerId } from '../../utils/mapUtils';
import '../../styles/topbar.css';

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
      // Emit event for chat history to capture the prompt
      const promptEvent = new CustomEvent('prompt-submitted', {
        detail: { prompt: prompt, response: null }
      });
      window.dispatchEvent(promptEvent);
      
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
      
      // Response to show in chat
      let responseText = '';
      
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
          
          responseText = `Added ${processing_type || 'imagery'} layer for ${location}`;
          showNotification(`Added layer: ${location} (${processing_type || prompt})`, 'success');
        } else {
          responseText = 'Error: No visualization could be generated for this request.';
          showNotification('Error: No tile URL returned', 'error');
        }
      } else {
        responseText = result.message || 'Error fetching image for this location';
        showNotification(responseText, 'error');
      }
      
      // Emit event with the response
      const responseEvent = new CustomEvent('prompt-submitted', {
        detail: { prompt, response: responseText }
      });
      window.dispatchEvent(responseEvent);
      
      // Clear the input
      setPrompt('');
      
    } catch (error) {
      console.error('Error processing prompt:', error);
      const errorMessage = 'Failed to process the prompt: ' + (error.message || 'Unknown error');
      
      // Emit event with the error
      const errorEvent = new CustomEvent('prompt-submitted', {
        detail: { prompt, response: errorMessage }
      });
      window.dispatchEvent(errorEvent);
      
      showNotification(errorMessage, 'error');
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[30rem] max-w-xl z-10">
      <form 
        className="flex items-center bg-background-dark/90 rounded-full py-1.5 px-3 elevation-1 shadow-md"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center px-2 text-google-grey-300">
          <Search size={18} />
        </div>
        <input
          type="text"
          className="flex-1 p-1.5 bg-transparent border-none text-google-grey-100 text-base focus:outline-none font-roboto placeholder-google-grey-400"
          placeholder="Search for Earth imagery..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button 
          type="button" 
          className="p-1.5 bg-transparent border-none cursor-pointer text-google-grey-300 hover:text-primary rounded-full"
          title="Voice search"
        >
          <Mic size={18} />
        </button>
        <button 
          type="submit" 
          className="p-1.5 bg-primary text-white border-none rounded-full cursor-pointer w-8 h-8 flex items-center justify-center transition-all hover:bg-primary-dark active:scale-95 ml-1"
          title="Search"
        >
          <Search size={16} />
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