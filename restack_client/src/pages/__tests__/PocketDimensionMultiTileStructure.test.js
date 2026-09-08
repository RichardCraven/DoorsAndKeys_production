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
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tile, { propsAreEqual } from '../../components/tile';
import { BoardManager } from '../../utils/board-manager';
import { storeMeta } from '../../utils/session-handler';
import DungeonPage from '../DungeonPage';

describe('Pocket Dimension Multi-Tile (2x2) Structure Rendering and Sanitization', () => {
    describe('Tile component 2x2 rendering & faction ring suppression', () => {
        const createBoardTiles = (tiles = []) => {
            const arr = new Array(225).fill(null).map((_, idx) => ({
                id: idx,
                index: idx,
                color: '#6b6057',
                contains: { type: 'empty_space' }
            }));
            tiles.forEach(t => {
                if (t && typeof t.id === 'number') {
                    arr[t.id] = { ...arr[t.id], ...t };
                }
            });
            return arr;
        };

        test('Anchor tile of 2x2 Ore Mine renders multi-tile faction ring and anchor quadrant sprite slice', () => {
            const boardTiles = createBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 21, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 35, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 36, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }, image: 'ore_mine' }
            ]);

            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={true}
                    boardTiles={boardTiles}
                    contains={{ type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'anchor', vendorAnchorId: 20 }}
                    vendorCell="anchor"
                    vendorGroupId="mine_1"
                    vendorAnchorId={20}
                    image="ore_mine"
                />
            );

            // Anchor tile must render the faction ring
            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).not.toBeNull();
            // Expanded ring dimensions spanning 2x2 tiles
            expect(ring.style.right).toBe('-96%');
            expect(ring.style.bottom).toBe('-96%');

            // Portrait slice must be 200% 200% at position 0% 0%
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.backgroundSize).toBe('200% 200%');
            expect(portrait.style.backgroundPosition).toBe('0% 0%');
        });

        test('Single-tile Earthen Fort renders portrait in Superboard', () => {
            const boardTiles = createBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'earthen_fort', building: 'earthen_fort', name: 'Earthen Fort' }, building: 'earthen_fort' }
            ]);

            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={true}
                    boardTiles={boardTiles}
                    contains={{ type: 'building', subtype: 'earthen_fort', building: 'earthen_fort', name: 'Earthen Fort' }}
                    building="earthen_fort"
                />
            );

            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
        });

        test('Player-owned Cultivation Vat renders a blue structure ring in the dungeon', () => {
            const boardTiles = createBoardTiles([
                { id: 20, ownedByPlayer: true, contains: { type: 'building', subtype: 'cultivation_vat', building: 'cultivation_vat', name: 'Cultivation Vat' }, building: 'cultivation_vat' }
            ]);

            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={false}
                    ownedByPlayer={true}
                    boardTiles={boardTiles}
                    contains={{ type: 'building', subtype: 'cultivation_vat', building: 'cultivation_vat', name: 'Cultivation Vat', ownedByPlayer: true }}
                    building="cultivation_vat"
                />
            );

            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).not.toBeNull();
            expect(ring.style.borderColor).toBe('rgba(59, 130, 246, 0.9)');
        });

        test('Top-right quadrant renders slice 100% 0% and suppresses faction ring', () => {
            const boardTiles = createBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 21, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 35, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 36, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }, image: 'ore_mine' }
            ]);

            const { container } = render(
                <Tile
                    id={21}
                    index={21}
                    color="#6b6057"
                    inSuperboard={true}
                    boardTiles={boardTiles}
                    contains={{ type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'top_right', vendorAnchorId: 20 }}
                    vendorCell="top_right"
                    vendorGroupId="mine_1"
                    vendorAnchorId={20}
                    image="ore_mine"
                />
            );

            // Non-anchor tile must NOT render a faction ring
            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).toBeNull();

            // Portrait slice must be 200% 200% at position 100% 0%
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.backgroundSize).toBe('200% 200%');
            expect(portrait.style.backgroundPosition).toBe('100% 0%');
        });

        test('Bottom-left quadrant renders slice 0% 100% and suppresses faction ring', () => {
            const boardTiles = createBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 21, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 35, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 36, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }, image: 'ore_mine' }
            ]);

            const { container } = render(
                <Tile
                    id={35}
                    index={35}
                    color="#6b6057"
                    inSuperboard={true}
                    boardTiles={boardTiles}
                    contains={{ type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }}
                    vendorCell="bottom_left"
                    vendorGroupId="mine_1"
                    vendorAnchorId={20}
                    image="ore_mine"
                />
            );

            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).toBeNull();

            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.backgroundSize).toBe('200% 200%');
            expect(portrait.style.backgroundPosition).toBe('0% 100%');
        });

        test('Bottom-right quadrant renders slice 100% 100% and suppresses faction ring', () => {
            const boardTiles = createBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 21, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 35, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'ore_mine' },
                { id: 36, contains: { type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }, image: 'ore_mine' }
            ]);

            const { container } = render(
                <Tile
                    id={36}
                    index={36}
                    color="#6b6057"
                    inSuperboard={true}
                    boardTiles={boardTiles}
                    contains={{ type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }}
                    vendorCell="bottom_right"
                    vendorGroupId="mine_1"
                    vendorAnchorId={20}
                    image="ore_mine"
                />
            );

            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).toBeNull();

            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.backgroundSize).toBe('200% 200%');
            expect(portrait.style.backgroundPosition).toBe('100% 100%');
        });

        test('Superboard viewport collision: isAnchorSingle does not break 200% slicing or trigger duplicate rings when viewport index has a single-tile structure', () => {
            // Viewport tile 5 happens to be a domain_node or hut
            const boardTiles = createBoardTiles([
                { id: 5, contains: { type: 'building', subtype: 'domain_node' }, building: 'domain_node' }
            ]);

            // Tile rendered is bottom_right of a 2x2 ore_mine whose anchorId was 5 in the miniboard!
            const { container } = render(
                <Tile
                    id={40}
                    index={40}
                    color="#6b6057"
                    inSuperboard={true}
                    boardTiles={boardTiles}
                    contains={{ type: 'building', subtype: 'ore_mine', vendorGroupId: 'mine_1', vendorCell: 'bottom_right', vendorAnchorId: 5 }}
                    vendorCell="bottom_right"
                    vendorGroupId="mine_1"
                    vendorAnchorId={5}
                    image="ore_mine"
                />
            );

            // Ring must remain suppressed
            expect(container.querySelector('.structure-faction-ring')).toBeNull();

            // Background size must NOT fall back to 100% 100% (standalone)
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.backgroundSize).toBe('200% 200%');
            expect(portrait.style.backgroundPosition).toBe('100% 100%');
        });

        test('findNearbyStructureAnchor correctly deduces bottom_right role without confusing left neighbor', () => {
            // Anchor is at index 16 (row 1, col 1)
            // bottom_right is at index 32 (row 2, col 2). Offset: 32 - 16 = 16 (dRow: 1, dCol: 1)
            // Left neighbor is index 31 (bottom_left).
            const boardTiles = createBoardTiles([
                { id: 16, contains: { type: 'building', subtype: 'ore_mine', vendorCell: 'anchor' }, building: 'ore_mine', image: 'ore_mine' },
                { id: 17, contains: { type: 'building', subtype: 'ore_mine', vendorCell: 'top_right' }, building: 'ore_mine', image: 'ore_mine' },
                { id: 31, contains: { type: 'building', subtype: 'ore_mine', vendorCell: 'bottom_left' }, building: 'ore_mine', image: 'ore_mine' },
                { id: 32, contains: { type: 'building', subtype: 'ore_mine' }, building: 'ore_mine', image: 'ore_mine' }
            ]);

            const { container } = render(
                <Tile
                    id={32}
                    index={32}
                    color="#6b6057"
                    inSuperboard={false}
                    boardTiles={boardTiles}
                    contains={{ type: 'building', subtype: 'ore_mine' }}
                    building="ore_mine"
                    image="ore_mine"
                />
            );

            // Deduces bottom_right role, suppresses ring, and slices 100% 100%
            expect(container.querySelector('.structure-faction-ring')).toBeNull();
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.backgroundSize).toBe('200% 200%');
            expect(portrait.style.backgroundPosition).toBe('100% 100%');
        });

        test('Tile outside 2x2 footprint (e.g. tile next to top_right) does not render stray building fragments', () => {
            // Anchor is at index 16. top_right is at index 17 (vendorCell: 'top_right').
            // Neighbor tile 18 is an empty space next to top_right.
            const boardTiles = createBoardTiles([
                { id: 16, contains: { type: 'building', subtype: 'sawmill', vendorCell: 'anchor' }, building: 'sawmill', image: 'buildable_sawmill' },
                { id: 17, contains: { type: 'building', subtype: 'sawmill', vendorCell: 'top_right' }, building: 'sawmill', image: 'buildable_sawmill' },
                { id: 18, contains: { type: 'empty_space' } }
            ]);

            const { container } = render(
                <Tile
                    id={18}
                    index={18}
                    color="#6b6057"
                    inSuperboard={true}
                    boardTiles={boardTiles}
                    contains={{ type: 'empty_space' }}
                />
            );

            // Neighbor tile 18 must NOT render a building portrait
            const portrait = container.querySelector('.portrait');
            expect(portrait).toBeNull();
        });
    });

    describe('BoardManager.normalizeBoardTiles 2x2 structure healing', () => {
        let bm;

        beforeEach(() => {
            bm = new BoardManager();
        });

        test('heals unassigned 2x2 structure tiles into synchronized quadrants', () => {
            const tiles = new Array(225).fill(null).map((_, idx) => ({
                id: idx,
                contains: { type: 'empty_space' },
                color: '#6b6057'
            }));

            // Place un-normalized 2x2 ore_mine at index 16 (row 1, col 1)
            tiles[16] = { id: 16, contains: { type: 'building', subtype: 'ore_mine' }, building: 'ore_mine', color: '#6b6057' };
            tiles[17] = { id: 17, contains: { type: 'building', subtype: 'ore_mine' }, building: 'ore_mine', color: '#6b6057' };
            tiles[31] = { id: 31, contains: { type: 'building', subtype: 'ore_mine' }, building: 'ore_mine', color: '#6b6057' };
            tiles[32] = { id: 32, contains: { type: 'building', subtype: 'ore_mine' }, building: 'ore_mine', color: '#6b6057' };

            const board = { tiles };
            bm.normalizeBoardTiles(board);

            expect(board.tiles[16].contains.vendorCell).toBe('anchor');
            expect(board.tiles[16].contains.vendorAnchorId).toBe(16);

            expect(board.tiles[17].contains.vendorCell).toBe('top_right');
            expect(board.tiles[17].contains.vendorAnchorId).toBe(16);

            expect(board.tiles[31].contains.vendorCell).toBe('bottom_left');
            expect(board.tiles[31].contains.vendorAnchorId).toBe(16);

            expect(board.tiles[32].contains.vendorCell).toBe('bottom_right');
            expect(board.tiles[32].contains.vendorAnchorId).toBe(16);

            expect(board.tiles[16].contains.vendorGroupId).toBe(board.tiles[17].contains.vendorGroupId);
            expect(board.tiles[16].contains.vendorGroupId).toBe(board.tiles[31].contains.vendorGroupId);
            expect(board.tiles[16].contains.vendorGroupId).toBe(board.tiles[32].contains.vendorGroupId);
        });

        test('cleans up single-tile structures from having vendor cells', () => {
            const tiles = new Array(225).fill(null).map((_, idx) => ({
                id: idx,
                contains: { type: 'empty_space' },
                color: '#6b6057'
            }));

            tiles[10] = {
                id: 10,
                contains: { type: 'building', subtype: 'domain_node', vendorCell: 'anchor', vendorGroupId: 'g_1' },
                vendorCell: 'anchor',
                vendorGroupId: 'g_1'
            };

            const board = { tiles };
            bm.normalizeBoardTiles(board);

            expect(board.tiles[10].contains.vendorCell).toBeUndefined();
            expect(board.tiles[10].contains.vendorGroupId).toBeUndefined();
            expect(board.tiles[10].vendorCell).toBeUndefined();
        });
    });

    describe('DungeonPage.sanitizeSuperboardTiles 2x2 structure normalization', () => {
        let pageInstance;

        beforeEach(() => {
            pageInstance = new DungeonPage({});
        });

        test('heals and assigns vendor roles to 2x2 structures in 45x45 superboard grid', () => {
            // Create a 9-miniboard superboard
            const miniboards = [];
            for (let m = 0; m < 9; m++) {
                miniboards.push({
                    id: m,
                    tiles: new Array(225).fill(null).map((_, idx) => ({
                        id: idx,
                        contains: { type: 'empty_space' },
                        color: '#6b6057'
                    }))
                });
            }
            const sb = { miniboards };

            // Place a 2x2 ore_mine at gx: 5, gy: 5 (in miniboard 0, tIdx: 5*15 + 5 = 80)
            const placeTile = (gx, gy, subtype) => {
                const mbIdx = Math.floor(gy / 15) * 3 + Math.floor(gx / 15);
                const tIdx = (gy % 15) * 15 + (gx % 15);
                sb.miniboards[mbIdx].tiles[tIdx] = {
                    id: tIdx,
                    contains: { type: 'building', subtype },
                    building: subtype,
                    color: '#6b6057'
                };
            };

            placeTile(5, 5, 'ore_mine');
            placeTile(6, 5, 'ore_mine');
            placeTile(5, 6, 'ore_mine');
            placeTile(6, 6, 'ore_mine');

            const sanitized = pageInstance.sanitizeSuperboardTiles(sb);

            const getTile = (gx, gy) => {
                const mbIdx = Math.floor(gy / 15) * 3 + Math.floor(gx / 15);
                const tIdx = (gy % 15) * 15 + (gx % 15);
                return sanitized.miniboards[mbIdx].tiles[tIdx];
            };

            const t0 = getTile(5, 5);
            const t1 = getTile(6, 5);
            const t2 = getTile(5, 6);
            const t3 = getTile(6, 6);

            expect(t0.contains.vendorCell).toBe('anchor');
            expect(t1.contains.vendorCell).toBe('top_right');
            expect(t2.contains.vendorCell).toBe('bottom_left');
            expect(t3.contains.vendorCell).toBe('bottom_right');

            expect(t0.contains.vendorGroupId).toBe(t1.contains.vendorGroupId);
            expect(t0.contains.vendorGroupId).toBe(t2.contains.vendorGroupId);
            expect(t0.contains.vendorGroupId).toBe(t3.contains.vendorGroupId);
            expect(t1.contains.vendorAnchorId).toBe(t0.contains.vendorAnchorId);
            expect(t2.contains.vendorAnchorId).toBe(t0.contains.vendorAnchorId);
            expect(t3.contains.vendorAnchorId).toBe(t0.contains.vendorAnchorId);
        });
    });

    describe('DungeonPage.finishConstruction and Tile re-rendering for Earthen Fort', () => {
        test('finishConstruction sets image, building, and contains properties on superboard tile and triggers viewport update', () => {
            const pageInstance = new DungeonPage({});
            const miniboards = [];
            for (let m = 0; m < 9; m++) {
                miniboards.push({
                    id: m,
                    tiles: new Array(225).fill(null).map((_, idx) => ({
                        id: idx,
                        contains: { type: 'empty_space' },
                        color: '#6b6057'
                    }))
                });
            }
            const sb = { miniboards };

            pageInstance.state = {
                inSuperboard: true,
                superboardPlayerPos: { gx: 5, gy: 5 },
                superboardType: 'pocket_plains',
                dungeon: {
                    superboards: {
                        pocket_plains: sb
                    }
                }
            };
            pageInstance.setState = jest.fn((patch, cb) => {
                Object.assign(pageInstance.state, patch);
                if (cb) cb();
            });
            pageInstance.updateSuperboardViewport = jest.fn();

            pageInstance.finishConstruction({
                buildingDef: {
                    key: 'earthen_fort',
                    name: 'Earthen Fort',
                    imageKey: 'buildable_earthen_fort'
                },
                targetTileIdx: 80,
                superboardGx: 5,
                superboardGy: 5,
                superboardType: 'pocket_plains',
                footprint: [80]
            });

            const tile = sb.miniboards[0].tiles[80];
            expect(tile.building).toBe('earthen_fort');
            expect(tile.image).toBe('buildable_earthen_fort');
            expect(tile.contains).toBeDefined();
            expect(tile.contains.subtype).toBe('earthen_fort');
            expect(tile.contains.image).toBe('buildable_earthen_fort');
            expect(tile.contains.name).toBe('Earthen Fort');
            expect(tile.affiliation).toBe('friendly');
            expect(tile.placedBy).toBe('player');

            expect(pageInstance.setState).toHaveBeenCalledWith(
                expect.objectContaining({ activeConstruction: null }),
                expect.any(Function)
            );
            expect(pageInstance.updateSuperboardViewport).toHaveBeenCalled();
        });

        test('finishConstruction floors fractional coordinates (e.g. 7.5, 8.5) and ensures observer platform persists and grants vision', () => {
            const pageInstance = new DungeonPage({});
            const miniboards = [];
            for (let m = 0; m < 9; m++) {
                miniboards.push({
                    id: m,
                    tiles: new Array(225).fill(null).map((_, idx) => ({
                        id: idx,
                        contains: { type: 'empty_space' },
                        color: '#6b6057'
                    }))
                });
            }
            const sb = { miniboards };

            pageInstance.props = {
                boardManager: {
                    dungeon: {
                        superboards: {
                            pocket_plains: sb
                        }
                    },
                    playerTile: { location: [8, 7], boardIndex: 4 }
                }
            };
            pageInstance.state = {
                inSuperboard: true,
                superboardPlayerPos: { gx: 7.5, gy: 8.5 },
                superboardType: 'pocket_plains',
                superboardViewportOrigin: { vx: 0, vy: 0 },
                dungeon: pageInstance.props.boardManager.dungeon
            };
            pageInstance.setState = jest.fn((patch, cb) => {
                Object.assign(pageInstance.state, patch);
                if (cb) cb();
            });

            // Finish construction of observer platform with fractional coordinates (gx: 7.5, gy: 8.5)
            pageInstance.finishConstruction({
                buildingDef: {
                    key: 'observer_platform',
                    name: 'Observer Platform',
                    imageKey: 'observer_platform'
                },
                targetTileIdx: 127,
                superboardGx: 7.5,
                superboardGy: 8.5,
                superboardType: 'pocket_plains',
                footprint: [127]
            });

            // Target tile idx for (7, 8) in miniboard 0 is 8 * 15 + 7 = 127
            const integerTile = sb.miniboards[0].tiles[127];
            expect(integerTile.building).toBe('observer_platform');
            expect(integerTile.image).toBe('observer_platform');
            expect(integerTile.affiliation).toBe('friendly');
            expect(integerTile.placedBy).toBe('player');
            // Must not set float string property
            expect(Object.prototype.hasOwnProperty.call(sb.miniboards[0].tiles, '127.5')).toBe(false);

            // Now run updateSuperboardViewport and verify observer platform is scanned into cache and provides vision
            pageInstance.updateSuperboardViewport();
            expect(pageInstance.state.superboardObserverPlatforms).toBeDefined();
            expect(pageInstance.state.superboardObserverPlatforms.length).toBeGreaterThan(0);
            expect(pageInstance.state.superboardObserverPlatforms[0]).toEqual(
                expect.objectContaining({ gx: 7, gy: 8, isFriendly: true })
            );

            // Verify fog visibility at or around (7, 8) is true
            const vTileIdx = 8 * 15 + 7;
            expect(pageInstance.state.superboardFogVisibility[vTileIdx]).toBe(true);

            if (pageInstance._obsAnimInterval) {
                clearInterval(pageInstance._obsAnimInterval);
                pageInstance._obsAnimInterval = null;
            }
        });

        test('handleBuildBuilding floors fractional coordinates for footprint, constructionState, and under-construction tile', () => {
            const pageInstance = new DungeonPage({});
            const miniboards = [];
            for (let m = 0; m < 9; m++) {
                miniboards.push({
                    id: m,
                    tiles: new Array(225).fill(null).map((_, idx) => ({
                        id: idx,
                        contains: { type: 'empty_space' },
                        color: '#6b6057'
                    }))
                });
            }
            const sb = { miniboards };

            pageInstance.props = {
                boardManager: {
                    dungeon: {
                        superboards: {
                            pocket_plains: sb
                        }
                    },
                    playerTile: { location: [8, 7], boardIndex: 4 },
                    messaging: jest.fn()
                }
            };
            pageInstance.state = {
                inSuperboard: true,
                superboardPlayerPos: { gx: 7.5, gy: 8.5 },
                superboardType: 'pocket_plains',
                superboardViewportOrigin: { vx: 0, vy: 0 },
                dungeon: pageInstance.props.boardManager.dungeon,
                pocketResources: { wood: 100, ore: 100, slate: 100, dust: 100 }
            };
            pageInstance.getPocketResources = () => ({ wood: 100, ore: 100, slate: 100, dust: 100 });
            pageInstance.setState = jest.fn((patch, cb) => {
                Object.assign(pageInstance.state, patch);
                if (cb) cb();
            });

            pageInstance.handleBuildBuilding({
                key: 'observer_platform',
                name: 'Observer Platform',
                imageKey: 'observer_platform',
                buildTime: 5
            });

            expect(pageInstance.state.activeConstruction).toBeDefined();
            expect(pageInstance.state.activeConstruction.superboardGx).toBe(7);
            expect(pageInstance.state.activeConstruction.superboardGy).toBe(8);
            expect(pageInstance.state.activeConstruction.targetTileIdx).toBe(127);

            // Under construction tile must be at integer index 127
            const underConstTile = sb.miniboards[0].tiles[127];
            expect(underConstTile.building).toBe('observer_platform_under_construction');
            expect(underConstTile.affiliation).toBe('friendly');
            expect(Object.prototype.hasOwnProperty.call(sb.miniboards[0].tiles, '127.5')).toBe(false);
        });

        test('Tile.propsAreEqual invalidates memo when building or image changes', () => {
            const baseProps = {
                id: 80,
                index: 80,
                color: '#6b6057',
                tileSize: 48,
                inSuperboard: true
            };

            // Under construction vs finished building
            expect(propsAreEqual(
                { ...baseProps, building: 'earthen_fort_under_construction', image: 'buildable_earthen_fort' },
                { ...baseProps, building: 'earthen_fort', image: 'buildable_earthen_fort' }
            )).toBe(false);

            // Empty tile vs building finished
            expect(propsAreEqual(
                { ...baseProps, building: undefined, image: null },
                { ...baseProps, building: 'earthen_fort', image: 'buildable_earthen_fort' }
            )).toBe(false);

            // Same properties
            expect(propsAreEqual(
                { ...baseProps, building: 'earthen_fort', image: 'buildable_earthen_fort', contains: { type: 'building', subtype: 'earthen_fort' } },
                { ...baseProps, building: 'earthen_fort', image: 'buildable_earthen_fort', contains: { type: 'building', subtype: 'earthen_fort' } }
            )).toBe(true);
        });
    });

    describe('Walker Building & Engineer Detachment Mechanics', () => {
        test('getBuildingDefinitions includes walker with CONSTRUCT tag and zero resource cost', () => {
            const pageInstance = new DungeonPage({});
            const defs = pageInstance.getBuildingDefinitions();
            expect(defs.walker).toBeDefined();
            expect(defs.walker.key).toBe('walker');
            expect(defs.walker.name).toBe('Walker');
            expect(defs.walker.buildTime).toBe(30);
            expect(defs.walker.tag).toBe('CONSTRUCT');
            expect(defs.walker.costs.wood).toBe(0);
            expect(defs.walker.costs.ore).toBe(0);
            expect(defs.walker.costs.slate).toBe(0);
        });

        test('finishConstruction clears engineer detached flag and places walker tile', () => {
            const pageInstance = new DungeonPage({});
            const mockMessaging = jest.fn();
            const superboard = {
                miniboards: [
                    {
                        id: 0,
                        tiles: new Array(225).fill(null).map((_, i) => ({
                            id: i,
                            image: null,
                            contains: { type: 'empty_space' }
                        }))
                    }
                ]
            };

            pageInstance.state = {
                inSuperboard: true,
                superboardType: 'pocket_plains',
                dungeon: {
                    superboards: {
                        pocket_plains: superboard
                    }
                }
            };

            const engineer = { id: 'eng_1', name: 'Tinker', type: 'engineer', detached: true };
            const soldier = { id: 'sol_1', name: 'Warrior', type: 'soldier' };
            const crew = [engineer, soldier];

            pageInstance.props = {
                boardManager: {
                    messaging: mockMessaging,
                    dungeon: pageInstance.state.dungeon
                },
                crewManager: {
                    crew
                }
            };
            storeMeta({ crew });

            pageInstance.getGeneratorDef = () => ({
                key: 'walker',
                name: 'Walker',
                imageKey: 'walker',
                resource: 'defense',
                currencyType: 'defense',
                rate: 1
            });
            pageInstance.setState = jest.fn((patch, cb) => {
                Object.assign(pageInstance.state, patch);
                if (cb) cb();
            });
            pageInstance.updateSuperboardViewport = jest.fn();

            const constructionState = {
                buildingDef: {
                    key: 'walker',
                    name: 'Walker',
                    imageKey: 'walker',
                    fallbackImageKey: 'walker_turret_full'
                },
                detachedEngineerId: 'eng_1',
                targetTileIdx: 10,
                superboardGx: 10,
                superboardGy: 0,
                superboardType: 'pocket_plains',
                footprint: [10],
                actualBuildTimeSec: 30,
                livingContributorIds: ['eng_1']
            };

            pageInstance.finishConstruction(constructionState);

            // Engineer must no longer be detached
            expect(engineer.detached).toBe(false);

            // Messaging should confirm the Engineer has rejoined the crew
            expect(mockMessaging).toHaveBeenCalledWith(expect.stringContaining('The Engineer has rejoined the crew'));

            // The tile must have image: 'walker'
            const tile = superboard.miniboards[0].tiles[10];
            expect(tile.image).toBe('walker');
            expect(tile.building).toBe('walker');
            expect(tile.contains.subtype).toBe('walker');
            expect(tile.contains.image).toBe('walker');
        });

        test('cycleSelectedCrewMember skips detached crew members', () => {
            const pageInstance = new DungeonPage({});
            const engineer = { id: 'eng_1', type: 'engineer', detached: true, selected: false };
            const soldier = { id: 'sol_1', type: 'soldier', detached: false, selected: true };
            const scout = { id: 'sct_1', type: 'scout', detached: false, selected: false };
            const crew = [soldier, engineer, scout];

            pageInstance.props = {
                crewManager: { crew },
                saveUserData: jest.fn()
            };
            pageInstance.state = {
                selectedCrewMember: soldier
            };
            pageInstance.setState = jest.fn((patch) => {
                Object.assign(pageInstance.state, patch);
            });

            // Next member from soldier should be scout, skipping engineer!
            pageInstance.cycleSelectedCrewMember('next');

            expect(pageInstance.state.selectedCrewMember.id).toBe('sct_1');
            expect(scout.selected).toBe(true);
            expect(engineer.selected).toBe(false);
        });
    });

    describe('Pocket Dimension HUD Meters & Performance Optimization', () => {
        test('Dimension Stats section suppresses Influence and Free Will rows', () => {
            const pageInstance = new DungeonPage({});
            pageInstance.state = {
                inSuperboard: true,
                pocketFreeWill: 75,
                pocketInfluence: 120,
                collapsedSections: {}
            };
            pageInstance.getPocketDimensionStructureCounts = () => ({ war_camp: 0, war_fort: 0 });
            pageInstance.getPlayerInfluenceScore = () => 120;
            pageInstance.getPocketResources = () => ({ food: 10, slate: 5, ore: 20, wood: 15, dust: 2, mushrooms: 4, chemicals: 12 });

            const { container } = render(pageInstance.renderDimensionLimitsSection());
            expect(container.textContent).toContain('Dimension Stats');
            expect(container.textContent).toContain('War Camps:');
            expect(container.textContent).toContain('War Forts:');
            expect(container.textContent).toContain('Temporal Resources');
            // Influence and Free Will must no longer be in the panel!
            expect(container.textContent).not.toContain('Influence:');
            expect(container.textContent).not.toContain('Free Will:');
        });

        test('updateSuperboardViewport reuses cached platforms and squares when not dirty', () => {
            const pageInstance = new DungeonPage({});
            const miniboards = new Array(9).fill(null).map((_, i) => ({
                id: i,
                tiles: new Array(225).fill(null).map((_, tIdx) => ({
                    id: tIdx,
                    contains: null
                }))
            }));
            const superboard = { miniboards };
            pageInstance.props = {
                boardManager: {
                    dungeon: {
                        superboards: {
                            pocket_plains: superboard
                        }
                    },
                    playerTile: { location: [7, 7], boardIndex: 4 }
                }
            };
            pageInstance.state = {
                inSuperboard: true,
                superboardType: 'pocket_plains',
                superboardPlayerPos: { gx: 7, gy: 7 },
                superboardViewportOrigin: { vx: 0, vy: 0 },
                dungeon: pageInstance.props.boardManager.dungeon
            };

            const scanPlatformsSpy = jest.spyOn(pageInstance, 'getActiveSuperboardPerfectSquares');
            pageInstance.setState = jest.fn((patch, cb) => {
                Object.assign(pageInstance.state, patch);
                if (cb) cb();
            });

            // First run: structures dirty
            pageInstance.invalidateSuperboardStructureCache();
            pageInstance.updateSuperboardViewport();
            expect(scanPlatformsSpy).toHaveBeenCalledTimes(1);

            // Second run (e.g. player movement): structures NOT dirty, should reuse cache
            pageInstance.updateSuperboardViewport();
            expect(scanPlatformsSpy).toHaveBeenCalledTimes(1); // Not called again!

            // Invalidate cache: should recalculate
            pageInstance.invalidateSuperboardStructureCache();
            pageInstance.updateSuperboardViewport();
            expect(scanPlatformsSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('Pocket Dimension Enemy Outpost Projectiles & 10s Claiming', () => {
        let pageInstance;
        let outpostTile;
        let superboard;

        beforeEach(() => {
            pageInstance = new DungeonPage({});
            const miniboards = new Array(9).fill(null).map((_, i) => ({
                id: i,
                tiles: new Array(225).fill(null).map((_, tIdx) => ({
                    id: tIdx,
                    contains: null
                }))
            }));
            superboard = { miniboards };

            // Outpost at gx: 20, gy: 20 (mbIdx: 1 * 3 + 1 = 4, tIdx: 5 * 15 + 5 = 80)
            const mbIdx = 4;
            const tIdx = 5 * 15 + 5;
            outpostTile = {
                id: tIdx,
                building: 'outpost',
                image: 'buildable_outpost',
                affiliation: 'hostile',
                isHostile: true,
                generatorData: { owned: false, affiliation: 'hostile' },
                contains: {
                    type: 'building',
                    subtype: 'outpost',
                    affiliation: 'hostile',
                    isHostile: true
                }
            };
            miniboards[mbIdx].tiles[tIdx] = outpostTile;

            pageInstance.props = {
                boardManager: {
                    dungeon: {
                        superboards: {
                            pocket_plains: superboard
                        }
                    },
                    playerTile: { location: [7, 7], boardIndex: 4 }
                }
            };
            pageInstance.state = {
                inSuperboard: true,
                superboardType: 'pocket_plains',
                superboardPlayerPos: { gx: 22, gy: 20 }, // dist = 2 <= 6
                superboardViewMinX: 15,
                superboardViewMinY: 15,
                dungeon: pageInstance.props.boardManager.dungeon,
                pocketFreeWill: 50,
                tileSize: 40
            };
            pageInstance.setState = jest.fn((patch, cb) => {
                Object.assign(pageInstance.state, patch);
                if (cb) cb();
            });
            pageInstance.displayMessage = jest.fn();
            pageInstance.damagePlayerCrew = jest.fn();
            pageInstance.updateSuperboardViewport = jest.fn();
        });

        afterEach(() => {
            if (pageInstance._playerClaimInterval) {
                clearInterval(pageInstance._playerClaimInterval);
                pageInstance._playerClaimInterval = null;
            }
        });

        test('1. Hostile outpost shoots projectile at player avatar when within range <= 6', () => {
            const fireProjectileMock = jest.fn((startIdx, endIdx, onHit) => {
                if (onHit) onHit();
            });
            const fireCoordsMock = jest.fn((sx, sy, ex, ey, onHit) => {
                if (onHit) onHit();
            });

            pageInstance.projectileCanvasRef = {
                current: {
                    fireProjectile: fireProjectileMock,
                    fireProjectileCoords: fireCoordsMock
                }
            };

            pageInstance.tickOutpostAttacks();

            expect(fireProjectileMock.mock.calls.length + fireCoordsMock.mock.calls.length).toBeGreaterThan(0);
            expect(pageInstance.damagePlayerCrew).toHaveBeenCalled();
            expect(pageInstance.displayMessage).toHaveBeenCalledWith('⚠️ An enemy Outpost fired at your avatar!');
        });

        test('2. Claiming enemy outpost takes 10 seconds, sets convertingTarget, and finishes as friendly', () => {
            jest.useFakeTimers();

            pageInstance.startClaimingPocketOutpost(outpostTile);

            // Free will deducted
            expect(pageInstance.state.pocketFreeWill).toBe(45);

            // Outpost tile has convertingTarget
            expect(outpostTile.convertingTarget).toBeDefined();
            expect(outpostTile.convertingTarget.duration).toBe(10000);
            expect(outpostTile.convertingTarget.isPlayerClaim).toBe(true);

            // Advance 5 seconds - still converting
            jest.advanceTimersByTime(5000);
            expect(outpostTile.affiliation).toBe('hostile');
            expect(outpostTile.convertingTarget).toBeDefined();

            // Advance remaining 5 seconds
            jest.advanceTimersByTime(5100);

            // Outpost converted to friendly and owned by player
            expect(outpostTile.affiliation).toBe('friendly');
            expect(outpostTile.placedBy).toBe('player');
            expect(outpostTile.convertingTarget).toBeUndefined();
            expect(pageInstance.displayMessage).toHaveBeenCalledWith(expect.stringContaining('captured the enemy Outpost'));

            jest.useRealTimers();
        });

        test('3. Claiming enemy outpost is cancelled if player moves away', () => {
            jest.useFakeTimers();

            pageInstance.startClaimingPocketOutpost(outpostTile);
            expect(outpostTile.convertingTarget).toBeDefined();

            // Player moves far away
            pageInstance.state.superboardPlayerPos = { gx: 35, gy: 35 };

            jest.advanceTimersByTime(200);

            // Claim should be cancelled and convertingTarget removed
            expect(outpostTile.convertingTarget).toBeUndefined();
            expect(outpostTile.affiliation).toBe('hostile');
            expect(pageInstance.displayMessage).toHaveBeenCalledWith(expect.stringContaining('Claim cancelled'));

            jest.useRealTimers();
        });
    });

    describe('Pocket Dimension UI & Palette Adjustments', () => {
        test('1. Equipment section returns null in pocket dimension (inSuperboard = true)', () => {
            const pageInstance = new DungeonPage({});
            pageInstance.state = { inSuperboard: true };
            expect(pageInstance.renderEquipmentSection()).toBeNull();

            pageInstance.state = { inSuperboard: false };
            expect(pageInstance.renderEquipmentSection()).not.toBeNull();
        });

        test('2. resolveFloorTexture resolves string key concrete_floor_damaged_01 to actual asset URL', () => {
            const { resolveFloorTexture } = require('../dungonBuilderViews/BoardView');
            const resolved = resolveFloorTexture('concrete_floor_damaged_01');
            expect(resolved).toBeDefined();
            expect(resolved).not.toBe('concrete_floor_damaged_01');
            expect(typeof resolved).toBe('string');
        });

        test('3. Large 2x2 building icons in palette (isPaletteTile=true) scale to fit inside regular tile without 2x2 quadrant cropping', () => {
            const { container } = render(
                <Tile
                    id={1}
                    index={1}
                    isPaletteTile={true}
                    contains={{ type: 'building', subtype: 'cultivation_vat', building: 'cultivation_vat' }}
                    building="cultivation_vat"
                    image="cultivation_vat"
                />
            );
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.style.backgroundPosition).toBe('center');
        });

        test('4. Hardcoded tele console command outputs coordinate string and teleports to level:-2,orientation:back,board:1,x:2,y:6', () => {
            const pageInstance = new DungeonPage({});
            pageInstance._isMounted = true;
            pageInstance.setState = (updater) => {
                const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
                pageInstance.state = { ...pageInstance.state, ...patch };
            };
            pageInstance.teleportCrew = jest.fn();
            pageInstance.state = {
                devConsoleInput: 'tele',
                devConsoleOutput: [],
                devConsoleOpen: true,
                keysLocked: true
            };
            const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
            pageInstance.handleDevConsoleKeyDown(mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(pageInstance.teleportCrew).toHaveBeenCalledWith(expect.objectContaining({
                levelId: -2,
                orientation: 'back',
                boardIndex: 1,
                x: 2,
                y: 6
            }));
            expect(pageInstance.state.devConsoleOutput).toContain('tele level:-2,orientation:back,board:1,x:2,y:6');
            expect(pageInstance.state.devConsoleOpen).toBe(false);
        });

        test('5. Minimap indicator processing safely handles tiles with contains: null without throwing TypeError', () => {
            const pageInstance = new DungeonPage({});
            pageInstance._isMounted = true;
            pageInstance.state = {
                currentLevelId: 1,
                currentOrientation: 'front',
                superboardTiles: [],
                inSuperboard: true,
                minimap: []
            };

            const boardTiles = [
                { id: 106, contains: null, building: 'war_camp' }
            ];

            expect(() => {
                pageInstance.renderMinimapSection();
            }).not.toThrow();
        });

        test("6. Console command 'exit' triggers exitSuperboardPocketDimension when inside pocket dimension", () => {
            const pageInstance = new DungeonPage({});
            pageInstance._isMounted = true;
            pageInstance.setState = (updater) => {
                const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
                pageInstance.state = { ...pageInstance.state, ...patch };
            };
            pageInstance.exitSuperboardPocketDimension = jest.fn();
            pageInstance.state = {
                devConsoleOpen: true,
                devConsoleInput: 'exit',
                devConsoleOutput: [],
                inSuperboard: true,
                keysLocked: true
            };
            const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
            pageInstance.handleDevConsoleKeyDown(mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(pageInstance.exitSuperboardPocketDimension).toHaveBeenCalledWith('✨ Exited Pocket Dimension');
            expect(pageInstance.state.devConsoleOutput).toContain('Exited Pocket Dimension.');
            expect(pageInstance.state.devConsoleOpen).toBe(false);
        });

        test('7. All quadrants of 2x2 structure (Sawmill) are impassable in isSuperboardTilePassable', () => {
            const pageInstance = new DungeonPage({});
            pageInstance.props = { boardManager: new BoardManager() };

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

            const superboard = { miniboards };
            // Place 2x2 Sawmill at globalX=5, globalY=5 (all within miniboard 0)
            const anchorIdx = 5 * 15 + 5;
            superboard.miniboards[0].tiles[anchorIdx] = {
                id: anchorIdx,
                coordinates: [5, 5],
                contains: { type: 'building', subtype: 'sawmill', building: 'sawmill' },
                building: 'sawmill',
                color: 'rgba(15, 15, 20, 0.55)'
            };

            // Before or after sanitization, ALL 4 tiles of the 2x2 complex must be impassable
            expect(pageInstance.isSuperboardTilePassable(superboard, 5, 5)).toBe(false); // top-left (anchor)
            expect(pageInstance.isSuperboardTilePassable(superboard, 6, 5)).toBe(false); // top-right
            expect(pageInstance.isSuperboardTilePassable(superboard, 5, 6)).toBe(false); // bottom-left
            expect(pageInstance.isSuperboardTilePassable(superboard, 6, 6)).toBe(false); // bottom-right

            // Surrounding tile should still be passable
            expect(pageInstance.isSuperboardTilePassable(superboard, 4, 5)).toBe(true);
            expect(pageInstance.isSuperboardTilePassable(superboard, 7, 5)).toBe(true);
        });

        test('8. movePlayerInSuperboard blocks movement into non-anchor quadrant of 2x2 building and triggers openGeneratorModal with anchor tile', () => {
            const pageInstance = new DungeonPage({});
            const bm = new BoardManager();
            pageInstance.props = { boardManager: bm };
            pageInstance.openGeneratorModal = jest.fn();
            pageInstance.setState = (updater) => {
                const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
                pageInstance.state = { ...pageInstance.state, ...patch };
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

            const anchorIdx = 5 * 15 + 5;
            const anchorTile = {
                id: anchorIdx,
                coordinates: [5, 5],
                contains: { type: 'building', subtype: 'sawmill', building: 'sawmill' },
                building: 'sawmill',
                color: 'rgba(15, 15, 20, 0.55)'
            };
            miniboards[0].tiles[anchorIdx] = anchorTile;

            const superboard = { miniboards };
            pageInstance.state = {
                inSuperboard: true,
                superboardType: 'pocket_plains',
                superboardPlayerPos: { gx: 7, gy: 5 },
                superboardViewMinX: 0,
                superboardViewMinY: 0,
                dungeon: {
                    superboards: {
                        pocket_plains: superboard
                    }
                }
            };

            // Player attempts to step left from (7, 5) into (6, 5), which is top-right quadrant of Sawmill
            pageInstance.movePlayerInSuperboard(-1, 0);

            // Movement blocked, and openGeneratorModal called with anchor tile
            expect(pageInstance.openGeneratorModal).toHaveBeenCalled();
            const calledTile = pageInstance.openGeneratorModal.mock.calls[0][0];
            expect(calledTile.building || calledTile.contains?.building || calledTile.contains?.subtype).toContain('sawmill');
            expect(calledTile.globalX).toBe(5);
            expect(calledTile.globalY).toBe(5);
        });

        test('9. Pocket dimension floor tiles use semi-transparent overlay allowing background texture visibility', () => {
            const pageInstance = new DungeonPage({});
            const bm = new BoardManager();
            pageInstance.props = { boardManager: bm };
            pageInstance.setState = (updater) => {
                const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
                pageInstance.state = { ...pageInstance.state, ...patch };
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
                        color: '#6b6057' // legacy opaque color
                    });
                }
                miniboards.push({ id: mbIdx, tiles });
            }

            const dungeonObj = {
                superboards: {
                    pocket_plains: { miniboards, floorTexture: 'ground_grey' }
                }
            };
            bm.dungeon = dungeonObj;

            pageInstance.state = {
                inSuperboard: true,
                superboardType: 'pocket_plains',
                superboardPlayerPos: { gx: 5, gy: 5 },
                superboardViewMinX: 0,
                superboardViewMinY: 0,
                dungeon: dungeonObj
            };

            pageInstance.updateSuperboardViewport(0, 0);

            // Verify viewport tiles converted legacy #6b6057 to semi-transparent overlay rgba(15, 15, 20, 0.55)
            const vpTiles = pageInstance.state.tiles;
            expect(vpTiles).toBeDefined();
            expect(vpTiles.length).toBe(225);
            expect(vpTiles[0].color).toBe('rgba(15, 15, 20, 0.55)');
            expect(vpTiles[10].color).toBe('rgba(15, 15, 20, 0.55)');
        });

        test('10. BoardManager.normalizeBoardTiles normalizes all 4 tiles of 2x2 Dream Den structure and allows vendor interaction across all 4 tiles', () => {
            const bm = new BoardManager();
            const tiles = Array.from({ length: 225 }, (_, idx) => ({
                id: idx,
                type: 'board-tile',
                contains: null
            }));

            // Place Dream Den anchor on tile 32 (row 2, col 2)
            tiles[32].contains = { type: 'building', subtype: 'dream_den' };

            const board = { id: 1, tiles };
            const dungeon = {
                levels: [{
                    id: 1,
                    front: { miniboards: [board] }
                }]
            };

            bm.normalizeBoardTiles(board);

            // Check that all 4 tiles (32=anchor, 33=top_right, 47=bottom_left, 48=bottom_right) are normalized
            expect(board.tiles[32].contains.vendorCell).toBe('anchor');
            expect(board.tiles[33].contains.vendorCell).toBe('top_right');
            expect(board.tiles[47].contains.vendorCell).toBe('bottom_left');
            expect(board.tiles[48].contains.vendorCell).toBe('bottom_right');

            expect(board.tiles[33].contains.vendorAnchorId).toBe(32);
            expect(board.tiles[47].contains.vendorAnchorId).toBe(32);
            expect(board.tiles[48].contains.vendorAnchorId).toBe(32);

            expect(board.tiles[33].contains.subtype).toBe('dream_den');
            expect(board.tiles[47].contains.subtype).toBe('dream_den');
            expect(board.tiles[48].contains.subtype).toBe('dream_den');

            // Verify isImpassableBuildingTile returns false for vendor tiles (not treated as impassable walls)
            expect(bm.isImpassableBuildingTile(board.tiles[32])).toBe(false);
            expect(bm.isImpassableBuildingTile(board.tiles[33])).toBe(false);
            expect(bm.isImpassableBuildingTile(board.tiles[47])).toBe(false);
            expect(bm.isImpassableBuildingTile(board.tiles[48])).toBe(false);

            // Verify handleInteraction triggers triggerVendorEncounter on top_right, bottom_left, and bottom_right tiles
            bm.triggerVendorEncounter = jest.fn();
            const res33 = bm.handleInteraction(board.tiles[33]);
            expect(bm.triggerVendorEncounter).toHaveBeenCalledWith('dream_den', board.tiles[33]);
            expect(res33).toBe('vendor');

            bm.triggerVendorEncounter.mockClear();
            const res48 = bm.handleInteraction(board.tiles[48]);
            expect(bm.triggerVendorEncounter).toHaveBeenCalledWith('dream_den', board.tiles[48]);
            expect(res48).toBe('vendor');
        });
    });
});

