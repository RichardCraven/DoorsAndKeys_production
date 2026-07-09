import { CombatManagerRedux as CombatManager } from '../combat-manager-redux'

describe('CombatManager armor percent reduction', () => {
  test('equipped armor reduces damage by percent', () => {
    const cm = new CombatManager();
    cm.updateData = jest.fn();

    const caller = {
      id: 'attacker',
      name: 'Attacker',
      isMonster: true,
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

    cm.combatants = { [caller.id]: caller, [combatantHit.id]: combatantHit };
    
    // Test direct damage check with 100 raw damage
    const finalDmg = cm.damageCheck(caller, combatantHit, 100);
    console.log("TEST FINAL DAMAGE RECEIVED:", finalDmg);

    // 50 helm armor + 20 natural armor (5 def * 4) = 70 total armor
    // Under Redux: 70 total armor / 2.5 = 28% damage reduction
    // 100 * (1 - 0.28) = 72 final damage
    expect(finalDmg).toBe(72);
  });
});
