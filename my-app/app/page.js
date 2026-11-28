import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import AppHeader from '@/components/AppHeader'
import SiteFooter from '@/components/SiteFooter'
import ScrollReveal from '@/components/landing/ScrollReveal'
import LandingBody, { CommunityProofSection } from '@/components/landing/LandingBody'
import { createClient } from '@/lib/supabase/server'
import { LANG_COOKIE, normalizeLang } from '@/lib/i18n'
import { FAQ_ITEMS } from '@/lib/landing-content'
import './landing.css'

export const metadata = {
  title: 'Report a local problem. Follow it until it is fixed.',
  description:
    'Report potholes, drainage, waste, water and streetlight problems in your neighbourhood, see them on a live map, and track each one until it is resolved. Free, about two minutes, and browsing needs no account.',
  openGraph: {
    title: 'Report a local problem. Follow it until it is fixed.',
    description:
      'Put a local problem on a public map in about two minutes, let neighbours verify it, and follow its status until it is resolved.',
    type: 'website',
    siteName: 'Sajha Pahal',
    locale: 'en_US',
  },
}

// Crawler metadata stays English on purpose: FAQ_ITEMS are the English source
// strings, not the reader's translated copy.
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}

// ---------------------------------------------------------------------------
// Live community data. Read on the server, and never the reason a build fails:
// anything that goes wrong (missing env vars, no network, unapplied schema)
// hides the block instead of breaking the page.
// ---------------------------------------------------------------------------

const RECENT_SELECT = 'id,title,location_name,image_url,updated_at'

async function loadVerifiedReports(supabase) {
  const { data: verifications, error } = await supabase
    .from('report_verifications')
    .select('report_id,created_at')
    .order('created_at', { ascending: false })
    .limit(12)
  if (error) return []

  const ids = [...new Set((verifications ?? []).map((row) => row.report_id))].slice(0, 3)
  if (ids.length === 0) return []

  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select(RECENT_SELECT)
    .in('id', ids)
  if (reportsError) return []

  const byId = new Map((reports ?? []).map((row) => [row.id, row]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

async function loadCommunityProof() {
  try {
    const supabase = await createClient()

    // Public counts never include confidential reports. The filter is added on
    // top of RLS, and dropped only if migration 007 is not applied yet (42703).
    const countOf = (apply) => {
      const build = (publicOnly) => {
        let query = supabase.from('reports').select('id', { count: 'exact', head: true })
        if (publicOnly) query = query.eq('is_confidential', false)
        if (apply) query = apply(query)
        return query
      }
      return build(true).then((result) =>
        result.error?.code === '42703' ? build(false) : result
      )
    }

    const resolvedRowsQuery = (publicOnly) => {
      let query = supabase
        .from('reports')
        .select(RECENT_SELECT)
        .in('status', ['fixed', 'resolved'])
        .order('updated_at', { ascending: false })
        .limit(3)
      if (publicOnly) query = query.eq('is_confidential', false)
      return query
    }

    const [submitted, resolved, verifications, contributors, resolvedFirst] = await Promise.all([
      countOf(),
      countOf((query) => query.in('status', ['fixed', 'resolved'])),
      supabase.from('report_verifications').select('report_id', { count: 'exact', head: true }),
      // shortcut: contributors = distinct reporter ids over the newest 1000
      // reports; move to a SQL view if the table grows past that.
      supabase
        .from('reports')
        .select('user_id')
        .not('user_id', 'is', null)
        .limit(1000),
      resolvedRowsQuery(true),
    ])
    const resolvedRows = resolvedFirst.error?.code === '42703' ? await resolvedRowsQuery(false) : resolvedFirst

    if (
      submitted.error ||
      resolved.error ||
      verifications.error ||
      contributors.error ||
      resolvedRows.error
    ) {
      return null
    }

    const submittedCount = submitted.count ?? 0
    const resolvedCount = resolved.count ?? 0

    const stats = [
      {
        key: 'submitted',
        label: `${submittedCount === 1 ? 'Report' : 'Reports'} submitted`,
        value: submittedCount,
      },
      {
        key: 'resolved',
        label: `${resolvedCount === 1 ? 'Report' : 'Reports'} resolved`,
        value: resolvedCount,
      },
      { key: 'verifications', label: 'Community verifications', value: verifications.count ?? 0 },
      {
        key: 'contributors',
        label: 'Active contributors',
        value: new Set((contributors.data ?? []).map((row) => row.user_id)).size,
      },
      // A zero is not social proof: it is dropped rather than printed.
    ].filter((stat) => stat.value > 0)

    let recent = resolvedRows.data ?? []
    let recentKind = 'resolved'

    if (recent.length === 0) {
      recent = await loadVerifiedReports(supabase)
      recentKind = 'verified'
    }

    return { stats, recent, recentKind }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Small pieces of the page
// ---------------------------------------------------------------------------

function CommunityProofFallback() {
  return (
    <section className="landing-section bg-white">
      <div className="landing-container">
        <div className="h-7 w-64 animate-pulse rounded bg-ink/10" aria-hidden="true" />
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-10 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="h-9 w-20 animate-pulse rounded bg-ink/10" />
              <div className="mt-2 h-4 w-28 animate-pulse rounded bg-ink/5" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

async function CommunityProof() {
  // Counts and "N days ago" are per-visit values, so this renders on request
  // and streams into the shell behind the boundary below. Reading the language
  // cookie here is safe: this boundary is already per-request, so the static
  // shell stays static and the streamed HTML matches its hydration.
  await connection()
  const [data, lang] = await Promise.all([
    loadCommunityProof(),
    cookies().then((store) => normalizeLang(store.get(LANG_COOKIE)?.value)),
  ])

  if (!data || (data.stats.length === 0 && data.recent.length === 0)) return null

  return <CommunityProofSection data={data} lang={lang} />
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD).replace(/</g, '\\u003c') }}
      />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <AppHeader fluid />

      <main id="main" className="flex-1">
        <LandingBody>
          <Suspense fallback={<CommunityProofFallback />}>
            <CommunityProof />
          </Suspense>
        </LandingBody>
      </main>

      <SiteFooter fluid />
      <ScrollReveal />
    </div>
  )
}
