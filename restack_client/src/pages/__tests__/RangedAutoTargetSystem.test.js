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

import React from 'react';
import { render } from '@testing-library/react';
import DungeonPage from '../DungeonPage';
import Tile from '../../components/tile';

describe('Ranged Weapon Auto-Targeting System', () => {
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

    test('Tile component renders ranged-auto-target-reticle when isTargetedByRanged is true', () => {
        const { container } = render(
            <Tile
                id={10}
                isTargetedByRanged={true}
                color="red"
                contains={{ type: 'skeleton' }}
            />
        );

        const reticleEl = container.querySelector('.ranged-auto-target-reticle');
        expect(reticleEl).not.toBeNull();
        expect(reticleEl.getAttribute('data-testid')).toBe('ranged-auto-target-reticle');
    });

    test('updateRangedAutoTarget targets closest orthogonal monster within 2..5 range with clear line of sight', () => {
        const instance = new DungeonPage({});
        instance._isMounted = true;
        instance.setState = (newState) => {
            instance.state = { ...instance.state, ...(typeof newState === 'function' ? newState(instance.state) : newState) };
        };

        // Player at (10, 10)
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
            equippedRangedWeapon: { id: 'crossbow', name: 'Crossbow' },
            targetedMonsterTileId: null
        };

        // Monster at distance 3 North (7, 10)
        const targetIdx = 7 * 20 + 10;
        tiles[targetIdx].contains = { type: 'goblin' };

        // Monster at distance 1 East (10, 11) -> Too close (dist < 2), in a different direction so it doesn't block North LOS
        const closeIdx = 10 * 20 + 11;
        tiles[closeIdx].contains = { type: 'rat' };

        instance.updateRangedAutoTarget();

        // Should target distance 3 (targetIdx), ignoring distance 1 (too close)
        expect(instance.state.targetedMonsterTileId).toBe(targetIdx);
    });

    test('updateRangedAutoTarget clears target if line of sight is blocked by non-passable terrain', () => {
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
            equippedRangedWeapon: { id: 'bow', name: 'Bow' },
            targetedMonsterTileId: null
        };

        // Monster at distance 4 East (10, 14)
        const targetIdx = 10 * 20 + 14;
        tiles[targetIdx].contains = { type: 'orc' };

        // Wall blocking line of sight at (10, 12)
        const wallIdx = 10 * 20 + 12;
        tiles[wallIdx].passThrough = false;
        tiles[wallIdx].terrain = 'wall';

        instance.updateRangedAutoTarget();

        expect(instance.state.targetedMonsterTileId).toBeNull();
    });

    test('updateRangedAutoTarget clears target when no ranged weapon is equipped', () => {
        const instance = new DungeonPage({});
        instance._isMounted = true;
        instance.setState = (newState) => {
            instance.state = { ...instance.state, ...(typeof newState === 'function' ? newState(instance.state) : newState) };
        };

        const boardManager = {
            playerTile: { location: [10, 10] },
            tiles: [{ id: 0 }],
            getIndexFromCoordinates: ([r, c]) => r * 20 + c
        };

        instance.props = { boardManager };
        instance.state = {
            inSuperboard: false,
            inMonsterBattle: false,
            equippedRangedWeapon: null,
            targetedMonsterTileId: 55
        };

        instance.updateRangedAutoTarget();

        expect(instance.state.targetedMonsterTileId).toBeNull();
    });
});
