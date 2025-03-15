// document.addEventListener('DOMContentLoaded', function() {
//     maplibregl.accessToken = 'j39zkHuudsWVmeESbtMh';

//     // Global map state
//     let currentMapCenter = [0, 0]; // Default: center of the world
//     let currentMapZoom = 2;
//     let lastGeocodedLocation = null;
//     let lastGeocodedLatitude = null;
//     let lastGeocodedLongitude = null;
//     let layersData = [];
//     let markers = [];

//     // Initialize Map
//     const map = new maplibregl.Map({
//         container: 'map',
//         style: 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json',
//         center: currentMapCenter,
//         zoom: currentMapZoom,
//         attributionControl: false
//     });

//     // Add map controls
//     map.addControl(new maplibregl.AttributionControl({ compact: true }));
//     map.addControl(new maplibregl.NavigationControl(), 'top-left');
//     map.addControl(new maplibregl.FullscreenControl());
//     map.addControl(new maplibregl.GeolocateControl({
//         positionOptions: { enableHighAccuracy: true },
//         trackUserLocation: true
//     }));
//     map.addControl(new maplibregl.ScaleControl());

//     // Initialize layersData from session
//     try {
//         const layersJson = document.getElementById('layers_data').value;
//         if (layersJson && layersJson.trim() !== '') {
//             layersData = JSON.parse(layersJson);
//         }
//     } catch (error) {
//         console.error('Error parsing layers data:', error);
//     }

//     // Add event listeners after map loads
//     map.on('load', function() {
//         // Store map position on movement
//         map.on('moveend', function() {
//             currentMapCenter = map.getCenter().toArray();
//             currentMapZoom = map.getZoom();
//         });

//         // Add existing layers from session
//         if (layersData.length > 0) {
//             layersData.forEach(addLayerToMap);
//             updateLayersList();
//         }

//         // Check for initial hidden inputs
//         const tileUrl = document.getElementById('tile_url').value;
//         const location = document.getElementById('location').value;
//         const latitude = document.getElementById('latitude').value;
//         const longitude = document.getElementById('longitude').value;
//         const errorMessage = document.getElementById('error_message').value;
        
//         if (errorMessage) {
//             showNotification(errorMessage, 'error');
//         }
        
//         if (tileUrl && tileUrl !== "error" && location) {
//             // Add marker and fly to location if coordinates exist
//             if (latitude && longitude) {
//                 const lat = parseFloat(latitude);
//                 const lon = parseFloat(longitude);
//                 if (!isNaN(lat) && !isNaN(lon)) {
//                     addMarker(lat, lon);
//                     flyToCoordinates(lat, lon, location);
//                 }
//             }
//         }
//     });

//     // Sidebar functionality
//     const sidebar = document.querySelector('.sidebar');
//     const sidebarToggle = document.querySelector('.sidebar-toggle');
//     const layerControlIcon = document.querySelector('.sidebar-icon[title="Layer Control"]');
//     const layerList = document.querySelector('.sidebar-layer-list');
//     const clearLayersBtn = document.getElementById('clear-layers-btn');

//     sidebarToggle.addEventListener('click', function() {
//         sidebar.classList.toggle('open');
//     });

//     layerControlIcon.addEventListener('click', function() {
//         layerList.style.display = layerList.style.display === 'none' ? 'block' : 'none';
//     });

//     clearLayersBtn.addEventListener('click', clearAllLayers);

//     // Form submission handler
//     document.querySelector('.prompt-form').addEventListener('submit', async function(event) {
//         event.preventDefault();

//         // Show processing indicator
//         showLoadingIndicator('Processing...');

//         const prompt = document.querySelector('.prompt-input').value;
//         if (prompt.trim() === "") {
//             showNotification("Please enter a prompt.", "error");
//             hideLoadingIndicator();
//             return;
//         }

