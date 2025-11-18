// ============================================
// Reddit r/VinylReleases Scraper
// ============================================

// SETUP INSTRUCTIONS:
// 1. npm install axios
// 2. node reddit-scraper.js

const axios = require('axios');

class RedditVinylScraper {
  constructor() {
    this.subreddit = 'VinylReleases';
    this.releases = [];
  }

  // Main scraping function
  async scrapeNewReleases(limit = 100) {
    try {
      console.log('🎵 Starting Reddit r/VinylReleases scraper...\n');

      // Reddit's JSON API - no authentication needed for public posts
      const url = `https://www.reddit.com/r/${this.subreddit}/new.json?limit=${limit}`;
      
      console.log(`📡 Fetching from: ${url}\n`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'VinylDrop/1.0.0'
        }
      });

      const posts = response.data.data.children;
      
      console.log(`✅ Retrieved ${posts.length} posts\n`);

      // Parse each post
      for (const post of posts) {
        const release = this.parsePost(post.data);
        if (release) {
          this.releases.push(release);
        }
      }

      console.log(`📊 Parsed ${this.releases.length} vinyl releases\n`);

      return this.releases;

    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      return [];
    }
  }

  // Parse individual Reddit post
  parsePost(post) {
    try {
      const title = post.title;
      const url = post.url;
      const redditUrl = `https://www.reddit.com${post.permalink}`;
      const createdAt = new Date(post.created_utc * 1000).toISOString();
      const author = post.author;
      
      // Extract artist and album from title
      // Common patterns:
      // "Artist - Album Title [Format] (Price) {Store}"
      // "[Preorder] Artist - Album"
      // "Artist - Album (Color Variant)"
      
      const parsed = this.parseTitleInfo(title);

      return {
        artist: parsed.artist,
        album: parsed.album,
        label: parsed.label || '',
        releaseDate: null, // Would need to extract from post content
        preorderDate: null,
        genres: parsed.genres,
        formats: parsed.formats,
        price: parsed.price,
        coverUrl: this.extractImageUrl(post),
        purchaseUrl: this.isPurchaseUrl(url) ? url : '',
        description: post.selftext || '',
        source: 'Reddit r/VinylReleases',
        redditUrl: redditUrl,
        redditScore: post.score,
        numComments: post.num_comments,
        scrapedAt: new Date().toISOString(),
        postedAt: createdAt,
        postedBy: author,
        flair: post.link_flair_text || '',
        rawTitle: title
      };

    } catch (error) {
      console.log('⚠️  Error parsing post:', error.message);
      return null;
    }
  }

  // Parse title to extract artist, album, format, price, etc.
  parseTitleInfo(title) {
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    let formats = [];
    let price = null;
    let label = null;
    let genres = [];

    // Remove common prefixes
    let cleaned = title
      .replace(/^\[Preorder\]/i, '')
      .replace(/^\[Pre-Order\]/i, '')
      .replace(/^\[New Release\]/i, '')
      .replace(/^\[Restock\]/i, '')
      .replace(/^\[Reissue\]/i, '')
      .trim();

    // Extract format from brackets [Vinyl], [LP], etc.
    const formatMatch = cleaned.match(/\[(.*?)\]/g);
    if (formatMatch) {
      formatMatch.forEach(match => {
        const format = match.replace(/[\[\]]/g, '');
        if (this.isFormat(format)) {
          formats.push(format);
        }
      });
    }

    // Extract price - $XX.XX or USD XX
    const priceMatch = cleaned.match(/\$\s*(\d+\.?\d*)|(\d+\.?\d*)\s*USD/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[1] || priceMatch[2]);
    }

    // Extract artist - album (most common pattern)
    // Usually "Artist - Album" or "Artist – Album" (different dash types)
    const dashMatch = cleaned.match(/^([^-–—]+)\s*[-–—]\s*(.+)/);
    if (dashMatch) {
      artist = dashMatch[1].trim();
      album = dashMatch[2]
        .replace(/\[.*?\]/g, '') // Remove brackets
        .replace(/\(.*?\)/g, '') // Remove parentheses
        .replace(/\{.*?\}/g, '') // Remove braces
        .replace(/\$\s*\d+\.?\d*/g, '') // Remove price
        .trim();
      
      // Clean up artist name
      artist = artist
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
    } else {
      // Fallback: use the whole cleaned title
      album = cleaned
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\{.*?\}/g, '')
        .trim();
    }

    // Extract genres from common keywords
    const genreKeywords = ['indie', 'rock', 'metal', 'electronic', 'jazz', 'hip-hop', 'punk', 'folk'];
    genreKeywords.forEach(genre => {
      if (title.toLowerCase().includes(genre)) {
        genres.push(genre.charAt(0).toUpperCase() + genre.slice(1));
      }
    });

    return { artist, album, formats, price, label, genres };
  }

  // Check if a string represents a vinyl format
  isFormat(str) {
    const formats = ['vinyl', 'lp', '7"', '10"', '12"', 'ep', 'single', 'colored', 'picture disc'];
    return formats.some(format => str.toLowerCase().includes(format));
  }

  // Check if URL is a purchase link
  isPurchaseUrl(url) {
    const purchaseDomains = [
      'bandcamp.com',
      'amazon.com',
      'roughtrade.com',
      'discogs.com',
      'merchbar.com',
      'turntablelab.com',
      'urbanoutfitters.com',
      'target.com'
    ];
    return purchaseDomains.some(domain => url.includes(domain));
  }

  // Extract image URL from post
  extractImageUrl(post) {
    // Check thumbnail first
    if (post.thumbnail && post.thumbnail.startsWith('http')) {
      return post.thumbnail;
    }
    
    // Check preview images
    if (post.preview && post.preview.images && post.preview.images[0]) {
      return post.preview.images[0].source.url.replace(/&amp;/g, '&');
    }

    return '';
  }

  // Display releases
  displayReleases() {
    console.log('='.repeat(80));
    console.log('SCRAPED VINYL RELEASES FROM REDDIT');
    console.log('='.repeat(80));
    
    this.releases.slice(0, 15).forEach((release, index) => {
      console.log(`\n${index + 1}. ${release.artist} - ${release.album}`);
      console.log(`   Formats: ${release.formats.join(', ') || 'Vinyl'}`);
      console.log(`   Price: ${release.price ? '$' + release.price : 'N/A'}`);
      console.log(`   Score: ${release.redditScore} upvotes | ${release.numComments} comments`);
      console.log(`   Flair: ${release.flair || 'None'}`);
      console.log(`   Posted: ${new Date(release.postedAt).toLocaleDateString()}`);
      console.log(`   Reddit: ${release.redditUrl}`);
      if (release.purchaseUrl) {
        console.log(`   Buy: ${release.purchaseUrl}`);
      }
    });

    if (this.releases.length > 15) {
      console.log(`\n... and ${this.releases.length - 15} more releases`);
    }
  }

  // Export to JSON
  exportToJSON(filename = 'reddit-vinyl-releases.json') {
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(this.releases, null, 2));
    console.log(`\n💾 Exported ${this.releases.length} releases to ${filename}`);
  }

  // Get statistics
  getStats() {
    const stats = {
      total: this.releases.length,
      withPrice: this.releases.filter(r => r.price).length,
      withPurchaseLink: this.releases.filter(r => r.purchaseUrl).length,
      withImage: this.releases.filter(r => r.coverUrl).length,
      averageScore: Math.round(
        this.releases.reduce((sum, r) => sum + r.redditScore, 0) / this.releases.length
      ),
      topGenres: this.getTopGenres(),
      topStores: this.getTopStores()
    };

    return stats;
  }

  getTopGenres() {
    const genreCounts = {};
    this.releases.forEach(release => {
      release.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });
    
    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));
  }

  getTopStores() {
    const storeCounts = {};
    this.releases.forEach(release => {
      if (release.purchaseUrl) {
        const domain = new URL(release.purchaseUrl).hostname.replace('www.', '');
        storeCounts[domain] = (storeCounts[domain] || 0) + 1;
      }
    });
    
    return Object.entries(storeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([store, count]) => ({ store, count }));
  }
}

