'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LeafletContext, createLeafletContext } from '@react-leaflet/core'
import { Circle, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import {
  ITAHARI_CENTER,
  SEVERITY_CONFIG,
  buildAreaGrid,
  hasCoords,
  timeAgo,
} from '../lib/reports'
import { SeverityBadge, StatusBadge } from './Badges'

// Teardrop divIcon built from inline SVG — no image files, so the Next asset
// pipeline never touches Leaflet's default marker. Severity drives size + fill.
function pinIcon(pin, index, id = '') {
  const width = pin.size
  const height = Math.round(pin.size * 1.32)
  const html =
    `<span class="sos-pin is-enter${pin.pulse ? ' is-pulse' : ''}" data-pin-id="${id}" style="--pin-size:${width}px;` +
    `--pin-h:${height}px;--pin-index:${index}">` +
    `<svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<path d="M12 1C5.9 1 1 5.9 1 12c0 7.6 11 19 11 19s11-11.4 11-19c0-6.1-4.9-11-11-11z" ` +
    `fill="${pin.fill}" stroke="${pin.border}" stroke-width="2" stroke-linejoin="round"/></svg>` +
    `<span class="sos-pin-dot"></span></span>`
  return L.divIcon({
    className: 'sos-pin-wrap',
    html,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 6],
  })
}

function PickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) })
    },
  })
  return null
}

// Fit the viewport to the markers the first time they arrive.
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

// Fly smoothly when a parent (list item, hotspot card or signal alert) asks for
// a specific view. A fresh `focus` object each click re-triggers the flight.
function FocusController({ focus }) {
  const map = useMap()
  useEffect(() => {
    if (!focus) return
    if (focus.bounds) {
      map.flyToBounds(focus.bounds, { padding: [60, 60], maxZoom: 16, duration: 0.8 })
    } else if (Number.isFinite(focus.lat)) {
      map.flyTo([focus.lat, focus.lng], focus.zoom ?? 16, { duration: 0.8 })
    }
  }, [map, focus])
  return null
}

// Bounce the selected pin once, without recreating every icon (which would
// replay the drop-in animation on every selection change).
function SelectedStyler({ selectedId }) {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    // Retire pins that were active so dropping back to the base state cannot
    // replay the drop-in animation.
    container.querySelectorAll('.sos-pin.is-active').forEach((el) => {
      el.classList.remove('is-active')
      el.classList.remove('is-enter')
    })
    if (!selectedId) return
    const pin = container.querySelector(`.sos-pin[data-pin-id="${selectedId}"]`)
    if (!pin) return
    pin.classList.remove('is-enter')
    void pin.offsetWidth
    pin.classList.add('is-active')
  }, [map, selectedId])
  return null
}

function AreaLayers({ areas, hotspotKey }) {
  return areas.map((area) => {
    const center = [area.center.lat, area.center.lng]
    if (area.key === hotspotKey) {
      return (
        <Fragment key={area.key}>
          <Circle
            center={center}
            radius={area.radius}
            pathOptions={{ color: '#ff6b5a', weight: 2, fillColor: '#ff6b5a', fillOpacity: 0.3 }}
          />
          <Circle
            center={center}
            radius={area.radius}
            pathOptions={{ color: '#ff6b5a', weight: 3, fill: false, className: 'hotspot-ring' }}
          />
          <Circle
            center={center}
            radius={area.radius}
            pathOptions={{ opacity: 0, fill: false, interactive: false }}
          >
            <Tooltip permanent direction="auto" offset={[0, -8]} className="sos-hotspot-label">
              {`Most reported area · ${area.count} ${area.count === 1 ? 'issue' : 'issues'}`}
            </Tooltip>
          </Circle>
        </Fragment>
      )
    }
    return (
      <Circle
        key={area.key}
        center={center}
        radius={area.radius}
        pathOptions={{ color: '#0b4a6f', weight: 1, fillColor: '#0b4a6f', fillOpacity: 0.1 }}
      />
    )
  })
}

