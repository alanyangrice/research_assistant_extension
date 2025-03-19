// Constants
const AUTH_SERVER_URL = 'http://localhost:3001'; // Change in production
const TEST_LOGIN_ENDPOINT = `${AUTH_SERVER_URL}/api/auth/test-google`;
const USER_REGISTER_ENDPOINT = `${AUTH_SERVER_URL}/api/user/register`;

// State
let currentUser = null;
let accessToken = null;

// Wait for the DOM to be loaded
document.addEventListener('DOMContentLoaded', initialize);

// Initialize the popup
async function initialize() {
  showLoading();
  
  // Get DOM elements
  const optionsButton = document.getElementById('options-button');
  const logoutButton = document.getElementById('logout-button');
  const testLoginButton = document.getElementById('test-login-button');
  const subscriptionInfo = document.getElementById('subscription-info');
  
  // Add event listeners
  optionsButton.addEventListener('click', openOptions);
  logoutButton.addEventListener('click', logout);
  testLoginButton.addEventListener('click', useTestLogin);
  
  // Add click event to toggle dropdown
  if (subscriptionInfo) {
    subscriptionInfo.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSubscriptionDropdown();
    });
    
    // Initially hide the subscription info until we know the user's status
    subscriptionInfo.classList.add('hidden');
  }
  
  // Close dropdown when clicking elsewhere
  document.addEventListener('click', () => {
    const dropdown = document.getElementById('subscription-dropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  });
  
  // Prevent dropdown from closing when clicking inside it
  const dropdown = document.getElementById('subscription-dropdown');
  if (dropdown) {
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Check if user is already logged in or trigger auto-login
  await checkLoginStatus();
}

// Show loading state
function showLoading() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('logged-in-section').classList.add('hidden');
  document.getElementById('loading-section').classList.remove('hidden');
}

// Show logged-in state
function showLoggedIn() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('logged-in-section').classList.remove('hidden');
  
  // Update user info in UI
  if (currentUser) {
    document.getElementById('user-name').textContent = currentUser.fullName || 'User';
    document.getElementById('user-email').textContent = currentUser.email || '';
    
    const avatarImg = document.getElementById('user-avatar-img');
    if (currentUser.profilePicture) {
      avatarImg.src = currentUser.profilePicture;
    } else {
      avatarImg.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.fullName || 'User');
    }

    // Show subscription info if available
    if (currentUser.subscription) {
      const subscriptionInfo = document.getElementById('subscription-info');
      const planNameEl = document.getElementById('plan-name');
      const freeTier = document.getElementById('free-tier');
      const premiumTier = document.getElementById('premium-tier');
      
      // Set current plan
      const planName = currentUser.subscription.hasSubscription 
        ? (currentUser.subscription.plan || 'Premium') 
        : 'Free';
      
      if (planNameEl) {
        planNameEl.textContent = planName;
      }
      
      // Add premium class if user has subscription
      if (currentUser.subscription.hasSubscription) {
        subscriptionInfo.classList.add('premium');
        
        // Mark the current tier in dropdown
        if (freeTier) freeTier.classList.remove('current');
        if (premiumTier) premiumTier.classList.add('current');
      } else {
        subscriptionInfo.classList.remove('premium');
        
        // Mark the current tier in dropdown
        if (freeTier) freeTier.classList.add('current');
        if (premiumTier) premiumTier.classList.remove('current');
      }
      
      // Show the subscription info
      subscriptionInfo.classList.remove('hidden');
    }
  }
}

// Toggle subscription dropdown visibility
function toggleSubscriptionDropdown() {
  const dropdown = document.getElementById('subscription-dropdown');
  const subscriptionInfo = document.getElementById('subscription-info');
  
  if (dropdown && subscriptionInfo) {
    dropdown.classList.toggle('hidden');
    
    if (!dropdown.classList.contains('hidden')) {
      // Position the dropdown below the subscription info
      const rect = subscriptionInfo.getBoundingClientRect();
      
      // Set the width to match the subscription button
      dropdown.style.width = `${rect.width}px`;
      
      // Position dropdown
      dropdown.style.top = `${rect.bottom + window.scrollY}px`;
      dropdown.style.left = `${rect.left + window.scrollX}px`;
    }
  }
}

// Show logged-out state and initiate auto-login
function showLoggedOut() {
  document.getElementById('logged-in-section').classList.add('hidden');
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('login-section').classList.remove('hidden');
  
  // Auto-login with Chrome Identity (non-interactive first)
  tryAutoLogin();
}

