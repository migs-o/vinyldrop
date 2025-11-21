'use client';

import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Home } from 'lucide-react';
import Link from 'next/link';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function UnsubscribePage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get email from URL parameter
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      // Auto-unsubscribe if email is in URL
      handleUnsubscribe(decodeURIComponent(emailParam));
    }
  }, []);

  const handleUnsubscribe = async (emailToUnsubscribe = null) => {
    const emailValue = emailToUnsubscribe || email;
    
    if (!emailValue || !emailValue.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/unsubscribe?email=${encodeURIComponent(emailValue)}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'You have been successfully unsubscribed. You will no longer receive emails from VinylDrop.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to unsubscribe. Please try again.');
      }
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setStatus('error');
      setMessage('An error occurred. Please try again later.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleUnsubscribe();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-purple-500/20 p-8">
          <div className="text-center mb-6">
            <Mail className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Unsubscribe</h1>
            <p className="text-gray-300 text-sm">
              We're sorry to see you go. You can unsubscribe below.
            </p>
          </div>

          {status === 'idle' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
              >
                Unsubscribe
              </button>
            </form>
          )}

          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Processing...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Unsubscribed</h2>
              <p className="text-gray-300 mb-6">{message}</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Error</h2>
              <p className="text-gray-300 mb-6">{message}</p>
              <button
                onClick={() => {
                  setStatus('idle');
                  setMessage('');
                }}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            Return to VinylDrop
          </Link>
        </div>
      </div>
    </div>
  );
}

