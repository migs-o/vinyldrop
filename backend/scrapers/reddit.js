const axios = require('axios');
const { query } = require('../db/database');

class RedditVinylScraper {
  constructor() {
    this.subreddit = 'VinylReleases';
  }

  async scrapeAndStore(limit = 100) {
    // Scrape both subreddits
    const results = await this.scrapeAllSubreddits();
    return results;
  }

  async scrapeAllSubreddits() {
    try {
      console.log('🎵 Starting Reddit scraper for all subreddits...');
      
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalProcessed = 0;

      // Scrape r/VinylReleases - 150 posts, all posts
      console.log('📀 Scraping r/VinylReleases (150 posts)...');
      const vinylResults = await this.scrapeSubreddit('VinylReleases', 150, null);
      totalInserted += vinylResults.inserted;
      totalUpdated += vinylResults.updated;
      totalProcessed += vinylResults.total;

      // Scrape r/VGMvinyl - 50 posts, only with specific flairs
      console.log('🎮 Scraping r/VGMvinyl (50 posts, filtered by flairs)...');
      const vgmFlairs = ['New Release', 'Pre-Order', 'Back in Stock'];
      const vgmResults = await this.scrapeSubreddit('VGMvinyl', 50, vgmFlairs);
      totalInserted += vgmResults.inserted;
      totalUpdated += vgmResults.updated;
      totalProcessed += vgmResults.total;

      console.log(`✅ Scraping complete: ${totalInserted} new, ${totalUpdated} updated, ${totalProcessed} total`);
      return { inserted: totalInserted, updated: totalUpdated, total: totalProcessed };

    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      throw error;
    }
  }

  async scrapeSubreddit(subreddit, limit, allowedFlairs = null) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const posts = response.data.data.children;
      let inserted = 0;
      let updated = 0;
      let processed = 0;

      for (const post of posts) {
        // Filter by flairs if specified
        if (allowedFlairs && allowedFlairs.length > 0) {
          const postFlair = post.data.link_flair_text;
          if (!postFlair || !allowedFlairs.includes(postFlair)) {
            continue; // Skip posts without matching flairs
          }
        }

        const release = this.parsePost(post.data, subreddit);
        if (release) {
          const result = await this.saveRelease(release);
          if (result === 'inserted') inserted++;
          if (result === 'updated') updated++;
          processed++;
        }
      }

