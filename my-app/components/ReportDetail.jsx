'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  ExternalLink,
  FileQuestion,
  History,
  LoaderCircle,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  STATUS_CONFIG,
  categoryLabel,
  fetchMyVerifiedIds,
  fetchProfile,
  fetchReport,
  fetchSimilarReports,
  fetchVerifiers,
  formatDateTime,
  hasCoords,
  normalizeReport,
  normalizeStatus,
  reportErrorMessage,
  setVerification,
  shortId,
  statusLabel,
  timeAgo,
} from '@/lib/reports'
import { SeverityBadge, StatusBadge } from '@/components/Badges'
import StatusStepper from '@/components/StatusStepper'
import ReportImage from '@/components/ReportImage'
import Avatar from '@/components/Avatar'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useLanguage } from '@/components/LanguageContext'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-ink/8" />,
})

const STATUS_ICONS = {
  reported: Clock,
  under_verification: ShieldCheck,
  in_progress: LoaderCircle,
  fixed: CircleCheck,
  cannot_fix: CircleX,
}

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

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-64 animate-pulse rounded bg-ink/8" />
      <div className="card h-28 animate-pulse" />
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="card h-40 animate-pulse" />
          <div className="card h-64 animate-pulse" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <div className="card h-56 animate-pulse" />
          <div className="card h-64 animate-pulse" />
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
  const { t, lang, localize } = useLanguage()

  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [reporter, setReporter] = useState(null)
  const [verifiers, setVerifiers] = useState([])
  const [similar, setSimilar] = useState([])
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

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
      if (current) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', current.id)
          .maybeSingle()
        setIsAdmin(profileRow?.role === 'admin')
      } else {
        setIsAdmin(false)
      }

      if (!row) {
        setReport(null)
        setReporter(null)
        setVerifiers([])
        setSimilar([])
        setError('')
        return
      }

      const normalized = normalizeReport(row, verifiedIds)
      setReport(normalized)

      // Secondary context fills the shorter column so no card sits alone in space.
      const [profile, people, nearby] = await Promise.all([
        row.user_id ? fetchProfile(supabase, row.user_id).catch(() => null) : Promise.resolve(null),
        fetchVerifiers(supabase, row.id).catch(() => []),
        fetchSimilarReports(supabase, normalized, 3).catch(() => []),
      ])
      setReporter(profile)
      setVerifiers(people)
      setSimilar(nearby.map((entry) => normalizeReport(entry.row, verifiedIds)))
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
    if (report.userId && user.id === report.userId) return

    const verified = !report.verifiedByMe
    setIsVerifying(true)
    setReport((current) => ({
      ...current,
      verifiedByMe: verified,
      verifications: current.verifications + (verified ? 1 : -1),
    }))

    try {
      await setVerification(supabase, report.id, user.id, verified)
      const people = await fetchVerifiers(supabase, report.id).catch(() => verifiers)
      setVerifiers(people)
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

  const isOwner = Boolean(user && report?.userId && user.id === report.userId)
  const mapReports = useMemo(
    () => (report && hasCoords(report) ? [report] : []),
    [report]
  )

  if (isLoading) return <DetailSkeleton />

  if (error && !report) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Breadcrumbs
          items={[
            { label: t('Dashboard'), href: '/dashboard' },
            { label: t('Reports'), href: '/reports' },
            { label: t('Report') },
          ]}
        />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm font-medium text-ink">
          <span className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            {t(error)}
          </span>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-accent/10"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            {t('Try again')}
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
            { label: t('Dashboard'), href: '/dashboard' },
            { label: t('Reports'), href: '/reports' },
            { label: t('Report') },
          ]}
        />
        <EmptyState
          icon={FileQuestion}
          title={t('Report not found')}
          description={t('This report may have been removed, or the link is incorrect.')}
          action={
            <Link
              href="/reports"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
            >
              {t('Back to reports')}
            </Link>
          }
        />
      </div>
    )
  }

  const externalMapUrl = hasCoords(report)
    ? `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}`
    : null
  const reporterName = reporter?.full_name || report.reporterName
  const locationName = localize(report, 'locationName')

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t('Dashboard'), href: '/dashboard' },
          { label: t('Reports'), href: '/reports' },
          { label: report.title },
        ]}
      />

      {justCreated ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-ink/20 bg-ink/5 p-4 text-sm font-medium text-ink">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {t('Report submitted successfully. It is now visible on the map.')}
        </div>
      ) : null}

      {/* Compact header card */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/60 transition-colors duration-150 hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              {t('Back to reports')}
            </Link>
            <h1 className="mt-1.5 break-words text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl">
              {report.title}
            </h1>
            <p className="mt-1 text-xs text-ink/55">
              {t('Report ID {id} · {category} · reported {when}', {
                id: shortId(report.id),
                category: categoryLabel(report.category, lang),
                when: timeAgo(report.createdAt, lang),
              })}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <SeverityBadge severity={report.severity} />
            <StatusBadge status={report.status} />
          </div>
        </div>

        <StatusStepper
          className="mt-5 border-t border-ink/10 pt-5"
          status={report.status}
          reason={report.statusReason}
          history={history.map((entry) => ({
            id: entry.id,
            toStatus: normalizeStatus(entry.to_status ?? entry.status),
            createdAt: entry.created_at,
          }))}
        />
      </section>

      {report.officialNote ? (
        <div className="rounded-xl border border-ink/12 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/55">{t('Official note')}</p>
          <p className="mt-1 text-sm text-ink/80">{report.officialNote}</p>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm font-medium text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {t(error)}
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-8">
          <SectionCard title={t('Description')}>
            {report.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
                {report.description}
              </p>
            ) : (
              <p className="text-sm text-ink/60">{t('No description was provided.')}</p>
            )}
            {!report.imageUrl ? (
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-ink/55">
                <span className="h-1.5 w-1.5 rounded-full bg-ink/30" aria-hidden="true" />
                {t('No photo attached')}
              </p>
            ) : null}
          </SectionCard>

          {report.imageUrl ? (
            <SectionCard title={t('Photo')}>
              <ReportImage
                src={report.imageUrl}
                alt={t('Photo for: {title}', { title: report.title })}
                confidential={report.isConfidential}
              />
            </SectionCard>
          ) : null}

          <SectionCard title={t('Progress timeline')} icon={History}>
            {history.length === 0 ? (
              <p className="text-sm text-ink/60">{t('No status changes recorded yet.')}</p>
            ) : (
              <ol className="relative space-y-5 border-l border-ink/10 pl-5">
                {history.map((entry) => {
                  const key = normalizeStatus(entry.status)
                  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.reported
                  const Icon = STATUS_ICONS[key] ?? Clock
                  return (
                    <li key={entry.id} className="relative">
                      <span className={`absolute -left-[1.875rem] flex h-5 w-5 items-center justify-center rounded-full border ring-4 ring-white ${config.badge}`}>
                        <Icon className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
                      </span>
                      <p className="text-sm font-semibold text-ink">{statusLabel(key, lang)}</p>
                      {entry.note ? <p className="mt-0.5 text-sm text-ink/70">{entry.note}</p> : null}
                      <p className="mt-0.5 text-xs text-ink/50">{formatDateTime(entry.created_at, lang)}</p>
                    </li>
                  )
                })}
              </ol>
            )}
          </SectionCard>
        </div>

        {/* Side column */}
        <aside className="space-y-6 lg:col-span-4">
          <SectionCard title={t('Status & actions')}>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink/60">{t('Status')}</dt>
                <dd>
                  <StatusBadge status={report.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink/60">{t('Severity')}</dt>
                <dd>
                  <SeverityBadge severity={report.severity} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink/60">{t('Category')}</dt>
                <dd className="min-w-0 truncate text-right font-medium text-ink" title={report.category}>
                  {categoryLabel(report.category, lang)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-ink/60">{t('Reported by')}</dt>
                <dd className="flex min-w-0 items-center gap-2">
                  <Avatar src={reporter?.avatar_url} name={reporterName} size={22} />
                  <span className="min-w-0 truncate font-medium text-ink" title={reporterName}>
                    {reporterName}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink/60">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  {t('Reported')}
                </dt>
                <dd className="text-right font-medium text-ink">{formatDateTime(report.createdAt, lang)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink/60">
                  <CalendarClock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  {t('Last updated')}
                </dt>
                <dd className="text-right font-medium text-ink">{timeAgo(report.updatedAt, lang)}</dd>
              </div>
            </dl>

            {isOwner ? (
              <p className="mt-5 rounded-lg bg-surface px-3 py-2.5 text-center text-sm font-semibold text-ink">
                {t('You reported this')}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || report.verifiedByMe}
                aria-pressed={report.verifiedByMe}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${
                  report.verifiedByMe
                    ? 'bg-surface text-ink'
                    : 'bg-ink text-white hover:bg-ink/90'
                }`}
              >
                <ThumbsUp className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                {report.verifiedByMe
                  ? t('Verified · {n}', { n: report.verifications })
                  : t('Verify this report · {n}', { n: report.verifications })}
              </button>
            )}
            {!user ? (
              <p className="mt-2 text-center text-xs text-ink/60">
                <Link href="/login" className="font-semibold text-ink hover:underline">
                  {t('Sign in')}
                </Link>{' '}
                {t('to verify.')}
              </p>
            ) : null}

            <p className="mt-5 rounded-lg bg-surface px-3 py-2.5 text-center text-xs font-medium text-ink/70">
              {t('Status updates are made by the authorities.')}
            </p>

            {isAdmin ? (
              <Link
                href={`/admin/reports/${report.id}`}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface"
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                {t('Open in admin')}
              </Link>
            ) : null}
          </SectionCard>

          <SectionCard
            title={t('Location')}
            icon={MapPin}
            action={
              externalMapUrl ? (
                <a
                  href={externalMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-colors duration-150 hover:underline"
                >
                  {t('Open in map')}
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                </a>
              ) : null
            }
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="min-w-0 truncate text-sm font-medium text-ink" title={locationName || t('No address given')}>
                {locationName || t('No address given')}
              </p>
              {hasCoords(report) ? (
                <p className="text-xs tabular-nums text-ink/55">
                  {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                </p>
              ) : null}
            </div>

            {hasCoords(report) ? (
              <div className="mt-3 overflow-hidden rounded-xl">
                <ItahariMap
                  reports={mapReports}
                  zoom={15}
                  height="16rem"
                  showPopups={false}
                  showZones={false}
                  className="w-full"
                />
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-ink/20 bg-ink/5 px-3 py-3 text-center text-xs text-ink/55">
                {t('This report has no map location.')}
              </p>
            )}
          </SectionCard>

          <SectionCard title={t('Verified by')}>
            {verifiers.length === 0 ? (
              <p className="text-sm text-ink/60">
                {t('No verifications yet. Be the first to confirm this problem.')}
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {verifiers.slice(0, 6).map((person) => (
                    <Avatar
                      key={person.id}
                      src={person.avatar_url}
                      name={person.full_name}
                      size={30}
                      className="ring-2 ring-white"
                    />
                  ))}
                </div>
                <p className="text-sm text-ink/70">
                  <span className="font-semibold text-ink">{report.verifications}</span>{' '}
                  {t(
                    report.verifications === 1
                      ? 'person verified this report.'
                      : 'people verified this report.'
                  )}
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard title={t('Similar reports nearby')}>
            {similar.length === 0 ? (
              <p className="text-sm text-ink/60">
                {t('No other {category} reports within 500 m.', {
                  category: categoryLabel(report.category, lang),
                })}
              </p>
            ) : (
              <ul className="space-y-3">
                {similar.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/reports/${item.id}`}
                      className="block rounded-lg border border-ink/12 p-3 transition-colors duration-150 hover:bg-ink/5"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <SeverityBadge severity={item.severity} />
                        <StatusBadge status={item.status} />
                      </span>
                      <span className="mt-2 block truncate text-sm font-semibold text-ink" title={item.title}>
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink/60">
                        {timeAgo(item.createdAt, lang)}
                        {localize(item, 'locationName') ? ` · ${localize(item, 'locationName')}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  )
}
