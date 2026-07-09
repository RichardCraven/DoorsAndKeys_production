jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Magic Missile Proactive Evasion', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    
    cm.hitCheck = jest.fn().mockReturnValue(true); // Force base hit accuracy to be 100%
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();
    cm.wakeSleepingTarget = jest.fn();
  });

  const setupEvasionTest = () => {
    const wizard = {
      id: 'wizard_unit',
      name: 'Wizard',
      type: 'wizard',
      coordinates: { x: 0, y: 2 },
      stats: { int: 10, speed: 5, dex: 5, def: 5, hp: 100 },
      isMonster: false,
      activeBuffs: [],
      specials: ['magic_missile'],
      attacks: [],
      cooldowns: {}
    };

    const target = {
      id: 'target_unit',
      name: 'Mobile Goblin',
      type: 'goblin',
      coordinates: { x: 3, y: 2 },
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

    const ability = {
      id: 'magic_missile',
      name: 'Magic Missile',
      damage: 10,
      range: 'far',
      type: 'damage'
    };

    return { wizard, target, ability };
  };

  test('Magic Missile misses if target moves out of tile mid-flight', () => {
    const { wizard, target, ability } = setupEvasionTest();

    jest.useFakeTimers();

    // Start casting magic missile
    cm.useAbility(wizard, ability, target);

    // Mid-flight: Target moves away to (4, 2) before the projectile strikes
    target.coordinates = { x: 4, y: 2 };

    // Resolve timers
    jest.runAllTimers();
    jest.useRealTimers();

    // Verify target health is unchanged (did not take any damage)
    expect(target.hp).toBe(100);

    // Verify combat logs contain miss entries
    const logs = cm.appendCombatLog.mock.calls.map(args => args[0]);
    expect(logs.some(l => l.includes('missed') || l.includes('miss'))).toBe(true);
  });

  test('Magic Missile hits normally if target stays in the same tile', () => {
    const { wizard, target, ability } = setupEvasionTest();

    jest.useFakeTimers();

    // Cast magic missile
    cm.useAbility(wizard, ability, target);

    // Target does not move. Resolve timers
    jest.runAllTimers();
    jest.useRealTimers();

    // Target should take damage
    expect(target.hp).toBeLessThan(100);

    // Verify combat logs report the damage hit
    const logs = cm.appendCombatLog.mock.calls.map(args => args[0]);
    expect(logs.some(l => l.includes('damage'))).toBe(true);
  });
});
