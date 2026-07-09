import { MonsterManager } from '../monster-manager';
import { CombatManagerRedux } from '../combat-manager-redux';

describe('Wraith Blocked Pathfinding Target Switch', () => {
  test('Wraith should switch target after failing to pathfind for 3 turns', () => {
    const mm = new MonsterManager();
    const wraithTemplate = mm.getMonster('wraith');

    const cm = new CombatManagerRedux();

    // Create target 1 (Monk) at (1, 0)
    const monkData = {
      id: 'monk_1',
      name: 'Test Monk',
      type: 'monk',
      stats: { hp: 100, atk: 10, def: 5, speed: 6, vitality: 50 },
      skills: ['claw_strike'],
      inventory: [],
      coordinates: { x: 1, y: 0 }
    };

    // Create target 2 (Barbarian) at (0, 3)
    const barbarianData = {
      id: 'barbarian_1',
      name: 'Test Barbarian',
      type: 'barbarian',
      stats: { hp: 100, atk: 10, def: 5, speed: 6, vitality: 50 },
      skills: ['slash'],
      inventory: [],
      coordinates: { x: 0, y: 3 }
    };

    // Create blocking units to completely block Monk's zone {(1,0), (0,0)} from the rest of the board.
    // Neighbors of {(1,0), (0,0)} are (2,0), (1,1), and (0,1).
    // Blocking these three tiles along with (2,1) ensures Monk is unreachable while Barbarian is open.
    const shadeData1 = {
      id: 'shade_1',
      name: 'Test Shade 1',
      type: 'shade',
      isMonster: true,
      isMinion: true,
      stats: { hp: 50, atk: 5, def: 5, speed: 8 },
      coordinates: { x: 2, y: 1 }
    };

    const shadeData2 = {
      id: 'shade_2',
      name: 'Test Shade 2',
      type: 'shade',
      isMonster: true,
      isMinion: true,
      stats: { hp: 50, atk: 5, def: 5, speed: 8 },
      coordinates: { x: 2, y: 0 }
    };

    const shadeData3 = {
      id: 'shade_3',
      name: 'Test Shade 3',
      type: 'shade',
      isMonster: true,
      isMinion: true,
      stats: { hp: 50, atk: 5, def: 5, speed: 8 },
      coordinates: { x: 1, y: 1 }
    };

    const shadeData4 = {
      id: 'shade_4',
      name: 'Test Shade 4',
      type: 'shade',
      isMonster: true,
      isMinion: true,
      stats: { hp: 50, atk: 5, def: 5, speed: 8 },
      coordinates: { x: 0, y: 1 }
    };

    // Initialize combat
    cm.initializeCombat({
      crew: [monkData, barbarianData],
      monster: {
        ...wraithTemplate,
        coordinates: { x: 3, y: 2 }
      },
      minions: [shadeData1, shadeData2, shadeData3, shadeData4]
    });

    const monk = Object.values(cm.combatants).find(c => c.type === 'monk');
    const barbarian = Object.values(cm.combatants).find(c => c.type === 'barbarian');
    const shade1 = Object.values(cm.combatants).find(c => c.id === 'shade_1');
    const shade2 = Object.values(cm.combatants).find(c => c.id === 'shade_2');
    const shade3 = Object.values(cm.combatants).find(c => c.id === 'shade_3');
    const shade4 = Object.values(cm.combatants).find(c => c.id === 'shade_4');
    const wraith = Object.values(cm.combatants).find(c => c.type === 'wraith');

    expect(monk).toBeDefined();
    expect(barbarian).toBeDefined();
    expect(shade1).toBeDefined();
    expect(shade2).toBeDefined();
    expect(shade3).toBeDefined();
    expect(shade4).toBeDefined();
    expect(wraith).toBeDefined();

    // Force exact coordinates and occupied coordinates
    monk.coordinates = { x: 1, y: 0 };
    cm._setCombatantOccupiedCoords(monk);

    barbarian.coordinates = { x: 0, y: 3 };
    cm._setCombatantOccupiedCoords(barbarian);

    shade1.coordinates = { x: 2, y: 1 };
    cm._setCombatantOccupiedCoords(shade1);

    shade2.coordinates = { x: 2, y: 0 };
    cm._setCombatantOccupiedCoords(shade2);

    shade3.coordinates = { x: 1, y: 1 };
    cm._setCombatantOccupiedCoords(shade3);

    shade4.coordinates = { x: 0, y: 1 };
    cm._setCombatantOccupiedCoords(shade4);

    wraith.coordinates = { x: 3, y: 2 };
    cm._setCombatantOccupiedCoords(wraith);

    // Force movesTakenThisRound and actionsTakenThisRound to be 0 for test executions
    wraith.movesTakenThisRound = 0;
    wraith.actionsTakenThisRound = 0;

    // First Turn: Wraith targets Monk, moves closer to (3, 1) (distance: 4 -> 3)
    cm.executeUnitAI(wraith);
    expect(wraith.targetId).toBe('monk_1');
    expect(wraith.coordinates.x).toBe(3);
    expect(wraith.coordinates.y).toBe(1);
    expect(wraith._failedPathfindCount).toBe(0); // successfully moved closer

    // Reset round actions/moves
    wraith.movesTakenThisRound = 0;
    wraith.actionsTakenThisRound = 0;

    // Second Turn: Wraith targets Monk, cannot get closer than (3, 1) so it stays at (3, 1). Count = 1
    cm.executeUnitAI(wraith);
    expect(wraith.targetId).toBe('monk_1');
    expect(wraith.coordinates.x).toBe(3);
    expect(wraith.coordinates.y).toBe(1);
    expect(wraith._failedPathfindCount).toBe(1);

    // Reset round actions/moves
    wraith.movesTakenThisRound = 0;
    wraith.actionsTakenThisRound = 0;

    // Third Turn: Wraith targets Monk, stays at (3, 1). Count = 2
    cm.executeUnitAI(wraith);
    expect(wraith.targetId).toBe('monk_1');
    expect(wraith.coordinates.x).toBe(3);
    expect(wraith.coordinates.y).toBe(1);
    expect(wraith._failedPathfindCount).toBe(2);

    // Reset round actions/moves
    wraith.movesTakenThisRound = 0;
    wraith.actionsTakenThisRound = 0;

    // Fourth Turn: Wraith targets Monk, stays at (3, 1). Count = 3 (greater than 2). Switches targets!
    cm.executeUnitAI(wraith);
    expect(wraith.targetId).toBe('barbarian_1');
    expect(wraith._failedPathfindCount).toBe(0); // reset
    expect(wraith._excludedTargetIds).toContain('monk_1');

    // Reset round actions/moves
    wraith.movesTakenThisRound = 0;
    wraith.actionsTakenThisRound = 0;

    // Fifth Turn: Wraith targets Barbarian, moves closer towards (0, 3) (steps to (3, 2))
    cm.executeUnitAI(wraith);
    expect(wraith.coordinates.x).toBe(3);
    expect(wraith.coordinates.y).toBe(2);
    expect(wraith._failedPathfindCount).toBe(0); // reset since it moved
  });
});
