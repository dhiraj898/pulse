import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncCalendarEvents } from '@/lib/google/calendar';
import { syncEmails } from '@/lib/google/gmail';

// Service-to-service sync for ALL connected users, invoked by pg_cron via
// pg_net. Authenticated with a shared secret, not a user session.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') ?? '';
  const provided = auth.replace(/^Bearer\s+/i, '') || request.headers.get('x-cron-secret') || '';

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from('users')
    .select('id')
    .not('google_refresh_token_encrypted', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ userId: string; events?: number; emails?: number; error?: string }> = [];
  for (const u of users ?? []) {
    try {
      const events = await syncCalendarEvents(u.id);
      const emails = await syncEmails(u.id);
      results.push({ userId: u.id, events, emails });
    } catch (err) {
      results.push({ userId: u.id, error: err instanceof Error ? err.message : 'sync failed' });
    }
  }

  return NextResponse.json({ ranFor: results.length, results });
}
