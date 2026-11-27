// Shared report vocabulary (categories, statuses, severity) and every Supabase
// operation the app performs against the reports schema in supabase/schema.sql.

export const ITAHARI_CENTER = { lat: 26.6646, lng: 87.2718 }

export const CATEGORIES = [
  'Road & Potholes',
  'Water Supply',
  'Electricity',
  'Waste Management',
  'Drainage',
]

// Every badge uses only the four palette colours: ink #0b4a6f, accent #ff6b5a,
// surface #eaf4fb and white. `weight` drives the hotspot score; `pin` sizes and
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

export const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    badge: 'bg-surface text-ink border-ink/30',
    dot: 'bg-ink',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'bg-ink text-white border-ink',
    dot: 'bg-ink',
  },
  resolved: {
    label: 'Resolved',
    badge: 'bg-white text-ink border-ink',
    dot: 'bg-ink',
  },
}

export const SEVERITY_ORDER = Object.keys(SEVERITY_CONFIG)
export const STATUS_ORDER = Object.keys(STATUS_CONFIG)

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'severity', label: 'Highest severity' },
]

export const PAGE_SIZE = 9

// Hotspot grouping and signal-alert distances.
export const AREA_SIZE_METERS = 300
export const AREA_RADIUS_METERS = 170
export const SIGNAL_RADIUS_METERS = 500
export const SIGNAL_MIN_REPORTS = 3

const REPORT_SELECT =
  'id,user_id,title,description,category,severity,status,location_name,' +
  'latitude,longitude,image_url,reporter_name,created_at,updated_at,' +
  'report_verifications(count)'

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
    description: row.description ?? '',
    category: row.category,
    severity: row.severity,
    status: row.status,
    locationName: row.location_name ?? '',
    latitude: row.latitude,
    longitude: row.longitude,
    imageUrl: row.image_url || null,
    reporterName: row.reporter_name || 'Anonymous',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    verifications: row.report_verifications?.[0]?.count ?? 0,
    verifiedByMe: verifiedIds ? verifiedIds.has(row.id) : false,
  }
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
// Client-side geography: distances, hotspot cells and signal clusters
// ---------------------------------------------------------------------------

const METERS_PER_DEG_LAT = 111320

/** Straight-line metres between two {lat,lng} points (equirectangular). */
export function metersBetween(a, b) {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180)
  const dLat = (a.lat - b.lat) * METERS_PER_DEG_LAT
  const dLng = (a.lng - b.lng) * METERS_PER_DEG_LAT * Math.cos(midLat)
  return Math.hypot(dLat, dLng)
}

