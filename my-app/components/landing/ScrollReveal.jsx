'use client'

import { useEffect } from 'react'

/**
 * Fades in the landing sections marked with `data-reveal` as they scroll in.
 *
 * Only sections that start below the fold are armed, so nothing is hidden
 * before hydration (or without JS) and the hero never waits on an observer.
 */
export default function ScrollReveal() {
  useEffect(() => {
    // Without IntersectionObserver nothing would ever be revealed, so leave
    // every section visible instead of arming it.
    if (typeof IntersectionObserver !== 'function') return

    const sections = Array.from(document.querySelectorAll('[data-reveal]'))
    const belowFold = sections.filter(
      (element) => element.getBoundingClientRect().top > window.innerHeight * 0.9
    )
    if (belowFold.length === 0) return

    belowFold.forEach((element) => element.classList.add('is-reveal-ready'))

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    )

    belowFold.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return null
}
