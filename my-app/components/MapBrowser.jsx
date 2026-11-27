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
import SignalAlert from '@/components/SignalAlert'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-ink/8" />,
})

export default function MapBrowser() {
  const router = useRouter()
  const supabase = createClient()

  const [reports, setReports] = useState([])
  const [userId, setUserId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyingId, setVerifyingId] = useState(null)

  const load = useCallback(
    async (signal) => {
      try {
        const [rows, verifiedIds, auth] = await Promise.all([
          fetchMapReports(supabase),
          fetchMyVerifiedIds(supabase),
          supabase.auth.getUser(),
        ])
        if (signal?.aborted) return
        setReports(rows.map((row) => normalizeReport(row, verifiedIds)))
        setUserId(auth.data.user?.id ?? null)
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
    if (userId && report.userId === userId) return
    if (!userId) {
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
      await setVerification(supabase, report.id, userId, verified)
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

  function focusReport(report) {
    setSelectedId(report.id)
    setFocus({ lat: report.latitude, lng: report.longitude, zoom: 16 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const located = reports.filter(hasCoords)

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Map' }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Map</h1>
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
        <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm font-medium text-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-accent/10"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading ? <SignalAlert reports={reports} onFocus={setFocus} /> : null}

      <div className="h-[60vh] min-h-[400px]">
        <ItahariMap
          reports={reports}
          selectedId={selectedId}
          onSelect={setSelectedId}
          focus={focus}
          onVerify={handleVerify}
          verifyingId={verifyingId}
          currentUserId={userId}
          showLegend
          className="h-full"
          zoom={12}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/60">
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
            description="Reports appear here once they have a map pin."
            action={
              <Link
                href="/reports/new"
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
              >
                Report an issue
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {located.map((report) => (
              <div key={report.id} className="flex min-w-0 flex-col gap-2">
                <ReportCard
                  report={report}
                  onVerify={handleVerify}
                  isVerifying={verifyingId === report.id}
                />
                <button
                  type="button"
                  onClick={() => focusReport(report)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-ink/5"
                >
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                  Show on map
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
