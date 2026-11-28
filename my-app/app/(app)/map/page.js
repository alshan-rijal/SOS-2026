import { Suspense } from 'react'
import MapBrowser from '@/components/MapBrowser'

export const metadata = { title: 'Map' }

function MapFallback() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-40 animate-pulse rounded bg-ink/10" />
      <div className="map-frame animate-pulse rounded-2xl bg-ink/5" />
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapFallback />}>
      <MapBrowser />
    </Suspense>
  )
}
