import AdminPage from '@/components/admin/AdminPage'
import AdminQueue from '@/components/admin/AdminQueue'

export const metadata = { title: 'Admin · Verification queue', robots: { index: false, follow: false } }

export default function AdminQueuePage() {
  return (
    <AdminPage>
      <AdminQueue />
    </AdminPage>
  )
}
