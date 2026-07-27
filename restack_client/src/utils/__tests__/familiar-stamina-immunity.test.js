jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Familiar Stamina Immunity and No Stamina Bar Tests', () => {
  let cm;
  let hero;
  let familiar;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();

    hero = {
      id: 'hero_1',
      name: 'Wizard',
      type: 'wizard',
      isMonster: false,
      hp: 100,
      stats: { int: 10, dex: 10, speed: 5, atk: 10, def: 5 },
      coordinates: { x: 0, y: 0 },
      endurance: 40,
      maxEndurance: 40,
      specials: ['summon_familiar']
    };

    cm.initializeCombat({
      crew: [hero],
      monster: { id: 'm1', isMonster: true, stats: { hp: 50, speed: 1 }, coordinates: { x: 5, y: 5 } }
    });

    const spec = cm.resolveSpecial(hero, 'summon_familiar');
    cm.useAbility(hero, spec, hero);

    familiar = Object.values(cm.combatants).find(c => c && c.type === 'archaic_familiar');
  });

  test('Familiar minion is created with isFamiliar: true and undefined endurance fields', () => {
    expect(familiar).toBeDefined();
    expect(familiar.isFamiliar).toBe(true);
    expect(familiar.endurance).toBeUndefined();
    expect(familiar.maxEndurance).toBeUndefined();
  });

  test('Familiar is immune to applyEnduranceCost', () => {
    cm.applyEnduranceCost(familiar, 20, 'action');
    expect(familiar.endurance).toBeUndefined();
    expect(familiar.exhausted).toBeFalsy();
  });

  test('isFamiliarUnit helper correctly identifies familiar units', () => {
    expect(cm.isFamiliarUnit(familiar)).toBe(true);
    expect(cm.isFamiliarUnit(hero)).toBe(false);
  });
});
