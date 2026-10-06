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
    getUserId: jest.fn(() => 'player_1'),
    applyResolvePenalty: jest.fn(val => val)
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

    test('startMonsterPursuit restores vacated tile as non-void floor space when monster tile moves', () => {
        const instance = new DungeonPage({});
        instance.triggerMonsterBattle = jest.fn();
        instance.refreshTiles = jest.fn();

        const tiles = Array(225).fill(null).map((_, idx) => ({
            id: idx,
            color: '#6b6057',
            contains: null,
            isVoid: false,
            type: 'empty_space'
        }));

        // Player at (10, 10) = index 160
        const pIdx = 10 * 15 + 10;
        // Monster at (5, 5) = index 80 (originally had template type: 'void')
        const mIdx = 5 * 15 + 5;
        tiles[mIdx] = {
            id: mIdx,
            color: '#6b6057',
            type: 'void',
            original: 'void',
            isVoid: true,
            contains: { type: 'monster', subtype: 'skeleton' },
            image: 'skeleton'
        };

        const mockBm = {
            playerTile: { location: [10, 10] },
            tiles: tiles,
            currentBoard: { tiles: { [mIdx]: { id: mIdx, color: '#6b6057', type: 'void', isVoid: true, contains: tiles[mIdx].contains } } },
            getIndexFromCoordinates: ([r, c]) => r * 15 + c,
            refreshTiles: jest.fn()
        };

        instance.props = { boardManager: mockBm };
        instance.boardManager = mockBm;
        instance.state = { inMonsterBattle: false, keysLocked: false };

        instance.startMonsterPursuit(tiles[mIdx]);

        // Advance timer 450ms for first step pursuit
        jest.advanceTimersByTime(450);

        // Vacated tile (mIdx) must be restored as non-void floor tile
        const vacatedTile = tiles[mIdx];
        expect(vacatedTile.contains).toBeNull();
        expect(vacatedTile.isVoid).toBe(false);
        expect(vacatedTile.type).toBe('empty_space');
        expect(vacatedTile.original).toBeUndefined();
        expect(vacatedTile.color).not.toBe('black');
    });

    test('Aggro On toggle renders in renderTogglesSection and handleToggleAggroOn updates state and storage', () => {
        const instance = new DungeonPage({});
        instance.isSectionCollapsed = jest.fn(() => false);
        instance.checkAggroMonsters = jest.fn();
        instance.forceUpdate = jest.fn();

        expect(instance.state.aggroOn).toBe(false);

        const { container } = render(<div>{instance.renderTogglesSection()}</div>);
        const toggleEl = container.querySelector('.aggro-on-toggle-inline');
        expect(toggleEl).not.toBeNull();
        expect(toggleEl.textContent).toContain('OFF');

        // Trigger toggle
        instance.handleToggleAggroOn();
        expect(instance.state.aggroOn).toBe(true);
        expect(instance.checkAggroMonsters).toHaveBeenCalled();
        expect(localStorage.getItem('aggroOn')).toBe('true');

        // Toggle back OFF
        instance.handleToggleAggroOn();
        expect(instance.state.aggroOn).toBe(false);
        expect(localStorage.getItem('aggroOn')).toBe('false');
    });

    test('isAggroMonsterObj defaults ALL monsters in-dungeon to aggro: true when aggroOn is true', () => {
        const instance = new DungeonPage({});
        const regularGoblinTile = {
            id: 15,
            color: '#6b6057',
            contains: { type: 'monster', subtype: 'goblin' }
        };

        // When aggroOn is false, standard goblin is not aggro
        instance.state = { aggroOn: false };
        expect(instance.isAggroMonsterObj(regularGoblinTile.contains, regularGoblinTile)).toBe(false);

        // When aggroOn is true, ALL in-dungeon monsters default to aggro: true
        instance.state = { aggroOn: true };
        expect(instance.isAggroMonsterObj(regularGoblinTile.contains, regularGoblinTile)).toBe(true);

        // Non-monster tiles remain false even with aggroOn: true
        const floorTile = { id: 16, color: '#6b6057', contains: null };
        expect(instance.isAggroMonsterObj(floorTile.contains, floorTile)).toBe(false);
    });

    test('Tile component renders aggro-monster-glow for standard monsters when aggroOn is passed', () => {
        const standardMonsterContains = { type: 'monster', subtype: 'goblin_warrior', aggro: false };

        // Without aggroOn: no aggro glow
        const { container: c1 } = render(
            <Tile
                id={20}
                color="red"
                contains={standardMonsterContains}
                type="monster-tile"
                aggroOn={false}
            />
        );
        const glowEl1 = c1.querySelector('.monster-portrait-glow');
        if (glowEl1) {
            expect(glowEl1.className).not.toContain('aggro-monster-glow');
        }

        // With aggroOn={true}: renders crimson pulsing aggro-monster-glow
        const { container: c2 } = render(
            <Tile
                id={21}
                color="red"
                contains={standardMonsterContains}
                type="monster-tile"
                aggroOn={true}
            />
        );
        const glowEl2 = c2.querySelector('.monster-portrait-glow');
        expect(glowEl2).not.toBeNull();
        expect(glowEl2.className).toContain('aggro-monster-glow');
    });

    test('checkAggroMonsters triggers pursuit for monsters within radius 4 when aggroOn is true', () => {
        const instance = new DungeonPage({});
        instance.triggerMonsterBattle = jest.fn();
        instance.startMonsterPursuit = jest.fn();

        const pRow = 5;
        const pCol = 5;
        const tiles = Array(225).fill(null).map((_, idx) => ({ id: idx, color: '#6b6057', contains: null }));

        // Place a regular goblin 3 tiles away (Row 5, Col 8) -> within radius 4
        const mRow = 5;
        const mCol = 8;
        const mIdx = mRow * 15 + mCol;
        tiles[mIdx].contains = { type: 'monster', subtype: 'goblin' };

        instance.props = {
            boardManager: {
                playerTile: { location: [pRow, pCol] },
                tiles: tiles,
                getIndexFromCoordinates: ([r, c]) => r * 15 + c,
                refreshTiles: jest.fn()
            }
        };

        // When aggroOn is false, no pursuit is triggered
        instance.state = { aggroOn: false, inMonsterBattle: false, keysLocked: false };
        instance.checkAggroMonsters();
        expect(instance.startMonsterPursuit).not.toHaveBeenCalled();

        // When aggroOn is true, startMonsterPursuit is triggered for the monster in radius
        instance.state = { aggroOn: true, inMonsterBattle: false, keysLocked: false };
        instance.checkAggroMonsters();
        expect(instance.startMonsterPursuit).toHaveBeenCalledWith(tiles[mIdx]);
    });

    test('startMonsterPursuit pathfinds around impassable way_down tiles and does not step on or overwrite them', () => {
        const instance = new DungeonPage({});
        instance.triggerMonsterBattle = jest.fn();
        instance.refreshTiles = jest.fn();

        const tiles = Array(225).fill(null).map((_, idx) => ({
            id: idx,
            color: '#6b6057',
            contains: null,
            isVoid: false,
            type: 'empty_space'
        }));

        // Player at (5, 5) = idx 80
        const pIdx = 5 * 15 + 5;
        // Monster at (5, 7) = idx 82
        const mIdx = 5 * 15 + 7;
        tiles[mIdx].contains = { type: 'monster', subtype: 'skeleton' };
        tiles[mIdx].image = 'skeleton';

        // Impassable way_down tile directly in straight path at (5, 6) = idx 81
        const wayDownIdx = 5 * 15 + 6;
        tiles[wayDownIdx].contains = { type: 'way_down', subtype: 'way_down' };
        tiles[wayDownIdx].image = 'way_down';

        const mockBm = {
            playerTile: { location: [5, 5] },
            tiles: tiles,
            currentBoard: { tiles: {} },
            getIndexFromCoordinates: ([r, c]) => r * 15 + c,
            refreshTiles: jest.fn()
        };

        instance.props = { boardManager: mockBm };
        instance.boardManager = mockBm;
        instance.state = { inMonsterBattle: false, keysLocked: false };

        instance.startMonsterPursuit(tiles[mIdx]);

        // Advance 450ms for step 1
        jest.advanceTimersByTime(450);

        // Monster should NOT step on way_down tile at (5, 6)
        expect(tiles[wayDownIdx].contains).toEqual({ type: 'way_down', subtype: 'way_down' });
        expect(tiles[wayDownIdx].image).toBe('way_down');

        // Instead, monster should pathfind around it (e.g. to (4, 7) or (6, 7))
        const step1Idx = tiles.findIndex(t => t.contains && (t.contains.type === 'monster' || t.contains.subtype === 'skeleton') && t.id !== mIdx);
        expect(step1Idx).not.toBe(-1);
        expect(step1Idx).not.toBe(wayDownIdx);
    });

    test('startMonsterPursuit preserves and restores underlying tile contents when moving across tiles', () => {
        const instance = new DungeonPage({});
        instance.triggerMonsterBattle = jest.fn();
        instance.refreshTiles = jest.fn();

        const tiles = Array(225).fill(null).map((_, idx) => ({
            id: idx,
            color: '#6b6057',
            contains: null,
            isVoid: false,
            type: 'empty_space'
        }));

        // Player at (5, 4) = idx 79 (3 steps away from monster at 5,7)
        // Monster at (5, 7) = idx 82
        const mIdx = 5 * 15 + 7;
        tiles[mIdx].contains = { type: 'monster', subtype: 'goblin' };

        // Intermediate passable tile at (5, 6) has an item on floor
        const itemIdx = 5 * 15 + 6;
        tiles[itemIdx].contains = { type: 'item', subtype: 'minor_key' };
        tiles[itemIdx].image = 'minor_key';

        const mockBm = {
            playerTile: { location: [5, 4] },
            tiles: tiles,
            currentBoard: { tiles: {} },
            getIndexFromCoordinates: ([r, c]) => r * 15 + c,
            refreshTiles: jest.fn()
        };

        instance.props = { boardManager: mockBm };
        instance.boardManager = mockBm;
        instance.state = { inMonsterBattle: false, keysLocked: false };

        instance.startMonsterPursuit(tiles[mIdx]);

        // Advance 450ms for step 1 (monster moves onto itemIdx at 5, 6)
        jest.advanceTimersByTime(450);
        expect(tiles[itemIdx]._underlyingContent).toEqual({
            contains: { type: 'item', subtype: 'minor_key' },
            image: 'minor_key',
            icon: undefined,
            type: 'empty_space',
            subtype: undefined
        });

        // Advance 450ms for step 2 (monster moves from itemIdx 5,6 to 5,5)
        jest.advanceTimersByTime(450);

        // itemIdx should have restored its item content
        expect(tiles[itemIdx].contains).toEqual({ type: 'item', subtype: 'minor_key' });
        expect(tiles[itemIdx].image).toBe('minor_key');
    });

    test('battleOver("respawn") removes pursuing monster from pursuit tile and restores original monster at origin tile with full health', () => {
        mockMeta = { resolve: 100, deathTracker: 0, crew: [] };
        const instance = new DungeonPage({});
        instance.refreshTiles = jest.fn();
        instance.props = {
            crewManager: { crew: [], initializeCrew: jest.fn(), checkForLevelUp: jest.fn() },
            saveUserData: jest.fn()
        };

        const tiles = Array(225).fill(null).map((_, idx) => ({
            id: idx,
            color: '#6b6057',
            contains: null,
            isVoid: false,
            type: 'empty_space'
        }));

        // Origin tile (5, 7) = idx 82
        const originIdx = 82;
        tiles[originIdx].contains = { type: 'monster', subtype: 'skeleton', hp: 80, maxHp: 100, inDungeonDamaged: true };
        tiles[originIdx].image = 'skeleton';

        const mockBm = {
            playerTile: { location: [5, 5] },
            tiles: tiles,
            currentBoard: { tiles: {} },
            getIndexFromCoordinates: ([r, c]) => r * 15 + c,
            refreshTiles: jest.fn()
        };

        instance.props.boardManager = mockBm;
        instance.boardManager = mockBm;

        // Start pursuit from originIdx
        instance.startMonsterPursuit(tiles[originIdx]);
        jest.advanceTimersByTime(450);

        // Monster is now at pursuit tile (5, 6) = idx 81
        const pursuitIdx = 81;
        instance.triggerMonsterBattle(true, pursuitIdx);

        // Simulate combat defeat -> battleOver('respawn')
        instance.battleOver('respawn');

        // Pursuing monster tile at pursuitIdx (81) should be removed / cleared
        expect(tiles[pursuitIdx].contains).toBeNull();

        // Origin tile at originIdx (82) should have monster restored with FULL HEALTH (hp: 100, inDungeonDamaged removed)
        expect(tiles[originIdx].contains).toBeDefined();
        expect(tiles[originIdx].contains.subtype).toBe('skeleton');
        expect(tiles[originIdx].contains.hp).toBe(100);
        expect(tiles[originIdx].contains.inDungeonDamaged).toBeUndefined();
        expect(tiles[originIdx].image).toBe('skeleton');
    });
});

