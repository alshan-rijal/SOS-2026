'use client'

import { EVENT_TYPES } from '@/components/EventTypeIcon'
import { useLanguage } from '@/components/LanguageContext'

export const MAP_VIEWS = [
  { key: 'problems', label: 'Problems' },
  { key: 'events', label: 'Events' },
  { key: 'both', label: 'Both' },
]

export const MAP_VIEW_KEYS = MAP_VIEWS.map((view) => view.key)

export function normalizeMapView(value) {
  return MAP_VIEW_KEYS.includes(value) ? value : 'both'
}

/**
 * "Problems | Events | Both" plus the event-type chips. Purely presentational:
 * the page owns the state and mirrors it into the URL so the choice is
 * shareable and survives a reload.
 */
export default function MapViewToggle({ view, onView, type, onType, showTypes = true }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-ink/10" role="group" aria-label={t('Map layers')}>
        {MAP_VIEWS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            aria-pressed={view === entry.key}
            onClick={() => onView(entry.key)}
            className={`h-10 rounded-md px-3 text-xs font-semibold transition-colors duration-150 ${
              view === entry.key ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/5'
            }`}
          >
            {t(entry.label)}
          </button>
        ))}
      </div>

      {showTypes && view !== 'problems' ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={!type}
            onClick={() => onType('')}
            className={`inline-flex h-10 items-center rounded-full border px-3 text-xs font-semibold transition-colors duration-150 ${
              !type ? 'border-ink bg-surface text-ink' : 'border-ink/15 bg-white text-ink/65 hover:bg-ink/5'
            }`}
          >
            {t('All types')}
          </button>
          {EVENT_TYPES.map(({ key, label, shortLabel, Icon }) => {
            const active = type === key
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => onType(active ? '' : key)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors duration-150 ${
                  active ? 'border-accent bg-surface text-ink' : 'border-ink/15 bg-white text-ink/65 hover:bg-ink/5'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="max-[600px]:hidden">{t(label)}</span>
                <span className="hidden max-[600px]:inline">{t(shortLabel)}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
