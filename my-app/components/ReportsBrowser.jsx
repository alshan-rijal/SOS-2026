'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Search, SearchX, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  CATEGORIES,
  PAGE_SIZE,
  SEVERITY_ORDER,
  SEVERITY_CONFIG,
  SORT_OPTIONS,
  STATUS_CONFIG,
  fetchMyVerifiedIds,
  fetchReports,
  normalizeReport,
  reportErrorMessage,
  setVerification,
} from '@/lib/reports'
import ReportCard, { ReportCardSkeleton } from '@/components/ReportCard'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const selectClass =
  'rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink transition-colors hover:border-ink/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

export default function ReportsBrowser() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Filters live in component state but are mirrored to the URL so a filtered
  // view can be linked and bookmarked. Initial values come from the URL.
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState(searchParams.get('category') ?? 'All')
  const [status, setStatus] = useState(searchParams.get('status') ?? 'all')
  const [severity, setSeverity] = useState(searchParams.get('severity') ?? 'all')
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  const [reports, setReports] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyingId, setVerifyingId] = useState(null)

  const debouncedSearch = useDebounced(search)
  const requestRef = useRef(0)

  // Mirror the current filters into the URL.
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (category !== 'All') params.set('category', category)
    if (status !== 'all') params.set('status', status)
    if (severity !== 'all') params.set('severity', severity)
    if (sort !== 'newest') params.set('sort', sort)
    if (page > 1) params.set('page', String(page))
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [debouncedSearch, category, status, severity, sort, page, pathname, router])

  useEffect(() => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId

    async function load() {
      try {
        const { rows, count } = await fetchReports(supabase, {
          search: debouncedSearch,
          category,
          status,
          severity,
          sort,
          page,
        })
        if (requestRef.current !== requestId) return
        const verifiedIds = await fetchMyVerifiedIds(supabase)
        if (requestRef.current !== requestId) return
        setReports(rows.map((row) => normalizeReport(row, verifiedIds)))
        setTotal(count)
        setError('')
      } catch (err) {
        if (requestRef.current !== requestId) return
        setReports([])
        setTotal(0)
        setError(reportErrorMessage(err))
      } finally {
        if (requestRef.current === requestId) setIsLoading(false)
      }
    }

    load()
  }, [supabase, debouncedSearch, category, status, severity, sort, page])

  const hasFilters =
    Boolean(search) || category !== 'All' || status !== 'all' || severity !== 'all'

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  function clearFilters() {
    setIsLoading(true)
    setSearch('')
    setCategory('All')
    setStatus('all')
    setSeverity('all')
    setSort('newest')
    setPage(1)
  }

  function changeFilter(setter, value) {
    setIsLoading(true)
    setter(value)
    setPage(1)
  }

  function goToPage(nextPage) {
    setIsLoading(true)
    setPage(nextPage)
  }

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

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Reports</h1>
          <p className="mt-1 text-sm text-ink/60">
            Browse and filter every reported problem. Reports are public.
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

      <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
          Filters
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
              strokeWidth={2}
              aria-hidden="true"
            />
            <label className="sr-only" htmlFor="report-search">
              Search reports
            </label>
            <input
              id="report-search"
              type="search"
              value={search}
              onChange={(event) => changeFilter(setSearch, event.target.value)}
              placeholder="Search title, description or location"
              className={`${selectClass} w-full pl-9`}
            />
          </div>

          <div className="lg:col-span-7 lg:col-start-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="sr-only" htmlFor="filter-category">
                Category
              </label>
              <select
                id="filter-category"
                value={category}
                onChange={(event) => changeFilter(setCategory, event.target.value)}
                className={`${selectClass} w-full`}
              >
                <option value="All">All categories</option>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="sr-only" htmlFor="filter-status">
                Status
              </label>
              <select
                id="filter-status"
                value={status}
                onChange={(event) => changeFilter(setStatus, event.target.value)}
                className={`${selectClass} w-full`}
              >
                <option value="all">All statuses</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="sr-only" htmlFor="filter-severity">
                Severity
              </label>
              <select
                id="filter-severity"
                value={severity}
                onChange={(event) => changeFilter(setSeverity, event.target.value)}
                className={`${selectClass} w-full`}
              >
                <option value="all">All severities</option>
                {SEVERITY_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {SEVERITY_CONFIG[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="sr-only" htmlFor="filter-sort">
                Sort
              </label>
              <select
                id="filter-sort"
                value={sort}
                onChange={(event) => changeFilter(setSort, event.target.value)}
                className={`${selectClass} w-full`}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-xs font-semibold text-accent-strong transition-colors hover:underline"
          >
            Clear all filters
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ReportCardSkeleton key={index} />
          ))}
        </div>
      ) : reports.length === 0 && !error ? (
        <EmptyState
          icon={hasFilters ? SearchX : Search}
          title={hasFilters ? 'No reports match these filters' : 'No reports yet'}
          description={
            hasFilters
              ? 'Try a different search term or clear the filters to see everything.'
              : 'Nothing has been reported yet. Be the first to flag a problem.'
          }
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
              >
                Clear filters
              </button>
            ) : (
              <Link
                href="/reports/new"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                Report an issue
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-ink/55">
            <span>
              Showing {rangeStart}–{rangeEnd} of {total} {total === 1 ? 'report' : 'reports'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onVerify={handleVerify}
                isVerifying={verifyingId === report.id}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav className="flex items-center justify-center gap-2 pt-2" aria-label="Pagination">
              <button
                type="button"
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                Previous
              </button>

              <span className="px-2 text-sm text-ink/60">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}
