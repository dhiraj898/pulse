import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('name, role, use_case, referral_source, google_refresh_token_encrypted, fireflies_api_key_encrypted, fireflies_refresh_token_encrypted')
      .eq('id', user.id)
      .single();

    const { data: settings } = await supabase
      .from('user_settings')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: userData?.name,
        role: userData?.role,
        useCase: userData?.use_case ?? null,
        referralSource: userData?.referral_source ?? null,
        onboardingComplete: settings?.onboarding_completed ?? false,
        googleConnected: !!userData?.google_refresh_token_encrypted,
        firefliesConnected: !!(userData?.fireflies_api_key_encrypted || userData?.fireflies_refresh_token_encrypted),
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
