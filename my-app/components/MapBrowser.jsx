'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CalendarDays, MapPin, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ITAHARI_CENTER,
  ZONE_MIN_REPORTS,
  ZONE_RADIUS_M,
  ZONE_RADIUS_OPTIONS,
  fetchMapReports,
  fetchMyVerifiedIds,
  findProblemZones,
  formatZoneRadius,
  hasCoords,
  normalizeReport,
  reportErrorMessage,
  setVerification,
} from '@/lib/reports'
import {
  eventsErrorMessage,
  joinEvent,
  leaveEvent,
  listEvents,
} from '@/lib/events'
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

// Where the map sits when nothing is picked, and how close it goes to one event.
const OVERVIEW_ZOOM = 13
const EVENT_FOCUS_ZOOM = 16

export default function MapBrowser() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t, lang } = useLanguage()

  const [reports, setReports] = useState([])
  const [events, setEvents] = useState([])
  const [userId, setUserId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [error, setError] = useState('')
  const [eventError, setEventError] = useState('')
  const [verifyingId, setVerifyingId] = useState(null)
  const [joiningId, setJoiningId] = useState(null)
  const [autoOpenEventId, setAutoOpenEventId] = useState(null)
  // The type that has already flown the map, so joining an event (which reloads
  // the list) never yanks the view back to the first pin.
  const focusedTypeRef = useRef(null)

  const [view, setView] = useState(() => normalizeMapView(searchParams.get('view')))
  const [eventType, setEventType] = useState(() => searchParams.get('etype') || '')
  const [zoneRadius, setZoneRadius] = useState(() => {
    const fromUrl = Number(searchParams.get('zone'))
    return ZONE_RADIUS_OPTIONS.includes(fromUrl) ? fromUrl : ZONE_RADIUS_M
  })
  const [zoneFilter, setZoneFilter] = useState(null)

  const load = useCallback(
    async (signal) => {
      try {
        const [rows, verifiedIds, auth] = await Promise.all([
          fetchMapReports(supabase),
          fetchMyVerifiedIds(supabase),
          supabase.auth.getUser(),
        ])
        if (signal?.aborted) return
        setReports(rows.map((row) => normalizeReport(row, verifiedIds)))
        setUserId(auth.data.user?.id ?? null)
        setError('')
      } catch (err) {
        if (signal?.aborted) return
        setError(reportErrorMessage(err, 'map'))
      } finally {
        if (!signal?.aborted) setIsLoading(false)
      }
    },
    [supabase]
  )

  const loadEvents = useCallback(
    async (signal, type) => {
      try {
        const rows = await listEvents({ type: type || undefined })
        if (signal?.aborted) return
        setEvents(rows)
        setEventError('')
        // Picking a category flies to its first matching pin and opens the popup,
        // once per category. Done here (after the await) rather than in an effect.
        if (type && focusedTypeRef.current !== type) {
          const first = rows.find((event) => event.type === type && hasCoords(event))
          if (first) {
            focusedTypeRef.current = type
            setView((current) => (current === 'problems' ? 'events' : current))
            setAutoOpenEventId(first.id)
            setFocus({ lat: first.latitude, lng: first.longitude, zoom: EVENT_FOCUS_ZOOM })
          }
        }
      } catch (err) {
        if (signal?.aborted) return
        setEventError(eventsErrorMessage(err))
      } finally {
        if (!signal?.aborted) setIsLoadingEvents(false)
      }
    },
    []
  )

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

  // View, event type and zone radius all live in the URL so the choice survives
  // reloads and shares.
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('view', view)
    params.set('zone', String(zoneRadius))
    if (eventType) params.set('etype', eventType)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [view, eventType, zoneRadius, pathname, router])

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
      setError(reportErrorMessage(err, 'map'))
    } finally {
      setVerifyingId(null)
    }
  }

  async function handleJoin(event) {
    if (!userId) {
      router.push('/login')
      return
    }
    setJoiningId(event.id)
    setEventError('')
    try {
      await joinEvent(event.id)
      setEvents(await listEvents({ type: eventType || undefined }))
    } catch (err) {
      setEventError(eventsErrorMessage(err))
    } finally {
      setJoiningId(null)
    }
  }

  async function handleLeave(event) {
    if (!userId) return
    setJoiningId(event.id)
    setEventError('')
    try {
      await leaveEvent(event.id)
      setEvents(await listEvents({ type: eventType || undefined }))
    } catch (err) {
      setEventError(eventsErrorMessage(err))
    } finally {
      setJoiningId(null)
    }
  }

  function focusReport(report) {
    setSelectedId(report.id)
    setFocus({ lat: report.latitude, lng: report.longitude, zoom: 16 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // "All types": drop the open popup and come back to the overview.
  function selectEventType(next) {
    setEventType(next)
    if (next) return
    focusedTypeRef.current = null
    setAutoOpenEventId(null)
    setFocus({ lat: ITAHARI_CENTER.lat, lng: ITAHARI_CENTER.lng, zoom: OVERVIEW_ZOOM })
  }

  function viewZone(zone) {
    setZoneFilter(zone)
    document.getElementById('located-reports')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const located = reports.filter(hasCoords)
  // Recompute instantly from the reports already fetched — no refetch.
  const zones = useMemo(
    () => findProblemZones(reports, zoneRadius, ZONE_MIN_REPORTS, lang),
    [reports, zoneRadius, lang]
  )
  const listed = zoneFilter
    ? located.filter((report) => zoneFilter.memberIds.includes(report.id))
    : located

  const showProblems = view !== 'events'
  const showEvents = view !== 'problems'

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: t('Dashboard'), href: '/dashboard' }, { label: t('Map') }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t('Map')}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {t('Reported problems and community events on one map. Select a pin for details.')}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink/70 ring-1 ring-ink/10">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          {showEvents && !showProblems
            ? isLoadingEvents
              ? '…'
              : t('{n} events', { n: events.length })
            : showProblems && !showEvents
              ? isLoading
                ? '…'
                : t('{n} located', { n: located.length })
              : isLoading || isLoadingEvents
                ? '…'
                : t('{n} located · {m} events', { n: located.length, m: events.length })}
        </span>
      </div>

      {error || eventError ? (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm font-medium text-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            {error || eventError}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-accent/40 px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-accent/10"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            {t('Try again')}
          </button>
        </div>
      ) : null}

      <MapViewToggle
        view={view}
        onView={setView}
        type={eventType}
        onType={selectEventType}
      />

      {showProblems && !isLoading ? (
        <SignalAlert zones={zones} zoneRadius={zoneRadius} onFocus={setFocus} />
      ) : null}

      {showProblems ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink/60">{t('Zone radius')}</span>
            <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-ink/10">
              {ZONE_RADIUS_OPTIONS.map((radius) => (
                <button
                  key={radius}
                  type="button"
                  aria-pressed={zoneRadius === radius}
                  onClick={() => {
                    setZoneRadius(radius)
                    setZoneFilter(null)
                  }}
                  className={`rounded-md h-10 px-3 text-xs font-semibold transition-colors duration-150 ${
                    zoneRadius === radius ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/5'
                  }`}
                >
                  {formatZoneRadius(radius)}
                </button>
              ))}
            </div>
          </div>
          {!isLoading && zones.length > 0 ? (
            <p className="text-xs font-medium text-ink/60">
              {t('{n} problem-prone zones', { n: zones.length })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="map-frame">
        <ItahariMap
          reports={showProblems ? reports : []}
          zones={showProblems ? zones : []}
          events={showEvents ? events : []}
          selectedId={selectedId}
          selectedZoneId={zoneFilter?.id ?? null}
          onSelect={setSelectedId}
          onViewReports={viewZone}
          onJoinEvent={handleJoin}
          onLeaveEvent={handleLeave}
          joiningEventId={joiningId}
          autoOpenEventId={autoOpenEventId}
          focus={focus}
          onVerify={handleVerify}
          verifyingId={verifyingId}
          currentUserId={userId}
          showLegend
          zoneRadius={zoneRadius}
          className="h-full"
          zoom={OVERVIEW_ZOOM}
        />
      </div>

      {showEvents ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink/60">
              {t('Upcoming events')}
            </h2>
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-colors duration-150 hover:underline"
            >
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {t('All events')}
            </Link>
          </div>
          {isLoadingEvents ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <EventCardSkeleton key={index} />
              ))}
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={t('No upcoming events')}
              description={
                eventError ? t('Events are not set up yet.') : t('No approved events match this filter yet.')
              }
              action={
                <Link
                  href="/events/new"
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
                >
                  {t('Organise an event')}
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  joining={joiningId === event.id}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {showProblems ? (
        <section id="located-reports" className="scroll-mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink/60">
              {zoneFilter ? `${t('Zone')} · ${zoneFilter.label}` : t('Located reports')}
            </h2>
            {zoneFilter ? (
              <button
                type="button"
                onClick={() => setZoneFilter(null)}
                className="btn btn-outline h-10 gap-1.5 px-2.5 text-xs"
              >
                {t('Clear zone filter')}
              </button>
            ) : null}
          </div>
          {zoneFilter ? (
            <p className="mb-3 text-xs text-ink/60">
              {t('{n} reports in this zone', { n: listed.length })}
            </p>
          ) : null}

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <ReportCardSkeleton key={index} />
              ))}
            </div>
          ) : listed.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title={t('No located reports yet')}
              description={t('Reports appear here once they have a map pin.')}
              action={
                <Link
                  href="/reports/new"
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
                >
                  {t('Report an issue')}
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listed.map((report) => (
                <div key={report.id} className="flex min-w-0 flex-col gap-2">
                  <ReportCard
                    report={report}
                    onVerify={handleVerify}
                    isVerifying={verifyingId === report.id}
                  />
                  <button
                    type="button"
                    onClick={() => focusReport(report)}
                    className="btn btn-outline px-3 text-xs"
                  >
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                    {t('Show on map')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
