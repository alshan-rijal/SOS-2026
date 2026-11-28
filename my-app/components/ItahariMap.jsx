'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LeafletContext, createLeafletContext } from '@react-leaflet/core'
import { Circle, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { Droplet, MapPin, Radar, TrafficCone, Trash2, Waves, Zap } from 'lucide-react'
import {
  ITAHARI_CENTER,
  SEVERITY_CONFIG,
  SEVERITY_ORDER,
  ZONE_MIN_REPORTS,
  ZONE_RADIUS_M,
  ZONE_TIER_COLOR,
  categoryLabel,
  formatZoneRadius,
  hasCoords,
  severityLabel,
  statusLabel,
  timeAgo,
  zoneBounds,
} from '../lib/reports'
import { useLanguage } from './LanguageContext'
import { eventPhase, formatEventDate, formatEventTimeRange } from '../lib/events'
import { eventIconSvg, eventTypeMeta, EVENT_TYPES } from './EventTypeIcon'
import { SeverityBadge, StatusBadge } from './Badges'

// Teardrop divIcon built from inline SVG — no image files, so the Next asset
// pipeline never touches Leaflet's default marker. The viewBox is 24×32 with the
// tip at (12, 32): height = width × 32/24 and iconAnchor [width / 2, height]
// drop the tip exactly on the report's coordinate at every size. The circular
// hole is a second subpath under fill-rule="evenodd", so the map shows through
// it. The inner span bobs gently, each pin slightly out of phase with its
// neighbour; prefers-reduced-motion freezes it (see globals.css).
const PIN_VIEWBOX_W = 24
const PIN_VIEWBOX_H = 32
const PIN_OUTLINE =
  'M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 7.4 10.5 20 10.5 20s10.5-12.6 10.5-20c0-5.8-4.7-10.5-10.5-10.5z'
const PIN_HOLE = 'M6.6 11.8a5.4 5.4 0 0 1 10.8 0 5.4 5.4 0 0 1-10.8 0z'

function pinIcon(pin, index, id = '') {
  const width = pin.size
  const height = (width * PIN_VIEWBOX_H) / PIN_VIEWBOX_W
  const html =
    `<span class="sos-pin is-enter${pin.pulse ? ' is-pulse' : ''}" data-pin-id="${id}" style="--pin-size:${width}px;` +
    `--pin-h:${height}px;--pin-index:${index}">` +
    `<span class="sos-pin-bob">` +
    `<svg viewBox="0 0 ${PIN_VIEWBOX_W} ${PIN_VIEWBOX_H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<path d="${PIN_OUTLINE} ${PIN_HOLE}" fill-rule="evenodd" ` +
    `fill="${pin.fill}" stroke="${pin.border}" stroke-width="2" stroke-linejoin="round"/></svg>` +
    `</span></span>`
  return L.divIcon({
    className: 'sos-pin-wrap',
    html,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  })
}

const CATEGORY_ICONS = {
  'Road & Potholes': TrafficCone,
  'Water Supply': Droplet,
  Electricity: Zap,
  'Waste Management': Trash2,
  Drainage: Waves,
}

const METERS_PER_DEG_LAT = 111320
// Zone pills only clutter the map once you are close enough to read them.
const ZONE_LABEL_MIN_ZOOM = 13

// One shared, empty anchor icon for label markers — the pill is the tooltip.
const ZONE_LABEL_ICON = L.divIcon({
  className: 'sos-zone-label',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
})

// Event pin: a white rounded badge holding the category icon, with a pointer
// below it. Height = badge + pointer, and iconAnchor drops the tip exactly on
// the event's coordinate. Only the inner element carries the entrance animation.
const EVENT_PIN_POINTER = 7

function eventPinIcon(type, size, index, id) {
  const height = size + EVENT_PIN_POINTER
  const html =
    `<span class="event-pin" data-event-id="${id}">` +
    `<span class="event-pin-inner is-enter" style="--b:${size}px;--h:${height}px;--i:${index}">` +
    `<span class="event-pin-badge">${eventIconSvg(type)}</span>` +
    `<span class="event-pin-tip"></span>` +
    `</span></span>`
  return L.divIcon({
    className: 'event-pin-wrap',
    html,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height],
  })
}

