import { CombatManagerRedux } from '../combat-manager-redux';
import skillsMatrix from '../skills-matrix';
import { MonsterManager } from '../monster-manager';

describe('Goblin Chef & Feed the Masses', () => {
    test('feed_the_masses skill configuration', () => {
        const skill = skillsMatrix['feed_the_masses'];
        expect(skill).toBeDefined();
        expect(skill.cooldown).toBe(2);
        expect(skill.initialCooldown).toBe(2);
        expect(skill.range).toBe('medium');
    });

    test('goblin_chef monster definition includes feed_the_masses and bite', () => {
        const mm = new MonsterManager();
        const chefDef = mm.monsters.goblin_chef;
        expect(chefDef).toBeDefined();
        expect(chefDef.skills).toContain('feed_the_masses');
        expect(chefDef.skills).toContain('bite');
    });

    test('Goblin Chef advances to attack when all friendlies are near full HP', () => {
        const cm = new CombatManagerRedux();
        cm.combatants = {
            chef: {
                id: 'chef',
                name: 'Goblin Chef',
                type: 'goblin_chef',
                isMonster: true,
                hp: 40,
                starting_hp: 40,
                stats: { speed: 11, hp: 40 },
                coordinates: { x: 5, y: 2 },
                skills: ['feed_the_masses', 'bite'],
                cooldowns: { feed_the_masses: 0 },
                movesTakenThisRound: 0,
            },
            goblin: {
                id: 'goblin',
                name: 'Goblin Warrior',
                type: 'goblin_warrior',
                isMonster: true,
                hp: 30,
                starting_hp: 30,
                stats: { speed: 10, hp: 30 },
                coordinates: { x: 4, y: 2 },
            },
            player: {
                id: 'player',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 0, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.chef);

        // Chef switches to attacking mode because friendlies are at full HP, advancing towards player (x < 5)
        expect(cm.combatants.chef.coordinates.x).toBeLessThan(5);
    });

    test('Goblin Chef uses feed_the_masses when a friendly loses >= 10% HP', () => {
        const cm = new CombatManagerRedux();
        cm.combatants = {
            chef: {
                id: 'chef',
                name: 'Goblin Chef',
                type: 'goblin_chef',
                isMonster: true,
                hp: 40,
                starting_hp: 40,
                stats: { speed: 11, hp: 40 },
                coordinates: { x: 7, y: 2 },
                skills: ['feed_the_masses', 'bite'],
                cooldowns: { feed_the_masses: 0 },
                movesTakenThisRound: 0,
            },
            woundedGoblin: {
                id: 'woundedGoblin',
                name: 'Wounded Goblin',
                type: 'goblin_warrior',
                isMonster: true,
                hp: 20, // 10 damaged out of 30 starting_hp (>= 10%)
                starting_hp: 30,
                stats: { speed: 10, hp: 30 },
                coordinates: { x: 5, y: 2 },
            },
            player: {
                id: 'player',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 0, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.chef);

        expect(cm.meatTiles.length).toBe(1);
        expect(cm.combatants.chef.cooldowns['feed_the_masses']).toBe(2);
    });

    test('Monster unit steps on meat tile and recovers up to 30 HP', () => {
        const cm = new CombatManagerRedux();
        cm.meatTiles = [{ id: 'meat_1', x: 5, y: 2 }];
        cm.combatants = {
            wounded: {
                id: 'wounded',
                name: 'Wounded Monster',
                isMonster: true,
                hp: 20,
                starting_hp: 50,
                stats: { speed: 10, hp: 50 },
                coordinates: { x: 4, y: 2 },
            }
        };

        cm.updateUnitCoordinates(cm.combatants.wounded, 5, 2);

        expect(cm.combatants.wounded.hp).toBe(50); // 20 + 30 = 50 (capped at max 50)
        expect(cm.meatTiles.length).toBe(0); // Meat consumed
    });

    test('Goblin Chef uses bite when an enemy is adjacent', () => {
        const cm = new CombatManagerRedux();
        cm.combatants = {
            chef: {
                id: 'chef',
                name: 'Goblin Chef',
                type: 'goblin_chef',
                isMonster: true,
                hp: 40,
                starting_hp: 40,
                stats: { speed: 11, hp: 40, atk: 10 },
                coordinates: { x: 2, y: 2 },
                skills: ['feed_the_masses', 'bite'],
                cooldowns: { feed_the_masses: 2, bite: 0 },
                movesTakenThisRound: 0,
            },
            adjacentEnemy: {
                id: 'adjacentEnemy',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 0, dex: 0, hp: 100, def: 0 },
                coordinates: { x: 1, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.chef);

        // Enemy HP should decrease due to bite / basic attack
        expect(cm.combatants.adjacentEnemy.hp).toBeLessThan(100);
    });

    test('feed_the_masses targets an empty tile without food when primary adjacent tile has food', () => {
        const cm = new CombatManagerRedux();
        // Place existing meat at (6, 2)
        cm.meatTiles = [{ id: 'meat_existing', x: 6, y: 2 }];
        cm.combatants = {
            chef: {
                id: 'chef',
                name: 'Goblin Chef',
                type: 'goblin_chef',
                isMonster: true,
                hp: 40,
                starting_hp: 40,
                stats: { speed: 11, hp: 40 },
                coordinates: { x: 7, y: 2 },
                skills: ['feed_the_masses', 'bite'],
                cooldowns: { feed_the_masses: 0 },
                movesTakenThisRound: 0,
            },
            woundedGoblin: {
                id: 'woundedGoblin',
                name: 'Wounded Goblin',
                type: 'goblin_warrior',
                isMonster: true,
                hp: 20,
                starting_hp: 30,
                stats: { speed: 10, hp: 30 },
                coordinates: { x: 5, y: 2 },
            },
            player: {
                id: 'player',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 0, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.chef);

        expect(cm.meatTiles.length).toBe(2);
        const newMeat = cm.meatTiles.find(m => m.id !== 'meat_existing');
        expect(newMeat).toBeDefined();
        // New meat should NOT be at (6, 2)
        expect(newMeat.x !== 6 || newMeat.y !== 2).toBe(true);
    });

    test('Monster below 40% HP prioritizes moving towards a meat tile (even if backward)', () => {
        const cm = new CombatManagerRedux();
        // Meat tile at (4, 3)
        cm.meatTiles = [{ id: 'meat_food', x: 4, y: 3 }];
        cm.combatants = {
            goblin: {
                id: 'goblin',
                name: 'Wounded Goblin',
                type: 'goblin_warrior',
                isMonster: true,
                hp: 10, // < 40% of 30 max HP (badly hurt)
                starting_hp: 30,
                stats: { speed: 10, hp: 30 },
                coordinates: { x: 4, y: 2 },
                movesTakenThisRound: 0,
            },
            enemy: {
                id: 'enemy',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 1, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.goblin);

        // Goblin should move to (4, 3) where food is, and consume it!
        expect(cm.combatants.goblin.hp).toBeGreaterThan(10);
        expect(cm.meatTiles.length).toBe(0);
    });

    test('Goblin Chef advances and bites when no other friendly units are alive', () => {
        const cm = new CombatManagerRedux();
        cm.combatants = {
            chef: {
                id: 'chef',
                name: 'Goblin Chef',
                type: 'goblin_chef',
                isMonster: true,
                hp: 40,
                starting_hp: 40,
                stats: { speed: 11, hp: 40 },
                coordinates: { x: 7, y: 2 },
                skills: ['feed_the_masses', 'bite'],
                cooldowns: { feed_the_masses: 0, bite: 0 },
                movesTakenThisRound: 0,
            },
            player: {
                id: 'player',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 2, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.chef);

        // Chef should advance from column 7 towards player at column 2 (x < 7)
        expect(cm.combatants.chef.coordinates.x).toBeLessThan(7);
    });

    test('Goblin Chef respects 2 food item board cap and switches to aggressive melee mode', () => {
        const cm = new CombatManagerRedux();
        // Pre-fill 2 active meat tiles on the board
        cm.meatTiles = [
            { id: 'meat_1', x: 5, y: 0, createdBy: 'chef' },
            { id: 'meat_2', x: 5, y: 4, createdBy: 'chef' },
        ];
        cm.combatants = {
            chef: {
                id: 'chef',
                name: 'Goblin Chef',
                type: 'goblin_chef',
                isMonster: true,
                hp: 40,
                starting_hp: 40,
                stats: { speed: 11, hp: 40 },
                coordinates: { x: 7, y: 2 },
                skills: ['feed_the_masses', 'bite'],
                cooldowns: { feed_the_masses: 0, bite: 0 },
                movesTakenThisRound: 0,
            },
            woundedWarrior: {
                id: 'woundedWarrior',
                name: 'Wounded Warrior',
                type: 'goblin_warrior',
                isMonster: true,
                hp: 10,
                starting_hp: 30,
                stats: { speed: 10, hp: 30 },
                coordinates: { x: 5, y: 2 },
            },
            player: {
                id: 'player',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 2, y: 2 },
            }
        };

        // Chef executes AI with 2 active food tiles on board
        cm.executeUnitAI(cm.combatants.chef);

        // Chef cannot throw a 3rd food item when 2+ food items exist on board (meatTiles remains 2)
        expect(cm.meatTiles.length).toBe(2);
        // Chef should advance in aggressive melee mode towards player (x < 7)
        expect(cm.combatants.chef.coordinates.x).toBeLessThan(7);
    });

    test('Goblin Chef does not lob food when friendly unit is near full HP (>= 85%)', () => {
        const cm = new CombatManagerRedux();
        cm.meatTiles = [];
        cm.combatants = {
            chef: {
                id: 'chef',
                name: 'Goblin Chef',
                type: 'goblin_chef',
                isMonster: true,
                hp: 40,
                starting_hp: 40,
                stats: { speed: 11, hp: 40 },
                coordinates: { x: 7, y: 2 },
                skills: ['feed_the_masses', 'bite'],
                cooldowns: { feed_the_masses: 0, bite: 0 },
                movesTakenThisRound: 0,
            },
            healthyWarrior: {
                id: 'healthyWarrior',
                name: 'Healthy Warrior',
                type: 'goblin_warrior',
                isMonster: true,
                hp: 27, // 27/30 = 90% HP (>= 85%, near full HP)
                starting_hp: 30,
                stats: { speed: 10, hp: 30 },
                coordinates: { x: 5, y: 2 },
            },
            player: {
                id: 'player',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 2, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.chef);

        // Chef does not lob food (meatTiles remains 0) and switches to attacking
        expect(cm.meatTiles.length).toBe(0);
        expect(cm.combatants.chef.coordinates.x).toBeLessThan(7);
    });

    test('Monster with >= 40% HP will NOT move backwards away from target enemy to get food', () => {
        const cm = new CombatManagerRedux();
        // Meat tile behind monster at x=6, y=2 (enemy is at x=0, y=2, monster is at x=4, y=2)
        cm.meatTiles = [{ id: 'meat_behind', x: 6, y: 2 }];
        cm.combatants = {
            warchief: {
                id: 'warchief',
                name: 'Goblin Warchief',
                type: 'goblin_warchief',
                isMonster: true,
                hp: 60, // 60/100 = 60% HP (>= 40%)
                starting_hp: 100,
                stats: { speed: 10, hp: 100 },
                coordinates: { x: 4, y: 2 },
                movesTakenThisRound: 0,
            },
            enemy: {
                id: 'enemy',
                name: 'Wizard',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 0, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.warchief);

        // Warchief should NOT move backwards to x=5 to get meat. It should move forward towards enemy at x=0 (x < 4).
        expect(cm.combatants.warchief.coordinates.x).toBeLessThan(4);
        expect(cm.meatTiles.length).toBe(1); // Meat remains unconsumed
    });

    test('Monster with < 40% HP WILL move backwards away from target enemy to get food', () => {
        const cm = new CombatManagerRedux();
        // Meat tile behind monster at x=5, y=2 (enemy is at x=0, y=2, monster is at x=4, y=2)
        cm.meatTiles = [{ id: 'meat_behind', x: 5, y: 2 }];
        cm.combatants = {
            warchief: {
                id: 'warchief',
                name: 'Goblin Warchief',
                type: 'goblin_warchief',
                isMonster: true,
                hp: 30, // 30/100 = 30% HP (< 40%)
                starting_hp: 100,
                stats: { speed: 10, hp: 100 },
                coordinates: { x: 4, y: 2 },
                movesTakenThisRound: 0,
            },
            enemy: {
                id: 'enemy',
                name: 'Wizard',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 8, hp: 100 },
                coordinates: { x: 0, y: 2 },
            }
        };

        cm.executeUnitAI(cm.combatants.warchief);

        // Warchief is badly hurt (<40% HP) so it moves backwards to x=5 to get meat!
        expect(cm.combatants.warchief.hp).toBe(60); // Healed by meat!
        expect(cm.meatTiles.length).toBe(0);
    });
});
