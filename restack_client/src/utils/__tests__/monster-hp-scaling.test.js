import { CombatManagerRedux } from '../combat-manager-redux';

describe('Monster HP scaling based on tier', () => {
  const createMockData = (tier, type = 'goblin', hp = 50) => ({
    crew: [
      { id: 'soldier_1', type: 'soldier', stats: { hp: 100, vitality: 50, atk: 10, def: 5, str: 10, int: 5, dex: 5, fort: 5 } }
    ],
    monster: {
      id: 'boss_1',
      type: type,
      tier: tier,
      stats: { hp: hp, vitality: 30, atk: 10, def: 5, str: 10, int: 5, dex: 5, fort: 5 }
    },
    minions: []
  });

  describe('CombatManagerRedux', () => {
    test('doubles HP (+100%) for a Tier 1 main monster', () => {
      const cm = new CombatManagerRedux();
      const data = createMockData(1, 'goblin', 50);

      cm.initializeCombat(data);

      const boss = cm.combatants['boss_1'];
      expect(boss).toBeDefined();
      expect(boss.starting_hp).toBe(100);
      expect(boss.hp).toBe(100);
    });

    test('doubles HP (+100%) for a Tier 2 main monster', () => {
      const cm = new CombatManagerRedux();
      const data = createMockData(2, 'ghoul', 80);

      cm.initializeCombat(data);

      const boss = cm.combatants['boss_1'];
      expect(boss).toBeDefined();
      expect(boss.starting_hp).toBe(160);
      expect(boss.hp).toBe(160);
    });

    test('does not double HP for a Tier 1 or 2 main monster if isShrineGuardian is true', () => {
      const cm = new CombatManagerRedux();
      const data = createMockData(1, 'goblin', 50);
      data.monster.isShrineGuardian = true;

      cm.initializeCombat(data);

      const boss = cm.combatants['boss_1'];
      expect(boss).toBeDefined();
      expect(boss.starting_hp).toBe(50);
      expect(boss.hp).toBe(50);
    });

    test('does not double HP for a Tier 3 main monster', () => {
      const cm = new CombatManagerRedux();
      const data = createMockData(3, 'witch', 120);

      cm.initializeCombat(data);

      const boss = cm.combatants['boss_1'];
      expect(boss).toBeDefined();
      expect(boss.starting_hp).toBe(120);
      expect(boss.hp).toBe(120);
    });

    test('lord properties are correctly copied and stat boosts applied', () => {
      const cm = new CombatManagerRedux();
      const data = createMockData(2, 'mummy', 100);
      data.monster.name = 'mummy';
      data.monster.isLord = true;
      data.monster.lordBadge = 'vermine';
      data.monster.stats.int = 9;

      cm.initializeCombat(data);

      const boss = cm.combatants['boss_1'];
      expect(boss).toBeDefined();
      expect(boss.isLord).toBe(true);
      expect(boss.lordBadge).toBe('vermine');
      expect(boss.starting_hp).toBe(300);
      expect(boss.hp).toBe(300);
      expect(boss.stats.int).toBe(11);
      expect(boss.name).toBe('mummy lord of Vermine');
    });

    test('lord properties utilize lordName if provided', () => {
      const cm = new CombatManagerRedux();
      const data = createMockData(1, 'skeleton', 50);
      data.monster.name = 'bones';
      data.monster.isLord = true;
      data.monster.lordBadge = 'rubedo';
      data.monster.lordName = 'Bonelord';

      cm.initializeCombat(data);

      const boss = cm.combatants['boss_1'];
      expect(boss).toBeDefined();
      expect(boss.isLord).toBe(true);
      expect(boss.lordBadge).toBe('rubedo');
      expect(boss.lordName).toBe('Bonelord');
      expect(boss.name).toBe('Bonelord of Rubedo');
    });

  });

});
