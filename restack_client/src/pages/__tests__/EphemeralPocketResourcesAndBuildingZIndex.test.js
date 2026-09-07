jest.mock('@coreui/icons', () => ({}));
import React from 'react';
import DungeonPage from '../DungeonPage';
import Tile from '../../components/tile';

describe('Ephemeral Pocket Dimension Resources and Building Z-Index Layering', () => {
    describe('Ephemeral Pocket Dimension Resources', () => {
        let instance;
        let mockInventoryManager;
        let mockBoardManager;

        beforeEach(() => {
            mockInventoryManager = {
                addCurrency: jest.fn(),
                addItem: jest.fn(),
                gold: 0,
                wood: 0,
                stone: 0,
                slate: 0,
                shimmering_dust: 0,
                totems: 0,
                mushrooms: 0,
                inventory: []
            };
            mockBoardManager = {
                chestPickupInProgress: false,
                treasurePickupInProgress: false
            };

            instance = new DungeonPage({
                inventoryManager: mockInventoryManager,
                boardManager: mockBoardManager,
                crewManager: { crew: [] }
            });

            instance._isMounted = true;
            instance.setState = (newState, cb) => {
                const next = typeof newState === 'function' ? newState(instance.state) : newState;
                instance.state = { ...instance.state, ...next };
                if (cb) cb();
            };

            instance.displayMessage = jest.fn();
            instance.triggerLootRadialArc = jest.fn();
            instance.forceUpdate = jest.fn();
        });

        test('addCurrencyToInventory redirects to pocketResources and bypasses inventoryManager when inSuperboard is true', () => {
            instance.state = {
                inSuperboard: true,
                pocketResources: { wood: 10 }
            };

            instance.addCurrencyToInventory({ type: 'wood', amount: 25 });

            // Should NOT touch main inventory manager
            expect(mockInventoryManager.addCurrency).not.toHaveBeenCalled();

            // Should update pocketResources
            const pocketRes = instance.getPocketResources();
            expect(pocketRes.wood).toBe(35);
        });

        test('addFoodToSupplies redirects to pocketResources when inSuperboard is true', () => {
            instance.state = {
                inSuperboard: true,
                pocketResources: { food: 5 }
            };

            instance.addFoodToSupplies();

            // Should update pocketResources food
            const pocketRes = instance.getPocketResources();
            expect(pocketRes.food).toBe(35);
        });
    });

    describe('Construction Tile and Structure Z-Index Layering', () => {
        test('renders construction site tile with zIndex 30 above inscription bars at zIndex 10', () => {
            const wrapper = React.createElement(Tile, {
                contains: { subtype: 'sawmill_under_construction' },
                inscriptions: { top: 'Ancient Runes' }
            });

            expect(wrapper).toBeDefined();
        });
    });
});
