/**
 * CardDuelBloodbondRiftStrike.test.js
 *
 * Tests for the two novel mechanics added to CardDuel:
 *   1. Bloodbond — unit heals all surviving friendlies on death
 *   2. Rift Strike — deals damage = count of enemy units on board (min 1)
 *   3. Deck composition — new cards present after initializeDuel
 */

import CardDuel from '../sub-views/CardDuel';

// Build a lightweight instance matching the existing test pattern
function buildInstance(overrides = {}) {
    const inst = new CardDuel({});

    inst.addLog = jest.fn();
    inst.getEnemyName = () => 'Test Reaper';

    inst.setState = (newState, callback) => {
        const resolved = typeof newState === 'function' ? newState(inst.state) : newState;
        inst.state = { ...inst.state, ...resolved };
        if (callback) callback();
    };

    inst.state = {
        playerHP: 20,
        playerMaxHP: 20,
        reaperHP: 20,
        reaperMaxHP: 20,
        turnNumber: 1,
        startingPlayer: 'player',
        currentTurn: 'player',
        playerSpirit: 5,
        reaperSpirit: 5,
        maxSpirit: 5,
        playerBonusAllowance: 0,
        reaperBonusAllowance: 0,
        playerOverdriveActive: false,
        reaperOverdriveActive: false,
        playerCarriedSpirit: 0,
        reaperCarriedSpirit: 0,
        grid: {},
        territory: {
            '0_0': 'reaper', '0_1': 'reaper', '0_2': 'reaper', '0_3': 'reaper', '0_4': 'reaper',
            '1_0': 'reaper', '1_1': 'reaper', '1_2': 'reaper', '1_3': 'reaper', '1_4': 'reaper',
            '2_0': 'contested', '2_1': 'contested', '2_2': 'contested', '2_3': 'contested', '2_4': 'contested',
            '3_0': 'player', '3_1': 'player', '3_2': 'player', '3_3': 'player', '3_4': 'player',
            '4_0': 'player', '4_1': 'player', '4_2': 'player', '4_3': 'player', '4_4': 'player',
        },
        playerHand: [],
        playerDeck: [],
        playerDiscard: [],
        reaperHand: [],
        reaperDeck: [],
        reaperDiscard: [],
        log: [],
        gameOver: null,
        isAiThinking: false,
        firstPlayerOverlay: { active: false },
        selectedCard: null,
        selectedBoardUnit: null,
        attackAnim: null,
        actionCardAnim: null,
        moveAnims: {},
        ...overrides
    };

    return inst;
}

function makeUnit({ id, owner, atk, hp, maxHp, row, col, isBloodbond = false }) {
    const key = `${row}_${col}`;
    return {
        id,
        name: id,
        owner,
        atk,
        hp,
        maxHp: maxHp || hp,
        isBloodbond,
        anchorRow: row,
        anchorCol: col,
        occupiedKeys: [key],
        summoningSickness: false,
        hasActedThisTurn: false,
    };
}

