'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, Disc, ExternalLink, Tag, Home } from 'lucide-react';
import Link from 'next/link';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function VinylDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Fetch deals from API
  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/releases?limit=200&subreddit=deals`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }
      
      const data = await response.json();
      setDeals(data.releases);
      setError(null);
    } catch (err) {
      console.error('Error fetching deals:', err);
      setError('Failed to load deals. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDeals = useMemo(() => {
    let filtered = deals.filter(deal => {
      const matchesSearch = 
        deal.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.album.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (deal.label && deal.label.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });

    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
    } else if (sortBy === 'artist') {
      filtered.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (sortBy === 'reddit') {
      filtered.sort((a, b) => (b.reddit_score || 0) - (a.reddit_score || 0));
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        return priceA - priceB;
      });
    }

    return filtered;
  }, [deals, searchTerm, sortBy]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBA';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPrice = (price) => {
    if (!price) return null;
    // Handle both string and number prices
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return null;
    return `$${numPrice.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-orange-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="w-8 h-8 text-orange-400" />
              <h1 className="text-2xl font-bold text-white">Vinyl Deals</h1>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white text-sm"
            >
              <Home className="w-4 h-4" />
              Releases
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-5xl font-bold text-white mb-4">
          Best Vinyl Deals
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Find the hottest deals and discounts on vinyl records from r/vinyldeals. Save money on your favorite albums!
        </p>
      </section>

      {/* Search and Sort */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-orange-500/20">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by artist, album, or label..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-orange-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/10 border border-orange-500/30 text-white focus:outline-none focus:border-orange-400"
            >
              <option value="date">Sort by Date</option>
              <option value="artist">Sort by Artist</option>
              <option value="price">Sort by Price</option>
              <option value="reddit">Sort by Popularity</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-gray-300 text-sm">
          {loading ? (
            'Loading deals...'
          ) : error ? (
            <span className="text-red-400">{error}</span>
          ) : (
            `Showing ${filteredDeals.length} deal${filteredDeals.length !== 1 ? 's' : ''}`
          )}
        </div>
      </section>

      {/* Deals Grid */}
      <section className="max-w-7xl mx-auto px-4 py-6 pb-16">
        {loading ? (
          <div className="text-center py-16">
            <Disc className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-300 text-lg">Loading vinyl deals...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={fetchDeals}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDeals.map(deal => {
              const cardLink = deal.purchase_url || deal.source_url;
              
              const handleCardClick = (e) => {
                // Don't navigate if clicking on buttons
                if (e.target.closest('a')) {
                  return;
                }
                if (cardLink) {
                  window.open(cardLink, '_blank', 'noopener,noreferrer');
                }
              };
              
              return (
                <div
                  key={deal.id}
                  onClick={handleCardClick}
                  className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden border border-orange-500/20 hover:border-orange-400/50 hover:bg-white/10 transition group cursor-pointer"
                >
                  {/* Cover Image */}
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-orange-900/20 to-red-900/20">
                    {deal.cover_url ? (
                      <img
                        src={deal.cover_url}
                        alt={`${deal.artist} - ${deal.album}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-800/40 to-red-800/40 p-4">
                        <Tag className="w-16 h-16 text-orange-300/60 mb-3" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white/80 line-clamp-2 mb-1">
                            {deal.artist}
                          </p>
                          <p className="text-xs text-gray-300/70 line-clamp-1">
                            {deal.album}
                          </p>
                        </div>
                      </div>
                    )}
                    {deal.price && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-orange-600 rounded-full text-white text-xs font-bold">
                        {formatPrice(deal.price)}
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
                      Deal
                    </div>
                    {deal.reddit_score && deal.reddit_score > 10 && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-orange-600/80 backdrop-blur-sm rounded text-white text-xs">
                        🔥 {deal.reddit_score}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="text-base font-bold text-white mb-0.5 line-clamp-1">
                      {deal.artist}
                    </h3>
                    <p className="text-gray-300 text-xs mb-2 line-clamp-1">
                      {deal.album}
                    </p>

                    {/* Genres */}
                    {deal.genres && deal.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {deal.genres.slice(0, 2).map(genre => (
                          <span
                            key={genre}
                            className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 text-xs rounded"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Posted Date */}
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(deal.posted_at)}</span>
                    </div>

                    {/* Formats */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-300 line-clamp-1">
                        {deal.formats && deal.formats.length > 0 
                          ? deal.formats.slice(0, 2).join(', ')
                          : 'Vinyl'}
                      </p>
                    </div>

                    {/* Links */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-orange-500/20">
                      {deal.purchase_url && (
                        <a
                          href={deal.purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 text-xs rounded transition bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1 z-10 relative"
                        >
                          Buy <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {deal.source_url && (
                        <a
                          href={deal.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 text-xs rounded transition bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 z-10 relative"
                        >
                          Reddit <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredDeals.length === 0 && (
          <div className="text-center py-16">
            <Tag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No deals found matching your search</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition"
            >
              Clear Search
            </button>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-sm border-t border-orange-500/20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p className="mb-2">
            VinylDrop aggregates deals from r/vinyldeals.
          </p>
          <p>
            Built for vinyl collectors, by vinyl collectors. 🎵
          </p>
        </div>
      </footer>
    </div>
  );
}

