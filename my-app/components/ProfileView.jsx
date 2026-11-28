'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  CircleCheck,
  FileText,
  KeyRound,
  LogOut,
  Pencil,
  Plus,
  ThumbsUp,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  categoryLabel,
  fetchMyReports,
  fetchMyVerifiedIds,
  fetchProfile,
  fetchVerificationsGiven,
  formatDate,
  normalizeReport,
  reportErrorMessage,
  statusLabel,
  timeAgo,
  uploadAvatar,
  upsertProfile,
} from '@/lib/reports'
import {
  cancel,
  eventPhase,
  eventsErrorMessage,
  formatEventDate,
  formatEventTimeRange,
  listMyEvents,
  withdraw,
} from '@/lib/events'
import { SeverityBadge, StatusBadge, EventStatusBadge, EventPhaseBadge } from '@/components/Badges'
import EventTypeIcon, { eventTypeMeta } from '@/components/EventTypeIcon'
import Avatar from '@/components/Avatar'
import { Field, inputClass, inputIdle, inputInvalid } from '@/components/Field'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useLanguage } from '@/components/LanguageContext'

const STATUS_FILTERS = ['all', 'reported', 'under_verification', 'in_progress', 'fixed', 'cannot_fix']

// Tabs mirror the account menu in the header.
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'reports', label: 'My reports' },
  { key: 'events', label: 'My events' },
  { key: 'details', label: 'Edit details' },
  { key: 'security', label: 'Security' },
]

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5 text-center">
      <span className="block text-lg font-bold text-ink">{value}</span>
      <span className="mt-0.5 block text-[11px] font-medium text-ink/60">{label}</span>
    </div>
  )
}

