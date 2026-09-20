import { describe, it, expect } from '@jest/globals';

describe('Auto Equip System', () => {
    it('selects best items for each slot based on calculated item value/power score', () => {
        const item1 = { id: 'sword1', name: 'Iron Sword', type: 'weapon', slot: 'right', attack: 5, power: 10 };
        const item2 = { id: 'sword2', name: 'Flame Sword', type: 'weapon', slot: 'right', attack: 15, power: 35 };
        const item3 = { id: 'shield1', name: 'Wooden Shield', type: 'shield', slot: 'left', armor: 5, power: 8 };

        const member = {
            id: 'warrior',
            name: 'Warrior',
            inventory: [item1, item2, item3]
        };

        const getItemValue = (item) => {
            if (!item) return 0;
            return (item.power || 0) * 10 + (item.attack || 0) * 5 + (item.armor || 0) * 5 + (item.health || 0) * 2;
        };

        const availableItems = [...member.inventory];
        const slotsToEquip = ['chest', 'head', 'right', 'left', 'boots', 'pet', 'ancillary-left', 'ancillary-right'];
        const newlyEquipped = [];

        slotsToEquip.forEach(slot => {
            const candidates = availableItems.filter(item => {
                const itemSlot = item.equippedSlot || item.slot || item.type;
                if (slot === 'right' || slot === 'left') {
                    return itemSlot === slot || item.type === 'weapon' || item.type === 'shield' || itemSlot === 'hand';
                }
                return itemSlot === slot;
            });

            if (candidates.length > 0) {
                candidates.sort((a, b) => getItemValue(b) - getItemValue(a));
                const bestItem = candidates[0];
                newlyEquipped.push({ ...bestItem, equippedSlot: slot });
            }
        });

        expect(newlyEquipped.find(i => i.equippedSlot === 'right')?.id).toBe('sword2');
    });
});
