'use client'

import { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react'

type TooltipProps = {
  label: ReactNode          // the word/phrase in the sheet, e.g. spell name
  title: string             // heading in the popover
  subtitle?: string         // e.g. "1st-level Evocation" or "Rare, requires attunement"
  body: ReactNode           // the description
  className?: string
  block?: boolean           // true for list rows that should stack (sheet); false/omitted for
                             // chip-style inline selections (wizard) — the wrong one of these
                             // is exactly what caused every sheet list to run together on one line
}

// Hovers open on desktop (mouse present), tap-to-open on touch devices.
// Detected via pointer type rather than screen width, so it holds up
// across tablets and split-view layouts.
export default function Tooltip({ label, title, subtitle, body, className, block }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Popups near the bottom (or edges) of the viewport used to always render below/centered
  // regardless of available space — clipping off-screen, which grows the page's scroll height,
  // which shifts the mouse relative to the trigger, which fires onMouseLeave, closing the
  // popup, shrinking the page back, and re-triggering onMouseEnter. That open/close flicker
  // loop is fixed by flipping placement based on actual available space before it ever renders
  // visibly (useLayoutEffect runs before paint, so there's no visible jump).
  const [vertical, setVertical] = useState<'below' | 'above'>('below')
  const [horizontal, setHorizontal] = useState<'center' | 'left' | 'right'>('center')

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const estimatedHalfWidth = 144 // w-72 = 288px wide, half of that
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    // Whichever side has more room wins — simpler and more reliable than guessing a fixed
    // popup height, since longer descriptions (spell mechanics, feature text) made a fixed
    // threshold too small and it kept "below" even when there wasn't really room for it.
    setVertical(spaceAbove > spaceBelow ? 'above' : 'below')
    const centerX = rect.left + rect.width / 2
    if (centerX < estimatedHalfWidth) setHorizontal('left')
    else if (window.innerWidth - centerX < estimatedHalfWidth) setHorizontal('right')
    else setHorizontal('center')
  }, [open])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const triggerProps = isTouch
    ? { onClick: () => setOpen((o) => !o) }
    : { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) }

  const verticalClass = vertical === 'below' ? 'top-full mt-2' : 'bottom-full mb-2'
  const horizontalClass = horizontal === 'center' ? 'left-1/2 -translate-x-1/2' : horizontal === 'left' ? 'left-0' : 'right-0'

  return (
    <span className={`relative ${block ? 'block mb-2.5' : 'inline-block'}`} ref={ref}>
      <span
        {...triggerProps}
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={
          className ??
          `text-candle underline decoration-dotted decoration-candle/50 underline-offset-2 cursor-help ${block ? 'block' : ''}`
        }
      >
        {label}
      </span>
      {open && (
        <span
          role="tooltip"
          className={`panel absolute z-50 ${horizontalClass} ${verticalClass} w-72 max-h-[70vh] overflow-y-auto rounded-sm p-3 text-left shadow-seal`}
        >
          <span className="block font-display text-sm text-candle mb-1">{title}</span>
          {subtitle && (
            <span className="block font-utility text-xs text-parchment/60 mb-2 italic">
              {subtitle}
            </span>
          )}
          <span className="block font-body text-sm text-parchment/90 leading-snug">{body}</span>
        </span>
      )}
    </span>
  )
}
