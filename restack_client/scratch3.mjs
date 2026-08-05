const fs = require('fs');
import { InventoryManager } from './src/utils/inventory-manager.js';

const inventoryManager = new InventoryManager();

const TIER_POOL_MATCHERS = {
    tier_1_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 1,
    tier_2_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 2,
    tier_3_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 3,
};

const allItems = inventoryManager.allItems;
const pools = {};
for (const tierKey of Object.keys(TIER_POOL_MATCHERS)) {
    pools[tierKey] = Object.keys(allItems).filter(k => TIER_POOL_MATCHERS[tierKey](k, allItems[k]));
}

console.log("Pools with real inventory:", pools);
