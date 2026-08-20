/**
 * user-perks.js
 * Pool of 10 User Perks granted upon Free Will level-ups.
 * Every 10 Free Will points = 1 User Level.
 */

import { getMeta } from './session-handler';

export const USER_PERKS_POOL = [
    {
        id: 'card_duel_hp',
        name: 'Duelist Vitality',
        shortDesc: '+5 HP during Card Duels',
        desc: 'Increases your starting and maximum Health during Card Duels by +5.',
        icon: '❤️',
        badge: 'Card Duel'
    },
    {
        id: 'pray_success_boost',
        name: 'Divine Favor',
        shortDesc: '+10% Praying Success Rate',
        desc: 'Increases the success probability by +10% when praying at shrines for food or key aid.',
        icon: '🙏',
        badge: 'Shrines'
    },
    {
        id: 'domain_growth_reduction',
        name: 'Rapid Expansion',
        shortDesc: '10% Faster Domain Growth',
        desc: 'Reduces the duration of domain growth expansion periods by 10%.',
        icon: '⚡',
        badge: 'Domain'
    },
    {
        id: 'food_storage_boost',
        name: 'Granary Vaults',
        shortDesc: '+25% Food Storage Capacity',
        desc: 'Increases your maximum crew food storage capacity limit by +25%.',
        icon: '🌾',
        badge: 'Sustenance'
    },
    {
        id: 'food_check_period_boost',
        name: 'Preservation Technique',
        shortDesc: '100% Longer Food Check Period',
        desc: 'Doubles the interval between food spoil checks (checks every 2 hours instead of 1 hour).',
        icon: '🧊',
        badge: 'Sustenance'
    },
    {
        id: 'merchant_discount',
        name: 'Merchant Haggling',
        shortDesc: '10% Discount at Merchant',
        desc: 'Grants a 10% gold discount on all item purchases at the Merchant.',
        icon: '🪙',
        badge: 'Economy'
    },
    {
        id: 'alchemist_discount',
        name: 'Alchemist Patronage',
        shortDesc: '10% Discount at Alchemist',
        desc: 'Grants a 10% discount on all item purchases at the Alchemist.',
        icon: '🧪',
        badge: 'Economy'
    },
    {
        id: 'training_duration_reduction',
        name: 'Fast Learner',
        shortDesc: '20% Faster Training',
        desc: 'Reduces the completion duration of all crew training sessions by 20%.',
        icon: '🎓',
        badge: 'Training'
    },
    {
        id: 'domain_action_success_boost',
        name: 'Tactical Operations',
        shortDesc: '+10% Monolith & Sabotage Success',
        desc: 'Increases success chance by +10% for Domain Monolith overtaking and enemy outpost sabotage rolls.',
        icon: '💣',
        badge: 'Tactics'
    },
    {
        id: 'reaper_auto_win',
        name: 'Banishment Aura',
        shortDesc: '10% Reaper Auto-Win Chance',
        desc: 'Grants a 10% chance to automatically win and banish the Reaper instantly at the start of a Card Duel.',
        icon: '',
        iconImage: 'whiteskull',
        badge: 'Reaper'
    }
];

/**
 * Gets array of claimed user perk IDs from session meta
 */
export function getUserPerks(customMeta = null) {
    try {
        const meta = customMeta || getMeta() || {};
        return Array.isArray(meta.userPerks) ? meta.userPerks : [];
    } catch (e) {
        return [];
    }
}

/**
 * Checks if user has a specific user perk
 */
export function hasUserPerk(perkId, customMeta = null) {
    if (!perkId) return false;
    const perks = getUserPerks(customMeta);
    return perks.includes(perkId);
}

/**
 * Picks `count` random perks from unchosen perks (or from full pool if all claimed)
 */
export function getRandomUserPerkOptions(customMeta = null, count = 4) {
    const claimed = getUserPerks(customMeta);
    let available = USER_PERKS_POOL.filter(p => !claimed.includes(p.id));

    // If no perks are available at all, fallback to full pool so something renders (though this state shouldn't occur normally if capped at 10)
    if (available.length === 0) {
        available = [...USER_PERKS_POOL];
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Computes claimed user level vs. unclaimed perks
 */
export function getPendingUserPerkLevels(customMeta = null) {
    try {
        const meta = customMeta || getMeta() || {};
        const freeWill = typeof meta.freeWill === 'number' ? meta.freeWill : 0;
        const currentLevel = Math.min(10, Math.floor(freeWill / 10));
        const claimedCount = Array.isArray(meta.userPerks) ? meta.userPerks.length : 0;
        return Math.max(0, currentLevel - claimedCount);
    } catch (e) {
        return 0;
    }
}

/**
 * Calculates domain expansion interval in milliseconds.
 * Base duration is 12 hours (43,200,000 ms).
 * If user has 'domain_growth_reduction' perk, duration is reduced by 10% (38,880,000 ms = 10.8 hours).
 */
export function getDomainExpansionIntervalMs(customMeta = null) {
    const baseMs = 12 * 60 * 60 * 1000;
    if (hasUserPerk('domain_growth_reduction', customMeta)) {
        return Math.round(baseMs * 0.9);
    }
    return baseMs;
}

