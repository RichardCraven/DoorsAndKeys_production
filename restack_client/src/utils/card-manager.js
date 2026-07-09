import cardsData from '../data/cards.json';
import * as images from './images';

// ─── Monster tier → shard drop chance ────────────────────────────────────────
const TIER_SHARD_CHANCE = { 1: 0.30, 2: 0.20, 3: 0.12, 4: 0.07 };
const DEFAULT_SHARD_CHANCE = 0.15;

export function shardDropChance(monster) {
    if (!monster) return DEFAULT_SHARD_CHANCE;
    const tier = monster.tier || monster.level || 1;
    return TIER_SHARD_CHANCE[Math.min(4, Math.max(1, Number(tier)))] || DEFAULT_SHARD_CHANCE;
}

// ─── Card lookups ─────────────────────────────────────────────────────────────
const ALL_CARDS = cardsData;

export function getEchoCards() {
    return ALL_CARDS.filter(c => c.type === 'echo');
}

export function getReaperCards() {
    return ALL_CARDS.filter(c => c.type === 'reaper_card');
}

export function getArcaneCards() {
    return ALL_CARDS.filter(c => c.type === 'arcane');
}

export function getEchoCardForMonster(monsterType) {
    return ALL_CARDS.find(c => c.type === 'echo' && c.monsterType === monsterType) || null;
}

export function getCard(id) {
    return ALL_CARDS.find(c => c.id === id) || null;
}

// ─── Class ability definitions ────────────────────────────────────────────────
const CLASS_ABILITIES = {
    soldier:  { key: 'shield_wall',  name: 'Shield Presence', desc: 'Reaper attacks deal -1 damage while on field.' },
    ranger:   { key: 'pin_shot',     name: 'Eagle Eye',       desc: '10% chance to dodge any Reaper attack.' },
    wizard:   { key: 'arcane_burst', name: 'Arcane Mastery',  desc: 'Your arcane damage cards deal +1 bonus damage.' },
    monk:     { key: 'inner_focus',  name: 'Inner Focus',     desc: 'Gain +1 Energy at the start of each turn.' },
    barbarian:{ key: 'rampage',      name: 'Bloodrage',       desc: 'Deals +2 ATK when your Soul is 15 or below.' },
    sage:     { key: 'mend',         name: 'Mending Presence',desc: 'Restore 1 Soul at the start of each turn.' },
    summoner: { key: 'echo_call',    name: 'Arcane Summons',  desc: 'Draw 1 extra card at the start of each turn.' },
    engineer: { key: 'gadget_bomb',  name: 'Efficient Gear',  desc: 'Your first arcane card each turn costs 0 Energy.' },
};

/**
 * Convert a live crew member to a champion card object (legacy format).
 */
export function crewMemberToCard(member) {
    if (!member) return null;
    const type = (member.type || 'soldier').toLowerCase();
    const stats = member.stats || {};
    const str   = stats.str  || stats.strength   || stats.atk  || 3;
    const dex   = stats.dex  || stats.dexterity  || stats.spd  || 3;
    const fort  = stats.fort || stats.fortitude   || stats.def  || 3;
    const intel = stats.int  || stats.intelligence || stats.wis || 3;

    const atk         = 1 + Math.floor(str / 3);
    const dodgeChance = Math.floor(dex * 4);
    const energyCost  = Math.max(1, 4 - Math.floor(fort / 3));
    const drawBonus   = intel >= 5 ? 1 : 0;
    const ability     = CLASS_ABILITIES[type] || CLASS_ABILITIES.soldier;
    const portraitKey = member.image || `${type}_portrait` || type;

    return {
        id: `champion_${member.id || type}`,
        type: 'champion',
        memberId: member.id,
        memberType: type,
        name: member.name || type.charAt(0).toUpperCase() + type.slice(1),
        portrait: images[portraitKey] || images[`${type}_portrait`] || null,
        energyCost,
        atk,
        dodgeChance,
        drawBonus,
        ability,
        level: member.level || 1,
        hp: member.hp,
        maxHp: member.maxHp || member.hp,
        dead: !!member.dead,
    };
}

/**
 * Convert a live crew member to a Reserve card for the new duel system.
 * Reserve cards live in the Reserve Zone and are summoned to the field.
 */
export function crewMemberToReserveCard(member) {
    if (!member) return null;
    const type = (member.type || 'soldier').toLowerCase();
    const stats = member.stats || {};
    const str   = stats.str  || stats.strength  || stats.atk || 3;
    const fort  = stats.fort || stats.fortitude  || stats.def || 3;
    const level = member.level || 1;

    // ATK scales with Strength
    const atk = Math.max(1, 1 + Math.floor(str / 3));

    // Summon cost: 2 for weaker members, up to 4 for powerful ones
    const summonCost = Math.max(2, Math.min(4, 1 + Math.floor(str / 4)));

    // Field HP: scales with level and fortitude, clamped 8–20
    const maxHP = Math.max(8, Math.min(20, 6 + level * 2 + Math.floor(fort / 3)));

    const ability     = CLASS_ABILITIES[type] || CLASS_ABILITIES.soldier;
    const portraitKey = member.image || `${type}_portrait` || type;

    return {
        id: `reserve_${member.id || type}_${type}`,
        type: 'reserve',
        memberId: member.id,
        memberType: type,
        name: member.name || type.charAt(0).toUpperCase() + type.slice(1),
        portrait: images[portraitKey] || images[`${type}_portrait`] || null,
        summonCost,
        atk,
        maxHP,
        ability,
        level,
    };
}

