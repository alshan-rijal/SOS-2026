'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'

/**
 * Consistent breadcrumb trail.
 * `items` is ordered root-first: [{ label, href }]. The last item is the
 * current page and renders as plain text. Long dynamic labels are truncated,
 * and trails longer than four steps collapse their middle.
 */
export default function Breadcrumbs({ items = [] }) {
  const { t } = useLanguage()
  if (items.length === 0) return null

  const collapsed = items.length > 4
  const visible = collapsed ? [items[0], { ellipsis: true }, ...items.slice(-2)] : items

  return (
    <nav aria-label={t('Breadcrumb')} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {visible.map((item, index) => {
          const isLast = index === visible.length - 1
          return (
            <li key={`${item.label ?? 'gap'}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-ink/35"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              ) : null}

              {item.ellipsis ? (
                <span className="shrink-0 text-ink/40" aria-hidden="true">
                  …
                </span>
              ) : isLast ? (
                <span
                  aria-current="page"
                  className="max-w-[16rem] truncate font-semibold text-ink"
                  title={item.label}
                >
                  {t(item.label)}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="max-w-[10rem] truncate text-ink/60 transition-colors hover:text-ink"
                  title={item.label}
                >
                  {t(item.label)}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
