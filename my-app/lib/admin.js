// Admin-only reads and writes: the reports table, the analytics the overview
// needs, the audit log and the export audit entry.
//
// Every function tolerates the database not yet having migrations 006–008: a
// missing column or table returns a graceful result (or a `dbStale` flag) rather
// than throwing, so the panel shows its "database update" notice instead of
// crashing.

import {
  CATEGORIES,
  SEVERITY_ORDER,
  isDbUpdateError,
  normalizeReport,
  normalizeStatus,
} from './reports.js'

const REPORT_SELECT = '*,report_verifications(count)'

export const RANGE_PRESETS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '15d', label: 'Last 15 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
]

const DAY_MS = 24 * 60 * 60 * 1000

/** { from, to } as ISO strings for a preset (or an explicit custom range). */
export function resolveRange(preset, customFrom, customTo) {
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case '15d':
      return { from: new Date(startOfToday - 14 * DAY_MS).toISOString(), to: endOfToday.toISOString() }
    case '30d':
      return { from: new Date(startOfToday - 29 * DAY_MS).toISOString(), to: endOfToday.toISOString() }
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: endOfToday.toISOString() }
    case 'last-month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    case 'custom':
      return {
        from: customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : null,
        to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : null,
      }
    case '7d':
    default:
      return { from: new Date(startOfToday - 6 * DAY_MS).toISOString(), to: endOfToday.toISOString() }
  }
}

function sanitizeSearchTerm(term) {
  return term.replace(/[,()%\\]/g, ' ').trim()
}

/**
 * The reports table. `confidential` is 'all' | 'only' | 'hide'. Returns
 * `{ rows, count, dbStale }`; dbStale is true when the confidential filter had
 * to be dropped because migration 007 is missing.
 */
