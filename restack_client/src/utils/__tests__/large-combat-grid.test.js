import { CombatManagerRedux } from '../combat-manager-redux';
import { MAX_DEPTH, MAX_LANES } from '../shared-ai-methods/movement-methods';

describe('Large Combat Grid Tier', () => {
    let cm;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        cm.reset();
    });

    test('defaults to small 6x8 board when boardSize is unspecified or small', () => {
        const dummyCrew = [
            { id: 'c1', type: 'soldier', stats: { hp: 50, vitality: 30 } },
            { id: 'c2', type: 'ranger', stats: { hp: 40, vitality: 25 } }
        ];
        const dummyMonster = { id: 'm1', type: 'mummy', tier: 2, stats: { hp: 100 } };

        cm.initializeCombat({
            boardSize: 'small',
            crew: dummyCrew,
            monster: dummyMonster
        });

        expect(cm.boardSize).toBe('small');
        expect(cm.numColumns).toBe(8);
        expect(cm.numRows).toBe(6);
        expect(MAX_DEPTH).toBe(7);
        expect(MAX_LANES).toBe(6);

        // Monster placed on far right (x = 7)
        const monster = cm.getCombatant('m1');
        expect(monster).toBeDefined();
        expect(monster.coordinates.x).toBe(7);
    });

    test('initializes large 8x12 board when boardSize is large', () => {
        const dummyCrew = [
            { id: 'c1', type: 'soldier', stats: { hp: 50, vitality: 30 } },
            { id: 'c2', type: 'ranger', stats: { hp: 40, vitality: 25 } }
        ];
        const dummyMonster = { id: 'm1', type: 'mummy', tier: 2, stats: { hp: 100 } };

        cm.initializeCombat({
            boardSize: 'large',
            crew: dummyCrew,
            monster: dummyMonster
        });

        expect(cm.boardSize).toBe('large');
        expect(cm.numColumns).toBe(12);
        expect(cm.numRows).toBe(8);
        expect(MAX_DEPTH).toBe(11);
        expect(MAX_LANES).toBe(8);

        // Monster placed on far right of large grid (x = 11)
        const monster = cm.getCombatant('m1');
        expect(monster).toBeDefined();
        expect(monster.coordinates.x).toBe(11);

        // Crew placed within left bounds (x < 12, y < 8)
        const fighter = cm.getCombatant('c1');
        expect(fighter).toBeDefined();
        expect(fighter.coordinates.x).toBeLessThan(12);
        expect(fighter.coordinates.y).toBeLessThan(8);
    });

    test('reset restores default 6x8 grid bounds', () => {
        cm.initializeCombat({
            boardSize: 'large',
            crew: [{ id: 'c1', type: 'soldier', stats: { hp: 50 } }],
            monster: { id: 'm1', type: 'mummy', stats: { hp: 100 } }
        });

        expect(MAX_DEPTH).toBe(11);
        expect(MAX_LANES).toBe(8);

        cm.reset();

        expect(MAX_DEPTH).toBe(7);
        expect(MAX_LANES).toBe(6);
        expect(cm.numColumns).toBe(8);
    });
});
