// Shared report vocabulary (categories, statuses, severity) and every Supabase
// operation the app performs against the reports schema in supabase/schema.sql.

// `./i18n.js` keeps the file runnable by Node (scripts/check-zones.mjs), which
// does not resolve extensionless specifiers.
import { localizeField } from './i18n.js'

export const ITAHARI_CENTER = { lat: 26.6646, lng: 87.2718 }

export const CATEGORIES = [
  'Road & Potholes',
  'Water Supply',
  'Electricity',
  'Waste Management',
  'Drainage',
]

// The `issue_type_ne` side of a problem zone: categories are a fixed vocabulary,
// so their Nepali labels live here beside the list rather than in the database.
export const CATEGORY_LABELS_NE = {
  'Road & Potholes': 'सडक र खाल्डाखुल्डी',
  'Water Supply': 'खानेपानी',
  Electricity: 'बिजुली',
  'Waste Management': 'फोहोर व्यवस्थापन',
  Drainage: 'ढल निकास',
}

/** Category name in the reader's language, falling back to the stored value. */
export function categoryLabel(category, lang = 'en') {
  if (lang !== 'ne') return category
  return CATEGORY_LABELS_NE[category] ?? category
}

export const SEVERITY_LABELS_NE = {
  critical: 'अति गम्भीर',
  high: 'उच्च',
  medium: 'मध्यम',
  low: 'न्यून',
}

/** Severity name in the reader's language. */
export function severityLabel(severity, lang = 'en') {
  const fallback = SEVERITY_CONFIG[severity]?.label ?? severity
  if (lang !== 'ne') return fallback
  return SEVERITY_LABELS_NE[severity] ?? fallback
}

export const STATUS_LABELS_NE = {
  reported: 'रिपोर्ट गरिएको',
  under_verification: 'प्रमाणीकरणमा',
  in_progress: 'समाधान हुँदै',
  fixed: 'समाधान भयो',
  cannot_fix: 'समाधान गर्न नसकिने',
  // Legacy values, kept so a row that has not been migrated yet still reads.
  pending: 'रिपोर्ट गरिएको',
  resolved: 'समाधान भयो',
}

/**
 * The old three-value vocabulary still lives in reports.status until migration
 * 006 is applied. Everything reads status through this so both vocabularies map
 * to the five-step model without special-casing call sites.
 */
export function normalizeStatus(status) {
  if (status === 'pending') return 'reported'
  if (status === 'resolved') return 'fixed'
  return status
}

/** Status name in the reader's language. */
export function statusLabel(status, lang = 'en') {
  const key = normalizeStatus(status)
  const fallback = STATUS_CONFIG[key]?.label ?? status
  if (lang !== 'ne') return fallback
  return STATUS_LABELS_NE[key] ?? STATUS_LABELS_NE[status] ?? fallback
}

// Every badge uses only the four palette colours: ink #0b4a6f, accent #ff6b5a,
// surface #eaf4fb and white. `weight` drives the zone score; `pin` sizes and
// fills the teardrop markers on the map.
export const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    weight: 4,
    badge: 'bg-accent text-white border-accent',
    dot: 'bg-white/70',
    pin: { size: 38, fill: '#ff6b5a', border: '#0b4a6f', pulse: true },
  },
  high: {
    label: 'High',
    weight: 3,
    badge: 'bg-accent text-white border-accent',
    dot: 'bg-white/70',
    pin: { size: 33, fill: '#ff6b5a', border: '#ffffff', pulse: true },
  },
  medium: {
    label: 'Medium',
    weight: 2,
    badge: 'bg-ink text-white border-ink',
    dot: 'bg-white/70',
    pin: { size: 28, fill: '#0b4a6f', border: '#ffffff', pulse: false },
  },
  low: {
    label: 'Low',
    weight: 1,
    badge: 'bg-surface text-ink border-ink',
    dot: 'bg-ink',
    pin: { size: 23, fill: '#eaf4fb', border: '#0b4a6f', pulse: false },
  },
}

