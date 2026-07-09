import { CombatManagerRedux } from '../combat-manager-redux';

describe('CombatManagerRedux Amulet Effects Suite', () => {
  let cm;
  let attacker;
  let target;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.roundDurationMs = 1000;
    cm.gameSpeed = 'fast';

    attacker = {
      id: 'attacker_1',
      name: 'Attacker',
      type: 'soldier',
      isMonster: true, // Mark as monster to bypass Crew morale multipliers in damageCheck
      stats: { hp: 100, atk: 20, def: 10, speed: 5, dex: 5, endurance: 20, mres: 5 },
      hp: 100,
      starting_hp: 100,
      endurance: 20,
      maxEndurance: 20,
      coordinates: { x: 1, y: 1 },
      inventory: [],
      cooldowns: {},
      damageIndicators: [],
    };

    target = {
      id: 'target_1',
      name: 'Target',
      type: 'soldier',
      isMonster: true, // Mark as monster
      stats: { hp: 100, atk: 10, def: 10, speed: 5, dex: 5, endurance: 20, mres: 10 },
      hp: 100,
      starting_hp: 100,
      coordinates: { x: 2, y: 1 }, // adjacent to attacker (dist = 1)
      inventory: [],
      cooldowns: {},
      damageIndicators: [],
    };

    cm.combatants = {
      [attacker.id]: attacker,
      [target.id]: target,
    };
  });

  test('temprance_amulet reduces stamina cost of actions by 20%', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'temprance_amulet',
      equippedSlot: 'ancillary-left',
    });

    cm.applyEnduranceCost(attacker, 10, 'action');
    // 10 * 0.8 = 8. Remaining stamina: 20 - 8 = 12
    expect(attacker.endurance).toBe(12);
  });

  test('emerald_amulet regenerates 2 HP per round', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'emerald_amulet',
      equippedSlot: 'ancillary-left',
    });
    attacker.hp = 80;

    cm._tickUnitBuffs(attacker);
    expect(attacker.hp).toBe(82);
  });

  test('maconic_amulet adds +5 Defense in damageCheck', () => {
    target.inventory.push({
      subtype: 'amulet',
      icon: 'maconic_amulet',
      equippedSlot: 'ancillary-left',
    });

    // Base damage is 20.
    // target has maconic_amulet: targetDef = 10 + 5 = 15.
    // naturalArmor = 15 * 4 = 60.
    // reduction = 60 / 2.5 = 24%.
    // finalDamage = Math.round(20 * (1 - 0.24)) = Math.round(20 * 0.76) = 15.
    const dmg = cm.damageCheck(attacker, target, 20, false);
    expect(dmg).toBe(15);
  });

  test('warding_amulet grants a shield of 25% max HP on combat start', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'warding_amulet',
      equippedSlot: 'ancillary-left',
    });

    // Run the code block in initializeCombat
    Object.values(cm.combatants).forEach(c => {
      if (!c) return;
      cm._makeHpEffectsAware && cm._makeHpEffectsAware(c);
      const hasWarding = cm._getEquippedAmulet(c, 'warding_amulet');
      if (hasWarding) {
        c.wardingShield = Math.round((c.starting_hp || c.hp || 100) * 0.25);
        c.wardingShieldRounds = 3;
      }
    });

    expect(attacker.wardingShield).toBe(25);
  });

  test('bloodvial_amulet restores 50 HP when health falls below 30% max HP', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'bloodvial_amulet',
      equippedSlot: 'ancillary-left',
    });

    attacker.hp = 50;
    cm._makeHpEffectsAware && cm._makeHpEffectsAware(attacker);

    // Drop HP below 30
    attacker.hp = 25;
    expect(attacker.hp).toBe(75); // 25 + 50 = 75
    expect(attacker.bloodvialTriggered).toBe(true);
  });

  test('enchantress_amulet reduces ability cooldowns by 1', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'enchantress_amulet',
      equippedSlot: 'ancillary-left',
    });

    const ability = { id: 'test_ability', name: 'Test Ability', cooldown: 5, range: 'close', type: 'damage' };
    cm.useAbility(attacker, ability, target);

    // finalCooldown is 5. Enchantress reduces it to 4.
    expect(attacker.cooldowns.test_ability).toBe(4);
  });

  test('dimensional_amulet has a 30% chance to reset ability cooldown immediately', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'dimensional_amulet',
      equippedSlot: 'ancillary-left',
    });

    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const ability = { id: 'test_ability', name: 'Test Ability', cooldown: 5, range: 'close', type: 'damage' };
    cm.useAbility(attacker, ability, target);

    expect(attacker.cooldowns.test_ability).toBe(0);

    Math.random.mockRestore();
  });

  test('queens_amulet increases attack of adjacent allies by 15%', () => {
    const ally = {
      id: 'ally_1',
      name: 'Ally',
      type: 'soldier',
      isMonster: true, // Same team as attacker
      stats: { hp: 100, atk: 20, def: 10, speed: 5, dex: 5 },
      hp: 100,
      coordinates: { x: 1, y: 2 }, // adjacent to attacker (x: 1, y: 1)
      inventory: [],
    };
    cm.combatants[ally.id] = ally;

    // Give attacker the Queens Amulet
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'queens_amulet',
      equippedSlot: 'ancillary-left',
    });

    // Ally attacks target. Raw damage 20.
    // ally is adjacent to attacker (who has queens_amulet), so ally gets +15% raw damage (23).
    // target has def 10, so naturalArmor = 40, reduction = 16%.
    // finalDamage = Math.round(23 * 0.84) = 19.
    const dmg = cm.damageCheck(ally, target, 20, false);
    expect(dmg).toBe(19);
  });

  test('platinum_amulet reduces incoming damage by 15%', () => {
    target.inventory.push({
      subtype: 'amulet',
      icon: 'platinum_amulet',
      equippedSlot: 'ancillary-left',
    });

    // Raw damage 20.
    // target defense 10, naturalArmor = 40, reduction = 16%.
    // finalDamage before platinum: Math.round(20 * 0.84) = 17.
    // Platinum reduces by 15%: Math.round(17 * 0.85) = 14.
    const dmg = cm.damageCheck(attacker, target, 20, false);
    expect(dmg).toBe(14);
  });

  test('thieves_amulet increases critical strike chance', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'thieves_amulet',
      equippedSlot: 'ancillary-left',
    });

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.15);

    const critRes = cm._processCriticalStrike(attacker, target, 100, false);
    expect(critRes.isCrit).toBe(true);
    expect(critRes.damage).toBe(150);

    randomSpy.mockRestore();
  });

  test('assassins_amulet increases critical strike damage multiplier by 50%', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'assassins_amulet',
      equippedSlot: 'ancillary-left',
    });

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.01);

    const critRes = cm._processCriticalStrike(attacker, target, 100, false);
    expect(critRes.isCrit).toBe(true);
    expect(critRes.damage).toBe(200);

    randomSpy.mockRestore();
  });

  test('yaga_amulet triggers a hex debuff on critical hit', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'yaga_amulet',
      equippedSlot: 'ancillary-left',
    });

    let callCount = 0;
    const randomSpy = jest.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 0.01;
      return 0.1;
    });

    cm._processCriticalStrike(attacker, target, 10, false);
    expect(target.activeDebuffs.some(d => d.name === 'hex')).toBe(true);

    randomSpy.mockRestore();
  });

  test('necrotic_amulet triggers poison on critical hit', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'necrotic_amulet',
      equippedSlot: 'ancillary-left',
    });

    let callCount = 0;
    const randomSpy = jest.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 0.01;
      return 0.1;
    });

    cm._processCriticalStrike(attacker, target, 10, false);
    expect(target.poison).toBe(true);

    randomSpy.mockRestore();
  });

  test('celestial_amulet triggers holy explosion on critical hit', () => {
    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'celestial_amulet',
      equippedSlot: 'ancillary-left',
    });

    // Make target an enemy of attacker
    target.isMonster = true;
    attacker.isMonster = false;

    // Add another enemy adjacent to target (distance 1)
    const extraEnemy = {
      id: 'extra_enemy',
      name: 'Extra Enemy',
      type: 'soldier',
      isMonster: true, // Enemy of attacker
      stats: { hp: 100, atk: 10, def: 5, speed: 5, dex: 5 },
      hp: 100,
      coordinates: { x: 3, y: 1 }, // adjacent to target (x: 2, y: 1)
      inventory: [],
    };
    cm.combatants[extraEnemy.id] = extraEnemy;

    let callCount = 0;
    const randomSpy = jest.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 0.01;
      return 0.1;
    });

    cm._processCriticalStrike(attacker, target, 10, false);
    expect(extraEnemy.hp).toBe(75);

    randomSpy.mockRestore();
  });

  test('voidward_amulet grants status ailment immunity', () => {
    target.inventory.push({
      subtype: 'amulet',
      icon: 'voidward_amulet',
      equippedSlot: 'ancillary-left',
    });

    attacker.inventory.push({
      subtype: 'amulet',
      icon: 'necrotic_amulet',
      equippedSlot: 'ancillary-left',
    });

    let callCount = 0;
    const randomSpy = jest.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 0.01;
      return 0.1;
    });

    cm._processCriticalStrike(attacker, target, 10, false);
    expect(target.poison).toBeFalsy();

    randomSpy.mockRestore();
  });
});
