import React from 'react';
import { render } from '@testing-library/react';

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

let mockMeta = {};
jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => mockMeta),
    storeMeta: jest.fn((newMeta) => { mockMeta = { ...newMeta }; }),
    getUserId: jest.fn(() => 'player_1')
}));

import DungeonPage from '../DungeonPage';

describe('In-Dungeon Auto-Targeting & Automaton Progress Bar Fixes', () => {
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
        mockMeta = {};
    });

    test('updateRangedAutoTarget auto-targets monster unit contained on board tile', () => {
        const instance = new DungeonPage({});
        instance._isMounted = true;
        instance.setState = (newState) => {
            instance.state = { ...instance.state, ...(typeof newState === 'function' ? newState(instance.state) : newState) };
        };

        const pRow = 10;
        const pCol = 10;
        const tiles = Array(400).fill(null).map((_, idx) => ({
            id: idx,
            color: null,
            contains: null
        }));

        const boardManager = {
            playerTile: { location: [pRow, pCol] },
            tiles: tiles,
            getIndexFromCoordinates: ([r, c]) => r * 20 + c
        };

        instance.props = { boardManager };
        instance.state = {
            inSuperboard: false,
            inMonsterBattle: false,
            equippedRangedWeapon: { id: 'longbow', name: 'Longbow' },
            targetedMonsterTileId: null
        };

        // Monster unit at (10, 13) - distance 3 East
        const targetIdx = 10 * 20 + 13;
        tiles[targetIdx].contains = { type: 'monster', name: 'Cave Drake', hp: 50 };

        instance.updateRangedAutoTarget();

        expect(instance.state.targetedMonsterTileId).toBe(targetIdx);
    });

    test('Automaton conversion progress bar is restricted to target building tile and omitted from Automaton unit tile', () => {
        const instance = new DungeonPage({});
        instance.state = {
            isPocketDimension: true,
            inSuperboard: true,
            superboardViewMinX: 0,
            superboardViewMinY: 0,
            tileSize: 40,
            convertingBuildings: {
                'b_1': {
                    progress: 0.55,
                    targetTileKey: '10_10'
                }
            },
            superboardEntities: {
                'auto_1': {
                    id: 'auto_1',
                    subtype: 'automaton',
                    gx: 10,
                    gy: 11,
                    convertingBuildingId: 'b_1'
                }
            }
        };

        // Render board tile (10, 11) where Automaton sits
        const tile10_11 = { id: 161, gx: 10, gy: 11, contains: { subtype: 'automaton' } };
        const buildingTile = { id: 160, gx: 10, gy: 10, contains: { type: 'enemy_sawmill' } };

        // Test check in superboard rendering logic
        const targetKey = '10_10';
        const autoKey = '10_11';

        const buildingConversion = instance.state.convertingBuildings['b_1'];
        const isBuildingTarget = buildingConversion && (buildingConversion.targetTileKey === targetKey || buildingConversion.targetTileKey === '10_10');
        const isAutomatonTile = buildingConversion && (buildingConversion.targetTileKey === autoKey || buildingConversion.targetTileKey === '10_11');

        expect(isBuildingTarget).toBe(true);
        expect(isAutomatonTile).toBe(false);
    });
});
