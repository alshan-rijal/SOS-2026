'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  Clock,
  ExternalLink,
  FileQuestion,
  History,
  ImageOff,
  LoaderCircle,
  MapPin,
  Pencil,
  RefreshCw,
  ThumbsUp,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  fetchMyVerifiedIds,
  fetchReport,
  formatDateTime,
  hasCoords,
  normalizeReport,
  reportErrorMessage,
  setVerification,
  shortId,
  timeAgo,
  updateReportStatus,
} from '@/lib/reports'
import { SeverityBadge, StatusBadge } from '@/components/Badges'
import ReportImage from '@/components/ReportImage'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-ink/5" />,
})

const STATUS_ICONS = {
  pending: Clock,
  in_progress: LoaderCircle,
  resolved: CircleCheck,
}

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-ink/10 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          {Icon ? <Icon className="h-4 w-4 text-ink/40" strokeWidth={2} aria-hidden="true" /> : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-64 animate-pulse rounded bg-ink/10" />
      <div className="h-9 w-2/3 animate-pulse rounded bg-ink/10" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-72 animate-pulse rounded-2xl bg-ink/5 lg:col-span-4" />
        <div className="space-y-6 lg:col-span-8">
          <div className="h-40 animate-pulse rounded-2xl bg-ink/5" />
          <div className="h-64 animate-pulse rounded-2xl bg-ink/5" />
        </div>
      </div>
    </div>
  )
}

