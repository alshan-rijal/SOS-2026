'use client'

import { useLanguage } from '@/components/LanguageContext'

export default function EmptyState({ icon: Icon, title, description, action }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-white px-5 py-8 text-center">
      {Icon ? (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5 text-ink/50">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-ink">{t(title)}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-ink/60">{t(description)}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
