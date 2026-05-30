'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Identity + the data scopes we need from Google in a single consent.
// Calendar + Gmail are requested here so onboarding doesn't need a separate
// Google step; the refresh token is captured in /auth/callback.
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
].join(' ');

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: GOOGLE_SCOPES,
          redirectTo: `${window.location.origin}/auth/callback`,
          // offline + consent so Google returns a refresh token we can store
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (oauthError) throw oauthError;
      // Browser is redirected to Google by Supabase; nothing else to do.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-2">TimeTracker Pulse</h1>
        <p className="text-slate-400 mb-8">AI-powered task management from your emails</p>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 text-black font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <p className="text-slate-400 text-sm mt-6 text-center">
          We connect your Google Calendar and Gmail to extract tasks. You can connect
          Fireflies during setup.
        </p>
      </div>
    </div>
  );
}
