'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleCheck,
  FileText,
  ThumbsUp,
  TrendingUp,
  Users,
} from 'lucide-react'
import CountUp from '@/components/landing/CountUp'
import LandingFaq from '@/components/landing/LandingFaq'
import { FeatureMock, RecentCard } from '@/components/landing/LandingMocks'
import { useLanguage } from '@/components/LanguageContext'
import { DEFAULT_LANG, t as translate } from '@/lib/i18n'
import { FAQ_ITEMS, FEATURES, PAINS, REASSURANCE, STEPS } from '@/lib/landing-content'
import FrameImage from '@/app/business-images/Frame.png'

const STAT_ICONS = {
  submitted: FileText,
  resolved: CircleCheck,
  verifications: ThumbsUp,
  contributors: Users,
}

/**
 * The landing page body. A client component so every marketing string can run
 * through t(...). `children` is the streamed community-proof block, rendered
 * exactly where it sat in the page before the split.
 */
export default function LandingBody({ children }) {
  const { t } = useLanguage()

  return (
    <>
      {/* 1. The result, minus the fear */}
      <section className="hero">
        <div className="landing-container hero-inner">
          <p className="eyebrow hero-rise hero-rise-1">{t('Sajha Pahal · Itahari')}</p>

          <h1 className="display-xl hero-rise hero-rise-2 mt-6 max-w-[20ch]">
            {t("Report a local problem. Follow it until it's fixed.")}
          </h1>

          <p className="hero-lede hero-rise hero-rise-3">
            {t(
              'In about two minutes you can put a pothole, a blocked drain or a dark streetlight on a public map. Browsing is free and needs no account, and the report keeps its status in the open until it is fixed.'
            )}
          </p>

          <div className="hero-actions hero-rise hero-rise-4">
            <Link href="/reports/new" className="btn-pill btn-pill-primary">
              {t('Report an issue')}
              <span className="btn-pill-badge">
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
              </span>
            </Link>
            <Link href="/map" className="btn-pill btn-pill-ghost">
              {t('Open the map')}
              <span className="btn-pill-badge">
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
              </span>
            </Link>
          </div>

          <div className="hero-stage hero-rise hero-rise-5">
            <div className="hero-caption">
              <span className="flex shrink-0 -space-x-2 pt-0.5" aria-hidden="true">
                {[
                  { initials: 'Ra', tone: 'bg-surface text-ink' },
                  { initials: 'Su', tone: 'bg-ink text-white' },
                  { initials: 'Ni', tone: 'bg-surface text-ink' },
                ].map((avatar) => (
                  <span key={avatar.initials} className={`hero-avatar ${avatar.tone}`}>
                    {avatar.initials}
                  </span>
                ))}
              </span>
              <span className="min-w-0">
                <span className="hero-caption-title">
                  {t('Neighbours keep each other honest.')}
                </span>
                <span className="hero-caption-text block">
                  {t('One verification per account, so a count on a report means something.')}
                </span>
              </span>
            </div>

            <div className="hero-frame">
              <Image
                src={FrameImage}
                alt={t('Two neighbours reporting a local problem together')}
                priority
                className="h-auto w-full rounded-[20px]"
              />
            </div>

            <div className="hero-caption">
              <span className="marquee-card-icon h-9 w-9 shrink-0" aria-hidden="true">
                <TrendingUp className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="hero-caption-title">{t('Repeats roll up into one zone.')}</span>
                <span className="hero-caption-text block">
                  {t('Problems a few streets apart are drawn as one area, automatically.')}
                </span>
              </span>
            </div>
          </div>

          <ul className="hero-reassurance">
            {REASSURANCE.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs font-medium text-ink/65">
                <Icon className="h-4 w-4 shrink-0 text-ink/45" strokeWidth={2.2} aria-hidden="true" />
                {t(label)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. Social proof, from the live database only */}
      {children}

      {/* 3. The real cost — the cards drift left on their own */}
      <section data-reveal className="landing-section bg-surface">
        <div className="landing-container">
          <p className="eyebrow">{t('The cost of waiting')}</p>
          <h2 className="display mt-5 max-w-3xl">{t('Problems get noticed, then forgotten.')}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base">
            {t(
              'Everyone can see the broken streetlight, the blocked drain, the crater in the road. Knowing about it was never the hard part — keeping it visible until it is fixed is.'
            )}
          </p>
        </div>

        {/* Full-bleed strip: the track holds the set twice, so one loop is seamless.
            The copy is aria-hidden — a screen reader hears each card once. */}
        <div className="marquee">
          <ul className="marquee-track">
            {[0, 1].map((copy) =>
              PAINS.map(({ icon: Icon, text }) => (
                <li
                  key={`${copy}-${text}`}
                  aria-hidden={copy === 1 ? 'true' : undefined}
                  className="marquee-card"
                >
                  <span className="marquee-card-icon" aria-hidden="true">
                    <Icon className="h-5 w-5" strokeWidth={2.1} />
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-ink">{t(text)}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="landing-container">
          <p className="mt-10 flex items-start gap-3 text-lg font-semibold leading-snug text-ink sm:text-xl">
            <span className="mt-2.5 h-2 w-8 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            {t('The longer it waits, the more it costs the neighbourhood.')}
          </p>
        </div>
      </section>

      {/* 4. A better way */}
      <section data-reveal className="landing-section bg-white">
        <div className="landing-container">
          <p className="eyebrow">{t('What you get')}</p>
          <h2 className="display mt-5 max-w-3xl">
            {t('One public record instead of scattered complaints.')}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base">
            {t(
              'Sajha Pahal turns scattered complaints into one public, trackable record that anyone can check, verify and follow.'
            )}
          </p>

          <div className="bento stagger mt-12">
            {FEATURES.map(({ icon: Icon, title, text, mock }, index) => {
              // The two illustration-led cards take the wide slots, so the six
              // fill three tidy rows of a 3-column grid.
              const wide = index === 1 || index === 2
              return (
                <article key={title} className={`bento-card ${wide ? 'bento-wide' : ''}`}>
                  <h3 className="flex items-center gap-3 text-base font-semibold text-ink">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-ink">
                      <Icon className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    {t(title)}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink/65">{t(text)}</p>
                  <div className="mt-auto pt-2">
                    <FeatureMock kind={mock} t={t} />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* 5. Three steps */}
      <section id="how-it-works" data-reveal className="landing-section bg-surface">
        <div className="landing-container">
          <p className="eyebrow">{t('How it works')}</p>
          <h2 className="display mt-5 max-w-3xl">{t('Three steps, and the record is public.')}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base">
            {t(
              'From spotting something to watching it close — no forms to print and no office to visit.'
            )}
          </p>

          <ol className="stagger mt-12 grid gap-6 md:grid-cols-3 md:gap-7">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="step-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="step-number">{index + 1}</span>
                  <Icon className="h-5 w-5 text-accent" strokeWidth={2.2} aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-base font-semibold text-ink">{t(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{t(text)}</p>
              </li>
            ))}
          </ol>

          <p className="mt-10 flex items-start gap-3 text-sm font-medium leading-relaxed text-ink/75">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            {t(
              'No fees. No long forms. A report is public from the moment you submit it, so it cannot disappear into a private file. Still deciding? The answers are just below.'
            )}
          </p>
        </div>
      </section>

      {/* 6. FAQ */}
      <section id="faq" data-reveal className="landing-section bg-white">
        <div className="landing-container grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <p className="eyebrow">{t('FAQ')}</p>
            <h2 className="display mt-5">{t('Straight answers, before you report.')}</h2>
            <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-ink/65 sm:text-base">
              {t(
                'Sajha Pahal is a public record, not a repair crew. Here is exactly what it does, and who does the digging.'
              )}
            </p>
            <p className="mt-6 text-sm leading-relaxed text-ink/65">
              {t('Still want to look first?')}{' '}
              <Link
                href="/map"
                className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2 transition-colors duration-150 hover:text-accent"
              >
                {t('Open the live map')}
              </Link>{' '}
              {t('— no account needed.')}
            </p>
          </div>

          <LandingFaq
            items={FAQ_ITEMS.map((item) => ({
              question: t(item.question),
              answer: t(item.answer),
            }))}
          />
        </div>
      </section>

      {/* 7. Final call */}
      <section data-reveal className="landing-section pt-0">
        <div className="landing-container">
          <div className="cta-panel">
            <div className="relative flex flex-col gap-9 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
              <div className="max-w-2xl">
                <p className="eyebrow eyebrow-invert">{t('Start today')}</p>
                <h2 className="display-xl display-invert mt-5">
                  {t("Your street won't fix itself. Report it today.")}
                </h2>
                <p className="mt-5 max-w-[52ch] text-sm leading-relaxed text-white/70 sm:text-base">
                  {t(
                    'Free, about two minutes, and nothing is published until you choose to submit. Reading what neighbours have already reported needs no account at all.'
                  )}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
                <Link href="/reports/new" className="btn-pill btn-pill-primary">
                  {t('Report an issue')}
                  <span className="btn-pill-badge">
                    <ArrowUpRight className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                  </span>
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/75 underline decoration-white/30 underline-offset-4 transition-colors duration-150 hover:text-white"
                >
                  {t('Browse the map')}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/**
 * The live community-proof section. The Supabase read stays on the server
 * (see loadCommunityProof); this client piece only renders the already-fetched
 * data, so its copy can be translated. Returns the same `data-count` /
 * `recent-grid` markup as before.
 */
export function CommunityProofSection({ data, lang = DEFAULT_LANG }) {
  // This section streams in after the static shell, so it cannot rely on the
  // language cookie being readable on the client only: the server passes the
  // request's language in, which keeps the streamed HTML and its hydration
  // identical (a context read here would mismatch and warn).
  const t = (text, vars) => translate(lang, text, vars)

  return (
    <section id="community" data-reveal className="landing-section bg-white">
      <div className="landing-container">
        <p className="eyebrow">{t('Live from the record')}</p>
        <h2 className="display mt-5 max-w-3xl">
          {t('What neighbours have already reported.')}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base">
          {t(
            'Every figure below is read straight from the public record — no estimates, no rounded-up numbers.'
          )}
        </p>

        {data.stats.length > 0 ? (
          <dl className="stagger mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-10 lg:grid-cols-4">
            {data.stats.map((stat) => {
              const Icon = STAT_ICONS[stat.key]
              return (
                <div key={stat.key} className="flex flex-col-reverse gap-3">
                  <dt className="flex items-center gap-2 text-sm font-medium text-ink/60">
                    <Icon className="h-4 w-4 text-accent" strokeWidth={2.2} aria-hidden="true" />
                    {t(stat.label)}
                  </dt>
                  <dd className="stat-value">
                    <CountUp value={stat.value} />
                  </dd>
                </div>
              )
            })}
          </dl>
        ) : null}

        {data.recent.length > 0 ? (
          <div className={data.stats.length > 0 ? 'mt-14' : 'mt-10'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink/45">
                {t(
                  data.recentKind === 'verified'
                    ? 'Recently verified by neighbours'
                    : 'Recently resolved'
                )}
              </h3>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-colors duration-150 hover:text-accent"
              >
                {t('See every report')}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              </Link>
            </div>
            <ul
              data-count={Math.min(3, data.recent.length)}
              className="recent-grid stagger mt-6"
            >
              {data.recent.map((report) => (
                <li key={report.id} className="flex">
                  <RecentCard report={report} kind={data.recentKind} t={t} lang={lang} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
