import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useMap } from '../../contexts/MapContext';
import { 
  Crosshair, 
  BarChart4, 
  LineChart, 
  Layers, 
  Info, 
  PinOff, 
  Pin,
  Download
} from 'lucide-react';
import '../../styles/mapInspector.css';

const MapInspector = ({ showNotification }) => {
  const { map, layers } = useMap();
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectPoint, setInspectPoint] = useState(null);
  const [pixelValues, setPixelValues] = useState(null);
  const [activeLayers, setActiveLayers] = useState([]);
  const [activeTab, setActiveTab] = useState('values'); // 'values', 'chart', 'histogram'
  const [isPinned, setIsPinned] = useState(false);
  const chartRef = useRef(null);
  const histogramRef = useRef(null);

  // Effect to handle map click events for inspection
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (e) => {
      if (!isInspecting || !layers.length) return;
      
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      setInspectPoint(lngLat);
      
      // Mock pixel values retrieval - in a real implementation, this would call Earth Engine
      // or other backend services to get the actual pixel values at this location
      const mockPixelValues = {};
      
      // For each visible layer, try to get pixel values
      const visibleLayers = layers.filter(layer => layer.visibility !== 'none');
      
      // Set active layers for inspection
      setActiveLayers(visibleLayers);
      
      // Generate mock pixel values for each layer type
      visibleLayers.forEach(layer => {
        const layerType = layer.processing_type;
        
        switch(layerType) {
          case 'NDVI':
            mockPixelValues[layer.id] = {
              type: 'NDVI',
              value: (Math.random() * 0.8 - 0.1).toFixed(3),
              unit: '',
              min: -0.2,
              max: 0.8,
              metadata: layer.metadata
            };
            break;
          case 'LST':
            mockPixelValues[layer.id] = {
              type: 'Land Surface Temperature',
              value: (Math.random() * 40 + 5).toFixed(1),
              unit: '°C',
              min: 0,
              max: 50,
              metadata: layer.metadata
            };
            break;
          case 'SURFACE WATER':
            mockPixelValues[layer.id] = {
              type: 'Surface Water Occurrence',
              value: (Math.random() * 100).toFixed(0),
              unit: '%',
              min: 0,
              max: 100,
              metadata: layer.metadata
            };
            break;
          case 'LULC':
            const lulcClasses = {
              0: 'No Data',
              1: 'Cultivated Land',
              2: 'Forest',
              3: 'Grassland',
              4: 'Shrubland',
              5: 'Water',
              6: 'Wetlands',
              7: 'Tundra',
              8: 'Artificial Surface',
              9: 'Bareland',
              10: 'Snow and Ice'
            };
            const classId = Math.floor(Math.random() * 10) + 1;
            mockPixelValues[layer.id] = {
              type: 'Land Use / Land Cover',
              value: classId,
              className: lulcClasses[classId],
              unit: '',
              categorical: true,
              metadata: layer.metadata
            };
            break;
          case 'RGB':
            mockPixelValues[layer.id] = {
              type: 'RGB Values',
              r: Math.floor(Math.random() * 255),
              g: Math.floor(Math.random() * 255),
              b: Math.floor(Math.random() * 255),
              categorical: false,
              metadata: layer.metadata
            };
            break;
          case 'OPEN BUILDINGS':
            mockPixelValues[layer.id] = {
              type: 'Building Height',
              value: (Math.random() * 50).toFixed(1),
              unit: 'm',
              min: 0,
              max: 50,
              metadata: layer.metadata
            };
            break;
          default:
            mockPixelValues[layer.id] = {
              type: layerType,
              value: 'N/A',
              unit: '',
              metadata: layer.metadata
            };
        }
      });
      
      // Update state with the pixel values
      setPixelValues(mockPixelValues);
      
      if (!isPinned) {
        // If not pinned, automatically switch to values tab
        setActiveTab('values');
      }
    };
    
    // Add map click listener
    if (isInspecting) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getCanvas().style.cursor = '';
      map.off('click', handleMapClick);
    }
    
    return () => {
      map.off('click', handleMapClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isInspecting, layers, isPinned]);
  
  // Effect to render charts and histograms when data is available
  useEffect(() => {
    if (activeTab === 'chart' && pixelValues && chartRef.current) {
      renderTimeSeriesChart();
    }
    
    if (activeTab === 'histogram' && pixelValues && histogramRef.current) {
      renderHistogram();
    }
  }, [pixelValues, activeTab]);
  
  // Toggle inspection mode
  const toggleInspect = () => {
    setIsInspecting(!isInspecting);
    if (isInspecting) {
      // Turn off inspection mode
      setInspectPoint(null);
      setPixelValues(null);
    } else {
      showNotification('Click on the map to inspect pixel values', 'info');
    }
  };
  
  // Toggle pin status
  const togglePin = () => {
    setIsPinned(!isPinned);
    if (!isPinned) {
      showNotification('Inspection point pinned. Values will persist when clicking elsewhere.', 'info');
    }
  };
  
  // Render a mock time series chart
  const renderTimeSeriesChart = () => {
    if (!chartRef.current || !pixelValues || !activeLayers.length) return;
    
    // In a real implementation, this would use D3.js or another charting library
    // For the prototype, we'll just show a placeholder
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up canvas
    ctx.fillStyle = '#303134';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw mock chart
    ctx.beginPath();
    ctx.moveTo(20, 150);
    
    // Draw a sine wave
    for (let x = 0; x < canvas.width - 40; x++) {
      const y = 80 + Math.sin(x * 0.05) * 40 + (Math.random() * 10 - 5);
      ctx.lineTo(x + 20, y);
    }
    
    // Style and stroke the line
    ctx.strokeStyle = getLayerColor(activeLayers[0].processing_type);
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
    ctx.fillText(`Time Series - ${activeLayers[0].processing_type} at Selected Point`, canvas.width / 2 - 100, 15);
  };
  
  // Render a mock histogram
  const renderHistogram = () => {
    if (!histogramRef.current || !pixelValues || !activeLayers.length) return;
    
    // In a real implementation, this would use D3.js or another charting library
    // For the prototype, we'll just show a placeholder
    const canvas = histogramRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up canvas
    ctx.fillStyle = '#303134';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw mock histogram bars
    const barCount = 10;
    const barWidth = (canvas.width - 40) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = 20 + Math.random() * 100;
      ctx.fillStyle = getLayerColor(activeLayers[0].processing_type);
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
    ctx.fillText(`Histogram - ${activeLayers[0].processing_type} Area Distribution`, canvas.width / 2 - 120, 15);
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
  const renderNumericalValue = (value, layerId) => {
    // Create a scale from min to max
    const scaleWidth = 100;
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
  const renderPixelValue = (value, layerId) => {
    if (value.categorical) {
      return renderCategoricalValue(value);
    } else if (value.type === 'RGB Values') {
      return renderRGBValues(value);
    } else if (value.value !== 'N/A') {
      return renderNumericalValue(value, layerId);
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
      
      {inspectPoint && pixelValues ? (
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
              {Object.keys(pixelValues).map(layerId => {
                const layer = layers.find(l => l.id === layerId);
                const value = pixelValues[layerId];
                
                return (
                  <div key={layerId} className="bg-google-bg-light rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: getLayerColor(layer.processing_type) }}
                        ></div>
                        <h3 className="text-sm font-medium text-google-grey-100">
                          {layer.location}
                        </h3>
                      </div>
                      <span className="text-xs text-google-grey-300">{value.type}</span>
                    </div>
                    
                    <div className="mt-2">
                      {renderPixelValue(value, layerId)}
                    </div>
                  </div>
                );
              })}
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