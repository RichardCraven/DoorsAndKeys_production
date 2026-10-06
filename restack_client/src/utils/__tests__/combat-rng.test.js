import { CombatRng, combatRng } from '../combat-rng';
import { CombatManagerRedux } from '../combat-manager-redux';

describe('CombatRng', () => {
  afterEach(() => combatRng.reset());

  it('natural mode delegates to Math.random at call time', () => {
    const rng = new CombatRng();
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.42);
    expect(rng.random()).toBe(0.42);
    spy.mockRestore();
  });

  it('seeded mode is reproducible', () => {
    const a = new CombatRng();
    const b = new CombatRng();
    a.setSeed(1234);
    b.setSeed(1234);
    const seqA = Array.from({ length: 5 }, () => a.random());
    const seqB = Array.from({ length: 5 }, () => b.random());
    expect(seqA).toEqual(seqB);
    seqA.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); });
  });

  it('force / resolveForced / reset', () => {
    const rng = new CombatRng();
    expect(rng.resolveForced('hit', true)).toBe(true);
    rng.force('hit', false);
    expect(rng.resolveForced('hit', true)).toBe(false);
    rng.force('hit', null);
    expect(rng.resolveForced('hit', true)).toBe(true);
    rng.force('crit', true);
    rng.setSeed(7);
    rng.reset();
    expect(rng.mode).toBe('natural');
    expect(rng.getForced('crit')).toBeNull();
  });

  describe('engine integration', () => {
    let cm;
    beforeEach(() => { cm = new CombatManagerRedux(); });

    it('hitCheck honours a forced outcome over the natural roll', () => {
      jest.spyOn(cm, '_hitCheckNatural').mockReturnValue(true);
      expect(cm.hitCheck({ id: 'a' }, { id: 'b' })).toBe(true);
      combatRng.force('hit', false);
      expect(cm.hitCheck({ id: 'a' }, { id: 'b' })).toBe(false);
      combatRng.force('hit', true);
      cm._hitCheckNatural.mockReturnValue(false);
      expect(cm.hitCheck({ id: 'a' }, { id: 'b' })).toBe(true);
    });

    it('_processCriticalStrike honours a forced crit', () => {
      const attacker = { id: 'a', inventory: [], coordinates: { x: 0, y: 0 } };
      const target = { id: 'b', inventory: [], coordinates: { x: 1, y: 0 } };
      combatRng.force('crit', false);
      expect(cm._processCriticalStrike(attacker, target, 10, false).isCrit).toBe(false);
      combatRng.force('crit', true);
      const res = cm._processCriticalStrike(attacker, target, 10, false);
      expect(res.isCrit).toBe(true);
      expect(res.damage).toBeGreaterThan(10);
    });
  });
});
