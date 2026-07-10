-- ============================================================
-- BAROVIA / D&D 5e (2024) CHARACTER APP — CORE SCHEMA
-- Phase 1: Content reference + Character creation + Sheet
-- ============================================================

-- ---------- CONTENT REFERENCE LAYER ----------
-- This is the "glossary" — everything hoverable/lookupable,
-- and everything character creation pulls choices from.

create table species (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- "Human", "Tiefling", "Dhampir" (Ravenloft-flavor if you want it)
  size text not null,                      -- "Small", "Medium"
  speed int not null default 30,
  traits jsonb not null default '[]',      -- [{name, description}]
  source text                              -- "PHB 2024", "Curse of Strahd"
);
-- Design decision: no innate darkvision from species, to keep light/vision management
-- an active table concern in Barovia's mist and fog. Vision-granting effects (darkvision,
-- low-light vision, etc.) instead live as structured grants on feats, items, and spells —
-- e.g. items.properties -> {"grants_vision": {"type": "darkvision", "range": 60}} or
-- feats.grants -> {"grants_vision": {"type": "darkvision", "range": 60}}. Keeps vision as
-- a single concern sourced from equipment/abilities rather than half-baked into species too.

create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- "Wizard", "Rogue"
  hit_die int not null,                    -- 6/8/10/12
  primary_ability text[] not null,
  saving_throw_proficiencies text[] not null,
  spellcasting_ability text,               -- null if non-caster
  spellcasting_type text,                  -- 'prepared' | 'known' | 'pact' | null
  cantrips_known_at_1 int not null default 0,
  starting_equipment jsonb not null default '[]',
  -- Array of named options, e.g.
  -- [{"label":"A","items":["Chain Mail","Longsword","Shield"]},
  --  {"label":"B","gold":155}]
  -- 2024 rule: pick ONE option — an equipment package (last option is always
  -- the flat-gold alternative, no rolling).
  source text
);

create table subclasses (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  name text not null,                      -- "School of Necromancy"
  unlocks_at_level int not null default 3,
  source text,
  unique(class_id, name)
);

create table class_features (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  subclass_id uuid references subclasses(id) on delete cascade, -- null if base class feature
  level int not null,
  name text not null,
  description text not null,
  -- mechanical hooks: what this feature actually DOES to the sheet
  grants_resource jsonb,                   -- {name: "Rage", max_formula: "2", recharge: "long_rest"}
  grants_choice jsonb                      -- e.g. fighting style choice, invocation choice
);

create table backgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- "Haunted One" (great fit for Strahd)
  origin_feat_id uuid,                     -- fk added after feats table exists
  skill_proficiencies text[] not null,
  tool_proficiency text,
  ability_score_options text[] not null,   -- 2024: pick from 3 abilities, +2/+1 or +1/+1/+1
  equipment jsonb not null default '[]',
  gold_alternative int not null default 50, -- 2024 rule: take the kit above, or a flat 50 gp instead
  source text
);

create table feats (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,                  -- 'origin' | 'general' | 'fighting_style' | 'epic_boon'
  prerequisite text,
  description text not null,
  grants jsonb,                            -- mechanical effects, structured
  source text
);

alter table backgrounds
  add constraint backgrounds_origin_feat_fk
  foreign key (origin_feat_id) references feats(id);

create table spells (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level int not null,                      -- 0 = cantrip
  school text not null,
  casting_time text not null,
  range text not null,
  components text not null,                -- "V, S, M (a bit of fur)"
  duration text not null,
  concentration boolean not null default false,
  ritual boolean not null default false,
  classes text[] not null,                 -- which class lists it appears on
  description text not null,
  higher_levels text,
  grants jsonb,                             -- structured mechanical effects, e.g.
                                             -- {"grants_vision": {"type": "darkvision", "range": 60}}
  source text
);

create table items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,                  -- 'weapon' | 'armor' | 'gear' | 'magic_item' | 'tool'
  rarity text,                             -- null for mundane, else common/uncommon/rare/...
  requires_attunement boolean not null default false,
  weight numeric,
  cost text,
  properties jsonb not null default '{}',  -- damage dice, AC bonus, weapon properties, etc.
  description text not null,
  source text                              -- flag Strahd-unique items e.g. "Curse of Strahd", Tarokka items
);

create table conditions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- "Grappled", "Frightened", "Exhaustion"
  description text not null,
  is_stacking boolean not null default false -- true only for Exhaustion in 2024 rules
);

create table monsters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stat_block jsonb not null,               -- full structured block, DM-facing not player-facing
  source text,                             -- "Monster Manual", "Curse of Strahd"
  unique(name, source)
);

-- ---------- CAMPAIGN / USER LAYER ----------

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,                      -- "Curse of Strahd"
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  auth_user_id uuid                        -- link to Supabase auth if/when you add logins
);

