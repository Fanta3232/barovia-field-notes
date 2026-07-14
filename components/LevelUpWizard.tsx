'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import { ALL_SKILLS, FAVORED_ENEMY_TYPES, FAVORED_TERRAIN_TYPES } from '@/lib/types'

const ABILITY_LABELS: Record<string, string> = {
  strength: 'Strength', dexterity: 'Dexterity', constitution: 'Constitution',
  intelligence: 'Intelligence', wisdom: 'Wisdom', charisma: 'Charisma',
}
const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

type WizardCharacter = {
  id: string
  level: number
  class_id: string
  subclass_id: string | null
  max_hp: number
  current_hp: number
  initiative_bonus: number
  hit_dice_total: number
  hit_dice_remaining: number
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  class: {
    name: string
    hit_die: number
    spellcasting_type: string | null
    spellcasting_starts_at_level: number
    subclass_starts_at_level: number
  } | null
  subclassName: string | null
  subraceName: string | null
  hasToughFeat: boolean
  favored_enemy: string | null
  favored_terrain: string | null
}

type ClassFeature = { name: string; description: string }
type SubclassOption = { id: string; name: string; features: { name: string; level: number; description: string }[] }
type FeatOption = { id: string; name: string; description: string; prerequisite: string | null }

// Which Fighting Style options each class actually gets — Paladins and Rangers don't get
// the full six, unlike Fighter.
const FIGHTING_STYLE_OPTIONS: Record<string, string[]> = {
  Fighter: ['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting'],
  Paladin: ['Defense', 'Dueling', 'Great Weapon Fighting', 'Protection'],
  Ranger: ['Archery', 'Defense', 'Dueling', 'Two-Weapon Fighting'],
}

// 2014 proficiency-bonus-by-level table, shared with the character sheet's own copy.
export function profBonusForLevel(level: number): number {
  return Math.floor((level - 1) / 4) + 2
}

// Verified spell slot tables (SRD 5.1), indexed by class level. Full casters (Bard, Cleric,
// Druid, Sorcerer, Wizard) start at level 1; half casters (Paladin, Ranger) start at level 2.
const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2], 6: [4, 3, 3], 7: [4, 3, 3, 1],
  8: [4, 3, 3, 2], 9: [4, 3, 3, 3, 1], 10: [4, 3, 3, 3, 2], 11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1], 13: [4, 3, 3, 3, 2, 1, 1], 14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1], 16: [4, 3, 3, 3, 2, 1, 1, 1], 17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1], 19: [4, 3, 3, 3, 3, 2, 1, 1, 1], 20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
}
const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2], 7: [4, 3], 8: [4, 3], 9: [4, 3, 2],
  10: [4, 3, 2], 11: [4, 3, 3], 12: [4, 3, 3], 13: [4, 3, 3, 1], 14: [4, 3, 3, 1],
  15: [4, 3, 3, 2], 16: [4, 3, 3, 2], 17: [4, 3, 3, 3, 1], 18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2],
}
// Warlock Pact Magic: always the same slot level, recharges on a short rest.
const PACT_MAGIC: Record<number, { slots: number; slotLevel: number }> = {
  1: { slots: 1, slotLevel: 1 }, 2: { slots: 2, slotLevel: 1 }, 3: { slots: 2, slotLevel: 2 },
  4: { slots: 2, slotLevel: 2 }, 5: { slots: 2, slotLevel: 3 }, 6: { slots: 2, slotLevel: 3 },
  7: { slots: 2, slotLevel: 4 }, 8: { slots: 2, slotLevel: 4 }, 9: { slots: 2, slotLevel: 5 },
  10: { slots: 2, slotLevel: 5 }, 11: { slots: 3, slotLevel: 5 }, 12: { slots: 3, slotLevel: 5 },
  13: { slots: 3, slotLevel: 5 }, 14: { slots: 3, slotLevel: 5 }, 15: { slots: 3, slotLevel: 5 },
  16: { slots: 3, slotLevel: 5 }, 17: { slots: 4, slotLevel: 5 }, 18: { slots: 4, slotLevel: 5 },
  19: { slots: 4, slotLevel: 5 }, 20: { slots: 4, slotLevel: 5 },
}

// ASI-granting levels vary by class: everyone gets 4/8/12/16/19, Fighter also gets 6/14,
// Rogue also gets 10.
const ASI_LEVELS: Record<string, number[]> = {
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue: [4, 8, 10, 12, 16, 19],
}
const DEFAULT_ASI_LEVELS = [4, 8, 12, 16, 19]
function isAsiLevel(className: string | undefined, level: number): boolean {
  return (ASI_LEVELS[className ?? ''] ?? DEFAULT_ASI_LEVELS).includes(level)
}

// Warlock's Invocations Known table (SRD 5.1) — number of NEW invocations gained at each level
// (2 total at 2nd, growing to 8 total by 18th).
const NEW_INVOCATIONS_AT_LEVEL: Record<number, number> = { 2: 2, 5: 1, 7: 1, 9: 1, 12: 1, 15: 1, 18: 1 }
// Sorcerer's Metamagic — 2 options at 3rd level, one more at 10th and 17th.
const NEW_METAMAGIC_AT_LEVEL: Record<number, number> = { 3: 2, 10: 1, 17: 1 }

