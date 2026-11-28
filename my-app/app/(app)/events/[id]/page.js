import { Suspense } from 'react'
import EventDetail from '@/components/EventDetail'

export const metadata = { title: 'Event details' }

function DetailFallback() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-64 animate-pulse rounded bg-ink/10" />
      <div className="card h-28 animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="card h-40 animate-pulse" />
          <div className="card h-64 animate-pulse" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <div className="card h-56 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function EventDetailPage() {
  return (
    <Suspense fallback={<DetailFallback />}>
      <EventDetail />
    </Suspense>
  )
}
