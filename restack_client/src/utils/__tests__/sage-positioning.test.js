jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Sage AI Repositioning & Delayed Cast', () => {
  let cm;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn() };
    cm.round = 2; // Required to cast Circle of Protection
  });

  test('Sage moves towards allies to encompass them with Circle of Protection (Turn 1: Move only, no cast)', () => {
    const sage = {
      id: 'sage_unit',
      name: 'Sage',
      type: 'sage',
      coordinates: { x: 0, y: 2 },
      activeBuffs: [],
      specials: ['circle_of_protection'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    const ally1 = {
      id: 'ally_1',
      name: 'Ally 1',
      type: 'fighter',
      coordinates: { x: 3, y: 1 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    const ally2 = {
      id: 'ally_2',
      name: 'Ally 2',
      type: 'fighter',
      coordinates: { x: 3, y: 3 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    cm.combatants = {
      [sage.id]: sage,
      [ally1.id]: ally1,
      [ally2.id]: ally2
    };

    // Execute Sage AI
    cm.executeUnitAI(sage);

    // Sage should step to (1, 2) towards the ideal tile (2, 2)
    expect(sage.coordinates).toEqual({ x: 1, y: 2 });
    expect(sage.movesTakenThisRound).toBe(1);
    expect(sage.actionsTakenThisRound).toBe(0); // Circle not cast yet!
  });

  test('Sage continues moving towards allies (Turn 2: Move only, no cast)', () => {
    const sage = {
      id: 'sage_unit',
      name: 'Sage',
      type: 'sage',
      coordinates: { x: 1, y: 2 },
      activeBuffs: [],
      specials: ['circle_of_protection'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    const ally1 = {
      id: 'ally_1',
      name: 'Ally 1',
      type: 'fighter',
      coordinates: { x: 3, y: 1 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    const ally2 = {
      id: 'ally_2',
      name: 'Ally 2',
      type: 'fighter',
      coordinates: { x: 3, y: 3 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    cm.combatants = {
      [sage.id]: sage,
      [ally1.id]: ally1,
      [ally2.id]: ally2
    };

    // Execute Sage AI
    cm.executeUnitAI(sage);

    // Sage should step to (2, 2) towards the ideal tile (2, 2)
    expect(sage.coordinates).toEqual({ x: 2, y: 2 });
    expect(sage.movesTakenThisRound).toBe(1);
    expect(sage.actionsTakenThisRound).toBe(0); // Circle not cast yet!
  });

  test('Sage reaches the ideal tile and casts (Turn 3: Cast)', () => {
    const sage = {
      id: 'sage_unit',
      name: 'Sage',
      type: 'sage',
      coordinates: { x: 2, y: 2 },
      activeBuffs: [],
      specials: ['circle_of_protection'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    const ally1 = {
      id: 'ally_1',
      name: 'Ally 1',
      type: 'fighter',
      coordinates: { x: 3, y: 1 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    const ally2 = {
      id: 'ally_2',
      name: 'Ally 2',
      type: 'fighter',
      coordinates: { x: 3, y: 3 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    cm.combatants = {
      [sage.id]: sage,
      [ally1.id]: ally1,
      [ally2.id]: ally2
    };

    // Execute Sage AI
    cm.executeUnitAI(sage);

    // Sage should stay at (2, 2) and cast the Circle
    expect(sage.coordinates).toEqual({ x: 2, y: 2 });
    expect(sage.movesTakenThisRound).toBe(0);
    expect(sage.actionsTakenThisRound).toBe(1); // Circle cast!
  });

  test('Sage settles and casts immediately if ideal tile is too far (> 3 steps)', () => {
    const sage = {
      id: 'sage_unit',
      name: 'Sage',
      type: 'sage',
      coordinates: { x: 0, y: 2 },
      activeBuffs: [],
      specials: ['circle_of_protection'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    const ally1 = {
      id: 'ally_1',
      name: 'Ally 1',
      type: 'fighter',
      coordinates: { x: 6, y: 1 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    const ally2 = {
      id: 'ally_2',
      name: 'Ally 2',
      type: 'fighter',
      coordinates: { x: 6, y: 3 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: false
    };

    cm.combatants = {
      [sage.id]: sage,
      [ally1.id]: ally1,
      [ally2.id]: ally2
    };

    // Execute Sage AI
    cm.executeUnitAI(sage);

    // Since ideal tile is at (5, 2) (distance 5 > 3), Sage gives up on moving, settles immediately, and casts
    expect(sage.actionsTakenThisRound).toBe(1); // Circle cast immediately!
  });
});
