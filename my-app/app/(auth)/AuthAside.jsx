'use client'

import { CircleCheck, History, MapPinned } from 'lucide-react'
import Logo from '@/components/Logo'
import { useLanguage } from '@/components/LanguageContext'

const POINTS = [
  { icon: CircleCheck, text: 'File a report with a photo, category and map pin.' },
  { icon: MapPinned, text: 'See every open problem on one live map.' },
  { icon: History, text: 'Follow each report from pending to resolved.' },
]

// The auth shell's left panel: server layout keeps its structure, this client
// child owns the visible copy so it can follow the language toggle.
export default function AuthAside() {
  const { t } = useLanguage()
  return (
    <aside className="hidden shrink-0 bg-surface/70 p-10 lg:flex lg:w-2/5 lg:flex-col">
      <Logo />
      <h2 className="mt-10 break-words text-2xl font-bold leading-snug text-ink">
        {t('Local problems, on the record.')}
      </h2>
      <p className="mt-3 break-words text-sm leading-relaxed text-ink/65">
        {t(
          'Sajha Pahal keeps a shared list of neighbourhood infrastructure issues so nothing is lost between the report and the repair.'
        )}
      </p>
      <ul className="mt-8 space-y-4">
        {POINTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 break-words text-sm text-ink/75">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            {t(text)}
          </li>
        ))}
      </ul>
    </aside>
  )
}
