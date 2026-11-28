'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  FileUp,
  ImagePlus,
  Info,
  LogIn,
  MapPin,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ITAHARI_CENTER } from '@/lib/reports'
import {
  EVENTS_BACKEND,
  createApplication,
  eventsErrorMessage,
  getEvent,
  updateApplication,
} from '@/lib/events'
import { EVENT_TYPES, eventTypeMeta } from '@/components/EventTypeIcon'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Field, inputClass, inputIdle, inputInvalid } from '@/components/Field'
import { useLanguage } from '@/components/LanguageContext'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-ink/5" />,
})

const STEPS = ['Type', 'Basics', 'Place', 'Organiser', 'Review']
const DRAFT_KEY = 'sajha:event-draft'
const MAX_COVER_BYTES = 1024 * 1024 // 1 MB
const MAX_DOC_BYTES = 5 * 1024 * 1024 // 5 MB

const PLANTATION_QUESTIONS = [
  { key: 'species', label: 'Species to plant', placeholder: 'e.g. Neem, Jacaranda' },
  { key: 'saplingSupplier', label: 'Sapling supplier', placeholder: 'Nursery or ward office' },
  { key: 'sitePermission', label: 'Site permission', placeholder: 'Landowner or ward office' },
  { key: 'wateringPlan', label: 'Watering plan', placeholder: 'Who waters, and how often' },
]

// "answers" saved to event_applications.answers in Supabase mode.
const GENERAL_QUESTIONS = [
  { key: 'goal', label: 'Goal and beneficiaries', placeholder: 'What you want to achieve, and who benefits' },
  { key: 'attendance', label: 'Expected attendance', placeholder: 'A rough number of people' },
  { key: 'permission', label: 'Permission from ward office or landowner', select: ['Yes', 'In progress', 'Not needed'] },
  { key: 'permissionNotes', label: 'Permission notes', placeholder: 'Reference or details (optional)' },
  { key: 'safetyPlan', label: 'Safety plan', placeholder: 'First aid, crowd control, weather plan' },
  { key: 'resources', label: 'Who provides materials or funding', placeholder: 'Sponsors, ward office, or self' },
  { key: 'pastEvents', label: 'Past similar events', placeholder: 'What you have run before (optional)' },
  { key: 'fee', label: 'Free or fee', select: ['Free', 'Fee'] },
  { key: 'feeNote', label: 'Fee details', placeholder: 'Amount and what it covers (optional)' },
]

const TYPE_QUESTIONS = {
  blood_donation: [
    { key: 'bloodBank', label: 'Partner blood bank or hospital', placeholder: 'e.g. District Blood Bank' },
    { key: 'registrationNumber', label: 'Registration number', placeholder: 'Reference or licence number' },
    { key: 'medicalStaff', label: 'Medical staff on site', placeholder: 'Doctors and nurses attending' },
  ],
  tree_plantation: PLANTATION_QUESTIONS,
  flower_plantation: PLANTATION_QUESTIONS,
  cleanliness: [
    { key: 'wasteType', label: 'Waste type', placeholder: 'Plastic, organic, mixed…' },
    { key: 'disposal', label: 'How waste will be disposed of', placeholder: 'Municipal truck, recycling…' },
    { key: 'glovesAndBags', label: 'Gloves and bags', placeholder: 'Who provides them' },
  ],
  food_donation: [
    { key: 'foodType', label: 'Food type', placeholder: 'Cooked meal, dry ration…' },
    { key: 'hygienePlan', label: 'Hygiene plan', placeholder: 'Kitchen and packing hygiene' },
    { key: 'recipients', label: 'Who receives it', placeholder: 'Families, shelters…' },
  ],
  health_camp: [
    { key: 'doctors', label: 'Doctors and specialists', placeholder: 'Names or specialities' },
    { key: 'registration', label: 'Registration / consent', placeholder: 'How patients register' },
  ],
}

