import { CombatManagerRedux } from '../combat-manager-redux';

describe('CombatManagerRedux sleep and endurance logic', () => {
  let cm;
  let ranger;
  let monster;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();

    ranger = {
      id: 'ranger_1',
      name: 'Ranger',
      type: 'ranger',
      stats: { hp: 100, atk: 10, def: 5, speed: 10, vitality: 30, dex: 8 },
      hp: 100,
      maxEndurance: 30,
      endurance: 30,
      coordinates: { x: 0, y: 0 },
      activeDebuffs: [],
      damageIndicators: [],
    };

    monster = {
      id: 'ogre_1',
      name: 'Ogre',
      type: 'ogre',
      isMonster: true,
      stats: { hp: 200, atk: 12, def: 10, speed: 4, vitality: 50, dex: 3 },
      hp: 200,
      maxEndurance: 50,
      endurance: 50,
      coordinates: { x: 1, y: 0 },
      activeDebuffs: [],
      damageIndicators: [],
    };

    cm.combatants = { [ranger.id]: ranger, [monster.id]: monster };
  });

  test('collapsing from low endurance sets asleep, stunned, and exhausted', () => {
    // Apply heavy endurance cost
    cm.applyEnduranceCost(ranger, 40, 'action');

    expect(ranger.endurance).toBe(0);
    expect(ranger.exhausted).toBe(true);
    expect(ranger.asleep).toBe(true);
    expect(ranger.sleepRounds).toBeGreaterThan(0);
    expect(ranger.stunned).toBe(true);
    expect(ranger.stunnedRounds).toBeGreaterThan(0);
  });

  test('asleep unit skips turn during processRoundTurns and sleepRounds decrements', () => {
    cm.applyEnduranceCost(ranger, 40, 'action');
    expect(ranger.asleep).toBe(true);

    const initialSleepRounds = ranger.sleepRounds;

    // Spy on appendCombatLog
    const logSpy = jest.fn();
    cm.appendCombatLog = logSpy;

    // Enable fake timers and run turns
    jest.useFakeTimers();
    cm.processRoundTurns();
    jest.runAllTimers();
    jest.useRealTimers();

    // The ranger should have skipped the round
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Ranger is incapacitated and skips this round.'));

    // Sleep rounds should have ticked down
    expect(ranger.sleepRounds).toBe(initialSleepRounds - 1);
  });

  test('sleeping unit wakes up when damaged', () => {
    cm.applyEnduranceCost(ranger, 40, 'action');
    expect(ranger.asleep).toBe(true);

    // Deal damage to ranger using hitsCombatant or direct method
    cm.wakeSleepingTarget(ranger, 'attack');

    expect(ranger.asleep).toBe(false);
    expect(ranger.sleepRounds).toBe(0);
    expect(ranger.stunned).toBe(false);
    expect(ranger.stunnedRounds).toBe(0);
  });

  test('restoring endurance wakes up an exhausted/asleep unit', () => {
    cm.applyEnduranceCost(ranger, 40, 'action');
    expect(ranger.asleep).toBe(true);
    expect(ranger.exhausted).toBe(true);

    // Simulate item use with endurance restoration
    const item = {
      name: 'Stamina Potion',
      effect: { endurance: 50 } // restores 50%
    };
    cm.itemUsed(item, ranger);

    expect(ranger.endurance).toBe(15); // 50% of 30
    expect(ranger.exhausted).toBe(false);
    expect(ranger.asleep).toBe(false);
    expect(ranger.sleepRounds).toBe(0);
    expect(ranger.stunned).toBe(false);
  });

  test('cleansing stun/sleep wakes up unit and clears stats', () => {
    cm.applyEnduranceCost(ranger, 40, 'action');
    expect(ranger.asleep).toBe(true);

    const item = {
      name: 'Cleanse Potion',
      effect: { cleanse: ['sleep'] }
    };
    cm.itemUsed(item, ranger);

    expect(ranger.asleep).toBe(false);
    expect(ranger.sleepRounds).toBe(0);
    expect(ranger.stunned).toBe(false);
    expect(ranger.exhausted).toBe(false);
  });
});
