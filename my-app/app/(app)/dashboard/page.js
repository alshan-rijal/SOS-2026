import { Suspense } from 'react'
import DashboardView from '@/components/DashboardView'

export const metadata = { title: 'Dashboard' }

function DashboardFallback() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 animate-pulse rounded bg-ink/10" />
      <div className="h-8 w-64 animate-pulse rounded bg-ink/10" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-28 animate-pulse" />
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="card h-72 animate-pulse lg:col-span-7" />
        <div className="card h-72 animate-pulse lg:col-span-5" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardView />
    </Suspense>
  )
}
