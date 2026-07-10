import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-5xl text-candle mb-4">Barovia</h1>
      <p className="text-parchment/70 max-w-md mb-8">
        Field notes for the mists. Character creation, sheets, and campaign tools for Curse of
        Strahd.
      </p>
      <div className="flex gap-3">
        <Link
          href="/create"
          className="bg-blood hover:bg-blood-bright transition rounded-sm px-6 py-3 font-display tracking-wide"
        >
          Create a Character
        </Link>
        <Link
          href="/characters"
          className="border border-mist hover:border-candle/50 transition rounded-sm px-6 py-3 font-display tracking-wide text-parchment/80"
        >
          View Souls
        </Link>
      </div>
    </main>
  )
}
