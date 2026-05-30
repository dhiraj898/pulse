import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Auth/OAuth endpoints must stay reachable without a session (the session is
  // being established there). /r/ are public share links.
  const isAuthFlow =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/r/')
  if (isAuthFlow) {
    return supabaseResponse
  }

  // API routes enforce their own auth and return JSON — never redirect them
  // (return 401 from the handler instead of bouncing to /login, and let
  // /api/onboarding/complete run while the user is not yet onboarded).
  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  // Unauthenticated: only the login page is allowed.
  if (!user) {
    if (pathname.startsWith('/login')) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated: enforce onboarding completion.
  const { data: settings } = await supabase
    .from('user_settings')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()
  const onboarded = settings?.onboarding_completed ?? false

  if (!onboarded && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Already signed in + onboarded: keep them out of login/onboarding.
  if (onboarded && (pathname.startsWith('/login') || pathname === '/onboarding')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
}
