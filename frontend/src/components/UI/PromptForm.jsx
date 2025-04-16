// src/components/UI/PromptForm.jsx
import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Search, Mic, X, Send } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { geocodeLocation, analyzePrompt } from '../../services/api';
import { generateLayerId } from '../../utils/mapUtils';
import '../../styles/promptForm.css';

const PromptForm = ({ showNotification, showLoading, hideLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const promptRef = useRef(null);
  const inputRef = useRef(null);
  const { addLayer, addMarker, flyToLocation, clearMarkers } = useMap();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      showNotification('Please enter a prompt', 'warning');
      return;
    }
    
    showLoading('Processing your request...');
    
    try {
      // Emit event for chat to capture the prompt
      const promptEvent = new CustomEvent('prompt-submitted', {
        detail: { prompt: prompt, response: null }
      });
      window.dispatchEvent(promptEvent);
      
      // Clear existing markers
      clearMarkers();
      
      // Use the API service function
      const result = await analyzePrompt(prompt);
      
      console.log('API response:', result);
      
      // Response to show in chat
      let responseText = '';
      
      if (result && result.success && result.data) {
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
          
          responseText = `I've added ${processing_type || 'imagery'} layer for ${location}. You can see it on the map now.`;
          showNotification(`Added layer: ${location} (${processing_type || prompt})`, 'success');
        } else {
          responseText = 'I couldn\'t generate a visualization for this request. Please try a different location or data type.';
          showNotification('Error: No visualization data available', 'error');
        }
      } else {
        responseText = result && result.message 
          ? `I couldn't process that request: ${result.message}` 
          : 'I couldn\'t find imagery for that location. Could you try a more specific request?';
        showNotification(responseText, 'error');
      }
      
      // Emit event with the response to update chat
      const responseEvent = new CustomEvent('prompt-submitted', {
        detail: { prompt: null, response: responseText }
      });
      window.dispatchEvent(responseEvent);
      
      // Clear the input
      setPrompt('');
      
    } catch (error) {
      console.error('Error processing prompt:', error);
      let errorMessage = 'There was a problem processing your request';
      
      if (error.response) {
        errorMessage += `: ${error.response.data?.message || error.response.statusText || 'Server error'}`;
      } else if (error.request) {
        errorMessage += ': No response from server. Please check your connection.';
      } else {
        errorMessage += `: ${error.message || 'Unknown error'}`;
      }
      
      // Emit event with the error to update chat
      const errorEvent = new CustomEvent('prompt-submitted', {
        detail: { prompt: null, response: errorMessage }
      });
      window.dispatchEvent(errorEvent);
      
      showNotification(errorMessage, 'error');
    } finally {
      hideLoading();
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleClearPrompt = () => {
    setPrompt('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`prompt-container ${isFocused ? 'focused' : ''}`} ref={promptRef}>
      <form 
        className="prompt-form"
        onSubmit={handleSubmit}
      >
        <div className="prompt-icon">
          <Search size={18} />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="prompt-input"
          placeholder="Search for Earth imagery..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={() => setIsFocused(false)}
        />
        {prompt && (
          <button 
            type="button" 
            className="prompt-clear"
            onClick={handleClearPrompt}
            title="Clear input"
          >
            <X size={16} />
          </button>
        )}
        <button 
          type="button" 
          className="prompt-voice"
          title="Voice search"
        >
          <Mic size={18} />
        </button>
        <button 
          type="submit" 
          className="prompt-submit"
          title="Search"
        >
          <Send size={16} />
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