// src/components/Map/MapLegend.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useMap } from '../../contexts/MapContext';
import { 
  Info, 
  ChevronDown, 
  ChevronUp, 
  BarChart4
} from 'lucide-react';
import MetadataViewer from './MetadataViewer';

const MapLegend = ({ selectedLayer }) => {
  const { layers } = useMap();
  const [activeLayer, setActiveLayer] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    legend: true,
    valueGuide: false,
    metadata: true
  });

  // Legend configurations for different layer types
  const legendConfigs = {
    'NDVI': {
      title: 'Vegetation Index (NDVI)',
      gradient: 'linear-gradient(to right, #CE7E45, #DF923D, #F1B555, #FCD163, #99B718, #74A901, #66A000, #529400, #3E8601, #056201, #004C00)',
      min: -0.2,
      max: 0.8,
      middle: 'Moderate',
      description: 'NDVI measures vegetation density and health using near-infrared and red light reflectance.',
      stats: {
        healthyVeg: '0.6 to 0.8',
        moderateVeg: '0.2 to 0.5',
        sparseVeg: '-0.1 to 0.1'
      }
    },
    'SURFACE WATER': {
      title: 'Surface Water',
      gradient: 'linear-gradient(to right, #ffffff, #d4e7ff, #a8d1ff, #7cbaff, #51a3ff, #258cff, #0075ff, #005ebf, #004080)',
      min: 'None',
      max: 'Permanent',
      middle: 'Seasonal',
      description: 'Surface water detection shows water presence and extent over time.',
      stats: {
        permanent: '90% to 100%',
        seasonal: '40% to 85%',
        rare: '5% to 35%'
      }
    },
    'LST': {
      title: 'Land Surface Temperature',
      gradient: 'linear-gradient(to right, #040274, #307ef3, #30c8e2, #86e26f, #ffd611, #ff8b13, #ff0000)',
      min: '0°C',
      max: '50°C',
      middle: 'Moderate',
      description: 'Land Surface Temperature shows Earth surface thermal conditions.',
      stats: {
        cool: 'Below 15°C',
        moderate: '15°C to 30°C',
        hot: 'Above 30°C'
      }
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
        { color: '#0064c8', label: 'Water' }
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
      description: 'Building heights data shows the vertical extent of structures.',
      stats: {
        low: '0 to 10m',
        medium: '10 to 25m',
        high: 'Above 25m'
      }
    },
    'FOREST_LOSS': {
      title: 'Forest Loss Year',
      gradient: 'linear-gradient(to right, #ffff00, #ffaa00, #ff5500, #ff0000)',
      min: '1 (2001)',
      max: '23 (2023)',
      middle: '12 (2012)',
      description: 'Year of forest loss detection, from 2001 to 2023. Forest loss is defined as a stand-replacement disturbance or change from forest to non-forest state.',
      stats: {
        early: '1-8 (2001-2008)',
        mid: '9-16 (2009-2016)',
        recent: '17-23 (2017-2023)'
      }
    },
    'FOREST LOSS': {
      title: 'Forest Loss Year',
      gradient: 'linear-gradient(to right, #ffff00, #ffaa00, #ff5500, #ff0000)',
      min: '1 (2001)',
      max: '23 (2023)',
      middle: '12 (2012)',
      description: 'Year of forest loss detection, from 2001 to 2023. Forest loss is defined as a stand-replacement disturbance or change from forest to non-forest state.',
      stats: {
        early: '1-8 (2001-2008)',
        mid: '9-16 (2009-2016)',
        recent: '17-23 (2017-2023)'
      }
    },
    'FOREST_GAIN': {
      title: 'Forest Gain',
      categories: [
        { color: '#00FF00', label: 'Forest Gain' }
      ],
      description: 'Areas of forest gain from Hansen Global Forest Change dataset.',
      stats: {
        period: '2000-2022',
        definition: 'Regrowth or new forest'
      }
    },
    'SAR': {
      title: 'SAR Imagery',
      description: 'Synthetic Aperture Radar imagery that can see through clouds and darkness.',
      categories: [
        { color: '#FFFFFF', label: 'High backscatter' },
        { color: '#888888', label: 'Medium backscatter' },
        { color: '#000000', label: 'Low backscatter' }
      ]
    },
    'SAR FLOOD': {
      title: 'SAR Flood Detection',
      categories: [
        { color: '#0000FF', label: 'Detected Water' }
      ],
      description: 'Sentinel-1 SAR-based flood detection using Otsu thresholding.'
    },
    'TREE COVER': {
      title: 'Tree Cover Percentage',
      gradient: 'linear-gradient(to right, #FFFFCC, #C2E699, #78C679, #31A354, #006837)',
      min: '0%',
      max: '100%',
      middle: '50%',
      description: 'Tree canopy cover percentage, representing the density of trees across the landscape.',
      stats: {
        sparse: '0-25% (Light forest)',
        moderate: '25-60% (Medium density)',
        dense: '60-100% (Dense forest)'
      }
    },
    'TREE_COVER': {
      title: 'Tree Cover Percentage',
      gradient: 'linear-gradient(to right, #FFFFCC, #C2E699, #78C679, #31A354, #006837)',
      min: '0%',
      max: '100%',
      middle: '50%',
      description: 'Tree canopy cover percentage, representing the density of trees across the landscape.',
      stats: {
        sparse: '0-25% (Light forest)',
        moderate: '25-60% (Medium density)',
        dense: '60-100% (Dense forest)'
      }
    },
    'treecover2000': {
      title: 'Tree Cover (2000)',
      gradient: 'linear-gradient(to right, #000000, #00FF00)',
      min: '0%',
      max: '100%',
      middle: '50%',
      description: 'Tree cover in the year 2000, defined as canopy closure for all vegetation taller than 5m in height.',
      stats: {
        sparse: '0-25% (Light forest)',
        moderate: '25-60% (Medium density)',
        dense: '60-100% (Dense forest)'
      }
    },
    'lossyear': {
      title: 'Forest Loss Year',
      gradient: 'linear-gradient(to right, #ffff00, #ffaa00, #ff5500, #ff0000)',
      min: '1 (2001)',
      max: '23 (2023)',
      middle: '12 (2012)',
      description: 'Year of forest loss detection, from 2001 to 2023. Forest loss is defined as a stand-replacement disturbance or change from forest to non-forest state.',
      stats: {
        early: '1-8 (2001-2008)',
        mid: '9-16 (2009-2016)',
        recent: '17-23 (2017-2023)'
      }
    }
  };

  // Use the selected layer if provided, otherwise determine based on top visible layer
  useEffect(() => {
    if (selectedLayer) {
      const config = legendConfigs[selectedLayer.processing_type] || {
        title: selectedLayer.processing_type,
        description: `${selectedLayer.processing_type} data for ${selectedLayer.location}.`
      };
      
      setActiveLayer({
        ...selectedLayer,
        config
      });
      return;
    }
    
    // If no selected layer, determine based on visible layers
    if (!layers || layers.length === 0) {
      setActiveLayer(null);
      return;
    }

    // Get the top-most visible layer
    const visibleLayers = layers.filter(layer => layer.visibility !== 'none');
    if (visibleLayers.length === 0) {
      setActiveLayer(null);
      return;
    }

    // Get the top layer (most recently added)
    const topLayer = visibleLayers[0]; 
    const layerType = topLayer.processing_type;
    
    // Set the active layer configuration
    if (legendConfigs[layerType]) {
      setActiveLayer({
        ...topLayer,
        config: legendConfigs[layerType]
      });
    } else {
      setActiveLayer(null);
    }
  }, [layers, selectedLayer]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Don't render anything if no layers or no matching legend
  if (!activeLayer) {
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
        <h3 className="text-google-blue text-lg font-medium mb-1">{activeLayer.config?.title || activeLayer.processing_type}</h3>
        <p className="text-google-grey-100 text-sm">{activeLayer.location}</p>
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
            {activeLayer.config?.gradient && (
              <div className="mb-3">
                <div 
                  className="h-4 w-full rounded"
                  style={{ background: activeLayer.config.gradient }}
                ></div>
                <div className="flex justify-between mt-1 text-xs text-google-grey-300">
                  <span>{activeLayer.config.min}</span>
                  {activeLayer.config.middle && <span>{activeLayer.config.middle}</span>}
                  <span>{activeLayer.config.max}</span>
                </div>
              </div>
            )}

            {/* Categories for discrete data */}
            {activeLayer.config?.categories && (
              <div className="grid grid-cols-1 gap-2">
                {activeLayer.config.categories.map((cat, idx) => (
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

      {/* Value Statistics Section */}
      {activeLayer.config?.stats && (
        <div className="bg-google-bg-light rounded-lg p-3 mb-4">
          <div 
            className="flex justify-between items-center cursor-pointer" 
            onClick={() => toggleSection('valueGuide')}
          >
            <h4 className="text-google-grey-200 text-sm font-medium flex items-center gap-2">
              <BarChart4 size={14} />
              <span>Value Guide</span>
            </h4>
            {expandedSections.valueGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          
          {expandedSections.valueGuide && (
            <div className="mt-3 space-y-2">
              {Object.entries(activeLayer.config.stats).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 text-xs">
                  <span className="text-google-grey-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="text-google-grey-100">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metadata section with toggle */}
      {activeLayer.metadata && (
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
              <MetadataViewer metadata={activeLayer.metadata} />
            </div>
          )}
        </div>
      )}

      {/* Description section */}
      <div className="bg-google-bg-light rounded-lg p-3">
        <h4 className="text-google-grey-200 text-sm font-medium mb-2">About this layer</h4>
        <p className="text-xs text-google-grey-300 leading-normal">
          {activeLayer.config?.description || `This layer shows ${activeLayer.processing_type} data for ${activeLayer.location}.`}
        </p>
      </div>
    </div>
  );
};

MapLegend.propTypes = {
  selectedLayer: PropTypes.object
};

export default MapLegend;