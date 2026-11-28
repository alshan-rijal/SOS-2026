import AdminPage from '@/components/admin/AdminPage'
import AdminMap from '@/components/admin/AdminMap'

export const metadata = { title: 'Admin · Map', robots: { index: false, follow: false } }

export default function AdminMapPage() {
  return (
    <AdminPage>
      <AdminMap />
    </AdminPage>
  )
}
