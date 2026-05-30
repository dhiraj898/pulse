'use client';

import { useCallback, useEffect, useState } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  organizer_email: string | null;
  attendees: Array<{ email?: string; displayName?: string }> | null;
  response_status: string | null;
}

function groupByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce((acc, e) => {
    const day = new Date(e.starts_at).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    (acc[day] ??= []).push(e);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);
}

function timeRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${new Date(start).toLocaleTimeString(undefined, opts)} – ${new Date(end).toLocaleTimeString(undefined, opts)}`;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/events');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch on mount; setState happens after await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  const syncNow = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setMessage(`Synced ${data.synced} event${data.synced === 1 ? '' : 's'}`);
      await loadEvents();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const grouped = groupByDay(events);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <button
            onClick={syncNow}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>

        {message && (
          <div className="mb-4 text-sm text-gray-700 bg-white border rounded px-4 py-2">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading events…</p>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No events. Click <span className="font-medium">Sync now</span> to pull your Google Calendar.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, dayEvents]) => (
              <div key={day}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">{day}</h2>
                <div className="bg-white rounded-lg shadow divide-y">
                  {dayEvents.map(e => (
                    <div key={e.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{e.title}</h3>
                          {e.attendees && e.attendees.length > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              {e.attendees.length} attendee{e.attendees.length === 1 ? '' : 's'}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap ml-4">
                          {timeRange(e.starts_at, e.ends_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
