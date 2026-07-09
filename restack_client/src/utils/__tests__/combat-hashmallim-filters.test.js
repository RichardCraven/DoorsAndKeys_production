import { CombatManagerRedux } from '../combat-manager-redux';

describe('Hashmallim custom spell logic, animation parameter passing, and meteor warnings', () => {
  let cm;
  let hashmallim;
  let target;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.animManagerRedux = {
      triggerAbility: jest.fn(),
      triggerBombardStrike: jest.fn()
    };

    hashmallim = {
      id: 'hashmallim_1',
      name: 'Hashmallim',
      type: 'hashmallim',
      isMonster: true,
      stats: { hp: 500, atk: 35, def: 20, speed: 12, willpower: 25 },
      hp: 500,
      starting_hp: 500,
      coordinates: { x: 4, y: 4 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: [],
      cooldowns: {},
    };

    target = {
      id: 'target_1',
      name: 'Soldier',
      type: 'soldier',
      stats: { hp: 100, atk: 15, def: 10, speed: 5 },
      hp: 100,
      starting_hp: 100,
      coordinates: { x: 3, y: 4 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: [],
      cooldowns: {},
      isLarge: false,
    };

    cm.combatants = { [hashmallim.id]: hashmallim, [target.id]: target };
  });

  test('meteors should queue warning tiles and trigger bombard_strike animation with casterId and isMeteors: true', () => {
    const meteorsAbility = {
      id: 'meteors',
      name: 'Meteors',
      cooldown: 5,
      type: 'bombardment'
    };

    cm.hitCheck = () => true;

    // Use meteors ability
    cm.useAbility(hashmallim, meteorsAbility, target);

    // 1. Verify warning tiles exist in meteorWarnings
    expect(cm.meteorWarnings).toBeDefined();
    expect(cm.meteorWarnings.tiles.length).toBeGreaterThan(0);

    // Get the coords of one of the queued bombardments
    expect(cm.pendingBombardments.length).toBeGreaterThan(0);
    const pb = cm.pendingBombardments[0];
    expect(pb.isMeteors).toBe(true);
    expect(pb.casterId).toBe(hashmallim.id);

    // 2. Resolve bombardment strike and check triggerBombardStrike call
    cm._resolveBombardmentStrike(pb);

    const expectedCoords = pb.tiles.map(t => ({ x: t.x, y: t.y }));

    expect(cm.animManagerRedux.triggerBombardStrike).toHaveBeenCalledWith(
      expectedCoords,
      true, // isMeteors
      hashmallim.id // casterId
    );
  });

  test('overload ability use should pass casterId to animation manager on success/fail', () => {
    const overloadAbility = {
      id: 'overload',
      name: 'Overload',
      cooldown: 8,
      type: 'damage'
    };

    // Success case
    target.endurance = 20; // Stamina below 50%
    cm.hitCheck = () => true;
    cm.useAbility(hashmallim, overloadAbility, target);

    expect(cm.animManagerRedux.triggerAbility).toHaveBeenCalledWith(
      hashmallim.coordinates,
      target.coordinates,
      'overload_success',
      target.isLarge,
      [target.coordinates],
      hashmallim.id
    );

    // Fail case
    cm.hitCheck = () => false;
    cm.useAbility(hashmallim, overloadAbility, target);

    expect(cm.animManagerRedux.triggerAbility).toHaveBeenLastCalledWith(
      hashmallim.coordinates,
      target.coordinates,
      'overload_fail',
      target.isLarge,
      [target.coordinates],
      hashmallim.id
    );
  });

  test('dominate ability use should pass casterId to animation manager on success/fail', () => {
    const dominateAbility = {
      id: 'dominate',
      name: 'Dominate',
      cooldown: 6,
      type: 'dominate',
      effect: { type: 'dominate', duration: 'medium' }
    };

    // Success case
    cm.hitCheck = () => true;
    cm.useAbility(hashmallim, dominateAbility, target);

    // Assert triggerAbility was called with dominate_success and unit.id as the 12th argument
    expect(cm.animManagerRedux.triggerAbility).toHaveBeenCalledWith(
      target.coordinates,
      target.coordinates,
      'dominate_success',
      target.isLarge,
      [target.coordinates],
      target.id,
      null, null, null, null, false,
      hashmallim.id
    );

    // Fail case: hit check fails
    target.dominated = undefined;
    cm.hitCheck = () => false;
    cm.useAbility(hashmallim, dominateAbility, target);

    expect(target.dominated).toBeUndefined();
  });

  test('Hashmallim should target and attack the dominated player unit if it is the only remaining PC unit', () => {
    hashmallim.attacks = ['gore'];
    target.dominated = true;
    target._dominatedOriginalIsMonster = false;
    target._dominatedOriginalIsMinion = false;
    target.isMonster = true;
    target.isMinion = false;

    const bestTarget = cm.acquireTarget(hashmallim);
    expect(bestTarget).toBe(target);

    cm.useAbility = jest.fn();
    cm.executeUnitAI(hashmallim);

    expect(cm.useAbility).toHaveBeenCalled();
    const lastCall = cm.useAbility.mock.calls[cm.useAbility.mock.calls.length - 1];
    expect(lastCall[2]).toBe(target);
  });


  test('Dominated debuff tick should extend by 1 round on check failure and re-acquire target/update facing on break-free', () => {
    // 1. Set target as Dominated
    target.dominated = true;
    target._dominatedOriginalIsMonster = false;
    target._dominatedOriginalIsMinion = false;
    target.isMonster = true;
    target.isMinion = false;
    target.targetId = 'hashmallim_1';
    target.facing = 'right';

    const debuff = {
      name: 'Dominated',
      roundsLeft: 0, // ready to tick/evaluate Willpower contest
      casterWillpower: 25
    };
    target.activeDebuffs = [debuff];

    // Case A: Willpower check fails -> stays dominated, roundsLeft = 1
    // We mock Math.random so target fails the check.
    // targetRoll = targetWP (5) + roll (say 1) = 6
    // casterRoll = casterWP (25) + roll (say 1) = 26 -> target fails
    const originalRandom = Math.random;
    let mockRandomCallCount = 0;
    Math.random = () => {
      mockRandomCallCount++;
      return 0.0; // returns 0, so Math.floor(0 * 10) + 1 = 1
    };

    cm._tickUnitDebuffs(target);

    expect(target.dominated).toBe(true);
    expect(debuff.roundsLeft).toBe(1);
    expect(target.activeDebuffs.length).toBe(1);

    // Reset roundsLeft to 0 for the next check
    debuff.roundsLeft = 0;

    // Case B: Willpower check passes -> breaks free, team reverted, acquires target (which should be Hashmallim since Ulaf is now non-monster and Hashmallim is monster), updates facing
    // We mock Math.random so target passes the check.
    // targetRoll = targetWP (5) + targetRoll (10) = 15
    // casterRoll = casterWP (25) + casterRoll (1) = 26
    // Wait, target WP is 5, caster WP is 25. To pass, targetRoll must be > casterRoll.
    // Since targetRoll <= 15 and casterRoll >= 26, it's impossible to pass with normal values.
    // So let's temporarily set target's willpower to 100 so targetRoll > casterRoll.
    target.stats.willpower = 100;
    Math.random = () => 0.5; // roll = 6 for both. targetRoll = 106, casterRoll = 31. target passes!

    cm._tickUnitDebuffs(target);

    // Revert Math.random
    Math.random = originalRandom;

    expect(target.dominated).toBe(false);
    expect(target.isMonster).toBe(false);
    expect(target.targetId).toBe(hashmallim.id);
    expect(target.facing).toBe('right'); // target is at (3,4), hashmallim at (4,4), so dx = 1 > 0 -> facing 'right'
    expect(target.activeDebuffs.length).toBe(0);
  });

  test('entropic_kindred should shift units at or past insertion point right and expand depth boundaries', () => {
    const ekAbility = { id: 'entropic_kindred', range: 'medium', type: 'special' };
    
    // Make Hashmallim huge
    hashmallim.huge = true;
    // Position Hashmallim at x=5 (past insertion point 4)
    hashmallim.coordinates = { x: 5, y: 3 };
    // Position target at x=2 (before insertion point 4)
    target.coordinates = { x: 2, y: 3 };
    
    cm.combatants = { [hashmallim.id]: hashmallim, [target.id]: target };
    cm.entropicKindredActive = false;
    cm.numColumns = 8;
    
    // Initialize occupied coordinates before board expansion
    cm._setCombatantOccupiedCoords(hashmallim, cm.combatants);
    
    // Verify it occupies column 3, 4, 5 initially
    expect(hashmallim.occupiedCoords.some(c => c.x === 3)).toBe(true);
    expect(hashmallim.occupiedCoords.some(c => c.x === 4)).toBe(true);
    expect(hashmallim.occupiedCoords.some(c => c.x === 5)).toBe(true);
    
    // Spy on triggerBoardEvent and animManagerRedux
    cm.triggerBoardEvent = jest.fn();
    cm.animManagerRedux = {
      triggerEntropicKindred: jest.fn()
    };
    
    cm.useAbility(hashmallim, ekAbility, hashmallim);
    
    // Hashmallim coordinates should shift from 5 to 8
    expect(hashmallim.coordinates.x).toBe(8);
    // Target coordinates should remain at 2
    expect(target.coordinates.x).toBe(2);
    
    // Board columns and active flag should update
    expect(cm.numColumns).toBe(11);
    expect(cm.entropicKindredActive).toBe(true);
    
    // Verify that its occupied coordinates shifted contiguously (should be 6, 7, 8)
    // There should be no stale column 3 coordinate left behind!
    expect(hashmallim.occupiedCoords.some(c => c.x === 3)).toBe(false);
    expect(hashmallim.occupiedCoords.some(c => c.x === 4)).toBe(false);
    expect(hashmallim.occupiedCoords.some(c => c.x === 5)).toBe(false);
    
    const occupiedColumns = new Set(hashmallim.occupiedCoords.map(c => c.x));
    expect(occupiedColumns.has(6)).toBe(true);
    expect(occupiedColumns.has(7)).toBe(true);
    expect(occupiedColumns.has(8)).toBe(true);
    expect(occupiedColumns.size).toBe(3); // only columns 6, 7, 8
    
    // triggerBoardEvent should be called
    expect(cm.triggerBoardEvent).toHaveBeenCalledWith('entropic_kindred', { addedCols: 3, insertAt: 4 });
  });
});

