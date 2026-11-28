'use client'

import { useMemo } from 'react'
import { Radar } from 'lucide-react'
import {
  SIGNAL_MIN_REPORTS,
  ZONE_RADIUS_M,
  categoryLabel,
  formatZoneRadius,
  zoneBounds,
} from '@/lib/reports'
import { useLanguage } from '@/components/LanguageContext'

/**
 * Coral alert shown on the dashboard and map when a problem-prone zone holds
 * three or more reports. It reads the very zones the map draws, so its numbers
 * can never disagree with the circles. Clicking zooms the map to that zone.
 */
export default function SignalAlert({ zones = [], zoneRadius = ZONE_RADIUS_M, onFocus, className = '' }) {
  const { t, lang } = useLanguage()
  const loud = useMemo(
    () => zones.filter((zone) => zone.count >= SIGNAL_MIN_REPORTS).slice(0, 3),
    [zones]
  )
  if (loud.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {loud.map((zone) => (
        <button
          key={zone.id}
          type="button"
          onClick={() => onFocus?.({ bounds: zoneBounds(zone) })}
          className="flex w-full items-start gap-3 rounded-xl border border-accent bg-accent/10 p-3.5 text-left transition-colors duration-150 hover:bg-accent/15"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
            <Radar className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">
              {t('{n} reports near {label}', { n: zone.count, label: zone.label })}
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink/70">
              {categoryLabel(zone.categories[0]?.category, lang)}
              {zone.categories.length > 1
                ? ` ${t('+{n} more', { n: zone.categories.length - 1 })}`
                : ''}{' '}
              · {t('within about {r}.', { r: formatZoneRadius(zoneRadius) })}{' '}
              {t('Tap to zoom the map.')}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
