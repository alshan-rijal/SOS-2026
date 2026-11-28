import AdminPage from '@/components/admin/AdminPage'
import AdminReports from '@/components/admin/AdminReports'

export const metadata = { title: 'Admin · Confidential', robots: { index: false, follow: false } }

export default function AdminConfidentialPage() {
  return (
    <AdminPage>
      <AdminReports confidentialOnly />
    </AdminPage>
  )
}
