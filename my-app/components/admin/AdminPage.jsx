import { Suspense } from 'react'
import AdminGate from '@/components/admin/AdminGate'

/**
 * Every admin page renders through this: a Suspense boundary around the
 * server-side role gate, so the route can stream instead of blocking
 * prerender when the gate reads the session.
 */
export default function AdminPage({ children }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface px-[clamp(16px,2vw,24px)] py-6">
          <div className="mx-auto h-96 w-full max-w-[1600px] animate-pulse rounded-[14px] bg-white" />
        </div>
      }
    >
      <AdminGate>{children}</AdminGate>
    </Suspense>
  )
}