//         // Clear existing 'current' layer (if it exists)
//         if (map.getLayer('ee-layer-current')) {
//             map.removeLayer('ee-layer-current');
//         }
//         if (map.getSource('ee-source-current')) {
//             map.removeSource('ee-source-current');
//         }

//         // Remove current layer data if it exists
//         layersData = layersData.filter(layer => layer.id !== 'current');

//         // Clear existing markers
//         clearMarkers();

//         // Make asynchronous request to the API
//         try {
//             const response = await fetch('/', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/x-www-form-urlencoded'
//                 },
//                 body: `prompt=${encodeURIComponent(prompt)}`
//             });

//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const html = await response.text();
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(html, 'text/html');

//             // Extract data from the hidden fields in the reloaded HTML
//             const location = doc.getElementById("location").value;
//             const tile_url = doc.getElementById("tile_url").value;
//             const error_message = doc.getElementById("error_message").value;
//             const latitude = doc.getElementById("latitude").value;
//             const longitude = doc.getElementById("longitude").value;

//             if (error_message) {
//                 showNotification(error_message, 'error');
//                 hideLoadingIndicator();
//                 return;
//             }

//             if (tile_url && tile_url !== "error") {
//                 const newLayer = {
//                     id: 'current', // Set ID for the new layer to be 'current'
//                     tile_url: tile_url,
//                     location: location,
//                     processing_type: prompt,
//                     latitude: latitude ? parseFloat(latitude) : null,
//                     longitude: longitude ? parseFloat(longitude) : null
//                 };
                
//                 addLayerToMap(newLayer);
//                 updateLayersList();

//                 // Handle location navigation
//                 if (location && location.trim() !== "") {
//                     navigateToLocation(location, latitude, longitude);
//                 }
                
//                 showNotification(`Added layer: ${location} (${prompt})`, 'success');
//             } else {
//                 showNotification("Error fetching image for this location. Please try another location or check the service.", 'error');
//             }
//         } catch (error) {
//             console.error("Error processing the prompt: ", error);
//             showNotification("Failed to process the prompt. Please try again.", 'error');
//         } finally {
//             hideLoadingIndicator();
//         }
//     });

//     // Helper Functions
//     function navigateToLocation(location, latitude, longitude) {
//         // Check if we have coordinates
//         if (latitude && longitude) {
//             const lat = parseFloat(latitude);
//             const lon = parseFloat(longitude);
//             if (!isNaN(lat) && !isNaN(lon)) {
//                 flyToCoordinates(lat, lon, location);
//                 addMarker(lat, lon);
//                 return;
//             }
//         }
        
//         // If we don't have coordinates but have a previously geocoded location
//         if (location === lastGeocodedLocation && lastGeocodedLatitude !== null && lastGeocodedLongitude !== null) {
//             flyToCoordinates(lastGeocodedLatitude, lastGeocodedLongitude, location);
//             addMarker(lastGeocodedLatitude, lastGeocodedLongitude);
//             return;
//         }
        
//         // No coordinates available - need to geocode
//         const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json`;
        
//         fetch(geocodeUrl)
//             .then(response => response.json())
//             .then(data => {
//                 if (data && data.length > 0) {
//                     const lat = parseFloat(data[0].lat);
//                     const lon = parseFloat(data[0].lon);
                    
//                     flyToCoordinates(lat, lon, location);
//                     addMarker(lat, lon);
                    
//                     // Store the geocoded location
//                     lastGeocodedLocation = location;
//                     lastGeocodedLatitude = lat;
//                     lastGeocodedLongitude = lon;
//                 } else {
//                     console.log("Geocoding failed for: " + location);
//                     showNotification(`Couldn't find coordinates for: ${location}`, 'warning');
//                 }
//             })
//             .catch(error => {
//                 console.error("Error geocoding: ", error);
//                 showNotification("Error during geocoding", 'error');
//             });
//     }

