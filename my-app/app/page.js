import Image from 'next/image'
import Link from 'next/link'
import { CircleCheck, Map, PenLine, Plus, ThumbsUp } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import SiteFooter from '@/components/SiteFooter'
import FrameImage from './business-images/Frame.png'

const STEPS = [
  {
    icon: PenLine,
    title: 'Report it',
    text: 'Add a title, category, description and a map pin. A photo is optional but helps others confirm the problem.',
  },
  {
    icon: ThumbsUp,
    title: 'Neighbours verify',
    text: 'People nearby confirm the problem with one click, so real issues stand out instead of being duplicated.',
  },
  {
    icon: CircleCheck,
    title: 'Track the fix',
    text: 'Every report keeps a status and a history, from pending through in progress to resolved.',
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <AppHeader />

      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20 lg:px-8">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Report a local problem. Follow it until it&apos;s fixed.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/70">
              Sajha Pahal keeps a public list of neighbourhood problems — potholes,
              drainage, waste, water supply and streetlights — each with its location,
              photo and status.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/reports/new"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                Report an issue
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-lg border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
              >
                <Map className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                Open the map
              </Link>
            </div>

            <p className="mt-6 text-sm text-ink/55">
              Reading reports is open to everyone. An account is only needed to post or
              verify one.
            </p>
          </div>

          <div className="card overflow-hidden p-6 sm:p-10">
            <Image
              src={FrameImage}
              alt="Two neighbours reporting a local problem together"
              className="h-auto w-full"
              priority
            />
          </div>
        </section>

        <section className="border-y border-ink/10 bg-white">
          <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink">How it works</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/65">
              Three steps from spotting a problem to seeing it resolved.
            </p>

            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="border-t border-ink/10 pt-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink">
                      <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-ink/40">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="rounded-2xl bg-ink px-6 py-12 text-center sm:px-12">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              See what has been reported near you
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70">
              Browse the full list or start with the map. If something is wrong and
              nobody has reported it yet, that takes about a minute.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
              >
                Browse reports
              </Link>
              <Link
                href="/reports/new"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                Report an issue
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
