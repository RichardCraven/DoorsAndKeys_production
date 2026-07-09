jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Summoner Summon Count Limits and Player Queues', () => {
  let cm;
  let summoner;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    summoner = {
      id: 'summoner_1',
      name: 'Vaelis',
      type: 'summoner',
      isMonster: false,
      dead: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: ['summon_skeleton', 'summon_imp', 'summoner_duplicate'],
      specials: ['summon_skeleton', 'summon_imp', 'summoner_duplicate'],
      attacks: [],
      coordinates: { x: 0, y: 1 },
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      endurance: 20,
      maxEndurance: 20,
      activeBuffs: [],
      activeDebuffs: [],
    };

    cm.combatants = {
      summoner_1: summoner
    };
  });

  test('should allow summoning when no minions of that type exist', () => {
    // Initial state: no skeletons
    expect(cm._abilityReady(summoner, 'summon_skeleton')).toBe(true);

    // Queue and execute summon_skeleton
    const summonSkeletonAbility = {
      id: 'summon_skeleton',
      name: 'Summon Skeleton',
      cooldown: 7,
      type: 'utility',
    };
    const dummyTarget = { id: 'dummy', coordinates: { x: 1, y: 1 } };
    cm.combatants['dummy'] = dummyTarget;

    cm.useAbility(summoner, summonSkeletonAbility, dummyTarget);

    // A skeleton should be summoned
    const minions = Object.values(cm.combatants).filter(c => c.isMinion);
    expect(minions.length).toBe(1);
    expect(minions[0].type).toBe('skeleton');
    expect(minions[0].summonedBy).toBe('summoner_1');
  });

  test('should prevent summoning when a minion of the same type already exists', () => {
    // Manually place 2 skeleton minions summoned by this summoner on the board
    cm.combatants['skeleton_1'] = {
      id: 'skeleton_1',
      type: 'skeleton',
      isMinion: true,
      isMonster: false,
      dead: false,
      summonedBy: 'summoner_1',
      coordinates: { x: 0, y: 2 }
    };
    cm.combatants['skeleton_2'] = {
      id: 'skeleton_2',
      type: 'skeleton',
      isMinion: true,
      isMonster: false,
      dead: false,
      summonedBy: 'summoner_1',
      coordinates: { x: 0, y: 3 }
    };

    // summon_skeleton should NOT be ready because skeletons are at the limit of 2 (level 1)
    expect(cm._abilityReady(summoner, 'summon_skeleton')).toBe(false);

    // summon_imp should still be ready because no imps exist
    expect(cm._abilityReady(summoner, 'summon_imp')).toBe(true);
  });

  test('should allow duplicating existing minions (Option A bypass)', () => {
    // Place a skeleton minion on the board
    const existingSkeleton = {
      id: 'skeleton_1',
      type: 'skeleton',
      isMinion: true,
      isMonster: false,
      dead: false,
      summonedBy: 'summoner_1',
      coordinates: { x: 0, y: 2 }
    };
    cm.combatants['skeleton_1'] = existingSkeleton;

    // Since a minion exists, duplicate should be ready (Option A bypasses type limit)
    expect(cm._abilityReady(summoner, 'summoner_duplicate')).toBe(true);

    const duplicateAbility = {
      id: 'summoner_duplicate',
      name: 'Duplicate',
      cooldown: 8,
      type: 'utility',
    };

    cm.useAbility(summoner, duplicateAbility, summoner);

    // Now there should be 2 skeletons (original + copy)
    const skeletons = Object.values(cm.combatants).filter(c => c.type === 'skeleton');
    expect(skeletons.length).toBe(2);
    expect(skeletons[1].summonedBy).toBe('summoner_1');
  });

  test('should kill all summoned minions when summoner is killed', () => {
    // Instantiate a clean CombatManagerRedux without mocking targetKilled
    const testCm = new CombatManagerRedux();
    testCm.updateData = jest.fn();
    testCm.appendCombatLog = jest.fn();

    const testSummoner = {
      id: 'summoner_1',
      name: 'Vaelis',
      dead: false,
    };
    const testMinion = {
      id: 'skeleton_1',
      type: 'skeleton',
      isMinion: true,
      dead: false,
      summonedBy: 'summoner_1',
    };

    testCm.combatants = {
      summoner_1: testSummoner,
      skeleton_1: testMinion,
    };

    // Kill summoner
    testCm.targetKilled(testSummoner);

    // Verify summoner is dead and minion is also dead
    expect(testSummoner.dead).toBe(true);
    expect(testMinion.dead).toBe(true);
  });

  test('should scale max skeleton and imp limits based on skill level', () => {
    // Level 1: Limit of 2
    summoner.globalSkills = [{ key: 'summon_skeleton', level: 1 }];
    cm.combatants = { summoner_1: summoner };

    // Set up 1 existing skeleton
    cm.combatants['sk1'] = { id: 'sk1', type: 'skeleton', isMinion: true, summonedBy: 'summoner_1', dead: false };
    expect(cm._abilityReady(summoner, 'summon_skeleton')).toBe(true); // under limit (1 < 2)

    // Set up 2 existing skeletons
    cm.combatants['sk2'] = { id: 'sk2', type: 'skeleton', isMinion: true, summonedBy: 'summoner_1', dead: false };
    expect(cm._abilityReady(summoner, 'summon_skeleton')).toBe(false); // at limit (2 = 2)

    // Upgrade to Level 2: Limit of 3
    summoner.globalSkills = [{ key: 'summon_skeleton', level: 2 }];
    expect(cm._abilityReady(summoner, 'summon_skeleton')).toBe(true); // under limit (2 < 3)

    cm.combatants['sk3'] = { id: 'sk3', type: 'skeleton', isMinion: true, summonedBy: 'summoner_1', dead: false };
    expect(cm._abilityReady(summoner, 'summon_skeleton')).toBe(false); // at limit (3 = 3)
  });

  test('should scale summon stats at level 3', () => {
    // Summon skeleton at Level 1 (should have normal stats)
    summoner.globalSkills = [{ key: 'summon_skeleton', level: 1 }];
    cm.combatants = { summoner_1: summoner };
    cm._executeSummon(summoner, { cooldown: 7 }, 'summon_skeleton');
    const normalSk = Object.values(cm.combatants).find(c => c.type === 'skeleton');
    expect(normalSk).toBeDefined();
    const normalHp = normalSk.hp;
    const normalAtk = normalSk.stats.atk;

    // Summon skeleton at Level 3 (should have 2x HP and 2x ATK)
    summoner.globalSkills = [{ key: 'summon_skeleton', level: 3 }];
    cm.combatants = { summoner_1: summoner };
    cm._executeSummon(summoner, { cooldown: 7 }, 'summon_skeleton');
    const superSk = Object.values(cm.combatants).find(c => c.type === 'skeleton');
    expect(superSk.hp).toBe(normalHp * 2);
    expect(superSk.stats.atk).toBe(normalAtk * 2);

    // Summon imp at Level 3 (should have 2x Speed)
    summoner.globalSkills = [{ key: 'summon_imp', level: 3 }];
    cm.combatants = { summoner_1: summoner };
    cm._executeSummon(summoner, { cooldown: 8 }, 'summon_imp');
    const superImp = Object.values(cm.combatants).find(c => c.type === 'imp');
    expect(superImp.stats.speed).toBe(6); // base speed 3 * 2
  });
});
