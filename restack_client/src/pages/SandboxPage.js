import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import AssemblyAnimation from '../components/assembly-animation';
import {
  ranger,
  ranger_notch,
  ranger_loose,
  ranger_mark,
  ranger_ensnare,
  ranger_net_throw,
  ranger_execute,
  ranger_burst_shot,
  ranger_ice_arrow,
  ranger_force_arrow,
  ranger_poison_arrow,
  ranger_celestial_arrow,
  sage,
  circle_of_protection,
  shielded,
  shielded_partial,
  healing_hands,
  perceive,
  weakness_doubled,
  direct_dispel,
  beholder_minion_portrait,
  soldier,
  wizard,
  barbarian,
  monk,
  summoner,
  engineer,
  goblin_portrait,
  soldier_portrait,
  skeleton_portrait,
  mummy_portrait,
  ogre_portrait,
  sphinx_portrait,
  wyvern_portrait,
  djinn_portrait,
  vampire_portrait,
  troll_portrait,
  wraith_portrait,
  goat_demon_portrait,
  gorgon_portrait,
  cyclops_portrait,
  Hagigah,
  Hashmallim,
  ghoul_portrait,
  precipice_guardian_portrait,
  blalok,
  blalok_claw_strike,
  blalok_bite,
  blalok_regenerate,
  shade,
  horned_pet_portrait,
  high_priest_of_the_basilisk_portrait,
  basilisk_cultists_portrait,
  claw_strike,
  claw_hit,
  claw_strike_animation,
  monster_bite,
  stomp,
  head_butt,
  bite_animation_top,
  bite_animation_bottom,
  vamp_bite_top,
  vamp_bite_bottom,
  vamp_bite_background,
  vampiric_bite,
  bat_fly,
  bat_individual,
  crimson_sight,
  soul_suck,
  heartbeat,
  reassembly,
  bones,
  betrayal,
  betrayal_hit,
  arcane_barrier,
  death_missile,
  death_missile_hit,
  bind,
  djinn_rift,
  barbarian_slash,
  barbarian_cleave,
  barbarian_axe_throw,
  barbarian_berserker,
  barbarian_leap_attack,
  bleeding,
  poison,
  shield_wall,
  lightning,
  magic_missile,
  magic_missile_icon,
  ice_blast_icon,
  wizard_disintegrate,
  wizard_sleep,
  wizard_annihilation,
  wizard_vortex,
  wizard_acid_blast,
  fireball,
  frozen,
  acid_drop,
  bat_gate,
  energy_drain,
  induce_fear,
  bow_and_arrow,
  arrowUp,
  construct_icon,
  sigil_icon,
  // Soldier Screenshot 2 abilities
  soldier_slash,
  shield_slam,
  inspire,
  soldier_defensive_stance,
  soldier_defense_stance_mini_icon,
  soldier_fist_of_honor,
  soldier_imbued_strike,
  soldier_one_man_army,
  soldier_battlecry,
  // Monk abilities
  monk_ethereal_speed,
  monk_astral_being,
  monk_astral_focus,
  monk_astral_projection,
  monk_force_punch_flurry,
  monk_third_eye,
  monk_twin_finger_authority,
  monk_inner_fire,
  monk_meditate,
  monk_whirlwind,
  monk_force_punch,
  monk_flurry,
  monk_punch,
  // Summoner icons
  summon_icon,
  summon2_icon,
  summon_skeleton_icon,
  summon_skeleton_knight_icon,
  duplicate_icon,
  duplicate_transition_icon,
  triplicate_icon,
  triplicate_transition_icon,
  open_rift_icon,
  portal_icon,
  summon3_icon,
  summon_imp_army_icon,
  summon_skeleton_army_icon,
  summon_devil_icon,
  summon_zombie_icon,
  summon_ghoul_icon,
  summon_imp_icon,
  duration_icon,
  // Swords
  shortsword,
  cutlass,
  gladius,
  longsword,
  broadsword,
  claymore,
  doomreaver,
  nightfall,
  dreadedge,
  sunsteel,
  frostbite,
  bloodsong,
  shadowfang,
  entropy,
  falchion,
  wyrmsbane,
  katana,
  greatsword,
  voidrender,
  warlords_cleaver,
  emberbrand,
  skymourne,
  opalveil,
  titans_claw,
  // Axes
  axe_1,
  axe_2,
  axe_3,
  axe_4,
  axe_5,
  axe_6,
  axe_7,
  axe_8,
  axe_9,
  axe_10,
  axe_11,
  axe_12,
  axe_13,
  axe_14,
  axe_15,
  axe_16,
  axe_17,
  axe_18,
  axe_19,
  axe_20,
  axe_21,
  axe_22,
  axe_23,
  axe_24,
  axe_25,
  gore,
  regenerate,
  blue_dragon_breath,
  bombard,
  dispell,
  elder_presence,
  impenetrable_scales,
  lay_eggs,
  serpent_vision,
  whirlwind,
  begin_trials,
  polymorph,
  hex,
  third_eye,
  shadow_presence,
  rake,
  gore_horns,
  witch_p1_1,
  greater_magic_missile,
  shadow_curse,
  spiderweb,
  summon_spiders_icon,
  spider1,
  spider2,
  spider3,
  witch_dispell,
  demonic_whispers,
  transform,
  shadow_armor,
  nether_bolt,
  undead_grasp,
  invoke_darkness,
  sphere_of_darkness,
  bifurcate,
  voidbite,
  void_rake,
  eldritch_wind,
  paradox_engine,
} from '../utils/images';
import '../styles/monster-battle.scss';

// Dynamically load all runes from the directory
const req = require.context('../assets/icons/runes', true, /\.png$/);

const runesData = {};

req.keys().forEach(key => {
  const parts = key.split('/');
  if (parts.length === 2) {
    // Base rune icon, e.g., "./archaic.png"
    const runeName = parts[1].replace('.png', '');
    if (!runesData[runeName]) runesData[runeName] = { isComplete: false, pieces: {} };
    runesData[runeName].baseImg = req(key).default || req(key);
  } else if (parts.length === 3) {
    // Inside a rune directory, e.g., "./archaic/top right.png"
    const runeName = parts[1];
    if (!runesData[runeName]) runesData[runeName] = { isComplete: false, pieces: {} };

    const fileName = parts[2].replace('.png', '');
    if (fileName === `${runeName}_assembled`) {
      runesData[runeName].assembledImg = req(key).default || req(key);
    } else {
      runesData[runeName].pieces[fileName] = req(key).default || req(key);
    }
  }
});

// Evaluate completeness for each rune
Object.keys(runesData).forEach(runeName => {
  const data = runesData[runeName];
  const requiredPieces = ['top left', 'top right', 'bottom left', 'bottom right', 'top center'];

  // Check if it has all the exact required piece names
  const hasAllPieces = requiredPieces.every(piece => !!data.pieces[piece]);

  if (data.assembledImg && hasAllPieces) {
    data.isComplete = true;

    // Filter out any "copy" or "edited" backup files that might be in the directory
    const filteredPieces = {};
    requiredPieces.forEach(piece => {
      filteredPieces[piece] = data.pieces[piece];
    });
    data.pieces = filteredPieces;
  }
});

const WEAPONS_DB = {
  swords: [
    // Tier 1
    { id: 'shortsword_sword', name: 'Shortsword', tier: 1, image: shortsword, description: 'Grants +25% base attack and +2.5 flat damage.' },
    { id: 'cutlass_sword', name: 'Cutlass', tier: 1, image: cutlass, description: 'Grants +30% base attack and +3.0 flat damage.' },
    { id: 'gladius_sword', name: 'Gladius', tier: 1, image: gladius, description: 'Grants +40% base attack and +4.0 flat damage.' },
    { id: 'falchion_sword', name: 'Falchion', tier: 1, image: falchion, description: 'Grants +45% base attack and +4.5 flat damage.' },
    { id: 'longsword_sword', name: 'Longsword', tier: 1, image: longsword, description: 'Grants +45% base attack and +4.5 flat damage.' },
    { id: 'broadsword_sword', name: 'Broadsword', tier: 1, image: broadsword, description: 'Grants +50% base attack and +5.0 flat damage.' },
    { id: 'golden_gladius_sword', name: 'Golden Gladius', tier: 1, image: gladius, description: 'Grants +40% base attack and +4.0 flat damage.' },
    { id: 'wyrmsbane_sword', name: 'Wyrmsbane', tier: 1, image: wyrmsbane, description: 'Grants +52% base attack and +5.2 flat damage.' },
    { id: 'katana_sword', name: 'Katana', tier: 1, image: katana, description: 'Grants +55% base attack and +5.5 flat damage.' },
    { id: 'claymore_sword', name: 'Claymore', tier: 1, image: claymore, description: 'Grants +60% base attack and +6.0 flat damage.' },
    { id: 'greatsword_sword', name: 'Greatsword', tier: 1, image: greatsword, description: 'Grants +70% base attack and +7.0 flat damage.' },
    // Tier 2
    { id: 'doomreaver_sword', name: 'Doomreaver', tier: 2, image: doomreaver, description: 'Grants +78% base attack and +7.8 flat damage.' },
    { id: 'nightfall_sword', name: 'Nightfall', tier: 2, image: nightfall, description: 'Grants +82% base attack and +8.2 flat damage.' },
    { id: 'dreadedge_sword', name: 'Dreadedge', tier: 2, image: dreadedge, description: 'Grants +88% base attack and +8.8 flat damage.' },
    { id: 'sunsteel_sword', name: 'Sunsteel', tier: 2, image: sunsteel, description: 'Grants +95% base attack and +9.5 flat damage.' },
    { id: 'voidrender_sword', name: 'Voidrender', tier: 2, image: voidrender, description: 'Grants +100% base attack and +10.0 flat damage.' },
    { id: 'warlords_cleaver_sword', name: "Warlord's Cleaver", tier: 2, image: warlords_cleaver, description: 'Grants +105% base attack and +10.5 flat damage.' },
    { id: 'emberbrand_sword', name: 'Emberbrand', tier: 2, image: emberbrand, description: 'Grants +110% base attack and +11.0 flat damage.' },
    // Tier 3
    { id: 'frostbite_sword', name: 'Frostbite', tier: 3, image: frostbite, description: 'Grants +130% base attack and +13.0 flat damage.' },
    { id: 'bloodsong_sword', name: 'Bloodsong', tier: 3, image: bloodsong, description: 'Grants +140% base attack and +14.0 flat damage.' },
    { id: 'shadowfang_sword', name: 'Shadowfang', tier: 3, image: shadowfang, description: 'Grants +150% base attack and +15.0 flat damage.' },
    { id: 'skymourne_sword', name: 'Skymourne', tier: 3, image: skymourne, description: 'Grants +160% base attack and +16.0 flat damage.' },
    { id: 'opalveil_sword', name: 'Opalveil', tier: 3, image: opalveil, description: 'Grants +170% base attack and +17.0 flat damage.' },
    { id: 'titans_claw_sword', name: "Titan's Claw", tier: 3, image: titans_claw, description: 'Grants +180% base attack and +18.0 flat damage.' },
    { id: 'entropy_sword', name: 'Entropy Sword', tier: 3, image: entropy, description: 'Grants +190% base attack and +19.0 flat damage.' },
  ],
  axes: [
    // Tier 1
    { id: 'woodcutters_axe', name: "Woodcutter's Axe", tier: 1, image: axe_1, description: 'Grants +15% base attack and +1.5 flat damage.' },
    { id: 'bloodcleaver_axe', name: 'Bloodcleaver Axe', tier: 1, image: axe_2, description: 'Grants +18% base attack and +1.8 flat damage.' },
    { id: 'hillbiter_axe', name: 'Hillbiter Axe', tier: 1, image: axe_3, description: 'Grants +19% base attack and +1.9 flat damage.' },
    { id: 'ironcleaver_axe', name: 'Ironcleaver Axe', tier: 1, image: axe_4, description: 'Grants +20% base attack and +2.0 flat damage.' },
    { id: 'rune_axe', name: 'Rune Axe', tier: 1, image: axe_5, description: 'Grants +22% base attack and +2.2 flat damage.' },
    { id: 'timberfall_axe', name: 'Timberfall Axe', tier: 1, image: axe_6, description: 'Grants +24% base attack and +2.4 flat damage.' },
    { id: 'grovehack_axe', name: 'Grovehack Axe', tier: 1, image: axe_7, description: 'Grants +25% base attack and +2.5 flat damage.' },
    { id: 'stormsplitter_axe', name: 'Stormsplitter Axe', tier: 1, image: axe_8, description: 'Grants +26% base attack and +2.6 flat damage.' },
    { id: 'bonecutter_axe', name: 'Bonecutter Axe', tier: 1, image: axe_9, description: 'Grants +27% base attack and +2.7 flat damage.' },
    { id: 'frostedge_axe', name: 'Frostedge Axe', tier: 1, image: axe_10, description: 'Grants +28% base attack and +2.8 flat damage.' },
    { id: 'emberchop_axe', name: 'Emberchop Axe', tier: 1, image: axe_11, description: 'Grants +30% base attack and +3.0 flat damage.' },
    // Tier 2
    { id: 'razorfang_axe', name: 'Razorfang Axe', tier: 2, image: axe_12, description: 'Grants +40% base attack and +4.0 flat damage.' },
    { id: 'stonebreaker_axe', name: 'Stonebreaker Axe', tier: 2, image: axe_13, description: 'Grants +42% base attack and +4.2 flat damage.' },
    { id: 'mossreaper_axe', name: 'Mossreaper Axe', tier: 2, image: axe_14, description: 'Grants +44% base attack and +4.4 flat damage.' },
    { id: 'warcleaver_axe', name: 'Warcleaver Axe', tier: 2, image: axe_15, description: 'Grants +46% base attack and +4.6 flat damage.' },
    { id: 'blackroot_axe', name: 'Blackroot Axe', tier: 2, image: axe_16, description: 'Grants +48% base attack and +4.8 flat damage.' },
    { id: 'dawnsplitter_axe', name: 'Dawnsplitter Axe', tier: 2, image: axe_17, description: 'Grants +50% base attack and +5.0 flat damage.' },
    { id: 'duskbane_axe', name: 'Duskbane Axe', tier: 2, image: axe_18, description: 'Grants +52% base attack and +5.2 flat damage.' },
    // Tier 3
    { id: 'thunderhewer_axe', name: 'Thunderhewer Axe', tier: 3, image: axe_19, description: 'Grants +70% base attack and +7.0 flat damage.' },
    { id: 'skullsplitter_axe', name: 'Skullsplitter Axe', tier: 3, image: axe_20, description: 'Grants +74% base attack and +7.4 flat damage.' },
    { id: 'giantsbane_axe', name: 'Giantsbane Axe', tier: 3, image: axe_21, description: 'Grants +78% base attack and +7.8 flat damage.' },
    { id: 'vinecutter_axe', name: 'Vinecutter Axe', tier: 3, image: axe_22, description: 'Grants +84% base attack and +8.4 flat damage.' },
    { id: 'obsidian_axe', name: 'Obsidian Axe', tier: 3, image: axe_23, description: 'Grants +88% base attack and +8.8 flat damage.' },
    { id: 'ashwood_axe', name: 'Ashwood Axe', tier: 3, image: axe_24, description: 'Grants +98% base attack and +9.8 flat damage.' },
    { id: 'drakebane_axe', name: 'Drakebane Axe', tier: 3, image: axe_25, description: 'Grants +104% base attack and +10.4 flat damage.' },
  ]
};

// Predefined list of monsters for sandbox selection
const monstersData = [
  {
    id: 'goblin', name: 'Goblin', portrait: goblin_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' },
      { id: 'bite', name: 'Bite', desc: 'Savage bite attack.', icon: monster_bite, type: 'bite' }
    ]
  },
  {
    id: 'skeleton', name: 'Skeleton', portrait: skeleton_portrait, abilities: [
      { id: 'sword_swing', name: 'Sword Swing', desc: 'Execute a sword swing.', icon: shortsword, type: 'sword_swing' },
      { id: 'reassembly', name: 'Reassembly (passive)', desc: 'Upon death, collapse into bones and reassemble after a long duration.', icon: reassembly, type: 'reassembly_type', isPassive: true }
    ]
  },
  {
    id: 'mummy', name: 'Mummy', portrait: mummy_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' },
      { id: 'induce_fear', name: 'Induce Fear', desc: 'Scream, filling targets with dread.', icon: induce_fear, type: 'induce_fear' },
      { id: 'energy_drain', name: 'Energy Drain', desc: 'Drain vitality from target at range.', icon: energy_drain, type: 'energy_drain' }
    ]
  },
  {
    id: 'ogre', name: 'Ogre', portrait: ogre_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' },
      { id: 'bite', name: 'Bite', desc: 'Savage bite attack.', icon: monster_bite, type: 'bite' },
      { id: 'stomp', name: 'Stomp', desc: 'Leap and slam the ground, damaging and stunning adjacent enemies.', icon: stomp, type: 'stomp' },
      { id: 'head_butt', name: 'Headbutt', desc: 'Deliver a powerful headbutt, pushing back the target.', icon: head_butt, type: 'head_butt' }
    ]
  },
  {
    id: 'vampire', name: 'Vampire', portrait: vampire_portrait, abilities: [
      { id: 'vampiric_bite', name: 'Vampiric Bite', desc: 'Savage bite that drains vitality and damages the target.', icon: vampiric_bite, type: 'vampiric_bite' },
      { id: 'bat_fly', name: 'Bat Fly', desc: 'Transform into a swarm of bats to fly across the battlefield.', icon: bat_fly, type: 'bat_fly_type' },
      { id: 'crimson_sight', name: 'Crimson Sight', desc: 'Perceive critical target vulnerabilities.', icon: crimson_sight, type: 'crimson_sight_type' },
      { id: 'soul_suck', name: 'Soul Suck', desc: 'Channel to drain the target\'s soul energy.', icon: soul_suck, type: 'soul_suck_type' }
    ]
  },
  {
    id: 'djinn', name: 'Djinn', portrait: djinn_portrait, abilities: [
      { id: 'betrayal', name: 'Betrayal', desc: 'Sow discord, forcing the target to betray their allies.', icon: betrayal, type: 'betrayal_type' },
      { id: 'arcane_barrier', name: 'Arcane Barrier', desc: 'Shield yourself in pure arcane force.', icon: arcane_barrier, type: 'arcane_barrier_type' },
      { id: 'death_missile', name: 'Death Missile', desc: 'Fires a skull missile that curses the target on impact.', icon: death_missile, type: 'death_missile_type' },
      { id: 'bind', name: 'Bind', desc: 'Conjure ethereal energy to restrict target movement.', icon: bind, type: 'bind_type' },
      { id: 'rift', name: 'Rift', desc: 'Conjure a jagged energy line spanning three tiles in front of you. After a delay, it sweeps forward and pushes back any units caught in its path by two tiles.', icon: djinn_rift, type: 'rift_type' }
    ]
  },
  {
    id: 'sphinx', name: 'Sphinx', portrait: sphinx_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' },
      { id: 'begin_trials', name: 'Begin the Trials', desc: 'Unleash the Trials of the Sphinx.', icon: begin_trials, type: 'begin_trials_type' },
      { id: 'polymorph', name: 'Polymorph', desc: 'Transform the target into a helpless frog for a long duration.', icon: polymorph, type: 'polymorph_type' },
      { id: 'hex', name: 'Hex', desc: 'Curse the target for 4 rounds. Reduces ATK by 2 and gives all skill uses a 35% chance to backfire, failing the action and dealing 10 damage to the caster.', icon: hex, type: 'hex_type' },
      { id: 'third_eye', name: 'Third Eye', desc: 'Chance to dodge incoming physical attacks.', icon: third_eye, type: 'third_eye_type', isPassive: true }
    ]
  },
  { id: 'wyvern', name: 'Wyvern', portrait: wyvern_portrait, abilities: [{ id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' }] },
  {
    id: 'troll', name: 'Troll', portrait: troll_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' },
      { id: 'gore', name: 'Gore', desc: 'A heavy strike that causes severe bleeding.', icon: gore, type: 'gore_type' },
      { id: 'regenerate', name: 'Regenerate', desc: 'Heals continuously for a long duration.', icon: regenerate, type: 'regenerate_type' }
    ]
  },
  {
    id: 'wraith', name: 'Wraith', portrait: wraith_portrait, abilities: [
      { id: 'undead_grasp', name: 'Undead Grasp', desc: 'Savage close-range claw strike dealing 100% ATK damage with a 20% chance to stun.', icon: undead_grasp, type: 'undead_grasp_type' },
      { id: 'nether_bolt', name: 'Nether Bolt', desc: 'Fire a projectile dealing 115% ATK + 8 flat damage with a 40% chance to inflict fear.', icon: nether_bolt, type: 'nether_bolt_type' },
      { id: 'invoke_darkness', name: 'Invoke Darkness', desc: 'Summon an unkillable black sphere adjacent that deals 5 damage to adjacent enemies and swallows projectiles.', icon: invoke_darkness, type: 'invoke_darkness_type' },
      { id: 'shadow_armor', name: 'Shadow Armor (Passive)', desc: 'Passive: 15% physical damage reduction. 35% chance each round to dispel debuffs.', icon: shadow_armor, type: 'shadow_armor_type', isPassive: true }
    ]
  },
  { id: 'goat_demon', name: 'Goat Demon', portrait: goat_demon_portrait, abilities: [{ id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' }] },
  { id: 'cyclops', name: 'Cyclops', portrait: cyclops_portrait, abilities: [
    { id: 'stomp', name: 'Stomp', desc: 'Leap and slam the ground, damaging and stunning adjacent enemies.', icon: stomp, type: 'stomp' },
    { id: 'gore_horns', name: 'Gore Horns', desc: 'Gore the target with massive horns, dealing heavy damage.', icon: gore_horns, type: 'gore_horns' },
    { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' }
  ] },
  { id: 'gorgon', name: 'Gorgon', portrait: gorgon_portrait, abilities: [{ id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' }] },
  {
    id: 'dragon', name: 'Dragon', portrait: wyvern_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' },
      { id: 'bite', name: 'Bite', desc: 'Savage bite attack.', icon: monster_bite, type: 'bite' },
      { id: 'blue_dragon_breath', name: 'Blue Dragon Breath', desc: 'A fat, wavy beam that deals heavy damage over time.', icon: blue_dragon_breath, type: 'blue_dragon_breath_type' },
      { id: 'dragon_whirlwind', name: 'Whirlwind', desc: 'Create a massive windstorm that pushes units back.', icon: whirlwind, type: 'dragon_whirlwind_type' },
      { id: 'bombard', name: 'Bombard', desc: 'Bombard the enemy from above.', icon: bombard, type: 'bombard_type' },
      { id: 'dispell', name: 'Dispell', desc: 'Remove magical effects.', icon: dispell, type: 'dispell_type' },
      { id: 'serpent_vision', name: 'Serpent Vision', desc: 'Enhanced vision to see vulnerabilities.', icon: serpent_vision, type: 'serpent_vision_type' },
      { id: 'lay_eggs', name: 'Lay Eggs', desc: 'Lays dragon eggs on the battlefield.', icon: lay_eggs, type: 'lay_eggs_type' },
      { id: 'impenetrable_scales', name: 'Impenetrable Scales (Passive)', desc: 'Thick dragon scales that reduce damage.', icon: impenetrable_scales, type: 'impenetrable_scales_type', isPassive: true },
      { id: 'elder_presence', name: 'Elder Presence (Passive)', desc: 'An imposing aura that intimidates foes.', icon: elder_presence, type: 'elder_presence_type', isPassive: true }
    ]
  },
  {
    id: 'hagigah', name: 'Hagigah', portrait: Hagigah, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' }
    ]
  },
  {
    id: 'hashmallim', name: 'Hashmallim', portrait: Hashmallim, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' }
    ]
  },
  {
    id: 'ghoul', name: 'Ghoul', portrait: ghoul_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' }
    ]
  },
  {
    id: 'precipice_guardian', name: 'Precipice Guardian', portrait: precipice_guardian_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' }
    ]
  },
  {
    id: 'blalok', name: 'Blalok', portrait: blalok, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: blalok_claw_strike, type: 'claw_strike' },
      { id: 'bite', name: 'Bite', desc: 'Savage bite attack.', icon: blalok_bite, type: 'bite' },
      { id: 'regenerate', name: 'Regenerate', desc: 'Heals continuously for a long duration.', icon: blalok_regenerate, type: 'regenerate_type' }
    ]
  },
  {
    id: 'shade', name: 'Shade', portrait: shade, abilities: [
      { id: 'undead_grasp', name: 'Undead Grasp', desc: 'Savage close-range claw strike dealing 100% ATK damage with a 20% chance to stun.', icon: undead_grasp, type: 'undead_grasp_type' },
      { id: 'induce_fear', name: 'Induce Fear', desc: 'Scream, filling targets with dread.', icon: induce_fear, type: 'induce_fear' },
      { id: 'despair', name: 'Despair', desc: "Unleash a wave of darkness that drains 30 stamina (endurance) from all enemies, and reduces the crew's resolve by 20 points.", icon: shadow_presence, type: 'despair' }
    ]
  },
  {
    id: 'horned_pet', name: 'Horned Pet', portrait: horned_pet_portrait, abilities: [
      { id: 'rake', name: 'Rake', desc: 'Savage double-swipe rake attack.', icon: rake, type: 'rake' },
      { id: 'head_butt', name: 'Headbutt', desc: 'Deliver a powerful headbutt, pushing back the target.', icon: head_butt, type: 'head_butt' },
      { id: 'bite', name: 'Bite', desc: 'Savage bite attack.', icon: monster_bite, type: 'bite' }
    ]
  },
  {
    id: 'high_priest_of_the_basilisk', name: 'High Priest of the Basilisk', portrait: high_priest_of_the_basilisk_portrait, abilities: [
      { id: 'voidbite', name: 'Voidbite', desc: 'Savage maw strike dealing 150% ATK and draining 30% damage as stamina.', icon: voidbite, type: 'voidbite_type' },
      { id: 'invoke_darkness', name: 'Invoke Darkness', desc: 'Summon unkillable black sphere adjacent that deals damage and swallows projectiles.', icon: invoke_darkness, type: 'invoke_darkness_type' },
      { id: 'void_rake', name: 'Void Rake', desc: 'Behaves like rake, but does 200% ATK damage and 30% chance to teleport to a random corner.', icon: void_rake, type: 'void_rake_type' },
      { id: 'eldritch_wind', name: 'Eldritch Wind', desc: 'Restores all friendly units\' stamina and heals 10% max HP.', icon: eldritch_wind, type: 'eldritch_wind_type' },
      { id: 'paradox_engine', name: 'Paradox Engine', desc: 'Teleports target unit to unoccupied corner facing center, locking them and spawning a pulsing red upside-down reflection.', icon: paradox_engine, type: 'paradox_engine_type' }
    ]
  },
  {
    id: 'basilisk_cultists', name: 'Cultist of Whispers', portrait: basilisk_cultists_portrait, abilities: [
      { id: 'magic_missile', name: 'Magic Missile', desc: 'Fire three seeking magic missiles in sequence.', icon: magic_missile_icon, type: 'magic_missile' },
      { id: 'fireball', name: 'Fireball', desc: 'Unleash a roaring fireball.', icon: fireball, type: 'fireball' },
      { id: 'ice_blast', name: 'Ice Blast', desc: 'Freeze the target in a block of absolute-zero ice.', icon: ice_blast_icon, type: 'ice_blast_proj' }
    ]
  },
  {
    id: 'beholder_minion', name: 'Beholder Minion', portrait: beholder_minion_portrait, abilities: [
      { id: 'claw_strike', name: 'Claw Strike', desc: 'Execute a savage claw strike.', icon: claw_strike, type: 'claw_strike' },
      { id: 'bifurcate', name: 'Bifurcate', desc: 'Split into two smaller copies when full energy.', icon: bifurcate, type: 'bifurcate_type' },
      { id: 'minor_magic_missile', name: 'Minor Magic Missile', desc: 'Shoot a single magic missile.', icon: magic_missile_icon, type: 'minor_magic_missile' }
    ]
  },
  {
    id: 'witch',
    name: 'Witch',
    portrait: witch_p1_1,
    abilities: [
      { id: 'greater_magic_missile', name: 'Greater Magic Missile', desc: 'Fire five seeking magic missiles in sequence.', icon: greater_magic_missile, type: 'greater_magic_missile' },
      { id: 'hex', name: 'Hex', desc: 'Curse the target for 4 rounds. Reduces ATK by 2 and gives all skill uses a 35% chance to backfire, failing the action and dealing 10 damage to the caster.', icon: hex, type: 'hex_type' },
      { id: 'shadow_curse', name: 'Shadow Curse', desc: 'Curse the target for 4 rounds. While active, the stamina (endurance) cost of any movement or action is tripled (increased from 2 to 6). If stamina drops to 0, the unit is immediately exhausted, falling asleep and becoming stunned for 4 rounds.', icon: shadow_curse, type: 'shadow_curse_type' },
      { id: 'spiderweb', name: 'Spiderweb', desc: 'Trap targets in a sticky web, restricting movement.', icon: spiderweb, type: 'spiderweb_type' },
      { id: 'summon_spiders', name: 'Summon Spiders', desc: 'Summon arachnid minions to aid in battle.', icon: summon_spiders_icon, type: 'summon_spiders_type' },
      { id: 'dispell', name: 'Dispell', desc: 'Remove magical effects.', icon: witch_dispell, type: 'witch_dispell_type' },
      { id: 'demonic_whispers', name: 'Demonic Whispers', desc: 'Whisper dark commands, driving targets mad.', icon: demonic_whispers, type: 'demonic_whispers_type' },
      { id: 'transform', name: 'Transform', desc: 'Transform into a dark beast, increasing attack power.', icon: transform, type: 'transform_type' }
    ]
  }
];

// Predefined list of 8 crew fighters and their test abilities
const fightersData = [
  {
    id: 'ranger',
    name: 'Ranger',
    portrait: ranger,
    abilities: [
      { id: 'notch', name: 'Notch', desc: 'Select arrow type to load.', icon: ranger_notch, type: 'notch' },
      { id: 'loose', name: 'Loose', desc: 'Shoot the selected notched arrow.', icon: ranger_loose, type: 'loose' },
      { id: 'mark', name: 'Mark', desc: 'Place a target mark on the enemy. Lasts until hit by an arrow or expires.', icon: ranger_mark, type: 'mark' },
      { id: 'execute', name: 'Execute', desc: 'fires a single devastating arrow for 300% attack', icon: ranger_execute, type: 'execute' },
      { id: 'burst_shot', name: 'Burst Shot', desc: 'Shoot three arrows in rapid succession.', icon: ranger_burst_shot, type: 'burst_shot' },
      { id: 'ensnare', name: 'Ensnare', desc: 'Entangle the target, paralyzing them for a short duration.', icon: ranger_ensnare, type: 'ensnare' }
    ]
  },
  {
    id: 'sage',
    name: 'Sage',
    portrait: sage,
    abilities: [
      { id: 'heal', name: 'Heal', desc: 'Restore 30 HP to an ally.', icon: healing_hands, type: 'heal' },
      { id: 'circle_of_protection', name: 'Circle of Protection', desc: 'Create a sanctuary that increases the Defense of all allies within a 2.25-tile radius by 15 for 6 rounds.', icon: circle_of_protection, type: 'circle_of_protection' },
      { id: 'perceive', name: 'Perceive', desc: 'Affects all enemy units. Doubles the weakness of each enemy for a 2x long duration.', icon: perceive, type: 'perceive_type' },
      { id: 'direct_dispel', name: 'Direct Dispel', desc: 'Removes all debuffs from a friendly unit.', icon: direct_dispel, type: 'direct_dispel' }
    ]
  },
  {
    id: 'soldier',
    name: 'Soldier',
    portrait: soldier,
    abilities: [
      { id: 'slash', name: 'Slash', desc: 'Execute a heavy steel blade slash.', icon: soldier_slash, type: 'melee' },
      { id: 'shield_wall', name: 'Shield Wall', desc: 'Deploy a protective energetic wall overlay.', icon: shield_wall, type: 'shield_wall' },
      { id: 'shield_slam', name: 'Shield Slam', desc: 'Ram target, causing heavy structural shake.', icon: shield_slam, type: 'melee_slam' },
      { id: 'defensive_stance', name: 'Defensive Stance', desc: 'Adopt a defensive stance to absorb damage.', icon: soldier_defensive_stance, type: 'defensive_stance' },
      { id: 'fist_of_honor', name: 'Fist of Honor', desc: 'Strike with a fist of pure honor.', icon: soldier_fist_of_honor, type: 'fist_of_honor' },
      { id: 'imbued_strike', name: 'Imbued Strike', desc: 'Strike with an energy-imbued blade.', icon: soldier_imbued_strike, type: 'imbued_strike' },
      { id: 'one_man_army', name: 'One Man Army', desc: 'Summon the strength of a one-man army.', icon: soldier_one_man_army, type: 'one_man_army' },
      { id: 'inspire', name: 'Inspire', desc: 'Inspire nearby allies to fight harder.', icon: inspire, type: 'inspire' },
      { id: 'battlecry', name: 'Battlecry', desc: 'Unleash a roar, amplifying size and damage.', icon: soldier_battlecry, type: 'battle_cry' }
    ]
  },
  {
    id: 'wizard',
    name: 'Wizard',
    portrait: wizard,
    abilities: [
      { id: 'fireball', name: 'Fireball', desc: 'Launch an explosive orb of flame.', icon: fireball, type: 'fireball' },
      { id: 'ice_blast', name: 'Ice Blast', desc: 'Freeze target in a block of absolute-zero ice.', icon: ice_blast_icon, type: 'ice_blast_proj' },
      { id: 'magic_missile', name: 'Magic Missile', desc: 'Fire three seeking missiles in sequence.', icon: magic_missile_icon, type: 'magic_missile' },
      { id: 'lightning_strike', name: 'Lightning', desc: 'Strike the target with electrical charge.', icon: lightning, type: 'lightning' },
      { id: 'acid_blast', name: 'Acid Blast', desc: 'Emit a conical green projectile that poisons the target.', icon: wizard_acid_blast, type: 'acid_blast' },
      { id: 'disintegrate', name: 'Disintegrate', desc: 'Call a white-red beam that expands and shakes target.', icon: wizard_disintegrate, type: 'disintegrate' },
      { id: 'sleep', name: 'Sleep', desc: 'Cast a soothing spell that puts the target to sleep.', icon: wizard_sleep, type: 'sleep' },
      { id: 'annihilation', name: 'Annihilation', desc: 'Unleash a devastating burst of pure energy.', icon: wizard_annihilation, type: 'annihilation' },
      { id: 'vortex', name: 'Vortex', desc: 'Create a swirling maelstrom at the target location.', icon: wizard_vortex, type: 'vortex' }
    ]
  },
  {
    id: 'barbarian',
    name: 'Barbarian',
    portrait: barbarian,
    abilities: [
      { id: 'barbarian_slash', name: 'Slash', desc: 'Execute a fast horizontal slash.', icon: barbarian_slash, type: 'barbarian_slash' },
      { id: 'barbarian_cleave', name: 'Cleave', desc: 'Crush target skull with axe, causing bleed.', icon: barbarian_cleave, type: 'barbarian_cleave' },
      { id: 'barbarian_axe_throw', name: 'Axe Throw', desc: 'Hurl a spinning axe at the target.', icon: barbarian_axe_throw, type: 'projectile', projectileIcon: barbarian_axe_throw },
      { id: 'barbarian_berserker', name: 'Berserker', desc: 'Enter a state of absolute fury.', icon: barbarian_berserker, type: 'barbarian_berserker' },
      { id: 'barbarian_leap_attack', name: 'Leap Attack', desc: 'Leap onto the target, knocking them back and stunning.', icon: barbarian_leap_attack, type: 'barbarian_leap' },
      { id: 'barbarian_whirlwind', name: 'Whirlwind', desc: 'Attack all adjacent units with a spinning vortex.', icon: monk_whirlwind, type: 'monk_whirlwind_type' }
    ]
  },
  {
    id: 'monk',
    name: 'Monk',
    portrait: monk,
    abilities: [
      { id: 'monk_ethereal_speed', name: 'Ethereal Speed', desc: 'Flow like wind, gaining extreme speed and yellow glow.', icon: monk_ethereal_speed, type: 'monk_ethereal' },
      { id: 'monk_astral_focus', name: 'Astral Focus', desc: 'Enter astral focus, boosting concentration.', icon: monk_astral_focus, type: 'monk_astral_focus_type' },
      { id: 'monk_astral_projection', name: 'Astral Projection', desc: 'Project spirit forward to strike.', icon: monk_astral_projection, type: 'monk_astral_proj_type' },
      { id: 'monk_force_punch_flurry', name: 'Force Punch Flurry', desc: 'Unleash a flurry of force punches.', icon: monk_force_punch_flurry, type: 'monk_fp_flurry_type' },
      { id: 'monk_third_eye', name: 'Third Eye', desc: 'Open the third eye, doubling the chance that enemy attacks will miss (4s duration).', icon: monk_third_eye, type: 'monk_third_eye_type' },
      { id: 'monk_twin_finger_authority', name: 'Twin Finger Authority', desc: 'Strike critical chakra points.', icon: monk_twin_finger_authority, type: 'monk_twin_finger_type' },
      { id: 'monk_inner_fire', name: 'Inner Fire', desc: 'Awaken the inner blaze, gaining orange glow and fiery attacks.', icon: monk_inner_fire, type: 'monk_inner' },
      { id: 'monk_meditate', name: 'Meditate', desc: 'Restores chi and heals deep wounds.', icon: monk_meditate, type: 'monk_meditate_type' },
      { id: 'monk_whirlwind', name: 'Whirlwind', desc: 'Attack all adjacent units with a spinning vortex.', icon: monk_whirlwind, type: 'monk_whirlwind_type' },
      { id: 'monk_force_punch', name: 'Force Punch', desc: 'Concentrate force to strike.', icon: monk_force_punch, type: 'monk_force_punch_type' },
      { id: 'monk_flurry', name: 'Flurry', desc: 'Unleash a rapid flurry of strikes.', icon: monk_flurry, type: 'monk_flurry_type' },
      { id: 'monk_punch', name: 'Punch', desc: 'Deliver a powerful, centered chi punch.', icon: monk_punch, type: 'monk_punch_type' }
    ]
  },
  {
    id: 'summoner',
    name: 'Summoner',
    portrait: summoner,
    abilities: [
      { id: 'open_rift', name: 'Open the Rift', desc: 'Summon a rift portal at a random open tile on the board for 3 long durations.', icon: open_rift_icon, type: 'open_rift_type', tier: 'rift' },
      { id: 'summon_skeleton', name: 'Summon Skeleton', desc: 'Summon a skeleton warrior to the field.', icon: summon_skeleton_icon, type: 'summon_skeleton_type', tier: 1 },
      { id: 'summon_imp', name: 'Summon Imp', desc: 'Summon a fiery imp minion.', icon: summon_imp_icon, type: 'summon_imp_type', tier: 1 },
      { id: 'summon_skeleton_knight', name: 'Summon Skeleton Knight', desc: 'Summon a heavily armored skeleton knight.', icon: summon_skeleton_knight_icon, type: 'summon_skeleton_knight_type', tier: 2 },
      { id: 'summon_zombie', name: 'Summon Zombie', desc: 'Summon a plague-carrying zombie.', icon: summon_zombie_icon, type: 'summon_zombie_type', tier: 2 },
      { id: 'summon_ghoul', name: 'Summon Ghoul', desc: 'Summon a ravenous flesh-eating ghoul.', icon: summon_ghoul_icon, type: 'summon_ghoul_type', tier: 2 },
      { id: 'summon_imp_army', name: 'Summon Imp Army', desc: 'Summon a swarm of imp minions.', icon: summon_imp_army_icon, type: 'summon_imp_army_type', tier: 3 },
      { id: 'summon_skeleton_army', name: 'Summon Skeleton Army', desc: 'Summon a legion of skeleton warriors.', icon: summon_skeleton_army_icon, type: 'summon_skeleton_army_type', tier: 3 },
      { id: 'summon_devil', name: 'Summon Devil', desc: 'Summon a high devil minion.', icon: summon_devil_icon, type: 'summon_devil_type', tier: 3 },
      { id: 'summoner_duplicate', name: 'Duplicate', desc: 'Create a duplicate of the summoned minion behind it.', icon: duplicate_icon, type: 'summoner_duplicate_type', tier: 'utility' },
      { id: 'summoner_triplicate', name: 'Triplicate', desc: 'Create two duplicates of the summoned minion NW and SW of it.', icon: triplicate_icon, type: 'summoner_triplicate_type', tier: 'utility' }
    ]
  },
  {
    id: 'engineer',
    name: 'Engineer',
    portrait: engineer,
    abilities: [
      { id: 'shoot_rifle', name: 'Shoot Rifle', desc: 'Fire a rifle shot with mechanical precision.', icon: bow_and_arrow, type: 'projectile', projectileIcon: arrowUp },
      { id: 'throw_grenade', name: 'Throw Grenade', desc: 'Toss a shrapnel bomb in an arc.', icon: fireball, type: 'projectile_arc', projectileIcon: fireball },
      { id: 'deploy_turret', name: 'Deploy Turret', desc: 'Construct a defensive turret on the grid.', icon: construct_icon, type: 'deploy_turret' },
      { id: 'overdrive', name: 'Overdrive', desc: 'Overload mechanical core for extra stats.', icon: sigil_icon, type: 'overdrive' }
    ]
  }
];

const GRID_SIZE = 6;
const TILE_PCT = 100 / GRID_SIZE; // 16.666667

// --- Sizing and Footprint Helpers ---
const getUnitVisualCol = (col, isHuge, isLarge) => {
  if (isHuge) return col >= 4 ? col - 1 : col + 1;
  if (isLarge) return col >= 3 ? col - 0.5 : col + 0.5;
  return col;
};
const getUnitVisualRow = (row, isHuge, isLarge) => {
  if (isHuge) return row - 1;
  if (isLarge) return row - 0.5;
  return row;
};
const getUnitLeftTileCol = (col, isHuge, isLarge) => {
  if (isHuge) return col >= 4 ? col - 2 : col;
  if (isLarge) return col >= 3 ? col - 1 : col;
  return col;
};
const getUnitTopTileRow = (row, isHuge, isLarge) => {
  if (isHuge) return row - 2;
  if (isLarge) return row - 1;
  return row;
};
const getUnitSizeFactor = (isHuge, isLarge) => {
  if (isHuge) return 3;
  if (isLarge) return 2;
  return 1;
};
const getCandidateTiles = (row, col, isHuge, isLarge) => {
  if (isHuge) {
    const offset = col >= 4 ? -1 : 1;
    return [
      { row, col }, { row: row - 1, col }, { row: row - 2, col },
      { row, col: col + offset }, { row: row - 1, col: col + offset }, { row: row - 2, col: col + offset },
      { row, col: col + 2 * offset }, { row: row - 1, col: col + 2 * offset }, { row: row - 2, col: col + 2 * offset }
    ];
  } else if (isLarge) {
    const offset = col >= 3 ? -1 : 1;
    return [
      { row, col },
      { row: row - 1, col },
      { row, col: col + offset },
      { row: row - 1, col: col + offset }
    ];
  }
  return [{ row, col }];
};

const SandboxPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('combat animations');
  const [isAssembled, setIsAssembled] = useState(false);
  const [selectedRune, setSelectedRune] = useState('archaic');

  // --- Combat Animations States ---
  const [selectedUnitType, setSelectedUnitType] = useState(localStorage.getItem('sandboxUnitType') || 'fighter');
  const [selectedFighterId, setSelectedFighterId] = useState(localStorage.getItem('sandboxFighter') || 'ranger');
  const [selectedMonsterId, setSelectedMonsterId] = useState(localStorage.getItem('sandboxMonster') || 'goblin');
  const [fighterPos, setFighterPos] = useState({ row: 2, col: 0 });
  const [targetPos, setTargetPos] = useState({ row: 2, col: 2 });
  const [barbarianPos, setBarbarianPos] = useState({ row: 3, col: 3 });

  useEffect(() => {
    localStorage.setItem('sandboxUnitType', selectedUnitType);
    localStorage.setItem('sandboxFighter', selectedFighterId);
    localStorage.setItem('sandboxMonster', selectedMonsterId);
    if (selectedUnitType === 'monster') {
      setFighterPos({ row: 2, col: 3 });
      setTargetPos({ row: 2, col: 1 });
      if (selectedMonsterId === 'dragon') {
        setSagePos({ row: 4, col: 1 });
      }
    } else {
      if (selectedFighterId === 'ranger') {
        setFighterPos({ row: 2, col: 0 });
        setTargetPos({ row: 2, col: 3 }); // Positions 2x scale Ogre Target correctly on col: 2-3, row: 1-2
      } else if (selectedFighterId === 'sage') {
        setFighterPos({ row: 2, col: 1 });
        setTargetPos({ row: 1, col: 3 }); // Move Goblin/Soldier target away from (2, 3) where friendly Soldier extra spawns
      } else {
        setFighterPos({ row: 2, col: 1 });
        setTargetPos({ row: 2, col: 3 });
      }
    }
  }, [selectedUnitType, selectedFighterId, selectedMonsterId]);
  const [placementMode, setPlacementMode] = useState('fighter'); // 'fighter' or 'target'
  const [notchedArrow, setNotchedArrow] = useState('force'); // 'ice', 'force', 'poison', 'celestial'
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [targetMarked, setTargetMarked] = useState(false);
  const [copActive, setCopActive] = useState(false);
  const [sagePerceiveEndTime, setSagePerceiveEndTime] = useState(null);
  const [sagePerceiveDuration, setSagePerceiveDuration] = useState(3000);
  const [sagePerceiveSingleDuration, setSagePerceiveSingleDuration] = useState(3000);
  const [sagePerceiveFading, setSagePerceiveFading] = useState(false);
  const [sagePerceiveActive, setSagePerceiveActive] = useState(false);
  const [sagePerceiveInstanceActive, setSagePerceiveInstanceActive] = useState(false);
  const [copFading, setCopFading] = useState(false);
  const [isAnimating, setAnimating] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isCasting, setIsCasting] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(null); // 'lunge', 'leap', 'behind_target', 'teleport_fade', etc.
  const [projectile, setProjectile] = useState(null);
  const [projectiles, setProjectiles] = useState([]); // For wizard magic missile
  const [hitEffect, setHitEffect] = useState(null);
  const [bombardWarnings, setBombardWarnings] = useState(null);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const floatingTextQueueRef = useRef([]);
  const lastFloatingTextTimeRef = useRef(0);
  const queueTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
    };
  }, []);
  const [targetShake, setTargetShake] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [fighterShake, setFighterShake] = useState(false);
  const [targetFlash, setTargetFlash] = useState(false);
  const [targetFrozen, setTargetFrozen] = useState(false);
  const [selfBuffEffect, setSelfBuffEffect] = useState(null); // 'heal', 'barrier', 'rage'
  const [shieldWallActive, setShieldWallActive] = useState(false);
  const [activeBeam, setActiveBeam] = useState(null); // 'smite', 'lightning', 'drain'
  const [turrets, setTurrets] = useState([]); // List of coordinates {row, col}
  const [minions, setMinions] = useState([]); // List of coordinates {row, col}
  const [healIcon, setHealIcon] = useState(null); // { row, col, active }
  const [dispelIcon, setDispelIcon] = useState(null); // { row, col, active }
  const [targetHealGlow, setTargetHealGlow] = useState(false);
  const [equippedWeapons, setEquippedWeapons] = useState({
    soldier: 'shortsword_sword',
    barbarian: 'woodcutters_axe',
    ranger: 'shortsword_sword',
    sage: 'shortsword_sword',
    wizard: 'shortsword_sword',
    monk: 'shortsword_sword',
    summoner: 'shortsword_sword',
    engineer: 'shortsword_sword'
  });
  const [weaponModalOpen, setWeaponModalOpen] = useState(false);
  const [weaponModalTab, setWeaponModalTab] = useState('swords');
  const [targetPushback, setTargetPushback] = useState(null);
  const [defensiveStanceActive, setDefensiveStanceActive] = useState(false);
  const [defensiveStanceFading, setDefensiveStanceFading] = useState(false);
  const [copEndTime, setCopEndTime] = useState(null);
  const [defensiveStanceEndTime, setDefensiveStanceEndTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [targetStunned, setTargetStunned] = useState(false);
  const [targetConfused] = useState(false);
  const [targetBleeding, setTargetBleeding] = useState(false);
  const [berserkerActive, setBerserkerActive] = useState(false);
  const [berserkerFading, setBerserkerFading] = useState(false);
  const [berserkerEndTime, setBerserkerEndTime] = useState(null);

  // Mummy - Induce Fear states
  const [induceFearActive, setInduceFearActive] = useState(false);
  const [targetFearOverlay, setTargetFearOverlay] = useState(null); // { row, col }
  const [despairActive, setDespairActive] = useState(false);
  const [targetFeared, setTargetFeared] = useState(false);
  const [fearEndTime, setFearEndTime] = useState(null);
  const [fearFading, setFearFading] = useState(false);

  // Mummy - Energy Drain target instance icon state
  const [targetEnergyDrainActive, setTargetEnergyDrainActive] = useState(false);

  // Vampire - Crimson Sight states
  const [vampireCrimsonSightActive, setVampireCrimsonSightActive] = useState(false);
  const [vampireCrimsonSightEndTime, setVampireCrimsonSightEndTime] = useState(null);
  const [vampireCrimsonSightFading, setVampireCrimsonSightFading] = useState(false);

  // Vampire - Bat Fly states
  const [vampireBatFlyActive, setVampireBatFlyActive] = useState(false);
  const [vampireBatFlyFading, setVampireBatFlyFading] = useState(false);
  const [vampireHidden, setVampireHidden] = useState(false);
  const [batFlyMovementActive, setBatFlyMovementActive] = useState(false);
  const [batFlyProgress, setBatFlyProgress] = useState(0);
  const [batFlyDestRow, setBatFlyDestRow] = useState(2);

  // Skeleton - Reassembly states
  const [skeletonReassemblyActive, setSkeletonReassemblyActive] = useState(false);
  const [skeletonHourglassEndTime, setSkeletonHourglassEndTime] = useState(null);
  const [skeletonReassemblyCooldownEndTime, setSkeletonReassemblyCooldownEndTime] = useState(null);

  // Djinn - Ability states
  const [djinnDeathMissileHitActive, setDjinnDeathMissileHitActive] = useState(false);
  const [djinnDeathMissileHitEndTime, setDjinnDeathMissileHitEndTime] = useState(null);

  const [djinnArcaneBarrierActive, setDjinnArcaneBarrierActive] = useState(false);
  const [djinnArcaneBarrierEndTime, setDjinnArcaneBarrierEndTime] = useState(null);
  const [djinnArcaneBarrierFading, setDjinnArcaneBarrierFading] = useState(false);

  const [djinnBindActive, setDjinnBindActive] = useState(false);
  const [djinnBindEndTime, setDjinnBindEndTime] = useState(null);
  const [djinnBindFading, setDjinnBindFading] = useState(false);

  const [riftActive, setRiftActive] = useState(false);
  const [riftSweeping, setRiftSweeping] = useState(false);

  // Djinn - Betrayal states
  const [rangerPos, setRangerPos] = useState({ row: 3, col: 0 });
  const [betrayalBeamActive, setBetrayalBeamActive] = useState(false);
  const [betrayalHitActive, setBetrayalHitActive] = useState(false);
  const [rangerBetrayalEffectActive, setRangerBetrayalEffectActive] = useState(false);
  const [rangerBetrayalEffectEndTime, setRangerBetrayalEffectEndTime] = useState(null);


  // Sage target and Dispel states
  const [sagePos, setSagePos] = useState({ row: 4, col: 1 });
  const [dragonDispellSageCopActive, setDragonDispellSageCopActive] = useState(false);
  const [dragonDispellWaveActive, setDragonDispellWaveActive] = useState(false);
  const [sageTargetFlash, setSageTargetFlash] = useState(false);
  const [sageTargetShake, setSageTargetShake] = useState(false);
  const [targetDispelGlow, setTargetDispelGlow] = useState(false);

  // Extra Ranger Target states
  const [extraRangerShake, setExtraRangerShake] = useState(false);
  const [extraRangerFlash, setExtraRangerFlash] = useState(false);
  const [extraRangerStunned, setExtraRangerStunned] = useState(false);
  const [extraRangerFeared, setExtraRangerFeared] = useState(false);
  const [extraRangerFearEndTime, setExtraRangerFearEndTime] = useState(null);
  const [extraRangerFearFading, setExtraRangerFearFading] = useState(false);

  const [inspireActive, setInspireActive] = useState(false);
  const [inspireFading, setInspireFading] = useState(false);
  const [inspireEndTime, setInspireEndTime] = useState(null);
  const [oneManArmyActive, setOneManArmyActive] = useState(false);
  const [targetPoisoned, setTargetPoisoned] = useState(false);
  const [poisonEndTime, setPoisonEndTime] = useState(null);
  const poisonIntervalRef = useRef(null);
  const targetPosRef = useRef(targetPos);
  useEffect(() => {
    targetPosRef.current = targetPos;
  }, [targetPos]);
  const [fireballExplosion, setFireballExplosion] = useState(null); // { col, row } when active
  const [annihilationExplosion, setAnnihilationExplosion] = useState(null); // { col, row } when active
  const [lightningJagged, setLightningJagged] = useState(false);
  const [frozenIconActive, setFrozenIconActive] = useState(false);
  const [frozenEndTime, setFrozenEndTime] = useState(null);

  // --- Troll & Dragon States ---
  const [trollHpPct, setTrollHpPct] = useState(30);
  const [trollRegenEndTime, setTrollRegenEndTime] = useState(null);
  const trollRegenIntervalRef = useRef(null);

  // eslint-disable-next-line no-unused-vars
  const [blueDragonBreathActive, setBlueDragonBreathActive] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [thirdEyeTriggered, setThirdEyeTriggered] = useState(false);
  const [fighterHexed, setFighterHexed] = useState(false);
  const [monsterHexed, setMonsterHexed] = useState(false);
  const [fighterHexEndTime, setFighterHexEndTime] = useState(null);
  const [monsterHexEndTime, setMonsterHexEndTime] = useState(null);
  const [fighterHexedFading, setFighterHexedFading] = useState(false);
  const [monsterHexedFading, setMonsterHexedFading] = useState(false);
  const [fighterPolymorphed, setFighterPolymorphed] = useState(false);
  const [monsterPolymorphed, setMonsterPolymorphed] = useState(false);
  const [fighterPolymorphEndTime, setFighterPolymorphEndTime] = useState(null);
  const [monsterPolymorphEndTime, setMonsterPolymorphEndTime] = useState(null);
  const fighterFrogIntervalRef = useRef(null);
  const monsterFrogIntervalRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [hexCastExplosion, setHexCastExplosion] = useState(null); // { row, col }


  const [targetEnsnared, setTargetEnsnared] = useState(false);
  const [targetEnsnaredFading, setTargetEnsnaredFading] = useState(false);
  const [ensnareEndTime, setEnsnareEndTime] = useState(null);
  const [markEndTime, setMarkEndTime] = useState(null);
  const [targetAsleep, setTargetAsleep] = useState(false);
  const [sleepIconActive, setSleepIconActive] = useState(false);
  const [sleepEndTime, setSleepEndTime] = useState(null);
  const [targetDisintegrating, setTargetDisintegrating] = useState(false);
  const [vortexActive, setVortexActive] = useState(null); // { row, col }
  const [poisonDuration, setPoisonDuration] = useState(8000);
  const [frozenDuration, setFrozenDuration] = useState(3000);
  const bleedIntervalRef = useRef(null);
  const isThirdEyeDodgeRef = useRef(false);

  const [poisonSingleDuration, setPoisonSingleDuration] = useState(8000);
  const [frozenSingleDuration, setFrozenSingleDuration] = useState(2000);
  const [bleedEndTime, setBleedEndTime] = useState(null);
  const [bleedFading, setBleedFading] = useState(false);
  const [poisonFading, setPoisonFading] = useState(false);
  const [frozenFading, setFrozenFading] = useState(false);
  const [monkTwinGlow, setMonkTwinGlow] = useState(null); // { direction: 'left'|'right'|'up'|'down' }
  const [annihilationSweepActive, setAnnihilationSweepActive] = useState(false);
  const [extraGoblin1Shake, setExtraGoblin1Shake] = useState(false);
  const [extraGoblin1Flash, setExtraGoblin1Flash] = useState(false);
  const [extraGoblin2Shake, setExtraGoblin2Shake] = useState(false);
  const [extraGoblin2Flash, setExtraGoblin2Flash] = useState(false);

  // Monk Extra Goblins States
  const [monkGoblin1Shake, setMonkGoblin1Shake] = useState(false);
  const [monkGoblin1Flash, setMonkGoblin1Flash] = useState(false);
  const [monkGoblin1Push, setMonkGoblin1Push] = useState(null);
  const [monkGoblin2Shake, setMonkGoblin2Shake] = useState(false);
  const [monkGoblin2Flash, setMonkGoblin2Flash] = useState(false);
  const [monkGoblin2Push, setMonkGoblin2Push] = useState(null);
  const [monkExtraPunches, setMonkExtraPunches] = useState([]);

  // Summoner Summoning State
  const [activeSummons, setActiveSummons] = useState([]); // Array of portals { id, row, col, icon, type, shrinking: boolean }

  // Rift Portal State
  const [riftPortalActive, setRiftPortalActive] = useState(false);
  const [riftPortalPos, setRiftPortalPos] = useState(null);
  const [riftPortalEndTime, setRiftPortalEndTime] = useState(null);
  const [riftPortalFading, setRiftPortalFading] = useState(false);

  const [etherealSpeedActive, setEtherealSpeedActive] = useState(false);
  const [etherealSpeedFading, setEtherealSpeedFading] = useState(false);
  const [etherealSpeedEndTime, setEtherealSpeedEndTime] = useState(null);
  const [innerFireActive, setInnerFireActive] = useState(false);
  const [innerFireFading, setInnerFireFading] = useState(false);
  const [innerFireEndTime, setInnerFireEndTime] = useState(null);

  // Meditation & Astral Mode States
  const [meditateAnimActive, setMeditateAnimActive] = useState(false);
  const [astralFocusAnimActive, setAstralFocusAnimActive] = useState(false);
  const [astralModeActive, setAstralModeActive] = useState(false);
  const [astralModeFading, setAstralModeFading] = useState(false);
  const [astralModeEndTime, setAstralModeEndTime] = useState(null);
  const astralModeSingleDuration = 3000;

  // Third Eye State
  const [thirdEyeActive, setThirdEyeActive] = useState(false);
  const [thirdEyeFading, setThirdEyeFading] = useState(false);
  const [thirdEyeEndTime, setThirdEyeEndTime] = useState(null);

  useEffect(() => {
    let interval;
    if (copActive || defensiveStanceActive || berserkerActive || inspireActive || etherealSpeedActive || innerFireActive || targetEnsnared || targetMarked || frozenIconActive || targetPoisoned || sleepIconActive || bleedEndTime || astralModeActive || sagePerceiveActive || thirdEyeActive || riftPortalActive || targetFeared || extraRangerFeared || vampireCrimsonSightActive || skeletonReassemblyActive || skeletonReassemblyCooldownEndTime || djinnDeathMissileHitActive || djinnArcaneBarrierActive || djinnBindActive || rangerBetrayalEffectActive || fighterHexed || monsterHexed || targetDispelGlow) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 50);
    } else {
      setCurrentTime(Date.now());
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [copActive, defensiveStanceActive, berserkerActive, inspireActive, etherealSpeedActive, innerFireActive, targetEnsnared, targetMarked, frozenIconActive, targetPoisoned, sleepIconActive, bleedEndTime, astralModeActive, sagePerceiveActive, thirdEyeActive, riftPortalActive, targetFeared, extraRangerFeared, vampireCrimsonSightActive, skeletonReassemblyActive, skeletonReassemblyCooldownEndTime, djinnDeathMissileHitActive, djinnArcaneBarrierActive, djinnBindActive, rangerBetrayalEffectActive, fighterHexed, monsterHexed, targetDispelGlow]);

  // Central status cleanups effect
  useEffect(() => {
    // Check frozen
    if (frozenEndTime) {
      const remaining = frozenEndTime - currentTime;
      if (remaining <= 0) {
        setTargetFrozen(false);
        setFrozenIconActive(false);
        setFrozenFading(false);
        setFrozenEndTime(null);
      } else if (remaining <= 300) {
        setFrozenFading(true);
      } else {
        setFrozenFading(false);
      }
    }

    // Check Hex
    if (fighterHexEndTime) {
      const remaining = fighterHexEndTime - currentTime;
      if (remaining <= 0) {
        setFighterHexed(false);
        setFighterHexedFading(false);
        setFighterHexEndTime(null);
      } else if (remaining <= 500) {
        setFighterHexedFading(true);
      } else {
        setFighterHexedFading(false);
      }
    }
    if (monsterHexEndTime) {
      const remaining = monsterHexEndTime - currentTime;
      if (remaining <= 0) {
        setMonsterHexed(false);
        setMonsterHexedFading(false);
        setMonsterHexEndTime(null);
      } else if (remaining <= 500) {
        setMonsterHexedFading(true);
      } else {
        setMonsterHexedFading(false);
      }
    }
    if (fighterPolymorphEndTime && fighterPolymorphEndTime <= currentTime) {
      if (fighterPolymorphed) addFloatingText('RESTORED!', 'normal', '#2ecc71', fighterPos.row, fighterPos.col);
      setFighterPolymorphed(false);
      setFighterPolymorphEndTime(null);
      if (fighterFrogIntervalRef.current) clearInterval(fighterFrogIntervalRef.current);
    }
    if (monsterPolymorphEndTime && monsterPolymorphEndTime <= currentTime) {
      // Find monster pos: it's not explicitly tracked but we assume targetPos or fighterPos depending on selectedUnitType
      // In sandbox, we just clear it
      setMonsterPolymorphed(false);
      setMonsterPolymorphEndTime(null);
      if (monsterFrogIntervalRef.current) clearInterval(monsterFrogIntervalRef.current);
    }

    if (trollRegenEndTime) {
      const remaining = trollRegenEndTime - currentTime;
      if (remaining <= 0) {

        setTrollRegenEndTime(null);
        if (trollRegenIntervalRef.current) {
          clearInterval(trollRegenIntervalRef.current);
          trollRegenIntervalRef.current = null;
        }
      }
    }

    if (bleedEndTime) {
      const remaining = bleedEndTime - currentTime;
      if (remaining <= 0) {
        setTargetBleeding(false);
        setBleedFading(false);
        setBleedEndTime(null);
        if (bleedIntervalRef.current) {
          clearInterval(bleedIntervalRef.current);
          bleedIntervalRef.current = null;
        }
      } else if (remaining <= 300) {
        setBleedFading(true);
      } else {
        setBleedFading(false);
      }
    }

    if (poisonEndTime) {
      const remaining = poisonEndTime - currentTime;
      if (remaining <= 0) {
        setTargetPoisoned(false);
        setPoisonFading(false);
        setPoisonEndTime(null);
        if (poisonIntervalRef.current) {
          clearInterval(poisonIntervalRef.current);
          poisonIntervalRef.current = null;
        }
      } else if (remaining <= 300) {
        setPoisonFading(true);
      } else {
        setPoisonFading(false);
      }
    }

    // Check bleed
    if (bleedEndTime) {
      const remaining = bleedEndTime - currentTime;
      if (remaining <= 0) {
        setTargetBleeding(false);
        setBleedFading(false);
        setBleedEndTime(null);
      } else if (remaining <= 300) {
        setBleedFading(true);
      } else {
        setBleedFading(false);
      }
    }

    // Check fear
    if (fearEndTime) {
      const remaining = fearEndTime - currentTime;
      if (remaining <= 0) {
        setTargetFeared(false);
        setFearFading(false);
        setFearEndTime(null);
      } else if (remaining <= 300) {
        setFearFading(true);
      } else {
        setFearFading(false);
      }
    }

    // Check extra ranger fear
    if (extraRangerFearEndTime) {
      const remaining = extraRangerFearEndTime - currentTime;
      if (remaining <= 0) {
        setExtraRangerFeared(false);
        setExtraRangerFearFading(false);
        setExtraRangerFearEndTime(null);
      } else if (remaining <= 300) {
        setExtraRangerFearFading(true);
      } else {
        setExtraRangerFearFading(false);
      }
    }

    // Check perceive
    if (sagePerceiveEndTime) {
      const remaining = sagePerceiveEndTime - currentTime;
      if (remaining <= 0) {
        setSagePerceiveActive(false);
        setSagePerceiveFading(false);
        setSagePerceiveEndTime(null);
        setSagePerceiveDuration(0);
      } else if (remaining <= 300) {
        setSagePerceiveFading(true);
      } else {
        setSagePerceiveFading(false);
      }
    }

    // Check astral mode
    if (astralModeEndTime) {
      const remaining = astralModeEndTime - currentTime;
      if (remaining <= 0) {
        setAstralModeActive(false);
        setAstralModeFading(false);
        setAstralModeEndTime(null);

        // Auto-end other active astral skills/effects
        setThirdEyeActive(false);
        setThirdEyeFading(false);
        setThirdEyeEndTime(null);
      } else if (remaining <= 300) {
        setAstralModeFading(true);
      } else {
        setAstralModeFading(false);
      }
    }

    // Check third eye
    if (thirdEyeEndTime) {
      const remaining = thirdEyeEndTime - currentTime;
      if (remaining <= 0) {
        setThirdEyeActive(false);
        setThirdEyeFading(false);
        setThirdEyeEndTime(null);
      } else if (remaining <= 300) {
        setThirdEyeFading(true);
      } else {
        setThirdEyeFading(false);
      }
    }

    // Check rift portal
    if (riftPortalEndTime) {
      const remaining = riftPortalEndTime - currentTime;
      if (remaining <= 0) {
        setRiftPortalActive(false);
        setRiftPortalFading(false);
        setRiftPortalEndTime(null);
        setRiftPortalPos(null);
      } else if (remaining <= 300) {
        setRiftPortalFading(true);
      } else {
        setRiftPortalFading(false);
      }
    }

    // Check vampire crimson sight
    if (vampireCrimsonSightEndTime) {
      const remaining = vampireCrimsonSightEndTime - currentTime;
      if (remaining <= 0) {
        setVampireCrimsonSightActive(false);
        setVampireCrimsonSightFading(false);
        setVampireCrimsonSightEndTime(null);
      } else if (remaining <= 300) {
        setVampireCrimsonSightFading(true);
      } else {
        setVampireCrimsonSightFading(false);
      }
    }

    // Check skeleton reassembly hourglass
    if (skeletonHourglassEndTime) {
      const remaining = skeletonHourglassEndTime - currentTime;
      if (remaining <= 0) {
        setSkeletonReassemblyActive(false);
        setSkeletonHourglassEndTime(null);
        addFloatingText('REASSEMBLED!', 'normal', '#ffdd57', fighterPos.row, fighterPos.col);
      }
    }

    // Check skeleton reassembly cooldown
    if (skeletonReassemblyCooldownEndTime) {
      const remaining = skeletonReassemblyCooldownEndTime - currentTime;
      if (remaining <= 0) {
        setSkeletonReassemblyCooldownEndTime(null);
      }
    }

    // Check djinn death missile hit
    if (djinnDeathMissileHitEndTime) {
      const remaining = djinnDeathMissileHitEndTime - currentTime;
      if (remaining <= 0) {
        setDjinnDeathMissileHitActive(false);
        setDjinnDeathMissileHitEndTime(null);
      }
    }

    // Check djinn arcane barrier
    if (djinnArcaneBarrierEndTime) {
      const remaining = djinnArcaneBarrierEndTime - currentTime;
      if (remaining <= 0) {
        setDjinnArcaneBarrierActive(false);
        setDjinnArcaneBarrierFading(false);
        setDjinnArcaneBarrierEndTime(null);
        setSelfBuffEffect(null);
      } else if (remaining <= 300) {
        setDjinnArcaneBarrierFading(true);
      } else {
        setDjinnArcaneBarrierFading(false);
      }
    }

    // Check djinn bind
    if (djinnBindEndTime) {
      const remaining = djinnBindEndTime - currentTime;
      if (remaining <= 0) {
        setDjinnBindActive(false);
        setDjinnBindFading(false);
        setDjinnBindEndTime(null);
      } else if (remaining <= 300) {
        setDjinnBindFading(true);
      } else {
        setDjinnBindFading(false);
      }
    }

    // Check ranger betrayal duration
    if (rangerBetrayalEffectEndTime) {
      const remaining = rangerBetrayalEffectEndTime - currentTime;
      if (remaining <= 0) {
        setRangerBetrayalEffectActive(false);
        setRangerBetrayalEffectEndTime(null);
        setRangerPos({ row: 3, col: 0 }); // return to original tile
      }
    }
  }, [currentTime, frozenEndTime, poisonEndTime, bleedEndTime, sagePerceiveEndTime, astralModeEndTime, thirdEyeEndTime, riftPortalEndTime, fearEndTime, extraRangerFearEndTime, vampireCrimsonSightEndTime, skeletonHourglassEndTime, skeletonReassemblyCooldownEndTime, djinnDeathMissileHitEndTime, djinnArcaneBarrierEndTime, djinnBindEndTime, rangerBetrayalEffectEndTime, fighterHexEndTime, monsterHexEndTime, fighterPos.row, fighterPos.col, fighterPolymorphEndTime, fighterPolymorphed, monsterPolymorphEndTime, trollRegenEndTime]);

  const TIER4_MONSTER_IDS = ['sphinx', 'dragon', 'hagigah', 'hashmallim'];
  const isFighterHuge = selectedUnitType === 'monster' && TIER4_MONSTER_IDS.includes(selectedMonsterId);
  const isFighterLarge = selectedUnitType === 'monster' && !isFighterHuge && selectedMonsterId !== 'goblin' && selectedMonsterId !== 'skeleton' && selectedMonsterId !== 'beholder_minion';
  const isTargetHuge = false;
  const isTargetLarge = selectedUnitType === 'fighter' && selectedFighterId === 'ranger';


  // Safety check: if fighter or target is large/huge but positioned out of bounds, push them
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isFighterHuge && fighterPos.row < 2) {
      setFighterPos(prev => ({ ...prev, row: 2 }));
    } else if (isFighterLarge && fighterPos.row < 1) {
      setFighterPos(prev => ({ ...prev, row: 1 }));
    }
  }, [isFighterHuge, isFighterLarge, fighterPos.row]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isTargetHuge && targetPos.row < 2) {
      setTargetPos(prev => ({ ...prev, row: 2 }));
    } else if (isTargetLarge && targetPos.row < 1) {
      setTargetPos(prev => ({ ...prev, row: 1 }));
    }
  }, [isTargetHuge, isTargetLarge, targetPos.row]);

  const getBatPosition = (idx) => {
    const startX = fighterPos.col * 20 + 10;
    const startY = fighterPos.row * 20 + 10;

    if (!batFlyMovementActive) {
      return { x: startX, y: startY, scaleX: 1 };
    }

    const endX = 0 * 20 + 10;
    const endY = batFlyDestRow * 20 + 10;

    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);

    const perpX = len > 0 ? -dy / len : 0;
    const perpY = len > 0 ? dx / len : 1;

    // Wave amplitudes and frequencies for meandering paths
    const waveAmps = [12, -15, 8];
    const waveFreqs = [1.0, 1.2, 2.0];

    const startOffsets = [
      { x: -4, y: -4 },
      { x: 4, y: -2 },
      { x: 0, y: 4 }
    ];

    const endOffsets = [
      { x: -4, y: -4 },
      { x: 4, y: -2 },
      { x: 0, y: 4 }
    ];

    const t = batFlyProgress;
    const wave = waveAmps[idx] * Math.sin(t * Math.PI * waveFreqs[idx]);
    const currentOffsetX = (1 - t) * startOffsets[idx].x + t * endOffsets[idx].x;
    const currentOffsetY = (1 - t) * startOffsets[idx].y + t * endOffsets[idx].y;

    const x = startX + t * dx + currentOffsetX + perpX * wave;
    const y = startY + t * dy + currentOffsetY + perpY * wave;

    const scaleX = (endX < startX || endX === startX) ? 1 : -1;

    return { x, y, scaleX };
  };

  const getSkeletonReassemblyHourglassDashOffset = () => {
    if (!skeletonHourglassEndTime) return 31.42;
    const remaining = Math.max(0, skeletonHourglassEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getDjinnBindDashOffset = () => {
    if (!djinnBindEndTime) return 31.42;
    const remaining = Math.max(0, djinnBindEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getDjinnArcaneBarrierDashOffset = () => {
    if (!djinnArcaneBarrierEndTime) return 31.42;
    const remaining = Math.max(0, djinnArcaneBarrierEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getRangerBetrayalDashOffset = () => {
    if (!rangerBetrayalEffectEndTime) return 31.42;
    const remaining = Math.max(0, rangerBetrayalEffectEndTime - currentTime);
    const ratio = remaining / 4000;
    return ratio * 31.42;
  };

  const getReassemblyCooldownDashOffset = () => {
    if (!skeletonReassemblyCooldownEndTime) return 0;
    const remaining = Math.max(0, skeletonReassemblyCooldownEndTime - currentTime);
    const ratio = remaining / 24000;
    return (1 - ratio) * 62.83;
  };

  const getCopDashOffset = () => {
    if (!copEndTime) return 31.42;
    const remaining = Math.max(0, copEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getDefensiveStanceDashOffset = () => {
    if (!defensiveStanceEndTime) return 31.42;
    const remaining = Math.max(0, defensiveStanceEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getBerserkerDashOffset = () => {
    if (!berserkerEndTime) return 31.42;
    const remaining = Math.max(0, berserkerEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getInspireDashOffset = () => {
    if (!inspireEndTime) return 31.42;
    const remaining = Math.max(0, inspireEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getEtherealSpeedDashOffset = () => {
    if (!etherealSpeedEndTime) return 31.42;
    const remaining = Math.max(0, etherealSpeedEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getInnerFireDashOffset = () => {
    if (!innerFireEndTime) return 31.42;
    const remaining = Math.max(0, innerFireEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getMarkDashOffset = () => {
    if (!markEndTime) return 31.42;
    const remaining = Math.max(0, markEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getEnsnareDashOffset = () => {
    if (!ensnareEndTime) return 31.42;
    const remaining = Math.max(0, ensnareEndTime - currentTime);
    const ratio = remaining / 3000;
    return ratio * 31.42;
  };

  const getHexDashOffset = (endTime) => {
    if (!endTime) return 31.42;
    const remaining = Math.max(0, endTime - currentTime);
    const ratio = remaining / 16000;
    return ratio * 31.42;
  };

  const getFrozenDashOffset = () => {
    if (!frozenEndTime) return 31.42;
    const remaining = Math.max(0, frozenEndTime - currentTime);
    if (remaining <= 0) return 31.42;
    const singleDur = frozenSingleDuration || 2000;
    const modulo = remaining % singleDur;
    const ratio = (modulo === 0 && remaining > 0) ? 1.0 : modulo / singleDur;
    return ratio * 31.42;
  };

  const getPoisonDashOffset = () => {
    if (!poisonEndTime) return 31.42;
    const remaining = Math.max(0, poisonEndTime - currentTime);
    if (remaining <= 0) return 31.42;
    const singleDur = poisonSingleDuration || 8000;
    const modulo = remaining % singleDur;
    const ratio = (modulo === 0 && remaining > 0) ? 1.0 : modulo / singleDur;
    return ratio * 31.42;
  };

  const getPerceiveDashOffset = () => {
    if (!sagePerceiveEndTime) return 31.42;
    const remaining = Math.max(0, sagePerceiveEndTime - currentTime);
    if (remaining <= 0) return 31.42;
    const singleDur = sagePerceiveSingleDuration || 3000;
    const modulo = remaining % singleDur;
    const ratio = (modulo === 0 && remaining > 0) ? 1.0 : modulo / singleDur;
    return ratio * 31.42;
  };

  const getAstralModeDashOffset = () => {
    if (!astralModeEndTime) return 31.42;
    const remaining = Math.max(0, astralModeEndTime - currentTime);
    if (remaining <= 0) return 31.42;
    const singleDur = astralModeSingleDuration || 3000;
    const modulo = remaining % singleDur;
    const ratio = (modulo === 0 && remaining > 0) ? 1.0 : modulo / singleDur;
    return ratio * 31.42;
  };

  const getSleepDashOffset = () => {
    if (!sleepEndTime) return 31.42;
    const remaining = Math.max(0, sleepEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getBleedDashOffset = () => {
    if (!bleedEndTime) return 31.42;
    const remaining = Math.max(0, bleedEndTime - currentTime);
    const ratio = remaining / 4000;
    return ratio * 31.42;
  };

  const getFearDashOffset = () => {
    if (!fearEndTime) return 31.42;
    const remaining = Math.max(0, fearEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getExtraRangerFearDashOffset = () => {
    if (!extraRangerFearEndTime) return 31.42;
    const remaining = Math.max(0, extraRangerFearEndTime - currentTime);
    const ratio = remaining / 8000;
    return ratio * 31.42;
  };

  const getThirdEyeDashOffset = () => {
    if (!thirdEyeEndTime) return 31.42;
    const remaining = Math.max(0, thirdEyeEndTime - currentTime);
    const ratio = remaining / 4000;
    return ratio * 31.42;
  };

  const getRiftPortalDashOffset = () => {
    if (!riftPortalEndTime) return 31.42;
    const remaining = Math.max(0, riftPortalEndTime - currentTime);
    if (remaining <= 0) return 31.42;
    const singleDur = 3000; // Each long duration segment is 3000ms
    const modulo = remaining % singleDur;
    const ratio = (modulo === 0 && remaining > 0) ? 1.0 : modulo / singleDur;
    return ratio * 31.42;
  };

  const getRiftPortalSegmentsRemaining = () => {
    if (!riftPortalEndTime) return 0;
    const remaining = Math.max(0, riftPortalEndTime - currentTime);
    return Math.ceil(remaining / 3000);
  };

  const getEmptyGridTiles = () => {
    const occupied = new Set();
    occupied.add(`${fighterPos.row}-${fighterPos.col}`);
    occupied.add(`${targetPos.row}-${targetPos.col}`);
    if (isFighterLarge) {
      const fOffset = fighterPos.col >= 3 ? -1 : 1;
      occupied.add(`${fighterPos.row - 1}-${fighterPos.col}`);
      occupied.add(`${fighterPos.row}-${fighterPos.col + fOffset}`);
      occupied.add(`${fighterPos.row - 1}-${fighterPos.col + fOffset}`);
    }
    if (isTargetLarge) {
      const tOffset = targetPos.col >= 3 ? -1 : 1;
      occupied.add(`${targetPos.row - 1}-${targetPos.col}`);
      occupied.add(`${targetPos.row}-${targetPos.col + tOffset}`);
      occupied.add(`${targetPos.row - 1}-${targetPos.col + tOffset}`);
    }
    minions.forEach(m => occupied.add(`${m.row}-${m.col}`));
    turrets.forEach(t => occupied.add(`${t.row}-${t.col}`));
    if (selectedFighterId === 'sage') {
      occupied.add('3-0');
      occupied.add('0-3');
      occupied.add('2-3');
      occupied.add('1-4');
      occupied.add('3-4');
    } else if (selectedFighterId === 'soldier') {
      occupied.add('0-1');
      occupied.add('0-3');
    }
    if (riftPortalActive && riftPortalPos) {
      occupied.add(`${riftPortalPos.row}-${riftPortalPos.col}`);
    }
    const empty = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!occupied.has(`${r}-${c}`)) {
          empty.push({ row: r, col: c });
        }
      }
    }
    return empty;
  };

  const getSummonPlacement = (summonType) => {
    const offsets = [
      { r: 0, c: 1 },
      { r: 0, c: -1 },
      { r: 1, c: 0 },
      { r: -1, c: 0 }
    ];
    const occupied = new Set();
    occupied.add(`${fighterPos.row}-${fighterPos.col}`);
    occupied.add(`${targetPos.row}-${targetPos.col}`);
    if (isFighterLarge) {
      const fOffset = fighterPos.col >= 3 ? -1 : 1;
      occupied.add(`${fighterPos.row - 1}-${fighterPos.col}`);
      occupied.add(`${fighterPos.row}-${fighterPos.col + fOffset}`);
      occupied.add(`${fighterPos.row - 1}-${fighterPos.col + fOffset}`);
    }
    if (isTargetLarge) {
      const tOffset = targetPos.col >= 3 ? -1 : 1;
      occupied.add(`${targetPos.row - 1}-${targetPos.col}`);
      occupied.add(`${targetPos.row}-${targetPos.col + tOffset}`);
      occupied.add(`${targetPos.row - 1}-${targetPos.col + tOffset}`);
    }
    minions.forEach(m => occupied.add(`${m.row}-${m.col}`));
    turrets.forEach(t => occupied.add(`${t.row}-${t.col}`));
    if (selectedFighterId === 'sage') {
      occupied.add('3-0'); occupied.add('0-3'); occupied.add('2-3');
      occupied.add('1-4'); occupied.add('3-4');
    } else if (selectedFighterId === 'soldier') {
      occupied.add('0-1'); occupied.add('0-3');
    }
    if (riftPortalActive && riftPortalPos) {
      occupied.add(`${riftPortalPos.row}-${riftPortalPos.col}`);
    }

    const isTier3 = ['imp_army', 'skeleton_army', 'devil'].includes(summonType);
    if (isTier3 && riftPortalActive && riftPortalPos) {
      const orthoOffsets = [
        { r: -1, c: 0 }, { r: 1, c: 0 },
        { r: 0, c: -1 }, { r: 0, c: 1 }
      ];
      const diagOffsets = [
        { r: -1, c: -1 }, { r: -1, c: 1 },
        { r: 1, c: -1 }, { r: 1, c: 1 }
      ];
      let freeAdjacent = [];
      for (const offset of orthoOffsets) {
        const r = riftPortalPos.row + offset.r;
        const c = riftPortalPos.col + offset.c;
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !occupied.has(`${r}-${c}`)) {
          freeAdjacent.push({ row: r, col: c });
        }
      }
      if (freeAdjacent.length === 0) {
        for (const offset of diagOffsets) {
          const r = riftPortalPos.row + offset.r;
          const c = riftPortalPos.col + offset.c;
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !occupied.has(`${r}-${c}`)) {
            freeAdjacent.push({ row: r, col: c });
          }
        }
      }

      if (freeAdjacent.length > 0) {
        return freeAdjacent[Math.floor(Math.random() * freeAdjacent.length)];
      }
      const emptyTiles = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (!occupied.has(`${r}-${c}`)) {
            emptyTiles.push({ row: r, col: c });
          }
        }
      }
      if (emptyTiles.length > 0) {
        return emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      }
    } else {
      for (const offset of offsets) {
        const r = fighterPos.row + offset.r;
        const c = fighterPos.col + offset.c;
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !occupied.has(`${r}-${c}`)) {
          return { row: r, col: c };
        }
      }
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (!occupied.has(`${r}-${c}`)) {
            return { row: r, col: c };
          }
        }
      }
    }
    return { row: (fighterPos.row + 1) % GRID_SIZE, col: fighterPos.col };
  };

  const executeSummonAnimation = (summonType, transitionIcon, minionIcon, minionLabel) => {
    const spawnPos = getSummonPlacement(summonType);
    setAnimating(true);
    setActiveSummons([{
      id: Math.random(),
      row: spawnPos.row,
      col: spawnPos.col,
      icon: transitionIcon,
      type: summonType,
      shrinking: false
    }]);
    setTimeout(() => {
      setActiveSummons(prev => prev.map(p => ({ ...p, shrinking: true })));
    }, 800);
    setTimeout(() => {
      setActiveSummons([]);
      setMinions(prev => [
        ...prev.filter(m => !(m.row === spawnPos.row && m.col === spawnPos.col)),
        {
          id: Math.random(),
          row: spawnPos.row,
          col: spawnPos.col,
          type: summonType,
          icon: minionIcon,
          label: minionLabel,
          fadingIn: true
        }
      ]);
      setAnimating(false);
    }, 1200);
  };

  const getRadialLineCoords = (endTime, totalDuration = 8000, singleDuration) => {
    if (!endTime) return null;
    const remaining = Math.max(0, endTime - currentTime);
    if (remaining <= 0) return null;
    const singleDur = singleDuration || totalDuration;
    if (!singleDuration && remaining >= totalDuration) return null;
    const modulo = remaining % singleDur;
    const ratio = (modulo === 0 && remaining > 0) ? 1.0 : modulo / singleDur;
    const angle = (1 - ratio) * 360;
    const rad = angle * (Math.PI / 180);
    return {
      x2: 10 + 10 * Math.cos(rad),
      y2: 10 + 10 * Math.sin(rad)
    };
  };

  const activeData = runesData[selectedRune];

  const tabs = [
    { id: 'combat animations', label: 'Combat Animations', enabled: true },
    { id: 'shard assembly', label: 'Shard Assembly', enabled: true },
    { id: 'item upgrade', label: 'Item Upgrade', enabled: false }
  ];

  const selectedFighter = selectedUnitType === 'monster'
    ? (monstersData.find(m => m.id === selectedMonsterId) || monstersData[0])
    : (fightersData.find(f => f.id === selectedFighterId) || fightersData[0]);
  const targetPortraitBase = selectedUnitType === 'monster'
    ? soldier_portrait
    : (selectedFighterId === 'sage'
      ? soldier_portrait
      : (selectedFighterId === 'ranger' ? ogre_portrait : goblin_portrait));
  const isTargetPolymorphActive = selectedUnitType === 'monster' ? fighterPolymorphed : monsterPolymorphed;
  const targetPortrait = isTargetPolymorphActive ? polymorph : targetPortraitBase;
  const targetName = selectedUnitType === 'monster'
    ? 'Soldier Target'
    : (selectedFighterId === 'sage'
      ? 'Soldier Target'
      : (selectedFighterId === 'ranger' ? 'Ogre Target' : 'Goblin Target'));



  // Helper to push floating combat numbers
  const addFloatingText = (text, type, color, row, col) => {
    if (isThirdEyeDodgeRef.current && String(text).startsWith('-')) {
      text = 'DODGE!';
      type = 'normal';
      color = '#ffffff';
    }
    const id = Math.random();
    floatingTextQueueRef.current.push({ id, text, type, color, row, col });

    const processQueue = () => {
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
        queueTimeoutRef.current = null;
      }
      if (floatingTextQueueRef.current.length === 0) return;
      const now = Date.now();
      const timeDiff = now - lastFloatingTextTimeRef.current;
      if (timeDiff >= 150) {
        const next = floatingTextQueueRef.current.shift();
        lastFloatingTextTimeRef.current = now;
        setFloatingTexts(prev => {
          const activeOnTile = prev.filter(t => t.row === next.row && t.col === next.col);
          let xOffset = 0;
          if (activeOnTile.length > 0) {
            const offsets = [-15, 15, -8, 8];
            xOffset = offsets[(activeOnTile.length - 1) % offsets.length];
          }
          return [...prev, { ...next, xOffset }];
        });
        setTimeout(() => {
          setFloatingTexts(prev => prev.filter(t => t.id !== next.id));
        }, 1800);
        if (floatingTextQueueRef.current.length > 0) {
          queueTimeoutRef.current = setTimeout(processQueue, 150);
        }
      } else {
        const neededDelay = 150 - timeDiff;
        queueTimeoutRef.current = setTimeout(processQueue, neededDelay);
      }
    };

    processQueue();
  };

  const applyRegen = (duration, tickInterval = 1500) => {
    setTrollRegenEndTime(prev => {
      const now = Date.now();
      return (prev && prev > now) ? prev + duration : now + duration;
    });


    if (trollRegenIntervalRef.current) clearInterval(trollRegenIntervalRef.current);
    trollRegenIntervalRef.current = setInterval(() => {
      const healAmt = 5;
      addFloatingText(`+${healAmt}`, 'normal', '#2ecc71', fighterPos.row, fighterPos.col);
      setTrollHpPct(prev => Math.min(100, prev + healAmt));
    }, tickInterval);
  };



  const applyPoison = (duration, tickInterval = 1500, tickDamage = 4) => {
    setPoisonSingleDuration(duration);
    setPoisonDuration(prev => (prev || 0) + duration);
    setPoisonEndTime(prev => {
      const now = Date.now();
      return (prev && prev > now) ? prev + duration : now + duration;
    });
    setTargetPoisoned(true);
    setPoisonFading(false);

    if (poisonIntervalRef.current) clearInterval(poisonIntervalRef.current);
    poisonIntervalRef.current = setInterval(() => {
      addFloatingText(`-${tickDamage}`, 'normal', '#38b000', targetPosRef.current.row, targetPosRef.current.col);
    }, tickInterval);
  };

  const applyPerceive = (duration) => {
    setSagePerceiveSingleDuration(duration);
    setSagePerceiveDuration(prev => (prev || 0) + duration * 2);
    setSagePerceiveEndTime(prev => {
      const now = Date.now();
      return (prev && prev > now) ? prev + duration * 2 : now + duration * 2;
    });
    setSagePerceiveActive(true);
    setSagePerceiveFading(false);
  };

  const applyFreeze = (duration) => {
    setFrozenSingleDuration(duration);
    setFrozenDuration(prev => (prev || 0) + duration);
    setFrozenEndTime(prev => {
      const now = Date.now();
      return (prev && prev > now) ? prev + duration : now + duration;
    });
    setTargetFrozen(true);
    setFrozenIconActive(true);
    setFrozenFading(false);
  };

  // Helper to determine projectile rotation angle
  const getProjectileAngle = () => {
    const fromCol = getUnitVisualCol(fighterPos.col, isFighterHuge, isFighterLarge);
    const fromRow = getUnitVisualRow(fighterPos.row, isFighterHuge, isFighterLarge);
    const toCol = getUnitVisualCol(targetPos.col, isTargetHuge, isTargetLarge);
    const toRow = getUnitVisualRow(targetPos.row, isTargetHuge, isTargetLarge);
    const dy = toRow - fromRow;
    const dx = toCol - fromCol;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  // Arrow type color map for CSS arrow rendering
  const arrowTypeColors = {
    force: '#ff9f1c',
    ice: '#00bfff',
    poison: '#38b000',
    celestial: '#ffdd57'
  };

  // Helper to determine dynamic lunge/jump transform offsets
  const getFighterTransformStyle = () => {
    if (fighterShake) return 'translate(5px, 2px) rotate(2deg)';
    if (!isAnimating) return 'none';
    const colDiff = targetPos.col - fighterPos.col;
    const rowDiff = targetPos.row - fighterPos.row;
    const xFactor = 1 / getUnitSizeFactor(isFighterHuge, isFighterLarge);
    const yFactor = 1 / getUnitSizeFactor(isFighterHuge, isFighterLarge);

    switch (animationPhase) {
      case 'lunge':
        // Lunge 80% of the way to target
        return `translate(${colDiff * 80 * xFactor}%, ${rowDiff * 80 * yFactor}%)`;
      case 'step_adjacent':
        const dx = fighterPos.col - targetPos.col;
        const dy = fighterPos.row - targetPos.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const colStep = Math.round(dx / dist);
          const rowStep = Math.round(dy / dist);
          let targetColOffset = (targetPos.col + colStep) - fighterPos.col;
          let targetRowOffset = (targetPos.row + rowStep) - fighterPos.row;
          if (targetColOffset === 0 && targetRowOffset === 0) {
            targetColOffset = (targetPos.col - fighterPos.col) * 0.35;
            targetRowOffset = (targetPos.row - fighterPos.row) * 0.35;
          }
          return `translate(${targetColOffset * 100 * xFactor}%, ${targetRowOffset * 100 * yFactor}%)`;
        }
        return 'none';
      case 'leap':
        return `translate(${colDiff * 100 * xFactor}%, ${rowDiff * 100 * yFactor}%) scale(1.35)`;
      case 'behind_target':
        const colOffset = targetPos.col < 4 ? 1 : -1;
        const targetCol = targetPos.col + colOffset - fighterPos.col;
        const targetRow = targetPos.row - fighterPos.row;
        return `translate(${targetCol * 100 * xFactor}%, ${targetRow * 100 * yFactor}%)`;
      case 'heal_approach': {
        const dx = targetPos.col - fighterPos.col;
        const dy = targetPos.row - fighterPos.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const stepCol = Math.round(dx / dist);
          const stepRow = Math.round(dy / dist);
          const adjCol = targetPos.col - stepCol;
          const adjRow = targetPos.row - stepRow;
          const colDiff = adjCol - fighterPos.col;
          const rowDiff = adjRow - fighterPos.row;
          return `translate(${colDiff * 100 * xFactor}%, ${rowDiff * 100 * yFactor}%)`;
        }
        return 'none';
      }
      case 'leap_landing': {
        const dx = targetPos.col - fighterPos.col;
        const dy = targetPos.row - fighterPos.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const colStep = Math.round(dx / dist);
          const rowStep = Math.round(dy / dist);
          const targetColOffset = (targetPos.col - colStep * 0.5) - fighterPos.col;
          const targetRowOffset = (targetPos.row - rowStep * 0.5) - fighterPos.row;
          return `translate(${targetColOffset * 100 * xFactor}%, ${targetRowOffset * 100 * yFactor}%)`;
        }
        return 'none';
      }
      case 'teleport_fade':
        return 'scale(0.8)';
      default:
        return 'none';
    }
  };

  // Helper for transitions
  const getFighterTransitionStyle = () => {
    if (animationPhase === 'teleport_fade') return 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out';
    if (animationPhase === 'lunge') return 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    if (animationPhase === 'step_adjacent') return 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    if (animationPhase === 'leap_landing') return 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    if (animationPhase === 'heal_approach') return 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    if (animationPhase === 'leap') return 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    if (animationPhase === 'astral_projection') return 'left 1.2s ease-in-out, top 1.2s ease-in-out, opacity 1.2s';
    return 'transform 0.25s ease-in-out, opacity 0.2s';
  };

  // Trigger Skeleton Reassembly Death Passive simulation
  const triggerSkeletonDeath = () => {
    if (isAnimating) return;
    if (skeletonReassemblyCooldownEndTime && Date.now() < skeletonReassemblyCooldownEndTime) {
      addFloatingText('REASSEMBLY ON COOLDOWN!', 'normal', '#ff4d4d', fighterPos.row, fighterPos.col);
      return;
    }

    setAnimating(true);
    setSkeletonReassemblyActive(true);

    const longDuration = 8000; // 8 seconds
    setSkeletonHourglassEndTime(Date.now() + longDuration);
    setSkeletonReassemblyCooldownEndTime(Date.now() + longDuration * 3); // 24 seconds cooldown

    addFloatingText('KILLED!', 'crit', '#e63946', fighterPos.row, fighterPos.col);
    addFloatingText('REASSEMBLY TRIGGERED!', 'normal', '#9d4edd', fighterPos.row, fighterPos.col);

    setTimeout(() => {
      setAnimating(false);
    }, 500);
  };

  // Main Ability trigger logic
  const triggerAbility = (ability) => {
    if (isAnimating) return;

    const isFighterSource = selectedUnitType === 'fighter';
    const sourceHexed = isFighterSource ? fighterHexed : monsterHexed;
    const sourcePolymorphed = isFighterSource ? fighterPolymorphed : monsterPolymorphed;

    isThirdEyeDodgeRef.current = false;
    const isTargetSphinx = isFighterSource ? selectedMonsterId === 'sphinx' : selectedFighterId === 'sphinx';
    if (isTargetSphinx && Math.random() <= 0.35) {
      setThirdEyeTriggered(true);
      setTimeout(() => setThirdEyeTriggered(false), 1500);
      addFloatingText('THIRD EYE!', 'crit', '#00ffff', targetPosRef.current.row, targetPosRef.current.col);
      if (Math.random() <= 0.70) {
        isThirdEyeDodgeRef.current = true;
      }
    }

    if (sourcePolymorphed) {
      addFloatingText('FROGS CANNOT ATTACK!', 'normal', '#e74c3c', fighterPos.row, fighterPos.col);
      return;
    }

    if (sourceHexed) {
      const backfireRoll = Math.random();
      if (backfireRoll <= 0.35) {
        setHitEffect({ type: 'hex_backfire' });
        addFloatingText('HEX BACKFIRE!', 'crit', '#ff00ff', fighterPos.row, fighterPos.col);
        addFloatingText('-10', 'normal', '#ff00ff', fighterPos.row, fighterPos.col);
        setTimeout(() => setHitEffect(null), 500);
        return;
      }
    }

    if (ability.type === 'melee' || ability.type === 'melee_poison' || ability.type === 'melee_slam' || ability.type === 'melee_heavy' || ability.type === 'melee_punches' || ability.type === 'melee_spin' || ability.type === 'barbarian_slash' || ability.type === 'claw_strike' || ability.type === 'undead_grasp_type' || ability.type === 'bite' || ability.type === 'head_butt' || ability.type === 'vampiric_bite' || ability.type === 'sword_swing' || ability.id === 'sword_swing' || ability.type === 'rake' || ability.id === 'rake' || ability.type === 'gore_type' || ability.id === 'gore') {
      setAnimating(true);


      const isSlash = ability.id === 'slash' || ability.id === 'barbarian_slash' || ability.id === 'sword_swing' || ability.type === 'sword_swing';
      const isSlam = ability.type === 'melee_slam' || ability.type === 'head_butt';
      const isClawStrike = ability.type === 'claw_strike' || ability.id === 'claw_strike';
      const isUndeadGrasp = ability.type === 'undead_grasp_type' || ability.id === 'undead_grasp';
      const isBite = ability.type === 'bite' || ability.id === 'bite' || ability.type === 'gore_type' || ability.id === 'gore';
      const isVampiricBite = ability.type === 'vampiric_bite' || ability.id === 'vampiric_bite';
      const isRake = ability.type === 'rake' || ability.id === 'rake';

      if (isSlash) {
        setAnimationPhase('step_adjacent'); // Move to adjacent (takes 250ms)

        // Arrives adjacent: trigger weapon slash swing animation (duration 0.75s)
        setTimeout(() => {
          setHitEffect({ type: 'weapon_slash' });
        }, 250);

        // Impact peak (800ms total, 550ms into swing): shake target, flash red, add damage text
        setTimeout(() => {
          setTargetShake(true);
          setTargetFlash(true);
          const dmgText = (ability.id === 'sword_swing' || ability.type === 'sword_swing') ? '-18' : '-15';
          const dmgColor = (ability.id === 'sword_swing' || ability.type === 'sword_swing') ? '#ff9f1c' : '#ff4d4d';
          addFloatingText(dmgText, 'normal', dmgColor, targetPos.row, targetPos.col);

          // Clear target shake/flash after 250ms
          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 250);
        }, 800);

        // Swing completes (1000ms total, 750ms swing): remove weapon icon, return to origin
        setTimeout(() => {
          setHitEffect(null);
          setAnimationPhase('return');
        }, 1000);

        // Arrives back at origin (1250ms total, return takes 250ms): end animation
        setTimeout(() => {
          setAnimating(false);
          setAnimationPhase(null);
        }, 1250);
      } else if (isClawStrike || isUndeadGrasp) {
        setAnimationPhase('step_adjacent'); // Move to adjacent (takes 250ms)

        // Arrives adjacent: trigger claw strike swipe swing animation (duration 0.75s)
        setTimeout(() => {
          setHitEffect({ type: isUndeadGrasp ? 'undead_grasp_swipe' : 'claw_strike_swipe' });
        }, 250);

        // Swing completes (1000ms total, 750ms swing): remove swipe icon, show claw_hit overlay, shake target, flash red, add damage text, and return to origin
        setTimeout(() => {
          setHitEffect({ type: 'claw_hit' });
          setTargetShake(true);
          setTargetFlash(true);
          const dmg = isUndeadGrasp ? '-15' : '-18';
          const dmgColor = isUndeadGrasp ? '#a21caf' : '#ff9f1c';
          addFloatingText(dmg, 'normal', dmgColor, targetPos.row, targetPos.col);
          setAnimationPhase('return');
        }, 1000);

        // Arrives back at origin (1250ms total, return takes 250ms): end animation, clear target shake/flash/hit effect
        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
          setAnimating(false);
          setAnimationPhase(null);
        }, 1250);
      } else if (isBite) {
        setAnimationPhase('step_adjacent'); // Move adjacent (takes 250ms)

        // Arrives adjacent: trigger bite chomping animation
        setTimeout(() => {
          setHitEffect({ type: 'bite_chomping' });
        }, 250);

        const isGore = ability.type === 'gore_type' || ability.id === 'gore';
        const dealsGoreDmg = isGore;
        const goreDmg = '-44';
        const biteDmg = '-22';
        const shouldBleed = !isGore || (Math.random() < 0.70);

        // Impact (at 550ms total, which is 300ms after bite starts closing):
        // Jaws slam shut, target shakes, flashes red, damage text floats, and bleed status is applied.
        setTimeout(() => {
          setTargetShake(true);
          setTargetFlash(true);
          if (shouldBleed) {
            setTargetBleeding(true);
            setBleedFading(false);
            setBleedEndTime(Date.now() + 4000);
          }
          addFloatingText(dealsGoreDmg ? goreDmg : biteDmg, 'crit', '#e63946', targetPos.row, targetPos.col);

          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 250);
        }, 550);

        // Bite animation completes: clear hitEffect and return to origin
        setTimeout(() => {
          setHitEffect(null);
          setAnimationPhase('return');
        }, 950);

        // Arrives back at origin: end animating
        setTimeout(() => {
          setAnimating(false);
          setAnimationPhase(null);
        }, 1200);
      } else if (isVampiricBite) {
        setAnimationPhase('step_adjacent'); // Move adjacent (takes 250ms)

        // Arrives adjacent: trigger vampiric bite animation
        setTimeout(() => {
          setHitEffect({ type: 'vampiric_bite_chomping' });
        }, 250);

        // Impact (at 550ms total, which is 300ms after bite starts closing)
        setTimeout(() => {
          setTargetShake(true);
          setTargetFlash(true);
          setTargetBleeding(true);
          setBleedFading(false);
          setBleedEndTime(Date.now() + 4000);
          addFloatingText('-22', 'crit', '#d90429', targetPos.row, targetPos.col);

          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 250);
        }, 550);

        // Bite animation completes: clear hitEffect and return to origin
        setTimeout(() => {
          setHitEffect(null);
          setAnimationPhase('return');
        }, 950);

        // Arrives back at origin: end animating
        setTimeout(() => {
          setAnimating(false);
          setAnimationPhase(null);
        }, 1200);
      } else if (isRake) {
        setAnimationPhase('step_adjacent'); // Move adjacent (takes 250ms)

        // First rake swipe animation starts at 250ms (duration 0.75s)
        setTimeout(() => {
          setHitEffect({ type: 'claw_strike_swipe' });
        }, 250);

        // First hit resolves at 1000ms: show hit overlay, shake target, flash red, show damage text
        setTimeout(() => {
          setHitEffect({ type: 'claw_hit' });
          setTargetShake(true);
          setTargetFlash(true);
          addFloatingText('-14', 'normal', '#ff9f1c', targetPos.row, targetPos.col);
          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 250);
        }, 1000);

        // Second rake swipe animation starts at 1100ms
        setTimeout(() => {
          setHitEffect({ type: 'claw_strike_swipe' });
        }, 1100);

        // Second hit resolves at 1850ms: show hit overlay, shake target, flash red, show second damage text
        setTimeout(() => {
          setHitEffect({ type: 'claw_hit' });
          setTargetShake(true);
          setTargetFlash(true);
          addFloatingText('-14', 'normal', '#ff9f1c', targetPos.row, targetPos.col);
          setAnimationPhase('return'); // start returning
        }, 1850);

        // Arrives back at origin (2100ms total, return takes 250ms): end animating
        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
          setAnimating(false);
          setAnimationPhase(null);
        }, 2100);
      } else if (isSlam) {
        setAnimating(true);
        // 0ms: Render the connect icon on the edge of the tile facing the target.
        if (ability.type === 'head_butt') {
          setHitEffect({ type: 'headbutt_connect' });
        } else {
          setHitEffect({ type: 'shield_slam_connect' });
        }
        setAnimationPhase(null); // Keep at origin

        const dx = targetPos.col - fighterPos.col;
        const dy = targetPos.row - fighterPos.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pushCol = dist > 0 ? Math.round(dx / dist) : 1;
        const pushRow = dist > 0 ? Math.round(dy / dist) : 0;

        // 300ms: Lunge forward
        setTimeout(() => {
          setAnimationPhase('lunge');
        }, 300);

        // 500ms: Impact target (shake, flash, damage text, and start pushback)
        setTimeout(() => {
          setTargetShake(true);
          setTargetFlash(true);

          if (ability.type === 'head_butt') {
            addFloatingText('-18', 'normal', '#ff5400', targetPos.row, targetPos.col);
            addFloatingText('STUNNED!', 'normal', '#ffe600', targetPos.row, targetPos.col);
            setTargetStunned(true);
            setTimeout(() => {
              setTargetStunned(false);
            }, 6000);
          } else {
            addFloatingText('-18', 'normal', '#ff9f1c', targetPos.row, targetPos.col);
          }

          // Push target smoothly back 1 tile in direction of attack
          setTargetPushback(`translate(${pushCol * 100}%, ${pushRow * 100}%)`);

          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 250);
        }, 500);

        // 750ms: Icon disappears (clear hit effect) and Soldier returns to origin
        setTimeout(() => {
          setHitEffect(null);
          setAnimationPhase('return');
        }, 750);

        // 1000ms: Soldier return completes, animation state and pushbacks are cleared
        setTimeout(() => {
          setAnimating(false);
          setAnimationPhase(null);
          setTargetPushback(null); // Reset target position smoothly back to origin
        }, 1000);
      } else {
        setAnimationPhase('lunge');
        const hitDelay = 200;
        const totalDuration = 500;

        setTimeout(() => {
          // Impact
          setTargetShake(true);
          setTargetFlash(true);

          let hitType = 'slash';
          let dmg = '-15';
          let color = '#ff4d4d';

          if (ability.type === 'melee_heavy') {
            dmg = '-38';
            color = '#ff3333';
          } else if (ability.type === 'melee_poison') {
            dmg = '-12';
            color = '#38b000';
            hitType = 'slash';
          } else if (ability.type === 'melee_punches') {
            dmg = '-10';
            color = '#ffdd57';
          } else if (ability.type === 'claw_strike') {
            dmg = '-18';
            color = '#ff9f1c';
            hitType = 'claw_hit';
          }

          setHitEffect({ type: hitType });
          addFloatingText(dmg, ability.type === 'melee_heavy' ? 'crit' : 'normal', color, targetPos.row, targetPos.col);

          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
            setHitEffect(null);
          }, 250);

          // Return
          setAnimationPhase('return');
        }, hitDelay);

        setTimeout(() => {
          setAnimating(false);
          setAnimationPhase(null);
        }, totalDuration);
      }
    }

    // --- TROLL REGENERATE ---
    else if (ability.type === 'regenerate_type') {
      if (trollHpPct >= 50) {
        addFloatingText('HP MUST BE BELOW 50%!', 'normal', '#e74c3c', fighterPos.row, fighterPos.col);
        return;
      }
      setAnimating(true);
      applyRegen(15000, 1500); // 15s duration (10 ticks)
      addFloatingText('REGENERATE!', 'normal', '#2ecc71', fighterPos.row, fighterPos.col);
      setTimeout(() => {
        setAnimating(false);
      }, 500);
    }

    // --- SOLDIER FIST OF HONOR ---
    else if (ability.type === 'fist_of_honor') {
      setAnimating(true);
      setAnimationPhase('step_adjacent');

      // 1. Connection (at 250ms when step_adjacent arrives)
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'fist_connect' });
        setTargetStunned(true);
        addFloatingText('-24', 'crit', '#ffdd57', targetPos.row, targetPos.col);
      }, 250);

      // 2. Clear target shake/flash (at 500ms, 250ms duration)
      setTimeout(() => {
        setTargetShake(false);
        setTargetFlash(false);
      }, 500);

      // 3. Clear fist overlay and start return animation (at 1050ms, 800ms connect duration)
      setTimeout(() => {
        setHitEffect(null);
        setAnimationPhase('return');
      }, 1050);

      // 4. Return completes, end animation (at 1300ms, 250ms return duration)
      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
      }, 1300);

      // 5. Stun effect ends (at 6250ms total, giving 6.0 seconds of stun starting at 250ms)
      setTimeout(() => {
        setTargetStunned(false);
      }, 6250);
    }

    // --- SOLDIER IMBUED STRIKE ---
    else if (ability.type === 'imbued_strike') {
      setAnimating(true);
      setAnimationPhase('step_adjacent');

      // 1. Trigger weapon slash overlay (at 250ms when step_adjacent arrives)
      setTimeout(() => {
        setHitEffect({ type: 'imbued_strike_effect' });
      }, 250);

      // 2. Thrust peak connection (at 900ms: 250ms start + 650ms thrust peak)
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        addFloatingText('-28', 'normal', '#00ffff', targetPos.row, targetPos.col);
      }, 900);

      // 3. Clear target shake/flash (at 1150ms, 250ms duration)
      setTimeout(() => {
        setTargetShake(false);
        setTargetFlash(false);
      }, 1150);

      // 4. Clear weapon overlay and return (at 1250ms, 1000ms swing duration)
      setTimeout(() => {
        setHitEffect(null);
        setAnimationPhase('return');
      }, 1250);

      // 5. Return completes (at 1500ms, 250ms return duration)
      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
      }, 1500);
    }

    // --- SOLDIER DEFENSIVE STANCE ---
    else if (ability.type === 'defensive_stance') {
      setAnimating(true);
      setSelfBuffEffect('barrier');
      setDefensiveStanceActive(true);
      setDefensiveStanceFading(false);
      setDefensiveStanceEndTime(Date.now() + 8000);
      addFloatingText('DEFENSIVE STANCE', 'normal', '#3b82f6', fighterPos.row, fighterPos.col);
      setTimeout(() => {
        setSelfBuffEffect(null);
        setAnimating(false);
      }, 1000);
      setTimeout(() => {
        setDefensiveStanceFading(true);
        setTimeout(() => {
          setDefensiveStanceActive(false);
          setDefensiveStanceFading(false);
          setDefensiveStanceEndTime(null);
        }, 300);
      }, 8000);
    }

    // --- SOLDIER ONE MAN ARMY ---
    else if (ability.type === 'one_man_army') {
      setAnimating(true);
      setSelfBuffEffect('rage');
      setOneManArmyActive(true);
      addFloatingText('ONE MAN ARMY!', 'crit', '#e63946', fighterPos.row, fighterPos.col);

      const arena = document.querySelector('.combat-grid-arena');
      if (arena) {
        arena.style.animation = 'shake 0.4s ease-out';
        setTimeout(() => arena.style.animation = 'none', 400);
      }

      setTimeout(() => {
        setSelfBuffEffect(null);
        setAnimating(false);
      }, 1500);

      setTimeout(() => {
        setOneManArmyActive(false);
      }, 8000);
    }

    // --- SOLDIER INSPIRE ---
    else if (ability.type === 'inspire') {
      setAnimating(true);
      setInspireActive(true);
      setInspireFading(false);
      setInspireEndTime(Date.now() + 8000);
      addFloatingText('INSPIRE!', 'normal', '#ffdd57', fighterPos.row, fighterPos.col);

      // Float combat stats on other friendly units (Ranger at 0,1 and Monk at 0,3)
      setTimeout(() => {
        addFloatingText('ATTACK UP!', 'normal', '#ffdd57', 0, 1);
        addFloatingText('DEFENSE UP!', 'normal', '#ffdd57', 0, 3);
      }, 100);
      setTimeout(() => {
        addFloatingText('DEFENSE UP!', 'normal', '#ffdd57', 0, 1);
        addFloatingText('ATTACK UP!', 'normal', '#ffdd57', 0, 3);
      }, 300);

      setTimeout(() => {
        setAnimating(false);
      }, 1000);

      setTimeout(() => {
        setInspireFading(true);
        setTimeout(() => {
          setInspireActive(false);
          setInspireFading(false);
          setInspireEndTime(null);
        }, 300);
      }, 8000);
    }

    // --- MONK ETHEREAL SPEED ---
    else if (ability.type === 'monk_ethereal') {
      setAnimating(true);
      setEtherealSpeedActive(true);
      setEtherealSpeedFading(false);
      setEtherealSpeedEndTime(Date.now() + 8000);
      addFloatingText('ETHEREAL SPEED!', 'normal', '#ffdd57', fighterPos.row, fighterPos.col);

      setTimeout(() => {
        setAnimating(false);
      }, 1000);

      setTimeout(() => {
        setEtherealSpeedFading(true);
        setTimeout(() => {
          setEtherealSpeedActive(false);
          setEtherealSpeedFading(false);
          setEtherealSpeedEndTime(null);
        }, 300);
      }, 8000);
    }

    // --- MONK INNER FIRE ---
    else if (ability.type === 'monk_inner') {
      setAnimating(true);
      setInnerFireActive(true);
      setInnerFireFading(false);
      setInnerFireEndTime(Date.now() + 8000);
      addFloatingText('INNER FIRE!', 'crit', '#ff5400', fighterPos.row, fighterPos.col);

      setTimeout(() => {
        setAnimating(false);
      }, 1000);

      setTimeout(() => {
        setInnerFireFading(true);
        setTimeout(() => {
          setInnerFireActive(false);
          setInnerFireFading(false);
          setInnerFireEndTime(null);
        }, 300);
      }, 8000);
    }

    // --- MONK MEDITATE ---
    else if (ability.type === 'monk_meditate_type') {
      setAnimating(true);
      setMeditateAnimActive(true);
      addFloatingText('+30', 'normal', '#ffdd57', fighterPos.row, fighterPos.col);

      setTimeout(() => {
        setMeditateAnimActive(false);
        setAnimating(false);
      }, 2000);
    }

    // --- MONK ASTRAL FOCUS ---
    else if (ability.type === 'monk_astral_focus_type') {
      setAnimating(true);
      setAstralFocusAnimActive(true);
      addFloatingText('ASTRAL FOCUS!', 'normal', '#21e6c1', fighterPos.row, fighterPos.col);

      setTimeout(() => {
        setAstralFocusAnimActive(false);
        setAnimating(false);

        // Enter Astral Mode for 2 long durations (6000ms)
        setAstralModeActive(true);
        setAstralModeFading(false);
        setAstralModeEndTime(Date.now() + 6000);
      }, 4000); // Doubled from 2000 to 4000
    }

    // --- MONK THIRD EYE ---
    else if (ability.type === 'monk_third_eye_type') {
      setAnimating(true);
      addFloatingText('FORESIGHT!', 'normal', '#21e6c1', fighterPos.row, fighterPos.col);
      addFloatingText('DOUBLED EVASION', 'normal', '#21e6c1', fighterPos.row, fighterPos.col);
      setHitEffect({ type: 'monk_third_eye_effect' });

      setThirdEyeActive(true);
      setThirdEyeFading(false);
      setThirdEyeEndTime(Date.now() + 4000);

      setTimeout(() => {
        setHitEffect(null);
        setAnimating(false);
      }, 1000);
    }

    // --- MONK / BARBARIAN WHIRLWIND ---
    else if (ability.type === 'monk_whirlwind_type') {
      setIsCasting(true);
      setAnimating(true);

      // Trigger whirlwind spinning weapon centered on caster
      setHitEffect({
        type: 'melee_whirlwind_effect',
        col: fighterPos.col,
        row: fighterPos.row,
        abilityId: ability.id
      });

      // After 500ms, apply 100% ATK damage to adjacent target monster
      setTimeout(() => {
        const dx = Math.abs(fighterPos.col - targetPos.col);
        const dy = Math.abs(fighterPos.row - targetPos.row);
        const isAdjacent = dx <= 1 && dy <= 1;

        if (isAdjacent) {
          setTargetShake(true);
          setTargetFlash(true);
          addFloatingText('-18', 'normal', '#ff3333', targetPos.row, targetPos.col);

          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 350);
        }
      }, 500);

      // Clear animation/visuals after 1500ms
      setTimeout(() => {
        setHitEffect(null);
        setAnimating(false);
        setIsCasting(false);
      }, 1500);
    }

    // --- MONK ASTRAL PROJECTION ---
    else if (ability.type === 'monk_astral_proj_type') {
      // Find empty tile within 2 tiles in any direction
      const destTiles = [];
      const occupied = new Set();
      occupied.add(`${targetPos.row}-${targetPos.col}`);
      minions.forEach(m => occupied.add(`${m.row}-${m.col}`));
      turrets.forEach(t => occupied.add(`${t.row}-${t.col}`));
      if (riftPortalActive && riftPortalPos) {
        occupied.add(`${riftPortalPos.row}-${riftPortalPos.col}`);
      }
      if (selectedFighterId === 'sage') {
        occupied.add('3-0'); occupied.add('0-3'); occupied.add('2-3');
      } else if (selectedFighterId === 'soldier') {
        occupied.add('0-1'); occupied.add('0-3');
      }

      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = fighterPos.row + dr;
          const nc = fighterPos.col + dc;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            if (!occupied.has(`${nr}-${nc}`)) {
              destTiles.push({ row: nr, col: nc });
            }
          }
        }
      }

      const destTile = destTiles.length > 0
        ? destTiles[Math.floor(Math.random() * destTiles.length)]
        : fighterPos;

      setAnimating(true);
      setAnimationPhase('astral_projection');
      setFighterPos(destTile);

      // Reaches the destination tile after 1.2s (1200ms)
      setTimeout(() => {
        setAnimationPhase('astral_projection_delay');
        setTargetShake(true);
        setTargetFlash(true);
        addFloatingText('-25', 'normal', '#21e6c1', targetPos.row, targetPos.col);
        setHitEffect({ type: 'astral_projection_strike' });

        // Strike ends after 300ms (1500ms total)
        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 300);
      }, 1200);

      // Animation concludes after delay (total 1600ms)
      setTimeout(() => {
        setAnimationPhase(null);
        setAnimating(false);
      }, 1600);
    }

    // --- MONK PUNCH ---
    else if (ability.type === 'monk_punch_type') {
      setAnimating(true);
      setAnimationPhase('step_adjacent');

      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'monk_punch_effect' });
        addFloatingText('-15', 'normal', '#ffb703', targetPos.row, targetPos.col);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 250);

        setTimeout(() => {
          setHitEffect(null);
          setAnimationPhase('return');
        }, 800);
      }, 250);

      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
      }, 1100);
    }

    // --- MONK FORCE PUNCH ---
    else if (ability.type === 'monk_force_punch_type') {
      setAnimating(true);
      setAnimationPhase('step_adjacent');

      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'monk_force_punch_effect' });
        addFloatingText('-18', 'normal', '#ffb703', targetPos.row, targetPos.col);

        // Push target back 1 tile
        const dx = targetPos.col - fighterPos.col;
        const dy = targetPos.row - fighterPos.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const pushX = Math.round(dx / dist) * 100;
          const pushY = Math.round(dy / dist) * 100;
          setTargetPushback(`translate(${pushX}%, ${pushY}%)`);
        }

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 250);

        setTimeout(() => {
          setHitEffect(null);
          setAnimationPhase('return');
        }, 800);
      }, 250);

      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
        setTargetPushback(null);
      }, 1100);
    }

    // --- MONK FLURRY ---
    else if (ability.type === 'monk_flurry_type') {
      setAnimating(true);
      setAnimationPhase('step_adjacent');

      // Punch 1
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'monk_punch_effect' });
        addFloatingText('-10', 'normal', '#ffb703', targetPos.row, targetPos.col);
        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 150);
      }, 250);

      // Punch 2
      setTimeout(() => {
        setHitEffect(null); // clear first to trigger transition again
        setTimeout(() => {
          setTargetShake(true);
          setTargetFlash(true);
          setHitEffect({ type: 'monk_punch_effect' });
          addFloatingText('-10', 'normal', '#ffb703', targetPos.row, targetPos.col);
          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 150);
        }, 30);
      }, 500);

      // Punch 3
      setTimeout(() => {
        setHitEffect(null);
        setTimeout(() => {
          setTargetShake(true);
          setTargetFlash(true);
          setHitEffect({ type: 'monk_punch_effect' });
          addFloatingText('-12', 'crit', '#ffb703', targetPos.row, targetPos.col);
          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 150);
        }, 30);
      }, 750);

      // Return
      setTimeout(() => {
        setHitEffect(null);
        setAnimationPhase('return');
      }, 1050);

      // End
      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
      }, 1300);
    }

    // --- MONK FORCE PUNCH FLURRY ---
    else if (ability.type === 'monk_fp_flurry_type') {
      setAnimating(true);
      setAnimationPhase('step_adjacent');

      // Determine where the Monk actually strikes from (strikeCol, strikeRow)
      const dxStart = targetPos.col - fighterPos.col;
      const dyStart = targetPos.row - fighterPos.row;
      const startDist = Math.sqrt(dxStart * dxStart + dyStart * dyStart);
      const isAlreadyAdjacent = Math.abs(dxStart) <= 1 && Math.abs(dyStart) <= 1;

      let strikeCol = fighterPos.col;
      let strikeRow = fighterPos.row;
      if (!isAlreadyAdjacent && startDist > 0) {
        const colStep = Math.round(dxStart / startDist);
        const rowStep = Math.round(dyStart / startDist);
        strikeCol = targetPos.col - colStep;
        strikeRow = targetPos.row - rowStep;
      }

      // Adjacency check for extra Goblins
      const isGoblin1Adjacent = Math.abs(2 - strikeCol) <= 1 && Math.abs(1 - strikeRow) <= 1;
      const isGoblin2Adjacent = Math.abs(3 - strikeCol) <= 1 && Math.abs(1 - strikeRow) <= 1;

      // Attack 1: Strike main target at targetPos (at 250ms)
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'monk_force_punch_effect' });
        addFloatingText('-18', 'normal', '#ffb703', targetPos.row, targetPos.col);

        // Push main target back 1 tile
        const dx = targetPos.col - fighterPos.col;
        const dy = targetPos.row - fighterPos.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const pushX = Math.round(dx / dist) * 100;
          const pushY = Math.round(dy / dist) * 100;
          setTargetPushback(`translate(${pushX}%, ${pushY}%)`);
        }

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 150);
      }, 250);

      // Attack 2: Strike extra Goblin at 2,1 (at 550ms)
      setTimeout(() => {
        setHitEffect(null); // Clear main punch icon

        if (isGoblin1Adjacent) {
          setMonkGoblin1Shake(true);
          setMonkGoblin1Flash(true);

          const midCol1 = (strikeCol + 2) / 2;
          const midRow1 = (strikeRow + 1) / 2;
          const leftPct = (midCol1 + 0.5) * 20;
          const topPct = (midRow1 + 0.5) * 20;
          const dx1 = 2 - strikeCol;
          const dy1 = 1 - strikeRow;
          const angle1 = Math.atan2(dy1, dx1) * (180 / Math.PI) + 90;

          setMonkExtraPunches([
            {
              id: Math.random(),
              left: `${leftPct}%`,
              top: `${topPct}%`,
              angle: angle1,
              icon: monk_force_punch
            }
          ]);
          addFloatingText('-18', 'normal', '#ffb703', 1, 2);
          setMonkGoblin1Push('translateY(-100%)');

          setTimeout(() => {
            setMonkGoblin1Shake(false);
            setMonkGoblin1Flash(false);
          }, 150);
        }
      }, 550);

      // Attack 3: Strike extra Goblin at 3,1 (at 850ms)
      setTimeout(() => {
        setMonkExtraPunches([]); // Clear Goblin 1 punch icon

        if (isGoblin2Adjacent) {
          setMonkGoblin2Shake(true);
          setMonkGoblin2Flash(true);

          const midCol2 = (strikeCol + 3) / 2;
          const midRow2 = (strikeRow + 1) / 2;
          const leftPct = (midCol2 + 0.5) * 20;
          const topPct = (midRow2 + 0.5) * 20;
          const dx2 = 3 - strikeCol;
          const dy2 = 1 - strikeRow;
          const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI) + 90;

          setMonkExtraPunches([
            {
              id: Math.random(),
              left: `${leftPct}%`,
              top: `${topPct}%`,
              angle: angle2,
              icon: monk_force_punch
            }
          ]);
          addFloatingText('-18', 'normal', '#ffb703', 1, 3);
          setMonkGoblin2Push('translateY(-100%)');

          setTimeout(() => {
            setMonkGoblin2Shake(false);
            setMonkGoblin2Flash(false);
          }, 150);
        }
      }, 850);

      // Return starts (at 1150ms)
      setTimeout(() => {
        setMonkExtraPunches([]);
        setAnimationPhase('return');
      }, 1150);

      // Animation complete (at 1400ms)
      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
        setTargetPushback(null);
        setMonkGoblin1Push(null);
        setMonkGoblin2Push(null);
      }, 1400);
    }

    // --- MONK TWIN FINGER AUTHORITY ---
    else if (ability.type === 'monk_twin_finger_type') {
      setAnimating(true);

      // Calculate swipe direction from Monk to Target (front to back)
      const dx = targetPos.col - fighterPos.col;
      const dy = targetPos.row - fighterPos.row;
      let dir = 'left'; // default
      if (Math.abs(dx) >= Math.abs(dy)) {
        dir = dx > 0 ? 'left' : 'right'; // if target is on right, swipe to left (front to back)
      } else {
        dir = dy > 0 ? 'up' : 'down'; // if target is below, swipe to up (front to back)
      }
      setMonkTwinGlow({ direction: dir });
      setTimeout(() => setMonkTwinGlow(null), 600);

      const options = [
        { row: fighterPos.row, col: fighterPos.col + 1 },
        { row: fighterPos.row, col: fighterPos.col - 1 },
        { row: fighterPos.row + 1, col: fighterPos.col },
        { row: fighterPos.row - 1, col: fighterPos.col }
      ];
      const validOptions = options.filter(opt => opt.row >= 0 && opt.row < GRID_SIZE && opt.col >= 0 && opt.col < GRID_SIZE);

      let bestAdjacent = targetPos;
      let minD = Infinity;
      validOptions.forEach(opt => {
        const dr = targetPos.row - opt.row;
        const dc = targetPos.col - opt.col;
        const d = dr * dr + dc * dc;
        if (d < minD) {
          minD = d;
          bestAdjacent = opt;
        }
      });

      const isAlreadyAdjacent = targetPos.row === bestAdjacent.row && targetPos.col === bestAdjacent.col;

      if (!isAlreadyAdjacent) {
        setTargetPos(bestAdjacent);
      }

      const strikeDelay = isAlreadyAdjacent ? 0 : 350;

      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'monk_twin_finger_effect' });
        setTargetStunned(true);
        addFloatingText('-20', 'normal', '#ffb703', bestAdjacent.row, bestAdjacent.col);

        setTimeout(() => {
          addFloatingText('STUNNED!', 'normal', '#ffe600', bestAdjacent.row, bestAdjacent.col);
        }, 150);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
          setAnimating(false);
        }, 400);

        setTimeout(() => {
          setTargetStunned(false);
        }, 3000);
      }, strikeDelay);
    }

    // --- MUMMY INDUCE FEAR ---
    else if (ability.type === 'induce_fear') {
      setAnimating(true);
      setInduceFearActive(true);

      // Floating text on caster (Induce Fear!)
      addFloatingText('INDUCE FEAR!', 'crit', '#8e2de2', fighterPos.row, fighterPos.col);

      // Hit targets (at 500ms)
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);

        // Add fear effect icon to target fighter
        setTargetFeared(true);
        setFearFading(false);
        setFearEndTime(Date.now() + 8000); // 8 seconds long duration

        addFloatingText('FEARED!', 'normal', '#8e2de2', targetPos.row, targetPos.col);

        if (selectedUnitType === 'monster') {
          setExtraRangerShake(true);
          setExtraRangerFlash(true);
          setExtraRangerFeared(true);
          setExtraRangerFearFading(false);
          setExtraRangerFearEndTime(Date.now() + 8000);
          addFloatingText('FEARED!', 'normal', '#8e2de2', rangerPos.row, rangerPos.col);

          setTimeout(() => {
            setExtraRangerShake(false);
            setExtraRangerFlash(false);
          }, 300);
        }

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 300);
      }, 500);

      // Clear board overlay after 1.5 seconds
      setTimeout(() => {
        setInduceFearActive(false);
      }, 1500);

      // Complete animation after 1.6 seconds
      setTimeout(() => {
        setAnimating(false);
      }, 1600);
    }

    // --- SHADE DESPAIR ---
    else if (ability.type === 'despair' || ability.type === 'dispair') {
      setAnimating(true);
      setDespairActive(true);

      // Floating text on caster (Despair!)
      addFloatingText('DESPAIR!', 'crit', '#6a3093', fighterPos.row, fighterPos.col);

      // Hit targets (at 500ms)
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);

        addFloatingText('-30 Stamina', 'normal', '#e65c00', targetPos.row, targetPos.col);
        addFloatingText('-20 Resolve', 'normal', '#6a3093', targetPos.row - 0.5, targetPos.col);

        if (selectedUnitType === 'monster') {
          setExtraRangerShake(true);
          setExtraRangerFlash(true);
          addFloatingText('-30 Stamina', 'normal', '#e65c00', rangerPos.row, rangerPos.col);
          addFloatingText('-20 Resolve', 'normal', '#6a3093', rangerPos.row - 0.5, rangerPos.col);

          setTimeout(() => {
            setExtraRangerShake(false);
            setExtraRangerFlash(false);
          }, 300);
        }

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 300);
      }, 500);

      // Clear board overlay after 1.5 seconds
      setTimeout(() => {
        setDespairActive(false);
      }, 1500);

      // Complete animation after 1.6 seconds
      setTimeout(() => {
        setAnimating(false);
      }, 1600);
    }

    // --- MUMMY ENERGY DRAIN ---
    else if (ability.type === 'energy_drain') {
      const dx = Math.abs(targetPos.col - fighterPos.col);
      const dy = Math.abs(targetPos.row - fighterPos.row);
      const distance = Math.max(dx, dy);

      if (distance > 3) {
        addFloatingText('OUT OF RANGE!', 'normal', '#ff4d4d', fighterPos.row, fighterPos.col);
        return;
      }

      setAnimating(true);
      setActiveBeam('energy_drain_beam'); // triggers the pink beam render
      setTargetEnergyDrainActive(true); // show instance-icon immediately as beam starts

      // Floating text on caster (Energy Drain)
      addFloatingText('ENERGY DRAIN', 'normal', '#ff00ff', fighterPos.row, fighterPos.col);

      // Beam completes and hits target (at 1500ms)
      setTimeout(() => {
        setActiveBeam(null);
        setTargetEnergyDrainActive(false); // remove instance icon when beam completes
        setTargetShake(true);
        setTargetFlash(true);

        addFloatingText('-15', 'normal', '#ff00ff', targetPos.row, targetPos.col);
        addFloatingText('+15', 'normal', '#2ec4b6', fighterPos.row, fighterPos.col);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 250);
      }, 1500);

      // Complete animation at 1800ms
      setTimeout(() => {
        setAnimating(false);
      }, 1800);
    }

    // --- VAMPIRE CRIMSON SIGHT ---
    else if (ability.type === 'crimson_sight_type') {
      setAnimating(true);
      addFloatingText('CRIMSON SIGHT', 'normal', '#ff3333', fighterPos.row, fighterPos.col);

      setVampireCrimsonSightActive(true);
      setVampireCrimsonSightFading(false);
      setVampireCrimsonSightEndTime(Date.now() + 12000); // 12 seconds long duration

      setTimeout(() => {
        setAnimating(false);
      }, 500);
    }

    // --- VAMPIRE BAT FLY ---
    else if (ability.type === 'bat_fly_type') {
      setAnimating(true);
      addFloatingText('BAT FLY', 'normal', '#ffb703', fighterPos.row, fighterPos.col);

      // Show the bat fly instance icon on the Vampire's portrait
      setVampireBatFlyActive(true);
      setVampireBatFlyFading(false);

      // Pick a random backline row different from current row
      const rows = Array.from({ length: GRID_SIZE }, (_, i) => i).filter(r => r !== fighterPos.row);
      const destRow = rows.length > 0 ? rows[Math.floor(Math.random() * rows.length)] : 2;

      // After 600ms, start fading out instance icon and fade away Vampire's portrait
      setTimeout(() => {
        setVampireBatFlyFading(true);
        setVampireHidden(true);

        setBatFlyDestRow(destRow);

        // Turn on the bats overlay at start tile
        setBatFlyMovementActive(true);
        setBatFlyProgress(0);
      }, 600);

      // At 900ms (when instance icon has faded), start the flight animation
      setTimeout(() => {
        setVampireBatFlyActive(false);
        setVampireBatFlyFading(false);

        const duration = 1000; // 1 second flight duration
        const startTime = Date.now();

        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(1, elapsed / duration);
          setBatFlyProgress(t);

          if (t >= 1) {
            clearInterval(interval);
            // Arrived at destination!
            setFighterPos({ row: destRow, col: 0 });
            // Hide bats
            setBatFlyMovementActive(false);
            setBatFlyProgress(0);
            // Fade portrait back in
            setVampireHidden(false);

            // Complete the animation state after portrait has faded back in
            setTimeout(() => {
              setAnimating(false);
            }, 300);
          }
        }, 16);
      }, 900);
    }

    // --- SPHINX POLYMORPH ---
    else if (ability.type === 'polymorph_type') {
      setAnimationPhase('cast_spell');
      setAnimating(true);
      setTimeout(() => {
        setHitEffect({ type: 'polymorph_impact' });
        addFloatingText('POLYMORPHED!', 'crit', '#9b59b6', targetPosRef.current.row, targetPosRef.current.col);
        addFloatingText('15 HP', 'normal', '#2ecc71', targetPosRef.current.row, targetPosRef.current.col);

        if (isFighterSource) {
          setMonsterPolymorphed(true);
          setMonsterPolymorphEndTime(Date.now() + 16000);
          if (monsterFrogIntervalRef.current) clearInterval(monsterFrogIntervalRef.current);
          monsterFrogIntervalRef.current = setInterval(() => {
            addFloatingText('hop!', 'normal', '#2ecc71', targetPosRef.current.row, targetPosRef.current.col);
          }, 2000);
        } else {
          setFighterPolymorphed(true);
          setFighterPolymorphEndTime(Date.now() + 16000);
          if (fighterFrogIntervalRef.current) clearInterval(fighterFrogIntervalRef.current);
          fighterFrogIntervalRef.current = setInterval(() => {
            addFloatingText('hop!', 'normal', '#2ecc71', targetPosRef.current.row, targetPosRef.current.col);
          }, 2000);
        }

        // Clear target buffs
        setDefensiveStanceActive(false);
        setBerserkerActive(false);
        setAstralModeActive(false);
        setThirdEyeTriggered(false);
        setInspireActive(false);
        setInnerFireActive(false);

        setTimeout(() => setHitEffect(null), 500);
        setAnimationPhase('return');
        setTimeout(() => { setAnimationPhase(null); setAnimating(false); }, 250);
      }, 500);
    }
    // --- SPHINX HEX ---
    else if (ability.type === 'hex_type') {
      setAnimationPhase('cast_spell');
      setAnimating(true);
      setHexCastExplosion({ row: fighterPos.row, col: fighterPos.col });
      setTimeout(() => {
        setHexCastExplosion(null);
        setHitEffect({ type: 'hex_overlay' });
        addFloatingText('HEXED!', 'crit', '#ff00ff', targetPosRef.current.row, targetPosRef.current.col);

        if (isFighterSource) {
          setMonsterHexed(true);
          setMonsterHexEndTime(Date.now() + 16000);
        } else {
          setFighterHexed(true);
          setFighterHexEndTime(Date.now() + 16000);
        }

        setTimeout(() => setHitEffect(null), 1500);
        setAnimationPhase('return');
        setTimeout(() => { setAnimationPhase(null); setAnimating(false); }, 250);
      }, 500);
    }

    // --- SKELETON REASSEMBLY PASSIVE ---
    else if (ability.type === 'reassembly_type') {
      triggerSkeletonDeath();
    }

    // --- DRAGON BREATH ---
    else if (ability.type === 'blue_dragon_breath_type') {
      setIsCasting(true);
      setActiveBeam('blue_dragon_breath');
      setBlueDragonBreathActive(true);

      const targetR = targetPosRef.current.row;
      const targetC = targetPosRef.current.col;

      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          setHitEffect({ type: 'dragon_fire_breath' });
          setTargetShake(true);
          setTargetFlash(true);
          addFloatingText('-45', 'crit', '#00ffff', targetR, targetC);
        }, 500 * i);
      }

      setTimeout(() => {
        setActiveBeam(null);
        setBlueDragonBreathActive(false);
        setHitEffect(null);
        setAnimating(false);
        setIsCasting(false);
      }, 3000);
    }

    // --- DRAGON WHIRLWIND ---
    else if (ability.type === 'dragon_whirlwind_type') {
      setIsCasting(true);
      const isDragonFighter = selectedUnitType === 'monster' && selectedMonsterId === 'dragon';
      const wCol = isDragonFighter ? fighterPos.col : targetPos.col;
      const wRow = isDragonFighter ? fighterPos.row : targetPos.row;
      const wHuge = isDragonFighter ? isFighterHuge : isTargetHuge;
      const wLarge = isDragonFighter ? isFighterLarge : isTargetLarge;

      const leftCol = getUnitLeftTileCol(wCol, wHuge, wLarge);
      const topRow = getUnitTopTileRow(wRow, wHuge, wLarge);
      const size = getUnitSizeFactor(wHuge, wLarge);

      setHitEffect({
        type: 'dragon_whirlwind_effect',
        col: leftCol + (size - 1) / 2,
        row: topRow + (size - 1) / 2
      });
      setTimeout(() => {
        // Push back logic: source is the Dragon (caster)
        const dCol = isDragonFighter ? fighterPos.col : targetPos.col;
        const dRow = isDragonFighter ? fighterPos.row : targetPos.row;
        const dHuge = isDragonFighter ? isFighterHuge : isTargetHuge;
        const dLarge = isDragonFighter ? isFighterLarge : isTargetLarge;

        const fCol = getUnitVisualCol(dCol, dHuge, dLarge);
        const fRow = getUnitVisualRow(dRow, dHuge, dLarge);

        const pushUnit = (pos, setPos, isHugeTarget, isLargeTarget) => {
          const tCol = getUnitVisualCol(pos.col, isHugeTarget, isLargeTarget);
          const tRow = getUnitVisualRow(pos.row, isHugeTarget, isLargeTarget);
          const dx = tCol - fCol;
          const dy = tRow - fRow;
          const dist = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance
          // 3 tiles from center is exactly 2 tiles from the outer edge of a 3x3 dragon
          if (dist <= 3 && dist > 0) {
            const angle = Math.atan2(dy, dx);
            let newCol = pos.col + Math.round(Math.cos(angle));
            let newRow = pos.row + Math.round(Math.sin(angle));
            // keep in bounds
            newCol = Math.max(0, Math.min(9, newCol));
            newRow = Math.max(0, Math.min(9, newRow));
            setPos({ row: newRow, col: newCol });
          }
        };

        if (isDragonFighter) {
          pushUnit(targetPos, setTargetPos, isTargetHuge, isTargetLarge);
          pushUnit(barbarianPos, setBarbarianPos, false, false);
        } else {
          pushUnit(fighterPos, setFighterPos, isFighterHuge, isFighterLarge);
        }

        setHitEffect(null);
        setIsCasting(false);
      }, 1500);
    }

    // --- BOMBARD ---
    else if (ability.type === 'bombard_type') {
      setIsCasting(true);

      const bombardCenter = { ...targetPos };

      // Calculate all possible grid cells within the 3x3 area centered on targetPos
      const candidates = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const c = bombardCenter.col + dx;
          const r = bombardCenter.row + dy;
          if (c >= 0 && c <= 5 && r >= 0 && r <= 5) {
            candidates.push({ col: c, row: r });
          }
        }
      }

      // Select 3 distinct random tiles from the candidates
      const shuffled = [...candidates].sort(() => 0.5 - Math.random());
      const strikeTile1 = shuffled[0] || bombardCenter;
      const strikeTile2 = shuffled[1] || strikeTile1;
      const strikeTile3 = shuffled[2] || strikeTile2;

      // Generate random beams for each of the 3 barrages
      const generateRandomBeams = () => {
        return [...Array(10)].map((_, i) => {
          const isSet2 = i >= 5;
          const baseDelay = isSet2 ? 0.35 : 0.0;
          // Random delay offset within the set
          const delay = parseFloat((baseDelay + Math.random() * 0.35).toFixed(3));

          // Random width between 7px and 19px
          const width = Math.floor(Math.random() * 13) + 7;

          // Random offsets within target cell bounds (-30% to +30%)
          const left = Math.floor(Math.random() * 61) - 30;
          const top = Math.floor(Math.random() * 61) - 30;

          const glowColor = Math.random() > 0.5 ? '#00ffff' : '#00bfff';

          return { delay, width, left, top, glowColor };
        });
      };

      const barrage1Beams = generateRandomBeams();
      const barrage2Beams = generateRandomBeams();
      const barrage3Beams = generateRandomBeams();

      setHitEffect({
        type: 'bombard_emission',
        col: getUnitVisualCol(fighterPos.col, isFighterHuge, isFighterLarge),
        row: getUnitVisualRow(fighterPos.row, isFighterHuge, isFighterLarge),
        targetCol: strikeTile1.col,
        targetRow: strikeTile1.row,
        adjacentCol1: strikeTile2.col,
        adjacentRow1: strikeTile2.row,
        adjacentCol2: strikeTile3.col,
        adjacentRow2: strikeTile3.row
      });

      setBombardWarnings({
        tiles: [
          { col: strikeTile1.col, row: strikeTile1.row, key: 'main' },
          { col: strikeTile2.col, row: strikeTile2.row, key: 'adj1' },
          { col: strikeTile3.col, row: strikeTile3.row, key: 'adj2' }
        ]
      });

      // Emission phase
      setTimeout(() => {
        // NOTE: In actual combat logic, the bombardment strike delay MUST be tied to exactly 1 full combat round.
        // For Sandbox visualization purposes, we are simulating this round delay with a fixed 1.5s timeout.
        setHitEffect(null);
        setIsCasting(false);

        setTimeout(() => {
          setBombardWarnings(null); // Clear shimmers at the beginning of the bombardment strike stage

          // Bombardment strike phase
          setHitEffect({
            type: 'bombard_strike',
            col: getUnitVisualCol(strikeTile1.col, false, false),
            row: getUnitVisualRow(strikeTile1.row, false, false),
            adjacentCol1: getUnitVisualCol(strikeTile2.col, false, false),
            adjacentRow1: getUnitVisualRow(strikeTile2.row, false, false),
            adjacentCol2: getUnitVisualCol(strikeTile3.col, false, false),
            adjacentRow2: getUnitVisualRow(strikeTile3.row, false, false),
            center: bombardCenter,
            adjacent1: strikeTile2,
            adjacent2: strikeTile3,
            barrage1Beams,
            barrage2Beams,
            barrage3Beams
          });

          // Damage logic after strike animation
          setTimeout(() => {
            const overlapsTile = (pos, isHuge, isLarge, checkCol, checkRow) => {
              const left = getUnitLeftTileCol(pos.col, isHuge, isLarge);
              const top = getUnitTopTileRow(pos.row, isHuge, isLarge);
              const size = getUnitSizeFactor(isHuge, isLarge);
              return checkCol >= left && checkCol < left + size &&
                checkRow >= top && checkRow < top + size;
            };

            const checkHit = (pos, isHuge, isLarge) => {
              return overlapsTile(pos, isHuge, isLarge, strikeTile1.col, strikeTile1.row) ||
                overlapsTile(pos, isHuge, isLarge, strikeTile2.col, strikeTile2.row) ||
                overlapsTile(pos, isHuge, isLarge, strikeTile3.col, strikeTile3.row);
            };

            if (checkHit(targetPos, isTargetHuge, isTargetLarge)) {
              setTargetShake(true);
              setTargetFlash(true);
              addFloatingText('-45', 'damage', '#ff3333', targetPos.row, targetPos.col);
              setTimeout(() => {
                setTargetShake(false);
                setTargetFlash(false);
              }, 500);
            }
            if (checkHit(barbarianPos, false, false)) {
              addFloatingText('-45', 'damage', '#ff3333', barbarianPos.row, barbarianPos.col);
            }
          }, 1000); // Apply damage after 1.0s (midway through bombardment waves)

          // Cleanup hit effect after all animations finish
          setTimeout(() => {
            setHitEffect(null);
          }, 2000); // 2.0s to allow all slow splash animations to complete

        }, 1500); // 1.5s delay
      }, 1000); // 1s emission
    }

    // --- DRAGON DISPELL ---
    else if (ability.type === 'dispell_type') {
      setIsCasting(true);

      // Step 1: Sage triggers Circle of Protection and applies buffs to units in radius (Sage & Barbarian)
      setDragonDispellSageCopActive(true);
      addFloatingText('Circle of Protection!', 'normal', '#00bfff', sagePos.row, sagePos.col);
      addFloatingText('+Shielded', 'heal', '#00ffcc', barbarianPos.row, barbarianPos.col);
      addFloatingText('+COP Buff', 'heal', '#00ffcc', barbarianPos.row, barbarianPos.col);
      addFloatingText('+Shielded', 'heal', '#00ffcc', sagePos.row, sagePos.col);

      // Step 2: After 1.5 seconds, Dragon triggers the Dispel grid overlay wave
      setTimeout(() => {
        setDragonDispellWaveActive(true);

        // No shake/buck back on dispel execution per requirements

        // Calculate center for dragon floating text
        const dragonVisualCenterRow = getUnitVisualRow(fighterPos.row, isFighterHuge, isFighterLarge);
        const dragonVisualCenterCol = getUnitVisualCol(fighterPos.col, isFighterHuge, isFighterLarge);
        addFloatingText('DISPEL!', 'crit', '#9b5de5', dragonVisualCenterRow + 1, dragonVisualCenterCol + 1);

        // Immediately cancel COP and remove all buffs/icons from the Sage and Barbarian targets
        setDragonDispellSageCopActive(false);

        // Show dispelled labels and hit shakes on affected units
        setSageTargetShake(true);
        setSageTargetFlash(true);
        addFloatingText('Dispelled!', 'normal', '#ff3333', sagePos.row, sagePos.col);
        addFloatingText('Buffs Removed!', 'normal', '#ff3333', sagePos.row, sagePos.col);

        setTargetShake(true);
        setTargetFlash(true);
        addFloatingText('Buffs Dispelled!', 'normal', '#ff3333', barbarianPos.row, barbarianPos.col);

        setTimeout(() => {
          setSageTargetShake(false);
          setSageTargetFlash(false);
          setTargetShake(false);
          setTargetFlash(false);
        }, 500);

        // Step 3: Cleanup dispel wave and cast state after the wave completes (1.5s)
        setTimeout(() => {
          setDragonDispellWaveActive(false);
          setIsCasting(false);
        }, 1500);

      }, 1500);
    }

    // --- OGRE STOMP ---
    else if (ability.type === 'stomp') {
      setAnimating(true);
      setAnimationPhase('stomp_animation');
      addFloatingText('STOMP!', 'normal', '#ffdd57', fighterPos.row, fighterPos.col);

      // Slam down lands at ~450ms
      setTimeout(() => {
        // Shockwave effect
        setHitEffect({ type: 'stomp_shockwave', row: fighterPos.row, col: fighterPos.col });

        // Damage & Stun adjacent units
        const dx = Math.abs(targetPos.col - fighterPos.col);
        const dy = Math.abs(targetPos.row - fighterPos.row);
        const isTargetAdjacent = dx <= 1 && dy <= 1;

        if (isTargetAdjacent) {
          setTargetShake(true);
          setTargetFlash(true);
          setTargetStunned(true);
          addFloatingText('-25', 'crit', '#ff7700', targetPos.row, targetPos.col);
          addFloatingText('STUNNED!', 'normal', '#ffe600', targetPos.row, targetPos.col);

          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 300);

          setTimeout(() => {
            setTargetStunned(false);
          }, 6000);
        }

        // Additional friendly crew targets check (since Ogre is a monster)
        if (selectedUnitType === 'monster') {
          // Check Extra Ranger Target at dynamic position
          const isRangerAdjacent = Math.abs(rangerPos.row - fighterPos.row) <= 1 && Math.abs(rangerPos.col - fighterPos.col) <= 1;
          if (isRangerAdjacent) {
            setExtraRangerShake(true);
            setExtraRangerFlash(true);
            setExtraRangerStunned(true);
            addFloatingText('-25', 'crit', '#ff7700', rangerPos.row, rangerPos.col);
            addFloatingText('STUNNED!', 'normal', '#ffe600', rangerPos.row, rangerPos.col);

            setTimeout(() => {
              setExtraRangerShake(false);
              setExtraRangerFlash(false);
            }, 300);

            setTimeout(() => {
              setExtraRangerStunned(false);
            }, 6000);
          }
        }

        setTimeout(() => {
          setHitEffect(null);
        }, 600);
      }, 450);

      // Reset animation phase
      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
      }, 1000);
    }

    // --- BARBARIAN CLEAVE ---
    else if (ability.type === 'barbarian_cleave') {
      setAnimating(true);
      setAnimationPhase('step_adjacent');

      // 1. Trigger weapon slash overlay (at 250ms when step_adjacent arrives)
      setTimeout(() => {
        setHitEffect({ type: 'barbarian_cleave_effect' });
      }, 250);

      // 2. Stuck impact peak (at 600ms: 250ms start + 350ms swing to mid-arc)
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setTargetBleeding(true);
        setBleedFading(false);
        setBleedEndTime(Date.now() + 4000);
        addFloatingText('-22', 'normal', '#ff3333', targetPos.row, targetPos.col);
      }, 600);

      // 3. Clear target shake/flash (at 950ms, 350ms duration)
      setTimeout(() => {
        setTargetShake(false);
        setTargetFlash(false);
      }, 950);

      // 4. Clear weapon overlay and return (at 1100ms)
      setTimeout(() => {
        setHitEffect(null);
        setAnimationPhase('return');
      }, 1100);

      // 5. Return completes (at 1350ms)
      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
      }, 1350);

      // 6. Bleed effect ends (after 4000ms duration, ending at 4600ms total)
      setTimeout(() => {
        setBleedFading(true);
        setTimeout(() => {
          setTargetBleeding(false);
          setBleedFading(false);
          setBleedEndTime(null);
        }, 300);
      }, 4600);

      // 7. Bleed ticks (every 500ms starting at 1100ms, ending at 4600ms: 8 ticks)
      for (let i = 1; i <= 8; i++) {
        setTimeout(() => {
          setTargetShake(true);
          setTargetFlash(true);
          addFloatingText('-3', 'normal', '#e63946', targetPos.row, targetPos.col);
          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
          }, 150);
        }, 600 + i * 500);
      }
    }

    // --- BARBARIAN BERSERKER ---
    else if (ability.type === 'barbarian_berserker') {
      setAnimating(true);
      setBerserkerActive(true);
      setBerserkerFading(false);
      setBerserkerEndTime(Date.now() + 8000);

      setTimeout(() => {
        setAnimating(false);
      }, 1000);

      setTimeout(() => {
        setBerserkerFading(true);
        setTimeout(() => {
          setBerserkerActive(false);
          setBerserkerFading(false);
          setBerserkerEndTime(null);
        }, 300);
      }, 8000);
    }

    // --- BARBARIAN LEAP ATTACK ---
    else if (ability.type === 'barbarian_leap') {
      setAnimating(true);
      setAnimationPhase('leap_landing');

      const dx = targetPos.col - fighterPos.col;
      const dy = targetPos.row - fighterPos.row;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let adjCol = fighterPos.col;
      let adjRow = fighterPos.row;
      if (dist > 0) {
        const colStep = Math.round(dx / dist);
        const rowStep = Math.round(dy / dist);
        adjCol = targetPos.col - colStep;
        adjRow = targetPos.row - rowStep;
      }

      // 1. Connection (at 600ms when leap landing completes)
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setTargetStunned(true);

        // Push target back 1 tile in direction of attack
        if (dist > 0) {
          const pushX = Math.round(dx / dist) * 100;
          const pushY = Math.round(dy / dist) * 100;
          setTargetPushback(`translate(${pushX}%, ${pushY}%)`);
        }

        addFloatingText('-30', 'crit', '#ffaa00', targetPos.row, targetPos.col);
      }, 600);

      // 2. Clear target shake/flash (at 950ms)
      setTimeout(() => {
        setTargetShake(false);
        setTargetFlash(false);
      }, 950);

      // 3. Clear lunge position, return to adjacent, and reset target position (at 1400ms)
      setTimeout(() => {
        setAnimationPhase('return');
        setTargetPushback(null);
        setFighterPos({ row: adjRow, col: adjCol });
      }, 1400);

      // 4. Return completes, end animation (at 1650ms)
      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
      }, 1650);

      // 5. Stun effect ends (at 6600ms total, giving 6.0 seconds of stun starting at 600ms)
      setTimeout(() => {
        setTargetStunned(false);
      }, 6600);
    }

    // --- WIZARD FIREBALL ---
    else if (ability.type === 'fireball') {
      setAnimating(true);
      // CSS orb projectile
      setProjectile({
        x: fighterPos.col * 20,
        y: fighterPos.row * 20,
        isFireball: true
      });
      // Fly
      setTimeout(() => {
        setProjectile(prev => prev ? { ...prev, x: targetPos.col * 20, y: targetPos.row * 20 } : null);
      }, 30);
      // Impact
      setTimeout(() => {
        setProjectile(null);
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'fire_exp' });
        addFloatingText('-28', 'crit', '#ff5400', targetPos.row, targetPos.col);
        // Expanding fire ring
        setFireballExplosion({ row: targetPos.row, col: targetPos.col });
        setTimeout(() => setFireballExplosion(null), 700);

        // Blast radius damage to adjacent extra Goblins
        const isGoblin1Main = targetPos.row === 1 && targetPos.col === 4;
        const isGoblin2Main = targetPos.row === 3 && targetPos.col === 4;

        if (!isGoblin1Main && Math.abs(1 - targetPos.row) <= 1 && Math.abs(4 - targetPos.col) <= 1) {
          setTimeout(() => {
            setExtraGoblin1Shake(true);
            setExtraGoblin1Flash(true);
            addFloatingText('-12', 'normal', '#ff5400', 1, 4);
            setTimeout(() => {
              setExtraGoblin1Shake(false);
              setExtraGoblin1Flash(false);
            }, 250);
          }, 300);
        }

        if (!isGoblin2Main && Math.abs(3 - targetPos.row) <= 1 && Math.abs(4 - targetPos.col) <= 1) {
          setTimeout(() => {
            setExtraGoblin2Shake(true);
            setExtraGoblin2Flash(true);
            addFloatingText('-12', 'normal', '#ff5400', 3, 4);
            setTimeout(() => {
              setExtraGoblin2Shake(false);
              setExtraGoblin2Flash(false);
            }, 250);
          }, 300);
        }

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 350);
        setAnimating(false);
      }, 430);
    }

    // --- WIZARD ICE BLAST ---
    else if (ability.type === 'ice_blast_proj') {
      setAnimating(true);
      // CSS orb projectile
      setProjectile({
        x: fighterPos.col * 20,
        y: fighterPos.row * 20,
        isIceBlast: true
      });
      // Fly
      setTimeout(() => {
        setProjectile(prev => prev ? { ...prev, x: targetPos.col * 20, y: targetPos.row * 20 } : null);
      }, 30);
      // Impact
      setTimeout(() => {
        setProjectile(null);
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'ice_burst' });
        addFloatingText('-22', 'normal', '#00bfff', targetPos.row, targetPos.col);
        // Frozen overlay on portrait & effect icon
        applyFreeze(3000);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 350);
        setAnimating(false);
      }, 430);
    }

    // --- PROJECTILE ATTACKS (generic: axe throw, shadow bolt, rifle, etc.) ---
    else if (ability.type === 'projectile' || ability.type === 'projectile_arc') {
      setAnimating(true);

      const pIcon = ability.projectileIcon || ability.icon;
      setProjectile({
        x: fighterPos.col * 20,
        y: fighterPos.row * 20,
        icon: pIcon
      });

      // Fly to target
      setTimeout(() => {
        setProjectile(prev => prev ? {
          ...prev,
          x: targetPos.col * 20,
          y: targetPos.row * 20
        } : null);
      }, 30);

      // Hit target
      setTimeout(() => {
        setProjectile(null);
        setTargetShake(true);
        setTargetFlash(true);

        let hitType = 'slash';
        let dmg = '-16';
        let color = '#ff4d4d';

        if (ability.id === 'throw_grenade') {
          hitType = 'fire_exp';
          dmg = '-20';
          color = '#ff5400';
        } else if (ability.id === 'shadow_bolt') {
          hitType = 'shadow';
          dmg = '-19';
          color = '#7209b7';
        } else if (ability.id === 'shoot_rifle') {
          hitType = 'arrow_hit';
          dmg = '-22';
          color = '#ffe600';
        } else if (ability.id === 'barbarian_axe_throw') {
          hitType = null;
          dmg = '-20';
          color = '#ff5400';
        }

        setHitEffect({ type: hitType });
        addFloatingText(dmg, 'normal', color, targetPos.row, targetPos.col);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 300);

        setAnimating(false);
      }, 430);
    }

    // --- WITCH SHADOW CURSE ---
    else if (ability.type === 'shadow_curse_type') {
      setAnimationPhase('cast_spell');
      setAnimating(true);
      setTimeout(() => {
        setHitEffect({ type: 'shadow_curse_rings' });
        addFloatingText('SHADOW CURSE!', 'crit', '#9b59b6', targetPosRef.current.row, targetPosRef.current.col);
        setTimeout(() => setHitEffect(null), 1500);
        setAnimationPhase('return');
        setTimeout(() => { setAnimationPhase(null); setAnimating(false); }, 250);
      }, 500);
    }
    // --- WITCH SPIDERWEB ---
    else if (ability.type === 'spiderweb_type') {
      setAnimationPhase('cast_spell');
      setAnimating(true);
      setTimeout(() => {
        setHitEffect({ type: 'poison_burst' });
        addFloatingText('ENSNARED!', 'crit', '#2ecc71', targetPosRef.current.row, targetPosRef.current.col);
        setTimeout(() => setHitEffect(null), 800);
        setAnimationPhase('return');
        setTimeout(() => { setAnimationPhase(null); setAnimating(false); }, 250);
      }, 500);
    }
    // --- WITCH SUMMON SPIDERS ---
    else if (ability.type === 'summon_spiders_type') {
      setAnimationPhase('cast_spell');
      setAnimating(true);
      addFloatingText('SUMMON SPIDERS!', 'crit', '#2ecc71', fighterPos.row, fighterPos.col);

      const isFighterSource = selectedUnitType === 'fighter';
      const originalCol = isFighterSource ? fighterPos.col : targetPos.col;
      const spawnerRow = isFighterSource ? fighterPos.row : targetPos.row;

      // Determine facing direction: player fighter faces right, monster target faces left
      const facing = isFighterSource ? 'right' : 'left';
      const wasAtBoundary = (facing === 'left' && originalCol === GRID_SIZE - 1) || (facing === 'right' && originalCol === 0);

      // 1. Move Witch 1 tile off the backline if they are on it
      if (facing === 'left') {
        if (originalCol === GRID_SIZE - 1) {
          if (isFighterSource) {
            setFighterPos(prev => ({ ...prev, col: GRID_SIZE - 2 }));
          } else {
            setTargetPos(prev => ({ ...prev, col: GRID_SIZE - 2 }));
          }
        }
      } else {
        if (originalCol === 0) {
          if (isFighterSource) {
            setFighterPos(prev => ({ ...prev, col: 1 }));
          } else {
            setTargetPos(prev => ({ ...prev, col: 1 }));
          }
        }
      }

      // 2. Spawn the spawner icon at the column behind the Witch
      let finalWitchCol = originalCol;
      if (facing === 'left') {
        if (originalCol === GRID_SIZE - 1) {
          finalWitchCol = GRID_SIZE - 2;
        }
      } else {
        if (originalCol === 0) {
          finalWitchCol = 1;
        }
      }

      let spawnerCol = facing === 'left' ? finalWitchCol + 1 : finalWitchCol - 1;
      spawnerCol = Math.max(0, Math.min(GRID_SIZE - 1, spawnerCol));

      const spawnerId = `spawner_${Date.now()}`;
      const spawnerObj = {
        id: spawnerId,
        x: spawnerCol * 20,
        y: spawnerRow * 20,
        isSpawner: true,
        icon: summon_spiders_icon,
        dead: false
      };

      setTimeout(() => {
        setProjectiles(prev => [...prev, spawnerObj]);

        // Staggered spawning of 5 spiders
        let spawnCount = 0;
        const maxSpiders = 5;

        const spawnInterval = setInterval(() => {
          if (spawnCount >= maxSpiders) {
            clearInterval(spawnInterval);
            // Remove the spawner icon
            setProjectiles(prev => prev.filter(p => p.id !== spawnerId));
            
            // Witch moves back to her original column
            if (wasAtBoundary) {
              if (isFighterSource) {
                setFighterPos(prev => ({ ...prev, col: originalCol }));
              } else {
                setTargetPos(prev => ({ ...prev, col: originalCol }));
              }
            }
            return;
          }

          // Spawn a spider
          const spiderIndex = spawnCount;
          const spiderId = `spider_proj_${Date.now()}_${spiderIndex}`;
          const spiderObj = {
            id: spiderId,
            x: (GRID_SIZE - 1) * 20,
            y: spawnerRow * 20,
            isSpider: true,
            icon: [spider1, spider2, spider3][spiderIndex % 3],
            row: spawnerRow,
            col: GRID_SIZE - 1,
            dead: false
          };

          setProjectiles(prev => [...prev, spiderObj]);

          // Move the spider (2 tiles per round: update coordinates every 400ms)
          let spiderCol = GRID_SIZE - 1;
          const targetCol = targetPosRef.current.col;
          const targetRow = targetPosRef.current.row;

          const moveInterval = setInterval(() => {
            spiderCol -= 1;
            if (spiderCol < 0) {
              clearInterval(moveInterval);
              setProjectiles(prev => prev.filter(p => p.id !== spiderId));
              return;
            }

            // Pathfinding simulation: spiders bypass the Witch if she is on their row at column 4
            setProjectiles(prev => prev.map(p => {
              if (p.id === spiderId && !p.dead) {
                let spiderY = p.y;
                let spiderRowVal = p.row;

                const witchCol = GRID_SIZE - 2; // column 4
                const witchRow = spawnerRow;

                if (spiderCol === witchCol) {
                  const bypassRow = (witchRow === 0) ? 1 : witchRow - 1;
                  spiderY = bypassRow * 20;
                  spiderRowVal = bypassRow;
                } else if (spiderCol < witchCol) {
                  spiderY = targetRow * 20;
                  spiderRowVal = targetRow;
                }

                if (spiderCol === targetCol && spiderRowVal === targetRow) {
                  addFloatingText('-25', 'normal', '#e74c3c', targetRow, targetCol);
                  addFloatingText('ENSNARED!', 'crit', '#2ecc71', targetRow, targetCol);
                  setTargetShake(true);
                  setHitEffect({ type: 'poison_burst' });
                  setTimeout(() => setTargetShake(false), 200);
                  setTimeout(() => setHitEffect(null), 800);

                  clearInterval(moveInterval);
                  setTimeout(() => {
                    setProjectiles(prev => prev.filter(p => p.id !== spiderId));
                  }, 150);
                  return { ...p, dead: true, x: spiderCol * 20, y: spiderY, row: spiderRowVal, col: spiderCol };
                }

                return { ...p, x: spiderCol * 20, y: spiderY, row: spiderRowVal, col: spiderCol };
              }
              return p;
            }));

            if (spiderCol <= targetCol) {
              clearInterval(moveInterval);
              setTimeout(() => {
                setProjectiles(prev => prev.filter(p => p.id !== spiderId));
              }, 500);
            }
          }, 400);

          spawnCount += 1;
        }, 1000);

        setAnimationPhase('return');
        setTimeout(() => { setAnimationPhase(null); setAnimating(false); }, 250);
      }, 500);
    }
    // --- WITCH DISPELL ---
    else if (ability.type === 'witch_dispell_type') {
      setAnimationPhase('cast_spell');
      setAnimating(true);
      setTimeout(() => {
        setHitEffect({ type: 'shadow' });
        addFloatingText('DISPELLED!', 'crit', '#9b5de5', targetPosRef.current.row, targetPosRef.current.col);
        setTimeout(() => setHitEffect(null), 800);
        setAnimationPhase('return');
        setTimeout(() => { setAnimationPhase(null); setAnimating(false); }, 250);
      }, 500);
    }
    // --- WITCH DEMONIC WHISPERS ---
    else if (ability.type === 'demonic_whispers_type') {
      setAnimationPhase('cast_spell');
      setAnimating(true);
      setTimeout(() => {
        setHitEffect({ type: 'shadow' });
        addFloatingText('FEARED!', 'crit', '#e74c3c', targetPosRef.current.row, targetPosRef.current.col);
        setTimeout(() => setHitEffect(null), 800);
        setAnimationPhase('return');
        setTimeout(() => { setAnimationPhase(null); setAnimating(false); }, 250);
      }, 500);
    }
    // --- WITCH TRANSFORM ---
    else if (ability.type === 'transform_type') {
      setAnimationPhase('cast_spell');
      setAnimating(true);
      setTimeout(() => {
        setHitEffect({ type: 'shadow' });
        addFloatingText('TRANSFORMED!', 'crit', '#9b59b6', fighterPos.row, fighterPos.col);
        addFloatingText('+8 ATK', 'normal', '#21e6c1', fighterPos.row, fighterPos.col);
        setTimeout(() => setHitEffect(null), 800);
        setAnimationPhase('return');
        setTimeout(() => { setAnimationPhase(null); setAnimating(false); }, 250);
      }, 500);
    }

    // --- RANGER LOOSE / EXECUTE (FIRES ARROW) ---
    else if (ability.id === 'loose' || ability.id === 'execute') {
      setAnimating(true);
      const arrowType = notchedArrow || 'ice';
      let pIcon = ranger_ice_arrow;
      if (arrowType === 'force') pIcon = ranger_force_arrow;
      else if (arrowType === 'poison') pIcon = ranger_poison_arrow;
      else if (arrowType === 'celestial') pIcon = ranger_celestial_arrow;

      const startCol = getUnitVisualCol(fighterPos.col, isFighterHuge, isFighterLarge);
      const startRow = getUnitVisualRow(fighterPos.row, isFighterHuge, isFighterLarge);
      const targetCol = getUnitVisualCol(targetPos.col, isTargetHuge, isTargetLarge);
      const targetRow = getUnitVisualRow(targetPos.row, isTargetHuge, isTargetLarge);

      setProjectile({
        x: startCol * 20,
        y: startRow * 20,
        icon: pIcon,
        isRangerArrow: true,
        arrowType: arrowType
      });

      // Fly to target
      setTimeout(() => {
        setProjectile(prev => prev ? {
          ...prev,
          x: targetCol * 20,
          y: targetRow * 20
        } : null);
      }, 30);

      // Hit target
      setTimeout(() => {
        setProjectile(null);
        setTargetShake(true);
        setTargetFlash(true);

        const isExecute = ability.id === 'execute';
        let hitType = 'arrow_hit';
        let dmg = isExecute ? '-48' : '-16';
        let color = '#ff4d4d';

        if (arrowType === 'ice') {
          hitType = 'ice_burst';
          dmg = isExecute ? '-54' : '-18';
          color = '#00bfff';
          applyFreeze(2000);
        } else if (arrowType === 'force') {
          hitType = 'fire_exp';
          dmg = isExecute ? '-66' : '-22';
          color = '#ff9f1c';

          const dx = targetPos.col - fighterPos.col;
          const dy = targetPos.row - fighterPos.row;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const pushCol = Math.round(dx / dist);
            const pushRow = Math.round(dy / dist);

            setTargetPos(prev => {
              const newCol = Math.max(0, Math.min(4, prev.col + pushCol));
              const newRow = Math.max(0, Math.min(4, prev.row + pushRow));

              if (newCol !== prev.col || newRow !== prev.row) {
                setTargetPushback(`translate(${pushCol * 100}%, ${pushRow * 100}%)`);
                setTimeout(() => {
                  setTargetPushback(null);
                }, 250);
              }
              return { row: newRow, col: newCol };
            });
          }
        } else if (arrowType === 'poison') {
          hitType = 'poison_burst';
          dmg = isExecute ? '-42' : '-14';
          color = '#38b000';
          applyPoison(8000, 1500, 4);
        } else if (arrowType === 'celestial') {
          hitType = 'fire_exp';
          dmg = isExecute ? '-84' : '-28';
          color = '#ffdd57';
        }

        setHitEffect({ type: hitType });
        addFloatingText(dmg, 'normal', color, targetPos.row, targetPos.col);

        if (targetMarked) {
          setTargetMarked(false);
          setMarkEndTime(null);
          setTimeout(() => {
            addFloatingText('+15', 'crit', '#e63946', targetPos.row, targetPos.col);
          }, 150);
        }

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 300);

        setAnimating(false);
      }, 430);
    }

    // --- RANGER MARK ---
    else if (ability.id === 'mark') {
      setAnimating(true);
      addFloatingText('MARKED!', 'normal', '#ff5400', targetPos.row, targetPos.col);
      const endTime = Date.now() + 8000;
      setMarkEndTime(endTime);
      setTargetMarked(true);
      // Auto-clear after long duration (8000ms)
      setTimeout(() => {
        setTargetMarked(false);
        setMarkEndTime(null);
      }, 8000);
      setTimeout(() => {
        setAnimating(false);
      }, 400);
    }

    // --- RANGER ENSNARE ---
    else if (ability.id === 'ensnare') {
      setAnimating(true);
      const startCol = getUnitVisualCol(fighterPos.col, isFighterHuge, isFighterLarge);
      const startRow = getUnitVisualRow(fighterPos.row, isFighterHuge, isFighterLarge);
      const targetCol = getUnitVisualCol(targetPos.col, isTargetHuge, isTargetLarge);
      const targetRow = getUnitVisualRow(targetPos.row, isTargetHuge, isTargetLarge);
      setProjectile({
        x: startCol * 20,
        y: startRow * 20,
        icon: ranger_net_throw,
        isNet: true
      });
      setTimeout(() => {
        setProjectile(prev => prev ? { ...prev, x: targetCol * 20, y: targetRow * 20 } : null);
      }, 30);
      setTimeout(() => {
        setProjectile(null);
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect(null);
        addFloatingText('ENSNARED!', 'normal', '#8bc34a', targetPos.row, targetPos.col);
        const endTime = Date.now() + 3000;
        setEnsnareEndTime(endTime);
        setTargetEnsnared(true);
        setTargetEnsnaredFading(false);
        setTimeout(() => {
          setTargetEnsnaredFading(true);
        }, 2500);
        setTimeout(() => {
          setTargetEnsnared(false);
          setTargetEnsnaredFading(false);
          setEnsnareEndTime(null);
        }, 3000);
        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 350);
        setAnimating(false);
      }, 430);
    }

    // --- RANGER BURST SHOT / BURST ATTACK (3 SEQUENTIAL ARROWS) ---
    else if (ability.id === 'burst_shot' || ability.id === 'burst_attack') {
      setAnimating(true);
      const arrowType = notchedArrow || 'ice';
      let pIcon = ranger_ice_arrow;
      if (arrowType === 'force') pIcon = ranger_force_arrow;
      else if (arrowType === 'poison') pIcon = ranger_poison_arrow;
      else if (arrowType === 'celestial') pIcon = ranger_celestial_arrow;

      const startCol = getUnitVisualCol(fighterPos.col, isFighterHuge, isFighterLarge);
      const startRow = getUnitVisualRow(fighterPos.row, isFighterHuge, isFighterLarge);

      const fireArrow = (delayTime, index) => {
        setTimeout(() => {
          const arrowId = Math.random();
          setProjectiles(prev => [...prev, {
            id: arrowId,
            x: startCol * 20,
            y: startRow * 20,
            icon: pIcon,
            isRangerArrow: true,
            arrowType: arrowType
          }]);

          // Move
          setTimeout(() => {
            const targetCol = getUnitVisualCol(targetPosRef.current.col, isTargetHuge, isTargetLarge);
            const targetRow = getUnitVisualRow(targetPosRef.current.row, isTargetHuge, isTargetLarge);
            setProjectiles(prev => prev.map(p => p.id === arrowId ? {
              ...p,
              x: targetCol * 20,
              y: targetRow * 20
            } : p));
          }, 30);

          // Impact
          setTimeout(() => {
            setProjectiles(prev => prev.filter(p => p.id !== arrowId));
            setTargetShake(true);
            setTargetFlash(true);

            let hitType = 'arrow_hit';
            let dmg = '-12';
            let color = '#ff4d4d';

            if (arrowType === 'ice') {
              hitType = 'ice_burst';
              dmg = '-14';
              color = '#00bfff';
              applyFreeze(1500);
            } else if (arrowType === 'force') {
              hitType = 'fire_exp';
              dmg = '-18';
              color = '#ff9f1c';

              const dx = targetPosRef.current.col - fighterPos.col;
              const dy = targetPosRef.current.row - fighterPos.row;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                const pushCol = Math.round(dx / dist);
                const pushRow = Math.round(dy / dist);

                setTargetPos(prev => {
                  const newCol = Math.max(0, Math.min(4, prev.col + pushCol));
                  const newRow = Math.max(0, Math.min(4, prev.row + pushRow));

                  if (newCol !== prev.col || newRow !== prev.row) {
                    setProjectiles(projs => projs.map(p => p.isRangerArrow ? {
                      ...p,
                      x: newCol * 20,
                      y: newRow * 20
                    } : p));

                    setTargetPushback(`translate(${pushCol * 100}%, ${pushRow * 100}%)`);
                    setTimeout(() => {
                      setTargetPushback(null);
                    }, 250);
                  }
                  return { row: newRow, col: newCol };
                });
              }
            } else if (arrowType === 'poison') {
              hitType = 'poison_burst';
              dmg = '-10';
              color = '#38b000';
              applyPoison(8000, 1500, 4);
            } else if (arrowType === 'celestial') {
              hitType = 'fire_exp';
              dmg = '-22';
              color = '#ffdd57';
            }

            setHitEffect({ type: hitType });
            addFloatingText(dmg, 'normal', color, targetPosRef.current.row, targetPosRef.current.col);

            if (targetMarked) {
              setTargetMarked(false);
              setMarkEndTime(null);
              setTimeout(() => {
                addFloatingText('+15', 'crit', '#e63946', targetPosRef.current.row, targetPosRef.current.col);
              }, 150);
            }

            setTimeout(() => {
              setTargetShake(false);
              setTargetFlash(false);
              setHitEffect(null);
            }, 200);

            if (index === 3) {
              setAnimating(false);
            }
          }, 430);

        }, delayTime);
      };

      fireArrow(0, 1);
      fireArrow(250, 2);
      fireArrow(500, 3);
    }

    // --- LEAP ATTACK ---
    else if (ability.type === 'leap') {
      setAnimating(true);
      setAnimationPhase('leap');

      // Hits target
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'fire_exp' });
        addFloatingText('-30', 'crit', '#e63946', targetPos.row, targetPos.col);

        // Shake the whole arena momentarily
        const arena = document.querySelector('.combat-grid-arena');
        if (arena) {
          arena.style.animation = 'shake 0.3s ease-out';
          setTimeout(() => arena.style.animation = 'none', 300);
        }

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 300);

        setAnimationPhase('return');
      }, 450);

      setTimeout(() => {
        setAnimating(false);
        setAnimationPhase(null);
      }, 800);
    }

    // --- TELEPORT ATTACK (SHADOWSTEP) ---
    else if (ability.type === 'teleport') {
      setAnimating(true);
      setAnimationPhase('teleport_fade');
      setSelfBuffEffect('stealth');

      // Disappear
      setTimeout(() => {
        setAnimationPhase('behind_target');
        setSelfBuffEffect(null);

        // Strike
        setTimeout(() => {
          setTargetShake(true);
          setTargetFlash(true);
          setHitEffect({ type: 'slash' });
          addFloatingText('-25', 'crit', '#7209b7', targetPos.row, targetPos.col);

          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
            setHitEffect(null);

            // Teleport back
            setAnimationPhase('teleport_fade');
            setSelfBuffEffect('stealth');
            setTimeout(() => {
              setAnimationPhase(null);
              setSelfBuffEffect(null);
              setAnimating(false);
            }, 150);
          }, 300);
        }, 150);
      }, 200);
    }

    // --- BUFFS & HEALS ---
    else if (ability.type === 'heal' || ability.type === 'heal_gold' || ability.type === 'barrier' || ability.type === 'battle_cry' || ability.type === 'overdrive' || ability.type === 'direct_dispel') {
      setAnimating(true);
      let buff = 'heal';
      let txt = '+30';
      let color = '#38b000';

      if (ability.type === 'barrier') {
        buff = 'barrier';
        txt = 'SHIELD ON!';
        color = '#00bfff';
      } else if (ability.type === 'battle_cry') {
        buff = 'rage';
        txt = 'RAGE ATTACK!';
        color = '#e63946';
      } else if (ability.type === 'overdrive') {
        buff = 'rage';
        txt = 'OVERDRIVE';
        color = '#ffb703';
      } else if (ability.type === 'direct_dispel') {
        buff = 'dispel';
        txt = 'CLEANSED!';
        color = '#00ffff';
      }

      // Sage heal / dispel: approach the ally first, then apply
      if (selectedFighterId === 'sage' && (ability.type === 'heal' || ability.type === 'direct_dispel')) {
        setAnimationPhase('heal_approach');
        setTimeout(() => {
          // a) Sage has arrived adjacent (350ms duration)
          const dx = targetPos.col - fighterPos.col;
          const dy = targetPos.row - fighterPos.row;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let midCol = targetPos.col;
          let midRow = targetPos.row;
          if (dist > 0) {
            const stepCol = Math.round(dx / dist);
            const stepRow = Math.round(dy / dist);
            const adjCol = targetPos.col - stepCol;
            const adjRow = targetPos.row - stepRow;
            midCol = (adjCol + targetPos.col) / 2;
            midRow = (adjRow + targetPos.row) / 2;
          }

          // b) Render hands/dispel icon and target glow
          if (ability.type === 'direct_dispel') {
            setDispelIcon({ row: midRow, col: midCol, active: true });
            setTargetDispelGlow(true);
            
            // Clear all target debuffs
            setTargetPoisoned(false);
            setTargetStunned(false);
            setTargetFrozen(false);
            setTargetFeared(false);
            setTargetBleeding(false);
            setTargetEnsnared(false);
            setTargetAsleep(false);
            setTargetMarked(false);
            setFighterHexed(false);
            setMonsterHexed(false);
          } else {
            setHealIcon({ row: midRow, col: midCol, active: true });
            setTargetHealGlow(true);
          }

          addFloatingText(txt, 'normal', color, targetPos.row, targetPos.col);

          // c) Effect is finished: icon fades and color glow fades after 800ms
          setTimeout(() => {
            if (ability.type === 'direct_dispel') {
              setDispelIcon(prev => prev ? { ...prev, active: false } : null);
              setTargetDispelGlow(false);
            } else {
              setHealIcon(prev => prev ? { ...prev, active: false } : null);
              setTargetHealGlow(false);
            }

            // d) Sage moves back to its origin tile after fade duration (300ms)
            setTimeout(() => {
              setAnimationPhase('return');
              setDispelIcon(null);
              setHealIcon(null);

              // Arrives back at origin
              setTimeout(() => {
                setAnimationPhase(null);
                setAnimating(false);
              }, 350);
            }, 300);
          }, 800);
        }, 350);
      } else {
        setSelfBuffEffect(buff);
        addFloatingText(txt, 'normal', color, fighterPos.row, fighterPos.col);

        setTimeout(() => {
          setSelfBuffEffect(null);
          setAnimating(false);
        }, 1000);
      }
    }

    // --- PERCEIVE ---
    else if (ability.type === 'perceive_type') {
      setAnimating(true);
      applyPerceive(4000);
      setSagePerceiveInstanceActive(true);
      setTimeout(() => {
        setSagePerceiveInstanceActive(false);
      }, 2000);
      setTimeout(() => {
        setAnimating(false);
      }, 500);
    }

    // --- CIRCLE OF PROTECTION ---
    else if (ability.type === 'circle_of_protection') {
      setAnimating(true);
      setCopActive(true);
      setCopFading(false);
      setCopEndTime(Date.now() + 8000);
      addFloatingText('SANCTUARY!', 'normal', '#00bfff', fighterPos.row, fighterPos.col);

      setTimeout(() => {
        setCopFading(true);
        setTimeout(() => {
          setCopActive(false);
          setCopFading(false);
          setAnimating(false);
          setCopEndTime(null);
        }, 300);
      }, 8000);
    }

    // --- SHIELD WALL ---
    else if (ability.type === 'shield_wall') {
      setAnimating(true);
      setShieldWallActive(true);
      addFloatingText('DEFENSE UP', 'normal', '#00bfff', fighterPos.row, fighterPos.col);
      setTimeout(() => {
        setShieldWallActive(false);
        setAnimating(false);
      }, 2000);
    }



    // --- BEAM SPELLS (non-lightning) ---
    else if (ability.type === 'beam' || ability.type === 'beam_drain') {
      setAnimating(true);

      let beamType = 'smite';
      let dmg = '-32';
      let color = '#ffe600';

      if (ability.id === 'energy_drain') {
        beamType = 'drain';
        dmg = '-15';
        color = '#7209b7';
      }

      setActiveBeam(beamType);

      // Hit target
      setTimeout(() => {
        setActiveBeam(null);
        setTargetShake(true);
        setTargetFlash(true);

        if (beamType === 'drain') {
          setHitEffect({ type: 'shadow' });
          addFloatingText('+15', 'normal', '#2ec4b6', fighterPos.row, fighterPos.col);
        } else {
          setHitEffect({ type: 'slash' });
        }

        addFloatingText(dmg, 'normal', color, targetPos.row, targetPos.col);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 300);

        setAnimating(false);
      }, 350);
    }

    // --- WIZARD LIGHTNING ---
    else if (ability.type === 'lightning') {
      setAnimating(true);
      setActiveBeam('lightning');

      // Hit at 350ms
      setTimeout(() => {
        setActiveBeam(null);
        setTargetShake(true);
        setTargetFlash(true);
        setLightningJagged(true);
        setHitEffect({ type: 'lightning_hit' });
        addFloatingText('-30', 'crit', '#00ffff', targetPos.row, targetPos.col);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
          setLightningJagged(false);
        }, 500);

        setAnimating(false);
      }, 350);
    }

    // --- MAGIC MISSILE ---
    else if (ability.type === 'magic_missile' || ability.type === 'greater_magic_missile' || ability.type === 'minor_magic_missile') {
      setAnimating(true);

      const activeSphere = (selectedUnitType === 'fighter' && selectedMonsterId === 'wraith')
        ? minions.find(m => m.type === 'darkness_sphere')
        : null;

      const fireMissile = (delayTime, offsetY) => {
        setTimeout(() => {
          const missileId = Math.random();
          const startX = fighterPos.col * 20;
          const startY = fighterPos.row * 20;
          const finalX = targetPos.col * 20;
          const finalY = targetPos.row * 20 + offsetY;

          setProjectiles(prev => [...prev, {
            id: missileId,
            x: startX,
            y: startY,
            isMagicMissile: true,
            isBezier: !!activeSphere
          }]);

          if (activeSphere) {
            const sphereX = activeSphere.col * 20;
            const sphereY = activeSphere.row * 20;
            const duration = 400;
            const startTime = Date.now();

            const tick = () => {
              const elapsed = Date.now() - startTime;
              const t = Math.min(elapsed / duration, 1);
              const mt = 1 - t;
              const currentX = mt * mt * startX + 2 * mt * t * finalX + t * t * sphereX;
              const currentY = mt * mt * startY + 2 * mt * t * finalY + t * t * sphereY;

              setProjectiles(prev => prev.map(p => p.id === missileId ? {
                ...p,
                x: currentX,
                y: currentY,
                opacity: t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1,
                scale: t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1
              } : p));

              if (t < 1) {
                requestAnimationFrame(tick);
              }
            };
            requestAnimationFrame(tick);
          } else {
            // Move standard
            setTimeout(() => {
              setProjectiles(prev => prev.map(p => p.id === missileId ? {
                ...p,
                x: finalX,
                y: finalY
              } : p));
            }, 30);
          }

          // Impact
          setTimeout(() => {
            setProjectiles(prev => prev.filter(p => p.id !== missileId));
            if (activeSphere) {
              addFloatingText('SWALLOWED', 'normal', '#b5179e', activeSphere.row, activeSphere.col);
            } else {
              setTargetShake(true);
              setTargetFlash(true);
              setHitEffect({ type: 'shadow' });
              addFloatingText('-10', 'normal', '#b5179e', targetPos.row, targetPos.col);

              setTimeout(() => {
                setTargetShake(false);
                setTargetFlash(false);
                setHitEffect(null);
              }, 150);
            }
          }, 430);

        }, delayTime);
      };

      const isGreater = ability.type === 'greater_magic_missile';
      const isMinor = ability.type === 'minor_magic_missile';
      const count = isGreater ? 5 : (isMinor ? 1 : 3);
      for (let i = 0; i < count; i++) {
        fireMissile(i * 150, (i - (count - 1) / 2) * 5);
      }

      setTimeout(() => {
        setAnimating(false);
      }, 650 + count * 150);
    }

    // --- WIZARD ACID BLAST ---
    else if (ability.type === 'acid_blast') {
      setAnimating(true);
      setProjectile({
        x: fighterPos.col * 20,
        y: fighterPos.row * 20,
        isAcidBlast: true
      });
      setTimeout(() => {
        setProjectile(prev => prev ? { ...prev, x: targetPos.col * 20, y: targetPos.row * 20 } : null);
      }, 30);
      setTimeout(() => {
        setProjectile(null);
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'poison_burst' });
        addFloatingText('-12', 'normal', '#38b000', targetPos.row, targetPos.col);

        applyPoison(4000, 1000, 3);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 350);
        setAnimating(false);
      }, 430);
    }

    // --- WIZARD DISINTEGRATE ---
    else if (ability.type === 'disintegrate') {
      setAnimating(true);
      setActiveBeam('disintegrate');
      setTargetDisintegrating(true);

      setTimeout(() => {
        addFloatingText('-6', 'normal', '#ff3333', targetPos.row, targetPos.col);
        setTargetFlash(true);
        setTimeout(() => setTargetFlash(false), 100);
      }, 400);
      setTimeout(() => {
        addFloatingText('-10', 'normal', '#ff1a1a', targetPos.row, targetPos.col);
        setTargetFlash(true);
        setTimeout(() => setTargetFlash(false), 100);
      }, 900);
      setTimeout(() => {
        addFloatingText('-18', 'normal', '#e60000', targetPos.row, targetPos.col);
        setTargetFlash(true);
        setTimeout(() => setTargetFlash(false), 100);
      }, 1400);
      setTimeout(() => {
        addFloatingText('-32', 'crit', '#ff0055', targetPos.row, targetPos.col);
        setHitEffect({ type: 'fire_exp' });
        setTargetFlash(true);
        setTimeout(() => setTargetFlash(false), 200);
      }, 1800);

      setTimeout(() => {
        setActiveBeam(null);
        setTargetDisintegrating(false);
        setHitEffect(null);
        setAnimating(false);
      }, 2200);
    }

    // --- WIZARD SLEEP ---
    else if (ability.type === 'sleep') {
      setAnimating(true);
      setProjectile({
        x: fighterPos.col * 20,
        y: fighterPos.row * 20,
        icon: wizard_sleep,
        isSleep: true
      });
      setTimeout(() => {
        setProjectile(prev => prev ? { ...prev, x: targetPos.col * 20, y: targetPos.row * 20 } : null);
      }, 30);
      setTimeout(() => {
        setProjectile(null);
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'sleep_rings' });

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 350);

        setTimeout(() => {
          setHitEffect(null);
          setTargetAsleep(true);
          setSleepIconActive(true);
          setSleepEndTime(Date.now() + 8000);
          addFloatingText('SLEEP', 'normal', '#90caf9', targetPos.row, targetPos.col);

          setTimeout(() => {
            setTargetAsleep(false);
            setSleepIconActive(false);
            setSleepEndTime(null);
          }, 8000);

          setAnimating(false);
        }, 2000);
      }, 430);
    }

    // --- WIZARD ANNIHILATION ---
    else if (ability.type === 'annihilation') {
      setAnimating(true);
      setActiveBeam('annihilation');
      setAnnihilationSweepActive(false);

      const targetColCenter = getUnitVisualCol(targetPos.col, isTargetHuge, isTargetLarge);
      const targetRowCenter = getUnitVisualRow(targetPos.row, isTargetHuge, isTargetLarge);

      // Start concentric organic rings as soon as the beam makes contact (at 150ms)
      setTimeout(() => {
        setAnnihilationExplosion({ row: targetRowCenter, col: targetColCenter });
        setHitEffect({ type: 'annihilation_portal', row: targetRowCenter, col: targetColCenter });
      }, 150);

      setTimeout(() => {
        setAnnihilationSweepActive(true);
      }, 50);

      // First damage tick triggers instantly when the beam first hits (at 50ms)
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        addFloatingText('-16', 'crit', '#9d4edd', targetRowCenter, targetColCenter);
        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 150);
      }, 50);

      // Second damage tick at 600ms
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        addFloatingText('-16', 'crit', '#9d4edd', targetRowCenter, targetColCenter);
        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 150);
      }, 600);

      // Third damage tick at 1150ms
      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        addFloatingText('-16', 'crit', '#9d4edd', targetRowCenter, targetColCenter);
        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
        }, 150);
      }, 1150);

      // Beam and explosion end at 1400ms (slower sweep)
      setTimeout(() => {
        setActiveBeam(null);
        setAnnihilationSweepActive(false);
        setAnnihilationExplosion(null);
        setHitEffect(null);
        setAnimating(false);
      }, 1400);
    }

    // --- WIZARD VORTEX ---
    else if (ability.type === 'vortex') {
      setAnimating(true);
      setVortexActive({ row: targetPos.row, col: targetPos.col });

      const interval = setInterval(() => {
        // Main target
        setTargetShake(true);
        setTimeout(() => setTargetShake(false), 80);
        addFloatingText('-5', 'normal', '#7b2cbf', targetPos.row, targetPos.col);

        // Check Extra Goblin 1 (row: 1, col: 4)
        if (Math.abs(1 - targetPos.row) <= 1 && Math.abs(4 - targetPos.col) <= 1) {
          setExtraGoblin1Shake(true);
          setExtraGoblin1Flash(true);
          setTimeout(() => {
            setExtraGoblin1Shake(false);
            setExtraGoblin1Flash(false);
          }, 80);
          addFloatingText('-5', 'normal', '#7b2cbf', 1, 4);
        }

        // Check Extra Goblin 2 (row: 3, col: 4)
        if (Math.abs(3 - targetPos.row) <= 1 && Math.abs(4 - targetPos.col) <= 1) {
          setExtraGoblin2Shake(true);
          setExtraGoblin2Flash(true);
          setTimeout(() => {
            setExtraGoblin2Shake(false);
            setExtraGoblin2Flash(false);
          }, 80);
          addFloatingText('-5', 'normal', '#7b2cbf', 3, 4);
        }
      }, 350);

      setTimeout(() => {
        clearInterval(interval);
        setVortexActive(null);
        setAnimating(false);
      }, 1600);
    }

    // --- SUMMON BAT MINION ---
    else if (ability.type === 'summon') {
      // Find empty slot adjacent to summoner
      let summonRow = fighterPos.row;
      let summonCol = fighterPos.col + 1;
      if (summonCol > 4) summonCol = fighterPos.col - 1;

      // Ensure it doesn't overlap with target
      if (summonCol === targetPos.col && summonRow === targetPos.row) {
        summonRow = (fighterPos.row + 1) % 5;
      }

      setAnimating(true);
      // Spawn hit portal effect
      setHitEffect({ type: 'void_portal' });
      addFloatingText('SUMMON!', 'normal', '#7209b7', summonRow, summonCol);

      setTimeout(() => {
        setMinions(prev => [...prev, { row: summonRow, col: summonCol }]);
        setHitEffect(null);
        setAnimating(false);
      }, 800);
    }

    // --- OPEN THE RIFT ---
    else if (ability.type === 'open_rift_type') {
      const openTiles = getEmptyGridTiles();
      if (openTiles.length === 0) {
        addFloatingText('NO EMPTY TILES FOR RIFT!', 'normal', '#e63946', fighterPos.row, fighterPos.col);
        return;
      }
      const randomTile = openTiles[Math.floor(Math.random() * openTiles.length)];
      setAnimating(true);
      setHitEffect({ type: 'void_portal', row: randomTile.row, col: randomTile.col });
      addFloatingText('RIFT OPENED!', 'normal', '#8a2be2', randomTile.row, randomTile.col);

      setTimeout(() => {
        setRiftPortalActive(true);
        setRiftPortalPos(randomTile);
        setRiftPortalEndTime(Date.now() + 9000);
        setRiftPortalFading(false);
        setHitEffect(null);
        setAnimating(false);
      }, 800);
    }

    // --- INVOKE DARKNESS ---
    else if (ability.type === 'invoke_darkness_type') {
      executeSummonAnimation('darkness_sphere', invoke_darkness, sphere_of_darkness, 'DARKNESS SPHERE');
    }

    // --- NETHER BOLT ---
    else if (ability.type === 'nether_bolt_type') {
      setAnimating(true);

      const missileId = Math.random();
      const startX = fighterPos.col * 20;
      const startY = fighterPos.row * 20;
      const finalX = targetPos.col * 20;
      const finalY = targetPos.row * 20;

      const activeSphere = minions.find(m => m.type === 'darkness_sphere');
      const dx = finalX - startX;
      const dy = finalY - startY;
      const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      setProjectiles(prev => [...prev, {
        id: missileId,
        x: startX,
        y: startY,
        angle: startAngle,
        isNetherBolt: true,
        isBezier: !!activeSphere,
        color: '#a21caf',
        shadowColor: '#4a044e'
      }]);

      if (activeSphere) {
        const sphereX = activeSphere.col * 20;
        const sphereY = activeSphere.row * 20;
        const duration = 400;
        const startTime = Date.now();

        const tick = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(elapsed / duration, 1);
          const mt = 1 - t;
          
          const currentX = mt * mt * startX + 2 * mt * t * finalX + t * t * sphereX;
          const currentY = mt * mt * startY + 2 * mt * t * finalY + t * t * sphereY;

          const nextT = Math.min(t + 0.05, 1);
          const nextMt = 1 - nextT;
          const nextX = nextMt * nextMt * startX + 2 * nextMt * nextT * finalX + nextT * nextT * sphereX;
          const nextY = nextMt * nextMt * startY + 2 * nextMt * nextT * finalY + nextT * nextT * sphereY;
          const currentAngle = Math.atan2(nextY - currentY, nextX - currentX) * (180 / Math.PI);

          setProjectiles(prev => prev.map(p => p.id === missileId ? {
            ...p,
            x: currentX,
            y: currentY,
            angle: currentAngle,
            opacity: t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1,
            scale: t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1
          } : p));

          if (t < 1) {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setProjectiles(prev => prev.map(p => p.id === missileId ? {
            ...p,
            x: finalX,
            y: finalY
          } : p));
        }, 30);
      }

      // Impact
      setTimeout(() => {
        setProjectiles(prev => prev.filter(p => p.id !== missileId));
        if (activeSphere) {
          addFloatingText('SWALLOWED', 'normal', '#a21caf', activeSphere.row, activeSphere.col);
        } else {
          setTargetShake(true);
          setTargetFlash(true);
          setHitEffect({ type: 'shadow' });
          addFloatingText('-16', 'normal', '#a21caf', targetPos.row, targetPos.col);

          const fearApplied = Math.random() < 0.40;
          if (fearApplied) {
            setTargetFeared(true);
            setFearFading(false);
            setFearEndTime(Date.now() + 8000);
            addFloatingText('FEARED!', 'normal', '#8e2de2', targetPos.row, targetPos.col);

            setTargetFearOverlay({ row: targetPos.row, col: targetPos.col });
            setTimeout(() => {
              setTargetFearOverlay(null);
            }, 1500);
          }

          setTimeout(() => {
            setTargetShake(false);
            setTargetFlash(false);
            setHitEffect(null);
          }, 150);
        }
        setAnimating(false);
      }, 430);
    }

    // --- SUMMON SKELETON ---
    else if (ability.type === 'summon_skeleton_type') {
      executeSummonAnimation('skeleton', summon_icon, summon_skeleton_icon, 'SKELETON');
    }

    // --- SUMMON IMP ---
    else if (ability.type === 'summon_imp_type') {
      executeSummonAnimation('imp', summon_icon, summon_imp_icon, 'IMP');
    }

    // --- SUMMON SKELETON KNIGHT ---
    else if (ability.type === 'summon_skeleton_knight_type') {
      executeSummonAnimation('skeleton_knight', summon2_icon, summon_skeleton_knight_icon, 'KNIGHT');
    }

    // --- SUMMON ZOMBIE ---
    else if (ability.type === 'summon_zombie_type') {
      executeSummonAnimation('zombie', summon2_icon, summon_zombie_icon, 'ZOMBIE');
    }

    // --- SUMMON GHOUL ---
    else if (ability.type === 'summon_ghoul_type') {
      executeSummonAnimation('ghoul', summon2_icon, summon_ghoul_icon, 'GHOUL');
    }

    // --- SUMMON IMP ARMY ---
    else if (ability.type === 'summon_imp_army_type') {
      executeSummonAnimation('imp_army', summon3_icon, summon_imp_army_icon, 'IMP ARMY');
    }

    // --- SUMMON SKELETON ARMY ---
    else if (ability.type === 'summon_skeleton_army_type') {
      executeSummonAnimation('skeleton_army', summon3_icon, summon_skeleton_army_icon, 'SKELETON ARMY');
    }

    // --- SUMMON DEVIL ---
    else if (ability.type === 'summon_devil_type') {
      executeSummonAnimation('devil', summon3_icon, summon_devil_icon, 'DEVIL');
    }

    // --- SUMMONER DUPLICATE ---
    else if (ability.type === 'summoner_duplicate_type') {
      if (minions.length === 0) {
        addFloatingText('NO MINION TO DUPLICATE!', 'normal', '#e63946', fighterPos.row, fighterPos.col);
        return;
      }

      const sourceMinion = minions[minions.length - 1];
      // Behind target is defined by facing direction. Default player unit faces right, so left is col - 1.
      const isFacingRight = fighterPos.col <= targetPos.col;
      const dupCol = isFacingRight ? sourceMinion.col - 1 : sourceMinion.col + 1;
      const dupRow = sourceMinion.row;

      if (dupCol >= 0 && dupCol < GRID_SIZE && dupRow >= 0 && dupRow < GRID_SIZE) {
        setAnimating(true);
        setActiveSummons([{
          id: Math.random(),
          row: dupRow,
          col: dupCol,
          icon: duplicate_transition_icon,
          type: 'duplicate',
          shrinking: false
        }]);

        // 800ms: start shrink
        setTimeout(() => {
          setActiveSummons(prev => prev.map(p => ({ ...p, shrinking: true })));
        }, 800);

        // 1200ms: disappear and spawn duplicate minion
        setTimeout(() => {
          setActiveSummons([]);
          setMinions(prev => [
            ...prev.filter(m => !(m.row === dupRow && m.col === dupCol)),
            {
              ...sourceMinion,
              row: dupRow,
              col: dupCol,
              fadingIn: true
            }
          ]);
          setTimeout(() => {
            setMinions(prev => prev.map(m => m.row === dupRow && m.col === dupCol ? { ...m, fadingIn: false } : m));
          }, 500);
          setAnimating(false);
        }, 1200);
      } else {
        addFloatingText('OUT OF BOUNDS!', 'normal', '#e63946', sourceMinion.row, sourceMinion.col);
      }
    }

    // --- SUMMONER TRIPLICATE ---
    else if (ability.type === 'summoner_triplicate_type') {
      if (minions.length === 0) {
        addFloatingText('NO MINION TO TRIPLICATE!', 'normal', '#e63946', fighterPos.row, fighterPos.col);
        return;
      }

      const sourceMinion = minions[minions.length - 1];
      const isFacingRight = fighterPos.col <= targetPos.col;
      const colOffset = isFacingRight ? -1 : 1;

      // Triplicate positions at NW and SW (NE and SE if Summoner is facing left)
      const targets = [];
      const nwRow = sourceMinion.row - 1;
      const nwCol = sourceMinion.col + colOffset;
      const swRow = sourceMinion.row + 1;
      const swCol = sourceMinion.col + colOffset;

      if (nwRow >= 0 && nwRow < GRID_SIZE && nwCol >= 0 && nwCol < GRID_SIZE) {
        targets.push({ row: nwRow, col: nwCol });
      }
      if (swRow >= 0 && swRow < GRID_SIZE && swCol >= 0 && swCol < GRID_SIZE) {
        targets.push({ row: swRow, col: swCol });
      }

      if (targets.length > 0) {
        setAnimating(true);
        const newPortals = targets.map(t => ({
          id: Math.random(),
          row: t.row,
          col: t.col,
          icon: triplicate_transition_icon,
          type: 'triplicate',
          shrinking: false
        }));
        setActiveSummons(newPortals);

        // 800ms: start shrink
        setTimeout(() => {
          setActiveSummons(prev => prev.map(p => ({ ...p, shrinking: true })));
        }, 800);

        // 1200ms: disappear and spawn triplicate minions
        setTimeout(() => {
          setActiveSummons([]);
          setMinions(prev => {
            let nextMinions = [...prev];
            targets.forEach(t => {
              nextMinions = nextMinions.filter(m => !(m.row === t.row && m.col === t.col));
              nextMinions.push({
                ...sourceMinion,
                row: t.row,
                col: t.col,
                fadingIn: true
              });
            });
            return nextMinions;
          });
          setTimeout(() => {
            setMinions(prev => {
              let nextMinions = [...prev];
              targets.forEach(t => {
                nextMinions = nextMinions.map(m => m.row === t.row && m.col === t.col ? { ...m, fadingIn: false } : m);
              });
              return nextMinions;
            });
          }, 500);
          setAnimating(false);
        }, 1200);
      } else {
        addFloatingText('OUT OF BOUNDS!', 'normal', '#e63946', sourceMinion.row, sourceMinion.col);
      }
    }

    // --- DEPLOY TURRET ---
    else if (ability.type === 'deploy_turret') {
      let turretRow = fighterPos.row;
      let turretCol = fighterPos.col + 1;
      if (turretCol > 4) turretCol = fighterPos.col - 1;

      if (turretCol === targetPos.col && turretRow === targetPos.row) {
        turretRow = (fighterPos.row + 1) % 5;
      }

      setAnimating(true);
      addFloatingText('DEPLOY TURRET', 'normal', '#ffb703', turretRow, turretCol);

      setTimeout(() => {
        setTurrets(prev => [...prev, { row: turretRow, col: turretCol }]);
        setAnimating(false);
      }, 500);
    }

    // --- VOID PORTAL ---
    else if (ability.type === 'void_portal') {
      setAnimating(true);
      setHitEffect({ type: 'void_portal' });

      setTimeout(() => {
        setTargetShake(true);
        setTargetFlash(true);
        addFloatingText('-22', 'normal', '#7209b7', targetPos.row, targetPos.col);

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 400);

        setAnimating(false);
      }, 400);
    }

    // --- DJINN BETRAYAL ---
    else if (ability.type === 'betrayal_type') {
      setAnimating(true);
      // 1. Reddish/white beam from Djinn to Ranger
      setBetrayalBeamActive(true);

      // 2. Beam hits Ranger after 500ms
      setTimeout(() => {
        setBetrayalBeamActive(false);
        setBetrayalHitActive(true);
        setExtraRangerShake(true);
        setExtraRangerFlash(true);
        addFloatingText('BETRAYED!', 'crit', '#e63946', rangerPos.row, rangerPos.col);

        // 3. Shake/flash ends after 300ms
        setTimeout(() => {
          setExtraRangerShake(false);
          setExtraRangerFlash(false);
        }, 300);
      }, 500);

      // 4. Large hit icon transitions out, Ranger moves and gets status effect (1500ms after start)
      setTimeout(() => {
        setBetrayalHitActive(false);
        setRangerBetrayalEffectActive(true);
        setRangerBetrayalEffectEndTime(Date.now() + 4000); // 4 seconds duration

        // Move Ranger to (0, 2)
        setRangerPos({ row: 2, col: 0 });

        // 5. Fire poison arrow after moving (e.g. 500ms after move)
        setTimeout(() => {
          setProjectile({
            x: 0 * 20,
            y: 2 * 20,
            icon: ranger_poison_arrow,
            isRangerArrow: true,
            arrowType: 'poison'
          });

          // Projectile starts traveling
          setTimeout(() => {
            const targetCol = getUnitVisualCol(targetPos.col, isTargetHuge, isTargetLarge);
            const targetRow = getUnitVisualRow(targetPos.row, isTargetHuge, isTargetLarge);
            setProjectile(prev => prev ? { ...prev, x: targetCol * 20, y: targetRow * 20 } : null);
          }, 30);

          // Projectile hits Soldier target
          setTimeout(() => {
            setProjectile(null);
            setTargetShake(true);
            setTargetFlash(true);
            setHitEffect({ type: 'arrow_hit' });
            addFloatingText('-16', 'normal', '#2ec4b6', targetPos.row, targetPos.col);
            addFloatingText('POISONED!', 'normal', '#2ec4b6', targetPos.row, targetPos.col);

            setTimeout(() => {
              setTargetShake(false);
              setTargetFlash(false);
              setHitEffect(null);
            }, 300);
          }, 430);

        }, 500);

      }, 1500);

      // Let Djinn become non-animating after 2000ms
      setTimeout(() => {
        setAnimating(false);
      }, 2000);
    }

    // --- DJINN ARCANE BARRIER ---
    else if (ability.type === 'arcane_barrier_type') {
      setAnimating(true);
      setSelfBuffEffect('barrier');
      setDjinnArcaneBarrierActive(true);
      setDjinnArcaneBarrierFading(false);
      setDjinnArcaneBarrierEndTime(Date.now() + 8000); // 8 seconds long duration
      addFloatingText('ARCANE BARRIER!', 'normal', '#00ffff', fighterPos.row, fighterPos.col);

      setTimeout(() => {
        setAnimating(false);
      }, 500);
    }

    // --- DJINN DEATH MISSILE ---
    else if (ability.type === 'death_missile_type') {
      setAnimating(true);
      setProjectile({
        x: fighterPos.col * 20,
        y: fighterPos.row * 20,
        icon: death_missile
      });
      setTimeout(() => {
        setProjectile(prev => prev ? { ...prev, x: targetPos.col * 20, y: targetPos.row * 20 } : null);
      }, 30);
      setTimeout(() => {
        setProjectile(null);
        setTargetShake(true);
        setTargetFlash(true);
        setHitEffect({ type: 'shadow' }); // explosion
        addFloatingText('DEATH MISSILE!', 'crit', '#ff0033', targetPos.row, targetPos.col);

        setDjinnDeathMissileHitActive(true);
        setDjinnDeathMissileHitEndTime(Date.now() + 8000); // 8 seconds long duration

        setTimeout(() => {
          setTargetShake(false);
          setTargetFlash(false);
          setHitEffect(null);
        }, 500);

        setAnimating(false);
      }, 430);
    }

    // --- DJINN BIND ---
    else if (ability.type === 'bind_type') {
      setAnimating(true);
      setTargetShake(true);
      setTargetFlash(true);
      setDjinnBindActive(true);
      setDjinnBindFading(false);
      setDjinnBindEndTime(Date.now() + 8000); // 8 seconds long duration
      addFloatingText('BOUND!', 'normal', '#b388ff', targetPos.row, targetPos.col);

      setTimeout(() => {
        setTargetShake(false);
        setTargetFlash(false);
        setAnimating(false);
      }, 500);
    }

    // --- DJINN RIFT ---
    else if (ability.type === 'rift_type') {
      setAnimating(true);
      // Show the rift line appearing then sweeping toward target
      setRiftActive(true);
      setRiftSweeping(false);
      addFloatingText('RIFT!', 'crit', '#d8b4fe', targetPos.row, targetPos.col);

      // Phase 2: sweep start at 1600ms
      setTimeout(() => {
        setRiftSweeping(true);
      }, 1600);

      // Phase 3: pushback at 1800ms (when sweeping line hits the unit)
      setTimeout(() => {
        // If target is in range (same lane ±1, within 3 tiles), show push-back
        const dx = Math.abs(fighterPos.col - targetPos.col);
        const dy = Math.abs(fighterPos.row - targetPos.row);
        if (dx <= 3 && dy <= 1) {
          addFloatingText('PUSHED BACK!', 'normal', '#c084fc', targetPos.row, targetPos.col);
          
          let newCol = targetPos.col;
          if (fighterPos.col < targetPos.col) {
            newCol = Math.min(GRID_SIZE - 1, targetPos.col + 2);
          } else {
            newCol = Math.max(0, targetPos.col - 2);
          }
          
          setTargetPos(prev => ({ ...prev, col: newCol }));
        }
      }, 1800);

      setTimeout(() => {
        setRiftActive(false);
        setRiftSweeping(false);
        setAnimating(false);
      }, 2400);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#111',
      color: 'white',
      paddingTop: '20px',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Dynamic Keyframes Stylesheet */}
      <style>{`
        .yellow-ray {
          position: absolute;
          bottom: -100%;
          background: linear-gradient(to top, rgba(255, 221, 87, 0) 0%, rgba(255, 221, 87, 0.7) 70%, rgba(255, 255, 255, 0.95) 100%);
          filter: blur(2px);
          opacity: 0;
          animation: upwardRay 1.5s ease-in-out infinite;
        }
        .teal-ray {
          position: absolute;
          bottom: -100%;
          background: linear-gradient(to top, rgba(33, 230, 193, 0) 0%, rgba(33, 230, 193, 0.7) 70%, rgba(255, 255, 255, 0.95) 100%);
          filter: blur(2px);
          opacity: 0;
          animation: upwardRay 1.5s ease-in-out infinite;
        }
        @keyframes upwardRay {
          0% { bottom: -100%; opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { bottom: 100%; opacity: 0; }
        }
        @keyframes hoverFloat {
          0% { transform: translateX(-50%) translateY(10px) scale(0.8); opacity: 0; }
          20% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          80% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-10px) scale(0.8); opacity: 0; }
        }
        @keyframes astralFocusFloat {
          0% { transform: translateX(-50%) translateY(5px) scale(0.95); opacity: 0; }
          20% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          80% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-5px) scale(0.95); opacity: 0; }
        }

        @keyframes organicMorphYellow {
          0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(0deg); }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: rotate(180deg); }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(360deg); }
        }
        @keyframes organicMorphOrange {
          0% { border-radius: 40% 60% 50% 50% / 40% 40% 60% 60%; transform: rotate(360deg); }
          50% { border-radius: 70% 30% 40% 60% / 60% 70% 30% 40%; transform: rotate(180deg); }
          100% { border-radius: 40% 60% 50% 50% / 40% 40% 60% 60%; transform: rotate(0deg); }
        }
        @keyframes organicGlow {
          0% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            transform: rotate(0deg) scale(0.95);
          }
          50% {
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
            transform: rotate(180deg) scale(1.05);
          }
          100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            transform: rotate(360deg) scale(0.95);
          }
        }
        @keyframes organicGlowRev {
          0% {
            border-radius: 40% 60% 50% 50% / 40% 40% 60% 60%;
            transform: rotate(360deg) scale(1.05);
          }
          50% {
            border-radius: 70% 30% 40% 60% / 60% 70% 30% 40%;
            transform: rotate(180deg) scale(0.95);
          }
          100% {
            border-radius: 40% 60% 50% 50% / 40% 40% 60% 60%;
            transform: rotate(0deg) scale(1.05);
          }
        }
        @keyframes monkGlowSwipeLeft {
          0% { transform: translateX(100%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes monkGlowSwipeRight {
          0% { transform: translateX(-100%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes monkGlowSwipeUp {
          0% { transform: translateY(100%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes monkGlowSwipeDown {
          0% { transform: translateY(-100%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes poisonPulseGlow {
          0% {
            box-shadow: inset 0 0 10px rgba(56, 176, 0, 0.3), 0 0 8px rgba(56, 176, 0, 0.2);
            background: rgba(56, 176, 0, 0.05);
          }
          100% {
            box-shadow: inset 0 0 25px rgba(56, 176, 0, 0.7), 0 0 20px rgba(56, 176, 0, 0.6);
            background: rgba(56, 176, 0, 0.2);
          }
        }
        @keyframes markPulse {
          0% { opacity: 0.15; }
          50% { opacity: 0.35; }
          100% { opacity: 0.15; }
        }
        @keyframes acidBlastLobY {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-70px); }
          100% { transform: translateY(0px); }
        }
        @keyframes bubbleWobble {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.18) translate(1px, -1px); }
        }
        @keyframes bubbleWobbleAlt {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(0.82) translate(-1px, 1px); }
        }
        @keyframes acidDrip {
          0% {
            transform: translateY(-20px) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          80% {
            opacity: 0.8;
            transform: translateY(60px) scale(1);
          }
          100% {
            transform: translateY(90px) scale(0.4);
            opacity: 0;
          }
        }
        @keyframes fireRingExpand {
          0% {
            width: 0px;
            height: 0px;
            opacity: 1;
            border: 4px solid #ffe49e;
            box-shadow: 0 0 10px #ff5a1f, inset 0 0 10px #ff5a1f;
          }
          50% {
            opacity: 0.8;
            border: 6px solid #ff9d2b;
            box-shadow: 0 0 25px #ff5a1f, inset 0 0 15px #ff5a1f;
          }
          100% {
            width: 260px;
            height: 260px;
            opacity: 0;
            border: 2px solid #d9230f;
            box-shadow: 0 0 40px #d9230f, inset 0 0 20px #d9230f;
          }
        }
        @keyframes fireballFlicker {
          0% { transform: scale(0.95); filter: brightness(1); }
          100% { transform: scale(1.05); filter: brightness(1.2); }
        }
        @keyframes iceFlicker {
          0% { transform: scale(0.9); }
          100% { transform: scale(1.1); }
        }
        @keyframes iceSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes missileGlow {
          0% { transform: scale(0.9); box-shadow: 0 0 8px #d946ef, 0 0 15px #701a75; }
          100% { transform: scale(1.1); box-shadow: 0 0 14px #d946ef, 0 0 25px #701a75; }
        }
        @keyframes lightningFlash {
          0%, 100% { opacity: 0; transform: scaleX(1); }
          50% { opacity: 1; transform: scaleX(1.1) skewX(-2deg); }
        }
        @keyframes lightningBgFlash {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.35; }
        }
        @keyframes whirlwindSpin {
          0% { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.15) rotate(180deg); opacity: 0.9; }
          85% { transform: translate(-50%, -50%) scale(1.0) rotate(540deg); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(0.1) rotate(720deg); opacity: 0; }
        }
        @keyframes meleeWhirlwindSpin {
          0% {
            transform: rotate(0deg) translate(0, -55px) rotate(0deg) scale(0);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: rotate(108deg) translate(0, -55px) rotate(360deg) scale(1.2);
          }
          85% {
            opacity: 1;
            transform: rotate(612deg) translate(0, -55px) rotate(2160deg) scale(1.2);
          }
          100% {
            transform: rotate(720deg) translate(0, -55px) rotate(2520deg) scale(0);
            opacity: 0;
          }
        }
        @keyframes floatUp {
          0% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, -40px); opacity: 0; }
        }
        @keyframes disintegrateBeam {
          0% {
            width: 8px;
            box-shadow: 0 0 10px #ffffff, 0 0 20px #ff1a1a, 0 0 30px #ff1a1a;
            opacity: 0.95;
          }
          15% {
            width: 10px;
            box-shadow: 0 0 12px #ffffff, 0 0 25px #ff1a1a, 0 0 35px #ff1a1a;
          }
          30% {
            width: 18px;
            box-shadow: 0 0 18px #ffffff, 0 0 35px #ff1a1a, 0 0 55px #ff1a1a;
          }
          75% {
            width: 48px;
            box-shadow: 0 0 30px #ffffff, 0 0 60px #ff1a1a, 0 0 90px #ff1a1a, 0 0 120px #ff1a1a;
            opacity: 1;
          }
          90% {
            width: 48px;
            box-shadow: 0 0 30px #ffffff, 0 0 60px #ff1a1a, 0 0 90px #ff1a1a, 0 0 120px #ff1a1a;
            opacity: 1;
          }
          100% {
            width: 0px;
            box-shadow: 0 0 0px transparent;
            opacity: 0;
          }
        }
        @keyframes disintegrateShake {
          0% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-1px, 1px) rotate(-0.5deg); }
          20% { transform: translate(1px, -1px) rotate(0.5deg); }
          30% { transform: translate(-2px, 2px) rotate(-1deg); }
          40% { transform: translate(2px, -2px) rotate(1deg); }
          50% { transform: translate(-3px, 1px) rotate(-1.5deg); }
          60% { transform: translate(3px, -1px) rotate(1.5deg); }
          70% { transform: translate(-5px, 3px) rotate(-2deg); }
          80% { transform: translate(5px, -3px) rotate(2deg); }
          90% { transform: translate(-7px, 4px) rotate(-3.5deg); }
          95% { transform: translate(7px, -4px) rotate(3.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes zzzFloat {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translate(15px, -35px) scale(1.25); opacity: 0; }
        }
        @keyframes vortexSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes wavyBeam {
          0% { height: 30px; filter: hue-rotate(0deg); }
          100% { height: 45px; filter: hue-rotate(15deg); }
        }
        @keyframes beamGrow {
          from { width: 0; opacity: 0; }
          to { opacity: 0.9; }
        }
        @keyframes annihilationRing {
          0% {
            width: 0px;
            height: 0px;
            border: 4px solid #ff007f;
            background: rgba(142, 45, 226, 0.4);
            box-shadow: 0 0 15px #8e2de2, inset 0 0 10px #ff007f;
            opacity: 1;
          }
          100% {
            width: 160px;
            height: 160px;
            border: 1px solid transparent;
            background: rgba(142, 45, 226, 0);
            box-shadow: 0 0 45px #ff007f, inset 0 0 30px #8e2de2;
            opacity: 0;
          }
        }
        @keyframes collapsarRing {
          0% {
            transform: scale(1.3);
            opacity: 0;
          }
          15% {
            opacity: 0.95;
          }
          85% {
            opacity: 0.95;
          }
          100% {
            transform: scale(0.15);
            opacity: 0;
          }
        }
        @keyframes sleepShrinkRing {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) scale(1.6);
            opacity: 0;
          }
          15% {
            opacity: 0.65;
            transform: translate(-50%, -50%) rotate(27deg) scale(1.36);
          }
          85% {
            opacity: 0.65;
            transform: translate(-50%, -50%) rotate(153deg) scale(0.34);
          }
          100% {
            transform: translate(-50%, -50%) rotate(180deg) scale(0.1);
            opacity: 0;
          }
        }
        @keyframes slashFade {
          0% { transform: scale(0.6) rotate(-20deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(20deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 0; }
        }
        @keyframes explode {
          0% { transform: scale(0.3); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes portalGrow {
          0% { transform: scaleX(0.1) scaleY(0.05); opacity: 0; }
          20% { transform: scaleX(1) scaleY(0.5); opacity: 1; }
          80% { transform: scaleX(1) scaleY(0.5); opacity: 1; }
          100% { transform: scaleX(0.1) scaleY(0.05); opacity: 0; }
        }
        @keyframes summonPortalIn {
          0% {
            transform: translate(-50%, -50%) scale(0.01) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          65% {
            transform: translate(-50%, -50%) scale(1) rotate(540deg);
            opacity: 0.8;
          }
          80% {
            transform: translate(-50%, -50%) scale(1) rotate(600deg);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(620deg);
            opacity: 0;
          }
        }
        @keyframes minionFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes scaleUp {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes modalScaleUp {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes weaponSwingArc {
          0% {
            transform: rotate(-60deg);
            opacity: 0;
          }
          10% {
            transform: rotate(-60deg);
            opacity: 1;
          }
          90% {
            transform: rotate(60deg);
            opacity: 1;
          }
          100% {
            transform: rotate(60deg);
            opacity: 0;
          }
        }
        @keyframes weaponSwingArcFlipped {
          0% {
            transform: scaleY(-1) rotate(-60deg);
            opacity: 0;
          }
          10% {
            transform: scaleY(-1) rotate(-60deg);
            opacity: 1;
          }
          90% {
            transform: scaleY(-1) rotate(60deg);
            opacity: 1;
          }
          100% {
            transform: scaleY(-1) rotate(60deg);
            opacity: 0;
          }
        }
        @keyframes drawRopes {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes leftFacingClawArc {
          0% {
            transform: rotate(60deg);
            opacity: 0;
          }
          10% {
            transform: rotate(60deg);
            opacity: 1;
          }
          90% {
            transform: rotate(-90deg);
            opacity: 1;
          }
          100% {
            transform: rotate(-90deg);
            opacity: 0;
          }
        }
        @keyframes rightFacingClawArc {
          0% {
            transform: scaleX(-1) rotate(-60deg);
            opacity: 0;
          }
          10% {
            transform: scaleX(-1) rotate(-60deg);
            opacity: 1;
          }
          90% {
            transform: scaleX(-1) rotate(90deg);
            opacity: 1;
          }
          100% {
            transform: scaleX(-1) rotate(90deg);
            opacity: 0;
          }
        }
        @keyframes radialCooldownSweep {
          0% { stroke-dashoffset: 31.42; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes birdieOrbit1 {
          0% { transform: translate(25px, 0px) scale(1.1); z-index: 5; }
          25% { transform: translate(0px, 6px) scale(0.95); z-index: 5; }
          50% { transform: translate(-25px, 0px) scale(0.8); z-index: 1; }
          75% { transform: translate(0px, -6px) scale(0.95); z-index: 1; }
          100% { transform: translate(25px, 0px) scale(1.1); z-index: 5; }
        }
        @keyframes birdieOrbit2 {
          0% { transform: translate(-25px, 0px) scale(0.8); z-index: 1; }
          25% { transform: translate(0px, -6px) scale(0.95); z-index: 1; }
          50% { transform: translate(25px, 0px) scale(1.1); z-index: 5; }
          75% { transform: translate(0px, 6px) scale(0.95); z-index: 5; }
          100% { transform: translate(-25px, 0px) scale(0.8); z-index: 1; }
        }
        @keyframes imbuedStrikeThrust {
          0% {
            transform: rotate(-60deg) translateX(0);
            opacity: 0;
          }
          10% {
            transform: rotate(-60deg) translateX(0);
            opacity: 1;
          }
          22% {
            transform: rotate(0deg) translateX(0);
            opacity: 1;
          }
          55% {
            transform: rotate(0deg) translateX(0);
            opacity: 1;
          }
          65% {
            transform: rotate(0deg) translateX(24px);
            opacity: 1;
          }
          85% {
            transform: rotate(0deg) translateX(24px);
            opacity: 1;
          }
          100% {
            transform: rotate(0deg) translateX(24px);
            opacity: 0;
          }
        }
        @keyframes biteCloseTop {
          0% {
            transform: translateY(-40px);
            opacity: 0;
          }
          15% {
            transform: translateY(-30px);
            opacity: 1;
          }
          45% {
            transform: translateY(12px);
            opacity: 1;
          }
          80% {
            transform: translateY(12px);
            opacity: 1;
          }
          100% {
            transform: translateY(12px);
            opacity: 0;
          }
        }
        @keyframes biteCloseBottom {
          0% {
            transform: translateY(40px);
            opacity: 0;
          }
          15% {
            transform: translateY(30px);
            opacity: 1;
          }
          45% {
            transform: translateY(-12px);
            opacity: 1;
          }
          80% {
            transform: translateY(-12px);
            opacity: 1;
          }
          100% {
            transform: translateY(-12px);
            opacity: 0;
          }
        }
        @keyframes vampBiteCloseTop {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          15% {
            transform: translateY(0);
            opacity: 1;
          }
          45% {
            transform: translateY(18px);
            opacity: 1;
          }
          80% {
            transform: translateY(18px);
            opacity: 1;
          }
          100% {
            transform: translateY(18px);
            opacity: 0;
          }
        }
        @keyframes vampBiteCloseBottom {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          15% {
            transform: translateY(0);
            opacity: 1;
          }
          45% {
            transform: translateY(-18px);
            opacity: 1;
          }
          80% {
            transform: translateY(-18px);
            opacity: 1;
          }
          100% {
            transform: translateY(-18px);
            opacity: 0;
          }
        }
        @keyframes vampBiteBackgroundFade {
          0% {
            opacity: 0;
          }
          15% {
            opacity: 0.5;
          }
          80% {
            opacity: 0.5;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes heartbeatPulse {
          0% { transform: translateX(-50%) scale(1); }
          30% { transform: translateX(-50%) scale(0.75); }
          60% { transform: translateX(-50%) scale(1.25); }
          100% { transform: translateX(-50%) scale(1); }
        }
        @keyframes hoverFloatLoop {
          0% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
          100% { transform: translateX(-50%) translateY(0); }
        }
        @keyframes fearOverlayPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.4);
            opacity: 0;
          }
          20% {
            transform: translate(-50%, -50%) scale(1.0);
            opacity: 0.65;
          }
          70% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.55);
            opacity: 0;
          }
        }
        @keyframes pinkBeamPulse {
          0% {
            height: 0px;
            opacity: 0;
          }
          15% {
            height: 10px;
            opacity: 1;
          }
          85% {
            height: 10px;
            opacity: 1;
          }
          100% {
            height: 0px;
            opacity: 0;
          }
        }
        @keyframes cleaveStuck {
          0% {
            transform: rotate(-60deg);
            opacity: 0;
          }
          10% {
            transform: rotate(-60deg);
            opacity: 1;
          }
          35% {
            transform: rotate(0deg);
            opacity: 1;
          }
          85% {
            transform: rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes leapScale {
          0% { transform: scale(1); }
          50% { transform: scale(1.55); }
          100% { transform: scale(1); }
        }
        @keyframes stompScale {
          0% { transform: scale(1); }
          35% { transform: scale(1.6); }
          55% { transform: scale(1); }
          63% { transform: scale(1) translate(-3px, 2px); }
          71% { transform: scale(1) translate(3px, -2px); }
          79% { transform: scale(1) translate(-2px, 1px); }
          87% { transform: scale(1) translate(1px, -1px); }
          100% { transform: scale(1); }
        }
        @keyframes shockwaveExpand {
          0% {
            width: 40px;
            height: 40px;
            opacity: 1;
            border-dasharray: none;
            border-width: 6px;
          }
          100% {
            width: 280px;
            height: 280px;
            opacity: 0;
            border-width: 1px;
          }
        }
        @keyframes pulseRedIntense {
          0%, 100% {
            box-shadow: 0 0 15px rgba(255, 0, 0, 0.6), inset 0 0 8px rgba(255, 0, 0, 0.4);
            filter: brightness(1);
          }
          50% {
            box-shadow: 0 0 35px rgba(255, 0, 0, 0.95), inset 0 0 20px rgba(255, 0, 0, 0.85);
            filter: brightness(1.2) saturate(1.5);
          }
        }
        @keyframes dizzySpin {
          0% { transform: rotate(0deg) translateX(12px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(12px) rotate(-360deg); }
        }
        @keyframes stunWobble {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-3deg) translateY(-2px); }
          75% { transform: rotate(3deg) translateY(1px); }
        }
        @keyframes ensnarePulse {
          0%, 100% { opacity: 0.7; box-shadow: 0 0 6px rgba(85,139,47,0.6); }
          50% { opacity: 1; box-shadow: 0 0 14px rgba(85,139,47,1); }
        }
        @keyframes beamShrink {
          0% { width: 18px; opacity: 1; }
          100% { width: 0px; opacity: 0; }
        }
        @keyframes pulse {
          0% { opacity: 0.45; }
          50% { opacity: 0.8; }
          100% { opacity: 0.45; }
        }
        @keyframes shake {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-8px, 5px); }
          40% { transform: translate(8px, -5px); }
          60% { transform: translate(-5px, -3px); }
          80% { transform: translate(5px, 3px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes poisonDrop {
          0% { opacity: 0.9; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(-12px, 6px) scale(0.3); }
        }
        .shield-wall-overlay {
            background: linear-gradient(
                to right,
                rgba(180, 220, 255, 0.2) 0%,
                rgba(255, 255, 255, 1)   35%,
                rgba(200, 230, 255, 1)   50%,
                rgba(255, 255, 255, 1)   65%,
                rgba(180, 220, 255, 0.2) 100%
            );
            border-radius: 3px;
            box-shadow:
                0 0 8px 4px rgba(180, 210, 255, 0.9),
                0 0 20px 8px rgba(100, 180, 255, 0.5),
                0 0 40px 16px rgba(60, 130, 255, 0.25);
            animation: shieldWallPulse 1.2s ease-in-out infinite alternate;
        }
        .shield-wall-active-portrait {
            box-shadow:
                0 0 8px 4px rgba(180, 210, 255, 0.9),
                0 0 20px 8px rgba(100, 180, 255, 0.5),
                0 0 40px 16px rgba(60, 130, 255, 0.25);
            animation: shieldWallPulse 1.2s ease-in-out infinite alternate;
        }
        @keyframes shieldWallPulse {
            from {
                opacity: 0.8;
                box-shadow:
                    0 0 8px 4px rgba(180, 210, 255, 0.9),
                    0 0 20px 8px rgba(100, 180, 255, 0.5),
                    0 0 40px 16px rgba(60, 130, 255, 0.25);
            }
            to {
                opacity: 1;
                box-shadow:
                    0 0 12px 6px rgba(200, 230, 255, 1),
                    0 0 28px 12px rgba(140, 200, 255, 0.7),
                    0 0 55px 22px rgba(80, 160, 255, 0.4);
            }
        }
        @keyframes ArcAnimation_right {
          0%{
            transform: translate(-45px, -35px) rotate(-60deg);
            opacity: 0.1;
          }
          50%{
            transform: translate(0px, -10px) rotate(15deg);
            opacity: 0.9;
          }
          80%{
            transform: translate(15px, 10px) rotate(50deg);
            opacity: 1;
          }
          100%{
            transform: translate(0px, 25px) rotate(90deg);
            opacity: 0;
          }
        }
        @keyframes ArcAnimation_left {
          0%{
            transform: translate(45px, -35px) rotate(60deg);
            opacity: 0.1;
          }
          50%{
            transform: translate(0px, -10px) rotate(-15deg);
            opacity: 0.9;
          }
          80%{
            transform: translate(-15px, 10px) rotate(-50deg);
            opacity: 1;
          }
          100%{
            transform: translate(0px, 25px) rotate(-90deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Header & Tabs */}
      <div style={{
        width: '100%',
        display: 'flex',
        borderBottom: '1px solid #333',
        padding: '0 20px',
        marginBottom: '40px'
      }}>
        <button
          onClick={() => history.push('/landing')}
          style={{
            padding: '10px 20px',
            cursor: 'pointer',
            alignSelf: 'center',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: '4px',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          Back
        </button>

        <div style={{ display: 'flex', gap: '20px', marginLeft: '40px' }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              style={{
                padding: '15px 20px',
                cursor: tab.enabled ? 'pointer' : 'not-allowed',
                opacity: tab.enabled ? 1 : 0.5,
                borderBottom: activeTab === tab.id ? '2px solid white' : '2px solid transparent',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                transition: 'all 0.2s',
                color: activeTab === tab.id ? 'white' : '#888'
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'combat animations' && (
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          maxWidth: '1200px',
          gap: '30px',
          padding: '0 20px',
          alignItems: 'stretch',
          marginBottom: '50px'
        }}>
          {/* Left Panel: Fighters */}
          <div style={{
            flex: '0 0 280px',
            width: '280px',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '75vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '15px' }}>
              <button
                onClick={() => !isAnimating && setSelectedUnitType('fighter')}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  borderBottom: selectedUnitType === 'fighter' ? '2px solid #ffb703' : '2px solid transparent',
                  color: selectedUnitType === 'fighter' ? '#ffb703' : '#888',
                  paddingBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                FIGHTERS
              </button>
              <button
                onClick={() => !isAnimating && setSelectedUnitType('monster')}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  borderBottom: selectedUnitType === 'monster' ? '2px solid #ffb703' : '2px solid transparent',
                  color: selectedUnitType === 'monster' ? '#ffb703' : '#888',
                  paddingBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                MONSTERS
              </button>
            </div>
            {(selectedUnitType === 'monster' ? monstersData : fightersData).map(f => {
              const isSelected = selectedUnitType === 'monster' ? selectedMonsterId === f.id : selectedFighterId === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => {
                    if (isAnimating) return;
                    if (selectedUnitType === 'monster') {
                      setSelectedMonsterId(f.id);
                    } else {
                      setSelectedFighterId(f.id);
                    }
                    // Reset character specific visual states
                    setTargetFrozen(false);
                    setFrozenIconActive(false);
                    setFrozenFading(false);
                    setFrozenEndTime(null);
                    setTargetPoisoned(false);
                    setPoisonFading(false);
                    setPoisonEndTime(null);
                    setTargetBleeding(false);
                    setBleedFading(false);
                    setBleedEndTime(null);
                    setShieldWallActive(false);
                    setAstralModeActive(false);
                    setAstralModeEndTime(null);
                    setAstralModeFading(false);
                    setThirdEyeActive(false);
                    setThirdEyeEndTime(null);
                    setThirdEyeFading(false);
                    setMeditateAnimActive(false);
                    setAstralFocusAnimActive(false);
                    setTurrets([]);
                    setMinions([]);
                    setMonkGoblin1Shake(false);
                    setMonkGoblin1Flash(false);
                    setMonkGoblin1Push(null);
                    setMonkGoblin2Shake(false);
                    setMonkGoblin2Flash(false);
                    setMonkGoblin2Push(null);
                    setMonkExtraPunches([]);
                    setActiveSummons([]);
                    setRiftPortalActive(false);
                    setRiftPortalPos(null);
                    setRiftPortalEndTime(null);
                    setRiftPortalFading(false);
                    setTargetFeared(false);
                    setFearEndTime(null);
                    setFearFading(false);
                    setExtraRangerFeared(false);
                    setExtraRangerFearEndTime(null);
                    setExtraRangerFearFading(false);
                    setInduceFearActive(false);
                    setTargetEnergyDrainActive(false);
                    setVampireCrimsonSightActive(false);
                    setVampireCrimsonSightEndTime(null);
                    setVampireCrimsonSightFading(false);
                    setVampireBatFlyActive(false);
                    setVampireBatFlyFading(false);
                    setVampireHidden(false);
                    setBatFlyMovementActive(false);
                    setBatFlyProgress(0);
                    setSkeletonReassemblyActive(false);
                    setSkeletonHourglassEndTime(null);
                    setSkeletonReassemblyCooldownEndTime(null);
                    setDjinnDeathMissileHitActive(false);
                    setDjinnDeathMissileHitEndTime(null);
                    setDjinnArcaneBarrierActive(false);
                    setDjinnArcaneBarrierEndTime(null);
                    setDjinnArcaneBarrierFading(false);
                    setDjinnBindActive(false);
                    setDjinnBindEndTime(null);
                    setDjinnBindFading(false);
                    setExtraRangerShake(false);
                    setExtraRangerFlash(false);
                    setExtraRangerStunned(false);
                    setRangerPos({ row: 3, col: 0 });
                    setBetrayalBeamActive(false);
                    setBetrayalHitActive(false);
                    setRangerBetrayalEffectActive(false);
                    setRangerBetrayalEffectEndTime(null);
                    if (selectedUnitType === 'fighter' && f.id === 'sage') {
                      setTargetPos({ row: 2, col: 3 });
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '10px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(255, 183, 3, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '2px solid #ffb703' : '2px solid transparent',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 0 15px rgba(255, 183, 3, 0.15)' : 'none'
                  }}
                >
                  <img src={f.portrait} alt={f.name} style={{ width: '50px', height: '50px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{f.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.04em' }}>{f.id}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Panel: Combat Arena */}
          <div className="combat-grid-arena" style={{
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center'
          }}>
            {/* Grid Controls */}
            <div style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.03)',
              padding: '8px 20px',
              borderRadius: '30px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <span style={{ fontSize: '13px', color: '#aaa' }}>Click grid to place:</span>
              <button
                onClick={() => setPlacementMode('fighter')}
                style={{
                  background: placementMode === 'fighter' ? '#ffb703' : 'transparent',
                  color: placementMode === 'fighter' ? '#000' : '#fff',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
              >
                Attacker
              </button>
              <button
                onClick={() => setPlacementMode('target')}
                style={{
                  background: placementMode === 'target' ? '#ff5400' : 'transparent',
                  color: placementMode === 'target' ? '#000' : '#fff',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
              >
                Target
              </button>

              <button
                onClick={() => {
                  if (selectedFighterId === 'ranger') {
                    setFighterPos({ row: 2, col: 0 });
                    setTargetPos({ row: 2, col: 2 });
                  } else {
                    setFighterPos({ row: 2, col: 1 });
                    setTargetPos({ row: 2, col: 3 });
                  }
                  setTurrets([]);
                  setMinions([]);
                  setTargetFrozen(false);
                  setFrozenIconActive(false);
                  setFrozenFading(false);
                  setFrozenEndTime(null);
                  setTargetPoisoned(false);
                  setPoisonFading(false);
                  setPoisonEndTime(null);
                  if (poisonIntervalRef.current) {
                    clearInterval(poisonIntervalRef.current);
                    poisonIntervalRef.current = null;
                  }
                  setPoisonSingleDuration(8000);
                  setFrozenSingleDuration(2000);
                  setTargetBleeding(false);
                  setBleedFading(false);
                  setBleedEndTime(null);
                  setShieldWallActive(false);
                  setMonkGoblin1Shake(false);
                  setMonkGoblin1Flash(false);
                  setMonkGoblin1Push(null);
                  setMonkGoblin2Shake(false);
                  setMonkGoblin2Flash(false);
                  setMonkGoblin2Push(null);
                  setMonkExtraPunches([]);
                  setActiveSummons([]);
                  setTargetFeared(false);
                  setFearEndTime(null);
                  setFearFading(false);
                  setExtraRangerFeared(false);
                  setExtraRangerFearEndTime(null);
                  setExtraRangerFearFading(false);
                  setInduceFearActive(false);
                  setTargetEnergyDrainActive(false);
                  setVampireCrimsonSightActive(false);
                  setVampireCrimsonSightEndTime(null);
                  setVampireCrimsonSightFading(false);
                  setDjinnDeathMissileHitActive(false);
                  setDjinnDeathMissileHitEndTime(null);
                  setDjinnArcaneBarrierActive(false);
                  setDjinnArcaneBarrierEndTime(null);
                  setDjinnArcaneBarrierFading(false);
                  setDjinnBindActive(false);
                  setDjinnBindEndTime(null);
                  setDjinnBindFading(false);
                  setExtraRangerShake(false);
                  setExtraRangerFlash(false);
                  setExtraRangerStunned(false);
                  setRangerPos({ row: 3, col: 0 });
                  setBetrayalBeamActive(false);
                  setBetrayalHitActive(false);
                  setRangerBetrayalEffectActive(false);
                  setRangerBetrayalEffectEndTime(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#ccc',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  transition: 'all 0.2s'
                }}
              >
                Reset Coordinates
              </button>

              {selectedUnitType === 'monster' && selectedMonsterId === 'skeleton' && (
                <button
                  onClick={() => triggerSkeletonDeath()}
                  style={{
                    background: 'rgba(230, 57, 70, 0.15)',
                    color: '#e63946',
                    border: '1px solid rgba(230, 57, 70, 0.3)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.2s',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(230, 57, 70, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(230, 57, 70, 0.15)'}
                >
                  Kill Skeleton
                </button>
              )}
            </div>

            {/* Grid Container */}
            <div style={{
              position: 'relative',
              width: '500px',
              height: '500px',
              background: '#161618',
              borderRadius: '16px',
              border: '2px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
              overflow: 'hidden'
            }}>
              {/* Render grid cells */}
              {Array.from({ length: GRID_SIZE }).map((_, r) => (
                Array.from({ length: GRID_SIZE }).map((_, c) => {
                  const isTurret = turrets.some(t => t.row === r && t.col === c);
                  const isMinion = minions.some(m => m.row === r && m.col === c);
                  const isPortal = riftPortalActive && riftPortalPos && riftPortalPos.row === r && riftPortalPos.col === c;

                  // Sage & Soldier friendly units coordinates
                  const isAdditionalRanger = selectedUnitType === 'fighter' && ((selectedFighterId === 'sage' && r === 3 && c === 0) || (selectedFighterId === 'soldier' && r === 0 && c === 1));
                  const isAdditionalBarbarian = selectedUnitType === 'fighter' && (selectedFighterId === 'sage' && r === 0 && c === 3);
                  const isAdditionalSoldier = selectedUnitType === 'fighter' && (selectedFighterId === 'sage' && r === 2 && c === 3);
                  const isAdditionalMonk = selectedUnitType === 'fighter' && (selectedFighterId === 'soldier' && r === 0 && c === 3);
                  const isFighterVCT = getCandidateTiles(fighterPos.row, fighterPos.col, isFighterHuge, isFighterLarge)
                    .some(t => (t.row !== fighterPos.row || t.col !== fighterPos.col) && t.row === r && t.col === c);
                  const isTargetVCT = getCandidateTiles(targetPos.row, targetPos.col, isTargetHuge, isTargetLarge)
                    .some(t => (t.row !== targetPos.row || t.col !== targetPos.col) && t.row === r && t.col === c);

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => {
                        if (isAnimating) return;

                        // General helper checks for grid occupancy
                        const isPortalAt = (row, col) => riftPortalActive && riftPortalPos && riftPortalPos.row === row && riftPortalPos.col === col;
                        const isMinionAt = (row, col) => minions.some(m => m.row === row && m.col === col);
                        const isTurretAt = (row, col) => turrets.some(t => t.row === row && t.col === col);
                        const isFriendlyExtraAt = (row, col) => {
                          if (selectedUnitType !== 'fighter') return false;
                          if (selectedFighterId === 'sage') {
                            return (row === 3 && col === 0) || (row === 0 && col === 3) || (row === 2 && col === 3);
                          }
                          if (selectedFighterId === 'soldier') {
                            return (row === 0 && col === 1) || (row === 0 && col === 3);
                          }
                          return false;
                        };

                        const isTileBlocked = (row, col) => {
                          return isPortalAt(row, col) || isMinionAt(row, col) || isTurretAt(row, col) || isFriendlyExtraAt(row, col);
                        };

                        const getFighterOccupiedTiles = () => getCandidateTiles(fighterPos.row, fighterPos.col, isFighterHuge, isFighterLarge);
                        const getTargetOccupiedTiles = () => getCandidateTiles(targetPos.row, targetPos.col, isTargetHuge, isTargetLarge);

                        if (placementMode === 'fighter') {
                          if ((isFighterHuge && r < 2) || (isFighterLarge && r < 1)) return; // Vertically out of bounds
                          const candidateTiles = getCandidateTiles(r, c, isFighterHuge, isFighterLarge);
                          if (candidateTiles.some(tile => isTileBlocked(tile.row, tile.col))) return;

                          const targetTiles = getTargetOccupiedTiles();
                          const overlap = candidateTiles.some(cTile =>
                            targetTiles.some(tTile => cTile.row === tTile.row && cTile.col === tTile.col)
                          );
                          if (overlap) return;

                          setFighterPos({ row: r, col: c });
                        } else {
                          if ((isTargetHuge && r < 2) || (isTargetLarge && r < 1)) return; // Vertically out of bounds
                          const candidateTiles = getCandidateTiles(r, c, isTargetHuge, isTargetLarge);
                          if (candidateTiles.some(tile => isTileBlocked(tile.row, tile.col))) return;

                          const fighterTiles = getFighterOccupiedTiles();
                          const overlap = candidateTiles.some(cTile =>
                            fighterTiles.some(fTile => cTile.row === fTile.row && cTile.col === fTile.col)
                          );
                          if (overlap) return;

                          setTargetPos({ row: r, col: c });
                        }
                      }}
                      style={{
                        border: isFighterVCT
                          ? '1px dashed rgba(255, 183, 3, 0.25)'
                          : isTargetVCT
                            ? '1px dashed rgba(255, 84, 0, 0.25)'
                            : '1px solid rgba(255,255,255,0.04)',
                        background: isFighterVCT
                          ? 'rgba(255, 183, 3, 0.06)'
                          : isTargetVCT
                            ? 'rgba(255, 84, 0, 0.06)'
                            : (r + c) % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.15)',
                        position: 'relative',
                        cursor: isAnimating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                    >
                      {/* Cell Coordinates */}
                      <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: '9px', color: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }}>
                        {c},{r}
                      </div>

                      {/* VCT Indicator */}
                      {(isFighterVCT || isTargetVCT) && (
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          width: '100%',
                          textAlign: 'center',
                          fontSize: '10px',
                          color: isFighterVCT ? 'rgba(255, 183, 3, 0.45)' : 'rgba(255, 84, 0, 0.45)',
                          fontWeight: 'bold',
                          letterSpacing: '1px',
                          pointerEvents: 'none',
                          zIndex: 5
                        }}>
                          VCT
                        </div>
                      )}

                      {/* Render Turret */}
                      {isTurret && (
                        <div style={{ width: '60%', height: '60%', position: 'relative', animation: 'scaleUp 0.3s ease-out' }}>
                          <img src={construct_icon} alt="turret" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <div style={{ position: 'absolute', bottom: '-8px', left: '0', width: '100%', textAlign: 'center', fontSize: '9px', color: '#ffb703', fontWeight: 'bold' }}>TURRET</div>
                        </div>
                      )}

                      {/* Render Minion */}
                      {isMinion && (() => {
                        const minion = minions.find(m => m.row === r && m.col === c);
                        if (!minion) return null;

                        if (minion.type === 'darkness_sphere') {
                          return (
                            <div style={{ width: '80%', height: '80%', position: 'relative' }}>
                              {/* The sphere of darkness image fading in */}
                              <img
                                src={sphere_of_darkness}
                                alt="darkness sphere"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  animation: 'sphereOfDarknessFadeIn 1.5s cubic-bezier(0.19, 1, 0.22, 1) forwards'
                                }}
                              />
                              {/* The skill icon rising and fading out */}
                              <img
                                src={invoke_darkness}
                                alt="invoke darkness"
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  animation: 'invokeDarknessSkillTransition 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                                  pointerEvents: 'none'
                                }}
                              />
                            </div>
                          );
                        }

                        const minionIcon = minion.icon || bat_gate;
                        const minionLabel = minion.label || 'BAT';
                        const labelColor = minion.type === 'skeleton' ? '#a8a29e' : minion.type === 'skeleton_knight' ? '#3b82f6' : '#a2d2ff';
                        const anim = minion.fadingIn ? 'minionFadeIn 0.5s ease-out both' : (minion.fadingIn === false ? 'minionFadeIn 0.5s ease-out both' : 'scaleUp 0.3s ease-out');

                        return (
                          <div style={{ width: '60%', height: '60%', position: 'relative', animation: anim }}>
                            <img src={minionIcon} alt={minionLabel} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            <div style={{ position: 'absolute', bottom: '-8px', left: '0', width: '100%', textAlign: 'center', fontSize: '9px', color: labelColor, fontWeight: 'bold' }}>{minionLabel}</div>
                          </div>
                        );
                      })()}

                      {/* Render Portal */}
                      {isPortal && (
                        <div style={{ width: '80%', height: '80%', position: 'relative', animation: 'scaleUp 0.3s ease-out' }}>
                          <img src={portal_icon} alt="rift portal" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

                          {/* Duration Overlay on Portal */}
                          <div
                            className={riftPortalFading ? 'effect-icon-fading' : 'effect-icon-active'}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: '#111',
                              border: '2px solid #8a2be2',
                              backgroundImage: `url(${duration_icon})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              zIndex: 15,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                              overflow: 'hidden'
                            }}
                          >
                            <svg
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                transform: 'rotate(-90deg)',
                                pointerEvents: 'none'
                              }}
                              viewBox="0 0 20 20"
                            >
                              <circle
                                cx="10"
                                cy="10"
                                r="5"
                                fill="none"
                                stroke="rgba(0, 0, 0, 0.55)"
                                strokeWidth="10"
                                strokeDasharray="31.42"
                                strokeDashoffset={getRiftPortalDashOffset()}
                              />
                            </svg>
                            {/* Stacks display: shows remaining segment count */}
                            <div style={{
                              position: 'absolute',
                              bottom: '-4px',
                              left: '-8px',
                              background: '#a855f7',
                              color: '#fff',
                              borderRadius: '50%',
                              width: '12px',
                              height: '12px',
                              fontSize: '9px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              border: '1px solid #111',
                              zIndex: 10
                            }}>
                              {getRiftPortalSegmentsRemaining()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Render Additional Ranger for Sage */}
                      {isAdditionalRanger && (
                        <div
                          className={`friendly-portrait-unit ${copActive ? 'pulse-bright' : ''}`}
                          style={{
                            width: '80%',
                            height: '80%',
                            borderRadius: '8px',
                            border: '2px solid #8ecae6',
                            backgroundColor: '#222',
                            backgroundImage: `url(${ranger})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 8,
                            pointerEvents: 'none'
                          }}
                        >
                          {copActive && (
                            <div
                              className={copFading ? 'effect-icon-fading' : 'effect-icon-active'}
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#111',
                                border: '2px solid #00bfff',
                                backgroundImage: `url(${shielded})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                zIndex: 15,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                              }}
                            >
                              <svg
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  transform: 'rotate(-90deg)',
                                  pointerEvents: 'none'
                                }}
                                viewBox="0 0 20 20"
                              >
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="5"
                                  fill="none"
                                  stroke="rgba(0, 0, 0, 0.35)"
                                  strokeWidth="10"
                                  strokeDasharray="31.42"
                                  strokeDashoffset={getCopDashOffset()}
                                />
                                {(() => {
                                  const coords = getRadialLineCoords(copEndTime);
                                  return coords ? (
                                    <line
                                      x1="10"
                                      y1="10"
                                      x2={coords.x2}
                                      y2={coords.y2}
                                      stroke="#ffffff"
                                      strokeWidth="0.8"
                                    />
                                  ) : null;
                                })()}
                              </svg>
                            </div>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            width: '100%',
                            background: 'rgba(0,0,0,0.75)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            padding: '1px 0',
                            borderBottomLeftRadius: '6px',
                            borderBottomRightRadius: '6px'
                          }}>
                            Ranger
                          </div>
                          {selectedFighterId === 'soldier' && inspireActive && (
                            <div
                              className={inspireFading ? 'effect-icon-fading' : 'effect-icon-active'}
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#111',
                                border: '2px solid #ffdd57',
                                backgroundImage: `url(${inspire})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                zIndex: 15,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                              }}
                            >
                              <svg
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  transform: 'rotate(-90deg)',
                                  pointerEvents: 'none'
                                }}
                                viewBox="0 0 20 20"
                              >
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="5"
                                  fill="none"
                                  stroke="rgba(0, 0, 0, 0.35)"
                                  strokeWidth="10"
                                  strokeDasharray="31.42"
                                  strokeDashoffset={getInspireDashOffset()}
                                />
                                {(() => {
                                  const coords = getRadialLineCoords(inspireEndTime);
                                  return coords ? (
                                    <line
                                      x1="10"
                                      y1="10"
                                      x2={coords.x2}
                                      y2={coords.y2}
                                      stroke="#ffffff"
                                      strokeWidth="0.8"
                                    />
                                  ) : null;
                                })()}
                              </svg>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Render Additional Barbarian for Sage */}
                      {isAdditionalBarbarian && (
                        <div
                          style={{
                            width: '80%',
                            height: '80%',
                            borderRadius: '8px',
                            border: '2px solid #ffb703',
                            backgroundColor: '#222',
                            backgroundImage: `url(${barbarian})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 8,
                            pointerEvents: 'none'
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            width: '100%',
                            background: 'rgba(0,0,0,0.75)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            padding: '1px 0',
                            borderBottomLeftRadius: '6px',
                            borderBottomRightRadius: '6px'
                          }}>
                            Barbarian
                          </div>
                        </div>
                      )}

                      {/* Render Additional Monk for Soldier */}
                      {isAdditionalMonk && (
                        <div
                          style={{
                            width: '80%',
                            height: '80%',
                            borderRadius: '8px',
                            border: '2px solid #ff9f1c',
                            backgroundColor: '#222',
                            backgroundImage: `url(${monk})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 8,
                            pointerEvents: 'none'
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            width: '100%',
                            background: 'rgba(0,0,0,0.75)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            padding: '1px 0',
                            borderBottomLeftRadius: '6px',
                            borderBottomRightRadius: '6px'
                          }}>
                            Monk
                          </div>
                          {selectedFighterId === 'soldier' && inspireActive && (
                            <div
                              className={inspireFading ? 'effect-icon-fading' : 'effect-icon-active'}
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#111',
                                border: '2px solid #ffdd57',
                                backgroundImage: `url(${inspire})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                zIndex: 15,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                              }}
                            >
                              <svg
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  transform: 'rotate(-90deg)',
                                  pointerEvents: 'none'
                                }}
                                viewBox="0 0 20 20"
                              >
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="5"
                                  fill="none"
                                  stroke="rgba(0, 0, 0, 0.35)"
                                  strokeWidth="10"
                                  strokeDasharray="31.42"
                                  strokeDashoffset={getInspireDashOffset()}
                                />
                                {(() => {
                                  const coords = getRadialLineCoords(inspireEndTime);
                                  return coords ? (
                                    <line
                                      x1="10"
                                      y1="10"
                                      x2={coords.x2}
                                      y2={coords.y2}
                                      stroke="#ffffff"
                                      strokeWidth="0.8"
                                    />
                                  ) : null;
                                })()}
                              </svg>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Render Additional Soldier for Sage */}
                      {isAdditionalSoldier && (
                        <div
                          className={`friendly-portrait-unit ${copActive ? 'pulse-dim' : ''}`}
                          style={{
                            width: '80%',
                            height: '80%',
                            borderRadius: '8px',
                            border: '2px solid #2a9d8f',
                            backgroundColor: '#222',
                            backgroundImage: `url(${soldier})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 8,
                            pointerEvents: 'none'
                          }}
                        >
                          {copActive && (
                            <div
                              className={copFading ? 'effect-icon-fading' : 'effect-icon-active'}
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#111',
                                border: '2px solid #00bfff',
                                backgroundImage: `url(${shielded_partial})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                zIndex: 15,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                              }}
                            >
                              <svg
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  transform: 'rotate(-90deg)',
                                  pointerEvents: 'none'
                                }}
                                viewBox="0 0 20 20"
                              >
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="5"
                                  fill="none"
                                  stroke="rgba(0, 0, 0, 0.35)"
                                  strokeWidth="10"
                                  strokeDasharray="31.42"
                                  strokeDashoffset={getCopDashOffset()}
                                />
                                {(() => {
                                  const coords = getRadialLineCoords(copEndTime);
                                  return coords ? (
                                    <line
                                      x1="10"
                                      y1="10"
                                      x2={coords.x2}
                                      y2={coords.y2}
                                      stroke="#ffffff"
                                      strokeWidth="0.8"
                                    />
                                  ) : null;
                                })()}
                              </svg>
                            </div>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            width: '100%',
                            background: 'rgba(0,0,0,0.75)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            padding: '1px 0',
                            borderBottomLeftRadius: '6px',
                            borderBottomRightRadius: '6px'
                          }}>
                            Soldier
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ))}

              {/* --- Sage Circle of Protection (COP) Ring Overlay --- */}
              {selectedFighterId === 'sage' && copActive && (
                <div
                  className={copFading ? 'effect-icon-fading' : 'effect-icon-active'}
                  style={{
                    position: 'absolute',
                    width: `${TILE_PCT * 4}%`,
                    height: `${TILE_PCT * 4}%`,
                    left: `${fighterPos.col * TILE_PCT - TILE_PCT * 1.5}%`,
                    top: `${fighterPos.row * TILE_PCT - TILE_PCT * 1.5}%`,
                    zIndex: 7,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Outer ring with glow */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '5px solid rgba(0, 191, 255, 0.75)',
                    boxShadow: '0 0 35px rgba(0, 191, 255, 0.45), inset 0 0 35px rgba(0, 191, 255, 0.15)',
                    position: 'relative',
                    animation: 'spin-slow 20s linear infinite',
                  }}>
                    {/* Rune characters around the inside */}
                    {['\u16A0', '\u16A2', '\u16A6', '\u16A8', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                      const angle = (i / 12) * 360;
                      const radius = 42;
                      const rad = (angle - 90) * (Math.PI / 180);
                      return (
                        <span
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${50 + radius * Math.cos(rad)}%`,
                            top: `${50 + radius * Math.sin(rad)}%`,
                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                            color: 'rgba(0, 191, 255, 0.85)',
                            fontSize: '22px',
                            textShadow: '0 0 10px rgba(0, 191, 255, 1)',
                            userSelect: 'none',
                          }}
                        >
                          {rune}
                        </span>
                      );
                    })}
                    {/* Inner circle accent */}
                    <div style={{
                      position: 'absolute',
                      top: '15%',
                      left: '15%',
                      width: '70%',
                      height: '70%',
                      borderRadius: '50%',
                      border: '1px solid rgba(0, 191, 255, 0.2)',
                    }} />
                  </div>
                </div>
              )}

              {/* --- Dragon Dispel Demo: Sage Circle of Protection (COP) Ring Overlay --- */}
              {selectedUnitType === 'monster' && selectedMonsterId === 'dragon' && dragonDispellSageCopActive && (
                <div
                  className="effect-icon-active"
                  style={{
                    position: 'absolute',
                    width: `${TILE_PCT * 4}%`,
                    height: `${TILE_PCT * 4}%`,
                    left: `${sagePos.col * TILE_PCT - TILE_PCT * 1.5}%`,
                    top: `${sagePos.row * TILE_PCT - TILE_PCT * 1.5}%`,
                    zIndex: 7,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Outer ring with glow */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '5px solid rgba(0, 191, 255, 0.75)',
                    boxShadow: '0 0 35px rgba(0, 191, 255, 0.45), inset 0 0 35px rgba(0, 191, 255, 0.15)',
                    position: 'relative',
                    animation: 'spin-slow 20s linear infinite',
                  }}>
                    {/* Rune characters around the inside */}
                    {['\u16A0', '\u16A2', '\u16A6', '\u16A8', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                      const angle = (i / 12) * 360;
                      const radius = 42;
                      const rad = (angle - 90) * (Math.PI / 180);
                      return (
                        <span
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${50 + radius * Math.cos(rad)}%`,
                            top: `${50 + radius * Math.sin(rad)}%`,
                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                            color: 'rgba(0, 191, 255, 0.85)',
                            fontSize: '22px',
                            textShadow: '0 0 10px rgba(0, 191, 255, 1)',
                            userSelect: 'none',
                          }}
                        >
                          {rune}
                        </span>
                      );
                    })}
                    {/* Inner circle accent */}
                    <div style={{
                      position: 'absolute',
                      top: '15%',
                      left: '15%',
                      width: '70%',
                      height: '70%',
                      borderRadius: '50%',
                      border: '1px solid rgba(0, 191, 255, 0.2)',
                    }} />
                  </div>
                </div>
              )}

              {/* --- Dragon Dispel Wave Overlay --- */}
              {selectedUnitType === 'monster' && selectedMonsterId === 'dragon' && dragonDispellWaveActive && (
                <div className="dragon-dispel-wave" />
              )}

              {/* --- Djinn Arcane Barrier Ring Overlay --- */}
              {selectedMonsterId === 'djinn' && djinnArcaneBarrierActive && (
                <div
                  className={djinnArcaneBarrierFading ? 'effect-icon-fading' : 'effect-icon-active'}
                  style={{
                    position: 'absolute',
                    width: `${TILE_PCT * 2}%`,
                    height: `${TILE_PCT * 2}%`,
                    left: `${(fighterPos.col >= 3 ? fighterPos.col - 1 : fighterPos.col) * TILE_PCT}%`,
                    top: `${(fighterPos.row - 1) * TILE_PCT}%`,
                    zIndex: 11,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Outer ring with glow */}
                  <div style={{
                    width: '90%',
                    height: '90%',
                    borderRadius: '50%',
                    border: '3px solid rgba(255, 84, 0, 0.85)',
                    boxShadow: '0 0 25px rgba(255, 84, 0, 0.7), inset 0 0 15px rgba(255, 84, 0, 0.4)',
                    position: 'relative',
                    animation: 'spin-slow 20s linear infinite',
                  }}>
                    {/* Rune characters around the inside */}
                    {['\u16A0', '\u16A2', '\u16A6', '\u16A8', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                      const angle = (i / 12) * 360;
                      const radius = 42;
                      const rad = (angle - 90) * (Math.PI / 180);
                      return (
                        <span
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${50 + radius * Math.cos(rad)}%`,
                            top: `${50 + radius * Math.sin(rad)}%`,
                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                            color: 'rgba(255, 84, 0, 0.95)',
                            fontSize: '16px',
                            textShadow: '0 0 8px rgba(255, 84, 0, 1)',
                            userSelect: 'none',
                          }}
                        >
                          {rune}
                        </span>
                      );
                    })}
                    {/* Inner circle accent */}
                    <div style={{
                      position: 'absolute',
                      top: '15%',
                      left: '15%',
                      width: '70%',
                      height: '70%',
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 84, 0, 0.3)',
                    }} />
                  </div>
                </div>
              )}

              {/* --- Attacker Portrait Overlay --- */}
              <div
                style={{
                  position: 'absolute',
                  width: `${TILE_PCT * getUnitSizeFactor(isFighterHuge, isFighterLarge)}%`,
                  height: `${TILE_PCT * getUnitSizeFactor(isFighterHuge, isFighterLarge)}%`,
                  left: `${getUnitLeftTileCol(fighterPos.col, isFighterHuge, isFighterLarge) * TILE_PCT}%`,
                  top: `${getUnitTopTileRow(fighterPos.row, isFighterHuge, isFighterLarge) * TILE_PCT}%`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  pointerEvents: 'none',
                  transform: getFighterTransformStyle(),
                  opacity: (animationPhase === 'astral_projection' || animationPhase === 'astral_projection_delay')
                    ? 0.4
                    : (selfBuffEffect === 'stealth' ? 0.3 : 1),
                  transition: getFighterTransitionStyle()
                }}
              >
                {selectedFighterId === 'soldier' && oneManArmyActive && [
                  { x: -18, y: -18 },
                  { x: 18, y: -12 },
                  { x: -22, y: 14 },
                  { x: 22, y: 18 },
                  { x: 0, y: -24 }
                ].map((offset, idx) => (
                  <div
                    key={`oma-copy-${idx}`}
                    style={{
                      position: 'absolute',
                      left: `calc(10% + ${offset.x}px)`,
                      top: `calc(10% + ${offset.y}px)`,
                      width: '80%',
                      height: '80%',
                      borderRadius: '8px',
                      border: '2px solid #ffb703',
                      backgroundColor: '#222',
                      backgroundImage: `url(${selectedFighter.portrait})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.75,
                      pointerEvents: 'none',
                      zIndex: 9
                    }}
                  />
                ))}
                <div
                  className={`${selectedFighterId === 'soldier' && shieldWallActive ? 'shield-wall-active-portrait' : ''} ${selectedFighterId === 'sage' && copActive ? 'pulse-bright' : ''}`}
                  style={{
                    width: '80%',
                    height: '80%',
                    borderRadius: '8px',
                    border: (selectedFighterId === 'soldier' && defensiveStanceActive)
                      ? '3px solid #ffffff'
                      : (selectedFighterId === 'barbarian' && berserkerActive)
                        ? '2px solid #ff3333'
                        : '2px solid #ffb703',
                    backgroundColor: '#222',
                    backgroundImage: `url(${(selectedUnitType === 'monster' && selectedMonsterId === 'skeleton' && skeletonReassemblyActive)
                      ? bones
                      : selectedFighter.portrait
                      })`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: (selectedUnitType === 'fighter' ? fighterHexed : monsterHexed)
                      ? '0 0 15px 5px rgba(255, 0, 255, 0.8), inset 0 0 10px rgba(255, 0, 255, 0.5)'
                      : (selectedFighterId === 'soldier' && defensiveStanceActive)
                        ? '0 0 12px 3px rgba(255, 255, 255, 0.9), inset 0 0 8px rgba(255, 255, 255, 0.5)'
                        : (selectedFighterId === 'soldier' && shieldWallActive)
                          ? undefined
                          : (selectedFighterId === 'barbarian' && berserkerActive)
                            ? 'none'
                            : selfBuffEffect === 'rage'
                              ? '0 0 20px rgba(255, 0, 0, 0.7), inset 0 0 10px rgba(255, 0, 0, 0.5)'
                              : selfBuffEffect === 'barrier'
                                ? '0 0 20px rgba(0, 150, 255, 0.7), inset 0 0 10px rgba(0, 150, 255, 0.5)'
                                : '0 8px 16px rgba(0,0,0,0.5)',
                    animation: (selectedFighterId === 'barbarian' && animationPhase === 'leap_landing')
                      ? 'leapScale 0.6s ease-in-out forwards'
                      : (selectedMonsterId === 'ogre' && animationPhase === 'stomp_animation')
                        ? 'stompScale 0.8s ease-in-out forwards'
                        : (selectedFighterId === 'barbarian' && berserkerActive)
                          ? 'pulseRedIntense 1.0s infinite alternate'
                          : 'none',
                    position: 'relative',
                    opacity: (selectedUnitType === 'monster' && selectedMonsterId === 'vampire' && vampireHidden) ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out'
                  }}>
                  {/* Troll HP Bar */}
                  {selectedUnitType === 'monster' && selectedMonsterId === 'troll' && (
                    <div style={{ position: 'absolute', top: '-15px', left: '0', width: '100%', height: '6px', backgroundColor: '#333', border: '1px solid #111', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${trollHpPct}%`, height: '100%', backgroundColor: '#2ecc71', transition: 'width 0.5s ease-out' }} />
                    </div>
                  )}
                  {/* Skeleton Reassembly Hourglass Overlay */}
                  {selectedUnitType === 'monster' && selectedMonsterId === 'skeleton' && skeletonReassemblyActive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#111',
                        border: '2px solid #8a2be2',
                        backgroundImage: `url(${duration_icon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        zIndex: 15,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                      }}
                    >
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          pointerEvents: 'none'
                        }}
                        viewBox="0 0 20 20"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="5"
                          fill="none"
                          stroke="rgba(0, 0, 0, 0.55)"
                          strokeWidth="10"
                          strokeDasharray="31.42"
                          strokeDashoffset={getSkeletonReassemblyHourglassDashOffset()}
                        />
                      </svg>
                    </div>
                  )}

                  {/* Djinn Arcane Barrier Status Effect Overlay */}
                  {selectedUnitType === 'monster' && selectedMonsterId === 'djinn' && djinnArcaneBarrierActive && (
                    <div
                      className={djinnArcaneBarrierFading ? 'effect-icon-fading' : 'effect-icon-active'}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#111',
                        border: '2px solid #ff5400',
                        backgroundImage: `url(${arcane_barrier})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        zIndex: 15,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                      }}
                    >
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          pointerEvents: 'none'
                        }}
                        viewBox="0 0 20 20"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="5"
                          fill="none"
                          stroke="rgba(0, 0, 0, 0.55)"
                          strokeWidth="10"
                          strokeDasharray="31.42"
                          strokeDashoffset={getDjinnArcaneBarrierDashOffset()}
                        />
                        {(() => {
                          const coords = getRadialLineCoords(djinnArcaneBarrierEndTime, 8000);
                          return coords ? (
                            <line
                              x1="10"
                              y1="10"
                              x2={coords.x2}
                              y2={coords.y2}
                              stroke="#ffffff"
                              strokeWidth="0.8"
                            />
                          ) : null;
                        })()}
                      </svg>
                    </div>
                  )}

                  {/* Monk Organic Glows */}
                  {selectedFighterId === 'monk' && monkTwinGlow && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      borderRadius: '6px',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}>
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        background: ['left', 'right'].includes(monkTwinGlow.direction)
                          ? 'linear-gradient(to right, rgba(255, 221, 87, 0) 25%, rgba(255, 221, 87, 0.95) 50%, rgba(255, 221, 87, 0) 75%)'
                          : 'linear-gradient(to bottom, rgba(255, 221, 87, 0) 25%, rgba(255, 221, 87, 0.95) 50%, rgba(255, 221, 87, 0) 75%)',
                        boxShadow: '0 0 15px #ffdd57',
                        animation: `monkGlowSwipe${monkTwinGlow.direction.charAt(0).toUpperCase() + monkTwinGlow.direction.slice(1)} 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`
                      }} />
                    </div>
                  )}
                  {selectedFighterId === 'monk' && etherealSpeedActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px', left: '-10px', right: '-10px', bottom: '-10px',
                      zIndex: -1,
                      border: '3px solid rgba(255, 221, 87, 0.95)',
                      boxShadow: '0 0 25px 8px #ffdd57, inset 0 0 12px 4px #ffdd57',
                      background: 'rgba(255, 221, 87, 0.15)',
                      borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                      animation: 'organicGlow 4s linear infinite',
                      opacity: etherealSpeedFading ? 0.3 : 1,
                      transition: 'opacity 0.3s ease-in-out',
                      pointerEvents: 'none'
                    }} />
                  )}
                  {selectedFighterId === 'monk' && innerFireActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-14px', left: '-14px', right: '-14px', bottom: '-14px',
                      zIndex: -2,
                      border: '3px solid rgba(255, 84, 0, 0.95)',
                      boxShadow: '0 0 35px 12px #ff5400, inset 0 0 18px 6px #ff5400',
                      background: 'rgba(255, 84, 0, 0.15)',
                      borderRadius: '40% 60% 50% 50% / 40% 40% 60% 60%',
                      animation: 'organicGlowRev 3.5s linear infinite',
                      opacity: innerFireFading ? 0.3 : 1,
                      transition: 'opacity 0.3s ease-in-out',
                      pointerEvents: 'none'
                    }} />
                  )}
                  {(() => {
                    if (selectedFighterId !== 'monk') return null;
                    const activeMonkEffects = [];
                    if (etherealSpeedActive) activeMonkEffects.push({ key: 'ethereal', icon: monk_ethereal_speed, border: '#ffdd57', getOffset: getEtherealSpeedDashOffset, endTime: etherealSpeedEndTime, fading: etherealSpeedFading });
                    if (innerFireActive) activeMonkEffects.push({ key: 'inner_fire', icon: monk_inner_fire, border: '#ff5400', getOffset: getInnerFireDashOffset, endTime: innerFireEndTime, fading: innerFireFading });
                    if (astralModeActive) activeMonkEffects.push({ key: 'astral_mode', icon: monk_astral_being, border: '#21e6c1', getOffset: getAstralModeDashOffset, endTime: astralModeEndTime, fading: astralModeFading });
                    if (thirdEyeActive) activeMonkEffects.push({ key: 'third_eye', icon: monk_third_eye, border: '#21e6c1', getOffset: getThirdEyeDashOffset, endTime: thirdEyeEndTime, fading: thirdEyeFading });

                    return activeMonkEffects.map((eff, index) => (
                      <div
                        key={eff.key}
                        className={eff.fading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: `${-6 + index * 22}px`,
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: `2px solid ${eff.border}`,
                          backgroundImage: `url("${eff.icon}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          zIndex: 15,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'visible'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.35)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={eff.getOffset()}
                          />
                          {(() => {
                            const isMultiDur = ['astral_mode'].includes(eff.key);
                            const coords = isMultiDur
                              ? getRadialLineCoords(eff.endTime, 6000, 3000)
                              : getRadialLineCoords(eff.endTime, eff.key === 'third_eye' ? 4000 : 8000);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                      </div>
                    ));
                  })()}

                  {/* Monk Meditate Animation overlays */}
                  {selectedFighterId === 'monk' && meditateAnimActive && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      borderRadius: '6px',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      zIndex: 5,
                      background: 'rgba(255, 221, 87, 0.05)'
                    }}>
                      <div className="yellow-ray" style={{ left: '15%', width: '15%', height: '80%', animationDelay: '0s' }} />
                      <div className="yellow-ray" style={{ left: '45%', width: '20%', height: '100%', animationDelay: '0.2s' }} />
                      <div className="yellow-ray" style={{ left: '75%', width: '12%', height: '70%', animationDelay: '0.4s' }} />
                    </div>
                  )}
                  {selectedFighterId === 'monk' && meditateAnimActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '2px solid #ffdd57',
                      backgroundImage: `url("${monk_meditate}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 0 10px #ffdd57',
                      zIndex: 20,
                      animation: 'hoverFloat 2s ease-in-out forwards'
                    }} />
                  )}

                  {selectedFighterId === 'sage' && sagePerceiveInstanceActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '2px solid #ff007f',
                      backgroundImage: `url("${perceive}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 0 10px #ff007f',
                      zIndex: 20,
                      animation: 'hoverFloat 2s ease-in-out forwards'
                    }} />
                  )}

                  {/* Monk Astral Focus Animation overlays */}
                  {selectedFighterId === 'monk' && astralFocusAnimActive && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      borderRadius: '6px',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      zIndex: 5,
                      background: 'rgba(33, 230, 193, 0.05)'
                    }}>
                      <div className="teal-ray" style={{ left: '15%', width: '15%', height: '80%', animationDelay: '0s' }} />
                      <div className="teal-ray" style={{ left: '45%', width: '20%', height: '100%', animationDelay: '0.2s' }} />
                      <div className="teal-ray" style={{ left: '75%', width: '12%', height: '70%', animationDelay: '0.4s' }} />
                    </div>
                  )}
                  {selectedFighterId === 'monk' && astralFocusAnimActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-15px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '30px',
                      height: '30px',
                      borderRadius: '4px',
                      border: '2px solid #21e6c1',
                      backgroundImage: `url("${monk_astral_focus}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 0 10px #21e6c1',
                      zIndex: 20,
                      animation: 'astralFocusFloat 4s ease-in-out forwards'
                    }} />
                  )}
                  {selectedFighterId === 'sage' && copActive && (
                    <div
                      className={copFading ? 'effect-icon-fading' : 'effect-icon-active'}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#111',
                        border: '2px solid #00bfff',
                        backgroundImage: `url("${shielded}")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        zIndex: 15,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                      }}
                    >
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          pointerEvents: 'none'
                        }}
                        viewBox="0 0 20 20"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="5"
                          fill="none"
                          stroke="rgba(0, 0, 0, 0.35)"
                          strokeWidth="10"
                          strokeDasharray="31.42"
                          strokeDashoffset={getCopDashOffset()}
                        />
                        {(() => {
                          const coords = getRadialLineCoords(copEndTime);
                          return coords ? (
                            <line
                              x1="10"
                              y1="10"
                              x2={coords.x2}
                              y2={coords.y2}
                              stroke="#ffffff"
                              strokeWidth="0.8"
                            />
                          ) : null;
                        })()}
                      </svg>
                    </div>
                  )}
                  {selectedFighterId === 'soldier' && defensiveStanceActive && (
                    <div
                      className={defensiveStanceFading ? 'effect-icon-fading' : 'effect-icon-active'}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#111',
                        border: '2px solid #3b82f6',
                        backgroundImage: `url("${soldier_defense_stance_mini_icon}")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        zIndex: 15,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                      }}
                    >
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          pointerEvents: 'none'
                        }}
                        viewBox="0 0 20 20"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="5"
                          fill="none"
                          stroke="rgba(0, 0, 0, 0.35)"
                          strokeWidth="10"
                          strokeDasharray="31.42"
                          strokeDashoffset={getDefensiveStanceDashOffset()}
                        />
                        {(() => {
                          const coords = getRadialLineCoords(defensiveStanceEndTime);
                          return coords ? (
                            <line
                              x1="10"
                              y1="10"
                              x2={coords.x2}
                              y2={coords.y2}
                              stroke="#ffffff"
                              strokeWidth="0.8"
                            />
                          ) : null;
                        })()}
                      </svg>
                    </div>
                  )}
                  {selectedFighterId === 'barbarian' && berserkerActive && (
                    <div
                      className={berserkerFading ? 'effect-icon-fading' : 'effect-icon-active'}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#111',
                        border: '2px solid #ff3333',
                        backgroundImage: `url("${barbarian_berserker}")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        zIndex: 15,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                      }}
                    >
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          pointerEvents: 'none'
                        }}
                        viewBox="0 0 20 20"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="5"
                          fill="none"
                          stroke="rgba(0, 0, 0, 0.35)"
                          strokeWidth="10"
                          strokeDasharray="31.42"
                          strokeDashoffset={getBerserkerDashOffset()}
                        />
                        {(() => {
                          const coords = getRadialLineCoords(berserkerEndTime);
                          return coords ? (
                            <line
                              x1="10"
                              y1="10"
                              x2={coords.x2}
                              y2={coords.y2}
                              stroke="#ffffff"
                              strokeWidth="0.8"
                            />
                          ) : null;
                        })()}
                      </svg>
                    </div>
                  )}
                  {((selectedUnitType === 'fighter' ? fighterHexed : monsterHexed)) && (() => {
                    const endTime = selectedUnitType === 'fighter' ? fighterHexEndTime : monsterHexEndTime;
                    const fading = selectedUnitType === 'fighter' ? fighterHexedFading : monsterHexedFading;
                    return (
                      <div
                        className={fading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          position: 'absolute',
                          top: '18px',
                          right: '-6px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #cc44ff',
                          backgroundImage: `url("${hex?.default || hex}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          zIndex: 15,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'hidden'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.35)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getHexDashOffset(endTime)}
                          />
                          {(() => {
                            const coords = getRadialLineCoords(endTime, 16000);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                      </div>
                    );
                  })()}
                  {selectedFighterId === 'ranger' && notchedArrow && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      left: '-6px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#111',
                      border: '2px solid #ffb703',
                      backgroundImage: `url("${notchedArrow === 'ice' ? ranger_ice_arrow :
                        notchedArrow === 'force' ? ranger_force_arrow :
                          notchedArrow === 'poison' ? ranger_poison_arrow :
                            ranger_celestial_arrow
                        }")`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      zIndex: 15,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      animation: 'scaleUp 0.2s ease-out'
                    }} />
                  )}

                  {/* Vampire Crimson Sight instance icon */}
                  {selectedUnitType === 'monster' && selectedMonsterId === 'vampire' && vampireCrimsonSightActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '2px solid #ff3333',
                      backgroundImage: `url("${crimson_sight}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 0 10px #ff3333',
                      zIndex: 20,
                      opacity: vampireCrimsonSightFading ? 0 : 1,
                      transition: 'opacity 0.3s ease-in-out',
                      animation: 'hoverFloatLoop 2s ease-in-out infinite'
                    }} />
                  )}

                  {/* Vampire Bat Fly instance icon */}
                  {selectedUnitType === 'monster' && selectedMonsterId === 'vampire' && vampireBatFlyActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '2px solid #ffb703',
                      backgroundImage: `url("${bat_fly}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 0 10px #ffb703',
                      zIndex: 20,
                      opacity: vampireBatFlyFading ? 0 : 1,
                      transition: 'opacity 0.3s ease-in-out',
                      animation: 'hoverFloatLoop 2s ease-in-out infinite'
                    }} />
                  )}

                  {/* Dragon Dispel casting instance icon */}
                  {selectedUnitType === 'monster' && selectedMonsterId === 'dragon' && dragonDispellSageCopActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '2px solid #9b5de5',
                      backgroundImage: `url("${dispell}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 0 10px #9b5de5',
                      zIndex: 20,
                      animation: 'hoverFloatLoop 2s ease-in-out infinite'
                    }} />
                  )}

                  {/* Name Tag */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    width: '100%',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    padding: '2px 0',
                    borderBottomLeftRadius: '6px',
                    borderBottomRightRadius: '6px'
                  }}>
                    {selectedFighter.name}
                  </div>
                </div>
              </div>

              {/* --- Target Portrait Overlay --- */}
              <div
                style={{
                  position: 'absolute',
                  width: `${TILE_PCT * getUnitSizeFactor(isTargetHuge, isTargetLarge)}%`,
                  height: `${TILE_PCT * getUnitSizeFactor(isTargetHuge, isTargetLarge)}%`,
                  left: `${getUnitLeftTileCol(targetPos.col, isTargetHuge, isTargetLarge) * TILE_PCT}%`,
                  top: `${getUnitTopTileRow(targetPos.row, isTargetHuge, isTargetLarge) * TILE_PCT}%`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9,
                  pointerEvents: 'none',
                  transform: (() => {
                    if (!targetPushback) return 'none';
                    if (isTargetLarge) {
                      const match = targetPushback.match(/translate\(([-\d.]+)%,\s*([-\d.]+)%\)/);
                      if (match) {
                        const x = parseFloat(match[1]);
                        const y = parseFloat(match[2]);
                        return `translate(${x * 0.5}%, ${y * 0.5}%)`;
                      }
                    }
                    return targetPushback;
                  })(),
                  transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
              >
                <div style={{
                  width: '80%',
                  height: '80%',
                  borderRadius: '8px',
                  border: djinnBindActive
                    ? '3px solid #b388ff'
                    : (innerFireActive && targetFlash)
                      ? '3px solid #ff5400'
                      : targetFlash
                        ? (targetName === 'Soldier Target' ? '3px solid #ffea00' : '3px solid #ff4d4d')
                        : (targetName === 'Soldier Target' ? '2px solid #ffb703' : '2px solid #ff5400'),
                  backgroundColor: (innerFireActive && targetFlash)
                    ? '#cc4400'
                    : targetFlash
                      ? (targetName === 'Soldier Target' ? 'rgba(255, 183, 3, 0.3)' : '#990000')
                      : '#222',
                  backgroundImage: `url("${targetPortrait}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: targetFrozen ? 'brightness(0.85) saturate(0.6)' : targetAsleep ? 'brightness(0.65) saturate(0.4) contrast(0.9)' : 'none',
                  boxShadow: (selectedUnitType === 'monster' ? fighterHexed : monsterHexed)
                    ? '0 0 15px 5px rgba(255, 0, 255, 0.8), inset 0 0 10px rgba(255, 0, 255, 0.5)'
                    : djinnBindActive
                      ? '0 0 18px 4px rgba(179, 136, 255, 0.85), inset 0 0 10px rgba(179, 136, 255, 0.4)'
                      : (innerFireActive && targetFlash)
                        ? '0 0 24px 8px rgba(255, 84, 0, 0.95), inset 0 0 12px rgba(255, 84, 0, 0.8)'
                        : '0 8px 16px rgba(0,0,0,0.5)',
                  position: 'relative',
                  transform: targetShake ? 'translate(5px, 2px) rotate(2deg)' : 'none',
                  transition: 'transform 0.05s',
                  animation: targetDisintegrating
                    ? 'disintegrateShake 2.2s linear forwards'
                    : targetStunned
                      ? 'stunWobble 0.6s ease-in-out infinite'
                      : 'none'
                }}>
                  {djinnBindActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0, top: 0, width: '100%', height: '100%',
                      pointerEvents: 'none',
                      zIndex: 13,
                    }}>
                      <svg style={{
                        position: 'absolute',
                        left: 0, top: 0, width: '100%', height: '100%',
                      }} viewBox="0 0 100 100">
                        <path d="M 10,25 C 30,15 70,35 90,25 M 5,50 C 25,65 75,35 95,50 M 10,75 C 30,65 70,85 90,75 M 20,10 C 10,40 40,60 30,90 M 80,10 C 90,40 60,60 70,90" 
                              fill="none" 
                              stroke="#ffffff" 
                              strokeWidth="5" 
                              strokeLinecap="round"
                              style={{ 
                                  filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8)) drop-shadow(0 0 2px rgba(0,0,0,0.8))',
                                  strokeDasharray: '300',
                                  strokeDashoffset: '300',
                                  animation: 'drawRopes 0.8s ease-out forwards'
                              }} 
                        />
                      </svg>
                    </div>
                  )}

                  {/* Djinn Death Missile Hit instance icon */}
                  {djinnDeathMissileHitActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-21px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '42px',
                      height: '42px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundImage: `url("${death_missile_hit}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: 'none',
                      zIndex: 20,
                      animation: 'heartbeatPulse 0.9s infinite ease-in-out'
                    }} />
                  )}

                  {targetStunned && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60px',
                      height: '20px',
                      pointerEvents: 'none',
                      zIndex: 35,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {/* Tilted Ellipse Ring */}
                      <div style={{
                        position: 'absolute',
                        width: '50px',
                        height: '12px',
                        borderRadius: '50%',
                        border: '1.2px dashed rgba(255, 221, 87, 0.45)',
                        boxShadow: '0 0 4px rgba(255, 221, 87, 0.15)',
                        pointerEvents: 'none'
                      }} />
                      {/* Orbiting Star 1 */}
                      <div style={{
                        position: 'absolute',
                        fontSize: '12px',
                        color: '#ffe600',
                        textShadow: '0 0 5px #ffe600',
                        animation: 'birdieOrbit1 1.6s linear infinite',
                        fontWeight: 'bold',
                        userSelect: 'none'
                      }}>
                        ✦
                      </div>
                      {/* Orbiting Star 2 */}
                      <div style={{
                        position: 'absolute',
                        fontSize: '12px',
                        color: '#ffdd57',
                        textShadow: '0 0 5px #ffdd57',
                        animation: 'birdieOrbit2 1.6s linear infinite',
                        fontWeight: 'bold',
                        userSelect: 'none'
                      }}>
                        ✦
                      </div>
                    </div>
                  )}
                  {targetConfused && (
                    <div style={{
                      position: 'absolute',
                      top: '-15px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60px',
                      height: '20px',
                      pointerEvents: 'none',
                      zIndex: 30,
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '4px'
                    }}>
                      {/* Swirling Star 1 */}
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ffe600',
                        boxShadow: '0 0 8px #ffe600',
                        animation: 'dizzySpin 1.2s linear infinite'
                      }} />
                      {/* Swirling Star 2 */}
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ffdd57',
                        boxShadow: '0 0 8px #ffdd57',
                        animation: 'dizzySpin 1.2s linear infinite 0.4s'
                      }} />
                      {/* Swirling Star 3 */}
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ffb703',
                        boxShadow: '0 0 8px #ffb703',
                        animation: 'dizzySpin 1.2s linear infinite 0.8s'
                      }} />
                    </div>
                  )}
                  {targetAsleep && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      pointerEvents: 'none',
                      zIndex: 20
                    }}>
                      <div style={{ position: 'absolute', right: '15%', top: '20%', color: '#90caf9', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>Z</div>
                      <div style={{ position: 'absolute', right: '35%', top: '30%', color: '#90caf9', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite 0.6s', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>Z</div>
                      <div style={{ position: 'absolute', right: '22%', top: '42%', color: '#42a5f5', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite 1.2s', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>Z</div>
                    </div>
                  )}
                  {/* Status Effect Icons Container */}
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    display: 'flex',
                    flexDirection: 'row-reverse',
                    gap: '2px',
                    zIndex: 15
                  }}>
                    {djinnBindActive && (
                      <div
                        className={djinnBindFading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #b388ff',
                          backgroundImage: `url("${bind}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.45)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getDjinnBindDashOffset()}
                          />
                        </svg>
                      </div>
                    )}
                    {targetFeared && (
                      <div
                        className={fearFading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #8e2de2',
                          backgroundImage: `url("${induce_fear}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.45)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getFearDashOffset()}
                          />
                          {(() => {
                            const coords = getRadialLineCoords(fearEndTime, 8000);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                      </div>
                    )}
                    {(selectedUnitType === 'monster' ? fighterHexed : monsterHexed) && (() => {
                      const endTime = selectedUnitType === 'monster' ? fighterHexEndTime : monsterHexEndTime;
                      const fading = selectedUnitType === 'monster' ? fighterHexedFading : monsterHexedFading;
                      return (
                        <div
                          className={fading ? 'effect-icon-fading' : 'effect-icon-active'}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#111',
                            border: '2px solid #cc44ff',
                            backgroundImage: `url("${hex?.default || hex}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              transform: 'rotate(-90deg)',
                              pointerEvents: 'none'
                            }}
                            viewBox="0 0 20 20"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="5"
                              fill="none"
                              stroke="rgba(0, 0, 0, 0.45)"
                              strokeWidth="10"
                              strokeDasharray="31.42"
                              strokeDashoffset={getHexDashOffset(endTime)}
                            />
                            {(() => {
                              const coords = getRadialLineCoords(endTime, 16000);
                              return coords ? (
                                <line
                                  x1="10"
                                  y1="10"
                                  x2={coords.x2}
                                  y2={coords.y2}
                                  stroke="#ffffff"
                                  strokeWidth="0.8"
                                />
                              ) : null;
                            })()}
                          </svg>
                        </div>
                      );
                    })()}
                    {targetEnsnared && (
                      <div
                        className={targetEnsnaredFading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #8bc34a',
                          backgroundImage: `url("${ranger_ensnare}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.45)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getEnsnareDashOffset()}
                          />
                          {(() => {
                            const coords = getRadialLineCoords(ensnareEndTime, 3000);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                      </div>
                    )}
                    {targetBleeding && (
                      <div
                        className={bleedFading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #ff3333',
                          backgroundImage: `url("${bleeding}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.45)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getBleedDashOffset()}
                          />
                          {(() => {
                            const coords = getRadialLineCoords(bleedEndTime, 4000);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                      </div>
                    )}
                    {targetPoisoned && (
                      <div
                        className={poisonFading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #38b000',
                          backgroundImage: `url("${poison}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'visible',
                          position: 'relative'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.4)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getPoisonDashOffset()}
                          />
                          {(() => {
                            const coords = getRadialLineCoords(poisonEndTime, poisonDuration, poisonSingleDuration);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                        {/* Poison stack badge */}
                        {(() => {
                          const remaining = Math.max(0, poisonEndTime - currentTime);
                          const stacks = Math.ceil(remaining / (poisonSingleDuration || 8000));
                          return stacks > 1 ? (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '-4px',
                                left: '-8px',
                                background: '#38b000',
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                width: '12px',
                                height: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #111',
                                zIndex: 10
                              }}
                            >
                              {stacks}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {frozenIconActive && (
                      <div
                        className={frozenFading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #00bfff',
                          backgroundImage: `url("${frozen}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'visible',
                          position: 'relative'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.45)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getFrozenDashOffset()}
                          />
                          {(() => {
                            const coords = getRadialLineCoords(frozenEndTime, frozenDuration, frozenSingleDuration);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                        {/* Frozen stack badge */}
                        {(() => {
                          const remaining = Math.max(0, frozenEndTime - currentTime);
                          const stacks = Math.ceil(remaining / (frozenSingleDuration || 2000));
                          return stacks > 1 ? (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '-4px',
                                left: '-8px',
                                background: '#00bfff',
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                width: '12px',
                                height: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #111',
                                zIndex: 10
                              }}
                            >
                              {stacks}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {sleepIconActive && (
                      <div
                        className="effect-icon-active"
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #90caf9',
                          backgroundImage: `url("${wizard_sleep}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.45)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getSleepDashOffset()}
                          />
                          {(() => {
                            const coords = getRadialLineCoords(sleepEndTime, 8000);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                      </div>
                    )}
                    {sagePerceiveActive && targetName !== 'Soldier Target' && (
                      <div
                        className={sagePerceiveFading ? 'effect-icon-fading' : 'effect-icon-active'}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: '2px solid #ff007f',
                          backgroundImage: `url("${weakness_doubled}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          overflow: 'visible',
                          position: 'relative'
                        }}
                      >
                        <svg
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 20 20"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="5"
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.4)"
                            strokeWidth="10"
                            strokeDasharray="31.42"
                            strokeDashoffset={getPerceiveDashOffset()}
                          />
                          {(() => {
                            const coords = getRadialLineCoords(sagePerceiveEndTime, sagePerceiveDuration, sagePerceiveSingleDuration);
                            return coords ? (
                              <line
                                x1="10"
                                y1="10"
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="#ffffff"
                                strokeWidth="0.8"
                              />
                            ) : null;
                          })()}
                        </svg>
                        <div style={{
                          position: 'absolute',
                          bottom: '-4px',
                          left: '-8px',
                          background: '#000',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          borderRadius: '50%',
                          width: '12px',
                          height: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #ff007f',
                          zIndex: 16
                        }}>
                          {(() => {
                            const remaining = Math.max(0, sagePerceiveEndTime - currentTime);
                            return Math.ceil(remaining / (sagePerceiveSingleDuration || 3000));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Mark Effect Icon with Timer Ring */}
                  {targetMarked && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        left: '-6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#111',
                        border: '2px solid #ff5400',
                        backgroundImage: `url("${ranger_mark}")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        zIndex: 15,
                        boxShadow: '0 0 6px rgba(255, 84, 0, 0.7)',
                        overflow: 'hidden'
                      }}
                    >
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          pointerEvents: 'none'
                        }}
                        viewBox="0 0 20 20"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="5"
                          fill="none"
                          stroke="rgba(0, 0, 0, 0.4)"
                          strokeWidth="10"
                          strokeDasharray="31.42"
                          strokeDashoffset={getMarkDashOffset()}
                        />
                        {(() => {
                          const coords = getRadialLineCoords(markEndTime, 8000);
                          return coords ? (
                            <line
                              x1="10"
                              y1="10"
                              x2={coords.x2}
                              y2={coords.y2}
                              stroke="#ffffff"
                              strokeWidth="0.8"
                            />
                          ) : null;
                        })()}
                      </svg>
                    </div>
                  )}

                  {/* Shielded Overlay for target (Soldier when under Sage protection) */}
                  {selectedFighterId === 'sage' && copActive && (
                    <div
                      className={copFading ? 'effect-icon-fading' : 'effect-icon-active'}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#111',
                        border: '2px solid #00bfff',
                        backgroundImage: `url("${shielded_partial}")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        zIndex: 15,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                      }}
                    >
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          pointerEvents: 'none'
                        }}
                        viewBox="0 0 20 20"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="5"
                          fill="none"
                          stroke="rgba(0, 0, 0, 0.35)"
                          strokeWidth="10"
                          strokeDasharray="31.42"
                          strokeDashoffset={getCopDashOffset()}
                        />
                        {(() => {
                          const coords = getRadialLineCoords(copEndTime);
                          return coords ? (
                            <line
                              x1="10"
                              y1="10"
                              x2={coords.x2}
                              y2={coords.y2}
                              stroke="#ffffff"
                              strokeWidth="0.8"
                            />
                          ) : null;
                        })()}
                      </svg>
                    </div>
                  )}
                  {/* Light Green Overlay/Glow for Healing */}
                  {selectedFighterId === 'sage' && (
                    <div style={{
                      boxSizing: 'border-box',
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(56, 176, 0, 0.15)',
                      border: '3px solid #38b000',
                      borderRadius: '6px',
                      boxShadow: '0 0 25px rgba(56, 176, 0, 0.8), inset 0 0 15px rgba(56, 176, 0, 0.5)',
                      opacity: targetHealGlow ? 1 : 0,
                      transition: 'opacity 0.3s ease-in-out',
                      pointerEvents: 'none',
                      zIndex: 14
                    }} />
                  )}
                  {/* Cyan Glow Overlay/Glow for Dispel */}
                  {selectedFighterId === 'sage' && (
                    <div style={{
                      boxSizing: 'border-box',
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0, 255, 255, 0.15)',
                      border: '3px solid #00ffff',
                      borderRadius: '6px',
                      boxShadow: '0 0 25px rgba(0, 255, 255, 0.8), inset 0 0 15px rgba(0, 255, 255, 0.5)',
                      opacity: targetDispelGlow ? 1 : 0,
                      transition: 'opacity 0.3s ease-in-out',
                      pointerEvents: 'none',
                      zIndex: 14
                    }} />
                  )}
                  {/* Frozen Overlay */}
                  {targetFrozen && (
                    <div style={{
                      boxSizing: 'border-box',
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.35), rgba(100, 200, 255, 0.2))',
                      border: '2px solid rgba(0, 191, 255, 0.8)',
                      borderRadius: '6px',
                      pointerEvents: 'none',
                      boxShadow: 'inset 0 0 15px rgba(0, 191, 255, 0.3)'
                    }}></div>
                  )}
                  {/* Poison Overlay (pulsing green glow) */}
                  {targetPoisoned && (
                    <div style={{
                      boxSizing: 'border-box',
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      borderRadius: '6px',
                      pointerEvents: 'none',
                      zIndex: 14,
                      animation: 'poisonPulseGlow 1.5s ease-in-out infinite alternate',
                      border: '2px solid rgba(56, 176, 0, 0.6)'
                    }} />
                  )}
                  {/* Dripping Acid Drops */}
                  {targetPoisoned && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      pointerEvents: 'none',
                      zIndex: 15,
                      overflow: 'hidden',
                      borderRadius: '6px'
                    }}>
                      <img
                        src={acid_drop}
                        alt="drip 1"
                        style={{
                          position: 'absolute',
                          left: '20%',
                          width: '10px',
                          height: '15px',
                          animation: 'acidDrip 2s linear infinite'
                        }}
                      />
                      <img
                        src={acid_drop}
                        alt="drip 2"
                        style={{
                          position: 'absolute',
                          left: '70%',
                          width: '8px',
                          height: '12px',
                          animation: 'acidDrip 2.4s linear infinite 0.7s'
                        }}
                      />
                      <img
                        src={acid_drop}
                        alt="drip 3"
                        style={{
                          position: 'absolute',
                          left: '45%',
                          width: '12px',
                          height: '18px',
                          animation: 'acidDrip 1.7s linear infinite 1.3s'
                        }}
                      />
                    </div>
                  )}
                  {/* Lightning Jagged Overlay */}
                  {lightningJagged && (
                    <div style={{
                      boxSizing: 'border-box',
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      pointerEvents: 'none',
                      zIndex: 14,
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          filter: 'drop-shadow(0 0 4px #00ffff) drop-shadow(0 0 8px #ffffff)'
                        }}
                        viewBox="0 0 100 100"
                      >
                        <polyline
                          points="30,0 20,40 50,35 25,75 45,70 15,100"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            animation: 'lightningFlash 0.15s ease-in-out infinite'
                          }}
                        />
                        <polyline
                          points="75,0 85,35 60,30 80,65 55,60 70,100"
                          fill="none"
                          stroke="#00ffff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            animation: 'lightningFlash 0.15s ease-in-out infinite 0.05s'
                          }}
                        />
                        <polyline
                          points="50,10 40,45 65,40 45,75 55,70 35,90"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            animation: 'lightningFlash 0.15s ease-in-out infinite 0.1s'
                          }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0, 255, 255, 0.25)',
                        animation: 'lightningBgFlash 0.12s ease-in-out infinite'
                      }} />
                    </div>
                  )}
                  {/* Mark Overlay */}
                  {targetMarked && (
                    <div style={{
                      position: 'absolute',
                      top: '-12.5%',
                      left: '-12.5%',
                      width: '125%',
                      height: '125%',
                      backgroundImage: `url("${ranger_mark}")`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      zIndex: 12,
                      animation: 'markPulse 1.5s infinite ease-in-out',
                      opacity: 0.25
                    }}></div>
                  )}
                  {/* Ensnare Visual Overlay – root/vine paralysis effect */}
                  {targetEnsnared && (
                    <div
                      className={targetEnsnaredFading ? 'effect-icon-fading' : 'effect-icon-active'}
                      style={{
                        boxSizing: 'border-box',
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        border: '3px solid #8bc34a',
                        borderRadius: '6px',
                        boxShadow: '0 0 18px rgba(139, 195, 74, 0.9), inset 0 0 10px rgba(139, 195, 74, 0.4)',
                        pointerEvents: 'none',
                        zIndex: 13
                      }}
                    >
                      {/* Root vine corners */}
                      {[
                        { left: 0, top: 0, borderRadius: '0 0 100% 0' },
                        { right: 0, top: 0, borderRadius: '0 0 0 100%' },
                        { left: 0, bottom: 0, borderRadius: '0 100% 0 0' },
                        { right: 0, bottom: 0, borderRadius: '100% 0 0 0' }
                      ].map((pos, i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          ...pos,
                          width: '18px', height: '18px',
                          border: '3.5px solid #558b2f',
                          boxShadow: '0 0 8px rgba(85,139,47,0.8)',
                          animation: `ensnarePulse 0.8s ease-in-out infinite ${i * 0.2}s`,
                          boxSizing: 'border-box'
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Energy Drain instance icon */}
                  {targetEnergyDrainActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '2px solid #ff00ff',
                      backgroundImage: `url("${energy_drain}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 0 10px #ff00ff',
                      zIndex: 20,
                      animation: 'hoverFloat 1.5s ease-in-out forwards'
                    }} />
                  )}

                  {/* Heartbeat instance icon for Vampire's Crimson Sight */}
                  {selectedUnitType === 'monster' && selectedMonsterId === 'vampire' && vampireCrimsonSightActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-21px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '42px',
                      height: '42px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundImage: `url("${heartbeat}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: 'none',
                      zIndex: 20,
                      opacity: vampireCrimsonSightFading ? 0 : 1,
                      transition: 'opacity 0.3s ease-in-out',
                      animation: 'heartbeatPulse 0.9s infinite ease-in-out'
                    }} />
                  )}

                  {/* Name Tag */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    width: '100%',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    padding: '2px 0',
                    borderBottomLeftRadius: '6px',
                    borderBottomRightRadius: '6px'
                  }}>
                    {targetName}
                  </div>
                </div>
              </div>

              {/* --- Extra Enemies for Sage --- */}
              {selectedFighterId === 'sage' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      width: `${TILE_PCT}%`,
                      height: `${TILE_PCT}%`,
                      left: `${4 * TILE_PCT}%`,
                      top: `${1 * TILE_PCT}%`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9,
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{
                      width: '80%',
                      height: '80%',
                      borderRadius: '8px',
                      border: '2px solid #ff5400',
                      backgroundColor: '#222',
                      backgroundImage: `url("${goblin_portrait}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        background: 'rgba(0,0,0,0.75)',
                        color: 'white',
                        fontSize: '10px',
                        textAlign: 'center',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                      }}>Goblin Target</div>
                      {sagePerceiveActive && (
                        <div
                          className={sagePerceiveFading ? 'effect-icon-fading' : 'effect-icon-active'}
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#111',
                            border: '2px solid #ff007f',
                            backgroundImage: `url("${weakness_doubled}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            overflow: 'visible',
                            zIndex: 15
                          }}
                        >
                          <svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              transform: 'rotate(-90deg)',
                              pointerEvents: 'none'
                            }}
                            viewBox="0 0 20 20"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="5"
                              fill="none"
                              stroke="rgba(0, 0, 0, 0.4)"
                              strokeWidth="10"
                              strokeDasharray="31.42"
                              strokeDashoffset={getPerceiveDashOffset()}
                            />
                            {(() => {
                              const coords = getRadialLineCoords(sagePerceiveEndTime, sagePerceiveDuration, sagePerceiveSingleDuration);
                              return coords ? (
                                <line
                                  x1="10"
                                  y1="10"
                                  x2={coords.x2}
                                  y2={coords.y2}
                                  stroke="#ffffff"
                                  strokeWidth="0.8"
                                />
                              ) : null;
                            })()}
                          </svg>
                          <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            left: '-8px',
                            background: '#000',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            borderRadius: '50%',
                            width: '12px',
                            height: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #ff007f',
                            zIndex: 16
                          }}>
                            {(() => {
                              const remaining = Math.max(0, sagePerceiveEndTime - currentTime);
                              return Math.ceil(remaining / (sagePerceiveSingleDuration || 3000));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      width: `${TILE_PCT}%`,
                      height: `${TILE_PCT}%`,
                      left: `${4 * TILE_PCT}%`,
                      top: `${3 * TILE_PCT}%`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9,
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{
                      width: '80%',
                      height: '80%',
                      borderRadius: '8px',
                      border: '2px solid #ff5400',
                      backgroundColor: '#222',
                      backgroundImage: `url("${beholder_minion_portrait}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        background: 'rgba(0,0,0,0.75)',
                        color: 'white',
                        fontSize: '10px',
                        textAlign: 'center',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                      }}>Beholder Minion</div>
                      {sagePerceiveActive && (
                        <div
                          className={sagePerceiveFading ? 'effect-icon-fading' : 'effect-icon-active'}
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#111',
                            border: '2px solid #ff007f',
                            backgroundImage: `url("${weakness_doubled}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            overflow: 'visible',
                            zIndex: 15
                          }}
                        >
                          <svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              transform: 'rotate(-90deg)',
                              pointerEvents: 'none'
                            }}
                            viewBox="0 0 20 20"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="5"
                              fill="none"
                              stroke="rgba(0, 0, 0, 0.4)"
                              strokeWidth="10"
                              strokeDasharray="31.42"
                              strokeDashoffset={getPerceiveDashOffset()}
                            />
                            {(() => {
                              const coords = getRadialLineCoords(sagePerceiveEndTime, sagePerceiveDuration, sagePerceiveSingleDuration);
                              return coords ? (
                                <line
                                  x1="10"
                                  y1="10"
                                  x2={coords.x2}
                                  y2={coords.y2}
                                  stroke="#ffffff"
                                  strokeWidth="0.8"
                                />
                              ) : null;
                            })()}
                          </svg>
                          <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            left: '-8px',
                            background: '#000',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            borderRadius: '50%',
                            width: '12px',
                            height: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #ff007f',
                            zIndex: 16
                          }}>
                            {(() => {
                              const remaining = Math.max(0, sagePerceiveEndTime - currentTime);
                              return Math.ceil(remaining / (sagePerceiveSingleDuration || 3000));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* --- Extra Goblins (col 4, row 1 & col 4, row 3) for Wizard --- */}
              {selectedUnitType === 'fighter' && selectedFighterId === 'wizard' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      width: `${TILE_PCT}%`,
                      height: `${TILE_PCT}%`,
                      left: `${4 * TILE_PCT}%`,
                      top: `${1 * TILE_PCT}%`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9,
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{
                      width: '80%',
                      height: '80%',
                      borderRadius: '8px',
                      border: extraGoblin1Flash ? '3px solid #ff4d4d' : '2px solid #ff5400',
                      backgroundColor: extraGoblin1Flash ? '#990000' : '#222',
                      backgroundImage: `url("${targetPortrait}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      position: 'relative',
                      transform: extraGoblin1Shake ? 'translate(5px, 2px) rotate(2deg)' : 'none',
                      transition: 'transform 0.05s'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        background: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '2px 0',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                      }}>
                        {targetName}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      width: `${TILE_PCT}%`,
                      height: `${TILE_PCT}%`,
                      left: `${4 * TILE_PCT}%`,
                      top: `${3 * TILE_PCT}%`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9,
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{
                      width: '80%',
                      height: '80%',
                      borderRadius: '8px',
                      border: extraGoblin2Flash ? '3px solid #ff4d4d' : '2px solid #ff5400',
                      backgroundColor: extraGoblin2Flash ? '#990000' : '#222',
                      backgroundImage: `url("${targetPortrait}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      position: 'relative',
                      transform: extraGoblin2Shake ? 'translate(5px, 2px) rotate(2deg)' : 'none',
                      transition: 'transform 0.05s'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        background: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '2px 0',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                      }}>
                        {targetName}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* --- Extra Goblins (col 2, row 1 & col 3, row 1) for Monk --- */}
              {selectedUnitType === 'fighter' && selectedFighterId === 'monk' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      width: `${TILE_PCT}%`,
                      height: `${TILE_PCT}%`,
                      left: `${2 * TILE_PCT}%`,
                      top: `${1 * TILE_PCT}%`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9,
                      pointerEvents: 'none',
                      transform: monkGoblin1Push ? monkGoblin1Push : 'none',
                      transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    }}
                  >
                    <div style={{
                      width: '80%',
                      height: '80%',
                      borderRadius: '8px',
                      border: monkGoblin1Flash ? '3px solid #ff4d4d' : '2px solid #ff5400',
                      backgroundColor: monkGoblin1Flash ? '#990000' : '#222',
                      backgroundImage: `url("${targetPortrait}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      position: 'relative',
                      transform: monkGoblin1Shake ? 'translate(5px, 2px) rotate(2deg)' : 'none',
                      transition: 'transform 0.05s'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        background: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '2px 0',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                      }}>
                        {targetName}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      width: `${TILE_PCT}%`,
                      height: `${TILE_PCT}%`,
                      left: `${3 * TILE_PCT}%`,
                      top: `${1 * TILE_PCT}%`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9,
                      pointerEvents: 'none',
                      transform: monkGoblin2Push ? monkGoblin2Push : 'none',
                      transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    }}
                  >
                    <div style={{
                      width: '80%',
                      height: '80%',
                      borderRadius: '8px',
                      border: monkGoblin2Flash ? '3px solid #ff4d4d' : '2px solid #ff5400',
                      backgroundColor: monkGoblin2Flash ? '#990000' : '#222',
                      backgroundImage: `url("${targetPortrait}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      position: 'relative',
                      transform: monkGoblin2Shake ? 'translate(5px, 2px) rotate(2deg)' : 'none',
                      transition: 'transform 0.05s'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        background: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '2px 0',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                      }}>
                        {targetName}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {/* --- Barbarian Sandbox Target --- */}
              <div
                style={{
                  position: 'absolute',
                  width: `${TILE_PCT}%`,
                  height: `${TILE_PCT}%`,
                  left: `${barbarianPos.col * TILE_PCT}%`,
                  top: `${barbarianPos.row * TILE_PCT}%`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9,
                  pointerEvents: 'none',
                  transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
              >
                <div style={{
                  width: '80%',
                  height: '80%',
                  borderRadius: '8px',
                  border: '2px solid #ffb703',
                  backgroundColor: '#222',
                  backgroundImage: `url("${barbarian}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                  position: 'relative'
                }}>
                  {/* Status Icons Indicator Bar for Barbarian */}
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    display: 'flex',
                    flexDirection: 'row-reverse',
                    gap: '2px',
                    zIndex: 15
                  }}>
                    {selectedUnitType === 'monster' && selectedMonsterId === 'dragon' && dragonDispellSageCopActive && (
                      <>
                        <div
                          className="effect-icon-active"
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#111',
                            border: '2px solid #00bfff',
                            backgroundImage: `url("${circle_of_protection}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          }}
                        />
                        <div
                          className="effect-icon-active"
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#111',
                            border: '2px solid #ffdd57',
                            backgroundImage: `url("${shielded}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* --- Sage Target (col 1, row 4) for Dragon --- */}
              {selectedUnitType === 'monster' && selectedMonsterId === 'dragon' && (
                <div
                  style={{
                    position: 'absolute',
                    width: `${TILE_PCT}%`,
                    height: `${TILE_PCT}%`,
                    left: `${sagePos.col * TILE_PCT}%`,
                    top: `${sagePos.row * TILE_PCT}%`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9,
                    pointerEvents: 'none',
                    transition: 'left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  }}
                >
                  <div style={{
                    width: '80%',
                    height: '80%',
                    borderRadius: '8px',
                    border: sageTargetFlash ? '3px solid #ffffff' : '2px solid #00bfff',
                    backgroundColor: sageTargetFlash ? '#00bfff' : '#222',
                    backgroundImage: `url("${sage}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                    position: 'relative',
                    transform: sageTargetShake ? 'translate(5px, 2px) rotate(2deg)' : 'none',
                    transition: 'transform 0.05s',
                  }}>
                    {/* Status Icons Indicator Bar for Sage */}
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      display: 'flex',
                      flexDirection: 'row-reverse',
                      gap: '2px',
                      zIndex: 15
                    }}>
                      {dragonDispellSageCopActive && (
                        <>
                          <div
                            className="effect-icon-active"
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#111',
                              border: '2px solid #00bfff',
                              backgroundImage: `url("${circle_of_protection}")`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            }}
                          />
                          <div
                            className="effect-icon-active"
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#111',
                              border: '2px solid #ffdd57',
                              backgroundImage: `url("${shielded}")`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}


              {/* --- Extra Ranger Target (col 0, row 3) for Monsters --- */}
              {selectedUnitType === 'monster' && (
                <div
                  style={{
                    position: 'absolute',
                    width: `${TILE_PCT}%`,
                    height: `${TILE_PCT}%`,
                    left: `${rangerPos.col * TILE_PCT}%`,
                    top: `${rangerPos.row * TILE_PCT}%`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9,
                    pointerEvents: 'none',
                    transition: 'left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  }}
                >
                  <div style={{
                    width: '80%',
                    height: '80%',
                    borderRadius: '8px',
                    border: extraRangerFlash ? '3px solid #ff4d4d' : '2px solid #ff5400',
                    backgroundColor: extraRangerFlash ? '#990000' : '#222',
                    backgroundImage: `url("${ranger}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                    position: 'relative',
                    transform: extraRangerShake ? 'translate(5px, 2px) rotate(2deg)' : 'none',
                    transition: 'transform 0.05s',
                    animation: extraRangerStunned ? 'stunWobble 0.6s ease-in-out infinite' : 'none'
                  }}>
                    {extraRangerStunned && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60px',
                        height: '20px',
                        pointerEvents: 'none',
                        zIndex: 35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {/* Tilted Ellipse Ring */}
                        <div style={{
                          position: 'absolute',
                          width: '50px',
                          height: '12px',
                          borderRadius: '50%',
                          border: '1.2px dashed rgba(255, 221, 87, 0.45)',
                          boxShadow: '0 0 4px rgba(255, 221, 87, 0.15)',
                          pointerEvents: 'none'
                        }} />
                        {/* Orbiting Star 1 */}
                        <div style={{
                          position: 'absolute',
                          fontSize: '12px',
                          color: '#ffe600',
                          textShadow: '0 0 5px #ffe600',
                          animation: 'birdieOrbit1 1.6s linear infinite',
                          fontWeight: 'bold',
                          userSelect: 'none'
                        }}>
                          ✦
                        </div>
                        {/* Orbiting Star 2 */}
                        <div style={{
                          position: 'absolute',
                          fontSize: '12px',
                          color: '#ffdd57',
                          textShadow: '0 0 5px #ffdd57',
                          animation: 'birdieOrbit2 1.6s linear infinite',
                          fontWeight: 'bold',
                          userSelect: 'none'
                        }}>
                          ✦
                        </div>
                      </div>
                    )}
                    {/* Status Icons Indicator Bar */}
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      display: 'flex',
                      flexDirection: 'row-reverse',
                      gap: '2px',
                      zIndex: 15
                    }}>
                      {extraRangerFeared && (
                        <div
                          className={extraRangerFearFading ? 'effect-icon-fading' : 'effect-icon-active'}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#111',
                            border: '2px solid #8e2de2',
                            backgroundImage: `url("${induce_fear}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              transform: 'rotate(-90deg)',
                              pointerEvents: 'none'
                            }}
                            viewBox="0 0 20 20"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="5"
                              fill="none"
                              stroke="rgba(0, 0, 0, 0.45)"
                              strokeWidth="10"
                              strokeDasharray="31.42"
                              strokeDashoffset={getExtraRangerFearDashOffset()}
                            />
                            {(() => {
                              const coords = getRadialLineCoords(extraRangerFearEndTime, 8000);
                              return coords ? (
                                <line
                                  x1="10"
                                  y1="10"
                                  x2={coords.x2}
                                  y2={coords.y2}
                                  stroke="#ffffff"
                                  strokeWidth="0.8"
                                />
                              ) : null;
                            })()}
                          </svg>
                        </div>
                      )}
                      {rangerBetrayalEffectActive && (
                        <div
                          className="effect-icon-active"
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#111',
                            border: '2px solid #ff3333',
                            backgroundImage: `url("${betrayal_hit}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              transform: 'rotate(-90deg)',
                              pointerEvents: 'none'
                            }}
                            viewBox="0 0 20 20"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="5"
                              fill="none"
                              stroke="rgba(0, 0, 0, 0.45)"
                              strokeWidth="10"
                              strokeDasharray="31.42"
                              strokeDashoffset={getRangerBetrayalDashOffset()}
                            />
                            {(() => {
                              const coords = getRadialLineCoords(rangerBetrayalEffectEndTime, 4000);
                              return coords ? (
                                <line
                                  x1="10"
                                  y1="10"
                                  x2={coords.x2}
                                  y2={coords.y2}
                                  stroke="#ffffff"
                                  strokeWidth="0.8"
                                />
                              ) : null;
                            })()}
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Heartbeat instance icon for Vampire's Crimson Sight */}
                    {selectedUnitType === 'monster' && selectedMonsterId === 'vampire' && vampireCrimsonSightActive && (
                      <div style={{
                        position: 'absolute',
                        top: '-21px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '42px',
                        height: '42px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundImage: `url("${heartbeat}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: 'none',
                        zIndex: 20,
                        opacity: vampireCrimsonSightFading ? 0 : 1,
                        transition: 'opacity 0.3s ease-in-out',
                        animation: 'heartbeatPulse 0.9s infinite ease-in-out'
                      }} />
                    )}
                    {/* Betrayal hit instance icon */}
                    {selectedMonsterId === 'djinn' && betrayalHitActive && (
                      <div style={{
                        position: 'absolute',
                        top: '-21px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '42px',
                        height: '42px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundImage: `url("${betrayal_hit}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: 'none',
                        zIndex: 20,
                        animation: 'heartbeatPulse 0.9s infinite ease-in-out'
                      }} />
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      width: '100%',
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      padding: '2px 0',
                      borderBottomLeftRadius: '6px',
                      borderBottomRightRadius: '6px'
                    }}>
                      Ranger Target
                    </div>
                  </div>
                </div>
              )}

              {/* --- Healing Hands Icon Overlay --- */}
              {healIcon && (
                <div
                  style={{
                    position: 'absolute',
                    left: `calc(${healIcon.col * 20}% + 10%)`,
                    top: `calc(${healIcon.row * 20}% + 10%)`,
                    width: '20%',
                    height: '20%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 25,
                    pointerEvents: 'none',
                    opacity: healIcon.active ? 1 : 0,
                    transform: `translate(-50%, -50%) scale(${healIcon.active ? 1.25 : 0.8})`,
                    transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                  }}
                >
                  <img
                    src={healing_hands}
                    alt="healing hands"
                    style={{
                      width: '45px',
                      height: '45px',
                      filter: 'drop-shadow(0 0 8px #2ec4b6) drop-shadow(0 0 15px rgba(46, 196, 182, 0.6))',
                    }}
                  />
                </div>
              )}

              {/* --- Dispel Icon Overlay --- */}
              {dispelIcon && (
                <div
                  style={{
                    position: 'absolute',
                    left: `calc(${dispelIcon.col * 20}% + 10%)`,
                    top: `calc(${dispelIcon.row * 20}% + 10%)`,
                    width: '20%',
                    height: '20%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 25,
                    pointerEvents: 'none',
                    opacity: dispelIcon.active ? 1 : 0,
                    transform: `translate(-50%, -50%) scale(${dispelIcon.active ? 1.25 : 0.8})`,
                    transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                  }}
                >
                  <img
                    src={direct_dispel}
                    alt="direct dispel"
                    style={{
                      width: '45px',
                      height: '45px',
                      filter: 'drop-shadow(0 0 8px #00ffff) drop-shadow(0 0 15px rgba(0, 255, 255, 0.6))',
                    }}
                  />
                </div>
              )}

              {/* --- Projectile Overlay --- */}
              {projectile && (
                projectile.isRangerArrow ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(${(projectile.x / 20) * TILE_PCT}% + ${TILE_PCT / 2}% - 40px)`,
                      top: `calc(${(projectile.y / 20) * TILE_PCT}% + ${TILE_PCT / 2}% - 4px)`,
                      transform: `rotate(${getProjectileAngle()}deg)`,
                      zIndex: 30,
                      transition: 'left 0.4s linear, top 0.4s linear',
                      pointerEvents: 'none',
                      width: '160px',
                      height: '8px',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      {/* Arrow head */}
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderLeft: `8px solid ${arrowTypeColors[projectile.arrowType] || '#ff9f1c'}`,
                        filter: `drop-shadow(0 0 4px ${arrowTypeColors[projectile.arrowType] || '#ff9f1c'})`
                      }} />
                      {/* Arrow shaft - tapered tail */}
                      <div style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '144px',
                        height: '6px',
                        background: `linear-gradient(to left, ${arrowTypeColors[projectile.arrowType] || '#ff9f1c'}, transparent)`,
                        clipPath: 'polygon(0% 50%, 100% 10%, 100% 90%)',
                        boxShadow: `0 0 6px ${arrowTypeColors[projectile.arrowType] || '#ff9f1c'}40`
                      }} />
                      {/* Poison droplets */}
                      {projectile.arrowType === 'poison' && (
                        <>
                          <div style={{ position: 'absolute', left: '5px', top: '-4px', width: '4px', height: '4px', borderRadius: '50%', background: '#38b000', opacity: 0.8, animation: 'poisonDrop 0.35s ease-out infinite', boxShadow: '0 0 4px #38b000' }} />
                          <div style={{ position: 'absolute', left: '15px', top: '8px', width: '3px', height: '3px', borderRadius: '50%', background: '#4ade80', opacity: 0.7, animation: 'poisonDrop 0.35s ease-out 0.12s infinite', boxShadow: '0 0 3px #4ade80' }} />
                          <div style={{ position: 'absolute', left: '10px', top: '-6px', width: '3px', height: '3px', borderRadius: '50%', background: '#22c55e', opacity: 0.6, animation: 'poisonDrop 0.35s ease-out 0.24s infinite', boxShadow: '0 0 3px #22c55e' }} />
                        </>
                      )}
                    </div>
                  </div>
                ) : projectile.isFireball ? (
                  <div
                    style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      left: `calc(${projectile.x}% + 10% - 16px)`,
                      top: `calc(${projectile.y}% + 10% - 16px)`,
                      background: 'radial-gradient(circle, #ffffff 10%, #ffd36b 30%, #ff5a1f 65%, rgba(217, 35, 15, 0) 100%)',
                      borderRadius: '50%',
                      boxShadow: '0 0 15px #ff5a1f, 0 0 25px #ff9d2b, 0 0 35px #d9230f',
                      zIndex: 30,
                      transition: 'left 0.4s linear, top 0.4s linear',
                      animation: 'fireballFlicker 0.15s ease-in-out infinite alternate',
                    }}
                  />
                ) : projectile.isAcidBlast ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(${projectile.x}% + 10% - 20px)`,
                      top: `calc(${projectile.y}% + 10% - 20px)`,
                      width: '40px',
                      height: '40px',
                      zIndex: 30,
                      transition: 'left 0.4s ease-in-out, top 0.4s ease-in-out',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    {/* Intermediate wrapper that applies the vertical lob translation */}
                    <div style={{
                      animation: 'acidBlastLobY 0.4s ease-in-out forwards',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {/* Rotated wrapper so the projectile graphic faces the direction of travel */}
                      <div style={{
                        transform: `rotate(${getProjectileAngle()}deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {/* Conical Bubble Projectile Graphic */}
                        <div style={{
                          position: 'relative',
                          width: '45px',
                          height: '40px',
                          filter: 'drop-shadow(0 0 6px #39ff14) drop-shadow(0 0 12px #38b000)'
                        }}>
                          {/* Front tip of the cone (small bubbles) */}
                          <div style={{ position: 'absolute', right: '1px', top: '15px', width: '7px', height: '7px', borderRadius: '50%', background: 'radial-gradient(circle, #adff2f 10%, #39ff14 80%)', opacity: 0.95, animation: 'bubbleWobble 0.2s ease-in-out infinite' }} />
                          <div style={{ position: 'absolute', right: '5px', top: '18px', width: '4px', height: '4px', borderRadius: '50%', background: '#adff2f', opacity: 0.85, animation: 'bubbleWobbleAlt 0.18s ease-in-out infinite 0.05s' }} />
                          <div style={{ position: 'absolute', right: '6px', top: '12px', width: '5px', height: '5px', borderRadius: '50%', background: '#adff2f', opacity: 0.85, animation: 'bubbleWobble 0.22s ease-in-out infinite 0.1s' }} />

                          {/* Mid-front section (medium-small bubbles) */}
                          <div style={{ position: 'absolute', right: '10px', top: '9px', width: '10px', height: '10px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.9, animation: 'bubbleWobbleAlt 0.25s ease-in-out infinite 0.03s' }} />
                          <div style={{ position: 'absolute', right: '10px', top: '21px', width: '9px', height: '9px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.9, animation: 'bubbleWobble 0.23s ease-in-out infinite 0.08s' }} />

                          {/* Mid section (medium-large bubbles) */}
                          <div style={{ position: 'absolute', right: '18px', top: '5px', width: '13px', height: '13px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.85, animation: 'bubbleWobble 0.3s ease-in-out infinite 0.12s' }} />
                          <div style={{ position: 'absolute', right: '18px', top: '22px', width: '12px', height: '12px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.85, animation: 'bubbleWobbleAlt 0.28s ease-in-out infinite 0.05s' }} />
                          <div style={{ position: 'absolute', right: '16px', top: '13px', width: '16px', height: '16px', borderRadius: '50%', background: 'radial-gradient(circle, #adff2f 10%, #38b000 80%)', opacity: 0.95, animation: 'bubbleWobble 0.26s ease-in-out infinite 0.02s' }} />

                          {/* Back tail of the cone (largest bubbles and dispersion) */}
                          <div style={{ position: 'absolute', left: '4px', top: '2px', width: '11px', height: '11px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.85, animation: 'bubbleWobbleAlt 0.32s ease-in-out infinite 0.15s' }} />
                          <div style={{ position: 'absolute', left: '4px', top: '27px', width: '10px', height: '10px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.85, animation: 'bubbleWobble 0.34s ease-in-out infinite 0.07s' }} />
                          <div style={{ position: 'absolute', left: '8px', top: '10px', width: '18px', height: '18px', borderRadius: '50%', background: 'radial-gradient(circle, #adff2f 10%, #38b000 80%)', opacity: 0.95, animation: 'bubbleWobbleAlt 0.24s ease-in-out infinite 0.1s' }} />

                          {/* Scattered tiny bubbles at the tail/perimeters */}
                          <div style={{ position: 'absolute', left: '0px', top: '16px', width: '6px', height: '6px', borderRadius: '50%', background: '#adff2f', opacity: 0.8, animation: 'bubbleWobble 0.2s ease-in-out infinite 0.18s' }} />
                          <div style={{ position: 'absolute', left: '10px', top: '0px', width: '4px', height: '4px', borderRadius: '50%', background: '#adff2f', opacity: 0.8, animation: 'bubbleWobbleAlt 0.22s ease-in-out infinite 0.04s' }} />
                          <div style={{ position: 'absolute', left: '15px', top: '34px', width: '5px', height: '5px', borderRadius: '50%', background: '#adff2f', opacity: 0.8, animation: 'bubbleWobble 0.19s ease-in-out infinite 0.11s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : projectile.isIceBlast ? (
                  <div
                    style={{
                      position: 'absolute',
                      width: '28px',
                      height: '28px',
                      left: `calc(${projectile.x}% + 10% - 14px)`,
                      top: `calc(${projectile.y}% + 10% - 14px)`,
                      background: 'radial-gradient(circle, #ffffff 20%, #e0f7fa 40%, #00bfff 75%, rgba(0, 191, 255, 0) 100%)',
                      borderRadius: '50%',
                      boxShadow: '0 0 12px #00bfff, 0 0 20px #e0f7fa, inset 0 0 8px #ffffff',
                      zIndex: 30,
                      transition: 'left 0.4s linear, top 0.4s linear',
                      animation: 'iceFlicker 0.2s ease-in-out infinite alternate',
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#ffffff',
                      transform: 'rotate(45deg)',
                      position: 'absolute',
                      left: '10px',
                      top: '10px',
                      boxShadow: '0 0 6px #ffffff',
                      animation: 'iceSpin 1s linear infinite'
                    }} />
                  </div>
                ) : (
                  <img
                    src={projectile.icon}
                    alt="projectile"
                    style={{
                      position: 'absolute',
                      width: '40px',
                      height: '40px',
                      left: `calc(${projectile.x}% + 10% - 20px)`,
                      top: `calc(${projectile.y}% + 10% - 20px)`,
                      transform: `rotate(${getProjectileAngle()}deg)`,
                      objectFit: 'contain',
                      zIndex: 30,
                      filter: projectile.icon === magic_missile
                        ? 'drop-shadow(0 0 2px #fff) drop-shadow(0 0 6px #ff00ff) drop-shadow(0 0 10px #fff) drop-shadow(0 0 2px #000) drop-shadow(0 0 4px #000) brightness(1.4)'
                        : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))',
                      transition: 'left 0.4s linear, top 0.4s linear'
                    }}
                  />
                )
              )}

              {/* --- Monk Extra Punches (for Force Punch Flurry / split strikes) --- */}
              {monkExtraPunches.map(p => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    left: p.left,
                    top: p.top,
                    width: '56px',
                    height: '56px',
                    transform: `translate(-50%, -50%) rotate(${p.angle}deg)`,
                    pointerEvents: 'none',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={p.icon}
                    alt="monk extra punch"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                    }}
                  />
                </div>
              ))}

              {/* --- Summoner Summoning Overlay --- */}
              {activeSummons.map((summon) => (
                <div
                  key={summon.id}
                  style={{
                    position: 'absolute',
                    left: `${summon.col * TILE_PCT + TILE_PCT / 2}%`,
                    top: `${summon.row * TILE_PCT + TILE_PCT / 2}%`,
                    width: '90px',
                    height: '90px',
                    backgroundImage: `url("${summon.icon}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    animation: 'summonPortalIn 1.2s linear both',
                    pointerEvents: 'none',
                    zIndex: 35,
                    opacity: 0.8,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 70%)',
                    filter: summon.type === 'skeleton_knight'
                      ? 'drop-shadow(0 0 8px #00bfff) drop-shadow(0 0 15px #00ffff)'
                      : summon.type === 'duplicate'
                        ? 'drop-shadow(0 0 8px #d800ff) drop-shadow(0 0 15px #ff007f)'
                        : summon.type === 'triplicate'
                          ? 'drop-shadow(0 0 8px #8a2be2) drop-shadow(0 0 15px #4b0082)'
                          : 'drop-shadow(0 0 8px #2ec4b6) drop-shadow(0 0 15px #a2d2ff)'
                  }}
                />
              ))}

              {/* --- Multi-projectiles (Wizard missiles / Ranger execute arrows) --- */}
              {projectiles.map(p => (
                p.isRangerArrow ? (
                  <div
                    key={p.id}
                    style={{
                      position: 'absolute',
                      left: `calc(${(p.x / 20) * TILE_PCT}% + ${TILE_PCT / 2}% - 30px)`,
                      top: `calc(${(p.y / 20) * TILE_PCT}% + ${TILE_PCT / 2}% - 3px)`,
                      transform: `rotate(${getProjectileAngle()}deg)`,
                      zIndex: 30,
                      transition: 'left 0.4s linear, top 0.4s linear',
                      pointerEvents: 'none',
                      width: '120px',
                      height: '6px',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <div style={{
                        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                        width: 0, height: 0,
                        borderTop: '3px solid transparent', borderBottom: '3px solid transparent',
                        borderLeft: `6px solid ${arrowTypeColors[p.arrowType] || '#ff9f1c'}`,
                        filter: `drop-shadow(0 0 3px ${arrowTypeColors[p.arrowType] || '#ff9f1c'})`
                      }} />
                      <div style={{
                        position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                        width: '108px', height: '4px',
                        background: `linear-gradient(to left, ${arrowTypeColors[p.arrowType] || '#ff9f1c'}, transparent)`,
                        clipPath: 'polygon(0% 50%, 100% 10%, 100% 90%)',
                        boxShadow: `0 0 4px ${arrowTypeColors[p.arrowType] || '#ff9f1c'}40`
                      }} />
                      {p.arrowType === 'poison' && (
                        <>
                          <div style={{ position: 'absolute', left: '3px', top: '-3px', width: '3px', height: '3px', borderRadius: '50%', background: '#38b000', opacity: 0.7, animation: 'poisonDrop 0.3s ease-out infinite', boxShadow: '0 0 3px #38b000' }} />
                          <div style={{ position: 'absolute', left: '10px', top: '6px', width: '2px', height: '2px', borderRadius: '50%', background: '#4ade80', opacity: 0.6, animation: 'poisonDrop 0.3s ease-out 0.1s infinite' }} />
                        </>
                      )}
                    </div>
                  </div>
                ) : p.isSpider ? (
                  <img
                    key={p.id}
                    src={p.icon}
                    alt="spider minion"
                    style={{
                      position: 'absolute',
                      width: '16px',
                      height: '16px',
                      left: `calc(${p.x}% + ${TILE_PCT / 2}% - 8px)`,
                      top: `calc(${p.y}% + ${TILE_PCT / 2}% - 8px)`,
                      zIndex: 30,
                      transform: 'none',
                      objectFit: 'contain',
                      transition: 'left 0.4s linear, top 0.4s linear'
                    }}
                  />
                ) : p.isSpawner ? (
                  <img
                    key={p.id}
                    src={p.icon}
                    alt="summoning nest"
                    style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      left: `calc(${p.x}% + ${TILE_PCT / 2}% - 16px)`,
                      top: `calc(${p.y}% + ${TILE_PCT / 2}% - 16px)`,
                      zIndex: 30,
                      objectFit: 'contain',
                      transform: 'none',
                      animation: 'pulse 1s infinite alternate'
                    }}
                  />
                ) : p.isNetherBolt ? (
                  <div
                    key={p.id}
                    style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      left: `calc(${p.x}% + ${TILE_PCT / 2}% - 16px)`,
                      top: `calc(${p.y}% + ${TILE_PCT / 2}% - 16px)`,
                      zIndex: 30,
                      transition: p.isBezier ? 'none' : 'left 0.4s linear, top 0.4s linear',
                      opacity: p.opacity !== undefined ? p.opacity : 1,
                      transform: `rotate(${p.angle !== undefined ? p.angle : getProjectileAngle()}deg) scale(${p.scale !== undefined ? p.scale : 1})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    <img
                      src={nether_bolt}
                      alt="nether bolt"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 4px #a21caf)'
                      }}
                    />
                  </div>
                ) : p.isMagicMissile ? (
                  <div
                    key={p.id}
                    style={{
                      position: 'absolute',
                      width: '18px',
                      height: '18px',
                      left: `calc(${p.x}% + ${TILE_PCT / 2}% - 9px)`,
                      top: `calc(${p.y}% + ${TILE_PCT / 2}% - 9px)`,
                      background: p.color
                        ? `radial-gradient(circle, #ffffff 15%, ${p.color} 45%, ${p.shadowColor || '#000'} 80%)`
                        : 'radial-gradient(circle, #ffffff 15%, #d946ef 45%, #701a75 80%)',
                      borderRadius: '50%',
                      border: '2px solid #ffffff',
                      boxShadow: p.color
                        ? `0 0 10px ${p.color}, 0 0 20px ${p.shadowColor || '#000'}, inset 0 0 4px #ffffff`
                        : '0 0 10px #d946ef, 0 0 20px #701a75, inset 0 0 4px #ffffff',
                      zIndex: 30,
                      transition: p.isBezier ? 'none' : 'left 0.4s linear, top 0.4s linear',
                      opacity: p.opacity !== undefined ? p.opacity : 1,
                      transform: p.scale !== undefined ? `scale(${p.scale})` : 'none',
                      animation: 'missileGlow 0.15s ease-in-out infinite alternate',
                    }}
                  />
                ) : (
                  <img
                    key={p.id}
                    src={p.icon}
                    alt="magic missile"
                    style={{
                      position: 'absolute',
                      width: '30px',
                      height: '30px',
                      left: `calc(${p.x}% + ${TILE_PCT / 2}% - 15px)`,
                      top: `calc(${p.y}% + ${TILE_PCT / 2}% - 15px)`,
                      transform: `rotate(${getProjectileAngle()}deg)`,
                      objectFit: 'contain',
                      zIndex: 30,
                      filter: 'drop-shadow(0 0 2px #fff) drop-shadow(0 0 6px #ff00ff) drop-shadow(0 0 10px #fff) drop-shadow(0 0 2px #000) drop-shadow(0 0 4px #000) brightness(1.4)',
                      transition: 'left 0.4s linear, top 0.4s linear'
                    }}
                  />
                )
              ))}

              {/* --- Special Beams / Overlays (like Smite, Lightning) --- */}
              {activeBeam && activeBeam !== 'annihilation' && activeBeam !== 'energy_drain_beam' && activeBeam !== 'blue_dragon_breath' && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${targetPos.col * TILE_PCT + TILE_PCT / 2}%`,
                    width: activeBeam === 'disintegrate'
                      ? '8px'
                      : '12px',
                    background: activeBeam === 'smite'
                      ? 'linear-gradient(to bottom, #fff, #ffe600)'
                      : activeBeam === 'lightning'
                        ? 'linear-gradient(to bottom, #ffffff 15%, #00bfff 85%)'
                        : 'linear-gradient(to right, #ff1a1a, #ffffff 40%, #ffffff 60%, #ff1a1a)',
                    top: 0,
                    height: `${targetPos.row * TILE_PCT + TILE_PCT / 2}%`,
                    transform: 'translateX(-50%)',
                    boxShadow: activeBeam === 'smite'
                      ? '0 0 20px #ffe600, 0 0 40px #ffe600'
                      : activeBeam === 'lightning'
                        ? '0 0 10px #ffffff, 0 0 25px #00bfff, 0 0 45px #00bfff'
                        : 'none',
                    zIndex: 25,
                    animation: activeBeam === 'disintegrate'
                      ? 'disintegrateBeam 2.2s linear forwards'
                      : 'beamShrink 0.35s ease-out forwards'
                  }}
                />
              )}

              {activeBeam === 'energy_drain_beam' && (() => {
                const px1 = fighterPos.col * (500 / GRID_SIZE) + (500 / GRID_SIZE) / 2;
                const py1 = fighterPos.row * (500 / GRID_SIZE) + (500 / GRID_SIZE) / 2;
                const px2 = targetPos.col * (500 / GRID_SIZE) + (500 / GRID_SIZE) / 2;
                const py2 = targetPos.row * (500 / GRID_SIZE) + (500 / GRID_SIZE) / 2;
                const dx = px2 - px1;
                const dy = py2 - py1;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <div style={{
                    position: 'absolute',
                    left: `${px1}px`,
                    top: `${py1}px`,
                    width: `${length}px`,
                    height: '8px',
                    background: 'linear-gradient(to right, rgba(255, 105, 180, 0.1), #ff69b4, #fff, #ff69b4, rgba(255, 105, 180, 0.1))',
                    boxShadow: '0 0 10px #ff69b4, 0 0 20px #ff1493',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg) translateY(-50%)`,
                    zIndex: 35,
                    pointerEvents: 'none',
                    filter: 'blur(1.5px)',
                    maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
                    animation: 'pinkBeamPulse 1.5s ease-out forwards'
                  }} />
                );
              })()}

              {/* --- Djinn Betrayal Beam --- */}
              {betrayalBeamActive && (() => {
                const px1 = fighterPos.col * TILE_PCT + TILE_PCT / 2;
                const py1 = fighterPos.row * TILE_PCT + TILE_PCT / 2;
                const px2 = rangerPos.col * TILE_PCT + TILE_PCT / 2;
                const py2 = rangerPos.row * TILE_PCT + TILE_PCT / 2;
                const dx = px2 - px1;
                const dy = py2 - py1;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <div style={{
                    position: 'absolute',
                    left: `${px1}%`,
                    top: `${py1}%`,
                    width: `${length}%`,
                    height: '6px',
                    background: 'linear-gradient(to right, #ff4d4d, #ffffff, #ff4d4d)',
                    boxShadow: '0 0 10px #ff3333, 0 0 20px #ffffff',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg) translateY(-50%)`,
                    zIndex: 35,
                    pointerEvents: 'none',
                    animation: 'pinkBeamPulse 0.5s ease-out infinite'
                  }} />
                );
              })()}

              {/* --- Djinn Rift: vertical energy line overlay --- */}
              {riftActive && (() => {
                const isLeftToRight = fighterPos.col < targetPos.col;
                const lineCol = fighterPos.col;
                const lineX = lineCol * TILE_PCT;
                const lineY = targetPos.row * TILE_PCT; // top of 3-tile span
                const lineH = TILE_PCT * 3; // 3 tiles tall
                const sweepOffset = riftSweeping 
                  ? (isLeftToRight ? (TILE_PCT * 2) : -(TILE_PCT * 2)) 
                  : 0;
                const embers = [
                  { id: 1, top: '15%', left: '8px', size: '5px', delay: '0s', color: '#c084fc' },
                  { id: 2, top: '35%', left: '22px', size: '4px', delay: '0.4s', color: '#a855f7' },
                  { id: 3, top: '50%', left: '12px', size: '6px', delay: '0.2s', color: '#ffffff' },
                  { id: 4, top: '65%', left: '26px', size: '3px', delay: '0.7s', color: '#c084fc' },
                  { id: 5, top: '80%', left: '14px', size: '5px', delay: '0.1s', color: '#a855f7' },
                  { id: 6, top: '92%', left: '20px', size: '4px', delay: '0.9s', color: '#ffffff' }
                ];
                return (
                  <div style={{
                    position: 'absolute',
                    left: `calc(${lineX}% + ${sweepOffset}%)`,
                    top: `calc(${lineY}% - ${TILE_PCT}%)`,
                    width: '40px',
                    height: `${lineH}%`,
                    transform: 'translateX(-50%)',
                    transition: riftSweeping ? 'left 0.5s ease-in, opacity 0.5s ease-in' : 'none',
                    opacity: riftSweeping ? 0 : 1,
                    animation: riftSweeping ? 'none' : 'riftLineAppear 0.5s ease-out forwards',
                    zIndex: 35,
                    pointerEvents: 'none',
                    overflow: 'visible',
                  }}>
                    <svg
                      viewBox="0 0 40 300"
                      width="100%"
                      height="100%"
                      preserveAspectRatio="none"
                      style={{
                        overflow: 'visible',
                        animation: 'riftFluidWobble 4s ease-in-out infinite alternate'
                      }}
                    >
                      <path
                        d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'blur(3px)', opacity: 0.8 }}
                      />
                      <path
                        d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'drop-shadow(0 0 6px #7c3aed)' }}
                      />
                      <path
                        d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ animation: 'riftCoreShimmer 0.8s ease-in-out infinite alternate' }}
                      />
                    </svg>
                    {embers.map(e => (
                      <div key={e.id} style={{
                        position: 'absolute',
                        top: e.top,
                        left: e.left,
                        width: e.size,
                        height: e.size,
                        borderRadius: '50%',
                        backgroundColor: e.color,
                        boxShadow: `0 0 6px ${e.color}, 0 0 12px ${e.color}`,
                        pointerEvents: 'none',
                        animation: `riftEmbers 1.4s ease-out infinite`,
                        animationDelay: e.delay
                      }} />
                    ))}
                  </div>
                );
              })()}

              {/* Centered wobbly ball tip for Disintegrate (centered directly at target tile coordinates) */}
              {activeBeam === 'disintegrate' && (
                <div style={{
                  position: 'absolute',
                  left: `${targetPos.col * TILE_PCT + TILE_PCT / 2}%`,
                  top: `${targetPos.row * TILE_PCT + TILE_PCT / 2}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '45px',
                  height: '45px',
                  zIndex: 26,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, #ffffff 20%, #ff1a1a 60%, rgba(255, 26, 26, 0) 100%)',
                    borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                    animation: 'organicGlow 1.5s linear infinite',
                    boxShadow: '0 0 15px #ff1a1a, 0 0 30px #ff1a1a',
                    opacity: 0.95
                  }} />
                </div>
              )}

              {/* --- Blue Dragon Breath Beam --- */}
              {activeBeam === 'blue_dragon_breath' && (() => {
                const fCol = getUnitVisualCol(fighterPos.col, isFighterHuge, isFighterLarge);
                const fRow = getUnitVisualRow(fighterPos.row, isFighterHuge, isFighterLarge);
                const tCol = getUnitVisualCol(targetPos.col, isTargetHuge, isTargetLarge);
                const tRow = getUnitVisualRow(targetPos.row, isTargetHuge, isTargetLarge);

                let originCol = fCol;
                let originRow = fRow;
                const diffX = tCol - fCol;
                const diffY = tRow - fRow;

                // Shift origin to outer edge based on facing direction
                if (Math.abs(diffX) > Math.abs(diffY)) {
                  originCol += diffX > 0 ? 1 : -1;
                } else if (Math.abs(diffY) > Math.abs(diffX)) {
                  originRow += diffY > 0 ? 1 : -1;
                } else {
                  originCol += diffX > 0 ? 1 : -1;
                  originRow += diffY > 0 ? 1 : -1;
                }

                const px1 = originCol * TILE_PCT + TILE_PCT / 2;
                const py1 = originRow * TILE_PCT + TILE_PCT / 2;
                const px2 = tCol * TILE_PCT + TILE_PCT / 2;
                const py2 = tRow * TILE_PCT + TILE_PCT / 2;
                const dx = px2 - px1;
                const dy = py2 - py1;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${px1}%`,
                      top: `${py1}%`,
                      width: `${length}%`,
                      height: '35px',
                      transformOrigin: '0 50%',
                      transform: `translateY(-50%) rotate(${angle}deg)`,
                      '--beam-angle': `${angle}deg`,
                      zIndex: 25,
                      animation: 'beamGrowX 0.3s ease-out forwards',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      overflow: 'visible'
                    }}
                  >
                    {/* Fuzzy bubbling orb at the origin of the beam (left edge) to obscure sharp square lines */}
                    <div style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '-2px',
                      width: '40px',
                      height: '40px',
                      background: 'radial-gradient(circle, #ffffff 10%, #00d4ff 40%, rgba(0, 212, 255, 0) 100%)',
                      borderRadius: '60% 40% 50% 50% / 40% 50% 60% 50%',
                      animation: 'organicGlow 1.2s linear infinite',
                      boxShadow: '0 0 15px #00d4ff, 0 0 25px #0055ff',
                      filter: 'blur(4px)',
                      zIndex: 1
                    }}>
                      {[...Array(4)].map((_, i) => (
                        <div key={`org-spark-${i}`} style={{
                          position: 'absolute',
                          left: '10px', top: '10px',
                          width: '6px', height: '6px',
                          background: '#fff',
                          borderRadius: '50%',
                          boxShadow: '0 0 10px #ffffff, 0 0 15px #00d4ff',
                          animation: `particleSpark 0.8s ease-out infinite ${i * 0.2}s`
                        }} />
                      ))}
                    </div>

                    {/* The core beam itself */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(to bottom, rgba(0,212,255,0.8), rgba(0,100,255,1), rgba(0,212,255,0.8))',
                      boxShadow: '0 0 20px #00d4ff, 0 0 40px #0055ff, inset 0 0 15px #ffffff',
                      borderRadius: '10px',
                      animation: 'wavyBeamY 0.5s infinite alternate',
                      opacity: 0.9,
                      filter: 'contrast(1.2) brightness(1.3)'
                    }} />

                    {/* Undulating organic tip at the end of the beam touching the target */}
                    <div style={{
                      position: 'absolute',
                      right: '-20px',
                      top: '-2px',
                      width: '40px',
                      height: '40px',
                      background: 'radial-gradient(circle, #ffffff 10%, #0055ff 40%, rgba(0, 85, 255, 0) 100%)',
                      borderRadius: '50% 50% 30% 70% / 60% 40% 60% 40%',
                      animation: 'organicGlow 1.2s linear infinite',
                      boxShadow: '0 0 15px #00d4ff, 0 0 25px #0055ff',
                      filter: 'blur(4px)',
                      zIndex: 1
                    }}>
                      {[...Array(4)].map((_, i) => (
                        <div key={`tip-spark-${i}`} style={{
                          position: 'absolute',
                          left: '10px', top: '10px',
                          width: '6px', height: '6px',
                          background: '#fff',
                          borderRadius: '50%',
                          boxShadow: '0 0 10px #ffffff, 0 0 15px #0055ff',
                          animation: `particleSpark 0.8s ease-out infinite ${i * 0.2}s`
                        }} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* --- Annihilation Horizontal Beam --- */}
              {activeBeam === 'annihilation' && (() => {
                const fCol = getUnitVisualCol(fighterPos.col, isFighterHuge, isFighterLarge);
                const fRow = getUnitVisualRow(fighterPos.row, isFighterHuge, isFighterLarge);
                const tCol = getUnitVisualCol(targetPos.col, isTargetHuge, isTargetLarge);
                const tRow = getUnitVisualRow(targetPos.row, isTargetHuge, isTargetLarge);

                const dx = (tCol - fCol) * TILE_PCT;
                const dy_start = (tRow + 0.5) * TILE_PCT - (fRow * TILE_PCT + TILE_PCT / 2);
                const dy_end = (tRow - 0.5) * TILE_PCT - (fRow * TILE_PCT + TILE_PCT / 2);

                const length_start = Math.sqrt(dx * dx + dy_start * dy_start);
                const angle_start = Math.atan2(dy_start, dx) * (180 / Math.PI);

                const length_end = Math.sqrt(dx * dx + dy_end * dy_end);
                const angle_end = Math.atan2(dy_end, dx) * (180 / Math.PI);

                const length = annihilationSweepActive ? length_end : length_start;
                const angle = annihilationSweepActive ? angle_end : angle_start;

                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${fCol * TILE_PCT + TILE_PCT / 2}%`,
                      top: `${fRow * TILE_PCT + TILE_PCT / 2}%`,
                      width: `${length}%`,
                      height: '16px',
                      background: 'linear-gradient(to bottom, #7b2cbf, #ffffff 40%, #ffffff 60%, #7b2cbf)',
                      transform: `rotate(${angle}deg) translateY(-50%)`,
                      transformOrigin: 'left center',
                      boxShadow: '0 0 20px #ff007f, 0 0 40px #8e2de2, 0 0 60px #8e2de2',
                      zIndex: 25,
                      transition: annihilationSweepActive ? 'width 1.2s ease-in-out, transform 1.2s ease-in-out, opacity 0.2s' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      overflow: 'visible'
                    }}
                  >
                    {/* Fuzzy bubbling orb at the origin of the beam (left edge) to obscure sharp square lines */}
                    <div style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '-12px',
                      width: '40px',
                      height: '40px',
                      background: 'radial-gradient(circle, #ffffff 10%, #7b2cbf 40%, rgba(123, 44, 191, 0) 100%)',
                      borderRadius: '60% 40% 50% 50% / 40% 50% 60% 50%',
                      animation: 'organicGlow 1.2s linear infinite',
                      boxShadow: '0 0 15px #ff007f, 0 0 25px #8e2de2',
                      filter: 'blur(4px)'
                    }}>
                      {[...Array(4)].map((_, i) => (
                        <div key={`org-spark-${i}`} style={{
                          position: 'absolute',
                          left: '10px', top: '10px',
                          width: '6px', height: '6px',
                          background: '#fff',
                          borderRadius: '50%',
                          boxShadow: '0 0 10px #ff007f, 0 0 15px #8e2de2',
                          animation: `particleSpark 0.8s ease-out infinite ${i * 0.2}s`
                        }} />
                      ))}
                    </div>

                    {/* Undulating organic tip at the end of the beam touching the target */}
                    <div style={{
                      position: 'absolute',
                      right: '-20px',
                      top: '-12px',
                      width: '40px',
                      height: '40px',
                      background: 'radial-gradient(circle, #ffffff 10%, #8e2de2 40%, rgba(142, 45, 226, 0) 100%)',
                      borderRadius: '50% 50% 30% 70% / 60% 40% 60% 40%',
                      animation: 'organicGlow 1.2s linear infinite',
                      boxShadow: '0 0 15px #ff007f, 0 0 25px #8e2de2',
                      filter: 'blur(4px)'
                    }}>
                      {[...Array(4)].map((_, i) => (
                        <div key={`tip-spark-${i}`} style={{
                          position: 'absolute',
                          left: '10px', top: '10px',
                          width: '6px', height: '6px',
                          background: '#fff',
                          borderRadius: '50%',
                          boxShadow: '0 0 10px #ff007f, 0 0 15px #8e2de2',
                          animation: `particleSpark 0.8s ease-out infinite ${i * 0.2}s`
                        }} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Fireball Expanding Explosion Ring */}
              {fireballExplosion && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${fireballExplosion.col * TILE_PCT + TILE_PCT / 2}%`,
                    top: `${fireballExplosion.row * TILE_PCT + TILE_PCT / 2}%`,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 35,
                    animation: 'fireRingExpand 0.7s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                  }}
                />
              )}
              {annihilationExplosion && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${annihilationExplosion.col * TILE_PCT + TILE_PCT / 2}%`,
                    top: `${annihilationExplosion.row * TILE_PCT + TILE_PCT / 2}%`,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 35,
                    animation: 'annihilationRing 0.7s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                  }}
                />
              )}
              {vortexActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${vortexActive.col * TILE_PCT + TILE_PCT / 2}%`,
                    top: `${vortexActive.row * TILE_PCT + TILE_PCT / 2}%`,
                    width: `${TILE_PCT * 3}%`,
                    height: `${TILE_PCT * 3}%`,
                    backgroundImage: `url("${wizard_vortex}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 35,
                    animation: 'vortexSpin 4s linear infinite',
                    opacity: 0.5,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 70%)',
                    filter: 'drop-shadow(0 0 12px #7b2cbf) drop-shadow(0 0 25px #8e2de2)'
                  }}
                />
              )}

              {/* --- Bombard Warning Shimmer Overlays --- */}
              {bombardWarnings && (
                <>
                  {bombardWarnings.tiles.map((tile) => {
                    if (tile.col === undefined || tile.row === undefined) return null;
                    return (
                      <div
                        key={`bombard-warning-${tile.key}`}
                        className="bombard-warning-shimmer"
                        style={{
                          position: 'absolute',
                          left: `${tile.col * TILE_PCT}%`,
                          top: `${tile.row * TILE_PCT}%`,
                          width: `${TILE_PCT}%`,
                          height: `${TILE_PCT}%`,
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}
                      />
                    );
                  })}
                </>
              )}

              {/* --- Hit Particle Effect Overlay --- */}
              {hitEffect && (
                <div
                  style={{
                    position: 'absolute',
                    width: `${TILE_PCT}%`,
                    height: `${TILE_PCT}%`,
                    left: `${(hitEffect.col !== undefined ? hitEffect.col : targetPos.col) * TILE_PCT + TILE_PCT / 2}%`,
                    top: `${(hitEffect.row !== undefined ? hitEffect.row : targetPos.row) * TILE_PCT + TILE_PCT / 2}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 40,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {hitEffect.type === 'bite_chomping' && (
                    <div style={{
                      position: 'relative',
                      width: '100px',
                      height: '100px',
                      pointerEvents: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={bite_animation_top}
                        alt="bite top"
                        style={{
                          position: 'absolute',
                          width: '90px',
                          height: '45px',
                          top: '5px',
                          objectFit: 'contain',
                          animation: 'biteCloseTop 0.7s ease-in-out forwards',
                          pointerEvents: 'none',
                          zIndex: 50
                        }}
                      />
                      <img
                        src={bite_animation_bottom}
                        alt="bite bottom"
                        style={{
                          position: 'absolute',
                          width: '90px',
                          height: '45px',
                          bottom: '5px',
                          objectFit: 'contain',
                          animation: 'biteCloseBottom 0.7s ease-in-out forwards',
                          pointerEvents: 'none',
                          zIndex: 50
                        }}
                      />
                    </div>
                  )}

                  {hitEffect.type === 'vampiric_bite_chomping' && (
                    <div style={{
                      position: 'relative',
                      width: '90px',
                      height: '90px',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {/* Background Red Glow */}
                      <img
                        src={vamp_bite_background}
                        alt="vamp bite background"
                        style={{
                          position: 'absolute',
                          width: '90px',
                          height: '90px',
                          top: 0,
                          left: 0,
                          objectFit: 'contain',
                          animation: 'vampBiteBackgroundFade 0.7s ease-in-out forwards',
                          pointerEvents: 'none',
                          zIndex: 41
                        }}
                      />
                      {/* Top Fangs */}
                      <img
                        src={vamp_bite_top}
                        alt="vamp bite top"
                        style={{
                          position: 'absolute',
                          width: '90px',
                          height: '45px',
                          top: 0,
                          left: 0,
                          objectFit: 'contain',
                          animation: 'vampBiteCloseTop 0.7s ease-in-out forwards',
                          pointerEvents: 'none',
                          zIndex: 42
                        }}
                      />
                      {/* Bottom Fangs */}
                      <img
                        src={vamp_bite_bottom}
                        alt="vamp bite bottom"
                        style={{
                          position: 'absolute',
                          width: '90px',
                          height: '45px',
                          bottom: 0,
                          left: 0,
                          objectFit: 'contain',
                          animation: 'vampBiteCloseBottom 0.7s ease-in-out forwards',
                          pointerEvents: 'none',
                          zIndex: 42
                        }}
                      />
                    </div>
                  )}

                  {hitEffect.type === 'claw_hit' && (
                    <div style={{
                      width: '90px',
                      height: '90px',
                      backgroundImage: `url("${claw_hit}")`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      animation: 'scaleUp 0.25s ease-out forwards',
                      pointerEvents: 'none'
                    }} />
                  )}

                  {hitEffect.type === 'slash' && (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      position: 'relative',
                      animation: 'slashFade 0.3s ease-out forwards',
                      pointerEvents: 'none'
                    }}>
                      {/* Diagonal Slash Line 1 */}
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '6px',
                        backgroundColor: '#fff',
                        boxShadow: '0 0 10px #ffe600, 0 0 20px #ff5400',
                        borderRadius: '3px',
                        top: '50%',
                        left: 0,
                        transform: 'translateY(-50%) rotate(45deg)'
                      }} />
                      {/* Diagonal Slash Line 2 */}
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '6px',
                        backgroundColor: '#fff',
                        boxShadow: '0 0 10px #ffe600, 0 0 20px #ff5400',
                        borderRadius: '3px',
                        top: '50%',
                        left: 0,
                        transform: 'translateY(-50%) rotate(-45deg)'
                      }} />
                    </div>
                  )}
                  {hitEffect.type === 'weapon_slash' && (() => {
                    let weaponIcon;
                    if (selectedMonsterId === 'skeleton' && selectedUnitType === 'monster') {
                      weaponIcon = longsword;
                    } else {
                      const activeWeaponId = equippedWeapons[selectedFighterId] || 'shortsword_sword';
                      const activeWeapon = WEAPONS_DB.swords.find(w => w.id === activeWeaponId) ||
                        WEAPONS_DB.axes.find(w => w.id === activeWeaponId) ||
                        WEAPONS_DB.swords[0];
                      weaponIcon = activeWeapon.image;
                    }

                    const dx = fighterPos.col - targetPos.col;
                    const dy = fighterPos.row - targetPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let adjCol = fighterPos.col;
                    let adjRow = fighterPos.row;
                    if (dist > 0) {
                      const colStep = Math.round(dx / dist);
                      const rowStep = Math.round(dy / dist);
                      adjCol = targetPos.col + colStep;
                      adjRow = targetPos.row + rowStep;
                    }
                    const swingDx = targetPos.col - adjCol;
                    const swingDy = targetPos.row - adjRow;
                    const baseAngle = Math.atan2(swingDy, swingDx) * (180 / Math.PI);
                    const adjDist = Math.sqrt(swingDx * swingDx + swingDy * swingDy);
                    const halfDistPx = (adjDist * 100) / 2;

                    // Calculate divide (midpoint) offset relative to Target (which is parent center 50%, 50%)
                    const leftOffset = (swingDx / 2) * -100;
                    const topOffset = (swingDy / 2) * -100;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '60px',
                          height: '60px',
                          transform: `translate(-50%, -50%) rotate(${baseAngle}deg)`,
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={weaponIcon}
                          alt="weapon slash"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: `${30 - halfDistPx}px 30px`,
                            animation: `${(swingDx < 0 || (swingDx === 0 && fighterPos.col > targetPos.col)) ? 'weaponSwingArcFlipped' : 'weaponSwingArc'} 0.75s ease-in-out forwards`
                          }}
                        />
                      </div>
                    );
                  })()}
                  {(hitEffect.type === 'claw_strike_swipe' || hitEffect.type === 'undead_grasp_swipe') && (() => {
                    const dx = fighterPos.col - targetPos.col;
                    const dy = fighterPos.row - targetPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let adjCol = fighterPos.col;
                    let adjRow = fighterPos.row;
                    if (dist > 0) {
                      const colStep = Math.round(dx / dist);
                      const rowStep = Math.round(dy / dist);
                      adjCol = targetPos.col + colStep;
                      adjRow = targetPos.row + rowStep;
                    }
                    const swingDx = targetPos.col - adjCol;
                    const swingDy = targetPos.row - adjRow;

                    const leftOffset = (swingDx / 2) * -100;
                    const topOffset = (swingDy / 2) * -100;

                    // Calculate rotation angle relative to left-facing base (which points to 180 degrees)
                    const angle = Math.atan2(swingDy, swingDx) * (180 / Math.PI);
                    const rotateAngle = angle + 180;

                    const transformStyle = `translate(-50%, -50%) rotate(${rotateAngle}deg)`;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '60px',
                          height: '60px',
                          transform: transformStyle,
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          filter: hitEffect.type === 'undead_grasp_swipe' ? 'hue-rotate(270deg) saturate(2.5) drop-shadow(0 0 8px rgba(147, 51, 234, 0.8))' : 'none'
                        }}
                      >
                        <img
                          src={claw_strike_animation}
                          alt="claw strike swipe"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: '80px 30px',
                            animation: 'leftFacingClawArc 0.75s ease-in-out forwards'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'imbued_strike_effect' && (() => {
                    const activeWeaponId = equippedWeapons[selectedFighterId] || 'shortsword_sword';
                    const activeWeapon = WEAPONS_DB.swords.find(w => w.id === activeWeaponId) ||
                      WEAPONS_DB.axes.find(w => w.id === activeWeaponId) ||
                      WEAPONS_DB.swords[0];
                    const weaponIcon = activeWeapon.image;

                    const dx = fighterPos.col - targetPos.col;
                    const dy = fighterPos.row - targetPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let adjCol = fighterPos.col;
                    let adjRow = fighterPos.row;
                    if (dist > 0) {
                      const colStep = Math.round(dx / dist);
                      const rowStep = Math.round(dy / dist);
                      adjCol = targetPos.col + colStep;
                      adjRow = targetPos.row + rowStep;
                    }
                    const swingDx = targetPos.col - adjCol;
                    const swingDy = targetPos.row - adjRow;
                    const baseAngle = Math.atan2(swingDy, swingDx) * (180 / Math.PI);

                    const leftOffset = (swingDx / 2) * -100;
                    const topOffset = (swingDy / 2) * -100;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '60px',
                          height: '60px',
                          transform: `translate(-50%, -50%) rotate(${baseAngle}deg)`,
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={weaponIcon}
                          alt="imbued strike weapon"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            animation: 'imbuedStrikeThrust 1.0s ease-in-out forwards',
                            filter: 'drop-shadow(0 0 6px rgba(0, 191, 255, 0.95)) drop-shadow(0 0 12px rgba(0, 191, 255, 0.6))'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'dragon_whirlwind_effect' && (
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: '0px',
                      height: '0px',
                      zIndex: 35,
                      pointerEvents: 'none'
                    }}>
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={`ww-ring-${i}`}
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '0px',
                            height: '0px',
                            pointerEvents: 'none',
                            animation: `windstormBobble 0.3s ease-in-out infinite alternate ${i * 0.1}s`
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            border: '4px solid rgba(255, 255, 255, 0.8)',
                            borderRadius: '50%',
                            boxShadow: '0 0 20px #ffffff, inset 0 0 10px #ffffff',
                            animation: `windstormExpand 1s cubic-bezier(0.1, 0.8, 0.3, 1) both ${i * 0.15}s`,
                            opacity: 0,
                            width: '50px',
                            height: '50px',
                            transform: 'translate(-50%, -50%)'
                          }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {hitEffect.type === 'melee_whirlwind_effect' && (() => {
                    const isMonk = hitEffect.abilityId === 'monk_whirlwind';
                    const icon = isMonk ? monk_punch : barbarian_cleave;
                    return (
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: '0px',
                        height: '0px',
                        zIndex: 35,
                        pointerEvents: 'none'
                      }}>
                        {[...Array(2)].map((_, i) => (
                          <div
                            key={`melee-ww-${i}`}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              width: '40px',
                              height: '40px',
                              transformOrigin: 'center center',
                              animation: `meleeWhirlwindSpin 1s cubic-bezier(0.2, 0.8, 0.2, 1) both`,
                              animationDelay: `${i * 0.15}s`,
                            }}
                          >
                            <img
                              src={icon}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                filter: isMonk 
                                  ? 'drop-shadow(0 0 4px #ffaa00) drop-shadow(0 0 8px #ff5500)' 
                                  : 'drop-shadow(0 0 4px #ff3333) drop-shadow(0 0 8px #990000)',
                              }}
                              alt="spinning-weapon"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {hitEffect.type === 'bombard_emission' && (
                    <>
                      {/* Emission Particles on Caster */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '-50%', // Centers vertical position exactly on the top row of the 3x3 complex
                        width: '300%', // Covers the full 3-tile width (NW, N, NE)
                        height: '100%', // Covers 1 tile height
                        transform: 'translate(-50%, -50%)',
                        zIndex: 40,
                        pointerEvents: 'none'
                      }}>
                        {[...Array(10)].map((_, i) => {
                          const delay = i * 0.04;
                          const size = 6 + (i % 3) * 3;

                          // Scatter starting positions completely across the full 3-tile width and 1-tile height
                          const leftOffset = ((i * 17) % 80 + 10);
                          const topOffset = ((i * 23) % 80 + 10);

                          const shadowColor = (i % 2 === 0) ? '#00ffff' : '#ffffff';

                          // Organic meander offsets using CSS variables defined in keyframes
                          const signX1 = i % 2 === 0 ? 1 : -1;
                          const signX2 = i % 3 === 0 ? -1 : 1;
                          const signX3 = i % 4 === 0 ? 1 : -1;

                          const bx1 = signX1 * (20 + (i * 11) % 50); // bounce left/right up to 70px
                          const by1 = ((i * 7) % 30 - 15);          // bounce up/down up to 15px

                          const bx2 = signX2 * (30 + (i * 13) % 70); // bounce left/right up to 100px
                          const by2 = ((i * 9) % 30 - 15);

                          const bx3 = signX3 * (40 + (i * 17) % 90); // bounce left/right up to 130px
                          const by3 = ((i * 11) % 30 - 15);

                          const sx = (signX1 * (30 + (i * 5) % 50));

                          return (
                            <div
                              key={`bombard-particle-${i}`}
                              style={{
                                position: 'absolute',
                                left: `${leftOffset}%`,
                                top: `${topOffset}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                boxShadow: `0 0 10px ${shadowColor}, 0 0 20px ${shadowColor}, inset 0 0 5px #ffffff`,
                                animation: 'bombardParticle 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                                animationDelay: `${delay}s`,
                                '--bounce-x1': `${bx1}px`,
                                '--bounce-y1': `${by1}px`,
                                '--bounce-x2': `${bx2}px`,
                                '--bounce-y2': `${by2}px`,
                                '--bounce-x3': `${bx3}px`,
                                '--bounce-y3': `${by3}px`,
                                '--shoot-x': `${sx}px`,
                              }}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}

                  {hitEffect.type === 'bombard_strike' && (
                    <>
                      {[
                        { l: '50%', t: '50%', key: 'main', beams: hitEffect.barrage1Beams || [] },
                        { l: `${50 + (hitEffect.adjacentCol1 - hitEffect.col) * 100}%`, t: `${50 + (hitEffect.adjacentRow1 - hitEffect.row) * 100}%`, key: 'adj1', beams: hitEffect.barrage2Beams || [] },
                        { l: `${50 + (hitEffect.adjacentCol2 - hitEffect.col) * 100}%`, t: `${50 + (hitEffect.adjacentRow2 - hitEffect.row) * 100}%`, key: 'adj2', beams: hitEffect.barrage3Beams || [] }
                      ].map((barrage) => (
                        <div
                          key={`bombard-barrage-${barrage.key}`}
                          style={{
                            position: 'absolute',
                            left: barrage.l,
                            top: barrage.t,
                            width: '100%',
                            height: '100%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 40,
                            pointerEvents: 'none'
                          }}
                        >
                          {barrage.beams.map((beam, i) => {
                            const delay = beam.delay;
                            const width = beam.width;
                            const left = beam.left;
                            const top = beam.top;
                            const glowColor = beam.glowColor;

                            return (
                              <div
                                key={`bombard-beam-${barrage.key}-${i}`}
                                style={{
                                  position: 'absolute',
                                  left: `${50 + left}%`,
                                  top: `${50 + top}%`,
                                  pointerEvents: 'none'
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: `-${width / 2}px`,
                                    width: `${width}px`,
                                    height: '800px',
                                    background: `linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 30%, ${glowColor} 70%, #ffffff 100%)`,
                                    boxShadow: `0 0 15px ${glowColor}, 0 0 30px ${glowColor}`,
                                    borderRadius: `${width / 2}px ${width / 2}px 0 0`,
                                    transformOrigin: 'bottom center',
                                    opacity: 0,
                                    animation: 'bombardBeamFall 1.0s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
                                    animationDelay: `${delay}s`,
                                  }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: '-50px',
                                    top: '-50px',
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: `radial-gradient(circle, #ffffff 10%, ${glowColor} 50%, rgba(255, 255, 255, 0) 70%)`,
                                    boxShadow: `0 0 30px ${glowColor}, inset 0 0 15px #ffffff`,
                                    animation: 'bombardBeamSplash 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                                    animationDelay: `${delay + 0.5}s`,
                                    opacity: 0,
                                    transform: 'scale(0)'
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </>
                  )}

                  {hitEffect.type === 'barbarian_cleave_effect' && (() => {
                    const activeWeaponId = equippedWeapons['barbarian'] || 'woodcutters_axe';
                    const activeWeapon = WEAPONS_DB.axes.find(w => w.id === activeWeaponId) ||
                      WEAPONS_DB.swords.find(w => w.id === activeWeaponId) ||
                      WEAPONS_DB.axes[0];
                    const weaponIcon = activeWeapon.image;

                    const targetTileCol = hitEffect.col !== undefined ? hitEffect.col : targetPos.col;
                    const targetTileRow = hitEffect.row !== undefined ? hitEffect.row : targetPos.row;

                    const dx = fighterPos.col - targetTileCol;
                    const dy = fighterPos.row - targetTileRow;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let adjCol = fighterPos.col;
                    let adjRow = fighterPos.row;
                    if (dist > 0) {
                      const colStep = Math.round(dx / dist);
                      const rowStep = Math.round(dy / dist);
                      adjCol = targetTileCol + colStep;
                      adjRow = targetTileRow + rowStep;
                    }
                    const swingDx = targetTileCol - adjCol;
                    const swingDy = targetTileRow - adjRow;
                    const baseAngle = Math.atan2(swingDy, swingDx) * (180 / Math.PI);
                    const adjDist = Math.sqrt(swingDx * swingDx + swingDy * swingDy);
                    const halfDistPx = (adjDist * 100) / 2;

                    const leftOffset = (swingDx / 2) * -100;
                    const topOffset = (swingDy / 2) * -100;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '60px',
                          height: '60px',
                          transform: `translate(-50%, -50%) rotate(${baseAngle}deg)`,
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={weaponIcon}
                          alt="cleave weapon"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: `${30 - halfDistPx}px 30px`,
                            animation: 'cleaveStuck 1.1s ease-in-out forwards'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'shield_slam_connect' && (() => {
                    const dx = targetPos.col - fighterPos.col;
                    const dy = targetPos.row - fighterPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const stepX = dist > 0 ? dx / dist : 1;
                    const stepY = dist > 0 ? dy / dist : 0;

                    const leftOffset = (-dx * 100) + stepX * 50;
                    const topOffset = (-dy * 100) + stepY * 50;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '56px',
                          height: '56px',
                          transform: `translate(-50%, -50%) ${animationPhase === 'lunge' ? `translate(${dx * 90}px, ${dy * 90}px)` : ''}`,
                          transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          maskImage: 'radial-gradient(circle, black 50%, transparent 100%)',
                          WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 100%)'
                        }}
                      >
                        <img
                          src={shield_slam}
                          alt="shield slam connect"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'headbutt_connect' && (() => {
                    const dx = targetPos.col - fighterPos.col;
                    const dy = targetPos.row - fighterPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const stepX = dist > 0 ? dx / dist : 1;
                    const stepY = dist > 0 ? dy / dist : 0;

                    const leftOffset = (-dx * 100) + stepX * 50;
                    const topOffset = (-dy * 100) + stepY * 50;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '56px',
                          height: '56px',
                          transform: `translate(-50%, -50%) ${animationPhase === 'lunge' ? `translate(${dx * 90}px, ${dy * 90}px)` : ''}`,
                          transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={head_butt}
                          alt="headbutt connect"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'stomp_shockwave' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '4px solid #ffdd57',
                        boxShadow: '0 0 15px #ffdd57, inset 0 0 10px #ffdd57',
                        animation: 'shockwaveExpand 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                        pointerEvents: 'none',
                        zIndex: 45
                      }}
                    />
                  )}
                  {hitEffect.type === 'monk_force_punch_effect' && (() => {
                    const dx = fighterPos.col - targetPos.col;
                    const dy = fighterPos.row - targetPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let adjCol = fighterPos.col;
                    let adjRow = fighterPos.row;
                    if (dist > 0) {
                      const colStep = Math.round(dx / dist);
                      const rowStep = Math.round(dy / dist);
                      adjCol = targetPos.col + colStep;
                      adjRow = targetPos.row + rowStep;
                    }
                    const swingDx = targetPos.col - adjCol;
                    const swingDy = targetPos.row - adjRow;

                    const leftOffset = (swingDx / 2) * -100;
                    const topOffset = (swingDy / 2) * -100;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '56px',
                          height: '56px',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={monk_force_punch}
                          alt="monk force punch connect"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'monk_punch_effect' && (() => {
                    const dx = fighterPos.col - targetPos.col;
                    const dy = fighterPos.row - targetPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let adjCol = fighterPos.col;
                    let adjRow = fighterPos.row;
                    if (dist > 0) {
                      const colStep = Math.round(dx / dist);
                      const rowStep = Math.round(dy / dist);
                      adjCol = targetPos.col + colStep;
                      adjRow = targetPos.row + rowStep;
                    }
                    const swingDx = targetPos.col - adjCol;
                    const swingDy = targetPos.row - adjRow;

                    // Calculate divide (midpoint) offset relative to Target
                    const leftOffset = (swingDx / 2) * -100;
                    const topOffset = (swingDy / 2) * -100;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '56px',
                          height: '56px',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={monk_punch}
                          alt="monk punch connect"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'monk_twin_finger_effect' && (() => {
                    const dx = fighterPos.col - targetPos.col;
                    const dy = fighterPos.row - targetPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let adjCol = fighterPos.col;
                    let adjRow = fighterPos.row;
                    if (dist > 0) {
                      const colStep = Math.round(dx / dist);
                      const rowStep = Math.round(dy / dist);
                      adjCol = targetPos.col + colStep;
                      adjRow = targetPos.row + rowStep;
                    }
                    const swingDx = targetPos.col - adjCol;
                    const swingDy = targetPos.row - adjRow;

                    const leftOffset = (swingDx / 2) * -100;
                    const topOffset = (swingDy / 2) * -100;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '56px',
                          height: '56px',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={monk_twin_finger_authority}
                          alt="monk twin finger authority"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 6px #ff9f1c)',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'fist_connect' && (() => {
                    const dx = fighterPos.col - targetPos.col;
                    const dy = fighterPos.row - targetPos.row;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let adjCol = fighterPos.col;
                    let adjRow = fighterPos.row;
                    if (dist > 0) {
                      const colStep = Math.round(dx / dist);
                      const rowStep = Math.round(dy / dist);
                      adjCol = targetPos.col + colStep;
                      adjRow = targetPos.row + rowStep;
                    }
                    const swingDx = targetPos.col - adjCol;
                    const swingDy = targetPos.row - adjRow;
                    const baseAngle = Math.atan2(swingDy, swingDx) * (180 / Math.PI);

                    // Calculate divide (midpoint) offset relative to Target (like healing hands)
                    const leftOffset = (swingDx / 2) * -100;
                    const topOffset = (swingDy / 2) * -100;
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${leftOffset}px)`,
                          top: `calc(50% + ${topOffset}px)`,
                          width: '56px',
                          height: '56px',
                          transform: `translate(-50%, -50%) rotate(${baseAngle + 180}deg) rotate(-90deg) scaleX(-1)`,
                          pointerEvents: 'none',
                          zIndex: 5000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          maskImage: 'radial-gradient(circle, black 50%, transparent 100%)',
                          WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 100%)'
                        }}
                      >
                        <img
                          src={soldier_fist_of_honor}
                          alt="fist connect"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                          }}
                        />
                      </div>
                    );
                  })()}
                  {hitEffect.type === 'fire_exp' && (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #ffe600 20%, #ff5400 60%, transparent 100%)',
                      animation: 'explode 0.3s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                      boxShadow: '0 0 30px #ff5400'
                    }}></div>
                  )}
                  {hitEffect.type === 'poison_burst' && (
                    <div style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #70e000 20%, #38b000 70%, transparent 100%)',
                      animation: 'explode 0.3s ease-out forwards',
                      boxShadow: '0 0 25px #38b000'
                    }}></div>
                  )}
                  {hitEffect.type === 'arrow_hit' && (
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #fff 30%, rgba(255, 183, 3, 0.6) 70%, transparent 100%)',
                      animation: 'explode 0.25s ease-out forwards',
                      boxShadow: '0 0 20px rgba(255, 183, 3, 0.8)'
                    }}></div>
                  )}
                  {hitEffect && hitEffect.type === 'dragon_fire_breath' && (
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: 'radial-gradient(circle, rgba(0,255,255,1) 10%, rgba(0,191,255,0.8) 40%, transparent 70%)',
                      borderRadius: '50%',
                      filter: 'blur(5px)',
                      animation: 'explode 0.5s ease-out forwards',
                      boxShadow: '0 0 30px #00ffff',
                      zIndex: 30,
                      pointerEvents: 'none'
                    }} />
                  )}
                  {hitEffect.type === 'ice_burst' && (
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: 'radial-gradient(circle, #ffffff 25%, #e0f7fa 55%, #00bfff 85%, transparent 100%)',
                      borderRadius: '52% 48% 46% 54% / 54% 46% 54% 46%',
                      animation: 'explode 0.4s ease-out forwards, organicGlow 0.4s linear infinite',
                      boxShadow: '0 0 20px 4px #00bfff, inset 0 0 10px rgba(0, 191, 255, 0.5)'
                    }}></div>
                  )}
                  {hitEffect.type === 'shadow' && (
                    <div style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #7209b7 30%, #560bad 80%, transparent 100%)',
                      animation: 'explode 0.3s ease-out forwards',
                      boxShadow: '0 0 20px #7209b7'
                    }}></div>
                  )}
                  {hitEffect.type === 'void_portal' && (
                    <div style={{
                      width: '90px',
                      height: '25px',
                      backgroundColor: '#111',
                      border: '2px solid #7209b7',
                      borderRadius: '50%',
                      boxShadow: '0 0 15px #7209b7',
                      animation: 'portalGrow 0.8s ease-out forwards',
                      transform: 'scaleY(0.5)'
                    }}></div>
                  )}
                  {hitEffect.type === 'annihilation_portal' && (
                    <div style={{
                      position: 'relative',
                      width: '90px',
                      height: '90px',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 35
                    }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            background: i === 0 ? 'rgba(0,0,0,0.65)' : 'transparent',
                            border: '3px solid #9d4edd',
                            borderRadius: '60% 40% 50% 50% / 40% 50% 60% 50%',
                            boxShadow: '0 0 15px #7b2cbf, inset 0 0 10px #7b2cbf',
                            animation: 'organicGlow 3s linear infinite, collapsarRing 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
                            animationDelay: `${i * 0.5}s`,
                            opacity: 0,
                            boxSizing: 'border-box'
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {hitEffect.type === 'sleep_rings' && (
                    <div style={{
                      position: 'relative',
                      width: '100px',
                      height: '100px',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 35
                    }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '100%',
                            height: '100%',
                            border: '2.2px dashed rgba(160, 160, 165, 0.75)',
                            borderRadius: '60% 40% 50% 50% / 40% 50% 60% 50%',
                            boxShadow: '0 0 10px rgba(160, 160, 165, 0.35), inset 0 0 6px rgba(160, 160, 165, 0.25)',
                            animation: 'sleepShrinkRing 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                            animationDelay: `${i * 0.4}s`,
                            opacity: 0,
                            boxSizing: 'border-box'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {hitEffect.type === 'hex_overlay' && (
                    <div style={{
                      position: 'relative',
                      width: '120px',
                      height: '120px',
                      pointerEvents: 'none',
                      zIndex: 4500,
                    }}>
                      {/* Outer clockwise dashed ring */}
                      <div style={{
                        position: 'absolute',
                        top: '10px', left: '10px', right: '10px', bottom: '10px',
                        border: '2px dashed #ab47bc',
                        borderRadius: '50%',
                        boxShadow: '0 0 12px rgba(171, 71, 188, 0.6), inset 0 0 12px rgba(171, 71, 188, 0.6)',
                        animation: 'hexRingSpinCw 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                      }} />
                      {/* Inner counter-clockwise dotted ring */}
                      <div style={{
                        position: 'absolute',
                        top: '22px', left: '22px', right: '22px', bottom: '22px',
                        border: '1.5px dotted #e040fb',
                        borderRadius: '50%',
                        boxShadow: '0 0 8px rgba(224, 64, 251, 0.5), inset 0 0 8px rgba(224, 64, 251, 0.5)',
                        animation: 'hexRingSpinCcw 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                      }} />
                      {/* Overlapping glowing squares forming an 8-pointed star */}
                      <div style={{
                        position: 'absolute',
                        top: '32px', left: '32px', right: '32px', bottom: '32px',
                        border: '1.5px solid #d500f9',
                        boxShadow: '0 0 15px #d500f9',
                        transform: 'rotate(0deg)',
                        animation: 'hexStarPulse 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '32px', left: '32px', right: '32px', bottom: '32px',
                        border: '1.5px solid #d500f9',
                        boxShadow: '0 0 15px #d500f9',
                        transform: 'rotate(45deg)',
                        animation: 'hexStarPulseOffset 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                      }} />
                      {/* Glowing core */}
                      <div style={{
                        position: 'absolute',
                        top: '45px', left: '45px', right: '45px', bottom: '45px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #ffffff 0%, #aa00ff 50%, transparent 100%)',
                        boxShadow: '0 0 20px #d500f9',
                        animation: 'hexCorePulse 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                      }} />
                      {/* Floating curse runes */}
                      <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        color: '#d500f9',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        textShadow: '0 0 8px #d500f9',
                        transform: 'translate(-50%, -50%)',
                        animation: 'hexRuneFloat 1.5s ease-out forwards',
                      }}>
                        ☠
                      </div>
                      {/* Glowing particle burst */}
                      {[...Array(6)].map((_, idx) => {
                        const angle = (idx * 360) / 6;
                        const rad = angle * (Math.PI / 180);
                        const dist = 45;
                        return (
                          <div
                            key={idx}
                            style={{
                              position: 'absolute',
                              top: '50%', left: '50%',
                              width: '6px', height: '6px',
                              backgroundColor: '#e040fb',
                              borderRadius: '50%',
                              boxShadow: '0 0 8px #e040fb',
                              transform: 'translate(-50%, -50%)',
                              animation: 'hexParticleFly 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                              '--target-x': `${Math.cos(rad) * dist}px`,
                              '--target-y': `${Math.sin(rad) * dist}px`,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {hitEffect.type === 'shadow_curse_rings' && (
                    <div style={{
                      position: 'relative',
                      width: '120px',
                      height: '120px',
                      pointerEvents: 'none',
                      zIndex: 4500,
                    }}>
                      <div className="shadow-curse-ring ring-1" />
                      <div className="shadow-curse-ring ring-2" />
                      <div className="shadow-curse-ring ring-3" />
                    </div>
                  )}
                </div>
              )}

              {/* --- Floating Combat Text --- */}
              {floatingTexts.map(ft => {
                const xOffset = typeof ft.xOffset === 'number' ? ft.xOffset : 0;

                return (
                  <div
                    key={ft.id}
                    style={{
                      position: 'absolute',
                      left: `calc(${ft.col * TILE_PCT + TILE_PCT / 2}% + ${xOffset}px)`,
                      top: `${ft.row * TILE_PCT}%`,
                      transform: 'translateX(-50%)',
                      color: ft.color || '#ff4d4d',
                      fontWeight: 'bold',
                      fontSize: isNaN(parseInt(ft.text)) ? (ft.type === 'crit' ? '10px' : '8px') : (ft.type === 'crit' ? '18px' : '14px'),
                      textShadow: '0 2px 4px #000, 0 0 8px rgba(0,0,0,0.8)',
                      zIndex: 60,
                      pointerEvents: 'none',
                      animation: 'floatUp 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                    }}
                  >
                    {ft.text}
                  </div>
                );
              })}

              {/* --- Shield Wall Overlay (Real established visual) --- */}
              {shieldWallActive && selectedFighterId === 'soldier' && (() => {
                const centerY = fighterPos.row;
                const lanesAffected = [];
                for (let dy = -2; dy <= 2; dy++) {
                  const lane = centerY + dy;
                  if (lane >= 0 && lane < GRID_SIZE) {
                    lanesAffected.push(lane);
                  }
                }
                const minLane = Math.min(...lanesAffected);
                const topPercent = minLane * TILE_PCT;
                const heightPercent = lanesAffected.length * TILE_PCT;
                return (
                  <div
                    className="shield-wall-overlay"
                    style={{
                      position: 'absolute',
                      left: `calc(${(fighterPos.col + 1) * TILE_PCT}% - 3px)`,
                      top: `${topPercent}%`,
                      width: '6px',
                      height: `${heightPercent}%`,
                      zIndex: 20,
                      pointerEvents: 'none'
                    }}
                  />
                );
              })()}

              {/* Scoped Weapon Selector Modal Overlay */}
              {weaponModalOpen && (() => {
                const activeWeaponId = equippedWeapons[selectedFighterId] || 'shortsword_sword';
                return (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(20, 20, 22, 0.97)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                        <span style={{ fontSize: '13px', color: '#ffb703', fontWeight: 'bold', letterSpacing: '0.05em' }}>SELECT WEAPON</span>
                        <span style={{ fontSize: '10px', color: '#888' }}>Equipping for {selectedFighter.name}</span>
                      </div>
                      <button
                        onClick={() => setWeaponModalOpen(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#aaa',
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
                      >
                        &times;
                      </button>
                    </div>

                    {/* Tabs */}
                    <div style={{
                      display: 'flex',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '3px',
                      margin: '10px 16px 5px 16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.04)'
                    }}>
                      {['swords', 'axes'].map((tab) => {
                        const isActive = weaponModalTab === tab;
                        return (
                          <button
                            key={tab}
                            onClick={() => setWeaponModalTab(tab)}
                            style={{
                              flex: 1,
                              padding: '6px',
                              borderRadius: '4px',
                              background: isActive ? 'rgba(255, 183, 3, 0.12)' : 'transparent',
                              border: 'none',
                              color: isActive ? '#ffb703' : '#aaa',
                              fontWeight: 'bold',
                              fontSize: '11px',
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              transition: 'all 0.15s'
                            }}
                          >
                            {tab}
                          </button>
                        );
                      })}
                    </div>

                    {/* Scrollable Body */}
                    <div style={{
                      flex: 1,
                      padding: '5px 16px 16px 16px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '15px',
                      willChange: 'transform',
                      WebkitOverflowScrolling: 'touch',
                      transform: 'translateZ(0)'
                    }}>
                      {[1, 2, 3].map((tier) => {
                        const weaponsInTier = WEAPONS_DB[weaponModalTab].filter(w => w.tier === tier);
                        if (weaponsInTier.length === 0) return null;

                        const tierColors = {
                          1: '#a8a29e',
                          2: '#3b82f6',
                          3: '#d97706'
                        };

                        return (
                          <div key={tier} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: tierColors[tier],
                                boxShadow: `0 0 6px ${tierColors[tier]}`
                              }} />
                              <span style={{ fontSize: '9px', fontWeight: 'bold', color: tierColors[tier], letterSpacing: '0.08em' }}>TIER {tier}</span>
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '8px'
                            }}>
                              {weaponsInTier.map((weapon) => {
                                const isEquipped = activeWeaponId === weapon.id;
                                return (
                                  <div
                                    key={weapon.id}
                                    onClick={() => {
                                      setEquippedWeapons(prev => ({
                                        ...prev,
                                        [selectedFighterId]: weapon.id
                                      }));
                                      setWeaponModalOpen(false);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '6px 8px',
                                      background: isEquipped ? 'rgba(255, 183, 3, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                      border: isEquipped ? '1px solid #ffb703' : '1px solid rgba(255, 255, 255, 0.05)',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                      position: 'relative'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isEquipped) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 183, 3, 0.3)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isEquipped) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                      }
                                    }}
                                  >
                                    <div style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '4px',
                                      background: 'rgba(0, 0, 0, 0.3)',
                                      border: isEquipped ? '1px solid #ffb703' : '1px solid rgba(255, 255, 255, 0.1)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '3px',
                                      flexShrink: 0
                                    }}>
                                      <img src={weapon.image} alt={weapon.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, textAlign: 'left' }}>
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{weapon.name}</span>
                                      <span style={{ fontSize: '8px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={weapon.description}>{weapon.description}</span>
                                    </div>

                                    {isEquipped && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: '#ffb703',
                                        color: '#000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '8px',
                                        fontWeight: 'bold'
                                      }}>
                                        ✓
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* --- Induce Fear Board Overlay --- */}
              {induceFearActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '380px',
                    height: '380px',
                    backgroundImage: `url("${induce_fear}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 0.5,
                    pointerEvents: 'none',
                    zIndex: 90,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    animation: 'fearOverlayPulse 1.5s ease-in-out forwards'
                  }}
                />
              )}
              {targetFearOverlay && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${targetFearOverlay.col * TILE_PCT + TILE_PCT / 2}%`,
                    top: `${targetFearOverlay.row * TILE_PCT + TILE_PCT / 2}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '95px',
                    height: '95px',
                    backgroundImage: `url("${induce_fear}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 0.5,
                    pointerEvents: 'none',
                    zIndex: 90,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    animation: 'fearOverlayPulse 1.5s ease-in-out forwards'
                  }}
                />
              )}

              {/* --- Despair Board Overlay --- */}
              {despairActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '420px',
                    height: '420px',
                    backgroundImage: `url("${shadow_presence}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 0.65,
                    pointerEvents: 'none',
                    zIndex: 90,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    animation: 'fearOverlayPulse 1.5s ease-in-out forwards'
                  }}
                />
              )}

              {/* --- Vampire Bat Fly Swarm Overlay --- */}
              {batFlyMovementActive && [0, 1, 2].map((idx) => {
                const pos = getBatPosition(idx);
                return (
                  <img
                    key={`bat-${idx}`}
                    src={bat_individual}
                    alt="flying bat"
                    style={{
                      position: 'absolute',
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      width: '28px',
                      height: '28px',
                      transform: `translate(-50%, -50%) scaleX(${pos.scaleX})`,
                      zIndex: 95,
                      pointerEvents: 'none',
                      animation: 'fadeIn 0.25s ease-out'
                    }}
                  />
                );
              })}
            </div>

            {/* Weapon Selector Component */}
            {selectedUnitType === 'fighter' && (() => {
              const activeWeaponId = equippedWeapons[selectedFighterId] || 'shortsword_sword';
              const activeWeapon = WEAPONS_DB.swords.find(w => w.id === activeWeaponId) ||
                WEAPONS_DB.axes.find(w => w.id === activeWeaponId) ||
                WEAPONS_DB.swords[0];
              return (
                <div
                  onClick={() => {
                    const isAxe = WEAPONS_DB.axes.some(w => w.id === activeWeaponId);
                    setWeaponModalTab(isAxe ? 'axes' : 'swords');
                    setWeaponModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: '500px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                    marginTop: '10px',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 183, 3, 0.4)';
                    e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(255, 183, 3, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.3)';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 183, 3, 0.4)',
                    boxShadow: '0 0 12px rgba(255, 183, 3, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    flexShrink: 0
                  }}>
                    <img src={activeWeapon.image} alt={activeWeapon.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, textAlign: 'left' }}>
                    <span style={{ fontSize: '9px', color: '#ffb703', fontWeight: 'bold', letterSpacing: '0.12em' }}>EQUIPPED WEAPON</span>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{activeWeapon.name}</span>
                    <span style={{ fontSize: '11px', color: '#888' }}>Tier {activeWeapon.tier}</span>
                  </div>
                  {/* Subtle selection settings indicator */}
                  <div style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '18px', paddingLeft: '10px' }}>
                    ⚙
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Panel: Abilities */}
          <div style={{
            flex: '0 0 280px',
            width: '280px',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            maxHeight: '75vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px', fontSize: '18px', color: '#ff5400', letterSpacing: '0.05em' }}>ABILITIES</h3>
            {selectedUnitType === 'monster' && selectedMonsterId === 'troll' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold', textAlign: 'left' }}>Troll HP: {trollHpPct}%</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setTrollHpPct(30)}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ff4d4d', background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', cursor: 'pointer', outline: 'none' }}
                  >
                    Set 30%
                  </button>
                  <button
                    onClick={() => setTrollHpPct(100)}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #2ecc71', background: 'rgba(46,204,113,0.1)', color: '#2ecc71', cursor: 'pointer', outline: 'none' }}
                  >
                    Set 100%
                  </button>
                </div>
              </div>
            )}
            {selectedFighter.id === 'summoner' ? (
              // Grouped Summoner UI
              (() => {
                const riftAbility = selectedFighter.abilities.find(a => a.tier === 'rift');
                const tier1Abilities = selectedFighter.abilities.filter(a => a.tier === 1);
                const tier2Abilities = selectedFighter.abilities.filter(a => a.tier === 2);
                const tier3Abilities = selectedFighter.abilities.filter(a => a.tier === 3);
                const utilityAbilities = selectedFighter.abilities.filter(a => a.tier === 'utility');

                const renderAbilityButton = (a) => {
                  const isTier3 = a.tier === 3;
                  const isDisabled = isAnimating || (isTier3 && !riftPortalActive);
                  return (
                    <div key={a.id} style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
                      <button
                        disabled={isDisabled}
                        onClick={() => triggerAbility(a)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          outline: 'none',
                          opacity: isDisabled ? 0.4 : 1,
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          if (isDisabled) return;
                          e.currentTarget.style.background = 'rgba(255, 84, 0, 0.12)';
                          e.currentTarget.style.borderColor = '#ff5400';
                        }}
                        onMouseLeave={(e) => {
                          if (isDisabled) return;
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        }}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '4px',
                          background: '#222',
                          backgroundImage: `url("${a.icon}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          border: '1px solid rgba(255,255,255,0.15)',
                          flexShrink: '0'
                        }}></div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#ff9f1c' }}>{a.name}</div>
                          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px', lineHeight: '1.3' }}>{a.desc}</div>
                        </div>
                      </button>
                    </div>
                  );
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Rift Portal at the top */}
                    {riftAbility && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>Rift Spells</div>
                        {renderAbilityButton(riftAbility)}
                      </div>
                    )}

                    {/* Tier 1 Group */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', marginTop: '6px', letterSpacing: '0.05em' }}>Tier 1 Summon Spells</div>
                      {tier1Abilities.map(renderAbilityButton)}
                    </div>

                    {/* Tier 2 Group */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', marginTop: '6px', letterSpacing: '0.05em' }}>Tier 2 Summon Spells</div>
                      {tier2Abilities.map(renderAbilityButton)}
                    </div>

                    {/* Tier 3 Group */}
                    <div>
                      <div style={{
                        fontSize: '11px',
                        color: riftPortalActive ? '#a855f7' : '#888',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                        marginTop: '6px',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>Tier 3 Summon Spells</span>
                        {!riftPortalActive && <span style={{ fontSize: '9px', color: '#ff4d4d', textTransform: 'none', fontWeight: 'normal' }}>(Locked)</span>}
                      </div>
                      {tier3Abilities.map(renderAbilityButton)}
                    </div>

                    {/* Utilities Group */}
                    {utilityAbilities.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', marginTop: '6px', letterSpacing: '0.05em' }}>Utility Spells</div>
                        {utilityAbilities.map(renderAbilityButton)}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              selectedFighter.abilities.map(a => {
                const isNotch = a.id === 'notch';
                const isAstralSkill = a.id === 'monk_third_eye' || a.id === 'monk_astral_projection';

                const isReassemblySkill = a.id === 'reassembly';
                const isReassemblyCooldown = isReassemblySkill && skeletonReassemblyCooldownEndTime && currentTime < skeletonReassemblyCooldownEndTime;
                const isOtherSkillDisabledByDeath = !isReassemblySkill && selectedUnitType === 'monster' && selectedMonsterId === 'skeleton' && skeletonReassemblyActive;
                const isDisabled = isAnimating ||
                  (isAstralSkill && !astralModeActive) ||
                  isReassemblyCooldown ||
                  isOtherSkillDisabledByDeath ||
                  (isReassemblySkill && skeletonReassemblyActive);
                return (
                  <div key={a.id} style={{ position: 'relative', width: '100%' }}>
                    {isNotch && submenuOpen && (
                      <div style={{
                        position: 'absolute',
                        bottom: 'calc(100% - 10px)',
                        left: '20px',
                        width: '0',
                        height: '0',
                        zIndex: 100,
                      }}>
                        {[
                          { id: 'force', icon: ranger_force_arrow, label: 'Force', x: -32, y: -35 },
                          { id: 'ice', icon: ranger_ice_arrow, label: 'Ice', x: -11, y: -46 },
                          { id: 'poison', icon: ranger_poison_arrow, label: 'Poison', x: 11, y: -46 },
                          { id: 'celestial', icon: ranger_celestial_arrow, label: 'Celestial', x: 32, y: -35 }
                        ].map((arrow, idx) => {
                          const isCurrent = notchedArrow === arrow.id;
                          return (
                            <button
                              key={arrow.id}
                              title={`${arrow.label} Arrow`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotchedArrow(arrow.id);
                                setSubmenuOpen(false);
                              }}
                              style={{
                                position: 'absolute',
                                left: `${arrow.x}px`,
                                top: `${arrow.y}px`,
                                transform: 'translate(-50%, -50%)',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#222',
                                backgroundImage: `url(${arrow.icon})`,
                                backgroundSize: '70%',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                border: isCurrent ? '2px solid #ffb703' : '1px solid rgba(255, 255, 255, 0.25)',
                                cursor: 'pointer',
                                boxShadow: isCurrent ? '0 0 8px #ffb703' : '0 4px 8px rgba(0,0,0,0.5)',
                                transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                                padding: 0,
                                outline: 'none',
                                animation: `scaleUp 0.15s ease-out ${idx * 0.03}s both`
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.2)';
                                e.currentTarget.style.borderColor = '#ffb703';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                                e.currentTarget.style.borderColor = isCurrent ? '#ffb703' : 'rgba(255, 255, 255, 0.25)';
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                    <button
                      disabled={isDisabled}
                      onClick={() => {
                        if (isNotch) {
                          setSubmenuOpen(!submenuOpen);
                        } else {
                          triggerAbility(a);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#fff',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        outline: 'none',
                        opacity: isDisabled ? 0.4 : 1,
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        if (isDisabled) return;
                        e.currentTarget.style.background = 'rgba(255, 84, 0, 0.12)';
                        e.currentTarget.style.borderColor = '#ff5400';
                      }}
                      onMouseLeave={(e) => {
                        if (isDisabled) return;
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        background: '#222',
                        backgroundImage: `url("${a.icon}")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        border: '1px solid rgba(255,255,255,0.15)',
                        flexShrink: '0',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {isReassemblySkill && skeletonReassemblyCooldownEndTime && currentTime < skeletonReassemblyCooldownEndTime && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2
                          }}>
                            <svg
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                transform: 'rotate(-90deg)',
                                pointerEvents: 'none'
                              }}
                              viewBox="0 0 20 20"
                            >
                              <circle
                                cx="10"
                                cy="10"
                                r="10"
                                fill="none"
                                stroke="rgba(0, 0, 0, 0.7)"
                                strokeWidth="20"
                                strokeDasharray="62.83"
                                strokeDashoffset={getReassemblyCooldownDashOffset()}
                              />
                            </svg>
                            <span style={{
                              position: 'relative',
                              zIndex: 3,
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                            }}>
                              {Math.ceil((skeletonReassemblyCooldownEndTime - currentTime) / 1000)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ff9f1c' }}>{a.name}</div>
                        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px', lineHeight: '1.3' }}>{a.desc}</div>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Shard Assembly Content (preserved functionality) */}
      {activeTab === 'shard assembly' && (
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          maxWidth: '1200px',
          gap: '30px',
          padding: '0 20px',
          alignItems: 'stretch',
          marginBottom: '50px'
        }}>
          {/* Left panel placeholder with matching dimensions */}
          <div style={{
            flex: '1',
            visibility: 'hidden',
            maxHeight: '75vh'
          }} />

          {/* Center Panel: Shard Assembly Content */}
          <div style={{
            flex: '2.5',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: '75vh'
          }}>
            {/* Rune Selection Menu */}
            <div style={{
              display: 'flex',
              gap: '15px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              background: '#222',
              padding: '15px',
              borderRadius: '8px'
            }}>
              {Object.keys(runesData).map(runeName => {
                const data = runesData[runeName];
                const isSelected = selectedRune === runeName;

                return (
                  <div
                    key={runeName}
                    style={{
                      position: 'relative',
                      cursor: data.isComplete ? 'pointer' : 'not-allowed',
                      opacity: data.isComplete ? 1 : 0.4,
                      border: isSelected ? '2px solid white' : '2px solid transparent',
                      borderRadius: '4px',
                      padding: '4px',
                      transition: 'border 0.2s'
                    }}
                    onClick={() => data.isComplete && setSelectedRune(runeName)}
                    title={runeName}
                  >
                    <img src={data.baseImg} alt={runeName} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                    {!data.isComplete && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 0, 0, 0.8)',
                        fontSize: '60px',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                      }}>
                        X
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setIsAssembled(!isAssembled)}
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: activeData?.isComplete ? 1 : 0.5,
                pointerEvents: activeData?.isComplete ? 'auto' : 'none',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                borderRadius: '4px'
              }}
            >
              {isAssembled ? 'Reset' : 'Animate'}
            </button>

            {/* Animation Containers */}
            {activeData?.isComplete && (
              <div style={{ display: 'flex', gap: '50px' }}>
                {/* Container 1: Assembled Image Reference */}
                <div style={{
                  width: '100px',
                  height: '100px',
                  border: '1px solid #333',
                  position: 'relative'
                }}>
                  <img
                    src={activeData.assembledImg}
                    alt={`${selectedRune} Assembled`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                {/* Container 2: Shards Overlay */}
                <div style={{
                  width: '100px',
                  height: '100px',
                  border: '1px solid #333',
                  position: 'relative'
                }}>
                  <AssemblyAnimation
                    pieces={activeData.pieces}
                    isAssembled={isAssembled}
                    distance={40}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right panel placeholder with matching dimensions */}
          <div style={{
            flex: '1',
            visibility: 'hidden',
            maxHeight: '75vh'
          }} />
        </div>
      )}
    </div>
  );
};

export default SandboxPage;
