'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ALL_STATUSES, reportErrorMessage, statusLabel } from '@/lib/reports'
import { fetchAdminReports } from '@/lib/admin'
import Breadcrumbs from '@/components/Breadcrumbs'
import DbNotice from '@/components/admin/DbNotice'
import { useLanguage } from '@/components/LanguageContext'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[14px] bg-ink/5" />,
})

export default function AdminMap() {
  const { t, lang } = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchAdminReports(supabase, { confidential: 'all', pageSize: 500 })
      setRows(result.rows)
      setError('')
    } catch (err) {
      setError(reportErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    Promise.resolve().then(load)
  }, [load])

  const visible = useMemo(
    () => (status === 'all' ? rows : rows.filter((row) => row.status === status)),
    [rows, status]
  )
  const confidentialCount = rows.filter((row) => row.isConfidential).length

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }, { label: 'Map' }]} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[{ key: 'all', label: 'All' }, ...ALL_STATUSES.map((key) => ({ key, label: statusLabel(key, lang) }))].map((chip) => (
            <button key={chip.key} type="button" onClick={() => setStatus(chip.key)} aria-pressed={status === chip.key}
              className={`h-9 rounded-full border px-3 text-xs font-semibold ${status === chip.key ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink/70 hover:bg-ink/5'}`}>
              {chip.label}
            </button>
          ))}
        </div>
        <p className="ml-auto flex items-center gap-1.5 text-xs text-ink/60">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" /> {confidentialCount} {t('Confidential')}
        </p>
      </div>

      {error ? <DbNotice message={error} /> : null}

      <section className="card overflow-hidden">
        <div className="h-[clamp(360px,60vh,640px)]">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-ink/5" />
          ) : (
            <ItahariMap reports={visible} zones={[]} showZones={false} zoom={12} fitToReports className="h-full" />
          )}
        </div>
      </section>
      <p className="text-xs text-ink/55">{t('Confidential pins are ringed in coral and visible to admins only.')}</p>
    </div>
  )
}
