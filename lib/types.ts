export type Species = {
  id: string
  name: string
  size: string
  speed: number
  traits: { name: string; description: string }[]
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
  starting_equipment: { label: string; items?: string[]; gold?: number }[]
}

export type Background = {
  id: string
  name: string
  origin_feat_id: string
  skill_proficiencies: string[]
  tool_proficiency: string | null
  ability_score_options: string[]
  equipment: { item: string; qty: number }[]
  gold_alternative: number
}

export type Feat = {
  id: string
  name: string
  category: string
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
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]

export const STANDARD_LANGUAGES = [
  'Common Sign Language',
  'Draconic',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Orc',
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