function ReportPopup({ report, currentUserId, onVerify, isVerifying }) {
  const isOwner = Boolean(currentUserId && report.userId && currentUserId === report.userId)
  return (
    <div className="w-[15rem] max-w-[78vw]">
      {report.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL */
        <img
          src={report.imageUrl}
          alt=""
          className="mb-2.5 h-28 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mb-2.5 flex h-16 w-full items-center justify-center rounded-lg bg-ink/5 text-xs font-medium text-ink/45">
          No photo attached
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge severity={report.severity} />
        <StatusBadge status={report.status} />
      </div>

      <p className="mt-2 break-words text-sm font-bold leading-snug text-ink">{report.title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
        <span className="inline-flex rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink">
          {report.category}
        </span>
        {report.locationName ? <span className="truncate">{report.locationName}</span> : null}
      </p>
      <p className="mt-1 text-xs text-ink/55">
        {report.verifications} {report.verifications === 1 ? 'verification' : 'verifications'} ·{' '}
        {timeAgo(report.createdAt)}
      </p>
      <p className="text-xs text-ink/55">Reported by {report.reporterName}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {isOwner ? (
          <span className="text-xs font-semibold text-ink/55">You reported this</span>
        ) : onVerify ? (
          <button
            type="button"
            onClick={() => onVerify(report)}
            disabled={isVerifying || report.verifiedByMe}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70 ${
              report.verifiedByMe ? 'bg-surface text-ink' : 'bg-ink text-white hover:bg-ink/90'
            }`}
          >
            {isVerifying ? 'Saving…' : report.verifiedByMe ? 'Verified' : 'Verify'}
          </button>
        ) : (
          <Link href="/login" className="text-xs font-semibold text-ink hover:underline">
            Sign in to verify
          </Link>
        )}

        <Link href={`/reports/${report.id}`} className="text-xs font-semibold text-ink hover:underline">
          View details
        </Link>
      </div>
    </div>
  )
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

/**
 * Shared Leaflet map. Only rendered through next/dynamic({ ssr: false }) because
 * Leaflet touches window on import.
 *
 * `reports` are normalised report objects; entries without valid coordinates are
 * skipped. Clicking a marker selects it (and opens its popup); in picker mode
 * (`onPick`) clicking the map returns the clicked coordinates instead.
 *
 * `focus` is a fresh { lat, lng, zoom } or { bounds } object that flies the map
 * to a location when it changes.
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
  showAreas = true,
  fitToReports = true,
  onVerify = null,
  verifyingId = null,
  currentUserId = null,
  focus = null,
}) {
  const located = useMemo(() => reports.filter(hasCoords), [reports])
  const points = useMemo(
    () => located.map((report) => [report.latitude, report.longitude]),
    [located]
  )
  const areas = useMemo(
    () => (showAreas ? buildAreaGrid(located) : []),
    [located, showAreas]
  )
  const hotspotKey = areas[0]?.key ?? null

  // Stable icons: identity changes only when the report set changes, so
  // selecting a pin never replays the drop-in animation.
  const icons = useMemo(() => {
    const map = new Map()
    located.forEach((report, index) => {
      const config = SEVERITY_CONFIG[report.severity] ?? SEVERITY_CONFIG.medium
      map.set(report.id, pinIcon(config.pin, index, report.id))
    })
    return map
  }, [located])

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

        <AreaLayers areas={areas} hotspotKey={hotspotKey} />

        {located.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={icons.get(report.id)}
            eventHandlers={onSelect ? { click: () => onSelect(report.id) } : undefined}
          >
            {showPopups ? (
              <Popup maxWidth={280} minWidth={240}>
                <ReportPopup
                  report={report}
                  currentUserId={currentUserId}
                  onVerify={onVerify}
                  isVerifying={verifyingId === report.id}
                />
              </Popup>
            ) : null}
          </Marker>
        ))}

        {picked ? (
          <Marker
            position={[picked.lat, picked.lng]}
            icon={pinIcon({ size: 34, fill: '#ff6b5a', border: '#0b4a6f', pulse: true }, 0)}
          />
        ) : null}

        <FitToReports points={points} enabled={fitToReports} />
        <FocusController focus={focus} />
        <SelectedStyler selectedId={selectedId} />
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
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl bg-white/95 px-3 py-2 shadow-md ring-1 ring-ink/10">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
            Severity
          </p>
          <ul className="space-y-1">
            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
              <li key={key} className="flex items-center gap-2 text-xs text-ink/70">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: config.pin.fill }}
                  aria-hidden="true"
                />
                {config.label}
              </li>
            ))}
          </ul>
          <p className="mb-1.5 mt-2 border-t border-ink/10 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
            Areas
          </p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2 text-xs text-ink/70">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
              Highest-problem area
            </li>
            <li className="flex items-center gap-2 text-xs text-ink/70">
              <span className="h-2.5 w-2.5 rounded-full bg-ink" aria-hidden="true" />
              Other areas
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}
