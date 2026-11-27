'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Camera,
  Check,
  CircleCheck,
  FileText,
  KeyRound,
  LogOut,
  Plus,
  ThumbsUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  STATUS_CONFIG,
  fetchMyReports,
  fetchMyVerifiedIds,
  fetchProfile,
  fetchVerificationsGiven,
  formatDate,
  normalizeReport,
  reportErrorMessage,
  timeAgo,
  uploadAvatar,
  upsertProfile,
} from '@/lib/reports'
import { SeverityBadge, StatusBadge } from '@/components/Badges'
import Avatar from '@/components/Avatar'
import { Field, inputClass, inputIdle, inputInvalid } from '@/components/Field'
import EmptyState from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'resolved']

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5 text-center">
      <span className="block text-lg font-bold text-ink">{value}</span>
      <span className="mt-0.5 block text-[11px] font-medium text-ink/60">{label}</span>
    </div>
  )
}

export default function ProfileView() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [ward, setWard] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [errors, setErrors] = useState({})
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [saveError, setSaveError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const [reports, setReports] = useState([])
  const [verificationsGiven, setVerificationsGiven] = useState(0)
  const [filter, setFilter] = useState('all')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordState, setPasswordState] = useState('idle') // idle | saving | saved | error
  const [isSigningOut, setIsSigningOut] = useState(false)

  const load = useCallback(async () => {
    try {
      const {
        data: { user: current },
      } = await supabase.auth.getUser()
      if (!current) {
        router.replace('/login?next=/profile')
        return
      }
      const [profileRow, myRows, verifiedIds, given] = await Promise.all([
        fetchProfile(supabase, current.id),
        fetchMyReports(supabase, current.id),
        fetchMyVerifiedIds(supabase),
        fetchVerificationsGiven(supabase, current.id),
      ])

      setUser(current)
      setFullName(profileRow?.full_name || current.user_metadata?.full_name || '')
      setPhone(profileRow?.phone || '')
      setWard(profileRow?.ward || '')
      setBio(profileRow?.bio || '')
      setAvatarUrl(profileRow?.avatar_url || current.user_metadata?.avatar_url || '')
      setReports(myRows.map((row) => normalizeReport(row, verifiedIds)))
      setVerificationsGiven(given)
      setLoadError('')
    } catch (err) {
      setLoadError(reportErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    // Kick the fetch off the synchronous effect body; it resolves on a later tick.
    Promise.resolve().then(load)
  }, [load])

  function validate() {
    const nextErrors = {}
    if (!fullName.trim()) nextErrors.fullName = 'Please enter your full name.'
    if (phone.trim() && !/^[0-9+\-\s()]{6,20}$/.test(phone.trim())) {
      nextErrors.phone = 'Enter a valid phone number.'
    }
    if (bio.length > 280) nextErrors.bio = 'Keep your bio under 280 characters.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaveError('')
    if (!validate() || !user) return

    setSaveState('saving')
    const values = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      ward: ward.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl || null,
    }

    try {
      const { error } = await supabase.auth.updateUser({ data: values })
      if (error) throw error
      await upsertProfile(supabase, user.id, values)
      setSaveState('saved')
      setUser((current) => ({ ...current, user_metadata: { ...current.user_metadata, ...values } }))
    } catch (err) {
      setSaveState('error')
      setSaveError(reportErrorMessage(err))
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file || !user) return
    setIsUploading(true)
    setSaveError('')
    try {
      const url = await uploadAvatar(supabase, file, user.id)
      setAvatarUrl(url)
      await upsertProfile(supabase, user.id, { avatar_url: url })
      await supabase.auth.updateUser({ data: { avatar_url: url } })
    } catch (err) {
      setSaveState('error')
      setSaveError(err?.message || 'Could not upload the photo.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault()
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The two passwords do not match.')
      return
    }

    setPasswordState('saving')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordState('error')
      setPasswordError(error.message)
      return
    }
    setPasswordState('saved')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]} />
        <div className="card h-48 animate-pulse p-6" />
        <div className="card h-72 animate-pulse p-6" />
      </div>
    )
  }

  if (!user) {
    return loadError ? (
      <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm font-medium text-ink">
        {loadError}
      </div>
    ) : null
  }

  const stats = {
    submitted: reports.length,
    verified: reports.filter((report) => report.verifications > 0).length,
    resolved: reports.filter((report) => report.status === 'resolved').length,
    given: verificationsGiven,
  }

  const visibleReports = filter === 'all' ? reports : reports.filter((report) => report.status === filter)
  const displayName = fullName.trim() || user.email

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]} />

      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Profile</h1>

      {/* Header card */}
      <section className="card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0 self-start">
            <Avatar src={avatarUrl} name={displayName} size={72} />
            <label
              htmlFor="avatar"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-ink/15 bg-white text-ink shadow-sm transition-colors duration-150 hover:bg-ink/5"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              <span className="sr-only">Change profile photo</span>
            </label>
            <input
              ref={fileInputRef}
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="sr-only"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-ink" title={displayName}>
              {displayName}
            </h2>
            <p className="truncate text-sm text-ink/60" title={user.email}>
              {user.email}
            </p>
            <p className="mt-0.5 text-xs text-ink/50">
              Member since {formatDate(user.created_at)}
              {ward ? ` · ${ward}` : ''}
            </p>
            {isUploading ? <p className="mt-1 text-xs font-medium text-ink/60">Uploading photo…</p> : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Reports submitted" value={stats.submitted} />
          <StatTile label="Verified" value={stats.verified} />
          <StatTile label="Resolved" value={stats.resolved} />
          <StatTile label="Verifications given" value={stats.given} />
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Edit form + account */}
        <div className="space-y-6 lg:col-span-5">
          <section className="card p-6">
            <h2 className="text-base font-bold text-ink">Edit profile</h2>
            <p className="mt-1 text-sm text-ink/60">
              Your name is shown on every report you submit.
            </p>

            {saveState === 'saved' ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm font-medium text-ink">
                <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
                Profile saved.
              </div>
            ) : null}
            {saveState === 'error' && saveError ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm font-medium text-ink">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
                {saveError}
              </div>
            ) : null}

            <form onSubmit={handleSave} noValidate className="mt-4 space-y-4">
              <Field id="fullName" label="Full name" required error={errors.fullName}>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value)
                    setSaveState('idle')
                    if (errors.fullName) setErrors((previous) => ({ ...previous, fullName: '' }))
                  }}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  className={`${inputClass} ${errors.fullName ? inputInvalid : inputIdle}`}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="phone" label="Phone" error={errors.phone}>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value)
                      setSaveState('idle')
                      if (errors.phone) setErrors((previous) => ({ ...previous, phone: '' }))
                    }}
                    placeholder="Optional"
                    className={`${inputClass} ${errors.phone ? inputInvalid : inputIdle}`}
                  />
                </Field>

                <Field id="ward" label="Ward / area">
                  <input
                    id="ward"
                    type="text"
                    value={ward}
                    onChange={(event) => {
                      setWard(event.target.value)
                      setSaveState('idle')
                    }}
                    placeholder="e.g. Ward 5"
                    className={`${inputClass} ${inputIdle}`}
                  />
                </Field>
              </div>

              <Field
                id="bio"
                label="Short bio"
                error={errors.bio}
                hint={`${bio.length}/280 characters`}
              >
                <textarea
                  id="bio"
                  rows={3}
                  value={bio}
                  onChange={(event) => {
                    setBio(event.target.value)
                    setSaveState('idle')
                    if (errors.bio) setErrors((previous) => ({ ...previous, bio: '' }))
                  }}
                  placeholder="A line about you or your area."
                  className={`${inputClass} ${errors.bio ? inputInvalid : inputIdle}`}
                />
              </Field>

              <button
                type="submit"
                disabled={saveState === 'saving'}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                {saveState === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <KeyRound className="h-4 w-4 text-ink/45" strokeWidth={2.2} aria-hidden="true" />
              Account
            </h2>

            {passwordState === 'saved' ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm font-medium text-ink">
                <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
                Password updated.
              </div>
            ) : null}
            {passwordError ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm font-medium text-ink">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
                {passwordError}
              </div>
            ) : null}

            <form onSubmit={handlePasswordChange} noValidate className="mt-4 space-y-4">
              <Field id="newPassword" label="New password" hint="At least 8 characters.">
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    setPasswordError('')
                  }}
                  className={`${inputClass} ${inputIdle}`}
                />
              </Field>
              <Field id="confirmPassword" label="Confirm password">
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setPasswordError('')
                  }}
                  className={`${inputClass} ${inputIdle}`}
                />
              </Field>
              <button
                type="submit"
                disabled={passwordState === 'saving'}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-ink/15 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {passwordState === 'saving' ? 'Updating…' : 'Change password'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-accent/40 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-accent/10 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </section>
        </div>

        {/* My reports */}
        <section className="card p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-ink">My reports</h2>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="report-filter">
                Filter by status
              </label>
              <select
                id="report-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {STATUS_FILTERS.map((key) => (
                  <option key={key} value={key}>
                    {key === 'all' ? 'All statuses' : STATUS_CONFIG[key].label}
                  </option>
                ))}
              </select>
              <Link
                href="/reports/new"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                New
              </Link>
            </div>
          </div>

          {visibleReports.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={FileText}
                title={reports.length === 0 ? 'You have not reported anything yet' : 'No reports with this status'}
                description={
                  reports.length === 0
                    ? 'Report a local problem and it will appear here.'
                    : 'Try a different status filter.'
                }
                action={
                  reports.length === 0 ? (
                    <Link
                      href="/reports/new"
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent/90"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                      Report an issue
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {visibleReports.map((report) => (
                <li key={report.id}>
                  <Link
                    href={`/reports/${report.id}`}
                    className="flex items-center gap-3 rounded-xl border border-ink/12 p-3 transition-colors duration-150 hover:bg-ink/5"
                  >
                    {report.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL */
                      <img
                        src={report.imageUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-ink/10"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/40">
                        <FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink" title={report.title}>
                        {report.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink/60">
                        {report.category} · {formatDate(report.createdAt)}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <SeverityBadge severity={report.severity} />
                        <StatusBadge status={report.status} />
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink/55">
                          <ThumbsUp className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                          {report.verifications}
                        </span>
                        <span className="text-[11px] text-ink/45">{timeAgo(report.createdAt)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
