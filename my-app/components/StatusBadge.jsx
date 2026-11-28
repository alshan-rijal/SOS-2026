'use client'

import { CircleCheck, CircleX, Clock, LoaderCircle, ShieldCheck } from 'lucide-react'
import { STATUS_CONFIG, normalizeStatus, statusLabel } from '@/lib/reports'
import { useLanguage } from '@/components/LanguageContext'

// Each status carries its own icon, so the badge is not read by colour alone.
const ICONS = {
  reported: Clock,
  under_verification: ShieldCheck,
  in_progress: LoaderCircle,
  fixed: CircleCheck,
  cannot_fix: CircleX,
}

const BADGE = 'chip inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold'

/**
 * The one status pill used on cards, tables, map popups and detail pages.
 * Pass `showIcon={false}` only where a neighbouring element already shows one.
 */
export default function StatusBadge({ status, className = '', showIcon = true }) {
  const { lang } = useLanguage()
  const key = normalizeStatus(status)
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.reported
  const Icon = ICONS[key] ?? Clock

  return (
    <span className={`${BADGE} ${cfg.badge} ${className}`}>
      {showIcon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" /> : null}
      {statusLabel(key, lang)}
    </span>
  )
}
