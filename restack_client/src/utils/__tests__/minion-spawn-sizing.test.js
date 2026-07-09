jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Minion Spawn Sizing & Starting Coordinate Assignment', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();
  });

  test('Large boss and multiple large minions do not overlap after initializeCombat', () => {
    // Set up boss data (Djinn, tier 3, which is large 2x2)
    const boss = {
      id: 'boss_unit',
      name: 'Djinn Boss',
      type: 'djinn',
      tier: 3,
      stats: { speed: 5, dex: 5, def: 5, vitality: 100 },
      isMonster: true,
      activeBuffs: [],
      specials: []
    };

    // Set up large minions (e.g., ogres, tier 3, which are large 2x2)
    const minion1 = {
      id: 'minion_1',
      name: 'Ogre Minion 1',
      type: 'ogre',
      tier: 3,
      stats: { speed: 5, dex: 5, def: 5, vitality: 50 },
      isMonster: true,
      activeBuffs: [],
      specials: []
    };

    const minion2 = {
      id: 'minion_2',
      name: 'Ogre Minion 2',
      type: 'ogre',
      tier: 3,
      stats: { speed: 5, dex: 5, def: 5, vitality: 50 },
      isMonster: true,
      activeBuffs: [],
      specials: []
    };

    const data = {
      crew: [],
      monster: boss,
      minions: [minion1, minion2]
    };

    cm.initializeCombat(data);

    // Verify all combatants were created
    const bossCombatant = cm.getCombatant('boss_unit');
    const m1Combatant = cm.getCombatant('minion_1');
    const m2Combatant = cm.getCombatant('minion_2');

    expect(bossCombatant).toBeDefined();
    expect(m1Combatant).toBeDefined();
    expect(m2Combatant).toBeDefined();

    // Verify coordinates and occupiedCoords are populated
    expect(bossCombatant.coordinates).toBeDefined();
    expect(m1Combatant.coordinates).toBeDefined();
    expect(m2Combatant.coordinates).toBeDefined();

    expect(bossCombatant.occupiedCoords).toBeDefined();
    expect(m1Combatant.occupiedCoords).toBeDefined();
    expect(m2Combatant.occupiedCoords).toBeDefined();

    // Verify no overlaps across all occupied tiles
    const allOccupied = [];
    Object.values(cm.combatants).forEach(c => {
      if (!c || c.dead || c.isVCT) return; // skip VCT objects in count, verify physical tile list
      expect(Array.isArray(c.occupiedCoords)).toBe(true);
      c.occupiedCoords.forEach(coord => {
        const key = `${coord.x},${coord.y}`;
        expect(allOccupied).not.toContain(key);
        allOccupied.push(key);
      });
    });

    // Make sure we actually assigned space-appropriate starting lanes
    expect(allOccupied.length).toBeGreaterThanOrEqual(12); // 3 units * 4 occupied cells each = 12 cells
  });
});