export async function fetchAdminReports(
  supabase,
  { search, status, category, severity, confidential = 'all', from, to, sort = 'newest', page = 1, pageSize = 25 } = {}
) {
  const build = (withConfidential) => {
    let query = supabase.from('reports').select(REPORT_SELECT, { count: 'exact' })

    const term = search ? sanitizeSearchTerm(search) : ''
    if (term) {
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,location_name.ilike.%${term}%`)
    }
    if (status && status !== 'all') query = query.in('status', statusAliases(status))
    if (category && category !== 'All') query = query.eq('category', category)
    if (severity && severity !== 'all') query = query.eq('severity', severity)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lt('created_at', to)
    if (withConfidential && confidential === 'only') query = query.eq('is_confidential', true)
    if (withConfidential && confidential === 'hide') query = query.eq('is_confidential', false)

    if (sort === 'oldest') query = query.order('created_at', { ascending: true })
    else if (sort === 'severity') query = query.order('severity', { ascending: false }).order('created_at', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    const offset = (page - 1) * pageSize
    return query.range(offset, offset + pageSize - 1)
  }

  const wantsConfidentialFilter = confidential === 'only' || confidential === 'hide'
  let { data, error, count } = await build(wantsConfidentialFilter)

  if (error && wantsConfidentialFilter && isDbUpdateError(error)) {
    ;({ data, error, count } = await build(false))
    if (!error) return { rows: (data ?? []).map((row) => normalizeReport(row)), count: count ?? 0, dbStale: true }
  }
  if (error) throw error

  return { rows: (data ?? []).map((row) => normalizeReport(row)), count: count ?? 0, dbStale: false }
}

// A status filter matches both the new value and its legacy twin.
function statusAliases(status) {
  if (status === 'reported') return ['reported', 'pending']
  if (status === 'fixed') return ['fixed', 'resolved']
  return [status]
}

function hoursBetween(a, b) {
  if (!a || !b) return null
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Number.isNaN(diff) || diff < 0 ? null : diff / 3_600_000
}

function average(values) {
  const clean = values.filter((value) => value != null)
  if (clean.length === 0) return null
  return clean.reduce((sum, value) => sum + value, 0) / clean.length
}

/**
 * Everything the overview screen and the export summary need, computed from the
 * reports inside the range. `dbStale` reports a missing 006 column.
 */
export async function fetchAdminAnalytics(supabase, { from, to } = {}) {
  let query = supabase
    .from('reports')
    .select('id,title,status,severity,category,created_at,verified_at,resolved_at,status_reason,is_confidential,latitude,longitude,report_verifications(count)')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lt('created_at', to)

  let { data, error } = await query
  let dbStale = false
  if (error && isDbUpdateError(error)) {
    // Retry without the optional columns.
    let fallback = supabase
      .from('reports')
      .select('id,title,status,severity,category,created_at,report_verifications(count)')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (from) fallback = fallback.gte('created_at', from)
    if (to) fallback = fallback.lt('created_at', to)
    ;({ data, error } = await fallback)
    dbStale = true
  }
  if (error) throw error

  const rows = (data ?? []).map((row) => normalizeReport(row))

  const byStatus = { reported: 0, under_verification: 0, in_progress: 0, fixed: 0, cannot_fix: 0 }
  const byCategory = new Map()
  const byDay = new Map()
  const reasons = new Map()
  const verifyHours = []
  const resolveHours = []
  const now = Date.now()

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1)
    const day = (row.createdAt || '').slice(0, 10)
    if (day) byDay.set(day, (byDay.get(day) ?? 0) + 1)
    if (row.verifiedAt) verifyHours.push(hoursBetween(row.createdAt, row.verifiedAt))
    if (row.resolvedAt) resolveHours.push(hoursBetween(row.createdAt, row.resolvedAt))
    if (row.status === 'cannot_fix' && row.statusReason) {
      reasons.set(row.statusReason, (reasons.get(row.statusReason) ?? 0) + 1)
    }
  }

  const total = rows.length
  const fixedRate = total ? Math.round(((byStatus.fixed ?? 0) / total) * 100) : 0

  // Trend: last 7 days vs the previous 7, counted regardless of the page range.
  const recent = rows.filter((row) => now - new Date(row.createdAt).getTime() <= 7 * DAY_MS).length
  const previous = rows.filter((row) => {
    const age = now - new Date(row.createdAt).getTime()
    return age > 7 * DAY_MS && age <= 14 * DAY_MS
  }).length

  // Needs attention: oldest still 'reported', and anything older than 7 days.
  const stillReported = rows
    .filter((row) => row.status === 'reported')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  const overloaded = rows
    .filter((row) => row.status !== 'fixed' && row.status !== 'cannot_fix' &&
      now - new Date(row.createdAt).getTime() > 7 * DAY_MS)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  const mostVerified = [...rows]
    .sort((a, b) => b.verifications - a.verifications)
    .slice(0, 5)

  return {
    total,
    byStatus,
    byCategory: CATEGORIES.map((category) => ({ category, count: byCategory.get(category) ?? 0 })),
    byDay: [...byDay.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    cannotFixReasons: [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    avgVerifyHours: average(verifyHours),
    avgResolveHours: average(resolveHours),
    fixedRate,
    trend: { recent, previous, delta: recent - previous },
    needsAttention: {
      oldest: stillReported.slice(0, 5),
      overdue: overloaded.slice(0, 5),
      mostVerified,
    },
    dbStale,
  }
}

/** Oldest 'reported' reports, best first, for the verification queue. */
export async function fetchQueue(supabase, { sort = 'oldest' } = {}) {
  const { rows, dbStale } = await fetchAdminReports(supabase, {
    status: 'reported',
    sort: sort === 'verifications' ? 'severity' : 'oldest',
    pageSize: 100,
  })
  if (sort === 'verifications') rows.sort((a, b) => b.verifications - a.verifications)
  return { rows, dbStale }
}

/** Admin audit log, newest first. */
export async function listAuditLog(supabase, limit = 100) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('id,admin_id,action,entity,entity_id,details,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (isDbUpdateError(error)) return { rows: [], dbStale: true }
    throw error
  }
  return { rows: data ?? [], dbStale: false }
}

/**
 * Write an admin action to the audit log. A missing table is swallowed — the
 * action still happened, only its trail is unavailable.
 */
export async function logAdminAction(supabase, { action, entity, entityId, details }) {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase.from('admin_audit_log').insert({
    admin_id: auth?.user?.id ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    details: details ?? null,
  })
  return { ok: !error, dbStale: Boolean(error && isDbUpdateError(error)) }
}

export const STATUS_ORDER_ADMIN = ['reported', 'under_verification', 'in_progress', 'fixed', 'cannot_fix']

export { normalizeStatus, SEVERITY_ORDER }
