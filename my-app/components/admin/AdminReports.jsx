'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ImageIcon, Lock, RotateCcw, Search, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ALL_STATUSES,
  CATEGORIES,
  SEVERITY_ORDER,
  categoryLabel,
  fetchReportStats,
  reportErrorMessage,
  severityLabel,
  shortId,
  statusLabel,
  updateReportStatus,
} from '@/lib/reports'
import { fetchAdminReports } from '@/lib/admin'
import { formatDateTime, timeAgo } from '@/lib/format'
import { SeverityBadge, StatusBadge } from '@/components/Badges'
import Breadcrumbs from '@/components/Breadcrumbs'
import DbNotice from '@/components/admin/DbNotice'
import { useLanguage } from '@/components/LanguageContext'

const PAGE_SIZES = [25, 50, 100]

function csv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export default function AdminReports({ confidentialOnly = false }) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const filters = useMemo(
    () => ({
      search: searchParams.get('q') || '',
      status: searchParams.get('status') || 'all',
      category: searchParams.get('category') || 'All',
      severity: searchParams.get('severity') || 'all',
      confidential: confidentialOnly ? 'only' : searchParams.get('confidential') || 'all',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      sort: searchParams.get('sort') || 'newest',
      page: Number(searchParams.get('page') || '1'),
      size: Number(searchParams.get('size') || '25'),
    }),
    [searchParams, confidentialOnly]
  )

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dbStale, setDbStale] = useState(false)
  const [statusCounts, setStatusCounts] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search)
  const firstRender = useRef(true)

  const replaceParams = useCallback(
    (patch, { resetPage = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === '' || value == null || value === 'all' || value === 'All') params.delete(key)
        else params.set(key, String(value))
      }
      if (resetPage) params.delete('page')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  // Debounced search so typing does not rewrite the URL on every key.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) replaceParams({ q: searchInput })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters.search, replaceParams])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { rows: nextRows, count: nextCount, dbStale: stale } = await fetchAdminReports(supabase, {
        ...filters,
        from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
        to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
      })
      setRows(nextRows)
      setCount(nextCount)
      setDbStale(stale)
      setSelected(new Set())
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [supabase, filters])

  useEffect(() => {
    Promise.resolve().then(load)
  }, [load])

  useEffect(() => {
    let active = true
    fetchReportStats(supabase)
      .then((stats) => {
        if (!active) return
        setStatusCounts({
          all: stats.total,
          reported: stats.reported,
          under_verification: stats.underVerification,
          in_progress: stats.inProgress,
          fixed: stats.fixed,
          cannot_fix: stats.cannotFix,
        })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [supabase])

  const totalPages = Math.max(1, Math.ceil(count / filters.size))

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  }

  async function bulkVerify() {
    if (selected.size === 0) return
    setBusy(true)
    setError('')
    try {
      for (const id of selected) {
        await updateReportStatus(supabase, id, 'under_verification')
      }
      await load()
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function exportVisible() {
    const headers = ['ID', 'Title', 'Category', 'Severity', 'Status', 'Place', 'Reported', 'Verifications', 'Reporter', 'Confidential']
    const body = rows.map((row) => [
      row.id,
      row.title,
      row.category,
      row.severity,
      row.status,
      row.locationName,
      formatDateTime(row.createdAt, 'en'),
      row.verifications,
      row.reporterName,
      row.isConfidential ? 'yes' : 'no',
    ])
    const text = [headers, ...body].map((line) => line.map(csv).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sajha-admin-reports.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters =
    filters.search || filters.status !== 'all' || filters.category !== 'All' || filters.severity !== 'all' ||
    (!confidentialOnly && filters.confidential !== 'all') || filters.from || filters.to

  const crumbs = confidentialOnly
    ? [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Confidential' }]
    : [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Reports' }]

  return (
    <div className="space-y-5">
      <Breadcrumbs items={crumbs} />

      {confidentialOnly ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-ink/15 bg-surface p-4 text-sm font-medium text-ink">
          <Lock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          {t('Visible only to admins and the reporter')}
        </div>
      ) : null}

      {dbStale ? <DbNotice /> : null}
      {error ? (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-ink">{error}</div>
      ) : null}

      {/* Status chips with counts */}
      <div className="flex flex-wrap gap-2">
        {[{ key: 'all', label: 'All' }, ...ALL_STATUSES.map((key) => ({ key, label: statusLabel(key, lang) }))].map(
          (chip) => {
            const active = filters.status === chip.key
            const chipCount = statusCounts?.[chip.key]
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => replaceParams({ status: chip.key })}
                aria-pressed={active}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors duration-150 ${
                  active ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink/70 hover:bg-ink/5'
                }`}
              >
                {chip.label}
                {chipCount != null ? (
                  <span className={`rounded-full px-1.5 ${active ? 'bg-white/20' : 'bg-surface text-ink'}`}>
                    {chipCount}
                  </span>
                ) : null}
              </button>
            )
          }
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('Search title, place or report id…')}
            aria-label={t('Search')}
            className="h-10 w-full rounded-xl border border-ink/15 bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
          />
        </div>

        <Select label={t('Category')} value={filters.category} onChange={(v) => replaceParams({ category: v })}
          options={[{ value: 'All', label: t('All categories') }, ...CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c, lang) }))]} />

        <Select label={t('Severity')} value={filters.severity} onChange={(v) => replaceParams({ severity: v })}
          options={[{ value: 'all', label: t('All severities') }, ...SEVERITY_ORDER.map((s) => ({ value: s, label: severityLabel(s, lang) }))]} />

        {!confidentialOnly ? (
          <Select label={t('Confidential')} value={filters.confidential} onChange={(v) => replaceParams({ confidential: v })}
            options={[{ value: 'all', label: t('All') }, { value: 'only', label: t('Only') }, { value: 'hide', label: t('Exclude') }]} />
        ) : null}

        <Select label={t('Sort')} value={filters.sort} onChange={(v) => replaceParams({ sort: v })}
          options={[{ value: 'newest', label: t('Newest first') }, { value: 'oldest', label: t('Oldest first') }, { value: 'severity', label: t('Highest severity') }]} />

        <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
          {t('From')}
          <input type="date" value={filters.from} onChange={(e) => replaceParams({ from: e.target.value })}
            className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
          {t('To')}
          <input type="date" value={filters.to} onChange={(e) => replaceParams({ to: e.target.value })}
            className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none" />
        </label>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => router.replace(pathname)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-ink/15 px-3 text-sm font-semibold text-ink/70 hover:bg-ink/5"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            {t('Reset')}
          </button>
        ) : null}
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/15 bg-surface p-3">
          <span className="text-sm font-semibold text-ink">{t('{n} selected', { n: selected.size })}</span>
          <button
            type="button"
            onClick={bulkVerify}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            {t('Move to Under verification')}
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-sm font-semibold text-ink/60 hover:text-ink">
            {t('Clear selection')}
          </button>
        </div>
      ) : null}

      {/* Table (>=700px) and card list (<700px) */}
      <section className="card overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
              <tr className="text-xs font-semibold uppercase tracking-wider text-ink/60">
                <th className="w-10 py-3 pl-3 pr-2">
                  <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll}
                    aria-label={t('Select all')} className="h-4 w-4 accent-[#ff6b5a]" />
                </th>
                <th className="py-3 pr-3">{t('ID')}</th>
                <th className="py-3 pr-3">{t('Title & photo')}</th>
                <th className="py-3 pr-3">{t('Category')}</th>
                <th className="py-3 pr-3">{t('Place')}</th>
                <th className="py-3 pr-3">{t('Severity')}</th>
                <th className="py-3 pr-3">{t('Status')}</th>
                <th className="py-3 pr-3">{t('Reported')}</th>
                <th className="py-3 pr-3">{t('Verifications')}</th>
                <th className="py-3 pr-3">{t('Reporter')}</th>
                <th className="py-3 pr-3 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={11} className="px-3 py-3">
                      <div className="h-9 w-full animate-pulse rounded bg-ink/8" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-sm text-ink/55">{t('No reports match these filters.')}</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="align-middle hover:bg-surface/30">
                    <td className="py-3 pl-3 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)}
                        aria-label={`${t('Select')} ${shortId(row.id)}`} className="h-4 w-4 accent-[#ff6b5a]" />
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs text-ink/60">{shortId(row.id)}</td>
                    <td className="min-w-[220px] py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-surface">
                          {row.isConfidential ? (
                            <Lock className="h-4 w-4 text-ink/50" strokeWidth={2} aria-hidden="true" />
                          ) : row.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-ink/30" aria-hidden="true" />
                          )}
                        </span>
                        <Link href={`/admin/reports/${row.id}`} className="min-w-0 font-semibold text-ink hover:underline">
                          <span className="line-clamp-1">{row.title}</span>
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-xs text-ink/75">{categoryLabel(row.category, lang)}</td>
                    <td className="py-3 pr-3 text-xs text-ink/60">{row.locationName || '—'}</td>
                    <td className="py-3 pr-3"><SeverityBadge severity={row.severity} /></td>
                    <td className="py-3 pr-3"><StatusBadge status={row.status} /></td>
                    <td className="py-3 pr-3 text-xs text-ink/70" title={formatDateTime(row.createdAt, lang)}>
                      {timeAgo(row.createdAt, lang)}
                    </td>
                    <td className="py-3 pr-3 text-xs font-semibold text-ink/75">{row.verifications}</td>
                    <td className="py-3 pr-3 text-xs text-ink/70">{row.reporterName}</td>
                    <td className="py-3 pr-3 text-right">
                      <Link href={`/admin/reports/${row.id}`} className="text-xs font-semibold text-ink hover:underline">
                        {t('Update status')}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card list under 700px */}
        <div className="divide-y divide-ink/10 md:hidden">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-4"><div className="h-16 w-full animate-pulse rounded bg-ink/8" /></div>
            ))
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/55">{t('No reports match these filters.')}</p>
          ) : (
            rows.map((row) => (
              <Link key={row.id} href={`/admin/reports/${row.id}`} className="block p-4 hover:bg-surface/40">
                <div className="flex items-center gap-2">
                  <StatusBadge status={row.status} />
                  <SeverityBadge severity={row.severity} />
                  {row.isConfidential ? <Lock className="h-3.5 w-3.5 text-ink/50" aria-hidden="true" /> : null}
                  <span className="ml-auto font-mono text-[11px] text-ink/50">{shortId(row.id)}</span>
                </div>
                <p className="mt-2 font-semibold text-ink">{row.title}</p>
                <p className="mt-0.5 text-xs text-ink/60">
                  {categoryLabel(row.category, lang)} · {row.locationName || '—'} · {timeAgo(row.createdAt, lang)}
                </p>
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 p-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink/60">
            {t('Rows per page')}
            <select value={filters.size} onChange={(e) => replaceParams({ size: e.target.value })}
              className="h-9 rounded-lg border border-ink/15 bg-white px-2 text-sm text-ink focus:border-accent focus:outline-none">
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <button type="button" disabled={filters.page <= 1} onClick={() => replaceParams({ page: filters.page - 1 }, { resetPage: false })}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink/15 px-3 text-xs font-semibold text-ink disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {t('Previous')}
            </button>
            <span className="text-xs font-medium text-ink/60">{filters.page} / {totalPages}</span>
            <button type="button" disabled={filters.page >= totalPages} onClick={() => replaceParams({ page: filters.page + 1 }, { resetPage: false })}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink/15 px-3 text-xs font-semibold text-ink disabled:opacity-40">
              {t('Next')} <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button type="button" onClick={exportVisible} disabled={rows.length === 0}
            className="text-xs font-semibold text-ink hover:underline disabled:opacity-40">
            {t('Export CSV')}
          </button>
        </div>
      </section>
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
