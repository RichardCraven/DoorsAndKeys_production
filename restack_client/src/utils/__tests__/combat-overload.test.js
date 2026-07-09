import { CombatManagerRedux } from '../combat-manager-redux';

describe('CombatManagerRedux overload ability logic', () => {
  let cm;
  let caster;
  let target;

  beforeEach(() => {
    jest.useFakeTimers();
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.animManagerRedux = {
      triggerAbility: jest.fn()
    };

    caster = {
      id: 'caster_1',
      name: 'Caster',
      type: 'hashmallim',
      isMonster: true,
      stats: { hp: 200, atk: 30, def: 15, speed: 10 },
      hp: 200,
      starting_hp: 200,
      coordinates: { x: 0, y: 0 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: [],
      cooldowns: {},
    };

    target = {
      id: 'target_1',
      name: 'Target',
      type: 'soldier',
      stats: { hp: 100, atk: 15, def: 10, speed: 5 },
      hp: 100,
      starting_hp: 100,
      maxEndurance: 50,
      endurance: 50, // Starts at full stamina (50/50)
      coordinates: { x: 1, y: 0 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: [],
      cooldowns: {},
    };

    cm.combatants = { [caster.id]: caster, [target.id]: target };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const overloadAbility = {
    id: 'overload',
    name: 'Overload',
    cooldown: 8,
    type: 'damage',
    range: 'medium'
  };

  test('overload should deal 0 damage if target is at full stamina (0 stamina used)', () => {
    cm.hitCheck = () => true;

    cm.useAbility(caster, overloadAbility, target);
    jest.runAllTimers();

    expect(target.hp).toBe(100);
    expect(target.endurance).toBe(50);
    expect(cm.animManagerRedux.triggerAbility).toHaveBeenCalledWith(
      caster.coordinates,
      target.coordinates,
      'overload_success',
      target.isLarge,
      [target.coordinates],
      caster.id
    );
  });

  test('overload should deal split damage between HP and stamina when target is above 50% stamina', () => {
    cm.hitCheck = () => true;
    
    // Set target stamina to 40/50 (stamina used = 10, staminaPct = 0.8 > 0.50)
    target.endurance = 40;

    cm.useAbility(caster, overloadAbility, target);
    jest.runAllTimers();

    // staminaUsed = 10. Bypasses defense, so finalDmg = 10.
    // Since staminaPct (0.8) > 0.5, deals 5 HP damage and 5 stamina damage.
    expect(target.hp).toBe(95); // 100 - 5
    expect(target.endurance).toBe(35); // 40 - 5
    expect(target.damageIndicators.some(ind => ind.value === '-5')).toBe(true);
    expect(target.damageIndicators.some(ind => ind.value === '-5 Stamina')).toBe(true);
  });

  test('overload should deal full damage to HP when target is at or below 50% stamina', () => {
    cm.hitCheck = () => true;

    // Set target stamina to 20/50 (stamina used = 30, staminaPct = 0.4 <= 0.50)
    target.endurance = 20;

    cm.useAbility(caster, overloadAbility, target);
    jest.runAllTimers();

    // staminaUsed = 30. Bypasses defense, so finalDmg = 30.
    // Since staminaPct <= 0.5, deals full 30 damage to HP.
    expect(target.hp).toBe(70); // 100 - 30
    expect(target.endurance).toBe(20); // Unchanged
    expect(target.damageIndicators.some(ind => ind.value === '-30')).toBe(true);
    expect(target.damageIndicators.some(ind => ind.value.includes('Stamina'))).toBe(false);
  });

  test('overload should trigger overload_fail animation on miss', () => {
    cm.hitCheck = () => false;

    cm.useAbility(caster, overloadAbility, target);
    jest.runAllTimers();

    expect(target.hp).toBe(100);
    expect(cm.animManagerRedux.triggerAbility).toHaveBeenCalledWith(
      caster.coordinates,
      target.coordinates,
      'overload_fail',
      target.isLarge,
      [target.coordinates],
      caster.id
    );
  });
});

describe('CombatManagerRedux dominate targeting randomization', () => {
  test('dominate targeting should randomize target selection among valid enemies', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.hitCheck = () => true;

    const hashmallim = {
      id: 'hashmallim_1',
      name: 'Hashmallim',
      type: 'hashmallim',
      isMonster: true,
      stats: { hp: 200, atk: 30, def: 15, speed: 10 },
      hp: 200,
      starting_hp: 200,
      coordinates: { x: 0, y: 0 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: [],
      cooldowns: {},
      specials: ['dominate'],
      attacks: ['gore']
    };

    // Add three valid targets
    const target1 = {
      id: 't1',
      name: 'T1',
      type: 'soldier',
      stats: { hp: 100 },
      hp: 100,
      coordinates: { x: 1, y: 0 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: []
    };

    const target2 = {
      id: 't2',
      name: 'T2',
      type: 'soldier',
      stats: { hp: 100 },
      hp: 100,
      coordinates: { x: 1, y: 1 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: []
    };

    const target3 = {
      id: 't3',
      name: 'T3',
      type: 'soldier',
      stats: { hp: 100 },
      hp: 100,
      coordinates: { x: 1, y: 2 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: []
    };

    cm.combatants = {
      [hashmallim.id]: hashmallim,
      [target1.id]: target1,
      [target2.id]: target2,
      [target3.id]: target3
    };

    // Force target selection logic. Since _scoredAbilityPick requires dominate to be ready
    // and not on cooldown, let's make sure it is ready.
    // Call _aiGeneric multiple times to see if we get different targets
    const targetsPicked = new Set();
    for (let i = 0; i < 40; i++) {
      // Reset cooldowns & state
      hashmallim.cooldowns = {};
      hashmallim.actionsTakenThisRound = 0;
      cm.useAbility = jest.fn(); // Mock useAbility to prevent state changes in loop
      
      cm._aiGeneric(hashmallim);
      if (hashmallim.targetId) {
        targetsPicked.add(hashmallim.targetId);
      }
    }

    // Assert that more than 1 target was picked over 40 iterations (randomized)
    expect(targetsPicked.size).toBeGreaterThan(1);
  });
});
