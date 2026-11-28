// Local event store — the default backend. Everything lives in this browser's
// localStorage under "sajha:events" and nothing is sent anywhere. The reader,
// writer and error paths are all written to be safe on the server render pass
// (no window) and to survive private-mode quota errors without crashing a page.

import { createClient } from '@/lib/supabase/client'

const STORE_KEY = 'sajha:events'
const SAMPLE_ORGANIZER = 'sample-organizer'

export const backendName = 'local'

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function emptyStore() {
  return { events: [], participants: {}, history: {}, notifications: [] }
}

function readStore() {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw)
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      participants: parsed.participants ?? {},
      history: parsed.history ?? {},
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    }
  } catch {
    return emptyStore()
  }
}

function writeStore(store) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failure: keep the UI working for this session.
  }
}

// ---------------------------------------------------------------------------
// Seed — six sample approved events, one per different type, near Itahari.
// Marked sample: true so every surface can tag them as examples.
// ---------------------------------------------------------------------------

function plusDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function sampleEvents() {
  const base = { organizerId: SAMPLE_ORGANIZER, sample: true, status: 'approved' }
  return [
    {
      ...base,
      id: 'sample-blood',
      type: 'blood_donation',
      title: 'Community blood donation drive',
      title_ne: 'सामुदायिक रक्तदान कार्यक्रम',
      description:
        'A morning blood donation camp with the district blood bank. Walk in with an ID, rest and refreshments provided afterwards. Donors of all blood groups are welcome.',
      description_ne:
        'जिल्ला रक्तकोषसँग मिलेर बिहानको रक्तदान शिविर। परिचयपत्र लिएर आउनुहोस्, दानपछि आराम र खाजाको व्यवस्था छ। सबै रक्त समूहका दानकर्तालाई स्वागत छ।',
      eventDate: plusDays(3),
      startTime: '08:00',
      endTime: '13:00',
      address: 'Itahari Health Post, Ward 4',
      address_ne: 'इटहरी स्वास्थ्य चौकी, वडा ४',
      ward: 'Ward 4',
      latitude: 26.6646,
      longitude: 87.2718,
      radiusM: 150,
      maxParticipants: 120,
      whatToBring: 'Photo ID. Eat breakfast before donating.',
      organizationName: 'Sajha Pahal Volunteers',
      contactName: 'Sample organiser',
      contactPhone: '9800000000',
      contactEmail: 'hello@example.com',
    },
    {
      ...base,
      id: 'sample-tree',
      type: 'tree_plantation',
      title: 'Roadside tree plantation',
      title_ne: 'सडक किनार वृक्षरोपण',
      description:
        'Plant saplings along the ward 6 link road and set up a simple watering roster for the dry weeks ahead. Tools and saplings are arranged by the ward office.',
      description_ne:
        'वडा ६ को सडक किनारमा बिरुवा रोप्ने र आउँदो सुक्खा सिजनका लागि सिँचाइ तालिका बनाउने कार्यक्रम। औजार र बिरुवा वडा कार्यालयले व्यवस्था गर्नेछ।',
      eventDate: plusDays(7),
      startTime: '07:30',
      endTime: '11:00',
      address: 'Ward 6 link road, near the school',
      address_ne: 'वडा ६ सम्पर्क सडक, विद्यालय नजिक',
      ward: 'Ward 6',
      latitude: 26.672,
      longitude: 87.281,
      radiusM: 200,
      maxParticipants: 60,
      whatToBring: 'Gloves if you have them, and drinking water.',
      organizationName: 'Green Ward 6',
      contactName: 'Sample organiser',
      contactPhone: '9800000000',
      contactEmail: 'hello@example.com',
    },
    {
      ...base,
      id: 'sample-flower',
      type: 'flower_plantation',
      title: 'Flowers for the community park',
      title_ne: 'सामुदायिक पार्कमा फूल रोपण',
      description:
        'Add seasonal flowers to the community park beds and tidy the central walkway. Families welcome, children must be with an adult.',
      description_ne:
        'सामुदायिक पार्कका क्यारीमा मौसमी फूल रोप्ने र मुख्य बाटो सफा गर्ने। परिवारसहित स्वागत छ, बालबालिका अभिभावकसँग मात्र।',
      eventDate: plusDays(10),
      startTime: '09:00',
      endTime: '12:00',
      address: 'Community park, Ward 2',
      address_ne: 'सामुदायिक पार्क, वडा २',
      ward: 'Ward 2',
      latitude: 26.6585,
      longitude: 87.2645,
      radiusM: 150,
      maxParticipants: 40,
      whatToBring: 'Sunny-weather clothes and a water bottle.',
      organizationName: 'Park Care Group',
      contactName: 'Sample organiser',
      contactPhone: '9800000000',
      contactEmail: 'hello@example.com',
    },
    {
      ...base,
      id: 'sample-clean',
      type: 'cleanliness',
      title: 'Ward 8 clean-up morning',
      title_ne: 'वडा ८ सरसफाइ बिहान',
      description:
        'Clear the roadside waste that has collected after the rains, sort what can be recycled and hand the rest to the municipal truck.',
      description_ne:
        'वर्षापछि जम्मा भएको सडक किनारको फोहोर हटाउने, पुनःप्रयोग हुने सामान छुट्याउने र बाँकी नगरपालिकाको गाडीलाई बुझाउने।',
      eventDate: plusDays(14),
      startTime: '07:00',
      endTime: '10:30',
      address: 'Market road, Ward 8',
      address_ne: 'बजार सडक, वडा ८',
      ward: 'Ward 8',
      latitude: 26.6715,
      longitude: 87.259,
      radiusM: 250,
      maxParticipants: 80,
      whatToBring: 'Gloves and a mask. Bags are provided.',
      organizationName: 'Ward 8 Youth Club',
      contactName: 'Sample organiser',
      contactPhone: '9800000000',
      contactEmail: 'hello@example.com',
    },
    {
      ...base,
      id: 'sample-food',
      type: 'food_donation',
      title: 'Hot meal distribution',
      title_ne: 'तातो खाना वितरण',
      description:
        'Cook and pack hot meals for families staying near the bus park, and hand them out with a small grocery pack where needed.',
      description_ne:
        'बसपार्क वरिपरि बस्ने परिवारका लागि तातो खाना पकाएर प्याक गर्ने र आवश्यक परे सानो किराना प्याक पनि दिने।',
      eventDate: plusDays(21),
      startTime: '17:30',
      endTime: '20:00',
      address: 'Bus park community hall, Ward 3',
      address_ne: 'बसपार्क सामुदायिक भवन, वडा ३',
      ward: 'Ward 3',
      latitude: 26.667,
      longitude: 87.276,
      radiusM: 150,
      maxParticipants: 45,
      whatToBring: 'An apron if you have one. Food is prepared on site.',
      organizationName: 'Annapurna Sewa',
      contactName: 'Sample organiser',
      contactPhone: '9800000000',
      contactEmail: 'hello@example.com',
    },
    {
      ...base,
      id: 'sample-health',
      type: 'health_camp',
      title: 'Free health check-up camp',
      title_ne: 'निःशुल्क स्वास्थ्य जाँच शिविर',
      description:
        'A general check-up camp with volunteer doctors: blood pressure, blood sugar and basic consultations, free of charge, first come first served.',
      description_ne:
        'स्वयंसेवक चिकित्सकसहित सामान्य जाँच शिविर: रक्तचाप, रक्त सुगर र आधारभूत परामर्श, निःशुल्क, पहिले आउनेलाई पहिले सेवा।',
      eventDate: plusDays(30),
      startTime: '09:00',
      endTime: '15:00',
      address: 'Community hall, Ward 5',
      address_ne: 'सामुदायिक भवन, वडा ५',
      ward: 'Ward 5',
      latitude: 26.661,
      longitude: 87.2685,
      radiusM: 150,
      maxParticipants: 200,
      whatToBring: 'Any medicine you are taking, and your health card if you have one.',
      organizationName: 'Itahari Medics Network',
      contactName: 'Sample organiser',
      contactPhone: '9800000000',
      contactEmail: 'hello@example.com',
    },
  ].map((event) => ({
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    description: event.description,
    address: event.address,
    ward: event.ward,
    latitude: event.latitude,
    longitude: event.longitude,
    radiusM: event.radiusM,
    maxParticipants: event.maxParticipants,
    whatToBring: event.whatToBring,
    coverUrl: null,
    organizationName: event.organizationName,
    contactName: event.contactName,
    contactPhone: event.contactPhone,
    contactEmail: event.contactEmail,
    reviewNotes: null,
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answers: {},
    documentPaths: [],
    ...event,
  }))
}

