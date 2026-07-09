jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Blalok Targeting Behavior', () => {
  test('does not select sacrificial_mending for enemy targets in _scoredAbilityPick', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };

    const blalok = {
      id: 'blalok_unit',
      name: 'Blalok',
      type: 'blalok',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, int: 5, hp: 90, starting_hp: 90, atk: 10 },
      specials: ['sacrificial_mending'],
      cooldowns: {},
      coordinates: { x: 2, y: 2 }
    };

    const soldier = {
      id: 'soldier_unit',
      name: 'Soldier',
      type: 'soldier',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, hp: 50, starting_hp: 100 },
      cooldowns: {},
      coordinates: { x: 1, y: 2 }
    };

    cm.initializeCombat({ crew: [soldier], monster: blalok, minions: [] });

    const activeBlalok = cm.getCombatant('blalok_unit');
    const activeSoldier = cm.getCombatant('soldier_unit');

    const pick = cm._scoredAbilityPick(activeBlalok, activeSoldier);
    // Since sacrificial_mending only targets friendly/same-team aberration allies,
    // and the target is an enemy Soldier, it should NOT select sacrificial_mending.
    expect(pick).toBeNull();
  });

  test('guards useAbility to prevent sacrificial_mending from casting on enemies', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };

    const blalok = {
      id: 'blalok_unit',
      name: 'Blalok',
      type: 'blalok',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, int: 5, hp: 90, starting_hp: 90, atk: 10 },
      specials: ['sacrificial_mending'],
      cooldowns: {},
      coordinates: { x: 2, y: 2 }
    };

    const soldier = {
      id: 'soldier_unit',
      name: 'Soldier',
      type: 'soldier',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, hp: 50, starting_hp: 100 },
      cooldowns: {},
      coordinates: { x: 1, y: 2 }
    };

    cm.initializeCombat({ crew: [soldier], monster: blalok, minions: [] });

    const activeBlalok = cm.getCombatant('blalok_unit');
    const activeSoldier = cm.getCombatant('soldier_unit');
    const abilitySpec = cm.resolveSpecial(activeBlalok, 'sacrificial_mending');

    cm.useAbility(activeBlalok, abilitySpec, activeSoldier);

    // The ability should have failed because the target is an enemy
    expect(activeSoldier.regenerating).toBeFalsy();
    expect(activeSoldier.hp).toBe(50);
  });
});
