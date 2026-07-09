jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { CombatManagerRedux } from '../combat-manager-redux';

describe('High Priest of the Basilisk Custom Combat Abilities', () => {
  let cm;
  let priest;
  let player1;
  let player2;
  let minion;

  beforeEach(() => {
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.appendCombatLog = jest.fn();
    cm.applyEnduranceCost = jest.fn();
    cm.animManagerRedux = { triggerAbility: jest.fn(), triggerSummon: jest.fn() };
    cm.hitCheck = jest.fn().mockReturnValue(true);
    cm.damageCheck = jest.fn((caller, target, dmg) => dmg);
    cm.targetKilled = jest.fn();

    priest = {
      id: 'basilisk_priest',
      name: 'High Priest of the Basilisk',
      type: 'priest_basilisk',
      key: 'priest_basilisk',
      isMonster: true,
      stats: { speed: 5, dex: 5, def: 5, int: 5, hp: 500, atk: 50 },
      skills: ['void_rake', 'eldritch_wind', 'paradox_engine'],
      coordinates: { x: 7, y: 2 }
    };

    player1 = {
      id: 'player_1',
      name: 'Soldier',
      type: 'soldier',
      isMonster: false,
      hp: 100,
      starting_hp: 100,
      stats: { speed: 5, dex: 5, def: 5, hp: 100 },
      coordinates: { x: 1, y: 1 },
      activeBuffs: [],
      activeDebuffs: []
    };

    player2 = {
      id: 'player_2',
      name: 'Wizard',
      type: 'wizard',
      isMonster: false,
      hp: 80,
      starting_hp: 80,
      stats: { speed: 5, dex: 5, def: 5, hp: 80 },
      coordinates: { x: 2, y: 3 },
      activeBuffs: [],
      activeDebuffs: []
    };

    minion = {
      id: 'minion_1',
      name: 'Darkness Sphere',
      type: 'darkness_sphere',
      isMonster: true,
      hp: 50,
      starting_hp: 50,
      endurance: 10,
      maxEndurance: 50,
      stats: { speed: 5, dex: 5, def: 5, hp: 50 },
      coordinates: { x: 8, y: 4 },
      activeBuffs: [],
      activeDebuffs: []
    };

    cm.initializeCombat({ crew: [player1, player2], monster: priest, minions: [minion] });
  });

  test('void_rake does 200% atk damage and triggers claw animation', () => {
    const livePriest = cm.getCombatant('basilisk_priest');
    const livePlayer = cm.getCombatant('player_1');
    const spec = cm.resolveSpecial(livePriest, 'void_rake');

    expect(spec).toBeDefined();
    
    // Stub Math.random to not teleport
    const origRandom = Math.random;
    Math.random = () => 0.99; // 30% chance teleport fails

    cm.useAbility(livePriest, spec, livePlayer);

    // Verify 200% atk damage (50 atk * 200% = 100 dmg)
    expect(cm.damageCheck).toHaveBeenCalledWith(livePriest, livePlayer, 100, false);
    expect(cm.animManagerRedux.triggerAbility).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'void_rake',
      false,
      expect.any(Array),
      'basilisk_priest',
      undefined,
      null,
      expect.any(Array),
      null
    );

    Math.random = origRandom;
  });

  test('void_rake 30% chance teleport moves unit to a corner', () => {
    const livePriest = cm.getCombatant('basilisk_priest');
    const livePlayer = cm.getCombatant('player_1');
    const spec = cm.resolveSpecial(livePriest, 'void_rake');

    const origRandom = Math.random;
    Math.random = () => 0.05; // Teleport succeeds

    const preCoords = { ...livePlayer.coordinates };
    cm.useAbility(livePriest, spec, livePlayer);

    const corners = [
      { x: 0, y: 0 },
      { x: 9, y: 0 },
      { x: 0, y: 5 },
      { x: 9, y: 5 }
    ];

    const isAtCorner = corners.some(c => c.x === livePlayer.coordinates.x && c.y === livePlayer.coordinates.y);
    expect(isAtCorner).toBe(true);

    Math.random = origRandom;
  });

  test('eldritch_wind restores stamina to max and heals by 10% hp for friendly units only', () => {
    const livePriest = cm.getCombatant('basilisk_priest');
    const livePlayer = cm.getCombatant('player_1');
    const liveMinion = cm.getCombatant('minion_1');

    // Inflict stamina loss & hp damage
    liveMinion.endurance = 10;
    liveMinion.hp = 30; // Max 50
    livePriest.endurance = 5;
    livePriest.hp = 400; // Max 500

    livePlayer.endurance = 15;
    livePlayer.hp = 50; // Max 100

    const spec = cm.resolveSpecial(livePriest, 'eldritch_wind');
    cm.useAbility(livePriest, spec, livePriest);

    // Friendlies (Minion, Priest) must be fully restored and healed
    expect(liveMinion.endurance).toBe(liveMinion.maxEndurance);
    expect(liveMinion.hp).toBe(35); // 30 + 10% of 50 = 35

    expect(livePriest.endurance).toBe(livePriest.maxEndurance);
    expect(livePriest.hp).toBe(450); // 400 + 10% of 500 = 450

    // Enemy (Player) must NOT be affected
    expect(livePlayer.endurance).toBe(15);
    expect(livePlayer.hp).toBe(50);
  });

  test('paradox_engine teleports player and summons an upside-down sinister reflection', () => {
    const livePriest = cm.getCombatant('basilisk_priest');
    const livePlayer = cm.getCombatant('player_1');

    const origRandom = Math.random;
    let callCount = 0;
    Math.random = () => {
      callCount++;
      return callCount === 1 ? 0.0 : 0.99; // Low roll for target (willpower check fails), high roll for caster
    };

    const spec = cm.resolveSpecial(livePriest, 'paradox_engine');
    cm.useAbility(livePriest, spec, livePlayer);

    Math.random = origRandom;

    // Target should have paradox engine effect active
    expect(livePlayer.paradoxEngineActive).toBe(true);
    expect(livePlayer.paradoxEngineRounds).toBe(3);

    // Check that player was teleported to a corner
    const corners = [
      { x: 0, y: 0 },
      { x: 9, y: 0 },
      { x: 0, y: 5 },
      { x: 9, y: 5 }
    ];
    const isPlayerAtCorner = corners.some(c => c.x === livePlayer.coordinates.x && c.y === livePlayer.coordinates.y);
    expect(isPlayerAtCorner).toBe(true);

    // Verify reflection minion was summoned
    const refId = `reflection_${livePlayer.id}`;
    const reflection = cm.combatants[refId];
    expect(reflection).toBeDefined();
    expect(reflection.name).toBe('Sinister Reflection of Soldier');
    expect(reflection.isMonster).toBe(true); // Opposite of player
    expect(reflection.isUpsideDown).toBe(true);
    expect(reflection.isSinisterReflection).toBe(true);

    // Run custom round start handler to test ticking damage
    cm.round = 1;
    // Call next round or turn logic to trigger round starts
    const origHp = livePlayer.hp;
    
    // Call the turn tick directly or trigger paradox engine damage check
    // In our implementation, ticks happen in _tickUnitDebuffs
    cm._tickUnitDebuffs(livePlayer);

    // Damage check should have been called for ticking damage (50% of caster's 50 atk = 25 dmg)
    expect(cm.damageCheck).toHaveBeenCalledWith(livePriest, livePlayer, 25, false);
  });
});
