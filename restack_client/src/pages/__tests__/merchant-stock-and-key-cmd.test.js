const { inventoryManager, InventoryManager } = require('../../utils/inventory-manager');

describe('Merchant Stock & Dev Console Key Command Resolution', () => {
    test('InventoryManager auto-populates allItems upon instantiation', () => {
        const freshIM = new InventoryManager();
        expect(freshIM.allItems).toBeDefined();
        expect(Object.keys(freshIM.allItems).length).toBeGreaterThan(0);
        expect(freshIM.allItems['minor_health_potion']).toBeDefined();
        expect(freshIM.allItems['minor_health_potion'].name).toBe('minor health potion');
        expect(freshIM.allItems['minor_key']).toBeDefined();
        expect(freshIM.allItems['minor_key'].name).toBe('minor key');
        expect(freshIM.allItems['master_key']).toBeDefined();
        expect(freshIM.allItems['master_key'].name).toBe('master key');
    });

    test('Merchant stock generation fallback helper correctly resolves definitions for stock items', () => {
        const testIM = new InventoryManager();
        const getItemDef = (key, fallbackObj) => {
            const def = testIM.allItems?.[key] || testIM.consumables?.[key] || testIM.misc?.[key];
            if (def) return { ...def, _im_key: key };
            return { ...fallbackObj, _im_key: key };
        };

        const item1 = { ...getItemDef('minor_health_potion', { name: 'minor health potion' }), price: 20 };
        const item2 = { ...getItemDef('major_health_potion', { name: 'major health potion' }), price: 50 };
        const item3 = { ...getItemDef('minor_key', { name: 'minor key' }), price: 100 };
        const item4 = { ...getItemDef('automaton', { name: 'automaton' }), price: 1 };

        [item1, item2, item3, item4].forEach(item => {
            expect(item.name).toBeDefined();
            expect(item.name).not.toBe('undefined');
            expect(item.icon).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.price).toBeGreaterThan(0);
        });
    });

    test('devConsole key command resolves master_key safely and adds to inventory', () => {
        const testIM = new InventoryManager();
        const masterKeyItem = testIM.allItems?.['master_key']
            ? { ...testIM.allItems['master_key'] }
            : testIM.misc?.['master_key']
                ? { ...testIM.misc['master_key'] }
                : { icon: 'master_key', type: 'key', name: 'master key', equippedBy: null, _im_key: 'master_key' };

        testIM.addItem(masterKeyItem);

        expect(testIM.inventory.some(item => item.name === 'master key' || item.icon === 'master_key')).toBe(true);
    });
});