// ============================================
// USAGE
// ============================================

async function main() {
  const scraper = new RedditVinylScraper();
  
  // Scrape the latest 100 posts
  await scraper.scrapeNewReleases(100);
  
  // Display results
  scraper.displayReleases();
  
  // Show statistics
  const stats = scraper.getStats();
  console.log('\n' + '='.repeat(80));
  console.log('STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total releases: ${stats.total}`);
  console.log(`With price info: ${stats.withPrice}`);
  console.log(`With purchase links: ${stats.withPurchaseLink}`);
  console.log(`With images: ${stats.withImage}`);
  console.log(`Average Reddit score: ${stats.averageScore} upvotes`);
  
  if (stats.topGenres.length > 0) {
    console.log('\nTop Genres:');
    stats.topGenres.forEach(({ genre, count }) => {
      console.log(`  - ${genre}: ${count} releases`);
    });
  }
  
  if (stats.topStores.length > 0) {
    console.log('\nTop Stores:');
    stats.topStores.forEach(({ store, count }) => {
      console.log(`  - ${store}: ${count} links`);
    });
  }
  
  // Export to JSON
  scraper.exportToJSON();
}

// Run the scraper
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RedditVinylScraper;

// ============================================
// NEXT STEPS:
// ============================================
// 1. This actually works! Reddit's JSON API is public and reliable
// 2. Add Discogs API integration for official release data
// 3. Build deduplication logic to merge Reddit + Discogs data
// 4. Set up database to store everything
// 5. Create scheduled jobs to run this daily