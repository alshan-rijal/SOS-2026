'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ITAHARI_CENTER, SEVERITY_CONFIG } from '../lib/reports'

// Round divIcon pin showing the verification count — avoids Leaflet's default
// marker image, which breaks under the Next/Webpack asset pipeline.
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

// Leaflet touches window, so this must only be rendered via next/dynamic({ ssr: false }).
export default function ItahariMap({
  reports = [],
  selectedId = null,
  onSelect,
  onPick = null,
  picked = null,
  height = '100%',
  className = '',
}) {
  return (
    <div className={`relative z-10 w-full overflow-hidden rounded-2xl ${className}`} style={{ height }}>
      <MapContainer
        center={[ITAHARI_CENTER.lat, ITAHARI_CENTER.lng]}
        zoom={14}
        // shortcut: wheel-zoom off so the embedded/modal map never hijacks page scroll; drag + the
        // built-in +/- controls stay active. Turn on per-instance if a full-page map needs wheel zoom.
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.coords.lat, report.coords.lng]}
            icon={pinIcon(
              SEVERITY_CONFIG[report.severity].pinColor,
              report.verifications,
              report.id === selectedId
            )}
            eventHandlers={onSelect ? { click: () => onSelect(report.id) } : undefined}
          />
        ))}
        {picked && <Marker position={[picked.lat, picked.lng]} icon={pinIcon('#ff6b5a', '', true)} />}
        {onPick && <PickCapture onPick={onPick} />}
      </MapContainer>
    </div>
  )
}
