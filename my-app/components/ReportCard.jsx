import Link from 'next/link'
import { ArrowRight, MapPin, ThumbsUp } from 'lucide-react'
import { SeverityBadge, StatusBadge } from '@/components/Badges'
import { timeAgo } from '@/lib/reports'

export default function ReportCard({ report, onVerify, isVerifying = false }) {
  return (
    <article className="card flex min-w-0 flex-col p-5 transition-shadow duration-150 hover:shadow-[0_12px_32px_rgba(11,74,111,0.12)]">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={report.severity} />
        <StatusBadge status={report.status} />
        <span className="ml-auto text-xs text-ink/50">{timeAgo(report.createdAt)}</span>
      </div>

      <h3 className="break-words text-base font-semibold leading-snug text-ink">
        <Link href={`/reports/${report.id}`} className="transition-colors duration-150 hover:text-accent">
          {report.title}
        </Link>
      </h3>

      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-ink/55">
        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="truncate">
          {report.category}
          {report.locationName ? ` · ${report.locationName}` : ''}
        </span>
      </p>

      {report.description ? (
        <p className="mt-3 line-clamp-2 break-words text-sm leading-relaxed text-ink/70">
          {report.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/10 pt-3">
        <span className="min-w-0 truncate text-xs text-ink/55">
          Reported by <span className="font-semibold text-ink/75">{report.reporterName}</span>
        </span>

        <div className="flex shrink-0 items-center gap-2">
          {onVerify ? (
            <button
              type="button"
              onClick={() => onVerify(report)}
              disabled={isVerifying}
              aria-pressed={report.verifiedByMe}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                report.verifiedByMe
                  ? 'bg-ink text-white hover:bg-ink/90'
                  : 'bg-ink/5 text-ink hover:bg-ink/10'
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {report.verifications}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink/5 px-2.5 py-1.5 text-xs font-semibold text-ink/70">
              <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {report.verifications}
            </span>
          )}

          <Link
            href={`/reports/${report.id}`}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-accent/10"
          >
            Details
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function ReportCardSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="mb-3 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-ink/8" />
        <div className="h-6 w-24 rounded-full bg-ink/8" />
      </div>
      <div className="h-4 w-3/4 rounded bg-ink/8" />
      <div className="mt-2 h-3 w-1/2 rounded bg-ink/8" />
      <div className="mt-3 h-3 w-full rounded bg-ink/8" />
      <div className="mt-2 h-3 w-5/6 rounded bg-ink/8" />
    </div>
  )
}
