'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listAuditLog } from '@/lib/admin'
import { formatDateTime } from '@/lib/format'
import Breadcrumbs from '@/components/Breadcrumbs'
import DbNotice from '@/components/admin/DbNotice'
import { useLanguage } from '@/components/LanguageContext'

export default function AdminActivity() {
  const { t, lang } = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbStale, setDbStale] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listAuditLog(supabase, 200)
      setRows(result.rows)
      setDbStale(result.dbStale)
    } catch (err) {
      setError(err?.message || 'Unable to load the activity log.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // Deferred so the fetch does not setState synchronously inside the effect.
    Promise.resolve().then(load)
  }, [load])

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Activity log' }]} />

      {dbStale ? <DbNotice /> : null}
      {error ? <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-ink">{error}</div> : null}

      <section className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-ink/8" />)}</div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink/60">{t('No data in this range.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface/60 text-xs font-semibold uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="py-3 pl-4 pr-3">{t('Reported')}</th>
                  <th className="py-3 pr-3">{t('Actions')}</th>
                  <th className="py-3 pr-3">{t('ID')}</th>
                  <th className="py-3 pr-3">{t('Public note')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap py-3 pl-4 pr-3 text-xs text-ink/60">{formatDateTime(row.created_at, lang)}</td>
                    <td className="py-3 pr-3 text-xs font-semibold text-ink">{row.action}</td>
                    <td className="py-3 pr-3 font-mono text-[11px] text-ink/50">{row.entity_id ? row.entity_id.slice(0, 8) : '—'}</td>
                    <td className="max-w-[320px] truncate py-3 pr-3 text-xs text-ink/70">{row.details ? JSON.stringify(row.details) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
