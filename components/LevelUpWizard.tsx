'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'

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
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2],
}
const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2],
}
// Warlock Pact Magic: always the same slot level, recharges on a short rest.
const PACT_MAGIC: Record<number, { slots: number; slotLevel: number }> = {
  1: { slots: 1, slotLevel: 1 }, 2: { slots: 2, slotLevel: 1 }, 3: { slots: 2, slotLevel: 2 },
  4: { slots: 2, slotLevel: 2 }, 5: { slots: 2, slotLevel: 3 },
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
  const isASILevel = newLevel === 4
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
  const [subclassOptions, setSubclassOptions] = useState<SubclassOption[]>([])
  const [chosenSubclassId, setChosenSubclassId] = useState<string | null>(null)
  const [asiChoice, setAsiChoice] = useState<'asi' | 'feat' | null>(null)
  const [asiMode, setAsiMode] = useState<'one' | 'two'>('one')
  const [asiPicks, setAsiPicks] = useState<string[]>([])
  const [availableFeats, setAvailableFeats] = useState<FeatOption[]>([])
  const [chosenFeatId, setChosenFeatId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    async function load() {
      setLoading(true)
      const [featuresRes, subclassRes, featsRes] = await Promise.all([
        supabase.from('class_features').select('name, description')
          .eq('class_id', character.class_id).eq('level', newLevel).is('subclass_id', null),
        willUnlockSubclass
          ? supabase.from('subclasses').select('id, name, features').eq('class_id', character.class_id).eq('unlocks_at_level', newLevel)
          : Promise.resolve({ data: [] as SubclassOption[] }),
        isASILevel
          ? supabase.from('feats').select('id, name, description, prerequisite').eq('category', 'general').order('name')
          : Promise.resolve({ data: [] as FeatOption[] }),
      ])
      setNewFeatures((featuresRes.data ?? []) as ClassFeature[])
      setSubclassOptions((subclassRes.data ?? []) as unknown as SubclassOption[])
      setAvailableFeats((featsRes.data ?? []) as FeatOption[])

      const needsFightingStyle = ((featuresRes.data ?? []) as ClassFeature[]).some((f) => f.name === 'Fighting Style')
      if (needsFightingStyle && character.class?.name) {
        const allowed = FIGHTING_STYLE_OPTIONS[character.class.name] ?? []
        const stylesRes = await supabase.from('feats').select('id, name, description, prerequisite').eq('category', 'fighting_style')
        setFightingStyleOptions(((stylesRes.data ?? []) as FeatOption[]).filter((f) => allowed.includes(f.name)))
      } else {
        setFightingStyleOptions([])
      }

      const invocationFeature = ((featuresRes.data ?? []) as ClassFeature[]).find((f) => f.name === 'Eldritch Invocations')
      if (invocationFeature) {
        const invRes = await supabase.from('feats').select('id, name, description, prerequisite').eq('category', 'eldritch_invocation').order('name')
        setInvocationOptions((invRes.data ?? []) as FeatOption[])
        setInvocationCount(2) // Warlocks gain two invocations at 2nd level, the only invocation-granting level in this range
      } else {
        setInvocationOptions([])
        setInvocationCount(0)
      }
      setLoading(false)
    }
    load()
    // Reset wizard state each time it's opened fresh.
    setStep('hp'); setHpMethod(null); setRolledHp(null); setChosenSubclassId(null)
    setAsiChoice(null); setAsiMode('one'); setAsiPicks([]); setChosenFeatId(null); setChosenFightingStyleId(null)
    setChosenInvocationIds([])
  }, [open, character.class_id, newLevel, willUnlockSubclass, isASILevel])

  if (!open) return null

  const hpGain = (hpMethod === 'roll' ? (rolledHp ?? 0) : hpMethod === 'average' ? averageRoll : 0) + conMod
  const hpGainFloor = Math.max(1, hpGain) // HP gained on level-up is always at least 1

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

  const steps: typeof step[] = ['hp', 'features', ...(willUnlockSubclass ? ['subclass' as const] : []), ...(isASILevel ? ['asi' as const] : []), 'confirm']
  const stepIndex = steps.indexOf(step)
  const canAdvance =
    (step === 'hp' && hpMethod !== null && (hpMethod === 'average' || rolledHp !== null)) ||
    (step === 'features' && (fightingStyleOptions.length === 0 || chosenFightingStyleId !== null) && (invocationCount === 0 || chosenInvocationIds.length === invocationCount)) ||
    (step === 'subclass' && chosenSubclassId !== null) ||
    (step === 'asi' && ((asiChoice === 'asi' && asiPicks.length === (asiMode === 'one' ? 1 : 2)) || (asiChoice === 'feat' && chosenFeatId !== null))) ||
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
    const newMaxHp = character.max_hp + hpGainFloor
    const newCurrentHp = character.current_hp + hpGainFloor
    const abilityUpdates: Record<string, number> = {}
    if (asiChoice === 'asi') {
      for (const ability of asiPicks) {
        const current = (character as any)[ability] as number
        const bump = asiMode === 'one' ? 2 : 1
        abilityUpdates[ability] = Math.min(20, current + bump)
      }
    }

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
              </p>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => setHpMethod('average')}
                  className={`flex-1 border rounded-sm py-2 text-sm transition-colors ${hpMethod === 'average' ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                >
                  Take Average ({averageRoll} + {conMod >= 0 ? `+${conMod}` : conMod} = {Math.max(1, averageRoll + conMod)})
                </button>
                <button
                  onClick={() => { setHpMethod('roll'); setRolledHp(1 + Math.floor(Math.random() * hitDie)) }}
                  className={`flex-1 border rounded-sm py-2 text-sm transition-colors ${hpMethod === 'roll' ? 'border-candle text-candle' : 'border-mist text-parchment/70 hover:border-candle/50'}`}
                >
                  Roll d{hitDie}{rolledHp !== null ? ` → ${rolledHp} + ${conMod >= 0 ? `+${conMod}` : conMod} = ${Math.max(1, rolledHp + conMod)}` : ''}
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
                        <input type="radio" name="feat" checked={chosenFeatId === f.id} onChange={() => setChosenFeatId(f.id)} />
                        <span className="text-base text-candle">{f.name}</span>
                        {f.prerequisite && <span className="text-xs text-parchment/40">({f.prerequisite})</span>}
                      </div>
                      <p className="text-sm text-parchment/60 ml-6 leading-snug">{f.description}</p>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <h3 className="font-display text-base text-candle mb-2">Confirm</h3>
              <ul className="text-sm text-parchment/80 space-y-1 mb-2">
                <li>Level {character.level} → {newLevel}</li>
                <li>HP: {character.max_hp} → {character.max_hp + hpGainFloor} (+{hpGainFloor})</li>
                {newFeatures.length > 0 && <li>New features: {newFeatures.map((f) => f.name).join(', ')}</li>}
                {chosenFightingStyleId && <li>Fighting Style: {fightingStyleOptions.find((f) => f.id === chosenFightingStyleId)?.name}</li>}
                {chosenInvocationIds.length > 0 && <li>Eldritch Invocations: {chosenInvocationIds.map((id) => invocationOptions.find((f) => f.id === id)?.name).join(', ')}</li>}
                {chosenSubclassId && <li>Subclass: {subclassOptions.find((s) => s.id === chosenSubclassId)?.name}</li>}
                {asiChoice === 'asi' && <li>Ability increase: {asiPicks.map((a) => ABILITY_LABELS[a]).join(', ')}</li>}
                {asiChoice === 'feat' && <li>Feat: {availableFeats.find((f) => f.id === chosenFeatId)?.name}</li>}
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
