import { Suspense } from 'react'
import ReportsBrowser from '@/components/ReportsBrowser'
import { ReportCardSkeleton } from '@/components/ReportCard'

export const metadata = { title: 'Reports' }

function ReportsFallback() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-40 animate-pulse rounded bg-ink/10" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-ink/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <ReportCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsFallback />}>
      <ReportsBrowser />
    </Suspense>
  )
}
