import { CombatManagerRedux } from '../combat-manager-redux';

jest.useFakeTimers();

describe('CombatManagerRedux bleed 1/2 round ticks', () => {
  let cm;
  let target;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.roundDurationMs = 1000;

    target = {
      id: 'target_1',
      name: 'Target',
      type: 'soldier',
      stats: { hp: 100, atk: 10, def: 5, speed: 5, dex: 5 },
      hp: 100,
      starting_hp: 100,
      coordinates: { x: 0, y: 0 },
      activeBuffs: [],
      activeDebuffs: [{ name: 'bleed', stacks: 1 }],
      damageIndicators: [],
      bleed: true,
      bleedRounds: 1,
    };

    cm.combatants = { [target.id]: target };
  });

  test('bleed should tick twice per round: immediately (first 1/2 round) and via timeout (second 1/2 round)', () => {
    // Call the debuff tick function
    cm._tickUnitDebuffs(target);

    // Default bleedDmg is 5.
    // tickDmg = Math.round(0.6 * 5) = 3.
    // HP should decrease by 3 immediately.
    expect(target.hp).toBe(97);
    expect(target.damageIndicators).toHaveLength(1);
    expect(target.damageIndicators[0].value).toBe('-3');
    expect(target.damageIndicators[0].source).toBe('Bleed');

    // Run the timers by half round duration (1000 / 2 = 500 ms)
    jest.advanceTimersByTime(500);

    // HP should decrease by 3 more (total 6, which is 1.2 * 5).
    expect(target.hp).toBe(94);
    expect(target.damageIndicators).toHaveLength(2);
    expect(target.damageIndicators[1].value).toBe('-3');
    expect(target.damageIndicators[1].source).toBe('Bleed');
  });
});
