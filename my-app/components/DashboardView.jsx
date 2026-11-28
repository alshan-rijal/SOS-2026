'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CalendarDays, CircleCheck, Clock, FileText, LoaderCircle, Map, Plus, RotateCw, ShieldCheck, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ZONE_MIN_REPORTS,
  ZONE_RADIUS_M,
  categoryLabel,
  fetchMapReports,
  fetchMyVerifiedIds,
  fetchReportStats,
  findProblemZones,
  formatZoneRadius,
  normalizeReport,
  reportErrorMessage,
  setVerification,
  zoneBounds,
} from '@/lib/reports'
import { eventsErrorMessage, listEvents } from '@/lib/events'
import ReportCard, { ReportCardSkeleton } from '@/components/ReportCard'
import EventCard, { EventCardSkeleton } from '@/components/EventCard'
import MapViewToggle, { normalizeMapView } from '@/components/MapViewToggle'
import SignalAlert from '@/components/SignalAlert'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useLanguage } from '@/components/LanguageContext'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-ink/8" />,
})

const RECENT_COUNT = 5

const STAT_CARDS = [
  { key: 'total', label: 'Total reports', href: '/reports', icon: FileText, tone: 'bg-ink/5 text-ink' },
  { key: 'reported', label: 'Reported', href: '/reports?status=reported', icon: Clock, tone: 'bg-surface text-ink' },
  {
    key: 'underVerification',
    label: 'Under verification',
    href: '/reports?status=under_verification',
    icon: ShieldCheck,
    tone: 'bg-white text-ink ring-1 ring-ink/20',
  },
  {
    key: 'inProgress',
    label: 'Being resolved',
    href: '/reports?status=in_progress',
    icon: LoaderCircle,
    tone: 'bg-ink text-white',
  },
  {
    key: 'fixed',
    label: 'Fixed',
    href: '/reports?status=fixed',
    icon: CircleCheck,
    tone: 'bg-white text-ink ring-2 ring-ink',
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t, lang } = useLanguage()

  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [events, setEvents] = useState([])
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [error, setError] = useState('')
  const [eventError, setEventError] = useState('')
  const [verifyingId, setVerifyingId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [view, setView] = useState(() => normalizeMapView(searchParams.get('view')))
  const [eventType, setEventType] = useState(() => searchParams.get('etype') || '')

  const load = useCallback(
    async (signal) => {
      try {
        const [nextStats, rows] = await Promise.all([
          fetchReportStats(supabase),
          fetchMapReports(supabase),
        ])
        if (signal?.aborted) return
        const [verifiedIds, auth] = await Promise.all([
          fetchMyVerifiedIds(supabase),
          supabase.auth.getUser(),
        ])
        if (signal?.aborted) return
        setStats(nextStats)
        setReports(rows.map((row) => normalizeReport(row, verifiedIds)))
        setUserId(auth.data.user?.id ?? null)
        setError('')
      } catch (err) {
        if (signal?.aborted) return
        setError(reportErrorMessage(err))
      } finally {
        if (!signal?.aborted) setIsLoading(false)
      }
    },
    [supabase]
  )

  const loadEvents = useCallback(async (signal, type) => {
    try {
      const rows = await listEvents({ type: type || undefined, when: 'upcoming' })
      if (signal?.aborted) return
      setEvents(rows)
      setEventError('')
    } catch (err) {
      if (signal?.aborted) return
      setEventError(eventsErrorMessage(err))
    } finally {
      if (!signal?.aborted) setIsLoadingEvents(false)
    }
  }, [])

  function retry() {
    setIsLoading(true)
    load()
  }

  useEffect(() => {
    const controller = new AbortController()
    // Kick the fetch off the synchronous effect body; it resolves on a later tick.
    Promise.resolve().then(() => load(controller.signal))
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => {
      setIsLoadingEvents(true)
      return loadEvents(controller.signal, eventType)
    })
    return () => controller.abort()
  }, [loadEvents, eventType])

  // The dashboard map's view and type filters live in the URL too.
  useEffect(() => {
    const params = new URLSearchParams()
    if (view !== 'both') params.set('view', view)
    if (eventType) params.set('etype', eventType)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [view, eventType, pathname, router])

  async function handleVerify(report) {
    if (userId && report.userId === userId) return
    if (!userId) {
      router.push('/login')
      return
    }

    const verified = !report.verifiedByMe
    setVerifyingId(report.id)
    setReports((previous) =>
      previous.map((item) =>
        item.id === report.id
          ? {
              ...item,
              verifiedByMe: verified,
              verifications: item.verifications + (verified ? 1 : -1),
            }
          : item
      )
    )

    try {
      await setVerification(supabase, report.id, userId, verified)
    } catch (err) {
      // Roll back the optimistic update if the write failed.
      setReports((previous) =>
        previous.map((item) =>
          item.id === report.id
            ? {
                ...item,
                verifiedByMe: !verified,
                verifications: item.verifications + (verified ? -1 : 1),
              }
            : item
        )
      )
      setError(reportErrorMessage(err))
    } finally {
      setVerifyingId(null)
    }
  }

  const recent = reports.slice(0, RECENT_COUNT)
  const categoryMax = Math.max(1, ...(stats?.categories ?? []).map((row) => row.count))
  const zones = useMemo(
    () => findProblemZones(reports, ZONE_RADIUS_M, ZONE_MIN_REPORTS, lang),
    [reports, lang]
  )
  const topZones = zones.slice(0, 3)

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: t('Dashboard') }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t('Dashboard')}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {t('Reported problems across your area, with the current status of each.')}
          </p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          {t('Report an issue')}
        </Link>
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm font-medium text-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-accent/10"
          >
            <RotateCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            {t('Try again')}
          </button>
        </div>
      ) : null}

      {/* Wait for the first fetch so the alert does not flash an empty state. */}
      {!isLoading ? (
        <SignalAlert zones={zones} zoneRadius={ZONE_RADIUS_M} onFocus={setFocus} />
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, href, icon: Icon, tone }) => (
          <Link
            key={key}
            href={href}
            className="card flex flex-col gap-3 p-5 transition-shadow duration-150 hover:shadow-[0_12px_32px_rgba(11,74,111,0.12)]"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-2xl font-bold tracking-tight text-ink">
                {isLoading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-ink/8" /> : stats?.[key] ?? 0}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-ink/60">{t(label)}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink/60">
              {t('Recent reports')}
            </h2>
            <Link
              href="/reports"
              className="text-xs font-semibold text-ink transition-colors duration-150 hover:underline"
            >
              {t('View all')}
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <ReportCardSkeleton key={index} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t('No reports yet')}
              description={t('Nothing has been reported in your area. Be the first to flag a problem.')}
              action={
                <Link
                  href="/reports/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                  {t('Report an issue')}
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {recent.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onVerify={handleVerify}
                  isVerifying={verifyingId === report.id}
                />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6 lg:col-span-5">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-ink">{t('Report locations')}</h2>
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-colors duration-150 hover:underline"
              >
                <Map className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                {t('Full map')}
              </Link>
            </div>
            <div className="mb-3">
              <MapViewToggle
                view={view}
                onView={setView}
                type={eventType}
                onType={setEventType}
                showTypes={false}
              />
            </div>
            <div className="h-64">
              <ItahariMap
                reports={view === 'events' ? [] : reports}
                zones={view === 'events' ? [] : zones}
                events={view === 'problems' ? [] : events}
                className="h-full"
                zoom={13}
                zoneRadius={ZONE_RADIUS_M}
                onViewReports={() => router.push('/map')}
                focus={focus}
                onVerify={handleVerify}
                verifyingId={verifyingId}
                currentUserId={userId}
              />
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <CalendarDays className="h-4 w-4 text-accent" strokeWidth={2.2} aria-hidden="true" />
                {t('Upcoming events')}
              </h2>
              <Link
                href="/events"
                className="text-xs font-semibold text-ink transition-colors duration-150 hover:underline"
              >
                {t('View all')}
              </Link>
            </div>
            {isLoadingEvents ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <EventCardSkeleton key={index} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-ink/60">
                {eventError
                  ? t('Events are not set up yet.')
                  : t('No upcoming events. Organise the first one in your ward.')}
              </p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 3).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <TrendingUp className="h-4 w-4 text-accent" strokeWidth={2.2} aria-hidden="true" />
              {t('Top problem areas')}
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-10 w-full animate-pulse rounded-lg bg-ink/8" />
                ))}
              </div>
            ) : topZones.length === 0 ? (
              <p className="text-sm text-ink/60">
                {t('No problem-prone zones yet — reports need to sit within {r} of each other.', {
                  r: formatZoneRadius(ZONE_RADIUS_M),
                })}
              </p>
            ) : (
              <ol className="space-y-2">
                {topZones.map((zone, index) => (
                  <li key={zone.id}>
                    <button
                      type="button"
                      onClick={() => setFocus({ bounds: zoneBounds(zone) })}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-ink/5"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-accent text-white' : 'bg-ink/5 text-ink'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate text-sm font-semibold text-ink"
                          title={zone.label}
                        >
                          {zone.label}
                        </span>
                        <span className="block text-xs text-ink/60">
                          {zone.count} {t(zone.count === 1 ? 'report' : 'reports')} ·{' '}
                          {categoryLabel(zone.categories[0]?.category, lang)}
                          {zone.categories.length > 1 ? ` +${zone.categories.length - 1}` : ''} ·{' '}
                          {t('score')} {zone.score}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-bold text-ink">{t('Reports by category')}</h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-4 w-full animate-pulse rounded bg-ink/8" />
                ))}
              </div>
            ) : (stats?.categories ?? []).length === 0 ? (
              <p className="text-sm text-ink/60">{t('No category data yet.')}</p>
            ) : (
              <ul className="space-y-3">
                {stats.categories.map((row) => (
                  <li key={row.category}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <Link
                        href={`/reports?category=${encodeURIComponent(row.category)}`}
                        className="font-medium text-ink/75 transition-colors duration-150 hover:text-accent"
                      >
                        {categoryLabel(row.category, lang)}
                      </Link>
                      <span className="font-semibold text-ink/60">{row.count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.round((row.count / categoryMax) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
