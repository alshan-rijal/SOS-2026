'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  categoryLabel,
  reportErrorMessage,
  severityLabel,
  shortId,
  updateReportStatus,
} from '@/lib/reports'
import { fetchQueue } from '@/lib/admin'
import { formatDateTime, timeAgo } from '@/lib/format'
import { SeverityBadge } from '@/components/Badges'
import Breadcrumbs from '@/components/Breadcrumbs'
import DbNotice from '@/components/admin/DbNotice'
import { useLanguage } from '@/components/LanguageContext'

export default function AdminQueue() {
  const { t, lang } = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('oldest')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { rows: next } = await fetchQueue(supabase, { sort })
      setRows(next)
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [supabase, sort])

  useEffect(() => {
    Promise.resolve().then(load)
  }, [load])

  async function verify(row) {
    setBusy(row.id)
    try {
      await updateReportStatus(supabase, row.id, 'under_verification')
      setRows((prev) => prev.filter((item) => item.id !== row.id))
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function rejectDuplicate(row) {
    setBusy(row.id)
    try {
      await updateReportStatus(supabase, row.id, 'cannot_fix', { reason: 'Duplicate report' })
      setRows((prev) => prev.filter((item) => item.id !== row.id))
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Verification queue' }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">{t('Oldest first. Verify to move a report to Under verification.')}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSort('oldest')} aria-pressed={sort === 'oldest'}
            className={`h-9 rounded-full border px-3 text-xs font-semibold ${sort === 'oldest' ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink/70'}`}>
            {t('Sorted by oldest')}
          </button>
          <button type="button" onClick={() => setSort('verifications')} aria-pressed={sort === 'verifications'}
            className={`h-9 rounded-full border px-3 text-xs font-semibold ${sort === 'verifications' ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink/70'}`}>
            {t('Sorted by verifications')}
          </button>
        </div>
      </div>

      {error ? <DbNotice message={error} /> : null}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-[14px] bg-white" />)}</div>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink/60">{t('Queue is empty.')}</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="card flex flex-wrap items-center gap-3 p-[clamp(16px,2vw,24px)]">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={row.severity} />
                  <span className="font-mono text-[11px] text-ink/50">{shortId(row.id)}</span>
                </div>
                <Link href={`/admin/reports/${row.id}`} className="mt-1.5 block font-semibold text-ink hover:underline">
                  <span className="line-clamp-1">{row.title}</span>
                </Link>
                <p className="mt-0.5 text-xs text-ink/55">
                  {categoryLabel(row.category, lang)} · {severityLabel(row.severity, lang)} · {row.locationName || '—'} ·{' '}
                  <span title={formatDateTime(row.createdAt, lang)}>{timeAgo(row.createdAt, lang)}</span> · {row.verifications} {t('Verifications')}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => verify(row)} disabled={busy === row.id}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50">
                  <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> {t('Verify')}
                </button>
                <button type="button" onClick={() => rejectDuplicate(row)} disabled={busy === row.id}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-ink/15 px-3.5 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50">
                  <Copy className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" /> {t('Reject as duplicate')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
