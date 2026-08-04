import { CombatManagerRedux } from '../combat-manager-redux';

describe('Minion & Summoned Unit Power & Ultimate Exclusion Tests', () => {
    let cm;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        cm.combatants = {};
        cm.powerBoostTiles = [];
    });

    test('Summoned Imp on player side cannot gain power or trigger ultimate from damage or power boost tiles', () => {
        const wizard = {
            id: 'wizard_1',
            type: 'wizard',
            name: 'Zildjikan',
            isMonster: false,
            isMinion: false,
            power: 0,
            coordinates: { x: 0, y: 0 },
            hp: 20,
            starting_hp: 20
        };

        const imp = {
            id: 'imp_1',
            type: 'imp',
            name: 'Imp',
            isMinion: true,
            isMonster: false,
            summonedBy: 'wizard_1',
            power: 0,
            coordinates: { x: 2, y: 2 },
            hp: 15,
            starting_hp: 15
        };

        const monster = {
            id: 'monster_1',
            type: 'goblin',
            name: 'Goblin',
            isMonster: true,
            coordinates: { x: 5, y: 5 },
            hp: 30,
            starting_hp: 30
        };

        cm.combatants = { wizard_1: wizard, imp_1: imp, monster_1: monster };

        // Test 1: Imp dealing damage should NOT award power to the Imp
        cm._awardPower(imp, monster, 15);
        expect(imp.power).toBe(0);
        expect(imp.ultimateActive).toBeUndefined();

        // Test 2: Direct call to _triggerUltimate for an Imp should be rejected
        cm._triggerUltimate(imp);
        expect(imp.power).toBe(0);
        expect(imp.ultimateActive).toBeUndefined();

        // Test 3: Stepping on a Power Boost tile should NOT award power to the Imp
        cm.powerBoostTiles = [{ id: 'p1', x: 2, y: 2, roundSpawned: 1 }];
        cm._checkPowerBoostTilePickup();
        expect(imp.power).toBe(0);
        expect(imp.ultimateActive).toBeUndefined();
        // Power boost tile should remain uncollected because no valid PC stepped on it
        expect(cm.powerBoostTiles).toHaveLength(1);
    });

    test('Player character wizard DOES collect power boost tiles and gain ultimate', () => {
        const wizard = {
            id: 'wizard_1',
            type: 'wizard',
            name: 'Zildjikan',
            isMonster: false,
            isMinion: false,
            power: 10,
            coordinates: { x: 3, y: 3 },
            hp: 20,
            starting_hp: 20
        };

        cm.combatants = { wizard_1: wizard };
        cm.powerBoostTiles = [{ id: 'p2', x: 3, y: 3, roundSpawned: 1 }];
        cm._checkPowerBoostTilePickup();

        expect(wizard.power).toBe(100);
        expect(wizard.ultimateActive).toBe(true);
        expect(cm.powerBoostTiles).toHaveLength(0);
    });
});
