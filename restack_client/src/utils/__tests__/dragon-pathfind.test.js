import { MonsterManager } from '../monster-manager';
import { CombatManagerRedux } from '../combat-manager-redux';

describe('Dragon Pathfinding Obstacle Avoidance', () => {
  test('Dragon should pathfind around a summoned egg instead of oscillating or getting stuck', () => {
    const mm = new MonsterManager();
    const dragonTemplate = mm.getMonster('dragon');

    const cm = new CombatManagerRedux();

    // Create a target fighter at (0, 2)
    const fighterData = {
      id: 'fighter_1',
      name: 'Test Fighter',
      type: 'fighter',
      stats: { hp: 100, atk: 10, def: 5, speed: 6, vitality: 50 },
      skills: ['slash'],
      inventory: [],
      coordinates: { x: 0, y: 2 }
    };

    // Create a blocking egg minion at (4, 2)
    const eggData = {
      id: 'dragon_egg_1',
      name: 'Dragon Egg',
      type: 'dragon_egg',
      isMonster: true,
      isMinion: true,
      stats: { hp: 50, atk: 0, def: 5, speed: 1 },
      coordinates: { x: 4, y: 2 }
    };

    // Initialize combat
    cm.initializeCombat({
      crew: [fighterData],
      monster: {
        ...dragonTemplate,
        coordinates: { x: 7, y: 2 }
      },
      minions: [eggData]
    });

    const fighter = Object.values(cm.combatants).find(c => c.type === 'fighter');
    const egg = Object.values(cm.combatants).find(c => c.type === 'dragon_egg');
    const dragon = Object.values(cm.combatants).find(c => c.type === 'dragon');

    expect(fighter).toBeDefined();
    expect(egg).toBeDefined();
    expect(dragon).toBeDefined();

    // Explicitly set coordinates & sync occupiedCoords to be absolutely sure
    fighter.coordinates = { x: 0, y: 2 };
    cm._setCombatantOccupiedCoords(fighter);

    egg.coordinates = { x: 4, y: 2 };
    cm._setCombatantOccupiedCoords(egg);

    dragon.coordinates = { x: 7, y: 2 };
    cm._setCombatantOccupiedCoords(dragon, cm.combatants);

    // Make sure we have 0 moves taken
    dragon.movesTakenThisRound = 0;
    dragon.actionsTakenThisRound = 0;

    // Verify initial Dragon occupied coordinates
    // Dragon is huge (3x3), anchored at (7, 2).
    // Columns occupied: 7, 6, 5 (hOffset is -1 since 7 >= 4)
    // Lanes occupied: 2, 1, 0 (y, y-1, y-2)
    expect(dragon.occupiedCoords).toContainEqual({ x: 7, y: 2 });
    expect(dragon.occupiedCoords).toContainEqual({ x: 7, y: 1 });
    expect(dragon.occupiedCoords).toContainEqual({ x: 7, y: 0 });
    expect(dragon.occupiedCoords).toContainEqual({ x: 6, y: 2 });
    expect(dragon.occupiedCoords).toContainEqual({ x: 5, y: 2 });

    // Step 1: Dragon at (7, 2) moves closer to Fighter at (0, 2)
    // Pathfind should avoid the egg at (4, 2).
    // Moving directly left to (6, 2) would put column 4 (occupied by Dragon at column 4) at lane 2,
    // which overlaps the egg at (4, 2). So it is blocked.
    // Neighbors: (7, 3) is the only valid step.
    cm.moveCloser(dragon, fighter);

    expect(dragon.coordinates.x).toBe(7);
    expect(dragon.coordinates.y).toBe(3);

    // Reset moves for the next step simulation
    dragon.movesTakenThisRound = 0;

    // Step 2: From (7, 3), greedy pathfinding would step back to (7, 2) because it wants to correct X,
    // fails to go to (6, 3) (overlaps egg at column 4, lane 2), and falls back to Y correction (which is back to 2).
    // BFS pathfinding should step to (7, 4) to continue moving around the egg.
    cm.moveCloser(dragon, fighter);

    expect(dragon.coordinates.x).toBe(7);
    expect(dragon.coordinates.y).toBe(4);

    // Reset moves
    dragon.movesTakenThisRound = 0;

    // Step 3: From (7, 4), it should step to (7, 5) or (6, 5) depending on path distance.
    // At (7, 5) columns are 7, 6, 5, lanes are 5, 4, 3.
    // Let's call moveCloser again and see where it goes.
    cm.moveCloser(dragon, fighter);

    // It should have moved to y >= 4 (either 5 or 4), not back to 3 or 2
    expect(dragon.coordinates.y).toBeGreaterThanOrEqual(4);
  });
});
