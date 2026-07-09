const { CombatManagerRedux } = require('./src/utils/combat-manager-redux');

const cm = new CombatManagerRedux();
cm.updateData = () => {};

const caller = {
  id: 'attacker',
  name: 'Attacker',
  isMonster: true,
  atk: 10,
  readout: { result: '' },
  stats: { fort: 0 },
  level: 1,
  coordinates: { x: 0, y: 0 }
};

const combatantHit = {
  id: 'defender',
  name: 'Defender',
  hp: 200,
  damageIndicators: [],
  stats: { dex: 1, def: 5 },
  coordinates: { x: 1, y: 0 },
  inventory: [
    { type: 'armor', armor: 50, equippedSlot: 'head', name: 'helm' }
  ]
};

cm.combatants = { [caller.id]: caller, [combatantHit.id]: combatantHit };

// Let's hook into the internals by outputting local variables
const originalDamageCheck = cm.damageCheck;
const result = cm.damageCheck(caller, combatantHit, 100);
console.log("Result:", result);
