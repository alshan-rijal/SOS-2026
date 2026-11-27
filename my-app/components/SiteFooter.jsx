import Link from 'next/link'
import { FileText, Map, Plus } from 'lucide-react'
import Logo from '@/components/Logo'

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink/55">
            A shared record of local infrastructure problems. Reports are public; an
            account is only needed to post or verify one.
          </p>
        </div>
        <nav className="flex flex-col gap-2.5 text-sm text-ink/60 sm:flex-row sm:gap-6" aria-label="Footer">
          <Link href="/reports" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
            <FileText className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            All reports
          </Link>
          <Link href="/map" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
            <Map className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Map
          </Link>
          <Link href="/reports/new" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Report an issue
          </Link>
        </nav>
      </div>
    </footer>
  )
}
