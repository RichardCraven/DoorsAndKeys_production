import { CombatManagerRedux } from '../combat-manager-redux';

describe('CombatManagerRedux betrayal mechanics', () => {
  let cm;
  let priest;
  let wizard;
  let monster;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.hitCheck = () => true;

    priest = {
      id: 'priest_1',
      name: 'Priest',
      type: 'priest',
      stats: { hp: 100, atk: 10, def: 5, speed: 10, vitality: 30, dex: 8 },
      hp: 100,
      maxEndurance: 30,
      endurance: 30,
      coordinates: { x: 0, y: 1 },
      activeDebuffs: [],
      damageIndicators: [],
      skills: ['heal', 'circle_of_protection'],
      specials: ['heal', 'circle_of_protection'],
      cooldowns: {},
    };

    wizard = {
      id: 'wizard_1',
      name: 'Wizard',
      type: 'wizard',
      stats: { hp: 100, atk: 12, def: 5, speed: 8, vitality: 30, dex: 8 },
      hp: 100,
      maxEndurance: 30,
      endurance: 30,
      coordinates: { x: 0, y: 2 },
      activeDebuffs: [],
      damageIndicators: [],
      skills: ['lightning_strike'],
      specials: ['lightning_strike'],
      cooldowns: {},
    };

    monster = {
      id: 'ogre_1',
      name: 'Ogre',
      type: 'ogre',
      isMonster: true,
      stats: { hp: 200, atk: 12, def: 10, speed: 4, vitality: 50, dex: 3 },
      hp: 200,
      maxEndurance: 50,
      endurance: 50,
      coordinates: { x: 5, y: 2 },
      activeDebuffs: [],
      damageIndicators: [],
      skills: [],
      specials: [],
      cooldowns: {},
    };

    cm.combatants = {
      [priest.id]: priest,
      [wizard.id]: wizard,
      [monster.id]: monster,
    };
  });

  test('betrayed unit restricts passive/buff/heal abilities, but allows damage abilities', () => {
    // Under normal conditions, priest can use heal
    expect(cm._abilityReady(priest, 'heal')).toBe(true);
    expect(cm._abilityReady(priest, 'circle_of_protection')).toBe(true);

    // Apply betrayed status to Priest
    priest.betrayed = true;

    // Priest should not be ready to cast heal or circle of protection
    expect(cm._abilityReady(priest, 'heal')).toBe(false);
    expect(cm._abilityReady(priest, 'circle_of_protection')).toBe(false);

    // Wizard is betrayed
    expect(cm._abilityReady(wizard, 'lightning_strike')).toBe(true);
    wizard.betrayed = true;
    // Wizard should still be ready to use lightning_strike because it deals damage
    expect(cm._abilityReady(wizard, 'lightning_strike')).toBe(true);
  });
});
