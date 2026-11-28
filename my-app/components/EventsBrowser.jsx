'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CalendarDays, List, Map as MapIcon, Plus, RefreshCw, Search } from 'lucide-react'
import { EVENT_TYPES } from '@/components/EventTypeIcon'
import {
  eventsErrorMessage,
  joinEvent,
  leaveEvent,
  listEvents,
} from '@/lib/events'
import { createClient } from '@/lib/supabase/client'
import EventCard, { EventCardSkeleton } from '@/components/EventCard'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useLanguage } from '@/components/LanguageContext'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-ink/8" />,
})

const WHEN_OPTIONS = [
  { key: 'all', label: 'All dates' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'past', label: 'Past' },
]

export default function EventsBrowser() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t } = useLanguage()

  const [events, setEvents] = useState([])
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [joiningId, setJoiningId] = useState(null)

  const [type, setType] = useState(() => searchParams.get('type') || '')
  const [when, setWhen] = useState(() => searchParams.get('when') || 'upcoming')
  const [search, setSearch] = useState('')
  const [layout, setLayout] = useState(() => (searchParams.get('layout') === 'map' ? 'map' : 'list'))

  const load = useCallback(
    async (signal) => {
      try {
        const rows = await listEvents({ type: type || undefined, when, search })
        if (signal?.aborted) return
        setEvents(rows)
        setError('')
      } catch (err) {
        if (signal?.aborted) return
        setError(eventsErrorMessage(err))
      } finally {
        if (!signal?.aborted) setIsLoading(false)
      }
    },
    [type, when, search]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setIsLoading(true)
      Promise.resolve().then(() => load(controller.signal))
    }, search ? 250 : 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [load, search])

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data?.user?.id ?? null))
      .catch(() => {})
  }, [supabase])

  // Keep the filters in the URL: chips, dates, search-less layout and type all
  // survive a reload and can be shared.
  useEffect(() => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (when !== 'upcoming') params.set('when', when)
    if (layout === 'map') params.set('layout', 'map')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [type, when, layout, pathname, router])

  async function handleJoin(event) {
    if (!userId) {
      router.push('/login')
      return
    }
    setJoiningId(event.id)
    try {
      await joinEvent(event.id)
      setEvents(await listEvents({ type: type || undefined, when, search }))
    } catch (err) {
      setError(eventsErrorMessage(err))
    } finally {
      setJoiningId(null)
    }
  }

  async function handleLeave(event) {
    if (!userId) return
    setJoiningId(event.id)
    try {
      await leaveEvent(event.id)
      setEvents(await listEvents({ type: type || undefined, when, search }))
    } catch (err) {
      setError(eventsErrorMessage(err))
    } finally {
      setJoiningId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: t('Dashboard'), href: '/dashboard' }, { label: t('Events') }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t('Events')}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {t('Community drives happening nearby: donations, clean-ups, plantation and more.')}
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          {t('Organise an event')}
        </Link>
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={!type}
          onClick={() => setType('')}
          className={`inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors duration-150 ${
            !type ? 'border-ink bg-surface text-ink' : 'border-ink/15 bg-white text-ink/65 hover:bg-ink/5'
          }`}
        >
          {t('All types')}
        </button>
        {EVENT_TYPES.map(({ key, label, Icon }) => {
          const active = type === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setType(active ? '' : key)}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-150 ${
                active ? 'border-accent bg-surface text-ink' : 'border-ink/15 bg-white text-ink/65 hover:bg-ink/5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(label)}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-ink/10">
            {WHEN_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={when === option.key}
                onClick={() => setWhen(option.key)}
                className={`h-9 rounded-md px-3 text-xs font-semibold transition-colors duration-150 ${
                  when === option.key ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/5'
                }`}
              >
                {t(option.label)}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('Search events')}
              aria-label={t('Search events')}
              className="h-10 w-full rounded-lg border border-ink/15 bg-white pl-9 pr-3 text-base text-ink transition-colors placeholder:text-ink/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 sm:w-56"
            />
          </div>
        </div>

        <div className="inline-flex shrink-0 rounded-lg bg-white p-0.5 ring-1 ring-ink/10" role="group" aria-label={t('Layout')}>
          <button
            type="button"
            aria-pressed={layout === 'list'}
            onClick={() => setLayout('list')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-150 ${
              layout === 'list' ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/5'
            }`}
          >
            <List className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            {t('List')}
          </button>
          <button
            type="button"
            aria-pressed={layout === 'map'}
            onClick={() => setLayout('map')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-150 ${
              layout === 'map' ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/5'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            {t('Map')}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm font-medium text-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true)
              load()
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-accent/10"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            {t('Try again')}
          </button>
        </div>
      ) : null}

      {layout === 'map' ? (
        <div className="h-[60vh] min-h-[400px]">
          <ItahariMap
            reports={[]}
            zones={[]}
            events={events}
            onJoinEvent={handleJoin}
            onLeaveEvent={handleLeave}
            joiningEventId={joiningId}
            currentUserId={userId}
            className="h-full"
            zoom={12}
          />
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <EventCardSkeleton key={index} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t('No events match these filters')}
          description={t('Try another type or date, or organise the first event in your ward.')}
          action={
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
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
    </div>
  )
}
