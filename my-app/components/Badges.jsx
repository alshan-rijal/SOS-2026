import { CircleCheck, Clock, LoaderCircle } from 'lucide-react'
import { SEVERITY_CONFIG, STATUS_CONFIG } from '@/lib/reports'

const STATUS_ICONS = {
  pending: Clock,
  in_progress: LoaderCircle,
  resolved: CircleCheck,
}

export function StatusBadge({ status, className = '' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = STATUS_ICONS[status] ?? Clock
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cfg.badge} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

export function SeverityBadge({ severity, className = '' }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.medium
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cfg.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}
