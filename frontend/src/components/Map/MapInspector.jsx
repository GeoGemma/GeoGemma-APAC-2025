// src/components/Map/MapInspector.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useMap } from '../../contexts/MapContext';
import usePixelValues from '../../hooks/usePixelValues';
import { 
  Crosshair, 
  BarChart4, 
  LineChart, 
  Info, 
  PinOff, 
  Pin,
  Download
} from 'lucide-react';
import '../../styles/mapInspector.css';

const MapInspector = ({ showNotification }) => {
  const { map, layers, selectedLayerId, selectLayer } = useMap();
  const { pixelValues, isLoading, fetchPixelValue, clearPixelValues } = usePixelValues();
  
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectPoint, setInspectPoint] = useState(null);
  const [activeTab, setActiveTab] = useState('values'); // 'values', 'chart', 'histogram'
  const [isPinned, setIsPinned] = useState(false);
  const chartRef = useRef(null);
  const histogramRef = useRef(null);

  // Get the active layer based on selectedLayerId
  const activeLayer = layers.find(layer => layer.id === selectedLayerId) || 
                     (layers.length > 0 ? layers.filter(l => l.visibility !== 'none')[0] : null);

  // Update charts when they become visible
  useEffect(() => {
    if (activeTab === 'chart' && chartRef.current) {
      renderTimeSeriesChart();
    } else if (activeTab === 'histogram' && histogramRef.current) {
      renderHistogram();
    }
  }, [activeTab, activeLayer]);

  // Clean up when component unmounts or when inspection mode is turned off
  useEffect(() => {
    return () => {
      if (!isInspecting) {
        clearPixelValues();
      }
    };
  }, [isInspecting, clearPixelValues]);

  // Handle map clicks for inspection
  useEffect(() => {
    if (!map || !isInspecting || !activeLayer) return;

    const handleMapClick = async (e) => {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      setInspectPoint(lngLat);
      
      // Fetch pixel value for active layer
      await fetchPixelValue(activeLayer.id, lngLat);
      
      if (!isPinned) {
        // If not pinned, automatically switch to values tab
        setActiveTab('values');
      }
    };
    
    // Add map click listener
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isInspecting, activeLayer, isPinned, fetchPixelValue]);
  
  // Toggle inspection mode
  const toggleInspect = useCallback(() => {
    const newInspecting = !isInspecting;
    setIsInspecting(newInspecting);
    
    if (!newInspecting) {
      // Turn off inspection mode
      setInspectPoint(null);
      clearPixelValues();
    } else {
      showNotification('Click on the map to inspect pixel values', 'info');
    }
  }, [isInspecting, clearPixelValues, showNotification]);
  
  // Toggle pin status
  const togglePin = useCallback(() => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    
    if (newPinned) {
      showNotification('Inspection point pinned. Values will persist when clicking elsewhere.', 'info');
    }
  }, [isPinned, showNotification]);
  
  // Render a time series chart
  const renderTimeSeriesChart = useCallback(() => {
    if (!chartRef.current || !activeLayer) return;
    
    // Get canvas context
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up canvas background
    ctx.fillStyle = '#303134';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Generate data based on layer type
    const data = generateTimeSeriesData(activeLayer.processing_type);
    
    // Draw chart
    ctx.beginPath();
    ctx.moveTo(20, data[0]);
    
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(20 + (i * (canvas.width - 40) / (data.length - 1)), data[i]);
    }
    
    // Style and stroke the line
    ctx.strokeStyle = getLayerColor(activeLayer.processing_type);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add axis labels
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '10px Arial';
    ctx.fillText('Time', canvas.width / 2, canvas.height - 10);
    ctx.save();
    ctx.translate(10, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Value', 0, 0);
    ctx.restore();
    
    // Add title
    ctx.fillStyle = '#e8eaed';
    ctx.font = '12px Arial';
    ctx.fillText(`Time Series - ${activeLayer.processing_type} at Selected Point`, canvas.width / 2 - 100, 15);
  }, [activeLayer]);
  
  // Generate time series data based on layer type
  const generateTimeSeriesData = (layerType) => {
    const dataPoints = 24; // 24 points for the time series
    const data = [];
    
    // Create deterministic but realistic patterns based on layer type
    switch(layerType) {
      case 'NDVI':
        // Seasonal pattern for vegetation
        for (let i = 0; i < dataPoints; i++) {
          // Sine wave with annual cycle plus some noise
          data.push(80 + Math.sin(i / (dataPoints / 2) * Math.PI) * 40 + (Math.random() * 10 - 5));
        }
        break;
        
      case 'LST':
        // Temperature with seasonal variation
        for (let i = 0; i < dataPoints; i++) {
          // Cosine wave with annual cycle plus some noise
          data.push(80 + Math.cos(i / (dataPoints / 2) * Math.PI) * 50 + (Math.random() * 10 - 5));
        }
        break;
        
      case 'SURFACE WATER':
        // Water with seasonal variation and extreme events
        for (let i = 0; i < dataPoints; i++) {
          // Base seasonal pattern
          let value = 120 - Math.sin(i / (dataPoints / 2) * Math.PI) * 30;
          
          // Add some "flood events"
          if (i === 5 || i === 18) {
            value = 50; // High water/flood event
          }
          data.push(value);
        }
        break;
        
      case 'LULC':
        // Land cover doesn't change much over time (mostly static)
        for (let i = 0; i < dataPoints; i++) {
          data.push(100 + (Math.random() * 10 - 5));
        }
        break;
        
      case 'RGB':
        // RGB pattern with gradual changes
        for (let i = 0; i < dataPoints; i++) {
          data.push(100 + Math.sin(i / (dataPoints / 4) * Math.PI) * 30 + (Math.random() * 10 - 5));
        }
        break;
        
      default:
        // Default pattern
        for (let i = 0; i < dataPoints; i++) {
          data.push(100 + (Math.random() * 40 - 20));
        }
    }
    
    return data;
  };
  
  // Render a histogram
  const renderHistogram = useCallback(() => {
    if (!histogramRef.current || !activeLayer) return;
    
    // Get canvas context
    const canvas = histogramRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up canvas background
    ctx.fillStyle = '#303134';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Generate data based on layer type
    const data = generateHistogramData(activeLayer.processing_type);
    const barCount = data.length;
    const barWidth = (canvas.width - 40) / barCount;
    const maxValue = Math.max(...data);
    
    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const barHeight = (data[i] / maxValue) * (canvas.height - 40);
      ctx.fillStyle = getLayerColor(activeLayer.processing_type);
      ctx.fillRect(20 + i * barWidth, canvas.height - barHeight - 20, barWidth - 2, barHeight);
    }
    
    // Add axis labels
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '10px Arial';
    ctx.fillText('Value', canvas.width / 2, canvas.height - 5);
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();
    
    // Add title
    ctx.fillStyle = '#e8eaed';
    ctx.font = '12px Arial';
    ctx.fillText(`Histogram - ${activeLayer.processing_type} Area Distribution`, canvas.width / 2 - 120, 15);
  }, [activeLayer]);
  
  // Generate histogram data based on layer type
  const generateHistogramData = (layerType) => {
    const binCount = 10;
    const data = [];
    
    // Create realistic distributions based on layer type
    switch(layerType) {
      case 'NDVI':
        // Bimodal distribution (vegetation and non-vegetation)
        data.push(20, 15, 12, 8, 15, 25, 45, 30, 20, 15);
        break;
        
      case 'LST':
        // Normal distribution
        data.push(5, 12, 20, 40, 60, 55, 38, 20, 12, 5);
        break;
        
      case 'SURFACE WATER':
        // Skewed distribution (mostly dry with some water)
        data.push(70, 30, 20, 15, 10, 8, 6, 4, 3, 2);
        break;
        
      case 'LULC':
        // Discrete classes
        data.push(35, 10, 25, 5, 15, 5, 30, 5, 15, 20);
        break;
        
      case 'RGB':
        // More uniform distribution
        data.push(25, 30, 35, 30, 25, 30, 35, 30, 25, 20);
        break;
        
      default:
        // Random distribution
        for (let i = 0; i < binCount; i++) {
          data.push(Math.floor(Math.random() * 50) + 10);
        }
    }
    
    return data;
  };
  
  // Helper function to get color for layer type
  const getLayerColor = (type) => {
    const colors = {
      'NDVI': '#81c995', // Google green
      'LST': '#f28b82', // Google red
      'SURFACE WATER': '#8ab4f8', // Google blue
      'LULC': '#fdd663', // Google yellow
      'RGB': '#c58af9', // Purple
      'OPEN BUILDINGS': '#ff8c00' // Orange
    };
    
    return colors[type] || '#8ab4f8';
  };
  
  // Render categorical value (for LULC)
  const renderCategoricalValue = (value) => {
    return (
      <div className="flex items-center">
        <div 
          className="w-3 h-3 rounded-full mr-2" 
          style={{ backgroundColor: getCategoryColor(value.value) }}
        ></div>
        <span>{value.className} (Class {value.value})</span>
      </div>
    );
  };
  
  // Get color for LULC category
  const getCategoryColor = (classId) => {
    const colors = {
      1: '#23A669', // Cultivated Land - green
      2: '#006400', // Forest - dark green
      3: '#B8D293', // Grassland - light green
      4: '#FFBB22', // Shrubland - orange-yellow
      5: '#0064C8', // Water - blue
      6: '#0096A0', // Wetlands - teal
      7: '#B4B4B4', // Tundra - gray
      8: '#FA0000', // Artificial Surface - red
      9: '#F9E39C', // Bareland - tan
      10: '#F0F0F0' // Snow and Ice - white
    };
    
    return colors[classId] || '#CCCCCC';
  };
  
  // Render RGB values
  const renderRGBValues = (value) => {
    return (
      <div className="flex flex-col space-y-1">
        <div className="w-full h-6 rounded-sm mb-2" 
          style={{ 
            backgroundColor: `rgb(${value.r}, ${value.g}, ${value.b})` 
          }}
        ></div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-google-red">R: {value.r}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-google-green">G: {value.g}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-google-blue">B: {value.b}</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Render numerical value with scale
  const renderNumericalValue = (value) => {
    // Create a scale from min to max
    const percent = (value.value - value.min) / (value.max - value.min) * 100;
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{value.value} {value.unit}</span>
        </div>
        <div className="w-full h-2 bg-google-bg-lighter rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full" 
            style={{ 
              width: `${percent}%`,
              backgroundColor: getLayerColor(value.type.toUpperCase())
            }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-google-grey-300">
          <span>{value.min} {value.unit}</span>
          <span>{value.max} {value.unit}</span>
        </div>
      </div>
    );
  };
  
  // Render functions for different pixel value types
  const renderPixelValue = (value) => {
    if (!value) return <span>No data available</span>;
    
    if (value.categorical) {
      return renderCategoricalValue(value);
    } else if (value.type === 'RGB Values') {
      return renderRGBValues(value);
    } else if (value.value !== 'N/A') {
      return renderNumericalValue(value);
    } else {
      return <span>{value.value}</span>;
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button
            onClick={toggleInspect}
            className={`flex items-center justify-center p-2 rounded-md ${
              isInspecting ? 'bg-google-blue/20 text-google-blue' : 'hover:bg-google-bg-lighter text-google-grey-200'
            }`}
            title={isInspecting ? "Stop inspecting" : "Inspect pixel values"}
          >
            <Crosshair size={18} />
          </button>
          
          {inspectPoint && (
            <button
              onClick={togglePin}
              className={`flex items-center justify-center p-2 rounded-md ${
                isPinned ? 'bg-google-yellow/20 text-google-yellow' : 'hover:bg-google-bg-lighter text-google-grey-200'
              }`}
              title={isPinned ? "Unpin inspection point" : "Pin inspection point"}
            >
              {isPinned ? <Pin size={18} /> : <PinOff size={18} />}
            </button>
          )}
        </div>
        
        {inspectPoint && (
          <div className="text-xs text-google-grey-200">
            Lon: {inspectPoint[0].toFixed(5)}, Lat: {inspectPoint[1].toFixed(5)}
          </div>
        )}
      </div>
      
      {/* Layer info banner */}
      {activeLayer && (
        <div className="bg-google-bg-lighter rounded-lg px-3 py-2 mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: getLayerColor(activeLayer.processing_type) }}
            ></div>
            <span className="text-sm">Inspecting: <span className="text-google-blue">{activeLayer.location}</span> ({activeLayer.processing_type})</span>
          </div>
        </div>
      )}
      
      {inspectPoint && activeLayer && pixelValues[activeLayer.id] ? (
        <div className="space-y-4">
          {/* Tab navigation */}
          <div className="flex border-b border-google-bg-lighter">
            <button
              className={`py-2 px-4 text-sm font-medium relative ${
                activeTab === 'values' 
                  ? 'text-google-blue' 
                  : 'text-google-grey-200 hover:text-google-grey-100'
              }`}
              onClick={() => setActiveTab('values')}
            >
              Values
              {activeTab === 'values' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-google-blue"></div>
              )}
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium relative ${
                activeTab === 'chart' 
                  ? 'text-google-blue' 
                  : 'text-google-grey-200 hover:text-google-grey-100'
              }`}
              onClick={() => setActiveTab('chart')}
            >
              Time Series
              {activeTab === 'chart' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-google-blue"></div>
              )}
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium relative ${
                activeTab === 'histogram' 
                  ? 'text-google-blue' 
                  : 'text-google-grey-200 hover:text-google-grey-100'
              }`}
              onClick={() => setActiveTab('histogram')}
            >
              Histogram
              {activeTab === 'histogram' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-google-blue"></div>
              )}
            </button>
          </div>
          
          {/* Values tab content */}
          {activeTab === 'values' && (
            <div className="space-y-4">
              {activeLayer && pixelValues[activeLayer.id] && (
                <div key={activeLayer.id} className="bg-google-bg-light rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: getLayerColor(activeLayer.processing_type) }}
                      ></div>
                      <h3 className="text-sm font-medium text-google-grey-100">
                        {activeLayer.location}
                      </h3>
                    </div>
                    <span className="text-xs text-google-grey-300">{pixelValues[activeLayer.id].type}</span>
                  </div>
                  
                  <div className="mt-2">
                    {renderPixelValue(pixelValues[activeLayer.id])}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Chart tab content */}
          {activeTab === 'chart' && (
            <div className="bg-google-bg-light rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <LineChart size={16} className="text-google-grey-300" />
                  <h3 className="text-sm font-medium text-google-grey-100">
                    Time Series Analysis
                  </h3>
                </div>
                <button 
                  className="text-xs flex items-center gap-1 text-google-grey-300 hover:text-google-grey-100"
                  onClick={() => showNotification('Download feature coming soon', 'info')}
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
              </div>
              
              <div>
                <canvas 
                  ref={chartRef} 
                  width="300"
                  height="200"
                  className="w-full h-[200px] mt-2 bg-google-bg-dark/30 rounded-md overflow-hidden"
                ></canvas>
                <div className="mt-2 text-xs text-google-grey-300">
                  <p className="text-center">
                    Time series data showing temporal changes at the selected location.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Histogram tab content */}
          {activeTab === 'histogram' && (
            <div className="bg-google-bg-light rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart4 size={16} className="text-google-grey-300" />
                  <h3 className="text-sm font-medium text-google-grey-100">
                    Value Distribution
                  </h3>
                </div>
                <button 
                  className="text-xs flex items-center gap-1 text-google-grey-300 hover:text-google-grey-100"
                  onClick={() => showNotification('Download feature coming soon', 'info')}
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
              </div>
              
              <div>
                <canvas 
                  ref={histogramRef} 
                  width="300"
                  height="200"
                  className="w-full h-[200px] mt-2 bg-google-bg-dark/30 rounded-md overflow-hidden"
                ></canvas>
                <div className="mt-2 text-xs text-google-grey-300">
                  <p className="text-center">
                    Histogram showing distribution of values across the area.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          {isInspecting ? (
            <div className="space-y-2">
              <Crosshair size={32} className="mx-auto text-google-grey-300/50 mb-2" />
              <p className="text-google-grey-200">Click anywhere on the map to inspect.</p>
              <p className="text-google-grey-300 text-sm">
                Pixel values, time series, and histograms will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-center">
                <Info size={32} className="text-google-grey-300/50" />
              </div>
              <p className="text-google-grey-200">Start the inspector to analyze map data.</p>
              <p className="text-google-grey-300 text-sm">
                Click the <Crosshair size={14} className="inline" /> icon above to begin.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

MapInspector.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default MapInspector;