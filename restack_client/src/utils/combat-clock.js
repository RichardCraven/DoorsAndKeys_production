/**
 * CombatClock — injectable time source for the combat engine.
 *
 * Every time-dependent call in combat (Date.now / setTimeout / setInterval) goes through the
 * shared `combatClock` singleton instead of the globals.
 *
 * ── Real-time mode (default) ────────────────────────────────────────────────
 * Pure pass-through to the globals, looked up at CALL time. Production behaviour is identical
 * to calling Date.now()/setTimeout() directly, and Jest fake timers / Date.now mocks still work.
 *
 * ── Virtual mode (Sandbox / Skill Lab only) ─────────────────────────────────
 * `combatClock.useVirtualTime()` switches to a controllable timeline:
 *   - now() returns virtual ms (starts at the current real time, so *EndTimeMs math stays sane)
 *   - timeScale  : 0.1x slow-mo … 4x fast-forward
 *   - pause()/resume() freeze/thaw the whole timeline (all engine + animation timers)
 *   - advance(ms) jumps forward, firing every due timer in order (step-round / jump-to-event)
 *   - subscribe(fn) notifies UI (e.g. the Chrono Deck) on every virtual tick
 * Timers scheduled before switching modes keep running on the mode they were created in.
 * ALWAYS call `useRealTime()` on unmount so real combat is never left on virtual time.
 */

const DRIVER_INTERVAL_MS = 16;

class CombatClock {
  constructor() {
    this.mode = 'real';
    this.timeScale = 1;
    this.paused = false;

    // virtual timeline state
    this._virtualNow = 0;
    this._lastRealTick = 0;
    this._timers = new Map(); // id -> { due, fn, interval }
    this._nextId = 1;
    this._driver = null;
    this._listeners = new Set();
  }

  // ── Public API used by engine code ────────────────────────────────────────
  now() {
    return this.mode === 'virtual' ? this._virtualNow : Date.now();
  }

  setTimeout(fn, ms = 0, ...args) {
    if (this.mode !== 'virtual') return setTimeout(fn, ms, ...args);
    return this._addTimer(fn, ms, null, args);
  }

  clearTimeout(id) {
    if (id && typeof id === 'object' && id.__virtual) { this._timers.delete(id.id); return; }
    clearTimeout(id);
  }

  setInterval(fn, ms = 0, ...args) {
    if (this.mode !== 'virtual') return setInterval(fn, ms, ...args);
    return this._addTimer(fn, ms, Math.max(1, ms), args);
  }

  clearInterval(id) {
    if (id && typeof id === 'object' && id.__virtual) { this._timers.delete(id.id); return; }
    clearInterval(id);
  }

  // ── Mode control (Sandbox only) ───────────────────────────────────────────
  useVirtualTime({ timeScale = 1, paused = false } = {}) {
    if (this.mode === 'virtual') return;
    this.mode = 'virtual';
    this._virtualNow = Date.now();
    this._lastRealTick = Date.now();
    this.timeScale = timeScale;
    this.paused = paused;
    this._timers.clear();
    this._startDriver();
    this._notify();
  }

  useRealTime() {
    if (this.mode === 'real') return;
    this._stopDriver();
    this._timers.clear();
    this.mode = 'real';
    this.timeScale = 1;
    this.paused = false;
    this._notify();
  }

  isVirtual() { return this.mode === 'virtual'; }

  setTimeScale(scale) {
    this.timeScale = Math.max(0, Number(scale) || 0);
    this._notify();
  }

  pause() { this.paused = true; this._notify(); }

  resume() {
    this.paused = false;
    this._lastRealTick = Date.now();
    this._notify();
  }

  /** Jump the virtual timeline forward by `ms`, firing every due timer in chronological order. */
  advance(ms) {
    if (this.mode !== 'virtual' || !(ms > 0)) return;
    this._advanceTo(this._virtualNow + ms);
    this._notify();
  }

  /** Earliest pending virtual timer due time (or null). Useful for "jump to next event". */
  peekNextDue() {
    let min = null;
    this._timers.forEach(t => { if (min === null || t.due < min) min = t.due; });
    return min;
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  // ── Internals ─────────────────────────────────────────────────────────────
  _addTimer(fn, ms, interval, args) {
    const id = this._nextId++;
    this._timers.set(id, { due: this._virtualNow + Math.max(0, Number(ms) || 0), fn, interval, args });
    return { __virtual: true, id };
  }

  _advanceTo(target) {
    // Fire timers one at a time in due order; callbacks may schedule/cancel other timers.
    // Guard against runaway zero-delay loops.
    let guard = 0;
    while (guard++ < 100000) {
      let nextId = null;
      let next = null;
      this._timers.forEach((t, id) => {
        if (t.due <= target && (next === null || t.due < next.due || (t.due === next.due && id < nextId))) {
          next = t; nextId = id;
        }
      });
      if (!next) break;
      this._virtualNow = Math.max(this._virtualNow, next.due);
      if (next.interval) next.due = this._virtualNow + next.interval;
      else this._timers.delete(nextId);
      try { next.fn(...(next.args || [])); } catch (e) { console.error('[CombatClock] timer error', e); }
    }
    this._virtualNow = Math.max(this._virtualNow, target);
  }

  _tick() {
    const realNow = Date.now();
    const realDelta = realNow - this._lastRealTick;
    this._lastRealTick = realNow;
    if (this.paused || this.timeScale === 0) { this._notify(); return; }
    this._advanceTo(this._virtualNow + realDelta * this.timeScale);
    this._notify();
  }

  _startDriver() {
    this._stopDriver();
    this._driver = setInterval(() => this._tick(), DRIVER_INTERVAL_MS);
  }

  _stopDriver() {
    if (this._driver) clearInterval(this._driver);
    this._driver = null;
  }

  _notify() {
    this._listeners.forEach(fn => { try { fn(this); } catch (e) { /* ignore listener errors */ } });
  }
}

export const combatClock = new CombatClock();
export { CombatClock };
export default combatClock;
