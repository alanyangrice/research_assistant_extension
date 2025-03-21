import config from './config.js';

class SidebarManager {
  constructor() {
    console.log('Creating SidebarManager');
    this.sidebar = null;
    this.visible = false;
    this.sidebarHandle = null;
    this.eventListeners = [];
    this.preventHandleClick = false; // flag to prevent click toggle when dragging
  }

  initialize() {
    console.log('Initializing SidebarManager');
    this.createSidebar();
    this.createSidebarHandle();
    
    // Ensure sidebar and handle are in correct states
    this.visible = false;
    
    const messageListener = event => {
      if (event.data?.action === 'closeSidebar') this.hide();
    };
    window.addEventListener('message', messageListener);
    this.eventListeners.push({ element: window, type: 'message', listener: messageListener });
  }

  createSidebarHandle() {
    const existingHandle = document.getElementById('research-assistant-handle');
    if (existingHandle) existingHandle.remove();
    
    this.sidebarHandle = document.createElement('div');
    this.sidebarHandle.id = 'research-assistant-handle';
    this.sidebarHandle.className = 'sidebar-handle';
    this.sidebarHandle.innerHTML = 'Research Assistant';
    
    // Click handler - toggles visibility only if not dragging
    const handleClickListener = (e) => {
      if (this.preventHandleClick) {
        // Reset the flag and do not toggle
        this.preventHandleClick = false;
        e.preventDefault();
        return;
      }
      if (this.visible) {
        this.hide();
      } else {
        this.show();
      }
      // Prevent default to avoid text selection
      e.preventDefault();
    };
    
    this.sidebarHandle.addEventListener('click', handleClickListener);
    this.eventListeners.push({ 
      element: this.sidebarHandle, 
      type: 'click', 
      listener: handleClickListener 
    });

    // Mousedown listener for resizing the sidebar
    this.sidebarHandle.addEventListener('pointerdown', (e) => {
      // Only allow resizing when the sidebar is visible
      if (!this.visible) return;
      
      e.preventDefault();
      e.target.setPointerCapture(e.pointerId);
      document.body.style.cursor = 'ew-resize';

      this.sidebar.style.transition = 'none';
      this.sidebarHandle.style.transition = 'none';
      
      let startX = e.clientX;
      let startWidth = parseInt(this.sidebar.style.width, 10) || 350;
      let dragging = false;
      
      const onPointerMove = (moveEvent) => {
        dragging = true;
        // Calculate the change in pointer position relative to its start.
        // If the pointer moves left, delta is positive, increasing the width.
        // If it moves right, delta is negative, decreasing the width.
        const delta = startX - moveEvent.clientX;
        let newWidth = startWidth + delta;
        // Clamp the new width between 300px and 600px
        newWidth = Math.max(300, Math.min(newWidth, 600));
        
        // Update the sidebar width and reposition the handle so they remain in sync
        this.sidebar.style.width = newWidth + 'px';
        this.sidebarHandle.style.right = newWidth + 'px';
        console.log('New sidebar width:', newWidth);
      };
    
      const onPointerUp = () => {
        document.body.style.cursor = '';
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);

        this.sidebar.style.transition = 'right 0.3s ease, width 0.3s ease';
        this.sidebarHandle.style.transition = 'right 0.3s ease';
        
        // If dragging occurred, prevent the subsequent click event from toggling the sidebar
        if (dragging) {
          this.preventHandleClick = true;
        }
      };
    
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });    
    
