'use client'

import Link from 'next/link'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { EventPhaseBadge, SampleBadge } from '@/components/Badges'
import EventTypeIcon, { eventTypeMeta } from '@/components/EventTypeIcon'
import { eventPhase, formatEventDate, formatEventTimeRange } from '@/lib/events'
import { useLanguage } from '@/components/LanguageContext'

export function EventCardSkeleton() {
  return (
    <div className="card h-48 w-full animate-pulse" aria-hidden="true" />
  )
}

/** Public event card: icon, title, date, place and "N going". */
export default function EventCard({ event, onJoin, onLeave, joining = false }) {
  const { t, lang, localize } = useLanguage()
  const meta = eventTypeMeta(event.type)
  const phase = eventPhase(event)
  const full = Boolean(event.maxParticipants) && event.goingCount >= event.maxParticipants
  const title = localize(event, 'title')

  return (
    <article className="card flex min-w-0 flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <EventTypeIcon type={event.type} className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <EventPhaseBadge phase={phase} />
            {event.sample ? <SampleBadge /> : null}
          </div>
          <Link
            href={`/events/${event.id}`}
            className="mt-1.5 block truncate text-sm font-semibold text-ink hover:underline"
            title={title}
          >
            {title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-ink/60">{t(meta.label)}</p>
        </div>
      </div>

      <dl className="space-y-1.5 text-xs text-ink/65">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/45" strokeWidth={2.2} aria-hidden="true" />
          <span className="min-w-0">{formatEventDate(event.eventDate, lang)} · {formatEventTimeRange(event)}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/45" strokeWidth={2.2} aria-hidden="true" />
          <span className="min-w-0 truncate" title={localize(event, 'address')}>
            {localize(event, 'address') || t('Location on the map')}
            {event.ward ? ` · ${event.ward}` : ''}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/45" strokeWidth={2.2} aria-hidden="true" />
          <span className="min-w-0">
            {t('{n} going', { n: event.goingCount })}
            {event.maxParticipants ? ` · ${event.maxParticipants} max` : ''}
          </span>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <Link href={`/events/${event.id}`} className="text-xs font-semibold text-ink hover:underline">
          {t('View details')}
        </Link>

        {event.isOrganiser ? (
          <span className="text-xs font-semibold text-ink/55">{t('You are organising')}</span>
        ) : phase === 'ended' ? (
          <span className="text-xs font-semibold text-ink/55">{t('Ended')}</span>
        ) : onJoin ? (
          <button
            type="button"
            disabled={joining || (full && !event.joined)}
            onClick={() => (event.joined ? onLeave(event) : onJoin(event))}
            className={`inline-flex h-10 items-center rounded-lg px-3 text-xs font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
              event.joined ? 'bg-surface text-ink' : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {joining ? t('Saving…') : event.joined ? t('Leave') : full ? t('Event full') : t('Join')}
          </button>
        ) : null}
      </div>
    </article>
  )
}
