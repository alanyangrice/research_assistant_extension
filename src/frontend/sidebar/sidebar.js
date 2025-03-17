// Wait for the DOM to be loaded
document.addEventListener('DOMContentLoaded', initialize);

// Debug mode
const debugMode = true;

// Track explanation history
const explanationHistory = [];

// Debug logging function
function debugLog(...args) {
  if (debugMode) {
    console.log("[Sidebar Debug]", ...args);
  }
}

// Initialize the sidebar
function initialize() {
  debugLog("Initializing sidebar");
  
  // Get DOM elements
  const closeButton = document.getElementById('close-button');
  const loadingIndicator = document.getElementById('loading');
  const contentArea = document.getElementById('content');
  const header = document.querySelector('.sidebar-header');
  const initialMessage = document.getElementById('initial-message');
  const currentExplanation = document.getElementById('current-explanation');
  const selectedTextElement = document.getElementById('selected-text');
  
  // Add event listeners
  closeButton.addEventListener('click', closeSidebar);
  
  // Add dragging functionality
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    
    if (e.target === header || e.target === closeButton) {
      isDragging = true;
    }
  }
  
  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      xOffset = currentX;
      yOffset = currentY;
      
      setTranslate(currentX, currentY, window.parent.document.getElementById('research-assistant-sidebar'));
    }
  }
  
  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }
  
  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }
  
  // Add resize functionality
  const sidebarContainer = document.querySelector('.sidebar-container');
  addResizeHandle(sidebarContainer);
  
  // Listen for messages from the content script
  window.addEventListener('message', handleMessage);
  
  // Create history container
  createHistoryContainer();
  
  // Set initial state
  if (loadingIndicator) loadingIndicator.style.display = 'none';
  if (initialMessage) initialMessage.style.display = 'block';
  if (currentExplanation) currentExplanation.style.display = 'none';
  if (selectedTextElement) selectedTextElement.style.display = 'none';
  
  debugLog("Sidebar initialized with default state");
}

// Add resize handle to the sidebar
function addResizeHandle(container) {
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  container.appendChild(resizeHandle);
  
  let isResizing = false;
  let initialWidth, initialHeight;
  
  resizeHandle.addEventListener('mousedown', function(e) {
    isResizing = true;
    initialWidth = container.offsetWidth;
    initialHeight = container.offsetHeight;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    
    const sidebar = window.parent.document.getElementById('research-assistant-sidebar');
    if (sidebar) {
      sidebar.style.width = (initialWidth + (e.clientX - initialX)) + 'px';
      sidebar.style.height = (initialHeight + (e.clientY - initialY)) + 'px';
    }
  });
  
  document.addEventListener('mouseup', function() {
    isResizing = false;
  });
}

// Create the history container for storing multiple explanations
function createHistoryContainer() {
  const contentArea = document.getElementById('content');
  
  // Create history section if it doesn't exist
  if (!document.getElementById('history-container')) {
    // Add a light separator and heading first
    const historyHeading = document.createElement('h3');
    historyHeading.id = 'history-heading';
    historyHeading.classList.add('history-heading');
    historyHeading.textContent = 'Previous Explanations';
    historyHeading.style.display = 'none'; // Initially hidden
    contentArea.appendChild(historyHeading);
    
    // Then add the container
    const historyContainer = document.createElement('div');
    historyContainer.id = 'history-container';
    historyContainer.classList.add('history-container');
    contentArea.appendChild(historyContainer);
    
    debugLog("Created history container");
  }
}

// Handle messages from the content script
function handleMessage(event) {
  debugLog("Received message from content script:", event.data.action);
  
  const message = event.data;
  
  switch (message.action) {
    case 'explain':
      // Display the explanation
      debugLog("Displaying explanation, length:", 
               message.explanation ? message.explanation.length : 0);
      showLoading(false);
      displayExplanation(message.text, message.explanation, message.citations, message.type);
      break;
    
    case 'loading':
      // Show or hide the loading indicator
      debugLog("Loading state changed:", message.state);
      showLoading(message.state);
      break;
    
    case 'error':
      // Display an error message
      debugLog("Error received:", message.error);
      showLoading(false);
      displayError(message.error);
      break;
    
    case 'closeSidebar':
      // Close the sidebar
      debugLog("Closing sidebar");
      closeSidebar();
      break;
    
    case 'explanationComplete':
      // Acknowledge that the explanation is complete and ready for another
      debugLog("Explanation complete, ready for next selection");
      break;
      
    default:
      debugLog("Unknown message action:", message.action);
  }
}

