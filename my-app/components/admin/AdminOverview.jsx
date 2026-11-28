'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { AlertTriangle, CircleCheck, Clock, Download, FileText, Lock, Loader, ShieldX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { categoryLabel, isDbUpdateError, reportErrorMessage, statusLabel } from '@/lib/reports'
import { RANGE_PRESETS, fetchAdminAnalytics, resolveRange } from '@/lib/admin'
import { formatDate, formatDuration, formatNumber, formatPercent } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'
import Breadcrumbs from '@/components/Breadcrumbs'
import DbNotice from '@/components/admin/DbNotice'
import { useLanguage } from '@/components/LanguageContext'

// Palette-only donut tones. The legend carries the number and the percentage, so
// the chart is never read by colour alone.
const DONUT_TONES = ['#ff6b5a', '#0b4a6f', 'rgba(11,74,111,0.55)', 'rgba(11,74,111,0.25)', '#eaf4fb']
const DONUT_STATUSES = ['reported', 'under_verification', 'in_progress', 'fixed', 'cannot_fix']

export default function AdminOverview() {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const preset = searchParams.get('range') || '7d'
  const customFrom = searchParams.get('from') || ''
  const customTo = searchParams.get('to') || ''

  const [data, setData] = useState(null)
  const [confidential, setConfidential] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(() => resolveRange(preset, customFrom, customTo), [preset, customFrom, customTo])

  const setRange = useCallback(
    (patch) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [analytics, conf] = await Promise.all([
        fetchAdminAnalytics(supabase, range),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('is_confidential', true),
      ])
      setData(analytics)
      setConfidential(conf.error ? null : conf.count ?? 0)
    } catch (err) {
      if (isDbUpdateError(err)) {
        setError('Admin features need a database update.')
      } else {
        setError(reportErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, range])

  useEffect(() => {
    Promise.resolve().then(load)
  }, [load])

  const kpis = useMemo(() => {
    const byStatus = data?.byStatus ?? {}
    return [
      { key: 'total', label: 'Total reports', value: data?.total ?? 0, icon: FileText },
      { key: 'needs', label: 'Needs verification', value: byStatus.reported ?? 0, icon: Clock },
      { key: 'resolving', label: 'Being resolved', value: byStatus.in_progress ?? 0, icon: Loader },
      { key: 'fixed', label: 'Fixed this month', value: byStatus.fixed ?? 0, icon: CircleCheck },
      { key: 'cannot', label: "Can't be fixed", value: byStatus.cannot_fix ?? 0, icon: ShieldX },
      { key: 'confidential', label: 'Confidential', value: confidential, icon: Lock },
    ]
  }, [data, confidential])

  const categoryData = useMemo(
    () =>
      (data?.byCategory ?? []).map((row) => ({
        name: categoryLabel(row.category, lang),
        count: row.count,
      })),
    [data, lang]
  )
  const maxCategory = Math.max(1, ...categoryData.map((row) => row.count))

  const volumeData = useMemo(
    () => (data?.byDay ?? []).map((row) => ({ date: row.day.slice(5), count: row.count })),
    [data]
  )

  const donutData = useMemo(() => {
    const byStatus = data?.byStatus ?? {}
    const total = data?.total || 0
    return DONUT_STATUSES.map((status, index) => ({
      status,
      name: statusLabel(status, lang),
      value: byStatus[status] ?? 0,
      tone: DONUT_TONES[index],
      percent: total ? Math.round(((byStatus[status] ?? 0) / total) * 100) : 0,
    })).filter((row) => row.value > 0)
  }, [data, lang])

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Overview' }]} />

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGE_PRESETS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRange({ range: option.value })}
            aria-pressed={preset === option.value}
            className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${
              preset === option.value ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink/70 hover:bg-ink/5'
            }`}
          >
            {t(option.label)}
          </button>
        ))}
        {preset === 'custom' ? (
          <span className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => setRange({ from: e.target.value })}
              className="h-9 rounded-lg border border-ink/15 bg-white px-2 text-sm text-ink focus:border-accent focus:outline-none" aria-label={t('From')} />
            <input type="date" value={customTo} onChange={(e) => setRange({ to: e.target.value })}
              className="h-9 rounded-lg border border-ink/15 bg-white px-2 text-sm text-ink focus:border-accent focus:outline-none" aria-label={t('To')} />
          </span>
        ) : null}

        <Link href="/admin/exports" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink bg-white px-3 text-xs font-semibold text-ink hover:bg-surface">
          <Download className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          {t('Export')}
        </Link>
      </div>

      {error ? <DbNotice message={error} /> : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(({ key, label, value, icon: Icon }) => (
          <div key={key} className="card flex flex-col gap-3 p-[clamp(16px,2vw,24px)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-ink">
              <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold tracking-tight text-ink">
                {loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-ink/8" /> : formatNumber(value ?? 0, lang)}
              </p>
              <p className="mt-0.5 text-xs font-medium text-ink/60">{t(label)}</p>
            </div>
            {key === 'total' && data ? (
              <p className={`text-[11px] font-semibold ${data.trend.delta >= 0 ? 'text-ink/60' : 'text-accent'}`}>
                {data.trend.delta >= 0 ? '+' : ''}
                {formatNumber(data.trend.delta, lang)} {t('vs previous 7 days')}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="card p-[clamp(16px,2vw,24px)] lg:col-span-5">
          <h2 className="text-base font-bold text-ink">{t('Issues by category')}</h2>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="h-full w-full animate-pulse rounded bg-ink/8" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,74,111,0.12)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#0b4a6f' }} axisLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#0b4a6f' }} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(234,244,251,0.5)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name={t('Reports')} radius={[6, 6, 0, 0]}>
                    {categoryData.map((row) => (
                      <Cell key={row.name} fill={row.count === maxCategory ? '#ff6b5a' : '#0b4a6f'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="sr-only">{t('Issues by category')}: {categoryData.map((row) => `${row.name} ${row.count}`).join(', ')}</p>
        </section>

        <section className="card p-[clamp(16px,2vw,24px)] lg:col-span-4">
          <h2 className="text-base font-bold text-ink">{t('Report volume')}</h2>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="h-full w-full animate-pulse rounded bg-ink/8" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6b5a" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ff6b5a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,74,111,0.12)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#0b4a6f' }} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#0b4a6f' }} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" name={t('Reports')} stroke="#ff6b5a" strokeWidth={2.2} fill="url(#adminVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card p-[clamp(16px,2vw,24px)] lg:col-span-3">
          <h2 className="text-base font-bold text-ink">{t('Status breakdown')}</h2>
          {donutData.length === 0 ? (
            <p className="mt-4 text-sm text-ink/55">{t('No data in this range.')}</p>
          ) : (
            <>
              <div className="relative mx-auto mt-2 h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={3}>
                      {donutData.map((entry) => (
                        <Cell key={entry.status} fill={entry.tone} stroke="#0b4a6f" strokeWidth={entry.tone === '#eaf4fb' ? 1 : 0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {donutData.map((entry) => (
                  <li key={entry.status} className="flex items-center gap-2 text-xs text-ink/75">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink/20" style={{ backgroundColor: entry.tone }} aria-hidden="true" />
                    <span className="truncate">{entry.name}</span>
                    <span className="ml-auto font-semibold text-ink">{formatNumber(entry.value, lang)} · {formatPercent(entry.percent, lang)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Throughput */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Metric label={t('Average time to verify')} value={data ? formatDuration(data.avgVerifyHours, lang) : '—'} />
        <Metric label={t('Average time to resolve')} value={data ? formatDuration(data.avgResolveHours, lang) : '—'} />
        <Metric label={t('Fixed rate')} value={data ? formatPercent(data.fixedRate, lang) : '—'} />
      </div>

      {/* Needs attention */}
      <section className="card p-[clamp(16px,2vw,24px)]">
        <h2 className="text-base font-bold text-ink">{t('Needs attention')}</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <AttentionList title={t('Oldest still reported')} rows={data?.needsAttention.oldest ?? []} lang={lang} t={t} overdue={false} />
          <AttentionList title={t('Open more than 7 days')} rows={data?.needsAttention.overdue ?? []} lang={lang} t={t} overdue />
          <AttentionList title={t('Most verifications')} rows={data?.needsAttention.mostVerified ?? []} lang={lang} t={t} overdue={false} showVerifications />
        </div>
        {data?.cannotFixReasons?.length ? (
          <div className="mt-5 border-t border-ink/10 pt-4">
            <h3 className="text-sm font-bold text-ink">{t('Top cannot-fix reasons')}</h3>
            <ul className="mt-2 space-y-1 text-sm text-ink/75">
              {data.cannotFixReasons.slice(0, 5).map((row) => (
                <li key={row.reason} className="flex items-center justify-between gap-3">
                  <span className="truncate">{row.reason}</span>
                  <span className="font-semibold text-ink">{formatNumber(row.count, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  )
}

const tooltipStyle = {
  borderRadius: '10px',
  borderColor: 'rgba(11,74,111,0.12)',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(11,74,111,0.12)',
}

function Metric({ label, value }) {
  return (
    <div className="card p-[clamp(16px,2vw,24px)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink/55">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
    </div>
  )
}

function AttentionList({ title, rows, lang, t, overdue = false, showVerifications = false }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-ink">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink/50">{t('No data in this range.')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/reports/${row.id}`} className="block rounded-lg border border-ink/10 bg-white p-2.5 hover:bg-surface/50">
                <span className="line-clamp-1 text-sm font-semibold text-ink">{row.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/55">
                  <StatusBadge status={row.status} />
                  {overdue ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {t('Overdue')}
                    </span>
                  ) : null}
                  <span>{formatDate(row.createdAt, lang)}</span>
                  {showVerifications ? <span>· {formatNumber(row.verifications, lang)}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
