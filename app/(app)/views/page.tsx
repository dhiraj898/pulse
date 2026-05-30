'use client';

import { useCallback, useEffect, useState } from 'react';

type Entity = 'tasks' | 'emails' | 'calendar';

interface Filters {
  status?: string;
  source?: string;
  priority?: string;
}

interface SavedView {
  id: string;
  name: string;
  entity: Entity;
  filters: Filters;
  created_at: string;
}

const ENDPOINT: Record<Entity, string> = {
  tasks: '/api/tasks',
  emails: '/api/email/list',
  calendar: '/api/calendar/events',
};

export default function ViewsPage() {
  const [views, setViews] = useState<SavedView[]>([]);
  const [name, setName] = useState('');
  const [entity, setEntity] = useState<Entity>('tasks');
  const [filters, setFilters] = useState<Filters>({});
  const [active, setActive] = useState<SavedView | null>(null);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadViews = useCallback(async () => {
    const res = await fetch('/api/views');
    const data = await res.json();
    setViews(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const saveView = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Name your view');
      return;
    }
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), entity, filters }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? 'Could not save view');
      return;
    }
    setName('');
    setFilters({});
    await loadViews();
  };

  const deleteView = async (id: string) => {
    await fetch(`/api/views?id=${id}`, { method: 'DELETE' });
    if (active?.id === id) {
      setActive(null);
      setResults([]);
    }
    await loadViews();
  };

  const applyView = async (view: SavedView) => {
    setActive(view);
    setLoadingResults(true);
    try {
      const res = await fetch(ENDPOINT[view.entity]);
      const data = await res.json();
      const rows: Record<string, unknown>[] = Array.isArray(data) ? data : [];
      const f = view.filters;
      const filtered = rows.filter(r => {
        if (f.status && r.status !== f.status) return false;
        if (f.source && r.source !== f.source) return false;
        if (f.priority && r.priority !== f.priority) return false;
        return true;
      });
      setResults(filtered);
    } finally {
      setLoadingResults(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Views</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Create + list */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold text-gray-900 mb-3">New view</h2>
              {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
              <input
                placeholder="View name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
              />
              <select
                value={entity}
                onChange={e => {
                  setEntity(e.target.value as Entity);
                  setFilters({});
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
              >
                <option value="tasks">Tasks</option>
                <option value="emails">Emails</option>
                <option value="calendar">Calendar</option>
              </select>

              {entity === 'tasks' && (
                <>
                  <select
                    value={filters.status ?? ''}
                    onChange={e => setFilters({ ...filters, status: e.target.value || undefined })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
                  >
                    <option value="">Any status</option>
                    {['proposed', 'accepted', 'in_progress', 'done', 'rejected', 'snoozed'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={filters.source ?? ''}
                    onChange={e => setFilters({ ...filters, source: e.target.value || undefined })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
                  >
                    <option value="">Any source</option>
                    {['email', 'calendar', 'fireflies', 'manual', 'recurring'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </>
              )}

              {entity === 'emails' && (
                <select
                  value={filters.priority ?? ''}
                  onChange={e => setFilters({ ...filters, priority: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
                >
                  <option value="">Any priority</option>
                  {['urgent', 'important', 'fyi', 'noise'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}

              <button
                onClick={saveView}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded mt-1"
              >
                Save view
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Saved</h2>
              {views.length === 0 ? (
                <p className="text-sm text-gray-500">No saved views yet.</p>
              ) : (
                <ul className="space-y-1">
                  {views.map(v => (
                    <li key={v.id} className="flex items-center justify-between">
                      <button
                        onClick={() => applyView(v)}
                        className={`text-sm text-left flex-1 px-2 py-1 rounded ${
                          active?.id === v.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {v.name} <span className="text-gray-400">· {v.entity}</span>
                      </button>
                      <button
                        onClick={() => deleteView(v.id)}
                        className="text-gray-400 hover:text-red-600 text-xs px-2"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-4 min-h-[200px]">
              <h2 className="font-semibold text-gray-900 mb-3">
                {active ? `${active.name} (${results.length})` : 'Select a view'}
              </h2>
              {!active ? (
                <p className="text-sm text-gray-500">Pick a saved view to see matching items.</p>
              ) : loadingResults ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-gray-500">No matching items.</p>
              ) : (
                <ul className="divide-y">
                  {results.map((r, i) => (
                    <li key={(r.id as string) ?? i} className="py-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {(r.title as string) || (r.subject as string) || '(untitled)'}
                      </span>
                      <span className="text-gray-500 ml-2">
                        {[r.status, r.source, r.priority, r.from_email]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
