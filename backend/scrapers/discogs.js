// ============================================
// FILE: scrapers/discogs.js
// ============================================

const axios = require('axios');
const { query } = require('../db/database');
require('dotenv').config();

class DiscogsScraper {
  constructor() {
    this.consumerKey = process.env.DISCOGS_CONSUMER_KEY;
    this.consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
    this.baseUrl = 'https://api.discogs.com';
    this.userAgent = 'VinylDrop/1.0 +http://vinyldrop.com';
  }

  // Search Discogs for a release
  async searchRelease(artist, album) {
    try {
      const url = `${this.baseUrl}/database/search`;
      const params = {
        q: `${artist} ${album}`,
        type: 'release',
        format: 'vinyl',
        key: this.consumerKey,
        secret: this.consumerSecret
      };

      const response = await axios.get(url, {
        params,
        headers: { 'User-Agent': this.userAgent }
      });

      if (response.data.results && response.data.results.length > 0) {
        // Return the first (most relevant) result
        return response.data.results[0];
      }

      return null;

    } catch (error) {
      console.error(`Error searching Discogs for ${artist} - ${album}:`, error.message);
      return null;
    }
  }

  // Get detailed release information
  async getReleaseDetails(releaseId) {
    try {
      const url = `${this.baseUrl}/releases/${releaseId}`;
      const response = await axios.get(url, {
        params: {
          key: this.consumerKey,
          secret: this.consumerSecret
        },
        headers: { 'User-Agent': this.userAgent }
      });

      return response.data;

    } catch (error) {
      console.error(`Error fetching release ${releaseId}:`, error.message);
      return null;
    }
  }

  // Parse Discogs data into our format
  parseDiscogsRelease(data) {
    const genres = data.genres || [];
    const styles = data.styles || [];
    const allGenres = [...genres, ...styles];

    // Extract formats
    const formats = [];
    if (data.formats && data.formats.length > 0) {
      data.formats.forEach(format => {
        formats.push(format.name);
        if (format.descriptions) {
          formats.push(...format.descriptions);
        }
      });
    }

    // Get cover image (prefer high quality)
    let coverUrl = null;
    if (data.images && data.images.length > 0) {
      // Prefer primary image
      const primaryImage = data.images.find(img => img.type === 'primary');
      coverUrl = primaryImage ? primaryImage.uri : data.images[0].uri;
    } else if (data.cover_image) {
      coverUrl = data.cover_image;
    } else if (data.thumb) {
      coverUrl = data.thumb;
    }

    // Extract label
    let label = null;
    if (data.labels && data.labels.length > 0) {
      label = data.labels[0].name;
    }

    // Extract year/release date
    let releaseDate = null;
    if (data.released) {
      releaseDate = data.released;
    } else if (data.year) {
      releaseDate = `${data.year}-01-01`;
    }

    // Get lowest price from community marketplace
    let price = null;
    if (data.lowest_price) {
      price = data.lowest_price;
    }

    return {
      artist: data.artists_sort || data.artists?.[0]?.name || 'Unknown Artist',
      album: data.title || 'Unknown Album',
      label: label,
      release_date: releaseDate,
      genres: allGenres,
      formats: formats,
      price: price,
      cover_url: coverUrl,
      purchase_url: data.uri ? `https://www.discogs.com${data.uri}` : null,
      description: data.notes || null,
      source: 'discogs',
      source_id: data.id.toString(),
      source_url: data.uri ? `https://www.discogs.com${data.uri}` : null
    };
  }

  // Enrich existing releases with Discogs data
  async enrichReleases(limit = 50) {
    try {
      console.log('🎵 Starting Discogs enrichment...\n');

      // Get releases without good cover images or missing data
      const releasesToEnrich = await query(`
        SELECT id, artist, album, cover_url, price, label
        FROM releases
        WHERE source = 'reddit'
        AND (
          cover_url IS NULL 
          OR cover_url LIKE '%thumb%'
          OR price IS NULL
          OR label IS NULL
        )
        ORDER BY reddit_score DESC NULLS LAST
        LIMIT $1
      `, [limit]);

      console.log(`Found ${releasesToEnrich.rows.length} releases to enrich\n`);

      let enriched = 0;
      let failed = 0;

      for (const release of releasesToEnrich.rows) {
        console.log(`Searching: ${release.artist} - ${release.album}`);

        // Search Discogs
        const searchResult = await this.searchRelease(release.artist, release.album);
        
        if (searchResult && searchResult.id) {
          // Get detailed info
          const details = await this.getReleaseDetails(searchResult.id);
          
          if (details) {
            const parsed = this.parseDiscogsRelease(details);
            
            // Update the release with better data
            await this.updateRelease(release.id, parsed);
            enriched++;
            console.log(`  ✓ Enriched with Discogs data\n`);
          } else {
            failed++;
            console.log(`  ✗ Failed to get details\n`);
          }
        } else {
          failed++;
          console.log(`  ✗ Not found on Discogs\n`);
        }

        // Rate limiting - Discogs allows 60 requests per minute
        await this.sleep(1100);
      }

      console.log(`\n✅ Enrichment complete: ${enriched} enriched, ${failed} failed`);
      return { enriched, failed };

    } catch (error) {
      console.error('❌ Enrichment error:', error.message);
      throw error;
    }
  }