//     function flyToCoordinates(lat, lon, location) {
//         // Set default zoom level if not already at a good zoom level
//         const targetZoom = currentMapZoom < 8 ? 10 : currentMapZoom;
        
//         map.flyTo({
//             center: [lon, lat],
//             zoom: targetZoom,
//             duration: 2000 // Animation duration in milliseconds
//         });
        
//         showNotification(`Navigating to ${location}`, 'info');
//     }

//     function addMarker(lat, lon) {
//         // Clear existing markers
//         clearMarkers();
        
//         // Add new marker
//         const marker = new maplibregl.Marker()
//             .setLngLat([lon, lat])
//             .addTo(map);
            
//         markers.push(marker);
//     }
    
//     function clearMarkers() {
//         // Remove all existing markers
//         markers.forEach(marker => marker.remove());
//         markers = [];
//     }

//     function addLayerToMap(layer) {
//         const sourceId = `ee-source-${layer.id}`;
//         const layerId = `ee-layer-${layer.id}`;

//         // Remove existing layer/source if they exist
//         if (map.getLayer(layerId)) {
//             map.removeLayer(layerId);
//         }
//         if (map.getSource(sourceId)) {
//             map.removeSource(sourceId);
//         }

//         // Add the source and layer
//         map.addSource(sourceId, {
//             'type': 'raster',
//             'tiles': [layer.tile_url],
//             'tileSize': 256
//         });

//         map.addLayer({
//             'id': layerId,
//             'type': 'raster',
//             'source': sourceId,
//             'paint': {
//                 'raster-opacity': 0.8 // Default opacity
//             },
//             'layout': {
//                 'visibility': 'visible'
//             }
//         });
//     }

//     function updateLayersList() {
//         const layerList = document.getElementById('layer-list');
//         layerList.innerHTML = '';

//         layersData.forEach(layer => {
//             const li = document.createElement('li');
//             li.className = 'layer-item';
//             li.style.margin = '5px 0';
//             li.style.padding = '5px';
//             li.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
//             li.style.borderRadius = '4px';

//             // Add layer information
//             let layerLabel = `${layer.location} (${layer.processing_type})`;
//             if (layer.start_date) {
//                 layerLabel += ` - ${layer.start_date.substring(0, 4)}`;
//             }

//             // Check if layer exists and get visibility
//             let visibility = 'visible';
//             const layerId = `ee-layer-${layer.id}`;
//             if (map.getLayer(layerId)) {
//                 visibility = map.getLayoutProperty(layerId, 'visibility') || 'visible';
//             }

//             // Create HTML for the layer item
//             li.innerHTML = `
//                 <div style="display: flex; justify-content: space-between; align-items: center;">
//                     <span>${layerLabel}</span>
//                     <div>
//                         <button class="layer-toggle" data-id="${layer.id}" style="background: none; border: none; cursor: pointer; color: white;">
//                             <i class="fas ${visibility === 'visible' ? 'fa-eye' : 'fa-eye-slash'}"></i>
//                         </button>
//                         <button class="layer-delete" data-id="${layer.id}" style="background: none; border: none; cursor: pointer; color: white;">
//                             <i class="fas fa-trash"></i>
//                         </button>
//                     </div>
//                 </div>
//                 <div class="layer-opacity-control" style="margin-top: 5px; display: ${visibility === 'visible' ? 'block' : 'none'}">
//                     <label style="font-size: 12px; color: #ccc;">Opacity: </label>
//                     <input type="range" class="layer-opacity" data-id="${layer.id}" min="0" max="1" step="0.1" value="0.8" style="width: 100%;">
//                 </div>
//             `;

//             layerList.appendChild(li);
//         });

//         // Add event listeners for toggles and delete buttons
//         document.querySelectorAll('.layer-toggle').forEach(button => {
//             button.addEventListener('click', function() {
//                 const layerId = this.dataset.id;
//                 toggleLayer(layerId);
//             });
//         });

