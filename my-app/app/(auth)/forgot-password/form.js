'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TextField from '@/components/Field'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordForm() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [serverError, setServerError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldError('')
    setServerError('')
    setMessage('')

    if (!email.trim()) {
      setFieldError('Please enter your email address.')
      return
    }
    if (!emailPattern.test(email.trim())) {
      setFieldError('Please enter a valid email address.')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setIsLoading(false)

    if (error) {
      setServerError(error.message)
      return
    }

    setMessage('If an account exists for that email, a reset link is on its way.')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Reset password</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        Enter your email address and we&apos;ll send you a link to set a new password.
      </p>

      {serverError ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          {serverError}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setFieldError('')
          }}
          placeholder="you@example.com"
          error={fieldError}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-accent-strong hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
