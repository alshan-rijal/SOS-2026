import { Suspense } from 'react'
import AdminLoginForm from '@/components/admin/AdminLoginForm'

export const metadata = { title: 'Admin sign in', robots: { index: false, follow: false } }

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Suspense fallback={<div className="h-72 w-full max-w-[420px] animate-pulse rounded-[14px] bg-white" />}>
        <AdminLoginForm />
      </Suspense>
    </div>
  )
}
