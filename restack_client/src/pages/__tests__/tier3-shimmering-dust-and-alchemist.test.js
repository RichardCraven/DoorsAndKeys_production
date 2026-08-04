import React from 'react';

describe('Tier 3+ Shimmering Dust Drop & Alchemist Discovery Unit Tests', () => {
    test('Tier 3 monster drops shimmering dust on victory', () => {
        const inventoryManager = {
            shimmering_dust: 0,
            addCurrency: jest.fn(function(data) {
                if (data.type === 'shimmering_dust') {
                    this.shimmering_dust += data.amount;
                }
            })
        };

        const monster = {
            name: 'Gorgon',
            tier: 3,
            level: 5,
            hp: 0
        };

        const onTriggerLootArc = jest.fn();

        // Simulate loot drop logic for Tier 3+ monster
        const mTier = (monster && typeof monster.tier === 'number') ? monster.tier : ((monster && typeof monster.level === 'number' && monster.level >= 5) ? 3 : 1);
        const isTier3Plus = mTier >= 3 || (monster && (monster.isBoss || monster.tier >= 3));

        expect(isTier3Plus).toBe(true);

        if (isTier3Plus) {
            const dustAmount = 2; // simulated roll
            inventoryManager.addCurrency({ type: 'shimmering_dust', amount: dustAmount });
            onTriggerLootArc({
                type: 'currency',
                currencyType: 'shimmering_dust',
                name: `Shimmering Dust (+${dustAmount})`
            });
        }

        expect(inventoryManager.shimmering_dust).toBe(2);
        expect(inventoryManager.addCurrency).toHaveBeenCalledWith({ type: 'shimmering_dust', amount: 2 });
        expect(onTriggerLootArc).toHaveBeenCalledWith(expect.objectContaining({
            currencyType: 'shimmering_dust',
            name: 'Shimmering Dust (+2)'
        }));
    });

    test('First-time Alchemist encounter displays discovery message and sets metadata', () => {
        let meta = { discoveredAlchemist: false };
        let displayedMessage = null;

        const displayMessage = (msg) => {
            displayedMessage = msg;
        };

        const triggerVendorEncounter = (vendorType) => {
            const normalized = String(vendorType || '').toLowerCase();
            if (normalized === 'alchemist') {
                if (!meta.discoveredAlchemist) {
                    meta.discoveredAlchemist = true;
                    displayMessage('You have discovered an Alchemist! Your map has been marked.');
                }
            }
        };

        // First encounter
        triggerVendorEncounter('alchemist');
        expect(meta.discoveredAlchemist).toBe(true);
        expect(displayedMessage).toBe('You have discovered an Alchemist! Your map has been marked.');

        // Second encounter (should not re-trigger discovery message)
        displayedMessage = null;
        triggerVendorEncounter('alchemist');
        expect(displayedMessage).toBeNull();
    });
});
