jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Wands Special Abilities & Charge Mechanics', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.getCombatantLogName = jest.fn((u) => u.name || u.id);
  });

  test('cloudfire_wand: doubles damage and consumes 1 charge', () => {
    const wizard = {
      id: 'wiz_1',
      name: 'Wizard',
      type: 'wizard',
      isMonster: true,
      coordinates: { x: 0, y: 0 },
      stats: { str: 0, dex: 5, speed: 5, int: 0, def: 0 },
      activeAbility: { id: 'fireball', damageType: 'fire', flatDamage: 50 },
      inventory: [
        { type: 'magical', subtype: 'wand', itemKey: 'cloudfire_wand', key: 'cloudfire_wand', charges: 5, currentCharges: 5, equippedSlot: 'right' }
      ]
    };

    const dummy = { id: 'dummy', isMonster: true, coordinates: { x: 1, y: 0 }, stats: { str: 0, dex: 5, speed: 5, def: 0 } };

    const spyRand = jest.spyOn(Math, 'random').mockReturnValue(0.10); // < 0.15 triggers 2x dmg

    const finalDmg = cm.damageCheck(wizard, dummy, 50, true);
    expect(finalDmg).toBe(100); // 50 * 2
    expect(wizard.inventory[0].currentCharges).toBe(4);

    spyRand.mockRestore();
  });

  test('animus_wand: deals 2x charges extra damage and consumes 1 charge', () => {
    const mage = {
      id: 'mage_1',
      name: 'Mage',
      type: 'wizard',
      isMonster: true,
      coordinates: { x: 0, y: 0 },
      stats: { str: 0, dex: 5, speed: 5, int: 0, def: 0 },
      activeAbility: { id: 'magic_missile', damageType: 'arcane', flatDamage: 20 },
      inventory: [
        { type: 'magical', subtype: 'wand', itemKey: 'animus_wand', key: 'animus_wand', charges: 8, currentCharges: 8, equippedSlot: 'right' }
      ]
    };

    const dummy = { id: 'dummy', isMonster: true, coordinates: { x: 1, y: 0 }, stats: { str: 0, dex: 5, speed: 5, def: 0 } };

    // 8 charges -> +16 extra damage -> 20 + 16 = 36
    const finalDmg = cm.damageCheck(mage, dummy, 20, true);
    expect(finalDmg).toBe(36);
    expect(mage.inventory[0].currentCharges).toBe(7);
  });

  test('willowcaster: 15% chance to bypass skill cooldown and consume 1 charge', () => {
    const mage = {
      id: 'mage_2',
      name: 'Mage',
      type: 'wizard',
      coordinates: { x: 0, y: 0 },
      stats: { dex: 5, speed: 5 },
      cooldowns: {},
      inventory: [
        { type: 'magical', subtype: 'wand', itemKey: 'willowcaster', key: 'willowcaster', charges: 10, currentCharges: 10, equippedSlot: 'right' }
      ]
    };

    const spyRand = jest.spyOn(Math, 'random').mockReturnValue(0.10); // < 0.15 triggers

    cm._setCooldown(mage, 'fireball', 4);
    expect(mage.cooldowns['fireball']).toBe(0);
    expect(mage.inventory[0].currentCharges).toBe(9);

    spyRand.mockRestore();
  });

  test('glyndas_wand: 50% chance to teleport target to back line in round 3+ and consume 1 charge', () => {
    const mage = {
      id: 'mage_3',
      name: 'Mage',
      type: 'wizard',
      isMonster: false,
      coordinates: { x: 0, y: 0 },
      stats: { dex: 5, speed: 5 },
      inventory: [
        { type: 'magical', subtype: 'wand', itemKey: 'glyndas_wand', key: 'glyndas_wand', charges: 4, currentCharges: 4, equippedSlot: 'right' }
      ]
    };

    const enemyMonster = {
      id: 'goblin_1',
      name: 'Goblin',
      isMonster: true,
      stats: { dex: 5, speed: 5, def: 0, str: 0 },
      coordinates: { x: 2, y: 1 }
    };

    cm.combatants = { [mage.id]: mage, [enemyMonster.id]: enemyMonster };
    cm.round = 3;
    cm.roundNumber = 3;
    const spyRand = jest.spyOn(Math, 'random').mockReturnValue(0.40); // < 0.50 triggers

    cm.useAbility(mage, { id: 'fireball', damageType: 'fire' }, enemyMonster);

    expect(enemyMonster.coordinates.x).toBe(7); // Back line for monsters
    expect(mage.inventory[0].currentCharges).toBe(3);

    spyRand.mockRestore();
  });

  test('justicator_wand: 30% chance to apply sleep for 2 turns and consume 1 charge', () => {
    const mage = {
      id: 'mage_4',
      name: 'Mage',
      type: 'wizard',
      isMonster: false,
      coordinates: { x: 0, y: 0 },
      stats: { dex: 5, speed: 5 },
      inventory: [
        { type: 'magical', subtype: 'wand', itemKey: 'justicator_wand', key: 'justicator_wand', charges: 2, currentCharges: 2, equippedSlot: 'right' }
      ]
    };

    const enemyMonster = {
      id: 'ogre_1',
      name: 'Ogre',
      isMonster: true,
      stats: { str: 10, dex: 5, speed: 5, def: 5 },
      coordinates: { x: 3, y: 1 }
    };

    cm.combatants = { [mage.id]: mage, [enemyMonster.id]: enemyMonster };
    const spyRand = jest.spyOn(Math, 'random').mockReturnValue(0.20); // < 0.30 triggers

    cm.useAbility(mage, { id: 'magic_missile', damageType: 'arcane' }, enemyMonster);

    expect(enemyMonster.asleep).toBe(true);
    expect(enemyMonster.sleepRounds).toBe(2);
    expect(mage.inventory[0].currentCharges).toBe(1);

    spyRand.mockRestore();
  });

  test('wand charges are not consumed when charges reach 0', () => {
    const mage = {
      id: 'mage_empty',
      name: 'Mage',
      type: 'wizard',
      isMonster: true,
      coordinates: { x: 0, y: 0 },
      stats: { str: 0, dex: 5, speed: 5, int: 0, def: 0 },
      activeAbility: { id: 'magic_missile', damageType: 'arcane', flatDamage: 20 },
      inventory: [
        { type: 'magical', subtype: 'wand', itemKey: 'animus_wand', key: 'animus_wand', charges: 8, currentCharges: 0, equippedSlot: 'right' }
      ]
    };

    const dummy = { id: 'dummy', isMonster: true, coordinates: { x: 1, y: 0 }, stats: { str: 0, dex: 5, speed: 5, def: 0 } };

    const finalDmg = cm.damageCheck(mage, dummy, 20, true);
    expect(finalDmg).toBe(20); // No extra damage
    expect(mage.inventory[0].currentCharges).toBe(0);
  });
});
