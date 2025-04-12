import { useState } from 'react';
import PropTypes from 'prop-types';
import { Calendar, X, Split, RefreshCw } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { format } from 'date-fns';
import { createComparisonAnalysis } from '../../services/api';
import '../../styles/analysis.css';

const ComparisonAnalysis = ({ showNotification, showLoading, hideLoading }) => {
  const [location, setLocation] = useState('');
  const [processingType, setProcessingType] = useState('NDVI');
  const [date1, setDate1] = useState(format(new Date(new Date().getFullYear() - 1, 0, 1), 'yyyy-MM-dd'));
  const [date2, setDate2] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [comparison, setComparison] = useState(null);
  const { addLayer, removeLayer, flyToLocation } = useMap();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!location.trim()) {
      showNotification('Please enter a location', 'warning');
      return;
    }
    
    showLoading('Creating comparison analysis...');
    
    try {
      const comparisonData = {
        location,
        processing_type: processingType,
        date1,
        date2
      };
      
      const response = await createComparisonAnalysis(comparisonData);
      
      if (response.success && response.data) {
        setComparison(response.data);
        showNotification(`Created comparison for ${location}`, 'success');
        
        // Display both images
        displayComparisonLayers(response.data);
      } else {
        showNotification(response.message || 'Failed to create comparison', 'error');
      }
    } catch (error) {
      console.error('Error creating comparison:', error);
      showNotification(`Error: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      hideLoading();
    }
  };
  
  const displayComparisonLayers = (data) => {
    if (!data || !data.date1_url || !data.date2_url) {
      showNotification('One or both images could not be generated', 'warning');
      return;
    }
    
    // Remove any existing comparison layers
    ['comparison_before', 'comparison_after'].forEach(id => {
      removeLayer(id);
    });
    
    // Add the "before" layer
    const beforeLayer = {
      id: 'comparison_before',
      tile_url: data.date1_url,
      location: `${location} (${data.date1})`,
      processing_type: processingType,
      opacity: 0.8,
      visibility: 'visible'
    };
    
    // Add the "after" layer
    const afterLayer = {
      id: 'comparison_after',
      tile_url: data.date2_url,
      location: `${location} (${data.date2})`,
      processing_type: processingType,
      opacity: 0.8,
      visibility: 'visible'
    };
    
    // Add layers to map
    addLayer(beforeLayer);
    addLayer(afterLayer);
  };
  
  const swapDates = () => {
    const temp = date1;
    setDate1(date2);
    setDate2(temp);
  };
  
  return (
    <div className="analysis-panel">
      <div className="analysis-header">
        <h2 className="text-xl font-bold flex items-center">
          <Split size={18} className="mr-2" /> Comparison Analysis
        </h2>
        <button className="text-gray-500 hover:text-gray-700">
          <X size={18} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Location</label>
          <input 
            type="text" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g. Paris, France"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Processing Type</label>
          <select 
            value={processingType}
            onChange={(e) => setProcessingType(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="NDVI">Vegetation (NDVI)</option>
            <option value="RGB">RGB Imagery</option>
            <option value="SURFACE WATER">Surface Water</option>
            <option value="LST">Land Surface Temperature</option>
            <option value="LULC">Land Use/Land Cover</option>
          </select>
        </div>
        
        <div className="relative mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                <Calendar size={14} className="inline mr-1" /> Before Date
              </label>
              <input 
                type="date" 
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                <Calendar size={14} className="inline mr-1" /> After Date
              </label>
              <input 
                type="date" 
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>
          
          <button 
            type="button"
            onClick={swapDates}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border shadow-sm hover:bg-gray-100"
            title="Swap dates"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        
        <button 
          type="submit" 
          className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Create Comparison
        </button>
      </form>
      
      {comparison && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Comparison Results</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-md overflow-hidden">
              <div className="bg-gray-100 p-2 font-medium text-center border-b">
                {comparison.date1}
              </div>
              <div className="h-32 bg-gray-200 flex items-center justify-center">
                {comparison.date1_url ? (
                  <img 
                    src={comparison.date1_url.replace('{z}/{x}/{y}', '9/149/193')} 
                    alt="Before" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-sm text-gray-500">No image available</p>
                )}
              </div>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <div className="bg-gray-100 p-2 font-medium text-center border-b">
                {comparison.date2}
              </div>
              <div className="h-32 bg-gray-200 flex items-center justify-center">
                {comparison.date2_url ? (
                  <img 
                    src={comparison.date2_url.replace('{z}/{x}/{y}', '9/149/193')}
                    alt="After" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-sm text-gray-500">No image available</p>
                )}
              </div>
            </div>
          </div>
          
          <p className="mt-4 text-sm text-gray-600">
            Toggle the layers in the layer panel to compare the two time periods.
          </p>
        </div>
      )}
    </div>
  );
};

ComparisonAnalysis.propTypes = {
  showNotification: PropTypes.func.isRequired,
  showLoading: PropTypes.func.isRequired,
  hideLoading: PropTypes.func.isRequired
};

export default ComparisonAnalysis; 