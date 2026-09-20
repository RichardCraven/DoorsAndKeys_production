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

describe('Automaton Pathfinding and Continuous Visibility', () => {
    let page;
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
        page = new DungeonPage({});
        page._isMounted = true;
        page.state = {
            ...page.state,
            inSuperboard: true,
            isInPocketDimension: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 20, gy: 20 },
            superboardEntities: {},
            dungeon: {
                superboards: {
                    pocket_plains: superboard
                }
            }
        };
        page.props = {
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
        page.setState = (newState, callback) => {
            page.state = {
                ...page.state,
                ...(typeof newState === 'function' ? newState(page.state) : newState)
            };
            if (callback) callback();
        };
        page.forceUpdate = jest.fn();
        page.displayMessage = jest.fn();
        page.updateSuperboardViewport = jest.fn();
    });

    test('1. Automaton maintains continuous visibility on toTile.contains during movePocketPygmyUnit', () => {
        const auto = {
            id: 'auto_unit_vis',
            gx: 5,
            gy: 5,
            mbIdx: 0,
            tIdx: 80,
            isAutomaton: true,
            subtype: 'automaton',
            hp: 30,
            maxHp: 30,
            faction: 'enemy'
        };

        const fromTile = superboard.miniboards[0].tiles[80];
        fromTile.contains = auto;
        page.state.superboardEntities = { [auto.id]: auto };

        const toMbIdx = 0;
        const toTIdx = 81;
        const toTile = superboard.miniboards[0].tiles[81];

        const moved = page.movePocketPygmyUnit(superboard, 0, 80, toMbIdx, toTIdx, 5, 5, 6, 5, { entities: page.state.superboardEntities, unitId: auto.id });

        expect(moved).toBe(true);
        expect(auto.gx).toBe(6);
        expect(auto.gy).toBe(5);

        // Previous tile contains is cleared
        expect(fromTile.contains).toBeNull();

        // Destination tile contains maintains the automaton for continuous rendering in tile.js!
        expect(toTile.contains).toBeTruthy();
        expect(toTile.contains.isAutomaton).toBe(true);
        expect(toTile.contains.id).toBe('auto_unit_vis');
        expect(toTile.image).toBeTruthy();
    });

    test('2. findSuperboardAStarPath successfully routes around impassable obstacles', () => {
        // Place obstacle wall of trees between (2, 2) and (4, 2)
        // Obstacles at (3, 1), (3, 2), (3, 3)
        for (let y = 1; y <= 3; y++) {
            const tile = superboard.miniboards[0].tiles[y * 15 + 3];
            tile.isWall = true;
            tile.building = 'wall';
        }

        const path = page.findSuperboardAStarPath(
            superboard,
            2, 2,
            { gx: 4, gy: 2 },
            { adjacentGoal: true }
        );

        expect(path).toBeDefined();
        expect(path.length).toBeGreaterThan(0);

        // Verify none of the steps route through the obstacle wall at x = 3, y in [1, 2, 3]
        for (const step of path) {
            const isBlockedCell = step.gx === 3 && step.gy >= 1 && step.gy <= 3;
            expect(isBlockedCell).toBe(false);
        }

        // Final step should be adjacent (Chebyshev distance <= 1) to (4, 2)
        const finalStep = path[path.length - 1];
        expect(Math.max(Math.abs(finalStep.gx - 4), Math.abs(finalStep.gy - 2))).toBeLessThanOrEqual(1);
    });

    test('3. Automaton steps along cached A* path tick-by-tick towards closestTarget', () => {
        page._automatonLastBuildTime = Date.now();
        const auto = {
            id: 'auto_path_test',
            gx: 2,
            gy: 2,
            mbIdx: 0,
            tIdx: 32,
            isAutomaton: true,
            subtype: 'automaton',
            hp: 30,
            maxHp: 30,
            faction: 'enemy',
            affiliation: 'hostile'
        };

        const fromTile = superboard.miniboards[0].tiles[32];
        fromTile.contains = auto;
        page.state.superboardEntities = { [auto.id]: auto };

        // Place a target (sawmill) at (6, 2)
        const tgtTile = superboard.miniboards[0].tiles[36]; // (6, 2)
        tgtTile.building = 'sawmill';
        tgtTile.contains = {
            id: 'player_sawmill',
            type: 'building',
            subtype: 'sawmill',
            affiliation: 'player',
            placedBy: 'player',
            hp: 50
        };

        // Tick 1: Automaton should compute path and take 1 step towards (6, 2), e.g. to (3, 2)
        page.tickPocketPygmies(superboard);

        expect(auto.gx).toBe(3);
        expect(auto.gy).toBe(2);
        expect(auto.currentTargetId).toBe('player_sawmill');
        expect(auto.currentPath).toBeDefined();

        // Destination tile (3, 2) should now contain the automaton
        const step1Tile = superboard.miniboards[0].tiles[33];
        expect(step1Tile.contains).toBeTruthy();
        expect(step1Tile.contains.id).toBe('auto_path_test');

        // Tick 2: Step to (4, 2)
        page.tickPocketPygmies(superboard);
        expect(auto.gx).toBe(4);
        expect(auto.gy).toBe(2);

        // Tick 3: Step to (5, 2) - now adjacent to (6, 2)!
        page.tickPocketPygmies(superboard);
        expect(auto.gx).toBe(5);
        expect(auto.gy).toBe(2);

        // Tick 4: Reached adjacency (dist <= 1) -> begins converting the sawmill!
        page.tickPocketPygmies(superboard);
        expect(auto.convertingTarget).toBeDefined();
        expect(auto.convertingTarget.targetId).toBe('player_sawmill');
    });
});
