// src/components/Map/MetadataViewer.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Component for displaying layer metadata in a structured, organized way
 */
const MetadataViewer = ({ metadata }) => {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    dates: true,
    stats: true,
    additional: false
  });

  if (!metadata) {
    return (
      <div className="text-center py-4">
        <p className="text-google-grey-300 text-sm">No metadata available for this layer.</p>
      </div>
    );
  }

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Format metadata value for display
  const formatValue = (value) => {
    if (value === null || value === undefined || value === 'N/A') {
      return <span className="text-google-grey-400">Not available</span>;
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      if (value % 1 === 0) return value.toString(); // Integer
      return value.toFixed(4);
    }
    
    // Handle string values that might be JSON
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        const parsed = JSON.parse(value);
        return <pre className="text-xs overflow-x-auto">{JSON.stringify(parsed, null, 2)}</pre>;
      } catch (e) {
        // If it's not valid JSON, just return the string
        return value;
      }
    }
    
    return value;
  };

  // Group metadata into categories for better organization
  const categorizeMetadata = () => {
    // Filter out Status field as it's usually just for internal use
    const filteredMetadata = {...metadata};
    delete filteredMetadata.Status;
    
    const categories = {
      basic: {
        title: "Basic Information",
        fields: ['PROCESSING TYPE', 'SOURCE DATASET']
      },
      dates: {
        title: "Date Information",
        fields: ['IMAGE DATE', 'IMAGE DATE NOTE', 'REQUESTED START', 'REQUESTED END', 
                'DATASET START', 'DATASET END', 'DATASET YEAR', 'DATE INFO']
      },
      stats: {
        title: "Statistics",
        // Find all keys that contain 'STATS'
        fields: Object.keys(filteredMetadata).filter(key => key.includes('STATS'))
      },
      additional: {
        title: "Additional Information",
        // All other fields
        fields: []
      }
    };
    
    // Add other fields to 'additional' category
    const assignedFields = [
      ...categories.basic.fields,
      ...categories.dates.fields,
      ...categories.stats.fields
    ];
    
    categories.additional.fields = Object.keys(filteredMetadata)
      .filter(key => !assignedFields.includes(key) && key !== 'Status');
    
    return categories;
  };

  const categories = categorizeMetadata();

  // Render a section of metadata
  const renderSection = (title, fields, sectionKey) => {
    if (fields.length === 0) return null;
    
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div className="mb-4">
        <div 
          className="flex justify-between items-center cursor-pointer bg-google-bg-lighter rounded-t-md px-3 py-2"
          onClick={() => toggleSection(sectionKey)}
        >
          <h4 className="text-google-grey-100 text-sm font-medium">{title}</h4>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        
        {isExpanded && (
          <div className="bg-google-bg-light rounded-b-md p-3 border-t border-google-bg/50">
            {fields.map(key => {
              const value = metadata[key];
              
              // Special handling for nested objects like statistics
              if (typeof value === 'object' && value !== null) {
                return (
                  <div key={key} className="mb-3">
                    <h5 className="text-google-grey-200 text-xs font-medium mb-1">{key}</h5>
                    <div className="pl-2 border-l-2 border-google-bg-lighter space-y-1">
                      {Object.entries(value).map(([statKey, statValue]) => (
                        <div key={statKey} className="flex justify-between text-xs">
                          <span className="text-google-grey-300">{statKey}:</span>
                          <span className="text-google-grey-100 text-right max-w-[60%]">
                            {formatValue(statValue)}
                          </span>
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
                  <span className="text-google-grey-100 text-right max-w-[60%] break-words">
                    {formatValue(value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderSection(categories.basic.title, categories.basic.fields, 'basic')}
      {renderSection(categories.dates.title, categories.dates.fields, 'dates')}
      {renderSection(categories.stats.title, categories.stats.fields, 'stats')}
      {renderSection(categories.additional.title, categories.additional.fields, 'additional')}
    </div>
  );
};

MetadataViewer.propTypes = {
  metadata: PropTypes.object
};

export default MetadataViewer;