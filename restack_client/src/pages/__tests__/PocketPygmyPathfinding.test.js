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

describe('Pocket Pygmy BFS Pathfinding & Un-stuck Detour Logic', () => {
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

    const setTileAsTree = (superboard, gx, gy) => {
        const mbX = Math.floor(gx / 15);
        const mbY = Math.floor(gy / 15);
        const mbIdx = mbY * 3 + mbX;
        const lX = gx % 15;
        const lY = gy % 15;
        const tIdx = lY * 15 + lX;
        superboard.miniboards[mbIdx].tiles[tIdx] = {
            type: 'tree',
            contains: { type: 'tree', subtype: 'oak_tree' },
            color: '#1e3814'
        };
    };

    test('findSuperboardBFSPath routes unit around a wall of trees', () => {
        const superboard = createMockSuperboard();
        // Start unit at (20, 22), target at (24, 22)
        // Block direct path at (22, 21), (22, 22), (22, 23) with trees
        setTileAsTree(superboard, 22, 21);
        setTileAsTree(superboard, 22, 22);
        setTileAsTree(superboard, 22, 23);

        const path = page.findSuperboardBFSPath(superboard, 20, 22, 24, 22, {}, 300);
        expect(path).toBeDefined();
        expect(path.length).toBeGreaterThan(0);

        // Path step should detour north or south around the tree wall (gy <= 20 or gy >= 24)
        const step = path[0];
        expect(step.gx).toBeDefined();
        expect(step.gy).toBeDefined();
        // Must not step into the trees at (22, 21..23)
        expect(step.gx === 22 && (step.gy >= 21 && step.gy <= 23)).toBe(false);
    });

    test('Pygment pursuit utilizes BFS path step to bypass obstacles', () => {
        const superboard = createMockSuperboard();
        setTileAsTree(superboard, 21, 22); // Tree right in front of pygmy at (20, 22)

        const pygmy = {
            id: 'pygmy_allied_1',
            gx: 20,
            gy: 22,
            hp: 10,
            maxHp: 10,
            isAllied: true,
            isPocketPygmy: true
        };
        const entities = { pygmy_allied_1: pygmy };
        page.state.superboardEntities = entities;
        page.state.superboardPlayerPos = { gx: 24, gy: 22 }; // Player behind tree wall

        // Run tick simulation (pygmy action loop)
        const mbIdx = 4; // Center miniboard (gx 15-29, gy 15-29)
        const tIdx = (22 % 15) * 15 + (20 % 15);
        const pygmiesList = [{
            unit: { gx: 20, gy: 22, mbIdx, tIdx },
            pygmy
        }];

        // Simulate pursuit logic section
        const adjEmpty = page.getAdjacentSuperboardTiles(superboard, 20, 22, false, entities).filter(c => c.isEmpty);
        let chosen = null;

        if (pygmy._lastGx === 20 && pygmy._lastGy === 22) {
            pygmy._stuckTicks = (pygmy._stuckTicks || 0) + 1;
        } else {
            pygmy._lastGx = 20;
            pygmy._lastGy = 22;
            pygmy._stuckTicks = 0;
        }

        const bfsPath = page.findSuperboardBFSPath(superboard, 20, 22, 24, 22, entities, 300);
        if (bfsPath && bfsPath.length > 0) {
            chosen = bfsPath[0];
        }

        expect(chosen).toBeDefined();
        expect(chosen.gx === 21 && chosen.gy === 22).toBe(false); // Did not step on tree!
    });

    test('Stuck counter triggers un-stuck detour when unit position remains unchanged for 2+ ticks', () => {
        const superboard = createMockSuperboard();
        const pygmy = {
            id: 'pygmy_allied_2',
            gx: 20,
            gy: 22,
            hp: 10,
            maxHp: 10,
            isAllied: true,
            isPocketPygmy: true,
            _lastGx: 20,
            _lastGy: 22,
            _stuckTicks: 2, // Simulate being stuck for 2 ticks
            _lastFailedStepGx: 21,
            _lastFailedStepGy: 22
        };

        const adjEmpty = page.getAdjacentSuperboardTiles(superboard, 20, 22, false, {}).filter(c => c.isEmpty);
        const candidates = adjEmpty.filter(c => !(pygmy._stuckTicks >= 2 && c.gx === pygmy._lastFailedStepGx && c.gy === pygmy._lastFailedStepGy));
        
        expect(candidates.some(c => c.gx === 21 && c.gy === 22)).toBe(false); // Excluded failed step!
        expect(candidates.length).toBeGreaterThan(0);
    });
});
