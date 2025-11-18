const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

console.log('🔍 DEBUG - PORT from env:', process.env.PORT); // ADD THIS LINE
console.log('🔍 DEBUG - All env vars:', Object.keys(process.env)); // AND THIS

const releasesRouter = require('./routes/releases');
const RedditScraper = require('./scrapers/reddit');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/releases', releasesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual scrape endpoint (for testing)
app.post('/api/scrape', async (req, res) => {
  try {
    const scraper = new RedditScraper();
    const result = await scraper.scrapeAndStore(100);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule scraping - every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ Running scheduled scrape...');
  try {
    const scraper = new RedditScraper();
    await scraper.scrapeAndStore(100);
  } catch (error) {
    console.error('Scheduled scrape failed:', error);
  }
});

// Start server
const PORT = process.env.PORT || 3001;


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VinylDrop API running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API: http://localhost:${PORT}/api/releases`);
});

module.exports = app;