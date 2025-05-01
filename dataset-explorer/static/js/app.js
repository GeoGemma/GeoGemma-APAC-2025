/**
 * Main application initialization
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize map
  MapManager.init();
  
  // Initialize UI components
  UI.init();
  
  // Initialize search functionality
  Search.initEventListeners();
  
  console.log('GEE Dataset Explorer initialized');
});
