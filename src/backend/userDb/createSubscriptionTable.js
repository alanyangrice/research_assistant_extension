const pool = require('./userdb');

// Create subscriptions table
const createSubscriptionTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        interval VARCHAR(50) NOT NULL, -- 'monthly', 'yearly', etc.
        features JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create user_subscriptions join table
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
        status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'expired'
        payment_provider VARCHAR(100), -- 'stripe', 'paypal', etc.
        payment_id VARCHAR(255), -- External payment ID
        start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Add unique constraint to prevent duplicate active subscriptions
        UNIQUE(user_id, subscription_id, status)
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
    `;
    
    await pool.query(query);
    console.log('Subscription tables created successfully');
  } catch (err) {
    console.error('Error creating subscription tables:', err);
  }
};

// Create subscription tables
createSubscriptionTable(); 