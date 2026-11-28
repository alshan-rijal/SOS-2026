'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageContext'
import { localizeField } from '@/lib/i18n'
import {
  CATEGORIES,
  SEVERITY_ORDER,
  STATUS_ORDER,
  categoryLabel,
  deleteReport,
  fetchAdminAnalytics,
  formatDate,
  normalizeReport,
  reportErrorMessage,
  severityLabel,
  statusLabel,
  updateReportStatus,
} from '@/lib/reports'
import { SeverityBadge, StatusBadge } from '@/components/Badges'
import Breadcrumbs from '@/components/Breadcrumbs'

const STATUS_COLORS = {
  pending: '#ff6b5a',
  in_progress: '#0b4a6f',
  resolved: '#16a34a',
}

function toLocalIsoDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const { lang, t } = useLanguage()

  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [todayIso, setTodayIso] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('all')

  // Row moderation drafts & loading state
  const [updatingId, setUpdatingId] = useState(null)
  const [draftStatuses, setDraftStatuses] = useState({})
  const [notes, setNotes] = useState({})

  useEffect(() => {
    setTodayIso(toLocalIsoDate(new Date()))
  }, [])

  const loadData = useCallback(async () => {
    try {
      const { reports: rawReports, stats: summary } = await fetchAdminAnalytics(supabase)
      const normalized = rawReports.map((row) => normalizeReport(row))
      setReports(normalized)
      setStats(summary)
      setDraftStatuses((prev) => {
        const next = { ...prev }
        for (const r of normalized) {
          if (!next[r.id]) next[r.id] = r.status
        }
        return next
      })
      setError('')
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resolutionRate = useMemo(() => {
    if (!stats.total) return 0
    return Math.round((stats.resolved / stats.total) * 100)
  }, [stats])

  const urgentOpenCount = useMemo(() => {
    return reports.filter(
      (r) => r.status !== 'resolved' && (r.severity === 'critical' || r.severity === 'high')
    ).length
  }, [reports])

  // 1. Category Bar Chart Data
  const categoryChartData = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const localized = categoryLabel(cat, lang)
      return {
        name:
          lang === 'en'
            ? localized.replace(' Management', '').replace(' & Potholes', '')
            : localized,
        fullCategory: localized,
        count: reports.filter((r) => r.category === cat).length,
      }
    })
  }, [reports, lang])

  // 2. Status Donut Chart Data
  const statusChartData = useMemo(() => {
    return [
      { name: statusLabel('pending', lang), value: stats.pending, color: STATUS_COLORS.pending },
      {
        name: statusLabel('in_progress', lang),
        value: stats.inProgress,
        color: STATUS_COLORS.inProgress,
      },
      { name: statusLabel('resolved', lang), value: stats.resolved, color: STATUS_COLORS.resolved },
    ].filter((d) => d.value > 0)
  }, [stats, lang])

  // 3. Last 14 Days Trend Data (Local timezone safe & Next.js 16 prerender safe)
  const trendChartData = useMemo(() => {
    if (!todayIso) return []
    const [year, month, day] = todayIso.split('-').map(Number)
    const days = []

    for (let i = 13; i >= 0; i--) {
      const d = new Date(year, month - 1, day - i)
      const isoDay = toLocalIsoDate(d)
      const label = d.toLocaleDateString(lang === 'ne' ? 'ne-NP' : undefined, {
        month: 'short',
        day: 'numeric',
      })
      const submitted = reports.filter(
        (r) => r.createdAt && toLocalIsoDate(r.createdAt) === isoDay
      ).length
      days.push({ date: label, submitted })
    }
    return days
  }, [reports, todayIso, lang])

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (categoryFilter !== 'All' && r.category !== categoryFilter) return false
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false
      if (q) {
        const title = localizeField(r, 'title', lang).toLowerCase()
        const location = localizeField(r, 'locationName', lang).toLowerCase()
        const reporter = (r.reporterName || '').toLowerCase()
        if (!title.includes(q) && !location.includes(q) && !reporter.includes(q)) return false
      }
      return true
    })
  }, [reports, statusFilter, categoryFilter, severityFilter, searchQuery, lang])

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'All' ||
    severityFilter !== 'all'

  function resetFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setCategoryFilter('All')
    setSeverityFilter('all')
  }

  async function handleSaveUpdate(report) {
    const nextStatus = draftStatuses[report.id] ?? report.status
    const noteText = (notes[report.id] || '').trim()

    if (nextStatus === report.status && !noteText) return

    setUpdatingId(report.id)
    setError('')
    setSuccessMsg('')
    try {
      await updateReportStatus(supabase, report.id, nextStatus, noteText)
      setNotes((prev) => ({ ...prev, [report.id]: '' }))
      await loadData()
      setSuccessMsg(
        `${t('Updated')} "${localizeField(report, 'title', lang)}" → ${statusLabel(nextStatus, lang)}`
      )
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(reportId, title) {
    if (!window.confirm(`Delete "${title}" permanently? This action cannot be undone.`)) return
    setUpdatingId(reportId)
    setError('')
    setSuccessMsg('')
    try {
      await deleteReport(supabase, reportId)
      await loadData()
      setSuccessMsg(`${t('Deleted')} "${title}"`)
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  function handleExportCsv() {
    const headers = [
      'ID',
      'Title',
      'Category',
      'Severity',
      'Status',
      'Location',
      'Reporter',
      'Verifications',
      'Created At',
    ]
    const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const rows = filteredReports.map((r) => [
      r.id,
      localizeField(r, 'title', lang),
      r.category,
      r.severity,
      r.status,
      localizeField(r, 'locationName', lang),
      r.reporterName,
      r.verifications,
      r.createdAt,
    ])
    const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join(
      '\n'
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sajha-pahal-reports-${todayIso || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-white p-6" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="h-72 animate-pulse rounded-2xl bg-white lg:col-span-5" />
          <div className="h-72 animate-pulse rounded-2xl bg-white lg:col-span-4" />
          <div className="h-72 animate-pulse rounded-2xl bg-white lg:col-span-3" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t('Dashboard'), href: '/dashboard' },
          { label: t('Authority Panel') },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-xs">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={2.3} />
            {t('Itahari Sub-Metropolitan City · Civic Command')}
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t('Authority & Municipal Panel')}
          </h1>
          <p className="mt-1 text-sm text-ink/65">
            {t(
              'Monitor civic issue trends across Itahari, verify escalations, and update resolution statuses.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {urgentOpenCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('pending')
                setSeverityFilter('high')
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-accent/15"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-accent" />
              {urgentOpenCount} {t('High/Critical Open')}
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredReports.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface/60 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t('Export CSV')}
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {error ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm font-medium text-ink">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-accent" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-xs font-semibold text-ink/60 hover:text-ink"
          >
            {t('Dismiss')}
          </button>
        </div>
      ) : null}

      {successMsg ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            {successMsg}
          </span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
          >
            {t('Dismiss')}
          </button>
        </div>
      ) : null}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/55">
              {t('Total Reports')}
            </span>
            <span className="rounded-lg bg-surface p-2 text-ink">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{stats.total}</p>
          <p className="mt-1 text-xs text-ink/50">{t('All recorded civic submissions')}</p>
        </div>

        <div className="card relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              {t('Pending Action')}
            </span>
            <span className="rounded-lg bg-accent/10 p-2 text-accent">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{stats.pending}</p>
          <p className="mt-1 text-xs text-ink/50">{t('Awaiting municipal assignment')}</p>
        </div>

        <div className="card relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">
              {statusLabel('in_progress', lang)}
            </span>
            <span className="rounded-lg bg-ink/10 p-2 text-ink">
              <Loader2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{stats.inProgress}</p>
          <p className="mt-1 text-xs text-ink/50">{t('Active field work underway')}</p>
        </div>

        <div className="card relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              {statusLabel('resolved', lang)}
            </span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight text-ink">{stats.resolved}</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {resolutionRate}%
            </span>
          </div>
          <p className="mt-1 text-xs text-ink/50">{t('Completed resolution rate')}</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Category Bar Chart */}
        <section className="card p-6 lg:col-span-5">
          <h2 className="text-base font-bold text-ink">{t('Issues by Category')}</h2>
          <p className="mb-4 text-xs text-ink/55">{t('Distribution across municipal departments')}</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b4a6f18" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#0b4a6f' }} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#0b4a6f' }}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#eaf4fb80' }}
                  formatter={(value) => [value, t('Reports')]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullCategory || ''}
                  contentStyle={{
                    borderRadius: '10px',
                    borderColor: '#0b4a6f20',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(11, 74, 111, 0.08)',
                  }}
                />
                <Bar dataKey="count" name={t('Reports')} fill="#0b4a6f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 14-Day Submission Trend */}
        <section className="card p-6 lg:col-span-4">
          <h2 className="text-base font-bold text-ink">{t('14-Day Report Volume')}</h2>
          <p className="mb-4 text-xs text-ink/55">
            {t('Daily incoming reports over the past two weeks')}
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6b5a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ff6b5a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b4a6f18" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#0b4a6f' }} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#0b4a6f' }}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    borderColor: '#0b4a6f20',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(11, 74, 111, 0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  name={t('Reports')}
                  stroke="#ff6b5a"
                  fill="url(#reportTrendFill)"
                  strokeWidth={2.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Status Donut Chart */}
        <section className="card flex flex-col justify-between p-6 lg:col-span-3">
          <div>
            <h2 className="text-base font-bold text-ink">{t('Resolution Ratio')}</h2>
            <p className="mb-2 text-xs text-ink/55">{t('Current status breakdown')}</p>
          </div>

          {statusChartData.length > 0 ? (
            <>
              <div className="relative h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={3}
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '10px',
                        borderColor: '#0b4a6f20',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-ink">{resolutionRate}%</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                    {statusLabel('resolved', lang)}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs font-medium text-ink/80">
                {statusChartData.map((s) => (
                  <span key={s.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name} ({s.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-ink/45">
              {t('No report data available yet')}
            </div>
          )}
        </section>
      </div>

      {/* Authority Action Table */}
      <section className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">
              {t('Incoming Civic Reports')} ({filteredReports.length})
            </h2>
            <p className="text-xs text-ink/55">
              {t('Select a new status, add an optional public note, and click Save to log progress.')}
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/45" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search title, ward, or citizen…')}
                className="w-full rounded-lg border border-ink/15 bg-white py-2 pl-8 pr-3 text-xs text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-ink focus:outline-none"
            >
              <option value="All">{t('All categories')}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat, lang)}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-ink focus:outline-none"
            >
              <option value="all">{t('All severities')}</option>
              {SEVERITY_ORDER.map((sev) => (
                <option key={sev} value={sev}>
                  {severityLabel(sev, lang)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-ink focus:outline-none"
            >
              <option value="all">{t('All statuses')}</option>
              {STATUS_ORDER.map((st) => (
                <option key={st} value={st}>
                  {statusLabel(st, lang)}
                </option>
              ))}
            </select>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-ink/15 px-2.5 py-2 text-xs font-semibold text-ink/70 hover:bg-surface/60 hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('Reset')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-surface/40 text-xs font-semibold uppercase tracking-wider text-ink/60">
                <th className="rounded-tl-lg py-3 pl-3 pr-4">{t('Issue & Evidence')}</th>
                <th className="py-3 pr-4">{t('Category & Location')}</th>
                <th className="py-3 pr-4">{t('Severity')}</th>
                <th className="py-3 pr-4">{t('Current Status')}</th>
                <th className="py-3 pr-4">{t('Official Action & Public Note')}</th>
                <th className="rounded-tr-lg py-3 pl-2 pr-3 text-right">{t('Remove')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-ink/55">
                    {t('No civic reports match your current filters.')}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const displayTitle = localizeField(report, 'title', lang)
                  const displayLocation = localizeField(report, 'locationName', lang)
                  const draftStatus = draftStatuses[report.id] ?? report.status
                  const noteDraft = notes[report.id] || ''
                  const isDirty = draftStatus !== report.status || noteDraft.trim().length > 0
                  const isBusy = updatingId === report.id

                  return (
                    <tr key={report.id} className="align-middle transition-colors hover:bg-surface/30">
                      <td className="py-3.5 pl-3 pr-4">
                        <div className="flex items-start gap-3">
                          {report.imageUrl ? (
                            <a
                              href={report.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              title={t('Open full evidence photo')}
                              className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-ink/15 bg-surface"
                            >
                              <img
                                src={report.imageUrl}
                                alt=""
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            </a>
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ink/10 bg-surface/50 text-ink/30">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <Link
                              href={`/reports/${report.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-ink hover:underline"
                            >
                              <span className="line-clamp-1">{displayTitle}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-45" />
                            </Link>
                            <p className="mt-0.5 text-xs text-ink/55">
                              {t('By')} {report.reporterName} · {formatDate(report.createdAt, lang)} ·{' '}
                              <span className="font-medium text-ink/75">
                                {report.verifications} {t('verifications')}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 pr-4 text-xs text-ink/75">
                        <span className="font-semibold text-ink">
                          {categoryLabel(report.category, lang)}
                        </span>
                        {displayLocation ? (
                          <span className="mt-0.5 block text-ink/55">{displayLocation}</span>
                        ) : null}
                      </td>

                      <td className="py-3.5 pr-4">
                        <SeverityBadge severity={report.severity} />
                      </td>

                      <td className="py-3.5 pr-4">
                        <StatusBadge status={report.status} />
                      </td>

                      <td className="py-3.5 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={draftStatus}
                            disabled={isBusy}
                            onChange={(e) =>
                              setDraftStatuses((prev) => ({ ...prev, [report.id]: e.target.value }))
                            }
                            className="rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-ink focus:outline-none disabled:opacity-50"
                          >
                            {STATUS_ORDER.map((st) => (
                              <option key={st} value={st}>
                                {statusLabel(st, lang)}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            placeholder={t('Public progress note…')}
                            value={noteDraft}
                            disabled={isBusy}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && isDirty) {
                                e.preventDefault()
                                handleSaveUpdate(report)
                              }
                            }}
                            className="w-44 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none disabled:opacity-50"
                          />

                          <button
                            type="button"
                            disabled={!isDirty || isBusy}
                            onClick={() => handleSaveUpdate(report)}
                            className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {t('Save')}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 pl-2 pr-3 text-right">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(report.id, displayTitle)}
                          title={t('Delete report')}
                          className="inline-flex rounded-lg p-1.5 text-ink/45 transition-colors hover:bg-accent/10 hover:text-accent disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}