  // Update release with Discogs data
  async updateRelease(releaseId, discogsData) {
    try {
      const sql = `
        UPDATE releases SET
          cover_url = COALESCE($1, cover_url),
          price = COALESCE($2, price),
          label = COALESCE($3, label),
          genres = CASE 
            WHEN $4::text[] IS NOT NULL AND array_length($4::text[], 1) > 0 
            THEN $4::text[]
            ELSE genres 
          END,
          formats = CASE 
            WHEN $5::text[] IS NOT NULL AND array_length($5::text[], 1) > 0 
            THEN $5::text[]
            ELSE formats 
          END,
          release_date = COALESCE($6, release_date),
          updated_at = NOW()
        WHERE id = $7
      `;

      await query(sql, [
        discogsData.cover_url,
        discogsData.price,
        discogsData.label,
        discogsData.genres,
        discogsData.formats,
        discogsData.release_date,
        releaseId
      ]);

    } catch (error) {
      console.error('Error updating release:', error.message);
    }
  }

  // Scrape new vinyl releases from Discogs
  async scrapeNewReleases(limit = 50) {
    try {
      console.log('🎵 Scraping new releases from Discogs...\n');

      // Search for recent vinyl releases
      const url = `${this.baseUrl}/database/search`;
      const params = {
        type: 'release',
        format: 'vinyl',
        sort: 'added',
        sort_order: 'desc',
        per_page: limit,
        key: this.consumerKey,
        secret: this.consumerSecret
      };

      const response = await axios.get(url, {
        params,
        headers: { 'User-Agent': this.userAgent }
      });

      let inserted = 0;
      let skipped = 0;

      for (const result of response.data.results) {
        const details = await this.getReleaseDetails(result.id);
        
        if (details) {
          const parsed = this.parseDiscogsRelease(details);
          const saved = await this.saveRelease(parsed);
          
          if (saved === 'inserted') {
            inserted++;
            console.log(`✓ Added: ${parsed.artist} - ${parsed.album}`);
          } else {
            skipped++;
          }
        }

        // Rate limiting
        await this.sleep(1100);
      }

      console.log(`\n✅ Scraping complete: ${inserted} new, ${skipped} skipped`);
      return { inserted, skipped };

    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      throw error;
    }
  }

  // Save release to database
  async saveRelease(release) {
    try {
      const sql = `
        INSERT INTO releases (
          artist, album, label, release_date, genres, formats,
          price, cover_url, purchase_url, description, source, 
          source_id, source_url, posted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (artist, album, source) 
        DO UPDATE SET
          cover_url = COALESCE(EXCLUDED.cover_url, releases.cover_url),
          price = COALESCE(EXCLUDED.price, releases.price),
          label = COALESCE(EXCLUDED.label, releases.label),
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS inserted
      `;

      const values = [
        release.artist, release.album, release.label, release.release_date,
        release.genres, release.formats, release.price, release.cover_url,
        release.purchase_url, release.description, release.source,
        release.source_id, release.source_url
      ];

      const result = await query(sql, values);
      return result.rows[0].inserted ? 'inserted' : 'updated';

    } catch (error) {
      console.error('Error saving release:', error.message);
      return 'error';
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run enrichment if called directly
if (require.main === module) {
  const scraper = new DiscogsScraper();
  
  // Check if we want to enrich or scrape
  const command = process.argv[2];
  
  if (command === 'scrape') {
    scraper.scrapeNewReleases(50)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    // Default: enrich existing releases
    scraper.enrichReleases(50)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = DiscogsScraper;

// ============================================
// FILE: Update package.json scripts
// ============================================
// Add these to your backend/package.json "scripts" section:
/*
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "scrape": "node scrapers/reddit.js",
    "scrape:discogs": "node scrapers/discogs.js scrape",
    "enrich": "node scrapers/discogs.js",
    "db:setup": "node db/setup.js"
  }
}
*/