//         document.querySelectorAll('.layer-delete').forEach(button => {
//             button.addEventListener('click', function() {
//                 const layerId = this.dataset.id;
//                 deleteLayer(layerId);
//             });
//         });

//         // Add event listeners for opacity controls
//         document.querySelectorAll('.layer-opacity').forEach(slider => {
//             slider.addEventListener('input', function() {
//                 const layerId = this.dataset.id;
//                 const opacity = parseFloat(this.value);
//                 setLayerOpacity(layerId, opacity);
//             });
//         });
//     }

//     function toggleLayer(layerId) {
//         const layerName = `ee-layer-${layerId}`;
//         const opacityControl = document.querySelector(`.layer-opacity-control[data-id="${layerId}"]`);

//         if (map.getLayer(layerName)) {
//             const visibility = map.getLayoutProperty(layerName, 'visibility');
//             const newVisibility = visibility === 'visible' ? 'none' : 'visible';
//             map.setLayoutProperty(layerName, 'visibility', newVisibility);

//             // Update icon
//             const button = document.querySelector(`.layer-toggle[data-id="${layerId}"] i`);
//             if (button) {
//                 button.className = newVisibility === 'visible' ? 'fas fa-eye' : 'fas fa-eye-slash';
//             }

//             // Show/hide opacity control
//             if (opacityControl) {
//                 opacityControl.style.display = newVisibility === 'visible' ? 'block' : 'none';
//             }
//         }
//     }

    

//     function setLayerOpacity(layerId, opacity) {
//         const layerName = `ee-layer-${layerId}`;
//         if (map.getLayer(layerName)) {
//             map.setPaintProperty(layerName, 'raster-opacity', opacity);
//         }
//     }

//     async function deleteLayer(layerId) {
//         try {
//             showLoadingIndicator('Deleting layer...');
            
//             // Call API to delete layer
//             const response = await fetch(`/api/layers/${layerId}`, {
//                 method: 'DELETE'
//             });

//             if (response.ok) {
//                 // Remove from layersData
//                 layersData = layersData.filter(layer => layer.id !== layerId);

//                 // Remove from map
//                 const layerName = `ee-layer-${layerId}`;
//                 if (map.getLayer(layerName)) {
//                     map.removeLayer(layerName);
//                 }

//                 if (map.getSource(`ee-source-${layerId}`)) {
//                     map.removeSource(`ee-source-${layerId}`);
//                 }

//                 // Update UI
//                 updateLayersList();
//                 showNotification('Layer deleted successfully', 'success');
//             } else {
//                 console.error('Failed to delete layer:', await response.text());
//                 showNotification('Failed to delete layer', 'error');
//             }
//         } catch (error) {
//             console.error('Error deleting layer:', error);
//             showNotification('Error deleting layer', 'error');
//         } finally {
//             hideLoadingIndicator();
//         }
//     }

//     async function clearAllLayers() {
//         try {
//             if (layersData.length === 0) {
//                 showNotification('No layers to clear', 'info');
//                 return;
//             }

//             showLoadingIndicator('Clearing layers...');

//             const response = await fetch('/api/layers/clear', {
//                 method: 'POST'
//             });

//             if (response.ok) {
//                 // Remove all layers from the map
//                 for (const layer of layersData) {
//                     const layerName = `ee-layer-${layer.id}`;
//                     if (map.getLayer(layerName)) {
//                         map.removeLayer(layerName);
//                     }

//                     if (map.getSource(`ee-source-${layer.id}`)) {
//                         map.removeSource(`ee-source-${layer.id}`);
//                     }
//                 }

//                 // Clear markers
//                 clearMarkers();

//                 // Clear the layers data
//                 layersData = [];

