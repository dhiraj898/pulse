import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { refreshGoogleToken } from './oauth';
import type { Json } from '@/types/database';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Exchange the stored Google refresh token for a fresh access token.
export async function getGoogleAccessToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: user, error } = await admin
    .from('users')
    .select('google_refresh_token_encrypted')
    .eq('id', userId)
    .single();

  if (error || !user) throw new Error('User not found');
  if (!user.google_refresh_token_encrypted) {
    throw new Error('Google not connected — reconnect Google');
  }

  const refreshToken = decrypt(user.google_refresh_token_encrypted);
  const { access_token } = await refreshGoogleToken(refreshToken);
  return access_token;
}

interface GCalEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  recurringEventId?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { email?: string };
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
}

function eventTime(t?: { dateTime?: string; date?: string }): string | null {
  if (!t) return null;
  // All-day events use `date`; timed events use `dateTime`.
  return t.dateTime ?? (t.date ? new Date(t.date).toISOString() : null);
}

// Pull events from the user's primary calendar in a time window and upsert
// them into calendar_events. Returns the number of events synced.
export async function syncCalendarEvents(
  userId: string,
  daysBack = 7,
  daysForward = 30,
): Promise<number> {
  const accessToken = await getGoogleAccessToken(userId);

  const now = Date.now();
  const timeMin = new Date(now - daysBack * 86_400_000).toISOString();
  const timeMax = new Date(now + daysForward * 86_400_000).toISOString();

  const url =
    `${CALENDAR_API}/calendars/primary/events?` +
    new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { items?: GCalEvent[] };
  const items = json.items ?? [];

  const rows = items
    .filter(e => e.status !== 'cancelled' && eventTime(e.start) && eventTime(e.end))
    .map(e => ({
      user_id: userId,
      gcal_event_id: e.id,
      gcal_recurring_event_id: e.recurringEventId ?? null,
      title: e.summary ?? '(no title)',
      description: e.description ?? null,
      starts_at: eventTime(e.start)!,
      ends_at: eventTime(e.end)!,
      attendees: (e.attendees ?? []) as unknown as Json,
      organizer_email: e.organizer?.email ?? null,
      response_status:
        e.attendees?.find(a => a.email === e.organizer?.email)?.responseStatus ?? null,
      client_id: null,
      attended: null,
      actual_minutes: null,
      raw: e as unknown as Json,
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return 0;

  const admin = createAdminClient();
  const { error } = await admin
    .from('calendar_events')
    .upsert(rows, { onConflict: 'user_id,gcal_event_id' });

  if (error) throw new Error(`Failed to save events: ${error.message}`);
  return rows.length;
}
