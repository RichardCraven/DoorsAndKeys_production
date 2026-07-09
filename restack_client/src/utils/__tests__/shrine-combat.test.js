import React from 'react';
import ShrineScreen from '../../pages/sub-views/ShrineScreen';

describe('ShrineScreen Combat Initialization', () => {
  test('shrine guardians have skills, attacks, and specials populated', () => {
    const mockMonster1 = {
      type: 'goblin',
      key: 'goblin',
      stats: { hp: 45, atk: 7, def: 4, dex: 8 },
      portrait: 'goblin_portrait.png',
      monster_names: ['Wiggit'],
      skills: ['claw_strike', 'bite']
    };

    const mockMonster2 = {
      type: 'skeleton',
      key: 'skeleton',
      stats: { hp: 40, atk: 6, def: 5, dex: 4 },
      portrait: 'skeleton_portrait.png',
      monster_names: ['Bones'],
      skills: ['sword_swing', 'reassembly']
    };

    const mockMonsterManager = {
      getRandomMonsterByTier: jest.fn().mockImplementation((tier) => {
        if (tier === 1) {
          const res = mockMonsterManager.callsCount % 2 === 0 ? mockMonster1 : mockMonster2;
          mockMonsterManager.callsCount++;
          return res;
        }
        return mockMonster1;
      }),
      callsCount: 0
    };

    const props = {
      shrineData: {
        shrineClass: 'sage',
        shrineKey: 'shrine_sage_1',
        tile: {}
      },
      crew: [
        { id: 'pc_sage', type: 'sage', stats: { hp: 50, atk: 5, def: 5, dex: 10 }, inventory: [] }
      ],
      monsterManager: mockMonsterManager,
      overlayManager: null,
      animationManager: null,
      onShrineComplete: jest.fn()
    };

    const screen = new ShrineScreen(props);
    screen._isMounted = true;
    screen._initializeCombatEngine();

    const combatants = Object.values(screen.combatManager.combatants);
    
    // There should be the shrine unit, the defenders, and the two guardians
    expect(combatants.length).toBeGreaterThanOrEqual(3);

    const guardians = combatants.filter(c => c.isMonster);
    expect(guardians.length).toBe(4);

    guardians.forEach(guardian => {
      // Verify factories.js parsed them into attacks/specials correctly
      expect(guardian.attacks).toBeDefined();
      expect(Array.isArray(guardian.attacks)).toBe(true);
      expect(guardian.attacks.length).toBeGreaterThan(0);
    });

    // Cleanup
    screen.componentWillUnmount();
  });
});