// Palette only, and distinct by fill *and* icon so colour is never the only
// signal. Icons are chosen in components/Badges.jsx and StatusBadge.
export const STATUS_CONFIG = {
  reported: {
    label: 'Reported',
    badge: 'bg-surface text-ink border-ink/20',
    dot: 'bg-ink',
    order: 1,
  },
  under_verification: {
    label: 'Under verification',
    badge: 'bg-white text-ink border-ink',
    dot: 'bg-ink',
    order: 2,
  },
  in_progress: {
    label: 'Being resolved',
    badge: 'bg-ink text-white border-ink',
    dot: 'bg-white',
    order: 3,
  },
  fixed: {
    label: 'Fixed',
    badge: 'bg-white text-ink border-ink border-2 font-bold',
    dot: 'bg-ink',
    order: 4,
    terminal: true,
  },
  cannot_fix: {
    label: "Can't be fixed",
    badge: 'bg-accent text-white border-accent',
    dot: 'bg-white',
    order: 4,
    terminal: true,
  },
}

export const SEVERITY_ORDER = Object.keys(SEVERITY_CONFIG)

// The linear steps the stepper walks; cannot_fix is the alternate terminal.
export const STATUS_ORDER = ['reported', 'under_verification', 'in_progress', 'fixed']
export const STATUS_TERMINAL_ALT = 'cannot_fix'
export const ALL_STATUSES = [...STATUS_ORDER, STATUS_TERMINAL_ALT]

/** The status that follows `status`, or null at a terminal step. */
export function nextStatus(status) {
  const key = normalizeStatus(status)
  const index = STATUS_ORDER.indexOf(key)
  if (index === -1) return 'under_verification'
  return STATUS_ORDER[index + 1] ?? null
}

export function isTerminalStatus(status) {
  const key = normalizeStatus(status)
  return key === 'fixed' || key === 'cannot_fix'
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'severity', label: 'Highest severity' },
]

export const PAGE_SIZE = 9

// Problem-prone zones: two located reports share a zone when they are at most
// ZONE_RADIUS_M apart. The radius is user-selectable (map toolbar) and kept in
// the URL. Sidebar signal alerts reuse the same zones so the two never disagree.
export const ZONE_RADIUS_M = 1000
export const ZONE_MIN_REPORTS = 2
// Capped at 1 km: a wider join radius merges unrelated streets into one blob.
export const ZONE_RADIUS_OPTIONS = [500, 1000]

// Zone circle colours. A zone holding any high/critical report is coral, every
// other zone is navy; the map, its legend and its pill labels share these.
export const ZONE_TIER_COLOR = { high: '#ff6b5a', moderate: '#0b4a6f' }

// Same-category "reports near this one" distance on the report detail page.
export const SIGNAL_RADIUS_METERS = 500
export const SIGNAL_MIN_REPORTS = 3

// `*` keeps every read working whether or not the optional bilingual columns
// (added by supabase/migrations/20261128_006_bilingual_content.sql) exist yet;
// the row mapper picks the fields it needs.
const REPORT_SELECT = '*,report_verifications(count)'

// `*` keeps profile reads working whether or not the optional columns
// (phone, ward, bio, avatar_url) have been added by schema.sql yet.
const PROFILE_SELECT = '*'

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

export function normalizeReport(row, verifiedIds) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    title_ne: row.title_ne ?? '',
    description: row.description ?? '',
    description_ne: row.description_ne ?? '',
    category: row.category,
    severity: row.severity,
    status: normalizeStatus(row.status),
    locationName: row.location_name ?? '',
    // Both hold the SQL `_ne` suffix so localizeField() reads the same field name
    // whatever the backend (see lib/i18n.js). Empty until the bilingual migration
    // has been applied.
    locationName_ne: row.location_name_ne ?? '',
    latitude: row.latitude,
    longitude: row.longitude,
    imageUrl: row.image_url || null,
    // Optional columns from migration 007; absent (undefined) until it is run.
    isConfidential: row.is_confidential === true,
    // Optional review columns from migration 006.
    statusReason: row.status_reason ?? '',
    officialNote: row.official_note ?? '',
    statusChangedAt: row.status_changed_at ?? null,
    verifiedAt: row.verified_at ?? null,
    resolvedAt: row.resolved_at ?? null,
    reporterName: row.reporter_name || 'Anonymous',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    verifications: row.report_verifications?.[0]?.count ?? 0,
    verifiedByMe: verifiedIds ? verifiedIds.has(row.id) : false,
  }
}

// Preset reasons offered when an admin marks a report cannot_fix. Stored as the
// free text the constraint checks, so the catalogue lives here only.
export const CANNOT_FIX_REASONS = [
  'Private property',
  'Outside municipal jurisdiction',
  'Needs major budget',
  'Duplicate report',
  'Cannot be located',
  'Other',
]