/** Seed once, guarded by a flag so a user who deletes samples does not see them again. */
function ensureSeeded() {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(`${STORE_KEY}:seeded`)) return
    const store = readStore()
    if (store.events.length === 0) {
      store.events = sampleEvents()
      writeStore(store)
    }
    window.localStorage.setItem(`${STORE_KEY}:seeded`, '1')
  } catch {
    // Ignore seeding failures; the app still works with an empty list.
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function currentUser() {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    return data?.user ?? null
  } catch {
    return null
  }
}

function goingFor(store, id) {
  return store.participants[id]?.length ?? 0
}

function decorate(event, store, userId) {
  return {
    ...event,
    goingCount: goingFor(store, event.id),
    joined: Boolean(userId && (store.participants[event.id] ?? []).some((p) => String(p.userId) === String(userId))),
    isOrganiser: Boolean(userId && String(event.organizerId) === String(userId)),
    history: store.history[event.id] ?? [],
  }
}

function pushHistory(store, id, fromStatus, toStatus, note) {
  const entries = store.history[id] ?? []
  entries.push({
    id: `${id}-${entries.length + 1}`,
    fromStatus: fromStatus ?? null,
    toStatus,
    note: note ?? null,
    createdAt: new Date().toISOString(),
  })
  store.history[id] = entries
}

