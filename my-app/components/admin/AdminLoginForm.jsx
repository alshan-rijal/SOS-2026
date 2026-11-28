'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import LanguageToggle from '@/components/LanguageToggle'
import { useLanguage } from '@/components/LanguageContext'

const GENERIC_ERROR = 'Invalid ID or password, or this account is not an admin.'
const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 30

function safeNext(value) {
  // Only a same-site admin path is honoured; anything else (or an external URL)
  // falls back to the Overview.
  if (!value || !value.startsWith('/admin') || value.startsWith('//')) return '/admin'
  return value
}

export default function AdminLoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const emailRef = useRef(null)

  const nextPath = safeNext(searchParams.get('next'))

  const [checking, setChecking] = useState(true)
  const [nonAdmin, setNonAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockSeconds, setLockSeconds] = useState(0)

  // Already signed in? An admin goes straight through; a normal user is told.
  useEffect(() => {
    let active = true
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!active) return
      if (!user) {
        setChecking(false)
        emailRef.current?.focus()
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (!active) return
      if (profile?.role === 'admin') {
        router.replace(nextPath)
        return
      }
      setNonAdmin(true)
      setChecking(false)
    }
    check()
    return () => {
      active = false
    }
  }, [supabase, router, nextPath])

  // Countdown for the 30-second lockout. The tick is an external timer, so the
  // setState happens in a callback rather than in the effect body.
  useEffect(() => {
    if (lockSeconds <= 0) return
    const timer = setInterval(() => setLockSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => clearInterval(timer)
  }, [lockSeconds])

  const locked = lockSeconds > 0

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Enter your email.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (locked) return
    setServerError('')
    if (!validate()) return

    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error || !data?.user) {
      setIsLoading(false)
      handleFailure()
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      // Never reveal whether the account exists or the password was wrong.
      await supabase.auth.signOut()
      setIsLoading(false)
      handleFailure()
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  function handleFailure() {
    setServerError(GENERIC_ERROR)
    setAttempts((previous) => {
      const next = previous + 1
      if (next >= MAX_ATTEMPTS) {
        setLockSeconds(LOCK_SECONDS)
        return 0
      }
      return next
    })
  }

  if (checking) {
    return <div className="h-72 w-full max-w-[420px] animate-pulse rounded-[14px] bg-white" />
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-[14px] border border-ink/12 bg-white p-[clamp(16px,4vw,28px)] shadow-[0_18px_48px_rgba(11,74,111,0.12)]">
        <div className="flex items-center justify-between gap-2">
          <Logo />
          <LanguageToggle />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-ink">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-ink">{t('Admin sign in')}</h1>
            <p className="text-xs text-ink/60">{t('For authorised staff only')}</p>
          </div>
        </div>

        {nonAdmin ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-sm text-ink" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
              {t('This account is not an admin')}
            </div>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut()
                setNonAdmin(false)
                setChecking(false)
              }}
              className="h-10 w-full rounded-xl border border-ink bg-white text-sm font-semibold text-ink hover:bg-surface"
            >
              {t('Sign out')}
            </button>
            <Link href="/" className="block text-center text-sm text-ink/60 hover:text-ink">
              {t('Back to public site')}
            </Link>
          </div>
        ) : (
          <>
            <div aria-live="polite" className="min-h-0">
              {serverError ? (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-accent bg-accent/10 p-3.5 text-sm text-ink" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
                  <span>{t(serverError)}</span>
                </div>
              ) : null}
              {locked ? (
                <div className="mt-3 rounded-xl border border-ink/15 bg-surface p-3 text-sm font-medium text-ink">
                  {t('Too many attempts. Try again in {n}s.', { n: lockSeconds })}
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">{t('Admin ID (email)')}</span>
                <input
                  ref={emailRef}
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (errors.email) setErrors((p) => ({ ...p, email: '' }))
                  }}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'admin-email-error' : undefined}
                  className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                    errors.email ? 'border-accent' : 'border-ink/15 focus:border-accent'
                  }`}
                />
                {errors.email ? (
                  <span id="admin-email-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-ink">
                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" /> {t(errors.email)}
                  </span>
                ) : null}
              </label>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="admin-password" className="text-sm font-semibold text-ink">{t('Password')}</label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-ink hover:underline">
                    {t('Forgot password')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (errors.password) setErrors((p) => ({ ...p, password: '' }))
                    }}
                    aria-invalid={Boolean(errors.password)}
                    className={`h-11 w-full rounded-xl border bg-white px-3.5 pr-11 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                      errors.password ? 'border-accent' : 'border-ink/15 focus:border-accent'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink">
                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" /> {t(errors.password)}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isLoading || locked}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                {isLoading ? t('Signing in…') : locked ? t('Too many attempts. Try again in {n}s.', { n: lockSeconds }) : t('Sign in')}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-sm">
        <Link href="/" className="text-ink/60 transition-colors hover:text-ink">
          {t('Back to public site')}
        </Link>
      </p>
    </div>
  )
}
