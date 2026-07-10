'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Add future tabs here (Admin, Docs, etc.) — just append an entry, nothing else needs to
// change. `href` is matched as an exact path or a prefix, so nested routes (e.g. individual
// character sheets under /character/[id]) still light up the right tab.
const TABS = [
  { label: 'Create Character', href: '/create' },
  { label: 'Souls in Barovia', href: '/characters' },
]

// Styled distinctly (blood-red rather than candle-gold) since it's DM tooling, not a
// player-facing page — the color itself is the "you are somewhere different now" signal.
const DM_TAB = { label: 'DM Panel', href: '/admin' }

export default function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-mist px-6 flex items-center gap-1 overflow-x-auto">
      <Link
        href="/"
        className="font-display text-candle text-sm px-3 py-3 mr-2 hover:text-parchment transition-colors whitespace-nowrap"
      >
        Barovia
      </Link>
      {TABS.map((t) => {
        const active = pathname === t.href || pathname?.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`font-display text-sm px-3 py-3 border-b-2 transition-colors whitespace-nowrap ${
              active ? 'border-candle text-candle' : 'border-transparent text-parchment/60 hover:text-parchment'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
      <Link
        href={DM_TAB.href}
        className={`font-display text-sm px-3 py-3 border-b-2 transition-colors whitespace-nowrap ml-auto ${
          pathname === DM_TAB.href || pathname?.startsWith(DM_TAB.href + '/')
            ? 'border-blood-bright text-blood-bright'
            : 'border-transparent text-blood-bright/50 hover:text-blood-bright'
        }`}
      >
        {DM_TAB.label}
      </Link>
    </nav>
  )
}
