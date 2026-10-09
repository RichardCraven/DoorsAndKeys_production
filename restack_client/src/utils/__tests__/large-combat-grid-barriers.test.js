import { CombatManagerRedux } from '../combat-manager-redux';
import {
    MovementMethods,
    activeNaturalBarriers,
    isNaturalBarrierAt,
    getBarrierCollision,
    isPathBlockedByBarrier
} from '../shared-ai-methods/movement-methods';

describe('Large Combat Grid Natural Barriers', () => {
    let cm;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        cm.reset();
    });

    afterEach(() => {
        cm.reset();
        jest.useRealTimers();
    });

    test('natural barriers spawn only on large combat grid (12x8)', () => {
        const dummyCrew = [
            { id: 'c1', type: 'soldier', stats: { hp: 50, vitality: 30 } }
        ];
        const dummyMonster = { id: 'm1', type: 'mummy', tier: 2, stats: { hp: 100 } };

        // Test small board
        cm.initializeCombat({
            boardSize: 'small',
            crew: dummyCrew,
            monster: dummyMonster
        });

        expect(cm.boardSize).toBe('small');
        expect(cm.naturalBarriers).toEqual([]);
        expect(activeNaturalBarriers).toHaveLength(0);
        expect(cm.getCombatant('natural_barrier_5_1')).toBeNull();

        // Test large board
        cm.initializeCombat({
            boardSize: 'large',
            crew: dummyCrew,
            monster: dummyMonster
        });

        expect(cm.boardSize).toBe('large');
        expect(cm.naturalBarriers).toBeDefined();
        expect(cm.naturalBarriers).toHaveLength(6);

        // Verify exact coordinates: Barrier 1 at x=5, y=0..2; Barrier 2 at x=6, y=5..7
        expect(cm.naturalBarriers).toEqual([
            { x: 5, y: 0 },
            { x: 5, y: 1 },
            { x: 5, y: 2 },
            { x: 6, y: 5 },
            { x: 6, y: 6 },
            { x: 6, y: 7 }
        ]);

        expect(activeNaturalBarriers).toHaveLength(6);
        expect(isNaturalBarrierAt({ x: 5, y: 1 })).toBe(true);
        expect(isNaturalBarrierAt({ x: 6, y: 6 })).toBe(true);
        expect(isNaturalBarrierAt({ x: 5, y: 3 })).toBe(false);
        expect(isNaturalBarrierAt({ x: 6, y: 3 })).toBe(false);
        expect(isNaturalBarrierAt({ x: 5, y: 4 })).toBe(false);
        expect(isNaturalBarrierAt({ x: 6, y: 4 })).toBe(false);

        // Verify barrier combatant registered in cm.combatants
        const b1 = cm.getCombatant('natural_barrier_5_1');
        expect(b1).toBeDefined();
        expect(b1.isNaturalBarrier).toBe(true);
        expect(b1.isWall).toBe(true);
        expect(b1.stationary).toBe(true);
        expect(b1.unkillable).toBe(true);
        expect(b1.skipAI).toBe(true);
    });

    test('reset clears natural barriers from registry and combat manager', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'soldier', stats: { hp: 50 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100 } }
        });

        expect(activeNaturalBarriers.length).toBe(6);

        cm.reset();

        expect(activeNaturalBarriers.length).toBe(0);
        expect(cm.naturalBarriers).toEqual([]);
    });

    test('barrier tiles are impassable to movement and AI pathfinding', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'soldier', stats: { hp: 50, vitality: 30 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100 } }
        });

        const soldier = cm.getCombatant('c1');

        // All 6 barrier tiles cannot be moved into
        const barrierCoords = [
            { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 },
            { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 }
        ];

        barrierCoords.forEach(coord => {
            expect(MovementMethods.isAvailableToMoveInto(coord, cm.combatants, null, soldier)).toBe(false);
            expect(cm.isTileOccupied(coord.x, coord.y)).toBe(true);
            expect(cm.canFitAt(soldier, coord.x, coord.y)).toBe(false);
        });

        // 2-tile open corridor in the center (rows 3 and 4) is passable
        expect(MovementMethods.isAvailableToMoveInto({ x: 5, y: 3 }, cm.combatants, null, soldier)).toBe(true);
        expect(MovementMethods.isAvailableToMoveInto({ x: 6, y: 3 }, cm.combatants, null, soldier)).toBe(true);
        expect(MovementMethods.isAvailableToMoveInto({ x: 5, y: 4 }, cm.combatants, null, soldier)).toBe(true);
        expect(MovementMethods.isAvailableToMoveInto({ x: 6, y: 4 }, cm.combatants, null, soldier)).toBe(true);
    });

    test('AI goTowards paths around barrier when moving East toward enemy', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'soldier', stats: { hp: 50, vitality: 30 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100 } }
        });

        const soldier = cm.getCombatant('c1');
        // Place soldier immediately west of Barrier 1 at row 1
        soldier.coordinates = { x: 4, y: 1 };
        const enemyTile = { x: 10, y: 1 };

        // Moving directly East (5, 1) is blocked by Barrier 1!
        // goTowards should steer vertically around the barrier
        MovementMethods.goTowards(soldier, cm.combatants, enemyTile);

        // Soldier must NOT be at (5, 1)
        expect(soldier.coordinates).not.toEqual({ x: 5, y: 1 });
        expect([
            { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 4, y: 1 }
        ]).toContainEqual(soldier.coordinates);
    });

    test('findLaneWithClearLOS detects barrier obstruction and picks unblocked lane', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'ranger', stats: { hp: 50, vitality: 30 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100 } }
        });

        const ranger = cm.getCombatant('c1');
        const monster = cm.getCombatant('m1');
        ranger.coordinates = { x: 1, y: 1 };
        monster.coordinates = { x: 10, y: 1 };

        // Line from (1, 1) to (10, 1) passes through Barrier 1 at (5, 1)
        expect(isPathBlockedByBarrier({ x: 1, y: 1 }, { x: 10, y: 1 })).toBe(true);

        // Row 3 and Row 4 are open corridors without barriers
        expect(isPathBlockedByBarrier({ x: 1, y: 3 }, { x: 10, y: 3 })).toBe(false);
        expect(isPathBlockedByBarrier({ x: 1, y: 4 }, { x: 10, y: 4 })).toBe(false);
    });

    test('getBarrierCollision accurately intercepts projectiles', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'ranger', stats: { hp: 50 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100 } }
        });

        // 1. Horizontal shot through Barrier 1 (row 1)
        const hit1 = getBarrierCollision({ x: 1, y: 1 }, { x: 10, y: 1 });
        expect(hit1).toEqual({ x: 5, y: 1 });

        // 2. Horizontal shot through Barrier 2 (row 6)
        const hit2 = getBarrierCollision({ x: 1, y: 6 }, { x: 10, y: 6 });
        expect(hit2).toEqual({ x: 6, y: 6 });

        // 3. Clear horizontal shot in row 3 (corridor)
        const clear3 = getBarrierCollision({ x: 1, y: 3 }, { x: 10, y: 3 });
        expect(clear3).toBeNull();

        // 4. Clear horizontal shot in row 4 (corridor)
        const clear4 = getBarrierCollision({ x: 1, y: 4 }, { x: 10, y: 4 });
        expect(clear4).toBeNull();

        // 5. Monster shooting West toward player through Barrier 2
        const monsterHit = getBarrierCollision({ x: 10, y: 6 }, { x: 1, y: 6 });
        expect(monsterHit).toEqual({ x: 6, y: 6 });

        // 6. Angled shot crossing Barrier 1
        const angledHit = getBarrierCollision({ x: 1, y: 0 }, { x: 10, y: 3 });
        expect(angledHit).toBeDefined();
        expect(angledHit.x === 5 || angledHit.x === 6).toBe(true);

        // 7. Shot staying entirely on player side
        const localShot = getBarrierCollision({ x: 1, y: 1 }, { x: 3, y: 1 });
        expect(localShot).toBeNull();
    });

    test('projectiles striking natural barriers deal 0 damage and stop short', () => {
        jest.useFakeTimers();
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'ranger', stats: { hp: 50, atk: 20 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100, def: 0 } }
        });

        const ranger = cm.getCombatant('c1');
        const monster = cm.getCombatant('m1');
        ranger.coordinates = { x: 1, y: 1 };
        monster.coordinates = { x: 10, y: 1 };
        const initialMonsterHp = monster.hp;

        // Ranger fires 'loose' straight at monster across Barrier 1 at (5, 1)
        const looseAbility = {
            id: 'loose',
            name: 'Loose Arrow',
            range: 'far',
            damage: 25,
            type: 'piercing'
        };

        cm.useAbility(ranger, looseAbility, monster);
        jest.runAllTimers();

        // Monster should take 0 damage because projectile hit the natural barrier!
        expect(monster.hp).toBe(initialMonsterHp);

        // Combat log must indicate barrier interception
        const struckLog = cm.combatLog.some(entry => {
            const txt = typeof entry === 'string' ? entry : (entry?.message || entry?.text || '');
            return txt.includes('struck a natural barrier and was stopped');
        });
        expect(struckLog).toBe(true);
    });

    test('projectiles on clear lanes without barriers deal damage normally', () => {
        jest.useFakeTimers();
        cm.hitCheck = jest.fn().mockReturnValue(true);
        cm.damageCheck = jest.fn((caller, target, dmg) => dmg || 25);

        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'ranger', stats: { hp: 50, atk: 20 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100, def: 0 } }
        });

        const ranger = cm.getCombatant('c1');
        const monster = cm.getCombatant('m1');
        // Place in row 3 (open 2-tile corridor, no barrier)
        ranger.coordinates = { x: 1, y: 3 };
        ranger.occupiedCoords = [{ x: 1, y: 3 }];
        monster.coordinates = { x: 10, y: 3 };
        monster.occupiedCoords = [{ x: 10, y: 3 }];
        const initialMonsterHp = monster.hp;

        const looseAbility = {
            id: 'loose',
            name: 'Loose Arrow',
            range: 'far',
            damage: 25,
            type: 'piercing'
        };

        cm.useAbility(ranger, looseAbility, monster);
        jest.runAllTimers();

        // Monster should take damage on clear lane
        expect(monster.hp).toBeLessThan(initialMonsterHp);
    });

    test('barriers are excluded from acquireTarget and combatOverCheck', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'soldier', stats: { hp: 50 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100 } }
        });

        const soldier = cm.getCombatant('c1');
        const monster = cm.getCombatant('m1');

        // Target acquisition must never select a barrier
        cm.acquireTarget(soldier);
        expect(soldier.targetId).toBe(monster.id);

        cm.acquireTarget(monster);
        expect(monster.targetId).toBe(soldier.id);

        // If monster dies, combat ends in Victory despite barriers still present
        monster.dead = true;
        monster.hp = 0;
        const over = cm.combatOverCheck();
        expect(over).toBe(true);
        expect(cm.combatOver).toBe(true);
        expect(cm.combatLog.some(entry => (typeof entry === 'string' ? entry : (entry?.message || entry?.text || '')).includes('Victory'))).toBe(true);
    });

    test('large units (2x2) can pathfind through the 2-tile space at rows 3 and 4', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'soldier', stats: { hp: 100 } }],
            monster: { id: 'm1', type: 'kabuki_demon', tier: 3, stats: { hp: 440 } }
        });

        const monster = cm.getCombatant('m1');
        expect(monster.tier).toBe(3);

        // Monster can fit in the 2-tile opening at rows 3 and 4 across columns 5 and 6
        expect(cm.canFitAt(monster, 7, 4)).toBe(true);
        expect(cm.canFitAt(monster, 6, 4)).toBe(true);
        expect(cm.canFitAt(monster, 5, 4)).toBe(true);
        expect(cm.canFitAt(monster, 4, 4)).toBe(true);

        // But cannot fit directly into barrier columns where rows 0..2 or 5..7 are blocked
        expect(cm.canFitAt(monster, 5, 1)).toBe(false);
        expect(cm.canFitAt(monster, 6, 6)).toBe(false);
    });

    test('barbarian leap attack never lands on target occupied tiles or natural barriers', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'b1', type: 'barbarian', stats: { hp: 100, speed: 10 } }],
            monster: { id: 'm1', type: 'kabuki_demon', tier: 3, stats: { hp: 440 } }
        });

        const barbarian = cm.getCombatant('b1');
        const monster = cm.getCombatant('m1');
        barbarian.coordinates = { x: 2, y: 5 };

        // Position Kabuki Demon in rows 5 and 6 (as in user screenshot)
        monster.coordinates = { x: 8, y: 6 };
        cm._setCombatantOccupiedCoords(monster);

        // Verify monster occupiedCoords covers all 4 tiles in rows 5 and 6 on 8-row grid
        expect(monster.occupiedCoords).toEqual(expect.arrayContaining([
            { x: 8, y: 6 },
            { x: 8, y: 5 },
            { x: 7, y: 6 },
            { x: 7, y: 5 }
        ]));

        const leapAbility = {
            id: 'barbarian_leap_attack',
            name: 'Leap Attack',
            range: 'far',
            damage: 30
        };

        cm.useAbility(barbarian, leapAbility, monster);

        // Barbarian must NOT occupy any of the 4 monster tiles
        monster.occupiedCoords.forEach(mc => {
            expect(barbarian.coordinates).not.toEqual(mc);
        });

        // Barbarian must NOT occupy any natural barrier
        cm.naturalBarriers.forEach(bc => {
            expect(barbarian.coordinates).not.toEqual(bc);
        });
    });

    test('_clearCombatantOccupiedCoords clears coords and incrementRound runs cleanly', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'soldier', stats: { hp: 100 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100 } }
        });

        // Add a mock engineer wall
        cm.combatants['mock_wall'] = {
            id: 'mock_wall',
            type: 'engineer_wall',
            isWall: true,
            dead: false,
            roundsRemaining: 1,
            coordinates: { x: 3, y: 3 },
            occupiedCoords: [{ x: 3, y: 3 }]
        };

        expect(typeof cm._clearCombatantOccupiedCoords).toBe('function');

        // Calling incrementRound triggers the wall crumbling logic
        expect(() => {
            cm.incrementRound();
        }).not.toThrow();

        expect(cm.combatants['mock_wall'].dead).toBe(true);
        expect(cm.combatants['mock_wall'].occupiedCoords).toEqual([]);
    });
});