// Class resource pools that actually grow with level (Rage uses, Ki points, Sorcery points,
// Channel Divinity charges, etc.) — these were being created at character creation but never
// updated on level-up. Names match the create wizard's resourceMap exactly so the same rows
// get updated rather than duplicated. Deliberately excludes Second Wind (always 1 use) and
// Wild Shape's use count (always 2 — only the beast options scale, not the count).
function resourcesForLevel(className: string | undefined, level: number): { name: string; max: number; recharge: 'short_rest' | 'long_rest' }[] {
  switch (className) {
    case 'Barbarian': {
      const rages = level >= 20 ? 99 : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2
      return [{ name: 'Rage', max: rages, recharge: 'long_rest' }]
    }
    case 'Paladin':
      return [{ name: 'Lay on Hands Pool', max: level * 5, recharge: 'long_rest' }]
    case 'Monk':
      return level >= 2 ? [{ name: 'Ki Points', max: level, recharge: 'short_rest' }] : []
    case 'Sorcerer':
      return level >= 2 ? [{ name: 'Sorcery Points', max: level, recharge: 'long_rest' }] : []
    case 'Cleric': {
      const uses = level >= 18 ? 3 : level >= 6 ? 2 : level >= 2 ? 1 : 0
      return uses > 0 ? [{ name: 'Channel Divinity', max: uses, recharge: 'short_rest' }] : []
    }
    case 'Fighter': {
      const out: { name: string; max: number; recharge: 'short_rest' | 'long_rest' }[] = []
      if (level >= 2) out.push({ name: 'Action Surge', max: level >= 17 ? 2 : 1, recharge: 'short_rest' })
      if (level >= 9) out.push({ name: 'Indomitable', max: level >= 17 ? 3 : level >= 13 ? 2 : 1, recharge: 'long_rest' })
      return out
    }
    case 'Druid':
      return level >= 2 ? [{ name: 'Wild Shape', max: 2, recharge: 'short_rest' }] : []
    default:
      return []
  }
}

function spellSlotsForLevel(spellcastingType: string | null, startsAt: number, level: number): number[] | null {
  if (!spellcastingType) return null
  if (spellcastingType === 'pact') return null // handled separately via PACT_MAGIC
  if (startsAt === 1) return FULL_CASTER_SLOTS[level] ?? null
  if (startsAt === 2) return HALF_CASTER_SLOTS[level] ?? null
  return null
}

