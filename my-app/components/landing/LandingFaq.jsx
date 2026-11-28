'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * FAQ accordion in the style of the base-ui "multiple" example: every item opens
 * independently, the first one starts open, and the open item is marked by a
 * thicker accent border with an accent question and chevron. The palette stands
 * in for the example's blue.
 *
 * Each question is a real button with aria-expanded/aria-controls, so it is
 * reachable and operable by keyboard alone; the answer panel leaves the flow
 * with the `hidden` attribute when collapsed.
 */
export default function LandingFaq({ items }) {
  // Open by index, so the first question is open on load and any number can be
  // open together. A Set keeps the toggle a single state update per click.
  const [open, setOpen] = useState(() => new Set([0]))

  function toggle(index) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="border-t border-ink/10">
      {items.map((item, index) => {
        const isOpen = open.has(index)
        return (
          <div
            key={item.question}
            className={`border-b transition-colors duration-200 ${
              isOpen ? 'border-b-2 border-accent' : 'border-ink/10'
            }`}
          >
            <h3>
              <button
                type="button"
                id={`faq-question-${index}`}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                onClick={() => toggle(index)}
                className={`flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold transition-colors duration-200 sm:text-lg ${
                  isOpen ? 'text-accent' : 'text-ink hover:text-accent'
                }`}
              >
                {item.question}
                <ChevronDown
                  className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                    isOpen ? '-rotate-180 text-accent' : 'text-ink/40'
                  }`}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={`faq-answer-${index}`}
              role="region"
              aria-labelledby={`faq-question-${index}`}
              hidden={!isOpen}
              className="faq-panel -mt-1 max-w-[62ch] pb-5 text-sm leading-relaxed text-ink/70"
            >
              {item.answer}
            </div>
          </div>
        )
      })}
    </div>
  )
}
