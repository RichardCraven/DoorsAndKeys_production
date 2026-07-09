/**
 * cache-cleanup.js
 *
 * Methods for migrating stale dungeon data retrieved from the cached meta object
 * into the current data schema on dungeon load.
 *
 * When game objects are removed or renamed (e.g. 'master key' -> 'treasury key'),
 * boards stored in the database will still reference the old object keys.
 * The methods here scan and replace those references so the dungeon loads cleanly.
 */

/**
 * Tests whether a tile's `contains` value represents the old master key.
 * The master key was placed as { type: 'item', subtype: 'ornate_key' } or
 * { type: 'item', subtype: 'master_key' } depending on when the board was saved.
 */
function isMasterKey(contains) {
    if (!contains) return false;
    if (typeof contains === 'string') {
        return contains === 'ornate_key' || contains === 'master_key';
    }
    const sub = contains.subtype;
    return sub === 'ornate_key' || sub === 'master_key';
}

/**
 * Scans every miniboard tile in every level of the dungeon.
 * Replaces any instance of the old 'master key' tile with 'treasury key'.
 *
 * @param {Object} dungeon - The parsed dungeon object (as loaded from the server).
 * @returns {number} The number of tiles that were replaced.
 */
export function keyCleanup(dungeon) {
    let replacedCount = 0;

    if (!dungeon || !Array.isArray(dungeon.levels)) {
        console.warn('cache-cleanup.keyCleanup: no dungeon levels to scan');
        return replacedCount;
    }

    dungeon.levels.forEach(level => {
        ['front', 'back'].forEach(side => {
            const sideData = level[side];
            if (!sideData || !Array.isArray(sideData.miniboards)) return;

            sideData.miniboards.forEach(miniboard => {
                if (!miniboard || !Array.isArray(miniboard.tiles)) return;

                miniboard.tiles.forEach(tile => {
                    if (isMasterKey(tile.contains)) {
                        tile.contains = { type: 'item', subtype: 'treasury_key' };
                        // Clear any legacy image path; the renderer will resolve it from images.js
                        tile.image = null;
                        replacedCount++;
                    }
                });
            });
        });
    });

    if (replacedCount > 0) {
        console.log(`cache-cleanup.keyCleanup: replaced ${replacedCount} master key tile(s) with treasury key`);
    }

    return replacedCount;
}

/**
 * Replacement map for deprecated shield items.
 *   basic_shield  → buckler
 *   seeing_shield → infantry_shield
 */
const DEPRECATED_SHIELDS = {
    basic_shield: 'buckler',
    seeing_shield: 'infantry_shield',
};

const SHIELD_REPLACEMENTS = {
    buckler: {
        _im_key: 'buckler',
        icon: 'buckler',
        name: 'buckler',
        armor: 20,
        type: 'armor',
        subtype: 'shield',
        description: 'Small parrying buckler. Defense: 20 (~14% damage reduction)',
    },
    infantry_shield: {
        _im_key: 'infantry_shield',
        icon: 'infantry_shield',
        name: 'infantry shield',
        armor: 35,
        type: 'armor',
        subtype: 'shield',
        description: 'Standard-issue infantry kite shield. Defense: 35 (~24% damage reduction)',
    },
};

/**
 * Scans dungeon tile data and crew inventories for deprecated shield items
 * (basic_shield, seeing_shield) and replaces them with their current equivalents.
 *
 * @param {Object|null} dungeon - The parsed dungeon object (may be null for crew-only cleanup).
 * @param {Array|null}  crew    - Array of crew member objects with optional `.inventory` arrays.
 * @returns {number} Total number of items replaced.
 */
export function itemCleanup(dungeon, crew) {
    let replacedCount = 0;

    // ── Scan dungeon tile data ──────────────────────────────────────────────
    if (dungeon && Array.isArray(dungeon.levels)) {
        dungeon.levels.forEach(level => {
            ['front', 'back'].forEach(side => {
                const sideData = level[side];
                if (!sideData || !Array.isArray(sideData.miniboards)) return;

                sideData.miniboards.forEach(miniboard => {
                    if (!miniboard || !Array.isArray(miniboard.tiles)) return;

                    miniboard.tiles.forEach(tile => {
                        if (!tile.contains) return;
                        const sub = typeof tile.contains === 'string'
                            ? tile.contains
                            : tile.contains.subtype;
                        const replacement = DEPRECATED_SHIELDS[sub];
                        if (replacement) {
                            tile.contains = typeof tile.contains === 'string'
                                ? replacement
                                : { ...tile.contains, subtype: replacement };
                            tile.image = null;
                            replacedCount++;
                        }
                    });
                });
            });
        });
    }

    // ── Scan crew inventories ───────────────────────────────────────────────
    if (Array.isArray(crew)) {
        crew.forEach(member => {
            if (!member || !Array.isArray(member.inventory)) return;

            member.inventory.forEach((item, idx) => {
                if (!item) return;
                // Items may be keyed by _im_key, icon, or the raw key field
                const key = item._im_key || item.icon || item.key;
                const replacementKey = DEPRECATED_SHIELDS[key];
                if (replacementKey) {
                    const patch = SHIELD_REPLACEMENTS[replacementKey];
                    // Preserve fields not covered by the patch (e.g. equippedBy, animation)
                    member.inventory[idx] = { ...item, ...patch };
                    replacedCount++;
                }
            });
        });
    }

    if (replacedCount > 0) {
        console.log(`cache-cleanup.itemCleanup: replaced ${replacedCount} deprecated shield item(s)`);
    }

    return replacedCount;
}

