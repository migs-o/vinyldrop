'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, Disc, Filter, Mail, ExternalLink } from 'lucide-react';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function VinylTracker() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [subredditFilter, setSubredditFilter] = useState('all');
  const [email, setEmail] = useState('');

  // Fetch releases from API
  useEffect(() => {
    fetchReleases();
  }, [subredditFilter]);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const subredditParam = subredditFilter === 'all' ? '' : `&subreddit=${subredditFilter}`;
      const response = await fetch(`${API_BASE_URL}/api/releases?limit=200${subredditParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch releases');
      }
      
      const data = await response.json();
      setReleases(data.releases);
      setError(null);
    } catch (err) {
      console.error('Error fetching releases:', err);
      setError('Failed to load releases. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredReleases = useMemo(() => {
    let filtered = releases.filter(release => {
      const matchesSearch = 
        release.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        release.album.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (release.label && release.label.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });

    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
    } else if (sortBy === 'artist') {
      filtered.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (sortBy === 'reddit') {
      filtered.sort((a, b) => (b.reddit_score || 0) - (a.reddit_score || 0));
    }

    return filtered;
  }, [releases, searchTerm, sortBy]);

  const handleEmailSubmit = () => {
    if (email && email.includes('@')) {
      alert(`Thanks! We'll notify ${email} about new releases.`);
      setEmail('');
    } else {
      alert('Please enter a valid email address.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBA';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const daysUntilRelease = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    const releaseDate = new Date(dateStr);
    const diffTime = releaseDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Disc className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">VinylDrop</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-5xl font-bold text-white mb-4">
          Never Miss a Vinyl Drop
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Track upcoming releases, preorders, and reissues from Reddit's vinyl community. All in one place.
        </p>
        
        {/* Email Signup */}
        <div className="max-w-md mx-auto flex gap-2">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              placeholder="Enter your email for updates"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            />
          </div>
          <button
            onClick={handleEmailSubmit}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
          >
            Notify Me
          </button>
        </div>
      </section>

      {/* Search and Sort */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by artist, album, or label..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Subreddit Filter */}
            <select
              value={subredditFilter}
              onChange={(e) => setSubredditFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/10 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
            >
              <option value="all">All</option>
              <option value="music">Music</option>
              <option value="vgm">Video Game Music</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/10 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
            >
              <option value="date">Sort by Date</option>
              <option value="artist">Sort by Artist</option>
              <option value="reddit">Sort by Popularity</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-gray-300 text-sm">
          {loading ? (
            'Loading releases...'
          ) : error ? (
            <span className="text-red-400">{error}</span>
          ) : (
            `Showing ${filteredReleases.length} release${filteredReleases.length !== 1 ? 's' : ''}`
          )}
        </div>
      </section>

      {/* Release Grid */}
      <section className="max-w-7xl mx-auto px-4 py-6 pb-16">
        {loading ? (
          <div className="text-center py-16">
            <Disc className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-300 text-lg">Loading vinyl releases...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={fetchReleases}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredReleases.map(release => {
              const days = daysUntilRelease(release.release_date);
              const isComingSoon = days !== null && days > 0;
              
              return (
                <div
                  key={release.id}
                  className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden border border-purple-500/20 hover:border-purple-400/50 transition group"
                >
                  {/* Cover Image */}
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    {release.cover_url ? (
                      <img
                        src={release.cover_url}
                        alt={`${release.artist} - ${release.album}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-800/40 to-pink-800/40 p-4">
                        <Disc className="w-16 h-16 text-purple-300/60 mb-3" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white/80 line-clamp-2 mb-1">
                            {release.artist}
                          </p>
                          <p className="text-xs text-gray-300/70 line-clamp-1">
                            {release.album}
                          </p>
                        </div>
                      </div>
                    )}
                    {isComingSoon && days <= 7 && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-purple-600 rounded-full text-white text-xs font-medium">
                        {days} days
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
                      {release.source}
                    </div>
                    {release.reddit_score && release.reddit_score > 10 && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-purple-600/80 backdrop-blur-sm rounded text-white text-xs">
                        🔥 {release.reddit_score}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="text-base font-bold text-white mb-0.5 line-clamp-1">
                      {release.artist}
                    </h3>
                    <p className="text-gray-300 text-xs mb-2 line-clamp-1">
                      {release.album}
                    </p>

                    {/* Genres */}
                    {release.genres && release.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {release.genres.slice(0, 2).map(genre => (
                          <span
                            key={genre}
                            className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Release Date */}
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(release.posted_at)}</span>
                    </div>

                    {/* Formats */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-300 line-clamp-1">
                        {release.formats && release.formats.length > 0 
                          ? release.formats.slice(0, 2).join(', ')
                          : 'Vinyl'}
                      </p>
                    </div>

                    {/* Links */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-500/20">
                      {release.purchase_url && (
                        <a
                          href={release.purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs rounded transition bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                        >
                          Buy <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {release.source_url && (
                        <a
                          href={release.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs rounded transition bg-white/10 hover:bg-white/20 text-white flex items-center gap-1"
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

        {!loading && !error && filteredReleases.length === 0 && (
          <div className="text-center py-16">
            <Disc className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No releases found matching your search</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Clear Search
            </button>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-sm border-t border-purple-500/20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p className="mb-2">
            VinylDrop aggregates releases from Reddit's vinyl community.
          </p>
          <p>
            Built for vinyl collectors, by vinyl collectors. 🎵
          </p>
        </div>
      </footer>
    </div>
  );
}