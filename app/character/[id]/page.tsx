'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Tooltip from '@/components/Tooltip'

type FullCharacter = {
  id: string
  name: string
  level: number
  class_id: string
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
  species_asi: Record<string, number> | null
  draconic_ancestry: string | null
  favored_enemy: string | null
  favored_terrain: string | null
  resilient_ability: string | null
  chosen_tool_proficiency: string | null
  species: { name: string; traits: { name: string; description: string }[] } | null
  species_subrace: { name: string; traits: { name: string; description: string }[] } | null
  background: { name: string; feature_name: string | null; feature_description: string | null } | null
  class: { name: string; hit_die: number; spellcasting_type: string | null; saving_throw_proficiencies: string[] } | null
  subclass: { name: string; features: { name: string; description: string; level: number }[] } | null
}

type SkillRow = { skill_name: string }
type LanguageRow = { language: string }
type FeatRow = { source: string; feats: { name: string; description: string; category: string } }
type SpellRow = { is_prepared: boolean; is_always_known: boolean; spells: { name: string; level: number; school: string; description: string } }
type InventoryRow = {
  id: string
  quantity: number
  item_name: string | null
  parent_inventory_id: string | null
  items: { name: string; description: string; weight_units: number; is_container: boolean; container_capacity: number | null } | null
}
type CurrencyRow = { gp: number; sp: number; cp: number; pp: number; ep: number }
type ClassFeatureRow = { name: string; description: string; level: number }
type SpellSlotRow = { slot_level: number; max_slots: number; used_slots: number }
type ResourceRow = { name: string; max_value: number; current_value: number; recharge: string }
type ActiveEffectRow = { effect_name: string; is_active: boolean }

// Class abilities with a genuine on/off toggle shape at level 1. Deliberately small — Second
// Wind (Fighter) is a one-time resource use already covered by character_resources, and
// Unarmored Defense (Monk/Barbarian) is an always-on passive already baked into AC. Extend
// this as leveling adds more toggleable abilities (Wild Shape, Divine Smite readiness, etc.).
const CLASS_EFFECTS: Record<string, { name: string; description: string }[]> = {
  Barbarian: [{
    name: 'Raging',
    description: 'Advantage on Strength checks and Strength saving throws. +2 bonus to melee damage rolls using Strength. Resistance to bludgeoning, piercing, and slashing damage. Can\u2019t cast spells or concentrate on spells while raging.',
  }],
  Rogue: [{
    name: 'Sneak Attack Ready',
    description: 'You have advantage on this attack, or an ally is within 5 feet of the target and you don\u2019t have disadvantage \u2014 deal an extra 1d6 damage once this turn with a finesse or ranged weapon.',
  }],
}

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

