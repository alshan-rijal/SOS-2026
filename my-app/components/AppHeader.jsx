'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, LayoutDashboard, LogOut, Map, Menu, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/map', label: 'Map', icon: Map },
]

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navLinkClass(active, variant = 'desktop') {
  if (variant === 'mobile') {
    return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
      active ? 'bg-ink/5 text-ink' : 'text-ink/70 hover:bg-ink/5'
    }`
  }
  return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-ink/5 text-ink' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
  }`
}

function NavItems({ isActive, variant = 'desktop' }) {
  return NAV.map(({ href, label, icon: Icon }) => {
    const active = isActive(href)
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={navLinkClass(active, variant)}
      >
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        {label}
      </Link>
    )
  })
}

// The active-route highlight needs the URL, which only exists at runtime. Keeping
// it in its own component behind <Suspense> lets the rest of the header prerender,
// and the fallback still renders real, working links.
function DesktopNav() {
  const pathname = usePathname()
  return (
    <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
      <NavItems isActive={(href) => isActivePath(pathname, href)} />
    </nav>
  )
}

function DesktopNavFallback() {
  return (
    <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
      <NavItems isActive={() => false} />
    </nav>
  )
}

function MobileNav({ onNavigate }) {
  const pathname = usePathname()
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href)
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={navLinkClass(active, 'mobile')}
            >
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export default function AppHeader() {
  const router = useRouter()
  const supabase = createClient()

  const [userName, setUserName] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let active = true

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!active) return
      if (!user) {
        setUserName('')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      if (!active) return
      setUserName(profile?.full_name || user.email || 'Signed in')
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => loadUser())

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  function closeMenu() {
    setIsMenuOpen(false)
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    setIsLoggingOut(false)
    router.push('/login')
    router.refresh()
  }

  const userActions = userName ? (
    <>
      <span className="hidden max-w-[12rem] truncate text-xs font-medium text-ink/60 sm:inline">
        {userName}
      </span>
      <Link
        href="/reports/new"
        className="hidden items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong sm:inline-flex"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
        Report issue
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-50 sm:inline-flex"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        {isLoggingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink sm:inline-block"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="hidden rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong sm:inline-block"
      >
        Create account
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <Suspense fallback={<DesktopNavFallback />}>
          <DesktopNav />
        </Suspense>

        <div className="ml-auto flex items-center gap-2">
          {userActions}

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex items-center justify-center rounded-lg p-2 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink md:hidden"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-ink/10 bg-white md:hidden">
          <nav className="mx-auto max-w-6xl px-4 py-3 sm:px-6" aria-label="Mobile">
            <MobileNav onNavigate={closeMenu} />

            <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
              {userName ? (
                <>
                  <Link
                    href="/reports/new"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                    Report issue
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {isLoggingOut ? 'Signing out…' : `Sign out (${userName})`}
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="rounded-lg border border-ink/15 px-4 py-2.5 text-center text-sm font-medium text-ink"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMenu}
                    className="rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Create account
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
