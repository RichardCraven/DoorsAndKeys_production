jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Skeleton Vaelis Attack Bug Debugging', () => {
  test('reproduce skeleton at (0, 4) targeting Vaelis at (0, 5)', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = (msg) => console.log('COMBAT LOG:', msg);
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    const vaelis = {
      id: 'Vaelis',
      name: 'Vaelis',
      type: 'summoner',
      isMonster: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: [],
      attacks: ['magic_missile'],
      coordinates: { x: 0, y: 5 }
    };

    const skeleton = {
      id: 'bones_1',
      name: 'bones',
      type: 'skeleton',
      isMinion: true,
      isMonster: true,
      dead: false,
      coordinates: { x: 0, y: 4 },
      hp: 38,
      starting_hp: 50,
      stats: { str: 3, dex: 3, atk: 4, def: 2, speed: 3 },
      attacks: ['sword_swing'],
      specials: ['reassembly'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      endurance: 20,
      maxEndurance: 20,
      activeBuffs: [],
      activeDebuffs: [],
    };

    const skeleton2 = {
      id: 'bones_2',
      name: 'bones',
      type: 'skeleton',
      isMinion: true,
      isMonster: true,
      dead: false,
      coordinates: { x: 0, y: 3 },
      hp: 42,
      starting_hp: 50,
      stats: { str: 3, dex: 3, atk: 4, def: 2, speed: 3 },
      attacks: ['sword_swing'],
      specials: ['reassembly'],
      cooldowns: {},
      movesTakenThisRound: 0,
      actionsTakenThisRound: 0,
      endurance: 20,
      maxEndurance: 20,
      activeBuffs: [],
      activeDebuffs: [],
    };

    cm.combatants = {
      Vaelis: vaelis,
      bones_1: skeleton,
      bones_2: skeleton2
    };

    const rangeType = 'close';
    const inRange = cm.targetInRange(skeleton, vaelis, rangeType);
    console.log('--- targetInRange result:', inRange);

    const baseAttack = skeleton.attacks[0];
    const resolved = cm.resolveSpecial(skeleton, baseAttack);
    console.log('--- resolved sword_swing:', resolved);

    console.log('--- Executing executeUnitAI for skeleton at (0, 4) ---');
    cm.executeUnitAI(skeleton);
    console.log('--- actionsTakenThisRound:', skeleton.actionsTakenThisRound);
    console.log('--- coordinates after AI:', skeleton.coordinates);
  });
});
