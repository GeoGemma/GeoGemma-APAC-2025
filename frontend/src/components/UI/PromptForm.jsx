// src/components/UI/PromptForm.jsx
import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Search, Mic, X, Send, Clock } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { geocodeLocation, analyzePrompt } from '../../services/api';
import { generateLayerId } from '../../utils/mapUtils';
import '../../styles/promptForm.css';

const PromptForm = ({ showNotification, showLoading, hideLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const promptRef = useRef(null);
  const inputRef = useRef(null);
  const { addLayer, addMarker, flyToLocation, clearMarkers } = useMap();
  
  // Create separate prompt categories to allow for better organization
  const examplePromptCategories = [
    {
      name: "Popular",
      prompts: [
        "Show NDVI vegetation in Paris for 2023",
        "Land surface temperature in Dubai during summer 2022", 
        "Surface water change in Lake Mead since 2000"
      ]
    },
    {
      name: "You might like",
      prompts: [
        "Urban growth in Shanghai between 2015-2023",
        "Detect burned areas in California after 2021 wildfires"
      ]
    }
  ];
  
  // Recent search history (could be stored in local storage in a real app)
  const recentSearches = [
    "NDVI Bangalore 2023",
    "Surface water in Venice"
  ];
  
  useEffect(() => {
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
        const { 
          location, 
          processing_type, 
          tile_url, 
          latitude, 
          longitude,
          metadata // Ensure we capture the metadata from the API response
        } = result.data;
        
        if (tile_url) {
          console.log('Tile URL:', tile_url);
          console.log('Metadata:', metadata);
          
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
            visibility: 'visible',
            metadata: metadata // Include metadata in the layer object
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
          
          // Format a more descriptive response text that includes metadata highlights if available
          if (metadata) {
            responseText = `I've added ${processing_type || 'imagery'} layer for ${location}. `;
            
            // Add metadata highlights
            if (metadata.STATUS === 'Metadata Processed Successfully' || metadata.Status === 'Metadata Processed Successfully') {
              // Include some key metadata in the response
              if (metadata.IMAGE_DATE || metadata['IMAGE DATE']) {
                responseText += `Image date: ${metadata.IMAGE_DATE || metadata['IMAGE DATE']}. `;
              }
              if (metadata.SOURCE_DATASET || metadata['SOURCE DATASET']) {
                responseText += `Source: ${metadata.SOURCE_DATASET || metadata['SOURCE DATASET']}. `;
              }
              
              // Add statistics if available
              const statsKey = Object.keys(metadata).find(key => key.includes('STATS'));
              if (statsKey && metadata[statsKey] && typeof metadata[statsKey] === 'object') {
                const stats = metadata[statsKey];
                if (stats.Mean) responseText += `Average value: ${stats.Mean}. `;
              }
            }
            
            responseText += "You can see it on the map now and check the Info panel for more details.";
          } else {
            responseText = `I've added ${processing_type || 'imagery'} layer for ${location}. You can see it on the map now.`;
          }
          
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
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handleClearPrompt = () => {
    setPrompt('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
    // Auto-submit the form after selecting a suggestion
    setTimeout(() => {
      if (promptRef.current) {
        const form = promptRef.current.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }, 100);
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

      {/* Suggestions dropdown with better organization */}
      {showSuggestions && (
        <div className="prompt-suggestions scale-in">
          {recentSearches.length > 0 && (
            <div className="suggestion-section">
              <div className="suggestion-header">RECENT SEARCHES</div>
              <div className="grid-suggestions">
                {recentSearches.map((item, index) => (
                  <div
                    key={`recent-${index}`}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(item)}
                  >
                    <Clock size={16} className="suggestion-icon" />
                    <span className="suggestion-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {examplePromptCategories.map((category, catIndex) => (
            <div className="suggestion-section" key={`category-${catIndex}`}>
              <div className="suggestion-header">{category.name.toUpperCase()}</div>
              <div className="grid-suggestions">
                {category.prompts.map((item, index) => (
                  <div
                    key={`example-${category.name}-${index}`}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(item)}
                  >
                    <Search size={16} className="suggestion-icon" />
                    <span className="suggestion-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
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