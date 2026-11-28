'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The live numbers from Supabase, counted up once when they scroll into view.
 *
 * The server renders the final value, so the number is correct with JS disabled
 * and after hydration; the count only starts when motion is allowed and the
 * number is actually visible.
 */
export default function CountUp({ value, duration = 900 }) {
  const ref = useRef(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const node = ref.current
    if (!node || value <= 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    let started = false

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started) return
        started = true
        observer.disconnect()

        const start = performance.now()
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration)
          // Ease-out: fast off the mark, settles on the final digit.
          const eased = 1 - (1 - progress) ** 3
          setDisplay(Math.round(value * eased))
          if (progress < 1) frame = requestAnimationFrame(tick)
        }
        setDisplay(0)
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.4 }
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, duration])

  return <span className="tabular-nums">{display.toLocaleString('en-US')}</span>
}
