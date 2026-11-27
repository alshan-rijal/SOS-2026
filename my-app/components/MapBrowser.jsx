'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { AlertCircle, MapPin, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchMapReports,
  fetchMyVerifiedIds,
  hasCoords,
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

export default function MapBrowser() {
  const router = useRouter()
  const supabase = createClient()

  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyingId, setVerifyingId] = useState(null)

  const load = useCallback(
    async (signal) => {
      try {
        const [rows, verifiedIds] = await Promise.all([
          fetchMapReports(supabase),
          fetchMyVerifiedIds(supabase),
        ])
        if (signal?.aborted) return
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

  const located = reports.filter(hasCoords)

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Map' }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Map</h1>
          <p className="mt-1 text-sm text-ink/60">
            Every reported problem with a recorded location. Select a pin for details.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink/70 ring-1 ring-ink/10">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          {isLoading ? '…' : `${located.length} located`}
        </span>
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
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : null}

      <div className="h-[60vh] min-h-[400px]">
        <ItahariMap reports={reports} showLegend className="h-full" zoom={12} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">
          Located reports
        </h2>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <ReportCardSkeleton key={index} />
            ))}
          </div>
        ) : located.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No located reports yet"
            description="Reports appear here once they have a map pin. Report an issue and place a pin to start the map."
            action={
              <Link
                href="/reports/new"
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                Report an issue
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {located.map((report) => (
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
    </div>
  )
}
