'use client'

import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  CheckCheck,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { listNotifications, markAllRead } from '@/lib/events'
import { timeAgo } from '@/lib/reports'
import Logo from '@/components/Logo'
import Avatar from '@/components/Avatar'
import LanguageToggle from '@/components/LanguageToggle'
import { useLanguage } from '@/components/LanguageContext'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/map', label: 'Map', icon: Map },
]

const ACCOUNT_MENU = [
  { href: '/profile', label: 'Profile', icon: User, tab: 'overview' },
  { href: '/profile?tab=reports', label: 'My reports', icon: FileText, tab: 'reports' },
  { href: '/profile?tab=events', label: 'My events', icon: CalendarDays, tab: 'events' },
  { href: '/profile?tab=overview#activity', label: 'History', icon: History, tab: 'overview' },
  { href: '/profile?tab=security', label: 'Settings', icon: Settings, tab: 'security' },
]

// Desktop links are 40px tall; the mobile panel rows are 48px.
function navLinkClass(active, variant = 'desktop') {
  if (variant === 'mobile') {
    return `flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 ${
      active ? 'bg-surface text-ink' : 'text-ink/75 hover:bg-ink/5'
    }`
  }
  return `inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
    active ? 'bg-surface text-ink' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
  }`
}

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavItems({ pathname, variant = 'desktop', onNavigate }) {
  const { t } = useLanguage()
  return NAV.map(({ href, label, icon: Icon }) => {
    const active = pathname ? isActivePath(pathname, href) : false
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={navLinkClass(active, variant)}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        {t(label)}
      </Link>
    )
  })
}

// The active-route highlight and "close on route change" both need the URL,
// which only exists at runtime. Keeping them in their own Suspense boundary
// lets the rest of the header prerender, and the fallback still renders links.
function RouteWatcher({ onChange }) {
  const pathname = usePathname()
  const ref = useRef(onChange)
  useEffect(() => {
    ref.current = onChange
  })
  useEffect(() => {
    ref.current()
  }, [pathname])
  return null
}

