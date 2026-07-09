import React from 'react';
import CrewManagerPage from '../CrewManagerPage';
import { getMeta, storeMeta } from '../../utils/session-handler';
import { updateUserRequest } from '../../utils/api-handler';

jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(),
    storeMeta: jest.fn(),
    getUserId: jest.fn().mockReturnValue('user-123')
}));

jest.mock('../../utils/api-handler', () => ({
    updateUserRequest: jest.fn().mockResolvedValue({ status: 200 })
}));

describe('CrewManagerPage initial outfitting class restrictions', () => {
    let mockInventoryManager;
    let props;

    beforeEach(() => {
        jest.clearAllMocks();
        mockInventoryManager = {
            allItems: {
                woodcutters_axe: { tier: 1, range: 'close', type: 'weapon', name: "Woodcutter's Axe" },
                shortsword_sword: { tier: 1, range: 'close', type: 'weapon', name: "shortsword" },
                sylvan_bow: { tier: 1, range: 'far', type: 'weapon', name: "Sylvan Bow" },
                buckler: { tier: 1, type: 'armor', subtype: 'shield', name: 'buckler' },
                kettle_hat: { tier: 1, type: 'armor', subtype: 'helm', name: 'kettle hat' },
                travelers_boots: { tier: 1, type: 'armor', subtype: 'boots', name: "traveler's boots" },
                ockneys_tabard: { tier: 1, type: 'armor', subtype: 'tabard', name: "Ockney's Tabard" },
                elasi_amulet: { tier: 1, type: 'magical', subtype: 'amulet', name: 'Elasi Amulet' },
                crimson_mask: { tier: 1, type: 'magical', subtype: 'mask', name: 'crimson mask' }
            },
            initializeItems: jest.fn().mockImplementation(function() {
                this.allItems = mockInventoryManager.allItems;
            })
        };

        props = {
            inventoryManager: mockInventoryManager,
            crewManager: {
                adventurers: []
            }
        };
    });

    test('Soldier & Barbarian only receive martial weapons (swords/axes, no bows) or martial armor (helms/shields)', async () => {
        const page = new CrewManagerPage(props);
        const soldier = { id: 'soldier_1', type: 'soldier', inventory: [] };
        const barbarian = { id: 'barbarian_1', type: 'barbarian', inventory: [] };

        page.state = {
            selectedCrew: [soldier, barbarian]
        };

        getMeta.mockReturnValue({ crew: [] });

        await page.submit();

        // Check soldier outfitting
        expect(soldier.inventory.length).toBe(1);
        const sItem = soldier.inventory[0];
        expect(sItem.equippedBy).toBe('soldier_1');
        if (sItem.type === 'weapon') {
            expect(sItem.name).not.toContain('Bow');
            expect(sItem.equippedSlot).toBe('right');
        } else {
            expect(['shield', 'helm']).toContain(sItem.subtype);
            expect(['left', 'head']).toContain(sItem.equippedSlot);
        }

        // Check barbarian outfitting
        expect(barbarian.inventory.length).toBe(1);
        const bItem = barbarian.inventory[0];
        expect(bItem.equippedBy).toBe('barbarian_1');
        if (bItem.type === 'weapon') {
            expect(bItem.name).not.toContain('Bow');
            expect(bItem.equippedSlot).toBe('right');
        } else {
            expect(['shield', 'helm']).toContain(bItem.subtype);
            expect(['left', 'head']).toContain(bItem.equippedSlot);
        }
    });

    test('Ranger only receives bows or martial armor (helms/shields)', async () => {
        const page = new CrewManagerPage(props);
        const ranger = { id: 'ranger_1', type: 'ranger', inventory: [] };

        page.state = {
            selectedCrew: [ranger]
        };

        getMeta.mockReturnValue({ crew: [] });

        await page.submit();

        expect(ranger.inventory.length).toBe(1);
        const rItem = ranger.inventory[0];
        expect(rItem.equippedBy).toBe('ranger_1');
        if (rItem.type === 'weapon') {
            expect(rItem.name).toContain('Bow');
            expect(rItem.equippedSlot).toBe('right');
        } else {
            expect(['shield', 'helm']).toContain(rItem.subtype);
            expect(['left', 'head']).toContain(rItem.equippedSlot);
        }
    });

    test('Non-martial classes (sage, wizard, monk) only receive non-martial items (amulets, masks, tabards, boots)', async () => {
        const page = new CrewManagerPage(props);
        const sage = { id: 'sage_1', type: 'sage', inventory: [] };
        const wizard = { id: 'wizard_1', type: 'wizard', inventory: [] };
        const monk = { id: 'monk_1', type: 'monk', inventory: [] };

        page.state = {
            selectedCrew: [sage, wizard, monk]
        };

        getMeta.mockReturnValue({ crew: [] });

        await page.submit();

        const nonMartialSubtypes = ['amulet', 'mask', 'tabard', 'boots'];

        [sage, wizard, monk].forEach(member => {
            expect(member.inventory.length).toBe(1);
            const item = member.inventory[0];
            expect(item.equippedBy).toBe(member.id);
            expect(nonMartialSubtypes).toContain(item.subtype);

            // Verify equipped slots
            if (item.subtype === 'mask') {
                expect(item.equippedSlot).toBe('head');
            } else if (item.subtype === 'tabard') {
                expect(item.equippedSlot).toBe('chest');
            } else if (item.subtype === 'boots') {
                expect(item.equippedSlot).toBe('boots');
            } else if (item.subtype === 'amulet') {
                expect(item.equippedSlot).toBe('ancillary-left');
            }
        });
    });
});
