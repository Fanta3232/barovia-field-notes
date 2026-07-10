'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type CharacterSummary = {
  id: string
  name: string
  level: number
  current_hp: number
  max_hp: number
  created_at: string
  species: { name: string } | null
  class: { name: string } | null
  background: { name: string } | null
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('characters')
        .select('id, name, level, current_hp, max_hp, created_at, species:species_id(name), class:class_id(name), background:background_id(name)')
        .eq('is_quickstart_template', false)
        .order('created_at', { ascending: false })
      setCharacters((data ?? []) as unknown as CharacterSummary[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-3xl text-candle">Souls in Barovia</h1>
        <Link href="/create" className="bg-blood hover:bg-blood-bright transition rounded-sm px-4 py-2 font-display text-sm tracking-wide">
          + New Character
        </Link>
      </div>

      {loading ? (
        <p className="text-parchment/60">Reading the parish register…</p>
      ) : characters.length === 0 ? (
        <div className="panel rounded-sm p-8 text-center">
          <p className="text-parchment/60 mb-4">No souls have entered the mists yet.</p>
          <Link href="/create" className="text-candle hover:text-parchment text-sm">
            Create your first character →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {characters.map((c) => (
            <Link
              key={c.id}
              href={`/character/${c.id}`}
              className="panel rounded-sm p-4 hover:border-candle/50 transition-colors block"
            >
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-display text-lg text-candle">{c.name}</span>
                <span className="text-xs text-parchment/50">Lv {c.level}</span>
              </div>
              <p className="text-sm text-parchment/70 mb-2">
                {c.species?.name} {c.class?.name} · {c.background?.name}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-parchment/40">HP {c.current_hp} / {c.max_hp}</span>
                <span className="text-xs text-parchment/30">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