export default function ReportDetail() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const justCreated = searchParams.get('created') === '1'
  const supabase = createClient()

  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [nextStatus, setNextStatus] = useState('pending')
  const [statusNote, setStatusNote] = useState('')

  const load = useCallback(async () => {
    try {
      const [{ row, history: entries }, verifiedIds] = await Promise.all([
        fetchReport(supabase, id),
        fetchMyVerifiedIds(supabase),
      ])
      const {
        data: { user: current },
      } = await supabase.auth.getUser()

      setUser(current ?? null)
      setHistory(entries)
      setReport(row ? normalizeReport(row, verifiedIds) : null)
      if (row) setNextStatus(row.status)
      setError('')
    } catch (err) {
      setError(reportErrorMessage(err))
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, id])

  function retry() {
    setIsLoading(true)
    load()
  }

  useEffect(() => {
    // Kick the fetch off the synchronous effect body; it resolves on a later tick.
    Promise.resolve().then(load)
  }, [load])

  async function handleVerify() {
    if (!report) return
    if (!user) {
      setError('Sign in to verify a report.')
      return
    }

    const verified = !report.verifiedByMe
    setIsVerifying(true)
    setReport((current) => ({
      ...current,
      verifiedByMe: verified,
      verifications: current.verifications + (verified ? 1 : -1),
    }))

    try {
      await setVerification(supabase, report.id, user.id, verified)
    } catch (err) {
      setReport((current) => ({
        ...current,
        verifiedByMe: !verified,
        verifications: current.verifications + (verified ? -1 : 1),
      }))
      setError(reportErrorMessage(err))
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleStatusUpdate(event) {
    event.preventDefault()
    if (!report || nextStatus === report.status) return

    setIsUpdatingStatus(true)
    try {
      await updateReportStatus(supabase, report.id, nextStatus, statusNote.trim())
      setStatusNote('')
      await load()
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) return <DetailSkeleton />

  if (error && !report) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Reports', href: '/reports' },
            { label: 'Report' },
          ]}
        />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            {error}
          </span>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Reports', href: '/reports' },
            { label: 'Report' },
          ]}
        />
        <EmptyState
          icon={FileQuestion}
          title="Report not found"
          description="This report may have been removed, or the link is incorrect."
          action={
            <Link
              href="/reports"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              Back to reports
            </Link>
          }
        />
      </div>
    )
  }

  const isOwner = Boolean(user && report.userId && user.id === report.userId)
  const mapReports = hasCoords(report) ? [report] : []
  const externalMapUrl = hasCoords(report)
    ? `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}`
    : null

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: report.title },
        ]}
      />

      {justCreated ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          Report submitted successfully. It is now visible on the map.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/reports"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Back to reports
          </Link>
          <h1 className="text-2xl font-bold leading-snug tracking-tight text-ink">
            {report.title}
          </h1>
          <p className="mt-1.5 text-xs text-ink/50">
            Report ID {shortId(report.id)} · {report.category}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SeverityBadge severity={report.severity} />
          <StatusBadge status={report.status} />
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Side panel — first on mobile, right column on desktop. */}
        <aside className="space-y-6 lg:order-2 lg:col-span-4">
          <SectionCard title="Status & actions">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink/55">Status</dt>
                <dd>
                  <StatusBadge status={report.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink/55">Severity</dt>
                <dd>
                  <SeverityBadge severity={report.severity} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink/55">Category</dt>
                <dd className="text-right font-medium text-ink">{report.category}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink/55">
                  <User className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Reported by
                </dt>
                <dd className="truncate font-medium text-ink">{report.reporterName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink/55">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Reported
                </dt>
                <dd className="text-right font-medium text-ink">{formatDateTime(report.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink/55">
                  <CalendarClock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Last updated
                </dt>
                <dd className="text-right font-medium text-ink">{timeAgo(report.updatedAt)}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              aria-pressed={report.verifiedByMe}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                report.verifiedByMe
                  ? 'bg-ink text-white hover:bg-ink/90'
                  : 'border border-ink/15 text-ink hover:bg-ink/5'
              }`}
            >
              <ThumbsUp className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              {report.verifiedByMe
                ? `Verified by you · ${report.verifications}`
                : `Verify this report · ${report.verifications}`}
            </button>
            {!user ? (
              <p className="mt-2 text-center text-xs text-ink/50">
                <Link href="/login" className="font-semibold text-accent-strong hover:underline">
                  Sign in
                </Link>{' '}
                to verify.
              </p>
            ) : null}

            {isOwner ? (
              <form onSubmit={handleStatusUpdate} className="mt-5 border-t border-ink/10 pt-5">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink/50">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                  Update status
                </h3>
                <div className="mt-3 space-y-2.5">
                  <label className="sr-only" htmlFor="next-status">
                    New status
                  </label>
                  <select
                    id="next-status"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {STATUS_ORDER.map((key) => (
                      <option key={key} value={key}>
                        {STATUS_CONFIG[key].label}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="status-note">
                    Note
                  </label>
                  <input
                    id="status-note"
                    type="text"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    placeholder="Add a note (optional)"
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingStatus || nextStatus === report.status}
                    className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingStatus ? 'Updating…' : 'Save status'}
                  </button>
                </div>
              </form>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Location"
            icon={MapPin}
            action={
              externalMapUrl ? (
                <a
                  href={externalMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong transition-colors hover:underline"
                >
                  Open in map
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                </a>
              ) : null
            }
          >
            <p className="text-sm font-medium text-ink">
              {report.locationName || 'No address given'}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {hasCoords(report)
                ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
                : 'No coordinates recorded'}
            </p>

            {hasCoords(report) ? (
              <div className="mt-3 h-52">
                <ItahariMap reports={mapReports} zoom={15} showPopups={false} />
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-ink/20 bg-ink/2 px-3 py-4 text-center text-xs text-ink/50">
                This report has no map location.
              </p>
            )}
          </SectionCard>
        </aside>

        {/* Main column. */}
        <div className="space-y-6 lg:order-1 lg:col-span-8">
          <SectionCard title="Description">
            {report.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/75">
                {report.description}
              </p>
            ) : (
              <p className="text-sm text-ink/50">No description was provided.</p>
            )}
          </SectionCard>

          <SectionCard title="Photo">
            {report.imageUrl ? (
              <ReportImage src={report.imageUrl} alt={`Photo for: ${report.title}`} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 py-10 text-center">
                <ImageOff className="h-6 w-6 text-ink/35" strokeWidth={1.8} aria-hidden="true" />
                <p className="text-sm text-ink/55">No photo was attached to this report.</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Progress timeline" icon={History}>
            {history.length === 0 ? (
              <p className="text-sm text-ink/55">No status changes recorded yet.</p>
            ) : (
              <ol className="relative space-y-5 border-l border-ink/10 pl-5">
                {history.map((entry) => {
                  const config = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending
                  const Icon = STATUS_ICONS[entry.status] ?? Clock
                  return (
                    <li key={entry.id} className="relative">
                      <span className={`absolute -left-[1.875rem] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${config.badge}`}>
                        <Icon className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
                      </span>
                      <p className="text-sm font-semibold text-ink">{config.label}</p>
                      {entry.note ? (
                        <p className="mt-0.5 text-sm text-ink/65">{entry.note}</p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-ink/45">{formatDateTime(entry.created_at)}</p>
                    </li>
                  )
                })}
              </ol>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
