import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/crypto';

// Supabase OAuth redirect lands here with ?code=... (PKCE).
// We exchange it for a session (sets auth cookies), capture the Google
// refresh token from the provider session, then route the user to
// onboarding or the dashboard depending on whether they've finished setup.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error_description') || searchParams.get('error');

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorParam)}`, origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session?.user) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message ?? 'auth_failed')}`, origin),
    );
  }

  const user = data.session.user;
  const providerRefreshToken = data.session.provider_refresh_token;

  // Store the Google refresh token (admin client bypasses RLS for the write).
  // Google only returns a refresh token on first consent / prompt=consent,
  // so don't clobber an existing one with null.
  if (providerRefreshToken) {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ google_refresh_token_encrypted: encrypt(providerRefreshToken) })
      .eq('id', user.id);
  }

  // New users (or anyone who hasn't finished onboarding) go to onboarding.
  const { data: settings } = await supabase
    .from('user_settings')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single();

  const dest = settings?.onboarding_completed ? '/dashboard' : '/onboarding';
  return NextResponse.redirect(new URL(dest, origin));
}
