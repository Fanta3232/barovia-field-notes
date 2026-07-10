'use client'

import { ReactNode, useEffect } from 'react'

export default function Modal({
  open, onClose, title, children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" />
      <div
        className="panel rounded-sm p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative shadow-seal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-mist">
          <h2 className="font-display text-lg text-candle">{title}</h2>
          <button onClick={onClose} className="text-parchment/50 hover:text-candle text-2xl leading-none px-1">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
