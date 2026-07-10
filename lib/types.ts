export type Species = {
  id: string
  name: string
  size: string
  speed: number
  ability_score_increase: Record<string, number> // e.g. {"constitution": 2}
  traits: { name: string; description: string }[]
}

export type SpeciesSubrace = {
  id: string
  species_id: string
  name: string
  ability_score_increase: Record<string, number>
  traits: { name: string; description: string }[]
}

export type DraconicAncestry = {
  id: string
  dragon_type: string
  damage_type: string
  breath_weapon_shape: string
  breath_weapon_save: string
}

export type ClassRow = {
  id: string
  name: string
  hit_die: number
  primary_ability: string[]
  saving_throw_proficiencies: string[]
  spellcasting_ability: string | null
  spellcasting_type: string | null
  cantrips_known_at_1: number
  spellcasting_starts_at_level: number // Paladin/Ranger = 2, everyone else = 1
  subclass_starts_at_level: number // Cleric/Sorcerer/Warlock = 1, Druid/Wizard = 2, rest = 3
  skill_choices: { choose: number; from: string[] } // from: ["any"] means any skill
  starting_equipment: { label: string; items?: string[]; gold?: number }[]
}

export type Subclass = {
  id: string
  class_id: string
  name: string
  unlocks_at_level: number
  features: { name: string; description: string; level: number }[]
  granted_spells: { level: number; spells: string[] }[]
}

export type Background = {
  id: string
  name: string
  skill_proficiencies: string[] // fixed pair, not a choice, in the 2014 rules
  tool_proficiency: string | null
  equipment: { item: string; qty: number }[]
  feature_name: string | null
  feature_description: string | null
  bonus_languages: number
}

export type Feat = {
  id: string
  name: string
  category: string // 'general' | 'fighting_style' | 'pact_boon' | 'eldritch_invocation'
  prerequisite: string | null
  description: string
  grants: Record<string, unknown> | null
}

export type Spell = {
  id: string
  name: string
  level: number
  school: string
  casting_time: string
  range: string
  components: string
  duration: string
  concentration: boolean
  ritual: boolean
  classes: string[]
  description: string
  higher_levels: string | null
  grants: Record<string, unknown> | null
}

export type Item = {
  id: string
  name: string
  category: string
  requires_attunement: boolean
  weight: number | null
  cost: string | null
  properties: Record<string, unknown>
  description: string
}

export type AbilityScores = {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export const ABILITY_KEYS: (keyof AbilityScores)[] = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
]

// Rare languages (Druidic, Thieves' Cant, etc.) come only from specific class features,
// never as a level-1 choice — matches the 2014 rules same as it did for 2024.
export const STANDARD_LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin',
  'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Draconic', 'Deep Speech',
  'Infernal', 'Primordial', 'Sylvan', 'Undercommon',
]

export const ALL_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
]

export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
]

export const PB_BUDGET = 27
export const PB_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
export function pbCost(score: number) { return PB_COST[score] ?? 0 }
export function abilityModifier(score: number) { return Math.floor((score - 10) / 2) }

// Species that have subraces in the 2014 PHB
export const SUBRACE_SPECIES = ['Dwarf', 'Elf', 'Halfling', 'Gnome']

// Ranger's level-1 choices — standard category lists (not per-option mechanical data the way
// Draconic Ancestry has), so kept as constants rather than seeded DB rows.
export const FAVORED_ENEMY_TYPES = [
  'Aberrations', 'Beasts', 'Celestials', 'Constructs', 'Dragons', 'Elementals',
  'Fey', 'Fiends', 'Giants', 'Monstrosities', 'Oozes', 'Plants', 'Undead',
  'Two races of humanoid (DM\u2019s choice of which two)',
]
export const FAVORED_TERRAIN_TYPES = [
  'Arctic', 'Coast', 'Desert', 'Forest', 'Grassland', 'Mountain', 'Swamp', 'Underdark',
]
