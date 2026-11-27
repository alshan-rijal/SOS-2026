'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CircleCheck,
  Clock,
  FileText,
  LoaderCircle,
  Map,
  Plus,
  RotateCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchMapReports,
  fetchMyVerifiedIds,
  fetchReportStats,
  normalizeReport,
  reportErrorMessage,
  setVerification,
} from '@/lib/reports'
import ReportCard, { ReportCardSkeleton } from '@/components/ReportCard'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-ink/5" />,
})

const RECENT_COUNT = 5

const STAT_CARDS = [
  { key: 'total', label: 'Total reports', href: '/reports', icon: FileText, tone: 'bg-ink/5 text-ink' },
  {
    key: 'pending',
    label: 'Pending',
    href: '/reports?status=pending',
    icon: Clock,
    tone: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'inProgress',
    label: 'In progress',
    href: '/reports?status=in_progress',
    icon: LoaderCircle,
    tone: 'bg-sky-50 text-sky-600',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    href: '/reports?status=resolved',
    icon: CircleCheck,
    tone: 'bg-emerald-50 text-emerald-600',
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyingId, setVerifyingId] = useState(null)

  const load = useCallback(
    async (signal) => {
      try {
        const [nextStats, rows] = await Promise.all([
          fetchReportStats(supabase),
          fetchMapReports(supabase),
        ])
        if (signal?.aborted) return
        const verifiedIds = await fetchMyVerifiedIds(supabase)
        if (signal?.aborted) return
        setStats(nextStats)
        setReports(rows.map((row) => normalizeReport(row, verifiedIds)))
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

  async function handleVerify(report) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
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
      await setVerification(supabase, report.id, user.id, verified)
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

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink/60">
            Reported problems across your area, with the current status of each.
          </p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          Report an issue
        </Link>
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            <RotateCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, href, icon: Icon, tone }) => (
          <Link
            key={key}
            href={href}
            className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink/10 transition-shadow hover:shadow-md hover:shadow-ink/5 sm:p-5"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-2xl font-bold tracking-tight text-ink">
                {isLoading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-ink/10" /> : stats?.[key] ?? 0}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-ink/55">{label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">
              Recent reports
            </h2>
            <Link
              href="/reports"
              className="text-xs font-semibold text-accent-strong transition-colors hover:underline"
            >
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <ReportCardSkeleton key={index} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports yet"
              description="Nothing has been reported in your area. Be the first to flag a problem."
              action={
                <Link
                  href="/reports/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                  Report an issue
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
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
          <section className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Report locations</h2>
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong transition-colors hover:underline"
              >
                <Map className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                Full map
              </Link>
            </div>
            <div className="h-64">
              <ItahariMap reports={reports} className="h-full" zoom={13} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
            <h2 className="mb-4 text-sm font-bold text-ink">Reports by category</h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-4 w-full animate-pulse rounded bg-ink/10" />
                ))}
              </div>
            ) : (stats?.categories ?? []).length === 0 ? (
              <p className="text-sm text-ink/55">No category data yet.</p>
            ) : (
              <ul className="space-y-3">
                {stats.categories.map((row) => (
                  <li key={row.category}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <Link
                        href={`/reports?category=${encodeURIComponent(row.category)}`}
                        className="font-medium text-ink/75 transition-colors hover:text-accent-strong"
                      >
                        {row.category}
                      </Link>
                      <span className="font-semibold text-ink/50">{row.count}</span>
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
