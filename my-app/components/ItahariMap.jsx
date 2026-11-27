'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LeafletContext, createLeafletContext } from '@react-leaflet/core'
import { Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { ITAHARI_CENTER, SEVERITY_CONFIG, STATUS_CONFIG, hasCoords } from '../lib/reports'

// Round divIcon pin — avoids Leaflet's default marker image, which breaks under
// the Next/webpack asset pipeline. The label is the verification count.
function pinIcon(color, label, active) {
  const html =
    `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;` +
    `border-radius:9999px;background:${color};color:#fff;font-size:11px;font-weight:700;line-height:1;` +
    `border:2px solid ${active ? '#0b4a6f' : '#fff'};box-shadow:0 1px 4px rgba(11,74,111,.35)">${label}</span>`
  return L.divIcon({ className: '', html, iconSize: [28, 28], iconAnchor: [14, 14] })
}

function PickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) })
    },
  })
  return null
}

// Fit the viewport to the markers the first time they arrive, or to a single pin.
function FitToReports({ points, enabled }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 15)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 })
  }, [map, points, enabled])
  return null
}

// Why not react-leaflet's <MapContainer>? It builds the Leaflet map in a ref callback but removes
// it in an effect cleanup, keeping the instance alive. Next's route cache (plus Strict Mode / Fast
// Refresh) runs cleanups and re-runs effects without destroying the component — so the map is
// revived after map.remove() and <TileLayer> crashes with "appendChild of undefined".
// Creating the map inside the effect instead makes every (re)activation build a fresh, live map.
function SafeMap({ className, zoom, children }) {
  const hostRef = useRef(null)
  const [context, setContext] = useState(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const map = new L.Map(host, { scrollWheelZoom: false })
    map.setView([ITAHARI_CENTER.lat, ITAHARI_CENTER.lng], zoom)
    setContext(createLeafletContext(map))

    // Leaflet caches its pixel size; tell it when the container changes.
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(host)

    return () => {
      // Drop children first so they never re-attach to the removed map on reactivation.
      observer.disconnect()
      setContext(null)
      map.remove()
    }
  }, [zoom])

  return (
    <div ref={hostRef} className={className}>
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  )
}

function ReportPopup({ report }) {
  const severity = SEVERITY_CONFIG[report.severity] ?? SEVERITY_CONFIG.medium
  const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending
  return (
    <div className="min-w-[13rem] max-w-[16rem]">
      <p className="text-sm font-bold leading-snug text-ink">{report.title}</p>
      <p className="mt-1 text-xs text-ink/60">
        {report.category}
        {report.locationName ? ` · ${report.locationName}` : ''}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${severity.badge}`}>
          {severity.label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.badge}`}>
          {status.label}
        </span>
        <span className="text-[11px] text-ink/50">
          {report.verifications} {report.verifications === 1 ? 'verification' : 'verifications'}
        </span>
      </div>
      <Link
        href={`/reports/${report.id}`}
        className="mt-2.5 inline-block text-xs font-semibold text-accent-strong hover:underline"
      >
        View report details
      </Link>
    </div>
  )
}

/**
 * Shared Leaflet map. Only rendered through next/dynamic({ ssr: false }) because
 * Leaflet touches window on import.
 *
 * `reports` are normalised report objects; entries without valid coordinates are
 * skipped. Clicking a marker selects it (and opens its popup); in picker mode
 * (`onPick`) clicking the map returns the clicked coordinates instead.
 *
 * shortcut: markers are not clustered — add a cluster plugin when a single view
 * routinely holds more than ~100 pins.
 */
export default function ItahariMap({
  reports = [],
  selectedId = null,
  onSelect,
  onPick = null,
  picked = null,
  height = '100%',
  className = '',
  zoom = 13,
  showLegend = false,
  showPopups = true,
  fitToReports = true,
}) {
  const located = useMemo(() => reports.filter(hasCoords), [reports])
  const points = useMemo(
    () => located.map((report) => [report.latitude, report.longitude]),
    [located]
  )

  return (
    <div
      className={`relative z-0 w-full overflow-hidden rounded-2xl ring-1 ring-ink/10 ${className}`}
      style={{ height }}
    >
      <SafeMap className="h-full w-full" zoom={zoom}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {located.map((report) => {
          const config = SEVERITY_CONFIG[report.severity] ?? SEVERITY_CONFIG.medium
          const active = report.id === selectedId
          return (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={pinIcon(config.pinColor, report.verifications, active)}
              eventHandlers={onSelect ? { click: () => onSelect(report.id) } : undefined}
            >
              {showPopups ? (
                <Popup>
                  <ReportPopup report={report} />
                </Popup>
              ) : null}
            </Marker>
          )
        })}

        {picked ? (
          <Marker position={[picked.lat, picked.lng]} icon={pinIcon('#ff6b5a', '', true)} />
        ) : null}

        <FitToReports points={points} enabled={fitToReports} />
        {onPick ? <PickCapture onPick={onPick} /> : null}
      </SafeMap>

      {located.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70">
          <p className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-ink/70 shadow-sm ring-1 ring-ink/10">
            No reports with a map location yet.
          </p>
        </div>
      ) : null}

      {showLegend ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-lg bg-white/95 px-3 py-2 shadow-md ring-1 ring-ink/10">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
            Severity
          </p>
          <ul className="space-y-1">
            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
              <li key={key} className="flex items-center gap-2 text-xs text-ink/70">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: config.pinColor }}
                  aria-hidden="true"
                />
                {config.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