export default function CharacterSheetPage({ params }: { params: { id: string } }) {
  const [character, setCharacter] = useState<FullCharacter | null>(null)
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [languages, setLanguages] = useState<LanguageRow[]>([])
  const [charFeats, setCharFeats] = useState<FeatRow[]>([])
  const [charSpells, setCharSpells] = useState<SpellRow[]>([])
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set())
  const [currency, setCurrency] = useState<CurrencyRow | null>(null)
  const [classFeatures, setClassFeatures] = useState<ClassFeatureRow[]>([])
  const [spellSlots, setSpellSlots] = useState<SpellSlotRow[]>([])
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [activeEffects, setActiveEffects] = useState<ActiveEffectRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [charRes, skillsRes, langRes, featsRes, spellsRes, invRes, currRes, slotsRes, resourcesRes, effectsRes] = await Promise.all([
        supabase.from('characters')
          .select('*, species:species_id(name, traits), species_subrace:species_subrace_id(name, traits), background:background_id(name, feature_name, feature_description), class:class_id(name, hit_die, spellcasting_type, saving_throw_proficiencies), subclass:subclass_id(name, features)')
          .eq('id', params.id).single(),
        supabase.from('character_skills').select('skill_name').eq('character_id', params.id),
        supabase.from('character_languages').select('language').eq('character_id', params.id),
        supabase.from('character_feats').select('source, feats:feat_id(name, description, category)').eq('character_id', params.id),
        supabase.from('character_spells').select('is_prepared, is_always_known, spells:spell_id(name, level, school, description)').eq('character_id', params.id),
        supabase.from('character_inventory').select('id, quantity, item_name, parent_inventory_id, items:item_id(name, description, weight_units, is_container, container_capacity)').eq('character_id', params.id),
        supabase.from('character_currency').select('gp, sp, cp, pp, ep').eq('character_id', params.id).single(),
        supabase.from('character_spell_slots').select('slot_level, max_slots, used_slots').eq('character_id', params.id),
        supabase.from('character_resources').select('name, max_value, current_value, recharge').eq('character_id', params.id),
        supabase.from('character_active_effects').select('effect_name, is_active').eq('character_id', params.id),
      ])
      const char = charRes.data as unknown as FullCharacter
      setCharacter(char)
      setSkills((skillsRes.data ?? []) as SkillRow[])
      setLanguages((langRes.data ?? []) as LanguageRow[])
      setCharFeats((featsRes.data ?? []) as unknown as FeatRow[])
      setCharSpells((spellsRes.data ?? []) as unknown as SpellRow[])
      setInventory((invRes.data ?? []) as unknown as InventoryRow[])
      setCurrency(currRes.data as CurrencyRow)
      setSpellSlots((slotsRes.data ?? []) as SpellSlotRow[])
      setResources((resourcesRes.data ?? []) as ResourceRow[])
      setActiveEffects((effectsRes.data ?? []) as ActiveEffectRow[])

      // Class features (Rage, Sneak Attack, Second Wind, etc.) were found missing entirely
      // from the sheet during the gap-hunting pass — only Fighting Style and subclass features
      // were ever shown. These are deterministic from class + level, no per-character storage
      // needed, just a lookup.
      if (char?.class_id) {
        const cfRes = await supabase.from('class_features').select('name, description, level')
          .eq('class_id', char.class_id).lte('level', char.level ?? 1).order('level')
        setClassFeatures((cfRes.data ?? []) as ClassFeatureRow[])
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  function modifier(score: number) {
    const m = Math.floor((score - 10) / 2)
    return m >= 0 ? `+${m}` : `${m}`
  }

  async function toggleEffect(effectName: string, currentlyActive: boolean) {
    const nextActive = !currentlyActive
    // optimistic UI update, then persist
    setActiveEffects((prev) => {
      const existing = prev.find((e) => e.effect_name === effectName)
      if (existing) return prev.map((e) => e.effect_name === effectName ? { ...e, is_active: nextActive } : e)
      return [...prev, { effect_name: effectName, is_active: nextActive }]
    })
    await supabase.from('character_active_effects').upsert(
      { character_id: params.id, effect_name: effectName, is_active: nextActive },
      { onConflict: 'character_id,effect_name' }
    )
  }

  async function moveItem(rowId: string, newParentId: string | null) {
    setInventory((prev) => prev.map((r) => r.id === rowId ? { ...r, parent_inventory_id: newParentId } : r))
    await supabase.from('character_inventory').update({ parent_inventory_id: newParentId }).eq('id', rowId)
  }

  function toggleContainer(rowId: string) {
    setExpandedContainers((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId); else next.add(rowId)
      return next
    })
  }

  if (loading) return <main className="p-10 text-parchment/60">Loading the dossier…</main>
  if (!character) return <main className="p-10 text-blood-bright">No record of this soul.</main>

  const availableEffects = character.class ? (CLASS_EFFECTS[character.class.name] ?? []) : []
  // Carry capacity = Strength score in units (a house-rule design decision, not a PHB-verified
  // formula — see the weight_units convention documented in schema.sql). Only top-level items
  // count toward personal capacity; a container's own weight counts, but what's inside it up to
  // its container_capacity doesn't add further burden.
  const carryCapacity = character.strength
  const topLevelInventory = inventory.filter((r) => !r.parent_inventory_id)
  const containedInventory = (parentId: string) => inventory.filter((r) => r.parent_inventory_id === parentId)
  const totalUnitsCarried = topLevelInventory.reduce((sum, r) => sum + (r.items?.weight_units ?? 1) * r.quantity, 0)
  const availableContainers = topLevelInventory.filter((r) => r.items?.is_container)
  const cantrips = charSpells.filter((s) => s.spells.level === 0)
  const knownSpells = charSpells.filter((s) => s.spells.level > 0)
  const classFeat = charFeats.find((f) => f.source === 'class_feature_l1')
  const variantFeat = charFeats.find((f) => f.source === 'variant_human')
  const allTraits = [
    ...(character.species?.traits ?? []),
    ...(character.species_subrace?.traits ?? []),
  ]
  const subclassL1Features = character.subclass?.features?.filter((f) => f.level === 1) ?? []

  return (
    <main className="min-h-screen px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-6 border-b border-mist pb-4">
        <div>
          <h1 className="font-display text-3xl text-candle">{character.name}</h1>
          <p className="text-sm text-parchment/60">
            Level {character.level} {character.species?.name}{character.species_subrace ? ` (${character.species_subrace.name})` : ''} {character.class?.name}{character.subclass ? ` (${character.subclass.name})` : ''} · {character.background?.name}
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
              label={<Tooltip label="Exhaustion" title="Exhaustion" body="2014 rules: a TIERED effects table, not a flat penalty. 1 disadvantage on ability checks, 2 speed halved, 3 disadvantage on attacks/saves, 4 HP max halved, 5 speed 0, 6 death." />}
              value={`${character.exhaustion_level} / 6`}
            />
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Ability Scores</h2>
            {ABILITIES.map((ab) => {
              const bonus = character.species_asi?.[ab]
              return (
                <div key={ab} className="flex justify-between text-sm capitalize mb-1">
                  <span>{ab.slice(0, 3).toUpperCase()}{bonus ? <span className="text-candle text-xs"> (+{bonus} species)</span> : ''}</span>
                  <span>{character[ab]} ({modifier(character[ab])})</span>
                </div>
              )
            })}
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Saving Throws</h2>
            {ABILITIES.map((ab) => {
              const label = ab.charAt(0).toUpperCase() + ab.slice(1)
              const classProficient = character.class?.saving_throw_proficiencies?.includes(label) ?? false
              const resilientProficient = character.resilient_ability === ab
              const proficient = classProficient || resilientProficient
              // Proficiency bonus is +2 at level 1 — hardcoded here since leveling isn't built
              // yet; this will need to become level-derived once it is.
              const bonus = modifier(character[ab] as number).replace('+', '')
              const total = Number(bonus) + (proficient ? 2 : 0)
              return (
                <div key={ab} className="flex justify-between text-sm mb-1">
                  <span>{label}{resilientProficient && !classProficient ? <span className="text-candle text-xs"> (Resilient)</span> : ''}</span>
                  <span className={proficient ? 'text-candle' : ''}>{total >= 0 ? `+${total}` : total}</span>
                </div>
              )
            })}
          </div>

          {(allTraits.length > 0 || character.draconic_ancestry || character.favored_enemy || character.favored_terrain) && (
            <div className="panel rounded-sm p-4">
              <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Species Traits</h2>
              {character.draconic_ancestry && (
                <div className="text-sm mb-1.5"><span className="text-candle">Draconic Ancestry:</span> {character.draconic_ancestry}</div>
              )}
              {character.favored_enemy && (
                <div className="text-sm mb-1.5"><span className="text-candle">Favored Enemy:</span> {character.favored_enemy}</div>
              )}
              {character.favored_terrain && (
                <div className="text-sm mb-1.5"><span className="text-candle">Favored Terrain:</span> {character.favored_terrain}</div>
              )}
              {allTraits.map((t) => (
                <Tooltip key={t.name} label={<span className="block text-sm mb-1.5">{t.name}</span>} title={t.name} body={t.description} />
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
            {skills.length ? skills.map((s) => <Row key={s.skill_name} label={s.skill_name} value="proficient" dim />) : <p className="text-xs text-parchment/40 italic">None recorded.</p>}
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Background Feature</h2>
            {character.background?.feature_name ? (
              <Tooltip label={<span className="block text-sm">{character.background.feature_name}</span>} title={character.background.feature_name} body={character.background.feature_description ?? ''} />
            ) : <p className="text-xs text-parchment/40 italic">None recorded.</p>}
            {character.chosen_tool_proficiency && (
              <p className="text-xs text-parchment/60 mt-2"><span className="text-candle">Tool Proficiency:</span> {character.chosen_tool_proficiency}</p>
            )}
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Class Features</h2>
            {classFeatures.map((f, i) => (
              <Tooltip key={i} label={<span className="block text-sm mb-1.5">{f.name}</span>} title={f.name} body={f.description} />
            ))}
            {classFeat && <Tooltip label={<span className="block text-sm mb-1.5">{classFeat.feats.name} <span className="text-parchment/40 text-xs">(Fighting Style)</span></span>} title={classFeat.feats.name} body={classFeat.feats.description} />}
            {subclassL1Features.map((f) => (
              <Tooltip key={f.name} label={<span className="block text-sm mb-1.5">{f.name}</span>} title={f.name} body={f.description} />
            ))}
            {variantFeat && <Tooltip label={<span className="block text-sm mb-1.5">{variantFeat.feats.name} <span className="text-parchment/40 text-xs">(Variant Human)</span></span>} title={variantFeat.feats.name} body={variantFeat.feats.description} />}
            {classFeatures.length === 0 && !classFeat && subclassL1Features.length === 0 && !variantFeat && <p className="text-xs text-parchment/40 italic">None recorded.</p>}
          </div>

          {resources.length > 0 && (
            <div className="panel rounded-sm p-4">
              <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Resources</h2>
              {resources.map((r) => (
                <div key={r.name} className="flex justify-between text-sm mb-1">
                  <span>{r.name}</span>
                  <span>{r.current_value} / {r.max_value} <span className="text-parchment/40 text-xs">({r.recharge === 'short_rest' ? 'short rest' : 'long rest'})</span></span>
                </div>
              ))}
            </div>
          )}

          {availableEffects.length > 0 && (
            <div className="panel rounded-sm p-4">
              <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Active Effects</h2>
              {availableEffects.map((eff) => {
                const isActive = activeEffects.find((e) => e.effect_name === eff.name)?.is_active ?? false
                return (
                  <div key={eff.name} className="mb-2.5 last:mb-0">
                    <button
                      onClick={() => toggleEffect(eff.name, isActive)}
                      className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-sm border text-sm transition-colors ${
                        isActive ? 'border-candle bg-blood/25 text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'
                      }`}
                    >
                      <span>{eff.name}</span>
                      <span className="text-xs">{isActive ? 'ON' : 'OFF'}</span>
                    </button>
                    {isActive && <p className="text-xs text-parchment/70 mt-1.5 leading-snug">{eff.description}</p>}
                  </div>
                )
              })}
            </div>
          )}

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Conditions</h2>
            <p className="text-xs text-parchment/40 italic">None currently applied.</p>
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Currency</h2>
            {currency ? <p className="text-sm">{currency.gp} gp{currency.sp ? `, ${currency.sp} sp` : ''}{currency.cp ? `, ${currency.cp} cp` : ''}</p> : <p className="text-xs text-parchment/40 italic">None recorded.</p>}
          </div>
        </section>

        <section className="col-span-5 space-y-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Spells</h2>
            {spellSlots.length > 0 && (
              <div className="mb-3 pb-3 border-b border-mist/50">
                {spellSlots.map((sl) => (
                  <div key={sl.slot_level} className="flex justify-between text-sm">
                    <span>{character.class?.spellcasting_type === 'pact' ? 'Pact Magic Slot' : `Level ${sl.slot_level} Slots`}</span>
                    <span>{sl.max_slots - sl.used_slots} / {sl.max_slots}</span>
                  </div>
                ))}
              </div>
            )}
            {cantrips.length === 0 && knownSpells.length === 0 ? (
              <p className="text-xs text-parchment/40 italic">{character.class?.spellcasting_type ? 'No spells selected (or your class doesn\u2019t cast until a later level).' : 'Non-caster — no spell panel needed.'}</p>
            ) : (
              <>
                {cantrips.map((s) => (
                  <Tooltip key={s.spells.name} label={<span className="block text-sm mb-1.5">{s.spells.name} <span className="text-parchment/40 text-xs">(cantrip)</span></span>} title={s.spells.name} subtitle={`Cantrip · ${s.spells.school}`} body={s.spells.description} />
                ))}
                {knownSpells.map((s) => (
                  <Tooltip key={s.spells.name} label={<span className="block text-sm mb-1.5">{s.spells.name}{s.is_prepared ? '' : s.is_always_known ? <span className="text-parchment/40 text-xs"> (always prepared)</span> : ''}</span>} title={s.spells.name} subtitle={`Level ${s.spells.level} · ${s.spells.school}`} body={s.spells.description} />
                ))}
              </>
            )}
          </div>

          <div className="panel rounded-sm p-4">
            <div className="flex justify-between items-baseline mb-3">
              <h2 className="font-display text-sm text-candle uppercase tracking-wide">Inventory</h2>
              <span className={`text-xs ${totalUnitsCarried > carryCapacity ? 'text-blood-bright' : 'text-parchment/50'}`}>
                {totalUnitsCarried} / {carryCapacity} units{totalUnitsCarried > carryCapacity ? ' — encumbered' : ''}
              </span>
            </div>
            {topLevelInventory.length ? topLevelInventory.map((row) => {
              const name = row.items?.name ?? row.item_name ?? 'Unknown item'
              const isContainer = row.items?.is_container
              const isExpanded = expandedContainers.has(row.id)
              const children = isContainer ? containedInventory(row.id) : []
              return (
                <div key={row.id} className="mb-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      {isContainer && (
                        <button onClick={() => toggleContainer(row.id)} className="text-parchment/50 hover:text-candle text-xs w-4">
                          {isExpanded ? '▾' : '▸'}
                        </button>
                      )}
                      {row.items ? (
                        <Tooltip label={<span>{row.quantity}× {name}</span>} title={name} body={row.items.description} />
                      ) : (
                        <span>{row.quantity}× {name}</span>
                      )}
                    </div>
                    {!isContainer && availableContainers.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) moveItem(row.id, e.target.value) }}
                        className="bg-ink border border-mist rounded-sm text-xs text-parchment/60 px-1 py-0.5"
                      >
                        <option value="" disabled>{'Put in\u2026'}</option>
                        {availableContainers.map((c) => (
                          <option key={c.id} value={c.id}>{c.items?.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {isContainer && isExpanded && (
                    <div className="ml-6 mt-1.5 pl-2 border-l border-mist/40 space-y-1">
                      {children.length === 0 && <p className="text-xs text-parchment/40 italic">Empty.</p>}
                      {children.map((child) => {
                        const childName = child.items?.name ?? child.item_name ?? 'Unknown item'
                        return (
                          <div key={child.id} className="flex items-center justify-between text-sm">
                            {child.items ? (
                              <Tooltip label={<span>{child.quantity}× {childName}</span>} title={childName} body={child.items.description} />
                            ) : (
                              <span>{child.quantity}× {childName}</span>
                            )}
                            <button onClick={() => moveItem(child.id, null)} className="text-xs text-candle hover:text-parchment">Take out</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }) : <p className="text-xs text-parchment/40 italic">No equipment recorded.</p>}
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
