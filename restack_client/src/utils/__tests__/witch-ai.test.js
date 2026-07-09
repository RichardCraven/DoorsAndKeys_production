import { MonsterManager } from '../monster-manager';
import { CombatManagerRedux } from '../combat-manager-redux';

describe('Witch AI debug', () => {
  test('Witch execution and transform flow test', () => {
    const mm = new MonsterManager();
    const witchTemplate = mm.getMonster('witch');
    expect(witchTemplate).toBeDefined();
    expect(witchTemplate.skills).toContain('spiderweb');
    expect(witchTemplate.skills).toContain('transform');

    const cm = new CombatManagerRedux();
    cm.hitCheck = () => true;

    // Create a dummy crew member
    const crewMember = {
      id: 'soldier_1',
      name: 'Test Soldier',
      type: 'soldier',
      stats: { hp: 1000, atk: 10, def: 5, speed: 6, vitality: 50 },
      skills: ['slash'],
      inventory: [],
      coordinates: { x: 4, y: 2 } // Left side of board
    };

    cm.initializeCombat({
      crew: [crewMember],
      monster: {
        ...witchTemplate,
        coordinates: { x: 5, y: 2 } // Backline (MAX_DEPTH)
      },
      minions: []
    });

    const witch = Object.values(cm.combatants).find(c => c.type === 'witch');
    const soldier = Object.values(cm.combatants).find(c => c.type === 'soldier');

    expect(witch).toBeDefined();
    expect(soldier).toBeDefined();

    witch.coordinates = { x: 7, y: 2 };
    witch.occupiedCoords = [{ x: 7, y: 2 }];
    soldier.coordinates = { x: 4, y: 2 };
    soldier.occupiedCoords = [{ x: 4, y: 2 }];

    // Check skills mapped to specials/attacks
    const specialIds = witch.specials.map(s => s.id);
    expect(specialIds).toContain('spiderweb');
    expect(specialIds).toContain('transform');
    expect(specialIds).toContain('hex');
    expect(specialIds).toContain('summon_spiders');

    const combatLogs = [];
    cm.appendCombatLog = (msg) => {
      combatLogs.push(msg);
      console.log('COMBAT LOG:', msg);
    };

    // Execute multiple rounds and check Witch actions
    for (let round = 1; round <= 15; round++) {
      console.log(`--- ROUND ${round} ---`);
      cm.round = round;
      
      // Force tick down cooldowns at end of round
      if (round > 1 && witch.cooldowns) {
        Object.keys(witch.cooldowns).forEach(skillId => {
          witch.cooldowns[skillId] = Math.max(0, witch.cooldowns[skillId] - 1);
          if (witch.cooldowns[skillId] === 0) {
            delete witch.cooldowns[skillId];
          }
        });
      }

      witch.actionsTakenThisRound = 0;
      witch.movesTakenThisRound = 0;
      
      // Execute Witch AI
      cm.executeUnitAI(witch);
      
      console.log(`Witch isDemonMode: ${witch.isDemonMode}, isChargingTransform: ${witch.isChargingTransform}, cooldowns:`, witch.cooldowns);
      
      // Round-specific checks
      if (round === 2) {
        // Round 2 is when summon_spiders (tier 3, initialCooldown: 1) comes off cooldown
        const summonLog = combatLogs.find(log => log.includes('summons a Spider Nest'));
        expect(summonLog).toBeDefined();
      }

      if (round === 4) {
        // Round 4 is when Tier 2 spells (hex, spiderweb) initial cooldown is done.
        // Priority order: summon_spiders (on cooldown) -> hex (ready, casts hex)
        const hexLog = combatLogs.find(log => log.includes('Hex'));
        expect(hexLog).toBeDefined();
      }

      if (round === 5) {
        // Round 5: hex is on cooldown, spiderweb is ready. Witch should cast spiderweb!
        const spiderwebLog = combatLogs.find(log => log.includes('Spiderweb'));
        expect(spiderwebLog).toBeDefined();
        // Target should be ensnared!
        expect(soldier.ensnared).toBe(true);
      }
    }

    // Verify transform actually happened
    const transformBeginLog = combatLogs.find(log => log.includes('begins gathering dark energy to transform'));
    expect(transformBeginLog).toBeDefined();

    const transformedLog = combatLogs.find(log => log.includes('has transformed into a dark beast'));
    expect(transformedLog).toBeDefined();

    const clawStrikeLog = combatLogs.find(log => log.includes('uses Claw Strike'));
    expect(clawStrikeLog).toBeDefined();

    // Verify demon mode reverted
    const revertedLog = combatLogs.find(log => log.includes("demon form fades"));
    expect(revertedLog).toBeDefined();
  });
});
