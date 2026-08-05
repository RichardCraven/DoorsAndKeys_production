import { InventoryManager } from './src/utils/inventory-manager.js';
import { resolveItemPools, TIER_POOL_MATCHERS } from './src/utils/cache-cleanup.js';

const inventoryManager = new InventoryManager();

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

resolveItemPools(dungeon, inventoryManager.allItems);

console.log(JSON.stringify(dungeon.levels[0].front.miniboards[0].tiles[0]));
