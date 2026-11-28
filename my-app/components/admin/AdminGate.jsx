import { connection } from 'next/server'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from '@/components/admin/AdminShell'

/**
 * Server-side admin gate. Signed-out visitors go to the admin sign-in with a
 * ?next= back to here; signed-in non-admins get the standard not-found (the app
 * never reveals that an admin area exists). The role is read on the server, so
 * hiding links is never the only protection.
 */
export default async function AdminGate({ children }) {
  await connection()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') notFound()

  return <AdminShell>{children}</AdminShell>
}