// Show or hide the loading indicator
function showLoading(show, textToExplain = '') {
  const loadingIndicator = document.getElementById('loading');
  const explanationElement = document.getElementById('explanation');
  const selectedTextElement = document.getElementById('selected-text');
  const initialMessage = document.getElementById('initial-message');
  const currentExplanation = document.getElementById('current-explanation');
  const historyContainer = document.getElementById('history-container');
  
  if (!loadingIndicator) {
    debugLog("Error: Loading indicator not found");
    return;
  }
  
  // If we're starting to load a new explanation, move the current one to history first
  if (show) {
    // Add current explanation to history before showing the loading indicator
    addCurrentToHistory();
    
    // Clear the explanation content after moving it to history
    if (explanationElement) explanationElement.innerHTML = '';
    
    // Always clear the previous selected text when starting a new explanation
    if (selectedTextElement) {
      // Update with new text or clear it
      if (textToExplain) {
        selectedTextElement.textContent = textToExplain;
        selectedTextElement.style.display = 'block';
      } else {
        selectedTextElement.textContent = '';
        selectedTextElement.style.display = 'none';
      }
    }
    
    // Show loading indicator and hide other elements
    loadingIndicator.style.display = 'flex';
    if (currentExplanation) currentExplanation.style.display = 'none';
    if (initialMessage) initialMessage.style.display = 'none';
  } else {
    // Hide loading indicator when not loading
    loadingIndicator.style.display = 'none';
    
    // Check if we have any explanations at all (current or history)
    const hasHistory = historyContainer && historyContainer.children.length > 0;
    const hasCurrentExplanation = explanationElement && explanationElement.textContent.trim() !== '';
    
    // Only show initial message if there are no explanations or selected text
    const hasSelectedText = selectedTextElement && selectedTextElement.textContent.trim() !== '';
    
    if (!hasHistory && !hasCurrentExplanation && !hasSelectedText) {
      // Show initial message if no content at all
      if (initialMessage) initialMessage.style.display = 'block';
      if (selectedTextElement) selectedTextElement.style.display = 'none';
      if (currentExplanation) currentExplanation.style.display = 'none';
    } else {
      // Show explanation area if we have content
      if (initialMessage) initialMessage.style.display = 'none';
      if (currentExplanation) currentExplanation.style.display = 'block';
    }
  }
}

// Display an explanation for the selected text
function displayExplanation(text, explanation, citations = [], type = 'general') {
  debugLog("Displaying explanation for text type:", type);
  
  if (!explanation) {
    debugLog("Warning: No explanation provided");
    explanation = "No explanation was generated. Please try again with different text.";
  }
  
  // We don't need to add current to history here anymore since we do it in showLoading
  // when a new explanation is requested
  
  // Always hide the initial message and show the explanation container
  // when displaying an explanation
  const initialMessage = document.getElementById('initial-message');
  const currentExplanation = document.getElementById('current-explanation');
  
  if (initialMessage) initialMessage.style.display = 'none';
  if (currentExplanation) currentExplanation.style.display = 'block';
  
  // Set or update the selected text
  const selectedTextElement = document.getElementById('selected-text');
  if (selectedTextElement) {
    selectedTextElement.textContent = text;
    selectedTextElement.style.display = 'block';
  } else {
    debugLog("Error: Selected text element not found");
  }
  
  // Display the explanation
  const explanationElement = document.getElementById('explanation');
  if (explanationElement) {
    explanationElement.innerHTML = formatExplanation(explanation, type);
  } else {
    debugLog("Error: Explanation element not found");
  }
  
  // Display citations if available
  displayCitations(citations);
  
  // Save this explanation to our history object
  explanationHistory.unshift({
    text,
    explanation,
    citations,
    type,
    timestamp: new Date().toISOString()
  });
  
  debugLog("Added new explanation to history, total:", explanationHistory.length);
  
  // Make sure the history heading is visible if we have history items
  updateHistoryHeadingVisibility();
}

