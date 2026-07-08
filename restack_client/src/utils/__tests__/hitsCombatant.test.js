// Mock modules that are ESM or cause transformer issues in the test environment
jest.mock('@coreui/icons', () => ({}));
jest.mock('../../utils/images', () => ({}));
import { CombatManager } from '../../utils/combat-manager';
import { ROCK_DURATION } from '../../utils/shared-constants';

describe('hitsCombatant', () => {
  let cm;

  beforeEach(() => {
    jest.useFakeTimers();
    cm = new CombatManager();
    // stub dependent methods
    cm.getSurroundings = () => ({ E: { x: 0, y: 0 }, S: { x: 0, y: 0 }, W: { x: 0, y: 0 } });
    cm.someoneElseIsInCoords = () => false;
    cm.checkOverlap = jest.fn();
    cm.targetKilled = jest.fn();
    cm.updateData = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('applies minor damage (non-critical) and clears wounded after ROCK_DURATION', () => {
    const caller = {
      id: 'c1',
      name: 'Attacker',
      atk: 10,
      pendingAttack: { type: 'cutting' },
      readout: { result: '' },
      stats: { fort: 0 },
      level: 1,
      energy: 0,
      coordinates: { x: 0, y: 0 }
    };

    const target = {
      id: 't1',
      name: 'Target',
      hp: 50,
      weaknesses: [],
      damageIndicators: [],
      coordinates: { x: 1, y: 0 },
      rockAnimationOn: jest.fn(),
      rockAnimationOff: jest.fn()
    };

    cm.hitsCombatant(caller, target, null, { forceCritical: false });

    expect(target.hp).toBe(40);
    expect(target.damageIndicators.length).toBe(1);
    expect(target.wounded).toBeTruthy();
    expect(target.wounded.severity).toBe('minor');
    expect(cm.updateData).toHaveBeenCalled();

    // advance timers to allow wounded cleanup
    jest.advanceTimersByTime(ROCK_DURATION + 10);
    expect(target.wounded).toBe(false);
  });

  test('applies critical damage, triggers rock animation and clears after ROCK_DURATION', () => {
    const caller = {
      id: 'c2',
      name: 'Critter',
      atk: 10,
      pendingAttack: { type: 'cutting' },
      readout: { result: '' },
      stats: { fort: 0 },
      level: 1,
      energy: 0,
      coordinates: { x: 0, y: 0 }
    };

    const target = {
      id: 't2',
      name: 'Target2',
      hp: 100,
      weaknesses: [],
      damageIndicators: [],
      coordinates: { x: 1, y: 0 },
      rockAnimationOn: jest.fn(),
      rockAnimationOff: jest.fn()
    };

    cm.hitsCombatant(caller, target, null, { forceCritical: true });

    // critical => 3x damage
    expect(target.hp).toBe(100 - (caller.atk * 3));
    expect(target.damageIndicators.length).toBe(1);
    expect(target.wounded.severity).toBe('severe');
    expect(target.rockAnimationOn).toHaveBeenCalled();

    // advance timers to trigger rockAnimationOff and wounded cleanup
    jest.advanceTimersByTime(ROCK_DURATION + 10);
    expect(target.rockAnimationOff).toHaveBeenCalled();
    expect(target.wounded).toBe(false);
  });

  test('lethal hit sets severity lethal and calls targetKilled', () => {
    const caller = {
      id: 'c3',
      name: 'Killer',
      atk: 50,
      pendingAttack: { type: 'crushing' },
      readout: { result: '' },
      stats: { fort: 0 },
      level: 1,
      energy: 0,
      coordinates: { x: 0, y: 0 }
    };

    const target = {
      id: 't3',
      name: 'Weakling',
      hp: 40,
      weaknesses: [],
      damageIndicators: [],
      coordinates: { x: 1, y: 0 },
      rockAnimationOn: jest.fn(),
      rockAnimationOff: jest.fn()
    };

    cm.hitsCombatant(caller, target, null, { forceCritical: true });

    expect(target.hp).toBe(0);
    expect(target.wounded.severity).toBe('lethal');
    expect(cm.targetKilled).toHaveBeenCalledWith(target);
  });
});
