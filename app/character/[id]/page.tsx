'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Tooltip from '@/components/Tooltip'
import Modal from '@/components/Modal'
import { ALL_SKILLS, SKILL_ABILITY, SKILL_DESCRIPTIONS } from '@/lib/types'

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
  death_save_successes: number
  death_save_failures: number
  hit_dice_total: number
  hit_dice_remaining: number
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
  personality_traits: string | null
  ideals: string | null
  bonds: string | null
  flaws: string | null
  backstory: string | null
  appearance: string | null
  species: { name: string; traits: { name: string; description: string }[] } | null
  species_subrace: { name: string; traits: { name: string; description: string }[] } | null
  background: { name: string; feature_name: string | null; feature_description: string | null } | null
  class: { name: string; hit_die: number; spellcasting_type: string | null; spellcasting_ability: string | null; saving_throw_proficiencies: string[] } | null
  subclass: { name: string; features: { name: string; description: string; level: number }[] } | null
}

type SkillRow = { skill_name: string; expertise: boolean }
type LanguageRow = { language: string }
type FeatRow = { source: string; feats: { name: string; description: string; category: string } }
type SpellRow = { is_prepared: boolean; is_always_known: boolean; spells: { name: string; level: number; school: string; description: string } }
type InventoryRow = {
  id: string
  quantity: number
  item_name: string | null
  parent_inventory_id: string | null
  equipped: boolean
  items: { name: string; description: string; weight_units: number; is_container: boolean; container_capacity: number | null; category: string; properties: Record<string, any>; weapon_range: string | null } | null
}
type CurrencyRow = { gp: number; sp: number; cp: number; pp: number; ep: number }
type ClassFeatureRow = { name: string; description: string; level: number }
type SpellSlotRow = { slot_level: number; max_slots: number; used_slots: number }
type ResourceRow = { name: string; max_value: number; current_value: number; recharge: string }
type ActiveEffectRow = { effect_name: string; is_active: boolean }
type ConditionRow = { id: string; name: string; description: string }
type CharConditionRow = { condition_id: string; conditions: { name: string; description: string } }

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
// Hardcoded at +2 (level 1) since leveling isn't built yet — every proficiency-bonus
// calculation on the sheet references this one constant so it only needs updating in one
// place once leveling exists.
const PROF_BONUS = 2

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
  const [conditionsList, setConditionsList] = useState<ConditionRow[]>([])
  const [charConditions, setCharConditions] = useState<CharConditionRow[]>([])
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [roleplayModalOpen, setRoleplayModalOpen] = useState(false)
  const [roleplayDraft, setRoleplayDraft] = useState({
    personality_traits: '', ideals: '', bonds: '', flaws: '', backstory: '', appearance: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [charRes, skillsRes, langRes, featsRes, spellsRes, invRes, currRes, slotsRes, resourcesRes, effectsRes, conditionsRes, charConditionsRes] = await Promise.all([
        supabase.from('characters')
          .select('*, species:species_id(name, traits), species_subrace:species_subrace_id(name, traits), background:background_id(name, feature_name, feature_description), class:class_id(name, hit_die, spellcasting_type, spellcasting_ability, saving_throw_proficiencies), subclass:subclass_id(name, features)')
          .eq('id', params.id).single(),
        supabase.from('character_skills').select('skill_name, expertise').eq('character_id', params.id),
        supabase.from('character_languages').select('language').eq('character_id', params.id),
        supabase.from('character_feats').select('source, feats:feat_id(name, description, category)').eq('character_id', params.id),
        supabase.from('character_spells').select('is_prepared, is_always_known, spells:spell_id(name, level, school, description)').eq('character_id', params.id),
        supabase.from('character_inventory').select('id, quantity, item_name, parent_inventory_id, equipped, items:item_id(name, description, weight_units, is_container, container_capacity, category, properties, weapon_range)').eq('character_id', params.id),
        supabase.from('character_currency').select('gp, sp, cp, pp, ep').eq('character_id', params.id).single(),
        supabase.from('character_spell_slots').select('slot_level, max_slots, used_slots').eq('character_id', params.id),
        supabase.from('character_resources').select('name, max_value, current_value, recharge').eq('character_id', params.id),
        supabase.from('character_active_effects').select('effect_name, is_active').eq('character_id', params.id),
        supabase.from('conditions').select('id, name, description').order('name'),
        supabase.from('character_conditions').select('condition_id, conditions:condition_id(name, description)').eq('character_id', params.id),
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
      setConditionsList((conditionsRes.data ?? []) as ConditionRow[])
      setCharConditions((charConditionsRes.data ?? []) as unknown as CharConditionRow[])

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
    if (newParentId) {
      const container = inventory.find((r) => r.id === newParentId)
      const moving = inventory.find((r) => r.id === rowId)
      const capacity = container?.items?.container_capacity
      if (capacity != null && moving) {
        const currentlyUsed = inventory
          .filter((r) => r.parent_inventory_id === newParentId && r.id !== rowId)
          .reduce((sum, r) => sum + (r.items?.weight_units ?? 1) * r.quantity, 0)
        const movingWeight = (moving.items?.weight_units ?? 1) * moving.quantity
        if (currentlyUsed + movingWeight > capacity) {
          alert(`${container?.items?.name ?? 'That container'} doesn't have room (${currentlyUsed}/${capacity} units used).`)
          return
        }
      }
    }
    setInventory((prev) => prev.map((r) => r.id === rowId ? { ...r, parent_inventory_id: newParentId } : r))
    await supabase.from('character_inventory').update({ parent_inventory_id: newParentId }).eq('id', rowId)
  }

  // Equipping is restricted to armor and weapons only — this is the actual stop on "equip
  // everything to dodge carry weight," since gear/tools/containers never get an Equip button
  // in the first place (enforced below in the render too). Equipping a new body armor or
  // shield swaps out whichever one you already had on, since you're still just one person;
  // weapons are capped at 2 equipped at once (two hands), blocked rather than auto-swapped
  // since there's no obvious "which one" to replace.
  async function toggleEquipped(rowId: string, currentlyEquipped: boolean) {
    const row = inventory.find((r) => r.id === rowId)
    const category = row?.items?.category
    const willEquip = !currentlyEquipped
    if (willEquip && category !== 'weapon' && category !== 'armor') return

    const updates: { id: string; equipped: boolean }[] = [{ id: rowId, equipped: willEquip }]

    if (willEquip && category === 'armor') {
      const isShield = row?.items?.properties?.ac_bonus != null
      const conflicting = inventory.find((r) =>
        r.id !== rowId && r.equipped && r.items?.category === 'armor' &&
        (isShield ? r.items?.properties?.ac_bonus != null : r.items?.properties?.ac_base != null)
      )
      if (conflicting) updates.push({ id: conflicting.id, equipped: false })
    }

    if (willEquip && category === 'weapon') {
      const equippedWeapons = inventory.filter((r) => r.equipped && r.items?.category === 'weapon' && r.id !== rowId)
      if (equippedWeapons.length >= 2) {
        alert('Only 2 weapons can be equipped at once — unequip one first.')
        return
      }
    }

    setInventory((prev) => prev.map((r) => {
      const u = updates.find((x) => x.id === r.id)
      return u ? { ...r, equipped: u.equipped } : r
    }))
    await Promise.all(updates.map((u) => supabase.from('character_inventory').update({ equipped: u.equipped }).eq('id', u.id)))
  }

  // Spell slot tracking: cast (use a slot) / recover (get one back, e.g. from a feature or
  // short rest for Warlocks) buttons drive used_slots directly, matching the same slot_level
  // a known/prepared spell of that level would consume.
  async function adjustSlot(slotLevel: number, delta: number) {
    const slot = spellSlots.find((s) => s.slot_level === slotLevel)
    if (!slot) return
    const nextUsed = Math.max(0, Math.min(slot.max_slots, slot.used_slots + delta))
    setSpellSlots((prev) => prev.map((s) => s.slot_level === slotLevel ? { ...s, used_slots: nextUsed } : s))
    await supabase.from('character_spell_slots').update({ used_slots: nextUsed }).eq('character_id', params.id).eq('slot_level', slotLevel)
  }

  // Same use/recover logic for class resources (Rage, Bardic Inspiration, Second Wind, Lay on
  // Hands, etc.) — these previously only displayed a static current/max with no way to track
  // usage during a session at all.
  async function adjustResource(name: string, delta: number) {
    const res = resources.find((r) => r.name === name)
    if (!res) return
    const nextValue = Math.max(0, Math.min(res.max_value, res.current_value + delta))
    setResources((prev) => prev.map((r) => r.name === name ? { ...r, current_value: nextValue } : r))
    await supabase.from('character_resources').update({ current_value: nextValue }).eq('character_id', params.id).eq('name', name)
  }

  async function longRest() {
    const hdRecover = Math.max(1, Math.floor((character?.hit_dice_total ?? 1) / 2))
    const nextHd = Math.min(character?.hit_dice_total ?? 1, (character?.hit_dice_remaining ?? 0) + hdRecover)
    setSpellSlots((prev) => prev.map((s) => ({ ...s, used_slots: 0 })))
    setResources((prev) => prev.map((r) => ({ ...r, current_value: r.max_value })))
    setCharacter((prev) => prev ? { ...prev, hit_dice_remaining: nextHd } : prev)
    await Promise.all([
      supabase.from('character_spell_slots').update({ used_slots: 0 }).eq('character_id', params.id),
      ...resources.map((r) => supabase.from('character_resources').update({ current_value: r.max_value }).eq('character_id', params.id).eq('name', r.name)),
      supabase.from('characters').update({ hit_dice_remaining: nextHd }).eq('id', params.id),
    ])
  }

  async function shortRest() {
    const shortRestResources = resources.filter((r) => r.recharge === 'short_rest')
    setResources((prev) => prev.map((r) => r.recharge === 'short_rest' ? { ...r, current_value: r.max_value } : r))
    await Promise.all(
      shortRestResources.map((r) => supabase.from('character_resources').update({ current_value: r.max_value }).eq('character_id', params.id).eq('name', r.name))
    )
  }

  async function spendHitDie() {
    const next = Math.max(0, (character?.hit_dice_remaining ?? 0) - 1)
    setCharacter((prev) => prev ? { ...prev, hit_dice_remaining: next } : prev)
    await supabase.from('characters').update({ hit_dice_remaining: next }).eq('id', params.id)
  }

  // Clicking a death-save bubble fills it and every bubble before it; clicking an already-
  // filled bubble reduces the count back down to that point. Same interaction pattern people
  // already know from other trackers (spell slots, resources).
  async function setDeathSave(kind: 'success' | 'failure', index: number) {
    const field = kind === 'success' ? 'death_save_successes' : 'death_save_failures'
    const current = character?.[field] ?? 0
    const next = current > index ? index : index + 1
    setCharacter((prev) => prev ? { ...prev, [field]: next } : prev)
    await supabase.from('characters').update({ [field]: next }).eq('id', params.id)
  }

  async function resetDeathSaves() {
    setCharacter((prev) => prev ? { ...prev, death_save_successes: 0, death_save_failures: 0 } : prev)
    await supabase.from('characters').update({ death_save_successes: 0, death_save_failures: 0 }).eq('id', params.id)
  }

  async function toggleCondition(conditionId: string, name: string, description: string) {
    const isActive = charConditions.some((c) => c.condition_id === conditionId)
    if (isActive) {
      setCharConditions((prev) => prev.filter((c) => c.condition_id !== conditionId))
      await supabase.from('character_conditions').delete().eq('character_id', params.id).eq('condition_id', conditionId)
    } else {
      setCharConditions((prev) => [...prev, { condition_id: conditionId, conditions: { name, description } }])
      await supabase.from('character_conditions').insert({ character_id: params.id, condition_id: conditionId })
    }
  }

  function openRoleplay() {
    setRoleplayDraft({
      personality_traits: character?.personality_traits ?? '',
      ideals: character?.ideals ?? '',
      bonds: character?.bonds ?? '',
      flaws: character?.flaws ?? '',
      backstory: character?.backstory ?? '',
      appearance: character?.appearance ?? '',
    })
    setRoleplayModalOpen(true)
  }

  async function saveRoleplay() {
    setCharacter((prev) => prev ? { ...prev, ...roleplayDraft } : prev)
    await supabase.from('characters').update(roleplayDraft).eq('id', params.id)
    setRoleplayModalOpen(false)
  }

  async function updateCurrency(field: keyof CurrencyRow, value: number) {
    const clamped = Math.max(0, Math.floor(value) || 0)
    setCurrency((prev) => prev ? { ...prev, [field]: clamped } : prev)
    await supabase.from('character_currency').update({ [field]: clamped }).eq('character_id', params.id)
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
  // Carry capacity is a house-rule design decision, not a PHB-verified formula (see the
  // weight_units convention documented in schema.sql). Base is 2x Strength score; owning a
  // Backpack doubles that again, but only ever once — a second Backpack doesn't stack, since
  // you're still just one person wearing one pack. Only top-level, non-equipped items count
  // toward personal capacity: equipping something (armor, a weapon) represents wearing/wielding
  // it rather than carrying it, so it stops counting against the limit. A container's own
  // weight still counts against personal capacity, but what's inside it is checked separately
  // against that container's own container_capacity, which is now actually enforced — it used
  // to accept unlimited items regardless of the stated capacity.
  const hasBackpack = inventory.some((r) => (r.items?.name ?? '').toLowerCase() === 'backpack')
  const baseCarryCapacity = character.strength * 2
  const carryCapacity = hasBackpack ? baseCarryCapacity * 2 : baseCarryCapacity
  const topLevelInventory = inventory.filter((r) => !r.parent_inventory_id)
  const containedInventory = (parentId: string) => inventory.filter((r) => r.parent_inventory_id === parentId)
  const totalUnitsCarried = topLevelInventory.filter((r) => !r.equipped).reduce((sum, r) => sum + (r.items?.weight_units ?? 1) * r.quantity, 0)
  const containerUnitsUsed = (containerId: string) => containedInventory(containerId).reduce((sum, r) => sum + (r.items?.weight_units ?? 1) * r.quantity, 0)
  const availableContainers = topLevelInventory.filter((r) => r.items?.is_container)
  const equippedWeapons = inventory.filter((r) => r.equipped && r.items?.category === 'weapon')
  const cantrips = charSpells.filter((s) => s.spells.level === 0)
  const knownSpells = charSpells.filter((s) => s.spells.level > 0)
  const classFeat = charFeats.find((f) => f.source === 'class_feature_l1')
  const variantFeat = charFeats.find((f) => f.source === 'variant_human')
  const allTraits = [
    ...(character.species?.traits ?? []),
    ...(character.species_subrace?.traits ?? []),
  ]
  const subclassL1Features = character.subclass?.features?.filter((f) => f.level === 1) ?? []

  // Bonus for any skill = ability modifier + proficiency bonus (doubled with Expertise).
  // Used by the ability-grouped skill list and the passive-score calculations below.
  function skillBonus(skillName: string): number {
    const ability = SKILL_ABILITY[skillName]
    const abMod = Math.floor((character![ability] - 10) / 2)
    const skillRow = skills.find((s) => s.skill_name === skillName)
    if (!skillRow) return abMod
    return abMod + (skillRow.expertise ? PROF_BONUS * 2 : PROF_BONUS)
  }

  // Attack bonus and damage for an equipped weapon: finesse weapons use whichever of
  // Strength/Dexterity is better, ranged weapons use Dexterity, everything else uses Strength.
  function weaponAttackBonus(row: InventoryRow): number {
    const props = row.items?.properties ?? {}
    const strMod = Math.floor((character!.strength - 10) / 2)
    const dexMod = Math.floor((character!.dexterity - 10) / 2)
    const finesse = props.finesse === true
    const isRanged = row.items?.weapon_range === 'ranged'
    const abilityMod = finesse ? Math.max(strMod, dexMod) : (isRanged ? dexMod : strMod)
    return PROF_BONUS + abilityMod
  }
  function weaponDamage(row: InventoryRow): { dice: string; type: string; bonus: number } {
    const props = row.items?.properties ?? {}
    const raw = props.damage as string | undefined
    if (!raw) return { dice: '—', type: '', bonus: 0 }
    const [dice, ...typeParts] = raw.split(' ')
    const strMod = Math.floor((character!.strength - 10) / 2)
    const dexMod = Math.floor((character!.dexterity - 10) / 2)
    const finesse = props.finesse === true
    const isRanged = row.items?.weapon_range === 'ranged'
    const bonus = finesse ? Math.max(strMod, dexMod) : (isRanged ? dexMod : strMod)
    return { dice, type: typeParts.join(' '), bonus }
  }

  // AC used to be a single number baked in at character creation and never touched again —
  // equipping/unequipping armor on the sheet had no effect on it at all. Now it's recomputed
  // live from whatever's actually equipped right now, mirroring the same rules the creation
  // wizard used (unarmored class formulas, dex caps per armor type, shield bonus).
  function computeCurrentAC(): number {
    const dexMod = Math.floor((character!.dexterity - 10) / 2)
    const equippedArmor = inventory.find((r) => r.equipped && r.items?.category === 'armor' && r.items?.properties?.ac_base != null)
    const equippedShield = inventory.find((r) => r.equipped && r.items?.category === 'armor' && r.items?.properties?.ac_bonus != null)
    const shieldBonus = equippedShield ? (equippedShield.items?.properties?.ac_bonus ?? 0) : 0

    if (!equippedArmor) {
      if (character!.class?.name === 'Barbarian') return 10 + dexMod + Math.floor((character!.constitution - 10) / 2) + shieldBonus
      if (character!.class?.name === 'Monk') return 10 + dexMod + Math.floor((character!.wisdom - 10) / 2) + shieldBonus
      if (character!.subclass?.name === 'Draconic Bloodline') return 13 + dexMod + shieldBonus
      return 10 + dexMod + shieldBonus
    }
    const base = equippedArmor.items?.properties?.ac_base ?? 10
    const dexCap = equippedArmor.items?.properties?.dex_bonus_max
    const dexApplied = dexCap === null || dexCap === undefined ? dexMod : Math.min(dexMod, dexCap)
    return base + dexApplied + shieldBonus
  }
  const currentAC = computeCurrentAC()

  // Spell Save DC — proficiency bonus is +2 at level 1 (see the Saving Throws panel note on
  // why this is hardcoded for now). Only shown for actual casters.
  const spellcastingAbility = character.class?.spellcasting_ability?.toLowerCase() as (typeof ABILITIES)[number] | undefined
  const spellSaveDC = spellcastingAbility ? 8 + 2 + Math.floor((character[spellcastingAbility] - 10) / 2) : null

  return (
    <>
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
        <div className="flex gap-2">
          <button onClick={() => setStatusModalOpen(true)} className="text-xs border border-mist rounded-sm px-3 py-1.5 text-parchment/70 hover:border-candle/50 hover:text-candle transition-colors">Status Effects</button>
          <button onClick={openRoleplay} className="text-xs border border-mist rounded-sm px-3 py-1.5 text-parchment/70 hover:border-candle/50 hover:text-candle transition-colors">Backstory</button>
          {(spellSlots.length > 0 || resources.length > 0) && (
            <>
              <button onClick={shortRest} className="text-xs border border-mist rounded-sm px-3 py-1.5 text-parchment/70 hover:border-candle/50 hover:text-candle transition-colors">Short Rest</button>
              <button onClick={longRest} className="text-xs border border-mist rounded-sm px-3 py-1.5 text-parchment/70 hover:border-candle/50 hover:text-candle transition-colors">Long Rest</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-4 space-y-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Abilities</h2>
            {ABILITIES.map((ab) => {
              const speciesBonus = character.species_asi?.[ab]
              const label = ab.charAt(0).toUpperCase() + ab.slice(1)
              const classProficient = character.class?.saving_throw_proficiencies?.includes(label) ?? false
              const resilientProficient = character.resilient_ability === ab
              const saveProficient = classProficient || resilientProficient
              const abMod = Math.floor((character[ab] - 10) / 2)
              const saveBonus = abMod + (saveProficient ? PROF_BONUS : 0)
              const relatedSkills = ALL_SKILLS.filter((s) => SKILL_ABILITY[s] === ab)
              return (
                <div key={ab} className="mb-3.5 pb-3.5 border-b border-mist/40 last:border-0 last:pb-0 last:mb-0">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="font-display text-sm capitalize text-parchment">
                      {label}{speciesBonus ? <span className="text-candle text-xs"> (+{speciesBonus})</span> : ''}
                    </span>
                    <span className="text-sm">{character[ab]} ({modifier(character[ab])})</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <Tooltip
                      label={<span className={saveProficient ? 'text-candle' : 'text-parchment/60'}>Save{resilientProficient && !classProficient ? ' (Resilient)' : ''}</span>}
                      title={`${label} Saving Throw`}
                      body="Rolled to resist an effect trying to happen to you — like being knocked prone, thrown from a cliff, or gripped by a spell. Different abilities cover different kinds of resistance."
                    />
                    <span className={saveProficient ? 'text-candle' : 'text-parchment/60'}>{saveBonus >= 0 ? `+${saveBonus}` : saveBonus}</span>
                  </div>
                  {relatedSkills.map((skillName) => {
                    const skillRow = skills.find((s) => s.skill_name === skillName)
                    const proficient = !!skillRow
                    const bonus = skillBonus(skillName)
                    return (
                      <div key={skillName} className="flex justify-between text-xs pl-3 mb-0.5 py-0.5 rounded-sm hover:bg-mist/10 transition-colors -mx-1 px-1">
                        <Tooltip
                          label={<span className={proficient ? 'text-candle' : 'text-parchment/50'}>{skillName}{skillRow?.expertise ? ' *' : ''}</span>}
                          title={skillName}
                          body={`${SKILL_DESCRIPTIONS[skillName]}${skillRow?.expertise ? ' (Expertise: proficiency bonus is doubled for this skill.)' : ''}`}
                        />
                        <span className={proficient ? 'text-candle' : 'text-parchment/50'}>{bonus >= 0 ? `+${bonus}` : bonus}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </section>

        <section className="col-span-3 space-y-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Vitals</h2>
            <Row label="HP" value={`${character.current_hp} / ${character.max_hp}${character.temp_hp > 0 ? ` (+${character.temp_hp})` : ''}`} />
            <Row
              label={<Tooltip label="Armor Class" title="Armor Class (AC)" body="How hard you are to hit. An attacker's d20 roll plus their attack bonus must meet or beat this number to hit you." />}
              value={String(currentAC)}
            />
            {spellSaveDC != null && (
              <Row
                label={<Tooltip label="Spell Save DC" title="Spell Save DC" body="The target number a creature must meet or beat on its saving throw to resist or reduce the effect of your spell. Doesn't apply to spells that use an attack roll instead." />}
                value={String(spellSaveDC)}
              />
            )}
            <Row
              label={<Tooltip label="Initiative" title="Initiative" body="Added to a d20 roll at the start of combat. Highest total goes first, and that turn order holds for the rest of the fight." />}
              value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : String(character.initiative_bonus)}
            />
            <Row
              label={<Tooltip label="Speed" title="Speed" body="How far you can move, in feet, on your turn. Difficult terrain, being Prone, or certain conditions can reduce how far that movement actually gets you." />}
              value={`${character.speed} ft`}
            />
            <Row
              label={<Tooltip label="Proficiency Bonus" title="Proficiency Bonus" body="Added to attack rolls, ability checks, and saving throws you're proficient in. It grows as you level up (still +2 at level 1 — this whole app is level-1-only for now)." />}
              value={`+${PROF_BONUS}`}
            />
            <Row
              label={<Tooltip label="Exhaustion" title="Exhaustion" body="2014 rules: a TIERED effects table, not a flat penalty. 1 disadvantage on ability checks, 2 speed halved, 3 disadvantage on attacks/saves, 4 HP max halved, 5 speed 0, 6 death." />}
              value={`${character.exhaustion_level} / 6`}
            />
            <div className="mt-3 pt-3 border-t border-mist/40">
              <Tooltip
                label={<p className="text-[10px] text-parchment/40 uppercase tracking-wide text-center mb-1.5">Passive Scores (no roll needed)</p>}
                title="Passive Scores"
                body="10 + the skill's usual bonus, used instead of rolling when you're not actively trying — like whether you'd simply notice an ambush, or how likely a hidden creature is to notice you back."
              />
              <div className="grid grid-cols-4 gap-1 text-center">
                <div>
                  <div className="text-[10px] text-parchment/40 uppercase tracking-wide">Perc.</div>
                  <div className="text-candle text-sm">{10 + skillBonus('Perception')}</div>
                </div>
                <div>
                  <div className="text-[10px] text-parchment/40 uppercase tracking-wide">Inv.</div>
                  <div className="text-candle text-sm">{10 + skillBonus('Investigation')}</div>
                </div>
                <div>
                  <div className="text-[10px] text-parchment/40 uppercase tracking-wide">Ins.</div>
                  <div className="text-candle text-sm">{10 + skillBonus('Insight')}</div>
                </div>
                <div>
                  <div className="text-[10px] text-parchment/40 uppercase tracking-wide">Stea.</div>
                  <div className="text-candle text-sm">{10 + skillBonus('Stealth')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Death Saves &amp; Hit Dice</h2>
            <div className="flex justify-between items-center mb-2">
              <Tooltip
                label={<span className="text-sm">Successes</span>}
                title="Death Saving Throws"
                body="At 0 HP, roll a d20 at the start of each of your turns: 10 or higher is a success, lower is a failure. 3 successes stabilizes you at 0 HP; 3 failures means you die. A natural 20 instead returns you to 1 HP, and any damage taken while at 0 HP counts as an automatic failure (two if it's a critical hit)."
              />
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <button key={i} onClick={() => setDeathSave('success', i)}
                    className={`w-4 h-4 rounded-full border transition-colors ${character.death_save_successes > i ? 'bg-candle border-candle' : 'border-mist hover:border-candle/50'}`} />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Failures</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <button key={i} onClick={() => setDeathSave('failure', i)}
                    className={`w-4 h-4 rounded-full border transition-colors ${character.death_save_failures > i ? 'bg-blood-bright border-blood-bright' : 'border-mist hover:border-candle/50'}`} />
                ))}
              </div>
            </div>
            {(character.death_save_successes > 0 || character.death_save_failures > 0) && (
              <button onClick={resetDeathSaves} className="text-xs text-candle hover:text-parchment mb-2">Reset</button>
            )}
            <div className="flex justify-between items-center text-sm pt-2 border-t border-mist/40">
              <Tooltip
                label={<span>Hit Dice</span>}
                title="Hit Dice"
                body="Spend one during a short rest to regain HP (roll the die and add your Constitution modifier, minimum 1 HP). You regain up to half your total hit dice (minimum 1) whenever you finish a long rest."
              />
              <div className="flex items-center gap-2">
                <button onClick={spendHitDie} disabled={character.hit_dice_remaining <= 0} className="w-5 h-5 rounded-full border border-mist disabled:opacity-25 hover:border-candle hover:text-candle text-xs">−</button>
                <span>{character.hit_dice_remaining} / {character.hit_dice_total} (d{character.class?.hit_die ?? 8})</span>
              </div>
            </div>
          </div>

          <div className="panel rounded-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-display text-sm text-candle uppercase tracking-wide">Status Effects</h2>
              <button onClick={() => setStatusModalOpen(true)} className="text-xs text-candle hover:text-parchment border border-mist rounded-full px-2 py-0.5">Manage</button>
            </div>
            {charConditions.length === 0 ? (
              <p className="text-xs text-parchment/40 italic">None currently applied.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {charConditions.map((c) => (
                  <Tooltip
                    key={c.condition_id}
                    label={<span className="wax-seal text-xs px-2 py-1 rounded-full inline-block">{c.conditions.name}</span>}
                    title={c.conditions.name}
                    body={c.conditions.description}
                  />
                ))}
              </div>
            )}
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
                <Tooltip key={t.name} label={<span className="block text-sm mb-1.5">{t.name}</span>} title={t.name} body={t.description} block />
              ))}
            </div>
          )}

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Languages</h2>
            <p className="text-sm">{languages.map((l) => l.language).join(', ') || 'Common'}</p>
          </div>
        </section>

        <section className="col-span-2 space-y-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Background Feature</h2>
            {character.background?.feature_name ? (
              <Tooltip label={<span className="block text-sm">{character.background.feature_name}</span>} title={character.background.feature_name} body={character.background.feature_description ?? ''} block />
            ) : <p className="text-xs text-parchment/40 italic">None recorded.</p>}
            {character.chosen_tool_proficiency && (
              <p className="text-xs text-parchment/60 mt-2"><span className="text-candle">Tool Proficiency:</span> {character.chosen_tool_proficiency}</p>
            )}
          </div>

          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Class Features</h2>
            {classFeatures.map((f, i) => (
              <Tooltip key={i} label={<span className="block text-sm mb-1.5">{f.name}</span>} title={f.name} body={f.description} block />
            ))}
            {classFeat && <Tooltip label={<span className="block text-sm mb-1.5">{classFeat.feats.name} <span className="text-parchment/40 text-xs">(Fighting Style)</span></span>} title={classFeat.feats.name} body={classFeat.feats.description} block />}
            {subclassL1Features.map((f) => (
              <Tooltip key={f.name} label={<span className="block text-sm mb-1.5">{f.name}</span>} title={f.name} body={f.description} block />
            ))}
            {variantFeat && <Tooltip label={<span className="block text-sm mb-1.5">{variantFeat.feats.name} <span className="text-parchment/40 text-xs">(Variant Human)</span></span>} title={variantFeat.feats.name} body={variantFeat.feats.description} block />}
            {classFeatures.length === 0 && !classFeat && subclassL1Features.length === 0 && !variantFeat && <p className="text-xs text-parchment/40 italic">None recorded.</p>}
          </div>

          {resources.length > 0 && (
            <div className="panel rounded-sm p-4">
              <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Resources</h2>
              {resources.map((r) => {
                const featureText = classFeatures.find((f) => f.name === r.name || r.name.includes(f.name) || f.name.includes(r.name))?.description
                return (
                  <div key={r.name} className="flex justify-between items-center text-sm mb-1.5">
                    {featureText ? (
                      <Tooltip label={<span>{r.name}</span>} title={r.name} body={featureText} />
                    ) : (
                      <span>{r.name}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustResource(r.name, -1)} disabled={r.current_value <= 0} className="w-5 h-5 rounded-full border border-mist disabled:opacity-25 hover:border-candle hover:text-candle text-xs">−</button>
                      <span>{r.current_value} / {r.max_value} <span className="text-parchment/40 text-xs">({r.recharge === 'short_rest' ? 'short rest' : 'long rest'})</span></span>
                      <button onClick={() => adjustResource(r.name, 1)} disabled={r.current_value >= r.max_value} className="w-5 h-5 rounded-full border border-mist disabled:opacity-25 hover:border-candle hover:text-candle text-xs">+</button>
                    </div>
                  </div>
                )
              })}
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
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Currency</h2>
            {currency ? (
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {([['cp', 'CP'], ['sp', 'SP'], ['ep', 'EP'], ['gp', 'GP'], ['pp', 'PP']] as const).map(([field, label]) => (
                  <div key={field}>
                    <div className="text-[10px] text-parchment/40 uppercase tracking-wide mb-1">{label}</div>
                    <input
                      type="number"
                      defaultValue={currency[field]}
                      onBlur={(e) => updateCurrency(field, Number(e.target.value))}
                      className="w-full bg-ink border border-mist rounded-sm text-center text-sm py-1 text-parchment focus:border-candle/50 outline-none"
                    />
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-parchment/40 italic">None recorded.</p>}
          </div>
        </section>

        <section className="col-span-3 space-y-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Attacks &amp; Spellcasting</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-parchment/40 uppercase tracking-wide text-left">
                  <th className="font-normal pb-1">Name</th>
                  <th className="font-normal pb-1">
                    <Tooltip label="Bonus" title="Attack Bonus" body="Add this to a d20 roll to see if the attack hits. Melee uses Strength, ranged uses Dexterity, and finesse weapons let you pick whichever is better." />
                  </th>
                  <th className="font-normal pb-1">
                    <Tooltip label="Damage" title="Damage" body="Roll this when the attack hits. The number after the dice is your relevant ability modifier, already added in." />
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-mist/30 hover:bg-mist/10 transition-colors">
                  <td className="py-1 pr-2 text-parchment/70">Unarmed Strike</td>
                  <td className="py-1 pr-2 text-parchment/70">
                    {(() => { const b = PROF_BONUS + Math.floor((character.strength - 10) / 2); return b >= 0 ? `+${b}` : b })()}
                  </td>
                  <td className="py-1 text-parchment/50">
                    1{(() => { const m = Math.floor((character.strength - 10) / 2); return m !== 0 ? (m > 0 ? `+${m}` : m) : '' })()} bludgeoning
                  </td>
                </tr>
                {equippedWeapons.map((row) => {
                  const bonus = weaponAttackBonus(row)
                  const dmg = weaponDamage(row)
                  return (
                    <tr key={row.id} className="border-t border-mist/30 hover:bg-mist/10 transition-colors">
                      <td className="py-1 pr-2">{row.items?.name}</td>
                      <td className="py-1 pr-2">{bonus >= 0 ? `+${bonus}` : bonus}</td>
                      <td className="py-1 text-parchment/70">
                        {dmg.dice}{dmg.bonus !== 0 ? (dmg.bonus > 0 ? `+${dmg.bonus}` : dmg.bonus) : ''} {dmg.type}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {spellcastingAbility && (
              <div className="text-xs text-parchment/50 mt-3 pt-3 border-t border-mist/40">
                <Tooltip
                  label={<span>Spell Attack: {(() => { const b = PROF_BONUS + Math.floor((character[spellcastingAbility] - 10) / 2); return b >= 0 ? `+${b}` : b })()}</span>}
                  title="Spell Attack Bonus"
                  body="Added to a d20 roll for spells that require an attack roll to hit, like Fire Bolt or Guiding Bolt — as opposed to spells that force a saving throw instead."
                />
                {' · '}
                <Tooltip label={<span>Spell Save DC: {spellSaveDC}</span>} title="Spell Save DC" body="The number a creature must meet or beat on its own saving throw to resist your spell." />
              </div>
            )}
          </div>
        </section>

        <section className="col-span-12 grid grid-cols-2 gap-4">
          <div className="panel rounded-sm p-4">
            <h2 className="font-display text-sm text-candle mb-3 uppercase tracking-wide">Spells</h2>
            {spellSlots.length > 0 && (
              <div className="mb-3 pb-3 border-b border-mist/50">
                {spellSlots.map((sl) => (
                  <div key={sl.slot_level} className="flex justify-between items-center text-sm">
                    <span>{character.class?.spellcasting_type === 'pact' ? 'Pact Magic Slot' : `Level ${sl.slot_level} Slots`}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustSlot(sl.slot_level, 1)} disabled={sl.used_slots >= sl.max_slots} className="w-5 h-5 rounded-full border border-mist disabled:opacity-25 hover:border-candle hover:text-candle text-xs">−</button>
                      <span>{sl.max_slots - sl.used_slots} / {sl.max_slots}</span>
                      <button onClick={() => adjustSlot(sl.slot_level, -1)} disabled={sl.used_slots <= 0} className="w-5 h-5 rounded-full border border-mist disabled:opacity-25 hover:border-candle hover:text-candle text-xs">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {cantrips.length === 0 && knownSpells.length === 0 ? (
              <p className="text-xs text-parchment/40 italic">{character.class?.spellcasting_type ? 'No spells selected (or your class doesn\u2019t cast until a later level).' : 'Non-caster — no spell panel needed.'}</p>
            ) : (
              <>
                {cantrips.map((s) => (
                  <Tooltip key={s.spells.name} label={<span className="block text-sm mb-1.5">{s.spells.name} <span className="text-parchment/40 text-xs">(cantrip)</span></span>} title={s.spells.name} subtitle={`Cantrip · ${s.spells.school}`} body={s.spells.description} block />
                ))}
                {knownSpells.map((s) => {
                  const matchingSlot = spellSlots.find((sl) => sl.slot_level === s.spells.level)
                  const canCast = matchingSlot ? matchingSlot.used_slots < matchingSlot.max_slots : false
                  return (
                    <div key={s.spells.name} className="flex items-center justify-between mb-1.5">
                      <Tooltip label={<span className="text-sm">{s.spells.name}{s.is_prepared ? '' : s.is_always_known ? <span className="text-parchment/40 text-xs"> (always prepared)</span> : ''}</span>} title={s.spells.name} subtitle={`Level ${s.spells.level} · ${s.spells.school}`} body={s.spells.description} />
                      {matchingSlot && (
                        <button onClick={() => adjustSlot(s.spells.level, 1)} disabled={!canCast} className="text-xs text-candle hover:text-parchment border border-mist rounded-full px-2 py-0.5 disabled:opacity-25 disabled:hover:text-candle">
                          Cast
                        </button>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          <div className="panel rounded-sm p-4">
            <div className="flex justify-between items-baseline mb-3">
              <h2 className="font-display text-sm text-candle uppercase tracking-wide">Inventory</h2>
              <Tooltip
                label={
                  <span className={`text-xs ${totalUnitsCarried > carryCapacity ? 'text-blood-bright' : 'text-parchment/50'}`}>
                    {totalUnitsCarried} / {carryCapacity} units{totalUnitsCarried > carryCapacity ? ' — encumbered' : ''}
                  </span>
                }
                title="Carry Capacity"
                body="A house rule, not official PHB math: capacity is 2× your Strength score (a Backpack doubles that again, once). 'Units' are an abstracted weight, not literal pounds — see any item's tooltip for its unit cost. Going over capacity is shown as a warning only; it doesn't automatically reduce your speed, that's left to the table's judgment."
              />
            </div>
            {topLevelInventory.length ? topLevelInventory.map((row) => {
              const name = row.items?.name ?? row.item_name ?? 'Unknown item'
              const isContainer = row.items?.is_container
              const isExpanded = expandedContainers.has(row.id)
              const children = isContainer ? containedInventory(row.id) : []
              const capacity = row.items?.container_capacity
              const usedInContainer = isContainer ? containerUnitsUsed(row.id) : 0
              const rowWeight = (row.items?.weight_units ?? 1) * row.quantity
              const fittingContainers = availableContainers.filter((c) => {
                if (c.id === row.id) return false
                const cap = c.items?.container_capacity
                if (cap == null) return true
                return containerUnitsUsed(c.id) + rowWeight <= cap
              })
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
                        <Tooltip label={<span>{row.quantity}× {name}{row.equipped ? <span className="text-candle text-xs"> (equipped)</span> : ''}</span>} title={name} body={row.items.description} />
                      ) : (
                        <span>{row.quantity}× {name}{row.equipped ? <span className="text-candle text-xs"> (equipped)</span> : ''}</span>
                      )}
                      {isContainer && capacity != null && (
                        <span className={`text-xs ${usedInContainer > capacity ? 'text-blood-bright' : 'text-parchment/40'}`}>
                          ({usedInContainer}/{capacity})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isContainer && (row.items?.category === 'weapon' || row.items?.category === 'armor') && (
                        <button onClick={() => toggleEquipped(row.id, row.equipped)} className="text-xs text-candle hover:text-parchment border border-mist rounded-full px-2 py-0.5">
                          {row.equipped ? 'Unequip' : 'Equip'}
                        </button>
                      )}
                      {!isContainer && fittingContainers.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) moveItem(row.id, e.target.value) }}
                          className="bg-ink border border-mist rounded-sm text-xs text-parchment/60 px-1 py-0.5"
                        >
                          <option value="" disabled>{'Put in\u2026'}</option>
                          {fittingContainers.map((c) => (
                            <option key={c.id} value={c.id}>{c.items?.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
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

    <Modal open={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Status Effects">
      <p className="text-xs text-parchment/50 mb-4">Toggle any conditions currently affecting {character.name}. They'll show as pills on the sheet with their full rules text on hover.</p>
      <div className="grid grid-cols-2 gap-2">
        {conditionsList.map((c) => {
          const active = charConditions.some((cc) => cc.condition_id === c.id)
          return (
            <button
              key={c.id}
              onClick={() => toggleCondition(c.id, c.name, c.description)}
              className={`text-left px-3 py-2 rounded-sm border text-sm transition-colors ${active ? 'border-candle bg-blood/25 text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
            >
              <div className="flex justify-between items-center mb-0.5">
                <span>{c.name}</span>
                <span className="text-xs">{active ? 'ON' : 'OFF'}</span>
              </div>
              <p className="text-xs text-parchment/50 leading-snug">{c.description}</p>
            </button>
          )
        })}
      </div>
    </Modal>

    <Modal open={roleplayModalOpen} onClose={() => setRoleplayModalOpen(false)} title="Backstory & Roleplay">
      <div className="space-y-3">
        {([
          ['personality_traits', 'Personality Traits'],
          ['ideals', 'Ideals'],
          ['bonds', 'Bonds'],
          ['flaws', 'Flaws'],
          ['appearance', 'Appearance'],
          ['backstory', 'Backstory'],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className="text-xs text-candle uppercase tracking-wide">{label}</label>
            <textarea
              value={roleplayDraft[key]}
              onChange={(e) => setRoleplayDraft((prev) => ({ ...prev, [key]: e.target.value }))}
              rows={key === 'backstory' ? 6 : 2}
              className="w-full bg-ink border border-mist rounded-sm p-2 text-sm mt-1 text-parchment focus:border-candle/50 outline-none"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setRoleplayModalOpen(false)} className="text-xs text-parchment/60 hover:text-parchment px-3 py-1.5">Cancel</button>
          <button onClick={saveRoleplay} className="text-xs bg-blood hover:bg-blood-bright transition rounded-sm px-3 py-1.5">Save</button>
        </div>
      </div>
    </Modal>
    </>
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
