import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/crypto';

const FIREFLIES_GRAPHQL_URL = 'https://api.fireflies.ai/graphql';

// Fireflies personal accounts authenticate with a long-lived API key
// (Settings -> Developer Settings -> API Key) used as a GraphQL Bearer token.
// We validate it against the API before storing it encrypted.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKey } = await request.json();
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Validate the key by fetching the authenticated Fireflies user.
    const res = await fetch(FIREFLIES_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({ query: '{ user { user_id email } }' }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.errors || !json.data?.user) {
      return NextResponse.json(
        { error: 'Invalid Fireflies API key' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from('users')
      .update({ fireflies_api_key_encrypted: encrypt(apiKey.trim()) })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fireflies connect error:', error);
    return NextResponse.json({ error: 'Failed to connect Fireflies' }, { status: 500 });
  }
}
