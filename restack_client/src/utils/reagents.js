/**
 * reagents.js
 * Defines all 11 craftable reagents.
 * Reagents are stackable inventory items (category: 'reagent').
 * They auto-stack in the inventory strip by name.
 */
export const REAGENTS = {
    bramble: {
        id: 'bramble',
        name: 'Bramble',
        description: 'Sharp thorny vine clippings. Used in hardening and protection brews.',
        icon: 'reagent_bramble',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    egg: {
        id: 'egg',
        name: 'Creature Egg',
        description: 'A small speckled egg. A binding agent in many potions.',
        icon: 'reagent_egg',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    eye: {
        id: 'eye',
        name: 'Monster Eye',
        description: 'A preserved monster eye. Sees into the arcane. Used in high-power brews.',
        icon: 'reagent_eye',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    flower: {
        id: 'flower',
        name: 'Rare Flower',
        description: 'A fragrant bloom found in deep places. Potent healing properties.',
        icon: 'reagent_flower',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    grass: {
        id: 'grass',
        name: 'Dried Grass',
        description: 'Common dried grass. A basic base component for simple salves.',
        icon: 'reagent_grass',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    leaves: {
        id: 'leaves',
        name: 'Herb Leaves',
        description: 'Dried medicinal herb leaves. The foundation of most healing preparations.',
        icon: 'reagent_leaves',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    mushroom: {
        id: 'mushroom',
        name: 'Mushroom Cap',
        description: 'A dense fungal cap. Releases compounds that affect the mind and spirit.',
        icon: 'reagent_mushroom',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    nuts: {
        id: 'nuts',
        name: 'Forest Nuts',
        description: 'Hard-shelled nuts from the deep forest. High in natural oils used in endurance brews.',
        icon: 'reagent_nuts',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    seaweed: {
        id: 'seaweed',
        name: 'Ocean Seaweed',
        description: 'Dried seaweed from tidal pools. A catalyst for cold and poison preparations.',
        icon: 'reagent_seaweed',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    stinger: {
        id: 'stinger',
        name: 'Insect Stinger',
        description: 'A dried stinger from a venomous insect. Adds potency to speed and strength mixtures.',
        icon: 'reagent_stinger',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
    twig: {
        id: 'twig',
        name: 'Enchanted Twig',
        description: 'A twig humming with faint magic. A natural magical conductor used in many brews.',
        icon: 'reagent_twig',
        type: 'consumable',
        category: 'reagent',
        equippedBy: null,
    },
};

/** Ordered list for display and console command use */
export const REAGENT_KEYS = Object.keys(REAGENTS);

export default REAGENTS;
