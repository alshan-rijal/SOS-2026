import { Suspense } from 'react'
import EventsBrowser from '@/components/EventsBrowser'

export const metadata = { title: 'Events' }

function EventsFallback() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-52 animate-pulse rounded bg-ink/10" />
      <div className="h-8 w-64 animate-pulse rounded bg-ink/10" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-ink/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card h-48 w-full animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsFallback />}>
      <EventsBrowser />
    </Suspense>
  )
}
