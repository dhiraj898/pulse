import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exchangeFirefliesCode } from '@/lib/fireflies/oauth';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No authorization code' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokens = await exchangeFirefliesCode(code);

    const admin = createAdminClient();
    await admin
      .from('users')
      .update({
        fireflies_refresh_token_encrypted: encrypt(tokens.refresh_token),
        fireflies_access_token_encrypted: encrypt(tokens.access_token),
        fireflies_access_token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Fireflies callback error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
