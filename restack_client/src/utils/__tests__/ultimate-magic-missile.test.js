jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';
import { AnimationManagerRedux } from '../animation-manager-redux';

describe('Ultimate Magic Missile Golden Variant', () => {
  let cm;
  let animManager;
  let wizard;
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

    wizard = {
      id: 'wizard_1',
      name: 'Wizard',
      type: 'wizard',
      isMonster: false,
      hp: 100,
      starting_hp: 100,
      power: 100,
      ultimateActive: true,
      stats: { speed: 10, dex: 10, def: 5, int: 20, atk: 15 },
      specialActions: [
        {
          id: 'magic_missile',
          name: 'Magic Missile',
          type: 'damage projectile',
          range: 'far',
          flatDamage: 5,
          projectiles: 3,
          ultimate: {
            projectiles: 7,
            flatDamage: 10,
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

    cm.initializeCombat({ crew: [wizard], monster });
  });

  test('Casting magic missile with ultimate active triggers 7 golden projectiles with isUltimate: true', () => {
    const emitted = [];
    animManager._emit = (item) => emitted.push(item);

    const spec = cm.resolveSpecial(wizard, 'magic_missile');
    expect(spec).toBeDefined();
    expect(spec.ultimate).toBeDefined();

    cm.useAbility(wizard, spec, monster);

    // Fast-forward timeouts for 7 missiles
    jest.runAllTimers();

    const projectiles = emitted.filter(e => e.type === 'magic_missile_projectile');
    expect(projectiles.length).toBe(7);
    expect(projectiles.every(p => p.isUltimate === true)).toBe(true);

    const sigils = emitted.filter(e => e.type === 'magic_missile_hit_sigil');
    expect(sigils.length).toBe(7);
    expect(sigils.every(s => s.isUltimate === true)).toBe(true);
  });
});
