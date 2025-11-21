const { pool } = require('../database');

async function addSubscribersTable() {
  try {
    console.log('🔧 Adding subscribers table...');
    
    // Check if table already exists
    const checkTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'subscribers'
    `);

    if (checkTable.rows.length > 0) {
      console.log('✅ Subscribers table already exists. Skipping...');
    } else {
      // Create subscribers table
      await pool.query(`
        CREATE TABLE subscribers (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          verified BOOLEAN DEFAULT false,
          subscribed_at TIMESTAMP DEFAULT NOW(),
          unsubscribed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Created subscribers table');
    }

    // Check if email index exists
    const checkEmailIndex = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'subscribers' AND indexname = 'idx_subscribers_email'
    `);

    if (checkEmailIndex.rows.length > 0) {
      console.log('✅ Subscribers email index already exists. Skipping...');
    } else {
      await pool.query(`
        CREATE INDEX idx_subscribers_email ON subscribers(email)
      `);
      console.log('✅ Added subscribers email index');
    }

    // Check if verified index exists
    const checkVerifiedIndex = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'subscribers' AND indexname = 'idx_subscribers_verified'
    `);

    if (checkVerifiedIndex.rows.length > 0) {
      console.log('✅ Subscribers verified index already exists. Skipping...');
    } else {
      await pool.query(`
        CREATE INDEX idx_subscribers_verified ON subscribers(verified)
      `);
      console.log('✅ Added subscribers verified index');
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  addSubscribersTable();
}

module.exports = addSubscribersTable;