const EMPTY_FORM = {
  type: '',
  title: '',
  title_ne: '',
  description: '',
  description_ne: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  maxParticipants: '',
  whatToBring: '',
  coverUrl: null,
  address: '',
  address_ne: '',
  ward: '',
  latitude: ITAHARI_CENTER.lat,
  longitude: ITAHARI_CENTER.lng,
  radiusM: 150,
  organizationName: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
}

function localTodayISO() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fileExt(file, fallback = 'jpg') {
  const raw = (file.name.split('.').pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, '')
  return raw || fallback
}

export default function EventForm() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const editId = searchParams.get('edit')
  const { t } = useLanguage()

  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const [todayDate, setTodayDate] = useState('')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [answers, setAnswers] = useState({})
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const [coverFile, setCoverFile] = useState(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null)
  const [docFile, setDocFile] = useState(null)
  const [existingDocPaths, setExistingDocPaths] = useState([])

  const [draftSavedAt, setDraftSavedAt] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editId))
  const coverInputRef = useRef(null)
  const docInputRef = useRef(null)
  const draftKey = editId ? `${DRAFT_KEY}:${editId}` : DRAFT_KEY

  useEffect(() => {
    // Deferred: localTodayISO() reads the browser clock, which differs from the
    // server's, so it cannot be computed during render without a mismatch.
    Promise.resolve().then(() => setTodayDate(localTodayISO()))
  }, [])

  // Revoke local object URL when coverFile changes or component unmounts
  useEffect(() => {
    if (!coverFile) {
      Promise.resolve().then(() => setCoverPreviewUrl(null))
      return
    }
    const objectUrl = URL.createObjectURL(coverFile)
    Promise.resolve().then(() => setCoverPreviewUrl(objectUrl))
    return () => URL.revokeObjectURL(objectUrl)
  }, [coverFile])

  const set = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => (previous[key] ? { ...previous, [key]: '' } : previous))
  }
  const setAnswer = (key, value) => setAnswers((previous) => ({ ...previous, [key]: value }))

  // --- session -------------------------------------------------------------
  useEffect(() => {
    let active = true
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return
        const currentUser = data?.user ?? null
        setUser(currentUser)
        if (currentUser && !editId) {
          setForm((prev) => ({
            ...prev,
            contactEmail: prev.contactEmail || currentUser.email || '',
            contactName:
              prev.contactName ||
              currentUser.user_metadata?.full_name ||
              currentUser.user_metadata?.name ||
              '',
          }))
        }
      })
      .catch(() => active && setUser(null))
    return () => {
      active = false
    }
  }, [supabase, editId])

  // --- edit mode: prefill from the existing application --------------------
  useEffect(() => {
    if (!editId) return
    let active = true
    Promise.resolve()
      .then(() => getEvent(editId))
      .then((event) => {
        if (!active || !event) return
        setForm({
          type: event.type,
          title: event.title,
          title_ne: event.title_ne ?? '',
          description: event.description,
          description_ne: event.description_ne ?? '',
          eventDate: event.eventDate,
          startTime: event.startTime,
          endTime: event.endTime,
          maxParticipants: event.maxParticipants ? String(event.maxParticipants) : '',
          whatToBring: event.whatToBring,
          coverUrl: event.coverUrl,
          address: event.address,
          address_ne: event.address_ne ?? '',
          ward: event.ward,
          latitude: event.latitude ?? ITAHARI_CENTER.lat,
          longitude: event.longitude ?? ITAHARI_CENTER.lng,
          radiusM: event.radiusM || 150,
          organizationName: event.organizationName,
          contactName: event.contactName,
          contactPhone: event.contactPhone,
          contactEmail: event.contactEmail,
        })
        setAnswers(event.answers ?? {})
        setExistingDocPaths(Array.isArray(event.documentPaths) ? event.documentPaths : [])
      })
      .catch((err) => {
        if (active) setFormError(eventsErrorMessage(err))
      })
      .finally(() => active && setIsLoadingEdit(false))
    return () => {
      active = false
    }
  }, [editId])

  // --- draft autosave (new applications only) ------------------------------
  useEffect(() => {
    if (editId || submitted || user === undefined) return
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ form, answers, step }))
        setDraftSavedAt(Date.now())
      } catch {
        // Storage is best-effort; the form keeps working without it.
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [draftKey, editId, submitted, user, form, answers, step])

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey)
    } catch {
      // ignore
    }
  }, [draftKey])

  const [draftRestored, setDraftRestored] = useState(false)
  useEffect(() => {
    if (editId || draftRestored) return
    Promise.resolve()
      .then(() => {
        const raw = window.localStorage.getItem(draftKey)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (parsed?.form?.type) {
          setForm((prev) => ({ ...EMPTY_FORM, ...prev, ...parsed.form }))
          setAnswers(parsed.answers ?? {})
          if (typeof parsed.step === 'number') setStep(parsed.step)
        }
      })
      .catch(() => {})
      .finally(() => setDraftRestored(true))
  }, [draftKey, editId, draftRestored])

  const typeQuestions = useMemo(() => TYPE_QUESTIONS[form.type] ?? [], [form.type])

  const questionLabelByKey = useMemo(() => {
    const map = new Map()
    for (const q of [...GENERAL_QUESTIONS, ...typeQuestions]) {
      map.set(q.key, q.label)
    }
    return map
  }, [typeQuestions])

  function validateStep(current) {
    const next = {}
    const minDate = todayDate || localTodayISO()

    if (current === 1 && !form.type) next.type = t('Choose an event type.')
    if (current === 2) {
      if (!form.title.trim()) next.title = t('Give the event a title.')
      if (form.description.trim().length < 80) {
        next.description = t('Write at least 80 characters ({n} so far).', {
          n: form.description.trim().length,
        })
      }
      if (!form.eventDate) next.eventDate = t('Pick a date.')
      else if (form.eventDate < minDate) next.eventDate = t('Choose today or a future date.')
      if (!form.startTime) next.startTime = t('Add a start time.')
      if (!form.endTime) next.endTime = t('Add an end time.')
      else if (form.startTime && form.endTime <= form.startTime) {
        next.endTime = t('End time must be after the start.')
      }
      if (form.maxParticipants && Number(form.maxParticipants) <= 0) {
        next.maxParticipants = t('Enter a positive number.')
      }
    }
    if (current === 3) {
      if (!Number.isFinite(form.latitude) || !Number.isFinite(form.longitude)) {
        next.location = t('Place the pin on the map.')
      }
      if (!form.address.trim()) next.address = t('Add an address or landmark.')
    }
    if (current === 4) {
      if (!form.contactName.trim()) next.contactName = t('Add a contact person.')
      if (!form.contactPhone.trim()) next.contactPhone = t('Add a phone number.')
      if (!form.contactEmail.trim()) next.contactEmail = t('Add an email.')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
        next.contactEmail = t('Enter a valid email address.')
      }
    }
    if (current === 5 && !confirm) next.confirm = t('Please confirm before submitting.')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function goNext() {
    if (!validateStep(step)) return
    setStep((current) => Math.min(5, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError(t('Please choose an image file.'))
      return
    }
    if (file.size > MAX_COVER_BYTES) {
      setFormError(t('Cover photos must be 1 MB or smaller.'))
      return
    }
    setFormError('')
    if (EVENTS_BACKEND === 'supabase') {
      setCoverFile(file)
      set('coverUrl', null)
    } else {
      const reader = new FileReader()
      reader.onload = () => set('coverUrl', String(reader.result))
      reader.readAsDataURL(file)
      setCoverFile(null)
    }
  }

  function handleDocChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > MAX_DOC_BYTES) {
      setFormError(t('Documents must be 5 MB or smaller.'))
      return
    }
    if (!(file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setFormError(t('Documents must be a PDF or an image.'))
      return
    }
    setFormError('')
    setDocFile(file)
  }

  async function uploadCover(file) {
    const ext = fileExt(file, 'jpg')
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('event-photos')
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })
    if (error) throw error
    return supabase.storage.from('event-photos').getPublicUrl(path).data.publicUrl
  }

  async function uploadDocument(file) {
    const ext = fileExt(file, 'pdf')
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('event-documents')
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })
    if (error) throw error
    return path
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    if (!validateStep(5) || !user || isSubmitting) return

    setIsSubmitting(true)
    setFormError('')
    try {
      const coverUrl = coverFile ? await uploadCover(coverFile) : form.coverUrl
      const uploadedPath = docFile ? await uploadDocument(docFile) : null
      const documentPaths = uploadedPath
        ? [...existingDocPaths, uploadedPath]
        : existingDocPaths

      const payload = {
        type: form.type,
        title: form.title.trim(),
        title_ne: form.title_ne.trim(),
        description: form.description.trim(),
        description_ne: form.description_ne.trim(),
        eventDate: form.eventDate,
        startTime: form.startTime,
        endTime: form.endTime,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
        whatToBring: form.whatToBring.trim(),
        coverUrl,
        address: form.address.trim(),
        address_ne: form.address_ne.trim(),
        ward: form.ward.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        radiusM: Number(form.radiusM),
        organizationName: form.organizationName.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
        answers,
        documentPaths,
      }

      if (editId) await updateApplication(editId, payload)
      else await createApplication(payload)

      clearDraft()
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Event Upload Error]', err)
      }
      setFormError(eventsErrorMessage(err))
      setIsSubmitting(false)
    }
  }

  const summary = useMemo(() => {
    const meta = eventTypeMeta(form.type)
    const rows = [
      { label: t('Type'), value: form.type ? t(meta.label) : t('Not chosen') },
      { label: t('Title'), value: form.title.trim() || t('Not set') },
      { label: t('Date'), value: form.eventDate || t('Not set') },
      {
        label: t('Time'),
        value: form.startTime && form.endTime ? `${form.startTime} – ${form.endTime}` : t('Not set'),
      },
      { label: t('Place'), value: form.address.trim() || t('Not set') },
      { label: t('Participants'), value: form.maxParticipants || t('No limit') },
    ]
    if (form.title_ne.trim()) rows.push({ label: t('Title in Nepali'), value: form.title_ne.trim() })
    if (coverFile || form.coverUrl) {
      rows.push({ label: t('Cover photo'), value: coverFile ? coverFile.name : t('Attached') })
    }
    const totalDocs = existingDocPaths.length + (docFile ? 1 : 0)
    if (totalDocs > 0) {
      rows.push({ label: t('Supporting documents'), value: `${totalDocs}` })
    }
    return rows
  }, [form, coverFile, docFile, existingDocPaths.length, t])

  if (user === undefined || isLoadingEdit) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-5 w-52 animate-pulse rounded bg-ink/10" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-ink/5" />
      </div>
    )
  }

  if (user === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Breadcrumbs
          items={[
            { label: t('Dashboard'), href: '/dashboard' },
            { label: t('Events'), href: '/events' },
            { label: t('Organise') },
          ]}
        />
        <div className="card p-6 text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-ink/60">
            <LogIn className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold text-ink">{t('Sign in to organise an event')}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            {t(
              'Anyone can browse events. An account lets you submit an application and track the review decision under My events.'
            )}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/login?next=/events/new"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              {t('Log in')}
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
            >
              {t('Create account')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Breadcrumbs
          items={[
            { label: t('Dashboard'), href: '/dashboard' },
            { label: t('Events'), href: '/events' },
            { label: t('Organise') },
          ]}
        />
        <div className="card p-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink">
            <CircleCheck className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold text-ink">
            {editId ? t('Changes sent for review') : t('Application sent')}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            {t(
              'An admin will review it. You will see the decision in My events. Your event stays private until it is approved.'
            )}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/profile?tab=events"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              {t('My events')}
            </Link>
            <Link
              href="/events"
              className="rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
            >
              {t('Browse events')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const activeCoverDisplayUrl = coverPreviewUrl || form.coverUrl

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: t('Dashboard'), href: '/dashboard' },
          { label: t('Events'), href: '/events' },
          { label: editId ? t('Edit event') : t('Organise') },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {editId ? t('Edit your event') : t('Organise an event')}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          {t('Five short steps. Nothing is public until an admin approves it.')}
        </p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
          <span>
            {t('Step {n} of 5', { n: step })} · {t(STEPS[step - 1])}
          </span>
          {!editId && draftSavedAt ? <span className="text-ink/45">{t('Draft saved')}</span> : null}
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={`h-1.5 flex-1 rounded-full ${index < step ? 'bg-accent' : 'bg-ink/10'}`}
            />
          ))}
        </div>
      </div>

      {formError ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {formError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Step 1 — Type */}
        {step === 1 ? (
          <section className="card p-6">
            <h2 className="mb-1 text-sm font-bold text-ink">{t('What kind of event is this?')}</h2>
            <p className="mb-4 text-xs text-ink/50">
              {t('Pick one. Each type asks a few extra questions later.')}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {EVENT_TYPES.map(({ key, label, Icon }) => {
                const active = form.type === key
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set('type', key)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-xs font-semibold transition-colors duration-150 ${
                      active
                        ? 'border-accent bg-surface text-ink'
                        : 'border-ink/15 bg-white text-ink/70 hover:bg-ink/5'
                    }`}
                  >
                    <Icon className="h-9 w-9" />
                    {t(label)}
                  </button>
                )
              })}
            </div>
            {errors.type ? (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-ink">
                <AlertCircle className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} aria-hidden="true" />
                {errors.type}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Step 2 — Basics */}
        {step === 2 ? (
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-bold text-ink">{t('The basics')}</h2>
            <div className="space-y-4">
              <Field id="title" label={t('Event title')} required error={errors.title}>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(event) => set('title', event.target.value)}
                  placeholder={t('e.g. Ward 6 roadside plantation')}
                  className={`${inputClass} ${errors.title ? inputInvalid : inputIdle}`}
                />
              </Field>

              <Field
                id="description"
                label={t('Description')}
                required
                error={errors.description}
                hint={t('{n}/80 characters minimum', { n: form.description.trim().length })}
              >
                <textarea
                  id="description"
                  rows={5}
                  value={form.description}
                  onChange={(event) => set('description', event.target.value)}
                  placeholder={t('What will happen, who is it for, and what should people expect?')}
                  className={`${inputClass} ${errors.description ? inputInvalid : inputIdle}`}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="eventDate" label={t('Date')} required error={errors.eventDate}>
                  <input
                    id="eventDate"
                    type="date"
                    min={todayDate || undefined}
                    value={form.eventDate}
                    onChange={(event) => set('eventDate', event.target.value)}
                    className={`${inputClass} ${errors.eventDate ? inputInvalid : inputIdle}`}
                  />
                </Field>
                <Field id="startTime" label={t('Start time')} required error={errors.startTime}>
                  <input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(event) => set('startTime', event.target.value)}
                    className={`${inputClass} ${errors.startTime ? inputInvalid : inputIdle}`}
                  />
                </Field>
                <Field id="endTime" label={t('End time')} required error={errors.endTime}>
                  <input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(event) => set('endTime', event.target.value)}
                    className={`${inputClass} ${errors.endTime ? inputInvalid : inputIdle}`}
                  />
                </Field>
              </div>

              <Field
                id="maxParticipants"
                label={t('Maximum participants')}
                optional
                error={errors.maxParticipants}
                hint={t('Leave blank for no limit. Joining stops once this number is reached.')}
              >
                <input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={form.maxParticipants}
                  onChange={(event) => set('maxParticipants', event.target.value)}
                  className={`${inputClass} ${errors.maxParticipants ? inputInvalid : inputIdle}`}
                />
              </Field>

              <Field id="whatToBring" label={t('What to bring')} optional>
                <textarea
                  id="whatToBring"
                  rows={2}
                  value={form.whatToBring}
                  onChange={(event) => set('whatToBring', event.target.value)}
                  placeholder={t('Gloves, water bottle, a photo ID…')}
                  className={`${inputClass} ${inputIdle}`}
                />
              </Field>

              <details className="rounded-xl bg-surface p-4">
                <summary className="min-h-10 cursor-pointer break-words py-2 text-sm font-semibold text-ink">
                  {t('Add Nepali translation')}
                </summary>
                <p className="mt-2 break-words text-xs text-ink/50">
                  {t(
                    'Shown to readers who switch the site to Nepali. Leave a field blank to fall back to the English text.'
                  )}
                </p>
                <div className="mt-4 space-y-4">
                  <Field id="title_ne" label={t('Title in Nepali')} optional>
                    <input
                      id="title_ne"
                      type="text"
                      value={form.title_ne}
                      onChange={(event) => set('title_ne', event.target.value)}
                      className={`${inputClass} ${inputIdle}`}
                    />
                  </Field>
                  <Field id="address_ne" label={t('Address in Nepali')} optional>
                    <input
                      id="address_ne"
                      type="text"
                      value={form.address_ne}
                      onChange={(event) => set('address_ne', event.target.value)}
                      className={`${inputClass} ${inputIdle}`}
                    />
                  </Field>
                  <Field id="description_ne" label={t('Description in Nepali')} optional>
                    <textarea
                      id="description_ne"
                      rows={4}
                      value={form.description_ne}
                      onChange={(event) => set('description_ne', event.target.value)}
                      className={`${inputClass} ${inputIdle}`}
                    />
                  </Field>
                </div>
              </details>

              <div>
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  {t('Cover photo')}
                  <span className="ml-1.5 text-xs font-normal text-ink/45">{t('optional')}</span>
                </span>
                {activeCoverDisplayUrl || coverFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-ink/15 bg-white p-3">
                    {activeCoverDisplayUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- local preview or Supabase Storage URL */
                      <img
                        src={activeCoverDisplayUrl}
                        alt=""
                        className="h-14 w-20 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/45">
                        <ImagePlus className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs text-ink/70">
                      {coverFile ? coverFile.name : t('Cover selected')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null)
                        set('coverUrl', null)
                        if (coverInputRef.current) coverInputRef.current.value = ''
                      }}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-ink/60 transition-colors hover:bg-ink/5"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                      {t('Remove')}
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="cover"
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-ink/25 bg-ink/5 px-4 py-3.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
                  >
                    <ImagePlus className="h-4 w-4 text-ink/45" strokeWidth={1.8} aria-hidden="true" />
                    {t('Choose a cover photo (up to 1 MB)')}
                    <input
                      ref={coverInputRef}
                      id="cover"
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {/* Step 3 — Place */}
        {step === 3 ? (
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-bold text-ink">{t('Where it happens')}</h2>
            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-sm font-semibold text-ink">{t('Pin on the map')}</span>
                <div className="h-64">
                  <ItahariMap
                    onPick={({ lat, lng }) => {
                      set('latitude', lat)
                      set('longitude', lng)
                    }}
                    picked={{ lat: form.latitude, lng: form.longitude }}
                    zoom={13}
                    showPopups={false}
                    showZones={false}
                    fitToReports={false}
                  />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/50">
                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                  {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)} —{' '}
                  {t('tap the map to move the pin.')}
                </p>
                {errors.location ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-ink">
                    <AlertCircle className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} aria-hidden="true" />
                    {errors.location}
                  </p>
                ) : null}
              </div>

              <Field id="address" label={t('Address or landmark')} required error={errors.address}>
                <input
                  id="address"
                  type="text"
                  value={form.address}
                  onChange={(event) => set('address', event.target.value)}
                  placeholder={t('e.g. Community hall near Ward 3 office')}
                  className={`${inputClass} ${errors.address ? inputInvalid : inputIdle}`}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ward" label={t('Ward / area')} optional>
                  <input
                    id="ward"
                    type="text"
                    value={form.ward}
                    onChange={(event) => set('ward', event.target.value)}
                    placeholder={t('e.g. Ward 6')}
                    className={`${inputClass} ${inputIdle}`}
                  />
                </Field>
                <div>
                  <label htmlFor="radius" className="mb-1.5 block text-sm font-semibold text-ink">
                    {t('Event area radius')}
                  </label>
                  <input
                    id="radius"
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={form.radiusM}
                    onChange={(event) => set('radiusM', Number(event.target.value))}
                    className="h-10 w-full accent-[#ff6b5a]"
                  />
                  <p className="text-xs text-ink/50">{t('{n} m around the pin', { n: form.radiusM })}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Step 4 — Organiser and FAQ */}
        {step === 4 ? (
          <>
            <section className="card p-6">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink">
                <Info className="h-4 w-4 text-ink/40" strokeWidth={2} aria-hidden="true" />
                {t('Organiser details')}
              </h2>
              <p className="mb-4 text-xs text-ink/50">
                {t('Private — these are never shown publicly. Admins use them to review the application.')}
              </p>
              <div className="space-y-4">
                <Field
                  id="organizationName"
                  label={t('Group name')}
                  optional
                  hint={t('Leave blank to be shown as an individual organiser.')}
                >
                  <input
                    id="organizationName"
                    type="text"
                    value={form.organizationName}
                    onChange={(event) => set('organizationName', event.target.value)}
                    placeholder={t('e.g. Ward 6 Youth Club')}
                    className={`${inputClass} ${inputIdle}`}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field id="contactName" label={t('Contact person')} required error={errors.contactName}>
                    <input
                      id="contactName"
                      type="text"
                      value={form.contactName}
                      onChange={(event) => set('contactName', event.target.value)}
                      className={`${inputClass} ${errors.contactName ? inputInvalid : inputIdle}`}
                    />
                  </Field>
                  <Field id="contactPhone" label={t('Phone')} required error={errors.contactPhone}>
                    <input
                      id="contactPhone"
                      type="tel"
                      value={form.contactPhone}
                      onChange={(event) => set('contactPhone', event.target.value)}
                      className={`${inputClass} ${errors.contactPhone ? inputInvalid : inputIdle}`}
                    />
                  </Field>
                  <Field id="contactEmail" label={t('Email')} required error={errors.contactEmail}>
                    <input
                      id="contactEmail"
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) => set('contactEmail', event.target.value)}
                      className={`${inputClass} ${errors.contactEmail ? inputInvalid : inputIdle}`}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="mb-1 text-sm font-bold text-ink">{t('Questions for review')}</h2>
              <p className="mb-4 text-xs text-ink/50">
                {t(
                  'Private answers that help an admin judge the plan. They are not shown on the public event page.'
                )}
              </p>
              <div className="space-y-4">
                {GENERAL_QUESTIONS.map((question) => (
                  <QuestionField
                    key={question.key}
                    question={question}
                    value={answers[question.key] ?? ''}
                    onChange={(value) => setAnswer(question.key, value)}
                  />
                ))}
              </div>
            </section>

            {typeQuestions.length > 0 ? (
              <section className="card p-6">
                <h2 className="mb-1 text-sm font-bold text-ink">
                  {t('{label} questions', { label: t(eventTypeMeta(form.type).label) })}
                </h2>
                <p className="mb-4 text-xs text-ink/50">
                  {t('Specific to this event type. Also private.')}
                </p>
                <div className="space-y-4">
                  {typeQuestions.map((question) => (
                    <QuestionField
                      key={question.key}
                      question={question}
                      value={answers[question.key] ?? ''}
                      onChange={(value) => setAnswer(question.key, value)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="card p-6">
              <h2 className="mb-1 text-sm font-bold text-ink">{t('Supporting documents')}</h2>
              {EVENTS_BACKEND === 'supabase' ? (
                <>
                  <p className="mb-4 text-xs text-ink/50">
                    {t(
                      'Optional. A PDF or image up to 5 MB (permission letter, plan). Private to admins.'
                    )}
                  </p>

                  {existingDocPaths.length > 0 ? (
                    <div className="mb-3 space-y-2">
                      {existingDocPaths.map((docPath) => (
                        <div
                          key={docPath}
                          className="flex items-center gap-3 rounded-xl border border-ink/15 bg-surface/60 p-3"
                        >
                          <FileUp className="h-4 w-4 shrink-0 text-ink/55" strokeWidth={1.8} />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink/80">
                            {docPath.split('/').pop()}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setExistingDocPaths((prev) => prev.filter((p) => p !== docPath))
                            }
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ink/60 hover:bg-ink/5"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t('Remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {docFile ? (
                    <div className="flex items-center gap-3 rounded-xl border border-ink/15 bg-white p-3">
                      <FileUp
                        className="h-5 w-5 shrink-0 text-ink/45"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-ink/70">
                        {docFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDocFile(null)
                          if (docInputRef.current) docInputRef.current.value = ''
                        }}
                        className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-ink/60 transition-colors hover:bg-ink/5"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                        {t('Remove')}
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="document"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-ink/25 bg-ink/5 px-4 py-3.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
                    >
                      <FileUp
                        className="h-4 w-4 text-ink/45"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      {t('Choose a document')}
                      <input
                        ref={docInputRef}
                        id="document"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleDocChange}
                        className="sr-only"
                      />
                    </label>
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-ink/20 bg-ink/5 px-4 py-3.5 text-sm font-medium text-ink/55">
                  {t('Coming soon — document upload needs the Supabase backend.')}
                </p>
              )}
            </section>
          </>
        ) : null}

        {/* Step 5 — Review */}
        {step === 5 ? (
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-bold text-ink">{t('Review and confirm')}</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {summary.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-ink/50">{row.label}</dt>
                  <dd className="truncate font-medium text-ink" title={row.value}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            {Object.keys(answers).filter((key) => answers[key]).length > 0 ? (
              <details className="mt-4 rounded-xl bg-surface p-4">
                <summary className="cursor-pointer break-words text-xs font-semibold text-ink">
                  {t('Review answers')} ({Object.keys(answers).filter((key) => answers[key]).length})
                </summary>
                <dl className="mt-3 space-y-2 text-xs">
                  {Object.entries(answers)
                    .filter(([, value]) => value)
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt className="font-semibold text-ink/70">
                          {t(questionLabelByKey.get(key) || key)}
                        </dt>
                        <dd className="text-ink/70">{value}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            ) : null}

            <label className="mt-5 flex items-start gap-3 rounded-xl border border-ink/15 bg-white p-3.5">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(event) => {
                  setConfirm(event.target.checked)
                  setErrors((previous) => ({ ...previous, confirm: '' }))
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#ff6b5a]"
              />
              <span className="text-sm text-ink">
                {t(
                  'The details are correct and this is not a duplicate. I understand it stays private until an admin approves it.'
                )}
              </span>
            </label>
            {errors.confirm ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink">
                <AlertCircle className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} aria-hidden="true" />
                {errors.confirm}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              {t('Back')}
            </button>
          ) : (
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
            >
              {t('Cancel')}
            </Link>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
            >
              {t('Next')}
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
              {isSubmitting
                ? t('Submitting…')
                : editId
                  ? t('Resubmit for review')
                  : t('Submit for review')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function QuestionField({ question, value, onChange }) {
  const { t } = useLanguage()
  if (question.select) {
    return (
      <Field id={`q-${question.key}`} label={t(question.label)} optional>
        <select
          id={`q-${question.key}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} ${inputIdle}`}
        >
          <option value="">{t('Select…')}</option>
          {question.select.map((option) => (
            <option key={option} value={option}>
              {t(option)}
            </option>
          ))}
        </select>
      </Field>
    )
  }
  return (
    <Field id={`q-${question.key}`} label={t(question.label)} optional>
      <input
        id={`q-${question.key}`}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t(question.placeholder)}
        className={`${inputClass} ${inputIdle}`}
      />
    </Field>
  )
}