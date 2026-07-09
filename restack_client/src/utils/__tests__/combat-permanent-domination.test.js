import { CombatManagerRedux } from '../combat-manager-redux';

describe('CombatManagerRedux permanent domination logic', () => {
  let cm;
  let monster;
  let playerUnit;
  let debuff;

  beforeEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    cm = new CombatManagerRedux();
    cm.updateData = jest.fn();
    cm.gameOver = jest.fn();

    monster = {
      id: 'monster_1',
      name: 'Hashmallim',
      type: 'hashmallim',
      isMonster: true,
      stats: { hp: 200, atk: 30, def: 15, speed: 10, willpower: 20 },
      hp: 200,
      starting_hp: 200,
      coordinates: { x: 0, y: 0 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: [],
      cooldowns: {},
    };

    playerUnit = {
      id: 'player_1',
      name: 'Soldier',
      type: 'soldier',
      isMonster: false,
      stats: { hp: 100, atk: 15, def: 10, speed: 5, willpower: 5 },
      hp: 100,
      starting_hp: 100,
      coordinates: { x: 1, y: 0 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: [],
      cooldowns: {},
    };

    cm.combatants = { [monster.id]: monster, [playerUnit.id]: playerUnit };

    debuff = {
      name: 'Dominated',
      roundsLeft: 0,
      casterWillpower: 999, // Force check failure
      dominateFailCount: 0
    };
    playerUnit.activeDebuffs = [debuff];
    playerUnit.dominated = true;
    playerUnit._dominatedOriginalIsMonster = false;
    playerUnit._dominatedOriginalIsMinion = false;
    playerUnit.isMonster = true; // Switch sides
  });

  test('unit should fail contested check and increment fail count', () => {
    cm._tickUnitDebuffs(playerUnit);

    expect(debuff.dominateFailCount).toBe(1);
    expect(playerUnit.permanentlyDominated).toBeUndefined();
    expect(playerUnit.dominated).toBe(true);
    expect(debuff.roundsLeft).toBe(1);
  });

  test('unit should become permanently dominated on the 4th failure and trigger defeat if no other player unit is alive', () => {
    debuff.dominateFailCount = 3; // next fail is 4th

    cm._tickUnitDebuffs(playerUnit);

    expect(debuff.dominateFailCount).toBe(4);
    expect(playerUnit.permanentlyDominated).toBe(true);
    expect(debuff.permanentlyDominated).toBe(true);
    expect(playerUnit._dominatedOriginalIsMonster).toBeUndefined(); // Deleted
    expect(playerUnit._dominatedOriginalIsMinion).toBeUndefined(); // Deleted

    // Since there are no other player units, defeat should be triggered
    expect(cm.combatOver).toBe(true);
    expect(cm.gameOver).toHaveBeenCalledWith('monstersWin');
  });

  test('unit should NOT trigger defeat on 4th failure if another player-controlled unit is alive', () => {
    // Add another active player unit
    const activePlayer = {
      id: 'player_2',
      name: 'Sage',
      type: 'sage',
      isMonster: false,
      stats: { hp: 80, atk: 10, def: 5, speed: 8 },
      hp: 80,
      starting_hp: 80,
      coordinates: { x: 2, y: 0 },
      activeBuffs: [],
      activeDebuffs: [],
      damageIndicators: []
    };
    cm.combatants[activePlayer.id] = activePlayer;

    debuff.dominateFailCount = 3; // next fail is 4th

    cm._tickUnitDebuffs(playerUnit);

    expect(debuff.dominateFailCount).toBe(4);
    expect(playerUnit.permanentlyDominated).toBe(true);
    expect(cm.combatOver).toBe(false);
    expect(cm.gameOver).not.toHaveBeenCalled();
  });

  test('permanently dominated debuffs should never tick down or run willpower checks', () => {
    debuff.permanentlyDominated = true;
    playerUnit.permanentlyDominated = true;
    debuff.dominateFailCount = 4;
    debuff.roundsLeft = 0;

    cm._tickUnitDebuffs(playerUnit);

    // Fail count should not increment (willpower check skipped)
    expect(debuff.dominateFailCount).toBe(4);
    // Debuff should remain in unit's activeDebuffs
    expect(playerUnit.activeDebuffs).toContain(debuff);
  });

  test('combatOverCheck should count temporarily dominated crew members as crewAlive', () => {
    // Setup playerUnit as temporarily dominated (isMonster = true)
    playerUnit.dominated = true;
    playerUnit.permanentlyDominated = false;
    playerUnit.isMonster = true;
    playerUnit._dominatedOriginalIsMonster = false;

    // Verify monsters are also alive
    monster.dead = false;

    const result = cm.combatOverCheck();

    expect(result).toBe(false); // Combat not over because crew member is only temporarily dominated
    expect(cm.combatOver).toBe(false);
  });

  test('combatOverCheck should end combat if all crew members are permanently dominated', () => {
    // Setup playerUnit as permanently dominated
    playerUnit.dominated = true;
    playerUnit.permanentlyDominated = true;
    playerUnit.isMonster = true;
    delete playerUnit._dominatedOriginalIsMonster;

    const result = cm.combatOverCheck();

    expect(result).toBe(true); // Defeat triggered
    expect(cm.combatOver).toBe(true);
    expect(cm.gameOver).toHaveBeenCalledWith('monstersWin');
  });
});
