'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, FileDown, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ALL_STATUSES,
  CATEGORIES,
  SEVERITY_ORDER,
  categoryLabel,
  describeError,
  severityLabel,
  statusLabel,
} from '@/lib/reports'
import { RANGE_PRESETS, fetchAdminAnalytics, fetchAdminReports, logAdminAction, resolveRange } from '@/lib/admin'
import { formatDateTime, formatDuration, formatNumber, formatPercent } from '@/lib/format'
import Breadcrumbs from '@/components/Breadcrumbs'
import ErrorCard from '@/components/admin/ErrorCard'
import { useLanguage } from '@/components/LanguageContext'

const MAX_ROWS = 20000
const PAGE_SIZE = 1000

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])
}

export default function AdminExports() {
  const { t, lang } = useLanguage()
  const supabase = useMemo(() => createClient(), [])

  const [preset, setPreset] = useState('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [certainDays, setCertainDays] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('All')
  const [severity, setSeverity] = useState('all')
  const [confidential, setConfidential] = useState('exclude')
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [adminName, setAdminName] = useState('')

  // "Certain days" folds into the custom range.
  const range = useMemo(() => {
    if (certainDays && Number(certainDays) > 0) {
      const days = Number(certainDays)
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - (days - 1))
      from.setHours(0, 0, 0, 0)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    return resolveRange(preset, customFrom, customTo)
  }, [preset, customFrom, customTo, certainDays])

  const filterLabel = useMemo(
    () => ({ status, category, severity, confidential }),
    [status, category, severity, confidential]
  )

  // fetchAdminReports speaks 'all' | 'only' | 'hide'; this screen speaks
  // include | exclude | only. Map before every call so "Exclude" really hides
  // confidential reports (it previously fell through and included them).
  const confidentialParam =
    confidential === 'exclude' ? 'hide' : confidential === 'only' ? 'only' : 'all'

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle()
      setAdminName(profile?.full_name || data.user.email || '')
    })
  }, [supabase])

  const loadPreview = useCallback(async (guard) => {
    setPreviewing(true)
    setError(null)
    try {
      const [{ count }, analytics] = await Promise.all([
        fetchAdminReports(supabase, {
          status, category, severity, confidential: confidentialParam,
          from: range.from, to: range.to, pageSize: 1,
        }),
        fetchAdminAnalytics(supabase, range),
      ])
      if (guard?.cancelled) return
      setPreview({ count, analytics })
    } catch (err) {
      if (!guard?.cancelled) setError(describeError(err, 'admin export preview'))
    } finally {
      if (!guard?.cancelled) setPreviewing(false)
    }
  }, [supabase, status, category, severity, confidentialParam, range])

  useEffect(() => {
    const guard = { cancelled: false }
    Promise.resolve().then(() => loadPreview(guard))
    return () => {
      guard.cancelled = true
    }
  }, [loadPreview])

  /** Walk the range in pages of 1000, capped at 20,000 rows. */
  async function fetchAllRows() {
    const rows = []
    let page = 1
    let capped = false
    for (;;) {
      const { rows: chunk, count } = await fetchAdminReports(supabase, {
        status, category, severity, confidential: confidentialParam,
        from: range.from, to: range.to, page, pageSize: PAGE_SIZE, sort: 'newest',
      })
      rows.push(...chunk)
      setProgress({ loaded: rows.length, total: Math.min(count, MAX_ROWS) })
      if (chunk.length < PAGE_SIZE || rows.length >= MAX_ROWS) {
        if (rows.length > MAX_ROWS) rows.length = MAX_ROWS
        if (count > MAX_ROWS) capped = true
        break
      }
      page += 1
    }
    return { rows, capped }
  }

  async function exportCsv() {
    setError(null)
    try {
      const { rows, capped } = await fetchAllRows()
      const headers = ['ID', 'Title', 'Category', 'Place', 'Severity', 'Status', 'Reported', 'Resolved', 'Cannot-fix reason', 'Verifications', 'Reporter', 'Confidential']
      const body = rows.map((row) => [
        row.id, row.title, row.category, row.locationName, row.severity, row.status,
        formatDateTime(row.createdAt, 'en'), row.resolvedAt ? formatDateTime(row.resolvedAt, 'en') : '',
        row.statusReason || '', row.verifications, row.reporterName, row.isConfidential ? 'yes' : 'no',
      ])
      const text = [headers, ...body].map((line) => line.map(csvCell).join(',')).join('\n')
      // UTF-8 BOM so Excel opens Nepali text correctly.
      const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sajha-reports-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)

      await logAdminAction(supabase, {
        action: 'report.export',
        entity: 'report',
        details: { range, filters: filterLabel, rows: rows.length, format: 'csv', capped },
      })
    } catch (err) {
      setError(describeError(err, 'export CSV'))
    } finally {
      setProgress(null)
    }
  }

  async function printPdf() {
    setError(null)
    try {
      const { rows } = await fetchAllRows()
      const analytics = preview?.analytics
      const rangeText = `${formatDateTime(range.from, lang)} – ${formatDateTime(range.to, lang)}`
      const generated = formatDateTime(new Date(), lang)

      const statusRows = ALL_STATUSES.map((key) => ({ key, value: analytics?.byStatus?.[key] ?? 0 }))
      const categoryRows = (analytics?.byCategory ?? []).filter((row) => row.count > 0)
      const dayRows = analytics?.byDay ?? []
      const reasonRows = analytics?.cannotFixReasons ?? []

      const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<title>Sajha Pahal — ${escapeHtml(t('Export reports'))}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; color: #0b4a6f; margin: 0; }
  h1 { font-size: 20px; margin: 0; }
  h2 { font-size: 14px; margin: 18px 0 6px; }
  header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0b4a6f; padding-bottom: 10px; }
  header img { height: 40px; }
  .meta { font-size: 12px; color: rgba(11,74,111,0.7); margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid rgba(11,74,111,0.2); padding: 4px 6px; text-align: left; }
  th { background: #eaf4fb; }
  .kpis { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  .kpi { border: 1px solid rgba(11,74,111,0.15); border-radius: 8px; padding: 8px 12px; font-size: 12px; }
  .kpi b { display: block; font-size: 18px; }
  .page-break { page-break-before: always; }
  .coral { color: #ff6b5a; }
</style></head><body>
<header>
  <img src="/business-images/logo.png" alt="" />
  <div><h1>Sajha Pahal — ${escapeHtml(t('Export reports'))}</h1>
  <div class="meta">${escapeHtml(rangeText)} · ${escapeHtml(t('Generated'))}: ${escapeHtml(generated)} · ${escapeHtml(t('Generated by'))}: ${escapeHtml(adminName)}</div></div>
</header>
<h2>${escapeHtml(t('Summary'))}</h2>
<div class="kpis">
  <div class="kpi"><b>${formatNumber(analytics?.total ?? rows.length, lang)}</b>${escapeHtml(t('Total reports'))}</div>
  <div class="kpi"><b>${formatPercent(analytics?.fixedRate ?? 0, lang)}</b>${escapeHtml(t('Fixed rate'))}</div>
  <div class="kpi"><b>${formatDuration(analytics?.avgVerifyHours, lang)}</b>${escapeHtml(t('Average time to verify'))}</div>
  <div class="kpi"><b>${formatDuration(analytics?.avgResolveHours, lang)}</b>${escapeHtml(t('Average time to resolve'))}</div>
</div>
<h2>${escapeHtml(t('Status breakdown'))}</h2>
<table><thead><tr><th>${escapeHtml(t('Status'))}</th><th>${escapeHtml(t('Reports'))}</th></tr></thead><tbody>
${statusRows.map((row) => `<tr><td>${escapeHtml(statusLabel(row.key, lang))}</td><td>${row.value}</td></tr>`).join('')}
</tbody></table>
<h2>${escapeHtml(t('Issues by category'))}</h2>
<table><thead><tr><th>${escapeHtml(t('Category'))}</th><th>${escapeHtml(t('Reports'))}</th></tr></thead><tbody>
${categoryRows.map((row) => `<tr><td>${escapeHtml(categoryLabel(row.category, lang))}</td><td>${row.count}</td></tr>`).join('')}
</tbody></table>
${reasonRows.length ? `<h2>${escapeHtml(t('Top cannot-fix reasons'))}</h2><table><thead><tr><th>${escapeHtml(t('Reason'))}</th><th>${escapeHtml(t('Reports'))}</th></tr></thead><tbody>
${reasonRows.map((row) => `<tr><td>${escapeHtml(row.reason)}</td><td>${row.count}</td></tr>`).join('')}</tbody></table>` : ''}
<h2>${escapeHtml(t('Day-by-day count'))}</h2>
<table><thead><tr><th>${escapeHtml(t('Date'))}</th><th>${escapeHtml(t('Reports'))}</th></tr></thead><tbody>
${dayRows.map((row) => `<tr><td>${escapeHtml(row.day)}</td><td>${row.count}</td></tr>`).join('')}
</tbody></table>
<div class="page-break"></div>
<h2>${escapeHtml(t('Reports'))} (${rows.length})</h2>
<table><thead><tr>
<th>${escapeHtml(t('ID'))}</th><th>${escapeHtml(t('Title'))}</th><th>${escapeHtml(t('Category'))}</th><th>${escapeHtml(t('Place'))}</th>
<th>${escapeHtml(t('Severity'))}</th><th>${escapeHtml(t('Status'))}</th><th>${escapeHtml(t('Reported'))}</th><th>${escapeHtml(t('Resolved'))}</th><th>${escapeHtml(t('Reason'))}</th>
</tr></thead><tbody>
${rows.map((row) => `<tr>
<td>${escapeHtml(row.id.slice(0, 8))}</td><td>${escapeHtml(row.title)}</td><td>${escapeHtml(categoryLabel(row.category, lang))}</td>
<td>${escapeHtml(row.locationName)}</td><td>${escapeHtml(severityLabel(row.severity, lang))}</td><td>${escapeHtml(statusLabel(row.status, lang))}</td>
<td>${escapeHtml(formatDateTime(row.createdAt, lang))}</td><td>${row.resolvedAt ? escapeHtml(formatDateTime(row.resolvedAt, lang)) : ''}</td>
<td>${escapeHtml(row.statusReason || '')}</td></tr>`).join('')}
</tbody></table>
<script>window.onload = function () { window.print() }</script>
</body></html>`

      const win = window.open('', '_blank')
      if (!win) {
        setError({ message: t('Please allow pop-ups to print the report.'), detail: '' })
        return
      }
      win.document.write(html)
      win.document.close()

      await logAdminAction(supabase, {
        action: 'report.export',
        entity: 'report',
        details: { range, filters: filterLabel, rows: rows.length, format: 'pdf' },
      })
    } catch (err) {
      setError(describeError(err, 'export PDF'))
    } finally {
      setProgress(null)
    }
  }

  const summary = preview?.analytics

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Exports' }]} />

      {error ? <ErrorCard message={error.message} detail={error.detail} onRetry={loadPreview} /> : null}

      <section className="card p-[clamp(16px,2vw,24px)]">
        <h2 className="text-sm font-bold text-ink">{t('Date range')}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {RANGE_PRESETS.map((option) => (
            <button key={option.value} type="button" onClick={() => { setPreset(option.value); setCertainDays('') }} aria-pressed={preset === option.value && !certainDays}
              className={`chip h-9 rounded-full border px-3 text-xs font-semibold ${preset === option.value && !certainDays ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink/70'}`}>
              {t(option.label)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          {preset === 'custom' ? (
            <>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">{t('From')}
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="field h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none" /></label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">{t('To')}
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="field h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none" /></label>
            </>
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">{t('Certain days')}
            <input type="number" min="1" value={certainDays} onChange={(e) => setCertainDays(e.target.value)} placeholder={t('Number of days')} className="field h-10 w-36 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none" /></label>
        </div>
      </section>

      <section className="card p-[clamp(16px,2vw,24px)]">
        <h2 className="text-sm font-bold text-ink">{t('Filters')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filter label={t('Status')} value={status} onChange={setStatus} options={[{ value: 'all', label: t('All statuses') }, ...ALL_STATUSES.map((k) => ({ value: k, label: statusLabel(k, lang) }))]} />
          <Filter label={t('Category')} value={category} onChange={setCategory} options={[{ value: 'All', label: t('All categories') }, ...CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c, lang) }))]} />
          <Filter label={t('Severity')} value={severity} onChange={setSeverity} options={[{ value: 'all', label: t('All severities') }, ...SEVERITY_ORDER.map((s) => ({ value: s, label: severityLabel(s, lang) }))]} />
          <Filter label={t('Confidential')} value={confidential} onChange={setConfidential} options={[{ value: 'exclude', label: t('Exclude') }, { value: 'include', label: t('Include') }, { value: 'only', label: t('Only') }]} />
        </div>
        {confidential !== 'exclude' ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm font-medium text-ink">
            <AlertTriangle className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {t('Confidential reports are included. Handle this file carefully.')}
          </p>
        ) : null}
      </section>

      <section className="card p-[clamp(16px,2vw,24px)]">
        <h2 className="text-sm font-bold text-ink">{t('Live preview')}</h2>
        {previewing ? (
          <div className="mt-3 h-20 skeleton rounded-xl" />
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-ink/70">
              <span className="text-2xl font-bold text-ink">{formatNumber(preview?.count ?? 0, lang)}</span> {t('Reports in range')}
            </p>
            {summary ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {ALL_STATUSES.map((key) => (
                  <span key={key} className="rounded-full border border-ink/15 bg-white px-2.5 py-1 font-medium text-ink/70">
                    {statusLabel(key, lang)}: <span className="font-semibold text-ink">{formatNumber(summary.byStatus[key] ?? 0, lang)}</span>
                  </span>
                ))}
                <span className="rounded-full border border-ink/15 bg-white px-2.5 py-1 font-medium text-ink/70">
                  {t('Average time to verify')}: <span className="font-semibold text-ink">{formatDuration(summary.avgVerifyHours, lang)}</span>
                </span>
                <span className="rounded-full border border-ink/15 bg-white px-2.5 py-1 font-medium text-ink/70">
                  {t('Average time to resolve')}: <span className="font-semibold text-ink">{formatDuration(summary.avgResolveHours, lang)}</span>
                </span>
              </div>
            ) : null}
          </div>
        )}

        {progress ? (
          <p className="mt-3 text-sm font-medium text-ink/70">{t('Preparing {n} rows…', { n: progress.loaded })}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} disabled={previewing || Boolean(progress)} aria-busy={Boolean(progress)}
            className="btn btn-primary px-4">
            {progress ? <span className="btn-spinner" aria-hidden="true" /> : <FileDown className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />} {t('Download CSV')}
          </button>
          <button type="button" onClick={printPdf} disabled={previewing || Boolean(progress)} aria-busy={Boolean(progress)}
            className="btn btn-outline px-4">
            <Printer className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" /> {t('Print / Save as PDF')}
          </button>
          <a href="/admin" className="btn btn-outline px-4 text-ink/70">
            <Download className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" /> {t('Overview')}
          </a>
        </div>
      </section>
    </div>
  )
}

function Filter({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink/60">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}
        className="field h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
