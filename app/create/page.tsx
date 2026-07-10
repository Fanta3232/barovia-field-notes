'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Tooltip from '@/components/Tooltip'
import {
  Species, ClassRow, Background, Feat, Spell, AbilityScores, ABILITY_KEYS,
  STANDARD_LANGUAGES, ALL_SKILLS, ALIGNMENTS, PB_BUDGET, pbCost, abilityModifier,
} from '@/lib/types'

const STEPS = ['Species', 'Class', 'Class Features', 'Background', 'Ability Scores', 'Languages', 'Spells & Cantrips', 'Equipment', 'Review'] as const

const ABILITY_BLURBS: Record<string, string> = {
  strength: 'Melee damage, carrying capacity, Athletics.',
  dexterity: 'Armor Class, initiative, ranged/finesse attacks, Stealth.',
  constitution: 'Hit points and Concentration saves — never a bad ability to raise.',
  intelligence: 'Wizard spellcasting, Arcana/History/Investigation checks.',
  wisdom: 'Cleric/Druid/Ranger spellcasting, Perception, Insight.',
  charisma: 'Bard/Sorcerer/Warlock/Paladin spellcasting, social skills.',
}

const STEP_INTROS = [
  "Species shapes your character's baseline traits and speed. Vision in the dark is not a species trait in this campaign — you'll get Darkvision (or better) from equipment, spells, or feats instead.",
  'Class determines your combat role, HP progression, and whether you cast spells.',
  "Some classes make an additional choice at level 1 — a Fighter picks a Fighting Style, a Warlock picks an Eldritch Invocation (which includes Pact Boon options in the 2024 rules — that moved from a separate level-3 feature). Classes without a level-1 choice skip through.",
  'Background sets your starting skills, a free Origin feat, and — importantly — your ability score bonus, which comes from Background rather than Species in the 2024 rules.',
  "Assign your base ability scores with point buy, then apply your background's bonus (+2/+1 split, or +1 to all three) on top.",
  "Everyone knows Common plus 2 chosen Standard Languages. Rare languages aren't available at character creation in the 2024 rules.",
  'If your class casts spells, pick your cantrips and spells here. Non-casters skip this step.',
  'Starting gear is two independent choices: class equipment package or class gold, and separately background kit or background gold.',
  'Review everything, set an alignment, then enter Barovia.',
]

type ScoreState = AbilityScores

