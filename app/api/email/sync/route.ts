import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncEmails } from '@/lib/google/gmail';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await syncEmails(user.id);
    return NextResponse.json({ success: true, synced: count });
  } catch (error) {
    console.error('Email sync error:', error);
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
