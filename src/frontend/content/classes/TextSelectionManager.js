import config from './config.js';

class TextSelectionManager {
  constructor(documentManager, apiService, sidebarManager) {
    console.log('Initializing TextSelectionManager');
    this.documentManager = documentManager;
    this.apiService = apiService;
    this.sidebarManager = sidebarManager;
    this.selectedText = "";
    this.buttonTimeoutId = null;
    this.isProcessingExplanation = false;
    this.lastProcessedTime = 0;
    this.selectionTimeout = null;
    this.eventListeners = []; // Track event listeners for cleanup
  }

  initialize() {
    // Handle text selection on mouseup
    const mouseupListener = (e) => {
      // Only process if it's a left-click
      if (e.button === 0) {
        try {
          // Get the selection immediately
          const selection = window.getSelection();
          const text = selection ? selection.toString().trim() : "";
          
          if (text) {
            console.log('Text selected:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
            this.showExplanationButton(e, text);
          }
        } catch (error) {
          console.error('Error handling text selection on mouseup:', error);
          this.sidebarManager.showError('Error selecting text: ' + error.message);
        }
      }
    };
    document.addEventListener('mouseup', mouseupListener);
    this.eventListeners.push({ element: document, type: 'mouseup', listener: mouseupListener });
    
    // Handle selection changes
    const selectionChangeListener = () => {
      try {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : "";
        
        if (!text) {
          this.removeExplanationButton();
        }
      } catch (error) {
        console.error('Error handling selection change:', error);
      }
    };
    document.addEventListener('selectionchange', selectionChangeListener);
    this.eventListeners.push({ element: document, type: 'selectionchange', listener: selectionChangeListener });
    
    // Other event listeners
    const mousedownListener = (e) => {
      if (!e.target.closest('#research-assistant-button')) {
        this.removeExplanationButton();
      }
    };
    document.addEventListener('mousedown', mousedownListener);
    this.eventListeners.push({ element: document, type: 'mousedown', listener: mousedownListener });
    
    const keydownListener = () => this.removeExplanationButton();
    document.addEventListener('keydown', keydownListener);
    this.eventListeners.push({ element: document, type: 'keydown', listener: keydownListener });
    
    // Handle explanation completion
    const messageListener = (event) => {
      if (event.data?.action === 'explanationComplete') {
        this.isProcessingExplanation = false;
        this.lastProcessedTime = Date.now();
      }
    };
    window.addEventListener('message', messageListener);
    this.eventListeners.push({ element: window, type: 'message', listener: messageListener });
  }

  showExplanationButton(event, textSelection) {
    if (!textSelection || this.isProcessingExplanation) {
      console.log('Skipping button show: no text or processing explanation');
      return;
    }
    
    this.removeExplanationButton();
    
    try {
      const button = document.createElement('div');
      button.id = 'research-assistant-button';
      button.textContent = 'Explain';
      button.setAttribute('data-selected-text', textSelection);
      
      // Add additional debugging
      console.log('Created button with text selection:', textSelection);
    
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
    
        // 1) Trim trailing whitespace if the selection ends in a text node
        if (range.endContainer.nodeType === Node.TEXT_NODE) {
          const text = range.endContainer.textContent;
          let newOffset = range.endOffset;
          while (newOffset > 0 && /\s/.test(text[newOffset - 1])) {
            newOffset--;
          }
          range.setEnd(range.endContainer, newOffset);
        }
    
        // 2) Get all client rects for the selection
        let rects = Array.from(range.getClientRects());
    
        // Optional: Filter out zero-width/height rects if needed
        rects = rects.filter(r => r.width > 0 && r.height > 0);
    
        if (rects.length > 0) {
          // 3) Sort rects by top, then by left (reading order)
          rects.sort((a, b) => {
            if (a.top === b.top) {
              return a.left - b.left;
            }
            return a.top - b.top;
          });
          
          // Use the last rect for button positioning (end of selection)
          const lastRect = rects[rects.length - 1];
          
          // Only set position coordinates inline - all other styling comes from CSS
          button.style.left = `${window.scrollX + lastRect.right + 5}px`;
          button.style.top = `${window.scrollY + lastRect.top - 10}px`;
          
          // Create a more reliable click handler
          console.log('Adding click handler to button');
          
          // Define the handler function
          const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Button clicked! Event type:', e.type);
            this.handleButtonClick(e, button);
            return false;
          };
          
          // Add multiple event listeners for redundancy
          button.addEventListener('click', clickHandler);
          button.addEventListener('mousedown', clickHandler);
          button.addEventListener('mouseup', clickHandler);
          
          // Append to body
          document.body.appendChild(button);
          console.log('Button added to DOM at position:', {left: button.style.left, top: button.style.top});
          
          // Auto-remove button after 5 seconds
          this.buttonTimeoutId = setTimeout(() => this.removeExplanationButton(), 5000);
        } else {
          console.warn('No valid rects found for selection');
        }
      } else {
        console.warn('No range found in selection');
      }
    } catch (error) {
      console.error('Error showing explanation button:', error);
    }
  }

  handleButtonClick(e, button) {
    try {
      console.log('Button clicked, getting text to explain...');
      const textToExplain = button.getAttribute('data-selected-text');
      
      if (!textToExplain?.trim()) {
        console.error('No text found in button data attribute');
        this.sidebarManager.showError('No text selected for explanation');
        return;
      }
      
      console.log('Text to explain:', textToExplain);
      this.isProcessingExplanation = true;
      this.generateExplanation(textToExplain);
      this.removeExplanationButton();
    } catch (error) {
      console.error('Error handling button click:', error);
      this.sidebarManager.showError('Error processing selection: ' + error.message);
      this.isProcessingExplanation = false;
    }
  }

  removeExplanationButton() {
    const button = document.getElementById('research-assistant-button');
    if (button) {
      button.remove();
      console.log('Button removed from DOM');
    }
    if (this.buttonTimeoutId) {
      clearTimeout(this.buttonTimeoutId);
      this.buttonTimeoutId = null;
    }
  }

  async generateExplanation(textToExplain) {
    if (!textToExplain?.trim()) {
      console.error('No text selected for explanation');
      this.sidebarManager.showError('No text selected for explanation');
      this.isProcessingExplanation = false;
      return;
    }
    
    console.log('Starting explanation generation for text:', textToExplain.substring(0, 50) + (textToExplain.length > 50 ? '...' : ''));
    this.sidebarManager.show();
    this.sidebarManager.setLoading(true);
    
    try {
      console.log('Extracting context...');
      const context = this.documentManager.extractSurroundingContext(textToExplain);
      console.log('Context extracted, length:', context.length);
      
      // Check if backend is reachable
      console.log('Checking backend connection...');
      const isBackendReachable = await this.apiService.checkBackendConnection();
      console.log('Backend reachable:', isBackendReachable);
      
      if (!isBackendReachable) {
        throw new Error(`Cannot connect to backend server at ${config.BACKEND_URL}. Please verify the server is running and accessible.`);
      }
      
      // DEBUGGING: Try sending to echo endpoint directly first
      try {
        console.log('Sending test data to echo endpoint...');
        const echoResponse = await fetch(`${config.BACKEND_URL}/echo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'omit',
          body: JSON.stringify({
            test: true,
            selectedText: textToExplain.substring(0, 100) + (textToExplain.length > 100 ? '...' : ''),
            timestamp: new Date().toISOString()
          })
        });
        
        const echoData = await echoResponse.json();
        console.log('Echo response:', echoData);
        
        if (!echoResponse.ok) {
          console.warn('Echo test failed, but continuing with explanation...');
        } else {
          console.log('Echo test succeeded, proceeding with explanation');
        }
      } catch (echoError) {
        console.error('Echo test failed:', echoError);
        throw new Error(`Failed to communicate with backend server: ${echoError.message}`);
      }
      
      // First try a test request to make sure the connection is working
      try {
        console.log('Testing backend connection via test endpoint...');
        const testResponse = await fetch(`${config.BACKEND_URL}/test-api`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors'
        });
        console.log('Test response status:', testResponse.status);
        if (!testResponse.ok) {
          console.warn('Test endpoint not accessible, but continuing anyway...');
        } else {
          console.log('Test endpoint accessible, proceeding with explanation request');
        }
      } catch (testError) {
        console.warn('Test request failed, but continuing anyway:', testError);
      }
      
      console.log('Generating explanation via API...');
      console.log('API URL:', `${config.BACKEND_URL}/api/explanation`);
      console.log('Request payload:', {
        selectedText: textToExplain.substring(0, 100) + (textToExplain.length > 100 ? '...' : ''),
        documentContext: context ? context.substring(0, 100) + (context.length > 100 ? '...' : '') : 'none',
        citationTexts: this.documentManager.documentReferences ? this.documentManager.documentReferences.length : 0
      });
      
      const explanation = await this.apiService.generateExplanation({
        selectedText: textToExplain,
        documentContext: context,
        citationTexts: this.documentManager.documentReferences || []
      });
      
      if (!explanation) {
        throw new Error('No explanation received from API');
      }
      
      console.log('Explanation received, length:', explanation.length);
      this.sidebarManager.showExplanation({
        text: textToExplain,
        explanation: explanation,
        type: 'general'
      });
    } catch (error) {
      console.error('Error generating explanation:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      this.sidebarManager.showError(error.message || 'Failed to generate explanation');
    } finally {
      this.sidebarManager.setLoading(false);
      this.isProcessingExplanation = false;
      window.postMessage({ action: 'explanationComplete' }, '*');
    }
  }
  
  cleanup() {
    console.log('Cleaning up TextSelectionManager');
    
    // Remove all registered event listeners
    this.eventListeners.forEach(({ element, type, listener }) => {
      element.removeEventListener(type, listener);
    });
    this.eventListeners = [];
    
    // Clear any pending timeouts
    if (this.buttonTimeoutId) {
      clearTimeout(this.buttonTimeoutId);
      this.buttonTimeoutId = null;
    }
    
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
      this.selectionTimeout = null;
    }
    
    // Remove UI elements
    this.removeExplanationButton();
  }
}

export default TextSelectionManager; 