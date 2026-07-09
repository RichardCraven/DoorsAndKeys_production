// spells-table.js
// Central table for spell/glyph definitions and metadata

export const SPELLS = {
  magicMissile: {
    name: 'Magic Missile',
    prepareTime: 300000, // milliseconds (300 seconds)
    description: 'A basic arcane projectile that never misses.',
    energyCost: 30, // Default energy cost for magic missile
  },
};

// ── Tiered Glyph Definitions ───────────────────────────────────────────────
// Each tier has a fixed number of spell slots. Higher-tier spells consume more
// slots. A glyph stores the chosen spells and fires them all at once in combat.
export const GLYPHS = {
  minor: {
    key: 'minor',
    name: 'Minor Glyph',
    slots: 2,
    icon: 'minor_glyph',
  },
  major: {
    key: 'major',
    name: 'Major Glyph',
    slots: 3,
    icon: 'major_glyph',
  },
  supreme: {
    key: 'supreme',
    name: 'Supreme Glyph',
    slots: 5,
    icon: 'supreme_glyph',
  },
};

// How many glyph slots a spell costs, indexed by spell tier (1–4).
export const GLYPH_SPELL_SLOT_COST = { 1: 1, 2: 2, 3: 3, 4: 4 };

// Prep time (ms) contributed by each spell, by spell tier.
// T1 = 5 min, T2 = 10 min, T3 = 20 min, T4 = 40 min.
export const GLYPH_SPELL_PREP_TIME = { 1: 5 * 60 * 1000, 2: 20 * 60 * 1000, 3: 60 * 60 * 1000, 4: 120 * 60 * 1000 };

/**
 * Compute total glyph preparation time given an array of spell definitions
 * (each with a `tier` property). Returns milliseconds.
 */
export function computeGlyphPrepTime(spellDefs) {
  return spellDefs.reduce((sum, s) => {
    const tier = s.tier || 1;
    return sum + (GLYPH_SPELL_PREP_TIME[tier] || GLYPH_SPELL_PREP_TIME[1]);
  }, 0);
}

// Ritual definitions — each has a stable key, display name, description, and prep time.
// Shortest ritual is 1 hour (3 600 000 ms); others are 3h and 6h.
export const RITUALS = {
  veilOfShadows: {
    key: 'veilOfShadows',
    name: 'Veil of Shadows',
    icon: 'eclipse',
    prepareTime: 60 * 60 * 1000,           // 1 hour
    description: 'Weaves a cloak of living shadow around the party. Enemies have a 20% chance to miss all attacks for the next combat encounter.',
    flavorText: '"The darkness is not empty — it breathes."',
  },
  wardingCircle: {
    key: 'wardingCircle',
    name: 'Warding Circle',
    icon: 'magic_moon_1',
    prepareTime: 3 * 60 * 60 * 1000,        // 3 hours
    description: 'Inscribes a protective sigil on every party member. Reduces incoming damage by 15% and grants immunity to fear for two combat encounters.',
    flavorText: '"Draw the line. Nothing crosses it."',
  },
  riftBinding: {
    key: 'riftBinding',
    name: 'Rift Binding',
    icon: 'glyph_inverted',
    prepareTime: 6 * 60 * 60 * 1000,        // 6 hours
    description: 'Opens a momentary tear between planes and anchors it to the caster\'s will. On use, teleports the entire party past the next locked gate or sealed passage.',
    flavorText: '"Space is merely a suggestion to those who know how to argue."',
  },
  unlock: {
    key: 'unlock',
    name: 'Unlock',
    icon: 'unlock',
    prepareTime: 5 * 60 * 1000,             // 5 minutes
    description: 'Bypasses the next locked door, gate, or chest.',
    flavorText: '"Locks are just questions. This is the answer."',
  },
};