// Check if user is logged in
async function checkLoginStatus() {
  try {
    // Try to get token from storage
    const authData = await new Promise(resolve => {
      chrome.storage.local.get(['auth'], data => {
        resolve(data.auth || null);
      });
    });
    
    if (!authData || !authData.token) {
      showLoggedOut();
      return;
    }
    
    // Set token from storage
    accessToken = authData.token;
    
    // Since we're using Chrome Identity directly, we can just use the user info we stored
    if (authData.user) {
      currentUser = authData.user;
      
      // If we don't have subscription info, register with the backend
      if (!currentUser.subscription) {
        try {
          const userData = await registerUserWithBackend(currentUser);
          if (userData) {
            currentUser = {
              ...currentUser,
              subscription: userData.subscription,
              id: userData.id
            };
            
            // Update stored user data with subscription info
            chrome.storage.local.set({
              auth: {
                ...authData,
                user: currentUser
              }
            });
          }
        } catch (error) {
          console.error('Error registering with backend:', error);
        }
      }
      
      showLoggedIn();
      return;
    }
    
    // If no user info but we have a token, try to get user info
    getUserInfo()
      .then(user => {
        if (user) {
          currentUser = user;
          // Register with backend to get subscription info
          registerUserWithBackend(currentUser)
            .then(userData => {
              if (userData) {
                currentUser = {
                  ...currentUser,
                  subscription: userData.subscription,
                  id: userData.id
                };
                
                // Update stored user data
                chrome.storage.local.set({
                  auth: {
                    token: accessToken,
                    user: currentUser,
                    timestamp: Date.now()
                  }
                });
              }
              showLoggedIn();
            })
            .catch(error => {
              console.error('Error registering with backend:', error);
              showLoggedIn();
            });
        } else {
          // If token is invalid, try to refresh
          chrome.runtime.sendMessage({ action: 'checkToken' }, (response) => {
            if (response && response.success) {
              checkLoginStatus(); // Re-check after refresh
            } else {
              showLoggedOut();
            }
          });
        }
      })
      .catch(() => showLoggedOut());
  } catch (error) {
    console.error('Error checking login status:', error);
    showLoggedOut();
  }
}

// Try to automatically log in using Chrome Identity
function tryAutoLogin() {
  chrome.identity.getAuthToken({ interactive: false }, token => {
    if (token) {
      // We have a token, process it
      processAuthToken(token);
    } else {
      // Non-interactive login failed, show test login option
      console.log('Non-interactive login failed, user may need to manually sign in to Chrome');
    }
  });
}

// Process an auth token from Chrome Identity
async function processAuthToken(token) {
  try {
    console.log('Processing Chrome Identity token...');
    
    // Get user profile directly from Google
    const userInfo = await getUserProfileWithToken(token);
    
    // Set user information directly from Google
    currentUser = {
      email: userInfo.email,
      fullName: userInfo.name,
      profilePicture: userInfo.picture,
      googleId: userInfo.sub
    };
    
    // Register user with backend to store in database and get subscription info
    try {
      const userData = await registerUserWithBackend(currentUser);
      if (userData) {
        currentUser = {
          ...currentUser,
          subscription: userData.subscription,
          id: userData.id
        };
      }
    } catch (error) {
      console.error('Error registering with backend:', error);
    }
    
    // Store token and user info in Chrome storage
    chrome.storage.local.set({
      auth: {
        token: token,
        user: currentUser,
        timestamp: Date.now()
      }
    });
    
    // Set access token for this session
    accessToken = token;
    
    console.log('Login successful, user:', currentUser.email);
    showLoggedIn();
    
  } catch (error) {
    console.error('Error processing token:', error);
    
    // Clear token cache if we had an error
    chrome.identity.removeCachedAuthToken({ token });
  }
}

// Register user with backend to store in database and get subscription info
async function registerUserWithBackend(user) {
  try {
    const response = await fetch(USER_REGISTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user })
    });
    
    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error registering user with backend:', error);
    throw error;
  }
}

// Get user profile information from Google
async function getUserProfileWithToken(token) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get user profile: ${response.status}`);
  }
  
  return response.json();
}

// Get user info using current token
async function getUserInfo() {
  try {
    if (!accessToken) return null;
    
    // For Chrome Identity, we can just request the user profile directly
    return getUserProfileWithToken(accessToken)
      .then(profile => ({
        id: profile.sub,
        email: profile.email,
        fullName: profile.name,
        profilePicture: profile.picture,
        googleId: profile.sub
      }))
      .catch(() => null);
    
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

// Logout user
async function logout() {
  try {
    showLoading();
    
    // Clear Chrome token
    if (accessToken) {
      chrome.identity.removeCachedAuthToken({ token: accessToken });
    }
    
    // Clear stored auth data
    chrome.storage.local.remove('auth');
    
    // Reset state
    accessToken = null;
    currentUser = null;
    
    showLoggedOut();
  } catch (error) {
    console.error('Error during logout:', error);
    // Still show logged out even if there's an error
    showLoggedOut();
  }
}

// Open options page
function openOptions() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}

// Use test login for development
async function useTestLogin() {
  try {
    showLoading();
    
    console.log('Using test login endpoint');
    
    // Call the test endpoint
    const response = await fetch(TEST_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Test login failed: ${response.status} - ${errorText}`);
    }
    
    const authData = await response.json();
    
    // Save token to Chrome storage
    accessToken = authData.accessToken;
    currentUser = authData.user;
    
    chrome.storage.local.set({
      auth: {
        token: accessToken,
        user: currentUser,
        timestamp: Date.now()
      }
    });
    
    console.log('Test login successful, user:', currentUser.email);
    showLoggedIn();
    
  } catch (error) {
    console.error('Error during test login:', error);
    alert(`Test login failed: ${error.message}`);
    showLoggedOut();
  }
}