jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({
  turret: 'turret_img',
  turret_icon: 'turret_icon_img',
  terrain_1: 'terrain_1_img',
  walker_glowing_square: 'walker_img'
}));

import React from 'react';
import { render } from '@testing-library/react';
import { CombatManagerRedux } from '../combat-manager-redux';
import CombatGrid from '../../components/combat-panes/CombatGrid';

describe('Engineer Turret Stationary and Monk Ethereal Speed Glow Tests', () => {
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

  test('Mechanical Turret is spawned with stationary: true and cannot move via AI, food, or coordinates', () => {
    const engineer = {
      id: 'engineer_1',
      name: 'Engineer',
      type: 'engineer',
      isMonster: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 10 },
      skills: ['build_turret'],
      specials: ['build_turret'],
      coordinates: { x: 2, y: 2 }
    };

    const monster = {
      id: 'orc_1',
      name: 'Orc',
      type: 'orc',
      isMonster: true,
      stats: { speed: 5, hp: 100 },
      coordinates: { x: 6, y: 2 }
    };

    cm.initializeCombat({ crew: [engineer], monster, minions: [] });
    const liveEng = cm.getCombatant('engineer_1');

    // Build the turret
    cm._executeEngineerSummon(liveEng, { cooldown: 4 }, 'build_turret');

    const turret = Object.values(cm.combatants).find(c => c && c.type === 'turret');
    expect(turret).toBeDefined();
    expect(turret.stationary).toBe(true);
    expect(turret.isStationary).toBe(true);
    expect(turret.name).toBe('Mechanical Turret');

    const origCoords = { ...turret.coordinates };

    // 1. Attempt updateUnitCoordinates on turret
    cm.updateUnitCoordinates(turret, origCoords.x + 1, origCoords.y);
    expect(turret.coordinates).toEqual(origCoords);

    // 2. Attempt moveCloser on turret
    cm.moveCloser(turret, monster);
    expect(turret.coordinates).toEqual(origCoords);

    // 3. Attempt moveCloserToCoord on turret
    cm.moveCloserToCoord(turret, origCoords.x + 1, origCoords.y);
    expect(turret.coordinates).toEqual(origCoords);

    // 4. Attempt repositionUnit on turret
    cm.repositionUnit(turret, monster, 'retreat');
    expect(turret.coordinates).toEqual(origCoords);

    // 5. Attempt setFighterDestination on turret
    cm.setFighterDestination(turret.id, { x: origCoords.x + 2, y: origCoords.y });
    expect(turret.manualDestination).toBeUndefined();

    // 6. Attempt food seeking when wounded
    turret.hp = 10;
    cm.meatTiles = [{ x: origCoords.x + 1, y: origCoords.y }];
    cm.executeUnitAI(turret);
    expect(turret.coordinates).toEqual(origCoords);
  });

  test('Mechanical Walker CAN move (remains mobile)', () => {
    const engineer = {
      id: 'engineer_2',
      name: 'Engineer',
      type: 'engineer',
      isMonster: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 10 },
      skills: ['build_walker'],
      specials: ['build_walker'],
      coordinates: { x: 2, y: 2 }
    };

    const monster = {
      id: 'orc_2',
      name: 'Orc',
      type: 'orc',
      isMonster: true,
      stats: { speed: 5, hp: 100 },
      coordinates: { x: 6, y: 2 }
    };

    cm.initializeCombat({ crew: [engineer], monster, minions: [] });
    const liveEng = cm.getCombatant('engineer_2');

    // Build the walker
    cm._executeEngineerSummon(liveEng, { cooldown: 4 }, 'build_walker');

    const walker = Object.values(cm.combatants).find(c => c && c.type === 'walker');
    expect(walker).toBeDefined();
    expect(walker.stationary).toBeFalsy();
    expect(walker.isStationary).toBeFalsy();
  });

  test('Monk Ethereal Speed triggers with canonical alias "ethereal_speed" and "monk_ethereal_speed"', () => {
    const monk = {
      id: 'monk_test',
      name: 'Monk',
      type: 'monk',
      isMonster: false,
      stats: { speed: 10, dex: 10, def: 5, int: 5, hp: 100, atk: 12 },
      skills: ['ethereal_speed'],
      specials: ['ethereal_speed'],
      attacks: ['punch'],
      coordinates: { x: 1, y: 1 }
    };

    cm.initializeCombat({ crew: [monk], monster: { id: 'm1', coordinates: { x: 5, y: 1 }, stats: { hp: 50 } }, minions: [] });
    const liveMonk = cm.getCombatant('monk_test');

    // Using useAbility with canonical alias 'ethereal_speed'
    liveMonk.actionsTakenThisRound = 0;
    cm.useAbility(liveMonk, { id: 'ethereal_speed', type: 'buff', effect: ['buff_self_speed'] }, liveMonk);
    expect(liveMonk.etherealSpeedActive).toBe(true);
    expect(liveMonk.etherealSpeedRoundsLeft).toBeGreaterThan(0);

    // Reset and use with 'monk_ethereal_speed'
    liveMonk.etherealSpeedActive = false;
    liveMonk.actionsTakenThisRound = 0;
    cm.useAbility(liveMonk, { id: 'monk_ethereal_speed', type: 'buff', effect: ['buff_self_speed'] }, liveMonk);
    expect(liveMonk.etherealSpeedActive).toBe(true);
    expect(liveMonk.etherealSpeedRoundsLeft).toBeGreaterThan(0);
  });

  test('CombatGrid renders organic yellow glow (monk-ethereal-speed-glow) when Monk has etherealSpeedActive', () => {
    const monkFighter = {
      id: 'monk_hero',
      type: 'monk',
      name: 'Monk Hero',
      coordinates: { x: 2, y: 2 },
      hp: 100,
      starting_hp: 100,
      etherealSpeedActive: true
    };

    const battleData = {
      monk_hero: {
        ...monkFighter,
        etherealSpeedActive: true
      }
    };

    const { getByTestId, queryByTestId } = render(
      <CombatGrid
        crew={[monkFighter]}
        monsters={[]}
        battleData={battleData}
        getFighterDetails={(f) => battleData[f.id]}
        combatManager={{
          ...cm,
          combatants: battleData,
          getCombatant: (id) => battleData[id],
          round: 1
        }}
        numBoardColumns={8}
      />
    );

    const glow = getByTestId('monk-ethereal-speed-glow');
    expect(glow).toBeInTheDocument();
    expect(glow.style.animation).toContain('organicGlow');
    expect(glow.style.boxShadow).toContain('#ffdd57');
  });
});
