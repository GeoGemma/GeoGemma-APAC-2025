// src/components/Map/MapLegend.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useMap } from '../../contexts/MapContext';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import MetadataViewer from './MetadataViewer';

// Legend configurations for different layer types
const legendConfigs = {
  'NDVI': {
    title: 'NDVI',
    gradient: 'linear-gradient(to right, #CE7E45, #DF923D, #F1B555, #FCD163, #99B718, #74A901, #66A000, #529400, #3E8601, #056201, #004C00)',
    min: '-0.2',
    max: '0.8',
    middle: 'Moderate',
    description: 'NDVI measures vegetation density and health using near-infrared and red light reflectance.'
  },
  'SURFACE WATER': {
    title: 'Surface Water',
    gradient: 'linear-gradient(to right, #ffffff, #d4e7ff, #a8d1ff, #7cbaff, #51a3ff, #258cff, #0075ff, #005ebf, #004080)',
    min: 'None',
    max: 'Permanent',
    middle: 'Seasonal',
    description: 'Surface water detection shows water presence and extent over time.'
  },
  'LST': {
    title: 'Land Surface Temperature',
    gradient: 'linear-gradient(to right, #040274, #307ef3, #30c8e2, #86e26f, #ffd611, #ff8b13, #ff0000)',
    min: 'Cold',
    max: 'Hot',
    middle: 'Moderate',
    description: 'Land Surface Temperature shows Earth surface thermal conditions.'
  },
  'LULC': {
    title: 'Land Use/Land Cover',
    categories: [
      { color: '#006400', label: 'Tree cover' },
      { color: '#ffbb22', label: 'Shrubland' },
      { color: '#ffff4c', label: 'Grassland' },
      { color: '#f096ff', label: 'Cropland' },
      { color: '#fa0000', label: 'Built-up' },
      { color: '#b4b4b4', label: 'Bare/sparse' },
      { color: '#0064c8', label: 'Water' },
    ],
    description: 'Land Use/Land Cover classification shows different surface types and uses.'
  },
  'RGB': {
    title: 'RGB Imagery',
    description: 'True color imagery shows Earth as it would appear to the human eye from space.'
  },
  'OPEN BUILDINGS': {
    title: 'Building Heights',
    gradient: 'linear-gradient(to right, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000)',
    min: 'Low',
    max: 'Tall',
    middle: 'Medium',
    description: 'Building heights data shows the vertical extent of structures.'
  }
};

const MapLegend = () => {
  const { layers } = useMap();
  const [activeLegend, setActiveLegend] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    legend: true,
    metadata: true
  });

  // Determine which legend to show based on active layers
  useEffect(() => {
    if (!layers || layers.length === 0) {
      setActiveLegend(null);
      return;
    }

    // Get the top-most visible layer
    const visibleLayers = layers.filter(layer => layer.visibility !== 'none');
    if (visibleLayers.length === 0) {
      setActiveLegend(null);
      return;
    }

    // Get the top layer (most recently added)
    const topLayer = visibleLayers[visibleLayers.length - 1];
    const layerType = topLayer.processing_type;
    
    // Set the active legend configuration
    if (legendConfigs[layerType]) {
      setActiveLegend({
        ...legendConfigs[layerType],
        layerType,
        location: topLayer.location,
        metadata: topLayer.metadata || null
      });
    } else {
      setActiveLegend(null);
    }
  }, [layers]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Format metadata value for display
  const formatMetadataValue = (value) => {
    if (value === null || value === undefined) return 'Not available';
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  };

  // Render metadata section
  const renderMetadataSection = (metadata) => {
    if (!metadata) return null;
    
    // Filter out technical or redundant fields
    const excludedKeys = ['Status'];
    const filteredMetadata = Object.entries(metadata).filter(([key]) => !excludedKeys.includes(key));
    
    // Sort important fields first
    const priorityKeys = [
      'PROCESSING TYPE', 'SOURCE DATASET', 'IMAGE DATE', 
      'REQUESTED START', 'REQUESTED END', 'DATASET YEAR'
    ];
    
    filteredMetadata.sort((a, b) => {
      const indexA = priorityKeys.indexOf(a[0]);
      const indexB = priorityKeys.indexOf(b[0]);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
    
    return (
      <div>
        {filteredMetadata.map(([key, value]) => {
          // Special handling for nested objects (like stats)
          if (typeof value === 'object' && value !== null) {
            return (
              <div key={key} className="mb-3">
                <h5 className="text-google-grey-200 text-xs font-medium mb-1">{key}</h5>
                <div className="pl-2 border-l-2 border-google-bg-light">
                  {Object.entries(value).map(([statKey, statValue]) => (
                    <div key={statKey} className="flex justify-between text-xs mb-1">
                      <span className="text-google-grey-300">{statKey}:</span>
                      <span className="text-google-grey-100">{formatMetadataValue(statValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          
          // Regular key-value display
          return (
            <div key={key} className="flex justify-between text-xs mb-2">
              <span className="text-google-grey-300">{key}:</span>
              <span className="text-google-grey-100 text-right max-w-[60%] break-words">{formatMetadataValue(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Don't render anything if no layers or no matching legend
  if (!activeLegend) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-google-grey-300 h-full">
        <Info size={24} className="mb-2 text-google-grey-300/50" />
        <p className="text-sm">No active layers to display information for.</p>
        <p className="text-xs mt-2">Add a layer using the search bar to see details here.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Layer info header */}
      <div className="mb-4">
        <h3 className="text-google-blue text-lg font-medium mb-1">{activeLegend.title}</h3>
        <p className="text-google-grey-100 text-sm">{activeLegend.location}</p>
      </div>

      {/* Legend visualization section with toggle */}
      <div className="bg-google-bg-light rounded-lg p-3 mb-4">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => toggleSection('legend')}
        >
          <h4 className="text-google-grey-200 text-sm font-medium">Legend</h4>
          {expandedSections.legend ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        
        {expandedSections.legend && (
          <div className="mt-3">
            {/* Gradient bar for continuous data */}
            {activeLegend.gradient && (
              <div className="mb-3">
                <div 
                  className="h-4 w-full rounded"
                  style={{ background: activeLegend.gradient }}
                ></div>
                <div className="flex justify-between mt-1 text-xs text-google-grey-300">
                  <span>{activeLegend.min}</span>
                  {activeLegend.middle && <span>{activeLegend.middle}</span>}
                  <span>{activeLegend.max}</span>
                </div>
              </div>
            )}

            {/* Categories for discrete data */}
            {activeLegend.categories && (
              <div className="grid grid-cols-1 gap-2">
                {activeLegend.categories.map((cat, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2"
                  >
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: cat.color }}
                    ></div>
                    <span className="text-xs text-google-grey-100">{cat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata section with toggle */}
      <div className="bg-google-bg-light rounded-lg p-3 mb-4">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => toggleSection('metadata')}
        >
          <h4 className="text-google-grey-200 text-sm font-medium">Metadata</h4>
          {expandedSections.metadata ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        
        {expandedSections.metadata && (
          <div className="mt-3">
            {/* Use the MetadataViewer component for better organization */}
            <MetadataViewer metadata={activeLegend.metadata} />
          </div>
        )}
      </div>

      {/* Description section */}
      <div className="bg-google-bg-light rounded-lg p-3">
        <h4 className="text-google-grey-200 text-sm font-medium mb-2">About this layer</h4>
        <p className="text-xs text-google-grey-300 leading-normal">
          {activeLegend.description}
        </p>
      </div>
    </div>
  );
};

export default MapLegend;