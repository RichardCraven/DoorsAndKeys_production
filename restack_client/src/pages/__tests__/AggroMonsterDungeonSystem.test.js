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
import { MonsterManager } from '../../utils/monster-manager';

describe('Aggro Monster Dungeon System', () => {
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
        jest.useFakeTimers();
        mockMeta = {};
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('MonsterManager includes aggro: true on aggressive monsters (goblin_thief, goblin_warchief)', () => {
        const mm = new MonsterManager();
        expect(mm.monsters.goblin_thief).toBeDefined();
        expect(mm.monsters.goblin_thief.aggro).toBe(true);

        expect(mm.monsters.goblin_warchief).toBeDefined();
        expect(mm.monsters.goblin_warchief.aggro).toBe(true);
    });

    test('Tile component renders bright pulsing red glow (aggro-monster-glow) for aggro monsters', () => {
        const contains = { type: 'goblin_warchief', aggro: true };
        const { container } = render(
            <Tile
                id={5}
                color="red"
                contains={contains}
                type="monster-tile"
            />
        );

        const glowEl = container.querySelector('.monster-portrait-glow');
        expect(glowEl).not.toBeNull();
        expect(glowEl.className).toContain('aggro-monster-glow');
    });

    test('Tile component applies aggro-attack-lunge and CSS variables when isAggroAttacking is true', () => {
        const contains = { type: 'goblin_thief', aggro: true };
        const aggroAttackVector = { dRow: -1, dCol: 0 }; // attacking North (up)

        const { container } = render(
            <Tile
                id={12}
                color="red"
                contains={contains}
                type="monster-tile"
                isAggroAttacking={true}
                aggroAttackVector={aggroAttackVector}
            />
        );

        const tileEl = container.querySelector('.tile');
        expect(tileEl).not.toBeNull();
        expect(tileEl.className).toContain('aggro-attack-lunge');
        expect(tileEl.style.getPropertyValue('--aggro-attack-x')).toBe('0%');
        expect(tileEl.style.getPropertyValue('--aggro-attack-y')).toBe('-100%');
    });

    test('checkAggroMonsters triggers attack for orthogonal N, W, S, E adjacency but IGNORES diagonal adjacency', () => {
        const instance = new DungeonPage({});
        instance.triggerMonsterBattle = jest.fn();
        instance.forceUpdate = jest.fn();

        // Player is at (Row 5, Col 5) = Index 5*15 + 5 = 80
        const pRow = 5;
        const pCol = 5;
        const pIdx = pRow * 15 + pCol;

        // Create 225 tiles for board
        const tiles = Array(225).fill(null).map((_, idx) => ({
            id: idx,
            color: null,
            contains: null
        }));

        const boardManager = {
            playerTile: { location: [pRow, pCol] },
            tiles: tiles,
            getIndexFromCoordinates: ([r, c]) => r * 15 + c,
            refreshTiles: jest.fn()
        };

        instance.props = { boardManager };
        instance.state = { inMonsterBattle: false, keysLocked: false };

        // 1. Test Diagonal Adjacency: Monster at (Row 4, Col 6) [North-East]
        const diagIdx = 4 * 15 + 6;
        tiles[diagIdx].contains = { type: 'goblin_warchief', aggro: true };

        const diagTriggered = instance.checkAggroMonsters();
        expect(diagTriggered).toBe(false);
        expect(tiles[diagIdx].isAggroAttacking).toBeUndefined();

        // Clear diagonal monster
        tiles[diagIdx].contains = null;

        // 2. Test Orthogonal Adjacency: Monster at (Row 5, Col 6) [East]
        const eastIdx = 5 * 15 + 6;
        tiles[eastIdx].contains = { type: 'goblin_warchief', aggro: true };

        const eastTriggered = instance.checkAggroMonsters();
        expect(eastTriggered).toBe(true);
        expect(tiles[eastIdx].isAggroAttacking).toBe(true);
        // Vector from monster (5, 6) to player (5, 5) => dRow: 0, dCol: -1 (West / Left)
        expect(tiles[eastIdx].aggroAttackVector).toEqual({ dRow: 0, dCol: -1 });

        // Fast-forward 450ms for lunge animation to complete and trigger combat
        jest.advanceTimersByTime(450);

        expect(instance.triggerMonsterBattle).toHaveBeenCalledWith(true, eastIdx);
        expect(tiles[eastIdx].isAggroAttacking).toBe(false);
    });

    test('checkAggroMonsters does NOT trigger for aggro monsters hidden in fog (color: black)', () => {
        const instance = new DungeonPage({});
        instance.triggerMonsterBattle = jest.fn();

        const pRow = 5;
        const pCol = 5;
        const tiles = Array(225).fill(null).map((_, idx) => ({ id: idx, color: null, contains: null }));

        // Monster at North (4, 5) but hidden in fog
        const northIdx = 4 * 15 + 5;
        tiles[northIdx] = {
            id: northIdx,
            color: 'black',
            contains: { type: 'goblin_thief', aggro: true }
        };

        instance.props = {
            boardManager: {
                playerTile: { location: [pRow, pCol] },
                tiles: tiles,
                getIndexFromCoordinates: ([r, c]) => r * 15 + c,
                refreshTiles: jest.fn()
            }
        };
        instance.state = { inMonsterBattle: false, keysLocked: false };

        const triggered = instance.checkAggroMonsters();
        expect(triggered).toBe(false);
        expect(instance.triggerMonsterBattle).not.toHaveBeenCalled();
    });
});
