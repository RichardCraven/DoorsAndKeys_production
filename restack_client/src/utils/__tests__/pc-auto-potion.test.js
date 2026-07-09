jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('PC Auto-Potion Combat AI', () => {
  test('PC unit at low health uses potion and consumes action', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    // Set up inventory callbacks
    const inventory = [
      { id: 'health_potion', name: 'Health Potion', effect: { type: 'heal_pct', value: 60 } }
    ];
    let consumedItem = null;

    cm.establishGetCurrentInventoryCallback(() => inventory);
    cm.establishUseConsumableCallback((item) => {
      consumedItem = item;
    });

    const lowHpPc = {
      id: 'pc_1',
      name: 'Vaelis',
      type: 'summoner',
      isMonster: false,
      isMinion: false,
      dead: false,
      coordinates: { x: 0, y: 5 },
      hp: 20, // 20% health, less than 40%
      starting_hp: 100,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: [],
      attacks: ['magic_missile'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
    };

    cm.combatants = { pc_1: lowHpPc };

    // Execute turn
    cm.executeUnitAI(lowHpPc);

    // Verify potion usage
    expect(consumedItem).not.toBeNull();
    expect(consumedItem.id).toBe('health_potion');
    expect(lowHpPc.hp).toBe(80); // Healed 60% of 100 HP, so 20 + 60 = 80 HP
    expect(lowHpPc.actionsTakenThisRound).toBe(1);
  });

  test('PC unit at high health does not use potion', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    const inventory = [
      { id: 'health_potion', name: 'Health Potion', effect: { type: 'heal_pct', value: 60 } }
    ];
    let consumedItem = null;

    cm.establishGetCurrentInventoryCallback(() => inventory);
    cm.establishUseConsumableCallback((item) => {
      consumedItem = item;
    });

    const highHpPc = {
      id: 'pc_2',
      name: 'Sardonis',
      type: 'soldier',
      isMonster: false,
      isMinion: false,
      dead: false,
      coordinates: { x: 0, y: 3 },
      hp: 80, // 80% health, >= 40%
      starting_hp: 100,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: [],
      attacks: ['sword_swing'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
    };

    cm.combatants = { pc_2: highHpPc };

    // Execute turn
    cm.executeUnitAI(highHpPc);

    // Verify potion is NOT used
    expect(consumedItem).toBeNull();
    expect(highHpPc.hp).toBe(80);
    expect(highHpPc.actionsTakenThisRound).toBe(0); // Did not consume potion action (might run other AI actions instead)
  });

  test('PC unit under manual control at low health auto-uses potion during processRoundTurns', () => {
    jest.useFakeTimers();
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    const inventory = [
      { id: 'health_potion', name: 'Health Potion', effect: { type: 'heal_pct', value: 60 } }
    ];
    let consumedItem = null;

    cm.establishGetCurrentInventoryCallback(() => inventory);
    cm.establishUseConsumableCallback((item) => {
      consumedItem = item;
    });

    const lowHpPc = {
      id: 'pc_manual',
      name: 'Vaelis',
      type: 'summoner',
      isMonster: false,
      isMinion: false,
      dead: false,
      coordinates: { x: 0, y: 5 },
      hp: 20, // 20% health, less than 40%
      starting_hp: 100,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: [],
      attacks: ['magic_missile'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      manualControl: true, // Manual control active
    };

    cm.combatants = { pc_manual: lowHpPc };

    cm.processRoundTurns();

    // Advance jest timers so the setTimeout inside processRoundTurns fires
    jest.runAllTimers();

    // Verify potion usage
    expect(consumedItem).not.toBeNull();
    expect(consumedItem.id).toBe('health_potion');
    expect(lowHpPc.hp).toBe(80); // Healed 60% of 100 HP, so 20 + 60 = 80 HP
    expect(lowHpPc.actionsTakenThisRound).toBe(1);

    jest.useRealTimers();
  });
});
