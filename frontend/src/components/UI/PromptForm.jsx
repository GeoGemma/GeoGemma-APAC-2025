// src/components/UI/PromptForm.jsx
import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Search, Mic, X, Sparkles } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { geocodeLocation, analyzePrompt } from '../../services/api';
import { generateLayerId } from '../../utils/mapUtils';
import '../../styles/promptForm.css';

const PromptForm = ({ showNotification, showLoading, hideLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentPrompts, setRecentPrompts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const promptRef = useRef(null);
  const inputRef = useRef(null);
  const { addLayer, addMarker, flyToLocation, clearMarkers } = useMap();
  
  // Example suggestions for different types of prompts
  const suggestions = [
    "Show NDVI for New York City in 2022",
    "RGB imagery of Amazon rainforest",
    "Surface water in Lake Victoria",
    "Land use in Paris, France",
    "Land surface temperature in Cairo for summer 2021"
  ];

  useEffect(() => {
    // Load recent prompts from local storage
    const savedPrompts = localStorage.getItem('recentPrompts');
    if (savedPrompts) {
      try {
        setRecentPrompts(JSON.parse(savedPrompts).slice(0, 5));
      } catch (e) {
        console.error('Error parsing saved prompts:', e);
      }
    }
    
    // Add click outside handler for suggestions
    const handleClickOutside = (event) => {
      if (promptRef.current && !promptRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      showNotification('Please enter a prompt', 'warning');
      return;
    }
    
    // Save to recent prompts
    const updatedPrompts = [prompt, ...recentPrompts.filter(p => p !== prompt)].slice(0, 5);
    setRecentPrompts(updatedPrompts);
    localStorage.setItem('recentPrompts', JSON.stringify(updatedPrompts));
    
    showLoading('Processing your request...');
    
    try {
      // Emit event for chat history to capture the prompt
      const promptEvent = new CustomEvent('prompt-submitted', {
        detail: { prompt: prompt, response: null }
      });
      window.dispatchEvent(promptEvent);
      
      // Clear existing markers
      clearMarkers();
      
      // Use the API service function instead of direct fetch
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
          
          responseText = `Added ${processing_type || 'imagery'} layer for ${location}`;
          showNotification(`Added layer: ${location} (${processing_type || prompt})`, 'success');
        } else {
          responseText = 'Error: No visualization could be generated for this request.';
          showNotification('Error: No tile URL returned', 'error');
        }
      } else {
        responseText = result && result.message ? result.message : 'Error fetching image for this location';
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
      let errorMessage = 'Failed to process the prompt';
      
      if (error.response) {
        errorMessage += `: ${error.response.data?.message || error.response.statusText || 'Server error'}`;
      } else if (error.request) {
        errorMessage += ': No response from server. Please check your connection.';
      } else {
        errorMessage += `: ${error.message || 'Unknown error'}`;
      }
      
      // Emit event with the error
      const errorEvent = new CustomEvent('prompt-submitted', {
        detail: { prompt, response: errorMessage }
      });
      window.dispatchEvent(errorEvent);
      
      showNotification(errorMessage, 'error');
    } finally {
      hideLoading();
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handlePromptSelect = (selectedPrompt) => {
    setPrompt(selectedPrompt);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
          <Search size={16} />
        </button>
      </form>

      {showSuggestions && (
        <div className="prompt-suggestions scale-in">
          {recentPrompts.length > 0 && (
            <div className="suggestion-section">
              <div className="suggestion-header">Recent Searches</div>
              {recentPrompts.map((recentPrompt, index) => (
                <div 
                  key={`recent-${index}`} 
                  className="suggestion-item"
                  onClick={() => handlePromptSelect(recentPrompt)}
                >
                  <Search size={14} className="suggestion-icon" />
                  <span>{recentPrompt}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="suggestion-section">
            <div className="suggestion-header">Try These</div>
            {suggestions.map((suggestion, index) => (
              <div 
                key={`suggestion-${index}`} 
                className="suggestion-item"
                onClick={() => handlePromptSelect(suggestion)}
              >
                <Sparkles size={14} className="suggestion-icon" />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

PromptForm.propTypes = {
  showNotification: PropTypes.func.isRequired,
  showLoading: PropTypes.func.isRequired,
  hideLoading: PropTypes.func.isRequired
};

export default PromptForm;