//                 // Update UI
//                 updateLayersList();
//                 showNotification('All layers cleared successfully', 'success');
//             } else {
//                 console.error('Failed to clear layers:', await response.text());
//                 showNotification('Failed to clear layers', 'error');
//             }
//         } catch (error) {
//             console.error('Error clearing layers:', error);
//             showNotification('Error clearing layers', 'error');
//         } finally {
//             hideLoadingIndicator();
//         }
//     }

//     // UI feedback helper functions
//     function showLoadingIndicator(message = 'Processing...') {
//         const indicator = document.getElementById('status-indicator');
//         indicator.textContent = message;
//         indicator.style.display = 'block';
//     }

//     function hideLoadingIndicator() {
//         const indicator = document.getElementById('status-indicator');
//         indicator.style.display = 'none';
//     }

//     function showNotification(message, type = 'info') {
//         // Create notification element if it doesn't exist
//         let notification = document.getElementById('notification');
//         if (!notification) {
//             notification = document.createElement('div');
//             notification.id = 'notification';
//             notification.style.position = 'absolute';
//             notification.style.bottom = '80px';
//             notification.style.left = '50%';
//             notification.style.transform = 'translateX(-50%)';
//             notification.style.padding = '10px 15px';
//             notification.style.borderRadius = '5px';
//             notification.style.color = 'white';
//             notification.style.fontWeight = 'bold';
//             notification.style.zIndex = '1000';
//             notification.style.opacity = '0';
//             notification.style.transition = 'opacity 0.3s ease';
//             document.body.appendChild(notification);
//         }

//         // Set color based on type
//         const colors = {
//             'success': 'rgba(25, 135, 84, 0.9)',
//             'error': 'rgba(220, 53, 69, 0.9)',
//             'warning': 'rgba(255, 193, 7, 0.9)',
//             'info': 'rgba(13, 110, 253, 0.9)'
//         };
        
//         notification.style.backgroundColor = colors[type] || colors.info;
//         notification.textContent = message;
//         notification.style.opacity = '1';

//         // Hide after 3 seconds
//         setTimeout(() => {
//             notification.style.opacity = '0';
//         }, 3000);
//     }

//     // Initialize measure control
//     class MeasureControl {
//         onAdd(map) {
//             this._map = map;
//             this._container = document.createElement('div');
//             this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
            
//             this._measureButton = document.createElement('button');
//             this._measureButton.className = 'maplibregl-ctrl-icon maplibregl-ctrl-measure';
//             this._measureButton.innerHTML = '<span class="fas fa-ruler"></span>';
//             this._measureButton.type = 'button';
//             this._measureButton.title = 'Measure distance';
            
//             this._measureButton.onclick = () => this.toggleMeasure();
            
//             this._container.appendChild(this._measureButton);
            
//             this._active = false;
//             this._markers = [];
//             this._line = null;
//             this._distance = 0;
//             this._popup = null;
            
//             return this._container;
//         }

//         onRemove() {
//             this._container.parentNode.removeChild(this._container);
//             this._map = undefined;
//         }

//         toggleMeasure() {
//             if (this._active) {
//                 this.deactivate();
//             } else {
//                 this.activate();
//             }
//         }

//         activate() {
//             this._active = true;
//             this._measureButton.classList.add('active');
            
//             // Show instructions
//             showNotification('Click on the map to start measuring. Click again to add points. Double-click to finish.', 'info');
            
//             this._map.getCanvas().style.cursor = 'crosshair';
            
//             this._map.on('click', this._handleClick = this.handleClick.bind(this));
//             this._map.on('dblclick', this._handleDblClick = this.handleDblClick.bind(this));
//             this._map.on('mousemove', this._handleMouseMove = this.handleMouseMove.bind(this));
            
//             // Disable other interactions
//             if (drawControl) {
//                 drawControl.disable();
//             }
//         }

//         deactivate() {
//             this._active = false;
//             this._measureButton.classList.remove('active');
            
//             this._map.getCanvas().style.cursor = '';
            
