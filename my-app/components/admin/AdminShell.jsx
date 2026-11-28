'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarDays,
  Download,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Map as MapIcon,
  Menu,
  ScrollText,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'
import Avatar from '@/components/Avatar'
import Logo from '@/components/Logo'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/queue', label: 'Verification queue', icon: ShieldCheck, count: 'queue' },
  { href: '/admin/confidential', label: 'Confidential', icon: Lock, count: 'confidential' },
  { href: '/admin/map', label: 'Map', icon: MapIcon },
  { href: '/admin/exports', label: 'Exports', icon: Download },
  { href: '/admin/events', label: 'Events review', icon: CalendarDays },
  { href: '/admin/activity', label: 'Activity log', icon: ScrollText },
]

const TITLES = {
  '/admin': 'Overview',
  '/admin/reports': 'Reports',
  '/admin/queue': 'Verification queue',
  '/admin/confidential': 'Confidential',
  '/admin/map': 'Map',
  '/admin/exports': 'Exports',
  '/admin/events': 'Events review',
  '/admin/activity': 'Activity log',
}

function navActive(pathname, item) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export default function AdminShell({ children }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [counts, setCounts] = useState({ queue: null, confidential: null })
  const [profile, setProfile] = useState({ name: '', email: '', avatarUrl: '' })
  const menuButtonRef = useRef(null)

  const title = TITLES[pathname] ?? TITLES[`/admin/${pathname.split('/')[2]}`] ?? 'Admin'

  // Remember the last admin page so the public site can offer "Back to admin".
  useEffect(() => {
    try {
      sessionStorage.setItem('sajha:last-admin-path', pathname)
    } catch {
      // Private mode or storage disabled — the link just falls back to Overview.
    }
  }, [pathname])

  useEffect(() => {
    Promise.resolve().then(() => setDrawerOpen(false))
  }, [pathname])

  // Sidebar counts + the signed-in admin's name.
  useEffect(() => {
    let active = true
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!active) return
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()
        if (!active) return
        setProfile({
          name: data?.full_name || user.user_metadata?.full_name || '',
          email: user.email || '',
          avatarUrl: data?.avatar_url || '',
        })
      }

      const [queue, confidential] = await Promise.allSettled([
        supabase.from('reports').select('id', { count: 'exact', head: true }).in('status', ['reported', 'pending']),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('is_confidential', true),
      ])
      if (!active) return
      setCounts({
        queue: queue.status === 'fulfilled' && !queue.value.error ? queue.value.count ?? 0 : null,
        confidential:
          confidential.status === 'fulfilled' && !confidential.value.error
            ? confidential.value.count ?? 0
            : null,
      })
    }
    load()
    return () => {
      active = false
    }
  }, [supabase])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onKey(event) {
      if (event.key === 'Escape') closeMenu()
    }
    function onPointer(event) {
      if (event.target.closest?.('[data-admin-menu]')) return
      setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [menuOpen, closeMenu])

  function submitSearch(event) {
    event.preventDefault()
    const term = query.trim()
    router.push(term ? `/admin/reports?q=${encodeURIComponent(term)}` : '/admin/reports')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="mb-2 flex items-center gap-2 px-2 py-1.5">
        <Logo textClassName="max-[1100px]:hidden" />
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label={t('Close menu')}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 min-[900px]:hidden"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label={t('Admin menu')} className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = navActive(pathname, item)
          const Icon = item.icon
          const count = item.count ? counts[item.count] : null
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              title={t(item.label)}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 ${
                active ? 'bg-surface text-ink' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="truncate max-[1100px]:hidden">{t(item.label)}</span>
              {count ? (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white max-[1100px]:hidden">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-ink/10 pt-2">
        <Link
          href="/"
          title={t('Back to site')}
          className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink/70 transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
        >
          <ArrowUpRight className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="max-[1100px]:hidden">{t('Back to site')}</span>
        </Link>
        <div className="px-1.5 max-[1100px]:flex max-[1100px]:justify-center">
          <LanguageToggle />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface">
      {/* Fixed sidebar: 240px, icons-only at <=1100px, off-canvas drawer <=900px. */}
      <aside
        aria-label={t('Admin panel')}
        className={`fixed inset-y-0 left-0 z-40 w-[240px] border-r border-ink/12 bg-white transition-transform duration-200 max-[1100px]:w-[110px] max-[900px]:w-[264px] ${
          drawerOpen ? 'translate-x-0' : 'max-[900px]:-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      {drawerOpen ? (
        <div
          className="fixed inset-0 z-30 bg-ink/40 min-[900px]:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="pl-[240px] max-[1100px]:pl-[110px] max-[900px]:pl-0">
        <header className="sticky top-0 z-20 border-b border-ink/12 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-[clamp(16px,2vw,24px)]">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('Open menu')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink/70 hover:bg-ink/5 min-[900px]:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>

            <h1 className="truncate text-lg font-bold tracking-tight text-ink">{t(title)}</h1>

            <form onSubmit={submitSearch} role="search" className="relative ml-auto w-full max-w-[320px] max-[760px]:hidden">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('Search title, place or report id…')}
                aria-label={t('Search')}
                className="h-10 w-full rounded-xl border border-ink/15 bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
              />
            </form>

            <div className="ml-auto flex items-center gap-2 min-[760px]:ml-2">
              <LanguageToggle className="max-[900px]:hidden" />
              <Link
                href="/"
                title={t('View public site')}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-ink bg-white px-3 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface max-[1100px]:hidden"
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                {t('View public site')}
              </Link>

              <div className="relative" data-admin-menu>
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={t('Account menu')}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-shadow ${
                    menuOpen ? 'ring-2 ring-accent' : 'ring-1 ring-ink/15 hover:ring-2 hover:ring-ink/25'
                  }`}
                >
                  <Avatar src={profile.avatarUrl} name={profile.name || profile.email} size={40} />
                </button>

                {menuOpen ? (
                  <div
                    role="menu"
                    aria-label={t('Account')}
                    className="absolute right-0 top-[calc(100%+8px)] z-30 w-[260px] overflow-hidden rounded-[14px] border border-ink/12 bg-white p-2 shadow-[0_16px_40px_rgba(11,74,111,0.18)]"
                  >
                    <div className="px-2 py-2">
                      <p className="truncate text-sm font-bold text-ink">{profile.name || t('Admin')}</p>
                      {profile.email ? <p className="truncate text-xs text-ink/60">{profile.email}</p> : null}
                    </div>
                    <div className="my-1 border-t border-ink/10" />
                    <Link href="/" role="menuitem" className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink/80 hover:bg-ink/5 hover:text-ink">
                      <ArrowUpRight className="h-4 w-4 text-ink/55" strokeWidth={2} aria-hidden="true" />
                      {t('View public site')}
                    </Link>
                    <Link href="/profile" role="menuitem" className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink/80 hover:bg-ink/5 hover:text-ink">
                      <User className="h-4 w-4 text-ink/55" strokeWidth={2} aria-hidden="true" />
                      {t('Profile')}
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex h-11 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-semibold text-accent hover:bg-accent/10"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                      {t('Log out')}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="px-[clamp(16px,2vw,24px)] py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
