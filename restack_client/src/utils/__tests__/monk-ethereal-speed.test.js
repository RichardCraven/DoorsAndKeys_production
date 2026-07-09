jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('Monk Ethereal Speed AI Movement Tests', () => {
  test('Monk moves 2 steps with Ethereal Speed and 1 step without Ethereal Speed', () => {
    const cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    const monk = {
      id: 'monk_unit',
      name: 'Monk',
      type: 'monk',
      isMonster: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: ['monk_ethereal_speed'],
      attacks: ['punch'],
      coordinates: { x: 1, y: 1 }
    };

    const target = {
      id: 'goblin_unit',
      name: 'Goblin',
      type: 'goblin',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, hp: 100 },
      coordinates: { x: 5, y: 1 } // Moved to x=5 to account for 2x2 size occupying x=4
    };

    cm.initializeCombat({ crew: [monk], monster: target, minions: [] });

    const liveMonk = cm.getCombatant('monk_unit');
    const liveTarget = cm.getCombatant('goblin_unit');

    // Scenario A: Without Ethereal Speed
    cm.updateUnitCoordinates(liveMonk, 1, 1);
    cm.updateUnitCoordinates(liveTarget, 5, 1);
    liveMonk.etherealSpeedActive = false;
    liveMonk.cooldowns = { monk_ethereal_speed: 5 };
    liveMonk.movesTakenThisRound = 0;
    liveMonk.actionsTakenThisRound = 0;

    cm.executeUnitAI(liveMonk);

    expect(liveMonk.coordinates).toEqual({ x: 2, y: 1 });
    expect(liveMonk.actionsTakenThisRound).toBe(0);

    // Scenario B: With Ethereal Speed active
    cm.updateUnitCoordinates(liveMonk, 1, 1);
    cm.updateUnitCoordinates(liveTarget, 5, 1);
    liveMonk.etherealSpeedActive = true;
    liveMonk.etherealSpeedRoundsLeft = 2;
    liveMonk.movesTakenThisRound = 0;
    liveMonk.actionsTakenThisRound = 0;
    liveMonk.cooldowns = {};

    cm.executeUnitAI(liveMonk);

    // Should take 2 steps, ending at (3, 1)
    expect(liveMonk.coordinates).toEqual({ x: 3, y: 1 });
    // Since target is at (4, 1), distance from (3, 1) to (4, 1) is 1 (close range)
    // So Monk should have successfully attacked the target!
    expect(liveMonk.actionsTakenThisRound).toBe(1);
  });
});