export default function LevelUpWizard({
  characterId, character, open, onClose, onComplete,
}: {
  characterId: string
  character: WizardCharacter
  open: boolean
  onClose: () => void
  onComplete: () => void
}) {
  const newLevel = character.level + 1
  const hitDie = character.class?.hit_die ?? 8
  const conMod = Math.floor((character.constitution - 10) / 2)
  const averageRoll = Math.floor(hitDie / 2) + 1
  const isASILevel = isAsiLevel(character.class?.name, newLevel)
  const willUnlockSubclass = character.class?.subclass_starts_at_level === newLevel && !character.subclass_id

  const [step, setStep] = useState<'hp' | 'features' | 'subclass' | 'asi' | 'confirm'>('hp')
  const [hpMethod, setHpMethod] = useState<'roll' | 'average' | null>(null)
  const [rolledHp, setRolledHp] = useState<number | null>(null)
  const [newFeatures, setNewFeatures] = useState<ClassFeature[]>([])
  const [fightingStyleOptions, setFightingStyleOptions] = useState<FeatOption[]>([])
  const [chosenFightingStyleId, setChosenFightingStyleId] = useState<string | null>(null)
  const [invocationOptions, setInvocationOptions] = useState<FeatOption[]>([])
  const [invocationCount, setInvocationCount] = useState(0)
  const [chosenInvocationIds, setChosenInvocationIds] = useState<string[]>([])
  const [metamagicOptions, setMetamagicOptions] = useState<FeatOption[]>([])
  const [metamagicCount, setMetamagicCount] = useState(0)
  const [chosenMetamagicIds, setChosenMetamagicIds] = useState<string[]>([])
  const [expertiseSkillOptions, setExpertiseSkillOptions] = useState<string[]>([])
  const [expertiseCount, setExpertiseCount] = useState(0)
  const [chosenExpertiseSkills, setChosenExpertiseSkills] = useState<string[]>([])
  const [proficientSkillNames, setProficientSkillNames] = useState<string[]>([])
  const [chosenFavoredEnemy, setChosenFavoredEnemy] = useState<string | null>(null)
  const [chosenFavoredTerrain, setChosenFavoredTerrain] = useState<string | null>(null)
  const [miClass, setMiClass] = useState<string | null>(null)
  const [miCantripOptions, setMiCantripOptions] = useState<FeatOption[]>([])
  const [miSpellOptions, setMiSpellOptions] = useState<FeatOption[]>([])
  const [miChosenCantrips, setMiChosenCantrips] = useState<string[]>([])
  const [miChosenSpell, setMiChosenSpell] = useState<string | null>(null)
  const [miLoadingSpells, setMiLoadingSpells] = useState(false)
  const [knownSpellNames, setKnownSpellNames] = useState<string[]>([])
  const [subclassOptions, setSubclassOptions] = useState<SubclassOption[]>([])
  const [chosenSubclassId, setChosenSubclassId] = useState<string | null>(null)
  const [asiChoice, setAsiChoice] = useState<'asi' | 'feat' | null>(null)
  const [asiMode, setAsiMode] = useState<'one' | 'two'>('one')
  const [asiPicks, setAsiPicks] = useState<string[]>([])
  const [availableFeats, setAvailableFeats] = useState<FeatOption[]>([])
  const [chosenFeatId, setChosenFeatId] = useState<string | null>(null)
  const [featAbilityChoice, setFeatAbilityChoice] = useState<string | null>(null)
  const [featSkillChoices, setFeatSkillChoices] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    async function load() {
      setLoading(true)
      const [featuresRes, subclassRes, featsRes, knownSpellsRes] = await Promise.all([
        supabase.from('class_features').select('name, description')
          .eq('class_id', character.class_id).eq('level', newLevel).is('subclass_id', null),
        willUnlockSubclass
          ? supabase.from('subclasses').select('id, name, features').eq('class_id', character.class_id).eq('unlocks_at_level', newLevel)
          : Promise.resolve({ data: [] as SubclassOption[] }),
        isASILevel
          ? supabase.from('feats').select('id, name, description, prerequisite').eq('category', 'general').order('name')
          : Promise.resolve({ data: [] as FeatOption[] }),
        isASILevel
          ? supabase.from('character_spells').select('spells:spell_id(name)').eq('character_id', characterId)
          : Promise.resolve({ data: [] as { spells: { name: string } }[] }),
      ])
      setNewFeatures((featuresRes.data ?? []) as ClassFeature[])
      setSubclassOptions((subclassRes.data ?? []) as unknown as SubclassOption[])
      setAvailableFeats((featsRes.data ?? []) as FeatOption[])
      setKnownSpellNames(((knownSpellsRes.data ?? []) as unknown as { spells: { name: string } }[]).map((r) => r.spells?.name).filter(Boolean) as string[])

      const needsFightingStyle = ((featuresRes.data ?? []) as ClassFeature[]).some((f) => f.name === 'Fighting Style')
      if (needsFightingStyle && character.class?.name) {
        const allowed = FIGHTING_STYLE_OPTIONS[character.class.name] ?? []
        const stylesRes = await supabase.from('feats').select('id, name, description, prerequisite').eq('category', 'fighting_style')
        setFightingStyleOptions(((stylesRes.data ?? []) as FeatOption[]).filter((f) => allowed.includes(f.name)))
      } else {
        setFightingStyleOptions([])
      }

      const newInvocationCount = character.class?.name === 'Warlock' ? (NEW_INVOCATIONS_AT_LEVEL[newLevel] ?? 0) : 0
      if (newInvocationCount > 0) {
        const [invRes, knownRes] = await Promise.all([
          supabase.from('feats').select('id, name, description, prerequisite').eq('category', 'eldritch_invocation').order('name'),
          supabase.from('character_feats').select('feats:feat_id(name)').eq('character_id', characterId),
        ])
        const knownNames = new Set(((knownRes.data ?? []) as unknown as { feats: { name: string } }[]).map((r) => r.feats?.name))
        setInvocationOptions(((invRes.data ?? []) as FeatOption[]).filter((f) => !knownNames.has(f.name)))
        setInvocationCount(newInvocationCount)
      } else {
        setInvocationOptions([])
        setInvocationCount(0)
      }

      const newMetamagicCount = character.class?.name === 'Sorcerer' ? (NEW_METAMAGIC_AT_LEVEL[newLevel] ?? 0) : 0
      if (newMetamagicCount > 0) {
        const [mmRes, knownRes] = await Promise.all([
          supabase.from('feats').select('id, name, description, prerequisite').eq('category', 'metamagic').order('name'),
          supabase.from('character_feats').select('feats:feat_id(name)').eq('character_id', characterId),
        ])
        const knownNames = new Set(((knownRes.data ?? []) as unknown as { feats: { name: string } }[]).map((r) => r.feats?.name))
        setMetamagicOptions(((mmRes.data ?? []) as FeatOption[]).filter((f) => !knownNames.has(f.name)))
        setMetamagicCount(newMetamagicCount)
      } else {
        setMetamagicOptions([])
        setMetamagicCount(0)
      }

      // Every row in character_skills already represents a proficient skill (no separate
      // "proficient" filter needed). Fetched unconditionally since both Expertise (needs
      // proficient, non-expertise skills) and the Skilled feat (needs NON-proficient skills)
      // depend on knowing what's already on the sheet.
      const skillsRes = await supabase.from('character_skills').select('skill_name, expertise').eq('character_id', characterId)
      const allProficientSkillNames = ((skillsRes.data ?? []) as { skill_name: string; expertise: boolean }[]).map((s) => s.skill_name)
      setProficientSkillNames(allProficientSkillNames)

      const expertiseFeature = ((featuresRes.data ?? []) as ClassFeature[]).find((f) => f.name === 'Expertise')
      if (expertiseFeature) {
        setExpertiseSkillOptions(((skillsRes.data ?? []) as { skill_name: string; expertise: boolean }[]).filter((s) => !s.expertise).map((s) => s.skill_name))
        setExpertiseCount(2)
      } else {
        setExpertiseSkillOptions([])
        setExpertiseCount(0)
      }
      setLoading(false)
    }
    load()
    // Reset wizard state each time it's opened fresh.
    setStep('hp'); setHpMethod(null); setRolledHp(null); setChosenSubclassId(null)
    setAsiChoice(null); setAsiMode('one'); setAsiPicks([]); setChosenFeatId(null); setChosenFightingStyleId(null)
    setFeatAbilityChoice(null); setFeatSkillChoices([])
    setChosenInvocationIds([])
    setChosenMetamagicIds([])
    setChosenFavoredEnemy(null); setChosenFavoredTerrain(null)
    setMiClass(null); setMiCantripOptions([]); setMiSpellOptions([]); setMiChosenCantrips([]); setMiChosenSpell(null)
    setChosenExpertiseSkills([])
  }, [open, character.class_id, newLevel, willUnlockSubclass, isASILevel])

  if (!open) return null

  // Same +1/level (Hill Dwarf, Draconic Bloodline) and +2/level (Tough feat) HP sources the
  // character creation flow already applies at level 1 — kept consistent here so they don't
  // silently stop accruing the moment a character starts leveling up.
  const perLevelHpBonus =
    (character.subraceName === 'Hill Dwarf' ? 1 : 0) +
    (character.subclassName === 'Draconic Bloodline' ? 1 : 0) +
    (character.hasToughFeat ? 2 : 0)
  const hpGain = (hpMethod === 'roll' ? (rolledHp ?? 0) : hpMethod === 'average' ? averageRoll : 0) + conMod + perLevelHpBonus
  const hpGainFloor = Math.max(1, hpGain) // HP gained on level-up is always at least 1
  // Preview of the retroactive Constitution HP rule for the confirm screen — mirrors the same
  // calculation commit() performs once ability choices are locked in.
  const previewNewConstitution = character.class?.name === 'Barbarian' && newLevel === 20
    ? Math.min(24, (asiChoice === 'asi' && asiPicks.includes('constitution') ? character.constitution + (asiMode === 'one' ? 2 : 1) : character.constitution) + 4)
    : asiChoice === 'asi' && asiPicks.includes('constitution') ? Math.min(20, character.constitution + (asiMode === 'one' ? 2 : 1)) : character.constitution
  const previewRetroactiveConBonus = Math.max(0, Math.floor((previewNewConstitution - 10) / 2) - Math.floor((character.constitution - 10) / 2)) * newLevel

  function toggleAsiPick(ability: string) {
    setAsiPicks((prev) => {
      if (prev.includes(ability)) return prev.filter((a) => a !== ability)
      const max = asiMode === 'one' ? 1 : 2
      if (prev.length >= max) return asiMode === 'one' ? [ability] : [...prev.slice(1), ability]
      return [...prev, ability]
    })
  }

  function toggleInvocationPick(id: string) {
    setChosenInvocationIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id)
      if (prev.length >= invocationCount) return prev
      return [...prev, id]
    })
  }

  function toggleMetamagicPick(id: string) {
    setChosenMetamagicIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id)
      if (prev.length >= metamagicCount) return prev
      return [...prev, id]
    })
  }

  function toggleExpertisePick(skill: string) {
    setChosenExpertiseSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((s) => s !== skill)
      if (prev.length >= expertiseCount) return prev
      return [...prev, skill]
    })
  }

  const steps: typeof step[] = ['hp', 'features', ...(willUnlockSubclass ? ['subclass' as const] : []), ...(isASILevel ? ['asi' as const] : []), 'confirm']
  const stepIndex = steps.indexOf(step)
  const chosenFeatName = availableFeats.find((f) => f.id === chosenFeatId)?.name
  const featNeedsAbilityChoice = chosenFeatName === 'Resilient' || chosenFeatName === 'Athlete'
  const featNeedsSkillChoice = chosenFeatName === 'Skilled'
  const featNeedsMagicInitiate = chosenFeatName === 'Magic Initiate'
  const MAGIC_INITIATE_CLASSES = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']

  async function loadMagicInitiateOptions(cls: string) {
    setMiClass(cls); setMiChosenCantrips([]); setMiChosenSpell(null); setMiLoadingSpells(true)
    const [cantripsRes, spellsRes] = await Promise.all([
      supabase.from('spells').select('id, name, description').eq('level', 0).contains('classes', [cls]).order('name'),
      supabase.from('spells').select('id, name, description').eq('level', 1).contains('classes', [cls]).order('name'),
    ])
    setMiCantripOptions(((cantripsRes.data ?? []) as { id: string; name: string; description: string }[]).filter((s) => !knownSpellNames.includes(s.name)).map((s) => ({ ...s, prerequisite: null })))
    setMiSpellOptions(((spellsRes.data ?? []) as { id: string; name: string; description: string }[]).filter((s) => !knownSpellNames.includes(s.name)).map((s) => ({ ...s, prerequisite: null })))
    setMiLoadingSpells(false)
  }
  // Ranger gains an additional Favored Enemy at 6th and 14th level, and an additional Favored
  // Terrain at 6th and 10th — the character sheet only ever displays one comma-separated string
  // for each, so new picks are appended rather than needing a schema change.
  const needsFavoredEnemy = character.class?.name === 'Ranger' && (newLevel === 6 || newLevel === 14)
  const needsFavoredTerrain = character.class?.name === 'Ranger' && (newLevel === 6 || newLevel === 10)
  const alreadyChosenEnemies = (character.favored_enemy ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const alreadyChosenTerrains = (character.favored_terrain ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const canAdvance =
    (step === 'hp' && hpMethod !== null && (hpMethod === 'average' || rolledHp !== null)) ||
    (step === 'features' && (fightingStyleOptions.length === 0 || chosenFightingStyleId !== null) && (invocationCount === 0 || chosenInvocationIds.length === invocationCount) && (metamagicCount === 0 || chosenMetamagicIds.length === metamagicCount) && (expertiseCount === 0 || chosenExpertiseSkills.length === expertiseCount) && (!needsFavoredEnemy || chosenFavoredEnemy !== null) && (!needsFavoredTerrain || chosenFavoredTerrain !== null)) ||
    (step === 'subclass' && chosenSubclassId !== null) ||
    (step === 'asi' && (
      (asiChoice === 'asi' && asiPicks.length === (asiMode === 'one' ? 1 : 2)) ||
      (asiChoice === 'feat' && chosenFeatId !== null && (!featNeedsAbilityChoice || featAbilityChoice !== null) && (!featNeedsSkillChoice || featSkillChoices.length === 3) && (!featNeedsMagicInitiate || (miClass !== null && miChosenCantrips.length === 2 && miChosenSpell !== null)))
    )) ||
    (step === 'confirm')

  function goNext() {
    const idx = steps.indexOf(step)
    if (idx < steps.length - 1) setStep(steps[idx + 1])
  }
  function goBack() {
    const idx = steps.indexOf(step)
    if (idx > 0) setStep(steps[idx - 1])
  }

  async function commit() {
    setSaving(true)
    const abilityUpdates: Record<string, number> = {}
    if (asiChoice === 'asi') {
      for (const ability of asiPicks) {
        const current = (character as any)[ability] as number
        const bump = asiMode === 'one' ? 2 : 1
        abilityUpdates[ability] = Math.min(20, current + bump)
      }
    }
    // Primal Champion (Barbarian, 20th level): Strength and Constitution increase by 4, to a
    // maximum of 24 — a genuine exception to the usual ability score cap of 20.
    if (character.class?.name === 'Barbarian' && newLevel === 20) {
      abilityUpdates.strength = Math.min(24, (abilityUpdates.strength ?? character.strength) + 4)
      abilityUpdates.constitution = Math.min(24, (abilityUpdates.constitution ?? character.constitution) + 4)
    }
    // Resilient and Athlete both grant +1 to a chosen ability score — applied here (before the
    // retroactive Constitution HP check below) so picking Resilient on Constitution correctly
    // triggers that rule too, not just an ASI.
    if (asiChoice === 'feat' && (chosenFeatName === 'Resilient' || chosenFeatName === 'Athlete') && featAbilityChoice) {
      const current = abilityUpdates[featAbilityChoice] ?? (character as any)[featAbilityChoice]
      abilityUpdates[featAbilityChoice] = Math.min(20, current + 1)
    }

    // "When your Constitution modifier increases by 1, your hit point maximum increases by 1
    // for each level you have attained" (PHB) — an easy rule to miss since it's retroactive
    // across every level already gained, not just this one.
    const oldConMod = Math.floor((character.constitution - 10) / 2)
    const newConstitution = abilityUpdates.constitution ?? character.constitution
    const newConMod = Math.floor((newConstitution - 10) / 2)
    const retroactiveConBonus = Math.max(0, newConMod - oldConMod) * newLevel

    const newMaxHp = character.max_hp + hpGainFloor + retroactiveConBonus
    const newCurrentHp = character.current_hp + hpGainFloor + retroactiveConBonus

    const characterUpdate: Record<string, unknown> = {
      level: newLevel,
      max_hp: newMaxHp,
      current_hp: newCurrentHp,
      hit_dice_total: character.hit_dice_total + 1,
      hit_dice_remaining: character.hit_dice_remaining + 1,
      pending_level_up: false,
      ...abilityUpdates,
    }
    if (chosenSubclassId) characterUpdate.subclass_id = chosenSubclassId
    if (asiChoice === 'feat' && chosenFeatName === 'Resilient' && featAbilityChoice) {
      characterUpdate.resilient_ability = featAbilityChoice
    }
    if (needsFavoredEnemy && chosenFavoredEnemy) {
      characterUpdate.favored_enemy = [...alreadyChosenEnemies, chosenFavoredEnemy].join(', ')
    }
    if (needsFavoredTerrain && chosenFavoredTerrain) {
      characterUpdate.favored_terrain = [...alreadyChosenTerrains, chosenFavoredTerrain].join(', ')
    }

    // initiative_bonus is a stored value (dexMod + any flat bonus like Alert's +5), set once at
    // creation and never recalculated since — a Dexterity ASI would otherwise leave it stale.
    // Back out whatever flat bonus already exists and reapply it to the new Dex modifier, rather
    // than assuming it's always exactly the Alert feat. Also add Alert's +5 fresh if it's being
    // picked for the first time this level-up.
    const oldDexMod = Math.floor((character.dexterity - 10) / 2)
    const newlyPickedAlert = asiChoice === 'feat' && chosenFeatName === 'Alert' ? 5 : 0
    const flatInitiativeBonus = (character.initiative_bonus - oldDexMod) + newlyPickedAlert
    const newDexterity = abilityUpdates.dexterity ?? character.dexterity
    const newDexMod = Math.floor((newDexterity - 10) / 2)
    if (newDexMod !== oldDexMod || newlyPickedAlert > 0) {
      characterUpdate.initiative_bonus = newDexMod + flatInitiativeBonus
    }

    const tasks: PromiseLike<unknown>[] = [
      supabase.from('characters').update(characterUpdate).eq('id', characterId),
    ]

    if (asiChoice === 'feat' && chosenFeatId) {
      tasks.push(supabase.from('character_feats').insert({ character_id: characterId, feat_id: chosenFeatId, source: `asi_level_${newLevel}` }))
    }
    if (chosenFightingStyleId) {
      tasks.push(supabase.from('character_feats').insert({ character_id: characterId, feat_id: chosenFightingStyleId, source: `fighting_style_level_${newLevel}` }))
    }
    if (chosenInvocationIds.length > 0) {
      tasks.push(supabase.from('character_feats').insert(
        chosenInvocationIds.map((feat_id) => ({ character_id: characterId, feat_id, source: `eldritch_invocation_level_${newLevel}` }))
      ))
    }
    if (chosenMetamagicIds.length > 0) {
      tasks.push(supabase.from('character_feats').insert(
        chosenMetamagicIds.map((feat_id) => ({ character_id: characterId, feat_id, source: `metamagic_level_${newLevel}` }))
      ))
    }
    for (const skill of chosenExpertiseSkills) {
      tasks.push(supabase.from('character_skills').update({ expertise: true }).eq('character_id', characterId).eq('skill_name', skill))
    }
    if (asiChoice === 'feat' && chosenFeatName === 'Skilled' && featSkillChoices.length > 0) {
      tasks.push(supabase.from('character_skills').insert(
        featSkillChoices.map((skill_name) => ({ character_id: characterId, skill_name, expertise: false }))
      ))
    }
    if (asiChoice === 'feat' && featNeedsMagicInitiate && miClass && miChosenCantrips.length === 2 && miChosenSpell) {
      const spellRows = [...miChosenCantrips, miChosenSpell].map((spell_id) => ({
        character_id: characterId, spell_id, is_prepared: false, is_always_known: true,
      }))
      tasks.push(supabase.from('character_spells').insert(spellRows))
      const chosenSpellName = miSpellOptions.find((s) => s.id === miChosenSpell)?.name
      if (chosenSpellName) {
        tasks.push(supabase.from('character_resources').insert({
          character_id: characterId, name: `${chosenSpellName} (Magic Initiate)`, max_value: 1, current_value: 1, recharge: 'long_rest',
        }))
      }
    }

    // Spell slot recalculation, if this class casts spells.
    const spellcastingType = character.class?.spellcasting_type ?? null
    if (spellcastingType === 'pact') {
      const pact = PACT_MAGIC[newLevel]
      if (pact) {
        const existing = await supabase.from('character_spell_slots').select('slot_level, used_slots').eq('character_id', characterId)
        const priorUsed = existing.data?.find((r) => r.slot_level === pact.slotLevel)?.used_slots ?? 0
        await supabase.from('character_spell_slots').delete().eq('character_id', characterId)
        tasks.push(supabase.from('character_spell_slots').insert({
          character_id: characterId, slot_level: pact.slotLevel, max_slots: pact.slots, used_slots: Math.min(priorUsed, pact.slots),
        }))
      }
    } else if (spellcastingType) {
      const slots = spellSlotsForLevel(spellcastingType, character.class?.spellcasting_starts_at_level ?? 1, newLevel)
      if (slots) {
        const existing = await supabase.from('character_spell_slots').select('slot_level, used_slots').eq('character_id', characterId)
        const usedByLevel = new Map((existing.data ?? []).map((r) => [r.slot_level, r.used_slots]))
        await supabase.from('character_spell_slots').delete().eq('character_id', characterId)
        const rows = slots.map((max, idx) => ({
          character_id: characterId, slot_level: idx + 1, max_slots: max,
          used_slots: Math.min(usedByLevel.get(idx + 1) ?? 0, max),
        })).filter((r) => r.max_slots > 0)
        if (rows.length) tasks.push(supabase.from('character_spell_slots').insert(rows))
      }
    }

    // Class resource pools that grow with level (Rage, Ki Points, Sorcery Points, Channel
    // Divinity, Lay on Hands, Action Surge, Indomitable, Wild Shape). These existed at creation
    // but were never updated on level-up — new pools appear here the moment they're unlocked,
    // existing ones just get their max_value bumped.
    const newResources = resourcesForLevel(character.class?.name, newLevel)
    if (newResources.length > 0) {
      const existingRes = await supabase.from('character_resources').select('name, current_value').eq('character_id', characterId)
      const existingByName = new Map((existingRes.data ?? []).map((r) => [r.name, r.current_value]))
      for (const r of newResources) {
        if (existingByName.has(r.name)) {
          // Uses remaining carry over as-is (a level-up doesn't refill a pool you'd already
          // dipped into this session) — Math.min is just a defensive cap, since max only grows.
          const remaining = existingByName.get(r.name) as number
          tasks.push(supabase.from('character_resources').update({ max_value: r.max, current_value: Math.min(remaining, r.max) }).eq('character_id', characterId).eq('name', r.name))
        } else {
          tasks.push(supabase.from('character_resources').insert({ character_id: characterId, name: r.name, max_value: r.max, current_value: r.max, recharge: r.recharge }))
        }
      }
    }

    await Promise.all(tasks)
    setSaving(false)
    onComplete()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Level Up — ${character.class?.name ?? 'Character'} ${character.level} → ${newLevel}`}>
      {loading ? (
        <p className="text-sm text-parchment/50 italic">Loading level-up options...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1.5 text-xs text-parchment/40 uppercase tracking-wide mb-2">
            {steps.map((s, i) => (
              <span key={s} className={i === stepIndex ? 'text-candle' : ''}>{s}{i < steps.length - 1 ? ' · ' : ''}</span>
            ))}
          </div>

          {step === 'hp' && (
            <div>
              <h3 className="font-display text-base text-candle mb-2">Hit Points</h3>
              <p className="text-sm text-parchment/70 mb-3">
                Your Hit Die is a d{hitDie}. Roll it, or take the average ({averageRoll}) — either way, add your Constitution modifier ({conMod >= 0 ? `+${conMod}` : conMod}), minimum 1 total.
                {perLevelHpBonus > 0 && ` Plus +${perLevelHpBonus} from ${[character.subraceName === 'Hill Dwarf' && 'Dwarven Toughness', character.subclassName === 'Draconic Bloodline' && 'Draconic Resilience', character.hasToughFeat && 'the Tough feat'].filter(Boolean).join(' and ')}.`}
              </p>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => setHpMethod('average')}
                  className={`flex-1 border rounded-sm py-2 text-sm transition-colors ${hpMethod === 'average' ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                >
                  Take Average ({averageRoll} + {conMod >= 0 ? `+${conMod}` : conMod}{perLevelHpBonus > 0 ? ` + ${perLevelHpBonus}` : ''} = {Math.max(1, averageRoll + conMod + perLevelHpBonus)})
                </button>
                <button
                  onClick={() => { setHpMethod('roll'); setRolledHp(1 + Math.floor(Math.random() * hitDie)) }}
                  className={`flex-1 border rounded-sm py-2 text-sm transition-colors ${hpMethod === 'roll' ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                >
                  Roll d{hitDie}{rolledHp !== null ? ` → ${rolledHp} + ${conMod >= 0 ? `+${conMod}` : conMod}${perLevelHpBonus > 0 ? ` + ${perLevelHpBonus}` : ''} = ${Math.max(1, rolledHp + conMod + perLevelHpBonus)}` : ''}
                </button>
              </div>
              {hpMethod === 'roll' && (
                <button onClick={() => setRolledHp(1 + Math.floor(Math.random() * hitDie))} className="text-sm text-parchment/40 hover:text-candle underline decoration-dotted">
                  Reroll
                </button>
              )}
            </div>
          )}

          {step === 'features' && (
            <div>
              <h3 className="font-display text-base text-candle mb-2">New at Level {newLevel}</h3>
              {newFeatures.length === 0 ? (
                <p className="text-sm text-parchment/40 italic">No new class features this level — just the numbers growing (HP, spell slots, etc).</p>
              ) : (
                newFeatures.map((f) => (
                  <div key={f.name} className="mb-2.5 last:mb-0">
                    <span className="block text-base text-parchment">{f.name}</span>
                    <span className="block text-sm text-parchment/60 leading-snug">{f.description}</span>
                  </div>
                ))
              )}
              {fightingStyleOptions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">Choose your Fighting Style:</p>
                  <div className="space-y-2">
                    {fightingStyleOptions.map((f) => (
                      <label key={f.id} className={`block border rounded-sm p-2.5 cursor-pointer transition-colors ${chosenFightingStyleId === f.id ? 'border-candle' : 'border-mist hover:border-candle/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="fighting-style" checked={chosenFightingStyleId === f.id} onChange={() => setChosenFightingStyleId(f.id)} />
                          <span className="text-base text-candle">{f.name}</span>
                        </div>
                        <p className="text-sm text-parchment/60 ml-6 leading-snug">{f.description}</p>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {invocationCount > 0 && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">
                    Choose {invocationCount} Eldritch Invocations ({chosenInvocationIds.length} / {invocationCount} picked):
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {invocationOptions.map((f) => {
                      const picked = chosenInvocationIds.includes(f.id)
                      const disabled = !picked && chosenInvocationIds.length >= invocationCount
                      return (
                        <label key={f.id} className={`block border rounded-sm p-2.5 cursor-pointer transition-colors ${picked ? 'border-candle' : 'border-mist hover:border-candle/50'} ${disabled ? 'opacity-40' : ''}`}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" disabled={disabled} checked={picked} onChange={() => toggleInvocationPick(f.id)} />
                            <span className="text-base text-candle">{f.name}</span>
                            {f.prerequisite && <span className="text-xs text-parchment/40">({f.prerequisite})</span>}
                          </div>
                          <p className="text-sm text-parchment/60 ml-6 leading-snug">{f.description}</p>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              {metamagicCount > 0 && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">
                    Choose {metamagicCount} Metamagic options ({chosenMetamagicIds.length} / {metamagicCount} picked):
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {metamagicOptions.map((f) => {
                      const picked = chosenMetamagicIds.includes(f.id)
                      const disabled = !picked && chosenMetamagicIds.length >= metamagicCount
                      return (
                        <label key={f.id} className={`block border rounded-sm p-2.5 cursor-pointer transition-colors ${picked ? 'border-candle' : 'border-mist hover:border-candle/50'} ${disabled ? 'opacity-40' : ''}`}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" disabled={disabled} checked={picked} onChange={() => toggleMetamagicPick(f.id)} />
                            <span className="text-base text-candle">{f.name}</span>
                          </div>
                          <p className="text-sm text-parchment/60 ml-6 leading-snug">{f.description}</p>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              {expertiseCount > 0 && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">
                    Choose {expertiseCount} skills to gain Expertise in — your proficiency bonus doubles for checks using them ({chosenExpertiseSkills.length} / {expertiseCount} picked):
                  </p>
                  {expertiseSkillOptions.length === 0 ? (
                    <p className="text-sm text-parchment/40 italic">No eligible proficient skills found on this character's sheet — check Skills before finishing this level-up if that looks wrong.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {expertiseSkillOptions.map((skill) => {
                        const picked = chosenExpertiseSkills.includes(skill)
                        const disabled = !picked && chosenExpertiseSkills.length >= expertiseCount
                        return (
                          <button
                            key={skill}
                            disabled={disabled}
                            onClick={() => toggleExpertisePick(skill)}
                            className={`border rounded-sm py-2 text-sm transition-colors disabled:opacity-30 ${picked ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                          >
                            {skill}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              {needsFavoredEnemy && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">Choose an additional Favored Enemy:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FAVORED_ENEMY_TYPES.filter((t) => !alreadyChosenEnemies.includes(t)).map((t) => (
                      <button
                        key={t}
                        onClick={() => setChosenFavoredEnemy(t)}
                        className={`border rounded-sm py-2 text-sm transition-colors ${chosenFavoredEnemy === t ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {needsFavoredTerrain && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">Choose an additional Favored Terrain:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FAVORED_TERRAIN_TYPES.filter((t) => !alreadyChosenTerrains.includes(t)).map((t) => (
                      <button
                        key={t}
                        onClick={() => setChosenFavoredTerrain(t)}
                        className={`border rounded-sm py-2 text-sm transition-colors ${chosenFavoredTerrain === t ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'subclass' && (
            <div>
              <h3 className="font-display text-base text-candle mb-2">Choose Your Subclass</h3>
              <div className="space-y-3">
                {subclassOptions.map((sc) => (
                  <label key={sc.id} className={`block border rounded-sm p-3 cursor-pointer transition-colors ${chosenSubclassId === sc.id ? 'border-candle' : 'border-mist hover:border-candle/50'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <input type="radio" name="subclass" checked={chosenSubclassId === sc.id} onChange={() => setChosenSubclassId(sc.id)} />
                      <span className="text-base text-candle">{sc.name}</span>
                    </div>
                    {sc.features.filter((f) => f.level === newLevel).map((f) => (
                      <div key={f.name} className="ml-6 mb-1">
                        <span className="block text-sm text-parchment">{f.name}</span>
                        <span className="block text-sm text-parchment/60 leading-snug">{f.description}</span>
                      </div>
                    ))}
                  </label>
                ))}
                {subclassOptions.length === 0 && (
                  <p className="text-sm text-parchment/40 italic">No subclass options are in the database for this class yet — ask your DM to add one, or skip for now.</p>
                )}
              </div>
            </div>
          )}

          {step === 'asi' && (
            <div>
              <h3 className="font-display text-base text-candle mb-2">Ability Score Improvement</h3>
              <div className="flex gap-3 mb-3">
                <button onClick={() => { setAsiChoice('asi'); setChosenFeatId(null) }} className={`flex-1 border rounded-sm py-2 text-sm transition-colors ${asiChoice === 'asi' ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}>
                  Improve Ability Scores
                </button>
                <button onClick={() => { setAsiChoice('feat'); setAsiPicks([]) }} className={`flex-1 border rounded-sm py-2 text-sm transition-colors ${asiChoice === 'feat' ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}>
                  Take a Feat Instead
                </button>
              </div>

              {asiChoice === 'asi' && (
                <div>
                  <div className="flex gap-3 mb-3 text-sm">
                    <label className="flex items-center gap-1.5"><input type="radio" checked={asiMode === 'one'} onChange={() => { setAsiMode('one'); setAsiPicks([]) }} /> One score +2</label>
                    <label className="flex items-center gap-1.5"><input type="radio" checked={asiMode === 'two'} onChange={() => { setAsiMode('two'); setAsiPicks([]) }} /> Two scores +1 each</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ABILITIES.map((a) => {
                      const current = (character as any)[a] as number
                      const picked = asiPicks.includes(a)
                      const bump = asiMode === 'one' ? 2 : 1
                      const wouldExceed = current + bump > 20 && !picked
                      return (
                        <button
                          key={a}
                          disabled={wouldExceed}
                          onClick={() => toggleAsiPick(a)}
                          className={`border rounded-sm py-2 text-sm transition-colors disabled:opacity-30 ${picked ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                        >
                          {ABILITY_LABELS[a]} ({current} → {Math.min(20, current + (picked ? bump : 0))})
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {asiChoice === 'feat' && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableFeats.map((f) => (
                    <label key={f.id} className={`block border rounded-sm p-2.5 cursor-pointer transition-colors ${chosenFeatId === f.id ? 'border-candle' : 'border-mist hover:border-candle/50'}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="feat" checked={chosenFeatId === f.id} onChange={() => { setChosenFeatId(f.id); setFeatAbilityChoice(null); setFeatSkillChoices([]) }} />
                        <span className="text-base text-candle">{f.name}</span>
                        {f.prerequisite && <span className="text-xs text-parchment/40">({f.prerequisite})</span>}
                      </div>
                      <p className="text-sm text-parchment/60 ml-6 leading-snug">{f.description}</p>
                    </label>
                  ))}
                </div>
              )}
              {featNeedsAbilityChoice && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">Choose which ability score gets +1:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ABILITIES.map((a) => {
                      const current = (character as any)[a] as number
                      const wouldExceed = current + 1 > 20
                      return (
                        <button
                          key={a}
                          disabled={wouldExceed}
                          onClick={() => setFeatAbilityChoice(a)}
                          className={`border rounded-sm py-2 text-sm transition-colors disabled:opacity-30 ${featAbilityChoice === a ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                        >
                          {ABILITY_LABELS[a]} ({current} → {current + 1})
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {featNeedsSkillChoice && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">
                    Choose 3 skills to gain proficiency in ({featSkillChoices.length} / 3 picked — tool proficiencies from this feat aren't tracked yet):
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SKILLS.filter((sk) => !proficientSkillNames.includes(sk)).map((sk) => {
                      const picked = featSkillChoices.includes(sk)
                      const disabled = !picked && featSkillChoices.length >= 3
                      return (
                        <button
                          key={sk}
                          disabled={disabled}
                          onClick={() => setFeatSkillChoices((prev) => picked ? prev.filter((s) => s !== sk) : prev.length >= 3 ? prev : [...prev, sk])}
                          className={`border rounded-sm py-2 text-sm transition-colors disabled:opacity-30 ${picked ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                        >
                          {sk}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {featNeedsMagicInitiate && (
                <div className="mt-3 pt-3 border-t border-mist/30">
                  <p className="text-sm text-parchment/70 mb-2">Choose a class whose spell list you're drawing from:</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {MAGIC_INITIATE_CLASSES.map((cls) => (
                      <button
                        key={cls}
                        onClick={() => loadMagicInitiateOptions(cls)}
                        className={`border rounded-sm py-2 text-sm transition-colors ${miClass === cls ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                  {miLoadingSpells && <p className="text-sm text-parchment/40 italic">Loading spell options...</p>}
                  {miClass && !miLoadingSpells && (
                    <>
                      <p className="text-sm text-parchment/70 mb-2">
                        Choose 2 cantrips ({miChosenCantrips.length} / 2 picked):
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
                        {miCantripOptions.map((s) => {
                          const picked = miChosenCantrips.includes(s.id)
                          const disabled = !picked && miChosenCantrips.length >= 2
                          return (
                            <label key={s.id} className={`block border rounded-sm p-2 cursor-pointer transition-colors ${picked ? 'border-candle' : 'border-mist hover:border-candle/50'} ${disabled ? 'opacity-40' : ''}`}>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" disabled={disabled} checked={picked} onChange={() => setMiChosenCantrips((prev) => picked ? prev.filter((i) => i !== s.id) : prev.length >= 2 ? prev : [...prev, s.id])} />
                                <span className="text-base text-candle">{s.name}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                      <p className="text-sm text-parchment/70 mb-2">Choose 1 first-level spell — castable once per long rest without a slot:</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {miSpellOptions.map((s) => (
                          <label key={s.id} className={`block border rounded-sm p-2 cursor-pointer transition-colors ${miChosenSpell === s.id ? 'border-candle' : 'border-mist hover:border-candle/50'}`}>
                            <div className="flex items-center gap-2">
                              <input type="radio" name="mi-spell" checked={miChosenSpell === s.id} onChange={() => setMiChosenSpell(s.id)} />
                              <span className="text-base text-candle">{s.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <h3 className="font-display text-base text-candle mb-2">Confirm</h3>
              <ul className="text-sm text-parchment/80 space-y-1 mb-2">
                <li>Level {character.level} → {newLevel}</li>
                <li>HP: {character.max_hp} → {character.max_hp + hpGainFloor + previewRetroactiveConBonus} (+{hpGainFloor}{previewRetroactiveConBonus > 0 ? ` + ${previewRetroactiveConBonus} retroactive from your Constitution increase` : ''})</li>
                {resourcesForLevel(character.class?.name, newLevel).map((r) => (
                  <li key={r.name}>{r.name}: {r.max} max</li>
                ))}
                {newFeatures.length > 0 && <li>New features: {newFeatures.map((f) => f.name).join(', ')}</li>}
                {chosenFightingStyleId && <li>Fighting Style: {fightingStyleOptions.find((f) => f.id === chosenFightingStyleId)?.name}</li>}
                {chosenInvocationIds.length > 0 && <li>Eldritch Invocations: {chosenInvocationIds.map((id) => invocationOptions.find((f) => f.id === id)?.name).join(', ')}</li>}
                {chosenMetamagicIds.length > 0 && <li>Metamagic: {chosenMetamagicIds.map((id) => metamagicOptions.find((f) => f.id === id)?.name).join(', ')}</li>}
                {chosenExpertiseSkills.length > 0 && <li>Expertise: {chosenExpertiseSkills.join(', ')}</li>}
                {chosenSubclassId && <li>Subclass: {subclassOptions.find((s) => s.id === chosenSubclassId)?.name}</li>}
                {asiChoice === 'asi' && <li>Ability increase: {asiPicks.map((a) => ABILITY_LABELS[a]).join(', ')}</li>}
                {asiChoice === 'feat' && <li>Feat: {availableFeats.find((f) => f.id === chosenFeatId)?.name}</li>}
                {featNeedsAbilityChoice && featAbilityChoice && <li>{ABILITY_LABELS[featAbilityChoice]} +1</li>}
                {featNeedsSkillChoice && featSkillChoices.length > 0 && <li>New skill proficiencies: {featSkillChoices.join(', ')}</li>}
                {featNeedsMagicInitiate && miClass && <li>Magic Initiate ({miClass}): {[...miChosenCantrips.map((id) => miCantripOptions.find((s) => s.id === id)?.name), miSpellOptions.find((s) => s.id === miChosenSpell)?.name].filter(Boolean).join(', ')}</li>}
                {needsFavoredEnemy && chosenFavoredEnemy && <li>Favored Enemy: {chosenFavoredEnemy}</li>}
                {needsFavoredTerrain && chosenFavoredTerrain && <li>Favored Terrain: {chosenFavoredTerrain}</li>}
                {character.class?.name === 'Barbarian' && newLevel === 20 && <li>Primal Champion: Strength and Constitution +4 (max 24)</li>}
              </ul>
              <button
                onClick={commit}
                disabled={saving}
                className="w-full border border-candle text-candle rounded-sm py-2.5 text-base hover:bg-candle/10 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Confirm Level ${newLevel}`}
              </button>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t border-mist/40">
            <button onClick={goBack} disabled={stepIndex === 0} className="text-sm text-parchment/50 hover:text-candle disabled:opacity-20">← Back</button>
            {step !== 'confirm' && (
              <button onClick={goNext} disabled={!canAdvance} className="text-sm text-candle hover:text-parchment disabled:opacity-20">Next →</button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