/** Most common non-empty location name in a set of reports, or a coordinate label. */
function areaLabel(reports, center) {
  const counts = new Map()
  for (const report of reports) {
    const name = (report.locationName || '').trim()
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
 * Group located reports into ~300 m grid cells and score each by severity
 * weight. Returns cells sorted by score (highest first); the first is the
 * hotspot. Computed entirely on the client from reports already fetched.
 */
export function buildAreaGrid(reports, sizeMeters = AREA_SIZE_METERS) {
  const step = sizeMeters / METERS_PER_DEG_LAT
  const cells = new Map()

  for (const report of reports.filter(hasCoords)) {
    const latIndex = Math.round(report.latitude / step)
    const lngIndex = Math.round(report.longitude / step)
    const key = `${latIndex}:${lngIndex}`
    const center = { lat: latIndex * step, lng: lngIndex * step }
    const cell = cells.get(key) ?? { key, center, reports: [], score: 0 }
    cell.reports.push(report)
    cell.score += severityWeight(report.severity)
    cells.set(key, cell)
  }

  return [...cells.values()]
    .map((cell) => ({
      ...cell,
      count: cell.reports.length,
      label: areaLabel(cell.reports, cell.center),
      radius: AREA_RADIUS_METERS,
    }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Reports of the same category clustered within ~500 m of each other. Used for
 * the "3 similar reports near X" signal alert. Overlapping groups collapse into
 * one cluster, and clusters are returned strongest first.
 */
export function findSignalClusters(
  reports,
  { minReports = SIGNAL_MIN_REPORTS, radius = SIGNAL_RADIUS_METERS } = {}
) {
  const located = reports.filter(hasCoords)
  const byCategory = new Map()
  for (const report of located) {
    const list = byCategory.get(report.category) ?? []
    list.push(report)
    byCategory.set(report.category, list)
  }

  const used = new Set()
  const clusters = []

  for (const [category, list] of byCategory) {
    for (const anchor of list) {
      if (used.has(anchor.id)) continue
      const near = list.filter(
        (report) =>
          metersBetween(
            { lat: anchor.latitude, lng: anchor.longitude },
            { lat: report.latitude, lng: report.longitude }
          ) <= radius
      )
      if (near.length < minReports) continue

      near.forEach((report) => used.add(report.id))
      const center = {
        lat: near.reduce((sum, r) => sum + r.latitude, 0) / near.length,
        lng: near.reduce((sum, r) => sum + r.longitude, 0) / near.length,
      }
      clusters.push({
        key: `${category}-${anchor.id}`,
        category,
        count: near.length,
        center,
        reports: near,
        label: areaLabel(near, center),
      })
    }
  }

  return clusters.sort((a, b) => b.count - a.count)
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
  let query = supabase.from('reports').select(REPORT_SELECT, { count: 'exact' })

  const term = search ? sanitizeSearchTerm(search) : ''
  if (term) {
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,location_name.ilike.%${term}%`
    )
  }
  if (category && category !== 'All') query = query.eq('category', category)
  if (status && status !== 'all') query = query.eq('status', status)
  if (severity && severity !== 'all') query = query.eq('severity', severity)

  if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true })
  } else if (sort === 'severity') {
    query = query.order('severity', { ascending: false }).order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const from = (page - 1) * PAGE_SIZE
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1)
  if (error) throw error

  return { rows: data ?? [], count: count ?? 0 }
}

export async function fetchMapReports(supabase) {
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
  const [total, pending, inProgress, resolved, categories] = await Promise.all([
    head(),
    head().eq('status', 'pending'),
    head().eq('status', 'in_progress'),
    head().eq('status', 'resolved'),
    supabase.from('report_category_counts').select('category,count'),
  ])

  const error = total.error || pending.error || inProgress.error || resolved.error
  if (error) throw error

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    inProgress: inProgress.count ?? 0,
    resolved: resolved.count ?? 0,
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

  const { data: history, error: historyError } = await supabase
    .from('report_status_history')
    .select('id,status,note,created_at')
    .eq('report_id', id)
    .order('created_at', { ascending: true })
  if (historyError) throw historyError

  return { row: data, history: history ?? [] }
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

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createReport(supabase, payload) {
  const { data, error } = await supabase
    .from('reports')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function addStatusHistory(supabase, reportId, status, note) {
  const { error } = await supabase
    .from('report_status_history')
    .insert({ report_id: reportId, status, note: note || null })
  if (error) throw error
}

export async function updateReportStatus(supabase, reportId, status, note) {
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId)
  if (error) throw error
  await addStatusHistory(supabase, reportId, status, note)
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

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(value) {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'
  const seconds = Math.round((Date.now() - then) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  return formatDate(value)
}

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

// Friendly wording for Supabase/PostgREST failures instead of raw error text.
export function reportErrorMessage(error) {
  const code = error?.code
  if (code === '42P01' || code === 'PGRST205') {
    return 'The reports database is not set up yet. Apply supabase/schema.sql in Supabase.'
  }
  if (code === '42501' || code === 'PGRST301' || error?.status === 401 || error?.status === 403) {
    return 'You do not have permission to do that. Sign in and try again.'
  }
  if (code === '23514' || code === '23502') {
    return 'Some report details were rejected. Check the values and try again.'
  }
  return 'Unable to load reports. Please try again.'
}
