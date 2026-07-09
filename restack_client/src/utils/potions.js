/**
 * potions.js
 * Defines all compound potions that the Sage can brew (and the Alchemist can sell).
 * Each potion is a self-targeted consumable item stored in the main inventory.
 *
 * Effect shape:
 *   { type: 'heal_pct' | 'heal_flat' | 'buff_stat' | 'buff_dodge' | 'cleanse' | 'restore_endurance' | 'buff_resist',
 *     value: <number>,           // amount or % (0-100 for pct)
 *     stat: <string|undefined>,  // which stat to buff (e.g. 'atk', 'def', 'speed', 'magic_dmg')
 *     rounds: <number|undefined> // how many combat rounds the buff lasts (undefined = instant)
 *     cleanse: <string[]>        // debuff keys to remove
 *   }
 */
export const POTIONS = {
    healing_salve: {
        id: 'healing_salve',
        name: 'Healing Salve',
        description: 'A simple herbal salve. Restores 20% of max HP.',
        icon: 'potion_healing_salve',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 600,          // 10 minutes
        effect: { type: 'heal_pct', value: 20 }
    },
    greater_salve: {
        id: 'greater_salve',
        name: 'Greater Salve',
        description: 'A fortified herbal compound. Restores 40% of max HP.',
        icon: 'potion_greater_salve',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 1200,         // 20 minutes
        effect: { type: 'heal_pct', value: 40 }
    },
    health_potion: {
        id: 'health_potion',
        name: 'Health Potion',
        description: 'A potent alchemical blend. Restores 60% of max HP.',
        icon: 'potion_health',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 1800,         // 30 minutes
        effect: { type: 'heal_pct', value: 60 }
    },
    poison_antidote: {
        id: 'poison_antidote',
        name: 'Poison Antidote',
        description: 'Neutralises poison and restores a small amount of HP.',
        icon: 'potion_poison_antidote',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 1800,         // 30 minutes
        effect: { type: 'cleanse', cleanse: ['poisoned'], healFlat: 10 }
    },
    clarity_potion: {
        id: 'clarity_potion',
        name: 'Clarity Potion',
        description: 'Clears the mind. Removes stun and silence, restores 1 energy.',
        icon: 'potion_clarity',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 2700,         // 45 minutes
        effect: { type: 'cleanse', cleanse: ['stunned', 'silenced'], restoreEnergy: 1 }
    },
    strength_elixir: {
        id: 'strength_elixir',
        name: 'Strength Elixir',
        description: 'Boosts physical power. +30% ATK for 3 rounds.',
        icon: 'potion_strength',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 3600,         // 1 hour
        effect: { type: 'buff_stat', stat: 'atk', value: 30, rounds: 3 }
    },
    endurance_brew: {
        id: 'endurance_brew',
        name: 'Endurance Brew',
        description: "Restores 50% of the unit's endurance.",
        icon: 'potion_endurance',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 3600,         // 1 hour
        effect: { type: 'restore_endurance', value: 50 }
    },
    shadow_draught: {
        id: 'shadow_draught',
        name: 'Shadow Draught',
        description: 'Wraps the drinker in shadow. +20% dodge for 3 rounds.',
        icon: 'potion_shadow',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 5400,         // 1.5 hours
        effect: { type: 'buff_dodge', value: 20, rounds: 3 }
    },
    swiftness_tonic: {
        id: 'swiftness_tonic',
        name: 'Swiftness Tonic',
        description: 'Quickens the body. +2 speed for 3 rounds.',
        icon: 'potion_swiftness',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 5400,         // 1.5 hours
        effect: { type: 'buff_stat', stat: 'speed', value: 2, rounds: 3 }
    },
    frost_essence: {
        id: 'frost_essence',
        name: 'Frost Essence',
        description: 'Hardens the blood. Grants cold immunity and resists slowing for 3 rounds.',
        icon: 'potion_frost',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 7200,         // 2 hours
        effect: { type: 'buff_resist', resists: ['cold', 'slowed'], rounds: 3 }
    },
    arcane_infusion: {
        id: 'arcane_infusion',
        name: 'Arcane Infusion',
        description: 'Floods the veins with arcane energy. +40% magic damage for 3 rounds.',
        icon: 'potion_arcane',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 9000,         // 2.5 hours
        effect: { type: 'buff_stat', stat: 'magic_dmg', value: 40, rounds: 3 }
    },
    cobalt_elixir: {
        id: 'cobalt_elixir',
        name: 'Cobalt Elixir',
        description: 'Toughens the skin with cobalt essence. +25% DEF for 3 rounds.',
        icon: 'potion_cobalt',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 10800,        // 3 hours
        effect: { type: 'buff_stat', stat: 'def', value: 25, rounds: 3 }
    },
    void_extract: {
        id: 'void_extract',
        name: 'Void Extract',
        description: 'A dangerous distillate of the void. Removes all debuffs instantly.',
        icon: 'potion_void',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 14400,        // 4 hours
        effect: { type: 'cleanse', cleanse: ['poisoned', 'stunned', 'silenced', 'slowed', 'weakened', 'burned', 'frozen', 'ensnared'] }
    }
};

export default POTIONS;
