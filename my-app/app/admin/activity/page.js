import AdminPage from '@/components/admin/AdminPage'
import AdminActivity from '@/components/admin/AdminActivity'

export const metadata = { title: 'Admin · Activity log', robots: { index: false, follow: false } }

export default function AdminActivityPage() {
  return (
    <AdminPage>
      <AdminActivity />
    </AdminPage>
  )
}
