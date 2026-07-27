jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';
import { AnimationManagerRedux } from '../animation-manager-redux';

describe('Summon Familiar Rune Disassembly Animation', () => {
  let cm;
  let animManager;
  let unit;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    animManager = new AnimationManagerRedux();
    cm.connectAnimationManagerRedux(animManager);
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();

    unit = {
      id: 'pc_1',
      name: 'Hero',
      type: 'wizard',
      isMonster: false,
      hp: 100,
      stats: { int: 10, dex: 10, speed: 5, atk: 10, def: 5 },
      coordinates: { x: 0, y: 0 },
      inventory: [
        {
          id: 'item_archaic_rune',
          _im_key: 'archaic_rune',
          name: 'Archaic Rune',
          equippedSlot: 'pet'
        }
      ],
      specials: ['summon_familiar']
    };

    cm.initializeCombat({ crew: [unit], monster: { id: 'm1', isMonster: true, stats: { hp: 50, speed: 1 }, coordinates: { x: 5, y: 5 } } });
  });

  test('Casting summon_familiar triggers triggerFamiliarSummon with equipped archaic rune', () => {
    const emitted = [];
    animManager._emit = (item) => emitted.push(item);

    const spec = cm.resolveSpecial(unit, 'summon_familiar');
    expect(spec).toBeDefined();

    cm.useAbility(unit, spec, unit);

    const familiarAnim = emitted.find(e => e.type === 'familiar_summon_rune');
    expect(familiarAnim).toBeDefined();
    expect(familiarAnim.runeKey).toBe('archaic');
  });
});
