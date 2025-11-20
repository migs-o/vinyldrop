const { pool } = require('../database');

async function addSubredditColumn() {
  try {
    console.log('🔧 Adding subreddit column to releases table...');
    
    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'releases' AND column_name = 'subreddit'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Subreddit column already exists. Skipping...');
    } else {
      // Add the subreddit column
      await pool.query(`
        ALTER TABLE releases 
        ADD COLUMN subreddit VARCHAR(100)
      `);
      console.log('✅ Added subreddit column');
    }

    // Check if index already exists
    const checkIndex = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'releases' AND indexname = 'idx_releases_subreddit'
    `);

    if (checkIndex.rows.length > 0) {
      console.log('✅ Subreddit index already exists. Skipping...');
    } else {
      // Add the index
      await pool.query(`
        CREATE INDEX idx_releases_subreddit ON releases(subreddit)
      `);
      console.log('✅ Added subreddit index');
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  addSubredditColumn();
}

module.exports = addSubredditColumn;