// Camp cooking recipes — each has a stable key, display name, description, cooking time,
// food cost (deducted immediately on start) and food yield (added on completion).
export const RECIPES = {
  fieldBroth: {
    key: 'fieldBroth',
    name: 'Field Broth',
    icon: '🍲',
    cookTime: 30 * 60 * 1000,        // 30 minutes
    foodCost: 20,
    foodYield: 50,
    description: 'A quick, nourishing broth made from camp rations. Simple but effective.',
  },
  heartySoup: {
    key: 'heartySoup',
    name: 'Hearty Soup',
    icon: '🥘',
    cookTime: 2 * 60 * 60 * 1000,    // 2 hours
    foodCost: 50,
    foodYield: 120,
    description: 'A thick, slow-cooked stew that fortifies the crew for hard days ahead.',
  },
  ironFeast: {
    key: 'ironFeast',
    name: 'Iron Feast',
    icon: '🍖',
    cookTime: 6 * 60 * 60 * 1000,    // 6 hours
    foodCost: 100,
    foodYield: 250,
    description: 'A legendary camp meal. Takes all day, feeds the crew like kings.',
  },
};

// ── Battle Tactics — Soldier dungeon prep actions ──────────────────────────
// The Soldier can commit to a tactic during downtime. After the prep timer
// completes the tactic is "active" and applies crew-wide buffs for a fixed
// number of combat encounters before it is consumed.
export const BATTLE_TACTICS = {
  vanguard_formation: {
    key: 'vanguard_formation',
    name: 'Vanguard Formation',
    icon: 'battle_tactics',
    prepTime: 20 * 60 * 1000,        // 20 minutes
    combatDuration: 3,               // lasts 3 combat encounters
    description: 'Sardonis drills the crew in tight-shield formation. All crew gain +15% ATK and DEF for three combat encounters.',
    flavorText: '"Shoulder to shoulder — we are the wall."',
    bonuses: {
      increase_stats: {
        stats: [
          { stat: 'atk', amount: 15, isPercent: true },
          { stat: 'def', amount: 15, isPercent: true },
        ],
      },
    },
    xpMultiplier: 1.25,             // +25% XP per combat while active
  },
  iron_discipline: {
    key: 'iron_discipline',
    name: 'Iron Discipline',
    icon: 'battle_tactics',
    prepTime: 45 * 60 * 1000,        // 45 minutes
    combatDuration: 5,               // lasts 5 combat encounters
    description: 'Rigorous conditioning hardens the crew. All crew gain +25% DEF and +10 max endurance for five combat encounters.',
    flavorText: '"Pain is a teacher. Learn its lesson."',
    bonuses: {
      increase_stats: {
        stats: [
          { stat: 'def', amount: 25, isPercent: true },
          { stat: 'vitality', amount: 10, isPercent: false },
        ],
      },
    },
    xpMultiplier: 1.15,             // +15% XP per combat while active
  },
  blitz_protocol: {
    key: 'blitz_protocol',
    name: 'Blitz Protocol',
    icon: 'battle_tactics',
    prepTime: 60 * 60 * 1000,        // 60 minutes
    combatDuration: 2,               // lasts 2 combat encounters
    description: 'An all-out assault doctrine. All crew gain +30% ATK and +15% speed for two devastating combat encounters.',
    flavorText: '"Hit fast, hit hard, hit once."',
    bonuses: {
      increase_stats: {
        stats: [
          { stat: 'atk', amount: 30, isPercent: true },
          { stat: 'speed', amount: 15, isPercent: true },
        ],
      },
    },
    xpMultiplier: 1.40,             // +40% XP per combat while active
  },
};

