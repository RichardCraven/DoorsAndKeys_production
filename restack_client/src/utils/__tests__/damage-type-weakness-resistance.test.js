jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Damage Types Weaknesses and Resistances Audit', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.getCombatantLogName = jest.fn((u) => u.name);
  });

  test('fire spell (fireball) applies 25% weakness multiplier to Mummy (weak to fire)', () => {
    const wizard = {
      id: 'wiz',
      name: 'Wizard',
      type: 'wizard',
      isMonster: true,
      stats: { int: 0 },
      activeAbility: { id: 'fireball', name: 'Fireball', damageType: 'fire' }
    };

    const mummy = {
      id: 'mummy_1',
      name: 'Mummy',
      type: 'mummy',
      isMonster: true,
      stats: { str: 0, def: 0 },
      weaknesses: ['fire', 'holy']
    };

    const neutralUnit = {
      id: 'neutral_1',
      name: 'Dummy',
      type: 'soldier',
      isMonster: true,
      stats: { str: 0, def: 0 },
      weaknesses: []
    };

    const rawDmg = 100;

    const dmgToNeutral = cm.damageCheck(wizard, neutralUnit, rawDmg, true);
    const dmgToMummy = cm.damageCheck(wizard, mummy, rawDmg, true);

    expect(dmgToNeutral).toBe(100);
    expect(dmgToMummy).toBe(125); // +25% weakness multiplier
  });

  test('ice blast (damageType: ice) matches cold weakness alias', () => {
    const wizard = {
      id: 'wiz',
      name: 'Wizard',
      type: 'wizard',
      isMonster: true,
      stats: { int: 0 },
      activeAbility: { id: 'ice_blast', name: 'Ice Blast', damageType: 'ice' }
    };

    const monsterWithColdWeakness = {
      id: 'mon_1',
      name: 'Frost Drake',
      type: 'dragon',
      isMonster: true,
      stats: { str: 0, def: 0 },
      weaknesses: ['cold']
    };

    const rawDmg = 100;
    const finalDmg = cm.damageCheck(wizard, monsterWithColdWeakness, rawDmg, true);

    expect(finalDmg).toBe(125);
  });

  test('blunt damage (wrench_strike) matches crushing weakness alias', () => {
    const engineer = {
      id: 'eng',
      name: 'Engineer',
      type: 'engineer',
      isMonster: true,
      stats: { str: 0 },
      activeAbility: { id: 'wrench_strike', name: 'Wrench Strike', damageType: 'blunt' }
    };

    const golem = {
      id: 'golem_1',
      name: 'Stone Golem',
      type: 'golem',
      isMonster: true,
      stats: { str: 0, def: 0 },
      weaknesses: ['crushing', 'cutting', 'electricity']
    };

    const rawDmg = 100;
    const finalDmg = cm.damageCheck(engineer, golem, rawDmg, false);

    expect(finalDmg).toBe(125);
  });

  test('Elemental Amulet reduces elemental damageType by 5%', () => {
    const caller = {
      id: 'caller_1',
      type: 'monster',
      isMonster: true,
      activeAbility: { id: 'fireball', damageType: 'fire' }
    };

    const defenderWithAmulet = {
      id: 'def_1',
      isMonster: true,
      stats: { str: 0, def: 0 },
      inventory: [{ type: 'amulet', subtype: 'amulet', name: 'Elemental Amulet', itemKey: 'elemental_amulet' }]
    };

    cm._getEquippedAmulet = (unit, itemKey) => itemKey === 'elemental_amulet';

    const finalDmg = cm.damageCheck(caller, defenderWithAmulet, 100, false);
    expect(finalDmg).toBe(95); // 5% reduction
  });

  test('Silver Amulet reduces physical damageType (slashing) by 5%', () => {
    const caller = {
      id: 'caller_1',
      type: 'monster',
      isMonster: true,
      activeAbility: { id: 'slash', damageType: 'slashing' }
    };

    const defenderWithSilver = {
      id: 'def_1',
      isMonster: true,
      stats: { str: 0, def: 0 },
      inventory: [{ type: 'amulet', subtype: 'amulet', name: 'Silver Amulet', itemKey: 'silver_amulet' }]
    };

    cm._getEquippedAmulet = (unit, itemKey) => itemKey === 'silver_amulet';

    const finalDmg = cm.damageCheck(caller, defenderWithSilver, 100, false);
    expect(finalDmg).toBe(95); // 5% reduction
  });

  test('Nature Resistance reduces poison damage by 10%', () => {
    const caller = {
      id: 'caller_1',
      type: 'monster',
      isMonster: true,
      activeAbility: { id: 'snake_strike', damageType: 'poison' }
    };

    const defenderWithNatureRes = {
      id: 'def_1',
      isMonster: true,
      stats: { str: 0, def: 0 },
      natureResistance: true
    };

    const finalDmg = cm.damageCheck(caller, defenderWithNatureRes, 100, false);
    expect(finalDmg).toBe(90); // 10% reduction
  });
});
