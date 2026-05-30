'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTaskStore, type CurrentUser } from '@/lib/store';

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

export default function ProfilePage() {
  const setUser = useTaskStore(s => s.setUser);
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firefliesKey, setFirefliesKey] = useState('');
  const [ffMsg, setFfMsg] = useState<string | null>(null);
  const [ffBusy, setFfBusy] = useState(false);
  const [showFfInput, setShowFfInput] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data.user);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    load();
  }, [load]);

  const reconnectGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: GOOGLE_SCOPES,
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  };

  const connectFireflies = async () => {
    setFfMsg(null);
    if (!firefliesKey.trim()) {
      setFfMsg('Paste your Fireflies API key');
      return;
    }
    setFfBusy(true);
    try {
      const res = await fetch('/api/auth/fireflies/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: firefliesKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Connection failed');
      setFfMsg('✓ Connected');
      setFirefliesKey('');
      setShowFfInput(false);
      await load();
    } catch (err) {
      setFfMsg(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setFfBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-6 text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your details</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Name" value={profile?.name} />
            <Row label="Email" value={profile?.email} />
            <Row label="Role" value={profile?.role} />
            <Row label="Use case" value={profile?.useCase} />
            <Row label="Heard about us" value={profile?.referralSource} />
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connections</h2>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium text-gray-900">Google</p>
              <p className="text-sm text-gray-500">Calendar &amp; Gmail access</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge connected={!!profile?.googleConnected} />
              <button
                onClick={reconnectGoogle}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {profile?.googleConnected ? 'Reconnect' : 'Connect'}
              </button>
            </div>
          </div>

          <div className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Fireflies</p>
                <p className="text-sm text-gray-500">Meeting transcripts</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge connected={!!profile?.firefliesConnected} />
                <button
                  onClick={() => setShowFfInput(v => !v)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {profile?.firefliesConnected ? 'Reconnect' : 'Connect'}
                </button>
              </div>
            </div>

            {showFfInput && (
              <div className="mt-3">
                <input
                  type="password"
                  placeholder="Fireflies API key"
                  value={firefliesKey}
                  onChange={e => setFirefliesKey(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
                />
                <button
                  onClick={connectFireflies}
                  disabled={ffBusy}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
                >
                  {ffBusy ? 'Testing…' : 'Test & save'}
                </button>
              </div>
            )}
            {ffMsg && <p className="mt-2 text-sm text-gray-600">{ffMsg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value || '—'}</dd>
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}
