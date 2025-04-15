import logging
from typing import Dict, Any, Optional, List, Union
import datetime
import json
import ee

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MetadataHandler:
    """
    Handler for capturing, storing, and retrieving metadata about Earth Engine analyses.
    Tracks information like satellite source, date range, bands used, and processing details.
    """
    
    def __init__(self):
        self.metadata_fields = [
            'analysis_type',
            'location',
            'satellite',
            'sensor',
            'bands',
            'start_date',
            'end_date',
            'date_type',
            'processing_date',
            'coordinates',
            'resolution',
            'cloud_cover',
            'processing_params',
            'additional_info'
        ]
    
    def create_metadata(self, analysis_type: str, location: str) -> Dict[str, Any]:
        """
        Initialize a new metadata object for an analysis.
        
        Args:
            analysis_type: Type of analysis (RGB, NDVI, LST, etc.)
            location: Location string
            
        Returns:
            Metadata dictionary with basic fields initialized
        """
        metadata = {field: None for field in self.metadata_fields}
        metadata['analysis_type'] = analysis_type.upper()
        metadata['location'] = location
        metadata['processing_date'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        return metadata
    
    def update_with_date_info(self, metadata: Dict[str, Any], date_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update metadata with date information.
        
        Args:
            metadata: Existing metadata dictionary
            date_info: Date information from DateHandler
            
        Returns:
            Updated metadata dictionary
        """
        if date_info.get('date_type') == 'latest':
            metadata['date_type'] = 'latest'
            metadata['start_date'] = date_info.get('search_start')
            metadata['end_date'] = date_info.get('search_end')
        else:
            metadata['date_type'] = 'range'
            metadata['start_date'] = date_info.get('start_date')
            metadata['end_date'] = date_info.get('end_date')
        
        if 'year' in date_info:
            metadata['year'] = date_info['year']
            
        return metadata
    
    def update_with_satellite_info(self, metadata: Dict[str, Any], 
                                  satellite: Optional[str] = None,
                                  sensor: Optional[str] = None, 
                                  bands: Optional[List[str]] = None,
                                  resolution: Optional[Union[int, float]] = None) -> Dict[str, Any]:
        """
        Update metadata with satellite and sensor information.
        
        Args:
            metadata: Existing metadata dictionary
            satellite: Satellite name (e.g., "Sentinel-2")
            sensor: Sensor name (e.g., "MSI")
            bands: List of band names used in the analysis
            resolution: Spatial resolution in meters
            
        Returns:
            Updated metadata dictionary
        """
        if satellite:
            metadata['satellite'] = satellite
        if sensor:
            metadata['sensor'] = sensor
        if bands:
            metadata['bands'] = bands
        if resolution:
            metadata['resolution'] = resolution
            
        return metadata
    
    def update_with_ee_image(self, metadata: Dict[str, Any], image: ee.Image) -> Dict[str, Any]:
        """
        Update metadata by extracting information from an Earth Engine image.
        
        Args:
            metadata: Existing metadata dictionary
            image: Earth Engine image
            
        Returns:
            Updated metadata dictionary
        """
        try:
            # Extract properties from the EE image
            properties = image.getInfo().get('properties', {})
            
            # Extract common properties if they exist
            if 'system:time_start' in properties:
                timestamp_ms = properties.get('system:time_start')
                date_obj = datetime.datetime.fromtimestamp(timestamp_ms / 1000)
                metadata['acquisition_date'] = date_obj.strftime('%Y-%m-%d')
            
            if 'SPACECRAFT_NAME' in properties:
                metadata['satellite'] = properties.get('SPACECRAFT_NAME')
                
            if 'SENSOR_ID' in properties:
                metadata['sensor'] = properties.get('SENSOR_ID')
                
            if 'CLOUD_COVER' in properties:
                metadata['cloud_cover'] = properties.get('CLOUD_COVER')
            
            # Get band information
            bands_info = image.bandNames().getInfo()
            if bands_info:
                metadata['bands'] = bands_info
            
            # Store any other potentially useful information
            additional_info = {}
            for key, value in properties.items():
                if key not in ['system:time_start', 'SPACECRAFT_NAME', 'SENSOR_ID', 'CLOUD_COVER']:
                    additional_info[key] = value
            
            if additional_info:
                metadata['additional_info'] = additional_info
                
        except Exception as e:
            logging.error(f"Error extracting image metadata: {e}")
            
        return metadata
    
    def update_with_coordinates(self, metadata: Dict[str, Any], 
                               latitude: Optional[float] = None, 
                               longitude: Optional[float] = None) -> Dict[str, Any]:
        """
        Update metadata with coordinate information.
        
        Args:
            metadata: Existing metadata dictionary
            latitude: Latitude value
            longitude: Longitude value
            
        Returns:
            Updated metadata dictionary
        """
        if latitude is not None and longitude is not None:
            metadata['coordinates'] = {
                'latitude': latitude,
                'longitude': longitude
            }
            
        return metadata
    
    def update_with_processing_params(self, metadata: Dict[str, Any], 
                                     params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update metadata with processing parameters.
        
        Args:
            metadata: Existing metadata dictionary
            params: Dictionary of processing parameters
            
        Returns:
            Updated metadata dictionary
        """
        metadata['processing_params'] = params
        return metadata
    
    def to_json(self, metadata: Dict[str, Any]) -> str:
        """
        Convert metadata to JSON string.
        
        Args:
            metadata: Metadata dictionary
            
        Returns:
            JSON string representation
        """
        # Filter out None values for cleaner output
        filtered_metadata = {k: v for k, v in metadata.items() if v is not None}
        return json.dumps(filtered_metadata, indent=2)
    
    def to_html(self, metadata: Dict[str, Any]) -> str:
        """
        Convert metadata to HTML for display in web interface.
        
        Args:
            metadata: Metadata dictionary
            
        Returns:
            HTML string representation
        """
        # Filter out None values
        filtered_metadata = {k: v for k, v in metadata.items() if v is not None}
        
        html = '<div class="metadata-container">'
        html += f'<h3>Analysis: {filtered_metadata.get("analysis_type", "Unknown")}</h3>'
        html += '<table class="metadata-table">'
        
        # Special handling for important fields
        priority_fields = ['location', 'satellite', 'start_date', 'end_date', 'date_type', 'bands']
        for field in priority_fields:
            if field in filtered_metadata and filtered_metadata[field] is not None:
                # Format the field name for display
                display_name = ' '.join(word.capitalize() for word in field.split('_'))
                value = filtered_metadata[field]
                
                # Format value based on type
                if isinstance(value, list):
                    value = ', '.join(str(item) for item in value)
                
                html += f'<tr><th>{display_name}:</th><td>{value}</td></tr>'
        
        # Add remaining fields
        for field, value in filtered_metadata.items():
            if field not in priority_fields and value is not None:
                # Skip complex nested objects or large lists
                if field == 'additional_info' or (isinstance(value, dict) and len(value) > 5):
                    continue
                    
                # Format the field name for display
                display_name = ' '.join(word.capitalize() for word in field.split('_'))
                
                # Format value based on type
                if isinstance(value, list):
                    value = ', '.join(str(item) for item in value)
                elif isinstance(value, dict):
                    value = '<br>'.join(f"{k}: {v}" for k, v in value.items())
                
                html += f'<tr><th>{display_name}:</th><td>{value}</td></tr>'
        
        html += '</table></div>'
        return html
    
    def get_layer_info(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a simplified layer info object for the frontend.
        
        Args:
            metadata: Metadata dictionary
            
        Returns:
            Layer info dictionary
        """
        layer_info = {
            'type': metadata.get('analysis_type', 'Unknown'),
            'location': metadata.get('location', 'Unknown location'),
            'date_range': 'Latest imagery'
        }
        
        # Format date range information
        if metadata.get('start_date') and metadata.get('end_date'):
            if metadata.get('start_date') == metadata.get('end_date'):
                layer_info['date_range'] = metadata.get('start_date')
            else:
                layer_info['date_range'] = f"{metadata.get('start_date')} to {metadata.get('end_date')}"
        
        # Add satellite information if available
        if metadata.get('satellite'):
            layer_info['satellite'] = metadata.get('satellite')
            
        # Add resolution if available
        if metadata.get('resolution'):
            layer_info['resolution'] = f"{metadata.get('resolution')}m"
            
        return layer_info

# Create a singleton instance
metadata_handler = MetadataHandler()