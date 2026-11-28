'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { listEvents, eventPhase, formatEventDate, formatEventTimeRange } from '@/lib/events'
import EventTypeIcon, { eventTypeMeta } from '@/components/EventTypeIcon'
import { useLanguage } from '@/components/LanguageContext'

/**
 * The next three approved events, read through the same lib/events driver the
 * Events page uses (so it works in local and Supabase mode alike). Anything
 * short of three real events falls back to an invitation to the Events page
 * rather than an empty band.
 */
export default function LandingEvents() {
  const { t, lang, localize } = useLanguage()
  const [events, setEvents] = useState(null)

  useEffect(() => {
    let active = true
    listEvents({ when: 'upcoming' })
      .then((rows) => {
        if (!active) return
        setEvents(
          (rows ?? [])
            .filter((event) => eventPhase(event) !== 'ended')
            .slice(0, 3)
        )
      })
      .catch(() => {
        if (active) setEvents([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section id="events" data-reveal className="landing-section bg-white">
      <div className="landing-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{t('Community events')}</p>
            <h2 className="display mt-5 max-w-3xl">{t('Show up for the neighbourhood.')}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base">
              {t(
                'Blood drives, clean-ups, plantation and health camps posted by local organisers and reviewed before they go live.'
              )}
            </p>
          </div>
          <Link href="/events" className="btn btn-outline">
            {t('See all events')}
            <ArrowRight className="btn-arrow h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>

        {events === null ? (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton h-40 rounded-2xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="card mt-10 flex flex-col items-center gap-2 p-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink/60">
              <CalendarDays className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-ink">{t('No upcoming events yet.')}</p>
            <p className="max-w-sm text-sm text-ink/60">
              {t('Organisers can add one, and it appears here once it is approved.')}
            </p>
            <Link href="/events" className="btn btn-cta mt-2">
              {t('Browse events')}
            </Link>
          </div>
        ) : (
          <ul className="stagger mt-10 grid gap-5 md:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`} className="card card-hover flex h-full flex-col gap-3 p-5">
                  <span className="flex items-center gap-3">
                    <EventTypeIcon type={event.type} className="h-10 w-10 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink" title={localize(event, 'title')}>
                        {localize(event, 'title')}
                      </span>
                      <span className="block text-xs text-ink/60">{t(eventTypeMeta(event.type).label)}</span>
                    </span>
                  </span>
                  <span className="mt-auto text-xs text-ink/65">
                    {formatEventDate(event.eventDate, lang)} · {formatEventTimeRange(event)}
                  </span>
                  <span className="truncate text-xs text-ink/55">
                    {localize(event, 'address') || t('Location on the map')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
