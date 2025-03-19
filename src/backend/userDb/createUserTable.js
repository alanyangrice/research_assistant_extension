const pool = require('./userdb');

// Create a users table
const createTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        full_name VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        profile_picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create index for faster Google ID lookups if it doesn't exist
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    `;
    await pool.query(query);
    console.log('Users table created successfully');
  } catch (err) {
    console.error('Error creating users table:', err);
  }
};

createTable();
