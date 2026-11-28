import AdminPage from '@/components/admin/AdminPage'
import AdminExports from '@/components/admin/AdminExports'

export const metadata = { title: 'Admin · Exports', robots: { index: false, follow: false } }

export default function AdminExportsPage() {
  return (
    <AdminPage>
      <AdminExports />
    </AdminPage>
  )
}