      return { inserted, updated, total: processed };

    } catch (error) {
      console.error(`❌ Error scraping r/${subreddit}:`, error.message);
      throw error;
    }
  }

  parsePost(post, subreddit) {
    const title = post.title;
    const parsed = this.parseTitleInfo(title);

    return {
      artist: parsed.artist,
      album: parsed.album,
      label: null,
      release_date: null,
      preorder_date: null,
      genres: parsed.genres,
      formats: parsed.formats.length > 0 ? parsed.formats : ['Vinyl'],
      price: parsed.price,
      cover_url: this.extractImageUrl(post),
      purchase_url: this.isPurchaseUrl(post.url) ? post.url : null,
      description: post.selftext || null,
      source: 'reddit',
      source_id: post.id,
      source_url: `https://www.reddit.com${post.permalink}`,
      subreddit: subreddit,
      reddit_score: post.score,
      num_comments: post.num_comments,
      posted_at: new Date(post.created_utc * 1000).toISOString()
    };
  }

  parseTitleInfo(title) {
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    let formats = [];
    let price = null;
    let genres = [];

    // Step 1: Clean common prefixes and noise
    let cleaned = title
      // Remove common prefixes
      .replace(/^\[?\s*(pre-?order|preorder|new release|restock|reissue|restocked?|available now)\s*:?\s*\]?\s*/gi, '')
      .replace(/^(pre\s*-?\s*order\s*:?\s*)/gi, '')

      // Remove variant descriptions that confuse parsing
      .replace(/\s*\(signed\)/gi, '')
      .replace(/\s*\(autographed?\)/gi, '')
      .replace(/\s*signed\s+jacket/gi, '')
      .replace(/\s*w\/\s*signed\s+/gi, ' ')

      // Remove store-specific notes
      .replace(/\s*\(target exclusive\)/gi, '')
      .replace(/\s*\(uo exclusive\)/gi, '')
      .replace(/\s*\(indie exclusive\)/gi, '')
      .replace(/\s*\(walmart exclusive\)/gi, '')

      // Remove "Vinyl" at the end (redundant)
      .replace(/\s+vinyl\s*$/gi, '')

      .trim();

    // Step 2: Extract and remove format info from brackets
    const bracketMatches = cleaned.match(/\[([^\]]+)\]/g);
    if (bracketMatches) {
      bracketMatches.forEach(match => {
        const content = match.replace(/[\[\]]/g, '');
        if (this.isFormat(content)) {
          formats.push(content);
          // Remove this bracket from cleaned string
          cleaned = cleaned.replace(match, '').trim();
        }
      });
    }

    // Step 3: Extract and remove format info from parentheses
    const parenMatches = cleaned.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      parenMatches.forEach(match => {
        const content = match.replace(/[()]/g, '');
        // Only remove if it's clearly a format descriptor
        if (this.isFormatDescriptor(content)) {
          formats.push(content);
          cleaned = cleaned.replace(match, '').trim();
        }
      });
    }

    // Step 4: Extract price (but we won't display it)
    const priceMatch = cleaned.match(/\$\s*(\d+\.?\d*)|(\d+\.?\d*)\s*USD/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[1] || priceMatch[2]);
      // Remove price from string
      cleaned = cleaned.replace(/\$\s*\d+\.?\d*/g, '').replace(/\d+\.?\d*\s*USD/gi, '').trim();
    }

    // Step 5: Clean up multiple spaces and dashes
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\s*[-–—]\s*/g, ' - ')
      .trim();

    // Step 6: Extract artist and album
    // Pattern 1: "Artist - Album"
    const dashMatch = cleaned.match(/^([^-]+?)\s*-\s*(.+?)$/);

    if (dashMatch) {
      artist = this.cleanArtistName(dashMatch[1]);
      album = this.cleanAlbumName(dashMatch[2]);
    } else {
      // Pattern 2: No dash found, might be just an album or unclear
      // Try to detect if first part looks like an artist name
      const words = cleaned.split(/\s+/);

      if (words.length >= 3) {
        // Assume first 1-2 words are artist
        artist = words.slice(0, 2).join(' ');
        album = words.slice(2).join(' ');
      } else {
        // Give up, use whole thing as album
        album = cleaned;
      }

      artist = this.cleanArtistName(artist);
      album = this.cleanAlbumName(album);
    }

    // Step 7: Extract genres from keywords
    const genreKeywords = {
      'indie': 'Indie',
      'rock': 'Rock',
      'metal': 'Metal',
      'electronic': 'Electronic',
      'jazz': 'Jazz',
      'hip-hop': 'Hip-Hop',
      'hip hop': 'Hip-Hop',
      'punk': 'Punk',
      'folk': 'Folk',
      'pop': 'Pop',
      'classical': 'Classical',
      'country': 'Country',
      'r&b': 'R&B',
      'soul': 'Soul',
      'funk': 'Funk',
      'ambient': 'Ambient',
      'experimental': 'Experimental'
    };

    const titleLower = title.toLowerCase();
    Object.entries(genreKeywords).forEach(([keyword, genre]) => {
      if (titleLower.includes(keyword) && !genres.includes(genre)) {
        genres.push(genre);
      }
    });

    return { artist, album, formats, price, genres };
  }

  // Helper: Check if string is a format
  isFormat(str) {
    const formats = [
      'vinyl', 'lp', 'ep', '7"', '10"', '12"',
      'single', 'double lp', '2lp', '2xlp', '3lp',
      'picture disc', 'colored vinyl', 'clear vinyl'
    ];
    const lowerStr = str.toLowerCase();
    return formats.some(format => lowerStr.includes(format));
  }

  // Helper: Check if parenthetical content is a format descriptor
  isFormatDescriptor(str) {
    const descriptors = [
      'colored', 'clear', 'transparent', 'opaque',
      'splatter', 'marble', 'swirl', 'smoke',
      'red vinyl', 'blue vinyl', 'green vinyl', 'yellow vinyl',
      'white vinyl', 'black vinyl', 'pink vinyl', 'purple vinyl',
      'orange vinyl', 'gold vinyl', 'silver vinyl',
      'limited to', 'ltd', '/500', '/1000', '/300',
      '180g', '140g', 'gram', 'heavyweight'
    ];
    const lowerStr = str.toLowerCase();
    return descriptors.some(desc => lowerStr.includes(desc));
  }

  // Helper: Clean artist name
  cleanArtistName(name) {
    return name
      .replace(/^\s*the\s+/gi, 'The ') // Normalize "the"
      .replace(/[[\](){}]/g, '') // Remove brackets
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper: Clean album name  
  cleanAlbumName(name) {
    return name
      .replace(/[[\](){}]/g, '') // Remove brackets
      .replace(/\s+/g, ' ')
      .replace(/^[-–—\s]+/, '') // Remove leading dashes
      .replace(/[-–—\s]+$/, '') // Remove trailing dashes
      .trim();
  }

  isPurchaseUrl(url) {
    const domains = ['bandcamp.com', 'amazon.com', 'roughtrade.com', 'discogs.com',
      'merchbar.com', 'turntablelab.com', 'urbanoutfitters.com', 'target.com'];
    return domains.some(d => url.includes(d));
  }

  extractImageUrl(post) {
    // Filter out Reddit's placeholder values
    const invalidThumbs = ['self', 'default', 'nsfw', 'spoiler', 'image', ''];

    // First, try preview images (these are usually best quality)
    if (post.preview && post.preview.images && post.preview.images[0]) {
      const previewUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      // Make sure it's a valid URL
      if (previewUrl && previewUrl.startsWith('http')) {
        return previewUrl;
      }
    }

    // Fallback to thumbnail if it's valid
    if (post.thumbnail &&
      post.thumbnail.startsWith('http') &&
      !invalidThumbs.includes(post.thumbnail)) {
      return post.thumbnail;
    }

    // No valid image found
    return null;
  }

  async saveRelease(release) {
    try {
      const sql = `
        INSERT INTO releases (
          artist, album, label, release_date, preorder_date, genres, formats,
          price, cover_url, purchase_url, description, source, source_id,
          source_url, subreddit, reddit_score, num_comments, posted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (artist, album, source) 
        DO UPDATE SET
          reddit_score = EXCLUDED.reddit_score,
          num_comments = EXCLUDED.num_comments,
          cover_url = COALESCE(EXCLUDED.cover_url, releases.cover_url),
          purchase_url = COALESCE(EXCLUDED.purchase_url, releases.purchase_url),
          subreddit = COALESCE(EXCLUDED.subreddit, releases.subreddit),
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS inserted
      `;

      const values = [
        release.artist, release.album, release.label, release.release_date,
        release.preorder_date, release.genres, release.formats, release.price,
        release.cover_url, release.purchase_url, release.description,
        release.source, release.source_id, release.source_url,
        release.subreddit, release.reddit_score, release.num_comments, release.posted_at
      ];

      const result = await query(sql, values);
      return result.rows[0].inserted ? 'inserted' : 'updated';

    } catch (error) {
      console.error('Error saving release:', error.message);
      return 'error';
    }
  }
}

// Run scraper if called directly
if (require.main === module) {
  const scraper = new RedditVinylScraper();
  scraper.scrapeAndStore()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = RedditVinylScraper;