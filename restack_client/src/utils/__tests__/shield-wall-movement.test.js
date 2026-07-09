jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';
import { activeShieldWalls } from '../shared-ai-methods/movement-methods';

describe('Shield Wall Movement Block Tests for PC and Monster units', () => {
  let cm;
  let soldier;
  let monster;
  let liveSoldier;
  let liveMonster;

  beforeEach(() => {
    // Clear active shield walls before each test
    activeShieldWalls.splice(0, activeShieldWalls.length);

    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    soldier = {
      id: 'soldier_pc',
      name: 'Sardonis',
      type: 'soldier',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, int: 5, hp: 100 },
      coordinates: { x: 1, y: 1 }
    };

    monster = {
      id: 'goblin_monster',
      name: 'Goblin',
      type: 'goblin',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, hp: 100 },
      coordinates: { x: 5, y: 1 }
    };

    cm.initializeCombat({ crew: [soldier], monster: monster, minions: [] });
    liveSoldier = cm.getCombatant('soldier_pc');
    liveMonster = cm.getCombatant('goblin_monster');
  });

  test('without active shield wall, canFitAt returns true for adjacent moves', () => {
    const adjacentX = liveSoldier.coordinates.x + 1;
    const adjacentY = liveSoldier.coordinates.y;
    expect(cm.canFitAt(liveSoldier, adjacentX, adjacentY)).toBe(true);
  });

  test('with active shield wall, canFitAt returns false when a unit attempts to cross it', () => {
    // Force Sardonis' coordinates to (1, 1) and monster to (3, 1) to make the test absolute
    cm.updateUnitCoordinates(liveSoldier, 1, 1);
    cm.updateUnitCoordinates(liveMonster, 3, 1);

    // Activate shield wall on Sardonis at x=1, facing right (wall at x=2)
    liveSoldier.shieldWallActive = true;
    liveSoldier.facing = 'right';
    liveSoldier.hp = 100;
    
    cm.rebuildActiveShieldWalls();
    
    // Verify shield wall is registered at x=2
    expect(activeShieldWalls).toHaveLength(1);
    expect(activeShieldWalls[0].x).toBe(2);

    // PC unit at (1, 1) attempts to move to (2, 1) - should be blocked (false)
    expect(cm.canFitAt(liveSoldier, 2, 1)).toBe(false);

    // Monster unit at (3, 1) attempts to move to (1, 1) - should be blocked (false)
    expect(cm.canFitAt(liveMonster, 1, 1)).toBe(false);

    // Movement to a non-crossing tile (e.g. up or down on the same side) should still be allowed
    expect(cm.canFitAt(liveSoldier, 1, 2)).toBe(true);
    expect(cm.canFitAt(liveMonster, 3, 2)).toBe(true);
  });
});
