'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImageOff, X, ZoomIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { signedImageUrl } from '@/lib/reports'
import { useLanguage } from '@/components/LanguageContext'

/**
 * Report photo with a loading shimmer, an error fallback, and a click-to-enlarge
 * overlay. Escape or the backdrop closes the overlay.
 *
 * Confidential photos are stored as a private-bucket path and shown through a
 * 60-minute signed URL; pass `confidential` for those.
 */
export default function ReportImage({ src, alt, confidential = false }) {
  const { t } = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const [isOpen, setIsOpen] = useState(false)
  const [resolvedSrc, setResolvedSrc] = useState(confidential ? '' : src || '')
  const [status, setStatus] = useState('loading')
  const closeRef = useRef(null)

  useEffect(() => {
    let active = true
    // Deferred so the state writes are not synchronous inside the effect.
    Promise.resolve().then(() => {
      if (!active) return undefined
      if (!src) {
        setResolvedSrc('')
        return undefined
      }
      if (!confidential || /^https?:/.test(src)) {
        setResolvedSrc(src)
        return undefined
      }
      return signedImageUrl(supabase, src)
        .then((url) => {
          if (active) setResolvedSrc(url)
        })
        .catch(() => {
          if (active) setResolvedSrc('')
        })
    })
    return () => {
      active = false
    }
  }, [src, confidential, supabase])

  useEffect(() => {
    Promise.resolve().then(() => setStatus('loading'))
  }, [resolvedSrc])

  // An image that finished loading before hydration never fires `onLoad`, so read
  // the DOM node's own state on mount as well.
  const attachImage = useCallback((node) => {
    if (!node) return
    if (node.complete) setStatus(node.naturalWidth > 0 ? 'loaded' : 'error')
  }, [])

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!resolvedSrc) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative block w-full overflow-hidden rounded-xl bg-ink/5 ring-1 ring-ink/10"
        aria-label={t('Enlarge photo')}
      >
        {status === 'loading' ? (
          <span className="absolute inset-0 animate-pulse bg-ink/10" aria-hidden="true" />
        ) : null}

        {status === 'error' ? (
          <span className="flex h-56 flex-col items-center justify-center gap-2 text-ink/50">
            <ImageOff className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-xs font-medium">{t('Photo could not be loaded.')}</span>
          </span>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- report photos are
             remote Supabase Storage URLs of unknown dimensions, not build-time assets. */
          <img
            ref={attachImage}
            src={resolvedSrc}
            alt={alt}
            loading="lazy"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            className={`h-auto max-h-[28rem] w-full object-cover transition-opacity ${
              status === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {status === 'loaded' ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-ink/75 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            {t('Enlarge')}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            {t('Close')}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedSrc}
            alt={alt}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </>
  )
}
