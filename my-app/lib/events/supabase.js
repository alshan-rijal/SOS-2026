// Supabase-backed event store. NOT YET TESTED AGAINST A LIVE DATABASE — the
// tables come from supabase/migrations/20261128_00*.sql; run those first.
//
// Column names here must match the SQL files exactly. Every function returns
// the same shape as lib/events/local.js so the UI never knows which is in use.

import { createClient } from '@/lib/supabase/client'

export const backendName = 'supabase'

const EVENT_SELECT =
  'id,organizer_id,type,title,description,event_date,start_time,end_time,address,ward,' +
  'latitude,longitude,radius_m,max_participants,what_to_bring,cover_url,organization_name,' +
  'contact_name,contact_phone,contact_email,status,review_notes,rejection_reason,' +
  'reviewed_by,reviewed_at,submitted_at,created_at,updated_at,' +
  'title_ne,description_ne,address_ne,' +
  'event_applications(answers,document_paths),' +
  'event_status_history(id,from_status,to_status,note,created_at)'

function client() {
  return createClient()
}

async function currentUserId() {
  const { data } = await client().auth.getUser()
  return data?.user?.id ?? null
}

function hhmm(value) {
  return typeof value === 'string' ? value.slice(0, 5) : ''
}

function normalize(row, userId, goingCount = 0, joined = false) {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    organizerName: row.organization_name || '',
    type: row.type,
    title: row.title,
    description: row.description ?? '',
    // The Nepali twins keep the SQL `_ne` suffix so localizeField() reads the
    // same field name from either backend (see lib/i18n.js).
    title_ne: row.title_ne ?? '',
    description_ne: row.description_ne ?? '',
    address_ne: row.address_ne ?? '',
    eventDate: row.event_date,
    startTime: hhmm(row.start_time),
    endTime: hhmm(row.end_time),
    address: row.address ?? '',
    ward: row.ward ?? '',
    latitude: row.latitude,
    longitude: row.longitude,
    radiusM: row.radius_m ?? 150,
    maxParticipants: row.max_participants,
    whatToBring: row.what_to_bring ?? '',
    coverUrl: row.cover_url || null,
    organizationName: row.organization_name ?? '',
    contactName: row.contact_name ?? '',
    contactPhone: row.contact_phone ?? '',
    contactEmail: row.contact_email ?? '',
    status: row.status,
    reviewNotes: row.review_notes ?? null,
    rejectionReason: row.rejection_reason ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answers: row.event_applications?.[0]?.answers ?? row.event_applications?.answers ?? {},
    documentPaths:
      row.event_applications?.[0]?.document_paths ?? row.event_applications?.document_paths ?? [],
    history: (row.event_status_history ?? [])
      .map((entry) => ({
        id: entry.id,
        fromStatus: entry.from_status,
        toStatus: entry.to_status,
        note: entry.note,
        createdAt: entry.created_at,
      }))
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    goingCount,
    joined,
    isOrganiser: Boolean(userId && row.organizer_id === userId),
    sample: false,
  }
}

/** Going counts + whether the current user joined, for a set of event ids. */
async function participationFor(ids, userId) {
  const counts = new Map()
  const joined = new Set()
  if (ids.length === 0) return { counts, joined }

  const { data, error } = await client()
    .from('event_participants')
    .select('event_id,user_id')
    .in('event_id', ids)
  // A missing table or a policy gap should not blank the list; counts fall to 0.
  if (error) return { counts, joined }

  for (const row of data ?? []) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1)
    if (userId && row.user_id === userId) joined.add(row.event_id)
  }
  return { counts, joined }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listEvents(filters = {}) {
  const { type, when = 'all', search = '' } = filters
  const userId = await currentUserId()
  const supabase = client()

  let query = supabase.from('events').select(EVENT_SELECT).eq('status', 'approved')
  if (type) query = query.eq('type', type)
  if (when === 'upcoming') query = query.gte('event_date', new Date().toISOString().slice(0, 10))
  if (when === 'today') query = query.eq('event_date', new Date().toISOString().slice(0, 10))
  if (when === 'past') query = query.lt('event_date', new Date().toISOString().slice(0, 10))
  if (search.trim()) {
    const term = search.replace(/[,()%\\]/g, ' ').trim()
    query = query.or(
      `title.ilike.%${term}%,address.ilike.%${term}%,ward.ilike.%${term}%,` +
        `title_ne.ilike.%${term}%,address_ne.ilike.%${term}%`
    )
  }
  query = query.order('event_date', { ascending: true }).order('start_time', { ascending: true })

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  const { counts, joined } = await participationFor(
    rows.map((row) => row.id),
    userId
  )
  return rows.map((row) => normalize(row, userId, counts.get(row.id) ?? 0, joined.has(row.id)))
}

