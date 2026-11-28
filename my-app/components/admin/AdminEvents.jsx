'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EVENTS_BACKEND, eventsErrorMessage } from '@/lib/events'
import { formatDateTime } from '@/lib/format'
import Breadcrumbs from '@/components/Breadcrumbs'
import EmptyState from '@/components/EmptyState'
import { useLanguage } from '@/components/LanguageContext'

/**
 * Events review reads the pending event applications when the Supabase events
 * backend is enabled. With the local backend (or before the events migrations)
 * there is nothing server-side to review, so the page says so.
 */
export default function AdminEvents() {
  const { t, lang } = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    const run = () => {
      if (!active) return
      if (EVENTS_BACKEND !== 'supabase') {
        setNotice('Events are not set up yet.')
        setLoading(false)
        return
      }
      supabase
        .from('event_applications')
        .select('id,event_id,status,submitted_at,organizer_name,events(title)')
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: true })
        .limit(100)
        .then(({ data, error }) => {
          if (!active) return
          if (error) setNotice(eventsErrorMessage(error))
          else setRows(data ?? [])
          setLoading(false)
        })
    }

    Promise.resolve().then(run)
    return () => {
      active = false
    }
  }, [supabase])

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Events review' }]} />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-[14px] bg-white" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title={notice || 'No upcoming events'} description={t('Applications waiting for review appear here.')} />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="card flex flex-wrap items-center gap-3 p-[clamp(16px,2vw,24px)]">
              <div className="min-w-0 flex-1">
                <Link href={`/events/${row.event_id}`} className="font-semibold text-ink hover:underline">
                  {row.events?.title || row.event_id}
                </Link>
                <p className="mt-0.5 text-xs text-ink/55">
                  {row.organizer_name || '—'} · {row.submitted_at ? formatDateTime(row.submitted_at, lang) : ''}
                </p>
              </div>
              <Link href={`/events/${row.event_id}`} className="inline-flex h-10 items-center rounded-xl border border-ink bg-white px-3.5 text-sm font-semibold text-ink hover:bg-surface">
                {t('Review')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
