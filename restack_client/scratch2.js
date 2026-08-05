const fs = require('fs');

// Mock out the objects
const TIER_POOL_MATCHERS = {
    tier_1_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 1,
    tier_2_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 2,
    tier_3_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 3,
};

const allItems = {
    thunderhewer_axe: { type: 'weapon', tier: 3 },
    rusty_sword: { type: 'weapon', tier: 1 }
};

const dungeon = {
    levels: [{
        front: {
            miniboards: [{
                tiles: [{
                    contains: { type: 'tier_3_weapon', subtype: null },
                    image: 'tier_3_weapon'
                }]
            }]
        }
    }]
};

const pools = {};
for (const tierKey of Object.keys(TIER_POOL_MATCHERS)) {
    pools[tierKey] = Object.keys(allItems).filter(k => TIER_POOL_MATCHERS[tierKey](k, allItems[k]));
}

console.log("Pools:", pools);

dungeon.levels.forEach(level => {
    ['front'].forEach(side => {
        const sideData = level[side];
        sideData.miniboards.forEach(miniboard => {
            miniboard.tiles.forEach(tile => {
                if (!tile.contains) return;
                const containsType = typeof tile.contains === 'string'
                    ? tile.contains
                    : tile.contains.type;
                
                console.log("Found containsType:", containsType);
                
                const pool = pools[containsType];
                if (!pool || pool.length === 0) return;

                const chosen = pool[Math.floor(Math.random() * pool.length)];
                tile.contains = { type: 'item', subtype: chosen };
                tile.image = null;
            });
        });
    });
});

console.log("Mutated Tile:", dungeon.levels[0].front.miniboards[0].tiles[0]);
