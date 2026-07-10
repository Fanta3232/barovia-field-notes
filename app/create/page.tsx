'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Tooltip from '@/components/Tooltip'
import {
  Species, SpeciesSubrace, DraconicAncestry, ClassRow, Subclass, Background, Feat, Spell, AbilityScores, ABILITY_KEYS,
  STANDARD_LANGUAGES, ALL_SKILLS, ALIGNMENTS, PB_BUDGET, pbCost, abilityModifier, SUBRACE_SPECIES,
  FAVORED_ENEMY_TYPES, FAVORED_TERRAIN_TYPES, GAMING_SETS, ARTISAN_TOOLS, MUSICAL_INSTRUMENTS,
} from '@/lib/types'

// Detects which category-choice list (if any) applies to a background's tool_proficiency
// text, e.g. "One Gaming Set + Vehicles (Land)" -> the Gaming Set options.
function toolProficiencyOptions(toolProficiency: string | null): string[] | null {
  if (!toolProficiency) return null
  if (/gaming set/i.test(toolProficiency)) return GAMING_SETS
  if (/artisan'?s tools/i.test(toolProficiency)) return ARTISAN_TOOLS
  if (/musical instrument/i.test(toolProficiency)) return MUSICAL_INSTRUMENTS
  return null
}

const STEPS = ['Species', 'Class', 'Class Features', 'Class Skills', 'Background', 'Ability Scores', 'Languages', 'Spells & Cantrips', 'Equipment', 'Review'] as const

const ABILITY_BLURBS: Record<string, string> = {
  strength: 'Melee damage, carrying capacity, Athletics.',
  dexterity: 'Armor Class, initiative, ranged/finesse attacks, Stealth.',
  constitution: 'Hit points and Concentration saves — never a bad ability to raise.',
  intelligence: 'Wizard spellcasting, Arcana/History/Investigation checks.',
  wisdom: 'Cleric/Druid/Ranger spellcasting, Perception, Insight.',
  charisma: 'Bard/Sorcerer/Warlock/Paladin spellcasting, social skills.',
}

const STEP_INTROS = [
  "Species shapes your character's baseline traits, speed, and — in the 2014 rules — your ability score bonus. Vision in the dark is not a species trait in this campaign; you'll get Darkvision (or better) from equipment, spells, or feats instead. If you pick Human, you'll also see the optional Variant Human rule here.",
  'Class determines your combat role, HP progression, and whether you cast spells.',
  "Some classes make an additional choice at level 1. A Fighter picks a Fighting Style. A Cleric, Sorcerer, or Warlock picks their subclass (Divine Domain / Sorcerous Origin / Otherworldly Patron) right away — everyone else picks theirs at level 2 or 3, outside what a level-1 sheet needs.",
  'Every class grants its own skill choice, separate from your background — this was missing entirely from earlier passes of this creator.',
  'Background sets two fixed skill proficiencies (not a choice in 2014), starting equipment, and a genuine narrative/mechanical Feature.',
  "Assign your base ability scores with point buy. Your species (and subrace, if any) ability bonus is fixed and applies automatically — no need to allocate it yourself.",
  'Everyone knows Common, plus any languages your background grants.',
  "If your class casts spells starting at level 1, pick cantrips and spells here. Paladins and Rangers don't get Spellcasting until level 2, so they'll skip this entirely — that's correct, not a bug.",
  'Starting gear is two independent sources: your class equipment package (or gold), and your background\'s fixed kit.',
  'Review everything, set an alignment, then enter Barovia.',
]

type ScoreState = AbilityScores

export default function CreateCharacterPage() {
  const [step, setStep] = useState(0)

  const [speciesList, setSpeciesList] = useState<Species[]>([])
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([])
  const [packContents, setPackContents] = useState<{ pack_item_id: string; content_item_id: string; quantity: number }[]>([])
  const [subraceList, setSubraceList] = useState<SpeciesSubrace[]>([])
  const [ancestryList, setAncestryList] = useState<DraconicAncestry[]>([])
  const [classList, setClassList] = useState<ClassRow[]>([])
  const [subclassList, setSubclassList] = useState<Subclass[]>([])
  const [backgroundList, setBackgroundList] = useState<Background[]>([])
  const [feats, setFeats] = useState<Feat[]>([])
  const [spells, setSpells] = useState<Spell[]>([])

  const [name, setName] = useState('')
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [subraceId, setSubraceId] = useState<string | null>(null)
  const [isVariantHuman, setIsVariantHuman] = useState(false)
  const [variantHumanAbilities, setVariantHumanAbilities] = useState<string[]>([])
  const [variantHumanSkill, setVariantHumanSkill] = useState<string | null>(null)
  const [variantHumanFeatId, setVariantHumanFeatId] = useState<string | null>(null)
  const [resilientAbility, setResilientAbility] = useState<string | null>(null)
  const [athleteAbility, setAthleteAbility] = useState<string | null>(null)
  const [skilledFeatSkills, setSkilledFeatSkills] = useState<string[]>([])
  const [halfElfBonusAbilities, setHalfElfBonusAbilities] = useState<string[]>([])
  const [draconicAncestry, setDraconicAncestry] = useState<string | null>(null)
  const [highElfCantrip, setHighElfCantrip] = useState<string | null>(null)
  const [halfElfSkills, setHalfElfSkills] = useState<string[]>([])
  const [rangerFavoredEnemy, setRangerFavoredEnemy] = useState<string | null>(null)
  const [rangerFavoredTerrain, setRangerFavoredTerrain] = useState<string | null>(null)

  const [classId, setClassId] = useState<string | null>(null)
  const [subclassId, setSubclassId] = useState<string | null>(null)
  const [fightingStyle, setFightingStyle] = useState<string | null>(null)
  const [classSkills, setClassSkills] = useState<string[]>([])

  const [backgroundId, setBackgroundId] = useState<string | null>(null)
  const [chosenToolProficiency, setChosenToolProficiency] = useState<string | null>(null)
  const [scores, setScores] = useState<ScoreState>({
    strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8,
  })
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([])
  const [selectedSpells, setSelectedSpells] = useState<string[]>([])
  const [classEquipChoice, setClassEquipChoice] = useState<string | null>(null)
  const [weaponOverrides, setWeaponOverrides] = useState<Record<string, string>>({})
  const [useShop, setUseShop] = useState(false)
  const [shopCart, setShopCart] = useState<{ id: string; name: string; cost_gp: number }[]>([])
  const SHOP_BUDGET = 100 // flat house-rule budget — see EquipmentStep note on why this isn't a PHB-verified number
  const [alignment, setAlignment] = useState<string | null>(null)

  // Magic Initiate sub-selection, only relevant if Variant Human picks that feat
  const [miClassName, setMiClassName] = useState<string | null>(null)
  const [miCantrips, setMiCantrips] = useState<string[]>([])
  const [miSpell, setMiSpell] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [sp, sr, da, cl, sc, bg, ft, sl, im, pc] = await Promise.all([
        supabase.from('species').select('*').order('name'),
        supabase.from('species_subraces').select('*'),
        supabase.from('draconic_ancestries').select('*').order('dragon_type'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('subclasses').select('*'),
        supabase.from('backgrounds').select('*').order('name'),
        supabase.from('feats').select('*'),
        supabase.from('spells').select('*').order('level').order('name'),
        supabase.from('items').select('*').order('name'),
        supabase.from('pack_contents').select('pack_item_id, content_item_id, quantity'),
      ])
      if (sp.data) setSpeciesList(sp.data as Species[])
      if (sr.data) setSubraceList(sr.data as SpeciesSubrace[])
      if (da.data) setAncestryList(da.data as DraconicAncestry[])
      if (cl.data) setClassList(cl.data as ClassRow[])
      if (sc.data) setSubclassList(sc.data as Subclass[])
      if (bg.data) setBackgroundList(bg.data as Background[])
      if (ft.data) setFeats(ft.data as Feat[])
      if (sl.data) setSpells(sl.data as Spell[])
      if (im.data) setItemsCatalog(im.data)
      if (pc.data) setPackContents(pc.data)
    }
    load()
  }, [])

  const selectedSpecies = speciesList.find((s) => s.id === speciesId)
  const isHuman = selectedSpecies?.name === 'Human'
  const isHalfElf = selectedSpecies?.name === 'Half-Elf'
  const isDragonborn = selectedSpecies?.name === 'Dragonborn'
  const hasSubraces = selectedSpecies ? SUBRACE_SPECIES.includes(selectedSpecies.name) : false
  const subracesForSpecies = subraceList.filter((r) => r.species_id === speciesId)
  const selectedSubrace = subracesForSpecies.find((r) => r.id === subraceId)
  const isHighElf = selectedSubrace?.name === 'High Elf'
  const wizardCantripOptions = spells.filter((s) => s.level === 0 && s.classes.includes('Wizard'))
  // Human, Half-Elf, and High Elf all grant "one extra language of your choice" — verified from
  // the PHB text; Half-Elf's was found missing from the seed data entirely during this pass.
  const speciesExtraLanguages = (isHuman ? 1 : 0) + (isHalfElf ? 1 : 0) + (isHighElf ? 1 : 0)

  const selectedClass = classList.find((c) => c.id === classId)
  const subclassesForClass = subclassList.filter((sc) => sc.class_id === classId)
  const selectedSubclass = subclassesForClass.find((sc) => sc.id === subclassId)
  const needsSubclassAtL1 = selectedClass?.subclass_starts_at_level === 1
  const fightingStyles = feats.filter((f) => f.category === 'fighting_style')
  const originFeats = feats.filter((f) => f.category === 'general')
  const variantHumanFeat = originFeats.find((f) => f.id === variantHumanFeatId)
  const hasMagicInitiate = variantHumanFeat?.name === 'Magic Initiate'
  const MI_CLASSES = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']
  const miCantripOptions = miClassName ? spells.filter((s) => s.level === 0 && s.classes.includes(miClassName)) : []
  const miSpellOptions = miClassName ? spells.filter((s) => s.level === 1 && s.classes.includes(miClassName)) : []

  const selectedBackground = backgroundList.find((b) => b.id === backgroundId)

  // ---------- Equipment: weapon picking, pack previews, shop ----------
  const weaponCatalog = itemsCatalog.filter((i) => i.weapon_category)
  const packContentsMap: Record<string, string[]> = {}
  itemsCatalog.filter((i) => i.is_container).forEach((pack) => {
    const rows = packContents.filter((pc) => pc.pack_item_id === pack.id)
    packContentsMap[pack.name] = rows.map((r) => {
      const contentItem = itemsCatalog.find((i) => i.id === r.content_item_id)
      return contentItem ? `${r.quantity}× ${contentItem.name}` : ''
    }).filter(Boolean)
  })
  const shopCatalog = itemsCatalog.filter((i) => ['weapon', 'armor', 'gear', 'tool', 'container'].includes(i.category))
  function parseCostToGp(cost: string | null): number {
    if (!cost) return 0
    const m = cost.match(/([\d.]+)\s*(gp|sp|cp)/i)
    if (!m) return 0
    const n = parseFloat(m[1])
    if (/sp/i.test(m[2])) return n / 10
    if (/cp/i.test(m[2])) return n / 100
    return n
  }
  function addToCart(item: any) {
    const cost = parseCostToGp(item.cost)
    const spent = shopCart.reduce((s, i) => s + i.cost_gp, 0)
    if (spent + cost > SHOP_BUDGET) return
    setShopCart((prev) => [...prev, { id: item.id, name: item.name, cost_gp: cost }])
  }
  function removeFromCart(index: number) {
    setShopCart((prev) => prev.filter((_, i) => i !== index))
  }

  // ---------- Species ASI (fixed by species/subrace in 2014, not chosen — except
  // Half-Elf's 2 free picks and the optional Variant Human override) ----------
  function speciesASI(): Record<string, number> {
    if (!selectedSpecies) return {}
    if (isHuman && isVariantHuman) {
      const result: Record<string, number> = {}
      variantHumanAbilities.forEach((a) => { result[a] = (result[a] ?? 0) + 1 })
      return result
    }
    const result: Record<string, number> = { ...selectedSpecies.ability_score_increase }
    if (selectedSubrace) {
      Object.entries(selectedSubrace.ability_score_increase).forEach(([k, v]) => {
        result[k] = (result[k] ?? 0) + v
      })
    }
    if (isHalfElf) {
      halfElfBonusAbilities.forEach((a) => { result[a] = (result[a] ?? 0) + 1 })
    }
    return result
  }
  function finalScore(ab: keyof ScoreState): number {
    const resilientBonus = resilientAbility === ab ? 1 : 0
    const athleteBonus = athleteAbility === ab ? 1 : 0
    return scores[ab] + (speciesASI()[ab] ?? 0) + resilientBonus + athleteBonus
  }
  function modifier(score: number) {
    const m = abilityModifier(score)
    return m >= 0 ? `+${m}` : `${m}`
  }
  function adjustScore(ab: keyof ScoreState, delta: number) {
    const next = scores[ab] + delta
    if (next < 8 || next > 15) return
    const spent = ABILITY_KEYS.reduce((sum, k) => sum + pbCost(scores[k]), 0)
    const newSpent = spent - pbCost(scores[ab]) + pbCost(next)
    if (newSpent > PB_BUDGET) return
    setScores((prev) => ({ ...prev, [ab]: next }))
  }

  const classCantrips = selectedClass ? spells.filter((s) => s.level === 0 && s.classes.includes(selectedClass.name)) : []
  const classSpells = selectedClass ? spells.filter((s) => s.level === 1 && s.classes.includes(selectedClass.name)) : []
  const castsAtLevel1 = !!selectedClass?.spellcasting_type && selectedClass.spellcasting_starts_at_level === 1

  function spellCountFor(): number {
    if (!selectedClass || !castsAtLevel1) return 0
    if (selectedClass.spellcasting_type === 'prepared') {
      const mod = abilityModifier(finalScore((selectedClass.spellcasting_ability?.toLowerCase() ?? 'intelligence') as keyof ScoreState))
      return Math.max(1, mod + 1)
    }
    return selectedClass.name === 'Warlock' ? 2 : selectedClass.name === 'Sorcerer' ? 2 : 4
  }

  function computeAC(): number {
    const dexMod = abilityModifier(finalScore('dexterity'))
    const items = useShop
      ? shopCart.map((c) => c.name).join(' ')
      : classEquipChoice ? (selectedClass?.starting_equipment.find((o) => o.label === classEquipChoice)?.items?.join(' ') ?? '') : ''
    const wearingArmor = /Chain Mail|Scale Mail|Chain Shirt|Leather Armor/i.test(items)

    // Class-specific Unarmored Defense formulas — only apply while not wearing armor picked
    // above. Found missing entirely: the old logic always fell back to a flat 10+Dex for any
    // class/option that didn't include armor, silently dropping these real level-1 bonuses.
    if (!wearingArmor) {
      if (selectedClass?.name === 'Barbarian') return 10 + dexMod + abilityModifier(finalScore('constitution'))
      if (selectedClass?.name === 'Monk') return 10 + dexMod + abilityModifier(finalScore('wisdom'))
      if (selectedSubclass?.name === 'Draconic Bloodline') return 13 + dexMod
    }

    if (!items) return 10 + dexMod
    let base = 10
    let dexCap: number | null = null
    const hasShield = /Shield/i.test(items)
    if (/Chain Mail/i.test(items)) { base = 16; dexCap = 0 }
    else if (/Scale Mail/i.test(items)) { base = 14; dexCap = 2 }
    else if (/Chain Shirt/i.test(items)) { base = 13; dexCap = 2 }
    else if (/Leather Armor/i.test(items)) { base = 11; dexCap = null }
    const dexApplied = dexCap === null ? dexMod : Math.min(dexMod, dexCap)
    return base + dexApplied + (hasShield ? 2 : 0)
  }

  async function handleSubmit() {
    if (!name || !speciesId || !classId || !backgroundId) {
      setError('Fill in every step before finishing.')
      return
    }
    if (needsSubclassAtL1 && !subclassId) {
      setError(`${selectedClass?.name} needs its ${selectedClass?.name === 'Cleric' ? 'Divine Domain' : selectedClass?.name === 'Sorcerer' ? 'Sorcerous Origin' : 'Otherworldly Patron'} chosen before finishing — go back to Class Features.`)
      return
    }
    if (toolProficiencyOptions(selectedBackground?.tool_proficiency ?? null) && !chosenToolProficiency) {
      setError(`${selectedBackground?.name} needs its tool proficiency choice made before finishing — go back to Background.`)
      return
    }
    setSaving(true)
    setError(null)

    const hitDie = selectedClass?.hit_die ?? 8
    const conMod = abilityModifier(finalScore('constitution'))
    // Hill Dwarf's Dwarven Toughness and Draconic Bloodline's Draconic Resilience both add
    // +1 HP at level 1 (and +1 per level thereafter, which will matter once leveling exists) —
    // found missing entirely, silently dropped from every Hill Dwarf and Draconic Sorcerer.
    const subraceHpBonus = selectedSubrace?.name === 'Hill Dwarf' ? 1 : 0
    const subclassHpBonus = selectedSubclass?.name === 'Draconic Bloodline' ? 1 : 0
    // Tough feat (Variant Human only): +2x level at the level you take it — at level 1 that's +2.
    // Found silently dropped along with Alert's initiative bonus below: feat "grants" data
    // existed in the seed but was never actually applied to computed stats.
    const toughHpBonus = variantHumanFeat?.name === 'Tough' ? 2 : 0
    const maxHp = hitDie + conMod + subraceHpBonus + subclassHpBonus + toughHpBonus

    const { data: character, error: charErr } = await supabase
      .from('characters')
      .insert({
        name,
        species_id: speciesId,
        species_subrace_id: subraceId,
        draconic_ancestry: draconicAncestry,
        favored_enemy: rangerFavoredEnemy,
        favored_terrain: rangerFavoredTerrain,
        class_id: classId,
        subclass_id: subclassId,
        background_id: backgroundId,
        alignment,
        level: 1,
        strength: finalScore('strength'),
        dexterity: finalScore('dexterity'),
        constitution: finalScore('constitution'),
        intelligence: finalScore('intelligence'),
        wisdom: finalScore('wisdom'),
        charisma: finalScore('charisma'),
        max_hp: maxHp,
        current_hp: maxHp,
        armor_class: computeAC(),
        initiative_bonus: abilityModifier(finalScore('dexterity')) + (variantHumanFeat?.name === 'Alert' ? 5 : 0),
        resilient_ability: resilientAbility,
        speed: selectedSpecies?.speed ?? 30,
        hit_dice_total: 1,
        hit_dice_remaining: 1,
        species_asi: speciesASI(),
        chosen_tool_proficiency: chosenToolProficiency,
      })
      .select()
      .single()

    if (charErr || !character) {
      setError(charErr?.message ?? 'Something went wrong saving the character.')
      setSaving(false)
      return
    }
    const characterId = character.id

    // currency: class gold option (rare in our verified 2014 data) or shop leftover budget
    const classGold = (!useShop && classEquipChoice)
      ? (selectedClass?.starting_equipment.find((o) => o.label === classEquipChoice)?.gold ?? 0)
      : 0
    const shopLeftoverGold = useShop ? Math.max(0, SHOP_BUDGET - shopCart.reduce((s, i) => s + i.cost_gp, 0)) : 0
    await supabase.from('character_currency').insert({ character_id: characterId, gp: Math.round(classGold + shopLeftoverGold) })

    // feats: fighting style, variant human feat
    const featInserts: { character_id: string; feat_id: string; source: string }[] = []
    const fsFeat = fightingStyles.find((f) => f.name === fightingStyle)
    if (fsFeat) featInserts.push({ character_id: characterId, feat_id: fsFeat.id, source: 'class_feature_l1' })
    if (variantHumanFeatId) featInserts.push({ character_id: characterId, feat_id: variantHumanFeatId, source: 'variant_human' })
    if (featInserts.length) await supabase.from('character_feats').insert(featInserts)

    // skills: background (fixed) + class choice + variant human bonus skill
    // Dedup by skill name: character_skills has a primary key on (character_id, skill_name),
    // and background/class/Variant-Human skill choices can legitimately overlap (e.g. Acolyte
    // background + Cleric class skills both offer Insight/Religion) — without this, the insert
    // would fail on a duplicate key and silently break character creation.
    const skillNames = new Set<string>()
    ;(selectedBackground?.skill_proficiencies ?? []).forEach((s: string) => skillNames.add(s))
    classSkills.forEach((s: string) => skillNames.add(s))
    if (variantHumanSkill) skillNames.add(variantHumanSkill)
    halfElfSkills.forEach((s: string) => skillNames.add(s))
    skilledFeatSkills.forEach((s: string) => skillNames.add(s))
    // Fixed species skill grants that need no choice — same class of gap as the earlier
    // missing cantrip auto-grants (Tiefling/Drow/Forest Gnome), just for skills instead.
    if (selectedSpecies?.name === 'Elf') skillNames.add('Perception') // Keen Senses
    if (selectedSpecies?.name === 'Half-Orc') skillNames.add('Intimidation') // Menacing
    const skillRows = Array.from(skillNames).map((s) => ({ character_id: characterId, skill_name: s, proficient: true }))
    if (skillRows.length) await supabase.from('character_skills').insert(skillRows)

    // languages
    const langRows = [{ character_id: characterId, language: 'Common', is_rare: false, source: 'default' }]
    selectedLanguages.forEach((l) => langRows.push({ character_id: characterId, language: l, is_rare: false, source: 'chosen' }))
    await supabase.from('character_languages').insert(langRows)

    // spells: class spells/cantrips, subclass always-prepared/granted spells, Magic Initiate spells
    const spellRows: { character_id: string; spell_id: string; is_prepared: boolean; is_always_known: boolean }[] = []
    const addSpell = (n: string, isPrepared: boolean, isAlwaysKnown: boolean) => {
      const sp = spells.find((s) => s.name === n)
      if (!sp) return
      const existing = spellRows.find((r) => r.spell_id === sp.id)
      if (existing) {
        // same collision risk as skills — e.g. a Life Domain Cleric choosing Bless as a prepared
        // pick would otherwise collide with the automatic domain grant of Bless. Keep whichever
        // flags are "more true" rather than inserting a duplicate row (character_spells has a
        // primary key on character_id+spell_id).
        existing.is_prepared = existing.is_prepared || isPrepared
        existing.is_always_known = existing.is_always_known || isAlwaysKnown
        return
      }
      spellRows.push({ character_id: characterId, spell_id: sp.id, is_prepared: isPrepared, is_always_known: isAlwaysKnown })
    }
    selectedCantrips.forEach((n) => addSpell(n, false, true))
    selectedSpells.forEach((n) => addSpell(n, selectedClass?.spellcasting_type === 'prepared', selectedClass?.spellcasting_type !== 'prepared'))
    if (selectedSubclass) {
      selectedSubclass.granted_spells.filter((g) => g.level === 1).forEach((g) => {
        g.spells.forEach((n) => addSpell(n, true, true))
      })
    }
    if (hasMagicInitiate) {
      miCantrips.forEach((n) => addSpell(n, false, true))
      if (miSpell) addSpell(miSpell, false, true)
    }
    // Fixed species-granted cantrips that need no choice, just automatic knowledge — found
    // missing entirely during the gap-hunting pass: these traits exist in the seed data
    // (Infernal Legacy, Drow Magic, Natural Illusionist) but were never actually applied.
    if (selectedSpecies?.name === 'Tiefling') addSpell('Thaumaturgy', false, true)
    if (selectedSubrace?.name === 'Drow') addSpell('Dancing Lights', false, true)
    if (selectedSubrace?.name === 'Forest Gnome') addSpell('Minor Illusion', false, true)
    if (highElfCantrip) addSpell(highElfCantrip, false, true)
    if (spellRows.length) await supabase.from('character_spells').insert(spellRows)

    // Spell slots — verified level-1 counts from the PHB tables: Bard/Cleric/Druid/Sorcerer all
    // get 2 first-level slots; Warlock's Pact Magic is a separate, smaller pool of just 1.
    // Wizard's 2 follows the same standard pattern as the others (not independently re-verified
    // via a table image the way the rest were, but very low risk — this number hasn't moved
    // between editions). Found completely missing: no caster of any class had slots recorded at all.
    if (castsAtLevel1 && selectedClass) {
      const slotCount = selectedClass.name === 'Warlock' ? 1 : 2
      await supabase.from('character_spell_slots').insert({ character_id: characterId, slot_level: 1, max_slots: slotCount, used_slots: 0 })
    }

    // Class resources — Rage, Bardic Inspiration, Second Wind, Lay on Hands. Same gap as spell
    // slots: these were never tracked anywhere despite being real level-1 limited-use pools.
    // Martial Arts (Monk) and Sneak Attack (Rogue) are deliberately excluded — they're passive
    // scaling traits (die size / once-per-turn), not resource pools with a recharge.
    const chaMod = abilityModifier(finalScore('charisma'))
    const resourceMap: Record<string, { name: string; max: number; recharge: string }> = {
      Barbarian: { name: 'Rage', max: 2, recharge: 'long_rest' },
      Bard: { name: 'Bardic Inspiration', max: Math.max(1, chaMod), recharge: 'long_rest' },
      Fighter: { name: 'Second Wind', max: 1, recharge: 'short_rest' },
      Paladin: { name: 'Lay on Hands Pool', max: 5, recharge: 'long_rest' }, // 5 x level, level 1
    }
    const resource = selectedClass ? resourceMap[selectedClass.name] : undefined
    if (resource) {
      await supabase.from('character_resources').insert({
        character_id: characterId, name: resource.name, max_value: resource.max, current_value: resource.max, recharge: resource.recharge,
      })
    }
    // Lucky feat (Variant Human only) — 3 luck points, long rest. A feat effect rather than a
    // class one, so handled separately from resourceMap above.
    if (variantHumanFeat?.name === 'Lucky') {
      await supabase.from('character_resources').insert({ character_id: characterId, name: 'Luck Points', max_value: 3, current_value: 3, recharge: 'long_rest' })
    }

    // equipment: class choice (or shop cart) + background's fixed kit, with pack items
    // instantiated as real containers (a container row + child rows for its contents,
    // linked via parent_inventory_id) rather than a single flat "Explorer's Pack" line.
    const findCatalogItem = (n: string) =>
      itemsCatalog.find((i) => i.name.toLowerCase() === n.toLowerCase())
      ?? itemsCatalog.find((i) => n.toLowerCase().includes(i.name.toLowerCase()))

    async function insertItemByName(name: string, quantity: number, parentId: string | null = null) {
      const catalogItem = findCatalogItem(name)
      const { data: row } = await supabase.from('character_inventory').insert({
        character_id: characterId,
        item_id: catalogItem?.id ?? null,
        item_name: catalogItem ? null : name,
        quantity,
        parent_inventory_id: parentId,
      }).select().single()
      // If this item is itself a container (a pack), expand its real contents as child rows.
      if (catalogItem?.is_container && row) {
        const contents = packContents.filter((pc) => pc.pack_item_id === catalogItem.id)
        for (const c of contents) {
          const contentItem = itemsCatalog.find((i) => i.id === c.content_item_id)
          if (contentItem) await insertItemByName(contentItem.name, c.quantity, row.id)
        }
      }
    }

    if (useShop) {
      for (const cartItem of shopCart) {
        await insertItemByName(cartItem.name, 1, null)
      }
    } else if (classEquipChoice) {
      const opt = selectedClass?.starting_equipment.find((o) => o.label === classEquipChoice)
      for (const line of opt?.items ?? []) {
        const { alwaysItems, weaponOptions, weaponFilter } = parseEquipLine(line)
        for (const it of alwaysItems) {
          await insertItemByName(it, 1, null)
        }
        if (weaponOptions.length > 0 || weaponFilter) {
          let resolvedName = weaponOverrides[line]
          if (!resolvedName) {
            if (weaponOptions.length > 0) resolvedName = weaponOptions[0]
            else if (weaponFilter) {
              const match = weaponCatalog.find((w: any) => w.weapon_category === weaponFilter.category && (weaponFilter.range === 'any' || w.weapon_range === weaponFilter.range))
              resolvedName = match?.name
            }
          }
          if (resolvedName) await insertItemByName(resolvedName, 1, null)
        }
      }
    }
    if (selectedBackground) {
      for (const e of selectedBackground.equipment) {
        await insertItemByName(e.item, e.qty, null)
      }
    }

    window.location.href = `/character/${characterId}`
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl text-candle mb-1">A New Soul Enters Barovia</h1>
      <p className="text-parchment/60 text-sm mb-2">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
      <p className="text-parchment/70 text-sm mb-6 max-w-2xl">{STEP_INTROS[step]}</p>

      <div className="flex gap-1.5 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 min-w-[16px] rounded-full ${i <= step ? 'bg-blood-bright' : 'bg-mist'}`} />
        ))}
      </div>

      <div className="panel rounded-sm p-6">
        {step === 0 && (
          <SpeciesStep
            name={name} setName={setName}
            speciesList={speciesList} speciesId={speciesId} setSpeciesId={setSpeciesId}
            hasSubraces={hasSubraces} subracesForSpecies={subracesForSpecies} subraceId={subraceId} setSubraceId={setSubraceId}
            isHuman={isHuman} isVariantHuman={isVariantHuman} setIsVariantHuman={setIsVariantHuman}
            variantHumanAbilities={variantHumanAbilities} setVariantHumanAbilities={setVariantHumanAbilities}
            variantHumanSkill={variantHumanSkill} setVariantHumanSkill={setVariantHumanSkill}
            originFeats={originFeats} variantHumanFeatId={variantHumanFeatId} setVariantHumanFeatId={setVariantHumanFeatId}
            resilientAbility={resilientAbility} setResilientAbility={setResilientAbility}
            athleteAbility={athleteAbility} setAthleteAbility={setAthleteAbility}
            skilledFeatSkills={skilledFeatSkills} setSkilledFeatSkills={setSkilledFeatSkills}
            isHalfElf={isHalfElf} halfElfBonusAbilities={halfElfBonusAbilities} setHalfElfBonusAbilities={setHalfElfBonusAbilities}
            isHighElf={isHighElf} wizardCantripOptions={wizardCantripOptions} highElfCantrip={highElfCantrip} setHighElfCantrip={setHighElfCantrip}
            halfElfSkills={halfElfSkills} setHalfElfSkills={setHalfElfSkills}
            isDragonborn={isDragonborn} ancestryList={ancestryList} draconicAncestry={draconicAncestry} setDraconicAncestry={setDraconicAncestry}
            hasMagicInitiate={hasMagicInitiate} miClassName={miClassName} setMiClassName={setMiClassName}
            miCantripOptions={miCantripOptions} miSpellOptions={miSpellOptions}
            miCantrips={miCantrips} setMiCantrips={setMiCantrips} miSpell={miSpell} setMiSpell={setMiSpell}
          />
        )}
        {step === 1 && <ClassStep classList={classList} classId={classId} setClassId={setClassId} />}
        {step === 2 && (
          <ClassFeaturesStep
            selectedClass={selectedClass} needsSubclassAtL1={needsSubclassAtL1}
            fightingStyles={fightingStyles} fightingStyle={fightingStyle} setFightingStyle={setFightingStyle}
            subclassesForClass={subclassesForClass} subclassId={subclassId} setSubclassId={setSubclassId}
            rangerFavoredEnemy={rangerFavoredEnemy} setRangerFavoredEnemy={setRangerFavoredEnemy}
            rangerFavoredTerrain={rangerFavoredTerrain} setRangerFavoredTerrain={setRangerFavoredTerrain}
          />
        )}
        {step === 3 && <ClassSkillsStep selectedClass={selectedClass} classSkills={classSkills} setClassSkills={setClassSkills} />}
        {step === 4 && (
          <BackgroundStep
            backgroundList={backgroundList} backgroundId={backgroundId} setBackgroundId={setBackgroundId}
            chosenToolProficiency={chosenToolProficiency} setChosenToolProficiency={setChosenToolProficiency}
          />
        )}
        {step === 5 && (
          <AbilityScoreStep
            selectedSpecies={selectedSpecies} selectedSubrace={selectedSubrace}
            scores={scores} adjustScore={adjustScore} finalScore={finalScore} modifier={modifier} speciesASI={speciesASI()}
          />
        )}
        {step === 6 && (
          <LanguagesStep selectedBackground={selectedBackground} speciesExtraLanguages={speciesExtraLanguages} selectedLanguages={selectedLanguages} setSelectedLanguages={setSelectedLanguages} />
        )}
        {step === 7 && (
          <SpellsStep
            selectedClass={selectedClass} castsAtLevel1={castsAtLevel1}
            classCantrips={classCantrips} classSpells={classSpells}
            selectedCantrips={selectedCantrips} setSelectedCantrips={setSelectedCantrips}
            selectedSpells={selectedSpells} setSelectedSpells={setSelectedSpells}
            spellCount={spellCountFor()} selectedSubclass={selectedSubclass}
          />
        )}
        {step === 8 && (
          <EquipmentStep
            selectedClass={selectedClass} classEquipChoice={classEquipChoice} setClassEquipChoice={setClassEquipChoice} selectedBackground={selectedBackground}
            weaponOverrides={weaponOverrides} setWeaponOverrides={setWeaponOverrides} weaponCatalog={weaponCatalog} packContentsMap={packContentsMap}
            useShop={useShop} setUseShop={setUseShop} shopCatalog={shopCatalog} shopCart={shopCart} addToCart={addToCart} removeFromCart={removeFromCart} shopBudget={SHOP_BUDGET}
          />
        )}
        {step === 9 && (
          <ReviewStep
            name={name} selectedSpecies={selectedSpecies} selectedSubrace={selectedSubrace}
            isVariantHuman={isVariantHuman} variantHumanFeat={variantHumanFeat} variantHumanSkill={variantHumanSkill}
            draconicAncestry={draconicAncestry} highElfCantrip={highElfCantrip} halfElfSkills={halfElfSkills}
            skilledFeatSkills={skilledFeatSkills}
            rangerFavoredEnemy={rangerFavoredEnemy} rangerFavoredTerrain={rangerFavoredTerrain}
            selectedClass={selectedClass} selectedSubclass={selectedSubclass} fightingStyle={fightingStyle}
            classSkills={classSkills} selectedBackground={selectedBackground}
            selectedLanguages={selectedLanguages} selectedCantrips={selectedCantrips} selectedSpells={selectedSpells}
            classEquipChoice={classEquipChoice} useShop={useShop} shopCart={shopCart} weaponOverrides={weaponOverrides} alignment={alignment} setAlignment={setAlignment}
            chosenToolProficiency={chosenToolProficiency}
            error={error} saving={saving} onSubmit={handleSubmit}
          />
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="text-sm text-parchment/60 hover:text-candle disabled:opacity-30">Back</button>
        {step < STEPS.length - 1 && (
          <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="text-sm text-candle hover:text-parchment">Next</button>
        )}
      </div>
    </main>
  )
}

