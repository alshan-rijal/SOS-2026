'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Check,
  Crosshair,
  ImagePlus,
  Info,
  Lock,
  LogIn,
  MapPin,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  CATEGORIES,
  ITAHARI_CENTER,
  SEVERITY_CONFIG,
  addStatusHistory,
  categoryLabel,
  createReport,
  reportErrorMessage,
  severityLabel,
  statusLabel,
  uploadConfidentialReportImage,
  uploadReportImage,
} from '@/lib/reports'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Field, inputClass, inputIdle, inputInvalid } from '@/components/Field'
import { useLanguage } from '@/components/LanguageContext'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-ink/5" />,
})

export default function ReportForm() {
  const router = useRouter()
  const supabase = createClient()
  const { t, lang } = useLanguage()

  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const [reporterName, setReporterName] = useState('')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [description, setDescription] = useState('')
  const [locationName, setLocationName] = useState('')
  const [coords, setCoords] = useState(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isConfidential, setIsConfidential] = useState(false)

  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef(null)
  const previewUrlRef = useRef('')

  useEffect(() => {
    let active = true
    async function loadUser() {
      const {
        data: { user: current },
      } = await supabase.auth.getUser()
      if (!active) return
      if (!current) {
        setUser(null)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', current.id)
        .maybeSingle()
      if (!active) return
      setReporterName(profile?.full_name || current.user_metadata?.full_name || 'Anonymous')
      setUser(current)
    }
    loadUser()
    return () => {
      active = false
    }
  }, [supabase])

  // Keep the preview object URL alive only as long as the file is selected.
  // Created on selection (an event) and revoked on unmount.
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    []
  )

  function setSelectedFile(nextFile) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const nextUrl = nextFile ? URL.createObjectURL(nextFile) : ''
    previewUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)
    setFile(nextFile)
  }

  const summary = useMemo(
    () => ({
      category: category ? categoryLabel(category, lang) : t('Not selected'),
      severity: severityLabel(severity, lang),
      location: locationName || (coords ? t('Pinned on map') : t('Not set')),
    }),
    [category, severity, locationName, coords, lang, t]
  )

  function validate() {
    const nextErrors = {}
    if (!title.trim()) nextErrors.title = t('Please enter a report title.')
    if (!category) nextErrors.category = t('Please select a category.')
    if (!description.trim()) nextErrors.description = t('Please describe the problem.')
    if (!locationName.trim()) nextErrors.locationName = t('Please enter the location.')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function clearError(field) {
    setErrors((previous) => (previous[field] ? { ...previous, [field]: '' } : previous))
  }

  function handleFileChange(event) {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setFormError('Please choose an image file.')
      return
    }
    setFormError('')
    setSelectedFile(selected)
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setFormError('This browser cannot share your location.')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: +position.coords.latitude.toFixed(6),
          lng: +position.coords.longitude.toFixed(6),
        })
        setIsLocating(false)
      },
      () => {
        setFormError('Could not read your location. Set the pin on the map instead.')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (!validate() || !user) return

    setIsSubmitting(true)
    const reportId = crypto.randomUUID()

    try {
      let imageUrl = null
      if (file) {
        // A confidential photo goes to the private bucket and is stored as a
        // path, never a public URL.
        imageUrl = isConfidential
          ? await uploadConfidentialReportImage(supabase, file, user.id, reportId)
          : await uploadReportImage(supabase, file, reportId)
      }

      await createReport(supabase, {
        id: reportId,
        user_id: user.id,
        reporter_name: reporterName || 'Anonymous',
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        status: 'reported',
        location_name: locationName.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        image_url: imageUrl,
        is_confidential: isConfidential,
      })

      await addStatusHistory(supabase, reportId, 'reported', 'Report submitted.')

      router.push(`/reports/${reportId}?created=1`)
    } catch (err) {
      setFormError(
        err?.message === 'Images must be 5 MB or smaller.'
          ? err.message
          : reportErrorMessage(err, 'report form')
      )
      setIsSubmitting(false)
    }
  }

  if (user === undefined) {
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
            { label: t('Reports'), href: '/reports' },
            { label: t('Report an issue') },
          ]}
        />
        <div className="card p-6 text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-ink/60">
            <LogIn className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold text-ink">{t('Sign in to report an issue')}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            {t('Anyone can read reports. An account keeps reports tied to a real reporter and lets you verify problems in your area.')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              {t('Sign in')}
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: t('Dashboard'), href: '/dashboard' },
          { label: t('Reports'), href: '/reports' },
          { label: t('Report an issue') },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t('Report an issue')}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {t('Describe the problem and mark where it is. Reports are published immediately and can be verified by neighbours.')}
        </p>
      </div>

      {formError ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {t(formError)}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">{t('Details')}</h2>
          <div className="space-y-4">
            <Field id="title" label={t('Report title')} required error={errors.title}>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                  clearError('title')
                }}
                placeholder={t('e.g. Blocked drainage pipe near Ward 4')}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'title-error' : undefined}
                className={`${inputClass} ${errors.title ? inputInvalid : inputIdle}`}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="category" label={t('Category')} required error={errors.category}>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value)
                    clearError('category')
                  }}
                  aria-invalid={Boolean(errors.category)}
                  aria-describedby={errors.category ? 'category-error' : undefined}
                  className={`${inputClass} ${errors.category ? inputInvalid : inputIdle}`}
                >
                  <option value="">{t('Select a category')}</option>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {categoryLabel(item, lang)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="severity" label={t('Severity')} required>
                <select
                  id="severity"
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                  className={`${inputClass} ${inputIdle}`}
                >
                  {Object.keys(SEVERITY_CONFIG).map((key) => (
                    <option key={key} value={key}>
                      {severityLabel(key, lang)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              id="description"
              label={t('Description')}
              required
              error={errors.description}
              hint={t('What is wrong, and how is it affecting people?')}
            >
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  clearError('description')
                }}
                placeholder={t('Describe the problem so neighbours can confirm it.')}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? 'description-error' : 'description-hint'}
                className={`${inputClass} ${errors.description ? inputInvalid : inputIdle}`}
              />
            </Field>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">{t('Location')}</h2>
          <div className="space-y-4">
            <Field
              id="locationName"
              label={t('Address or landmark')}
              required
              error={errors.locationName}
            >
              <input
                id="locationName"
                type="text"
                value={locationName}
                onChange={(event) => {
                  setLocationName(event.target.value)
                  clearError('locationName')
                }}
                placeholder={t('e.g. Ward 5, near Bus Park')}
                aria-invalid={Boolean(errors.locationName)}
                aria-describedby={errors.locationName ? 'locationName-error' : undefined}
                className={`${inputClass} ${errors.locationName ? inputInvalid : inputIdle}`}
              />
            </Field>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {t('Pinpoint on the map')}
                  <span className="ml-1.5 text-xs font-normal text-ink/45">{t('optional')}</span>
                </span>
                <div className="flex items-center gap-2">
                  {coords ? (
                    <button
                      type="button"
                      onClick={() => setCoords(null)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink/60 transition-colors hover:bg-ink/5"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                      {t('Clear pin')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-50"
                  >
                    <Crosshair className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                    {isLocating ? t('Locating…') : t('Use my location')}
                  </button>
                </div>
              </div>

              <div className="h-56 sm:h-64">
                <ItahariMap
                  onPick={setCoords}
                  picked={coords ?? ITAHARI_CENTER}
                  zoom={13}
                  showPopups={false}
                  showZones={false}
                  fitToReports={false}
                />
              </div>

              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/50">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                {coords
                  ? t('Pin at {coords} — click the map to move it.', {
                      coords: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
                    })
                  : t('Click the map to place a pin, or use your current location.')}
              </p>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-1 text-sm font-bold text-ink">{t('Photo')}</h2>
          <p className="mb-4 text-xs text-ink/50">
            {t('One photo, up to 5 MB. JPG, PNG or WebP.')} {/* shortcut: one photo per
            report (reports.image_url); add a report_images table for galleries. */}
          </p>

          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl ring-1 ring-ink/10">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={previewUrl} alt={t('Selected report photo')} className="max-h-72 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-ink/75 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                {t('Remove')}
              </button>
            </div>
          ) : (
            <label
              htmlFor="photo"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/25 bg-ink/5 px-6 py-10 text-center transition-colors hover:border-accent hover:bg-accent/5"
            >
              <ImagePlus className="h-6 w-6 text-ink/40" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-sm font-medium text-ink">{t('Choose a photo')}</span>
              <span className="text-xs text-ink/50">{t('A clear photo helps others confirm the problem.')}</span>
              <input
                ref={fileInputRef}
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          )}
        </section>

        <section className="card p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isConfidential}
              onChange={(event) => setIsConfidential(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#ff6b5a]"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-bold text-ink">
                <Lock className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                {t('Confidential report')}
              </span>
              <span className="mt-1 block text-xs text-ink/60">
                {t('Only you and the authorities can see this. It will not appear on the public map, lists or counts.')}
              </span>
            </span>
          </label>
        </section>

        <div className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Info className="h-4 w-4 text-ink/40" strokeWidth={2} aria-hidden="true" />
            {t('Before you submit')}
          </h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-ink/50">{t('Category')}</dt>
              <dd className="font-medium text-ink">{summary.category}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink/50">{t('Severity')}</dt>
              <dd className="font-medium text-ink">{summary.severity}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink/50">{t('Location')}</dt>
              <dd className="truncate font-medium text-ink">{summary.location}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink/50">
            {isConfidential
              ? t('This report is confidential. It stays off the public map and counts.')
              : t('New reports start as {status} and appear on the map right away.', {
                  status: statusLabel('reported', lang),
                })}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/reports"
            className="inline-flex items-center justify-center rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            {t('Cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
            {isSubmitting ? t('Submitting…') : t('Submit report')}
          </button>
        </div>
      </form>
    </div>
  )
}
