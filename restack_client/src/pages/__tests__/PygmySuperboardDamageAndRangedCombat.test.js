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

describe('Pygmy Superboard Tile Resolution, Damage Persistence & Ranged Target Detection', () => {
    let page;

    beforeEach(() => {
        page = new DungeonPage({});
        page.state = {
            inSuperboard: true,
            superboardType: 'pocket_dimension',
            superboardEntities: {},
            superboardViewMinX: 15,
            superboardViewMinY: 15,
            tileSize: 48,
            superboardPlayerPos: { gx: 22, gy: 22 }
        };
        page.props = {
            boardManager: {
                refreshTiles: jest.fn(),
                tiles: []
            }
        };
        page.setState = jest.fn((patch) => {
            page.state = { ...page.state, ...patch };
        });
        page.displayMessage = jest.fn();
    });

    const createMockSuperboard = () => {
        const miniboards = [];
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const tiles = [];
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                tiles.push({
                    type: 'empty_space',
                    contains: null,
                    color: '#2d4a22'
                });
            }
            miniboards.push({ tiles });
        }
        return { miniboards };
    };

    test('resolveMonsterTileStats accurately resolves stats for Pygmy units', () => {
        const pygmyTile = {
            contains: {
                type: 'pygmies',
                subtype: 'pocket_pygmy',
                isPocketPygmy: true,
                hp: 12,
                maxHp: 20,
                def: 3
            }
        };

        const stats = page.resolveMonsterTileStats(pygmyTile);
        expect(stats.monsterType).toBe('pocket_pygmy');
        expect(stats.monsterName).toBe('Pocket Pygmy');
        expect(stats.maxHp).toBe(20);
    });

    test('isMonsterObj returns true for Pygmy string and object representations', () => {
        expect(page.isMonsterObj(null, 'pygmy')).toBe(true);
        expect(page.isMonsterObj(null, 'pocket_pygmy')).toBe(true);
        expect(page.isMonsterObj(null, { type: 'pygmies', subtype: 'pocket_pygmy' })).toBe(true);
        expect(page.isMonsterObj(null, { isPocketPygmy: true })).toBe(true);
    });

    test('triggerMonsterBattle resolves superboard miniboard tile from string tileId ("22_22") and preserves dungeon damage', () => {
        const superboard = createMockSuperboard();
        const tileGx = 22;
        const tileGy = 22;
        const mbIdx = Math.floor(tileGy / 15) * 3 + Math.floor(tileGx / 15); // Mb 4
        const tIdx = (tileGy % 15) * 15 + (tileGx % 15); // (7,7) -> 112

        superboard.miniboards[mbIdx].tiles[tIdx] = {
            contains: {
                type: 'pygmies',
                subtype: 'pocket_pygmy',
                isPocketPygmy: true,
                hp: 8,
                maxHp: 20
            }
        };

        page.state.dungeon = {
            superboards: {
                pocket_dimension: superboard
            }
        };

        page.triggerMonsterBattle(true, '22_22');

        expect(page.setState).toHaveBeenCalled();
        const patchedState = page.setState.mock.calls[0][0];
        expect(patchedState.inMonsterBattle).toBe(true);
        expect(patchedState.monster).toBeDefined();
        expect(patchedState.monster.hp).toBe(8);
        expect(patchedState.monster.starting_hp).toBe(20);
        expect(patchedState.monster.inDungeonDamaged).toBe(true);
    });
});