// ---------- Shared UI ----------
function ListDetail<T extends { id: string; name: string }>({ items, selectedId, onSelect, renderDetail }: {
  items: T[]; selectedId: string | null; onSelect: (id: string) => void; renderDetail: (item: T) => React.ReactNode
}) {
  const active = items.find((i) => i.id === selectedId) ?? items[0]
  return (
    <div className="grid grid-cols-[220px_1fr] gap-0 min-h-[280px]">
      <div className="border-r border-mist pr-1 max-h-[400px] overflow-y-auto">
        {items.map((i) => (
          <div key={i.id} onClick={() => onSelect(i.id)}
            className={`px-3.5 py-2.5 font-display text-sm cursor-pointer border-l-2 transition-colors ${i.id === selectedId ? 'border-candle bg-blood/20 text-candle' : 'border-transparent text-parchment/75 hover:bg-candle/5 hover:text-parchment'}`}>
            {i.name}
          </div>
        ))}
      </div>
      <div className="px-5">{active ? renderDetail(active) : <p className="text-parchment/40 text-xs italic">Select an option to see details.</p>}</div>
    </div>
  )
}
function DTitle({ children }: { children: React.ReactNode }) { return <div className="font-display text-lg text-candle mb-1">{children}</div> }
function DMeta({ children }: { children: React.ReactNode }) { return <div className="text-xs text-parchment/50 mb-3">{children}</div> }
function DBlurb({ children }: { children: React.ReactNode }) { return <div className="text-sm text-parchment/85 leading-relaxed mb-3.5">{children}</div> }
function DTrait({ name, desc }: { name: string; desc: string }) {
  return <div className="mb-2.5"><div className="font-display text-sm text-candle">{name}</div><div className="text-sm text-parchment/80 leading-snug">{desc}</div></div>
}
function Chip({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span onClick={disabled ? undefined : onClick}
      className={`inline-block border rounded-full px-3 py-1 text-sm mr-1.5 mb-1.5 transition-colors ${disabled ? 'opacity-30 cursor-default border-mist' : selected ? 'border-candle bg-blood/30 text-candle cursor-pointer' : 'border-mist hover:border-candle/50 cursor-pointer'}`}>
      {children}
    </span>
  )
}