// Add the current main explanation to history before showing a new one
function addCurrentToHistory() {
  const selectedTextElement = document.getElementById('selected-text');
  const explanationElement = document.getElementById('explanation');
  
  // If there's nothing meaningful to add to history, just return
  if (!explanationElement || 
      !selectedTextElement || 
      !selectedTextElement.textContent || 
      explanationElement.querySelector('.initial-message') ||
      explanationElement.querySelector('.error-message')) {
    return;
  }
  
  // Get the history container
  const historyContainer = document.getElementById('history-container');
  
  if (!historyContainer) {
    debugLog("Error: History container not found");
    return;
  }
  
  // Get the explanation content (the actual explanation, not the container)
  const explanationContent = explanationElement.querySelector('.explanation-content');
  if (!explanationContent) {
    debugLog("Error: No explanation content found to add to history");
    return;
  }
  
  // Create a new history item
  const historyItem = document.createElement('div');
  historyItem.className = 'history-item';
  
  // Create a container for the text that was explained
  const historicalText = document.createElement('div');
  historicalText.className = 'history-selected-text';
  historicalText.textContent = selectedTextElement.textContent;
  
  // Create a container for the explanation
  const historicalExplanation = document.createElement('div');
  historicalExplanation.className = 'history-explanation';
  historicalExplanation.innerHTML = explanationContent.innerHTML;
  
  // Add a timestamp
  const timestamp = document.createElement('div');
  timestamp.className = 'history-timestamp';
  timestamp.textContent = new Date().toLocaleTimeString();
  
  // Add a separator
  const separator = document.createElement('hr');
  separator.className = 'history-separator';
  
  // Add all elements to the history item
  historyItem.appendChild(timestamp);
  historyItem.appendChild(historicalText);
  historyItem.appendChild(historicalExplanation);
  historyItem.appendChild(separator);
  
  // Add the item to the history container at the top
  if (historyContainer.firstChild) {
    historyContainer.insertBefore(historyItem, historyContainer.firstChild);
  } else {
    historyContainer.appendChild(historyItem);
  }
  
  // Limit history to 5 items to avoid excessive DOM size
  const historyItems = historyContainer.querySelectorAll('.history-item');
  if (historyItems.length > 5) {
    historyContainer.removeChild(historyItems[historyItems.length - 1]);
  }
  
  // Update history heading visibility
  updateHistoryHeadingVisibility();
}

// Format the explanation based on type
function formatExplanation(explanation, type) {
  // For GPT-generated explanations, we simply use the returned text
  return `<div class="explanation-content">${explanation}</div>`;
}

// Display an error message
function displayError(errorMessage) {
  debugLog("Displaying error:", errorMessage);
  
  // Hide initial message and show explanation container
  const initialMessage = document.getElementById('initial-message');
  const currentExplanation = document.getElementById('current-explanation');
  
  if (initialMessage) initialMessage.style.display = 'none';
  if (currentExplanation) currentExplanation.style.display = 'block';
  
  const explanationElement = document.getElementById('explanation');
  if (!explanationElement) {
    console.error("Error element not found");
    return;
  }
  
  explanationElement.innerHTML = `
    <div class="error-message">
      <p>Sorry, an error occurred while generating the explanation:</p>
      <p>${errorMessage}</p>
      <p>Please try again or select different text.</p>
    </div>
  `;
  
  // Hide citations
  const citationsContainer = document.getElementById('citations-container');
  if (citationsContainer) {
    citationsContainer.style.display = 'none';
  } else {
    debugLog("Error: Citations container not found");
  }
}

// Display citations from the same paper
function displayCitations(citations) {
  const citationsContainer = document.getElementById('citations-container');
  const citationsElement = document.getElementById('citations');
  
  if (!citationsContainer || !citationsElement) {
    debugLog("Error: Citations container or element not found");
    return;
  }
  
  // Clear previous citations
  citationsElement.innerHTML = '';
  
  if (!citations || citations.length === 0) {
    debugLog("No citations to display");
    citationsContainer.style.display = 'none';
    return;
  }
  
  // Show the citations container
  citationsContainer.style.display = 'block';
  
  // Create HTML for each citation
  debugLog("Displaying", citations.length, "citations");
  
  citations.forEach((citation, index) => {
    if (!citation) {
      debugLog("Warning: Empty citation at index", index);
      return;
    }
    
    const citationElement = document.createElement('div');
    citationElement.className = 'citation';
    citationElement.innerHTML = `
      <div class="citation-number">[${index + 1}]</div>
      <div class="citation-text">${citation}</div>
    `;
    citationsElement.appendChild(citationElement);
  });
}

// Close the sidebar
function closeSidebar() {
  debugLog("Sending closeSidebar message to parent");
  window.parent.postMessage({ action: 'closeSidebar' }, '*');
}

// Update history heading visibility based on whether we have history items
function updateHistoryHeadingVisibility() {
  const historyHeading = document.getElementById('history-heading');
  const historyContainer = document.getElementById('history-container');
  
  if (historyHeading && historyContainer) {
    // Only show the heading if there are actual history items
    const hasHistoryItems = historyContainer.children.length > 0;
    historyHeading.style.display = hasHistoryItems ? 'block' : 'none';
    debugLog("Updated history heading visibility:", hasHistoryItems);
  }
}