const weapons = {
    thunderhewer_axe: { damage: 70, icon: 'axe_19', type: 'weapon', subtype: 'cutting', tier: 3, name: 'Thunderhewer Axe' },
};

const allItems = {};
Object.assign(allItems, weapons);

const TIER_POOL_MATCHERS = {
    tier_1_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 1,
    tier_2_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 2,
    tier_3_weapon:  (_k, item) => item.type === 'weapon'  && item.tier === 3,
};

const pools = {};
for (const tierKey of Object.keys(TIER_POOL_MATCHERS)) {
    pools[tierKey] = Object.keys(allItems).filter(k => TIER_POOL_MATCHERS[tierKey](k, allItems[k]));
}

console.log("Pools:", pools);