/**
 * True when an error means migration 006–008 has not been applied yet
 * (missing column, missing table, or a PostgREST "not found in schema").
 */
export function isDbUpdateError(error) {
  const code = error?.code
  return code === '42703' || code === '42P01' || code === 'PGRST204' || code === 'PGRST205'
}

/**
 * True when the database still has the pre-006 `report_status` enum, so a query
 * filtering on a new value like 'reported' is rejected with 22P02. This is the
 * same "database needs a migration" state and must fall back, not fail.
 */
export function isLegacyStatusError(error) {
  return error?.code === '22P02' && /report_status/.test(error?.message ?? '')
}

/** The calm notice shown when admin features need the new SQL. */
export const DB_UPDATE_NOTICE = 'Admin features need a database update.'

/** Shown when the status workflow itself is not ready yet (fix files not run). */
export const STATUS_WORKFLOW_UPDATE_NOTICE =
  'Status workflow needs a database update (run supabase/fix files).'

/**
 * True when the database accepts the new status workflow: the review column
 * exists and the enum has a new value. A read cannot see the check constraint,
 * but the column + value together catch every state before the fix has run. Any
 * other failure (network) leaves the buttons enabled.
 */
export async function statusWorkflowReady(supabase) {
  const { error } = await supabase
    .from('reports')
    .select('id,status_reason')
    .in('status', ['under_verification'])
    .limit(1)
  if (!error) return true
  return !(isDbUpdateError(error) || isLegacyStatusError(error))
}

export function hasCoords(report) {
  return (
    Number.isFinite(report.latitude) &&
    Number.isFinite(report.longitude) &&
    Math.abs(report.latitude) <= 90 &&
    Math.abs(report.longitude) <= 180 &&
    !(report.latitude === 0 && report.longitude === 0)
  )
}

export function severityWeight(severity) {
  return SEVERITY_CONFIG[severity]?.weight ?? 1
}

// ---------------------------------------------------------------------------
// Client-side geography: distances and problem-prone zones
// ---------------------------------------------------------------------------

const METERS_PER_DEG_LAT = 111320

/** Straight-line metres between two {lat,lng} points (equirectangular). */
export function metersBetween(a, b) {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180)
  const dLat = (a.lat - b.lat) * METERS_PER_DEG_LAT
  const dLng = (a.lng - b.lng) * METERS_PER_DEG_LAT * Math.cos(midLat)
  return Math.hypot(dLat, dLng)
}

const EARTH_RADIUS_M = 6371000

/** Great-circle metres between two {lat,lng} points (haversine). */
export function haversineMeters(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, h)))
}

/** Most common non-empty location name in a set of reports, or a coordinate label. */
function areaLabel(reports, center, lang = 'en') {
  const counts = new Map()
  for (const report of reports) {
    const name = localizeField(report, 'locationName', lang).trim()
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name
      bestCount = count
    }
  }
  return best || `Area near ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`
}

/**
 * Group located reports into problem-prone zones: two reports share a zone when
 * they are at most `radiusMeters` apart (haversine). Category and severity do
 * not matter — mixed problems in the same place count together. Every group of
 * at least `minReports` reports becomes a zone, strongest first. Computed
 * entirely on the client from reports already fetched.
 *
 * `lang` only affects the zone's display name, which comes from the report that
 * names the area (its Nepali twin when the reader is on Nepali).
 */
