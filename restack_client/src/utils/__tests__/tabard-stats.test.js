jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';
import { getResolvePenaltyReduction, applyResolvePenalty } from '../session-handler';

describe('Tabard stats and resistances', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.targetKilled = jest.fn();
    cm.wakeSleepingTarget = jest.fn();
  });

  test('magic damage is reduced by equipped tabard magicReduction', () => {
    // Caller is a spellcaster (wizard)
    const wizard = {
      id: 'wizard_unit',
      name: 'Wizard',
      type: 'wizard',
      coordinates: { x: 0, y: 0 },
      stats: { int: 0, speed: 5, dex: 5, def: 5 },
      isMonster: true // Set isMonster: true to avoid resolve-based 1.10x damage modifier
    };

    // Defender has equipped tabard (magicReduction: 40)
    const defender = {
      id: 'defender_unit',
      name: 'Defender',
      type: 'soldier',
      coordinates: { x: 1, y: 0 },
      stats: { str: 0, def: 0 }, // no str/def to keep math simple
      inventory: [
        { type: 'armor', armor: 0, magicReduction: 40, equippedSlot: 'chest', name: "Sorcerer's Tabard" }
      ]
    };

    // Magical damage check
    const rawDamage = 100;
    const finalMagicalDamage = cm.damageCheck(wizard, defender, rawDamage);
    expect(finalMagicalDamage).toBe(60); // 40% reduction

    // Non-magical damage check (e.g. physical attacker)
    const physicalAttacker = {
      id: 'attacker_unit',
      name: 'Soldier',
      type: 'soldier',
      coordinates: { x: 0, y: 0 },
      stats: { str: 0, speed: 5, dex: 5, def: 5 },
      isMonster: true // Set isMonster: true to avoid resolve-based damage modifier
    };
    const finalPhysicalDamage = cm.damageCheck(physicalAttacker, defender, rawDamage);
    expect(finalPhysicalDamage).toBe(100); // no reduction
  });

  test('_willpowerCheck failChance is scaled by equipped tabard mentalityResist', () => {
    const fighter = {
      id: 'fighter_unit',
      name: 'Fighter',
      type: 'soldier',
      stats: { wits: 10 },
      inventory: [
        { type: 'armor', armor: 0, mentalityResist: 50, equippedSlot: 'chest', name: "Archmage's Tabard" }
      ]
    };
    const sphinx = {
      stats: { wits: 10 }
    };

    // sphinx wits - fighter wits = 0.
    // Base fail rate = 0.55.
    // With 50% mentalityResist, failChance should become 0.55 * (1 - 0.5) = 0.275.
    // Let's run it many times to estimate the average fail rate.
    let fails = 0;
    for (let i = 0; i < 1000; i++) {
      if (cm._willpowerCheck(fighter, sphinx)) {
        fails++;
      }
    }
    const failRate = fails / 1000;
    expect(failRate).toBeGreaterThan(0.20);
    expect(failRate).toBeLessThan(0.35);
  });

  test('sleep/fear effect application checks target mentalityResist', () => {
    const wizard = {
      id: 'wizard_unit',
      name: 'Wizard',
      type: 'wizard',
      coordinates: { x: 0, y: 0 },
      stats: { int: 0, speed: 5, dex: 5, def: 5 },
      isMonster: false,
      cooldowns: {}
    };

    const target = {
      id: 'target_unit',
      name: 'Target',
      type: 'soldier',
      coordinates: { x: 1, y: 0 },
      stats: { fort: 0 },
      inventory: [
        { type: 'armor', armor: 0, mentalityResist: 100, equippedSlot: 'chest', name: "Archmage's Tabard" }
      ],
      activeBuffs: [],
      damageIndicators: []
    };

    cm.combatants = { [wizard.id]: wizard, [target.id]: target };

    const sleepAbility = {
      id: 'sleep',
      name: 'Sleep',
      range: 'medium',
      type: 'debuff',
      effect: { type: 'sleep', chance: 100, duration: 'short' }
    };

    cm.useAbility(wizard, sleepAbility, target);

    // Because mentalityResist is 100%, target should resist sleep and not be put to sleep
    expect(target.asleep).toBeUndefined();
    expect(cm.appendCombatLog).toHaveBeenCalledWith(expect.stringContaining('resists the sleep!'));
  });

  test('session-handler resolve penalty reduction is increased by equipped resolveResist', () => {
    // Clear metadata first to be clean
    sessionStorage.clear();

    const mockMeta = {
      crew: [
        { id: 1, name: 'Sardonis', type: 'soldier', globalSkills: [] }
      ],
      inventory: {
        items: [
          { type: 'armor', armor: 4, resolveResist: 25, equippedBy: 1, name: "Wayfair Tabard" }
        ]
      }
    };
    sessionStorage.setItem('metadata', JSON.stringify(mockMeta));

    // getResolvePenaltyReduction should find the equipped Wayfair Tabard (25% resolveResist)
    const reduction = getResolvePenaltyReduction();
    expect(reduction).toBe(0.25);

    const penalty = applyResolvePenalty(20);
    expect(penalty).toBe(15); // 20 * (1 - 0.25) = 15
  });

  test('Goblin claw strike does 3 damage to Sardonis and is not reduced by Sardonis flat STR reduction', () => {
    const goblin = {
      id: 'goblin_unit',
      name: 'Goblin',
      type: 'goblin',
      isMonster: true,
      stats: { atk: 3, speed: 5, dex: 5, def: 5 }
    };

    const sardonis = {
      id: 'sardonis_unit',
      name: 'Sardonis',
      type: 'soldier',
      stats: { str: 8, def: 0 },
      inventory: []
    };

    const rawDamage = 3;
    const finalDamage = cm.damageCheck(goblin, sardonis, rawDamage);
    expect(finalDamage).toBe(3);
  });
});
