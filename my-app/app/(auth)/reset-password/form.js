'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TextField from '@/components/Field'
import { useLanguage } from '@/components/LanguageContext'

export default function ResetPasswordForm() {
  const { t } = useLanguage()
  const supabase = createClient()

  // 'checking' until we know whether the recovery link produced a session.
  const [sessionState, setSessionState] = useState('checking')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSessionState(data.session ? 'ready' : 'invalid')
    })
    return () => {
      active = false
    }
  }, [supabase])

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const nextErrors = {}
    if (!password) nextErrors.password = 'Please enter a new password.'
    else if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setIsLoading(false)

    if (error) {
      setServerError(error.message)
      return
    }
    setIsDone(true)
  }

  if (sessionState === 'checking') {
    return <div className="h-64 animate-pulse rounded-xl bg-ink/5" />
  }

  if (sessionState === 'invalid') {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t('Reset link expired')}</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          {t('This password reset link is no longer valid. Request a new one to continue.')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/forgot-password"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            {t('Request a new link')}
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            {t('Back to sign in')}
          </Link>
        </div>
      </div>
    )
  }

  if (isDone) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t('Password updated')}</h1>
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-ink/20 bg-ink/5 p-3.5 text-sm text-ink">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {t('Your password has been changed. You can now use it to sign in.')}
        </div>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
        >
          {t('Go to dashboard')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t('Set a new password')}</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        {t("Choose a new password for your account. You'll stay signed in.")}
      </p>

      {serverError ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-sm text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {t(serverError)}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          id="password"
          label={t('New password')}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (errors.password) setErrors({})
          }}
          placeholder={t('At least 8 characters')}
          error={t(errors.password)}
        />
        {/* Same minimum length as sign-up, enforced above. */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t('Updating…') : t('Update password')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-ink hover:underline">
          {t('Back to sign in')}
        </Link>
      </p>
    </div>
  )
}
