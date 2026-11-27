import Link from 'next/link'
import { MapPin } from 'lucide-react'

// Brand mark. `href` may be null to render a non-link logo (e.g. inside a card).
export default function Logo({ href = '/', compact = false, className = '' }) {
  const inner = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
        <MapPin className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="text-base font-bold tracking-tight text-ink">
        Sajha Pahal
        {compact ? null : <span className="sr-only"> — community problem reporting</span>}
      </span>
    </>
  )

  if (!href) {
    return <span className={`flex items-center gap-2.5 ${className}`}>{inner}</span>
  }

  return (
    <Link href={href} className={`flex items-center gap-2.5 ${className}`}>
      {inner}
    </Link>
  )
}