export async function getEvent(id) {
  const userId = await currentUserId()
  const { data, error } = await client().from('events').select(EVENT_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { counts, joined } = await participationFor([id], userId)
  return normalize(data, userId, counts.get(id) ?? 0, joined.has(id))
}

export async function listMyEvents() {
  const userId = await currentUserId()
  if (!userId) return []
  const { data, error } = await client()
    .from('events')
    .select(EVENT_SELECT)
    .eq('organizer_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = data ?? []
  const { counts, joined } = await participationFor(
    rows.map((row) => row.id),
    userId
  )
  return rows.map((row) => normalize(row, userId, counts.get(row.id) ?? 0, joined.has(row.id)))
}

export async function listParticipants(id) {
  const { data, error } = await client()
    .from('event_participants')
    .select('user_id,created_at,profiles(full_name,avatar_url)')
    .eq('event_id', id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    name: row.profiles?.full_name || 'A neighbour',
    avatarUrl: row.profiles?.avatar_url ?? null,
  }))
}

export async function listNotifications() {
  const userId = await currentUserId()
  if (!userId) return []
  const { data, error } = await client()
    .from('notifications')
    .select('id,type,title,body,link,read_at,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? '',
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  }))
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function toRow(data) {
  const row = {}
  if ('type' in data) row.type = data.type
  if ('title' in data) row.title = data.title
  if ('description' in data) row.description = data.description ?? ''
  if ('eventDate' in data) row.event_date = data.eventDate
  if ('startTime' in data) row.start_time = data.startTime
  if ('endTime' in data) row.end_time = data.endTime
  if ('address' in data) row.address = data.address ?? ''
  if ('title_ne' in data) row.title_ne = data.title_ne || null
  if ('description_ne' in data) row.description_ne = data.description_ne || null
  if ('address_ne' in data) row.address_ne = data.address_ne || null
  if ('ward' in data) row.ward = data.ward ?? ''
  if ('latitude' in data) row.latitude = data.latitude
  if ('longitude' in data) row.longitude = data.longitude
  if ('radiusM' in data) row.radius_m = data.radiusM
  if ('maxParticipants' in data) row.max_participants = data.maxParticipants
  if ('whatToBring' in data) row.what_to_bring = data.whatToBring ?? ''
  if ('coverUrl' in data) row.cover_url = data.coverUrl ?? null
  if ('organizationName' in data) row.organization_name = data.organizationName ?? ''
  if ('contactName' in data) row.contact_name = data.contactName ?? ''
  if ('contactPhone' in data) row.contact_phone = data.contactPhone ?? ''
  if ('contactEmail' in data) row.contact_email = data.contactEmail ?? ''
  return row
}

export async function createApplication(data) {
  const supabase = client()
  const userId = await currentUserId()
  if (!userId) throw new Error('Sign in to submit an event.')

  const id = crypto.randomUUID()
  const row = {
    id,
    organizer_id: userId,
    status: 'pending_review',
    submitted_at: new Date().toISOString(),
    ...toRow(data),
  }
  const { error } = await supabase.from('events').insert(row)
  if (error) throw error

  const { error: appError } = await supabase.from('event_applications').insert({
    event_id: id,
    answers: data.answers ?? {},
    document_paths: data.documentPaths ?? [],
  })
  if (appError) throw appError

  return { id }
}

export async function updateApplication(id, data) {
  const supabase = client()
  const { error } = await supabase.from('events').update(toRow(data)).eq('id', id)
  if (error) throw error

  if ('answers' in data || 'documentPaths' in data) {
    const patch = { event_id: id }
    if ('answers' in data) patch.answers = data.answers ?? {}
    if ('documentPaths' in data) patch.document_paths = data.documentPaths ?? []
    const { error: appError } = await supabase.from('event_applications').upsert(patch)
    if (appError) throw appError
  }
  return { id }
}

export async function withdraw(id) {
  const { error } = await client().from('events').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw error
  return { id }
}

export async function cancel(id) {
  const { error } = await client().from('events').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw error
  return { id }
}

// Reviews in Supabase mode are done with supabase/admin/manual_review.sql; this
// exists only so the local dev control has a matching function to call.
export async function reviewEvent() {
  throw new Error('Reviews are done in Supabase with supabase/admin/manual_review.sql.')
}

export async function joinEvent(id) {
  const userId = await currentUserId()
  if (!userId) throw new Error('Sign in to join an event.')
  const { error } = await client().from('event_participants').insert({ event_id: id, user_id: userId })
  if (error) throw error
  return { id }
}

export async function leaveEvent(id) {
  const userId = await currentUserId()
  if (!userId) throw new Error('Sign in to leave an event.')
  const { error } = await client()
    .from('event_participants')
    .delete()
    .eq('event_id', id)
    .eq('user_id', userId)
  if (error) throw error
  return { id }
}

export async function markRead(id) {
  const { error } = await client()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return { id }
}

export async function markAllRead() {
  const userId = await currentUserId()
  if (!userId) return { count: 0 }
  const { error } = await client()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw error
  return { count: 0 }
}
