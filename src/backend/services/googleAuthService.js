const { OAuth2Client } = require('google-auth-library');
const pool = require('../userDb/userdb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Google OAuth client - only needed for test endpoints
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Constants for token expiration (for test tokens only)
const ACCESS_TOKEN_EXPIRES = '15m';

/**
 * For testing purposes only - Creates a test user account
 * @param {string} mockToken - Placeholder token (not used)
 * @returns {Object} Test user data and tokens
 */
async function mockVerifyGoogleToken(mockToken) {
  console.log('MOCK: Creating test user account');
  try {
    // Mock user data
    const email = 'test@example.com';
    const name = 'Test User';
    const picture = 'https://example.com/profile.jpg';
    const googleId = 'mock-google-id-123456';
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2', 
      [googleId, email]
    );
    
    let userId;
    let userData;
    
    if (existingUser.rows.length === 0) {
      // Create new user
      const newUserQuery = `
        INSERT INTO users (email, full_name, google_id, profile_picture, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
        RETURNING id, email, full_name, profile_picture;
      `;
      const result = await pool.query(newUserQuery, [email, name, googleId, picture]);
      userData = result.rows[0];
      userId = userData.id;
      
      console.log('MOCK: New test user created:', { userId, email });
    } else {
      // Use existing user
      const user = existingUser.rows[0];
      userId = user.id;
      userData = user;
      console.log('MOCK: Using existing test user:', userId);
    }
    
    // Generate a test access token
    const accessToken = jwt.sign(
      { email, googleId, userId }, 
      process.env.JWT_SECRET, 
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );
    
    return {
      accessToken,
      user: {
        id: userId,
        email: userData.email,
        fullName: userData.full_name || name,
        profilePicture: userData.profile_picture || picture
      }
    };
  } catch (error) {
    console.error('MOCK: Error in test verification:', error);
    throw new Error('Test authentication failed: ' + error.message);
  }
}

module.exports = {
  mockVerifyGoogleToken
}; 