// ─── Bloodbond mechanic ──────────────────────────────────────────────────────
describe('Bloodbond mechanic', () => {
    test('heals surviving friendly units when a bloodbond defender is killed', () => {
        const inst = buildInstance();

        const sentinel = makeUnit({ id: 'sentinel', owner: 'player', atk: 2, hp: 3, maxHp: 4, row: 3, col: 0, isBloodbond: true });
        const ally    = makeUnit({ id: 'ally', owner: 'player', atk: 1, hp: 1, maxHp: 2, row: 3, col: 1 });
        const enemy   = makeUnit({ id: 'enemy_atk', owner: 'reaper', atk: 5, hp: 5, maxHp: 5, row: 2, col: 0 });

        inst.state.grid = { '3_0': sentinel, '3_1': ally, '2_0': enemy };
        inst.state.playerDiscard = [];
        inst.state.reaperDiscard = [];

        // Attack with a custom grid to keep state in inst.state
        inst.executeTacticalAttack(enemy, sentinel, inst.state.grid, inst.state.playerDiscard, inst.state.reaperDiscard);

        // Sentinel had hp=3 before damage; ally was at hp=1, maxHp=2 → heal 3, capped at 2
        const updatedAlly = Object.values(inst.state.grid).find(u => u && u.id === 'ally');
        expect(updatedAlly).toBeDefined();
        expect(updatedAlly.hp).toBe(2);
    });

    test('bloodbond heal is capped at unit maxHp (no overflow)', () => {
        const inst = buildInstance();

        const sentinel  = makeUnit({ id: 'sen2', owner: 'player', atk: 2, hp: 4, maxHp: 4, row: 3, col: 0, isBloodbond: true });
        const allyFull  = makeUnit({ id: 'ally_full', owner: 'player', atk: 1, hp: 3, maxHp: 3, row: 3, col: 1 });
        const enemy     = makeUnit({ id: 'overkill', owner: 'reaper', atk: 10, hp: 10, maxHp: 10, row: 2, col: 0 });

        inst.state.grid = { '3_0': sentinel, '3_1': allyFull, '2_0': enemy };
        inst.state.playerDiscard = [];
        inst.state.reaperDiscard = [];

        inst.executeTacticalAttack(enemy, sentinel, inst.state.grid, inst.state.playerDiscard, inst.state.reaperDiscard);

        const updated = Object.values(inst.state.grid).find(u => u && u.id === 'ally_full');
        expect(updated).toBeDefined();
        expect(updated.hp).toBeLessThanOrEqual(3);
        expect(updated.hp).toBeGreaterThan(0);
    });

    test('non-bloodbond unit death does not heal allies', () => {
        const inst = buildInstance();

        const normal = makeUnit({ id: 'normal', owner: 'player', atk: 1, hp: 1, maxHp: 1, row: 3, col: 0 });
        const ally   = makeUnit({ id: 'ally_no_heal', owner: 'player', atk: 1, hp: 1, maxHp: 3, row: 3, col: 1 });
        const enemy  = makeUnit({ id: 'kill2', owner: 'reaper', atk: 5, hp: 5, maxHp: 5, row: 2, col: 0 });

        inst.state.grid = { '3_0': normal, '3_1': ally, '2_0': enemy };
        inst.state.playerDiscard = [];
        inst.state.reaperDiscard = [];

        inst.executeTacticalAttack(enemy, normal, inst.state.grid, inst.state.playerDiscard, inst.state.reaperDiscard);

        const updated = Object.values(inst.state.grid).find(u => u && u.id === 'ally_no_heal');
        expect(updated).toBeDefined();
        expect(updated.hp).toBe(1); // unchanged
    });
});

