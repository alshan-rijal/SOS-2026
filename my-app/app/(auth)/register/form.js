'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CircleCheck, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TextField from '@/components/Field'
import OAuthButtons from '@/components/OAuthButtons'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterForm() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate() {
    const nextErrors = {}
    if (!fullName.trim()) nextErrors.fullName = 'Please enter your full name.'
    else if (fullName.trim().length < 2) nextErrors.fullName = 'Name must be at least 2 characters.'

    if (!email.trim()) nextErrors.email = 'Please enter your email address.'
    else if (!emailPattern.test(email.trim())) nextErrors.email = 'Please enter a valid email address.'

    if (!password) nextErrors.password = 'Please create a password.'
    else if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
    else if (!/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      nextErrors.password = 'Include at least one number and one symbol.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')
    setSuccessMessage('')
    if (!validate()) return

    setIsLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    setIsLoading(false)

    if (error) {
      setServerError(error.message)
      return
    }

    // When email confirmation is enabled, signUp returns a user but no session.
    if (data?.user && !data?.session) {
      setSuccessMessage('Account created. Check your email to confirm your address, then sign in.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Create account</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        An account lets you report problems and verify reports near you.
      </p>

      {serverError ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          {serverError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          id="fullName"
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value)
            if (errors.fullName) setErrors((previous) => ({ ...previous, fullName: '' }))
          }}
          placeholder="Your name"
          error={errors.fullName}
        />

        <TextField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (errors.email) setErrors((previous) => ({ ...previous, email: '' }))
          }}
          placeholder="you@example.com"
          error={errors.email}
        />

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (errors.password) setErrors((previous) => ({ ...previous, password: '' }))
              }}
              placeholder="At least 8 characters"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : 'password-hint'}
              className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-11 text-sm text-ink transition-colors placeholder:text-ink/40 focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                  : 'border-ink/15 focus:border-accent focus:ring-accent/30'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            <p id="password-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              {errors.password}
            </p>
          ) : (
            <p id="password-hint" className="mt-1.5 text-xs text-ink/50">
              At least 8 characters, with a number and a symbol.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <OAuthButtons onError={setServerError} />

      <p className="mt-6 text-center text-sm text-ink/60">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-accent-strong hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-center text-sm">
        <Link href="/" className="text-ink/50 transition-colors hover:text-ink">
          Back to home
        </Link>
      </p>
    </div>
  )
}