// ---------- Step components ----------
function SpeciesStep(props: any) {
  const {
    name, setName, speciesList, speciesId, setSpeciesId, hasSubraces, subracesForSpecies, subraceId, setSubraceId,
    isHuman, isVariantHuman, setIsVariantHuman, variantHumanAbilities, setVariantHumanAbilities, variantHumanSkill, setVariantHumanSkill,
    originFeats, variantHumanFeatId, setVariantHumanFeatId, resilientAbility, setResilientAbility, athleteAbility, setAthleteAbility, skilledFeatSkills, setSkilledFeatSkills, isHalfElf, halfElfBonusAbilities, setHalfElfBonusAbilities,
    isDragonborn, ancestryList, draconicAncestry, setDraconicAncestry,
    isHighElf, wizardCantripOptions, highElfCantrip, setHighElfCantrip, halfElfSkills, setHalfElfSkills,
    hasMagicInitiate, miClassName, setMiClassName, miCantripOptions, miSpellOptions, miCantrips, setMiCantrips, miSpell, setMiSpell,
  } = props

  function toggleVariantAbility(a: string) {
    setVariantHumanAbilities((prev: string[]) => prev.includes(a) ? prev.filter((x) => x !== a) : prev.length >= 2 ? prev : [...prev, a])
  }
  function toggleHalfElfAbility(a: string) {
    setHalfElfBonusAbilities((prev: string[]) => prev.includes(a) ? prev.filter((x) => x !== a) : prev.length >= 2 ? prev : [...prev, a])
  }
  function toggleHalfElfSkill(sk: string) {
    setHalfElfSkills((prev: string[]) => prev.includes(sk) ? prev.filter((x) => x !== sk) : prev.length >= 2 ? prev : [...prev, sk])
  }
  function toggleSkilledSkill(sk: string) {
    setSkilledFeatSkills((prev: string[]) => prev.includes(sk) ? prev.filter((x) => x !== sk) : prev.length >= 3 ? prev : [...prev, sk])
  }
  function toggleMiCantrip(n: string) {
    setMiCantrips((prev: string[]) => prev.includes(n) ? prev.filter((x) => x !== n) : prev.length >= 2 ? prev : [...prev, n])
  }

  return (
    <div>
      <label className="block font-utility text-xs uppercase tracking-wide text-parchment/60 mb-2">Character name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-ink border border-mist rounded-sm px-3 py-2 mb-6 text-parchment"
        placeholder="e.g. a cousin of Ismark, freshly arrived from the mists" />
      <h2 className="font-display text-xl text-candle mb-3">Choose your species</h2>
      <ListDetail items={speciesList} selectedId={speciesId} onSelect={(id: string) => { setSpeciesId(id); setSubraceId(null); setDraconicAncestry(null) }}
        renderDetail={(s: Species) => (
          <>
            <DTitle>{s.name}</DTitle>
            <DMeta>Speed {s.speed}ft · Ability bonus: {Object.entries(s.ability_score_increase).map(([k, v]) => `${k.slice(0,3).toUpperCase()} +${v}`).join(', ')}</DMeta>
            {s.traits.map((t) => <DTrait key={t.name} name={t.name} desc={t.description} />)}
          </>
        )} />

      {hasSubraces && speciesId && (
        <>
          <h3 className="font-display text-sm text-candle mt-6 mb-2">Choose a subrace</h3>
          <ListDetail items={subracesForSpecies} selectedId={subraceId} onSelect={setSubraceId}
            renderDetail={(r: SpeciesSubrace) => (
              <>
                <DTitle>{r.name}</DTitle>
                <DMeta>Ability bonus: {Object.entries(r.ability_score_increase).map(([k, v]) => `${k.slice(0,3).toUpperCase()} +${v}`).join(', ')}</DMeta>
                {r.traits.map((t) => <DTrait key={t.name} name={t.name} desc={t.description} />)}
              </>
            )} />
        </>
      )}

      {isHighElf && (
        <>
          <h3 className="font-display text-sm text-candle mt-6 mb-2">High Elf: choose 1 free Wizard cantrip</h3>
          {wizardCantripOptions.map((sp: Spell) => (
            <Tooltip key={sp.id} label={<Chip selected={highElfCantrip === sp.name} onClick={() => setHighElfCantrip(sp.name)}>{sp.name}</Chip>}
              title={sp.name} subtitle={`Cantrip · ${sp.school}`} body={sp.description} className="inline-block" />
          ))}
        </>
      )}

      {isHalfElf && (
        <>
          <h3 className="font-display text-sm text-candle mt-6 mb-2">Choose 2 other abilities for +1 each (not Charisma, already +2)</h3>
          {ABILITY_KEYS.filter((a) => a !== 'charisma').map((a) => (
            <Chip key={a} selected={halfElfBonusAbilities.includes(a)} onClick={() => toggleHalfElfAbility(a)}>{a}</Chip>
          ))}
          <h3 className="font-display text-sm text-candle mt-5 mb-2">Skill Versatility: choose 2 skills</h3>
          {ALL_SKILLS.map((sk: string) => (
            <Chip key={sk} selected={halfElfSkills.includes(sk)} onClick={() => toggleHalfElfSkill(sk)}>{sk}</Chip>
          ))}
        </>
      )}

      {isDragonborn && (
        <>
          <h3 className="font-display text-sm text-candle mt-6 mb-2">Choose a Draconic Ancestry</h3>
          <p className="text-parchment/40 text-xs italic mb-2">Determines your Breath Weapon's damage type/shape/save, and your damage resistance.</p>
          {ancestryList.map((a: DraconicAncestry) => (
            <Tooltip key={a.id}
              label={<Chip selected={draconicAncestry === a.dragon_type} onClick={() => setDraconicAncestry(a.dragon_type)}>{a.dragon_type}</Chip>}
              title={a.dragon_type} subtitle={`${a.damage_type} damage`}
              body={`Breath Weapon: ${a.breath_weapon_shape} (${a.breath_weapon_save} save). Damage resistance: ${a.damage_type}.`}
              className="inline-block" />
          ))}
        </>
      )}

      {isHuman && (
        <>
          <h3 className="font-display text-sm text-candle mt-6 mb-2">Standard or Variant Human?</h3>
          <p className="text-parchment/40 text-xs italic mb-2">Variant Human is an optional PHB rule — check with your DM. It trades the flat +1-to-all-six for 2 chosen abilities +1 each, a bonus skill, and a bonus feat.</p>
          <Chip selected={!isVariantHuman} onClick={() => setIsVariantHuman(false)}>Standard (+1 to all six)</Chip>
          <Chip selected={isVariantHuman} onClick={() => setIsVariantHuman(true)}>Variant (2 abilities, 1 skill, 1 feat)</Chip>

          {isVariantHuman && (
            <>
              <h3 className="font-display text-sm text-candle mt-5 mb-2">Choose 2 different abilities for +1 each</h3>
              {ABILITY_KEYS.map((a) => (
                <Chip key={a} selected={variantHumanAbilities.includes(a)} onClick={() => toggleVariantAbility(a)}>{a}</Chip>
              ))}
              <h3 className="font-display text-sm text-candle mt-5 mb-2">Choose 1 bonus skill</h3>
              {ALL_SKILLS.map((sk: string) => (
                <Chip key={sk} selected={variantHumanSkill === sk} onClick={() => setVariantHumanSkill(sk)}>{sk}</Chip>
              ))}
              <h3 className="font-display text-sm text-candle mt-5 mb-2">Choose 1 feat</h3>
              {originFeats.map((f: Feat) => (
                <Tooltip key={f.id} label={<Chip selected={variantHumanFeatId === f.id} onClick={() => setVariantHumanFeatId(f.id)}>{f.name}</Chip>}
                  title={f.name} subtitle={f.prerequisite ?? undefined} body={f.description} className="inline-block" />
              ))}
              {originFeats.find((f: Feat) => f.id === variantHumanFeatId)?.name === 'Resilient' && (
                <div className="mt-4">
                  <h4 className="font-display text-xs text-candle mb-2">Resilient: choose which ability gets +1 and save proficiency</h4>
                  {ABILITY_KEYS.map((a) => (
                    <Chip key={a} selected={resilientAbility === a} onClick={() => setResilientAbility(a)}>{a}</Chip>
                  ))}
                </div>
              )}
              {originFeats.find((f: Feat) => f.id === variantHumanFeatId)?.name === 'Athlete' && (
                <div className="mt-4">
                  <h4 className="font-display text-xs text-candle mb-2">Athlete: choose which ability gets +1</h4>
                  {['strength', 'dexterity'].map((a) => (
                    <Chip key={a} selected={athleteAbility === a} onClick={() => setAthleteAbility(a)}>{a}</Chip>
                  ))}
                </div>
              )}
              {originFeats.find((f: Feat) => f.id === variantHumanFeatId)?.name === 'Skilled' && (
                <div className="mt-4">
                  <h4 className="font-display text-xs text-candle mb-2">Skilled: choose 3 skills (tool proficiencies from this feat aren't tracked yet)</h4>
                  {ALL_SKILLS.map((sk: string) => (
                    <Chip key={sk} selected={skilledFeatSkills.includes(sk)} onClick={() => toggleSkilledSkill(sk)}>{sk}</Chip>
                  ))}
                </div>
              )}
              {hasMagicInitiate && (
                <div className="mt-5 pt-4 border-t border-mist">
                  <h3 className="font-display text-sm text-candle mb-2">Magic Initiate: choose a source class</h3>
                  {MI_CLASSES_LOCAL.map((cn) => (
                    <Chip key={cn} selected={miClassName === cn} onClick={() => { setMiClassName(cn); setMiCantrips([]); setMiSpell(null) }}>{cn}</Chip>
                  ))}
                  {miClassName && (
                    <>
                      <h4 className="font-display text-xs text-candle mt-4 mb-2">Cantrips (choose 2)</h4>
                      {miCantripOptions.map((sp: Spell) => (
                        <Tooltip key={sp.id} label={<Chip selected={miCantrips.includes(sp.name)} disabled={!miCantrips.includes(sp.name) && miCantrips.length >= 2} onClick={() => toggleMiCantrip(sp.name)}>{sp.name}</Chip>}
                          title={sp.name} subtitle={`Cantrip · ${sp.school}`} body={sp.description} className="inline-block" />
                      ))}
                      <h4 className="font-display text-xs text-candle mt-4 mb-2">1st-level spell (choose 1)</h4>
                      {miSpellOptions.map((sp: Spell) => (
                        <Tooltip key={sp.id} label={<Chip selected={miSpell === sp.name} onClick={() => setMiSpell(sp.name)}>{sp.name}</Chip>}
                          title={sp.name} subtitle={`1st level · ${sp.school}`} body={sp.description} className="inline-block" />
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
const MI_CLASSES_LOCAL = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']

function ClassStep({ classList, classId, setClassId }: any) {
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-3">Choose your class</h2>
      <ListDetail items={classList} selectedId={classId} onSelect={setClassId}
        renderDetail={(c: ClassRow) => (
          <>
            <DTitle>{c.name}</DTitle>
            <DMeta>
              Hit Die d{c.hit_die} · Primary: {c.primary_ability.join('/')}
              {c.spellcasting_type ? ` · ${c.spellcasting_type} caster${c.spellcasting_starts_at_level > 1 ? ` (from level ${c.spellcasting_starts_at_level})` : ''}` : ' · non-caster'}
            </DMeta>
            {c.starting_equipment?.length > 0 && (
              <DTrait name="Starting Equipment" desc={c.starting_equipment.map((o: any) => o.items ? `Option ${o.label}: ${o.items.join(', ')}` : `Option ${o.label}: ${o.gold} gp instead`).join(' · ')} />
            )}
            {c.subclass_starts_at_level && <DTrait name="Subclass chosen at" desc={`Level ${c.subclass_starts_at_level}`} />}
          </>
        )} />
    </div>
  )
}

function ClassFeaturesStep({ selectedClass, needsSubclassAtL1, fightingStyles, fightingStyle, setFightingStyle, subclassesForClass, subclassId, setSubclassId, rangerFavoredEnemy, setRangerFavoredEnemy, rangerFavoredTerrain, setRangerFavoredTerrain }: any) {
  if (!selectedClass) return <p className="text-parchment/40 text-sm italic">Pick a class first.</p>
  if (selectedClass.name === 'Fighter') {
    return (
      <div>
        <h2 className="font-display text-xl text-candle mb-1">Fighting Style</h2>
        <p className="text-parchment/40 text-xs italic mb-3">Choose one.</p>
        <ListDetail items={fightingStyles.map((f: Feat) => ({ id: f.name, name: f.name, description: f.description }))} selectedId={fightingStyle} onSelect={setFightingStyle}
          renderDetail={(f: any) => (<><DTitle>{f.name}</DTitle><DBlurb>{f.description}</DBlurb></>)} />
      </div>
    )
  }
  if (needsSubclassAtL1) {
    const label = selectedClass.name === 'Cleric' ? 'Divine Domain' : selectedClass.name === 'Sorcerer' ? 'Sorcerous Origin' : 'Otherworldly Patron'
    return (
      <div>
        <h2 className="font-display text-xl text-candle mb-1">{label}</h2>
        <p className="text-parchment/40 text-xs italic mb-3">{selectedClass.name} chooses this right at level 1.</p>
        <ListDetail items={subclassesForClass} selectedId={subclassId} onSelect={setSubclassId}
          renderDetail={(sc: Subclass) => (
            <>
              <DTitle>{sc.name}</DTitle>
              {sc.features.filter((f) => f.level === 1).map((f) => <DTrait key={f.name} name={f.name} desc={f.description} />)}
              {sc.granted_spells.filter((g) => g.level === 1).map((g, i) => (
                <DTrait key={i} name="Granted Spells" desc={g.spells.join(', ') + (selectedClass.name === 'Warlock' ? ' (added to your known spell options)' : ' (always prepared, free)')} />
              ))}
            </>
          )} />
      </div>
    )
  }
  if (selectedClass.name === 'Ranger') {
    return (
      <div>
        <h2 className="font-display text-xl text-candle mb-1">Favored Enemy & Natural Explorer</h2>
        <p className="text-parchment/40 text-xs italic mb-3">Rangers make both these choices at level 1.</p>
        <h3 className="font-display text-sm text-candle mb-2">Favored Enemy</h3>
        {FAVORED_ENEMY_TYPES.map((t) => (
          <Chip key={t} selected={rangerFavoredEnemy === t} onClick={() => setRangerFavoredEnemy(t)}>{t}</Chip>
        ))}
        <h3 className="font-display text-sm text-candle mt-4 mb-2">Natural Explorer (favored terrain)</h3>
        {FAVORED_TERRAIN_TYPES.map((t) => (
          <Chip key={t} selected={rangerFavoredTerrain === t} onClick={() => setRangerFavoredTerrain(t)}>{t}</Chip>
        ))}
      </div>
    )
  }
  return <p className="text-parchment/40 text-sm italic">{selectedClass.name} has no additional choice at level 1 — its subclass comes at level {selectedClass.subclass_starts_at_level}.</p>
}

function ClassSkillsStep({ selectedClass, classSkills, setClassSkills }: any) {
  if (!selectedClass) return <p className="text-parchment/40 text-sm italic">Pick a class first.</p>
  const choose = selectedClass.skill_choices?.choose ?? 0
  const from: string[] = selectedClass.skill_choices?.from?.[0] === 'any' ? ALL_SKILLS : (selectedClass.skill_choices?.from ?? [])
  function toggle(sk: string) {
    setClassSkills((prev: string[]) => prev.includes(sk) ? prev.filter((x) => x !== sk) : prev.length >= choose ? prev : [...prev, sk])
  }
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-2">{selectedClass.name} skills</h2>
      <p className="text-parchment/40 text-xs italic mb-3">Choose {choose}.</p>
      {from.map((sk) => {
        const on = classSkills.includes(sk)
        const disabled = !on && classSkills.length >= choose
        return <Chip key={sk} selected={on} disabled={disabled} onClick={() => toggle(sk)}>{sk}</Chip>
      })}
    </div>
  )
}

function BackgroundStep({ backgroundList, backgroundId, setBackgroundId, chosenToolProficiency, setChosenToolProficiency }: any) {
  const selected = backgroundList.find((b: Background) => b.id === backgroundId)
  const toolOptions = selected ? toolProficiencyOptions(selected.tool_proficiency) : null
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-3">Choose your background</h2>
      <ListDetail items={backgroundList} selectedId={backgroundId}
        onSelect={(id: string) => { setBackgroundId(id); setChosenToolProficiency(null) }}
        renderDetail={(b: Background) => (
          <>
            <DTitle>{b.name}</DTitle>
            <DTrait name="Skill Proficiencies (fixed)" desc={b.skill_proficiencies.join(', ')} />
            {b.tool_proficiency && <DTrait name="Tool Proficiency" desc={b.tool_proficiency} />}
            {b.bonus_languages > 0 && <DTrait name="Bonus Languages" desc={`${b.bonus_languages} of your choice`} />}
            {b.feature_name && <DTrait name={`Feature: ${b.feature_name}`} desc={b.feature_description ?? ''} />}
            <DTrait name="Starting Equipment" desc={b.equipment.map((e) => `${e.qty}× ${e.item}`).join(', ')} />
          </>
        )} />
      {toolOptions && (
        <div className="mt-5">
          <h3 className="font-display text-sm text-candle mb-2">
            {selected.tool_proficiency.match(/gaming set/i) ? 'Choose your Gaming Set'
              : selected.tool_proficiency.match(/artisan/i) ? "Choose your Artisan's Tools"
              : 'Choose your Musical Instrument'}
          </h3>
          {toolOptions.map((opt: string) => (
            <Chip key={opt} selected={chosenToolProficiency === opt} onClick={() => setChosenToolProficiency(opt)}>{opt}</Chip>
          ))}
        </div>
      )}
    </div>
  )
}

function AbilityScoreStep({ selectedSpecies, selectedSubrace, scores, adjustScore, finalScore, modifier, speciesASI }: any) {
  const spent = ABILITY_KEYS.reduce((sum, k) => sum + pbCost(scores[k]), 0)
  const remaining = PB_BUDGET - spent
  return (
    <div>
      {selectedSpecies && (
        <p className="text-parchment/40 text-xs italic mb-4">
          {selectedSpecies.name}{selectedSubrace ? ` (${selectedSubrace.name})` : ''} ability bonus already applied: {Object.entries(speciesASI).map(([k, v]) => `${(k as string).slice(0,3).toUpperCase()} +${v}`).join(', ') || 'none yet — pick a species first'}.
        </p>
      )}
      <div className="flex justify-between items-baseline mb-4">
        <span />
        <span className="font-display text-candle text-sm">{remaining} / {PB_BUDGET} points remaining</span>
      </div>
      {ABILITY_KEYS.map((ab) => {
        const score = scores[ab]
        const nextCost = pbCost(score + 1) - pbCost(score)
        const canInc = score < 15 && remaining - nextCost >= 0
        const canDec = score > 8
        return (
          <div key={ab} className="flex justify-between items-center py-2 border-b border-mist/50 last:border-none text-sm">
            <div><div className="capitalize">{ab}</div><div className="text-parchment/40 text-xs max-w-[300px]">{ABILITY_BLURBS[ab]}</div></div>
            <div className="flex items-center gap-2.5">
              <button disabled={!canDec} onClick={() => adjustScore(ab, -1)} className="w-[26px] h-[26px] rounded-full border border-mist disabled:opacity-25 hover:border-candle hover:text-candle">−</button>
              <button disabled={!canInc} onClick={() => adjustScore(ab, 1)} className="w-[26px] h-[26px] rounded-full border border-mist disabled:opacity-25 hover:border-candle hover:text-candle">+</button>
              <span className="font-display text-[22px] min-w-[34px] text-center">{finalScore(ab)}</span>
              <span className="text-parchment/50 text-xs w-8 text-right">{modifier(finalScore(ab))}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LanguagesStep({ selectedBackground, speciesExtraLanguages, selectedLanguages, setSelectedLanguages }: any) {
  const count = (selectedBackground?.bonus_languages ?? 0) + (speciesExtraLanguages ?? 0)
  function toggle(l: string) {
    setSelectedLanguages((prev: string[]) => prev.includes(l) ? prev.filter((x) => x !== l) : prev.length >= count ? prev : [...prev, l])
  }
  if (count === 0) {
    return <p className="text-parchment/40 text-sm italic">{selectedBackground ? `${selectedBackground.name} doesn't grant any bonus languages beyond Common, and your species doesn't either.` : 'Pick a species and background first.'}</p>
  }
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-2">Languages</h2>
      <p className="text-parchment/40 text-xs italic mb-3">
        Common (automatic) + choose {count}{selectedBackground ? ` (${selectedBackground.bonus_languages ?? 0} from ${selectedBackground.name}${speciesExtraLanguages ? `, ${speciesExtraLanguages} from species` : ''})` : ''}:
      </p>
      {STANDARD_LANGUAGES.filter((l) => l !== 'Common').map((l) => {
        const on = selectedLanguages.includes(l)
        const disabled = !on && selectedLanguages.length >= count
        return <Chip key={l} selected={on} disabled={disabled} onClick={() => toggle(l)}>{l}</Chip>
      })}
    </div>
  )
}

function SpellsStep({ selectedClass, castsAtLevel1, classCantrips, classSpells, selectedCantrips, setSelectedCantrips, selectedSpells, setSelectedSpells, spellCount, selectedSubclass }: any) {
  if (!selectedClass) return <p className="text-parchment/40 text-sm italic">Pick a class first.</p>
  if (!castsAtLevel1) {
    return <p className="text-parchment/40 text-sm italic">{selectedClass.name} {selectedClass.spellcasting_type ? `doesn't get Spellcasting until level ${selectedClass.spellcasting_starts_at_level}` : 'does not cast spells'} — nothing to pick here at level 1.</p>
  }
  const cantripCount = selectedClass.cantrips_known_at_1 ?? 0
  function toggleCantrip(n: string) { setSelectedCantrips((prev: string[]) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]) }
  function toggleSpell(n: string) { setSelectedSpells((prev: string[]) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]) }
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-3">{selectedClass.name} Spells</h2>
      {classCantrips.length > 0 ? (
        <>
          <h3 className="font-display text-sm text-candle mb-2">Cantrips (choose {cantripCount})</h3>
          {classCantrips.map((sp: Spell) => {
            const on = selectedCantrips.includes(sp.name)
            const disabled = !on && selectedCantrips.length >= cantripCount
            return <Tooltip key={sp.id} label={<Chip selected={on} disabled={disabled} onClick={() => toggleCantrip(sp.name)}>{sp.name}</Chip>} title={sp.name} subtitle={`Cantrip · ${sp.school}`} body={sp.description} className="inline-block" />
          })}
        </>
      ) : <p className="text-parchment/40 text-xs italic">{selectedClass.name} does not get cantrips at level 1.</p>}
      {classSpells.length > 0 && (
        <>
          <h3 className="font-display text-sm text-candle mt-5 mb-2">{selectedClass.spellcasting_type === 'prepared' ? 'Prepared spells' : 'Spells known'} (choose {spellCount})</h3>
          {classSpells.map((sp: Spell) => {
            const on = selectedSpells.includes(sp.name)
            const disabled = !on && selectedSpells.length >= spellCount
            return <Tooltip key={sp.id} label={<Chip selected={on} disabled={disabled} onClick={() => toggleSpell(sp.name)}>{sp.name}</Chip>} title={sp.name} subtitle={`1st level · ${sp.school}`} body={sp.description} className="inline-block" />
          })}
        </>
      )}
      {selectedSubclass && selectedSubclass.granted_spells.some((g: any) => g.level === 1) && (
        <p className="text-parchment/40 text-xs italic mt-3">
          Your {selectedSubclass.name} also {selectedClass.name === 'Warlock' ? 'adds' : 'always has prepared'}: {selectedSubclass.granted_spells.find((g: any) => g.level === 1).spells.join(', ')} — not counted against your picks above.
        </p>
      )}
    </div>
  )
}

// Parses a starting-equipment line into:
//  - alwaysItems: items granted no matter what (e.g. armor/daggers alongside a weapon choice)
//  - weaponOptions: specific named weapons offered as direct alternatives (e.g. "Rapier, Longsword")
//  - weaponFilter: an "any simple/martial [melee/ranged] weapon" catalog filter, if present
// A line can have alwaysItems AND a weapon choice at the same time (e.g. Warlock's
// "Leather Armor, any simple weapon, and two Daggers") — picking the weapon must not
// discard the other items, which was the root cause of the armor/daggers bug.
function parseEquipLine(line: string): { alwaysItems: string[]; weaponOptions: string[]; weaponFilter: { category: string; range: string } | null } {
  const weaponPhraseRe = /any (martial|simple)(?:\s+(melee|ranged))?\s+weapon/i
  const m = line.match(weaponPhraseRe)

  if (!m) {
    // No "any X weapon" phrase. Either a plain "A or B" alternative list, or a fixed set
    // of items joined by commas/"and" that are all granted together.
    if (/\bor\b/i.test(line)) {
      return { alwaysItems: [], weaponOptions: line.split(/\bor\b/i).map((s) => s.trim().replace(/,\s*$/, '')).filter(Boolean), weaponFilter: null }
    }
    return { alwaysItems: line.split(/,| and /i).map((s) => s.trim()).filter(Boolean), weaponOptions: [], weaponFilter: null }
  }

  const weaponFilter = { category: m[1].toLowerCase(), range: (m[2] ?? 'any').toLowerCase() }
  const before = line.slice(0, m.index)
  const after = line.slice((m.index ?? 0) + m[0].length)

  // If the text right before the weapon phrase ends in "or", everything before it is a
  // list of named alternatives to the weapon-category choice (Bard: "Rapier, Longsword, or").
  // Otherwise it's fixed text that's simply granted alongside the weapon choice.
  const orMatch = before.match(/^(.*?),?\s*\bor\s*$/i)
  const weaponOptions = orMatch ? orMatch[1].split(',').map((s) => s.trim()).filter(Boolean) : []
  const beforeAlways = orMatch ? '' : before.replace(/,?\s*(and)?\s*$/i, '').trim()
  const afterAlways = after.replace(/^\s*,?\s*(and)?\s*/i, '').trim()

  const alwaysRaw = [beforeAlways, afterAlways].filter(Boolean).join(', ')
  const alwaysItems = alwaysRaw ? alwaysRaw.split(/,| and /i).map((s) => s.trim()).filter(Boolean) : []

  return { alwaysItems, weaponOptions, weaponFilter }
}

function EquipmentStep({
  selectedClass, classEquipChoice, setClassEquipChoice, selectedBackground,
  weaponOverrides, setWeaponOverrides, weaponCatalog, packContentsMap,
  useShop, setUseShop, shopCatalog, shopCart, addToCart, removeFromCart, shopBudget,
}: any) {
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-3">Starting equipment</h2>

      <div className="flex gap-2 mb-4">
        <Chip selected={!useShop} onClick={() => setUseShop(false)}>Take standard equipment</Chip>
        <Chip selected={useShop} onClick={() => setUseShop(true)}>Buy my own gear ({shopBudget} gp budget)</Chip>
      </div>
      <p className="text-parchment/40 text-xs italic mb-4">
        The 2014 PHB doesn't lay out a clean "sell your kit for gold" table the way some other editions do, so this budget is a
        simplified house rule rather than something pulled from the book — flat {shopBudget} gp to shop the catalog instead of
        taking your class/background package.
      </p>

      {!useShop && (
        <>
          <h3 className="font-display text-sm text-candle mb-2">From your class{selectedClass ? ` (${selectedClass.name})` : ''}</h3>
          {selectedClass?.starting_equipment?.length ? selectedClass.starting_equipment.map((opt: any) => (
            <div key={opt.label} onClick={() => setClassEquipChoice(opt.label)}
              className={`border rounded-sm p-3 mb-2.5 text-sm ${classEquipChoice === opt.label ? 'border-candle bg-blood/20' : 'border-mist hover:border-candle/50 cursor-pointer'}`}>
              <div className="cursor-pointer" onClick={() => setClassEquipChoice(opt.label)}>
                Option {opt.label}: {opt.items ? opt.items.join(', ') : `${opt.gold} gp instead`}
              </div>
              {classEquipChoice === opt.label && opt.items && (
                <div className="mt-3 pt-3 border-t border-mist/50 space-y-3">
                  {opt.items.map((line: string) => {
                    const { alwaysItems, weaponOptions, weaponFilter } = parseEquipLine(line)
                    const hasChoice = weaponOptions.length > 0 || !!weaponFilter
                    if (!hasChoice) {
                      return (
                        <div key={line}>
                          {alwaysItems.map((it) => {
                            const packMatch = packContentsMap[it]
                            return (
                              <div key={it}>
                                <span className="text-xs text-parchment/60">{it}</span>
                                {packMatch && <p className="text-xs text-parchment/40 italic ml-2">Contains: {packMatch.join(', ')}</p>}
                              </div>
                            )
                          })}
                        </div>
                      )
                    }
                    const filterOptions = weaponFilter
                      ? weaponCatalog.filter((w: any) => w.weapon_category === weaponFilter.category && (weaponFilter.range === 'any' || w.weapon_range === weaponFilter.range))
                      : []
                    const defaultChoice = weaponOptions[0] ?? filterOptions[0]?.name ?? ''
                    const chosen = weaponOverrides[line] ?? defaultChoice
                    return (
                      <div key={line} className="mb-1">
                        {alwaysItems.length > 0 && (
                          <p className="text-xs text-parchment/50 italic mb-1">Also includes: {alwaysItems.join(', ')}</p>
                        )}
                        <p className="text-xs text-parchment/60 mb-1.5">{line}</p>
                        {weaponOptions.map((w) => (
                          <Chip key={w} selected={chosen === w} onClick={() => setWeaponOverrides((prev: any) => ({ ...prev, [line]: w }))}>{w}</Chip>
                        ))}
                        {filterOptions.map((w: any) => (
                          <Chip key={w.id} selected={chosen === w.name} onClick={() => setWeaponOverrides((prev: any) => ({ ...prev, [line]: w.name }))}>{w.name}</Chip>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )) : <p className="text-parchment/40 text-xs italic">Pick a class first.</p>}

          <h3 className="font-display text-sm text-candle mt-5 mb-2">From your background{selectedBackground ? ` (${selectedBackground.name})` : ''}</h3>
          {selectedBackground ? (
            <div className="border border-mist rounded-sm p-3 text-sm">{selectedBackground.equipment.map((e: any) => `${e.qty}× ${e.item}`).join(', ')}</div>
          ) : <p className="text-parchment/40 text-xs italic">Pick a background first.</p>}
        </>
      )}

      {useShop && (
        <div>
          <div className="flex justify-between mb-3">
            <h3 className="font-display text-sm text-candle">Shop</h3>
            <span className="text-sm text-candle">{shopBudget - shopCart.reduce((s: number, i: any) => s + i.cost_gp, 0)} gp remaining</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto border border-mist rounded-sm p-2 mb-4">
            {shopCatalog.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-mist/30 last:border-none text-sm">
                <Tooltip label={<span>{item.name}</span>} title={item.name} subtitle={item.cost ?? undefined} body={item.description} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-parchment/50">{item.cost ?? '—'}</span>
                  <button onClick={() => addToCart(item)} className="text-xs text-candle hover:text-parchment border border-mist rounded-full px-2 py-0.5">+ Add</button>
                </div>
              </div>
            ))}
          </div>
          <h4 className="font-display text-xs text-candle mb-2">Cart</h4>
          {shopCart.length === 0 && <p className="text-xs text-parchment/40 italic">Nothing added yet.</p>}
          {shopCart.map((c: any, i: number) => (
            <div key={i} className="flex justify-between text-sm mb-1">
              <span>{c.name} ({c.cost_gp} gp)</span>
              <button onClick={() => removeFromCart(i)} className="text-xs text-blood-bright hover:underline">remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewStep(props: any) {
  const {
    name, selectedSpecies, selectedSubrace, isVariantHuman, variantHumanFeat, variantHumanSkill,
    draconicAncestry, highElfCantrip, halfElfSkills, skilledFeatSkills, rangerFavoredEnemy, rangerFavoredTerrain,
    selectedClass, selectedSubclass, fightingStyle, classSkills, selectedBackground,
    selectedLanguages, selectedCantrips, selectedSpells, classEquipChoice, useShop, shopCart, weaponOverrides, alignment, setAlignment,
    chosenToolProficiency,
    error, saving, onSubmit,
  } = props
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-4">Review</h2>
      <div className="space-y-1 text-sm text-parchment/80 mb-4">
        <p><span className="text-parchment/50">Name:</span> {name || '—'}</p>
        <p><span className="text-parchment/50">Species:</span> {selectedSpecies?.name ?? '—'}{selectedSubrace ? ` (${selectedSubrace.name})` : ''}{isVariantHuman ? ' — Variant' : ''}</p>
        {variantHumanFeat && <p><span className="text-parchment/50">Variant Feat:</span> {variantHumanFeat.name}</p>}
        {variantHumanSkill && <p><span className="text-parchment/50">Variant Skill:</span> {variantHumanSkill}</p>}
        {draconicAncestry && <p><span className="text-parchment/50">Draconic Ancestry:</span> {draconicAncestry}</p>}
        {highElfCantrip && <p><span className="text-parchment/50">High Elf Cantrip:</span> {highElfCantrip}</p>}
        {halfElfSkills.length > 0 && <p><span className="text-parchment/50">Skill Versatility:</span> {halfElfSkills.join(', ')}</p>}
        {skilledFeatSkills.length > 0 && <p><span className="text-parchment/50">Skilled:</span> {skilledFeatSkills.join(', ')}</p>}
        <p><span className="text-parchment/50">Class:</span> {selectedClass?.name ?? '—'}</p>
        {selectedSubclass && <p><span className="text-parchment/50">Subclass:</span> {selectedSubclass.name}</p>}
        {fightingStyle && <p><span className="text-parchment/50">Fighting Style:</span> {fightingStyle}</p>}
        {rangerFavoredEnemy && <p><span className="text-parchment/50">Favored Enemy:</span> {rangerFavoredEnemy}</p>}
        {rangerFavoredTerrain && <p><span className="text-parchment/50">Favored Terrain:</span> {rangerFavoredTerrain}</p>}
        {classSkills.length > 0 && <p><span className="text-parchment/50">Class Skills:</span> {classSkills.join(', ')}</p>}
        <p><span className="text-parchment/50">Background:</span> {selectedBackground?.name ?? '—'}</p>
        {chosenToolProficiency && <p><span className="text-parchment/50">Tool Proficiency:</span> {chosenToolProficiency}</p>}
        <p><span className="text-parchment/50">Languages:</span> Common{selectedLanguages.length ? `, ${selectedLanguages.join(', ')}` : ''}</p>
        {selectedCantrips.length > 0 && <p><span className="text-parchment/50">Cantrips:</span> {selectedCantrips.join(', ')}</p>}
        {selectedSpells.length > 0 && <p><span className="text-parchment/50">Spells:</span> {selectedSpells.join(', ')}</p>}
        {!useShop && classEquipChoice && <p><span className="text-parchment/50">Class Equipment:</span> Option {classEquipChoice}{Object.keys(weaponOverrides).length > 0 && ` (${Object.values(weaponOverrides).join(', ')})`}</p>}
        {useShop && <p><span className="text-parchment/50">Shop Cart:</span> {shopCart.length ? shopCart.map((c: any) => c.name).join(', ') : 'nothing added'}</p>}
      </div>
      <h3 className="font-display text-sm text-candle mb-2">Alignment</h3>
      {ALIGNMENTS.map((a) => <Chip key={a} selected={alignment === a} onClick={() => setAlignment(a)}>{a}</Chip>)}
      {error && <p className="text-blood-bright text-sm mt-4">{error}</p>}
      <button onClick={onSubmit} disabled={saving} className="w-full bg-blood hover:bg-blood-bright transition rounded-sm py-2 mt-6 font-display text-sm tracking-wide">
        {saving ? 'Sealing the pact…' : 'Enter Barovia'}
      </button>
    </div>
  )
}
