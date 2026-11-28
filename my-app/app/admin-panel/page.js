import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/AdminDashboard'

export const metadata = {
  title: 'Authority Panel · Sajha Pahal',
}

async function AdminGuard() {
  await connection()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin-panel')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminDashboard />
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white p-6" />}>
      <AdminGuard />
    </Suspense>
  )
}