'use client'

import { SEVERITY_CONFIG, severityLabel } from '@/lib/reports'
import { eventStatusMeta } from '@/lib/events'
import { useLanguage } from '@/components/LanguageContext'

// StatusBadge moved to its own component (components/StatusBadge.jsx); it is
// re-exported here so existing `@/components/Badges` imports keep working.
export { default as StatusBadge } from '@/components/StatusBadge'

// One pill shape for every badge: same height, radius and font size.
const BADGE = 'chip inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold'

export function SeverityBadge({ severity, className = '' }) {
  const { lang } = useLanguage()
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.medium
  return (
    <span className={`${BADGE} ${cfg.badge} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {severityLabel(severity, lang)}
    </span>
  )
}

// Event review status. Palette only: surface/ink for pending, coral border for
// changes requested, filled navy for approved, plain navy border for the rest.
export function EventStatusBadge({ status, className = '' }) {
  const { t } = useLanguage()
  const cfg = eventStatusMeta(status)
  return <span className={`${BADGE} ${cfg.badge} ${className}`}>{t(cfg.label)}</span>
}

// "Upcoming" / "Today" / "Ended" — always computed from the date, never stored.
export function EventPhaseBadge({ phase, className = '' }) {
  const { t } = useLanguage()
  const config = {
    upcoming: { label: 'Upcoming', style: 'bg-surface text-ink border-ink/20' },
    today: { label: 'Today', style: 'bg-accent text-white border-accent' },
    ended: { label: 'Ended', style: 'bg-ink/5 text-ink/60 border-ink/15' },
  }[phase] ?? { label: 'Upcoming', style: 'bg-surface text-ink border-ink/20' }
  return <span className={`${BADGE} ${config.style} ${className}`}>{t(config.label)}</span>
}

// Marks the six example events seeded in local mode.
export function SampleBadge({ className = '' }) {
  const { t } = useLanguage()
  return (
    <span
      className={`${BADGE} bg-surface text-ink border-ink/20 ${className}`}
      title={t('Example data')}
    >
      {t('Sample')}
    </span>
  )
}
