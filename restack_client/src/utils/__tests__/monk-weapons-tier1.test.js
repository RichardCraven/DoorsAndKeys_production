import { InventoryManager } from '../inventory-manager';
import { resolveItemPools } from '../cache-cleanup';

describe('Monk Weapons Tier 1 Integration', () => {
    let im;

    beforeEach(() => {
        im = new InventoryManager();
        im.initializeItems();
    });

    test('All monk weapons are defined as Tier 1 weapons in InventoryManager', () => {
        const monkWeapons = [
            'monk_cestus',
            'monk_deer_horn_knives',
            'monk_katar',
            'monk_nunchaku',
            'monk_quarterstaff',
            'cestus',
            'deer_horn_knives',
            'katar',
            'nunchaku',
            'quarterstaff'
        ];

        monkWeapons.forEach(key => {
            const item = im.allItems[key];
            expect(item).toBeDefined();
            expect(item.type).toBe('weapon');
            expect(item.tier).toBe(1);
            expect(im.TIER1_WEAPONS).toContain(key);
        });
    });

    test('resolveItemPools resolves tier_1_weapon tile to monk weapons', () => {
        const mockDungeon = {
            levels: [
                {
                    front: {
                        miniboards: [
                            {
                                tiles: [
                                    { contains: { type: 'tier_1_weapon' } }
                                ]
                            }
                        ]
                    }
                }
            ]
        };

        const resolvedCount = resolveItemPools(mockDungeon, im.allItems);
        expect(resolvedCount).toBe(1);

        const resolvedTile = mockDungeon.levels[0].front.miniboards[0].tiles[0];
        expect(resolvedTile.contains.type).toBe('item');
        expect(resolvedTile.contains.subtype).toBeDefined();

        const resolvedItem = im.allItems[resolvedTile.contains.subtype];
        expect(resolvedItem).toBeDefined();
        expect(resolvedItem.tier).toBe(1);
        expect(resolvedItem.type).toBe('weapon');
    });
});