function notify(store, userId, type, title, body, link) {
  store.notifications.unshift({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type,
    title,
    body,
    link,
    readAt: null,
    createdAt: new Date().toISOString(),
  })
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function dateTimeOf(event) {
  const end = new Date(`${event.eventDate}T${event.endTime || '23:59'}:00`)
  return end.getTime()
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listEvents(filters = {}) {
  ensureSeeded()
  const store = readStore()
  const user = await currentUser()
  const userId = user?.id ?? null
  const { type, when = 'all', search = '' } = filters

  const term = search.trim().toLowerCase()
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  return store.events
    .filter((event) => event.status === 'approved')
    .filter((event) => (type ? event.type === type : true))
    .filter((event) => {
      if (when === 'upcoming') return dateTimeOf(event) >= now
      if (when === 'past') return dateTimeOf(event) < now
      if (when === 'today') return event.eventDate === today
      return true
    })
    .filter((event) =>
      term
        ? `${event.title} ${event.title_ne ?? ''} ${event.address} ${event.address_ne ?? ''} ${event.ward}`
            .toLowerCase()
            .includes(term)
        : true
    )
    .map((event) => decorate(event, store, userId))
    .sort((a, b) => `${a.eventDate}${a.startTime}`.localeCompare(`${b.eventDate}${b.startTime}`))
}

export async function getEvent(id) {
  ensureSeeded()
  const store = readStore()
  const user = await currentUser()
  const userId = user?.id ?? null
  const event = store.events.find((row) => String(row.id) === String(id))
  if (!event) {
    // The event was created in another backend (or another browser's store).
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `[events/local] no event "${id}" in localStorage "${STORE_KEY}" (${store.events.length} stored)`
      )
    }
    return { event: null, error: null, notFound: true, viewerId: userId }
  }
  const decorated = { ...decorate(event, store, userId), isAdmin: false }
  // Same rule as the Supabase driver: approved is public, the organiser sees
  // their own in any status. No admin concept exists locally.
  if (event.status !== 'approved' && !decorated.isOrganiser) {
    return { event: null, error: null, notFound: true, viewerId: userId }
  }
  return { event: decorated, error: null, notFound: false, viewerId: userId }
}

