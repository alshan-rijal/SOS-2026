'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageContext'

const PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
      </svg>
    ),
  },

]

export default function OAuthButtons({ onError }) {
  const { t } = useLanguage()
  const supabase = createClient()
  const [pending, setPending] = useState('')

  async function signInWith(provider) {
    setPending(provider)
    onError?.('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      onError?.(error.message)
      setPending('')
    }
  }

  return (
    <div>
      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">{t('or')}</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

<div className="flex w-full items-center justify-center gap-3">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => signInWith(provider.id)}
            disabled={Boolean(pending)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:opacity-60"
          >
            {provider.icon}
            {pending === provider.id ? t('Connecting…') : provider.label}
          </button>
        ))}
      </div>
    </div>
  )
}
