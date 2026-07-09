jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Chainbolt & Magic Missile Timing/Balance Tests', () => {
  test('greater_magic_missile 5th projectile has 50% less damage', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    const unit = {
      id: 'wizard_unit',
      name: 'Wizard',
      type: 'wizard',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, int: 0, hp: 100, atk: 10 },
      skills: ['greater_magic_missile'],
      coordinates: { x: 1, y: 1 }
    };

    const target = {
      id: 'target_unit',
      name: 'Goblin',
      type: 'goblin',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, hp: 100 },
      coordinates: { x: 5, y: 2 }
    };

    cm.initializeCombat({ crew: [unit], monster: target, minions: [] });

    const wizard = cm.getCombatant('wizard_unit');
    const abilitySpec = cm.resolveSpecial(wizard, 'greater_magic_missile');
    
    // Stub damage check to return raw value
    jest.spyOn(cm, 'damageCheck').mockImplementation((caller, tgt, dmg) => dmg);

    jest.useFakeTimers();
    cm.useAbility(wizard, abilitySpec, cm.getCombatant('target_unit'));

    // Fast-forward to run all missiles
    jest.runAllTimers();

    // Verify 5 hits were processed
    expect(cm.damageCheck).toHaveBeenCalledTimes(5);

    // Verify the damages checked
    const calls = cm.damageCheck.mock.calls;
    expect(calls[0][2]).toBe(10);
    expect(calls[1][2]).toBe(10);
    expect(calls[2][2]).toBe(10);
    expect(calls[3][2]).toBe(10);
    expect(calls[4][2]).toBe(5); // 50% damage reduction on last missile!

    jest.useRealTimers();
  });

  test('chainbolt staggered damage and death resolution timing', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    
    // Spy on targetKilled
    const targetKilledSpy = jest.spyOn(cm, 'targetKilled');

    const beholder = {
      id: 'beholder_boss',
      name: 'Beholder',
      type: 'beholder',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, int: 5, hp: 310, atk: 15 },
      skills: ['chainbolt'],
      coordinates: { x: 7, y: 2 }
    };

    const target1 = {
      id: 'player_1',
      name: 'Soldier',
      type: 'soldier',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, hp: 10 },
      coordinates: { x: 1, y: 1 }
    };

    const target2 = {
      id: 'player_2',
      name: 'Wizard',
      type: 'wizard',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, hp: 10 },
      coordinates: { x: 2, y: 3 }
    };

    cm.initializeCombat({ crew: [target1, target2], monster: beholder, minions: [] });

    const boss = cm.getCombatant('beholder_boss');
    const abilitySpec = cm.resolveSpecial(boss, 'chainbolt');

    jest.useFakeTimers();
    cm.useAbility(boss, abilitySpec, cm.getCombatant('player_1'));

    expect(targetKilledSpy).not.toHaveBeenCalled();
    expect(cm.getCombatant('player_1').hp).toBe(10);
    expect(cm.getCombatant('player_2').hp).toBe(10);

    jest.advanceTimersByTime(700);

    expect(cm.getCombatant('player_1').hp).toBe(0);
    expect(targetKilledSpy).toHaveBeenCalledTimes(1);
    expect(cm.getCombatant('player_2').hp).toBe(10);

    jest.advanceTimersByTime(700);

    expect(cm.getCombatant('player_2').hp).toBe(0);
    expect(targetKilledSpy).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  test('beholder prioritizes displacement_ray when there are melee attackers adjacent to it', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    
    // Spy on useAbility
    const useAbilitySpy = jest.spyOn(cm, 'useAbility');

    const beholder = {
      id: 'beholder_boss',
      name: 'Beholder',
      type: 'beholder',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, int: 5, hp: 310, atk: 15 },
      skills: ['displacement_ray', 'voidbite'],
      coordinates: { x: 4, y: 2 }
    };

    const target1 = {
      id: 'player_1',
      name: 'Soldier',
      type: 'soldier',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, hp: 100 },
      coordinates: { x: 3, y: 2 }
    };

    cm.initializeCombat({ crew: [target1], monster: beholder, minions: [] });

    const boss = cm.getCombatant('beholder_boss');
    const p1 = cm.getCombatant('player_1');

    // Force coordinates to be exactly adjacent
    cm.updateUnitCoordinates(boss, 4, 2);
    cm.updateUnitCoordinates(p1, 3, 2);

    // Clear initial cooldowns so displacement_ray is ready
    boss.cooldowns = {};

    cm.executeUnitAI(boss);

    // Should prioritize displacement_ray over voidbite because target1 is adjacent
    expect(useAbilitySpy).toHaveBeenCalled();
    const calledAbility = useAbilitySpy.mock.calls[0][1];
    expect(calledAbility.id).toBe('displacement_ray');
  });
});
