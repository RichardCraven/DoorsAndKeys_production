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
import { BoardManager } from '../../utils/board-manager';
import DungeonPage from '../DungeonPage';

// Mock session-handler
jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => ({ location: { levelId: 0, orientation: 'F', boardIndex: 0, tileIndex: 112 }, crew: [] })),
    storeMeta: jest.fn(),
    getUserId: jest.fn(() => 'test_user')
}));

describe('Teleporter / Portal - Suppressed Faction Ring & Passability', () => {
    describe('1. Neutral Color Circle Suppression on Teleporters / Portals', () => {
        test('does NOT render structure-faction-ring when tile contains dungeon_portal', () => {
            const { container } = render(
                <Tile
                    id={10}
                    color="white"
                    image="dungeon_portal"
                    contains={{ type: 'dungeon_portal', portalId: 'portal_1' }}
                />
            );
            expect(container.querySelector('.structure-faction-ring')).toBeNull();
        });

        test('does NOT render structure-faction-ring when tile has building="teleporter"', () => {
            const { container } = render(
                <Tile
                    id={11}
                    color="white"
                    building="teleporter"
                    contains={{ type: 'teleporter' }}
                />
            );
            expect(container.querySelector('.structure-faction-ring')).toBeNull();
        });

        test('does NOT render structure-faction-ring when tile contains string "dungeon portal"', () => {
            const { container } = render(
                <Tile
                    id={12}
                    color="white"
                    contains="dungeon portal"
                />
            );
            expect(container.querySelector('.structure-faction-ring')).toBeNull();
        });

        test('does NOT render structure-faction-ring when targetPortalId or portalId is set on tile props', () => {
            const { container } = render(
                <Tile
                    id={13}
                    color="white"
                    image="dungeon_portal"
                    portalId="portal_test"
                    targetPortalId="portal_target"
                />
            );
            expect(container.querySelector('.structure-faction-ring')).toBeNull();
        });

        test('STILL renders structure-faction-ring on legitimate neutral structures like outpost or generator', () => {
            const { container } = render(
                <Tile
                    id={20}
                    color="white"
                    building="outpost"
                    contains={{ type: 'building', subtype: 'outpost' }}
                />
            );
            expect(container.querySelector('.structure-faction-ring')).not.toBeNull();
        });
    });

    describe('2. BoardManager Passability for Teleporter / Portal Tiles', () => {
        let bm;
        beforeEach(() => {
            bm = new BoardManager();
            bm.currentLevel = { id: 0, front: { miniboards: [] }, back: { miniboards: [] } };
            bm.currentBoard = {
                id: 0,
                tiles: Array(225).fill(null).map((_, i) => ({
                    id: i,
                    type: 'empty_space',
                    contains: { type: 'empty_space' }
                }))
            };
            bm.tiles = Array(225).fill(null).map((_, i) => ({
                id: i,
                type: 'empty_space',
                contains: { type: 'empty_space' }
            }));
            bm.playerTile = {
                location: [15, 15],
                boardIndex: 0,
                levelId: 0
            };
        });

        test('isPortalTile correctly identifies various portal formats', () => {
            expect(bm.isPortalTile({ image: 'dungeon_portal' })).toBe(true);
            expect(bm.isPortalTile({ contains: { type: 'dungeon_portal' } })).toBe(true);
            expect(bm.isPortalTile({ contains: { subtype: 'teleporter' } })).toBe(true);
            expect(bm.isPortalTile({ portalId: 'p1' })).toBe(true);
            expect(bm.isPortalTile({ targetPortalId: 'p2' })).toBe(true);
            expect(bm.isPortalTile({ contains: 'portal' })).toBe(true);
            expect(bm.isPortalTile({ type: 'empty_space' })).toBe(false);
        });

        test('isVoidTile returns FALSE for teleporter tiles even if tile.type or boardTile.type is "void"', () => {
            const portalTile = {
                id: 16,
                type: 'void',
                image: 'dungeon_portal',
                contains: { type: 'dungeon_portal', portalId: 'portal_a' }
            };
            bm.currentBoard.tiles[16] = portalTile;
            expect(bm.isVoidTile(portalTile)).toBe(false);
        });

        test('isImpassableBuildingTile returns FALSE for teleporter tiles', () => {
            const portalTile = {
                id: 16,
                building: 'teleporter',
                contains: { type: 'building', subtype: 'teleporter' }
            };
            expect(bm.isImpassableBuildingTile(portalTile)).toBe(false);
        });

        test('player can step onto a teleporter tile without getting blocked by a wall', () => {
            const messages = [];
            bm.messaging = (msg) => messages.push(msg);

            // Place portal to the right of player (player at [15, 15], tile 0; destination [15, 16], tile 1)
            bm.tiles[1] = {
                id: 1,
                type: 'void', // Even if Mapmaker left type as 'void'
                image: 'dungeon_portal',
                contains: { type: 'dungeon_portal', portalId: 'p1' }
            };
            bm.currentBoard.tiles[1] = bm.tiles[1];

            // Move right
            bm.moveRight();

            // Player location should advance to [15, 16]
            expect(bm.playerTile.location).toEqual([15, 16]);
            // No "A wall blocks your way" should have been triggered
            expect(messages).not.toContain('A wall blocks your way.');
        });
    });

    describe('3. DungeonPage executePortalTeleport Auto-Pairing & Dormant Feedback', () => {
        let page;
        beforeEach(() => {
            page = new DungeonPage({
                boardManager: new BoardManager(),
                monsterManager: { getRandomMonsterByTier: jest.fn() }
            });
            page.messaging = jest.fn();
            page.setState = jest.fn((newState, cb) => {
                page.state = { ...(page.state || {}), ...newState };
                if (typeof cb === 'function') cb();
            });
            page.resolveQueuedMovement = jest.fn();
        });

        test('shows dormant feedback if teleporter has no target and no partner exists', () => {
            const bm = page.props.boardManager;
            bm.tiles = [
                { id: 0, image: 'dungeon_portal', contains: { type: 'dungeon_portal', portalId: 'lone_portal' } }
            ];
            bm.dungeon = { levels: [] };

            const portalTile = bm.tiles[0];
            page.executePortalTeleport(portalTile);

            expect(page.messaging).toHaveBeenCalledWith(expect.stringContaining('dormant and leads nowhere'));
            expect(page.state.toastMessage).toContain('dormant and leads nowhere');
            expect(page.resolveQueuedMovement).toHaveBeenCalledWith(true);
        });

        test('auto-discovers partner portal on current board when targetPortalId is unset', () => {
            const bm = page.props.boardManager;
            bm.initializeTilesFromMap = jest.fn();
            bm.currentLevel = { id: 0 };
            bm.currentOrientation = 'F';
            bm.playerTile = { boardIndex: 0, location: [15, 15] };
            bm.getIndexFromCoordinates = jest.fn(() => 0);

            // Portal 1 at idx 0, Portal 2 at idx 14
            bm.tiles = [
                { id: 0, coordinates: [0, 0], image: 'dungeon_portal', contains: { type: 'dungeon_portal', portalId: 'portal_a' } },
                { id: 14, coordinates: [14, 0], image: 'dungeon_portal', contains: { type: 'dungeon_portal', portalId: 'portal_b' } }
            ];
            bm.dungeon = {
                levels: [{
                    id: 0,
                    front: { miniboards: [{ id: 0, tiles: bm.tiles }] },
                    back: { miniboards: [] }
                }]
            };

            jest.useFakeTimers();
            page.executePortalTeleport(bm.tiles[0]);

            expect(page.messaging).toHaveBeenCalledWith(expect.stringContaining('Teleporting through portal'));
            
            // Advance past the 800ms portal transition timeout
            jest.advanceTimersByTime(1000);

            expect(bm.initializeTilesFromMap).toHaveBeenCalledWith(0, expect.any(Number));
            jest.useRealTimers();
        });
    });
});
