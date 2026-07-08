import { CombatManager } from '../combat-manager'

describe('CombatManager armor percent reduction', () => {
  test('equipped armor reduces damage by percent', () => {
    const cm = new CombatManager();
    cm.updateData = jest.fn();

    const caller = {
      id: 'attacker',
      name: 'Attacker',
      atk: 10,
      readout: { result: '' },
      stats: { fort: 0 },
      level: 1,
      coordinates: { x: 0, y: 0 }
    };

    const combatantHit = {
      id: 'defender',
      name: 'Defender',
      hp: 200,
      damageIndicators: [],
  stats: { dex: 1, def: 5 },
      coordinates: { x: 1, y: 0 },
      inventory: [
        { type: 'armor', armor: 50, equippedSlot: 'head', name: 'helm' }
      ]
    };

    // Use supplementalData.damage to force a known damage value of 100
    cm.hitsCombatant(caller, combatantHit, { damage: 100 }, { forceCritical: false });

    // After 50% armor, damage applied should be 50
    expect(combatantHit.hp).toBe(150);
    expect(combatantHit.damageIndicators.length).toBeGreaterThan(0);
    expect(combatantHit.damageIndicators[0]).toBe(50);
    expect(caller.readout.result).toContain('hits Defender for 50');
  });
});
