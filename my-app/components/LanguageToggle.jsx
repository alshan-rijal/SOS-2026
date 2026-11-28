'use client'

import { LANGUAGES } from '@/lib/i18n'
import { Flag } from '@/components/LanguageFlags'
import { useLanguage } from '@/components/LanguageContext'

/**
 * English / नेपाली switch: the flag from app/business-images plus the language
 * code, in the app's segmented-control style. `lang` is set per button so a
 * screen reader voices नेपाली in Nepali; the flag itself is decorative.
 */
export default function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useLanguage()

  return (
    <div
      role="group"
      aria-label={t('Change language')}
      className={`inline-flex shrink-0 rounded-lg bg-white p-0.5 ring-1 ring-ink/10 ${className}`}
    >
      {LANGUAGES.map((entry) => {
        const active = lang === entry.code
        return (
          <button
            key={entry.code}
            type="button"
            lang={entry.code}
            aria-pressed={active}
            aria-label={entry.nativeLabel}
            title={entry.nativeLabel}
            onClick={() => setLang(entry.code)}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-2.5 text-xs font-semibold transition-colors duration-150 ${
              active ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/5'
            }`}
          >
            <Flag
              code={entry.code}
              className={active ? 'ring-1 ring-white/50' : 'ring-1 ring-ink/15'}
            />
            {entry.short}
          </button>
        )
      })}
    </div>
  )
}