export default function CreateCharacterPage() {
  const [step, setStep] = useState(0)

  const [speciesList, setSpeciesList] = useState<Species[]>([])
  const [classList, setClassList] = useState<ClassRow[]>([])
  const [backgroundList, setBackgroundList] = useState<Background[]>([])
  const [feats, setFeats] = useState<Feat[]>([])
  const [spells, setSpells] = useState<Spell[]>([])

  const [name, setName] = useState('')
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const [backgroundId, setBackgroundId] = useState<string | null>(null)
  const [scores, setScores] = useState<ScoreState>({
    strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8,
  })
  const [fightingStyle, setFightingStyle] = useState<string | null>(null)
  const [invocation, setInvocation] = useState<string | null>(null)
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([])
  const [selectedSpells, setSelectedSpells] = useState<string[]>([])
  const [classEquipChoice, setClassEquipChoice] = useState<string | null>(null)
  const [bgEquipChoice, setBgEquipChoice] = useState<'kit' | 'gold'>('kit')
  const [humanSkill, setHumanSkill] = useState<string | null>(null)
  const [humanOriginFeatId, setHumanOriginFeatId] = useState<string | null>(null)
  const [bgAsiMode, setBgAsiMode] = useState<'2-1' | '1-1-1'>('2-1')
  const [bgAsiPrimary, setBgAsiPrimary] = useState<string | null>(null)
  const [bgAsiSecondary, setBgAsiSecondary] = useState<string | null>(null)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [alignment, setAlignment] = useState<string | null>(null)
  const [miClassName, setMiClassName] = useState<string | null>(null) // Magic Initiate's chosen source class
  const [miCantrips, setMiCantrips] = useState<string[]>([])
  const [miSpell, setMiSpell] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [sp, cl, bg, ft, sl] = await Promise.all([
        supabase.from('species').select('*').order('name'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('backgrounds').select('*').order('name'),
        supabase.from('feats').select('*'),
        supabase.from('spells').select('*').order('level').order('name'),
      ])
      if (sp.data) setSpeciesList(sp.data as Species[])
      if (cl.data) setClassList(cl.data as ClassRow[])
      if (bg.data) setBackgroundList(bg.data as Background[])
      if (ft.data) setFeats(ft.data as Feat[])
      if (sl.data) setSpells(sl.data as Spell[])
    }
    load()
  }, [])

  const selectedSpecies = speciesList.find((s) => s.id === speciesId)
  const selectedClass = classList.find((c) => c.id === classId)
  const selectedBackground = backgroundList.find((b) => b.id === backgroundId)
  const originFeat = selectedBackground ? feats.find((f) => f.id === selectedBackground.origin_feat_id) : null
  const originFeats = feats.filter((f) => f.category === 'origin')
  const fightingStyles = feats.filter((f) => f.category === 'fighting_style')
  const invocations = feats.filter((f) => f.category === 'eldritch_invocation')
  const isHuman = selectedSpecies?.name === 'Human'
  const humanFeat = originFeats.find((f) => f.id === humanOriginFeatId)
  // Magic Initiate can come from the background's fixed feat OR Human's chosen Versatile feat —
  // either way it grants the same choice, so we check both sources.
  const effectiveOriginFeat = isHuman ? humanFeat : originFeat
  const hasMagicInitiate = effectiveOriginFeat?.name === 'Magic Initiate'
  const MI_CLASSES = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']
  const miCantripOptions = miClassName ? spells.filter((s) => s.level === 0 && s.classes.includes(miClassName)) : []
  const miSpellOptions = miClassName ? spells.filter((s) => s.level === 1 && s.classes.includes(miClassName)) : []
  // Species that grant a fixed cantrip automatically at level 1, no choice needed
  const autoSpeciesCantrip = selectedSpecies?.name === 'Aasimar' ? 'Light' : selectedSpecies?.name === 'Tiefling' ? 'Thaumaturgy' : null

  function bgBonusFor(ab: string): number {
    if (!selectedBackground) return 0
    const label = ab.charAt(0).toUpperCase() + ab.slice(1)
    if (bgAsiMode === '1-1-1') return selectedBackground.ability_score_options.includes(label) ? 1 : 0
    if (label === bgAsiPrimary) return 2
    if (label === bgAsiSecondary) return 1
    return 0
  }
  function finalScore(ab: keyof ScoreState): number {
    return scores[ab] + bgBonusFor(ab)
  }

  const classCantrips = selectedClass ? spells.filter((s) => s.level === 0 && s.classes.includes(selectedClass.name)) : []
  const classSpells = selectedClass ? spells.filter((s) => s.level === 1 && s.classes.includes(selectedClass.name)) : []

  function spellCountFor(): number {
    if (!selectedClass || !selectedClass.spellcasting_type) return 0
    if (selectedClass.spellcasting_type === 'prepared') {
      if (selectedClass.name === 'Paladin') return 2 // fixed by PHB table, not ability-mod based
      const mod = abilityModifier(finalScore((selectedClass.spellcasting_ability?.toLowerCase() ?? 'intelligence') as keyof ScoreState))
      return Math.max(1, mod + 1)
    }
    // known/pact casters: approximate pending exact PHB spells-known table
    return selectedClass.name === 'Warlock' ? 1 : selectedClass.name === 'Sorcerer' ? 2 : 4
  }

  function computeAC(): number {
    const dexMod = abilityModifier(finalScore('dexterity'))
    if (!selectedClass?.starting_equipment || !classEquipChoice) return 10 + dexMod
    const opt = selectedClass.starting_equipment.find((o) => o.label === classEquipChoice)
    if (!opt?.items) return 10 + dexMod
    const items = opt.items.join(' ')
    let base = 10
    let dexCap: number | null = null
    const hasShield = /Shield/i.test(items)
    if (/Chain Mail/i.test(items)) { base = 16; dexCap = 0 }
    else if (/Chain Shirt/i.test(items)) { base = 13; dexCap = 2 }
    else if (/Leather Armor/i.test(items)) { base = 11; dexCap = null }
    const dexApplied = dexCap === null ? dexMod : Math.min(dexMod, dexCap)
    return base + dexApplied + (hasShield ? 2 : 0)
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

  async function handleSubmit() {
    if (!name || !speciesId || !classId || !backgroundId) {
      setError('Fill in every step before finishing.')
      return
    }
    setSaving(true)
    setError(null)

    const hitDie = selectedClass?.hit_die ?? 8
    const conMod = abilityModifier(finalScore('constitution'))
    const maxHp = hitDie + conMod

    const backgroundAsi: Record<string, number> = {}
    ABILITY_KEYS.forEach((k) => { const b = bgBonusFor(k); if (b) backgroundAsi[k] = b })

    const { data: character, error: charErr } = await supabase
      .from('characters')
      .insert({
        name,
        species_id: speciesId,
        class_id: classId,
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
        initiative_bonus: abilityModifier(finalScore('dexterity')),
        speed: selectedSpecies?.speed ?? 30,
        hit_dice_total: 1,
        hit_dice_remaining: 1,
        background_asi: backgroundAsi,
      })
      .select()
      .single()

    if (charErr || !character) {
      setError(charErr?.message ?? 'Something went wrong saving the character.')
      setSaving(false)
      return
    }

    const characterId = character.id

    const classGold = classEquipChoice
      ? (selectedClass?.starting_equipment.find((o) => o.label === classEquipChoice)?.gold ?? 0)
      : 0
    const bgGold = bgEquipChoice === 'gold' ? (selectedBackground?.gold_alternative ?? 50) : 0
    await supabase.from('character_currency').insert({
      character_id: characterId,
      gp: classGold + bgGold,
    })

    // origin feat from background
    if (originFeat) {
      await supabase.from('character_feats').insert({ character_id: characterId, feat_id: originFeat.id, source: 'background' })
    }
    // Human's Versatile origin feat
    if (humanOriginFeatId) {
      await supabase.from('character_feats').insert({ character_id: characterId, feat_id: humanOriginFeatId, source: 'species_versatile' })
    }
    // fighting style / invocation
    const chosenClassFeat = feats.find((f) => f.name === fightingStyle || f.name === invocation)
    if (chosenClassFeat) {
      await supabase.from('character_feats').insert({ character_id: characterId, feat_id: chosenClassFeat.id, source: 'class_feature_l1' })
    }

    // skills from background + Human's Skillful
    const skillRows = (selectedBackground?.skill_proficiencies ?? []).map((s) => ({
      character_id: characterId, skill_name: s, proficient: true,
    }))
    if (humanSkill) skillRows.push({ character_id: characterId, skill_name: humanSkill, proficient: true })
    if (skillRows.length) await supabase.from('character_skills').insert(skillRows)

    // languages
    const langRows = [{ character_id: characterId, language: 'Common', is_rare: false, source: 'default' }]
    selectedLanguages.forEach((l) => langRows.push({ character_id: characterId, language: l, is_rare: false, source: 'chosen' }))
    await supabase.from('character_languages').insert(langRows)

    // spells + cantrips
    const spellRows: { character_id: string; spell_id: string; is_prepared: boolean; is_always_known: boolean }[] = []
    selectedCantrips.forEach((name) => {
      const sp = spells.find((s) => s.name === name)
      if (sp) spellRows.push({ character_id: characterId, spell_id: sp.id, is_prepared: false, is_always_known: true })
    })
    selectedSpells.forEach((name) => {
      const sp = spells.find((s) => s.name === name)
      if (sp) spellRows.push({ character_id: characterId, spell_id: sp.id, is_prepared: selectedClass?.spellcasting_type === 'prepared', is_always_known: selectedClass?.spellcasting_type !== 'prepared' })
    })
    // Magic Initiate origin feat: 2 cantrips + 1 first-level spell from a chosen class list,
    // castable without a spell slot once per Long Rest — always-known regardless of class
    if (hasMagicInitiate) {
      miCantrips.forEach((name) => {
        const sp = spells.find((s) => s.name === name)
        if (sp) spellRows.push({ character_id: characterId, spell_id: sp.id, is_prepared: false, is_always_known: true })
      })
      if (miSpell) {
        const sp = spells.find((s) => s.name === miSpell)
        if (sp) spellRows.push({ character_id: characterId, spell_id: sp.id, is_prepared: false, is_always_known: true })
      }
    }
    // fixed species cantrips that need no choice (Aasimar's Light Bearer, Tiefling's Otherworldly Presence)
    if (autoSpeciesCantrip) {
      const sp = spells.find((s) => s.name === autoSpeciesCantrip)
      if (sp) spellRows.push({ character_id: characterId, spell_id: sp.id, is_prepared: false, is_always_known: true })
    }
    if (spellRows.length) await supabase.from('character_spells').insert(spellRows)

    // equipment: class choice + background choice, matched against the items catalog where possible,
    // falling back to item_name for anything not yet cataloged
    const { data: catalogItems } = await supabase.from('items').select('id, name')
    const findItemId = (n: string) => catalogItems?.find((i) => n.toLowerCase().includes(i.name.toLowerCase()))?.id ?? null

    const inventoryRows: { character_id: string; item_id: string | null; item_name: string | null; quantity: number }[] = []
    if (classEquipChoice) {
      const opt = selectedClass?.starting_equipment.find((o) => o.label === classEquipChoice)
      opt?.items?.forEach((itemStr) => {
        inventoryRows.push({ character_id: characterId, item_id: findItemId(itemStr), item_name: findItemId(itemStr) ? null : itemStr, quantity: 1 })
      })
    }
    if (bgEquipChoice === 'kit' && selectedBackground) {
      selectedBackground.equipment.forEach((e) => {
        inventoryRows.push({ character_id: characterId, item_id: findItemId(e.item), item_name: findItemId(e.item) ? null : e.item, quantity: e.qty })
      })
    }
    if (inventoryRows.length) await supabase.from('character_inventory').insert(inventoryRows)

    window.location.href = `/character/${characterId}`
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl text-candle mb-1">A New Soul Enters Barovia</h1>
      <p className="text-parchment/60 text-sm mb-2">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>
      <p className="text-parchment/70 text-sm mb-6 max-w-2xl">{STEP_INTROS[step]}</p>

      <div className="flex gap-1.5 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 min-w-[20px] rounded-full ${i <= step ? 'bg-blood-bright' : 'bg-mist'}`} />
        ))}
      </div>

      <div className="panel rounded-sm p-6">
        {step === 0 && (
          <SpeciesStep
            name={name} setName={setName}
            speciesList={speciesList} speciesId={speciesId} setSpeciesId={setSpeciesId}
            isHuman={isHuman}
            humanSkill={humanSkill} setHumanSkill={setHumanSkill}
            originFeats={originFeats} humanOriginFeatId={humanOriginFeatId} setHumanOriginFeatId={setHumanOriginFeatId}
          />
        )}
        {step === 1 && <ClassStep classList={classList} classId={classId} setClassId={setClassId} />}
        {step === 2 && (
          <ClassFeaturesStep
            selectedClass={selectedClass}
            fightingStyles={fightingStyles} fightingStyle={fightingStyle} setFightingStyle={setFightingStyle}
            invocations={invocations} invocation={invocation} setInvocation={setInvocation}
          />
        )}
        {step === 3 && (
          <BackgroundStep backgroundList={backgroundList} backgroundId={backgroundId} setBackgroundId={setBackgroundId} feats={feats} />
        )}
        {step === 4 && (
          <AbilityScoreStep
            selectedBackground={selectedBackground}
            bgAsiMode={bgAsiMode} setBgAsiMode={setBgAsiMode}
            bgAsiPrimary={bgAsiPrimary} setBgAsiPrimary={setBgAsiPrimary}
            bgAsiSecondary={bgAsiSecondary} setBgAsiSecondary={setBgAsiSecondary}
            scores={scores} adjustScore={adjustScore} finalScore={finalScore} modifier={modifier}
          />
        )}
        {step === 5 && (
          <LanguagesStep selectedLanguages={selectedLanguages} setSelectedLanguages={setSelectedLanguages} />
        )}
        {step === 6 && (
          <SpellsStep
            selectedClass={selectedClass}
            classCantrips={classCantrips} classSpells={classSpells}
            selectedCantrips={selectedCantrips} setSelectedCantrips={setSelectedCantrips}
            selectedSpells={selectedSpells} setSelectedSpells={setSelectedSpells}
            spellCount={spellCountFor()}
            hasMagicInitiate={hasMagicInitiate} effectiveOriginFeat={effectiveOriginFeat}
            miClassName={miClassName} setMiClassName={setMiClassName} miClassOptions={MI_CLASSES}
            miCantripOptions={miCantripOptions} miSpellOptions={miSpellOptions}
            miCantrips={miCantrips} setMiCantrips={setMiCantrips}
            miSpell={miSpell} setMiSpell={setMiSpell}
          />
        )}
        {step === 7 && (
          <EquipmentStep
            selectedClass={selectedClass} classEquipChoice={classEquipChoice} setClassEquipChoice={setClassEquipChoice}
            selectedBackground={selectedBackground} bgEquipChoice={bgEquipChoice} setBgEquipChoice={setBgEquipChoice}
          />
        )}
        {step === 8 && (
          <ReviewStep
            name={name} selectedSpecies={selectedSpecies} selectedClass={selectedClass} selectedBackground={selectedBackground}
            humanSkill={humanSkill} humanOriginFeatId={humanOriginFeatId} originFeats={originFeats}
            fightingStyle={fightingStyle} invocation={invocation}
            selectedLanguages={selectedLanguages} selectedCantrips={selectedCantrips} selectedSpells={selectedSpells}
            classEquipChoice={classEquipChoice} bgEquipChoice={bgEquipChoice}
            alignment={alignment} setAlignment={setAlignment}
            hasMagicInitiate={hasMagicInitiate} miClassName={miClassName} miCantrips={miCantrips} miSpell={miSpell}
            autoSpeciesCantrip={autoSpeciesCantrip}
            error={error} saving={saving} onSubmit={handleSubmit}
          />
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="text-sm text-parchment/60 hover:text-candle disabled:opacity-30">
          Back
        </button>
        {step < STEPS.length - 1 && (
          <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="text-sm text-candle hover:text-parchment">
            Next
          </button>
        )}
      </div>
    </main>
  )
}

