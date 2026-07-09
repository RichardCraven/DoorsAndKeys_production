jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Displacement Ray Mentality Check Mechanics', () => {
  let cm;
  let beholder;
  let soldier;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    beholder = {
      id: 'beholder_unit',
      name: 'Beholder',
      type: 'beholder',
      isMonster: true,
      stats: { hp: 300, atk: 15, def: 5, speed: 5, wits: 15 },
      coordinates: { x: 4, y: 2 },
      skills: ['displacement_ray'],
      cooldowns: {},
    };

    soldier = {
      id: 'soldier_unit',
      name: 'Soldier',
      type: 'soldier',
      isMonster: false,
      stats: { hp: 100, atk: 10, def: 5, speed: 5, wits: 5, willpower: 5 },
      coordinates: { x: 3, y: 2 },
      skills: [],
      inventory: [],
    };

    cm.initializeCombat({ crew: [soldier], monster: beholder, minions: [] });
  });

  test('displacement_ray triggers a contested mentality check in hitCheck', () => {
    const boss = cm.getCombatant('beholder_unit');
    const target = cm.getCombatant('soldier_unit');
    
    // Set activeAbility so hitCheck knows which ability is being run
    boss.activeAbility = cm.resolveSpecial(boss, 'displacement_ray');

    // Test extreme wits/willpower difference
    // Beholder wits = 15, Soldier willpower = 5 => diff = 5 - 15 = -10
    // baseMissChance = Max(10, Min(90, 50 - 50)) = 10%
    // Let's force Math.random to return 0.05 (which is 5%), which is less than 10%, meaning it should miss!
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.05);

    const hit = cm.hitCheck(boss, target);
    expect(hit).toBe(false);

    randomSpy.mockRestore();
  });

  test('mentalityResist tabard reduces chance of hit for displacement_ray', () => {
    const boss = cm.getCombatant('beholder_unit');
    const target = cm.getCombatant('soldier_unit');

    // Add tabard with 50 mentalityResist
    target.inventory = [
      {
        type: 'armor',
        equippedSlot: 'chest',
        mentalityResist: 50,
      }
    ];

    boss.activeAbility = cm.resolveSpecial(boss, 'displacement_ray');

    // Beholder wits = 15, Soldier willpower = 5 => diff = -10 => baseMissChance = 10%
    // With 50 mentalityResist, missChance becomes 10 + 50 = 60%
    // Force Math.random to return 0.5 (which is 50%), which is less than 60%, meaning it should miss!
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const hit = cm.hitCheck(boss, target);
    expect(hit).toBe(false);

    randomSpy.mockRestore();
  });
});
