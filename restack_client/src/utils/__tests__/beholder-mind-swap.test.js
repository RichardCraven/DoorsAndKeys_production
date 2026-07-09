jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Beholder Boss & Mind Swap Animation Trigger', () => {
  test('mind_swap triggers correct animations and durations in Redux engine', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    const beholder = {
      id: 'beholder_boss',
      name: 'The Great Beholder',
      type: 'beholder',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, int: 5, hp: 310, atk: 15 },
      skills: ['mind_swap'],
      coordinates: { x: 7, y: 2 }
    };

    const target1 = {
      id: 'player_1',
      name: 'Soldier',
      type: 'soldier',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, hp: 100 },
      coordinates: { x: 1, y: 1 }
    };

    const target2 = {
      id: 'player_2',
      name: 'Wizard',
      type: 'wizard',
      isMonster: false,
      stats: { speed: 5, dex: 5, def: 5, hp: 80 },
      coordinates: { x: 2, y: 3 }
    };

    cm.initializeCombat({ crew: [target1, target2], monster: beholder, minions: [] });

    const boss = cm.getCombatant('beholder_boss');
    const p1 = cm.getCombatant('player_1');
    const p2 = cm.getCombatant('player_2');

    const abilitySpec = cm.resolveSpecial(boss, 'mind_swap');

    expect(abilitySpec).toBeDefined();
    expect(abilitySpec.id).toBe('mind_swap');

    // Capture their initial coordinates as assigned by the board initializer
    const bossCoords = { ...boss.coordinates };
    const p1Coords = { ...p1.coordinates };
    const p2Coords = { ...p2.coordinates };

    jest.useFakeTimers();
    cm.useAbility(boss, abilitySpec, p1);

    // Verify first triggerAbility call (Beholder -> Player 1)
    expect(cm.animManagerRedux.triggerAbility).toHaveBeenCalledWith(
      bossCoords, // source (Beholder)
      p1Coords, // target (Player 1)
      'mind_swap',
      false,
      null,
      'beholder_boss',
      null,
      350
    );

    // Fast forward to 350ms for second beam
    jest.advanceTimersByTime(350);

    // Verify second triggerAbility call (Player 1 -> Player 2)
    expect(cm.animManagerRedux.triggerAbility).toHaveBeenLastCalledWith(
      p1Coords, // source (Player 1)
      p2Coords, // target (Player 2)
      'mind_swap_chain',
      false,
      null,
      'beholder_boss',
      null,
      800
    );

    jest.useRealTimers();
  });
});