// ---------- Reusable list+detail ----------
function ListDetail<T extends { id: string; name: string }>({
  items, selectedId, onSelect, renderDetail,
}: {
  items: T[]
  selectedId: string | null
  onSelect: (id: string) => void
  renderDetail: (item: T) => React.ReactNode
}) {
  const active = items.find((i) => i.id === selectedId) ?? items[0]
  return (
    <div className="grid grid-cols-[220px_1fr] gap-0 min-h-[320px]">
      <div className="border-r border-mist pr-1 max-h-[420px] overflow-y-auto">
        {items.map((i) => (
          <div
            key={i.id}
            onClick={() => onSelect(i.id)}
            className={`px-3.5 py-2.5 font-display text-sm cursor-pointer border-l-2 transition-colors ${
              i.id === selectedId ? 'border-candle bg-blood/20 text-candle' : 'border-transparent text-parchment/75 hover:bg-candle/5 hover:text-parchment'
            }`}
          >
            {i.name}
          </div>
        ))}
      </div>
      <div className="px-5">{active ? renderDetail(active) : <p className="text-parchment/40 text-xs italic">Select an option to see details.</p>}</div>
    </div>
  )
}

function DTitle({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-lg text-candle mb-1">{children}</div>
}
function DMeta({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-parchment/50 mb-3">{children}</div>
}
function DBlurb({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-parchment/85 leading-relaxed mb-3.5">{children}</div>
}
function DTrait({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="mb-2.5">
      <div className="font-display text-sm text-candle">{name}</div>
      <div className="text-sm text-parchment/80 leading-snug">{desc}</div>
    </div>
  )
}
function Chip({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span
      onClick={disabled ? undefined : onClick}
      className={`inline-block border rounded-full px-3 py-1 text-sm mr-1.5 mb-1.5 transition-colors ${
        disabled ? 'opacity-30 cursor-default border-mist' :
        selected ? 'border-candle bg-blood/30 text-candle cursor-pointer' : 'border-mist hover:border-candle/50 cursor-pointer'
      }`}
    >
      {children}
    </span>
  )
}

// ---------- Step components ----------
function SpeciesStep({ name, setName, speciesList, speciesId, setSpeciesId, isHuman, humanSkill, setHumanSkill, originFeats, humanOriginFeatId, setHumanOriginFeatId }: any) {
  return (
    <div>
      <label className="block font-utility text-xs uppercase tracking-wide text-parchment/60 mb-2">Character name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-ink border border-mist rounded-sm px-3 py-2 mb-6 text-parchment"
        placeholder="e.g. a cousin of Ismark, freshly arrived from the mists"
      />
      <h2 className="font-display text-xl text-candle mb-3">Choose your species</h2>
      <ListDetail
        items={speciesList}
        selectedId={speciesId}
        onSelect={setSpeciesId}
        renderDetail={(s: Species) => (
          <>
            <DTitle>{s.name}</DTitle>
            <DMeta>Speed {s.speed}ft</DMeta>
            {s.traits.map((t) => <DTrait key={t.name} name={t.name} desc={t.description} />)}
          </>
        )}
      />
      {isHuman && (
        <>
          <h3 className="font-display text-sm text-candle mt-6 mb-2">Skillful: choose 1 free skill proficiency</h3>
          {ALL_SKILLS.map((sk) => (
            <Chip key={sk} selected={humanSkill === sk} onClick={() => setHumanSkill(sk)}>{sk}</Chip>
          ))}
          <h3 className="font-display text-sm text-candle mt-6 mb-2">Versatile: choose 1 Origin feat</h3>
          {originFeats.map((f: Feat) => (
            <Tooltip key={f.id} label={
              <Chip selected={humanOriginFeatId === f.id} onClick={() => setHumanOriginFeatId(f.id)}>{f.name}</Chip>
            } title={f.name} subtitle="Origin Feat" body={f.description} className="inline-block" />
          ))}
        </>
      )}
    </div>
  )
}

function ClassStep({ classList, classId, setClassId }: any) {
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-3">Choose your class</h2>
      <ListDetail
        items={classList}
        selectedId={classId}
        onSelect={setClassId}
        renderDetail={(c: ClassRow) => (
          <>
            <DTitle>{c.name}</DTitle>
            <DMeta>
              Hit Die d{c.hit_die} · Primary: {c.primary_ability.join('/')}
              {c.spellcasting_type ? ` · ${c.spellcasting_type} caster` : ' · non-caster'}
            </DMeta>
            {c.starting_equipment?.length > 0 && (
              <DTrait
                name="Starting Equipment"
                desc={c.starting_equipment.map((o) => o.items ? `Option ${o.label}: ${o.items.join(', ')}` : `Option ${o.label}: ${o.gold} gp instead`).join(' · ')}
              />
            )}
            {c.spellcasting_type && <DTrait name="Cantrips at level 1" desc={String(c.cantrips_known_at_1 ?? 0)} />}
          </>
        )}
      />
    </div>
  )
}

function ClassFeaturesStep({ selectedClass, fightingStyles, fightingStyle, setFightingStyle, invocations, invocation, setInvocation }: any) {
  if (!selectedClass) return <p className="text-parchment/40 text-sm italic">Pick a class first.</p>
  if (selectedClass.name === 'Fighter') {
    return (
      <div>
        <h2 className="font-display text-xl text-candle mb-1">Fighting Style</h2>
        <p className="text-parchment/40 text-xs italic mb-3">Choose one.</p>
        <ListDetail
          items={fightingStyles.map((f: Feat) => ({ id: f.name, name: f.name, description: f.description }))}
          selectedId={fightingStyle}
          onSelect={setFightingStyle}
          renderDetail={(f: any) => (<><DTitle>{f.name}</DTitle><DBlurb>{f.description}</DBlurb></>)}
        />
      </div>
    )
  }
  if (selectedClass.name === 'Warlock') {
    return (
      <div>
        <h2 className="font-display text-xl text-candle mb-1">Eldritch Invocation</h2>
        <p className="text-parchment/40 text-xs italic mb-3">Choose one — this includes your Pact Boon options (Blade/Chain/Tome).</p>
        <ListDetail
          items={invocations.map((f: Feat) => ({ id: f.name, name: f.name, description: f.description }))}
          selectedId={invocation}
          onSelect={setInvocation}
          renderDetail={(f: any) => (<><DTitle>{f.name}</DTitle><DBlurb>{f.description}</DBlurb></>)}
        />
      </div>
    )
  }
  return <p className="text-parchment/40 text-sm italic">{selectedClass.name} has no additional choice at level 1 beyond what's covered in other steps.</p>
}

function BackgroundStep({ backgroundList, backgroundId, setBackgroundId, feats }: any) {
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-3">Choose your background</h2>
      <ListDetail
        items={backgroundList}
        selectedId={backgroundId}
        onSelect={setBackgroundId}
        renderDetail={(b: Background) => {
          const feat = feats.find((f: Feat) => f.id === b.origin_feat_id)
          return (
            <>
              <DTitle>{b.name}</DTitle>
              <DTrait name="Skill Proficiencies" desc={b.skill_proficiencies.join(', ')} />
              <DTrait name="Ability Score Bonus (choose during Ability Scores step)" desc={b.ability_score_options.join(', ')} />
              {feat && <DTrait name={`Origin Feat: ${feat.name}`} desc={feat.description} />}
              <DTrait name={`Starting Equipment (or ${b.gold_alternative} gp instead)`} desc={b.equipment.map((e) => `${e.qty}× ${e.item}`).join(', ')} />
            </>
          )
        }}
      />
    </div>
  )
}

function AbilityScoreStep({ selectedBackground, bgAsiMode, setBgAsiMode, bgAsiPrimary, setBgAsiPrimary, bgAsiSecondary, setBgAsiSecondary, scores, adjustScore, finalScore, modifier }: any) {
  const spent = ABILITY_KEYS.reduce((sum, k) => sum + pbCost(scores[k]), 0)
  const remaining = PB_BUDGET - spent
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-2">Background ability bonus first</h2>
      {selectedBackground ? (
        <>
          <p className="text-parchment/40 text-xs italic mb-2">
            {selectedBackground.name} ties to: {selectedBackground.ability_score_options.join(', ')}. Pick this before spending points below.
          </p>
          <Chip selected={bgAsiMode === '2-1'} onClick={() => { setBgAsiMode('2-1') }}>+2 to one / +1 to another</Chip>
          <Chip selected={bgAsiMode === '1-1-1'} onClick={() => { setBgAsiMode('1-1-1') }}>+1 to all three</Chip>
          {bgAsiMode === '2-1' ? (
            <>
              <p className="text-parchment/40 text-xs italic mt-2 mb-1">Pick the +2:</p>
              {selectedBackground.ability_score_options.map((a: string) => (
                <Chip key={a} selected={bgAsiPrimary === a} onClick={() => { setBgAsiPrimary(a); if (bgAsiSecondary === a) setBgAsiSecondary(null) }}>{a}</Chip>
              ))}
              <p className="text-parchment/40 text-xs italic mt-2 mb-1">Pick the +1:</p>
              {selectedBackground.ability_score_options.filter((a: string) => a !== bgAsiPrimary).map((a: string) => (
                <Chip key={a} selected={bgAsiSecondary === a} onClick={() => setBgAsiSecondary(a)}>{a}</Chip>
              ))}
            </>
          ) : (
            <p className="text-parchment/40 text-xs italic mt-2">All three of {selectedBackground.ability_score_options.join(', ')} get +1.</p>
          )}
        </>
      ) : (
        <p className="text-parchment/40 text-xs italic">Go back and pick a background to unlock its ability bonus here.</p>
      )}

      <h2 className="font-display text-xl text-candle mt-6 mb-2">Spend base points (point buy)</h2>
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
            <div>
              <div className="capitalize">{ab}</div>
              <div className="text-parchment/40 text-xs max-w-[300px]">{ABILITY_BLURBS[ab]}</div>
            </div>
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

function LanguagesStep({ selectedLanguages, setSelectedLanguages }: any) {
  function toggle(l: string) {
    setSelectedLanguages((prev: string[]) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l])
  }
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-2">Languages</h2>
      <p className="text-parchment/40 text-xs italic mb-3">Common (automatic) + choose 2 Standard Languages:</p>
      {STANDARD_LANGUAGES.map((l) => {
        const on = selectedLanguages.includes(l)
        const disabled = !on && selectedLanguages.length >= 2
        return <Chip key={l} selected={on} disabled={disabled} onClick={() => toggle(l)}>{l}</Chip>
      })}
    </div>
  )
}

