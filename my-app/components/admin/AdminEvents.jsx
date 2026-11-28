'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EVENTS_BACKEND } from '@/lib/events'
import { describeError } from '@/lib/reports'
import { formatDateTime } from '@/lib/format'
import Breadcrumbs from '@/components/Breadcrumbs'
import EmptyState from '@/components/EmptyState'
import ErrorCard from '@/components/admin/ErrorCard'
import { useLanguage } from '@/components/LanguageContext'

/**
 * Events waiting for review. The review state lives on the `events` row itself
 * (status + submitted_at); event_applications holds only the private answers, so
 * this reads events directly. With the local backend (or before the events
 * migrations) there is nothing server-side to review, so the page says so.
 */
export default function AdminEvents() {
  const { t, lang } = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (guard) => {
    setLoading(true)
    setError(null)
    if (EVENTS_BACKEND !== 'supabase') {
      if (!guard?.cancelled) {
        setRows([])
        setLoading(false)
      }
      return
    }
    const { data, error: queryError } = await supabase
      .from('events')
      .select('id,title,organization_name,contact_name,submitted_at')
      .eq('status', 'pending_review')
      .order('submitted_at', { ascending: true })
      .limit(100)
    if (guard?.cancelled) return
    if (queryError) setError(describeError(queryError, 'admin events review'))
    else setRows(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const guard = { cancelled: false }
    Promise.resolve().then(() => load(guard))
    return () => {
      guard.cancelled = true
    }
  }, [load])

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Events review' }]} />

      {error ? <ErrorCard message={error.message} detail={error.detail} onRetry={load} /> : null}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-[14px]" />)}</div>
      ) : error ? null : rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={EVENTS_BACKEND === 'supabase' ? t('No events waiting for review') : t('Events are not set up yet.')}
          description={t('Applications waiting for review appear here.')}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="card card-hover row-hover flex flex-wrap items-center gap-3 p-[clamp(16px,2vw,24px)]">
              <div className="min-w-0 flex-1">
                <Link href={`/events/${row.id}`} className="font-semibold text-ink hover:underline">
                  {row.title || row.id}
                </Link>
                <p className="mt-0.5 text-xs text-ink/55">
                  {row.organization_name || row.contact_name || '—'} · {row.submitted_at ? formatDateTime(row.submitted_at, lang) : ''}
                </p>
              </div>
              <Link href={`/events/${row.id}`} className="btn btn-outline px-3.5">
                {t('Review')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
