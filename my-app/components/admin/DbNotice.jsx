'use client'

import { DatabaseZap } from 'lucide-react'
import { DB_UPDATE_NOTICE } from '@/lib/reports'
import { useLanguage } from '@/components/LanguageContext'

/** The calm notice shown when admin features need migrations 006–008. */
export default function DbNotice({ message = DB_UPDATE_NOTICE, className = '' }) {
  const { t } = useLanguage()
  return (
    <div
      role="status"
      className={`flex items-start gap-2.5 rounded-xl border border-ink/15 bg-surface p-4 text-sm text-ink ${className}`}
    >
      <DatabaseZap className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" strokeWidth={2} aria-hidden="true" />
      <span>{t(message)}</span>
    </div>
  )
}
