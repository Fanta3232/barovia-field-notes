-- ============================================================
-- SEED DATA v2 — full SRD 5.2 scope for level-1 creation,
-- matching everything validated in the HTML preview.
-- Strahd-specific / PHB-DMG-gap content still to come from the PDFs.
-- ============================================================

-- SPECIES (all 10 from the 2024 core rules)
-- Note: darkvision intentionally omitted from every species per house rule — vision in
-- dark/dim spaces is sourced from items, spells, and feats only (see items/feats/spells below).
insert into species (name, size, speed, traits, source) values
('Human', 'Medium', 30,
  '[{"name":"Resourceful","description":"You gain Heroic Inspiration whenever you finish a Long Rest."},
    {"name":"Skillful","description":"You gain proficiency in one skill of your choice."},
    {"name":"Versatile","description":"You gain an Origin feat of your choice."}]', 'PHB 2024'),
('Elf', 'Medium', 30,
  '[{"name":"Fey Ancestry","description":"Advantage on saves against being Charmed; magic cannot put you to sleep."},
    {"name":"Trance","description":"You do not need to sleep; instead you meditate for 4 hours to gain the benefit of a Long Rest."},
    {"name":"Elven Lineage","description":"Choose Drow, High, or Wood lineage, each granting a cantrip and later spells."}]', 'PHB 2024'),
('Dwarf', 'Medium', 30,
  '[{"name":"Dwarven Resilience","description":"Resistance to Poison damage; advantage on saves against Poisoned."},
    {"name":"Dwarven Toughness","description":"Your HP maximum increases by 1, and by 1 again each level."},
    {"name":"Stonecunning","description":"Bonus action to gain Tremorsense 60ft, and expertise on stone-related Intelligence (History) checks, for 10 minutes."}]', 'PHB 2024'),
('Tiefling', 'Medium', 30,
  '[{"name":"Fiendish Legacy","description":"Choose a legacy (Abyssal, Chthonic, or Infernal) granting a cantrip and later spells."},
    {"name":"Otherworldly Presence","description":"You know the Thaumaturgy cantrip."},
    {"name":"Resistance","description":"Resistance to damage type determined by your legacy (default: Fire)."}]', 'PHB 2024'),
('Aasimar', 'Medium', 30,
  '[{"name":"Celestial Resistance","description":"Resistance to Necrotic and Radiant damage."},
    {"name":"Healing Hands","description":"Once per Long Rest, touch a creature to heal it for HP equal to your level."},
    {"name":"Light Bearer","description":"You know the Light cantrip."}]', 'PHB 2024'),
('Dragonborn', 'Medium', 30,
  '[{"name":"Breath Weapon","description":"Exhale destructive energy in a shape and damage type tied to your draconic ancestry."},
    {"name":"Damage Resistance","description":"Resistance to the damage type associated with your draconic ancestry."},
    {"name":"Draconic Flight","description":"Starting at level 5, bonus action to sprout wings and gain a flying speed equal to your walking speed for 10 minutes."}]', 'PHB 2024'),
('Gnome', 'Small', 30,
  '[{"name":"Gnomish Cunning","description":"Advantage on Intelligence, Wisdom, and Charisma saving throws against magic."},
    {"name":"Gnomish Lineage","description":"Choose Forest or Rock lineage, each granting a cantrip and later spells."}]', 'PHB 2024'),
('Goliath', 'Medium', 35,
  '[{"name":"Giant Ancestry","description":"Choose a benefit tied to giant lineage (e.g. Cloud''s Jaunt, Fire''s Burn, Stone''s Endurance)."},
    {"name":"Large Form","description":"Starting at level 5, bonus action to grow one size larger for 10 minutes, once per Long Rest."}]', 'PHB 2024'),
('Halfling', 'Small', 30,
  '[{"name":"Luck","description":"Reroll a 1 on a d20 Test once per roll."},
    {"name":"Naturally Stealthy","description":"You can take the Hide action even when obscured only by a creature at least one size larger."}]', 'PHB 2024'),
('Orc', 'Medium', 30,
  '[{"name":"Adrenaline Rush","description":"Bonus action to Dash and gain temporary HP equal to your proficiency bonus; recharges on Short or Long Rest."},
    {"name":"Relentless Endurance","description":"When reduced to 0 HP but not killed outright, drop to 1 HP instead, once per Long Rest."}]', 'PHB 2024');

-- CLASSES (all 12)
insert into classes (name, hit_die, primary_ability, saving_throw_proficiencies, spellcasting_ability, spellcasting_type, cantrips_known_at_1, starting_equipment, source) values
('Barbarian', 12, array['Strength'], array['Strength','Constitution'], null, null, 0,
  '[{"label":"A","items":["Greataxe","4 Handaxes","Explorer''s Pack"]},
    {"label":"B","gold":75}]', 'PHB 2024'),
('Bard', 8, array['Charisma'], array['Dexterity','Charisma'], 'Charisma', 'known', 2,
  '[{"label":"A","items":["Leather Armor","Rapier","Diplomat''s Pack or Entertainer''s Pack","Musical Instrument"]},
    {"label":"B","gold":110}]', 'PHB 2024'),
('Cleric', 8, array['Wisdom'], array['Wisdom','Charisma'], 'Wisdom', 'prepared', 3,
  '[{"label":"A","items":["Mace","Chain Shirt","Shield","Holy Symbol","Priest''s Pack"]},
    {"label":"B","gold":110}]', 'PHB 2024'),
('Druid', 8, array['Wisdom'], array['Intelligence','Wisdom'], 'Wisdom', 'prepared', 2,
  '[{"label":"A","items":["Leather Armor","Sickle or Quarterstaff","Druidic Focus","Explorer''s Pack"]},
    {"label":"B","gold":50}]', 'PHB 2024'),
