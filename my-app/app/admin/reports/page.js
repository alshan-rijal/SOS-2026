import AdminPage from '@/components/admin/AdminPage'
import AdminReports from '@/components/admin/AdminReports'

export const metadata = { title: 'Admin · Reports', robots: { index: false, follow: false } }

export default function AdminReportsPage() {
  return (
    <AdminPage>
      <AdminReports />
    </AdminPage>
  )
}
