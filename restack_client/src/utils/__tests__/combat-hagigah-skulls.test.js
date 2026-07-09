jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

// Match grid dimensions defined in combat-manager-redux
const MAX_DEPTH = 7;
const MAX_LANES = 6;

describe('Hagigah Summon Skulls Corner Spawning', () => {
  let cm;
  let hagigah;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };

    hagigah = {
      id: 'hagigah_1',
      name: 'Hagigah',
      type: 'hagigah',
      isMonster: true,
      dead: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 400, atk: 20 },
      skills: ['summon_skulls'],
      attacks: ['rake'],
      coordinates: { x: 5, y: 2 },
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      activeBuffs: [],
      activeDebuffs: [],
      cooldowns: {},
    };

    cm.combatants = {
      hagigah_1: hagigah
    };
  });

  test('Should summon skulls directly to the corners of the board', () => {
    const ability = { name: 'Summon Skulls', cooldown: 5 };
    
    cm.useAbility(hagigah, ability, hagigah);

    // Find the newly spawned minions
    const minions = Object.values(cm.combatants).filter(c => c.isMinion && c.type === 'flaming_skull');
    expect(minions.length).toBeGreaterThanOrEqual(1);
    expect(minions.length).toBeLessThanOrEqual(2);

    // Verify all spawned minions reside in one of the 4 corners
    const corners = [
      { x: 0, y: 0 },
      { x: 0, y: MAX_LANES - 1 },
      { x: MAX_DEPTH, y: 0 },
      { x: MAX_DEPTH, y: MAX_LANES - 1 }
    ];

    minions.forEach((minion) => {
      const matchCorner = corners.find(
        (c) => c.x === minion.coordinates.x && c.y === minion.coordinates.y
      );
      expect(matchCorner).toBeDefined();
    });
  });

  test('Should only spawn in unoccupied corners', () => {
    // Occupy 3 of the 4 corners
    // Top-Left (0, 0)
    cm.combatants['occ1'] = { id: 'occ1', coordinates: { x: 0, y: 0 }, dead: false };
    // Bottom-Left (0, 5)
    cm.combatants['occ2'] = { id: 'occ2', coordinates: { x: 0, y: MAX_LANES - 1 }, dead: false };
    // Top-Right (7, 0)
    cm.combatants['occ3'] = { id: 'occ3', coordinates: { x: MAX_DEPTH, y: 0 }, dead: false };

    const ability = { name: 'Summon Skulls', cooldown: 5 };
    cm.useAbility(hagigah, ability, hagigah);

    const minions = Object.values(cm.combatants).filter(c => c.isMinion && c.type === 'flaming_skull');
    // Since only 1 corner is unoccupied, only 1 skull should be summoned
    expect(minions.length).toBe(1);
    // The only free corner is Bottom-Right (7, 5)
    expect(minions[0].coordinates).toEqual({ x: MAX_DEPTH, y: MAX_LANES - 1 });
  });
});
