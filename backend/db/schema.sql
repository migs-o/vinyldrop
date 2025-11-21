-- Create releases table
CREATE TABLE IF NOT EXISTS releases (
  id SERIAL PRIMARY KEY,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255) NOT NULL,
  label VARCHAR(255),
  release_date DATE,
  preorder_date DATE,
  genres TEXT[], -- Array of genres
  formats TEXT[], -- Array of formats (vinyl, LP, etc)
  price DECIMAL(10, 2),
  cover_url TEXT,
  purchase_url TEXT,
  description TEXT,
  source VARCHAR(50) NOT NULL, -- 'reddit', 'discogs', 'bandcamp'
  source_id VARCHAR(255), -- External ID from source
  source_url TEXT, -- Link to source post/page
  subreddit VARCHAR(100), -- 'VinylReleases' or 'VGMvinyl'
  reddit_score INTEGER,
  num_comments INTEGER,
  posted_at TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Composite unique constraint for deduplication
  UNIQUE(artist, album, source)
);

-- Create indexes for better query performance
CREATE INDEX idx_releases_artist ON releases(artist);
CREATE INDEX idx_releases_release_date ON releases(release_date);
CREATE INDEX idx_releases_source ON releases(source);
CREATE INDEX idx_releases_subreddit ON releases(subreddit);
CREATE INDEX idx_releases_genres ON releases USING GIN(genres);
CREATE INDEX idx_releases_scraped_at ON releases(scraped_at DESC);

-- Create stores table (for tracking purchase links)
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  affiliate_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create release_stores junction table
CREATE TABLE IF NOT EXISTS release_stores (
  id SERIAL PRIMARY KEY,
  release_id INTEGER REFERENCES releases(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(release_id, store_id)
);

-- Insert common stores
INSERT INTO stores (name, domain) VALUES
  ('Bandcamp', 'bandcamp.com'),
  ('Rough Trade', 'roughtrade.com'),
  ('Amazon', 'amazon.com'),
  ('Urban Outfitters', 'urbanoutfitters.com'),
  ('Target', 'target.com'),
  ('Discogs', 'discogs.com'),
  ('Turntable Lab', 'turntablelab.com')
ON CONFLICT (domain) DO NOTHING;

-- Create subscribers table for email subscriptions
CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  verified BOOLEAN DEFAULT false,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  unsubscribed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for subscribers
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_verified ON subscribers(verified);