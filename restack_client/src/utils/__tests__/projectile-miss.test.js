jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';
import { AnimationManagerRedux } from '../animation-manager-redux';

describe('Projectile Miss Drip Animations', () => {
  let cm;
  let am;
  let emittedEvents;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    
    am = new AnimationManagerRedux();
    emittedEvents = [];
    am._emit = (event) => {
      emittedEvents.push(event);
    };
    cm.connectAnimationManagerRedux(am);

    cm.hitCheck = jest.fn().mockReturnValue(false); // Force a miss
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();
    cm.wakeSleepingTarget = jest.fn();
  });

  const runMissTest = (abilityId, variantName) => {
    const wizard = {
      id: 'wizard_unit',
      name: 'Wizard',
      type: 'wizard',
      coordinates: { x: 0, y: 2 },
      stats: { int: 0, speed: 5, dex: 5, def: 5 },
      isMonster: false,
      activeBuffs: [],
      specials: [],
      cooldowns: {}
    };

    const target = {
      id: 'target_unit',
      name: 'Primary Target',
      type: 'fighter',
      coordinates: { x: 2, y: 2 },
      stats: { speed: 5, dex: 5, def: 5 },
      isMonster: true,
      hp: 100,
      activeBuffs: [],
      damageIndicators: []
    };

    cm.combatants = {
      [wizard.id]: wizard,
      [target.id]: target
    };

    const ability = {
      id: abilityId,
      name: abilityId.replace('_', ' '),
      damage: 20,
      range: 'medium',
      type: 'damage'
    };

    jest.useFakeTimers();
    cm.useAbility(wizard, ability, target);
    jest.runAllTimers();
    jest.useRealTimers();

    // Verify that a projectile traveled
    const travelEvent = emittedEvents.find(e => e.type.includes('projectile'));
    expect(travelEvent).toBeDefined();

    // Verify that no explosion/burst event occurred
    const burstEvent = emittedEvents.find(e => e.type.includes('explosion') || e.type.includes('burst'));
    expect(burstEvent).toBeUndefined();

    // Verify that the drip event occurred
    const dripEvent = emittedEvents.find(e => e.type === 'projectile_drip');
    expect(dripEvent).toBeDefined();
    expect(dripEvent.variant).toBe(variantName);
    expect(dripEvent.duration).toBe(1000);
    expect(dripEvent.tgtPx).toBeDefined();
  };

  test('Fireball miss triggers fireball drip animation', () => {
    runMissTest('fireball', 'fireball');
  });

  test('Ice Blast miss triggers ice drip animation', () => {
    runMissTest('ice_blast', 'ice_blast');
  });

  test('Acid Blast miss triggers acid drip animation', () => {
    runMissTest('acid_blast', 'acid_blast');
  });
});
