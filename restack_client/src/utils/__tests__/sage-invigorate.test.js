jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Sage Invigorate Skill', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn() };
    cm.round = 2; // AI requires round > 1 to cast circles
  });

  test('AI Sage casts Invigorate and applies buff to all friendly units', () => {
    const sage = {
      id: 'sage_unit',
      name: 'Sage',
      type: 'sage',
      coordinates: { x: 2, y: 2 },
      activeBuffs: [],
      specials: ['invigorate'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      stats: { speed: 5, dex: 5 },
      isMonster: false
    };

    const ally1 = {
      id: 'ally_1',
      name: 'Ally 1',
      type: 'soldier',
      coordinates: { x: 3, y: 2 }, // distance = 1 (inside)
      activeBuffs: [],
      isMonster: false
    };

    const ally2 = {
      id: 'ally_2',
      name: 'Ally 2',
      type: 'soldier',
      coordinates: { x: 6, y: 2 }, // distance = 4 (outside)
      activeBuffs: [],
      isMonster: false
    };

    cm.combatants = {
      [sage.id]: sage,
      [ally1.id]: ally1,
      [ally2.id]: ally2
    };

    // Sage casts Invigorate
    cm.executeUnitAI(sage);

    // Verify invigorate buff is applied to all friends
    expect(sage.activeBuffs.some(b => b.name === 'invigorate')).toBe(true);
    expect(ally1.activeBuffs.some(b => b.name === 'invigorate')).toBe(true);
    expect(ally2.activeBuffs.some(b => b.name === 'invigorate')).toBe(true);

    const buff = ally1.activeBuffs.find(b => b.name === 'invigorate');
    expect(buff.roundsLeft).toBe(3);
  });

  test('Ticking Invigorate buff restores stamina inside radius, but not outside', () => {
    const sage = {
      id: 'sage_unit',
      name: 'Sage',
      type: 'sage',
      coordinates: { x: 2, y: 2 },
      activeBuffs: [{ name: 'invigorate', roundsLeft: 3 }],
      isMonster: false
    };

    const ally1 = {
      id: 'ally_1',
      name: 'Ally 1',
      type: 'soldier',
      coordinates: { x: 3, y: 2 }, // dist = 1 <= 2.25
      activeBuffs: [{ name: 'invigorate', roundsLeft: 3 }],
      maxEndurance: 100,
      endurance: 50,
      isMonster: false
    };

    const ally2 = {
      id: 'ally_2',
      name: 'Ally 2',
      type: 'soldier',
      coordinates: { x: 5, y: 2 }, // dist = 3 > 2.25
      activeBuffs: [{ name: 'invigorate', roundsLeft: 3 }],
      maxEndurance: 100,
      endurance: 50,
      isMonster: false
    };

    cm.combatants = {
      [sage.id]: sage,
      [ally1.id]: ally1,
      [ally2.id]: ally2
    };

    // Tick buffs for ally1
    cm._tickUnitBuffs(ally1);
    // 20% of 100 is 20. 50 + 20 = 70.
    expect(ally1.endurance).toBe(70);

    // Tick buffs for ally2
    cm._tickUnitBuffs(ally2);
    // Outside range, no regen
    expect(ally2.endurance).toBe(50);
  });

  test('Moving Sage collapses Invigorate circle', () => {
    const sage = {
      id: 'sage_unit',
      name: 'Sage',
      type: 'sage',
      coordinates: { x: 2, y: 2 },
      activeBuffs: [{ name: 'invigorate', roundsLeft: 3 }],
      isMonster: false
    };

    const ally1 = {
      id: 'ally_1',
      name: 'Ally 1',
      type: 'soldier',
      coordinates: { x: 3, y: 2 },
      activeBuffs: [{ name: 'invigorate', roundsLeft: 3 }],
      isMonster: false
    };

    cm.combatants = {
      [sage.id]: sage,
      [ally1.id]: ally1
    };

    // Sage moves to (2, 3)
    cm.updateUnitCoordinates(sage, 2, 3);

    // Buff should be dispelled from everyone
    expect(sage.activeBuffs.some(b => b.name === 'invigorate')).toBe(false);
    expect(ally1.activeBuffs.some(b => b.name === 'invigorate')).toBe(false);
  });
});