    document.body.appendChild(this.sidebarHandle);
    console.log('Sidebar handle created and added to the page');
  }

  createSidebar() {
    console.log('Creating sidebar');
    const existingSidebar = document.getElementById('research-assistant-sidebar');
    if (existingSidebar) existingSidebar.remove();
    
    this.sidebar = document.createElement('iframe');
    // Use chrome.runtime.getURL for manifest v3
    this.sidebar.src = chrome.runtime.getURL('src/frontend/sidebar/sidebar.html');
    this.sidebar.id = 'research-assistant-sidebar';
    this.sidebar.className = 'research-assistant-sidebar research-assistant-sidebar-collapsed';
    
    // Set initial width to match CSS default
    this.sidebar.style.width = '350px';
    
    // Ensure sidebar is initially hidden off-screen
    this.sidebar.style.right = '-350px';
    
    document.body.appendChild(this.sidebar);
    console.log('Sidebar created in collapsed state');
  }

  show() {
    console.log('Showing sidebar');
    if (!document.getElementById('research-assistant-sidebar')) {
      this.createSidebar();
    }
    
    // Get current width before making changes
    const currentWidth = parseInt(this.sidebar.style.width || '350', 10);
    
    this.visible = true;
    // Reset the right property to ensure it shows properly regardless of width
    this.sidebar.style.right = '0';
    this.sidebar.classList.remove('research-assistant-sidebar-collapsed');
    
    // Make sure width is explicitly set
    this.sidebar.style.width = `${currentWidth}px`;
    
    // Update handle position to match sidebar width
    this.sidebarHandle.style.right = `${currentWidth}px`;
    this.sidebarHandle.classList.add('sidebar-handle-expanded');
    this.sidebarHandle.innerHTML = 'Hide';
    
    console.log('Sidebar shown with width:', currentWidth);
  }

  hide() {
    console.log('Hiding sidebar');
    if (this.sidebar) {
      // Get the current width before hiding
      const sidebarWidth = parseInt(this.sidebar.style.width || '350', 10);
      
      // Set a custom right value based on the sidebar's current width
      this.sidebar.style.right = `-${sidebarWidth}px`;
      this.sidebar.classList.add('research-assistant-sidebar-collapsed');
      this.visible = false;
      this.sidebarHandle.classList.remove('sidebar-handle-expanded');
      this.sidebarHandle.innerHTML = 'Research Assistant';
      // Reset handle position when hiding
      this.sidebarHandle.style.right = '0';
    }
    console.log('Sidebar hidden');
  }

  setLoading(isLoading) {
    console.log('Setting loading state:', isLoading);
    if (this.sidebar?.contentWindow) {
      this.sidebar.contentWindow.postMessage({
        action: 'loading',
        state: isLoading
      }, '*');
    }
  }

  showExplanation(data) {
    console.log('Showing explanation:', typeof data === 'string' ? data.substring(0, 100) + '...' : 'data object');
    if (!document.getElementById('research-assistant-sidebar')) {
      this.createSidebar();
    }
    
    // Ensure sidebar is visible
    this.show();
    
    if (this.sidebar?.contentWindow) {
      // Handle both direct explanation strings and structured data objects
      const messageData = typeof data === 'string' 
        ? {
            action: 'explain',
            text: data,
            explanation: data,
            citations: [],
            type: 'general'
          }
        : {
            action: 'explain',
            text: data.text || data,
            explanation: data.explanation || data,
            citations: data.citations || [],
            type: data.type || 'general'
          };
      
      console.log('Sending message to sidebar:', messageData);
      this.sidebar.contentWindow.postMessage(messageData, '*');
      this.sidebar.contentWindow.postMessage({ action: 'explanationComplete' }, '*');
    }
  }

  showError(errorMessage) {
    console.log('Showing error:', errorMessage);
    if (!document.getElementById('research-assistant-sidebar')) {
      this.createSidebar();
    }
    
    // Make sure the sidebar is visible
    this.show();
    this.setLoading(false);
    
    // Send a more detailed error message
    const formattedError = errorMessage.includes('backend server') 
      ? `${errorMessage}\n\nPlease make sure your local backend server is running at ${config.BACKEND_URL}.`
      : errorMessage;
      
    // Log the error to console for debugging
    console.error('Research Assistant Error:', formattedError);
    
    if (this.sidebar?.contentWindow) {
      this.sidebar.contentWindow.postMessage({ 
        action: 'error', 
        error: formattedError
      }, '*');
    }
  }
  
  cleanup() {
    console.log('Cleaning up SidebarManager');
    
    // Remove event listeners
    this.eventListeners.forEach(({ element, type, listener }) => {
      element.removeEventListener(type, listener);
    });
    this.eventListeners = [];
    
    // Remove UI elements
    if (this.sidebarHandle) {
      this.sidebarHandle.remove();
      this.sidebarHandle = null;
    }
    
    if (this.sidebar) {
      this.sidebar.remove();
      this.sidebar = null;
    }
    
    this.visible = false;
  }
}

export default SidebarManager; 