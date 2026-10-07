import { CombatManagerRedux } from '../../utils/combat-manager-redux';

describe('Combat Arrow Key Navigation & Target Pathfinding', () => {
    let cm;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        cm._numBoardColumns = 8;
        cm._maxRows = 6;

        cm.combatants = {
            soldier_1: {
                id: 'soldier_1',
                name: 'Soldier',
                type: 'soldier',
                coordinates: { x: 1, y: 1 },
                skills: ['slash'],
                hp: 100,
                starting_hp: 100,
                stats: { hp: 100, atk: 15 },
                dead: false
            },
            sage_1: {
                id: 'sage_1',
                name: 'Sage',
                type: 'sage',
                coordinates: { x: 1, y: 3 },
                skills: ['heal'],
                hp: 80,
                starting_hp: 80,
                stats: { hp: 80, atk: 10 },
                dead: false
            },
            mummy_1: {
                id: 'mummy_1',
                name: 'Mummy',
                type: 'mummy',
                isMonster: true,
                coordinates: { x: 3, y: 1 },
                hp: 120,
                starting_hp: 120,
                stats: { hp: 120, atk: 12 },
                dead: false
            }
        };
    });

    test('Rule 1 & 2: Arrow key stepping updates manualDestination from origin', () => {
        cm.setSelectedFighter(cm.combatants.soldier_1);

        // Step right from (1, 1) -> (2, 1)
        cm.moveFighterOneSpace('right');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 2, y: 1 });

        // Step right again -> (3, 1) - wait, (3,1) is occupied by mummy_1
        // Step down instead from (2, 1) -> (2, 2)
        cm.moveFighterOneSpace('down');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 2, y: 2 });
    });

    test('Rule 3: Tab switching preserves manualDestination of previously selected unit', () => {
        cm.setSelectedFighter(cm.combatants.soldier_1);
        cm.moveFighterOneSpace('right'); // manualDestination: (2, 1)
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 2, y: 1 });

        // Switch selection to sage_1
        cm.setSelectedFighter(cm.combatants.sage_1);
        expect(cm.selectedFighter.id).toBe('sage_1');

        // Verify soldier_1's manualDestination was preserved
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 2, y: 1 });

        // Move sage_1 down -> (1, 4)
        cm.moveFighterOneSpace('down');
        expect(cm.combatants.sage_1.manualDestination).toEqual({ x: 1, y: 4 });
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 2, y: 1 });
    });

    test('Rule 4: Moving onto friendly unit WITH buff skills sets manualBuffTargetId', () => {
        cm.setSelectedFighter(cm.combatants.sage_1); // sage_1 has 'heal' skill
        cm.combatants.soldier_1.coordinates = { x: 1, y: 2 };

        // Move sage_1 up towards soldier_1 at (1, 2)
        cm.moveFighterOneSpace('up');

        expect(cm.combatants.sage_1.manualBuffTargetId).toBe('soldier_1');
    });

    test('Rule 5: Moving onto friendly unit WITHOUT buff skills sets resolveAdjacentOnArrival', () => {
        cm.setSelectedFighter(cm.combatants.soldier_1); // soldier_1 only has 'slash'
        cm.combatants.sage_1.coordinates = { x: 1, y: 2 };

        // Move soldier_1 down towards sage_1 at (1, 2)
        cm.moveFighterOneSpace('down');

        expect(cm.combatants.soldier_1.manualBuffTargetId).toBeNull();
        expect(cm.combatants.soldier_1.resolveAdjacentOnArrival).toBe(true);
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 1, y: 2 });
    });

    test('Rule 6: Moving onto enemy unit sets manualTargetId', () => {
        cm.setSelectedFighter(cm.combatants.soldier_1);
        cm.combatants.mummy_1.coordinates = { x: 2, y: 1 };

        // Move soldier_1 right onto mummy_1 at (2, 1)
        cm.moveFighterOneSpace('right');

        expect(cm.combatants.soldier_1.manualTargetId).toBe('mummy_1');
        expect(cm.combatants.soldier_1.targetId).toBe('mummy_1');
    });

    test('Rule 7: Auto-selects first live PC if selectedFighter is null or dead', () => {
        cm.selectedFighter = null;
        cm.moveFighterOneSpace('down');

        expect(cm.selectedFighter).toBeDefined();
        expect(cm.selectedFighter.id).toBe('soldier_1');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 1, y: 2 });

        // If soldier_1 dies, next arrow key picks sage_1
        cm.combatants.soldier_1.dead = true;
        cm.combatants.soldier_1.hp = 0;
        cm.moveFighterOneSpace('down');

        expect(cm.selectedFighter.id).toBe('sage_1');
        expect(cm.combatants.sage_1.manualDestination).toEqual({ x: 1, y: 4 });
    });

    test('Rule 8: Clamping prevents moving outside the board bounds', () => {
        cm.setSelectedFighter(cm.combatants.soldier_1);
        // Move all the way up and left
        cm.combatants.soldier_1.coordinates = { x: 0, y: 0 };
        cm.combatants.soldier_1.manualDestination = null;

        cm.moveFighterOneSpace('up');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 0, y: 0 });

        cm.moveFighterOneSpace('left');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 0, y: 0 });
    });

    test('Rule 9: Diagonal pathfinding moves diagonally when cutting across axes', () => {
        const soldier = cm.combatants.soldier_1;
        soldier.coordinates = { x: 1, y: 1 };

        // Target at (4, 4) - pathfinding should choose diagonal (2, 2)
        const step1 = cm.getPathfindNextStep(soldier, 4, 4);
        expect(step1).toEqual({ x: 2, y: 2 });

        // Target at (4, 1) from (1, 4) - pathfinding should choose diagonal (2, 3)
        soldier.coordinates = { x: 1, y: 4 };
        const step2 = cm.getPathfindNextStep(soldier, 4, 1);
        expect(step2).toEqual({ x: 2, y: 3 });

        // Target at (0, 0) from (2, 2) - pathfinding should choose diagonal (1, 1)
        soldier.coordinates = { x: 2, y: 2 };
        const step3 = cm.getPathfindNextStep(soldier, 0, 0);
        expect(step3).toEqual({ x: 1, y: 1 });
    });

    test('Rule 10: Single player unit spawns in center-back row (row 2 / middle lane)', () => {
        const singleCm = new CombatManagerRedux();
        singleCm.initializeCombat({
            crew: [{ id: 'p1', name: 'Knight', stats: { hp: 100 } }],
            monster: { id: 'm1', name: 'Goblin', stats: { hp: 50 } }
        });

        // Single player unit must spawn at { x: 0, y: 2 }
        expect(singleCm.combatants.p1.coordinates).toEqual({ x: 0, y: 2 });

        // When multiple live units are present, standard top-down assignment applies
        const multiCm = new CombatManagerRedux();
        multiCm.initializeCombat({
            crew: [
                { id: 'p1', name: 'Knight', stats: { hp: 100 } },
                { id: 'p2', name: 'Mage', stats: { hp: 80 } }
            ],
            monster: { id: 'm1', name: 'Goblin', stats: { hp: 50 } }
        });
        expect(multiCm.combatants.p1.coordinates).toEqual({ x: 0, y: 0 });
        expect(multiCm.combatants.p2.coordinates).toEqual({ x: 0, y: 1 });
    });

    test('Rule 11: Single opponent unit in PvP spawns in center-back position (row 2)', () => {
        const pvpCm = new CombatManagerRedux();
        pvpCm.initializeCombat({
            isPvP: true,
            crew: [{ id: 'p1', name: 'Knight', stats: { hp: 100 } }],
            opponentCrew: [{ id: 'op1', name: 'Enemy Knight', stats: { hp: 100 } }]
        });
        expect(pvpCm.combatants.op1.coordinates).toEqual({ x: 7, y: 2 });
    });

    test('Rule 12: Diagonal movement commands update manualDestination diagonally', () => {
        cm.setSelectedFighter(cm.combatants.soldier_1);
        cm.combatants.soldier_1.coordinates = { x: 4, y: 3 };
        cm.combatants.soldier_1.manualDestination = null;

        cm.moveFighterOneSpace('up-left');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 3, y: 2 });

        cm.moveFighterOneSpace('down-right');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 4, y: 3 });

        cm.moveFighterOneSpace('up-right');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 5, y: 2 });

        cm.moveFighterOneSpace('down-left');
        expect(cm.combatants.soldier_1.manualDestination).toEqual({ x: 4, y: 3 });
    });
});
