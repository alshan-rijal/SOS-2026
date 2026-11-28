import AdminPage from '@/components/admin/AdminPage'
import AdminReportReview from '@/components/admin/AdminReportReview'

export const metadata = { title: 'Admin · Review', robots: { index: false, follow: false } }

// `params` is runtime data, so it is read inside a child (inside AdminPage's
// Suspense boundary) rather than in the page body.
async function ReportReviewLoader({ params }) {
  const { id } = await params
  return <AdminReportReview reportId={id} />
}

export default function AdminReportReviewPage({ params }) {
  return (
    <AdminPage>
      <ReportReviewLoader params={params} />
    </AdminPage>
  )
}
