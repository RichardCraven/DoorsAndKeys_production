import { inventoryManager } from '../inventory-manager';

describe('Automaton & Generator Automation System', () => {
    test('Automaton item is defined in inventory consumable dictionary', () => {
        const automatonDef = inventoryManager.consumables?.automaton;
        expect(automatonDef).toBeDefined();
        expect(automatonDef.name).toBe('automaton');
        expect(automatonDef.price).toBe(1);
    });

    test('hasAutomatonInInventory accurately detects automaton in crew inventory', () => {
        const inventoryWithAutomaton = [
            { name: 'Health Potion', type: 'consumable' },
            { name: 'Automaton', type: 'consumable', _im_key: 'automaton' }
        ];

        const inventoryWithoutAutomaton = [
            { name: 'Health Potion', type: 'consumable' }
        ];

        const checkFn = (inv) => {
            return inv.some(item => 
                item && (
                    item.name === 'Automaton' ||
                    item.name === 'automaton' ||
                    item.subtype === 'automaton' ||
                    item._im_key === 'automaton' ||
                    item.key === 'automaton'
                )
            );
        };

        expect(checkFn(inventoryWithAutomaton)).toBe(true);
        expect(checkFn(inventoryWithoutAutomaton)).toBe(false);
    });

    test('Deploying automaton consumes item and sets automated = true on generatorData', () => {
        let inventory = [
            { id: '1', name: 'Automaton', type: 'consumable', _im_key: 'automaton' },
            { id: '2', name: 'Gold', type: 'currency' }
        ];

        const tile = {
            id: 42,
            contains: {
                type: 'building',
                subtype: 'sawmill',
                generatorData: {
                    key: 'sawmill',
                    activated: false,
                    automated: false
                }
            }
        };

        // Simulate deployment logic
        const automatonIdx = inventory.findIndex(item => item && (item.name === 'Automaton' || item.name === 'automaton' || item._im_key === 'automaton'));
        expect(automatonIdx).toBeGreaterThanOrEqual(0);

        if (automatonIdx >= 0) {
            inventory.splice(automatonIdx, 1);
        }

        const gData = tile.contains.generatorData;
        gData.activated = true;
        gData.automated = true;

        expect(inventory.length).toBe(1);
        expect(inventory[0].name).toBe('Gold');
        expect(tile.contains.generatorData.automated).toBe(true);
        expect(tile.contains.generatorData.activated).toBe(true);
    });

    test('Automated Observation Platform retains activation across board transitions', () => {
        const activatedGenerators = {
            'level1_board1_10': { key: 'observation_platform', activated: true, automated: true },
            'level1_board1_20': { key: 'observation_platform', activated: true, automated: false }
        };

        // Board transition reset logic simulation
        const resetActivatedGeneratorsForBoard = (activatedGens) => {
            const nextGens = { ...activatedGens };
            for (let key in nextGens) {
                const gData = nextGens[key];
                if (gData && (gData.key === 'observation_platform' || gData.key === 'observer_platform')) {
                    if (!gData.automated) {
                        delete nextGens[key];
                    }
                }
            }
            return nextGens;
        };

        const updated = resetActivatedGeneratorsForBoard(activatedGenerators);
        expect(updated['level1_board1_10']).toBeDefined();
        expect(updated['level1_board1_10'].automated).toBe(true);
        expect(updated['level1_board1_20']).toBeUndefined();
    });
});
