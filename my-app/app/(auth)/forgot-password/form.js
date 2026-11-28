'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TextField from '@/components/Field'
import { useLanguage } from '@/components/LanguageContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordForm() {
  const { t } = useLanguage()
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
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t('Reset password')}</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        {t("Enter your email address and we'll send you a link to set a new password.")}
      </p>

      {serverError ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-sm text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {t(serverError)}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-ink/20 bg-ink/5 p-3.5 text-sm text-ink">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {t(message)}
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
            setFieldError('')
          }}
          placeholder="you@example.com"
          error={t(fieldError)}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t('Sending…') : t('Send reset link')}
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
