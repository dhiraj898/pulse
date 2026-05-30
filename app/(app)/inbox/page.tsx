'use client';

import { useCallback, useEffect, useState } from 'react';

interface Email {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string;
  priority: string | null;
  classified_at: string | null;
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'sync' | 'triage' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/email/list');
      const data = await res.json();
      setEmails(Array.isArray(data) ? data : []);
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch on mount; setState happens after await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const run = async (kind: 'sync' | 'triage') => {
    setBusy(kind);
    setMessage(null);
    try {
      const url = kind === 'sync' ? '/api/email/sync' : '/api/email/triage';
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setMessage(
        kind === 'sync'
          ? `Synced ${data.synced} email${data.synced === 1 ? '' : 's'}`
          : `Triaged ${data.triaged}, created ${data.tasksCreated} task${data.tasksCreated === 1 ? '' : 's'}`,
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
          <div className="flex gap-2">
            <button
              onClick={() => run('sync')}
              disabled={busy !== null}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
            >
              {busy === 'sync' ? 'Syncing…' : 'Sync inbox'}
            </button>
            <button
              onClick={() => run('triage')}
              disabled={busy !== null}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
            >
              {busy === 'triage' ? 'Triaging…' : 'AI triage → tasks'}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 text-sm text-gray-700 bg-white border rounded px-4 py-2">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading…</p>
        ) : emails.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No emails. Click <span className="font-medium">Sync inbox</span> to pull from Gmail.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {emails.map(e => (
              <div key={e.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {e.subject || '(no subject)'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {e.from_name || e.from_email}
                    </p>
                    {e.snippet && (
                      <p className="text-sm text-gray-400 truncate mt-1">{e.snippet}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end ml-4 gap-1">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(e.received_at).toLocaleDateString()}
                    </span>
                    {e.classified_at && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        triaged
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