export function findProblemZones(
  reports,
  radiusMeters = ZONE_RADIUS_M,
  minReports = ZONE_MIN_REPORTS,
  lang = 'en'
) {
  const located = reports.filter(hasCoords)
  const coords = located.map((report) => ({ lat: report.latitude, lng: report.longitude }))
  const parent = located.map((_, index) => index)

  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]]
      index = parent[index]
    }
    return index
  }

  for (let i = 0; i < located.length; i += 1) {
    for (let j = i + 1; j < located.length; j += 1) {
      if (haversineMeters(coords[i], coords[j]) > radiusMeters) continue
      const rootI = find(i)
      const rootJ = find(j)
      if (rootI !== rootJ) parent[rootJ] = rootI
    }
  }

  const groups = new Map()
  located.forEach((report, index) => {
    const root = find(index)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(report)
  })

  return [...groups.values()]
    .filter((group) => group.length >= minReports)
    .map((group) => {
      const center = {
        lat: group.reduce((sum, r) => sum + r.latitude, 0) / group.length,
        lng: group.reduce((sum, r) => sum + r.longitude, 0) / group.length,
      }
      const farthest = group.reduce(
        (max, r) => Math.max(max, haversineMeters(center, { lat: r.latitude, lng: r.longitude })),
        0
      )

      const categoryCounts = new Map()
      const severities = { low: 0, medium: 0, high: 0, critical: 0 }
      let score = 0
      for (const report of group) {
        categoryCounts.set(report.category, (categoryCounts.get(report.category) ?? 0) + 1)
        if (severities[report.severity] !== undefined) severities[report.severity] += 1
        score += severityWeight(report.severity)
      }

      return {
        id: `zone-${group.map((r) => r.id).sort()[0]}`,
        memberIds: group.map((r) => r.id),
        reports: group,
        center,
        // Big enough to hold every member, never wider than the join radius.
        drawRadius: Math.min(Math.max(farthest + 150, 250), radiusMeters),
        count: group.length,
        score,
        severities,
        // One high/critical report is enough to call the whole zone high.
        severityTier: severities.critical + severities.high > 0 ? 'high' : 'moderate',
        categories: [...categoryCounts.entries()]
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
        label: areaLabel(group, center, lang),
      }
    })
    .sort((a, b) => b.score - a.score || b.count - a.count)
}

/** Lat/Lng bounds that fit a zone's circle, for fitBounds calls. */
export function zoneBounds(zone) {
  const dLat = zone.drawRadius / METERS_PER_DEG_LAT
  const dLng =
    zone.drawRadius / (METERS_PER_DEG_LAT * Math.cos((zone.center.lat * Math.PI) / 180))
  return [
    [zone.center.lat - dLat, zone.center.lng - dLng],
    [zone.center.lat + dLat, zone.center.lng + dLng],
  ]
}

/** Human label for a zone join radius: 500 → "500 m", 2500 → "2.5 km". */
export function formatZoneRadius(radiusMeters) {
  return radiusMeters >= 1000 ? `${radiusMeters / 1000} km` : `${radiusMeters} m`
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchMyVerifiedIds(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data } = await supabase
    .from('report_verifications')
    .select('report_id')
    .eq('user_id', user.id)

  return new Set((data ?? []).map((row) => row.report_id))
}

// PostgREST treats commas and parentheses as filter syntax, so strip them from
// user input before building an `or` search.
function sanitizeSearchTerm(term) {
  return term.replace(/[,()%\\]/g, ' ').trim()
}

