'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock,
  EyeOff,
  FileQuestion,
  MapPin,
  Users,
  Wrench,
} from 'lucide-react'
import {
  EVENTS_BACKEND,
  cancel,
  eventPhase,
  eventsErrorMessage,
  formatEventDate,
  formatEventTimeRange,
  getEvent,
  joinEvent,
  leaveEvent,
  listParticipants,
  reviewEvent,
} from '@/lib/events'
import { errorDetail } from '@/lib/reports'
import { EventPhaseBadge, EventStatusBadge, SampleBadge } from '@/components/Badges'
import EventTypeIcon, { eventTypeMeta } from '@/components/EventTypeIcon'
import { useLanguage } from '@/components/LanguageContext'
import Avatar from '@/components/Avatar'
import { Field, inputClass, inputIdle } from '@/components/Field'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import ErrorCard from '@/components/admin/ErrorCard'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-ink/8" />,
})

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          {Icon ? <Icon className="h-4 w-4 text-ink/45" strokeWidth={2} aria-hidden="true" /> : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// Dev-only review control. Delete this component when the real admin panel
// exists — in Supabase mode reviews are done with supabase/admin/manual_review.sql.
function DevReviewPanel({ event, onReviewed }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  if (process.env.NODE_ENV === 'production') return null
  if (EVENTS_BACKEND !== 'local') return null
  if (!event.isOrganiser) return null

  async function act(decision) {
    if (decision === 'approve' ? false : !note.trim()) {
      setError(
        decision === 'changes'
          ? 'Add a note explaining what needs changing.'
          : 'Add a reason for the rejection.'
      )
      return
    }
    setError('')
    setBusy(decision)
    try {
      await reviewEvent(event.id, decision, note.trim())
      setNote('')
      await onReviewed()
    } catch (err) {
      setError(eventsErrorMessage(err))
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="rounded-2xl border border-dashed border-ink/25 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <Wrench className="h-4 w-4 text-ink/45" strokeWidth={2.2} aria-hidden="true" />
        Dev: simulate admin review
      </h2>
      <p className="mt-1 text-xs text-ink/55">
        Visible only in development with the local backend. The real admin panel replaces this.
      </p>

      {error ? (
        <p className="mt-3 flex items-start gap-2 text-xs font-medium text-ink">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <div className="mt-3">
        <Field id="review-note" label="Note or reason" optional>
          <textarea
            id="review-note"
            rows={2}
            value={note}
            onChange={(event2) => setNote(event2.target.value)}
            className={`${inputClass} ${inputIdle}`}
            placeholder="Shown to the organiser."
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== ''}
          onClick={() => act('approve')}
          className="btn btn-primary h-9 px-3 text-xs"
        >
          {busy === 'approve' ? 'Saving…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={busy !== ''}
          onClick={() => act('changes')}
          className="inline-flex h-9 items-center rounded-lg border border-accent/50 px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-accent/10 disabled:opacity-50"
        >
          {busy === 'changes' ? 'Saving…' : 'Request changes'}
        </button>
        <button
          type="button"
          disabled={busy !== ''}
          onClick={() => act('reject')}
          className="btn btn-outline h-9 px-3 text-xs"
        >
          {busy === 'reject' ? 'Saving…' : 'Reject'}
        </button>
      </div>
    </section>
  )
}

// Development only: one line per load naming the backend, the ids, the status
// and the visibility decision. Nothing is logged in production.
function devDecision(payload) {
  if (process.env.NODE_ENV === 'production') return
  console.info('[events] detail', { backend: EVENTS_BACKEND, ...payload })
}

export default function EventDetail() {
  const { id } = useParams()
  const { t, lang, localize } = useLanguage()

  const [event, setEvent] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [viewerId, setViewerId] = useState(null)
  const [participants, setParticipants] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { event: row, error: err, notFound: missing, viewerId: viewer } = await getEvent(id)
      setViewerId(viewer ?? null)
      if (err) {
        setEvent(null)
        setNotFound(false)
        setError({ message: eventsErrorMessage(err), detail: errorDetail(err) })
        devDecision({ id, decision: 'error', viewer, code: err?.code })
        return
      }
      if (missing || !row) {
        setEvent(null)
        setNotFound(true)
        devDecision({ id, decision: 'not-found', viewer })
        return
      }
      setNotFound(false)
      setEvent(row)
      devDecision({
        id,
        decision: row.status !== 'approved' ? 'show-with-banner' : 'show',
        viewer,
        organizerId: row.organizerId,
        status: row.status,
        isAdmin: row.isAdmin,
      })
      setParticipants(await listParticipants(id).catch(() => []))
    } catch (err) {
      setEvent(null)
      setNotFound(false)
      setError({ message: eventsErrorMessage(err), detail: errorDetail(err) })
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    Promise.resolve().then(load)
  }, [load])

  async function reload() {
    await load()
  }

  // Refresh in place after a write, without flashing the skeleton over the page.
  async function refresh() {
    const { event: row } = await getEvent(id)
    if (row) {
      setEvent(row)
      setParticipants(await listParticipants(id).catch(() => []))
    }
  }

  async function runWrite(action) {
    if (!event || busy) return
    setBusy(true)
    setError(null)
    try {
      await action(event.id)
      await refresh()
    } catch (err) {
      setError({ message: eventsErrorMessage(err), detail: errorDetail(err) })
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = () => runWrite(joinEvent)
  const handleLeave = () => runWrite(leaveEvent)
  const handleCancel = () => runWrite(cancel)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-64 animate-pulse rounded bg-ink/10" />
        <div className="card h-28 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="card h-40 animate-pulse" />
            <div className="card h-64 animate-pulse" />
          </div>
          <div className="space-y-6 lg:col-span-4">
            <div className="card h-56 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const crumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Events', href: '/events' },
    { label: event ? localize(event, 'title') : 'Event' },
  ]

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Breadcrumbs items={crumbs} />
        <ErrorCard message={error.message} detail={error.detail} onRetry={reload} />
      </div>
    )
  }

  // getEvent already hides anything this viewer may not see, so a miss here is a
  // genuine not-found. The organiser and admins always get the row back.
  if (notFound || !event) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Breadcrumbs items={crumbs} />
        <EmptyState
          icon={FileQuestion}
          title="We couldn't find this event"
          description="It may have been removed, or it isn't public yet."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href="/events" className="btn btn-cta px-4">
                {t('Back to events')}
              </Link>
              {viewerId ? (
                <Link href="/profile" className="btn btn-outline px-4">
                  {t('My events')}
                </Link>
              ) : null}
            </div>
          }
        />
      </div>
    )
  }

  const isPrivate = event.status !== 'approved'

  const meta = eventTypeMeta(event.type)
  const phase = eventPhase(event)
  const ended = phase === 'ended'
  const full = Boolean(event.maxParticipants) && event.goingCount >= event.maxParticipants
  const hasLocation = Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
  const title = localize(event, 'title')
  const description = localize(event, 'description')
  const address = localize(event, 'address')

  return (
    <div className="space-y-6">
      <Breadcrumbs items={crumbs} />

      {isPrivate ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-ink/20 bg-ink/5 p-4 text-sm font-medium text-ink">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" strokeWidth={2.2} aria-hidden="true" />
          {event.isAdmin
            ? 'Not public yet — you are viewing this as an admin.'
            : 'Not public yet — only you can see this. It appears on Events once an admin approves it.'}
        </div>
      ) : null}

      {event.status === 'changes_requested' || event.status === 'rejected' ? (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-ink">
          <p className="font-semibold">
            {event.status === 'rejected' ? t('Rejected') : t('Changes requested')}
          </p>
          <p className="mt-1 text-ink/80">
            {event.reviewNotes || event.rejectionReason || t('No note was left.')}
          </p>
        </div>
      ) : null}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <EventTypeIcon type={event.type} className="h-14 w-14 shrink-0" />
            <div className="min-w-0">
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/60 transition-colors duration-150 hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                {t('Back to events')}
              </Link>
              <h1 className="mt-1.5 break-words text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 text-xs text-ink/55">{t(meta.label)}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <EventPhaseBadge phase={phase} />
            {isPrivate ? <EventStatusBadge status={event.status} /> : null}
            {event.sample ? <SampleBadge /> : null}
          </div>
        </div>
      </section>

      {error ? <ErrorCard message={error.message} detail={error.detail} /> : null}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <SectionCard title={t('About this event')}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">{description}</p>
            {event.whatToBring ? (
              <div className="mt-4 rounded-xl bg-surface p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink/60">{t('What to bring')}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{event.whatToBring}</p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title={t('Where and when')} icon={MapPin}>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-ink/50">
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                  {t('Date')}
                </dt>
                <dd className="font-medium text-ink">{formatEventDate(event.eventDate, lang)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-ink/50">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                  {t('Time')}
                </dt>
                <dd className="font-medium text-ink">{formatEventTimeRange(event)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="flex items-center gap-1.5 text-xs text-ink/50">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                  {t('Place')}
                </dt>
                <dd className="font-medium text-ink">
                  {address || t('Location on the map')}
                  {event.ward ? ` · ${event.ward}` : ''}
                </dd>
              </div>
            </dl>

            {hasLocation ? (
              <div className="mt-3 h-64 overflow-hidden rounded-xl">
                <ItahariMap
                  reports={[]}
                  zones={[]}
                  events={[event]}
                  zoom={15}
                  height="100%"
                  showPopups={false}
                  showLegend={false}
                  className="h-full"
                />
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-ink/20 bg-ink/5 px-3 py-3 text-center text-xs text-ink/55">
                This event has no map location.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Organiser">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                <Users className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {event.organizationName || 'Individual organiser'}
                </p>
                {event.contactName ? (
                  <p className="truncate text-xs text-ink/60">
                    Contact: {event.contactName}
                    {event.contactPhone ? ` · ${event.contactPhone}` : ''}
                  </p>
                ) : null}
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <SectionCard title="Joining">
            {event.isAdmin ? (
              <p className="rounded-lg bg-ink/5 px-3 py-2.5 text-center text-sm font-semibold text-ink/70">
                {t('Review only — admins cannot join or apply.')}
              </p>
            ) : event.isOrganiser ? (
              <div className="space-y-4">
                <p className="rounded-lg bg-surface px-3 py-2.5 text-center text-sm font-semibold text-ink">
                  You are organising
                </p>
                {event.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={busy}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-accent/40 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-accent/10 disabled:opacity-60"
                  >
                    {busy ? 'Working…' : 'Cancel this event'}
                  </button>
                ) : null}
              </div>
            ) : ended ? (
              <p className="rounded-lg bg-ink/5 px-3 py-2.5 text-center text-sm font-semibold text-ink/60">
                This event has ended
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={event.joined ? handleLeave : handleJoin}
                  disabled={busy || (full && !event.joined)}
                  className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                    event.joined ? 'bg-surface text-ink' : 'bg-accent text-white hover:bg-accent/90'
                  }`}
                >
                  {busy ? 'Saving…' : event.joined ? 'Leave event' : full ? 'Event full' : 'Join event'}
                </button>
                {full && !event.joined ? (
                  <p className="mt-2 text-center text-xs text-ink/55">
                    This event has reached its participant limit.
                  </p>
                ) : null}
              </>
            )}

            <div className="mt-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/60">
                <Users className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                {event.goingCount} going
                {event.maxParticipants ? ` · ${event.maxParticipants} max` : ''}
              </p>
              {participants.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex -space-x-2">
                    {participants.slice(0, 8).map((person) => (
                      <Avatar
                        key={person.userId}
                        src={person.avatarUrl}
                        name={person.name}
                        size={30}
                        className="ring-2 ring-white"
                      />
                    ))}
                  </div>
                  {participants.length > 8 ? (
                    <span className="text-xs text-ink/55">+{participants.length - 8} more</span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-ink/55">No one has joined yet. Be the first.</p>
              )}
            </div>
          </SectionCard>

          <DevReviewPanel event={event} onReviewed={reload} />
        </aside>
      </div>
    </div>
  )
}
