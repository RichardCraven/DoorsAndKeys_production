import { MonsterManager } from '../monster-manager';
import { CombatManagerRedux } from '../combat-manager-redux';
import { createFighter } from '../factories';

describe('Ogre AI debug', () => {
  test('Ogre execution test', () => {
    const mm = new MonsterManager();
    const ogreTemplate = mm.getMonster('ogre');
    console.log('Ogre template skills:', ogreTemplate.skills);

    const cm = new CombatManagerRedux();

    // Create a dummy crew member
    const crewMember = {
      id: 'soldier_1',
      name: 'Test Soldier',
      type: 'soldier',
      stats: { hp: 1000, atk: 10, def: 5, speed: 6, vitality: 50 },
      skills: ['slash'],
      inventory: [],
      coordinates: { x: 0, y: 2 }
    };

    cm.initializeCombat({
      crew: [crewMember],
      monster: {
        ...ogreTemplate,
        coordinates: { x: 1, y: 2 } // adjacent!
      },
      minions: []
    });

    const ogre = Object.values(cm.combatants).find(c => c.type === 'ogre');
    const soldier = Object.values(cm.combatants).find(c => c.type === 'soldier');

    console.log('Ogre combatant:', {
      id: ogre.id,
      type: ogre.type,
      attacks: ogre.attacks,
      specials: ogre.specials,
      cooldowns: ogre.cooldowns,
      occupiedCoords: ogre.occupiedCoords
    });

    const combatLogs = [];
    cm.appendCombatLog = (msg) => {
      combatLogs.push(msg);
      console.log('COMBAT LOG:', msg);
    };

    // Execute Ogre turns until they are adjacent or 10 rounds pass
    for (let round = 1; round <= 10; round++) {
      console.log(`--- ROUND ${round} ---`);
      cm.round = round;
      
      // Force tick down cooldowns at end of round
      if (round > 1 && ogre.cooldowns) {
        Object.keys(ogre.cooldowns).forEach(skillId => {
          ogre.cooldowns[skillId] = Math.max(0, ogre.cooldowns[skillId] - 1);
          if (ogre.cooldowns[skillId] === 0) {
            delete ogre.cooldowns[skillId];
          }
        });
      }
      
      ogre.actionsTakenThisRound = 0;
      ogre.movesTakenThisRound = 0;
      
      // Let both take turns or just move Ogre
      cm.executeUnitAI(ogre);
      console.log(`Ogre position: (${ogre.coordinates.x}, ${ogre.coordinates.y}), cooldowns:`, ogre.cooldowns);
      
      // If any attack occurred on the soldier, check the log
    }
  });


});
