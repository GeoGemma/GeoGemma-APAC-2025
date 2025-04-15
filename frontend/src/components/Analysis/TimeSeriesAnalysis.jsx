import { useState } from 'react';
import PropTypes from 'prop-types';
import { Calendar, X, LineChart, Layers } from 'lucide-react';
import { useMap } from '../../contexts/MapContext';
import { format } from 'date-fns';
import { createTimeSeriesAnalysis } from '../../services/api';
import './TimeSeriesAnalysis.css';

const TimeSeriesAnalysis = ({ showNotification, showLoading, hideLoading }) => {
  const [location, setLocation] = useState('');
  const [processingType, setProcessingType] = useState('NDVI');
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [interval, setInterval] = useState('monthly');
  const [results, setResults] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { addLayer, flyToLocation } = useMap();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!location.trim()) {
      showNotification('Please enter a location', 'warning');
      return;
    }
    
    showLoading('Processing time series analysis...');
    
    try {
      const timeSeriesData = {
        location,
        processing_type: processingType,
        start_date: startDate,
        end_date: endDate,
        interval
      };
      
      const response = await createTimeSeriesAnalysis(timeSeriesData);
      
      if (response.success && response.data) {
        setResults(response.data.results);
        showNotification(`Created time series for ${location}`, 'success');
        
        // Display the first image if available
        if (response.data.results.length > 0 && response.data.results[0].tile_url) {
          displayTimeSlice(response.data.results[0], 0);
        }
      } else {
        showNotification(response.message || 'Failed to create time series', 'error');
      }
    } catch (error) {
      console.error('Error creating time series:', error);
      showNotification(`Error: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      hideLoading();
    }
  };
  
  const displayTimeSlice = (timeSlice, index) => {
    if (!timeSlice || !timeSlice.tile_url) {
      showNotification('No visualization available for this time period', 'warning');
      return;
    }
    
    setActiveIndex(index);
    
    // Create a new layer ID with timestamp to ensure uniqueness
    const timestamp = new Date().getTime();
    const layerId = `time_series_${location.replace(' ', '_')}_${processingType}_${timeSlice.date}_${timestamp}`;
    
    // Add the new layer to the map
    const newLayer = {
      id: layerId,
      tile_url: timeSlice.tile_url,
      location: `${location} (${timeSlice.date})`,
      processing_type: processingType,
      opacity: 0.8,
      visibility: 'visible'
    };
    
    addLayer(newLayer);
    
    // Navigate to the location if coordinates are available
    // In a real implementation, you might want to get coordinates from a geocoding service
    // or store them with the time series results
  };
  
  const renderTimeSlices = () => {
    if (!results || results.length === 0) {
      return <p className="no-data-message">No time series data available</p>;
    }
    
    return (
      <div className="time-series-results">
        <h3 className="results-title">Time Series Results</h3>
        <div className="time-slices-grid">
          {results.map((slice, index) => (
            <div 
              key={slice.date}
              className={`time-slice ${index === activeIndex ? 'active' : ''}`}
              onClick={() => displayTimeSlice(slice, index)}
            >
              <div className="time-slice-header">
                <span className="time-slice-date">{slice.date}</span>
                {slice.statistics && <LineChart size={16} className="time-slice-icon" />}
              </div>
              {slice.statistics && (
                <div className="time-slice-stats">
                  <div>Mean: {slice.statistics.mean?.toFixed(2) || 'N/A'}</div>
                  <div>Max: {slice.statistics.max?.toFixed(2) || 'N/A'}</div>
                </div>
              )}
              {!slice.tile_url && (
                <div className="time-slice-error">
                  No data available
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="time-series-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <LineChart size={18} className="panel-icon" /> Time Series Analysis
        </h2>
        <button className="close-button">
          <X size={18} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="time-series-form">
        <div className="form-group">
          <label className="form-label">Location</label>
          <input 
            type="text" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="form-input"
            placeholder="e.g. Paris, France"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Processing Type</label>
          <select 
            value={processingType}
            onChange={(e) => setProcessingType(e.target.value)}
            className="form-select"
          >
            <option value="NDVI">Vegetation (NDVI)</option>
            <option value="LST">Land Surface Temperature</option>
            <option value="RGB">RGB Imagery</option>
            <option value="SURFACE WATER">Surface Water</option>
            <option value="OPEN BUILDINGS">Building Heights</option>
          </select>
        </div>
        
        <div className="date-inputs">
          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} className="label-icon" /> Start Date
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} className="label-icon" /> End Date
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Time Interval</label>
          <select 
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="form-select"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
        >
          Generate Time Series
        </button>
      </form>
      
      {renderTimeSlices()}
    </div>
  );
};

TimeSeriesAnalysis.propTypes = {
  showNotification: PropTypes.func.isRequired,
  showLoading: PropTypes.func.isRequired,
  hideLoading: PropTypes.func.isRequired
};

export default TimeSeriesAnalysis; 