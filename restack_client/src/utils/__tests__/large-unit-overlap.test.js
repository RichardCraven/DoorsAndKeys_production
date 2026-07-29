import { CombatManagerRedux } from '../combat-manager-redux';

describe('Large unit occupancy and trial return tests', () => {
    let cm;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        cm.combatants = {};
        cm.vctByMonster = {};
    });

    test('removeCombatant deletes both _VCT and _VCT2 for huge monsters', () => {
        // Set up a huge monster (Sphinx, tier 4)
        const sphinx = {
            id: 'sphinx_1',
            type: 'sphinx',
            tier: 4,
            isMonster: true,
            coordinates: { x: 5, y: 2 }
        };
        cm.combatants[sphinx.id] = sphinx;
        cm._setCombatantOccupiedCoords(sphinx, cm.combatants);

        // Verify VCTs were spawned
        expect(cm.combatants['sphinx_1_VCT']).toBeDefined();
        expect(cm.combatants['sphinx_1_VCT2']).toBeDefined();

        // Remove Sphinx
        cm.removeCombatant('sphinx_1');

        // Verify both VCT entries are deleted
        expect(cm.combatants['sphinx_1_VCT']).toBeUndefined();
        expect(cm.combatants['sphinx_1_VCT2']).toBeUndefined();
        expect(cm.combatants['sphinx_1']).toBeUndefined();
    });

    test('_returnFromTrial avoids returning fighter to occupied coordinates', () => {
        const sphinx = {
            id: 'sphinx_1',
            type: 'sphinx',
            tier: 4,
            isMonster: true,
            coordinates: { x: 5, y: 2 }
        };
        cm.combatants[sphinx.id] = sphinx;
        cm._setCombatantOccupiedCoords(sphinx, cm.combatants);

        const fighter = {
            id: 'fighter_1',
            type: 'barbarian',
            isMonster: false,
            coordinates: { x: 4, y: 2 },
            preTrialCoordinates: { x: 4, y: 2 },
            inTrial: 0
        };
        cm.combatants[fighter.id] = fighter;

        // Return from trial
        cm._returnFromTrial(fighter);

        // Since (4, 2) is occupied by Sphinx extra coordinates, the returned fighter should end up elsewhere
        expect(fighter.coordinates.x).not.toBe(4);
        expect(fighter.coordinates).not.toEqual({ x: 4, y: 2 });

        // Let's verify that the new location was not occupied by the Sphinx
        const sphinxOccupiesDest = sphinx.occupiedCoords.some(c => c.x === fighter.coordinates.x && c.y === fighter.coordinates.y);
        expect(sphinxOccupiesDest).toBe(false);
    });
});