export async function fetchReports(
  supabase,
  { search, category, status, severity, sort = 'newest', page = 1 } = {}
) {
  const build = (legacyStatus) => {
    // Confidential reports are hidden by RLS (migration 007); no client-side
    // filter is needed, and asking for the column would 400 before 007 exists.
    let query = supabase.from('reports').select(REPORT_SELECT, { count: 'exact' })

    const term = search ? sanitizeSearchTerm(search) : ''
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,location_name.ilike.%${term}%`
      )
    }
    if (category && category !== 'All') query = query.eq('category', category)
    if (status && status !== 'all') {
      query = legacyStatus
        ? query.eq('status', statusLegacyValue(status))
        : query.in('status', statusAliasList(status))
    }
    if (severity && severity !== 'all') query = query.eq('severity', severity)

    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sort === 'severity') {
      query = query.order('severity', { ascending: false }).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const from = (page - 1) * PAGE_SIZE
    return query.range(from, from + PAGE_SIZE - 1)
  }

  let { data, error, count } = await build(false)
  // Pre-006 enum: a filter on 'reported'/'fixed' is rejected; use the old value.
  if (error && isLegacyStatusError(error)) {
    const legacy = statusLegacyValue(status)
    if (!legacy) return { rows: [], count: 0 }
    ;({ data, error, count } = await build(true))
  }
  if (error) throw error

  return { rows: data ?? [], count: count ?? 0 }
}

// A status filter matches both vocabularies while the migration rolls out.
function statusAliasList(status) {
  if (status === 'reported') return ['reported', 'pending']
  if (status === 'fixed') return ['fixed', 'resolved']
  return [status]
}

// The single-value twin on the pre-006 enum, or null when the old vocabulary has
// no equivalent (under_verification, cannot_fix) — those match nothing.
function statusLegacyValue(status) {
  if (status === 'reported') return 'pending'
  if (status === 'fixed') return 'resolved'
  if (status === 'in_progress') return 'in_progress'
  return null
}

export async function fetchMapReports(supabase) {
  // Confidential reports are hidden by RLS (migration 007); no client-side
  // filter is needed, and asking for the column would 400 before 007 exists.
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data ?? []
}

export async function fetchReportStats(supabase) {
  const head = () => supabase.from('reports').select('id', { count: 'exact', head: true })
  // `.in` with both vocabularies keeps the count right before and after the
  // workflow migration. On the pre-006 enum the mix is rejected (22P02), so
  // fall back to the legacy value; a new-only status counts zero.
  const countFor = async (statuses, legacy) => {
    if (legacy.length === 0) return { count: 0, error: null }
    const res = await head().in('status', statuses)
    if (res.error && isLegacyStatusError(res.error)) return head().in('status', legacy)
    return res
  }

  const [total, reported, underVerification, inProgress, fixed, cannotFix, categories] =
    await Promise.all([
      head(),
      countFor(['reported', 'pending'], ['pending']),
      countFor(['under_verification'], []),
      countFor(['in_progress'], ['in_progress']),
      countFor(['fixed', 'resolved'], ['resolved']),
      countFor(['cannot_fix'], []),
      supabase.from('report_category_counts').select('category,count'),
    ])

  const error =
    total.error || reported.error || underVerification.error || inProgress.error || fixed.error
  if (error) throw error

  return {
    total: total.count ?? 0,
    reported: reported.count ?? 0,
    underVerification: underVerification.count ?? 0,
    inProgress: inProgress.count ?? 0,
    fixed: fixed.count ?? 0,
    cannotFix: cannotFix.count ?? 0,
    // Legacy aliases so older call sites keep reading a number.
    pending: reported.count ?? 0,
    resolved: fixed.count ?? 0,
    categories: categories.data ?? [],
  }
}

export async function fetchReport(supabase, id) {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error

  if (!data) return { row: null, history: [] }

  // `*` so the read survives whether or not 006 has added from_status/to_status.
  const { data: history, error: historyError } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', id)
    .order('created_at', { ascending: true })
  if (historyError) throw historyError

  return { row: data, history: history ?? [] }
}

/**
 * History rows with the admin name attached, read by the review page and the
 * detail stepper. Tolerates the pre-006 shape.
 */
export async function fetchReportHistory(supabase, reportId) {
  const { data, error } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const rows = data ?? []
  const changedByIds = [...new Set(rows.map((row) => row.changed_by).filter(Boolean))]
  const profiles = changedByIds.length ? await fetchProfilesByIds(supabase, changedByIds) : new Map()

  return rows.map((row) => ({
    id: row.id,
    fromStatus: normalizeStatus(row.from_status ?? null),
    toStatus: normalizeStatus(row.to_status ?? row.status),
    reason: row.reason ?? '',
    note: row.note ?? '',
    changedById: row.changed_by ?? null,
    changedByName: row.changed_by ? profiles.get(row.changed_by)?.full_name || '' : '',
    createdAt: row.created_at,
  }))
}

/** Reports the given user created, newest first, for the profile page. */
export async function fetchMyReports(supabase, userId) {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** How many verifications the user has given to other people's reports. */
export async function fetchVerificationsGiven(supabase, userId) {
  const { count, error } = await supabase
    .from('report_verifications')
    .select('report_id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

/** Public profile row, or null when the user has not created one yet. */
export async function fetchProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

/** Profiles for a set of user ids, keyed by id (used for "Verified by"). */
export async function fetchProfilesByIds(supabase, ids) {
  if (!ids || ids.length === 0) return new Map()
  const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).in('id', ids)
  if (error) throw error
  return new Map((data ?? []).map((row) => [row.id, row]))
}

/** Who verified a report, newest first. */
export async function fetchVerifiers(supabase, reportId, limit = 8) {
  const { data, error } = await supabase
    .from('report_verifications')
    .select('user_id, created_at')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const ids = (data ?? []).map((row) => row.user_id)
  const profiles = await fetchProfilesByIds(supabase, ids)
  return ids.map((id) => profiles.get(id) ?? { id, full_name: 'A neighbour', avatar_url: null })
}

/** Same-category reports within ~500 m of the given report (max `limit`). */
export async function fetchSimilarReports(supabase, report, limit = 3) {
  if (!hasCoords(report)) return []
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('category', report.category)
    .neq('id', report.id)
    .limit(50)
  if (error) throw error

  return (data ?? [])
    .filter(hasCoords)
    .map((row) => ({
      row,
      distance: metersBetween(
        { lat: report.latitude, lng: report.longitude },
        { lat: row.latitude, lng: row.longitude }
      ),
    }))
    .filter((entry) => entry.distance <= SIGNAL_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}

/** Fetch all reports and aggregate KPIs for /admin-panel. */
export async function fetchAdminAnalytics(supabase) {
  const [{ data: reports, error }, stats] = await Promise.all([
    supabase
      .from('reports')
      .select(REPORT_SELECT)
      .order('created_at', { ascending: false }),
    fetchReportStats(supabase),
  ])

  if (error) throw error
  return { reports: reports ?? [], stats }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createReport(supabase, payload) {
  const insert = (values) => supabase.from('reports').insert(values).select('id').single()

  let { data, error } = await insert(payload)
  // is_confidential only exists after migration 007.
  if (error && isDbUpdateError(error)) {
    const { is_confidential, ...rest } = payload
    ;({ data, error } = await insert(rest))
  }
  // Before migration 006 the status column is the old enum; 'reported' fails, so
  // fall back to 'pending'.
  if (error && (error.code === '22P02' || error.code === '23514')) {
    ;({ data, error } = await insert({ ...payload, status: 'pending' }))
  }
  if (error) throw error
  return data.id
}

/**
 * Move a report to a new status. The database trigger writes the history row, so
 * the app does not insert one here (that would duplicate it). `reason` is
 * required by the database for cannot_fix and for backward moves; `officialNote`
 * is the public note shown on the report page.
 *
 * `.select('id').single()` makes a write that changed nothing (RLS denied, or an
 * empty result) an error instead of a silent no-op, so callers never show
 * "Saved" for a row that was not updated.
 *
 * The review columns only exist after the fix files, so a missing-column error
 * retries with just the status.
 */
export async function updateReportStatus(supabase, reportId, status, { reason, officialNote } = {}) {
  const full = { status }
  if (reason) full.status_reason = reason
  if (officialNote) full.official_note = officialNote

  const apply = (values) =>
    supabase.from('reports').update(values).eq('id', reportId).select('id').single()

  let { data, error } = await apply(full)
  if (error && isDbUpdateError(error)) ({ data, error } = await apply({ status }))
  if (error) throw error
  if (!data) throw new Error('The report was not updated. Check your permissions and try again.')
}

/** Flip the confidential flag (owner while reported, admins always — via RLS). */
export async function setReportConfidential(supabase, reportId, isConfidential) {
  const { data, error } = await supabase
    .from('reports')
    .update({ is_confidential: isConfidential })
    .eq('id', reportId)
    .select('id')
    .single()
  if (error) throw error
  if (!data) throw new Error('The report was not updated. Check your permissions and try again.')
}

/** Permanently delete a report (restricted to admins via RLS). */
export async function deleteReport(supabase, reportId) {
  const { data, error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId)
    .select('id')
    .single()
  if (error) throw error
  if (!data) throw new Error('The report was not deleted. Check your permissions and try again.')
}

export async function setVerification(supabase, reportId, userId, verified) {
  if (verified) {
    const { error } = await supabase
      .from('report_verifications')
      .upsert({ report_id: reportId, user_id: userId }, { ignoreDuplicates: true })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('report_verifications')
      .delete()
      .eq('report_id', reportId)
      .eq('user_id', userId)
    if (error) throw error
  }
}

/** Insert or update the owner's profile row. */
export async function upsertProfile(supabase, userId, values) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...values })
  if (error) throw error
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function fileExtension(file, fallback) {
  return (file.name.split('.').pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export async function uploadReportImage(supabase, file, reportId) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be 5 MB or smaller.')
  }
  const ext = fileExtension(file, 'jpg')
  const path = `${reportId}/${Date.now()}.${ext || 'jpg'}`

  const { error } = await supabase.storage
    .from('report-images')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from('report-images').getPublicUrl(path)
  return data.publicUrl
}

/**
 * Upload a confidential report photo into the private bucket and return its
 * storage *path* — never a public URL. Render it with signedImageUrl().
 */
export async function uploadConfidentialReportImage(supabase, file, userId, reportId) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Images must be 5 MB or smaller.')
  const ext = fileExtension(file, 'jpg')
  const path = `${userId}/${reportId}/${Date.now()}.${ext || 'jpg'}`

  const { error } = await supabase.storage
    .from('issue-photos-confidential')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error

  return path
}

/** A 60-minute signed URL for a confidential photo (owner and admins only). */
export async function signedImageUrl(supabase, path, expiresIn = 3600) {
  if (!path) return ''
  const { data, error } = await supabase.storage
    .from('issue-photos-confidential')
    .createSignedUrl(path, expiresIn)
  if (error) throw error
  return data?.signedUrl ?? ''
}

/** Upload an avatar into the public "avatars" bucket and return its URL. */
export async function uploadAvatar(supabase, file, userId) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Profile photos must be 2 MB or smaller.')
  }
  const ext = fileExtension(file, 'jpg')
  const path = `${userId}/${Date.now()}.${ext || 'jpg'}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

// Dates, times and relative tags live in lib/format.js so every screen shows
// Nepal time (Asia/Kathmandu) with date + hour + minute, and Devanagari digits in
// Nepali. Re-exported here because callers already import them from ./reports.
export { formatDate, formatDateTime, timeAgo } from './format.js'

export function shortId(id) {
  return id ? id.slice(0, 8).toUpperCase() : '—'
}

/** Initials for an avatar fallback. */
export function initialsOf(name, fallback = '?') {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

// True for a browser network failure (offline, DNS, CORS) rather than a
// PostgREST response. fetch rejects with a TypeError, so matching on that keeps
// a genuine server message out of the "check your connection" bucket.
export function isNetworkError(error) {
  if (!error) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = typeof error === 'string' ? error : error?.message
  return error?.name === 'TypeError' && /fetch|network|load failed/i.test(message ?? '')
}

/**
 * Log a Supabase failure without ever printing an empty object.
 *
 * The previous logger built a fresh `{ code, message, details, hint }` object,
 * so any thrown value without those fields — a string, a plain Error, a bare
 * object — serialised to `{}` and hid the real cause. Log the fields as
 * separate arguments; when there is nothing structured to log, dump what the
 * value actually has plus its type.
 */
export function logSupabaseError(context, error) {
  const code = error?.code
  const message = error?.message
  if (code || message) {
    console.error('[Supabase]', context, code, message, error?.details, error?.hint, error)
    return
  }
  let dumped
  try {
    dumped = JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))
  } catch {
    dumped = String(error)
  }
  console.error('[Supabase]', context, dumped, typeof error)
}

/** The raw error as a short dev-only string, for an error card's detail line. */
export function errorDetail(error) {
  if (process.env.NODE_ENV !== 'development' || error == null || error === '') return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return `${error.name}: ${error.message}`
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error))
  } catch {
    return String(error)
  }
}

// Friendly wording for Supabase/PostgREST failures instead of raw error text.
// `context` names the failing request so the log line points at the caller.
export function reportErrorMessage(error, context = 'request') {
  logSupabaseError(context, error)

  const code = error?.code
  const status = error?.status
  const rawMessage = typeof error === 'string' ? error : error?.message
  const devDetail =
    process.env.NODE_ENV === 'development' && rawMessage ? ` (${rawMessage})` : ''

  if (isDbUpdateError(error) || isLegacyStatusError(error)) {
    return `${DB_UPDATE_NOTICE}${devDetail}`
  }
  if (code === '42501' || code === 'PGRST301' || status === 401 || status === 403) {
    return `You do not have permission to do that. Sign in and try again.${devDetail}`
  }
  if (isNetworkError(error)) {
    return `Could not reach the server. Check your connection and try again.${devDetail}`
  }
  if (code === '23514' || code === '23502') {
    return `Some report details were rejected. Check the values and try again.${devDetail}`
  }
  return `Unable to load reports. Please try again.${devDetail}`
}

/** `{ message, detail }` for an error card: friendly copy plus a dev-only line. */
export function describeError(error, context = 'request') {
  return { message: reportErrorMessage(error, context), detail: errorDetail(error) }
}