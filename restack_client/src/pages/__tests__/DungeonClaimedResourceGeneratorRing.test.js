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
import Tile from '../../components/tile';
import DungeonPage from '../DungeonPage';
import { storeMeta, getMeta } from '../../utils/session-handler';

describe('Dungeon Claimed Resource Generator Blue Ring', () => {
    const createDungeonBoardTiles = (overrides = []) => {
        const tiles = [];
        for (let i = 0; i < 225; i++) {
            tiles.push({
                id: i,
                index: i,
                type: 'board-tile',
                color: '#6b6057',
                contains: { type: 'empty_space', subtype: null }
            });
        }
        overrides.forEach(o => {
            tiles[o.id] = { ...tiles[o.id], ...o };
        });
        return tiles;
    };

    beforeEach(() => {
        try {
            storeMeta({});
        } catch (e) { }
    });

    describe('Tile component structure faction ring coloring for dungeon generators', () => {
        test('Unclaimed/neutral Dust Collector renders a neutral white ring on anchor tile', () => {
            const boardTiles = createDungeonBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'anchor' },
                { id: 21, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'top_right' },
                { id: 35, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'bottom_left' },
                { id: 36, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'bottom_right' }
            ]);

            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={false}
                    boardTiles={boardTiles}
                    contains={boardTiles[20].contains}
                    vendorCell="anchor"
                    vendorGroupId="dc_1"
                    vendorAnchorId={20}
                    image="dust_collector"
                />
            );

            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).not.toBeNull();
            expect(ring.style.borderColor).toBe('rgba(255, 255, 255, 0.85)');
        });

        test('Claimed Dust Collector with ownedByPlayer on anchor renders a blue ring', () => {
            const boardTiles = createDungeonBoardTiles([
                { id: 20, ownedByPlayer: true, generatorData: { activated: true, owned: true, ownedByPlayer: true }, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'anchor', vendorAnchorId: 20, ownedByPlayer: true }, image: 'dust_collector', vendorCell: 'anchor' },
                { id: 21, ownedByPlayer: true, generatorData: { activated: true, owned: true, ownedByPlayer: true }, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'top_right', vendorAnchorId: 20, ownedByPlayer: true }, image: 'dust_collector', vendorCell: 'top_right' },
                { id: 35, ownedByPlayer: true, generatorData: { activated: true, owned: true, ownedByPlayer: true }, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_left', vendorAnchorId: 20, ownedByPlayer: true }, image: 'dust_collector', vendorCell: 'bottom_left' },
                { id: 36, ownedByPlayer: true, generatorData: { activated: true, owned: true, ownedByPlayer: true }, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_right', vendorAnchorId: 20, ownedByPlayer: true }, image: 'dust_collector', vendorCell: 'bottom_right' }
            ]);

            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={false}
                    boardTiles={boardTiles}
                    generatorData={{ activated: true, owned: true, ownedByPlayer: true }}
                    ownedByPlayer={true}
                    contains={boardTiles[20].contains}
                    vendorCell="anchor"
                    vendorGroupId="dc_1"
                    vendorAnchorId={20}
                    image="dust_collector"
                />
            );

            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).not.toBeNull();
            expect(ring.style.borderColor).toBe('rgba(59, 130, 246, 0.9)');
        });

        test('Claimed Dust Collector where only secondary quadrant (id 36) has generatorData still renders blue ring on anchor tile', () => {
            const boardTiles = createDungeonBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'anchor' },
                { id: 21, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'top_right' },
                { id: 35, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'bottom_left' },
                { id: 36, ownedByPlayer: true, generatorData: { activated: true, owned: true, ownedByPlayer: true }, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_right', vendorAnchorId: 20, ownedByPlayer: true }, image: 'dust_collector', vendorCell: 'bottom_right' }
            ]);

            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={false}
                    boardTiles={boardTiles}
                    contains={boardTiles[20].contains}
                    vendorCell="anchor"
                    vendorGroupId="dc_1"
                    vendorAnchorId={20}
                    image="dust_collector"
                />
            );

            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).not.toBeNull();
            expect(ring.style.borderColor).toBe('rgba(59, 130, 246, 0.9)');
        });

        test('Claimed Sawmill saved in metadata activatedGenerators renders blue ring on anchor tile', () => {
            const meta = getMeta() || {};
            meta.activatedGenerators = {
                '0_0_20': { activated: true, owned: true, ownedByPlayer: true, key: 'sawmill' }
            };
            storeMeta(meta);

            const boardTiles = createDungeonBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'sawmill', vendorGroupId: 'saw_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'sawmill', vendorCell: 'anchor' },
                { id: 21, contains: { type: 'building', subtype: 'sawmill', vendorGroupId: 'saw_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'sawmill', vendorCell: 'top_right' },
                { id: 35, contains: { type: 'building', subtype: 'sawmill', vendorGroupId: 'saw_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'sawmill', vendorCell: 'bottom_left' },
                { id: 36, contains: { type: 'building', subtype: 'sawmill', vendorGroupId: 'saw_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }, image: 'sawmill', vendorCell: 'bottom_right' }
            ]);

            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={false}
                    boardTiles={boardTiles}
                    contains={boardTiles[20].contains}
                    vendorCell="anchor"
                    vendorGroupId="saw_1"
                    vendorAnchorId={20}
                    image="sawmill"
                />
            );

            const ring = container.querySelector('.structure-faction-ring');
            expect(ring).not.toBeNull();
            expect(ring.style.borderColor).toBe('rgba(59, 130, 246, 0.9)');
        });
    });

    describe('DungeonPage generator activation and getLocalTiles synchronization', () => {
        test('handleActivateGenerator updates all 4 quadrants of a 2x2 generator and saves metadata for all of them', () => {
            const boardTiles = createDungeonBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'anchor' },
                { id: 21, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'top_right' },
                { id: 35, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'bottom_left' },
                { id: 36, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'bottom_right' }
            ]);

            const mockBm = {
                tiles: [...boardTiles],
                currentBoard: { id: 0, tiles: [...boardTiles] },
                currentLevel: { id: 0 },
                playerTile: { boardIndex: 0, location: [7, 7] },
                currentOrientation: 'F',
                dungeon: {
                    levels: [
                        {
                            id: 0,
                            front: {
                                miniboards: [
                                    { tiles: [...boardTiles] }
                                ]
                            }
                        }
                    ]
                },
                getCoordinatesFromIndex: (idx) => [idx % 15, Math.floor(idx / 15)]
            };

            const page = new DungeonPage({
                boardManager: mockBm,
                crewManager: { crew: [] },
                inventoryManager: { inventory: [] },
                saveUserData: jest.fn()
            });
            page.props = {
                boardManager: mockBm,
                saveUserData: jest.fn()
            };

            // Player clicked on bottom_right quadrant (id 36)
            page.state = {
                tiles: [...boardTiles],
                activeGeneratorTile: boardTiles[36],
                showGeneratorModal: true,
                inSuperboard: false,
                isInPocketDimension: false
            };
            page.displayMessage = jest.fn();
            page.closeGeneratorModal = jest.fn();

            page.handleActivateGenerator();

            // All 4 tiles in bm.tiles should now be activated and ownedByPlayer = true
            [20, 21, 35, 36].forEach(mId => {
                expect(mockBm.tiles[mId].generatorData).toBeDefined();
                expect(mockBm.tiles[mId].generatorData.activated).toBe(true);
                expect(mockBm.tiles[mId].ownedByPlayer).toBe(true);
            });

            // Metadata should contain activation entries for all member tiles
            const meta = getMeta() || {};
            expect(meta.activatedGenerators).toBeDefined();
            expect(meta.activatedGenerators['0_0_20']).toBeDefined();
            expect(meta.activatedGenerators['0_0_36']).toBeDefined();
        });

        test('getLocalTiles propagates activated generator to all quadrants when only 1 quadrant was restored from meta', () => {
            const page = new DungeonPage({
                crewManager: { crew: [] },
                inventoryManager: { inventory: [] }
            });
            page.props = {
                boardManager: {
                    currentLevel: { id: 0 },
                    currentBoard: { id: 0 },
                    getCoordinatesFromIndex: (idx) => [idx % 15, Math.floor(idx / 15)]
                }
            };

            const meta = getMeta() || {};
            // Only quadrant 36 is stored in meta
            meta.activatedGenerators = {
                '0_0_36': { activated: true, owned: true, ownedByPlayer: true, key: 'dust_collector' }
            };
            storeMeta(meta);

            const boardTiles = createDungeonBoardTiles([
                { id: 20, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'anchor', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'anchor' },
                { id: 21, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'top_right', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'top_right' },
                { id: 35, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_left', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'bottom_left' },
                { id: 36, contains: { type: 'building', subtype: 'dust_collector', vendorGroupId: 'dc_1', vendorCell: 'bottom_right', vendorAnchorId: 20 }, image: 'dust_collector', vendorCell: 'bottom_right' }
            ]);

            const localizedTiles = page.getLocalTiles(boardTiles);

            // Anchor (id 20) should also have generatorData and ownedByPlayer = true
            expect(localizedTiles[20].generatorData).toBeDefined();
            expect(localizedTiles[20].generatorData.activated).toBe(true);
            expect(localizedTiles[20].ownedByPlayer).toBe(true);

            // Quadrant 36 should also have generatorData and ownedByPlayer = true
            expect(localizedTiles[36].generatorData).toBeDefined();
            expect(localizedTiles[36].generatorData.activated).toBe(true);
            expect(localizedTiles[36].ownedByPlayer).toBe(true);
        });
    });
});