function SpellsStep({
  selectedClass, classCantrips, classSpells, selectedCantrips, setSelectedCantrips, selectedSpells, setSelectedSpells, spellCount,
  hasMagicInitiate, effectiveOriginFeat, miClassName, setMiClassName, miClassOptions, miCantripOptions, miSpellOptions, miCantrips, setMiCantrips, miSpell, setMiSpell,
}: any) {
  function toggleCantrip(name: string) {
    setSelectedCantrips((prev: string[]) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name])
  }
  function toggleSpell(name: string) {
    setSelectedSpells((prev: string[]) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name])
  }
  function toggleMiCantrip(name: string) {
    setMiCantrips((prev: string[]) => prev.includes(name) ? prev.filter((x) => x !== name) : prev.length >= 2 ? prev : [...prev, name])
  }

  const isCaster = !!selectedClass?.spellcasting_type
  if (!isCaster && !hasMagicInitiate) {
    return <p className="text-parchment/40 text-sm italic">{selectedClass?.name ?? 'This class'} does not cast spells, and your Origin feat isn't Magic Initiate — nothing to pick here.</p>
  }

  const cantripCount = selectedClass?.cantrips_known_at_1 ?? 0

  return (
    <div>
      {isCaster && (
        <>
          <h2 className="font-display text-xl text-candle mb-3">{selectedClass.name} Spells</h2>
          {classCantrips.length > 0 ? (
            <>
              <h3 className="font-display text-sm text-candle mb-2">Cantrips (choose {cantripCount})</h3>
              {classCantrips.map((sp: Spell) => {
                const on = selectedCantrips.includes(sp.name)
                const disabled = !on && selectedCantrips.length >= cantripCount
                return (
                  <Tooltip key={sp.id} label={<Chip selected={on} disabled={disabled} onClick={() => toggleCantrip(sp.name)}>{sp.name}</Chip>}
                    title={sp.name} subtitle={`Cantrip · ${sp.school}`} body={sp.description} className="inline-block" />
                )
              })}
            </>
          ) : <p className="text-parchment/40 text-xs italic">{selectedClass.name} does not get cantrips at level 1.</p>}

          {classSpells.length > 0 && (
            <>
              <h3 className="font-display text-sm text-candle mt-5 mb-2">
                {selectedClass.spellcasting_type === 'prepared' ? 'Prepared spells' : 'Spells known'} (choose {spellCount})
              </h3>
              {classSpells.map((sp: Spell) => {
                const on = selectedSpells.includes(sp.name)
                const disabled = !on && selectedSpells.length >= spellCount
                return (
                  <Tooltip key={sp.id} label={<Chip selected={on} disabled={disabled} onClick={() => toggleSpell(sp.name)}>{sp.name}</Chip>}
                    title={sp.name} subtitle={`1st level · ${sp.school}`} body={sp.description} className="inline-block" />
                )
              })}
            </>
          )}
          {selectedClass.name === 'Paladin' && (
            <p className="text-parchment/40 text-xs italic mt-3">Divine Smite is always prepared in addition to your chosen spells — not counted against your pick limit above.</p>
          )}
          <p className="text-parchment/40 text-xs italic mt-2">This covers cantrips and 1st-level spells only, since that's all a level-1 character can access.</p>
        </>
      )}

      {hasMagicInitiate && (
        <div className={isCaster ? 'mt-8 pt-6 border-t border-mist' : ''}>
          <h2 className="font-display text-xl text-candle mb-1">Magic Initiate</h2>
          <p className="text-parchment/40 text-xs italic mb-3">
            Your Origin feat ({effectiveOriginFeat?.name}) grants 2 cantrips + 1 first-level spell from one class's list, castable once per Long Rest without a spell slot.
          </p>
          <h3 className="font-display text-sm text-candle mb-2">Choose a source class</h3>
          {miClassOptions.map((cn: string) => (
            <Chip key={cn} selected={miClassName === cn} onClick={() => { setMiClassName(cn); setMiCantrips([]); setMiSpell(null) }}>{cn}</Chip>
          ))}
          {miClassName && (
            <>
              <h3 className="font-display text-sm text-candle mt-4 mb-2">Cantrips (choose 2)</h3>
              {miCantripOptions.map((sp: Spell) => {
                const on = miCantrips.includes(sp.name)
                const disabled = !on && miCantrips.length >= 2
                return (
                  <Tooltip key={sp.id} label={<Chip selected={on} disabled={disabled} onClick={() => toggleMiCantrip(sp.name)}>{sp.name}</Chip>}
                    title={sp.name} subtitle={`Cantrip · ${sp.school}`} body={sp.description} className="inline-block" />
                )
              })}
              <h3 className="font-display text-sm text-candle mt-4 mb-2">1st-level spell (choose 1)</h3>
              {miSpellOptions.map((sp: Spell) => (
                <Tooltip key={sp.id} label={<Chip selected={miSpell === sp.name} onClick={() => setMiSpell(sp.name)}>{sp.name}</Chip>}
                  title={sp.name} subtitle={`1st level · ${sp.school}`} body={sp.description} className="inline-block" />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function EquipmentStep({ selectedClass, classEquipChoice, setClassEquipChoice, selectedBackground, bgEquipChoice, setBgEquipChoice }: any) {
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-3">Starting equipment</h2>
      <h3 className="font-display text-sm text-candle mb-2">From your class{selectedClass ? ` (${selectedClass.name})` : ''}</h3>
      {selectedClass?.starting_equipment?.length ? selectedClass.starting_equipment.map((opt: any) => (
        <div
          key={opt.label}
          onClick={() => setClassEquipChoice(opt.label)}
          className={`border rounded-sm p-3 mb-2.5 cursor-pointer text-sm ${classEquipChoice === opt.label ? 'border-candle bg-blood/20' : 'border-mist hover:border-candle/50'}`}
        >
          {opt.items ? `Option ${opt.label}: ${opt.items.join(', ')}` : `Option ${opt.label}: ${opt.gold} gp instead — buy your own gear`}
        </div>
      )) : <p className="text-parchment/40 text-xs italic">Pick a class first.</p>}

      <h3 className="font-display text-sm text-candle mt-5 mb-2">From your background{selectedBackground ? ` (${selectedBackground.name})` : ''}</h3>
      {selectedBackground ? (
        <>
          <div onClick={() => setBgEquipChoice('kit')} className={`border rounded-sm p-3 mb-2.5 cursor-pointer text-sm ${bgEquipChoice === 'kit' ? 'border-candle bg-blood/20' : 'border-mist hover:border-candle/50'}`}>
            Take the kit: {selectedBackground.equipment.map((e: any) => `${e.qty}× ${e.item}`).join(', ')}
          </div>
          <div onClick={() => setBgEquipChoice('gold')} className={`border rounded-sm p-3 cursor-pointer text-sm ${bgEquipChoice === 'gold' ? 'border-candle bg-blood/20' : 'border-mist hover:border-candle/50'}`}>
            Take {selectedBackground.gold_alternative} gp instead
          </div>
        </>
      ) : <p className="text-parchment/40 text-xs italic">Pick a background first.</p>}
    </div>
  )
}

function ReviewStep(props: any) {
  const {
    name, selectedSpecies, selectedClass, selectedBackground, humanSkill, humanOriginFeatId, originFeats,
    fightingStyle, invocation, selectedLanguages, selectedCantrips, selectedSpells,
    classEquipChoice, bgEquipChoice, alignment, setAlignment,
    hasMagicInitiate, miClassName, miCantrips, miSpell, autoSpeciesCantrip,
    error, saving, onSubmit,
  } = props
  const humanFeat = originFeats.find((f: Feat) => f.id === humanOriginFeatId)
  return (
    <div>
      <h2 className="font-display text-xl text-candle mb-4">Review</h2>
      <div className="space-y-1 text-sm text-parchment/80 mb-4">
        <p><span className="text-parchment/50">Name:</span> {name || '—'}</p>
        <p><span className="text-parchment/50">Species:</span> {selectedSpecies?.name ?? '—'}</p>
        {humanSkill && <p><span className="text-parchment/50">Bonus Skill:</span> {humanSkill}</p>}
        {humanFeat && <p><span className="text-parchment/50">Origin Feat (Versatile):</span> {humanFeat.name}</p>}
        {autoSpeciesCantrip && <p><span className="text-parchment/50">Species Cantrip:</span> {autoSpeciesCantrip}</p>}
        <p><span className="text-parchment/50">Class:</span> {selectedClass?.name ?? '—'}</p>
        {fightingStyle && <p><span className="text-parchment/50">Fighting Style:</span> {fightingStyle}</p>}
        {invocation && <p><span className="text-parchment/50">Eldritch Invocation:</span> {invocation}</p>}
        <p><span className="text-parchment/50">Background:</span> {selectedBackground?.name ?? '—'}</p>
        <p><span className="text-parchment/50">Languages:</span> Common{selectedLanguages.length ? `, ${selectedLanguages.join(', ')}` : ''}</p>
        {selectedCantrips.length > 0 && <p><span className="text-parchment/50">Cantrips:</span> {selectedCantrips.join(', ')}</p>}
        {selectedSpells.length > 0 && <p><span className="text-parchment/50">Spells:</span> {selectedSpells.join(', ')}</p>}
        {hasMagicInitiate && miClassName && (
          <p><span className="text-parchment/50">Magic Initiate ({miClassName}):</span> {[...miCantrips, miSpell].filter(Boolean).join(', ') || '—'}</p>
        )}
        {classEquipChoice && <p><span className="text-parchment/50">Class Equipment:</span> Option {classEquipChoice}</p>}
        <p><span className="text-parchment/50">Background Equipment:</span> {bgEquipChoice === 'kit' ? 'Kit' : `${selectedBackground?.gold_alternative ?? 50} gp`}</p>
      </div>
      <h3 className="font-display text-sm text-candle mb-2">Alignment</h3>
      {ALIGNMENTS.map((a) => (
        <Chip key={a} selected={alignment === a} onClick={() => setAlignment(a)}>{a}</Chip>
      ))}
      {error && <p className="text-blood-bright text-sm mt-4">{error}</p>}
      <button onClick={onSubmit} disabled={saving} className="w-full bg-blood hover:bg-blood-bright transition rounded-sm py-2 mt-6 font-display text-sm tracking-wide">
        {saving ? 'Sealing the pact…' : 'Enter Barovia'}
      </button>
    </div>
  )
}
