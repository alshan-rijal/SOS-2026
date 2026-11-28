import AdminPage from '@/components/admin/AdminPage'
import AdminEvents from '@/components/admin/AdminEvents'

export const metadata = { title: 'Admin · Events review', robots: { index: false, follow: false } }

export default function AdminEventsPage() {
  return (
    <AdminPage>
      <AdminEvents />
    </AdminPage>
  )
}
