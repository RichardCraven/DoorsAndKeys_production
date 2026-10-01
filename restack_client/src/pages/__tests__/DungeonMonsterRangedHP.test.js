jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({
  CButton: 'CButton',
  CFormSelect: 'CFormSelect',
  CFormInput: 'CFormInput',
  CModal: 'CModal',
  CModalHeader: 'CModalHeader',
  CModalTitle: 'CModalTitle',
  CModalBody: 'CModalBody',
  CModalFooter: 'CModalFooter'
}));

import DungeonPage from '../DungeonPage';
import { CombatManagerRedux } from '../../utils/combat-manager-redux';
import { MonsterManager } from '../../utils/monster-manager';

describe('Dungeon Monster HP, Ranged Attack Cooldown & Combat Handoff', () => {
  let page;
  let mockBoardManager;
  let monsterManager;

  beforeEach(() => {
    monsterManager = new MonsterManager();
    mockBoardManager = {
      tiles: [
        { id: 0, location: [0, 0], contains: 'empty' },
        { id: 1, location: [0, 1], contains: { type: 'monster', subtype: 'goblin' } },
        { id: 2, location: [0, 2], contains: { type: 'monster', subtype: 'skeleton' } },
        { id: 3, location: [1, 0], contains: 'goblin' }
      ],
      playerTile: { location: [0, 0] },
      getIndexFromCoordinates: jest.fn(([r, c]) => (r === 0 && c === 0 ? 0 : r === 0 && c === 1 ? 1 : 0)),
      removeDefeatedMonsterTile: jest.fn(),
      refreshTiles: jest.fn(),
      isMonster: jest.fn(tile => !!(tile && tile.contains && (tile.contains.type === 'monster' || tile.contains === 'goblin')))
    };

    page = new DungeonPage({
      boardManager: mockBoardManager,
      monsterManager: monsterManager
    });

    page.setState = jest.fn((updater, cb) => {
      if (typeof updater === 'function') {
        page.state = { ...page.state, ...updater(page.state) };
      } else {
        page.state = { ...page.state, ...updater };
      }
      if (cb) cb();
    });

    page.displayMessage = jest.fn();
    page.refreshTiles = jest.fn();
    page.startMonsterPursuit = jest.fn();
  });

  describe('resolveMonsterTileStats', () => {
    it('resolves correct max HP for Goblin (Tier 1: 38 base doubled to 76)', () => {
      const tile = { id: 1, contains: { type: 'monster', subtype: 'goblin' } };
      const stats = page.resolveMonsterTileStats(tile);

      expect(stats).toBeDefined();
      expect(stats.monsterType).toBe('goblin');
      expect(stats.maxHp).toBe(76);
      expect(stats.tier).toBe(1);
    });

    it('resolves correct max HP for Skeleton (Tier 1: 50 base doubled to 100)', () => {
      const tile = { id: 2, contains: { type: 'monster', subtype: 'skeleton' } };
      const stats = page.resolveMonsterTileStats(tile);

      expect(stats).toBeDefined();
      expect(stats.monsterType).toBe('skeleton');
      expect(stats.maxHp).toBe(100);
      expect(stats.tier).toBe(1);
    });

    it('resolves string tile contains correctly', () => {
      const tile = { id: 3, contains: 'goblin' };
      const stats = page.resolveMonsterTileStats(tile);

      expect(stats).toBeDefined();
      expect(stats.maxHp).toBe(76);
    });

    it('preserves pre-existing maxHp if specified on tile', () => {
      const tile = { id: 4, contains: { type: 'monster', subtype: 'goblin', maxHp: 150 } };
      const stats = page.resolveMonsterTileStats(tile);

      expect(stats).toBeDefined();
      expect(stats.maxHp).toBe(150);
    });
  });

  describe('fireRangedAttack and Cooldown', () => {
    beforeEach(() => {
      page.state = {
        ...page.state,
        equippedRangedWeapon: true,
        targetedMonsterTileId: 1,
        inMonsterBattle: false,
        keysLocked: false,
        crew: [
          {
            id: 'ranger_1',
            type: 'ranger',
            role: 'ranger',
            selected: true,
            stats: { atk: 15 }
          }
        ]
      };
    });

    it('damages goblin with 15 damage and leaves it alive with 61 HP', () => {
      const targetTile = mockBoardManager.tiles[1];
      expect(targetTile.contains.hp).toBeUndefined();

      page.fireRangedAttack();

      expect(targetTile.contains.maxHp).toBe(76);
      expect(targetTile.contains.hp).toBe(61);
      expect(mockBoardManager.removeDefeatedMonsterTile).not.toHaveBeenCalled();
      expect(page.startMonsterPursuit).toHaveBeenCalledWith(targetTile);
      expect(page.displayMessage).toHaveBeenCalledWith(
        expect.stringContaining('61 HP left')
      );
    });

    it('enforces 800ms cooldown to ignore rapid duplicate attacks (e.g. key repeat)', () => {
      const targetTile = mockBoardManager.tiles[1];

      // First attack
      page.fireRangedAttack();
      expect(targetTile.contains.hp).toBe(61);

      // Immediate second attack within 800ms
      page.fireRangedAttack();
      expect(targetTile.contains.hp).toBe(61); // HP unchanged

      // Advance time past 800ms cooldown
      page._lastRangedAttackTime = Date.now() - 900;
      page._rangedAttackInFlight = false;

      // Second valid attack
      page.fireRangedAttack();
      expect(targetTile.contains.hp).toBe(46);
    });
  });

  describe('Melee Spacebar Attack Cooldown & HP Resolution', () => {
    it('resolves goblin HP and applies melee cooldown', () => {
      const targetTile = mockBoardManager.tiles[1];
      page.state = {
        ...page.state,
        targetedMonsterTileId: 1,
        inMonsterBattle: false,
        keysLocked: false,
        playerFacing: 'right',
        selectedCrewMember: {
          id: 'warrior_1',
          type: 'soldier',
          role: 'soldier',
          selected: true,
          stats: { atk: 20 }
        }
      };

      // First melee attack
      page.handleSpacebarAttack();
      expect(targetTile.contains.maxHp).toBe(76);
      expect(targetTile.contains.hp).toBe(56); // 76 - 20 = 56

      // Immediate second melee attack within 500ms
      page.handleSpacebarAttack();
      expect(targetTile.contains.hp).toBe(56); // unchanged

      // Past cooldown
      page._lastMeleeAttackTime = Date.now() - 600;
      page.handleSpacebarAttack();
      expect(targetTile.contains.hp).toBe(36); // 56 - 20 = 36
    });
  });

  describe('Combat transition with damaged monster', () => {
    it('preserves damaged monster HP and starting_hp in triggerMonsterBattle and CombatManagerRedux', () => {
      const targetTile = mockBoardManager.tiles[1];
      targetTile.contains = {
        type: 'monster',
        subtype: 'goblin',
        hp: 46,
        maxHp: 76
      };

      page.triggerMonsterBattle(true, 1);

      const combatMonster = page.state.monster;
      expect(combatMonster).toBeDefined();
      expect(combatMonster.hp).toBe(46);
      expect(combatMonster.starting_hp).toBe(76);
      expect(combatMonster.inDungeonDamaged).toBe(true);

      // Now pass this monster into CombatManagerRedux
      const cm = new CombatManagerRedux();
      cm.initializeCombat({
        crew: [
          { id: 'soldier_1', type: 'soldier', stats: { hp: 100, vitality: 50, atk: 10, def: 5, str: 10, int: 5, dex: 5, fort: 5 } }
        ],
        monster: combatMonster,
        minions: []
      });

      const monsterFighter = cm.combatants[combatMonster.id];
      expect(monsterFighter).toBeDefined();
      // starting_hp should be maxHp 76
      expect(monsterFighter.starting_hp).toBe(76);
      // hp should NOT be doubled to 92; it should remain 46!
      expect(monsterFighter.hp).toBe(46);
      expect(monsterFighter.stats.hp).toBe(76);

      // Health bar width calculation should reflect 46 / 76 (~60.5%), NOT 100%
      const hpBarRatio = monsterFighter.hp / (monsterFighter.starting_hp || monsterFighter.stats?.hp || 1);
      expect(hpBarRatio).toBeCloseTo(46 / 76, 3);
      expect(hpBarRatio).toBeLessThan(1.0);
    });

    it('does not multiply damaged monster HP by 1.5 when monster is a Lord', () => {
      const combatMonster = {
        id: 'lord_goblin',
        type: 'goblin',
        name: 'Goblin Lord',
        isLord: true,
        tier: 1,
        hp: 40,
        starting_hp: 76,
        inDungeonDamaged: true,
        stats: { hp: 76, vitality: 30, atk: 10, def: 5, str: 10, int: 5, dex: 5, fort: 5 }
      };

      const cm = new CombatManagerRedux();
      cm.initializeCombat({
        crew: [
          { id: 'soldier_1', type: 'soldier', stats: { hp: 100, vitality: 50, atk: 10, def: 5, str: 10, int: 5, dex: 5, fort: 5 } }
        ],
        monster: combatMonster,
        minions: []
      });

      const monsterFighter = cm.combatants['lord_goblin'];
      expect(monsterFighter).toBeDefined();
      // Damaged HP must remain 40, not boosted to 60!
      expect(monsterFighter.hp).toBe(40);
      // Max HP is boosted by 50% from 76 to 114
      expect(monsterFighter.starting_hp).toBe(114);

      // Health bar should reflect 40 / 114 (~35.1%)
      const hpBarRatio = monsterFighter.hp / (monsterFighter.starting_hp || monsterFighter.stats?.hp || 1);
      expect(hpBarRatio).toBeCloseTo(40 / 114, 3);
    });
  });
});
