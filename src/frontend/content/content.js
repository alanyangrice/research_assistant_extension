console.log('Starting Research Assistant extension initialization');

// Use dynamic import instead of static import
// Import classes from the subfolder
// Initialize the extension
(() => {
  try {
    // Inject CSS (note: you already declare content.css in your manifest, so this is optional)
    const injectCSS = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      // Ensure the path here is correct relative to your extension's root
      link.href = chrome.runtime.getURL('src/frontend/content/content.css');
      document.head.appendChild(link);
      console.log('Content CSS injected');
    };

    // Wait for the document to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', async () => {
        injectCSS();
        const ResearchAssistantModule = await import(chrome.runtime.getURL('src/frontend/content/classes/ResearchAssistant.js'));
        const ResearchAssistant = ResearchAssistantModule.default;
        const assistant = new ResearchAssistant();
        assistant.initialize();
      });
    } else {
      injectCSS();
      (async () => {
        const ResearchAssistantModule = await import(chrome.runtime.getURL('src/frontend/content/classes/ResearchAssistant.js'));
        const ResearchAssistant = ResearchAssistantModule.default;
        const assistant = new ResearchAssistant();
        assistant.initialize();
      })();
    }

    // Handle extension unloading
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'unload') {
        console.log('Extension unload message received');
        // ResearchAssistant cleanup will be triggered via the beforeunload event
      }
    });

    console.log('Research Assistant extension initialization complete');
  } catch (error) {
    console.error('Error initializing Research Assistant extension:', error);
  }
})();