export async function listMyEvents() {
  ensureSeeded()
  const user = await currentUser()
  if (!user) return []
  const store = readStore()
  return store.events
    .filter((event) => event.organizerId === user.id)
    .map((event) => decorate(event, store, user.id))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export async function listParticipants(id) {
  const store = readStore()
  return (store.participants[id] ?? []).map((row) => ({
    userId: row.userId,
    name: row.name || 'A neighbour',
    avatarUrl: row.avatarUrl ?? null,
  }))
}

export async function listNotifications() {
  const user = await currentUser()
  if (!user) return []
  const store = readStore()
  return store.notifications.filter((row) => row.userId === user.id)
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createApplication(data) {
  ensureSeeded()
  const user = await currentUser()
  if (!user) throw new Error('Sign in to submit an event.')
  const store = readStore()

  const id = newId()
  const now = new Date().toISOString()
  const event = {
    ...data,
    id,
    organizerId: user.id,
    organizerName: data.organizationName || user.user_metadata?.full_name || user.email || '',
    status: 'pending_review',
    sample: false,
    reviewNotes: null,
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  }
  store.events.push(event)
  store.participants[id] = []
  pushHistory(store, id, null, 'pending_review', 'Application submitted.')
  writeStore(store)
  return { id }
}

// An approved event that changes date, time, place or type goes back to review.
const REVIEW_TRIGGERS = ['eventDate', 'startTime', 'endTime', 'address', 'latitude', 'longitude', 'type']

export async function updateApplication(id, data) {
  const store = readStore()
  const index = store.events.findIndex((row) => row.id === id)
  if (index === -1) throw new Error('That event could not be found.')
  const previous = store.events[index]

  const changed = REVIEW_TRIGGERS.some((key) => key in data && data[key] !== previous[key])
  let status = previous.status
  let note = null
  if (previous.status === 'approved' && changed) {
    status = 'pending_review'
    note = 'Edited by the organiser; sent back for review.'
  } else if (previous.status === 'rejected' || previous.status === 'changes_requested') {
    status = 'pending_review'
    note = 'Resubmitted after review changes.'
  }

  store.events[index] = { ...previous, ...data, status, updatedAt: new Date().toISOString() }
  if (status !== previous.status) pushHistory(store, id, previous.status, status, note)
  writeStore(store)
  return { id }
}

export async function withdraw(id) {
  return setStatus(id, 'cancelled', 'Withdrawn by the organiser.', ['draft', 'pending_review', 'changes_requested'])
}

export async function cancel(id) {
  return setStatus(id, 'cancelled', 'Cancelled by the organiser.', ['approved'])
}

async function setStatus(id, status, note, allowedFrom) {
  const store = readStore()
  const index = store.events.findIndex((row) => row.id === id)
  if (index === -1) throw new Error('That event could not be found.')
  const previous = store.events[index]
  if (!allowedFrom.includes(previous.status)) {
    throw new Error('This event cannot be changed in its current state.')
  }
  store.events[index] = { ...previous, status, updatedAt: new Date().toISOString() }
  pushHistory(store, id, previous.status, status, note)
  writeStore(store)
  return { id }
}

// Dev-only review actions (section 7). No admin panel yet: these let the
// organiser step through approve / request changes / reject in local mode.
export async function reviewEvent(id, decision, note) {
  const store = readStore()
  const index = store.events.findIndex((row) => row.id === id)
  if (index === -1) throw new Error('That event could not be found.')
  const previous = store.events[index]
  const status =
    decision === 'approve' ? 'approved' : decision === 'changes' ? 'changes_requested' : 'rejected'
  const now = new Date().toISOString()

  store.events[index] = {
    ...previous,
    status,
    reviewNotes: decision === 'changes' ? note ?? null : null,
    rejectionReason: decision === 'reject' ? note ?? null : null,
    reviewedAt: now,
    updatedAt: now,
  }
  pushHistory(store, id, previous.status, status, note ?? null)
  notify(
    store,
    previous.organizerId,
    `event_${status}`,
    status === 'approved'
      ? 'Your event was approved'
      : status === 'changes_requested'
        ? 'Changes requested on your event'
        : 'Your event was rejected',
    note || previous.title,
    `/events/${id}`
  )
  writeStore(store)
  return { id }
}

export async function joinEvent(id) {
  const user = await currentUser()
  if (!user) throw new Error('Sign in to join an event.')
  const store = readStore()
  const event = store.events.find((row) => row.id === id)
  if (!event) throw new Error('That event could not be found.')
  if (event.organizerId === user.id) throw new Error('You are organising this event.')
  if (dateTimeOf(event) < Date.now()) throw new Error('This event has already ended.')
  const list = store.participants[id] ?? []
  if (list.some((row) => row.userId === user.id)) return { id }
  if (event.maxParticipants && list.length >= event.maxParticipants) {
    throw new Error('This event is full.')
  }
  list.push({
    userId: user.id,
    name: user.user_metadata?.full_name || user.email || 'A neighbour',
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    createdAt: new Date().toISOString(),
  })
  store.participants[id] = list
  writeStore(store)
  return { id }
}

export async function leaveEvent(id) {
  const user = await currentUser()
  if (!user) throw new Error('Sign in to leave an event.')
  const store = readStore()
  store.participants[id] = (store.participants[id] ?? []).filter((row) => row.userId !== user.id)
  writeStore(store)
  return { id }
}

export async function markRead(id) {
  const store = readStore()
  const row = store.notifications.find((item) => item.id === id)
  if (row) row.readAt = new Date().toISOString()
  writeStore(store)
  return { id }
}

export async function markAllRead() {
  const user = await currentUser()
  if (!user) return { count: 0 }
  const store = readStore()
  const now = new Date().toISOString()
  let count = 0
  for (const row of store.notifications) {
    if (row.userId === user.id && !row.readAt) {
      row.readAt = now
      count += 1
    }
  }
  writeStore(store)
  return { count }
}
