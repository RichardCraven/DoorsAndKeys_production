jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Summoner Spawn Position Logic', () => {
  let cm;
  let summoner;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };

    summoner = {
      id: 'summoner_1',
      name: 'Vaelis',
      type: 'summoner',
      isMonster: false,
      dead: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: [],
      attacks: ['magic_missile'],
      coordinates: { x: 2, y: 3 },
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      endurance: 20,
      maxEndurance: 20,
      activeBuffs: [],
      activeDebuffs: [],
      cooldowns: {},
    };

    cm.combatants = {
      summoner_1: summoner
    };
  });

  test('Friendly summoner should summon skeleton in front of themselves (x + 1) first', () => {
    const ability = { name: 'Summon Skeleton', cooldown: 5 };
    
    cm._executeSummon(summoner, ability, 'summon_skeleton');

    // Find the newly spawned minion
    const minion = Object.values(cm.combatants).find(c => c.isMinion && c.summonedBy === 'summoner_1');
    expect(minion).toBeDefined();
    // Caster is at (2, 3), so in front is (3, 3)
    expect(minion.coordinates).toEqual({ x: 3, y: 3 });
  });

  test('Friendly summoner should summon imp in front of themselves (x + 1) first', () => {
    const ability = { name: 'Summon Imp', cooldown: 5 };
    
    cm._executeSummon(summoner, ability, 'summon_imp');

    // Find the newly spawned minion
    const minion = Object.values(cm.combatants).find(c => c.isMinion && c.summonedBy === 'summoner_1');
    expect(minion).toBeDefined();
    // Caster is at (2, 3), so in front is (3, 3)
    expect(minion.coordinates).toEqual({ x: 3, y: 3 });
  });

  test('If front (x + 1) is blocked, should summon at adjacent (y - 1), then (y + 1), then behind (x - 1) as final fallback', () => {
    // 1. Block front (3, 3)
    cm.combatants['blocker_front'] = { id: 'blocker_front', coordinates: { x: 3, y: 3 }, dead: false };

    let ability = { name: 'Summon Skeleton', cooldown: 5 };
    cm._executeSummon(summoner, ability, 'summon_skeleton');
    let minion = Object.values(cm.combatants).find(c => c.isMinion && c.summonedBy === 'summoner_1');
    // Expect y - 1, which is (2, 2)
    expect(minion.coordinates).toEqual({ x: 2, y: 2 });

    // Clean up
    delete cm.combatants[minion.id];

    // 2. Block front (3, 3) and top (2, 2)
    cm.combatants['blocker_top'] = { id: 'blocker_top', coordinates: { x: 2, y: 2 }, dead: false };
    cm._executeSummon(summoner, ability, 'summon_skeleton');
    minion = Object.values(cm.combatants).find(c => c.isMinion && c.summonedBy === 'summoner_1');
    // Expect y + 1, which is (2, 4)
    expect(minion.coordinates).toEqual({ x: 2, y: 4 });

    // Clean up
    delete cm.combatants[minion.id];

    // 3. Block front (3, 3), top (2, 2) and bottom (2, 4)
    cm.combatants['blocker_bottom'] = { id: 'blocker_bottom', coordinates: { x: 2, y: 4 }, dead: false };
    cm._executeSummon(summoner, ability, 'summon_skeleton');
    minion = Object.values(cm.combatants).find(c => c.isMinion && c.summonedBy === 'summoner_1');
    // Expect behind, which is (1, 3)
    expect(minion.coordinates).toEqual({ x: 1, y: 3 });
  });
});
