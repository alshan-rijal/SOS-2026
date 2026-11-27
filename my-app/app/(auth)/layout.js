import { CircleCheck, History, MapPinned } from 'lucide-react'
import Logo from '@/components/Logo'

const POINTS = [
  { icon: CircleCheck, text: 'File a report with a photo, category and map pin.' },
  { icon: MapPinned, text: 'See every open problem on one live map.' },
  { icon: History, text: 'Follow each report from pending to resolved.' },
]

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:flex lg:items-center lg:justify-center lg:p-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink/10 lg:flex">
        <aside className="hidden shrink-0 bg-surface/70 p-10 lg:flex lg:w-2/5 lg:flex-col">
          <Logo />
          <h2 className="mt-10 text-2xl font-bold leading-snug text-ink">
            Local problems, on the record.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/65">
            Sajha Pahal keeps a shared list of neighbourhood infrastructure issues so
            nothing is lost between the report and the repair.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-ink/75">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </aside>

        <div className="w-full p-6 sm:p-8 lg:w-3/5 lg:p-12">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
