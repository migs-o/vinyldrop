const { pool } = require('../database');

async function cleanupStoreNames() {
  try {
    console.log('🧹 Cleaning up records with store names in artist field...');
    
    // List of store names that might appear in artist field
    const storeNames = [
      'amazon', 'bandcamp', 'ebay', 'discogs', 'rough trade', 'roughtrade',
      'urban outfitters', 'target', 'walmart', 'best buy', 'turntable lab',
      'merchbar', 'bull moose', 'newbury comics', 'amoeba', 'record store',
      'vinyl me please', 'vmp', 'sound of vinyl', 'udiscover', 'importcds'
    ];

    // Build WHERE clause to find records where artist starts with store names
    const conditions = storeNames.map((store, index) => {
      return `LOWER(artist) LIKE $${index + 1}`;
    });
    const params = storeNames.map(store => `${store}%`);

    const sql = `
      DELETE FROM releases 
      WHERE source = 'reddit' 
      AND subreddit = 'vinyldeals'
      AND (${conditions.join(' OR ')})
      RETURNING id, artist, album
    `;

    const result = await pool.query(sql, params);
    
    console.log(`✅ Deleted ${result.rows.length} records with store names in artist field`);
    
    if (result.rows.length > 0) {
      console.log('\nDeleted records:');
      result.rows.slice(0, 10).forEach(row => {
        console.log(`  - ${row.artist} - ${row.album}`);
      });
      if (result.rows.length > 10) {
        console.log(`  ... and ${result.rows.length - 10} more`);
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log('💡 Run the scraper again to re-populate with correctly parsed titles.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanupStoreNames();
}

module.exports = cleanupStoreNames;