// Without a cluster plugin (none is allowed here), events that land on the same
// spot are merged into one badge with a count instead of stacking invisibly.
function groupBySpot(events) {
  const groups = new Map()
  for (const event of events) {
    const key = `${Number(event.latitude).toFixed(4)},${Number(event.longitude).toFixed(4)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(event)
  }
  return [...groups.values()].map((members) => ({
    lead: members[0],
    count: members.length,
    members,
  }))
}

// Phones get smaller pins and a collapsed legend. Read once on the client (the
// map is only ever mounted through dynamic ssr:false).
function useIsCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches
  )
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return compact
}

function PickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) })
    },
  })
  return null
}

// Fit the viewport to the markers the first time they arrive. Later data
// changes (a category filter, a join, a verification) must not move the map.
function FitToReports({ points, enabled }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (!enabled || fitted.current || points.length === 0) return
    fitted.current = true
    if (points.length === 1) {
      map.setView(points[0], 15)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 })
  }, [map, points, enabled])
  return null
}

// Fly smoothly when a parent (list item, zone card or signal alert) asks for a
// specific view. A fresh `focus` object each click re-triggers the flight, and
// reduced motion jumps straight to the target instead of animating.
function FocusController({ focus }) {
  const map = useMap()
  useEffect(() => {
    if (!focus) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (focus.bounds) {
      if (reduce) map.fitBounds(focus.bounds, { padding: [60, 60], maxZoom: 16, animate: false })
      else map.flyToBounds(focus.bounds, { padding: [60, 60], maxZoom: 16, duration: 0.8 })
    } else if (Number.isFinite(focus.lat)) {
      const zoom = focus.zoom ?? 16
      if (reduce) map.setView([focus.lat, focus.lng], zoom, { animate: false })
      else map.flyTo([focus.lat, focus.lng], zoom, { duration: 0.8 })
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

function ZonePopup({ zone, onViewReports }) {
  const map = useMap()
  const { t, lang } = useLanguage()
  return (
    <div className="w-[15rem] max-w-[78vw]">
      <p className="flex items-start gap-2 text-sm font-bold leading-snug text-ink">
        <Radar className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
        <span className="min-w-0 break-words">{zone.label}</span>
      </p>
      <p className="mt-1 text-xs text-ink/60">{t('{n} reports in this zone', { n: zone.count })}</p>

      <ul className="mt-2.5 space-y-1">
        {zone.categories.map(({ category, count }) => {
          const Icon = CATEGORY_ICONS[category] ?? MapPin
          return (
            <li key={category} className="flex items-center gap-2 text-xs text-ink/75">
              <Icon className="h-3.5 w-3.5 shrink-0 text-ink/55" strokeWidth={2.2} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{categoryLabel(category, lang)}</span>
              <span className="font-semibold text-ink/55">{count}</span>
            </li>
          )
        })}
      </ul>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SEVERITY_ORDER.filter((key) => zone.severities[key] > 0).map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-ink/75"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: SEVERITY_CONFIG[key].pin.fill }}
              aria-hidden="true"
            />
            {severityLabel(key, lang)} {zone.severities[key]}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            map.flyToBounds(L.latLngBounds(zoneBounds(zone)), {
              padding: [40, 40],
              maxZoom: 16,
              duration: 0.8,
            })
          }
          className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
        >
          {t('Zoom to zone')}
        </button>
        {onViewReports ? (
          <button
            type="button"
            onClick={() => onViewReports(zone)}
            className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-ink/5"
          >
            {t('View reports')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * One circle per problem-prone zone, colour-coded by severity tier (coral when
 * the zone holds a high/critical report, navy otherwise) with a slow pulse
 * ring, a pill label lifted above the zone's north edge and clamped inside the
 * map, and a popup. Every zone gets its own circle, so several show at once.
 * The member pins stay on top of the circle, their tips on their own
 * coordinates.
 */
function ZoneLayer({ zones, selectedZoneId, onViewReports }) {
  const map = useMap()
  const { t } = useLanguage()
  const [zoom, setZoom] = useState(() => map.getZoom())

  // Keep every pill inside the map frame by nudging its inner span. A transform
  // (not a margin) is used so Leaflet's own tooltip width measurement — and
  // with it the pill's centring — never changes.
  const clampLabels = useCallback(() => {
    const container = map.getContainer()
    const frame = container.getBoundingClientRect()
    container.querySelectorAll('.sos-zone-pill').forEach((pill) => {
      pill.style.transform = 'none'
      const rect = pill.getBoundingClientRect()
      let shift = 0
      if (rect.left < frame.left + 8) shift = frame.left + 8 - rect.left
      else if (rect.right > frame.right - 8) shift = frame.right - 8 - rect.right
      pill.style.transform = shift ? `translateX(${Math.round(shift)}px)` : ''
    })
  }, [map])

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: clampLabels,
    resize: clampLabels,
  })

  useEffect(() => {
    clampLabels()
  }, [zones, zoom, clampLabels])

  const topId = zones[0]?.id
  const showLabels = zoom >= ZONE_LABEL_MIN_ZOOM

  return zones.map((zone) => {
    const center = [zone.center.lat, zone.center.lng]
    const tier = zone.severityTier ?? 'moderate'
    const color = ZONE_TIER_COLOR[tier]
    const strong = zone.id === topId || zone.id === selectedZoneId
    return (
      <Fragment key={zone.id}>
        <Circle
          center={center}
          radius={zone.drawRadius}
          pathOptions={{
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: strong ? 0.28 : 0.18,
          }}
        >
          <Popup maxWidth={280} minWidth={240}>
            <ZonePopup zone={zone} onViewReports={onViewReports} />
          </Popup>
        </Circle>
        <Circle
          center={center}
          radius={zone.drawRadius}
          interactive={false}
          /* react-leaflet drops pathOptions.className, so the class goes in as a
             construction option for the SVG renderer to apply. */
          className="sos-zone-pulse"
          pathOptions={{ color, weight: 2, fill: false }}
        />
        {showLabels ? (
          <Marker
            position={[zone.center.lat + zone.drawRadius / METERS_PER_DEG_LAT, zone.center.lng]}
            interactive={false}
            keyboard={false}
            icon={ZONE_LABEL_ICON}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -8]}
              opacity={1}
              className="sos-zone-label-tip"
            >
              <span className={`sos-zone-pill is-${tier}`}>
                <span className="sos-zone-full">
                  {t(tier === 'high' ? 'High-severity zone' : 'Problem-prone zone')} ·{' '}
                  {t('{n} issues', { n: zone.count })}
                </span>
                <span className="sos-zone-short">{t('Zone · {n}', { n: zone.count })}</span>
              </span>
            </Tooltip>
          </Marker>
        ) : null}
      </Fragment>
    )
  })
}

function ReportPopup({ report, currentUserId, onVerify, isVerifying }) {
  const { t, lang, localize } = useLanguage()
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
          {t('No photo attached')}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge severity={report.severity} />
        <StatusBadge status={report.status} />
      </div>

      <p className="mt-2 break-words text-sm font-bold leading-snug text-ink">{report.title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
        <span className="inline-flex rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink">
          {categoryLabel(report.category, lang)}
        </span>
        {localize(report, 'locationName') ? (
          <span className="truncate">{localize(report, 'locationName')}</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-ink/55">
        {t(report.verifications === 1 ? '{n} verification' : '{n} verifications', {
          n: report.verifications,
        })}{' '}
        · {timeAgo(report.createdAt, lang)}
      </p>
      <p className="text-xs text-ink/55">{t('Reported by {name}', { name: report.reporterName })}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {isOwner ? (
          <span className="text-xs font-semibold text-ink/55">{t('You reported this')}</span>
        ) : onVerify ? (
          <button
            type="button"
            onClick={() => onVerify(report)}
            disabled={isVerifying || report.verifiedByMe}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70 ${
              report.verifiedByMe ? 'bg-surface text-ink' : 'bg-ink text-white hover:bg-ink/90'
            }`}
          >
            {isVerifying ? t('Saving…') : report.verifiedByMe ? t('Verified') : t('Verify')}
          </button>
        ) : (
          <Link href="/login" className="text-xs font-semibold text-ink hover:underline">
            {t('Sign in to verify')}
          </Link>
        )}

        <Link href={`/reports/${report.id}`} className="text-xs font-semibold text-ink hover:underline">
          {t('View details')}
        </Link>
      </div>
    </div>
  )
}

