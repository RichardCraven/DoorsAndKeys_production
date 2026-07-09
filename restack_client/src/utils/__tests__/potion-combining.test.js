jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { InventoryManager } from '../inventory-manager';
import { CombatManagerRedux } from '../combat-manager-redux';

describe('Potion Rebalancing and Special Supreme Effects', () => {
  let im;

  beforeEach(() => {
    im = new InventoryManager();
    im.initializeItems();
  });

  test('health potion healing percentages are rebalanced correctly', () => {
    // 1. Minor Health Potion should heal 15% HP
    const minor = im.allItems['minor_health_potion'];
    expect(minor).toBeDefined();
    expect(minor.amount).toBe(15);
    expect(minor.description).toContain('15%');

    // 2. Major Health Potion should heal 35% HP
    const major = im.allItems['major_health_potion'];
    expect(major).toBeDefined();
    expect(major.amount).toBe(35);
    expect(major.description).toContain('35%');

    // 3. Grand Health Potion should heal 80% HP
    const grand = im.allItems['grand_health_potion'];
    expect(grand).toBeDefined();
    expect(grand.amount).toBe(80);
    expect(grand.description).toContain('80%');

    // 4. Supreme Health Potion should heal 100% HP, restore 100% Endurance, and cleanse debuffs
    const supreme = im.allItems['supreme_health_potion'];
    expect(supreme).toBeDefined();
    expect(supreme.effect.type).toBe('heal_and_endurance');
    expect(supreme.effect.healPct).toBe(100);
    expect(supreme.effect.endurance).toBe(100);
    expect(supreme.effect.cleanse).toContain('poison');
    expect(supreme.effect.cleanse).toContain('stunned');
    expect(supreme.description).toContain('100% total HP');
  });

  test('using supreme health potion in combat heals, restores endurance, and cleanses all debuffs', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();

    const unit = {
      id: 'test_sage',
      name: 'Loryastes',
      isMonster: false,
      dead: false,
      hp: 10,
      starting_hp: 100,
      endurance: 5,
      maxEndurance: 30,
      
      // Debuffs
      poison: true,
      poisonRounds: 3,
      stunned: true,
      stunnedRounds: 2,
      asleep: true,
      sleepRounds: 4,
      ensnared: true,
      ensnaredRounds: 2,
      silenced: true,
      silenced_eras: 1,
      slowed: true,
      slowed_eras: 1,
      frozen: true,
      frozen_eras: 1,
      
      stats: { speed: 5, dex: 5, def: 5, hp: 100, atk: 10 },
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
    };

    cm.combatants = { test_sage: unit };

    const supreme = im.allItems['supreme_health_potion'];
    
    // Act: Use the supreme potion in combat
    cm.itemUsed(supreme, unit);

    // Assert: HP is fully healed
    expect(unit.hp).toBe(100);

    // Assert: Endurance is fully restored
    expect(unit.endurance).toBe(30);

    // Assert: Debuffs are completely cleansed
    expect(unit.poison).toBe(false);
    expect(unit.poisonRounds).toBe(0);
    expect(unit.stunned).toBe(false);
    expect(unit.stunnedRounds).toBe(0);
    expect(unit.asleep).toBe(false);
    expect(unit.sleepRounds).toBe(0);
    expect(unit.ensnared).toBe(false);
    expect(unit.ensnaredRounds).toBe(0);
    expect(unit.silenced).toBe(false);
    expect(unit.slowed).toBe(false);
    expect(unit.frozen).toBe(false);
  });

  test('combining 2 minor health potions removes them and adds 1 major health potion', () => {
    im.inventory = [];
    im.addItemsByName(['minor_health_potion', 'minor_health_potion']);
    expect(im.inventory.length).toBe(2);

    const originalCount = im.inventory.filter(item => item && (item._im_key === 'minor_health_potion' || item.id === 'minor_health_potion' || item.name === 'minor health potion')).length;
    expect(originalCount).toBe(2);

    const sourceKey = 'minor_health_potion';
    const targetKey = 'major_health_potion';

    // Remove 2 source potions
    im.removeItemByKey(sourceKey);
    im.removeItemByKey(sourceKey);

    const newSourceCount = im.inventory.filter(item => item && (item._im_key === 'minor_health_potion' || item.id === 'minor_health_potion' || item.name === 'minor health potion')).length;
    expect(newSourceCount).toBe(0);

    // Add 1 target potion
    im.addItemsByName([targetKey]);
    const majorCount = im.inventory.filter(item => item && (item._im_key === 'major_health_potion' || item.id === 'major_health_potion' || item.name === 'major health potion')).length;
    expect(majorCount).toBe(1);
  });
});
