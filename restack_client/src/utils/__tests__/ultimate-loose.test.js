jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';
import { AnimationManagerRedux } from '../animation-manager-redux';

describe('Ultimate Loose Variant', () => {
  let cm;
  let animManager;
  let ranger;
  let monster;

  beforeEach(() => {
    jest.useFakeTimers();
    cm = new CombatManagerRedux();
    animManager = new AnimationManagerRedux();
    cm.connectAnimationManagerRedux(animManager);
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);

    ranger = {
      id: 'ranger_1',
      name: 'Ranger',
      type: 'ranger',
      isMonster: false,
      hp: 100,
      starting_hp: 100,
      power: 100,
      ultimateActive: true,
      stats: { speed: 10, dex: 10, def: 5, int: 10, atk: 15 },
      specialActions: [
        {
          id: 'loose',
          name: 'Loose',
          type: 'damage projectile',
          range: 'far',
          atkPercentage: 100,
          projectiles: 1,
          ultimate: {
            projectiles: 5,
            flatDamage: 5,
            range: 'unlimited'
          }
        }
      ],
      coordinates: { x: 0, y: 2 }
    };

    monster = {
      id: 'monster_1',
      name: 'Ogre',
      type: 'ogre',
      isMonster: true,
      hp: 200,
      starting_hp: 200,
      stats: { speed: 5, dex: 5, def: 5, hp: 200 },
      coordinates: { x: 5, y: 2 }
    };

    cm.initializeCombat({ crew: [ranger], monster });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Casting loose with ultimate active triggers 5 separate projectiles delayed by 1/3 second each', () => {
    const emitted = [];
    animManager._emit = (item) => emitted.push(item);

    const spec = cm.resolveSpecial(ranger, 'loose');
    expect(spec).toBeDefined();
    expect(spec.ultimate).toBeDefined();

    cm.useAbility(ranger, spec, monster);

    // Fast-forward all timers to let all 5 projectiles fire and hit
    jest.runAllTimers();

    const projectiles = emitted.filter(e => e.type === 'generic_projectile' && e.subtype === 'loose');
    expect(projectiles.length).toBe(5);
  });
});
