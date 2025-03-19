// Background script for Chrome extension authentication

// Check token validity every 60 minutes
const TOKEN_CHECK_INTERVAL = 60 * 60 * 1000;

// Start token management when extension loads
startTokenManagement();

/**
 * Start the token management process
 */
function startTokenManagement() {
  console.log('Starting Chrome Identity token management service');
  
  // Check token immediately when background script starts
  checkAndUpdateToken();
  
  // Set up periodic token checking
  setInterval(checkAndUpdateToken, TOKEN_CHECK_INTERVAL);
  
  // Listen for messages from popup or content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkToken') {
      checkAndUpdateToken()
        .then(success => sendResponse({ success }))
        .catch(error => {
          console.error('Error checking token:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate that response is async
    }
  });
}

/**
 * Check token validity and update if needed
 */
async function checkAndUpdateToken() {
  try {
    // Get auth data from storage
    const data = await chrome.storage.local.get(['auth']);
    const authData = data.auth;
    
    // If no auth data, nothing to check
    if (!authData || !authData.token) {
      return false;
    }
    
    // Verify token with Google
    const isValid = await verifyToken(authData.token);
    
    if (isValid) {
      console.log('Chrome Identity token is still valid');
      return true;
    }
    
    // If token is not valid, try to get a new one without user interaction
    console.log('Token is invalid or expired, getting a new one');
    
    return await refreshChromeToken(authData.token);
    
  } catch (error) {
    console.error('Error in token management:', error);
    return false;
  }
}

/**
 * Verify a token with Google's userinfo endpoint
 */
async function verifyToken(token) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

/**
 * Refresh the Chrome Identity token
 */
async function refreshChromeToken(oldToken) {
  // Remove the cached token
  chrome.identity.removeCachedAuthToken({ token: oldToken });
  
  // Try to get a new token without user interaction
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        console.log('Could not refresh token without interaction');
        resolve(false);
        return;
      }
      
      // Get user profile data
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          resolve(false);
          return;
        }
        
        const profile = await response.json();
        
        // Update storage with new token and user data
        await chrome.storage.local.set({
          auth: {
            token: token,
            user: {
              id: profile.sub,
              email: profile.email,
              fullName: profile.name,
              profilePicture: profile.picture
            },
            timestamp: Date.now()
          }
        });
        
        console.log('Token refreshed successfully');
        resolve(true);
      } catch (error) {
        console.error('Error refreshing token:', error);
        resolve(false);
      }
    });
  });
} 