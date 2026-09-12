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

describe('Pocket Dimension Void vs Empty Space Tile Classification', () => {
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
                
                let tileObj;
                if (gx === 0 && gy === 0) {
                    tileObj = {
                        id: t,
                        globalX: gx,
                        globalY: gy,
                        type: 'void',
                        contains: { type: 'void', subtype: null },
                        isVoid: true,
                        color: 'black'
                    };
                } else if (gx === 7 && gy === 9) {
                    tileObj = {
                        id: t,
                        globalX: gx,
                        globalY: gy,
                        type: 'void',
                        contains: { type: 'void', subtype: null },
                        isVoid: true,
                        color: 'black'
                    };
                } else {
                    tileObj = {
                        id: t,
                        globalX: gx,
                        globalY: gy,
                        type: 'board-tile',
                        coordinates: [t % 15, Math.floor(t / 15)],
                        contains: { type: 'empty_space', subtype: null },
                        color: null,
                        terrain: undefined
                    };
                }
                tiles.push(tileObj);
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
                isVoidTile: (t) => t?.isVoid === true || t?.contains?.type === 'void' || t?.type === 'void',
                hasSolidBorder: () => false,
                dungeon: {
                    superboards: {
                        pocket_plains: superboard
                    }
                }
            },
            crewManager: { crew: [] },
            user: { _id: 'test-user' }
        };

        pageInstance = new DungeonPage(props);
        pageInstance.state = {
            ...pageInstance.state,
            inSuperboard: true,
            isInPocketDimension: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 7, gy: 7 },
            superboardViewportOrigin: { vx: 0, vy: 0 },
            superboardViewMinX: 0,
            superboardViewMinY: 0,
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
    });

    test('updateSuperboardViewport correctly classifies empty space tiles as non-void and void tiles as void', () => {
        pageInstance.updateSuperboardViewport();
        const tiles = pageInstance.state.tiles;
        expect(Array.isArray(tiles)).toBe(true);
        expect(tiles.length).toBe(225);

        // Tile (0, 0) was marked void
        const voidTile = tiles.find(t => t.globalX === 0 && t.globalY === 0);
        expect(voidTile).toBeDefined();
        expect(voidTile.isVoid).toBe(true);
        expect(voidTile.contains?.type).toBe('void');
        expect(voidTile.color).toBe('black');

        // Tile (7, 7) is player pos, empty_space
        const emptyTile = tiles.find(t => t.globalX === 7 && t.globalY === 7);
        expect(emptyTile).toBeDefined();
        expect(emptyTile.isVoid).toBe(false);
        expect(emptyTile.contains?.type).toBe('empty_space');
        expect(emptyTile.color).toBe('rgba(15, 15, 20, 0.55)');

        // Tile (7, 8) is empty_space
        const emptyTile2 = tiles.find(t => t.globalX === 7 && t.globalY === 8);
        expect(emptyTile2).toBeDefined();
        expect(emptyTile2.isVoid).toBe(false);
        expect(emptyTile2.contains?.type).toBe('empty_space');
        expect(emptyTile2.color).toBe('rgba(15, 15, 20, 0.55)');

        // Tile (7, 9) was marked void
        const voidTile2 = tiles.find(t => t.globalX === 7 && t.globalY === 9);
        expect(voidTile2).toBeDefined();
        expect(voidTile2.isVoid).toBe(true);
        expect(voidTile2.contains?.type).toBe('void');
        expect(voidTile2.color).toBe('black');
    });

    test('movePlayerInSuperboard allows movement to empty space tiles and blocks movement into void tiles', () => {
        // Player starts at (7, 7)
        expect(pageInstance.state.superboardPlayerPos).toEqual({ gx: 7, gy: 7 });

        // Move to (7, 8) which is empty_space -> should succeed
        pageInstance.movePlayerInSuperboard(0, 1);
        expect(pageInstance.state.superboardPlayerPos).toEqual({ gx: 7, gy: 8 });

        // Move to (7, 9) which is void -> should be blocked!
        pageInstance.movePlayerInSuperboard(0, 1);
        expect(pageInstance.state.superboardPlayerPos).toEqual({ gx: 7, gy: 8 }); // Remains at 8
    });
});