/**
 * Build the Reserve Zone from the player's living crew members.
 */
export function buildReserveZone(crew) {
    return (crew || [])
        .filter(m => m && !m.dead)
        .map(crewMemberToReserveCard)
        .filter(Boolean);
}

/**
 * Build the player's Arcane deck:
 * - Arcane cards with copies per rarity
 * - Up to 4 active echo cards from meta.echoCards
 */
export function buildArcaneDeck(activeEchoIds) {
    const arcaneSource = getArcaneCards();

    // Separate summon cards from spell cards
    const summonSource = arcaneSource.filter(c => c.effect && c.effect.type === 'summon_player_unit');
    const spellSource = arcaneSource.filter(c => !c.effect || c.effect.type !== 'summon_player_unit');

    // Randomly select 6 unique spell cards
    const selectedSpells = shuffle(spellSource).slice(0, 6);

    const deck = [];
    selectedSpells.forEach((card, idx) => {
        deck.push({ ...card, id: `${card.id}_copy0_${idx}` });
    });

    // Add summon cards (2 copies of each to make exactly 6 summon cards)
    summonSource.forEach((card, idx) => {
        for (let copy = 0; copy < 2; copy++) {
            deck.push({ ...card, id: `${card.id}_copy${copy}_${idx}` });
        }
    });

    // Limit active Echo cards to 2
    const echos = (activeEchoIds || [])
        .slice(0, 2)
        .map(id => getCard(id))
        .filter(Boolean);

    return shuffle([...deck, ...echos]);
}

/**
 * Build the player's full deck (legacy format: champions + echo cards).
 * Kept for backwards-compat.
 */
export function buildPlayerDeck(crew, activeEchoIds) {
    const champions = (crew || [])
        .filter(m => m && !m.dead)
        .map(crewMemberToCard)
        .filter(Boolean);

    const echos = (activeEchoIds || [])
        .slice(0, 4)
        .map(id => getCard(id))
        .filter(Boolean);

    return shuffle([...champions, ...echos]);
}

/**
 * Build the Reaper's AI deck — thematic cards scaling with dungeon depth.
 */
export function buildReaperDeck(dungeonDepth) {
    const depth = Math.max(1, dungeonDepth || 1);
    const base = [
        // Core damage
        'reaper_reap', 'reaper_reap', 'reaper_reap', 'reaper_reap',
        'reaper_death_stare', 'reaper_death_stare', 'reaper_death_stare',
        // Shields and debuffs
        'reaper_shroud', 'reaper_shroud',
        'reaper_wither', 'reaper_wither',
        // Signature cards
        'reaper_dark_ritual',
        'reaper_corpse_wall',
        'reaper_scythe_strike',
        // Field summons start from depth 1
        'reaper_bone_archer', 'reaper_bone_archer',
        'reaper_grave_knight',
    ];

    if (depth >= 2) {
        base.push(
            'reaper_spectral_army', 'reaper_spectral_army',
            'reaper_curse',
            'reaper_scythe_strike',
            'reaper_spectral_surge',
            'reaper_death_knight',
            'reaper_rally_undead',
        );
    }
    if (depth >= 3) {
        base.push(
            'reaper_torment', 'reaper_torment',
            'reaper_soul_harvest', 'reaper_soul_harvest',
            'reaper_gravedigger',
            'reaper_scythe_strike',
            'reaper_death_knight',
            'reaper_rally_undead', 'reaper_rally_undead',
        );
    }
    if (depth >= 4) {
        base.push(
            'reaper_torment', 'reaper_soul_harvest',
            'reaper_spectral_army',
            'reaper_dark_ritual', 'reaper_dark_ritual',
            'reaper_death_knight', 'reaper_death_knight',
            'reaper_bone_archer', 'reaper_bone_archer',
        );
    }

    return shuffle(base.map(id => getCard(id)).filter(Boolean));
}

/**
 * Compute the Reaper's starting Soul based on dungeon depth.
 */
export function reaperStartingSoul(dungeonDepth) {
    const depth = Math.max(1, dungeonDepth || 1);
    return Math.min(65, 28 + depth * 6);
}

/**
 * List which Echo cards can be forged from the given shard counts.
 */
export function getForgeableEchos(soulShards) {
    const shards = soulShards || {};
    return getEchoCards().map(card => ({
        card,
        monsterType: card.monsterType,
        shardsHave: shards[card.monsterType] || 0,
        shardsNeeded: 3,
        canForge: (shards[card.monsterType] || 0) >= 3,
    }));
}

export function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Default export object for backwards-compat
export default {
    getCard,
    getEchoCards,
    getReaperCards,
    getArcaneCards,
    getEchoCardForMonster,
    crewMemberToCard,
    crewMemberToReserveCard,
    buildReserveZone,
    buildArcaneDeck,
    buildPlayerDeck,
    buildReaperDeck,
    reaperStartingSoul,
    getForgeableEchos,
    shardDropChance,
    shuffle,
};
