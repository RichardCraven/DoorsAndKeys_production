jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Player Queued Skill Range Priority', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();
    cm.wakeSleepingTarget = jest.fn();
    cm.canFitAt = jest.fn().mockReturnValue(true);
    cm.isUnitInWeb = jest.fn().mockReturnValue(false);
  });

  const setupTest = (wizardCoords, targetCoords) => {
    const wizard = {
      id: 'wizard_unit',
      name: 'Wizard',
      type: 'wizard',
      coordinates: wizardCoords,
      stats: { int: 10, speed: 5, dex: 5, def: 5, hp: 100 },
      isMonster: false,
      activeBuffs: [],
      specials: ['magic_missile'],
      attacks: [],
      cooldowns: {},
      movesTakenThisRound: 0,
      queuedSkill: 'magic_missile',
      queuedSkillTargetId: 'target_unit'
    };

    const target = {
      id: 'target_unit',
      name: 'Goblin',
      type: 'goblin',
      coordinates: targetCoords,
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: true,
      hp: 100,
      activeBuffs: [],
      damageIndicators: []
    };

    cm.combatants = {
      [wizard.id]: wizard,
      [target.id]: target
    };

    return { wizard, target };
  };

  test('Queued skill fires immediately if target is in range', () => {
    // Magic Missile has 'far' range (limit 5). Target at distance 5 is in range.
    const { wizard, target } = setupTest({ x: 0, y: 0 }, { x: 5, y: 0 });

    cm.executeUnitAI(wizard);

    expect(wizard.queuedSkill).toBeNull();
    expect(wizard.queuedSkillTargetId).toBeNull();
    expect(wizard.attacking).toBe(true);
  });

  test('Queued skill triggers movement first if target is out of range', () => {
    // Target at distance 6 is out of range. Moving to (1, 0) brings distance to 5, which is in range.
    const { wizard, target } = setupTest({ x: 0, y: 0 }, { x: 6, y: 0 });

    cm.getPathfindNextStep = jest.fn().mockReturnValue({ x: 1, y: 0 });

    cm.executeUnitAI(wizard);

    expect(wizard.coordinates).toEqual({ x: 1, y: 0 });
    expect(wizard.movesTakenThisRound).toBe(1);
    expect(wizard.queuedSkill).toBeNull();
    expect(wizard.queuedSkillTargetId).toBeNull();
    expect(wizard.attacking).toBe(true);
  });

  test('Queued skill remains queued if still out of range after moving', () => {
    // Target at distance 7 is out of range. Moving to (1, 0) brings distance to 6, which is still out of range.
    const { wizard, target } = setupTest({ x: 0, y: 0 }, { x: 7, y: 0 });

    cm.getPathfindNextStep = jest.fn().mockReturnValue({ x: 1, y: 0 });

    cm.executeUnitAI(wizard);

    expect(wizard.coordinates).toEqual({ x: 1, y: 0 });
    expect(wizard.movesTakenThisRound).toBe(1);
    expect(wizard.queuedSkill).toBe('magic_missile');
    expect(wizard.queuedSkillTargetId).toBe('target_unit');
    expect(wizard.attacking).toBeFalsy();
  });
});
