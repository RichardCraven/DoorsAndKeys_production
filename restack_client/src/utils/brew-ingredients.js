/**
 * brew-ingredients.js
 * Defines the 7 ingredients for the Barbarian's Brew mixing system.
 * These are stackable inventory items (category: 'reagent').
 */
export const BREW_INGREDIENTS = {
    spices: {
        id: 'spices',
        name: 'Spices',
        description: 'Exotic warming spices. Adds punch to brews.',
        icon: 'brew_spices',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    meat: {
        id: 'meat',
        name: 'Raw Meat',
        description: 'Fresh game meat. A hearty source of power.',
        icon: 'brew_meat',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    bone: {
        id: 'bone',
        name: 'Thick Bone',
        description: 'A dense beast bone filled with marrow.',
        icon: 'brew_bone',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    water: {
        id: 'water',
        name: 'Spring Water',
        description: 'Pure, refreshing spring water.',
        icon: 'brew_water',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    beer: {
        id: 'beer',
        name: 'Dwarven Beer',
        description: 'A frothy, heavy malt beer.',
        icon: 'brew_beer',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    pepper: {
        id: 'pepper',
        name: 'Fire Pepper',
        description: 'An extremely spicy chili pepper.',
        icon: 'brew_pepper',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    berries: {
        id: 'berries',
        name: 'Wild Berries',
        description: 'Sweet and tangy berries from the woods.',
        icon: 'brew_berries',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    }
};

export const BREW_INGREDIENT_KEYS = Object.keys(BREW_INGREDIENTS);
export default BREW_INGREDIENTS;