('Fighter', 10, array['Strength','Dexterity'], array['Strength','Constitution'], null, null, 0,
  '[{"label":"A","items":["Chain Mail","Longsword","Shield","6 Javelins"]},
    {"label":"B","items":["Leather Armor","Longbow + 20 arrows","Two Longswords"]},
    {"label":"C","gold":155}]', 'PHB 2024'),
('Monk', 8, array['Dexterity','Wisdom'], array['Strength','Dexterity'], null, null, 0,
  '[{"label":"A","items":["Spear","5 Darts","Explorer''s Pack"]},
    {"label":"B","gold":50}]', 'PHB 2024'),
('Paladin', 10, array['Strength','Charisma'], array['Wisdom','Charisma'], 'Charisma', 'prepared', 0,
  '[{"label":"A","items":["Chain Mail","Longsword","Shield","Holy Symbol","Priest''s Pack"]},
    {"label":"B","gold":150}]', 'PHB 2024'),
('Ranger', 10, array['Dexterity','Wisdom'], array['Strength','Dexterity'], 'Wisdom', 'known', 0,
  '[{"label":"A","items":["Leather Armor","Two Shortswords","Longbow + 20 arrows","Explorer''s Pack"]},
    {"label":"B","gold":150}]', 'PHB 2024'),
('Rogue', 8, array['Dexterity'], array['Dexterity','Intelligence'], null, null, 0,
  '[{"label":"A","items":["Rapier","Shortbow + 20 arrows","Leather Armor","Thieves'' Tools","Burglar''s Pack"]},
    {"label":"B","gold":100}]', 'PHB 2024'),
('Sorcerer', 6, array['Charisma'], array['Constitution','Charisma'], 'Charisma', 'known', 4,
  '[{"label":"A","items":["Two Daggers","Arcane Focus","Dungeoneer''s Pack"]},
    {"label":"B","gold":50}]', 'PHB 2024'),
('Warlock', 8, array['Charisma'], array['Wisdom','Charisma'], 'Charisma', 'pact', 2,
  '[{"label":"A","items":["Light Crossbow + 20 bolts","Component Pouch","Leather Armor","Simple Weapon","Scholar''s Pack"]},
    {"label":"B","gold":100}]', 'PHB 2024'),
('Wizard', 6, array['Intelligence'], array['Intelligence','Wisdom'], 'Intelligence', 'prepared', 3,
  '[{"label":"A","items":["Quarterstaff","Component Pouch","Scholar''s Pack","Spellbook"]},
    {"label":"B","gold":55}]', 'PHB 2024');

-- Level 1 features (mechanical hooks kept simple for phase 1; full feature text comes from the PHB pass)
insert into class_features (class_id, level, name, description, grants_resource)
select id, 1, 'Rage', 'Bonus action to enter a rage: advantage on Strength checks/saves, bonus melee damage, resistance to bludgeoning/piercing/slashing.',
  '{"name":"Rage","max_formula":"2","recharge":"long_rest"}'::jsonb
from classes where name = 'Barbarian';

insert into class_features (class_id, level, name, description, grants_resource)
select id, 1, 'Bardic Inspiration', 'Bonus action to give a creature a die it can add to one ability check, attack roll, or saving throw.',
  '{"name":"Bardic Inspiration","max_formula":"Charisma modifier (min 1)","recharge":"long_rest"}'::jsonb
from classes where name = 'Bard';

insert into class_features (class_id, level, name, description)
select id, 1, 'Spellcasting', 'Prepare a number of Bard spells known each day; see spells-known table.'
from classes where name = 'Bard';

insert into class_features (class_id, level, name, description)
select id, 1, 'Spellcasting', 'Prepare a number of Cleric spells each day equal to Wisdom modifier + Cleric level.'
from classes where name = 'Cleric';

insert into class_features (class_id, level, name, description, grants_resource)
select id, 1, 'Channel Divinity', 'Use a divine effect tied to your Cleric domain.',
  '{"name":"Channel Divinity","max_formula":"2","recharge":"short_rest"}'::jsonb
from classes where name = 'Cleric';

insert into class_features (class_id, level, name, description)
select id, 1, 'Spellcasting', 'Prepare a number of Druid spells each day equal to Wisdom modifier + Druid level.'
from classes where name = 'Druid';

insert into class_features (class_id, level, name, description)
select id, 1, 'Druidic', 'You know Druidic, the secret language of druids.'
from classes where name = 'Druid';

insert into class_features (class_id, level, name, description, grants_resource)
select id, 1, 'Second Wind', 'Bonus action to regain HP equal to 1d10 + Fighter level.',
  '{"name":"Second Wind","max_formula":"1","recharge":"short_rest"}'::jsonb
from classes where name = 'Fighter';

insert into class_features (class_id, level, name, description)
select id, 1, 'Weapon Mastery', 'You gain the mastery property for a number of weapons you are proficient with.'
from classes where name = 'Fighter';

insert into class_features (class_id, level, name, description, grants_choice)
select id, 1, 'Fighting Style', 'Choose a Fighting Style feat that shapes your combat approach.',
  '{"choose_from_category":"fighting_style","count":1}'::jsonb
from classes where name = 'Fighter';

insert into class_features (class_id, level, name, description, grants_resource)
select id, 1, 'Martial Arts / Ki-adjacent Unarmed Strikes', 'Use Dexterity for unarmed strikes and simple/shortsword weapons; unarmed strike die scales with level.',
  '{"name":"Martial Arts Die","max_formula":"n/a (passive)","recharge":"n/a"}'::jsonb
from classes where name = 'Monk';

insert into class_features (class_id, level, name, description)
select id, 1, 'Unarmored Defense', 'While not wearing armor or wielding a shield, AC = 10 + Dexterity modifier + Wisdom modifier.'
from classes where name = 'Monk';

