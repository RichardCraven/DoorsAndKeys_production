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

let mockMeta = { pocketFreeWill: 50 };
jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => mockMeta),
    storeMeta: jest.fn((newMeta) => { mockMeta = { ...newMeta }; }),
    getUserId: jest.fn(() => 'player_1')
}));

import React from 'react';
import DungeonPage from '../DungeonPage';

describe('Domain Node Enter Key & Friendly Outpost Targeting', () => {
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
        mockMeta = { pocketFreeWill: 50 };
    });

    test('Pressing Enter/Return key when Domain Node modal is open triggers startMonolithActivation', () => {
        const instance = new DungeonPage({});
        instance.startMonolithActivation = jest.fn();
        instance.getGeneratorDef = () => ({ key: 'domain_node', name: 'Domain Node' });

        const domainNodeTile = {
            id: 10,
            globalX: 5,
            globalY: 5,
            building: 'domain_node',
            contains: { type: 'building', subtype: 'domain_node' }
        };

        instance.state = {
            showGeneratorModal: true,
            activeGeneratorTile: domainNodeTile,
            inSuperboard: true,
            isInPocketDimension: true
        };

        // Simulate Return/Enter key down
        instance.keyDownHandler({ key: 'Enter', preventDefault: jest.fn() });

        expect(instance.startMonolithActivation).toHaveBeenCalledWith(domainNodeTile);
    });

    test('Friendly Outposts in Pocket Dimension target both hostile AND neutral warrior pygmies', () => {
        const superboard = {
            miniboards: Array(9).fill(null).map((_, mbIdx) => ({
                id: mbIdx,
                tiles: Array(225).fill(null).map((_, tIdx) => ({ id: mbIdx * 225 + tIdx }))
            }))
        };

        const instance = new DungeonPage({
            boardManager: {
                dungeon: {
                    superboards: {
                        pocket_plains: superboard
                    }
                }
            }
        });

        const neutralPygmy = {
            id: 'pygmy_neutral_1',
            gx: 6,
            gy: 5,
            hp: 15,
            maxHp: 15,
            subtype: 'pocket_pygmy',
            isPocketPygmy: true,
            affiliation: 'neutral'
        };

        instance.state = {
            inSuperboard: true,
            isInPocketDimension: true,
            superboardType: 'pocket_plains',
            superboardViewMinX: 0,
            superboardViewMinY: 0,
            superboardEntities: {
                [neutralPygmy.id]: neutralPygmy
            },
            dungeon: {
                superboards: {
                    pocket_plains: superboard
                }
            }
        };

        instance.getGeneratorDef = (t) => ({ key: t.building || t.contains?.subtype || 'outpost' });
        instance.updateSuperboardViewport = jest.fn();
        instance.displayMessage = jest.fn();
        instance.projectileCanvasRef = { current: null };

        // Place friendly outpost at (5, 5)
        const outpostTile = {
            id: 80,
            globalX: 5,
            globalY: 5,
            building: 'outpost',
            placedBy: 'player',
            contains: { type: 'building', subtype: 'outpost', placedBy: 'player' }
        };
        superboard.miniboards[0].tiles[80] = outpostTile;

        instance.tickOutpostAttacks();

        // Outpost tile should have fired at neutral pygmy
        expect(outpostTile._lastFiredAt).toBeDefined();
        expect(neutralPygmy.hp).toBeLessThan(15);
        expect(neutralPygmy.lastDamagedByOutpost).toBeDefined();
    });

    test('Friendly Outposts do NOT target allied pygmies or dwelling worker pygmies', () => {
        const superboard = {
            miniboards: Array(9).fill(null).map((_, mbIdx) => ({
                id: mbIdx,
                tiles: Array(225).fill(null).map((_, tIdx) => ({ id: mbIdx * 225 + tIdx }))
            }))
        };

        const instance = new DungeonPage({
            boardManager: {
                dungeon: {
                    superboards: {
                        pocket_plains: superboard
                    }
                }
            }
        });

        const workerPygmy = {
            id: 'worker_1',
            gx: 6,
            gy: 5,
            hp: 10,
            isWorkerPygmy: true,
            subtype: 'worker_pygmy'
        };
        const alliedPygmy = {
            id: 'allied_1',
            gx: 5,
            gy: 6,
            hp: 15,
            isPocketPygmy: true,
            affiliation: 'friendly',
            placedBy: 'player'
        };

        instance.state = {
            inSuperboard: true,
            isInPocketDimension: true,
            superboardType: 'pocket_plains',
            superboardViewMinX: 0,
            superboardViewMinY: 0,
            superboardEntities: {
                [workerPygmy.id]: workerPygmy,
                [alliedPygmy.id]: alliedPygmy
            },
            dungeon: {
                superboards: {
                    pocket_plains: superboard
                }
            }
        };

        instance.getGeneratorDef = (t) => ({ key: 'outpost' });
        instance.updateSuperboardViewport = jest.fn();
        instance.displayMessage = jest.fn();

        const outpostTile = {
            id: 80,
            globalX: 5,
            globalY: 5,
            building: 'outpost',
            placedBy: 'player',
            contains: { type: 'building', subtype: 'outpost', placedBy: 'player' }
        };
        superboard.miniboards[0].tiles[80] = outpostTile;

        instance.tickOutpostAttacks();

        // Outpost should NOT fire at worker or allied pygmies
        expect(outpostTile._lastFiredAt).toBeUndefined();
        expect(workerPygmy.hp).toBe(10);
        expect(alliedPygmy.hp).toBe(15);
    });
});
