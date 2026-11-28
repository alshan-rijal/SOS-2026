'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Check, Lock, ShieldCheck, Trash2, Undo2, Unlock, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ALL_STATUSES,
  CANNOT_FIX_REASONS,
  STATUS_CONFIG,
  categoryLabel,
  deleteReport,
  describeError,
  fetchReport,
  fetchReportHistory,
  fetchVerifiers,
  isDbUpdateError,
  normalizeStatus,
  setReportConfidential,
  severityLabel,
  shortId,
  signedImageUrl,
  statusLabel,
  updateReportStatus,
} from '@/lib/reports'
import { logAdminAction } from '@/lib/admin'
import { formatDateTime } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'
import StatusStepper from '@/components/StatusStepper'
import Breadcrumbs from '@/components/Breadcrumbs'
import Modal from '@/components/admin/Modal'
import DbNotice from '@/components/admin/DbNotice'
import ErrorCard from '@/components/admin/ErrorCard'
import { useLanguage } from '@/components/LanguageContext'

const ItahariMap = dynamic(() => import('@/components/ItahariMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full skeleton rounded-xl" />,
})

function rank(status) {
  return STATUS_CONFIG[normalizeStatus(status)]?.order ?? 0
}

export default function AdminReportReview({ reportId }) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [verifiers, setVerifiers] = useState([])
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dbStale, setDbStale] = useState(false)
  const [busy, setBusy] = useState(false)

  // Dialog state
  const [statusModal, setStatusModal] = useState(null) // target status or null
  const [deleteModal, setDeleteModal] = useState(false)
  const [reasonPreset, setReasonPreset] = useState('')
  const [reasonText, setReasonText] = useState('')
  const [publicNote, setPublicNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [toast, setToast] = useState(null) // { message, prevStatus }

  const load = useCallback(async (guard) => {
    setLoading(true)
    setError(null)
    try {
      const [result, nextHistory] = await Promise.all([
        fetchReport(supabase, reportId),
        fetchReportHistory(supabase, reportId),
      ])
      if (guard?.cancelled) return
      if (!result.row) {
        setReport(null)
        return
      }
      const normalized = {
        id: result.row.id,
        userId: result.row.user_id,
        title: result.row.title,
        title_ne: result.row.title_ne ?? '',
        description: result.row.description ?? '',
        category: result.row.category,
        severity: result.row.severity,
        status: normalizeStatus(result.row.status),
        locationName: result.row.location_name ?? '',
        latitude: result.row.latitude,
        longitude: result.row.longitude,
        imageUrl: result.row.image_url || null,
        isConfidential: result.row.is_confidential === true,
        statusReason: result.row.status_reason ?? '',
        officialNote: result.row.official_note ?? '',
        reporterName: result.row.reporter_name || 'Anonymous',
        createdAt: result.row.created_at,
        verifications: result.row.report_verifications?.[0]?.count ?? 0,
      }
      setReport(normalized)
      setHistory(nextHistory)
      fetchVerifiers(supabase, reportId).then(setVerifiers).catch(() => {})

      // A confidential photo is stored as a path; fetch a short-lived signed URL.
      if (normalized.isConfidential && normalized.imageUrl && !/^https?:/.test(normalized.imageUrl)) {
        signedImageUrl(supabase, normalized.imageUrl)
          .then(setImageUrl)
          .catch(() => setImageUrl(''))
      } else {
        setImageUrl(normalized.imageUrl || '')
      }
    } catch (err) {
      if (guard?.cancelled) return
      setError(describeError(err, 'admin report review'))
      setDbStale(isDbUpdateError(err))
    } finally {
      if (!guard?.cancelled) setLoading(false)
    }
  }, [supabase, reportId])

  useEffect(() => {
    const guard = { cancelled: false }
    Promise.resolve().then(() => load(guard))
    return () => {
      guard.cancelled = true
    }
  }, [load])

  // Auto-dismiss the undo toast after 10 seconds.
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 10000)
    return () => clearTimeout(timer)
  }, [toast])

  const effectiveReason = useMemo(() => {
    if (statusModal !== 'cannot_fix') return reasonText.trim()
    if (!reasonPreset) return reasonText.trim()
    if (reasonPreset === 'Other') return reasonText.trim()
    return reasonText.trim() ? `${reasonPreset} — ${reasonText.trim()}` : reasonPreset
  }, [statusModal, reasonPreset, reasonText])

  function openStatusModal(target) {
    setStatusModal(target)
    setReasonPreset('')
    setReasonText('')
    setPublicNote('')
    setInternalNote('')
  }

  function closeStatusModal() {
    setStatusModal(null)
    setBusy(false)
  }

  async function applyStatus() {
    const target = statusModal
    if (!target) return
    const isBackward = rank(target) < rank(report.status)
    const needsReason = target === 'cannot_fix' || isBackward

    if (needsReason && effectiveReason.length < 10) {
      setError({ message: t('At least 10 characters.'), detail: '' })
      return
    }

    setBusy(true)
    setError(null)
    try {
      await updateStatus(target, {
        reason: needsReason ? effectiveReason : undefined,
        officialNote: publicNote.trim() || undefined,
      })
      if (internalNote.trim()) {
        await logAdminAction(supabase, {
          action: 'report.note',
          entity: 'report',
          entityId: reportId,
          details: { note: internalNote.trim() },
        })
      }
      const prevStatus = report.status
      closeStatusModal()
      await load()
      // Undo is only offered for a forward move into a non-terminal step.
      if (!needsReason && !['fixed', 'cannot_fix'].includes(target)) {
        setToast({ message: t('Saved'), prevStatus })
      } else {
        setToast({ message: t('Saved'), prevStatus: null })
      }
    } catch (err) {
      setError(describeError(err, 'update report status'))
      setBusy(false)
    }
  }

  async function updateStatus(target, extra) {
    await updateReportStatus(supabase, reportId, target, extra)
  }

  async function undoStatus() {
    if (!toast?.prevStatus) return
    setBusy(true)
    try {
      await updateReportStatus(supabase, reportId, toast.prevStatus)
      setToast(null)
      await load()
    } catch (err) {
      setError(describeError(err, 'undo report status'))
    } finally {
      setBusy(false)
    }
  }

  async function toggleConfidential() {
    setBusy(true)
    setError(null)
    try {
      const next = !report.isConfidential
      await setReportConfidential(supabase, reportId, next)
      await logAdminAction(supabase, {
        action: 'report.confidential_change',
        entity: 'report',
        entityId: reportId,
        details: { is_confidential: next },
      })
      await load()
    } catch (err) {
      setError(describeError(err, 'toggle confidential'))
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await logAdminAction(supabase, {
        action: 'report.delete',
        entity: 'report',
        entityId: reportId,
        details: { reason: deleteReason.trim() || null, title: report.title },
      })
      await deleteReport(supabase, reportId)
      router.push('/admin/reports')
    } catch (err) {
      setError(describeError(err, 'delete report'))
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 h-96 skeleton rounded-[14px]" />
        <div className="h-96 skeleton rounded-[14px]" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-semibold text-ink">{t('Report not found.')}</p>
        <Link href="/admin/reports" className="mt-3 inline-block text-sm font-semibold text-ink hover:underline">
          {t('Reports')}
        </Link>
      </div>
    )
  }

  const nextStep =
    report.status === 'reported'
      ? 'under_verification'
      : report.status === 'under_verification'
        ? 'in_progress'
        : report.status === 'in_progress'
          ? 'fixed'
          : null

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/admin' },
          { label: 'Reports', href: '/admin/reports' },
          { label: report.title },
        ]}
      />

      {dbStale ? <DbNotice /> : null}
      {error ? <ErrorCard message={error.message} detail={error.detail} onRetry={load} /> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-[clamp(16px,2vw,24px)]">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={report.status} />
              {report.isConfidential ? (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-ink bg-surface px-2.5 text-xs font-semibold text-ink">
                  <Lock className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" /> {t('Confidential')}
                </span>
              ) : null}
              <span className="ml-auto font-mono text-xs text-ink/50">{shortId(report.id)}</span>
            </div>

            <h1 className="mt-3 text-[clamp(20px,2.2vw,28px)] font-bold leading-tight tracking-tight text-ink">{report.title}</h1>
            <p className="mt-1 text-sm text-ink/60">
              {categoryLabel(report.category, lang)} · {severityLabel(report.severity, lang)} · {report.locationName || '—'}
            </p>
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-ink/80">{report.description}</p>
            <p className="mt-3 text-xs text-ink/50">{t('Reported')}: {formatDateTime(report.createdAt, lang)}</p>
            {report.officialNote ? (
              <div className="mt-4 rounded-xl border border-ink/12 bg-surface p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/55">{t('Public note')}</p>
                <p className="mt-1 text-sm text-ink/80">{report.officialNote}</p>
              </div>
            ) : null}
          </section>

          {imageUrl ? (
            <section className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="max-h-[28rem] w-full object-cover" />
              {report.isConfidential ? (
                <p className="flex items-center gap-1.5 border-t border-ink/10 p-3 text-xs text-ink/60">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" /> {t('Confidential reports are visible only to you and the reporter.')}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="card p-[clamp(16px,2vw,24px)]">
            <h2 className="text-sm font-bold text-ink">{t('Place')}</h2>
            <div className="mt-3 h-64">
              {Number.isFinite(report.latitude) && Number.isFinite(report.longitude) ? (
                <ItahariMap reports={[report]} showZones={false} showPopups={false} zoom={15} fitToReports className="h-full" />
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl bg-surface text-sm text-ink/50">{t('No reports with a map location yet.')}</div>
              )}
            </div>
          </section>

          <section className="card p-[clamp(16px,2vw,24px)]">
            <h2 className="text-sm font-bold text-ink">{t('Reporter contact')}</h2>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-ink/75">
              <span><span className="text-ink/50">{t('Reporter')}: </span>{report.reporterName}</span>
              <span><span className="text-ink/50">{t('Verifications')}: </span>{report.verifications}</span>
            </div>
            {verifiers.length ? (
              <ul className="mt-3 space-y-1 text-xs text-ink/60">
                {verifiers.map((person) => (
                  <li key={person.id}>{person.full_name || '—'} · {t('Verified')}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        {/* Right: status controls */}
        <div className="space-y-5">
          <section className="card p-[clamp(16px,2vw,24px)]">
            <h2 className="text-sm font-bold text-ink">{t('Update status')}</h2>
            <StatusStepper className="mt-4" status={report.status} history={history} reason={report.statusReason} changedByName={history.find((h) => h.toStatus === 'cannot_fix')?.changedByName || ''} />

            <div className="mt-5 flex flex-col gap-2">
              {nextStep ? (
                <button type="button" onClick={() => openStatusModal(nextStep)} disabled={busy}
                  className="btn btn-primary px-4">
                  <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                  {t('Move to')} {statusLabel(nextStep, lang)}
                </button>
              ) : null}

              {report.status !== 'cannot_fix' && report.status !== 'fixed' ? (
                <button type="button" onClick={() => openStatusModal('cannot_fix')} disabled={busy}
                  className="btn btn-cta px-4">
                  <X className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                  {t("Can't be fixed")}
                </button>
              ) : null}

              <label className="mt-1 flex flex-col gap-1 text-xs font-semibold text-ink/60">
                {t('Status')}
                <select value="" onChange={(e) => e.target.value && openStatusModal(e.target.value)} disabled={busy}
                  className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none">
                  <option value="">{t('Choose a reason')}</option>
                  {ALL_STATUSES.filter((s) => s !== report.status).map((s) => (
                    <option key={s} value={s}>{statusLabel(s, lang)}{rank(s) < rank(report.status) ? ` (${t('Overdue')})` : ''}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="card p-[clamp(16px,2vw,24px)]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">{t('Confidential report')}</h2>
              {report.isConfidential ? <Lock className="h-4 w-4 text-ink/60" aria-hidden="true" /> : <Unlock className="h-4 w-4 text-ink/60" aria-hidden="true" />}
            </div>
            <p className="mt-1.5 text-xs text-ink/60">{t('Confidential reports are visible only to you and the reporter.')}</p>
            <button type="button" onClick={toggleConfidential} disabled={busy}
              className="btn btn-outline mt-3 gap-2 px-3.5">
              {report.isConfidential ? t('Make public') : t('Make confidential')}
            </button>
          </section>

          <section className="card p-[clamp(16px,2vw,24px)]">
            <h2 className="text-sm font-bold text-ink">{t('Status history')}</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-ink/50">{t('No history yet.')}</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {history.map((row) => (
                  <li key={row.id} className="border-l-2 border-ink/15 pl-3">
                    <p className="text-sm font-semibold text-ink">{statusLabel(row.toStatus, lang)}</p>
                    <p className="text-xs text-ink/50" title={formatDateTime(row.createdAt, lang)}>{formatDateTime(row.createdAt, lang)}</p>
                    {row.changedByName ? <p className="text-xs text-ink/60">{t('By {name}', { name: row.changedByName })}</p> : null}
                    {row.reason ? <p className="mt-1 text-xs text-accent">{row.reason}</p> : null}
                    {row.note ? <p className="mt-1 text-xs text-ink/70">{row.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card p-[clamp(16px,2vw,24px)]">
            <button type="button" onClick={() => setDeleteModal(true)} disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-accent/40 px-3.5 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-50">
              <Trash2 className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              {t('Delete report')}
            </button>
          </section>
        </div>
      </div>

      {/* Status change dialog */}
      <Modal
        open={Boolean(statusModal)}
        title={statusModal ? `${t('Update status')}: ${statusLabel(statusModal, lang)}` : ''}
        onClose={closeStatusModal}
        footer={
          <>
            <button type="button" onClick={closeStatusModal} className="h-10 rounded-xl border border-ink/15 px-4 text-sm font-semibold text-ink hover:bg-ink/5">
              {t('Cancel')}
            </button>
            <button type="button" onClick={applyStatus} disabled={busy}
              className="h-10 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50">
              {t('Save status')}
            </button>
          </>
        }
      >
        {statusModal === 'cannot_fix' ? (
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
              {t('Choose a reason')}
              <select value={reasonPreset} onChange={(e) => setReasonPreset(e.target.value)}
                className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm font-normal text-ink focus:border-accent focus:outline-none">
                <option value="">{t('Choose a reason')}</option>
                {CANNOT_FIX_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
              {t("Reason this can't be fixed")}
              <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={3}
                aria-describedby="reason-hint"
                className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal text-ink focus:border-accent focus:outline-none" />
              <span id="reason-hint" className="text-xs font-normal text-ink/50">{t('At least 10 characters.')}</span>
            </label>
          </div>
        ) : rank(statusModal) < rank(report.status) ? (
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            {t('Reason')}
            <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={3}
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal text-ink focus:border-accent focus:outline-none" />
            <span className="text-xs font-normal text-ink/50">{t('At least 10 characters.')}</span>
          </label>
        ) : null}

        <div className="mt-3 space-y-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            {t('Public note')}
            <textarea value={publicNote} onChange={(e) => setPublicNote(e.target.value)} rows={2}
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal text-ink focus:border-accent focus:outline-none" />
            <span className="text-xs font-normal text-ink/50">{t('Optional. Shown on the public report page.')}</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            {t('Internal note (admins only)')}
            <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={2}
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal text-ink focus:border-accent focus:outline-none" />
            <span className="text-xs font-normal text-ink/50">{t('Optional. Only other admins see this.')}</span>
          </label>
        </div>
      </Modal>

      {/* Delete dialog */}
      <Modal
        open={deleteModal}
        title={t('Delete this report?')}
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setDeleteModal(false)} className="h-10 rounded-xl border border-ink/15 px-4 text-sm font-semibold text-ink hover:bg-ink/5">{t('Cancel')}</button>
            <button type="button" onClick={confirmDelete} disabled={busy}
              className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50">{t('Delete')}</button>
          </>
        }
      >
        <p className="text-sm text-ink/75">{t('This cannot be undone.')}</p>
        <label className="mt-3 flex flex-col gap-1 text-sm font-semibold text-ink">
          {t('Reason for deleting')}
          <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={2}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal text-ink focus:border-accent focus:outline-none" />
        </label>
      </Modal>

      {/* Undo toast */}
      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-ink/12 bg-white px-4 py-3 shadow-[0_16px_40px_rgba(11,74,111,0.18)]" role="status">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-ink" aria-hidden="true" /> {toast.message}
          </span>
          {toast.prevStatus ? (
            <button type="button" onClick={undoStatus} className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
              <Undo2 className="h-4 w-4" aria-hidden="true" /> {t('Undo')}
            </button>
          ) : null}
          <button type="button" onClick={() => setToast(null)} aria-label={t('Close')} className="text-ink/50 hover:text-ink">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
