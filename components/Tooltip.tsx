'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

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

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

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
          className="panel absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-72 rounded-sm p-3 text-left shadow-seal"
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
