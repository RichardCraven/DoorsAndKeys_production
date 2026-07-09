jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Fireball Splash & Generic AI Basic Attack Range', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm._processCriticalStrike = jest.fn((attacker, target, damage) => ({ damage, isCrit: false }));
    cm.targetKilled = jest.fn();
    cm.wakeSleepingTarget = jest.fn();
  });

  test('Fireball splash damage correctly hits adjacent multi-tile (large) monsters', () => {
    const wizard = {
      id: 'wizard_unit',
      name: 'Wizard',
      type: 'wizard',
      coordinates: { x: 0, y: 2 },
      stats: { int: 0, speed: 5, dex: 5, def: 5 },
      isMonster: false,
      activeBuffs: [],
      specials: [],
      cooldowns: {}
    };

    const target = {
      id: 'target_unit',
      name: 'Primary Target',
      type: 'fighter',
      coordinates: { x: 2, y: 2 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: true,
      hp: 100,
      activeBuffs: [],
      damageIndicators: []
    };

    // A large multi-tile enemy adjacent to the target
    const largeMonster = {
      id: 'large_monster',
      name: 'Large Monster',
      type: 'dragon',
      coordinates: { x: 3, y: 1 }, // main coordinate is not directly adjacent to target (2,2)
      occupiedCoords: [
        { x: 3, y: 1 },
        { x: 3, y: 2 }, // this coord is adjacent to target (2,2)
        { x: 4, y: 1 },
        { x: 4, y: 2 }
      ],
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: true,
      hp: 100,
      activeBuffs: [],
      damageIndicators: []
    };

    cm.combatants = {
      [wizard.id]: wizard,
      [target.id]: target,
      [largeMonster.id]: largeMonster
    };

    const fireballAbility = {
      id: 'fireball',
      name: 'Fireball',
      damage: 20,
      range: 'medium',
      type: 'damage'
    };

    jest.useFakeTimers();
    cm.useAbility(wizard, fireballAbility, target);
    jest.runAllTimers();
    jest.useRealTimers();

    // Primary target should take full damage (20)
    expect(target.hp).toBe(80);
    // Large monster should take splash damage (10, which is Math.round(20 * 0.5))
    expect(largeMonster.hp).toBe(90);
  });

  test('Fireball splash damage correctly handles Virtual Collision Tiles (VCTs) without breaking main unit HP', () => {
    const wizard = {
      id: 'wizard_unit',
      name: 'Wizard',
      type: 'wizard',
      coordinates: { x: 0, y: 2 },
      stats: { int: 0, speed: 5, dex: 5, def: 5 },
      isMonster: false,
      activeBuffs: [],
      specials: [],
      cooldowns: {}
    };

    const target = {
      id: 'target_unit',
      name: 'Primary Target',
      type: 'fighter',
      coordinates: { x: 2, y: 2 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: true,
      hp: 100,
      activeBuffs: [],
      damageIndicators: []
    };

    // A large multi-tile enemy adjacent to the target
    const largeMonster = {
      id: 'large_monster',
      name: 'Large Monster',
      type: 'dragon',
      coordinates: { x: 3, y: 1 }, // main coordinate is not directly adjacent to target (2,2)
      occupiedCoords: [
        { x: 3, y: 1 },
        { x: 3, y: 2 }, // this coord is adjacent to target (2,2)
        { x: 4, y: 1 },
        { x: 4, y: 2 }
      ],
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: true,
      hp: 100,
      activeBuffs: [],
      damageIndicators: []
    };

    const largeMonsterVCT = {
      id: 'large_monster_VCT',
      isVCT: true,
      parentMonsterId: 'large_monster',
      coordinates: { x: 3, y: 2 },
      hp: null,
      stats: {},
      dead: false,
      isMonster: true,
      damageIndicators: []
    };

    cm.combatants = {
      [wizard.id]: wizard,
      [target.id]: target,
      [largeMonster.id]: largeMonster,
      [largeMonsterVCT.id]: largeMonsterVCT
    };

    const fireballAbility = {
      id: 'fireball',
      name: 'Fireball',
      flatDamage: 20,
      atkPercentage: 100,
      range: 'medium',
      type: 'damage'
    };

    jest.useFakeTimers();
    cm.useAbility(wizard, fireballAbility, target);
    jest.runAllTimers();
    jest.useRealTimers();

    // Primary target should take full damage (20 flat + 5 wizard ATK = 25)
    expect(target.hp).toBe(75);
    // Large monster should take splash damage (13, which is Math.round(25 * 0.5))
    expect(largeMonster.hp).toBe(87);
    // VCT HP should remain null (not NaN)
    expect(largeMonsterVCT.hp).toBeNull();
  });

  test('Generic AI with ranged basic attack (magic_missile) does not move closer when specials are on cooldown', () => {
    // Cultist of the Basilisk is a monster with magic_missile as basic attack (range: far)
    // and fireball/ice_blast as specials
    const cultist = {
      id: 'cultist_unit',
      name: 'Acolyte Vane',
      type: 'basilisk_cultists',
      key: 'basilisk_cultists',
      coordinates: { x: 4, y: 2 },
      stats: { speed: 9, dex: 7, def: 5, atk: 6 },
      isMonster: true,
      specials: ['fireball', 'ice_blast'],
      attacks: ['magic_missile'],
      cooldowns: {
        'fireball': 3, // specials on cooldown
        'ice_blast': 5
      },
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0
    };

    const target = {
      id: 'player_unit',
      name: 'Fighter',
      type: 'soldier',
      coordinates: { x: 0, y: 2 }, // distance = 4 tiles (far range)
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false,
      hp: 100,
      activeBuffs: []
    };

    cm.combatants = {
      [cultist.id]: cultist,
      [target.id]: target
    };

    // Mock moveCloser just in case it gets called (we expect it NOT to be called)
    cm.moveCloser = jest.fn();
    cm.useAbility = jest.fn();
    cm._basicAttack = jest.fn();

    cm.executeUnitAI(cultist);

    // It should NOT move closer since target is already in range of magic_missile
    expect(cm.moveCloser).not.toHaveBeenCalled();
    // It should use its basic attack immediately
    expect(cm._basicAttack).toHaveBeenCalledWith(cultist, target);
  });
});
