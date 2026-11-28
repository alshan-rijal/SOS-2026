'use client'

import Link from 'next/link'
import { Compass } from 'lucide-react'
import Logo from '@/components/Logo'
import { useLanguage } from '@/components/LanguageContext'

export default function NotFoundContent() {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-16 text-center">
      <Logo />
      <span className="mt-10 flex h-12 w-12 items-center justify-center rounded-xl bg-ink/5 text-ink/50">
        <Compass className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-ink/40">
        {t('Error 404')}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{t('Page not found')}</h1>
      <p className="mt-2 max-w-md text-sm text-ink/60">
        {t('The page you were looking for does not exist or has moved.')}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
        >
          {t('Back to home')}
        </Link>
        <Link
          href="/reports"
          className="rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
        >
          {t('Browse reports')}
        </Link>
      </div>
    </div>
  )
}
