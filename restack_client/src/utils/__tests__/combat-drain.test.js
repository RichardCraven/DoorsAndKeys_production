import { CombatManagerRedux } from '../combat-manager-redux';

describe('CombatManagerRedux energy_drain logic', () => {
  let cm;
  let caster;
  let target;

  beforeEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();

    caster = {
      id: 'caster_1',
      name: 'Caster',
      type: 'wizard',
      stats: { hp: 100, atk: 20, def: 5, speed: 10, vitality: 30, dex: 8 },
      hp: 50, // starts at 50 to allow heal verification
      starting_hp: 100,
      maxEndurance: 30,
      endurance: 30,
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
      stats: { hp: 100, atk: 12, def: 10, speed: 4, vitality: 50, dex: 3 },
      hp: 100,
      maxEndurance: 50,
      endurance: 50,
      coordinates: { x: 1, y: 0 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: [],
      cooldowns: {},
    };

    cm.combatants = { [caster.id]: caster, [target.id]: target };
  });

  test('energy_drain should deal 100% atk damage to hp and 50% damage to stamina, and heal caster for 50% damage', () => {
    const energyDrainAbility = {
      id: 'energy_drain',
      name: 'Energy Drain',
      desc: 'Drain vitality from target at range.',
      cooldown: 6,
      duration: 'short',
      range: 'medium',
      type: 'debuff',
      effect: { type: 'drain', chance: 100 }
    };

    // Force hitCheck to return true
    cm.hitCheck = () => true;

    // Mock Math.random to prevent critical strikes
    const originalRandom = Math.random;
    Math.random = () => 0.5;

    try {
        // Use ability
        cm.useAbility(caster, energyDrainAbility, target);
    } finally {
        Math.random = originalRandom;
    }

    // Caster has 20 atk, Target has 10 def.
    // Let's check damage: damageCheck(attacker, defender, rawDmg=20, isMagical=false) => 20 - def/2 = 20 - 5 = 15 final damage.
    // Due to player's high resolve (100 >= 80), final damage gets 10% bonus => Math.round(17 * 1.1) = 19 damage.
    // HP damage should be 19. Target HP should be 100 - 19 = 81.
    expect(target.hp).toBe(81);

    // Stamina damage should be Math.round(19 * 0.5) = 10.
    // Target stamina should be 50 - 10 = 40.
    expect(target.endurance).toBe(40);

    // Caster healing should be Math.round(19 * 0.5) = 10.
    // Caster HP should be 50 + 10 = 60.
    expect(caster.hp).toBe(60);

    // Verify combat log entry was appended
    expect(target.damageIndicators.some(ind => ind.value === '-19')).toBe(true);
    expect(target.damageIndicators.some(ind => ind.value === '-10 Stamina')).toBe(true);
    expect(caster.damageIndicators.some(ind => ind.value === '+10')).toBe(true);
  });
});