function AccountPopup({ id, open, displayName, email, avatarUrl, stats, isAdmin, onClose }) {
  const { t } = useLanguage()
  const itemRefs = useRef([])
  const router = useRouter()

  // Admins get a quick way back into the panel, above Profile.
  const items = isAdmin
    ? [{ href: '/admin', label: 'Admin panel', icon: ShieldCheck }, ...ACCOUNT_MENU]
    : ACCOUNT_MENU

  if (!open) return null

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    onClose()
    router.push('/')
    router.refresh()
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose(true)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = itemRefs.current.filter(Boolean)
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement)
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const next = items[(current + direction + items.length) % items.length] ?? items[0]
    next.focus()
  }

  const name = displayName || t('Your account')

  return (
    <div
      id={id}
      role="menu"
      aria-label={t('Account')}
      onKeyDown={handleKeyDown}
      className="account-popup absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] border border-ink/12 bg-white p-2 shadow-[0_16px_40px_rgba(11,74,111,0.18)] max-[899px]:fixed max-[899px]:left-4 max-[899px]:right-4 max-[899px]:top-[72px] max-[899px]:w-auto max-[899px]:max-w-none"
    >
      <div className="flex items-center gap-3 px-2 py-2.5">
        <Avatar src={avatarUrl} name={displayName || email} size={48} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink" title={name}>
            {name}
          </p>
          {email ? (
            <p className="truncate text-xs text-ink/60" title={email}>
              {email}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-2 pb-2">
        <StatTile label={t('Reports')} value={stats.reports} />
        <StatTile label={t('Verified')} value={stats.verified} />
        <StatTile label={t('Events joined')} value={stats.joined} />
      </div>

      <div className="my-1.5 border-t border-ink/10" />

      <div className="space-y-0.5">
        {items.map(({ href, label, icon: Icon }, index) => (
          <Link
            key={href}
            href={href}
            role="menuitem"
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            onClick={() => onClose()}
            className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink/80 transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
          >
            <Icon className="h-4 w-4 shrink-0 text-ink/55" strokeWidth={2} aria-hidden="true" />
            {t(label)}
          </Link>
        ))}
      </div>

      <div className="my-1.5 border-t border-ink/10" />

      <button
        type="button"
        role="menuitem"
        ref={(node) => {
          itemRefs.current[items.length] = node
        }}
        onClick={handleLogout}
        className="flex h-11 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-semibold text-accent transition-colors duration-150 hover:bg-accent/10"
      >
        <LogOut className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        {t('Log out')}
      </button>
    </div>
  )
}

function StatTile({ label, value }) {
  // A tile whose query failed (value === null) is hidden rather than shown as 0.
  if (value === null) return null
  return (
    <div className="rounded-lg bg-surface px-2 py-2 text-center">
      <span className="block text-base font-bold leading-none text-ink">
        {value ?? '—'}
      </span>
      <span className="mt-1 block text-[10px] font-medium leading-tight text-ink/60">{label}</span>
    </div>
  )
}

function BellMenu({ id, open, notifications, onClose, onMarkAllRead }) {
  const { t, lang } = useLanguage()
  if (!open) return null
  return (
    <div
      id={id}
      className="bell-popup absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] border border-ink/12 bg-white shadow-[0_16px_40px_rgba(11,74,111,0.18)] max-[899px]:fixed max-[899px]:left-4 max-[899px]:right-4 max-[899px]:top-[72px] max-[899px]:w-auto max-[899px]:max-w-none"
    >
      <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-3.5 py-2.5">
        <p className="text-sm font-bold text-ink">{t('Notifications')}</p>
        {notifications.some((item) => !item.readAt) ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-ink/5"
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            {t('Mark all as read')}
          </button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink/60">{t("You're all caught up")}</p>
      ) : (
        <ul className="max-h-[min(60vh,360px)] overflow-y-auto py-1">
          {notifications.map((item) => (
            <li key={item.id}>
              <Link
                href={item.link || '/events'}
                onClick={() => onClose()}
                className="flex items-start gap-2.5 px-3.5 py-2.5 transition-colors duration-150 hover:bg-ink/5"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    item.readAt ? 'bg-transparent' : 'bg-accent'
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{item.title}</span>
                  {item.body ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-ink/65">{item.body}</span>
                  ) : null}
                  <span className="mt-0.5 block text-[11px] text-ink/45">{timeAgo(item.createdAt, lang)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AppHeader({ fluid = false }) {
  const { t } = useLanguage()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const accountButtonRef = useRef(null)
  const accountId = useId()
  const bellId = useId()

  const [user, setUser] = useState(undefined) // undefined = loading
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminBar, setShowAdminBar] = useState(false)
  const [openMenu, setOpenMenu] = useState(null) // 'account' | 'bell' | 'mobile'
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [stats, setStats] = useState({ reports: null, verified: null, joined: null })

  const barContainer = fluid
    ? 'landing-container flex h-16 items-center gap-2'
    : 'mx-auto flex h-16 w-full max-w-[1760px] items-center gap-2 px-[clamp(16px,3vw,48px)]'

  // --- session + profile ---------------------------------------------------
  useEffect(() => {
    let active = true

    async function loadUser(sessionUser) {
      const currentUser = sessionUser ?? (await supabase.auth.getUser()).data?.user ?? null
      if (!active) return
      if (!currentUser) {
        setUser(null)
        setDisplayName('')
        setAvatarUrl('')
        setIsAdmin(false)
        setNotifications([])
        setUnreadCount(0)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()
      if (!active) return

      const meta = currentUser.user_metadata || {}
      setDisplayName(profile?.full_name || meta.full_name || meta.name || '')
      setAvatarUrl(profile?.avatar_url || meta.avatar_url || meta.picture || '')
      setIsAdmin(profile?.role === 'admin')
      setUser(currentUser)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // --- notifications (badge before opening) --------------------------------
  useEffect(() => {
    if (!user) return
    let active = true
    listNotifications()
      .then((rows) => {
        if (!active) return
        setNotifications(rows)
        setUnreadCount(rows.filter((row) => !row.readAt).length)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user])

  // --- account stats (each hidden if its own query fails) ------------------
  useEffect(() => {
    if (openMenu !== 'account' || !user) return
    let active = true

    async function load() {
      const results = await Promise.allSettled([
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('report_verifications')
          .select('report_id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('event_participants')
          .select('event_id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])
      if (!active) return
      const valueAt = (index) => {
        const result = results[index]
        if (result.status !== 'fulfilled' || result.value?.error) return null
        return result.value?.count ?? 0
      }
      setStats({ reports: valueAt(0), verified: valueAt(1), joined: valueAt(2) })
    }

    load()
    return () => {
      active = false
    }
  }, [openMenu, user, supabase])

  // The slim "viewing as admin" bar is hidden for the rest of the session once
  // dismissed. sessionStorage is wrapped because it throws in some private modes.
  useEffect(() => {
    Promise.resolve().then(() => {
      if (!isAdmin) {
        setShowAdminBar(false)
        return
      }
      try {
        setShowAdminBar(sessionStorage.getItem('sajha:hide-admin-bar') !== '1')
      } catch {
        setShowAdminBar(true)
      }
    })
  }, [isAdmin])

  function hideAdminBar() {
    setShowAdminBar(false)
    try {
      sessionStorage.setItem('sajha:hide-admin-bar', '1')
    } catch {
      // Nothing to remember — the bar just hides for this render.
    }
  }

  function backToAdmin() {
    let target = '/admin'
    try {
      target = sessionStorage.getItem('sajha:last-admin-path') || '/admin'
    } catch {
      // Fall through to the Overview.
    }
    router.push(target)
  }

  const closeMenus = useCallback(() => setOpenMenu(null), [])
  const closeAccount = useCallback((toButton = false) => {
    setOpenMenu(null)
    if (toButton) accountButtonRef.current?.focus()
  }, [])

  // --- outside click -------------------------------------------------------
  useEffect(() => {
    if (!openMenu) return
    function onPointerDown(event) {
      if (event.target.closest?.('[data-menu-root]')) return
      setOpenMenu(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openMenu])

  // --- escape closes, returning focus to the avatar ------------------------
  useEffect(() => {
    if (!openMenu) return
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      setOpenMenu((current) => {
        if (current === 'mobile') return null
        accountButtonRef.current?.focus()
        return null
      })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openMenu])

  function toggleAccount() {
    setOpenMenu((current) => (current === 'account' ? null : 'account'))
  }

  function toggleBell() {
    setOpenMenu((current) => {
      if (current === 'bell') return null
      // "mark read on open" — clear the badge, keep the fetched dots on screen.
      if (unreadCount > 0) {
        markAllRead().catch(() => {})
        setUnreadCount(0)
      }
      return 'bell'
    })
  }

  function handleMarkAllRead() {
    setNotifications((previous) => previous.map((row) => ({ ...row, readAt: row.readAt || new Date().toISOString() })))
    setUnreadCount(0)
    markAllRead().catch(() => {})
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setOpenMenu(null)
    router.push('/')
    router.refresh()
  }

  const signedIn = Boolean(user)
  const email = user?.email ?? ''

  const avatarButton = (
    <button
      ref={accountButtonRef}
      type="button"
      onClick={toggleAccount}
      aria-haspopup="menu"
      aria-expanded={openMenu === 'account'}
      aria-controls={accountId}
      aria-label={t('Account menu')}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-shadow duration-150 focus-visible:outline-none ${
        openMenu === 'account' ? 'ring-2 ring-accent' : 'ring-1 ring-ink/15 hover:ring-2 hover:ring-ink/25'
      }`}
    >
      <Avatar src={avatarUrl} name={displayName || email} size={40} />
    </button>
  )

  const bellButton = (
    <button
      type="button"
      onClick={toggleBell}
      aria-haspopup="menu"
      aria-expanded={openMenu === 'bell'}
      aria-controls={bellId}
      aria-label={
        unreadCount > 0
          ? t('Notifications, {n} unread', { n: unreadCount })
          : t('Notifications')
      }
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink/70 transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
    >
      <Bell className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  )

  const adminButton = (
    <Link
      href="/admin"
      aria-label={t('Admin panel')}
      title={t('Admin panel')}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90 max-[899px]:w-10 max-[899px]:px-0"
    >
      <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
      <span className="max-[899px]:sr-only">{t('Admin panel')}</span>
    </Link>
  )

  const reportButton = (
    <Link
      href="/reports/new"
      aria-label={t('Report issue')}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90 max-[899px]:w-10 max-[899px]:px-0"
    >
      <Plus className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
      <span className="max-[899px]:sr-only">{t('Report issue')}</span>
    </Link>
  )

  const hamburger = (
    <button
      type="button"
      onClick={() => setOpenMenu((current) => (current === 'mobile' ? null : 'mobile'))}
      aria-expanded={openMenu === 'mobile'}
      aria-controls="mobile-menu"
      aria-label={openMenu === 'mobile' ? t('Close menu') : t('Open menu')}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink/70 transition-colors duration-150 hover:bg-ink/5 hover:text-ink min-[900px]:hidden order-4"
    >
      {openMenu === 'mobile' ? (
        <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-ink/12 bg-white">
      <div className={barContainer}>
        <Logo textClassName="max-[399px]:hidden" />

        <nav className="ml-auto hidden items-center gap-1 min-[900px]:flex" aria-label={t('Main')}>
          <Suspense fallback={<NavItems pathname={null} />}>
            <DesktopNav />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-2 min-[900px]:ml-0">
          <LanguageToggle className="mr-1 hidden min-[900px]:inline-flex" />
          {isAdmin ? adminButton : null}
          {signedIn ? (
            <>
              <span className="relative order-2 min-[900px]:order-1" data-menu-root="bell">
                {bellButton}
                <BellMenu
                  id={bellId}
                  open={openMenu === 'bell'}
                  notifications={notifications}
                  onClose={() => setOpenMenu(null)}
                  onMarkAllRead={handleMarkAllRead}
                />
              </span>

              <span className="order-1 min-[900px]:order-2">{reportButton}</span>

              <span className="relative order-3" data-menu-root="account">
                {avatarButton}
                <AccountPopup
                  id={accountId}
                  open={openMenu === 'account'}
                  displayName={displayName}
                  email={email}
                  avatarUrl={avatarUrl}
                  stats={stats}
                  isAdmin={isAdmin}
                  onClose={closeAccount}
                />
              </span>

              {hamburger}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-lg px-3 text-sm font-medium text-ink/70 transition-colors duration-150 hover:bg-ink/5 hover:text-ink min-[900px]:inline-flex"
              >
                {t('Log in')}
              </Link>
              <Link
                href="/register"
                className="hidden h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90 min-[900px]:inline-flex"
              >
                {t('Create account')}
              </Link>
              <span className="order-1 min-[900px]:hidden">{reportButton}</span>
              {hamburger}
            </>
          )}
        </div>
      </div>

      {isAdmin && showAdminBar ? (
        <div className="border-t border-ink/10 bg-surface print:hidden">
          <div
            className={
              fluid
                ? 'landing-container flex h-10 items-center gap-2 text-xs'
                : 'mx-auto flex h-10 w-full max-w-[1760px] items-center gap-2 px-[clamp(16px,3vw,48px)] text-xs'
            }
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-ink" strokeWidth={2.2} aria-hidden="true" />
            <span className="truncate text-ink/70">{t('You are viewing the public site as an admin')}</span>
            <button
              type="button"
              onClick={backToAdmin}
              className="ml-auto inline-flex h-7 shrink-0 items-center rounded-lg border border-ink bg-white px-2.5 font-semibold text-ink transition-colors duration-150 hover:bg-surface"
            >
              {t('Back to admin panel')}
            </button>
            <button
              type="button"
              onClick={hideAdminBar}
              aria-label={t('Hide')}
              className="shrink-0 rounded-md p-1 text-ink/50 transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {openMenu === 'mobile' ? (
        <div
          id="mobile-menu"
          data-menu-root="mobile"
          className="border-t border-ink/10 bg-white min-[900px]:hidden"
        >
          <nav className="mx-auto w-full max-w-[1760px] px-[clamp(16px,3vw,48px)] py-3" aria-label={t('Mobile')}>
            <div className="space-y-0.5">
              <Suspense fallback={<NavItems pathname={null} variant="mobile" onNavigate={closeMenus} />}>
                <MobileNav onNavigate={closeMenus} />
              </Suspense>
            </div>

            <div className="mt-3 border-t border-ink/10 pt-3">
              <LanguageToggle />
            </div>

            {!signedIn ? (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink/10 pt-3">
                <Link
                  href="/login"
                  onClick={closeMenus}
                  className="flex h-11 items-center justify-center rounded-lg border border-ink/15 text-sm font-semibold text-ink"
                >
                  {t('Log in')}
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenus}
                  className="flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white"
                >
                  {t('Create account')}
                </Link>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}

      <Suspense fallback={null}>
        <RouteWatcher onChange={closeMenus} />
      </Suspense>
    </header>
  )
}

function DesktopNav() {
  const pathname = usePathname()
  return <NavItems pathname={pathname} />
}

function MobileNav({ onNavigate }) {
  const pathname = usePathname()
  return <NavItems pathname={pathname} variant="mobile" onNavigate={onNavigate} />
}
