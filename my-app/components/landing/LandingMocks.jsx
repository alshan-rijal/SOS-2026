// Pure presentational pieces for the landing page: the teardrop pin, the
// miniature product screens and the recent-report card. Nothing here holds
// state, so the module needs no 'use client'; the caller passes `t` in so the
// visible copy can be translated.
import Link from 'next/link'
import { BellRing, Camera, CircleCheck, MapPin, ThumbsUp } from 'lucide-react'
import { timeAgo } from '@/lib/reports'

// Teardrop map pin, drawn inline so no image file is needed. Mirrors the real
// pin shape used by the map (severity drives size and fill).
export function MiniPin({ className = '', size = 22, fill = '#ff6b5a', border = '#ffffff', pulse = false }) {
  return (
    <span className={`absolute ${className}`} style={{ width: size, height: Math.round(size * 1.32) }}>
      {pulse ? (
        <span className="mock-ping absolute inset-[10%] rounded-full bg-accent/35" aria-hidden="true" />
      ) : null}
      <svg viewBox="0 0 24 32" className="relative h-full w-full" aria-hidden="true">
        <path
          d="M12 1C5.9 1 1 5.9 1 12c0 7.6 11 19 11 19s11-11.4 11-19c0-6.1-4.9-11-11-11z"
          fill={fill}
          stroke={border}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

// Miniature version of a real app screen. Pure CSS/SVG, no screenshots.
export function FeatureMock({ kind, t = (text) => text }) {
  if (kind === 'report') {
    return (
      <div className="mock-screen flex h-[8.5rem] flex-col gap-2 p-3">
        <span className="h-2.5 w-24 rounded-full bg-ink/20" aria-hidden="true" />
        <span className="h-7 w-full rounded-lg bg-white ring-1 ring-ink/12" aria-hidden="true" />
        <div className="flex gap-2">
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-white px-2 text-[10px] font-semibold text-ink/70 ring-1 ring-ink/12">
            <Camera className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
            {t('Photo')}
          </span>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-white px-2 text-[10px] font-semibold text-ink/70 ring-1 ring-ink/12">
            <MapPin className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
            {t('Pin')}
          </span>
        </div>
        <div className="mt-auto flex items-center gap-1.5" aria-hidden="true">
          <span className="h-5 flex-1 rounded-full bg-white ring-1 ring-ink/12" />
          <span className="h-5 flex-1 rounded-full bg-ink" />
          <span className="h-5 flex-1 rounded-full bg-accent ring-2 ring-accent/25" />
        </div>
      </div>
    )
  }

  if (kind === 'map') {
    return (
      <div className="mock-screen h-[8.5rem]">
        <svg viewBox="0 0 200 132" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <rect width="200" height="132" fill="#eaf4fb" />
          <path d="M-8 104 L96 48 L208 66" fill="none" stroke="#ffffff" strokeWidth="11" />
          <path d="M52 -8 L84 140" fill="none" stroke="#ffffff" strokeWidth="7" />
          <path d="M-8 26 L208 112" fill="none" stroke="rgba(11,74,111,0.10)" strokeWidth="3" />
        </svg>
        <MiniPin className="left-[26%] top-[32%]" size={20} fill="#eaf4fb" border="#0b4a6f" />
        <MiniPin className="left-[50%] top-[16%]" size={24} fill="#0b4a6f" />
        <MiniPin className="left-[70%] top-[40%]" size={28} pulse />
      </div>
    )
  }

  if (kind === 'hotspot') {
    return (
      <div className="mock-screen h-[8.5rem]">
        <svg viewBox="0 0 200 132" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M-8 22 L208 92" fill="none" stroke="#ffffff" strokeWidth="12" />
          <path d="M64 -8 L96 140" fill="none" stroke="#ffffff" strokeWidth="8" />
          <circle cx="126" cy="62" r="38" fill="#ff6b5a" fillOpacity="0.28" />
          <circle cx="126" cy="62" r="38" fill="none" stroke="#ff6b5a" strokeWidth="2" className="hotspot-ring" />
        </svg>
        <MiniPin className="left-[44%] top-[24%]" size={18} fill="#0b4a6f" />
        <MiniPin className="left-[56%] top-[36%]" size={22} pulse />
        <span className="absolute bottom-3 left-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
          {t('Most reported area')}
        </span>
      </div>
    )
  }

  if (kind === 'verify') {
    return (
      <div className="mock-screen flex h-[8.5rem] flex-col items-center justify-center gap-3 p-3">
        <div className="flex -space-x-2" aria-hidden="true">
          {['Ra', 'Su', 'Ni', 'An'].map((initials, index) => (
            <span
              key={initials}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold ${
                index % 2 === 0 ? 'bg-surface text-ink' : 'bg-ink text-white'
              }`}
            >
              {initials}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white">
          <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          {t('12 neighbours verified')}
        </span>
      </div>
    )
  }

  if (kind === 'signal') {
    return (
      <div className="mock-screen flex h-[8.5rem] flex-col justify-center gap-3 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 ring-1 ring-accent/40">
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <BellRing className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            <span className="mock-ping absolute inset-0 rounded-full bg-accent/40" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-semibold leading-snug text-ink">
            {t('3 similar reports within 500 m')}
          </span>
        </div>
        <div className="relative h-10" aria-hidden="true">
          <MiniPin className="left-[16%] top-[22%]" size={16} fill="#0b4a6f" />
          <MiniPin className="left-[42%] top-[8%]" size={20} />
          <MiniPin className="left-[66%] top-[28%]" size={16} fill="#0b4a6f" />
        </div>
      </div>
    )
  }

  return (
    <div className="mock-screen flex h-[8.5rem] flex-col justify-center p-3">
      <ol className="relative space-y-2.5 border-l border-ink/15 pl-4">
        {[
          { label: 'Pending', done: false },
          { label: 'In Progress', done: false },
          { label: 'Resolved', done: true },
        ].map((step) => (
          <li key={step.label} className="relative flex items-center gap-2">
            <span
              className={`absolute -left-[1.375rem] h-2.5 w-2.5 rounded-full ${
                step.done ? 'bg-accent' : 'border border-ink/30 bg-white'
              }`}
              aria-hidden="true"
            />
            <span
              className={`text-[11px] font-semibold ${step.done ? 'text-ink' : 'text-ink/45'}`}
            >
              {t(step.label)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function RecentCard({ report, kind, t = (text) => text, lang = 'en' }) {
  const isVerified = kind === 'verified'
  return (
    <Link
      href={`/reports/${report.id}`}
      className="card group flex h-full flex-col overflow-hidden transition-shadow duration-150 hover:shadow-[0_12px_32px_rgba(11,74,111,0.12)]"
    >
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-ink/5">
        {report.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL */
          <img
            src={report.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink/25">
            <Camera className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink">
          {isVerified ? (
            <ThumbsUp className="h-3 w-3 text-ink" strokeWidth={2.4} aria-hidden="true" />
          ) : (
            <CircleCheck className="h-3 w-3 text-accent" strokeWidth={2.4} aria-hidden="true" />
          )}
          {isVerified ? t('Verified') : t('Resolved')}
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
          {report.title}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-ink/55">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="truncate">{report.location_name || t('No location given')}</span>
        </span>
        <span className="mt-auto pt-2 text-xs font-medium text-ink/45">
          {isVerified ? t('Verified') : t('Resolved')} {timeAgo(report.updated_at, lang)}
        </span>
      </span>
    </Link>
  )
}
