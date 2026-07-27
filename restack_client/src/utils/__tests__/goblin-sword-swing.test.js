import { CombatManagerRedux } from '../combat-manager-redux';
import { MonsterManager } from '../monster-manager';

describe('Goblin Warrior and Warchief Sword Swing Skillset', () => {
    test('Goblin Warrior monster definition includes sword_swing skill', () => {
        const mm = new MonsterManager();
        const warriorDef = mm.monsters['goblin_warrior'];
        expect(warriorDef).toBeDefined();
        expect(warriorDef.skills).toContain('sword_swing');
    });

    test('Goblin Warchief monster definition includes sword_swing skill', () => {
        const mm = new MonsterManager();
        const warchiefDef = mm.monsters['goblin_warchief'];
        expect(warchiefDef).toBeDefined();
        expect(warchiefDef.skills).toContain('sword_swing');
    });

    test('Goblin Warrior executes sword_swing skill in combat', () => {
        const cm = new CombatManagerRedux();
        cm.combatants = {
            warrior: {
                id: 'warrior',
                name: 'Goblin Warrior',
                type: 'goblin_warrior',
                isMonster: true,
                hp: 30,
                starting_hp: 30,
                stats: { speed: 10, hp: 30, atk: 8 },
                coordinates: { x: 2, y: 2 },
                skills: ['claw_strike', 'bite', 'sword_swing'],
                cooldowns: { sword_swing: 0, claw_strike: 10, bite: 10 },
                movesTakenThisRound: 0,
            },
            player: {
                id: 'player',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 0, dex: 0, hp: 100 },
                coordinates: { x: 1, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.warrior);

        // Enemy HP should decrease due to sword_swing attack
        expect(cm.combatants.player.hp).toBeLessThan(100);
        expect(cm.combatants.warrior.cooldowns['sword_swing']).toBeGreaterThan(0);
    });

    test('Goblin Warchief executes sword_swing skill in combat', () => {
        const cm = new CombatManagerRedux();
        cm.combatants = {
            warchief: {
                id: 'warchief',
                name: 'Goblin Warchief',
                type: 'goblin_warchief',
                isMonster: true,
                hp: 70,
                starting_hp: 70,
                stats: { speed: 11, hp: 70, atk: 12 },
                coordinates: { x: 2, y: 2 },
                skills: ['bite', 'sword_swing'],
                cooldowns: { sword_swing: 0, bite: 10 },
                movesTakenThisRound: 0,
            },
            player: {
                id: 'player',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 0, dex: 0, hp: 100 },
                coordinates: { x: 1, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.warchief);

        // Enemy HP should decrease due to sword_swing attack
        expect(cm.combatants.player.hp).toBeLessThan(100);
        expect(cm.combatants.warchief.cooldowns['sword_swing']).toBeGreaterThan(0);
    });
});
