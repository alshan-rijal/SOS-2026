'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'

/**
 * A small accessible dialog: Escape closes, focus is trapped inside, and focus
 * returns to the trigger on close. Used for confirmations and the cannot-fix
 * reason.
 */
export default function Modal({ open, title, onClose, children, footer, labelledBy = 'admin-modal-title' }) {
  const { t } = useLanguage()
  const panelRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement
    const node = panelRef.current
    const focusables = () =>
      node?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []
    focusables()[0]?.focus()

    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = [...focusables()].filter((el) => !el.disabled)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="pop-in relative z-10 w-full max-w-md overflow-hidden rounded-[14px] border border-ink/12 bg-white shadow-[0_24px_64px_rgba(11,74,111,0.28)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4">
          <h2 id={labelledBy} className="text-base font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t('Close')}
            className="btn btn-ghost h-9 w-9 px-0 text-ink/60">
            <X className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 p-4">{footer}</div> : null}
      </div>
    </div>
  )
}
