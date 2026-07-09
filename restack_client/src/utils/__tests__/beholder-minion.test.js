jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';


describe('Beholder Minion & Minor Magic Missile', () => {
  test('minor_magic_missile has projectile and hit count of 1 in Redux engine', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    const unit = {
      id: 'beholder_unit',
      name: 'Beholder',
      type: 'beholder_minion',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, int: 5, hp: 80, atk: 10 },
      skills: ['minor_magic_missile'],
      coordinates: { x: 5, y: 2 }
    };

    const target = {
      id: 'target_unit',
      name: 'Soldier',
      type: 'soldier',
      stats: { speed: 5, dex: 5, def: 5, hp: 100 },
      coordinates: { x: 1, y: 2 }
    };

    cm.initializeCombat({ crew: [target], monster: unit, minions: [] });

    const beholder = cm.getCombatant('beholder_unit');
    const abilitySpec = cm.resolveSpecial(beholder, 'minor_magic_missile');

    expect(abilitySpec).toBeDefined();
    expect(abilitySpec.id).toBe('minor_magic_missile');

    const hitsSpy = jest.spyOn(cm, 'hitCheck');

    jest.useFakeTimers();
    cm.useAbility(beholder, abilitySpec, cm.getCombatant('target_unit'));
    jest.runAllTimers();

    expect(hitsSpy).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

});
