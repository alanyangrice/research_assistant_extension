// Wait for the DOM to be loaded
document.addEventListener('DOMContentLoaded', initialize);

// Initialize the popup
function initialize() {
  // Get DOM elements
  const optionsButton = document.getElementById('options-button');
  
  // Add event listeners
  optionsButton.addEventListener('click', openOptions);
}

// Open options page (this would be implemented in a full extension)
function openOptions() {
  // In a real extension, this would open an options page
  // For this demo, just show an alert
  alert('Options functionality would be implemented in a complete extension!');
}