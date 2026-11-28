'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'
import { useLanguage } from '@/components/LanguageContext'

const LINK_GROUPS = [
  {
    title: 'Explore',
    links: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/reports', label: 'Reports' },
      { href: '/events', label: 'Events' },
      { href: '/map', label: 'Map' },
      { href: '/reports/new', label: 'Report an issue' },
    ],
  },
  {
    title: 'Help',
    links: [
      { href: '/#faq', label: 'FAQ' },
      { href: '/#how-it-works', label: 'How it works' },
    ],
  },
]

// `fluid` switches the app's 1200px container for the landing page's fluid one.
export default function SiteFooter({ fluid = false }) {
  const { t } = useLanguage()
  const container = fluid ? 'landing-container' : 'mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8'

  return (
    <footer className="border-t border-ink/10 bg-white">
      <div
        className={`${container} grid gap-x-10 gap-y-8 py-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]`}
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-ink/55">
            {t(
              'A shared public record of local infrastructure problems, verified by neighbours and tracked from pending to resolved.'
            )}
          </p>
        </div>

        {LINK_GROUPS.map((group) => (
          <nav key={group.title} aria-label={t(group.title)}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink/45">
              {t(group.title)}
            </h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink/65 transition-colors duration-150 hover:text-ink"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className={`${container} border-t border-ink/10 py-5`}>
        {/* shortcut: year is hardcoded — reading the clock at render time would
            make every route dynamic under Cache Components. */}
        <p className="text-xs text-ink/45">{t('© 2026 Sajha Pahal. All rights reserved.')}</p>
      </div>
    </footer>
  )
}
