// ============================================
// Bandcamp Vinyl Releases Scraper (Enhanced)
// ============================================

// SETUP INSTRUCTIONS:
// 1. npm install axios cheerio
// 2. node bandcamp-scraper.js

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class BandcampScraper {
  constructor() {
    this.baseUrl = 'https://bandcamp.com';
    this.releases = [];
  }

  // Main scraping function
  async scrapeNewReleases() {
    try {
      console.log('🎵 Starting Bandcamp scraper...\n');

      // Let's try a simpler approach - scrape the main discover page
      const url = 'https://bandcamp.com/tag/vinyl?sort_field=date';
      
      console.log(`📡 Fetching: ${url}\n`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      console.log(`✅ Response received (${response.data.length} bytes)\n`);

      // Save HTML for debugging
      fs.writeFileSync('bandcamp-debug.html', response.data);
      console.log('💾 Saved HTML to bandcamp-debug.html for inspection\n');

      const $ = cheerio.load(response.data);

      // Let's try multiple selector patterns that Bandcamp might use
      const selectors = [
        '.discover-result',
        '.item-card',
        'li.item',
        '.search-result',
        'li[data-search-result]',
        '.result-items li',
        'ol li'
      ];

      let itemsFound = 0;

      for (const selector of selectors) {
        const elements = $(selector);
        console.log(`🔍 Trying selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length > 0) {
          itemsFound = elements.length;
          
          elements.each((i, element) => {
            try {
              const release = this.parseReleaseItem($, element);
              if (release && release.artist && release.album) {
                this.releases.push(release);
                console.log(`   ✓ Parsed: ${release.artist} - ${release.album}`);
              }
            } catch (err) {
              console.log(`   ⚠️  Parse error:`, err.message);
            }
          });

          if (this.releases.length > 0) {
            break; // Found working selector
          }
        }
      }

      if (itemsFound === 0) {
        console.log('\n❌ No items found with any selector. Bandcamp may have changed their HTML structure.');
        console.log('📝 Check bandcamp-debug.html to see the actual HTML structure.\n');
        
        // Let's analyze what we got
        console.log('🔎 Quick HTML analysis:');
        console.log(`   - Total links: ${$('a').length}`);
        console.log(`   - Total images: ${$('img').length}`);
        console.log(`   - Page title: ${$('title').text()}`);
        console.log(`   - Body classes: ${$('body').attr('class')}`);
      }

      console.log(`\n✅ Scraping complete! Found ${this.releases.length} releases\n`);
      
      // Remove duplicates
      if (this.releases.length > 0) {
        this.releases = this.deduplicateReleases(this.releases);
        console.log(`📊 After deduplication: ${this.releases.length} unique releases\n`);
      }

      return this.releases;

    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Status text: ${error.response.statusText}`);
      }
      return [];
    }
  }

  // Parse individual release item - flexible approach
  parseReleaseItem($, element) {
    const $item = $(element);
    
    // Try to find artist - look for common patterns
    let artist = '';
    const artistSelectors = ['.itemsubtext', '.artist', '.subhead', '[class*="artist"]', '[class*="byline"]'];
    for (const sel of artistSelectors) {
      artist = $item.find(sel).first().text().trim();
      if (artist) break;
    }
    
    // Try to find album/title
    let album = '';
    const albumSelectors = ['.itemtext', '.title', '.heading', '[class*="title"]'];
    for (const sel of albumSelectors) {
      album = $item.find(sel).first().text().trim();
      if (album) break;
    }

    // Get image
    const coverUrl = $item.find('img').first().attr('src') || 
                     $item.find('img').first().attr('data-src') || '';
    
    // Get link
    let purchaseUrl = $item.find('a').first().attr('href') || '';
    if (purchaseUrl && !purchaseUrl.startsWith('http')) {
      purchaseUrl = this.baseUrl + purchaseUrl;
    }

    // Get any tags/genres
    const genres = [];
    $item.find('.tag, [class*="tag"]').each((i, tag) => {
      const genre = $(tag).text().trim();
      if (genre && genre.length > 0 && genre.length < 50) {
        genres.push(genre);
      }
    });

    // Try to find price
    let price = null;
    const priceText = $item.find('[class*="price"]').text().trim();
    if (priceText) {
      const priceMatch = priceText.match(/[\d.]+/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0]);
      }
    }

    // Only return if we have at least artist OR album
    if (!artist && !album) {
      return null;
    }

    return {
      artist: artist || 'Unknown Artist',
      album: album || 'Unknown Album',
      label: '',
      releaseDate: null,
      preorderDate: null,
      genres: genres,
      formats: ['Vinyl'],
      price: price,
      coverUrl: coverUrl,
      purchaseUrl: purchaseUrl,
      description: '',
      source: 'Bandcamp',
      scrapedAt: new Date().toISOString()
    };
  }

  // Alternative: Use Bandcamp's API if available
  async tryBandcampAPI() {
    console.log('\n🔧 Trying alternative approach: Bandcamp search API...\n');
    
    try {
      // Bandcamp has an undocumented search API
      const response = await axios.get('https://bandcamp.com/api/hub/2/dig_deeper', {
        params: {
          tag: 'vinyl',
          sort: 'date'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      if (response.data && response.data.items) {
        console.log(`✅ API returned ${response.data.items.length} items\n`);
        
        response.data.items.forEach(item => {
          this.releases.push({
            artist: item.artist || 'Unknown',
            album: item.title || 'Unknown',
            label: item.label || '',
            releaseDate: null,
            preorderDate: null,
            genres: item.tags || [],
            formats: ['Vinyl'],
            price: null,
            coverUrl: item.art_url || '',
            purchaseUrl: item.tralbum_url || '',
            description: '',
            source: 'Bandcamp API',
            scrapedAt: new Date().toISOString()
          });
        });
      }

      return this.releases;

    } catch (error) {
      console.log('⚠️  API approach failed:', error.message);
      return [];
    }
  }

  deduplicateReleases(releases) {
    const seen = new Map();
    
    return releases.filter(release => {
      const key = `${release.artist.toLowerCase()}-${release.album.toLowerCase()}`;
      
      if (seen.has(key)) {
        return false;
      }
      
      seen.set(key, true);
      return true;
    });
  }

  displayReleases() {
    if (this.releases.length === 0) {
      console.log('❌ No releases to display\n');
      return;
    }

    console.log('='.repeat(80));
    console.log('SCRAPED VINYL RELEASES');
    console.log('='.repeat(80));
    
    const displayCount = Math.min(this.releases.length, 10);
    
    this.releases.slice(0, displayCount).forEach((release, index) => {
      console.log(`\n${index + 1}. ${release.artist} - ${release.album}`);
      console.log(`   Genres: ${release.genres.join(', ') || 'N/A'}`);
      console.log(`   Price: ${release.price ? '$' + release.price : 'N/A'}`);
      console.log(`   URL: ${release.purchaseUrl || 'N/A'}`);
      console.log(`   Cover: ${release.coverUrl ? 'Yes' : 'No'}`);
    });

    if (this.releases.length > 10) {
      console.log(`\n... and ${this.releases.length - 10} more releases`);
    }
  }

  exportToJSON(filename = 'bandcamp-releases.json') {
    fs.writeFileSync(filename, JSON.stringify(this.releases, null, 2));
    console.log(`\n💾 Exported ${this.releases.length} releases to ${filename}`);
  }
}

// ============================================
// USAGE
// ============================================

async function main() {
  const scraper = new BandcampScraper();
  
  // Try HTML scraping first
  await scraper.scrapeNewReleases();
  
  // If that didn't work, try the API
  if (scraper.releases.length === 0) {
    await scraper.tryBandcampAPI();
  }
  
  // Display and export results
  scraper.displayReleases();
  
  if (scraper.releases.length > 0) {
    scraper.exportToJSON();
  } else {
    console.log('\n💡 SUGGESTIONS:');
    console.log('1. Check bandcamp-debug.html to see the actual page structure');
    console.log('2. Bandcamp might be blocking scrapers - may need Puppeteer for JS rendering');
    console.log('3. Consider using Bandcamp\'s official API (requires partnership)');
    console.log('4. Reddit r/VinylReleases might be easier to scrape\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BandcampScraper;