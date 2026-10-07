import { CombatClock } from '../combat-clock';

describe('CombatClock', () => {
  describe('real-time mode (default / production)', () => {
    it('passes now() straight through to Date.now (mocks still work)', () => {
      const clock = new CombatClock();
      const spy = jest.spyOn(Date, 'now').mockReturnValue(123456);
      expect(clock.now()).toBe(123456);
      spy.mockRestore();
    });

    it('delegates setTimeout to the global, so jest fake timers still work', () => {
      jest.useFakeTimers();
      const clock = new CombatClock();
      const fn = jest.fn();
      clock.setTimeout(fn, 500);
      jest.advanceTimersByTime(499);
      expect(fn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });

  describe('virtual mode (sandbox)', () => {
    let clock;
    beforeEach(() => {
      clock = new CombatClock();
      clock.useVirtualTime({ paused: true });
    });
    afterEach(() => clock.useRealTime());

    it('freezes time while paused', () => {
      const t0 = clock.now();
      expect(clock.now()).toBe(t0);
    });

    it('advance() fires due timers in chronological order and moves now()', () => {
      const order = [];
      const t0 = clock.now();
      clock.setTimeout(() => order.push('b'), 200);
      clock.setTimeout(() => order.push('a'), 100);
      clock.setTimeout(() => order.push('c'), 300);
      clock.advance(250);
      expect(order).toEqual(['a', 'b']);
      expect(clock.now()).toBe(t0 + 250);
      clock.advance(100);
      expect(order).toEqual(['a', 'b', 'c']);
    });

    it('timers scheduled inside callbacks fire within the same advance when due', () => {
      const order = [];
      clock.setTimeout(() => {
        order.push('outer');
        clock.setTimeout(() => order.push('inner'), 50);
      }, 100);
      clock.advance(200);
      expect(order).toEqual(['outer', 'inner']);
    });

    it('clearTimeout cancels a virtual timer', () => {
      const fn = jest.fn();
      const id = clock.setTimeout(fn, 100);
      clock.clearTimeout(id);
      clock.advance(500);
      expect(fn).not.toHaveBeenCalled();
    });

    it('setInterval repeats on the virtual timeline', () => {
      const fn = jest.fn();
      const id = clock.setInterval(fn, 100);
      clock.advance(350);
      expect(fn).toHaveBeenCalledTimes(3);
      clock.clearInterval(id);
      clock.advance(500);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('peekNextDue reports the earliest pending timer', () => {
      const t0 = clock.now();
      clock.setTimeout(() => {}, 700);
      clock.setTimeout(() => {}, 300);
      expect(clock.peekNextDue()).toBe(t0 + 300);
    });

    it('useRealTime() restores pass-through behaviour', () => {
      clock.useRealTime();
      const spy = jest.spyOn(Date, 'now').mockReturnValue(42);
      expect(clock.now()).toBe(42);
      spy.mockRestore();
    });
  });
});
