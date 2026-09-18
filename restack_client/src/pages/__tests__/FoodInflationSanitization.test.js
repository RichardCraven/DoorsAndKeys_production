jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({
  CButton: 'CButton',
  CFormSelect: 'CFormSelect',
  CFormInput: 'CFormInput',
  CModal: () => null,
  CModalHeader: () => null,
  CModalTitle: () => null,
  CModalBody: () => null,
  CModalFooter: () => null
}));

let mockSessionMeta = { food: 346090, pocketResources: { food: 346090 } };
jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => mockSessionMeta),
    storeMeta: jest.fn((newMeta) => { mockSessionMeta = { ...newMeta }; }),
    getUserId: jest.fn(() => 'player_1')
}));

import React from 'react';
import DungeonPage from '../DungeonPage';
import { getMeta, storeMeta } from '../../utils/session-handler';

describe('Food Inflation Sanitization', () => {
    let originalComponentDidMount;

    beforeAll(() => {
        originalComponentDidMount = DungeonPage.prototype.componentDidMount;
        DungeonPage.prototype.componentDidMount = jest.fn();
    });

    afterAll(() => {
        DungeonPage.prototype.componentDidMount = originalComponentDidMount;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockSessionMeta = { food: 346090, pocketResources: { food: 346090 } };
        getMeta.mockImplementation(() => mockSessionMeta);
        storeMeta.mockImplementation((newMeta) => { mockSessionMeta = { ...newMeta }; });
    });

    test('getResourcesData and getPocketResources sanitize runaway food values back to foodLimit', () => {
        const instance = new DungeonPage({});
        instance.getFoodLimit = () => 250;

        const resData = instance.getResourcesData();
        expect(resData.food).toBe(250);

        const pocketRes = instance.getPocketResources();
        expect(pocketRes.food).toBe(250);
    });

    test('tickClaimableBuildings caps elapsed cycles and handles legacy low timestamps safely', () => {
        const instance = new DungeonPage({});
        instance.getFoodLimit = () => 250;
        instance.addPocketResource = jest.fn();
        instance.displayMessage = jest.fn();

        const superboard = {
            miniboards: [{
                tiles: [{
                    building: 'farm',
                    territory: 'player',
                    affiliation: 'friendly',
                    lastClaimTickTime: 1 // Legacy/corrupted small timestamp
                }]
            }]
        };

        mockSessionMeta = { food: 100, pocketResources: { food: 100 } };

        instance.tickClaimableBuildings(superboard);

        expect(mockSessionMeta.food).toBeLessThanOrEqual(250);
        expect(superboard.miniboards[0].tiles[0].lastClaimTickTime).toBeGreaterThan(1700000000000);
    });

    test('tickPocketResourceGenerators caps elapsed cycles and sanitizes invalid lastTickTime', () => {
        const instance = new DungeonPage({});
        instance.addPocketResource = jest.fn();

        instance.getGeneratorDef = () => ({
            key: 'farm',
            rate: 5,
            currencyType: 'food'
        });

        const pastTimestamp = Date.now() - 300000;
        const superboard = {
            miniboards: [{
                tiles: [{
                    affiliation: 'friendly',
                    generatorData: {
                        activated: true,
                        owned: true,
                        lastTickTime: pastTimestamp
                    }
                }]
            }]
        };

        instance.tickPocketResourceGenerators(superboard);

        const tile = superboard.miniboards[0].tiles[0];
        expect(tile.generatorData.lastTickTime).toBeGreaterThan(1700000000000);
        expect(instance.addPocketResource).toHaveBeenCalled();
        const callArgs = instance.addPocketResource.mock.calls[0];
        expect(callArgs[0]).toBe('food');
        expect(callArgs[1]).toBeLessThanOrEqual(50);
    });

    test('tickPocketResourceGenerators resets invalid legacy small lastTickTime to now without exploding', () => {
        const instance = new DungeonPage({});
        instance.addPocketResource = jest.fn();

        instance.getGeneratorDef = () => ({
            key: 'farm',
            rate: 5,
            currencyType: 'food'
        });

        const superboard = {
            miniboards: [{
                tiles: [{
                    affiliation: 'friendly',
                    generatorData: {
                        activated: true,
                        owned: true,
                        lastTickTime: 1000
                    }
                }]
            }]
        };

        instance.tickPocketResourceGenerators(superboard);

        const tile = superboard.miniboards[0].tiles[0];
        expect(tile.generatorData.lastTickTime).toBeGreaterThan(1700000000000);
    });
});