// ── Inner Discipline — Monk dungeon prep actions ──────────────────────────
// The Monk channels chi through focused practice. Three categories:
//   Chi (Meditative Focus): accumulate charges that empower combat skills
//   Stance (Body Conditioning): train a stance granting self-buffs for N combats
//   Spirit (Spirit Walk): astral projection to reveal dungeon fog
export const INNER_DISCIPLINES = {
  // ── Chi: Meditative Focus ───────────────────────────────────────────────
  meditative_focus: {
    key: 'meditative_focus',
    category: 'chi',
    name: 'Meditative Focus',
    icon: 'monk_meditate',
    prepTime: 15 * 60 * 1000,          // 15 min per charge
    maxCharges: 3,
    description: 'Accumulate chi charges through meditation. Each charge can empower a combat skill — doubling its damage, range, or healing.',
    flavorText: '"Still water runs deepest."',
  },
  // ── Stances: Body Conditioning ──────────────────────────────────────────
  iron_skin_stance: {
    key: 'iron_skin_stance',
    category: 'stance',
    name: 'Iron Skin',
    icon: 'monk_inner_fire',
    prepTime: 10 * 60 * 1000,          // 10 min
    combatDuration: 4,
    description: 'Train the body to absorb punishment. Monk takes 30% less damage; attackers take 5 reflected damage on hit.',
    flavorText: '"The mountain does not flinch."',
    bonuses: {
      damage_reduction: { percent: 30 },
      reflect_damage: { flat: 5 },
    },
  },
  flowing_water_stance: {
    key: 'flowing_water_stance',
    category: 'stance',
    name: 'Flowing Water',
    icon: 'monk_ethereal_speed',
    prepTime: 25 * 60 * 1000,          // 25 min
    combatDuration: 3,
    description: 'Move like water — evasion doubles and each dodge triggers a free counterattack at 50% ATK.',
    flavorText: '"You cannot strike the river."',
    bonuses: {
      evasion_mult: 2,
      counter_on_dodge: { atkPercent: 50 },
    },
  },
  thundering_palm_stance: {
    key: 'thundering_palm_stance',
    category: 'stance',
    name: 'Thundering Palm',
    icon: 'monk_force_punch',
    prepTime: 40 * 60 * 1000,          // 40 min
    combatDuration: 2,
    description: 'Channel all force into devastating strikes. 25% chance to stun on hit; crit chance +15%.',
    flavorText: '"One palm. One truth."',
    bonuses: {
      stun_chance: { percent: 25, duration: 1 },
      crit_bonus: { percent: 15 },
    },
  },
  // ── Spirit: Spirit Walk ─────────────────────────────────────────────────
  third_eye_pulse: {
    key: 'third_eye_pulse',
    category: 'spirit',
    name: 'Third Eye Pulse',
    icon: 'monk_third_eye',
    prepTime: 5 * 60 * 1000,           // 5 min
    revealScope: 'current_board',
    revealDuration: 10 * 60 * 1000,    // 10 min reveal
    description: 'A quick spiritual pulse reveals all tiles, monsters, and items on the current miniboard.',
    flavorText: '"See what is hidden."',
  },
  astral_sweep: {
    key: 'astral_sweep',
    category: 'spirit',
    name: 'Astral Sweep',
    icon: 'monk_astral_focus',
    prepTime: 15 * 60 * 1000,          // 15 min
    revealScope: 'adjacent_boards',
    revealDuration: 20 * 60 * 1000,    // 20 min reveal
    description: 'Project the spirit outward. Reveals current board and all cardinally adjacent boards on the plane.',
    flavorText: '"The mind reaches where feet cannot."',
  },
  spirit_cartography: {
    key: 'spirit_cartography',
    category: 'spirit',
    name: 'Spirit Cartography',
    icon: 'monk_astral_projection',
    prepTime: 30 * 60 * 1000,          // 30 min
    revealScope: 'current_level',
    revealDuration: null,               // permanent until level change
    description: 'Deep astral projection maps the entire current level — all boards, gates, portals, and connections.',
    flavorText: '"The body rests. The spirit roams."',
  },
};

// Category lookup helper
export const DISCIPLINE_CATEGORIES = {
  chi:    ['meditative_focus'],
  stance: ['iron_skin_stance', 'flowing_water_stance', 'thundering_palm_stance'],
  spirit: ['third_eye_pulse', 'astral_sweep', 'spirit_cartography'],
};
