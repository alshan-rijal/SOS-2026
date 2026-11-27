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

export const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    pinColor: '#e11d48',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-600',
  },
  high: {
    label: 'High',
    pinColor: '#ff6b5a',
    badge: 'bg-orange-50 text-orange-700 ring-orange-200',
    dot: 'bg-[#ff6b5a]',
  },
  medium: {
    label: 'Medium',
    pinColor: '#d97706',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    pinColor: '#0284c7',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    dot: 'bg-sky-600',
  },
}

export const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    dot: 'bg-sky-600',
  },
  resolved: {
    label: 'Resolved',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-600',
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

const REPORT_SELECT =
  'id,user_id,title,description,category,severity,status,location_name,' +
  'latitude,longitude,image_url,reporter_name,created_at,updated_at,' +
  'report_verifications(count)'

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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function uploadReportImage(supabase, file, reportId) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be 5 MB or smaller.')
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${reportId}/${Date.now()}.${ext || 'jpg'}`

  const { error } = await supabase.storage
    .from('report-images')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from('report-images').getPublicUrl(path)
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
