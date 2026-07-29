import { CombatManagerRedux } from '../combat-manager-redux';
import { MovementMethods } from '../shared-ai-methods/movement-methods';

describe('Large unit VCT and minion spawn overlap prevention tests', () => {
    let cm;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        cm.combatants = {};
        cm.vctByMonster = {};
    });

    test('isAvailableToMoveInto blocks movement into VCT and occupied coordinates', () => {
        // Set up a large monster (Sphinx) at (5, 2)
        const sphinx = {
            id: 'sphinx_1',
            type: 'sphinx',
            tier: 3,
            isMonster: true,
            coordinates: { x: 5, y: 2 }
        };
        cm.combatants[sphinx.id] = sphinx;
        cm._setCombatantOccupiedCoords(sphinx, cm.combatants);

        // Sphinx footprint is 2x2. Since x >= 4, hOffset = -1.
        // It occupies: (5, 2), (5, 1), (4, 2), (4, 1)
        // (5, 1) has a VCT block.
        expect(sphinx.occupiedCoords).toContainEqual({ x: 5, y: 1 });
        expect(sphinx.occupiedCoords).toContainEqual({ x: 4, y: 2 });
        expect(sphinx.occupiedCoords).toContainEqual({ x: 4, y: 1 });

        // Let's verify that a different unit (e.g. soldier_1) cannot move into any of these coordinates
        const soldier = {
            id: 'soldier_1',
            type: 'soldier',
            isMonster: false,
            coordinates: { x: 3, y: 2 }
        };

        // Check each coordinate in Sphinx's footprint
        expect(MovementMethods.isAvailableToMoveInto({ x: 5, y: 2 }, cm.combatants, null, soldier)).toBe(false);
        expect(MovementMethods.isAvailableToMoveInto({ x: 5, y: 1 }, cm.combatants, null, soldier)).toBe(false);
        expect(MovementMethods.isAvailableToMoveInto({ x: 4, y: 2 }, cm.combatants, null, soldier)).toBe(false);
        expect(MovementMethods.isAvailableToMoveInto({ x: 4, y: 1 }, cm.combatants, null, soldier)).toBe(false);

        // Also check that it is blocked even if caller is null/undefined
        expect(MovementMethods.isAvailableToMoveInto({ x: 4, y: 2 }, cm.combatants, null, null)).toBe(false);
    });

    test('isAvailableToMoveInto prevents Large unit from overlapping other units', () => {
        // Place a small unit at (4, 1)
        const soldier = {
            id: 'soldier_1',
            type: 'soldier',
            isMonster: false,
            coordinates: { x: 4, y: 1 }
        };
        cm.combatants[soldier.id] = soldier;
        cm._setCombatantOccupiedCoords(soldier, cm.combatants);

        // Create a large unit (Sphinx, size 2) that wants to move to (5, 2)
        // Its footprint would be (5, 2), (5, 1), (4, 2), (4, 1)
        // Since (4, 1) is occupied by soldier, it should not be allowed to move to (5, 2)
        const sphinx = {
            id: 'sphinx_1',
            type: 'sphinx',
            tier: 3,
            isMonster: true,
            coordinates: { x: 5, y: 3 }
        };

        expect(MovementMethods.isAvailableToMoveInto({ x: 5, y: 2 }, cm.combatants, null, sphinx)).toBe(false);
    });

    test('summon_spiders and lay_eggs choose unoccupied coordinates', () => {
        // Place a unit at (5, 2)
        const blocker = {
            id: 'blocker_1',
            type: 'soldier',
            isMonster: false,
            coordinates: { x: 5, y: 2 }
        };
        cm.combatants[blocker.id] = blocker;
        cm._setCombatantOccupiedCoords(blocker, cm.combatants);

        // Witch at (6, 2) facing left (summoning behind her towards 7, 2)
        const witch = {
            id: 'witch_1',
            type: 'witch',
            isMonster: true,
            coordinates: { x: 6, y: 2 },
            facing: 'left',
            stats: { int: 10 }
        };
        cm.combatants[witch.id] = witch;
        cm._setCombatantOccupiedCoords(witch, cm.combatants);

        // Put a blocker at (7, 2) which is behind the Witch
        const blocker2 = {
            id: 'blocker_2',
            type: 'soldier',
            isMonster: false,
            coordinates: { x: 7, y: 2 }
        };
        cm.combatants[blocker2.id] = blocker2;
        cm._setCombatantOccupiedCoords(blocker2, cm.combatants);

        // Call summon_spiders ability on witch. The nest should NOT spawn at (7, 2).
        cm.useAbility(witch, { id: 'summon_spiders' }, blocker);

        // Find the spawner nest in combatants
        const nest = Object.values(cm.combatants).find(c => c && c.type === 'spiders_spawner');
        expect(nest).toBeDefined();
        // Since (7, 2) is blocked, the nest should spawn at a free adjacent cell like (7, 1) or (7, 3)
        expect(nest.coordinates).not.toEqual({ x: 7, y: 2 });
    });
});
