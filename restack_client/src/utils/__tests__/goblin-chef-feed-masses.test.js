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

    test('Goblin Chef hangs back at backline when no friendly is damaged', () => {
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

        // Chef should move back towards MAX_DEPTH (7)
        expect(cm.combatants.chef.coordinates.x).toBeGreaterThan(5);
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
                cooldowns: { bite: 0 },
                movesTakenThisRound: 0,
            },
            adjacentEnemy: {
                id: 'adjacentEnemy',
                name: 'Hero',
                isMonster: false,
                hp: 100,
                starting_hp: 100,
                stats: { speed: 0, dex: 0, hp: 100 },
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

    test('Monster below 80% HP prioritizes moving towards a meat tile', () => {
        const cm = new CombatManagerRedux();
        // Meat tile at (4, 3)
        cm.meatTiles = [{ id: 'meat_food', x: 4, y: 3 }];
        cm.combatants = {
            goblin: {
                id: 'goblin',
                name: 'Wounded Goblin',
                type: 'goblin_warrior',
                isMonster: true,
                hp: 15, // < 80% of 30 max HP
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
        expect(cm.combatants.goblin.hp).toBeGreaterThan(15);
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

    test('Goblin Chef respects 3 food item max cap and switches to aggressive melee mode', () => {
        const cm = new CombatManagerRedux();
        // Pre-fill 3 active meat tiles created by this chef
        cm.meatTiles = [
            { id: 'meat_1', x: 5, y: 0, createdBy: 'chef' },
            { id: 'meat_2', x: 5, y: 4, createdBy: 'chef' },
            { id: 'meat_3', x: 6, y: 0, createdBy: 'chef' },
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

        // Chef executes AI with 3 active food tiles
        cm.executeUnitAI(cm.combatants.chef);

        // Chef cannot throw a 4th food item (meatTiles remains 3)
        expect(cm.meatTiles.length).toBe(3);
        // Chef should advance in aggressive melee mode towards player (x < 7)
        expect(cm.combatants.chef.coordinates.x).toBeLessThan(7);
    });

    test('Goblin Chef reverts to food-provider mode once a food item is consumed', () => {
        const cm = new CombatManagerRedux();
        // 3 food items initially
        cm.meatTiles = [
            { id: 'meat_1', x: 5, y: 0, createdBy: 'chef' },
            { id: 'meat_2', x: 5, y: 4, createdBy: 'chef' },
            { id: 'meat_3', x: 6, y: 0, createdBy: 'chef' },
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

        // Simulate 1 food item being consumed (removed from meatTiles)
        cm.meatTiles = cm.meatTiles.filter(m => m.id !== 'meat_3');
        expect(cm.meatTiles.length).toBe(2);

        // Chef executes AI with 2 active food tiles
        cm.executeUnitAI(cm.combatants.chef);

        // Chef reverts to food-provider mode and lobs a new 3rd food tile!
        expect(cm.meatTiles.length).toBe(3);
        expect(cm.combatants.chef.cooldowns['feed_the_masses']).toBe(2);
    });
});
