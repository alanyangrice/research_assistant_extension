import DocumentManager from './DocumentManager.js';
import ApiService from './ApiService.js';
import SidebarManager from './SidebarManager.js';
import TextSelectionManager from './TextSelectionManager.js';

class ResearchAssistant {
  constructor() {
    console.log('Initializing ResearchAssistant');
    this.documentManager = new DocumentManager();
    this.apiService = new ApiService();
    this.sidebarManager = new SidebarManager();
    this.textSelectionManager = new TextSelectionManager(
      this.documentManager,
      this.apiService,
      this.sidebarManager
    );
    this.isInitialized = false;
    this.unloadListener = null;
  }

  initialize() {
    console.log('Starting ResearchAssistant initialization');
    try {
      if (this.isInitialized) return;
      
      this.documentManager.initialize();
      this.sidebarManager.initialize();
      this.textSelectionManager.initialize();
      
      // Set up cleanup handler for when extension is unloaded
      this.unloadListener = () => this.cleanup();
      window.addEventListener('beforeunload', this.unloadListener);
      
      this.isInitialized = true;
      console.log('ResearchAssistant initialization complete');
    } catch (error) {
      console.error('Error during ResearchAssistant initialization:', error);
      this.sidebarManager.showError("Initialization error: " + error.message);
    }
  }
  
  cleanup() {
    try {
      console.log('Cleaning up ResearchAssistant');
      
      // Clean up all managers
      if (this.textSelectionManager) {
        this.textSelectionManager.cleanup();
      }
      
      if (this.documentManager) {
        this.documentManager.cleanup();
      }
      
      if (this.apiService) {
        this.apiService.cleanup();
      }
      
      if (this.sidebarManager) {
        this.sidebarManager.cleanup();
      }
      
      // Remove unload listener
      if (this.unloadListener) {
        window.removeEventListener('beforeunload', this.unloadListener);
        this.unloadListener = null;
      }
      
      // Remove any lingering UI elements
      const button = document.getElementById('research-assistant-button');
      if (button) button.remove();
      
      const notification = document.getElementById('research-assistant-notification');
      if (notification) notification.remove();
      
      this.isInitialized = false;
      console.log('ResearchAssistant cleanup complete');
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}

export default ResearchAssistant; 