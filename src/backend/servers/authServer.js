const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pool = require('../userDb/userdb');
const { 
  mockVerifyGoogleToken
} = require('../services/googleAuthService');
require('dotenv').config(); // Load environment variables

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET;

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 requests per IP
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Initialize Express
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or extension background pages)
    if (!origin) return callback(null, true);
    
    // Check allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'chrome-extension://'  // Wildcard for Chrome extensions
    ];
    
    // Check if the origin starts with any of the allowed origins
    const allowed = allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      (allowedOrigin.endsWith('//') && origin.startsWith(allowedOrigin))
    );
    
    if (allowed) {
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
  credentials: true // Required for cookies
}));

app.use(cookieParser()); // Parse cookies
app.use(bodyParser.json());

/**
 * Create or update a user in the database based on Google profile data
 * @param {Object} userProfile - User profile data from Google
 * @returns {Object} User data with subscription info
 */
async function createOrUpdateUser(userProfile) {
  const { email, googleId, fullName, profilePicture } = userProfile;
  
  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2', 
      [googleId, email]
    );
    
    let userData;
    
    if (existingUser.rows.length === 0) {
      // Create new user
      const newUserQuery = `
        INSERT INTO users (email, full_name, google_id, profile_picture, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
        RETURNING id, email, full_name, profile_picture;
      `;
      const result = await pool.query(newUserQuery, [email, fullName, googleId, profilePicture]);
      userData = result.rows[0];
      
      console.log('New user created from Chrome Identity:', {
        id: userData.id,
        email
      });
    } else {
      // Update existing user info to keep it current
      const user = existingUser.rows[0];
      
      const updateQuery = `
        UPDATE users 
        SET 
          google_id = COALESCE($1, google_id),
          profile_picture = COALESCE($2, profile_picture),
          full_name = COALESCE($3, full_name),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, email, full_name, profile_picture;
      `;
      const result = await pool.query(updateQuery, [googleId, profilePicture, fullName, user.id]);
      userData = result.rows[0];
      
      console.log('Updated user from Chrome Identity:', userData.id);
    }
    
    // Get subscription info
    const subscriptionInfo = await getUserSubscriptionStatus(userData.id);
    
    return {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      profilePicture: userData.profile_picture,
      subscription: subscriptionInfo
    };
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    throw error;
  }
}

/**
 * Get user's subscription status from database
 * @param {number} userId - User ID 
 * @returns {Object} Subscription status information
 */
async function getUserSubscriptionStatus(userId) {
  try {
    const query = `
      SELECT 
        s.name, s.features, us.status, us.end_date
      FROM 
        user_subscriptions us
      JOIN 
        subscriptions s ON us.subscription_id = s.id
      WHERE 
        us.user_id = $1 AND us.status = 'active' AND (us.end_date IS NULL OR us.end_date > NOW())
      ORDER BY 
        us.created_at DESC
      LIMIT 1;
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return { 
        hasSubscription: false,
        plan: 'free'
      };
    }
    
    const subscription = result.rows[0];
    
    return {
      hasSubscription: true,
      plan: subscription.name,
      features: subscription.features,
      status: subscription.status,
      expiresAt: subscription.end_date
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { hasSubscription: false, plan: 'free' };
  }
}

// Chrome Identity user registration endpoint
app.post('/api/user/register', async (req, res) => {
  try {
    const { user } = req.body;
    
    if (!user || !user.email || !user.googleId) {
      return res.status(400).json({ 
        message: 'Invalid user data. Email and googleId are required.' 
      });
    }
    
    // Create or update user in database
    const userData = await createOrUpdateUser({
      email: user.email,
      googleId: user.googleId,
      fullName: user.fullName || '',
      profilePicture: user.profilePicture || ''
    });
    
    res.json({
      message: 'User registered successfully',
      user: userData
    });
    
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ 
      message: 'Failed to register user', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// TEST ENDPOINT - For development only
app.post('/api/auth/test-google', async (req, res) => {
  try {
    console.log('Test endpoint called for simulating Google auth');
    
    // Use our mock function for testing
    const authData = await mockVerifyGoogleToken('mock-token');
    
    // Send access token in response
    res.json({
      message: 'Test authentication successful',
      token: authData.accessToken,
      accessToken: authData.accessToken,
      user: authData.user
    });
    
  } catch (error) {
    console.error('Error during test authentication:', error);
    res.status(500).json({ message: 'Test authentication failed: ' + error.message });
  }
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Auth server is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
const PORT = process.env.AUTH_PORT || process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Auth server listening on port ${PORT} - Test mode only`);
});