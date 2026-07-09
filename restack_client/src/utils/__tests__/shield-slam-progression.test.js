jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Shield Slam Progression and Balance', () => {
    let cm;
    let soldier;
    let enemy;
    let shieldSlamAbility;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        cm.updateData = jest.fn();
        cm.applyEnduranceCost = jest.fn();
        cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
        cm.hitCheck = jest.fn().mockReturnValue(true);
        cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
        cm.targetKilled = jest.fn();
        cm._processCriticalStrike = jest.fn((attacker, target, damage) => ({ damage, isCrit: false }));

        soldier = {
            id: 'soldier_1',
            name: 'Sardonis',
            type: 'soldier',
            isMonster: false,
            isMinion: false,
            dead: false,
            coordinates: { x: 0, y: 4 },
            hp: 100,
            starting_hp: 100,
            stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 10 },
            globalSkills: [{ key: 'shield_slam', level: 1 }],
            inventory: [],
            activeBuffs: [],
            activeDebuffs: []
        };

        enemy = {
            id: 'enemy_1',
            name: 'Witch',
            type: 'witch',
            isMonster: true,
            isMinion: false,
            dead: false,
            coordinates: { x: 1, y: 4 }, // Close range
            hp: 100,
            starting_hp: 100,
            stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 10 },
            activeBuffs: [],
            activeDebuffs: []
        };

        cm.combatants = { soldier_1: soldier, enemy_1: enemy };

        shieldSlamAbility = {
            id: 'shield_slam',
            name: 'Shield Slam',
            type: 'damage',
            range: 'close',
            atkPercentage: 100,
            effect: { type: 'stun', chance: 100, duration: 1 }
        };
    });

    test('Level 1 Shield Slam without Shield: standard damage & 1 round stun', () => {
        cm.useAbility(soldier, shieldSlamAbility, enemy);
        expect(enemy.hp).toBe(100 - 10); // Standard damage: 100% of 10 atk
        expect(enemy.stunned).toBe(true);
        expect(enemy.stunnedRounds).toBe(1);
    });

    test('Level 1 Shield Slam with Shield: double damage & 1 round stun', () => {
        soldier.inventory = [{ subtype: 'shield', equippedSlot: 'left' }];
        cm.useAbility(soldier, shieldSlamAbility, enemy);
        expect(enemy.hp).toBe(100 - 20); // Double damage: 200% of 10 atk
        expect(enemy.stunned).toBe(true);
        expect(enemy.stunnedRounds).toBe(1);
    });

    test('Level 2 Shield Slam with Shield: double damage & 3 rounds stun', () => {
        soldier.globalSkills[0].level = 2;
        soldier.inventory = [{ subtype: 'shield', equippedSlot: 'left' }];
        cm.useAbility(soldier, shieldSlamAbility, enemy);
        expect(enemy.hp).toBe(100 - 20); // Double damage
        expect(enemy.stunned).toBe(true);
        expect(enemy.stunnedRounds).toBe(3);
    });

    test('Level 3 Shield Slam with Shield: triple damage & 4 rounds stun', () => {
        soldier.globalSkills[0].level = 3;
        soldier.inventory = [{ subtype: 'shield', equippedSlot: 'left' }];
        cm.useAbility(soldier, shieldSlamAbility, enemy);
        expect(enemy.hp).toBe(100 - 30); // Triple damage: 300% of 10 atk
        expect(enemy.stunned).toBe(true);
        expect(enemy.stunnedRounds).toBe(4);
    });
});
