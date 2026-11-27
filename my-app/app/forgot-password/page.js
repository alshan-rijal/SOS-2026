'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPassword() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setIsLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    setIsLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('If an account exists for that email, a password reset link has been sent.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eaf4fb] px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl shadow-[#0b4a6f]/10">
        <h1 className="text-2xl font-bold text-[#0b4a6f] mb-2">Reset password</h1>
        <p className="text-sm text-[#0b4a6f]/60 mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@lifeline.com"
            className="w-full rounded-xl border border-[#0b4a6f]/20 px-4 py-3 text-sm text-[#0b4a6f] focus:outline-none focus:ring-2 focus:ring-[#ff6b5a]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#ff6b5a] py-3 text-white font-semibold hover:bg-[#ff5a47] disabled:opacity-60 transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#0b4a6f]/60">
          <Link href="/login" className="font-semibold text-[#ff6b5a]">
            Back to Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}