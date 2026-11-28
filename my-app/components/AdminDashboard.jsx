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
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageContext'
import { localizeField } from '@/lib/i18n'
import {
  CATEGORIES,
  STATUS_ORDER,
  categoryLabel,
  deleteReport,
  fetchAdminAnalytics,
  formatDate,
  normalizeReport,
  reportErrorMessage,
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

export default function AdminDashboard() {
  const supabase = createClient()
  const { lang, t } = useLanguage()

  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [todayIso, setTodayIso] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [updatingId, setUpdatingId] = useState(null)
  const [notes, setNotes] = useState({})

  useEffect(() => {
    setTodayIso(new Date().toISOString().slice(0, 10))
  }, [])

  const loadData = useCallback(async () => {
    try {
      const { reports: rawReports, stats: summary } = await fetchAdminAnalytics(supabase)
      setReports(rawReports.map((row) => normalizeReport(row)))
      setStats(summary)
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

  // 3. Last 14 Days Trend Data (uses client-mounted `todayIso` to satisfy Next.js 16 prerender rules)
  const trendChartData = useMemo(() => {
    if (!todayIso) return []
    const [year, month, day] = todayIso.split('-').map(Number)
    const days = []

    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.UTC(year, month - 1, day - i))
      const isoDay = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString(lang === 'ne' ? 'ne-NP' : undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
      const submitted = reports.filter((r) => r.createdAt?.slice(0, 10) === isoDay).length
      days.push({ date: label, submitted })
    }
    return days
  }, [reports, todayIso, lang])

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (categoryFilter !== 'All' && r.category !== categoryFilter) return false
      return true
    })
  }, [reports, statusFilter, categoryFilter])

  async function handleStatusChange(reportId, nextStatus) {
    setUpdatingId(reportId)
    setError('')
    try {
      await updateReportStatus(supabase, reportId, nextStatus, notes[reportId] || '')
      setNotes((prev) => ({ ...prev, [reportId]: '' }))
      await loadData()
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(reportId, title) {
    if (!window.confirm(`Delete "${title}" permanently?`)) return
    setUpdatingId(reportId)
    setError('')
    try {
      await deleteReport(supabase, reportId)
      await loadData()
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-xl bg-white p-6" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-xl bg-white" />
          <div className="h-72 animate-pulse rounded-xl bg-white" />
          <div className="h-72 animate-pulse rounded-xl bg-white" />
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            <ShieldCheck className="h-7 w-7 text-accent" strokeWidth={2.2} />
            {t('Authority & Municipal Panel')}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {t('Monitor civic issue trends across Itahari, verify escalations, and update resolution statuses.')}
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm font-medium text-ink">
          <AlertCircle className="h-4 w-4 shrink-0 text-accent" />
          {error}
        </div>
      ) : null}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/50">
            {t('Total Reports')}
          </span>
          <p className="mt-2 text-3xl font-bold text-ink">{stats.total}</p>
        </div>
        <div className="card p-5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Clock className="h-3.5 w-3.5" /> {t('Pending Action')}
          </span>
          <p className="mt-2 text-3xl font-bold text-ink">{stats.pending}</p>
        </div>
        <div className="card p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">
            {statusLabel('in_progress', lang)}
          </span>
          <p className="mt-2 text-3xl font-bold text-ink">{stats.inProgress}</p>
        </div>
        <div className="card p-5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {statusLabel('resolved', lang)}
          </span>
          <p className="mt-2 text-3xl font-bold text-ink">{stats.resolved}</p>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#0b4a6f18" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#0b4a6f' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#0b4a6f' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', borderColor: '#0b4a6f20', fontSize: '12px' }}
                />
                <Bar dataKey="count" name={t('Reports')} fill="#0b4a6f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 14-Day Submission Trend */}
        <section className="card p-6 lg:col-span-4">
          <h2 className="text-base font-bold text-ink">{t('14-Day Report Volume')}</h2>
          <p className="mb-4 text-xs text-ink/55">{t('Daily incoming reports over the past two weeks')}</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b4a6f18" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#0b4a6f' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#0b4a6f' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', borderColor: '#0b4a6f20', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  name={t('Reports')}
                  stroke="#ff6b5a"
                  fill="#ff6b5a33"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Status Donut Chart */}
        <section className="card p-6 lg:col-span-3">
          <h2 className="text-base font-bold text-ink">{t('Resolution Ratio')}</h2>
          <p className="mb-4 text-xs text-ink/55">{t('Current status breakdown')}</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {statusChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs font-medium text-ink/75">
            {statusChartData.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Authority Action Table */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">
              {t('Incoming Civic Reports')} ({filteredReports.length})
            </h2>
            <p className="text-xs text-ink/55">
              {t('Update official status or attach public progress notes')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="All">{t('All categories')}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat, lang)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="all">{t('All statuses')}</option>
              {STATUS_ORDER.map((st) => (
                <option key={st} value={st}>
                  {statusLabel(st, lang)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wider text-ink/50">
                <th className="py-3 pr-4">{t('Issue')}</th>
                <th className="py-3 pr-4">{t('Category & Location')}</th>
                <th className="py-3 pr-4">{t('Severity')}</th>
                <th className="py-3 pr-4">{t('Status')}</th>
                <th className="py-3 pr-4">{t('Official Note & Action')}</th>
                <th className="py-3 text-right">{t('Remove')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filteredReports.map((report) => {
                const displayTitle = localizeField(report, 'title', lang)
                const displayLocation = localizeField(report, 'locationName', lang)

                return (
                  <tr key={report.id} className="align-top hover:bg-surface/40">
                    <td className="py-3.5 pr-4">
                      <Link href={`/reports/${report.id}`} className="font-semibold text-ink hover:underline">
                        {displayTitle}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink/55">
                        {t('By')} {report.reporterName} · {formatDate(report.createdAt, lang)} ·{' '}
                        {report.verifications} {t('verifications')}
                      </p>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-ink/75">
                      <span className="font-medium text-ink">{categoryLabel(report.category, lang)}</span>
                      {displayLocation ? <span className="block text-ink/55">{displayLocation}</span> : null}
                    </td>
                    <td className="py-3.5 pr-4">
                      <SeverityBadge severity={report.severity} />
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          placeholder={t('Optional status note…')}
                          value={notes[report.id] || ''}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                          className="w-44 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-ink/40"
                        />
                        <select
                          value={report.status}
                          disabled={updatingId === report.id}
                          onChange={(e) => handleStatusChange(report.id, e.target.value)}
                          className="rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
                        >
                          {STATUS_ORDER.map((st) => (
                            <option key={st} value={st}>
                              {t('Set')}: {statusLabel(st, lang)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        disabled={updatingId === report.id}
                        onClick={() => handleDelete(report.id, displayTitle)}
                        title={t('Delete report')}
                        className="inline-flex rounded-lg p-1.5 text-ink/45 transition-colors hover:bg-accent/10 hover:text-accent disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}