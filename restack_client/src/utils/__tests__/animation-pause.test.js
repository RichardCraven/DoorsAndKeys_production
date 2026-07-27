jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';
import { AnimationManagerRedux } from '../animation-manager-redux';

describe('Animation Pause & Resume System', () => {
  let cm;
  let am;
  let emittedEvents;

  beforeEach(() => {
    jest.useFakeTimers();
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    
    am = new AnimationManagerRedux();
    emittedEvents = [];
    am.onAnimationEvent = (anims) => {
      emittedEvents = anims;
    };
    cm.connectAnimationManagerRedux(am);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Animation is removed naturally after duration', () => {
    am._emit({ type: 'test_anim', duration: 1000 });
    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0].type).toBe('test_anim');

    // Advance time by 1000ms
    jest.advanceTimersByTime(1000);
    expect(emittedEvents.length).toBe(0);
  });

  test('Animation freeze and resume behavior when pausing combat', () => {
    // Emit an animation with 1000ms duration
    am._emit({ type: 'test_anim', duration: 1000 });
    expect(emittedEvents.length).toBe(1);

    // Advance 400ms
    jest.advanceTimersByTime(400);

    // Pause combat
    cm.pauseCombat(true);
    expect(am.isPaused).toBe(true);

    // Advance 1000ms in wall-clock time while paused
    jest.advanceTimersByTime(1000);
    // Since paused, the animation should still be active
    expect(emittedEvents.length).toBe(1);

    // Resume combat
    cm.pauseCombat(false);
    expect(am.isPaused).toBe(false);

    // Advance another 500ms (total of 400 + 500 = 900ms elapsed relative to duration)
    jest.advanceTimersByTime(500);
    expect(emittedEvents.length).toBe(1);

    // Advance remaining 100ms (making it 1000ms total active duration)
    jest.advanceTimersByTime(100);
    expect(emittedEvents.length).toBe(0);
  });

  test('Multi-phase animation chain pause and resume', () => {
    // We will test overload_success which emits overload_projectile and schedules success 700ms later
    const source = { x: 0, y: 0 };
    const target = { x: 2, y: 2 };
    
    // We mock _overloadSuccess so we can verify if it gets called
    am._overloadSuccess = jest.fn();

    am.triggerAbility(source, target, 'overload_success');

    // Projectile anim should be active
    expect(emittedEvents.some(e => e.type === 'overload_projectile')).toBe(true);

    // Advance 300ms
    jest.advanceTimersByTime(300);

    // Pause
    cm.pauseCombat(true);

    // Advance 1000ms while paused
    jest.advanceTimersByTime(1000);
    expect(am._overloadSuccess).not.toHaveBeenCalled();

    // Resume
    cm.pauseCombat(false);

    // Advance 399ms (total 699ms elapsed since start, remaining 1ms)
    jest.advanceTimersByTime(399);
    expect(am._overloadSuccess).not.toHaveBeenCalled();

    // Advance 1ms
    jest.advanceTimersByTime(1);
    expect(am._overloadSuccess).toHaveBeenCalled();
  });
});
