'use client'

import Link from 'next/link'
import { AlertCircle, RefreshCw } from 'lucide-react'
import Logo from '@/components/Logo'

export default function GlobalError({ error, reset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-16 text-center">
      <Logo />
      <span className="mt-10 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertCircle className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-ink/60">
        This page could not be loaded. Try again, and if it keeps failing, go back home.
      </p>
      {error?.message ? (
        <p className="mt-3 max-w-md break-words rounded-lg bg-ink/5 px-3 py-2 text-xs text-ink/60">
          {error.message}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
