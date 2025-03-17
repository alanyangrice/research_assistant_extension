import config from './config.js';

class ApiService {
  constructor() {
    console.log('Creating ApiService');
  }
  
  async generateExplanation(payload, retryCount = 0) {
    console.log('Making API request to:', `${config.BACKEND_URL}/api/explanation`);
    console.log('Payload:', {
      selectedText: payload.selectedText?.substring(0, 50) + (payload.selectedText?.length > 50 ? '...' : ''),
      documentContext: payload.documentContext ? `${payload.documentContext.length} chars` : 'none',
      citationTexts: payload.citationTexts ? payload.citationTexts.length : 0
    });
    
    try {
      console.log('About to fetch from API with full URL:', `${config.BACKEND_URL}/api/explanation`);
      const response = await fetch(`${config.BACKEND_URL}/api/explanation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'omit',
        body: JSON.stringify({
          selectedText: payload.selectedText,
          documentContext: payload.documentContext,
          citationTexts: payload.citationTexts || [],
          type: payload.type || 'general'
        })
      });
      
      console.log('Received response from API, status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      console.log('Parsing response JSON...');
      const data = await response.json();
      console.log('API response:', {
        success: data.success,
        explanation: data.explanation ? `${data.explanation.length} chars` : 'none'
      });
      
      if (!data.success) {
        console.error('API reported failure:', data.error);
        throw new Error(data.error || 'Failed to generate explanation');
      }
      
      console.log('Successfully received explanation, returning data');
      return data.explanation;
    } catch (error) {
      console.error('API request failed:', error);
      
      if (retryCount < config.maxRetries) {
        console.log(`Retrying request (${retryCount + 1}/${config.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        return this.generateExplanation(payload, retryCount + 1);
      }
      
      throw error;
    }
  }
  
  async checkBackendConnection() {
    try {
      // Simplified health check URL construction
      const healthUrl = `${config.BACKEND_URL}/health`;
      console.log('Checking backend connection at:', healthUrl);
        
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        cache: 'no-cache'
        // Removed timeout as it's not supported in the fetch API
      });
      
      const isOk = response.ok;
      console.log('Backend health check result:', isOk);
      return isOk;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
  
  cleanup() {
    console.log('Cleaning up ApiService');
    // No active resources to clean up
  }
}

export default ApiService; 