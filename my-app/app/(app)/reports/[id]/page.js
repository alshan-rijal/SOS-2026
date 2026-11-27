import { Suspense } from 'react'
import ReportDetail from '@/components/ReportDetail'

export const metadata = { title: 'Report details' }

export default function ReportDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-5 w-64 animate-pulse rounded bg-ink/10" />
          <div className="h-9 w-2/3 animate-pulse rounded bg-ink/10" />
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="h-72 animate-pulse rounded-2xl bg-ink/5 lg:col-span-4" />
            <div className="space-y-6 lg:col-span-8">
              <div className="h-40 animate-pulse rounded-2xl bg-ink/5" />
              <div className="h-64 animate-pulse rounded-2xl bg-ink/5" />
            </div>
          </div>
        </div>
      }
    >
      <ReportDetail />
    </Suspense>
  )
}
