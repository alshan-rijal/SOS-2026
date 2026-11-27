'use client'

import { useMemo } from 'react'
import { Radar } from 'lucide-react'
import { findSignalClusters } from '@/lib/reports'

function boundsFor(reports) {
  const lats = reports.map((report) => report.latitude)
  const lngs = reports.map((report) => report.longitude)
  const pad = 0.005
  return [
    [Math.min(...lats) - pad, Math.min(...lngs) - pad],
    [Math.max(...lats) + pad, Math.max(...lngs) + pad],
  ]
}

/**
 * Coral alert shown on the dashboard and map when several reports of the same
 * category cluster within ~500 m. Clicking zooms the map to that cluster.
 */
export default function SignalAlert({ reports = [], onFocus, className = '' }) {
  const clusters = useMemo(() => findSignalClusters(reports).slice(0, 3), [reports])
  if (clusters.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {clusters.map((cluster) => (
        <button
          key={cluster.key}
          type="button"
          onClick={() => onFocus?.({ bounds: boundsFor(cluster.reports) })}
          className="flex w-full items-start gap-3 rounded-xl border border-accent bg-accent/10 p-3.5 text-left transition-colors duration-150 hover:bg-accent/15"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
            <Radar className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">
              {cluster.count} similar reports near {cluster.label}
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink/70">
              {cluster.category} · within about 500 m. Tap to zoom the map.
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
