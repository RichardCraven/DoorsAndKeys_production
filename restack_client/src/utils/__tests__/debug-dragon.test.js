import { MonsterManager } from '../monster-manager';
import { CombatManagerRedux } from '../combat-manager-redux';

describe('Dragon debug', () => {
  test('check dragon portrait', () => {
    // 1. Instantiation
    const mm = new MonsterManager();
    const dragonTemplate = mm.getMonster('dragon'); // internally does JSON.parse(JSON.stringify(match))
    
    // 2. CombatSimulator state cloning
    const simulatorClonedMonster = JSON.parse(JSON.stringify(dragonTemplate));
    
    // 3. CombatManager Redux initialization
    const cm = new CombatManagerRedux();
    cm.initializeCombat({
      crew: [],
      monster: simulatorClonedMonster,
      minions: [],
    });
    
    // 4. MonsterBattle forceSyncBattleData cloning
    const battleData1 = JSON.parse(JSON.stringify(cm.combatants));
    
    // 5. MonsterBattle updateBattleData cloning & normalization
    const clonedBattleData = JSON.parse(JSON.stringify(battleData1));
    Object.values(clonedBattleData).forEach(entry => {
      if (!entry) return;
      if (typeof entry.portrait === 'undefined' || entry.portrait === null) {
        entry.portrait = 'avatar_fallback_png';
      }
    });

    console.log('--- SIMULATED FINAL RENDER DATA ---');
    Object.values(clonedBattleData).forEach(c => {
      console.log('RENDER UNIT:', {
        id: c.id,
        name: c.name,
        type: c.type,
        tier: c.tier,
        isMonster: c.isMonster,
        isMinion: c.isMinion,
        portrait: c.portrait,
        occupiedCoords: c.occupiedCoords,
      });
      if (c.type === 'dragon') {
        const isMonster = c.isMonster;
        const isMinion = c.isMinion;
        const isHuge = isMonster && !isMinion && (c.tier === 4 || c.type === 'dragon' || c.key === 'dragon' || c.huge === true || c.size === 3);
        console.log('EVALUATED IS_HUGE:', isHuge);
      }
    });
    console.log('--- END SIMULATED DATA ---');
  });
});

