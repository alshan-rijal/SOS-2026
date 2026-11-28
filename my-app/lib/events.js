// The single place the UI touches event data. It picks a driver from
// NEXT_PUBLIC_EVENTS_BACKEND ("local" by default, "supabase" once the SQL files
// in supabase/migrations have been run) and re-exports the same API either way.
//
// Local data lives only in this browser (localStorage, keys prefixed "sajha:").

import * as local from './events/local'
import * as supabase from './events/supabase'
import { logSupabaseError } from './reports.js'

export const EVENTS_BACKEND = process.env.NEXT_PUBLIC_EVENTS_BACKEND === 'supabase' ? 'supabase' : 'local'

const driver = EVENTS_BACKEND === 'supabase' ? supabase : local

export const listEvents = (...args) => driver.listEvents(...args)
export const getEvent = (...args) => driver.getEvent(...args)
export const createApplication = (...args) => driver.createApplication(...args)
export const updateApplication = (...args) => driver.updateApplication(...args)
export const withdraw = (...args) => driver.withdraw(...args)
export const cancel = (...args) => driver.cancel(...args)
export const joinEvent = (...args) => driver.joinEvent(...args)
export const leaveEvent = (...args) => driver.leaveEvent(...args)
export const listMyEvents = (...args) => driver.listMyEvents(...args)
export const listParticipants = (...args) => driver.listParticipants(...args)
export const listNotifications = (...args) => driver.listNotifications(...args)
export const markRead = (...args) => driver.markRead(...args)
export const markAllRead = (...args) => driver.markAllRead(...args)
export const reviewEvent = (...args) => driver.reviewEvent(...args)

// ---------------------------------------------------------------------------
// Dates and phase
// ---------------------------------------------------------------------------

/** Start instant of an event, from its date and start time. */
export function eventStart(event) {
  return new Date(`${event.eventDate}T${event.startTime || '00:00'}:00`)
}

/** End instant of an event, from its date and end time. */
export function eventEnd(event) {
  return new Date(`${event.eventDate}T${event.endTime || '23:59'}:00`)
}

/** "today" | "upcoming" | "ended" — "ended" is always computed, never stored. */
export function eventPhase(event, now = new Date()) {
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  if (event.eventDate === today) return 'today'
  return eventEnd(event) < now ? 'ended' : 'upcoming'
}

export function formatEventDate(value, lang = 'en') {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString(lang === 'ne' ? 'ne-NP' : undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatEventTime(value) {
  if (!value) return ''
  const [hour, minute] = value.split(':')
  const date = new Date()
  date.setHours(Number(hour), Number(minute || 0), 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatEventTimeRange(event) {
  return `${formatEventTime(event.startTime)} – ${formatEventTime(event.endTime)}`
}

// ---------------------------------------------------------------------------
// Status vocabulary — palette only (#eaf4fb, #0b4a6f, #ff6b5a, #ffffff).
// ---------------------------------------------------------------------------

export const EVENT_STATUS = {
  draft: { label: 'Draft', badge: 'bg-white text-ink border-ink/25' },
  pending_review: { label: 'Pending review', badge: 'bg-surface text-ink border-ink/20' },
  changes_requested: { label: 'Changes requested', badge: 'bg-white text-ink border-accent' },
  approved: { label: 'Approved', badge: 'bg-ink text-white border-ink' },
  rejected: { label: 'Rejected', badge: 'bg-white text-ink border-ink' },
  cancelled: { label: 'Cancelled', badge: 'bg-white text-ink border-ink' },
}

export function eventStatusMeta(status) {
  return EVENT_STATUS[status] ?? EVENT_STATUS.pending_review
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Friendly wording for a driver failure, and the not-set-up-yet case. */
export function eventsErrorMessage(error) {
  logSupabaseError('events', error)
  const code = error?.code
  if (code === '42P01' || code === 'PGRST205') {
    return 'Events are not set up yet.'
  }
  if (code === '42501' || code === 'PGRST301' || error?.status === 401 || error?.status === 403) {
    return 'You do not have permission to do that. Sign in and try again.'
  }
  // App-thrown Errors carry a user-ready message; a coded database error does
  // not, so never echo its Postgres text — the dev detail line shows it.
  if (typeof error?.message === 'string' && error.message && !error?.code) return error.message
  return 'Unable to load events. Please try again.'
}

/** True when the failure means the events tables are missing (42P01). */
export function isEventsNotSetUp(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}