function MyEventCard({ event, onAction, busy }) {
  const { t, lang } = useLanguage()
  const meta = eventTypeMeta(event.type)
  const phase = eventPhase(event)
  const canEdit = ['draft', 'changes_requested', 'rejected'].includes(event.status)
  const canWithdraw = event.status === 'pending_review'
  const canCancel = event.status === 'approved'

  return (
    <li className="rounded-xl border border-ink/12 p-3.5">
      <div className="flex items-start gap-3">
        <meta.Icon className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/events/${event.id}`}
            className="block truncate text-sm font-semibold text-ink hover:underline"
            title={event.title}
          >
            {event.title}
          </Link>
          <p className="mt-0.5 text-xs text-ink/60">
            {t(meta.label)} · {formatEventDate(event.eventDate, lang)} · {formatEventTimeRange(event)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <EventStatusBadge status={event.status} />
            {event.status === 'approved' ? <EventPhaseBadge phase={phase} /> : null}
          </div>

          {event.reviewNotes ? (
            <p className="mt-2 rounded-lg bg-surface px-2.5 py-1.5 text-xs text-ink/75">
              <span className="font-semibold text-ink">{t('Admin note:')} </span>
              {event.reviewNotes}
            </p>
          ) : null}
          {event.rejectionReason ? (
            <p className="mt-2 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs text-ink/75">
              <span className="font-semibold text-ink">{t('Reason:')} </span>
              {event.rejectionReason}
            </p>
          ) : null}

          {event.history?.length ? (
            <ol className="mt-2 space-y-1 border-l border-ink/10 pl-3">
              {event.history.slice(-3).map((entry) => (
                <li key={entry.id} className="text-[11px] text-ink/55">
                  <span className="font-medium text-ink/70">
                    {t(STATUS_LABELS[entry.toStatus] ?? entry.toStatus)}
                  </span>{' '}
                  · {timeAgo(entry.createdAt, lang)}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>

      {canEdit || canWithdraw || canCancel ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {canEdit ? (
            <Link
              href={`/events/new?edit=${event.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-ink/5"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {t('Edit and resubmit')}
            </Link>
          ) : null}
          {canWithdraw ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction('withdraw', event)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-ink/5 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {t('Withdraw')}
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction('cancel', event)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/40 px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-accent/10 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {t('Cancel event')}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

const STATUS_LABELS = {
  draft: 'Saved as draft',
  pending_review: 'Submitted for review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export default function ProfileView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t, lang } = useLanguage()

  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [ward, setWard] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [errors, setErrors] = useState({})
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [saveError, setSaveError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const [reports, setReports] = useState([])
  const [verificationsGiven, setVerificationsGiven] = useState(0)
  const [filter, setFilter] = useState('all')
  const [myEvents, setMyEvents] = useState([])
  const [busyEvent, setBusyEvent] = useState(null)
  const [eventError, setEventError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordState, setPasswordState] = useState('idle') // idle | saving | saved | error
  const [isSigningOut, setIsSigningOut] = useState(false)

  const paramTab = searchParams.get('tab')
  const [tab, setTab] = useState(TABS.some((entry) => entry.key === paramTab) ? paramTab : 'overview')

  const load = useCallback(async () => {
    try {
      const {
        data: { user: current },
      } = await supabase.auth.getUser()
      if (!current) {
        router.replace('/login?next=/profile')
        return
      }
      const [profileRow, myRows, verifiedIds, given, events] = await Promise.all([
        fetchProfile(supabase, current.id),
        fetchMyReports(supabase, current.id),
        fetchMyVerifiedIds(supabase),
        fetchVerificationsGiven(supabase, current.id),
        listMyEvents().catch(() => []),
      ])

      setUser(current)
      setFullName(profileRow?.full_name || current.user_metadata?.full_name || '')
      setPhone(profileRow?.phone || '')
      setWard(profileRow?.ward || '')
      setBio(profileRow?.bio || '')
      setAvatarUrl(profileRow?.avatar_url || current.user_metadata?.avatar_url || '')
      setReports(myRows.map((row) => normalizeReport(row, verifiedIds)))
      setVerificationsGiven(given)
      setMyEvents(events)
      setLoadError('')
    } catch (err) {
      setLoadError(reportErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    // Kick the fetch off the synchronous effect body; it resolves on a later tick.
    Promise.resolve().then(load)
  }, [load])

  // "History" in the account menu lands on /profile?tab=overview#activity.
  // The hash is read before first paint (above) so scrolling needs no setState.
  useEffect(() => {
    if (window.location.hash !== '#activity') return
    document.getElementById('activity')?.scrollIntoView({ block: 'start' })
  }, [])

  function selectTab(key) {
    setTab(key)
    router.replace(`/profile?tab=${key}`, { scroll: false })
  }

  function validate() {
    const nextErrors = {}
    if (!fullName.trim()) nextErrors.fullName = t('Please enter your full name.')
    if (phone.trim() && !/^[0-9+\-\s()]{6,20}$/.test(phone.trim())) {
      nextErrors.phone = t('Enter a valid phone number.')
    }
    if (bio.length > 280) nextErrors.bio = t('Keep your bio under 280 characters.')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaveError('')
    if (!validate() || !user) return

    setSaveState('saving')
    const values = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      ward: ward.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl || null,
    }

    try {
      const { error } = await supabase.auth.updateUser({ data: values })
      if (error) throw error
      await upsertProfile(supabase, user.id, values)
      setSaveState('saved')
      setUser((current) => ({ ...current, user_metadata: { ...current.user_metadata, ...values } }))
    } catch (err) {
      setSaveState('error')
      setSaveError(reportErrorMessage(err))
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file || !user) return
    setIsUploading(true)
    setSaveError('')
    try {
      const url = await uploadAvatar(supabase, file, user.id)
      setAvatarUrl(url)
      await upsertProfile(supabase, user.id, { avatar_url: url })
      await supabase.auth.updateUser({ data: { avatar_url: url } })
    } catch (err) {
      setSaveState('error')
      setSaveError(err?.message || t('Could not upload the photo.'))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault()
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError(t('Password must be at least 8 characters.'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('The two passwords do not match.'))
      return
    }

    setPasswordState('saving')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordState('error')
      setPasswordError(error.message)
      return
    }
    setPasswordState('saved')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleEventAction(action, event) {
    setEventError('')
    setBusyEvent(event.id)
    try {
      if (action === 'withdraw') await withdraw(event.id)
      else await cancel(event.id)
      const events = await listMyEvents()
      setMyEvents(events)
    } catch (err) {
      setEventError(eventsErrorMessage(err))
    } finally {
      setBusyEvent(null)
    }
  }

  const activity = useMemo(() => {
    const entries = []
    for (const report of reports) {
      entries.push({
        id: `report-${report.id}`,
        kind: 'report',
        title: report.title,
        date: report.createdAt,
        href: `/reports/${report.id}`,
      })
    }
    for (const event of myEvents) {
      for (const entry of event.history ?? []) {
        entries.push({
          id: `event-${event.id}-${entry.id}`,
          kind: 'event',
          status: STATUS_LABELS[entry.toStatus] ?? entry.toStatus,
          title: event.title,
          date: entry.createdAt,
          href: `/events/${event.id}`,
        })
      }
    }
    return entries.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 10)
  }, [reports, myEvents])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: t('Dashboard'), href: '/dashboard' }, { label: t('Profile') }]} />
        <div className="card h-48 animate-pulse p-6" />
        <div className="card h-72 animate-pulse p-6" />
      </div>
    )
  }

  if (!user) {
    return loadError ? (
      <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm font-medium text-ink">
        {loadError}
      </div>
    ) : null
  }

  const stats = {
    submitted: reports.length,
    verified: reports.filter((report) => report.verifications > 0).length,
    resolved: reports.filter((report) => report.status === 'fixed').length,
    given: verificationsGiven,
  }

  const visibleReports = filter === 'all' ? reports : reports.filter((report) => report.status === filter)
  const displayName = fullName.trim() || t('Your account')

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: t('Dashboard'), href: '/dashboard' }, { label: t('Profile') }]} />

      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t('Profile')}</h1>

      <div role="tablist" aria-label={t('Profile sections')} className="flex flex-wrap gap-1.5">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => selectTab(entry.key)}
            className={`inline-flex h-10 items-center rounded-lg px-3.5 text-sm font-semibold transition-colors duration-150 ${
              tab === entry.key ? 'bg-surface text-ink' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
            }`}
          >
            {t(entry.label)}
          </button>
        ))}
      </div>

      {/* Header card — shown on every tab so the identity is always visible. */}
      <section className="card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0 self-start">
            <Avatar src={avatarUrl} name={fullName || user.email} size={72} />
            <label
              htmlFor="avatar"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-ink/15 bg-white text-ink shadow-sm transition-colors duration-150 hover:bg-ink/5"
              title={t('Change photo')}
            >
              <Camera className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              <span className="sr-only">{t('Change profile photo')}</span>
            </label>
            <input
              ref={fileInputRef}
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="sr-only"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-ink" title={displayName}>
              {displayName}
            </h2>
            <p className="truncate text-sm text-ink/60" title={user.email}>
              {user.email}
            </p>
            <p className="mt-0.5 text-xs text-ink/50">
              {t('Member since {date}', { date: formatDate(user.created_at, lang) })}
              {ward ? ` · ${ward}` : ''}
            </p>
            {isUploading ? <p className="mt-1 text-xs font-medium text-ink/60">{t('Uploading photo…')}</p> : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t('Reports submitted')} value={stats.submitted} />
          <StatTile label={t('Verified')} value={stats.verified} />
          <StatTile label={t('Resolved')} value={stats.resolved} />
          <StatTile label={t('Verifications given')} value={stats.given} />
        </div>
      </section>

      {tab === 'overview' ? (
        <section id="activity" className="card scroll-mt-4 p-6">
          <h2 className="text-base font-bold text-ink">{t('Activity')}</h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">
              {t('Nothing here yet. Report a problem or organise an event and it will show up.')}
            </p>
          ) : (
            <ol className="mt-4 space-y-3 border-l border-ink/10 pl-4">
              {activity.map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  <Link href={entry.href} className="text-sm font-medium text-ink hover:underline">
                    {entry.kind === 'report'
                      ? t('Reported “{title}”', { title: entry.title })
                      : t('{status} — “{title}”', { status: t(entry.status), title: entry.title })}
                  </Link>
                  <p className="text-xs text-ink/50">{timeAgo(entry.date, lang)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {tab === 'reports' ? (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-ink">{t('My reports')}</h2>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="report-filter">
                {t('Filter by status')}
              </label>
              <select
                id="report-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {STATUS_FILTERS.map((key) => (
                  <option key={key} value={key}>
                    {key === 'all' ? t('All statuses') : statusLabel(key, lang)}
                  </option>
                ))}
              </select>
              <Link
                href="/reports/new"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                {t('New')}
              </Link>
            </div>
          </div>

          {visibleReports.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={FileText}
                title={reports.length === 0 ? t('You have not reported anything yet') : t('No reports with this status')}
                description={
                  reports.length === 0
                    ? t('Report a local problem and it will appear here.')
                    : t('Try a different status filter.')
                }
                action={
                  reports.length === 0 ? (
                    <Link
                      href="/reports/new"
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                      {t('Report an issue')}
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {visibleReports.map((report) => (
                <li key={report.id}>
                  <Link
                    href={`/reports/${report.id}`}
                    className="flex items-center gap-3 rounded-xl border border-ink/12 p-3 transition-colors duration-150 hover:bg-ink/5"
                  >
                    {report.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL */
                      <img
                        src={report.imageUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-ink/10"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/40">
                        <FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink" title={report.title}>
                        {report.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink/60">
                        {categoryLabel(report.category, lang)} · {formatDate(report.createdAt, lang)}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <SeverityBadge severity={report.severity} />
                        <StatusBadge status={report.status} />
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink/55">
                          <ThumbsUp className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                          {report.verifications}
                        </span>
                        <span className="text-[11px] text-ink/45">{timeAgo(report.createdAt, lang)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'events' ? (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-ink">{t('My events')}</h2>
            <Link
              href="/events/new"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
              {t('Organise an event')}
            </Link>
          </div>

          {eventError ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm font-medium text-ink">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
              {eventError}
            </p>
          ) : null}

          {myEvents.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={CalendarDays}
                title={t('No events yet')}
                description={t('Organise a clean-up, a plantation or a donation drive. Applications are reviewed before they go public.')}
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
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {myEvents.map((event) => (
                <MyEventCard
                  key={event.id}
                  event={event}
                  busy={busyEvent === event.id}
                  onAction={handleEventAction}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'details' ? (
        <section className="card p-6">
          <h2 className="text-base font-bold text-ink">{t('Edit details')}</h2>
          <p className="mt-1 text-sm text-ink/60">
            {t('Your name is shown on every report and event you submit.')}
          </p>

          {saveState === 'saved' ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm font-medium text-ink">
              <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              {t('Profile saved.')}
            </div>
          ) : null}
          {saveState === 'error' && saveError ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm font-medium text-ink">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
              {saveError}
            </div>
          ) : null}

          <form onSubmit={handleSave} noValidate className="mt-4 max-w-2xl space-y-4">
            <Field id="fullName" label={t('Full name')} required error={errors.fullName}>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value)
                  setSaveState('idle')
                  if (errors.fullName) setErrors((previous) => ({ ...previous, fullName: '' }))
                }}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                className={`${inputClass} ${errors.fullName ? inputInvalid : inputIdle}`}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label={t('Phone')} error={errors.phone}>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value)
                    setSaveState('idle')
                    if (errors.phone) setErrors((previous) => ({ ...previous, phone: '' }))
                  }}
                  placeholder={t('Optional')}
                  className={`${inputClass} ${errors.phone ? inputInvalid : inputIdle}`}
                />
              </Field>

              <Field id="ward" label={t('Ward / area')}>
                <input
                  id="ward"
                  type="text"
                  value={ward}
                  onChange={(event) => {
                    setWard(event.target.value)
                    setSaveState('idle')
                  }}
                  placeholder={t('e.g. Ward 5')}
                  className={`${inputClass} ${inputIdle}`}
                />
              </Field>
            </div>

            <Field
              id="bio"
              label={t('Short bio')}
              error={errors.bio}
              hint={t('{n}/280 characters', { n: bio.length })}
            >
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(event) => {
                  setBio(event.target.value)
                  setSaveState('idle')
                  if (errors.bio) setErrors((previous) => ({ ...previous, bio: '' }))
                }}
                placeholder={t('A line about you or your area.')}
                className={`${inputClass} ${errors.bio ? inputInvalid : inputIdle}`}
              />
            </Field>

            <button
              type="submit"
              disabled={saveState === 'saving'}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
              {saveState === 'saving' ? t('Saving…') : t('Save changes')}
            </button>
          </form>
        </section>
      ) : null}

      {tab === 'security' ? (
        <section className="card max-w-2xl p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <KeyRound className="h-4 w-4 text-ink/45" strokeWidth={2.2} aria-hidden="true" />
            {t('Security')}
          </h2>

          {passwordState === 'saved' ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm font-medium text-ink">
              <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              {t('Password updated.')}
            </div>
          ) : null}
          {passwordError ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm font-medium text-ink">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
              {passwordError}
            </div>
          ) : null}

          <form onSubmit={handlePasswordChange} noValidate className="mt-4 space-y-4">
            <Field id="newPassword" label={t('New password')} hint={t('At least 8 characters.')}>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  setPasswordError('')
                }}
                className={`${inputClass} ${inputIdle}`}
              />
            </Field>
            <Field id="confirmPassword" label={t('Confirm password')}>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setPasswordError('')
                }}
                className={`${inputClass} ${inputIdle}`}
              />
            </Field>
            <button
              type="submit"
              disabled={passwordState === 'saving'}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-ink/15 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordState === 'saving' ? t('Updating…') : t('Change password')}
            </button>
          </form>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-accent/40 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-accent/10 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            {isSigningOut ? t('Signing out…') : t('Log out')}
          </button>
        </section>
      ) : null}
    </div>
  )
}
