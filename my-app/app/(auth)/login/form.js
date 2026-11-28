'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TextField from '@/components/Field'
import OAuthButtons from '@/components/OAuthButtons'
import { useLanguage } from '@/components/LanguageContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const callbackError = searchParams.get('error')
    ? 'Authentication failed or the link expired. Please try again.'
    : ''
  const nextPath = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(callbackError)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate() {
    const nextErrors = {}
    if (!email.trim()) nextErrors.email = 'Please enter your email address.'
    else if (!emailPattern.test(email.trim())) nextErrors.email = 'Please enter a valid email address.'
    if (!password) nextErrors.password = 'Please enter your password.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')
    if (!validate()) return

    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setIsLoading(false)

    if (error || !data?.user) {
      setServerError(
        error?.message === 'Invalid login credentials'
          ? 'Email or password is incorrect.'
          : error?.message || 'Sign in failed. Please try again.'
      )
      return
    }

    // Admins land in the admin panel after a normal login; everyone else keeps
    // their original destination. An admin next path must stay inside /admin.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()
    const destination =
      profile?.role === 'admin'
        ? nextPath.startsWith('/admin')
          ? nextPath
          : '/admin'
        : nextPath

    router.push(destination)
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t('Sign in')}</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        {t('Use your account to report problems and verify reports near you.')}
      </p>

      {serverError ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-sm text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {t(serverError)}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          id="email"
          label={t('Email address')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (errors.email) setErrors((previous) => ({ ...previous, email: '' }))
          }}
          placeholder="you@example.com"
          error={t(errors.email)}
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-ink">
              {t('Password')}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-ink transition-colors hover:underline"
            >
              {t('Forgot password?')}
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (errors.password) setErrors((previous) => ({ ...previous, password: '' }))
              }}
              placeholder={t('Your password')}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-11 text-sm text-ink transition-colors placeholder:text-ink/40 focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-accent focus:border-accent focus:ring-accent/30'
                  : 'border-ink/15 focus:border-accent focus:ring-accent/30'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? t('Hide password') : t('Show password')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p
              id="password-error"
              className="mt-1.5 flex items-center gap-1.5 text-xs text-ink"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              {t(errors.password)}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t('Signing in…') : t('Sign in')}
        </button>
      </form>

      <OAuthButtons onError={setServerError} />

      <p className="mt-6 text-center text-sm text-ink/60">
        {t("Don't have an account?")}{' '}
        <Link href="/register" className="font-semibold text-ink hover:underline">
          {t('Create one')}
        </Link>
      </p>

      <p className="mt-3 text-center text-sm">
        <Link href="/" className="text-ink/50 transition-colors hover:text-ink">
          {t('Back to home')}
        </Link>
      </p>
    </div>
  )
}