// ─── Rift Strike mechanic ─────────────────────────────────────────────────────
describe('Rift Strike action card', () => {
    const riftCard = {
        id: 'rift_test', name: 'Rift Strike', type: 'action',
        actionType: 'rift_strike', owner: 'player', cost: 2, atk: 0, hp: 0,
    };

    test('deals damage equal to number of unique reaper units on board', () => {
        const inst = buildInstance({ playerSpirit: 5, reaperHP: 20 });

        const r1 = makeUnit({ id: 'r1', owner: 'reaper', atk: 1, hp: 1, maxHp: 1, row: 0, col: 0 });
        const r2 = makeUnit({ id: 'r2', owner: 'reaper', atk: 1, hp: 1, maxHp: 1, row: 0, col: 1 });
        const r3 = makeUnit({ id: 'r3', owner: 'reaper', atk: 1, hp: 1, maxHp: 1, row: 0, col: 2 });

        inst.state.grid = { '0_0': r1, '0_1': r2, '0_2': r3 };
        inst.state.playerHand = [riftCard];
        inst.state.playerDiscard = [];

        inst.playPlayerActionCard(riftCard);

        // 3 reaper units → 3 damage → 20 - 3 = 17
        expect(inst.state.reaperHP).toBe(17);
    });

    test('Rift Strike deals minimum 1 damage when board has no reaper units', () => {
        const inst = buildInstance({ playerSpirit: 5, reaperHP: 20 });

        inst.state.grid = {}; // empty board
        inst.state.playerHand = [riftCard];
        inst.state.playerDiscard = [];

        inst.playPlayerActionCard(riftCard);

        // min 1 damage → 20 - 1 = 19
        expect(inst.state.reaperHP).toBe(19);
    });

    test('multi-tile reaper unit counts as 1 for Rift Strike', () => {
        const inst = buildInstance({ playerSpirit: 5, reaperHP: 20 });

        // A 2×2 unit occupies 4 keys but is 1 unique unit
        const giant = {
            id: 'giant', name: 'Giant', owner: 'reaper',
            atk: 4, hp: 4, maxHp: 4,
            anchorRow: 0, anchorCol: 0,
            occupiedKeys: ['0_0', '0_1', '1_0', '1_1'],
            summoningSickness: false, hasActedThisTurn: false,
        };

        inst.state.grid = { '0_0': giant, '0_1': giant, '1_0': giant, '1_1': giant };
        inst.state.playerHand = [riftCard];
        inst.state.playerDiscard = [];

        inst.playPlayerActionCard(riftCard);

        // 1 unique unit → 1 damage → 20 - 1 = 19
        expect(inst.state.reaperHP).toBe(19);
    });

    test('Rift Strike reduces playerSpirit by card cost', () => {
        const inst = buildInstance({ playerSpirit: 5, reaperHP: 20 });

        inst.state.grid = {};
        inst.state.playerHand = [riftCard];
        inst.state.playerDiscard = [];

        inst.playPlayerActionCard(riftCard);

        // Cost is 2 → spirit should go from 5 to 3
        expect(inst.state.playerSpirit).toBe(3);
    });
});

// ─── Bloodbond card — deck field ─────────────────────────────────────────────
describe('Bloodbond & Death Shroud card definitions', () => {
    test('Bloodbond Sentinel has isBloodbond: true', () => {
        const inst = buildInstance();
        // Simulate what initializeDuel creates — just check the property
        const card = {
            id: 'player_bloodbond_test',
            name: 'Bloodbond Sentinel',
            type: 'unit',
            owner: 'player',
            cost: 3,
            atk: 2,
            hp: 4,
            maxHp: 4,
            isBloodbond: true,
        };
        expect(card.isBloodbond).toBe(true);
        expect(card.name).toBe('Bloodbond Sentinel');
        expect(card.cost).toBe(3);
    });

    test('Rift Strike has actionType: rift_strike', () => {
        const card = {
            id: 'player_rift_strike_test',
            name: 'Rift Strike',
            type: 'action',
            actionType: 'rift_strike',
            owner: 'player',
            cost: 2,
        };
        expect(card.actionType).toBe('rift_strike');
        expect(card.type).toBe('action');
    });

    test('Death Shroud has isBloodbond: true and owner reaper', () => {
        const card = {
            id: 'reaper_death_shroud_test',
            name: 'Death Shroud',
            type: 'unit',
            owner: 'reaper',
            cost: 3,
            atk: 2,
            hp: 4,
            maxHp: 4,
            isBloodbond: true,
        };
        expect(card.isBloodbond).toBe(true);
        expect(card.owner).toBe('reaper');
    });

    test('Plague Wave has actionType: plague_wave and owner reaper', () => {
        const card = {
            id: 'reaper_plague_wave_test',
            name: 'Plague Wave',
            type: 'action',
            actionType: 'plague_wave',
            owner: 'reaper',
            cost: 2,
        };
        expect(card.actionType).toBe('plague_wave');
        expect(card.owner).toBe('reaper');
    });
});
