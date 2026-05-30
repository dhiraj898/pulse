import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Returns the user's synced calendar events. Optional ?from=&to= ISO bounds;
// defaults to 7 days back through 30 days forward.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const now = Date.now();
    const from = searchParams.get('from') ?? new Date(now - 7 * 86_400_000).toISOString();
    const to = searchParams.get('to') ?? new Date(now + 30 * 86_400_000).toISOString();

    const { data, error } = await supabase
      .from('calendar_events')
      .select('id, title, description, starts_at, ends_at, organizer_email, attendees, response_status')
      .eq('user_id', user.id)
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Calendar events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