-- ---------- CHARACTER LAYER ----------

create table characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  player_id uuid references players(id),
  name text not null,
  species_id uuid references species(id),
  class_id uuid references classes(id),
  subclass_id uuid references subclasses(id),   -- null until subclass level is reached
  background_id uuid references backgrounds(id),
  alignment text,
  level int not null default 1,
  experience_points int not null default 0,

  -- core stats
  strength int not null default 10,
  dexterity int not null default 10,
  constitution int not null default 10,
  intelligence int not null default 10,
  wisdom int not null default 10,
  charisma int not null default 10,

  -- vitals
  max_hp int not null default 0,
  current_hp int not null default 0,
  temp_hp int not null default 0,
  hit_dice_total int not null default 1,
  hit_dice_remaining int not null default 1,
  armor_class int not null default 10,
  initiative_bonus int not null default 0,
  speed int not null default 30,
  exhaustion_level int not null default 0,   -- 0-6, stacking -1 per level (2024 rules)
  death_save_successes int not null default 0,
  death_save_failures int not null default 0,
  inspiration boolean not null default false,

  is_quickstart_template boolean not null default false, -- true for premade archetypes
  background_asi jsonb,                      -- records the background ability bonus choice,
                                               -- e.g. {"strength":2,"wisdom":1} or {"strength":1,"wisdom":1,"charisma":1}
                                               -- already baked into the ability score columns above;
                                               -- kept here for transparency/audit on the sheet
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2024 rule: everyone knows Common plus 2 chosen Standard Languages at creation.
-- Rare languages (Abyssal, Druidic, Undercommon, etc.) are NOT selectable at creation —
-- confirmed against the 2024 PHB: they only come from specific class features later
-- (Druidic, Thieves' Cant, Ranger's Deft Explorer), never as a level-1 choice.
create table character_languages (
  character_id uuid references characters(id) on delete cascade,
  language text not null,
  is_rare boolean not null default false,
  source text,                                -- 'default' | 'chosen' | class feature name
  primary key (character_id, language)
);

-- Note: no multiclassing in this campaign — class/subclass live directly on
-- the characters row above, rather than a character_classes junction table.
-- This keeps proficiency bonus, spell slots, and resource scaling as simple
-- single-class lookups everywhere downstream instead of aggregations.

create table character_feats (
  character_id uuid references characters(id) on delete cascade,
  feat_id uuid references feats(id),
  source text,                              -- 'background' | 'level_4' | 'level_8' etc.
  primary key (character_id, feat_id)
);

create table character_skills (
  character_id uuid references characters(id) on delete cascade,
  skill_name text not null,                 -- "Stealth", "Arcana", etc.
  proficient boolean not null default false,
  expertise boolean not null default false,
  primary key (character_id, skill_name)
);

create table character_spells (
  character_id uuid references characters(id) on delete cascade,
  spell_id uuid references spells(id),
  is_prepared boolean not null default false, -- relevant for prepared casters
  is_always_known boolean not null default false, -- known casters / domain spells etc.
  primary key (character_id, spell_id)
);

create table character_spell_slots (
  character_id uuid references characters(id) on delete cascade,
  slot_level int not null,                  -- 1-9
  max_slots int not null default 0,
  used_slots int not null default 0,
  primary key (character_id, slot_level)
);

-- flexible pool for class resources: Rage uses, Ki points, Sorcery Points,
-- Bardic Inspiration, Channel Divinity, etc. — one row per resource
create table character_resources (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references characters(id) on delete cascade,
  name text not null,                       -- "Rage", "Ki Points"
  max_value int not null,
  current_value int not null,
  recharge text not null                    -- 'short_rest' | 'long_rest' | 'other'
);

create table character_conditions (
  character_id uuid references characters(id) on delete cascade,
  condition_id uuid references conditions(id),
  applied_at timestamptz not null default now(),
  note text,                                -- "from Strahd's Charm", duration tracking etc.
  primary key (character_id, condition_id)
);

create table character_inventory (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references characters(id) on delete cascade,
  item_id uuid references items(id),          -- null when item_name is used instead
  item_name text,                              -- fallback for equipment-package strings that
                                                 -- don't have a catalog match yet (cleanup pass
                                                 -- once the DMG/PHB equipment chapter is seeded)
  quantity int not null default 1,
  equipped boolean not null default false,
  attuned boolean not null default false,
  note text
);

create table character_currency (
  character_id uuid primary key references characters(id) on delete cascade,
  cp int not null default 0,
  sp int not null default 0,
  ep int not null default 0,
  gp int not null default 0,
  pp int not null default 0
);

-- ---------- INDEXES ----------
create index on class_features (class_id, level);
create index on characters (class_id);
create index on character_spells (character_id);
create index on character_inventory (character_id);
create index on characters (campaign_id);
