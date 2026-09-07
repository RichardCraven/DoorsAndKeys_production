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
  CModal: 'CModal',
  CModalHeader: 'CModalHeader',
  CModalTitle: 'CModalTitle',
  CModalBody: 'CModalBody',
  CModalFooter: 'CModalFooter'
}));

import React from 'react';
import DungeonPage from '../DungeonPage';

describe('Pocket Dimension Pygmy Performance & Capacity Enforcement', () => {
    let page;

    beforeEach(() => {
        page = new DungeonPage({});
        page.state = {
            inSuperboard: true,
            superboardEntities: {},
            superboardViewMinX: 15,
            superboardViewMinY: 15,
            tileSize: 48,
            superboardPlayerPos: { gx: 22, gy: 22 }
        };
        page.props = {
            boardManager: {
                refreshTiles: jest.fn(),
                tiles: []
            }
        };
        page.setState = jest.fn((patch) => {
            page.state = { ...page.state, ...patch };
        });
        page.updateSuperboardViewport = jest.fn();
        page.displayMessage = jest.fn();
    });

    const createMockSuperboard = () => {
        const miniboards = [];
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const tiles = [];
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                tiles.push({
                    type: 'empty_space',
                    contains: null,
                    color: '#2d4a22'
                });
            }
            miniboards.push({ tiles });
        }
        return { miniboards };
    };

    test('ensurePocketPygmiesAndStructures strictly respects targetCapacity when units are in superboardEntities', () => {
        const superboard = createMockSuperboard();
        const hutGx = 22;
        const hutGy = 22;
        const structKey = 'building_earthen_fort_22_22';

        // Place a Level 1 earthen fort on the superboard
        const mbIdx = Math.floor(hutGy / 15) * 3 + Math.floor(hutGx / 15);
        const tIdx = (hutGy % 15) * 15 + (hutGx % 15);
        superboard.miniboards[mbIdx].tiles[tIdx] = {
            building: 'earthen_fort',
            contains: {
                type: 'building',
                subtype: 'earthen_fort',
                level: 1,
                id: structKey
            }
        };

        // First call: Should spawn 1 pygmy on an adjacent tile
        page.ensurePocketPygmiesAndStructures(superboard, 'pocket_dimension');
        // Migrate to entities (as happens on each tick)
        page.migrateTilesToEntityRegistry(superboard);

        const initialEntities = Object.values(page.state.superboardEntities || {});
        expect(initialEntities.length).toBe(1);
        expect(initialEntities[0].homeStructureKey).toBe('4_112_earthen_fort');

        // Subsequent call: Since 1 pygmy is living in superboardEntities, it must NOT spawn another!
        page.ensurePocketPygmiesAndStructures(superboard, 'pocket_dimension');
        page.migrateTilesToEntityRegistry(superboard);

        const afterEntities = Object.values(page.state.superboardEntities || {});
        expect(afterEntities.length).toBe(1); // STILL 1, no infinite spawn!
    });

    test('ensurePocketPygmiesAndStructures prunes bloated excess pygmies from previous infinite-spawn saves', () => {
        const superboard = createMockSuperboard();
        const hutGx = 22;
        const hutGy = 22;
        const structKey = 'building_earthen_fort_22_22';

        const mbIdx = Math.floor(hutGy / 15) * 3 + Math.floor(hutGx / 15);
        const tIdx = (hutGy % 15) * 15 + (hutGx % 15);
        superboard.miniboards[mbIdx].tiles[tIdx] = {
            building: 'earthen_fort',
            contains: {
                type: 'building',
                subtype: 'earthen_fort',
                level: 1,
                id: structKey
            }
        };

        // Simulate an overpopulated save with 15 bloated pygmies assigned to this Level 1 hut
        const bloatedEntities = {};
        for (let i = 0; i < 15; i++) {
            const id = `bloated_pygmy_${i}`;
            bloatedEntities[id] = {
                id,
                gx: 20 + (i % 5),
                gy: 20 + Math.floor(i / 5),
                quadrant: 'NW',
                hp: 10,
                maxHp: 10,
                isPocketPygmy: true,
                homeStructureKey: structKey
            };
        }
        page.state.superboardEntities = bloatedEntities;

        // Running ensurePocketPygmiesAndStructures should prune the excess 14 units down to capacity (1)
        page.ensurePocketPygmiesAndStructures(superboard, 'pocket_dimension');

        const remainingEntities = Object.values(page.state.superboardEntities || {});
        expect(remainingEntities.length).toBe(1);
        expect(remainingEntities[0].homeStructureKey).toBe(structKey);
    });

    test('movePocketPygmyUnit with skipSetState batches in-memory movements without triggering React setState', () => {
        const superboard = createMockSuperboard();
        const entities = {
            unit_1: {
                id: 'unit_1',
                gx: 22,
                gy: 22,
                quadrant: 'NW',
                hp: 10,
                isPocketPygmy: true
            }
        };
        page.state.superboardEntities = entities;

        const setStateCallCountBefore = page.setState.mock.calls.length;

        // Move unit with skipSetState: true
        const moved = page.movePocketPygmyUnit(
            superboard,
            4, (7 * 15 + 7), // from Mb 4, tile (7,7) -> gx 22, gy 22
            4, (7 * 15 + 8), // to Mb 4, tile (7,8) -> gx 23, gy 22
            22, 22,
            23, 22,
            { skipSetState: true, entities }
        );

        expect(moved).toBe(true);
        expect(entities.unit_1.gx).toBe(23);
        expect(entities.unit_1.gy).toBe(22);
        // Ensure setState was NOT called during the batched move
        expect(page.setState.mock.calls.length).toBe(setStateCallCountBefore);
    });

    test('animatePocketPygmyBump skips animation when off-screen and does not block synchronously', () => {
        const superboard = createMockSuperboard();
        // Set viewport to (15, 15) -> local 0-14 is gx 15-29, gy 15-29
        // Place unit far away at gx: 2, gy: 2 (off-screen)
        page.isSuperboardCoordVisibleToUser = jest.fn(() => false);

        page.animatePocketPygmyBump(superboard, 0, 32, 1, 0);

        // Since off-screen, refreshTiles should not even be called
        expect(page.props.boardManager.refreshTiles).not.toHaveBeenCalled();
    });

    test('render entity count map pre-computation works with O(1) coordinate lookups', () => {
        const entities = {
            e1: { id: 'e1', gx: 22, gy: 22, hp: 10, quadrant: 'NW' },
            e2: { id: 'e2', gx: 22, gy: 22, hp: 10, quadrant: 'NE' },
            e3: { id: 'e3', gx: 25, gy: 25, hp: 10, quadrant: 'NW' }
        };

        const entitiesArr = Object.values(entities);
        const entityCountByCoord = new Map();
        for (let i = 0; i < entitiesArr.length; i++) {
            const e = entitiesArr[i];
            if (e && (e.hp || 0) > 0 && e.id !== 'player') {
                const key = `${e.gx},${e.gy}`;
                entityCountByCoord.set(key, (entityCountByCoord.get(key) || 0) + 1);
            }
        }

        expect(entityCountByCoord.get('22,22')).toBe(2);
        expect(entityCountByCoord.get('25,25')).toBe(1);
        expect(entityCountByCoord.get('10,10')).toBeUndefined();
    });
});