/**
 * Filter predicates that identify which allItems entries belong to each tier pool.
 * Magical items are tiered by subtype (wand < spellbook < staff/charm).
 * Armor items are tiered by armor value (≤40 / 41-70 / 71+).
 */
const TIER_POOL_MATCHERS = {
    tier_1_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 1,
    tier_2_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 2,
    tier_3_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 3,
    tier_1_magical: (_k, item) => item.type === 'magical' && item.subtype === 'wand',
    tier_2_magical: (_k, item) => item.type === 'magical' && item.subtype === 'spellbook',
    tier_3_magical: (_k, item) => item.type === 'magical' && (item.subtype === 'staff' || item.subtype === 'charm'),
    tier_1_armor:   (_k, item) => item.type === 'armor'   && item.armor <= 40,
    tier_2_armor:   (_k, item) => item.type === 'armor'   && item.armor > 40 && item.armor <= 70,
    tier_3_armor:   (_k, item) => item.type === 'armor'   && item.armor > 70,
};

/**
 * Scans every tile in the dungeon for "tier pool" placeholders
 * (e.g. contains.type === 'tier_1_weapon') and replaces each one with a
 * randomly chosen item from the matching allItems pool.
 *
 * This lets dungeon builders drop a generic "tier 2 weapon chest" tile in the
 * editor; the actual item is randomised fresh each time the dungeon loads.
 *
 * @param {Object} dungeon   - The parsed dungeon object.
 * @param {Object} allItems  - inventoryManager.allItems (key → item definition).
 * @returns {number} Number of tiles resolved.
 */
export function resolveItemPools(dungeon, allItems) {
    if (!dungeon || !Array.isArray(dungeon.levels) || !allItems) return 0;

    // Pre-compute pools once so we don't re-filter on every tile
    const pools = {};
    for (const tierKey of Object.keys(TIER_POOL_MATCHERS)) {
        pools[tierKey] = Object.keys(allItems).filter(k => TIER_POOL_MATCHERS[tierKey](k, allItems[k]));
    }

    let resolvedCount = 0;

    dungeon.levels.forEach(level => {
        ['front', 'back'].forEach(side => {
            const sideData = level[side];
            if (!sideData || !Array.isArray(sideData.miniboards)) return;

            sideData.miniboards.forEach(miniboard => {
                if (!miniboard || !Array.isArray(miniboard.tiles)) return;

                miniboard.tiles.forEach(tile => {
                    if (!tile.contains) return;
                    const containsType = typeof tile.contains === 'string'
                        ? tile.contains
                        : tile.contains.type;
                    const pool = pools[containsType];
                    if (!pool || pool.length === 0) return;

                    const chosen = pool[Math.floor(Math.random() * pool.length)];
                    tile.contains = { type: 'item', subtype: chosen };
                    tile.image = null;
                    resolvedCount++;
                });
            });
        });
    });

    if (resolvedCount > 0) {
        console.log(`cache-cleanup.resolveItemPools: resolved ${resolvedCount} tier pool tile(s) to specific items`);
    }
    return resolvedCount;
}

/**
 * Resolves tiered monster placeholders (tier_1_monster..tier_4_monster)
 * into concrete monster subtypes based on MonsterManager tier metadata.
 *
 * @param {Object} dungeon - The parsed dungeon object.
 * @param {Object} monsters - monsterManager.monsters (key -> monster definition).
 * @returns {number} Number of tiles resolved.
 */
export function resolveMonsterPools(dungeon, monsters) {
    if (!dungeon || !Array.isArray(dungeon.levels) || !monsters) return 0;

    const pools = {
        tier_1_monster: [],
        tier_2_monster: [],
        tier_3_monster: [],
        tier_4_monster: [],
    };

    Object.keys(monsters).forEach(monsterKey => {
        const monster = monsters[monsterKey];
        if (!monster || typeof monster.tier !== 'number' || monster.isMinion || monster.isSummoned) return;
        const poolKey = `tier_${monster.tier}_monster`;
        if (pools[poolKey]) {
            pools[poolKey].push(monsterKey);
        }
    });

    let resolvedCount = 0;

    dungeon.levels.forEach(level => {
        ['front', 'back'].forEach(side => {
            const sideData = level[side];
            if (!sideData || !Array.isArray(sideData.miniboards)) return;

            sideData.miniboards.forEach(miniboard => {
                if (!miniboard || !Array.isArray(miniboard.tiles)) return;

                miniboard.tiles.forEach(tile => {
                    if (!tile.contains) return;
                    const containsType = typeof tile.contains === 'string'
                        ? tile.contains
                        : tile.contains.type;
                    const pool = pools[containsType];
                    if (!pool || pool.length === 0) return;

                    const chosen = pool[Math.floor(Math.random() * pool.length)];
                    tile.contains = { type: 'monster', subtype: chosen };
                    tile.image = null;
                    resolvedCount++;
                });
            });
        });
    });

    if (resolvedCount > 0) {
        console.log(`cache-cleanup.resolveMonsterPools: resolved ${resolvedCount} monster tier tile(s) to specific monsters`);
    }

    return resolvedCount;
}
