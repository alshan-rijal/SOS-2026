import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Routes that require a signed-in user. Reports themselves are public.
const PROTECTED_PREFIXES = ['/dashboard', '/reports/new', '/profile']
const ADMIN_PREFIX = '/admin-panel'
const ADMIN_LOGIN = '/admin/login'
const AUTH_ROUTES = ['/login', '/register']

function redirectWithCookies(url, supabaseResponse) {
  const redirectResponse = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie)
  })
  return redirectResponse
}

async function roleOf(supabase, userId) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  return data?.role ?? null
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  const isAdminRoute = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)
  const isAdminLogin = pathname === ADMIN_LOGIN

  // Block unauthenticated users from protected routes, remembering where they were going.
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  if (!user && (isProtected || (isAdminRoute && !isAdminLogin))) {
    const url = request.nextUrl.clone()
    url.pathname = isAdminRoute ? ADMIN_LOGIN : '/login'
    url.search = ''
    url.searchParams.set('next', `${pathname}${search}`)
    return redirectWithCookies(url, supabaseResponse)
  }

  // Signed in on the admin sign-in page: an admin goes straight in; a normal
  // user is left on the page so it can say "this account is not an admin".
  if (user && isAdminLogin) {
    if ((await roleOf(supabase, user.id)) === 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = ADMIN_PREFIX
      url.search = ''
      return redirectWithCookies(url, supabaseResponse)
    }
    return supabaseResponse
  }

  // Admin routes for signed-in users: the server layout enforces the role, so a
  // non-admin gets the standard not-found rather than a redirect that would
  // reveal the admin area exists.

  // Redirect already-logged-in users away from the auth pages: admins land in the
  // admin panel, everyone else on the public dashboard.
  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = (await roleOf(supabase, user.id)) === 'admin' ? ADMIN_PREFIX : '/dashboard'
    url.search = ''
    return redirectWithCookies(url, supabaseResponse)
  }

  return supabaseResponse
}
