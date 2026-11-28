// One place for every date, time and number the app shows.
//
// All civil timestamps are rendered in Nepal time (Asia/Kathmandu) with the date
// and the hour and minute, for example "28 Nov 2026, 3:07 PM". When the reader is
// on Nepali the same value uses the ne-NP formatter and Devanagari digits.
//
// `./i18n.js` keeps the extension so scripts/check-zones.mjs (plain Node) can
// resolve it.

import { t } from './i18n.js'

export const NEPAL_TZ = 'Asia/Kathmandu'

const NE_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']
const DEVANAGARI_RE = /[0-9]/g

/** "28 Nov 2026" -> "२८ Nov २०२६" style digit swap. */
export function toDevanagari(input) {
  return String(input ?? '').replace(DEVANAGARI_RE, (digit) => NE_DIGITS[Number(digit)])
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function part(date, lang, options, numerals = false) {
  const loc = lang === 'ne' ? (numerals ? 'ne-NP-u-nu-deva' : 'ne-NP') : 'en-GB'
  return new Intl.DateTimeFormat(loc, { timeZone: NEPAL_TZ, ...options }).format(date)
}

function withDigits(text, lang) {
  return lang === 'ne' ? toDevanagari(text) : text
}

/** "28 Nov 2026" */
export function formatDate(value, lang = 'en') {
  const date = toDate(value)
  if (!date) return '—'
  return withDigits(part(date, lang, { day: 'numeric', month: 'short', year: 'numeric' }), lang)
}

/** "28 Nov 2026, 3:07 PM" — the app's standard timestamp. */
export function formatDateTime(value, lang = 'en') {
  const date = toDate(value)
  if (!date) return '—'
  const day = part(date, lang, { day: 'numeric', month: 'short', year: 'numeric' })
  const clock = part(date, lang, { hour: 'numeric', minute: '2-digit', hour12: true }, true)
  return withDigits(`${day}, ${clock}`, lang)
}

/** "28 Nov 2026, 3:07 PM" used as a title tooltip for a relative tag. */
export function fullTimestamp(value, lang = 'en') {
  return formatDateTime(value, lang)
}

/** "5 min ago" — pass the same lang as the page. */
export function timeAgo(value, lang = 'en') {
  const date = toDate(value)
  if (!date) return '—'
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return t(lang, 'Just now')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return t(lang, '{n} min ago', { n: withDigits(String(minutes), lang) })
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return t(lang, hours === 1 ? '{n} hour ago' : '{n} hours ago', {
      n: withDigits(String(hours), lang),
    })
  }
  const days = Math.round(hours / 24)
  if (days < 7) {
    return t(lang, days === 1 ? '{n} day ago' : '{n} days ago', {
      n: withDigits(String(days), lang),
    })
  }
  return formatDate(date, lang)
}

/** A duration in hours as "3 hr" / "2 days" / "45 min". */
export function formatDuration(hours, lang = 'en') {
  if (hours == null || Number.isNaN(hours)) return '—'
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60))
    return t(lang, '{n} min', { n: withDigits(String(minutes), lang) })
  }
  if (hours < 48) {
    const value = Math.round(hours * 10) / 10
    return t(lang, '{n} hr', { n: withDigits(String(value), lang) })
  }
  const days = Math.round((hours / 24) * 10) / 10
  return t(lang, '{n} days', { n: withDigits(String(days), lang) })
}

/** Counts, so a Nepali reader sees Devanagari digits. */
export function formatNumber(value, lang = 'en') {
  if (value == null || Number.isNaN(value)) return '—'
  return withDigits(new Intl.NumberFormat('en-US').format(value), lang)
}

/** "60%" with the right numerals. */
export function formatPercent(value, lang = 'en') {
  if (value == null || Number.isNaN(value)) return '—'
  return withDigits(`${Math.round(value)}%`, lang)
}
