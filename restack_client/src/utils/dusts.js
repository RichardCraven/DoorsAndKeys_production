/**
 * dusts.js
 * Definitions for the four Dust & Nugget loot items.
 *
 * These items are:
 *  - Dropped from combat victory (~10% rate, see MonsterBattle.js)
 *  - Stored in the party inventory via inventoryManager.addItem()
 *  - Consumed during the Level Up screen to grant bonus attribute/skill choices
 *
 * Dust Effects at Level-Up:
 *   rubedo_dust   → choose +2 STR or +2 FORT (physical bonus)
 *   spectral_dust → choose +2 INT or +2 DEX  (magical/agile bonus)
 *   monadic_dust  → unlock one additional class skill (beyond normal level-up pick)
 *   monadic_nugget → +1 to ALL stats AND unlock one additional class skill (major bonus)
 */

export const DUST_TYPES = {
    rubedo_dust: {
        key: 'rubedo_dust',
        name: 'Rubedo Dust',
        type: 'dust',
        subtype: 'rubedo',
        icon: 'rubedo_dust',
        desc: 'A crimson powder humming with vital energy. Use at level-up to gain +2 STR or +2 FORT.',
        color: '#e05a5a',
        glowColor: 'rgba(220, 60, 60, 0.5)',
        levelUpEffect: 'physical',   // grants +2 to STR or FORT (player chooses)
        levelUpLabel: '+2 Physical Stat',
        levelUpDesc: 'Choose +2 STR or +2 FORT as a bonus on top of your normal gains.',
    },
    spectral_dust: {
        key: 'spectral_dust',
        name: 'Spectral Dust',
        type: 'dust',
        subtype: 'spectral',
        icon: 'spectral_dust',
        desc: 'A violet shimmer of arcane potential. Use at level-up to gain +2 INT or +2 DEX.',
        color: '#a855f7',
        glowColor: 'rgba(160, 60, 240, 0.5)',
        levelUpEffect: 'arcane',     // grants +2 to INT or DEX (player chooses)
        levelUpLabel: '+2 Arcane Stat',
        levelUpDesc: 'Choose +2 INT or +2 DEX as a bonus on top of your normal gains.',
    },
    monadic_dust: {
        key: 'monadic_dust',
        name: 'Monadic Dust',
        type: 'dust',
        subtype: 'monadic',
        icon: 'monadic_dust',
        desc: 'A teal essence of pure possibility. Use at level-up to unlock an additional skill.',
        color: '#2dd4bf',
        glowColor: 'rgba(40, 210, 190, 0.5)',
        levelUpEffect: 'skill',      // grants an extra skill pick
        levelUpLabel: '+ Extra Skill',
        levelUpDesc: 'Unlock one additional skill from your class tree at this level.',
    },
    monadic_nugget: {
        key: 'monadic_nugget',
        name: 'Monadic Nugget',
        type: 'dust',
        subtype: 'nugget',
        icon: 'monadic_nugget',
        desc: 'A compressed fragment of condensed essence. Extremely rare. Use at level-up for +1 to ALL stats and an extra skill.',
        color: '#84cc16',
        glowColor: 'rgba(130, 200, 20, 0.5)',
        levelUpEffect: 'supreme',    // +1 all stats + extra skill pick
        levelUpLabel: '+1 All Stats + Skill',
        levelUpDesc: 'Grants +1 to every stat AND unlocks an additional skill. Extremely powerful.',
    },
};

export const DUST_KEYS = Object.keys(DUST_TYPES);

export default DUST_TYPES;
