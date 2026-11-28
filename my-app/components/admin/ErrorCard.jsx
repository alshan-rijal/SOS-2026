'use client'

import { AlertTriangle, RotateCw } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'

/**
 * The small coral error card shown when an admin read or write fails. `message`
 * is the friendly copy from reportErrorMessage(); `detail` is the raw error and
 * only rendered in development; `onRetry` re-runs the failed request.
 */
export default function ErrorCard({ message, detail, onRetry, className = '' }) {
  const { t } = useLanguage()
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border border-accent/50 p-4 text-sm text-ink ${className}`}
      style={{ backgroundColor: 'rgba(255, 107, 90, 0.12)' }}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t(message || 'Something went wrong. Please try again.')}</p>
        {detail ? (
          <p className="mt-1 break-words font-mono text-[11px] leading-relaxed text-ink/55">{detail}</p>
        ) : null}
      </div>
      {onRetry ? (
        <button type="button" onClick={() => onRetry()} className="btn btn-outline h-9 shrink-0 px-3 text-xs">
          <RotateCw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
          {t('Try again')}
        </button>
      ) : null}
    </div>
  )
}
