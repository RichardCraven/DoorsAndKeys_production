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

import { BoardManager } from '../../utils/board-manager';
import DungeonPage from '../DungeonPage';

describe('Dream Den Avatar Placement and Inner Building Interaction Prevention', () => {
    describe('Dream Den Impassability and Spawn Safety', () => {
        test('isImpassableBuildingTile returns true for dream_den', () => {
            const bm = new BoardManager();
            const dreamDenTile = {
                id: 112,
                contains: { type: 'vendor', subtype: 'dream_den' },
                building: 'dream_den'
            };
            expect(bm.isImpassableBuildingTile(dreamDenTile)).toBe(true);
        });

        test('initializeTilesFromMap relocates player if target tile is a Dream Den', () => {
            const bm = new BoardManager();
            const tiles = Array.from({ length: 225 }, (_, idx) => ({
                id: idx,
                type: 'board-tile',
                contains: { type: 'empty_space' }
            }));

            // Dream Den at center tile 112 (row 7, col 7)
            tiles[112] = {
                id: 112,
                type: 'board-tile',
                contains: { type: 'vendor', subtype: 'dream_den' }
            };

            const miniboard = { id: 0, tiles };
            bm.currentLevel = {
                id: 1,
                front: { miniboards: [miniboard] }
            };
            bm.currentOrientation = 'F';

            // Attempt to spawn on tile 112 (where the Dream Den is)
            bm.initializeTilesFromMap(0, 112);

            // Player tile must NOT be tile 112! It must be an adjacent passable tile
            const spawnedIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
            expect(spawnedIdx).not.toBe(112);
            // Location has a 15-offset per BoardManager convention: [15 + row, 15 + col]
            const [pRow, pCol] = [bm.playerTile.location[0] - 15, bm.playerTile.location[1] - 15];
            const dist = Math.abs(pRow - 7) + Math.abs(pCol - 7);
            expect(dist).toBe(1);
        });

        test('enterSuperboardPocketDimension sets savedDreamDenOrigin to an adjacent tile outside Dream Den', () => {
            jest.useFakeTimers();
            const pageInstance = new DungeonPage({});
            const bm = new BoardManager();
            pageInstance.props = { boardManager: bm };
            pageInstance.setState = (updater, cb) => {
                const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
                pageInstance.state = { ...pageInstance.state, ...patch };
                if (typeof cb === 'function') cb();
            };

            const tiles = Array.from({ length: 225 }, (_, idx) => ({
                id: idx,
                type: 'board-tile',
                contains: { type: 'empty_space' }
            }));
            // Dream Den at 112
            tiles[112] = {
                id: 112,
                type: 'board-tile',
                contains: { type: 'vendor', subtype: 'dream_den' }
            };

            bm.tiles = tiles;
            bm.currentLevel = { id: 1, front: { miniboards: [{ id: 0, tiles }] } };
            bm.currentOrientation = 'F';
            // playerTile location has 15-offset: [15+7, 15+7] = [22, 22]
            bm.playerTile = { location: [22, 22], boardIndex: 0 };

            const dungeonObj = {
                superboards: {
                    pocket_plains: {
                        miniboards: [{ tiles: Array.from({ length: 225 }, (_, i) => ({ id: i, contains: { type: 'empty_space' } })) }]
                    }
                }
            };
            bm.dungeon = dungeonObj;
            pageInstance.state = {
                dungeon: dungeonObj
            };

            pageInstance.enterSuperboardPocketDimension('pocket_plains');
            jest.advanceTimersByTime(700);
            jest.useRealTimers();

            // The origin must NOT be tile 112
            expect(pageInstance.state.savedDreamDenOrigin).toBeDefined();
            expect(pageInstance.state.savedDreamDenOrigin.tileIndex).not.toBe(112);
            expect(pageInstance.state.savedDreamDenOrigin.tileId).not.toBe(112);
        });
    });

    describe('Pocket Dimension Inner Building Interaction & Exit Prevention', () => {
        let pageInstance;
        let superboard;
        let bm;

        beforeEach(() => {
            pageInstance = new DungeonPage({});
            bm = new BoardManager();
            pageInstance.props = { boardManager: bm };
            pageInstance.setState = (updater, cb) => {
                const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
                pageInstance.state = { ...pageInstance.state, ...patch };
                if (typeof cb === 'function') cb();
            };

            const miniboards = [];
            for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
                const tiles = [];
                for (let tIdx = 0; tIdx < 225; tIdx++) {
                    tiles.push({
                        type: 'board-tile',
                        id: tIdx,
                        coordinates: [tIdx % 15, Math.floor(tIdx / 15)],
                        contains: { type: 'empty_space' },
                        color: 'rgba(15, 15, 20, 0.55)'
                    });
                }
                miniboards.push({ id: mbIdx, tiles });
            }

            // 2x2 Sawmill at (10, 10) -> (10, 10), (11, 10), (10, 11), (11, 11)
            const anchorIdx = 10 * 15 + 10;
            const anchorTile = {
                id: anchorIdx,
                coordinates: [10, 10],
                contains: { type: 'building', subtype: 'sawmill', building: 'sawmill', vendorCell: 'anchor', vendorGroupId: 'sawmill_1' },
                building: 'sawmill',
                color: 'rgba(15, 15, 20, 0.55)'
            };
            miniboards[0].tiles[anchorIdx] = anchorTile;
            miniboards[0].tiles[anchorIdx + 1] = {
                id: anchorIdx + 1,
                coordinates: [11, 10],
                contains: { type: 'building', subtype: 'sawmill', building: 'sawmill', vendorCell: 'top_right', vendorGroupId: 'sawmill_1', vendorAnchorId: anchorIdx },
                building: 'sawmill',
                color: 'rgba(15, 15, 20, 0.55)'
            };
            miniboards[0].tiles[anchorIdx + 15] = {
                id: anchorIdx + 15,
                coordinates: [10, 11],
                contains: { type: 'building', subtype: 'sawmill', building: 'sawmill', vendorCell: 'bottom_left', vendorGroupId: 'sawmill_1', vendorAnchorId: anchorIdx },
                building: 'sawmill',
                color: 'rgba(15, 15, 20, 0.55)'
            };
            miniboards[0].tiles[anchorIdx + 16] = {
                id: anchorIdx + 16,
                coordinates: [11, 11],
                contains: { type: 'building', subtype: 'sawmill', building: 'sawmill', vendorCell: 'bottom_right', vendorGroupId: 'sawmill_1', vendorAnchorId: anchorIdx },
                building: 'sawmill',
                color: 'rgba(15, 15, 20, 0.55)'
            };

            superboard = { miniboards };
            const dungeonObj = {
                superboards: {
                    pocket_plains: superboard
                }
            };
            bm.dungeon = dungeonObj;
            pageInstance.state = {
                inSuperboard: true,
                superboardType: 'pocket_plains',
                superboardPlayerPos: { gx: 10, gy: 10 },
                superboardViewMinX: 0,
                superboardViewMinY: 0,
                dungeon: dungeonObj
            };
        });

        test('finishConstruction nudges player to adjacent tile if player is inside building footprint', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 };
            const constructionState = {
                buildingDef: { key: 'sawmill', name: 'Sawmill', isMultiTile: true },
                superboardGx: 10,
                superboardGy: 10,
                targetTileIdx: 10 * 15 + 10,
                superboardType: 'pocket_plains',
                footprint: [10 * 15 + 10, 10 * 15 + 11, 11 * 15 + 10, 11 * 15 + 11],
                isLargeBuilding: true
            };

            pageInstance.finishConstruction(constructionState);

            // Player position should no longer be inside [10..12) x [10..12)
            const newPos = pageInstance.state.superboardPlayerPos;
            const isInside = newPos.gx >= 10 && newPos.gx < 12 && newPos.gy >= 10 && newPos.gy < 12;
            expect(isInside).toBe(false);
            // Must be adjacent (distance <= 1 from border)
            expect(Math.min(Math.abs(newPos.gx - 10), Math.abs(newPos.gx - 11))).toBeLessThanOrEqual(1);
            expect(Math.min(Math.abs(newPos.gy - 10), Math.abs(newPos.gy - 11))).toBeLessThanOrEqual(1);
        });

        test('openGeneratorModal does not open if player is on an inner tile of the building', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 }; // on the anchor tile
            const targetTile = {
                globalX: 10,
                globalY: 10,
                building: 'sawmill',
                contains: { type: 'building', subtype: 'sawmill' }
            };

            pageInstance.state.showGeneratorModal = false;
            pageInstance.openGeneratorModal(targetTile);

            expect(pageInstance.state.showGeneratorModal).toBe(false);
        });

        test('openGeneratorModal DOES open if player is on an adjacent tile outside the footprint', () => {
            pageInstance.state.superboardPlayerPos = { gx: 9, gy: 10 }; // adjacent left of anchor (outside)
            const targetTile = {
                globalX: 10,
                globalY: 10,
                building: 'sawmill',
                contains: { type: 'building', subtype: 'sawmill' }
            };

            pageInstance.openGeneratorModal(targetTile);

            expect(pageInstance.state.showGeneratorModal).toBe(true);
            expect(pageInstance.state.activeGeneratorTile?.building || pageInstance.state.activeGeneratorTile?.contains?.subtype).toBe('sawmill');
        });

        test('movePlayerInSuperboard allows moving out when player is inside building footprint without triggering openGeneratorModal', () => {
            pageInstance.openGeneratorModal = jest.fn();
            // Player starts inside 2x2 building footprint at (10.0, 10.0)
            pageInstance.state.superboardPlayerPos = { gx: 10.0, gy: 10.0 };

            // Moving right by micro-step 0.5 (still within building at 10.5)
            const moveResult = pageInstance.movePlayerInSuperboard(0.5, 0);

            // Movement should NOT be blocked and openGeneratorModal should NOT be triggered
            expect(pageInstance.openGeneratorModal).not.toHaveBeenCalled();
            expect(moveResult).toBe(true);
            expect(pageInstance.state.superboardPlayerPos.gx).toBe(10.5);
        });
    });
});
