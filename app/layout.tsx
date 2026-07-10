import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Barovia — Field Notes',
  description: 'Character creation and campaign tools for Curse of Strahd.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
