'use client'

import { useId } from 'react'

// Flat two-tone event icons, drawn inline so the app carries no image files and
// every surface (pin, chip, card, form, profile) uses the same silhouette.
//
// The look: a solid coral #ff6b5a shape, its right half overlaid with
// rgba(11,74,111,0.18), and a white symbol sitting inside the shape. The overlay
// is intersected with the silhouette by two nested clip paths, so the tint never
// paints the transparent area around the icon.
//
// The artwork lives as strings so the very same drawing can be handed to Leaflet
// as pin markup (eventIconSvg) as well as rendered as React (EventTypeIcon).

const VIEW_BOX = '0 0 32 32'

function inner(shape, detail, uid) {
  return (
    `<defs>` +
    `<clipPath id="ev-h-${uid}"><rect x="16" y="0" width="16" height="32"/></clipPath>` +
    `<clipPath id="ev-b-${uid}"><path d="${shape}"/></clipPath>` +
    `</defs>` +
    `<path d="${shape}" fill="#ff6b5a"/>` +
    `<g clip-path="url(#ev-h-${uid})"><g clip-path="url(#ev-b-${uid})">` +
    `<rect width="32" height="32" fill="rgba(11,74,111,0.18)"/></g></g>` +
    detail
  )
}

const ART = {
  blood_donation: {
    shape: 'M16 2.5C16 2.5 5.5 14.5 5.5 20.5a10.5 10.5 0 0 0 21 0C26.5 14.5 16 2.5 16 2.5Z',
    detail:
      '<path d="M11.4 18.9h9.2v2.8h-9.2z M14.6 15.9h2.8v8.8h-2.8z" fill="#ffffff"/>',
  },
  tree_plantation: {
    shape:
      'M16 3c-4.7 0-8.5 3.8-8.5 8.5 0 2.6 1.2 4.9 3.1 6.4L8.5 22h4v7h7v-7h4l-2.1-4.1A8.5 8.5 0 0 0 16 3Z',
    detail: '<path d="M16 9c2.6 1.4 2.6 5 0 7.6C13.4 14 13.4 10.4 16 9Z" fill="#ffffff"/>',
  },
  flower_plantation: {
    shape:
      'M11 9.5a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z' +
      'M11 20.5a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z' +
      'M5.5 15a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z' +
      'M16.5 15a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z' +
      'M12.6 15a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0Z',
    detail: '<circle cx="16" cy="15" r="1.9" fill="#ffffff"/>',
  },
  cleanliness: {
    shape: 'M14.5 3h3v14h-3z M9 17h14l-2 11H11z',
    detail:
      '<path d="M13 19.5l-1.5 7M16 19.5v7M19 19.5l1.5 7" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>',
  },
  food_donation: {
    shape:
      'M3.5 14.5h25c0 6.9-5.6 12.5-12.5 12.5S3.5 21.4 3.5 14.5Z M8 14.5a8 8 0 0 1 16 0Z',
    detail:
      '<path d="M12.5 8.5c-1.4 1.6 1.4 2.6 0 4.2M19.5 8.5c-1.4 1.6 1.4 2.6 0 4.2" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  clothes_donation: {
    shape: 'M11 4l-7 3 2.5 6L9 11.8V28h14V11.8l2.5 1.2L28 7l-7-3a5 5 0 0 1-10 0Z',
    detail:
      '<path d="M12 5.5c1.2 2.4 6.8 2.4 8 0" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>',
  },
  health_camp: {
    shape:
      'M16 27S3 18.5 3 10.8A7.8 7.8 0 0 1 16 5.6 7.8 7.8 0 0 1 29 10.8C29 18.5 16 27 16 27Z',
    detail:
      '<path d="M7.5 15h3.7l2-3.6 3 7 2.5-4.9 1.4 1.5h4.4" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  awareness: {
    shape:
      'M6 13c0-1.1.9-2 2-2l14-5v20l-14-5a2 2 0 0 1-2-2z M9 20.5l4 1.4V28h-2a2 2 0 0 1-2-2z',
    detail:
      '<path d="M14 11.5v13M18 10v16" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>',
  },
  other: {
    shape:
      'M9.5 2h3v6h-3z M19.5 2h3v6h-3z M5 8a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z',
    detail:
      '<path d="M16 22.5s-4.2-3.3-4.2-5.7A2.9 2.9 0 0 1 16 15a2.9 2.9 0 0 1 4.2 1.8c0 2.4-4.2 5.7-4.2 5.7Z" fill="#ffffff"/>',
  },
}

let stringId = 0

/** Raw SVG markup for a type, for Leaflet divIcon html (no React involved). */
export function eventIconSvg(key) {
  const art = ART[key] ?? ART.other
  stringId += 1
  return `<svg viewBox="${VIEW_BOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner(art.shape, art.detail, `s${stringId}`)}</svg>`
}

function EventIcon({ artKey, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const art = ART[artKey] ?? ART.other
  return (
    <svg
      viewBox={VIEW_BOX}
      className={className}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: inner(art.shape, art.detail, uid) }}
    />
  )
}

export const EVENT_TYPES = [
  { key: 'blood_donation', label: 'Blood donation', shortLabel: 'Blood', Icon: (props) => <EventIcon artKey="blood_donation" {...props} /> },
  { key: 'tree_plantation', label: 'Tree plantation', shortLabel: 'Tree', Icon: (props) => <EventIcon artKey="tree_plantation" {...props} /> },
  { key: 'flower_plantation', label: 'Flower plantation', shortLabel: 'Flower', Icon: (props) => <EventIcon artKey="flower_plantation" {...props} /> },
  { key: 'cleanliness', label: 'Cleanliness drive', shortLabel: 'Clean-up', Icon: (props) => <EventIcon artKey="cleanliness" {...props} /> },
  { key: 'food_donation', label: 'Food donation', shortLabel: 'Food', Icon: (props) => <EventIcon artKey="food_donation" {...props} /> },
  { key: 'clothes_donation', label: 'Clothes donation', shortLabel: 'Clothes', Icon: (props) => <EventIcon artKey="clothes_donation" {...props} /> },
  { key: 'health_camp', label: 'Health camp', shortLabel: 'Health', Icon: (props) => <EventIcon artKey="health_camp" {...props} /> },
  { key: 'awareness', label: 'Awareness campaign', shortLabel: 'Awareness', Icon: (props) => <EventIcon artKey="awareness" {...props} /> },
  { key: 'other', label: 'Other', shortLabel: 'Other', Icon: (props) => <EventIcon artKey="other" {...props} /> },
]

const BY_KEY = Object.fromEntries(EVENT_TYPES.map((type) => [type.key, type]))

/** Metadata for a type key, falling back to "Other" for unknown values. */
export function eventTypeMeta(key) {
  return BY_KEY[key] ?? BY_KEY.other
}

/** The icon for a type key. Convenience for cards, chips and popups. */
export default function EventTypeIcon({ type, className = '' }) {
  const { Icon } = eventTypeMeta(type)
  return <Icon className={className} />
}
