'use client'

import { Check } from 'lucide-react'
import { normalizeStatus, statusLabel } from '@/lib/reports'
import { formatDateTime, fullTimestamp } from '@/lib/format'
import { useLanguage } from '@/components/LanguageContext'

/**
 * Reported -> Under verification -> Being resolved -> Fixed / Can't be fixed.
 * Done steps are filled navy with a check, the current step is ringed in coral
 * with a soft pulse (the global reduced-motion rule stills it), future steps are
 * muted. Horizontal on wide screens, vertical on phones.
 *
 * `history` is the report_status_history list; it only supplies the date each
 * step was reached, so a missing history still renders (with no dates).
 */
export default function StatusStepper({ status, history = [], reason = '', changedByName = '', className = '' }) {
  const { t, lang } = useLanguage()
  const current = normalizeStatus(status)

  const steps = ['reported', 'under_verification', 'in_progress']
  steps.push(current === 'cannot_fix' ? 'cannot_fix' : 'fixed')

  const reachedAt = {}
  for (const row of history) {
    const key = normalizeStatus(row.toStatus)
    if (key && !reachedAt[key]) reachedAt[key] = row.createdAt
  }
  const currentIndex = Math.max(0, steps.indexOf(current))

  return (
    <div className={className}>
      <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2">
        {steps.map((step, index) => {
          const done = index < currentIndex
          const isCurrent = index === currentIndex
          const reached = reachedAt[step]

          return (
            <li key={step} className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-2">
              <span className="flex items-center gap-2 sm:w-full">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? 'bg-ink text-white'
                      : isCurrent
                        ? 'stepper-current bg-white text-ink ring-2 ring-accent'
                        : 'border border-ink/15 bg-white text-ink/35'
                  }`}
                  aria-hidden="true"
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </span>
                <span className="sm:hidden text-sm font-semibold text-ink">{statusLabel(step, lang)}</span>
              </span>
              <span className="min-w-0 sm:w-full">
                <span className="hidden text-sm font-semibold text-ink sm:block">
                  {statusLabel(step, lang)}
                </span>
                <span
                  className="mt-0.5 block text-xs text-ink/50"
                  title={reached ? fullTimestamp(reached, lang) : undefined}
                >
                  {reached ? formatDateTime(reached, lang) : t('Not reached yet')}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      {current === 'cannot_fix' && reason ? (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <h3 className="text-sm font-bold text-ink">{t("Why this can't be fixed")}</h3>
          <p className="mt-1.5 text-sm text-ink/80">{reason}</p>
          {changedByName || reachedAt.cannot_fix ? (
            <p className="mt-1.5 text-xs text-ink/50">
              {[changedByName, reachedAt.cannot_fix ? formatDateTime(reachedAt.cannot_fix, lang) : '']
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
