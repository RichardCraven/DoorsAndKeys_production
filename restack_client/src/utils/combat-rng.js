/**
 * CombatRng — injectable randomness for the combat engine.
 *
 * Gameplay rolls in combat-manager-redux go through `combatRng.random()` instead of Math.random().
 * (Pure id generation, e.g. `id: now() + Math.random()`, intentionally stays on Math.random so
 * forced/seeded values can never produce duplicate React keys.)
 *
 * ── Natural mode (default / production) ─────────────────────────────────────
 * random() === Math.random(), looked up at call time (jest spies on Math.random still work).
 * No outcomes are forced.
 *
 * ── Sandbox controls ────────────────────────────────────────────────────────
 *  - setSeed(n): deterministic, replayable roll sequence (same seed + same cast = same result)
 *  - force(tag, true|false|null): override a specific decision point. Supported tags:
 *      'hit'  → combat-manager-redux.hitCheck
 *      'crit' → combat-manager-redux._processCriticalStrike
 *    Roll outcomes have mixed semantics across the engine (some `< p` rolls favour the attacker,
 *    others are target resists), so outcomes are only forced at explicitly tagged call sites.
 *  - reset(): back to natural mode with no overrides. ALWAYS call on sandbox unmount.
 */

// mulberry32: tiny, fast, good-enough PRNG for reproducible sandbox replays.
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

class CombatRng {
  constructor() {
    this.mode = 'natural';
    this.seed = null;
    this._next = null;
    this.forced = {};
  }

  random() {
    return this.mode === 'seeded' && this._next ? this._next() : Math.random();
  }

  setSeed(seed) {
    this.mode = 'seeded';
    this.seed = Number(seed) >>> 0;
    this._next = mulberry32(this.seed);
  }

  useNatural() {
    this.mode = 'natural';
    this.seed = null;
    this._next = null;
  }

  /** Force a tagged decision point. value: true / false to force, null/undefined to clear. */
  force(tag, value) {
    if (value === true || value === false) this.forced[tag] = value;
    else delete this.forced[tag];
  }

  getForced(tag) {
    return Object.prototype.hasOwnProperty.call(this.forced, tag) ? this.forced[tag] : null;
  }

  /** Return the forced outcome for `tag` if one is set, otherwise the naturally rolled outcome. */
  resolveForced(tag, naturalOutcome) {
    const f = this.getForced(tag);
    return f === null ? naturalOutcome : f;
  }

  reset() {
    this.useNatural();
    this.forced = {};
  }
}

export const combatRng = new CombatRng();
export { CombatRng };
export default combatRng;
