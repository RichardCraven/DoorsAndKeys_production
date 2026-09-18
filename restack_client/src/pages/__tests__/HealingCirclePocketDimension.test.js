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
import MapMaker from '../../utils/map-maker';
import images from '../../utils/images';
import MapmakerPage from '../MapmakerPage';
import DungeonPage from '../DungeonPage';

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

    test('Mapmaker palette includes Healing Circle as a 2x2 option and SVG icon exists', () => {
        const mapMaker = new MapMaker();
        const healingOptionIdx = mapMaker.pocketBuildingOptions.findIndex(o => o.key === 'healing_circle');
        expect(healingOptionIdx).toBeGreaterThan(-1);

        const option = mapMaker.pocketBuildingOptions[healingOptionIdx];
        expect(option.name).toBe('Healing Circle');
        expect(option.isMultiTile).toBe(true);

        expect(images.healing_circle).toBeDefined();
        expect(images.healing_circle).toContain('data:image/svg+xml');

        const mapmakerPage = new MapmakerPage({ mapMaker });
        const footprint = mapmakerPage.getFootprintTypeForPinnedOption({
            type: 'pocket-building-tile',
            id: healingOptionIdx
        });
        expect(footprint).toBe('2x2');
    });

    test('Healing Circle 2x2 tile complex is passable in Pocket Dimension', () => {
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

        // Place 2x2 Healing Circle at (5, 5) -> (6, 6)
        // (5,5) = mbIdx 0, tileIdx 5 * 15 + 5 = 80
        const anchorTile = {
            id: 80,
            building: 'healing_circle',
            contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'anchor', vendorGroupId: 'hc_1' }
        };
        const trTile = {
            id: 81,
            building: 'healing_circle',
            contains: { type: 'building', subtype: 'healing_circle', vendorCell: 'top_right', vendorGroupId: 'hc_1' }
        };

        superboard.miniboards[0].tiles[80] = anchorTile;
        superboard.miniboards[0].tiles[81] = trTile;

        expect(instance.isSuperboardTilePassable(superboard, 5, 5)).toBe(true);
        expect(instance.isSuperboardTilePassable(superboard, 6, 5)).toBe(true);
    });

    test('Standing on Healing Circle restores entire crew by 2 HP/sec up to max HP', () => {
        const superboard = {
            miniboards: Array(9).fill(null).map((_, mbIdx) => ({
                id: mbIdx,
                tiles: Array(225).fill(null).map((_, tIdx) => ({ id: mbIdx * 225 + tIdx }))
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
            dungeon: { superboards: { pocket_plains: superboard } }
        };
        instance.setState = jest.fn();

        // Standing on (5,5) - tick healing
        instance.tickHealingCircle();

        expect(mockCrewManager.crew[0].hp).toBe(7);  // 5 + 2
        expect(mockCrewManager.crew[1].hp).toBe(10); // 8 + 2 (clamped to maxHp 10)
        expect(mockCrewManager.crew[2].hp).toBe(10); // 10 (remains maxHp)

        // Tick second time
        instance.tickHealingCircle();
        expect(mockCrewManager.crew[0].hp).toBe(9);  // 7 + 2

        // Move away from Healing Circle
        instance.state.superboardPlayerPos = { gx: 10, gy: 10 };
        instance.tickHealingCircle();

        // HP should remain 9 (no healing when not standing on circle)
        expect(mockCrewManager.crew[0].hp).toBe(9);
    });
});