insert into class_features (class_id, level, name, description)
select id, 1, 'Lay on Hands', 'A pool of healing power (5 x Paladin level) usable as a bonus action to restore HP or cure Poisoned.'
from classes where name = 'Paladin';

insert into class_features (class_id, level, name, description)
select id, 1, 'Spellcasting', '2024 change: starts at level 1 (was level 2 in the 2014 rules). Prepare a fixed 2 Paladin spells at level 1, per the class table rather than an ability-mod formula.'
from classes where name = 'Paladin';

insert into class_features (class_id, level, name, description)
select id, 1, 'Spellcasting', '2024 change: starts at level 1 (was level 2 in the 2014 rules).'
from classes where name = 'Ranger';

insert into class_features (class_id, level, name, description)
select id, 1, 'Favored Enemy', 'You always have a spell prepared that helps you hunt a favored kind of enemy (mechanics vary by choice).'
from classes where name = 'Ranger';

insert into class_features (class_id, level, name, description)
select id, 1, 'Expertise', 'Double your proficiency bonus for two skills of your choice.'
from classes where name = 'Rogue';

insert into class_features (class_id, level, name, description)
select id, 1, 'Sneak Attack', 'Once per turn, deal an extra 1d6 damage to a creature you hit with an attack if you have advantage.'
from classes where name = 'Rogue';

insert into class_features (class_id, level, name, description)
select id, 1, 'Thieves'' Cant', 'You know Thieves'' Cant, a secret mix of dialect, jargon, and code.'
from classes where name = 'Rogue';

insert into class_features (class_id, level, name, description, grants_resource)
select id, 1, 'Innate Sorcery-adjacent Spellcasting', 'Charisma-based innate spellcasting; Sorcery Points come online at level 2.',
  '{"name":"Sorcery Points","max_formula":"0 at level 1","recharge":"long_rest"}'::jsonb
from classes where name = 'Sorcerer';

insert into class_features (class_id, level, name, description, grants_resource)
select id, 1, 'Pact Magic', 'You know a small number of spells and regain all expended Pact Magic slots on a Short or Long Rest, rather than only a Long Rest.',
  '{"name":"Pact Magic Slot","max_formula":"1","recharge":"short_rest"}'::jsonb
from classes where name = 'Warlock';

insert into class_features (class_id, level, name, description, grants_choice)
select id, 1, 'Eldritch Invocation', 'Choose 1 Eldritch Invocation. In the 2024 rules this is where Pact Boons (Blade/Chain/Tome) live too — no separate level-3 Pact Boon feature exists anymore.',
  '{"choose_from_category":"eldritch_invocation","count":1}'::jsonb
from classes where name = 'Warlock';

insert into class_features (class_id, level, name, description)
select id, 1, 'Spellcasting', 'Prepare a number of Wizard spells each day equal to Intelligence modifier + Wizard level.'
from classes where name = 'Wizard';

insert into class_features (class_id, level, name, description)
select id, 1, 'Ritual Adept', 'You can cast any spell in your spellbook as a Ritual if it has the ritual tag.'
from classes where name = 'Wizard';

