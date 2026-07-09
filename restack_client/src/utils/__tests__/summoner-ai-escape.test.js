jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Summoner AI Escape Logic', () => {
  test('Summoner should avoid cornering herself when choosing movement', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = (msg) => console.log('COMBAT LOG:', msg);
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };

    const vaelis = {
      id: 'Vaelis',
      name: 'Vaelis',
      type: 'summoner',
      isMonster: false,
      dead: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: [],
      attacks: ['magic_missile'],
      coordinates: { x: 0, y: 5 },
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      endurance: 20,
      maxEndurance: 20,
      activeBuffs: [],
      activeDebuffs: [],
    };

    // Place an ally minion at (0, 4) and (1, 5) to block her escape paths if she stays at (0, 5)
    const minion1 = {
      id: 'minion_1',
      name: 'minion',
      isMinion: true,
      isMonster: false,
      dead: false,
      coordinates: { x: 0, y: 4 },
      hp: 20,
      stats: { speed: 5 },
    };

    // Place an enemy skeleton at (1, 4)
    const skeleton = {
      id: 'skeleton',
      name: 'skeleton',
      isMonster: true,
      dead: false,
      coordinates: { x: 1, y: 4 },
      hp: 50,
      stats: { speed: 3 },
    };

    cm.combatants = {
      Vaelis: vaelis,
      minion_1: minion1,
      skeleton: skeleton
    };

    // Before AI turn: Vaelis is at (0, 5)
    // Run Summoner AI
    cm._aiSummoner(vaelis);

    // Let's verify where she moves. The tile (0, 5) is cornered because:
    // (0, 4) is blocked by minion1
    // (1, 5) is free but if she stays at (0, 5) it has only 1 free adjacent (1, 5)
    // She should choose to move to a safer tile with more escape routes if possible, or she shouldn't get stuck.
    console.log('Vaelis position after AI:', vaelis.coordinates);
    
    // We expect her to move away from (0, 5) to (1, 5) to get more breathing room (more escape routes).
    expect(vaelis.coordinates).not.toEqual({ x: 0, y: 5 });
  });
});
