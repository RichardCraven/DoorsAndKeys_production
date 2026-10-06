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
});