function EventPopup({ group, currentUserId, joining, onJoin, onLeave }) {
  const { t, lang, localize } = useLanguage()
  const event = group.lead
  const meta = eventTypeMeta(event.type)
  const phase = eventPhase(event)
  const full = Boolean(event.maxParticipants) && event.goingCount >= event.maxParticipants

  return (
    <div className="w-[15rem] max-w-[78vw]">
      <div className="flex items-center gap-2">
        <meta.Icon className="h-6 w-6 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">
          {t(meta.label)}
        </span>
      </div>

      <p className="mt-1.5 break-words text-sm font-bold leading-snug text-ink">
        {localize(event, 'title')}
      </p>
      <p className="mt-1 text-xs text-ink/60">
        {formatEventDate(event.eventDate, lang)} · {formatEventTimeRange(event)}
      </p>
      <p className="mt-0.5 break-words text-xs text-ink/60">
        {localize(event, 'address') || t('Location on the map')}
        {event.ward ? ` · ${event.ward}` : ''}
      </p>
      <p className="mt-1 text-xs font-semibold text-ink/70">
        {t('{n} people going', { n: event.goingCount })}
      </p>
      {group.count > 1 ? (
        <p className="mt-0.5 text-xs text-ink/55">{t('{n} events at this spot', { n: group.count })}</p>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {event.isOrganiser ? (
          <span className="text-xs font-semibold text-ink/55">{t('You are organising')}</span>
        ) : phase === 'ended' ? (
          <span className="text-xs font-semibold text-ink/55">{t('Ended')}</span>
        ) : !currentUserId ? (
          <Link href="/login" className="text-xs font-semibold text-ink hover:underline">
            {t('Sign in to join')}
          </Link>
        ) : full && !event.joined ? (
          <span className="text-xs font-semibold text-ink/55">{t('Event full')}</span>
        ) : (
          <button
            type="button"
            onClick={() => (event.joined ? onLeave(event) : onJoin(event))}
            disabled={joining}
            className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:opacity-70 ${
              event.joined ? 'bg-surface text-ink' : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {joining ? t('Saving…') : event.joined ? t('Leave') : t('Join')}
          </button>
        )}

        <Link href={`/events/${event.id}`} className="text-xs font-semibold text-ink hover:underline">
          {t('View details')}
        </Link>
      </div>
    </div>
  )
}

/**
 * Event pins and their zones. Approved upcoming and today events each get a
 * dashed navy circle at the event's own radius (default 150 m); today's circle
 * breathes gently. Past events keep their pin but lose the circle.
 *
 * `autoOpenEventId` opens that event's popup as if it had been clicked — used
 * when the category filter picks out a matching event.
 */
function EventLayer({
  events,
  compact,
  onSelectEvent,
  onJoin,
  onLeave,
  joiningId,
  currentUserId,
  autoOpenEventId = null,
}) {
  const map = useMap()
  const markers = useRef(new Map())
  const located = useMemo(() => events.filter(hasCoords), [events])
  const groups = useMemo(() => groupBySpot(located), [located])
  const active = located.filter((event) => eventPhase(event) !== 'ended')

  const icons = useMemo(() => {
    const size = compact ? 34 : 40
    const byId = new Map()
    groups.forEach((group, index) => {
      byId.set(group.lead.id, eventPinIcon(group.lead.type, size, index, group.lead.id))
    })
    return byId
  }, [groups, compact])

  // Open the chosen popup once the fly-to settles, so the popup's own auto-pan
  // never fights the flight. Nothing focused means whatever is open closes.
  useEffect(() => {
    if (!autoOpenEventId) {
      map.closePopup()
      return
    }
    const group = groups.find((entry) =>
      entry.members.some((member) => member.id === autoOpenEventId)
    )
    const marker = group ? markers.current.get(group.lead.id) : null
    if (!marker) return
    const open = () => marker.openPopup()
    map.once('moveend', open)
    return () => map.off('moveend', open)
  }, [map, groups, autoOpenEventId])

  return (
    <>
      {active.map((event) => {
        const center = [event.latitude, event.longitude]
        const radius = event.radiusM || 150
        const today = eventPhase(event) === 'today'
        return (
          <Fragment key={`zone-${event.id}`}>
            <Circle
              center={center}
              radius={radius}
              pathOptions={{
                color: '#0b4a6f',
                weight: 2,
                dashArray: '6 6',
                fillColor: '#0b4a6f',
                fillOpacity: 0.08,
              }}
            />
            {today ? (
              <Circle
                center={center}
                radius={radius}
                interactive={false}
                className="event-zone-pulse"
                pathOptions={{ color: '#0b4a6f', weight: 2, fill: false }}
              />
            ) : null}
          </Fragment>
        )
      })}

      {groups.map((group) => (
        <Marker
          key={group.lead.id}
          ref={(instance) => {
            if (instance) markers.current.set(group.lead.id, instance)
            else markers.current.delete(group.lead.id)
          }}
          position={[group.lead.latitude, group.lead.longitude]}
          icon={icons.get(group.lead.id)}
          zIndexOffset={500}
          eventHandlers={onSelectEvent ? { click: () => onSelectEvent(group.lead.id) } : undefined}
        >
          <Popup maxWidth={280} minWidth={240}>
            <EventPopup
              group={group}
              currentUserId={currentUserId}
              joining={joiningId === group.lead.id}
              onJoin={onJoin}
              onLeave={onLeave}
            />
          </Popup>
        </Marker>
      ))}
    </>
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
 * `zones` come from findProblemZones (see lib/reports.js) and are drawn as one
 * coral circle each. `focus` is a fresh { lat, lng, zoom } or { bounds } object
 * that flies the map to a location when it changes.
 *
 * shortcut: markers are not clustered — add a cluster plugin when a single view
 * routinely holds more than ~100 pins.
 */
export default function ItahariMap({
  reports = [],
  zones = [],
  selectedId = null,
  selectedZoneId = null,
  onSelect,
  onPick = null,
  picked = null,
  height = '100%',
  className = '',
  zoom = 13,
  showLegend = false,
  showPopups = true,
  showZones = true,
  zoneRadius = ZONE_RADIUS_M,
  fitToReports = true,
  onVerify = null,
  verifyingId = null,
  currentUserId = null,
  onViewReports = null,
  focus = null,
  events = [],
  onSelectEvent = null,
  onJoinEvent = null,
  onLeaveEvent = null,
  joiningEventId = null,
  autoOpenEventId = null,
}) {
  const compact = useIsCompact()
  const { t, lang } = useLanguage()
  const located = useMemo(() => reports.filter(hasCoords), [reports])
  const points = useMemo(
    () => [
      ...located.map((report) => [report.latitude, report.longitude]),
      ...events.filter(hasCoords).map((event) => [event.latitude, event.longitude]),
    ],
    [located, events]
  )

  // Stable icons: identity changes only when the report set (or pin scale)
  // changes, so selecting a pin never replays the drop-in animation.
  const icons = useMemo(() => {
    const map = new Map()
    const scale = compact ? 0.82 : 1
    located.forEach((report, index) => {
      const config = SEVERITY_CONFIG[report.severity] ?? SEVERITY_CONFIG.medium
      map.set(report.id, pinIcon({ ...config.pin, size: Math.round(config.pin.size * scale) }, index, report.id))
    })
    return map
  }, [located, compact])

  const legend = (
    <>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
        {t('Severity')}
      </p>
      <ul className="space-y-1">
        {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
          <li key={key} className="flex items-center gap-2 text-xs text-ink/70">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: config.pin.fill }}
              aria-hidden="true"
            />
            {severityLabel(key, lang)}
          </li>
        ))}
      </ul>
      <p className="mb-1.5 mt-2 border-t border-ink/10 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
        {t('Zones')}
      </p>
      <ul className="space-y-1">
        <li className="flex items-center gap-2 text-xs text-ink/70">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          {t('High-severity zone ({n}+ reports within {r}, a high or critical one among them)', {
            n: ZONE_MIN_REPORTS,
            r: formatZoneRadius(zoneRadius),
          })}
        </li>
        <li className="flex items-center gap-2 text-xs text-ink/70">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ink" aria-hidden="true" />
          {t('Other zone ({n}+ reports within {r})', {
            n: ZONE_MIN_REPORTS,
            r: formatZoneRadius(zoneRadius),
          })}
        </li>
        <li className="flex items-center gap-2 text-xs text-ink/70">
          <svg viewBox="0 0 24 32" className="h-3.5 w-3 shrink-0" aria-hidden="true">
            <path
              d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 7.4 10.5 20 10.5 20s10.5-12.6 10.5-20c0-5.8-4.7-10.5-10.5-10.5z"
              fill="#0b4a6f"
            />
          </svg>
          {t('Single report')}
        </li>
      </ul>

      {events.length > 0 ? (
        <>
          <p className="mb-1.5 mt-2 border-t border-ink/10 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
            {t('Events')}
          </p>
          <ul className="space-y-1">
            {EVENT_TYPES.map(({ key, label, Icon }) => (
              <li key={key} className="flex items-center gap-2 text-xs text-ink/70">
                <Icon className="h-4 w-4 shrink-0" />
                {t(label)}
              </li>
            ))}
            <li className="flex items-center gap-2 text-xs text-ink/70">
              <span
                className="h-3 w-4 shrink-0 rounded-full border-2 border-dashed border-ink"
                aria-hidden="true"
              />
              {t('Event area (its radius)')}
            </li>
          </ul>
        </>
      ) : null}
    </>
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

        <ZoneLayer
          zones={showZones ? zones : []}
          selectedZoneId={selectedZoneId}
          onViewReports={onViewReports}
        />

        {events.length > 0 ? (
          <EventLayer
            events={events}
            compact={compact}
            onSelectEvent={onSelectEvent}
            onJoin={onJoinEvent}
            onLeave={onLeaveEvent}
            joiningId={joiningEventId}
            currentUserId={currentUserId}
            autoOpenEventId={autoOpenEventId}
          />
        ) : null}

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
            {t('No reports with a map location yet.')}
          </p>
        </div>
      ) : null}

      {showLegend ? (
        /* One collapsible legend at every size. Leaflet's map pane sits at the
           same z-index as an open panel, so an always-open legend would paint
           over every popup; capped so it can never leave the map either. */
        <details className="absolute bottom-3 left-3 z-[400] max-w-[min(20rem,calc(100%-1.5rem))] rounded-xl bg-white/95 px-3 py-2 shadow-md ring-1 ring-ink/10">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-ink/60">
            {t('Legend')}
          </summary>
          <div className="mt-1.5 max-h-[min(18rem,50vh)] overflow-y-auto">{legend}</div>
        </details>
      ) : null}
    </div>
  )
}