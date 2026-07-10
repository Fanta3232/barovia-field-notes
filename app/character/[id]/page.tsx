'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Tooltip from '@/components/Tooltip'

type FullCharacter = {
  id: string
  name: string
  level: number
  alignment: string | null
  max_hp: number
  current_hp: number
  temp_hp: number
  armor_class: number
  initiative_bonus: number
  speed: number
  exhaustion_level: number
  inspiration: boolean
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  background_asi: Record<string, number> | null
  species: { name: string; traits: { name: string; description: string }[] } | null
  background: { name: string } | null
  class: { name: string; hit_die: number; spellcasting_type: string | null } | null
}

type SkillRow = { skill_name: string; proficient: boolean; expertise: boolean }
type LanguageRow = { language: string; source: string }
type FeatRow = { source: string; feats: { name: string; description: string; category: string } }
type SpellRow = { is_prepared: boolean; is_always_known: boolean; spells: { name: string; level: number; school: string; description: string } }
type InventoryRow = { quantity: number; item_name: string | null; items: { name: string; description: string } | null }
type CurrencyRow = { gp: number; sp: number; cp: number; pp: number; ep: number }

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

export default function CharacterSheetPage({ params }: { params: { id: string } }) {
  const [character, setCharacter] = useState<FullCharacter | null>(null)
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [languages, setLanguages] = useState<LanguageRow[]>([])
  const [charFeats, setCharFeats] = useState<FeatRow[]>([])
  const [charSpells, setCharSpells] = useState<SpellRow[]>([])
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [currency, setCurrency] = useState<CurrencyRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [charRes, skillsRes, langRes, featsRes, spellsRes, invRes, currRes] = await Promise.all([
        supabase.from('characters')
          .select('*, species:species_id(name, traits), background:background_id(name), class:class_id(name, hit_die, spellcasting_type)')
          .eq('id', params.id).single(),
        supabase.from('character_skills').select('skill_name, proficient, expertise').eq('character_id', params.id),
        supabase.from('character_languages').select('language, source').eq('character_id', params.id),
        supabase.from('character_feats').select('source, feats:feat_id(name, description, category)').eq('character_id', params.id),
        supabase.from('character_spells').select('is_prepared, is_always_known, spells:spell_id(name, level, school, description)').eq('character_id', params.id),
        supabase.from('character_inventory').select('quantity, item_name, items:item_id(name, description)').eq('character_id', params.id),
        supabase.from('character_currency').select('gp, sp, cp, pp, ep').eq('character_id', params.id).single(),
      ])
      setCharacter(charRes.data as unknown as FullCharacter)
      setSkills((skillsRes.data ?? []) as SkillRow[])
      setLanguages((langRes.data ?? []) as LanguageRow[])
      setCharFeats((featsRes.data ?? []) as unknown as FeatRow[])
      setCharSpells((spellsRes.data ?? []) as unknown as SpellRow[])
      setInventory((invRes.data ?? []) as unknown as InventoryRow[])
      setCurrency(currRes.data as CurrencyRow)
      setLoading(false)
    }
    load()
  }, [params.id])

  function modifier(score: number) {
    const m = Math.floor((score - 10) / 2)
    return m >= 0 ? `+${m}` : `${m}`
  }

  if (loading) return <main className="p-10 text-parchment/60">Loading the dossier…</main>
  if (!character) return <main className="p-10 text-blood-bright">No record of this soul.</main>

  const cantrips = charSpells.filter((s) => s.spells.level === 0)
  const knownSpells = charSpells.filter((s) => s.spells.level > 0)
  const originFeats = charFeats.filter((f) => f.source === 'background' || f.source === 'species_versatile')
  const classFeat = charFeats.find((f) => f.source === 'class_feature_l1')

  return (
    <main className="min-h-screen px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-6 border-b border-mist pb-4">
        <div>
          <h1 className="font-display text-3xl text-candle">{character.name}</h1>
          <p className="text-sm text-parchment/60">
            Level {character.level} {character.species?.name} {character.class?.name} · {character.background?.name}
            {character.alignment && ` · ${character.alignment}`}
          </p>
        </div>
        {character.inspiration && <span className="wax-seal text-xs px-3 py-1 rounded-full font-utility">Inspired</span>}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-3 space-y-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Vitals</h2>
            <Row label="HP" value={`${character.current_hp} / ${character.max_hp}${character.temp_hp > 0 ? ` (+${character.temp_hp})` : ''}`} />
            <Row label="Armor Class" value={String(character.armor_class)} />
            <Row label="Initiative" value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : String(character.initiative_bonus)} />
            <Row label="Speed" value={`${character.speed} ft`} />
            <Row
              label={<Tooltip label="Exhaustion" title="Exhaustion" body="A stacking condition (2024 rules): each level applies a cumulative -1 penalty to every D20 Test. Level 6 is death." />}
              value={`${character.exhaustion_level} / 6`}
            />
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Ability Scores</h2>
            {ABILITIES.map((ab) => {
              const bonus = character.background_asi?.[ab]
              return (
                <div key={ab} className="flex justify-between text-sm capitalize mb-1">
                  <span>{ab.slice(0, 3).toUpperCase()}{bonus ? <span className="text-candle text-xs"> (+{bonus} bg)</span> : ''}</span>
                  <span>{character[ab]} ({modifier(character[ab])})</span>
                </div>
              )
            })}
          </div>

          {character.species?.traits && character.species.traits.length > 0 && (
            <div className="panel rounded-sm p-4">
              <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Species Traits</h2>
              {character.species.traits.map((t) => (
                <Tooltip block key={t.name} label={<span className="block text-sm mb-1.5">{t.name}</span>} title={t.name} body={t.description} />
              ))}
            </div>
          )}

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Languages</h2>
            <p className="text-sm">{languages.map((l) => l.language).join(', ') || 'Common'}</p>
          </div>
        </section>

        <section className="col-span-4 space-y-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Skills</h2>
            {skills.length ? skills.map((s) => (
              <Row key={s.skill_name} label={s.skill_name} value="proficient" dim />
            )) : <p className="text-xs text-parchment/40 italic">None recorded.</p>}
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Feats</h2>
            {originFeats.length ? originFeats.map((f) => (
              <Tooltip block key={f.feats.name} label={<span className="block text-sm mb-1.5">{f.feats.name} <span className="text-parchment/40 text-xs">({f.source === 'species_versatile' ? 'Versatile' : 'Background'})</span></span>} title={f.feats.name} body={f.feats.description} />
            )) : <p className="text-xs text-parchment/40 italic">None recorded.</p>}
            {classFeat && (
              <div className="mt-2 pt-2 border-t border-mist/50">
                <Tooltip block label={<span className="block text-sm">{classFeat.feats.name} <span className="text-parchment/40 text-xs">(Level 1 Class Feature)</span></span>} title={classFeat.feats.name} body={classFeat.feats.description} />
              </div>
            )}
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Conditions</h2>
            <p className="text-xs text-parchment/40 italic">None currently applied.</p>
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Currency</h2>
            {currency ? (
              <p className="text-sm">{currency.gp} gp{currency.sp ? `, ${currency.sp} sp` : ''}{currency.cp ? `, ${currency.cp} cp` : ''}</p>
            ) : <p className="text-xs text-parchment/40 italic">None recorded.</p>}
          </div>
        </section>

        <section className="col-span-5 space-y-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Spells</h2>
            {cantrips.length === 0 && knownSpells.length === 0 ? (
              <p className="text-xs text-parchment/40 italic">{character.class?.spellcasting_type ? 'No spells selected.' : 'Non-caster — no spell panel needed.'}</p>
            ) : (
              <>
                {cantrips.map((s) => (
                  <Tooltip block key={s.spells.name} label={<span className="text-sm">{s.spells.name} <span className="text-parchment/40 text-xs">(cantrip)</span></span>} title={s.spells.name} subtitle={`Cantrip · ${s.spells.school}`} body={s.spells.description} />
                ))}
                {knownSpells.map((s) => (
                  <Tooltip block key={s.spells.name} label={<span className="text-sm">{s.spells.name}</span>} title={s.spells.name} subtitle={`Level ${s.spells.level} · ${s.spells.school}`} body={s.spells.description} />
                ))}
              </>
            )}
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Inventory</h2>
            {inventory.length ? inventory.map((row, i) => (
              row.items ? (
                <Tooltip block key={i} label={<span className="text-sm">{row.quantity}× {row.items.name}</span>} title={row.items.name} body={row.items.description} />
              ) : (
                <div key={i} className="text-sm mb-1">{row.quantity}× {row.item_name}</div>
              )
            )) : <p className="text-xs text-parchment/40 italic">No equipment recorded.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}

function Row({ label, value, dim }: { label: React.ReactNode; value: string; dim?: boolean }) {
  return (
    <div className="flex justify-between text-sm mb-1">
      <span>{label}</span>
      <span className={dim ? 'text-parchment/40' : ''}>{value}</span>
    </div>
  )
}
