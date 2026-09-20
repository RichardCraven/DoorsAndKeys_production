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
  CModal: () => null,
  CModalHeader: () => null,
  CModalTitle: () => null,
  CModalBody: () => null,
  CModalFooter: () => null
}));

let mockMeta = { pocketFreeWill: 50 };
jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => mockMeta),
    storeMeta: jest.fn((newMeta) => { mockMeta = { ...newMeta }; }),
    getUserId: jest.fn(() => 'player_1')
}));

import React from 'react';
import { render } from '@testing-library/react';
import { MapMaker } from '../../utils/map-maker';
import * as images from '../../utils/images';
import MapmakerPage from '../MapmakerPage';
import DungeonPage from '../DungeonPage';
import { BoardManager } from '../../utils/board-manager';
import Tile from '../../components/tile';

describe('Healing Circle Pocket Dimension Palette & Mechanic', () => {
    let originalComponentDidMount;

    beforeAll(() => {
        originalComponentDidMount = DungeonPage.prototype.componentDidMount;
        DungeonPage.prototype.componentDidMount = jest.fn();
    });

    afterAll(() => {
        DungeonPage.prototype.componentDidMount = originalComponentDidMount;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Mapmaker palette includes Healing Circle as a 2x2 multi-tile option and PNG icon assets exist', () => {
        const mapMaker = new MapMaker();
        const healingOptionIdx = mapMaker.pocketBuildingOptions.findIndex(o => o.key === 'healing_circle');
        expect(healingOptionIdx).toBeGreaterThan(-1);

        const option = mapMaker.pocketBuildingOptions[healingOptionIdx];
        expect(option.name).toBe('Healing Circle');
        expect(option.isMultiTile).toBe(true);
        expect(option.isLarge).toBe(true);

        // Assets verification
        expect(images.healing_circle).toBeDefined();
        expect(images.healing_circle_base).toBeDefined();
        expect(images.healing_circle_shard_1).toBeDefined();
        expect(images.healing_circle_shard_2).toBeDefined();
        expect(images.healing_circle_shard_3).toBeDefined();
        expect(images.healing_circle_shard_4).toBeDefined();
        expect(images.healing_circle_shard_5).toBeDefined();

        const mapmakerPage = new MapmakerPage({ mapMaker });
        const footprint = mapmakerPage.getFootprintTypeForPinnedOption({
            type: 'pocket-building-tile',
            id: healingOptionIdx
        });
        expect(footprint).toBe('2x2');
    });

    test('Healing Circle 2x2 multi-tile footprint is passable in BoardManager and DungeonPage', () => {
        const bm = new BoardManager();
        const hcAnchor = {
            id: 10,
            building: 'healing_circle',
            contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'anchor', vendorGroupId: 'hc_1' }
        };
        const hcTopRight = {
            id: 11,
            building: 'healing_circle',
            contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'top_right', vendorGroupId: 'hc_1' }
        };
        const hcBottomLeft = {
            id: 25,
            building: 'healing_circle',
            contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'bottom_left', vendorGroupId: 'hc_1' }
        };
        const hcBottomRight = {
            id: 26,
            building: 'healing_circle',
            contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'bottom_right', vendorGroupId: 'hc_1' }
        };

        // All 4 cells of the 2x2 footprint must be passable
        expect(bm.isImpassableBuildingTile(hcAnchor)).toBe(false);
        expect(bm.isImpassableBuildingTile(hcTopRight)).toBe(false);
        expect(bm.isImpassableBuildingTile(hcBottomLeft)).toBe(false);
        expect(bm.isImpassableBuildingTile(hcBottomRight)).toBe(false);

        const superboard = {
            miniboards: Array(9).fill(null).map((_, mbIdx) => ({
                id: mbIdx,
                tiles: Array(225).fill(null).map((_, tIdx) => ({ id: mbIdx * 225 + tIdx }))
            }))
        };

        const instance = new DungeonPage({
            boardManager: {
                dungeon: { superboards: { pocket_plains: superboard } }
            }
        });

        // 2x2 Healing Circle at (5, 5) spanning (5,5), (5,6), (6,5), (6,6)
        superboard.miniboards[0].tiles[80] = hcAnchor;
        superboard.miniboards[0].tiles[81] = hcTopRight;
        superboard.miniboards[0].tiles[95] = hcBottomLeft;
        superboard.miniboards[0].tiles[96] = hcBottomRight;

        expect(instance.isSuperboardTilePassable(superboard, 5, 5)).toBe(true);
        expect(instance.isSuperboardTilePassable(superboard, 5, 6)).toBe(true);
        expect(instance.isSuperboardTilePassable(superboard, 6, 5)).toBe(true);
        expect(instance.isSuperboardTilePassable(superboard, 6, 6)).toBe(true);

        // Player avatar can move directly ON TOP OF the 2x2 Healing Circle
        instance.state = {
            inSuperboard: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 4, gy: 5 },
            dungeon: { superboards: { pocket_plains: superboard } }
        };
        instance.setState = jest.fn((updater) => {
            if (typeof updater === 'function') {
                instance.state = { ...instance.state, ...updater(instance.state) };
            } else {
                instance.state = { ...instance.state, ...updater };
            }
        });

        // Step down onto (5, 5) anchor of Healing Circle
        const moved = instance.movePlayerInSuperboard(1, 0);
        expect(moved).not.toBe(false);
        expect(instance.state.superboardPlayerPos.gx).toBe(5);
        expect(instance.state.superboardPlayerPos.gy).toBe(5);
    });

    test('Tile component renders static portrait for palette tile, and 2x2 layered complex on anchor cell only', () => {
        // 1. Palette tile renders flat portrait
        const { container: paletteContainer } = render(
            <Tile
                id={0}
                index={0}
                isPaletteTile={true}
                image={images.healing_circle}
                type="item"
            />
        );
        expect(paletteContainer.querySelector('.portrait')).not.toBeNull();
        expect(paletteContainer.querySelector('.healing-circle-complex')).toBeNull();

        // 2. Board anchor tile renders layered healing-circle-complex spanning 2x2
        const { container: anchorContainer } = render(
            <Tile
                id={1}
                index={1}
                isPaletteTile={false}
                contains={{ type: 'building', subtype: 'healing_circle', vendorCell: 'anchor', vendorGroupId: 'hc_1' }}
                building="healing_circle"
                vendorCell="anchor"
                isPlayerOnTile={false}
            />
        );
        expect(anchorContainer.querySelector('.portrait')).toBeNull();
        const complex = anchorContainer.querySelector('.healing-circle-complex');
        expect(complex).not.toBeNull();
        expect(complex.classList.contains('inert')).toBe(true);
        expect(complex.style.right).toBe('-100%');
        expect(complex.style.bottom).toBe('-100%');

        const base = anchorContainer.querySelector('.healing-circle-base');
        expect(base).not.toBeNull();

        const shards = anchorContainer.querySelectorAll('.healing-circle-shard');
        expect(shards.length).toBe(5);

        // 3. Non-anchor quadrant tiles return null for healing-circle-complex (avoiding duplicates)
        const { container: nonAnchorContainer } = render(
            <Tile
                id={2}
                index={2}
                isPaletteTile={false}
                contains={{ type: 'building', subtype: 'healing_circle', vendorCell: 'top_right', vendorGroupId: 'hc_1' }}
                building="healing_circle"
                vendorCell="top_right"
                isPlayerOnTile={false}
            />
        );
        expect(nonAnchorContainer.querySelector('.healing-circle-complex')).toBeNull();
    });

    test('Affiliation colored-circle (structure-faction-ring) is suppressed for Healing Circle', () => {
        const { container } = render(
            <Tile
                id={10}
                index={10}
                isPaletteTile={false}
                contains={{ type: 'building', subtype: 'healing_circle', affiliation: 'friendly' }}
                building="healing_circle"
                affiliation="friendly"
                territory="player"
                isStructureTile={true}
            />
        );
        // Ensure no structure-faction-ring is rendered for healing circle
        expect(container.querySelector('.structure-faction-ring')).toBeNull();
    });

    test('Floating shards rise to active position when player is on tile and lower to inert when player steps off', () => {
        // Active: player on tile
        const { container: activeContainer } = render(
            <Tile
                id={2}
                index={2}
                isPaletteTile={false}
                contains={{ type: 'building', subtype: 'healing_circle' }}
                building="healing_circle"
                isPlayerOnTile={true}
            />
        );
        const activeComplex = activeContainer.querySelector('.healing-circle-complex');
        expect(activeComplex.classList.contains('active')).toBe(true);

        const activeShards = activeContainer.querySelectorAll('.healing-circle-shard');
        expect(activeShards.length).toBe(5);
        activeShards.forEach(shard => {
            expect(shard.classList.contains('active')).toBe(true);
            expect(shard.style.transform).toBe('translateY(0%) scale(1)');
        });

        // Inert: player not on tile
        const { container: inertContainer } = render(
            <Tile
                id={3}
                index={3}
                isPaletteTile={false}
                contains={{ type: 'building', subtype: 'healing_circle' }}
                building="healing_circle"
                isPlayerOnTile={false}
            />
        );
        const inertComplex = inertContainer.querySelector('.healing-circle-complex');
        expect(inertComplex.classList.contains('inert')).toBe(true);

        const inertShards = inertContainer.querySelectorAll('.healing-circle-shard');
        expect(inertShards.length).toBe(5);
        inertShards.forEach(shard => {
            expect(shard.classList.contains('inert')).toBe(true);
            // Must have downward translate (non-0%)
            expect(shard.style.transform).toContain('translateY(');
            expect(shard.style.transform).not.toBe('translateY(0%) scale(1)');
        });
    });

    test('Standing on Healing Circle restores entire crew by 3 HP/sec up to max HP and spawns green floating indicators', () => {
        const superboard = {
            miniboards: Array(9).fill(null).map((_, idx) => ({
                id: idx,
                tiles: Array(225).fill(null).map((_, tIdx) => ({
                    id: tIdx,
                    building: 'empty_space',
                    contains: 'empty_space'
                }))
            }))
        };

        const crewMembers = [
            { id: 'member_1', name: 'Hero 1', hp: 5, stats: { hp: 10 } },
            { id: 'member_2', name: 'Hero 2', hp: 8, stats: { hp: 10 } },
            { id: 'member_3', name: 'Hero 3', hp: 10, stats: { hp: 10 } }
        ];

        const mockCrewManager = {
            crew: crewMembers
        };

        const instance = new DungeonPage({
            crewManager: mockCrewManager,
            boardManager: {
                dungeon: { superboards: { pocket_plains: superboard } }
            }
        });

        const anchorTile = {
            id: 80,
            building: 'healing_circle',
            contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'anchor', vendorGroupId: 'hc_1' }
        };
        superboard.miniboards[0].tiles[80] = anchorTile;

        instance.state = {
            inSuperboard: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 5, gy: 5 },
            dungeon: { superboards: { pocket_plains: superboard } },
            healingFloatingIndicators: []
        };
        instance.setState = jest.fn();

        // Standing on (5,5) - tick healing
        instance.tickHealingCircle();

        expect(mockCrewManager.crew[0].hp).toBe(8);  // 5 + 3
        expect(mockCrewManager.crew[1].hp).toBe(10); // 8 + 3 (clamped to maxHp 10)
        expect(mockCrewManager.crew[2].hp).toBe(10); // 10 (remains maxHp)

        // Verify setState was called with healingFloatingIndicators containing +3
        expect(instance.setState.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                crew: expect.any(Array),
                healingFloatingIndicators: expect.arrayContaining([
                    expect.objectContaining({ text: '+3' })
                ])
            })
        );

        // Tick second time
        instance.tickHealingCircle();
        expect(mockCrewManager.crew[0].hp).toBe(10);  // 8 + 3 (clamped to 10)

        // Move away from Healing Circle
        instance.state.superboardPlayerPos = { gx: 10, gy: 10 };
        instance.setState.mockClear();
        instance.tickHealingCircle();

        // HP should remain 10 (no healing when not standing on circle)
        expect(mockCrewManager.crew[0].hp).toBe(10);
        expect(instance.setState).not.toHaveBeenCalled();
    });

    test('All 4 tiles of 2x2 Healing Circle are passable with keyboard movement in BoardManager and Superboard', () => {
        // 1. Normal Dungeon BoardManager check with full board
        const bm = new BoardManager();
        const tiles = Array(225).fill(null).map((_, idx) => ({
            id: idx,
            type: 'empty_space',
            contains: 'empty_space',
            coordinates: [Math.floor(idx / 15) + 15, (idx % 15) + 15]
        }));

        // Place 2x2 Healing Circle at row 5, col 5 (idx 80, 81, 95, 96)
        const anchorIdx = 80;
        tiles[80] = { id: 80, building: 'healing_circle', contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'anchor', vendorGroupId: 'hc_full' } };
        tiles[81] = { id: 81, building: 'healing_circle', contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'top_right', vendorGroupId: 'hc_full', vendorAnchorId: 80 } };
        tiles[95] = { id: 95, building: 'healing_circle', contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'bottom_left', vendorGroupId: 'hc_full', vendorAnchorId: 80 } };
        tiles[96] = { id: 96, building: 'healing_circle', contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'bottom_right', vendorGroupId: 'hc_full', vendorAnchorId: 80 } };

        bm.currentBoard = { id: 0, tiles };
        bm.tiles = tiles;

        // Verify isImpassableBuildingTile returns false for ALL 4 tiles even with boardTiles populated
        expect(bm.isImpassableBuildingTile(tiles[80])).toBe(false);
        expect(bm.isImpassableBuildingTile(tiles[81])).toBe(false);
        expect(bm.isImpassableBuildingTile(tiles[95])).toBe(false);
        expect(bm.isImpassableBuildingTile(tiles[96])).toBe(false);

        // Verify isPassageWallBlockingBetween returns false moving onto each of the 4 tiles
        expect(bm.isPassageWallBlockingBetween(79, 80)).toBe(false); // left to anchor
        expect(bm.isPassageWallBlockingBetween(66, 81)).toBe(false); // top to top_right
        expect(bm.isPassageWallBlockingBetween(110, 95)).toBe(false); // bottom to bottom_left
        expect(bm.isPassageWallBlockingBetween(97, 96)).toBe(false); // right to bottom_right

        // Verify movement between tiles inside the 2x2 Healing Circle
        expect(bm.isPassageWallBlockingBetween(80, 81)).toBe(false); // anchor to top_right
        expect(bm.isPassageWallBlockingBetween(80, 95)).toBe(false); // anchor to bottom_left
        expect(bm.isPassageWallBlockingBetween(81, 96)).toBe(false); // top_right to bottom_right
        expect(bm.isPassageWallBlockingBetween(95, 96)).toBe(false); // bottom_left to bottom_right

        // Simulate avatar moving into and across all 4 tiles
        bm.playerTile = { location: [20, 19], boardIndex: 0 }; // at (20, 19) which is index 79
        bm.move([20, 20], 'right'); // move onto anchor (80)
        expect(bm.playerTile.location).toEqual([20, 20]);

        bm.move([20, 21], 'right'); // move onto top_right (81)
        expect(bm.playerTile.location).toEqual([20, 21]);

        bm.move([21, 21], 'down'); // move onto bottom_right (96)
        expect(bm.playerTile.location).toEqual([21, 21]);

        bm.move([21, 20], 'left'); // move onto bottom_left (95)
        expect(bm.playerTile.location).toEqual([21, 20]);

        bm.move([21, 19], 'left'); // move out of circle
        expect(bm.playerTile.location).toEqual([21, 19]);

        // 2. Superboard (Pocket Dimension) movement across all 4 tiles
        const superboard = {
            miniboards: Array(9).fill(null).map((_, mbIdx) => ({
                id: mbIdx,
                tiles: Array(225).fill(null).map((_, tIdx) => ({ id: mbIdx * 225 + tIdx, type: 'empty_space', contains: 'empty_space' }))
            }))
        };
        superboard.miniboards[0].tiles[80] = tiles[80];
        superboard.miniboards[0].tiles[81] = tiles[81];
        superboard.miniboards[0].tiles[95] = tiles[95];
        superboard.miniboards[0].tiles[96] = tiles[96];

        bm.dungeon = { superboards: { pocket_plains: superboard } };

        const instance = new DungeonPage({
            boardManager: bm
        });
        instance.state = {
            inSuperboard: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 4, gy: 5 }, // Left of anchor (5, 5)
            dungeon: { superboards: { pocket_plains: superboard } }
        };
        instance.setState = jest.fn((updater) => {
            if (typeof updater === 'function') {
                instance.state = { ...instance.state, ...updater(instance.state) };
            } else {
                instance.state = { ...instance.state, ...updater };
            }
        });

        // Step right onto anchor (5, 5)
        expect(instance.movePlayerInSuperboard(1, 0)).not.toBe(false);
        expect(instance.state.superboardPlayerPos.gx).toBe(5);
        expect(instance.state.superboardPlayerPos.gy).toBe(5);

        // Step right onto top_right (6, 5)
        expect(instance.movePlayerInSuperboard(1, 0)).not.toBe(false);
        expect(instance.state.superboardPlayerPos.gx).toBe(6);
        expect(instance.state.superboardPlayerPos.gy).toBe(5);

        // Step down onto bottom_right (6, 6)
        expect(instance.movePlayerInSuperboard(0, 1)).not.toBe(false);
        expect(instance.state.superboardPlayerPos.gx).toBe(6);
        expect(instance.state.superboardPlayerPos.gy).toBe(6);

        // Step left onto bottom_left (5, 6)
        expect(instance.movePlayerInSuperboard(-1, 0)).not.toBe(false);
        expect(instance.state.superboardPlayerPos.gx).toBe(5);
        expect(instance.state.superboardPlayerPos.gy).toBe(6);

        // Step left out of circle to (4, 6)
        expect(instance.movePlayerInSuperboard(-1, 0)).not.toBe(false);
        expect(instance.state.superboardPlayerPos.gx).toBe(4);
        expect(instance.state.superboardPlayerPos.gy).toBe(6);

        // Verify findSuperboardMicroPath paths directly onto bottom_right (6, 6)
        const microPath = instance.findSuperboardMicroPath(superboard, 4, 6, new Set(['6,6']));
        expect(microPath).not.toBeNull();
        expect(microPath.length).toBeGreaterThan(0);
    });

    test('Avatar renders green +3 floating indicators when healingFloatingIndicators are active in state', () => {
        const superboard = {
            miniboards: Array(9).fill(null).map((_, idx) => ({
                id: idx,
                tiles: Array(225).fill(null).map((_, tIdx) => ({
                    id: tIdx,
                    building: 'empty_space',
                    contains: 'empty_space'
                }))
            }))
        };

        const instance = new DungeonPage({
            crewManager: { crew: [{ id: 'm1', hp: 10, stats: { hp: 10 } }] },
            boardManager: {
                dungeon: { superboards: { pocket_plains: superboard } },
                playerTile: { location: [0, 0] },
                getIndexFromCoordinates: () => 0
            }
        });

        instance.state = {
            ...instance.state,
            inSuperboard: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 5, gy: 5 },
            dungeon: { superboards: { pocket_plains: superboard } },
            playerFloatVisible: true,
            playerFloatStyle: { left: 100, top: 100 },
            healingFloatingIndicators: [
                { id: 1, text: '+3', xOffset: 2 },
                { id: 2, text: '+3', xOffset: -4 }
            ]
        };

        const rendered = instance.render();
        const findInTree = (node, predicate) => {
            if (!node) return [];
            let results = [];
            if (predicate(node)) results.push(node);
            if (Array.isArray(node)) {
                node.forEach(child => { results = results.concat(findInTree(child, predicate)); });
            } else if (node.props && node.props.children) {
                results = results.concat(findInTree(node.props.children, predicate));
            }
            return results;
        };

        const healIndicators = findInTree(rendered, n => n && n.props && n.props.className && n.props.className.includes('avatar-heal-indicator'));
        expect(healIndicators.length).toBe(2);
        expect(healIndicators[0].props.children).toBe('+3');
        expect(healIndicators[1].props.children).toBe('+3');
    });
});

