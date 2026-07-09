/**
 * brews.js
 * Defines the brews the Barbarian can mix.
 * Each brew is a self-targeted consumable item.
 */
export const BREWS = {
    rage_brew: {
        id: 'rage_brew',
        name: 'Rage Brew',
        description: 'A fiery brew that whips the Barbarian into a frenzy. +35% ATK for 5 rounds.',
        icon: 'brew_beer',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 30, // 30 seconds
        effect: { type: 'buff_stat', stat: 'atk', value: 35, rounds: 5 }
    },
    ironhide_brew: {
        id: 'ironhide_brew',
        name: 'Ironhide Brew',
        description: 'Hardens muscles and bones to resist incoming blows. +30% DEF for 5 rounds.',
        icon: 'brew_water',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 30,
        effect: { type: 'buff_stat', stat: 'def', value: 30, rounds: 5 }
    },
    vigor_brew: {
        id: 'vigor_brew',
        name: 'Vigor Brew',
        description: 'A refreshing berry infusion. Heals 30% HP and restores 40% endurance.',
        icon: 'brew_berries',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 30,
        effect: { type: 'heal_and_endurance', healPct: 30, endurance: 40 }
    },
    bloodlust_brew: {
        id: 'bloodlust_brew',
        name: 'Bloodlust Brew',
        description: 'A savory, spicy broth that increases physical power and speed. +20% ATK and +2 Speed for 5 rounds.',
        icon: 'brew_meat',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 30,
        effect: { type: 'buff_multi_stat', buffs: [{ stat: 'atk', value: 20 }, { stat: 'speed', value: 2 }], rounds: 5 }
    },
    stout_brew: {
        id: 'stout_brew',
        name: 'Stout Brew',
        description: 'A heavy brew that grants immense resilience. Cleanses weakened/stunned and +15% DEF for 3 rounds.',
        icon: 'brew_beer',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 30,
        effect: { type: 'cleanse_and_buff', cleanse: ['weakened', 'stunned'], stat: 'def', value: 15, rounds: 3 }
    },
    bone_brew: {
        id: 'bone_brew',
        name: 'Bone Brew',
        description: 'A crunchy, spicy brew that sharpens focus and strength. +25% ATK and +15% DEF for 7 rounds.',
        icon: 'brew_bone',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 30,
        effect: { type: 'buff_multi_stat', buffs: [{ stat: 'atk', value: 25 }, { stat: 'def', value: 15 }], rounds: 7 }
    },
    wild_brew: {
        id: 'wild_brew',
        name: 'Wild Brew',
        description: 'A strange mixture that quickens reflexes. +25% dodge and +1 Speed for 7 rounds.',
        icon: 'brew_spices',
        type: 'consumable',
        category: 'potion',
        equippedBy: null,
        mixTime: 30,
        effect: { type: 'buff_multi_stat', buffs: [{ stat: 'dodge', value: 25 }, { stat: 'speed', value: 1 }], rounds: 7 }
    }
};

export default BREWS;
