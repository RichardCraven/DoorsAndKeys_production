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

describe('Automaton AI Hysteresis and Anti-Backtracking', () => {
    let pageInstance;
    let superboard;

    const createMockSuperboard = () => {
        const miniboards = [];
        for (let mb = 0; mb < 9; mb++) {
            const mbX = (mb % 3) * 15;
            const mbY = Math.floor(mb / 3) * 15;
            const tiles = [];
            for (let t = 0; t < 225; t++) {
                const gx = mbX + (t % 15);
                const gy = mbY + Math.floor(t / 15);
                tiles.push({
                    id: mb * 225 + t,
                    globalX: gx,
                    globalY: gy,
                    coordinates: [t % 15, Math.floor(t / 15)],
                    contains: null,
                    building: null,
                    terrain: 'grass'
                });
            }
            miniboards.push({ id: mb, tiles });
        }
        return { miniboards };
    };

    beforeEach(() => {
        superboard = createMockSuperboard();
        const props = {
            boardManager: {
                tiles: [],
                currentBoard: { tiles: [] },
                refreshTiles: jest.fn(),
                playerTile: { location: [7, 7] },
                currentOrientation: 'F',
                getContainsType: (c) => typeof c === 'object' ? c?.type : c,
                getContainsSubtype: (c) => typeof c === 'object' ? (c?.subtype || c?.key) : c,
                getIndexFromCoordinates: jest.fn(() => 0),
                dungeon: {
                    superboards: {
                        pocket_plains: superboard
                    }
                }
            },
            crewManager: { crew: [] },
            user: { _id: 'test-user-1' }
        };

        pageInstance = new DungeonPage(props);
        pageInstance.state = {
            ...pageInstance.state,
            inSuperboard: true,
            isInPocketDimension: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 20, gy: 20 },
            dungeon: {
                superboards: {
                    pocket_plains: superboard
                }
            }
        };
        pageInstance._isMounted = true;
        pageInstance.setState = (newState, callback) => {
            pageInstance.state = {
                ...pageInstance.state,
                ...(typeof newState === 'function' ? newState(pageInstance.state) : newState)
            };
            if (callback) callback();
        };
        pageInstance.forceUpdate = jest.fn();
        pageInstance.displayMessage = jest.fn();
        pageInstance.updateSuperboardViewport = jest.fn();
    });

    test('Automaton AI maintains target lock and avoids backtracking to previous tile', () => {
        const auto = {
            id: 'auto_test_1',
            gx: 10,
            gy: 10,
            mbIdx: 0,
            tIdx: 160,
            isAutomaton: true,
            subtype: 'automaton',
            hp: 30,
            maxHp: 30,
            faction: 'enemy',
            affiliation: 'hostile',
            currentTargetId: 'target_A',
            lastGx: 11,
            lastGy: 10
        };

        const autoTile = superboard.miniboards[0].tiles[160];
        autoTile.contains = auto;
        pageInstance.state.superboardEntities = { [auto.id]: auto };

        // Target A at (5, 10)
        const tileA = superboard.miniboards[0].tiles[155];
        tileA.building = 'sawmill';
        tileA.contains = { id: 'target_A', type: 'building', subtype: 'sawmill', affiliation: 'player' };

        // Target B at (15, 10)
        const tileB = superboard.miniboards[0].tiles[165];
        tileB.building = 'sawmill';
        tileB.contains = { id: 'target_B', type: 'building', subtype: 'sawmill', affiliation: 'player' };

        pageInstance.tickPocketPygmies(superboard);

        // Automaton should lock onto target_A and step left towards (9, 10), NOT backtrack right to (11, 10)
        expect(auto.currentTargetId).toBe('target_A');
        expect(auto.gx).toBe(9);
        expect(auto.gy).toBe(10);
        expect(auto.lastGx).toBe(10);
    });
});