//             // Remove event listeners
//             this._map.off('click', this._handleClick);
//             this._map.off('dblclick', this._handleDblClick);
//             this._map.off('mousemove', this._handleMouseMove);
            
//             // Remove all markers and lines
//             this.reset();
//         }

//         reset() {
//             // Remove markers
//             this._markers.forEach(marker => marker.remove());
//             this._markers = [];
            
//             // Remove line
//             if (this._line && map.getSource('measure-line')) {
//                 map.removeLayer('measure-line-layer');
//                 map.removeSource('measure-line');
//                 this._line = null;
//             }
            
//             // Remove popup
//             if (this._popup) {
//                 this._popup.remove();
//                 this._popup = null;
//             }
            
//             this._distance = 0;
//         }

//         handleClick(e) {
//             const point = [e.lngLat.lng, e.lngLat.lat];
            
//             // Add marker
//             const marker = new maplibregl.Marker({
//                 color: '#FF0000',
//                 draggable: false
//             }).setLngLat(point).addTo(this._map);
            
//             this._markers.push(marker);
            
//             // Draw or update line
//             this.updateLine();
//         }

//         handleDblClick(e) {
//             // Prevent regular click from being triggered
//             e.preventDefault();
            
//             // Finish measuring
//             this.finishMeasurement();
//         }

//         handleMouseMove(e) {
//             if (this._markers.length > 0) {
//                 const points = this._markers.map(marker => marker.getLngLat().toArray());
//                 points.push([e.lngLat.lng, e.lngLat.lat]);
                
//                 this.updateLine(points);
//                 this.updateDistanceDisplay(points);
//             }
//         }

//         updateLine(points) {
//             if (!points) {
//                 points = this._markers.map(marker => marker.getLngLat().toArray());
//             }
            
//             if (points.length < 2) return;
            
//             const geojson = {
//                 'type': 'Feature',
//                 'geometry': {
//                     'type': 'LineString',
//                     'coordinates': points
//                 }
//             };
            
//             if (map.getSource('measure-line')) {
//                 map.getSource('measure-line').setData(geojson);
//             } else {
//                 map.addSource('measure-line', {
//                     'type': 'geojson',
//                     'data': geojson
//                 });
                
//                 map.addLayer({
//                     'id': 'measure-line-layer',
//                     'type': 'line',
//                     'source': 'measure-line',
//                     'paint': {
//                         'line-color': '#FF0000',
//                         'line-width': 2,
//                         'line-dasharray': [2, 1]
//                     }
//                 });
//             }
            
//             this._line = geojson;
//         }

//         updateDistanceDisplay(points) {
//             if (!points) {
//                 points = this._markers.map(marker => marker.getLngLat().toArray());
//             }
            
//             if (points.length < 2) return;
            
//             // Calculate total distance
//             let distance = 0;
//             for (let i = 1; i < points.length; i++) {
//                 const from = turf.point(points[i - 1]);
//                 const to = turf.point(points[i]);
//                 distance += turf.distance(from, to, {units: 'kilometers'});
//             }
            
//             this._distance = distance;
            
//             // Update or create popup
//             if (!this._popup) {
//                 this._popup = new maplibregl.Popup({
//                     closeButton: false,
//                     closeOnClick: false
//                 });
//             }
            
//             const lastPoint = points[points.length - 1];
//             this._popup.setLngLat(lastPoint)
//                 .setHTML(`<strong>Distance:</strong> ${distance.toFixed(2)} km`)
//                 .addTo(this._map);
//         }

//         finishMeasurement() {
//             // Keep the final measurement display
//             if (this._markers.length > 1) {
//                 showNotification(`Measured distance: ${this._distance.toFixed(2)} km`, 'success');
//             }
            
//             // Deactivate the measure tool
//             this.deactivate();
//         }
//     }

//     // Initialize the controls
//     const measureControl = new maplibregl.Control(new MeasureControl());
//     map.addControl(measureControl, 'top-left');
// });