import { Suspense } from 'react'
import ProfileView from '@/components/ProfileView'

export const metadata = { title: 'Profile' }

function ProfileFallback() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-52 animate-pulse rounded bg-ink/10" />
      <div className="card h-48 animate-pulse p-6" />
      <div className="card h-72 animate-pulse p-6" />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileView />
    </Suspense>
  )
}
