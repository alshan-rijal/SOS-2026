import AdminPage from '@/components/admin/AdminPage'
import AdminOverview from '@/components/admin/AdminOverview'

export const metadata = { title: 'Admin · Overview', robots: { index: false, follow: false } }

export default function AdminOverviewPage() {
  return (
    <AdminPage>
      <AdminOverview />
    </AdminPage>
  )
}
