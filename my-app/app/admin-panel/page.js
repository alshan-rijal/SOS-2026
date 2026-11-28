import { redirect } from 'next/navigation'

// The admin panel moved to /admin (with sub-routes). This keeps the old link
// working for anyone who bookmarked it.
export default function LegacyAdminPanel() {
  redirect('/admin')
}