-- FEATS (origin feats — Human's Versatile trait can pick any of these; backgrounds each grant one specific one)
insert into feats (name, category, description, grants, source) values
('Alert', 'origin', 'You gain a +5 bonus to Initiative, cannot be surprised while conscious, and other creatures don''t gain advantage from being unseen.', '{"initiative_bonus":5}', 'PHB 2024'),
('Tough', 'origin', 'Your HP maximum increases by 2 per character level, retroactively and going forward.', '{"hp_per_level":2}', 'PHB 2024'),
('Magic Initiate', 'origin', 'You learn two cantrips and one 1st-level spell from a chosen class list, castable without a spell slot once per Long Rest.', '{"cantrips":2,"first_level_spells":1}', 'PHB 2024'),
('Savage Attacker', 'origin', 'Once per turn when you roll damage for a melee weapon attack, you can reroll the dice and use either total.', '{}', 'PHB 2024'),
('Crafter', 'origin', 'Discount on nonmagical items you craft or buy, and you craft nonmagical items faster.', '{}', 'PHB 2024'),
('Skilled', 'origin', 'You gain proficiency in three skills of your choice.', '{"skills":3}', 'PHB 2024'),
('Healer', 'origin', 'Using a Healer''s Kit to stabilize a creature also restores 1 HP; spend a kit charge to let a creature regain extra HP.', '{}', 'PHB 2024'),
('Lucky', 'origin', 'You have a pool of Luck Points to reroll your own d20 Tests or impose disadvantage on an attack against you.', '{"luck_points":3}', 'PHB 2024'),
('Musician', 'origin', 'You gain proficiency with one musical instrument and can grant temporary HP to allies with a short performance.', '{}', 'PHB 2024');

-- FIGHTING STYLES (Fighter level 1 choice)
insert into feats (name, category, description, grants, source) values
('Defense', 'fighting_style', 'While wearing armor, you gain a +1 bonus to Armor Class.', '{"ac_bonus":1}', 'PHB 2024'),
('Dueling', 'fighting_style', 'While wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.', '{"damage_bonus":2}', 'PHB 2024'),
('Great Weapon Fighting', 'fighting_style', 'When you roll a 1 or 2 on a damage die for a two-handed melee weapon, you can reroll the die and must use the new roll.', '{}', 'PHB 2024'),
('Archery', 'fighting_style', 'You gain a +2 bonus to attack rolls you make with ranged weapons.', '{"ranged_attack_bonus":2}', 'PHB 2024');

-- ELDRITCH INVOCATIONS (Warlock, available from level 1 in 2024 rules — includes what
-- used to be the separate level-3 "Pact Boon" feature: Blade/Chain/Tome are invocations now)
insert into feats (name, category, prerequisite, description, grants, source) values
('Pact of the Blade', 'eldritch_invocation', null, 'Bonus action to summon a pact weapon into your hand; you''re proficient with it, and it counts as magical.', '{}', 'PHB 2024'),
('Pact of the Chain', 'eldritch_invocation', null, 'You can cast Find Familiar without expending a spell slot, choosing from an expanded list of Warlock-specific familiar forms.', '{}', 'PHB 2024'),
('Pact of the Tome', 'eldritch_invocation', null, 'You gain a Book of Shadows containing three cantrips from any spellcasting class''s list, plus two 1st-level rituals.', '{}', 'PHB 2024'),
('Agonizing Blast', 'eldritch_invocation', 'A Warlock cantrip that deals damage', 'Add your Charisma modifier to the damage of a chosen damaging Warlock cantrip.', '{}', 'PHB 2024'),
('Devil''s Sight', 'eldritch_invocation', null, 'You can see normally in Dim Light and Darkness, both magical and nonmagical, within 120 feet.', '{"grants_vision":{"type":"darkvision","range":120,"note":"works in magical darkness too, unlike ordinary Darkvision"}}', 'PHB 2024');

-- BACKGROUNDS (all 16 SRD backgrounds + Haunted One; ability triads are best-effort pending
-- direct PHB verification — flagged in schema.sql comments too)
insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Haunted One', id, array['Arcana','Survival'], 'Herbalism Kit', array['Constitution','Intelligence','Wisdom'],
  '[{"item":"Traveler''s clothes","qty":1},{"item":"Silver holy symbol or similar ward","qty":1},{"item":"Belt pouch (15 gp)","qty":1}]',
  'Van Richten''s Guide to Ravenloft (thematically ideal for Curse of Strahd)'
from feats where name = 'Alert';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Acolyte', id, array['Insight','Religion'], null, array['Intelligence','Wisdom','Charisma'],
  '[{"item":"Holy symbol","qty":1},{"item":"Prayer book","qty":1},{"item":"Incense","qty":5},{"item":"Belt pouch (8 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Magic Initiate';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Artisan', id, array['Investigation','Persuasion'], 'Artisan''s Tools', array['Strength','Dexterity','Intelligence'],
  '[{"item":"Artisan''s tools","qty":1},{"item":"Traveler''s clothes","qty":1},{"item":"Belt pouch (32 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Crafter';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Charlatan', id, array['Deception','Sleight of Hand'], 'Disguise Kit', array['Dexterity','Constitution','Charisma'],
  '[{"item":"Fine clothes","qty":1},{"item":"Disguise kit","qty":1},{"item":"Belt pouch (15 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Skilled';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Criminal', id, array['Sleight of Hand','Stealth'], 'Thieves'' Tools', array['Dexterity','Constitution','Intelligence'],
  '[{"item":"Thieves'' tools","qty":1},{"item":"Crowbar","qty":1},{"item":"Dark clothes with hood","qty":1},{"item":"Belt pouch (16 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Alert';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Entertainer', id, array['Acrobatics','Performance'], 'Musical Instrument', array['Strength','Dexterity','Charisma'],
  '[{"item":"Musical instrument","qty":1},{"item":"Costume","qty":1},{"item":"Belt pouch (11 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Musician';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Farmer', id, array['Animal Handling','Nature'], null, array['Strength','Constitution','Wisdom'],
  '[{"item":"Sickle","qty":1},{"item":"Basket","qty":1},{"item":"Traveler''s clothes","qty":1},{"item":"Belt pouch (30 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Tough';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Guard', id, array['Athletics','Perception'], null, array['Strength','Intelligence','Wisdom'],
  '[{"item":"Spear","qty":1},{"item":"Light crossbow + 20 bolts","qty":1},{"item":"Belt pouch (12 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Alert';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Guide', id, array['Stealth','Survival'], null, array['Dexterity','Constitution','Wisdom'],
  '[{"item":"Staff","qty":1},{"item":"Hunting trap","qty":1},{"item":"Traveler''s clothes","qty":1},{"item":"Belt pouch (3 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Magic Initiate';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Hermit', id, array['Medicine','Religion'], 'Herbalism Kit', array['Constitution','Wisdom','Charisma'],
  '[{"item":"Herbalism kit","qty":1},{"item":"Blanket","qty":1},{"item":"Belt pouch (16 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Healer';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Merchant', id, array['Animal Handling','Persuasion'], null, array['Constitution','Wisdom','Charisma'],
  '[{"item":"Merchant''s scale","qty":1},{"item":"Traveler''s clothes","qty":1},{"item":"Belt pouch (22 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Lucky';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Noble', id, array['History','Persuasion'], null, array['Strength','Intelligence','Charisma'],
  '[{"item":"Fine clothes","qty":1},{"item":"Signet ring","qty":1},{"item":"Belt pouch (29 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Skilled';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Sage', id, array['Arcana','History'], null, array['Intelligence','Wisdom','Charisma'],
  '[{"item":"Quarterstaff","qty":1},{"item":"Book (history)","qty":1},{"item":"Belt pouch (8 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Magic Initiate';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Sailor', id, array['Acrobatics','Perception'], null, array['Strength','Dexterity','Wisdom'],
  '[{"item":"Dagger","qty":1},{"item":"Rope (50 feet)","qty":1},{"item":"Belt pouch (20 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Tough';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Scribe', id, array['Investigation','Perception'], null, array['Dexterity','Intelligence','Wisdom'],
  '[{"item":"Ink and pen","qty":1},{"item":"Lamp","qty":1},{"item":"Belt pouch (23 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Skilled';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Soldier', id, array['Athletics','Intimidation'], 'Gaming Set', array['Strength','Dexterity','Constitution'],
  '[{"item":"Spear","qty":1},{"item":"Shortbow + 20 arrows","qty":1},{"item":"Gaming set","qty":1},{"item":"Belt pouch (14 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Savage Attacker';

insert into backgrounds (name, origin_feat_id, skill_proficiencies, tool_proficiency, ability_score_options, equipment, source)
select 'Wayfarer', id, array['Insight','Stealth'], null, array['Dexterity','Wisdom','Charisma'],
  '[{"item":"Dagger","qty":2},{"item":"Traveler''s clothes","qty":1},{"item":"Belt pouch (16 gp)","qty":1}]',
  'PHB 2024'
from feats where name = 'Lucky';

-- SPELLS — cantrips + 1st-level only, since that's all a level-1 character can access.
-- Higher-level content comes when we build leveling.
insert into spells (name, level, school, casting_time, range, components, duration, concentration, ritual, classes, description, higher_levels, grants, source) values
-- cantrips
('Vicious Mockery', 0, 'Enchantment', '1 action', '60 feet', 'V', 'Instantaneous', false, false, array['Bard'],
  'A cutting insult deals psychic damage and gives the target disadvantage on the next attack roll it makes before your next turn.', null, null, 'PHB 2024'),
('Mage Hand', 0, 'Conjuration', '1 action', '30 feet', 'V, S', '1 minute', false, false, array['Bard','Sorcerer','Warlock','Wizard'],
  'A spectral hand manipulates small objects, opens doors, and carries light items at range.', null, null, 'PHB 2024'),
('Minor Illusion', 0, 'Illusion', '1 action', '30 feet', 'S, M', '1 minute', false, false, array['Bard','Sorcerer','Warlock','Wizard'],
  'Create a small sound or a static image illusion within range.', null, null, 'PHB 2024'),
('Prestidigitation', 0, 'Transmutation', '1 action', '10 feet', 'V, S', 'Up to 1 hour', false, false, array['Bard','Sorcerer','Warlock','Wizard'],
  'A minor magic trick: light a candle, clean an object, chill or warm food, and similar small effects.', null, null, 'PHB 2024'),
('True Strike', 0, 'Evocation', '1 action', 'Self', 'S', 'Instantaneous', false, false, array['Bard','Sorcerer','Warlock','Wizard'],
  '2024 rework: now an attack cantrip that channels magic through a weapon strike rather than just granting advantage. Exact wording pending PHB cross-check.', null, null, 'PHB 2024'),
('Dancing Lights', 0, 'Evocation', '1 action', '120 feet', 'V, S, M', 'Concentration, 1 minute', true, false, array['Bard','Sorcerer','Wizard'],
  'Create up to four torch-sized lights, or one dim glowing shape you can move around.', null, null, 'PHB 2024'),
('Sacred Flame', 0, 'Evocation', '1 action', '60 feet', 'V, S', 'Instantaneous', false, false, array['Cleric'],
  'Radiance descends on a creature you can see within range. It must succeed on a Dexterity save or take radiant damage, ignoring cover.', null, null, 'PHB 2024'),
('Guidance', 0, 'Divination', '1 action', 'Touch', 'V, S', 'Concentration, 1 minute', true, false, array['Cleric','Druid'],
  'You touch a willing creature; once before the spell ends, it can add 1d4 to one ability check of its choice.', null, null, 'PHB 2024'),
('Thaumaturgy', 0, 'Divination', '1 action', '30 feet', 'V', 'Up to 1 minute', false, false, array['Cleric'],
  'Minor supernatural sensory effects — booming voice, flickering flames, trembling ground, and the like.', null, null, 'PHB 2024'),
('Spare the Dying', 0, 'Necromancy', '1 action', 'Touch', 'V, S', 'Instantaneous', false, false, array['Cleric'],
  'Touch a creature with 0 HP to stabilize it.', null, null, 'PHB 2024'),
('Light', 0, 'Evocation', '1 action', 'Touch', 'V, M', '1 hour', false, false, array['Cleric','Sorcerer','Wizard'],
  'An object you touch sheds bright light in a 20-foot radius.', null, null, 'PHB 2024'),
('Toll the Dead', 0, 'Necromancy', '1 action', '60 feet', 'V, S', 'Instantaneous', false, false, array['Cleric'],
  'A tolling bell deals necrotic damage, more if the target is missing hit points.', null, null, 'PHB 2024'),
('Druidcraft', 0, 'Divination', '1 action', '30 feet', 'V, S', 'Instantaneous', false, false, array['Druid'],
  'Minor nature-themed sensory effects — predict weather, make a flower bloom, and similar.', null, null, 'PHB 2024'),
('Produce Flame', 0, 'Conjuration', '1 action', 'Self', 'V, S', '10 minutes', false, false, array['Druid'],
  'A flickering flame in your hand sheds light and can be hurled as an attack.', null, null, 'PHB 2024'),
('Shillelagh', 0, 'Transmutation', 'Bonus Action', 'Touch', 'V, S, M', 'Instantaneous', false, false, array['Druid'],
  'Imbue a club or quarterstaff so you can attack with Wisdom instead of Strength, dealing magical bludgeoning damage.', null, null, 'PHB 2024'),
('Thorn Whip', 0, 'Transmutation', '1 action', '30 feet', 'V, S, M', 'Instantaneous', false, false, array['Druid'],
  'A vine lashes a creature, dealing damage and pulling it closer to you.', null, null, 'PHB 2024'),
('Mold Earth', 0, 'Transmutation', '1 action', '30 feet', 'V, S', 'Instantaneous or 1 hour', false, false, array['Druid'],
  'Minor, non-damaging shaping of earth within range.', null, null, 'PHB 2024'),
('Fire Bolt', 0, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', false, false, array['Sorcerer','Wizard'],
  'A ranged spell attack that deals fire damage to a creature or object.', null, null, 'PHB 2024'),
('Ray of Frost', 0, 'Evocation', '1 action', '60 feet', 'V, S', 'Instantaneous', false, false, array['Sorcerer','Wizard'],
  'A ray of cold deals damage and reduces the target''s speed until your next turn.', null, null, 'PHB 2024'),
('Chill Touch', 0, 'Necromancy', '1 action', '120 feet', 'V, S', '1 round', false, false, array['Sorcerer','Warlock','Wizard'],
  'A ghostly skeletal hand deals necrotic damage and prevents the target from regaining hit points until your next turn.', null, null, 'PHB 2024'),
('Eldritch Blast', 0, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', false, false, array['Warlock'],
  'A beam of crackling energy deals force damage; creates more beams at higher character levels.', null, null, 'PHB 2024'),
-- 1st level
('Healing Word', 1, 'Abjuration', 'Bonus Action', '60 feet', 'V', 'Instantaneous', false, false, array['Bard','Cleric','Druid'],
  'A bonus-action ranged heal that restores hit points to a creature you can see.', null, null, 'PHB 2024'),
('Faerie Fire', 1, 'Evocation', '1 action', '60 feet', 'V', 'Concentration, 1 minute', true, false, array['Bard','Druid'],
  'Outlines creatures in light; attack rolls against them have advantage.', null, null, 'PHB 2024'),
('Dissonant Whispers', 1, 'Enchantment', '1 action', '60 feet', 'V', 'Instantaneous', false, false, array['Bard'],
  'A discordant melody deals psychic damage and forces the target to flee if it fails its save.', null, null, 'PHB 2024'),
('Charm Person', 1, 'Enchantment', '1 action', '30 feet', 'V, S', '1 hour', false, false, array['Bard','Druid','Sorcerer','Warlock','Wizard'],
  'Attempt to charm a humanoid you can see, making it regard you as a friendly acquaintance.', null, null, 'PHB 2024'),
('Comprehend Languages', 1, 'Divination', '1 action', 'Self', 'V, S, M', '1 hour', false, true, array['Bard','Sorcerer','Warlock','Wizard'],
  'Understand any spoken or written language for the duration.', null, null, 'PHB 2024'),
('Detect Magic', 1, 'Divination', '1 action', 'Self', 'V, S', 'Concentration, 10 minutes', true, true, array['Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard'],
  'Sense the presence of magic within 30 feet for the duration.', null, null, 'PHB 2024'),
('Tasha''s Hideous Laughter', 1, 'Enchantment', '1 action', '30 feet', 'V, S, M', 'Concentration, 1 minute', true, false, array['Bard','Wizard'],
  'A target overcome with mirth falls prone and struggles to act.', null, null, 'PHB 2024'),
('Cure Wounds', 1, 'Abjuration', '1 action', 'Touch', 'V, S', 'Instantaneous', false, false, array['Bard','Cleric','Druid','Paladin','Ranger'],
  'A touch heals hit points equal to a die roll plus your spellcasting ability modifier.', null, null, 'PHB 2024'),
('Bless', 1, 'Enchantment', '1 action', '30 feet', 'V, S, M', 'Concentration, 1 minute', true, false, array['Cleric','Paladin'],
  'Up to three creatures of your choice add 1d4 to attack rolls and saving throws until the spell ends.', null, null, 'PHB 2024'),
('Guiding Bolt', 1, 'Evocation', '1 action', '120 feet', 'V, S', '1 round', false, false, array['Cleric'],
  'A ranged spell attack deals radiant damage, and the next attack against the target has advantage.', null, null, 'PHB 2024'),
('Shield of Faith', 1, 'Abjuration', 'Bonus Action', '60 feet', 'V, S, M', 'Concentration, 10 minutes', true, false, array['Cleric','Paladin'],
  'A shimmering field grants a creature +2 to Armor Class for the duration.', null, null, 'PHB 2024'),
('Sanctuary', 1, 'Abjuration', 'Bonus Action', '30 feet', 'V, S, M', '1 minute', false, false, array['Cleric'],
  'Wards a creature so most attackers must make a save before targeting it.', null, null, 'PHB 2024'),
('Detect Evil and Good', 1, 'Divination', '1 action', 'Self', 'V, S', 'Concentration, 10 minutes', true, false, array['Cleric','Paladin'],
  'Sense the presence and location of Celestials, Fiends, Undead, and consecrated/desecrated ground.', null, null, 'PHB 2024'),
('Entangle', 1, 'Conjuration', '1 action', '90 feet', 'V, S', 'Concentration, 1 minute', true, false, array['Druid'],
  'Grasping weeds and vines spring up, restraining creatures in the area.', null, null, 'PHB 2024'),
('Goodberry', 1, 'Conjuration', '1 action', 'Touch', 'V, S, M', 'Instantaneous', false, false, array['Druid','Ranger'],
  'Create berries that each heal 1 hit point and provide a day''s nourishment.', null, null, 'PHB 2024'),
('Speak with Animals', 1, 'Divination', '1 action', 'Self', 'V, S', '10 minutes', false, true, array['Druid','Ranger'],
  'Understand and verbally communicate with beasts for the duration.', null, null, 'PHB 2024'),
('Thunderwave', 1, 'Evocation', '1 action', 'Self', 'V, S', 'Instantaneous', false, false, array['Druid','Sorcerer','Wizard'],
  'A wave of thunderous force deals damage and pushes creatures away from you.', null, null, 'PHB 2024'),
('Divine Favor', 1, 'Enchantment', 'Bonus Action', 'Self', 'V, S', 'Concentration, 1 minute', true, false, array['Paladin'],
  'Your weapon attacks deal extra radiant damage for the duration.', null, null, 'PHB 2024'),
('Heroism', 1, 'Enchantment', '1 action', 'Touch', 'V, S', 'Concentration, 1 minute', true, false, array['Paladin'],
  'A willing creature is immune to being Frightened and gains temporary hit points each turn.', null, null, 'PHB 2024'),
('Searing Smite', 1, 'Evocation', 'Bonus Action', 'Self', 'V', 'Concentration, 1 minute', true, false, array['Paladin'],
  'Your next weapon hit flares with fire, dealing extra damage and igniting the target.', null, null, 'PHB 2024'),
('Divine Smite', 1, 'Evocation', 'Bonus Action', 'Self', 'V', 'Instantaneous', false, false, array['Paladin'],
  'Paladin-only: always prepared per the Spellcasting feature. A melee hit deals extra radiant damage; usable once per Long Rest without a spell slot.', null, null, 'PHB 2024'),
('Hunter''s Mark', 1, 'Divination', 'Bonus Action', '90 feet', 'V', 'Concentration, 1 hour', true, false, array['Ranger'],
  'Mark a creature to deal extra damage to it and track it more easily, for the duration.', null, null, 'PHB 2024'),
('Ensnaring Strike', 1, 'Conjuration', 'Bonus Action', 'Self', 'V', 'Concentration, 1 minute', true, false, array['Ranger'],
  'Your next weapon hit causes thorny vines to restrain the target.', null, null, 'PHB 2024'),
('Magic Missile', 1, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', false, false, array['Sorcerer','Wizard'],
  'Three darts of force damage automatically hit their targets, no attack roll needed.', null, null, 'PHB 2024'),
('Shield', 1, 'Abjuration', 'Reaction', 'Self', 'V, S', '1 round', false, false, array['Sorcerer','Wizard'],
  'Reaction: +5 AC until your next turn, and it blocks Magic Missile entirely.', null, null, 'PHB 2024'),
('Chromatic Orb', 1, 'Evocation', '1 action', '90 feet', 'V, S, M', 'Instantaneous', false, false, array['Sorcerer','Wizard'],
  'Hurl a sphere of energy in a damage type of your choice at a target.', null, null, 'PHB 2024'),
('Burning Hands', 1, 'Evocation', '1 action', 'Self', 'V, S', 'Instantaneous', false, false, array['Sorcerer','Wizard'],
  'A cone of fire deals damage to everything caught in it.', null, null, 'PHB 2024'),
('Mage Armor', 1, 'Abjuration', '1 action', 'Touch', 'V, S, M', '8 hours', false, false, array['Sorcerer','Wizard'],
  'A willing creature not wearing armor gets a base AC of 13 + Dex modifier for the duration.', null, null, 'PHB 2024'),
('Fog Cloud', 1, 'Conjuration', '1 action', '120 feet', 'V, S', 'Concentration, 1 hour', true, false, array['Druid','Ranger','Sorcerer','Wizard'],
  'A heavily obscuring fog fills the area for the duration.', null, null, 'PHB 2024'),
('Hex', 1, 'Enchantment', 'Bonus Action', '90 feet', 'V, S, M', 'Concentration, 1 hour', true, false, array['Warlock'],
  'Curse a creature: extra necrotic damage once per turn, and disadvantage on checks with an ability score of your choice.', null, null, 'PHB 2024'),
('Armor of Agathys', 1, 'Abjuration', '1 action', 'Self', 'V, S, M', '1 hour', false, false, array['Warlock'],
  'Gain temporary hit points, and creatures that hit you in melee take cold damage in return.', null, null, 'PHB 2024'),
('Arms of Hadar', 1, 'Conjuration', '1 action', 'Self', 'V, S', 'Instantaneous', false, false, array['Warlock'],
  'Tendrils of dark energy deal damage to everything within 10 feet and prevent reactions.', null, null, 'PHB 2024'),
('Hellish Rebuke', 1, 'Evocation', 'Reaction', '60 feet', 'V, S', 'Instantaneous', false, false, array['Warlock'],
  'Reaction: when hit by an attacker, wreathe them in fire for damage.', null, null, 'PHB 2024'),
('Witch Bolt', 1, 'Evocation', '1 action', '30 feet', 'V, S, M', 'Concentration, 1 minute', true, false, array['Sorcerer','Warlock','Wizard'],
  'A sustained beam of lightning deals damage each turn if you maintain concentration.', null, null, 'PHB 2024'),
('Identify', 1, 'Divination', '1 action', 'Touch', 'V, S, M', 'Instantaneous', false, true, array['Bard','Wizard'],
  'Learn the properties of a magic item or the spells affecting a creature.', null, null, 'PHB 2024'),
('Sleep', 1, 'Enchantment', '1 action', '90 feet', 'V, S, M', '1 minute', false, false, array['Bard','Sorcerer','Wizard'],
  'Creatures in the area fall unconscious, weakest-HP-first, until a shared HP pool runs out.', null, null, 'PHB 2024'),
('Darkvision', 2, 'Transmutation', '1 action', 'Touch', 'V, S, M', '8 hours', false, false, array['Druid','Ranger','Sorcerer','Wizard'],
  'You touch a willing creature to grant it the ability to see in the dark. For the duration, that creature has Darkvision out to 60 feet.', null,
  '{"grants_vision":{"type":"darkvision","range":60}}', 'PHB 2024');

-- ITEMS (mundane starting gear referenced by class/background equipment, plus vision/light sources
-- and one Strahd-flavored item; not every equipment-package string is 1:1 mapped here yet — that's
-- a cleanup pass once the DMG/PHB equipment chapter is cross-referenced)
insert into items (name, category, requires_attunement, weight, cost, properties, description, source) values
('Longsword', 'weapon', false, 3, '15 gp', '{"damage":"1d8 slashing","versatile":"1d10","mastery":"Sap"}', 'A standard martial melee weapon.', 'PHB 2024'),
('Shortbow', 'weapon', false, 2, '25 gp', '{"damage":"1d6 piercing","range":"80/320","ammunition":true}', 'A simple ranged weapon.', 'PHB 2024'),
('Longbow', 'weapon', false, 2, '50 gp', '{"damage":"1d8 piercing","range":"150/600","ammunition":true}', 'A martial ranged weapon.', 'PHB 2024'),
('Rapier', 'weapon', false, 2, '25 gp', '{"damage":"1d8 piercing","finesse":true}', 'A finesse martial melee weapon.', 'PHB 2024'),
('Mace', 'weapon', false, 4, '5 gp', '{"damage":"1d6 bludgeoning"}', 'A simple melee weapon.', 'PHB 2024'),
('Quarterstaff', 'weapon', false, 4, '2 gp', '{"damage":"1d6 bludgeoning","versatile":"1d8"}', 'A simple melee weapon, also usable as an arcane focus for some classes.', 'PHB 2024'),
('Greataxe', 'weapon', false, 7, '30 gp', '{"damage":"1d12 slashing","heavy":true,"two_handed":true}', 'A heavy martial melee weapon.', 'PHB 2024'),
('Light Crossbow', 'weapon', false, 5, '25 gp', '{"damage":"1d8 piercing","range":"80/320","ammunition":true}', 'A simple ranged weapon.', 'PHB 2024'),
('Chain Mail', 'armor', false, 55, '75 gp', '{"ac_base":16,"dex_bonus_max":0,"type":"heavy"}', 'Heavy armor of interlocking metal rings.', 'PHB 2024'),
('Chain Shirt', 'armor', false, 20, '50 gp', '{"ac_base":13,"dex_bonus_max":2,"type":"medium"}', 'Medium armor made of interlocking metal rings.', 'PHB 2024'),
('Leather Armor', 'armor', false, 10, '10 gp', '{"ac_base":11,"dex_bonus_max":null,"type":"light"}', 'Light, flexible armor.', 'PHB 2024'),
('Shield', 'armor', false, 6, '10 gp', '{"ac_bonus":2}', 'A shield strapped to one arm, adding to Armor Class.', 'PHB 2024'),
('Herbalism Kit', 'tool', false, 3, '5 gp', '{}', 'Used for identifying and preparing herbs.', 'PHB 2024'),
('Thieves'' Tools', 'tool', false, 1, '25 gp', '{}', 'Lockpicks and small tools for disarming traps and picking locks.', 'PHB 2024'),
('Component Pouch', 'gear', false, 2, '25 gp', '{}', 'A small pouch of the material spell components most spells require.', 'PHB 2024'),
('Spellbook', 'gear', false, 3, '—', '{}', 'A blank book a Wizard fills with spells they learn; can only be read by the owner or via Identify.', 'PHB 2024'),
('Wine of Barovia', 'gear', false, 1, '—', '{"flavor_item":true}', 'A dusty bottle of local vintage, distinctly bitter. Common at Vallaki taverns and Wizard of Wines cellars.', 'Curse of Strahd'),
('Torch', 'gear', false, 1, '1 cp', '{"light_bright":20,"light_dim":20,"burn_time_hours":1}', 'Burning, it sheds bright light in a 20-foot radius and dim light for an additional 20 feet.', 'PHB 2024'),
('Hooded Lantern', 'gear', false, 2, '5 gp', '{"light_bright":30,"light_dim":30,"burn_time_hours":6,"fuel":"oil flask"}', 'Sheds bright light in a 30-foot radius and dim light for an additional 30 feet on one oil flask; the hood lets you dim it to a 5-foot radius.', 'PHB 2024'),
('Spectacles of Night', 'magic_item', true, 0, '—', '{"grants_vision":{"type":"darkvision","range":60}}', 'A pair of dark-lensed spectacles. While wearing them, you have Darkvision out to 60 feet.', 'Curse of Strahd (reflavored uncommon wondrous item)');

-- CONDITIONS (full 2024 list)
insert into conditions (name, description, is_stacking) values
('Blinded', 'You can''t see, automatically fail sight-based checks, and attack rolls against you have advantage while yours have disadvantage.', false),
('Charmed', 'You can''t attack the charmer or target them with harmful effects; the charmer has advantage on social checks against you.', false),
('Deafened', 'You can''t hear and automatically fail hearing-based checks.', false),
('Frightened', 'You have disadvantage on checks and attacks while the source of fear is in sight, and can''t willingly move closer to it.', false),
('Grappled', 'Your speed becomes 0 and you can''t benefit from bonuses to speed.', false),
('Incapacitated', 'You can''t take actions or reactions.', false),
('Invisible', 'You''re impossible to see without magic; you''re heavily obscured, and attacks against you have disadvantage while yours have advantage.', false),
('Paralyzed', 'You''re incapacitated, can''t move or speak, automatically fail Strength/Dexterity saves, attacks against you have advantage, and hits within 5 feet are critical.', false),
('Petrified', 'You''re transformed into stone, incapacitated, and unaware of your surroundings; resistance to all damage; immune to poison and disease.', false),
('Poisoned', 'You have disadvantage on attack rolls and ability checks.', false),
('Prone', 'You can only crawl unless you stand; disadvantage on attack rolls; melee attacks against you have advantage, ranged attacks have disadvantage.', false),
('Restrained', 'Your speed becomes 0; attack rolls against you have advantage while yours have disadvantage; disadvantage on Dexterity saves.', false),
('Stunned', 'You''re incapacitated, can''t move, and can speak only falteringly; automatically fail Strength/Dexterity saves; attacks against you have advantage.', false),
('Unconscious', 'You''re incapacitated, can''t move or speak, unaware of surroundings, drop what you''re holding, fall prone, auto-fail Str/Dex saves, attacks against you have advantage, hits within 5 feet are critical.', false),
('Exhaustion', 'A stacking condition (levels 1-6). Each level imposes a cumulative -1 penalty to D20 Tests; at level 6 you die.', true);
