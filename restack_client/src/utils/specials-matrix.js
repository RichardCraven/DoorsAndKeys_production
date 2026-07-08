import * as images from './images'

// Centralized canonical specials matrix. Exporting as default so other
// modules (CombatManager, UIs, AI) import the authoritative data.
//
// COOLDOWN UNITS: All `cooldown` values are in ERAS (one full turn cycle).
// kickoffSpecialCooldown converts eras → ticks using TICKS_PER_ERA (250)
// multiplied by the live FIGHT_INTERVAL, so cooldowns automatically
// stretch/compress when game speed changes.

// this documents Specials as well as Passives

const specialsMatrix = {
    deadeye_shot: {
        name: 'deadeye shot',
        type: 'special',
        icon: images['evilai_charm'],
        cooldown: 10,
        damage: 10,
        effect: ['damage_single_target'],
        level: 1
    },
    berserker_rage: {
        name: 'berserker rage',
        type: 'special',
        icon: images['demonskull_charm'],
        cooldown: 10,
        effect: ['buff_self', 'nerf_self'],
        duration: 18,
        buff: {
            increase_stats: {
                stats: [
                    { stat: 'str', amount: 5 },
                    { stat: 'dex', amount: 3 },
                    { stat: 'atk', amount: 7 }
                ]
            }
        },
        nerf: {
            decrease_stats: {
                stats: [
                    { stat: 'int', amount: 3 }
                ]
            }
        },
        level: 1
    },
    healing_hymn: {
        name: 'healing hymn',
        type: 'special',
        icon: images['lundi_charm'],
        effect: ['buff_all_friendly'],
        buff: {
            heal: {
                amount: 12
            }
        },
        cooldown: 12,
        level: 1
    },
    reveal_weakness: {
        name: 'reveal weakness',
        type: 'special',
        icon: images['hamsa_charm'],
        cooldown: 12,
        effect: ['special'],
        special_instructions: 'reveal all monsters weaknesses',
        level: 1
    },
    flying_lotus: {
        name: 'flying lotus',
        type: 'special',
        icon: images['lundi_charm'],
        cooldown: 11,
        damage: 15,
        effect: ['damage_single_target', 'special'],
        special_instructions: 'target has 50% chance to be stunned for 1 sec * $str',
        level: 1
    },
    windmill: {
        name: 'windmill',
        type: 'special',
        icon: images['fist_punch'],
        cooldown: 14,
        damage: 8,
        effect: ['damage_multi_target', 'special'],
        special_instructions: 'Strike all four adjacent tiles simultaneously, dealing damage to every enemy in range.',
        level: 1
    },
    shield_wall: {
        name: 'shield wall',
        type: 'special',
        icon: images['infantry_shield'],
        cooldown: 15,       // 15-era recharge after expiry
        duration: 6,        // wall lasts 6 eras
        energy_cost: 30,    // costs 30% energy to erect
        effect: ['special'],
        special_instructions: 'Erect a 5-tile vertical barrier at the Soldier\'s front edge. Blocks all unit movement across the line for 4 eras. Soldier cannot move or attack while active.',
        level: 1
    },
    berserker: {
        name: 'berserker',
        type: 'special',
        icon: images['demonskull_charm'],
        cooldown: 20,       // 20-era recharge after expiry
        energy_cost: 60,    // costs 60% energy to activate
        effect: ['buff_self'],
        special_instructions: 'If 3+ enemies are present at the start of combat, enter a berserk state. Costs 60% energy. Doubles movement speed and attack speed for one full turn cycle.',
        level: 1
    },
    force_back: {
        name: 'force back',
        type: 'special',
        icon: images['buckler'],
        cooldown: 10,
        damage: 5,
        effect: ['special'],
        special_instructions: 'Push all enemies in the forward arc one tile back.',
        level: 1
    },
    ice_blast: {
        name: 'ice blast',
        type: 'special',
        icon: images['ice_blast'],
        cooldown: 18,
        damage: 5,
        energy_cost: 80,
        effect: ['damage_single_target', 'special'],
        special_instructions: 'each enemy has a 40% chance to be frozen',
        level: 1
    },
    fire_blast: {
        name: 'fire blast',
        type: 'special',
        icon: images['fire_blast'],
        energy_cost: 30,
        cooldown: 4,
        damage: 7,
        effect: ['damage_multi_target', 'special'],
        special_instructions: 'each enemy has a 40% chance to be lit aflame',
        level: 1
    },
    induce_fear: {
        name: 'induce fear',
        type: 'special',
        icon: images['wide_skull'],
        cooldown: 15,
        energy_cost: 90,
        duration: 10,
        effect: ['nerf_all_enemies'],
        nerf: {
            decrease_stats: {
                stats: [
                    { stat: 'atk', amount: 50, isPercent: true },
                    { stat: 'def', amount: 50, isPercent: true }
                ]
            }
        },
        special_instructions: 'Costs 90 energy. Paralyzes all enemy fighters with dread — halves their ATK and DEF for 5 eras. A shroud of darkness blankets the entire battlefield.',
        level: 1
    },
    sticky_fingers: {
        name: 'sticky fingers',
        type: 'special',
        icon: images['hand_1'],
        energy_cost: 100,
        cooldown: 0,
        effect: ['special'],
        special_instructions: 'Costs 100 energy. Steals a random non-equipped item from the crew\'s inventory, then flees to the backline. If the goblin escapes, the item is lost permanently.',
        level: 1
    },
    petrify: {
        name: 'petrify',
        type: 'special',
        icon: images['hand_1'],
        energy_cost: 80,
        duration: 10,
        cooldown: 15,
        effect: ['special'],
        special_instructions: 'Target is turned to stone, becoming immobile and invulnerable but also unable to act',
        level: 1
    },
    energy_burn: {
        name: 'energy burn',
        type: 'special',
        icon: images['hand_1'],
        energy_cost: 60,
        cooldown: 12,
        effect: ['special'],
        special_instructions: 'Reduces targets energy by 50% (rounded down), dealing damage to them. Damage is equal to energy lost - targets fortitude value. ',
        level: 1
    },
    invisibility: {
        name: 'invisibility',
        type: 'special',
        icon: images['nukta_charm'],
        cooldown: 20,
        duration: 12,
        energy_cost: 80,
        effect: ['special'],
        special_instructions: 'Costs 80 energy. The fighter becomes invisible for 4 eras, gaining evasion but unable to attack. While invisible, the fighter cannot be targeted by enemy attacks or specials, but also cannot use their own attacks or specials.',
        level: 1
    },
    zealotry: {
        name: 'zealotry',
        type: 'special',
        icon: images['demonskull_charm'],
        cooldown: 20,
        effect: ['buff_self'],
        buff: {
            increase_stats: {
                stats: [
                    { stat: 'atk', amount: 6 },
                    { stat: 'str', amount: 4 }
                ]
            }
        },
        special_instructions: 'Enters a fanatical rage, increasing attack and strength for 2 eras.',
        level: 1
    },

    // ── Monster specials ──────────────────────────────────────────────────────

    major_magic_missile: {
        name: 'major magic missile',
        type: 'special',
        icon: images['magic_missile'],
        cooldown: 5,
        damage: 12,
        energy_cost: 40,
        effect: ['damage_single_target'],
        special_instructions: 'Launches a powerful barrage of arcane bolts at a single target.',
        level: 1
    },
    minor_magic_missile: {
        name: 'minor magic missile',
        type: 'special',
        icon: images['magic_missile'],
        cooldown: 7,
        damage: 6,
        energy_cost: 30,
        effect: ['damage_single_target'],
        special_instructions: 'Launches a small burst of arcane bolts at a single target.',
        level: 1
    },
    obliterate: {
        name: 'obliterate',
        type: 'special',
        icon: images['void_lance'],
        cooldown: 'TBD',
        damage: 'TBD',
        energy_cost: 'TBD',
        effect: ['TBD'],
        special_instructions: 'TBD',
        level: 1
    },
    invisibility: {
        name: 'invisibility',
        type: 'special',
        icon: images['nukta_charm'],
        cooldown: 'TBD',
        duration: 'TBD',
        energy_cost: 'TBD',
        effect: ['TBD'],
        special_instructions: 'TBD',
        level: 1
    },
    induce_madness: {
        name: 'induce madness',
        type: 'special',
        icon: images['eldritch_mask'],
        cooldown: 8,
        energy_cost: 60,
        effect: ['special'],
        special_instructions: 'Inflicts psychological trauma on a target, causing them to hallucinate and skip actions.',
        level: 1
    },
    regeneration: {
        name: 'regeneration',
        type: 'special',
        icon: images['lundi_charm'],
        cooldown: 15,
        energy_cost: 20,
        duration: 10,
        effect: ['heal_self_over_time'],
        regeneration_percent: 3,
        special_instructions: 'Regenerate 3% of max HP every era for 6 eras. Costs 80 energy, 15 era cooldown.',
        level: 1
    },
    greater_regeneration: {
        name: 'greater regeneration',
        type: 'special',
        icon: images['lundi_charm'],
        cooldown: 20,
        energy_cost: 40,
        duration: 15,
        effect: ['heal_self_over_time'],
        regeneration_percent: 5,
        special_instructions: 'Regenerate 5% of max HP every era for 9 eras. Costs 90 energy, 20 era cooldown.',
        level: 1
    },
    regenerate: {
        name: 'regenerate',
        type: 'passive',
        icon: images['lundi_charm'],
        cooldown: null,
        effect: ['heal_self_over_time'],
        special_instructions: 'TBD',
        level: 1
    },
    banshee_wail: {
        name: 'banshee wail',
        type: 'special',
        icon: images['wide_skull'],
        cooldown: 'TBD',
        energy_cost: 'TBD',
        effect: ['TBD'],
        special_instructions: 'TBD',
        level: 1
    },
    berserk: {
        name: 'berserk',
        type: 'special',
        icon: images['demonskull_charm'],
        cooldown: 'TBD',
        duration: 'TBD',
        energy_cost: 'TBD',
        effect: ['buff_self'],
        special_instructions: 'TBD',
        level: 1
    },
    petrify: {
        name: 'petrify',
        type: 'special',
        icon: images['hamsa_charm'],
        cooldown: 'TBD',
        duration: 'TBD',
        energy_cost: 'TBD',
        effect: ['TBD'],
        special_instructions: 'TBD',
        level: 1
    },
    duplicate: {
        name: 'duplicate',
        type: 'special',
        icon: images['evilai_charm'],
        cooldown: 30,
        energy_cost: 100,   // depletes the original's entire energy pool
        effect: ['special'],
        special_instructions: 'Costs ALL energy. Spawns an exact copy of this monster (same current stats, same attacks) at an adjacent tile. The copy does NOT inherit the duplicate ability.',
        level: 1
    },
    bifurcate: {
        name: 'bifurcate',
        type: 'special',
        icon: images['evilai_charm'],
        cooldown: 30,
        energy_cost: 100,   // fires when energy pool is full — original is destroyed
        effect: ['special'],
        special_instructions: 'Triggers when energy reaches 100. The original is destroyed and splits into TWO copies, each with 50% of the original\'s current HP. Neither copy inherits the bifurcate ability.',
        level: 1
    },
    possess: {
        name: 'possess',
        type: 'special',
        icon: images['necrotic_mask'],
        cooldown: 'TBD',
        duration: 'TBD',
        energy_cost: 'TBD',
        effect: ['TBD'],
        special_instructions: 'TBD',
        level: 1
    },
    tesseract: {
        name: 'tesseract',
        type: 'special',
        icon: images['evilai_charm'],
        cooldown: 'TBD',
        energy_cost: 'TBD',
        effect: ['TBD'],
        special_instructions: 'TBD',
        level: 1
    },
    firestorm: {
        name: 'firestorm',
        type: 'special',
        icon: images['fire_blast'],
        cooldown: 'TBD',
        damage: 'TBD',
        energy_cost: 'TBD',
        effect: ['damage_multi_target'],
        special_instructions: 'TBD',
        level: 1
    },
}

const passivesMatrix = {
    flying: {
        name: 'flying',
        type: 'passive',
        icon: images['buckler'],
        // need to update icon for this
        effect: ['movement_modifier, can move two spaces at a time, can pass over barriers like shield wall, and other units (but cannot end a movement on top of another unit)'],
        special_instructions: 'TBD',
        level: 1
    },
    reassemble: {
        name: 'reassemble',
        type: 'passive',
        icon: images['buckler'],
        // need to update icon for this
        effect: ['on death, has a 40% chance to reassemble with 30% HP, and if it does, it loses all specials and passives and gains the "berserk" special which doubles its attack and movement speed but prevents it from using any other specials. Can only trigger once per combat.'],
        special_instructions: 'TBD',
        level: 1
    }
}

export default specialsMatrix;
