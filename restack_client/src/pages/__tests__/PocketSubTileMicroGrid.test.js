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

describe('Pocket Dimension Sub-Tile Entity Micro-Grid & Quadrant Collision System', () => {
    let pageInstance;

    beforeEach(() => {
        // Create an instance of DungeonPage with minimal mocked props
        const props = {
            boardManager: {
                tiles: [],
                currentBoard: { tiles: [] },
                refreshTiles: jest.fn(),
                playerTile: { location: [7, 7] }
            },
            crewManager: {
                crew: [{ id: 'hero', name: 'Hero', hp: 50, stats: { atk: 15 } }]
            },
            user: { _id: 'test-user-1' }
        };
        pageInstance = new DungeonPage(props);
        pageInstance.state = {
            ...pageInstance.state,
            inSuperboard: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 7, gy: 7 },
            superboardEntities: {},
            superboardViewMinX: 0,
            superboardViewMinY: 0,
            tileSize: 48
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
    });

    test('getQuadrantOffset returns centered coordinates when unit is alone and corner sub-coordinates when sharing tile', () => {
        const aloneOffset = pageInstance.getQuadrantOffset('NW', true);
        expect(aloneOffset).toEqual({ fx: 0.27, fy: 0.27 });

        const nwOffset = pageInstance.getQuadrantOffset('NW', false);
        const neOffset = pageInstance.getQuadrantOffset('NE', false);
        const swOffset = pageInstance.getQuadrantOffset('SW', false);
        const seOffset = pageInstance.getQuadrantOffset('SE', false);

        expect(nwOffset).toEqual({ fx: 0.03, fy: 0.03 });
        expect(neOffset).toEqual({ fx: 0.51, fy: 0.03 });
        expect(swOffset).toEqual({ fx: 0.03, fy: 0.51 });
        expect(seOffset).toEqual({ fx: 0.51, fy: 0.51 });
    });

    test('getAvailableQuadrant assigns distinct quadrants up to 4 units, then blocks additional units', () => {
        expect(pageInstance.getAvailableQuadrant(10, 10)).toBe('NW');

        // Add 1st entity
        pageInstance.state.superboardEntities = {
            e1: { id: 'e1', gx: 10, gy: 10, quadrant: 'NW', hp: 10 }
        };
        expect(pageInstance.getAvailableQuadrant(10, 10)).toBe('NE');

        // Add 2nd entity
        pageInstance.state.superboardEntities.e2 = { id: 'e2', gx: 10, gy: 10, quadrant: 'NE', hp: 10 };
        expect(pageInstance.getAvailableQuadrant(10, 10)).toBe('SW');

        // Add 3rd entity
        pageInstance.state.superboardEntities.e3 = { id: 'e3', gx: 10, gy: 10, quadrant: 'SW', hp: 10 };
        expect(pageInstance.getAvailableQuadrant(10, 10)).toBe('SE');

        // Add 4th entity (tile is now full: 4 sub-tiles occupied)
        pageInstance.state.superboardEntities.e4 = { id: 'e4', gx: 10, gy: 10, quadrant: 'SE', hp: 10 };
        expect(pageInstance.getAvailableQuadrant(10, 10)).toBeNull();

        // Excluding e2 allows e2 to re-evaluate its quadrant
        expect(pageInstance.getAvailableQuadrant(10, 10, 'e2')).toBe('NE');
    });

    test('migrateTilesToEntityRegistry extracts units from superboard miniboards into entity registry and clears tile.contains', () => {
        const mockSuperboard = {
            miniboards: Array.from({ length: 9 }, () => ({
                tiles: Array.from({ length: 225 }, () => ({ contains: null, image: null }))
            }))
        };

        // Place a pygmy in miniboard 0, tile index 16 (gx: 1, gy: 1)
        mockSuperboard.miniboards[0].tiles[16] = {
            contains: {
                id: 'pygmy_alpha',
                isPocketPygmy: true,
                hp: 10,
                maxHp: 10,
                isAllied: true
            },
            image: 'woodland_individual'
        };

        const entities = pageInstance.migrateTilesToEntityRegistry(mockSuperboard);
        expect(entities.pygmy_alpha).toBeDefined();
        expect(entities.pygmy_alpha.gx).toBe(1);
        expect(entities.pygmy_alpha.gy).toBe(1);
        expect(entities.pygmy_alpha.quadrant).toBe('NW');
        expect(entities.pygmy_alpha.isAllied).toBe(true);

        // Verify tile.contains is cleared from macro tile to eliminate duplicate rendering
        expect(mockSuperboard.miniboards[0].tiles[16].contains).toBeNull();
        expect(mockSuperboard.miniboards[0].tiles[16].image).toBeNull();
    });

    test('isPocketTileEmpty respects sub-tile capacity and impassable terrain', () => {
        const grassTile = { color: 'green', isVoid: false };
        const voidTile = { color: '#000000', isVoid: true };
        const treeTile = { contains: { type: 'tree' } };

        expect(pageInstance.isPocketTileEmpty(grassTile, 5, 5)).toBe(true);
        expect(pageInstance.isPocketTileEmpty(voidTile, 5, 5)).toBe(false);
        expect(pageInstance.isPocketTileEmpty(treeTile, 5, 5)).toBe(false);

        // Fill grass tile with 4 entities
        pageInstance.state.superboardEntities = {
            u1: { id: 'u1', gx: 5, gy: 5, quadrant: 'NW', hp: 10 },
            u2: { id: 'u2', gx: 5, gy: 5, quadrant: 'NE', hp: 10 },
            u3: { id: 'u3', gx: 5, gy: 5, quadrant: 'SW', hp: 10 },
            u4: { id: 'u4', gx: 5, gy: 5, quadrant: 'SE', hp: 10 }
        };

        expect(pageInstance.isPocketTileEmpty(grassTile, 5, 5)).toBe(false);
        // Excluded unit u1 can still path into its own tile
        expect(pageInstance.isPocketTileEmpty(grassTile, 5, 5, 'u1')).toBe(true);
    });

    test('movePocketPygmyUnit moves unit across sub-tiles and sets facing direction', () => {
        const mockSuperboard = {
            miniboards: Array.from({ length: 9 }, () => ({
                tiles: Array.from({ length: 225 }, () => ({ color: 'green', isVoid: false, contains: null }))
            }))
        };

        pageInstance.state.superboardEntities = {
            p1: {
                id: 'p1',
                gx: 10,
                gy: 10,
                quadrant: 'NW',
                facing: 'right',
                hp: 10,
                isPocketPygmy: true
            }
        };

        // Move unit from (10, 10) to (9, 10) [moving West]
        // gx 10, gy 10 -> mbIdx 0, tIdx: 10*15 + 10 = 160
        // gx 9, gy 10 -> mbIdx 0, tIdx: 10*15 + 9 = 159
        pageInstance.movePocketPygmyUnit(mockSuperboard, 0, 160, 0, 159, 10, 10, 9, 10);

        const movedUnit = pageInstance.state.superboardEntities.p1;
        expect(movedUnit.gx).toBe(9);
        expect(movedUnit.gy).toBe(10);
        expect(movedUnit.facing).toBe('left'); // Turned left moving West
        expect(movedUnit.quadrant).toBe('NW');

        // Move unit from (9, 10) to (11, 10) [moving East]
        pageInstance.movePocketPygmyUnit(mockSuperboard, 0, 159, 0, 161, 9, 10, 11, 10);
        expect(pageInstance.state.superboardEntities.p1.gx).toBe(11);
        expect(pageInstance.state.superboardEntities.p1.facing).toBe('right'); // Turned right moving East
    });

    test('migrateEntityRegistryToTiles correctly restores units to miniboards for serialization', () => {
        const mockSuperboard = {
            miniboards: Array.from({ length: 9 }, () => ({
                tiles: Array.from({ length: 225 }, () => ({ contains: null, image: null }))
            }))
        };

        pageInstance.state.superboardEntities = {
            saved_pygmy: {
                id: 'saved_pygmy',
                gx: 2,
                gy: 3,
                quadrant: 'SE',
                hp: 10,
                isPocketPygmy: true
            }
        };

        pageInstance.migrateEntityRegistryToTiles(mockSuperboard);

        // (gx: 2, gy: 3) in miniboards:
        // mbIdx = Math.floor(3/15)*3 + Math.floor(2/15) = 0
        // tIdx = 3 * 15 + 2 = 47
        const tile = mockSuperboard.miniboards[0].tiles[47];
        expect(tile.contains).toBeDefined();
        expect(tile.contains.id).toBe('saved_pygmy');
        expect(tile.image).toMatch(/woodland[_-]individual/);
    });

    test('movePlayerInSuperboard advances avatar in 0.5 sub-steps with fluid glide vector and playerFloatStyle', () => {
        const mockSuperboard = {
            miniboards: Array.from({ length: 9 }, () => ({
                tiles: Array.from({ length: 225 }, () => ({ color: 'green', isVoid: false, contains: null }))
            }))
        };
        pageInstance.state.dungeon = {
            superboards: {
                pocket_plains: mockSuperboard
            }
        };
        pageInstance.state.superboardPlayerPos = { gx: 7, gy: 7 };
        pageInstance.state.superboardViewMinX = 0;
        pageInstance.state.superboardViewMinY = 0;
        pageInstance.state.tileSize = 48;

        // Step 0.5 East
        pageInstance.movePlayerInSuperboard(0.5, 0);

        expect(pageInstance.state.superboardPlayerPos.gx).toBe(7.5);
        expect(pageInstance.state.superboardPlayerPos.gy).toBe(7);
        expect(pageInstance.state.isPlayerGliding).toBe(true);
        expect(pageInstance.state.playerGlideVector).toEqual({ x: -24, y: -0 });
        expect(pageInstance.state.playerFloatVisible).toBe(true);
        expect(pageInstance.state.playerFloatStyle.left).toBeCloseTo((7.5 + 0.05) * 48);

        // Step 0.5 South
        pageInstance.movePlayerInSuperboard(0, 0.5);
        expect(pageInstance.state.superboardPlayerPos.gx).toBe(7.5);
        expect(pageInstance.state.superboardPlayerPos.gy).toBe(7.5);
        expect(pageInstance.state.playerGlideVector).toEqual({ x: -0, y: -24 });
        expect(pageInstance.state.playerFloatStyle.top).toBeCloseTo((7.5 + 0.05) * 48);
    });

    test('getFloatingPlayerStyle calculates exact sub-tile pixel placement in Superboard', () => {
        pageInstance.state.inSuperboard = true;
        pageInstance.state.superboardPlayerPos = { gx: 10.5, gy: 8.5 };
        pageInstance.state.superboardViewMinX = 2;
        pageInstance.state.superboardViewMinY = 1;
        pageInstance.state.tileSize = 48;

        const floatStyle = pageInstance.getFloatingPlayerStyle([8.5, 10.5]);
        expect(floatStyle).not.toBeNull();
        // localX = 10.5 - 2 = 8.5, left = (8.5 + 0.05) * 48 = 410.4
        // localY = 8.5 - 1 = 7.5, top = (7.5 + 0.05) * 48 = 362.4
        expect(floatStyle.left).toBeCloseTo(410.4);
        expect(floatStyle.top).toBeCloseTo(362.4);
    });
});
