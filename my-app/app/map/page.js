'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { INITIAL_REPORTS, SEVERITY_CONFIG } from '../../lib/reports'

const ItahariMap = dynamic(() => import('../../components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-[#eaf4fb]" />,
})

export default function MapPage() {
  const [selectedId, setSelectedId] = useState(INITIAL_REPORTS[0].id)
  const selected = INITIAL_REPORTS.find((r) => r.id === selectedId) || null

  return (
    <div className="min-h-screen flex flex-col bg-[#eaf4fb] text-[#0b4a6f]">
      <header className="border-b border-[#0b4a6f]/10 sticky top-0 z-40 bg-[#eaf4fb]/90 backdrop-blur-md">
        <div className="container mx-auto flex flex-wrap items-center gap-4 px-6 py-4 md:px-10">
          <Link
            href="/dashboard"
            className="flex font-bold items-center text-[#0b4a6f] text-lg tracking-tight"
          >
            <span className="h-8 w-8 rounded-xl bg-[#ff6b5a] text-white flex items-center justify-center mr-2.5 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </span>
            Itahari Severity Map
          </Link>

          <div className="md:ml-auto flex flex-wrap items-center gap-3 text-xs text-[#0b4a6f]/70">
            {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.pinColor }} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 md:px-10 py-8 flex flex-col gap-6">
        <div className="rounded-3xl bg-white p-5 shadow-md shadow-[#0b4a6f]/5 ring-1 ring-[#0b4a6f]/10">
          <div className="h-[60vh] min-h-[420px]">
            <ItahariMap reports={INITIAL_REPORTS} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </div>

        {selected && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0b4a6f]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                    SEVERITY_CONFIG[selected.severity].badgeBg
                  }`}
                >
                  {SEVERITY_CONFIG[selected.severity].label}
                </span>
                <span className="text-xs font-medium text-[#0b4a6f]/60">
                  {selected.location} • {selected.time}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0b4a6f]">{selected.title}</h3>
              <p className="text-xs text-[#0b4a6f]/60 mt-1">
                {selected.coords.lat.toFixed(5)}, {selected.coords.lng.toFixed(5)} •{' '}
                {selected.verifications} community verifications
              </p>
            </div>
            <Link
              href="/dashboard"
              className="shrink-0 rounded-full bg-[#0b4a6f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b4a6f]/90 transition-colors"
            >
              Open in Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
