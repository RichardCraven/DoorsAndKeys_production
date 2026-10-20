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
  CModal: () => null,
  CModalHeader: () => null,
  CModalTitle: () => null,
  CModalBody: () => null,
  CModalFooter: () => null
}));

let mockMeta = {};
jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => mockMeta),
    storeMeta: jest.fn((newMeta) => { mockMeta = { ...newMeta }; }),
    getUserId: jest.fn(() => 'player_1')
}));

import DungeonPage from '../DungeonPage';

describe('Outpost Tower Targeting Restrictions', () => {
    let dungeonPage;
    let mockBoardManager;
    let originalComponentDidMount;

    beforeAll(() => {
        originalComponentDidMount = DungeonPage.prototype.componentDidMount;
        DungeonPage.prototype.componentDidMount = jest.fn();
    });

    afterAll(() => {
        DungeonPage.prototype.componentDidMount = originalComponentDidMount;
    });

    beforeEach(() => {
        mockMeta = {};
        // Create 225 tiles (15x15)
        const tiles = Array(225).fill(null).map((_, idx) => ({
            id: idx,
            type: 'dungeon_floor',
            contains: null,
            image: null
        }));

        mockBoardManager = {
            tiles,
            currentBoard: { tiles },
            playerTile: { location: [7, 7] }, // Center tile (112)
            getIndexFromCoordinates: jest.fn(loc => {
                if (!loc) return null;
                return loc[0] * 15 + loc[1];
            }),
            getContainsType: jest.fn(c => {
                if (!c) return null;
                if (typeof c === 'string') return c;
                return c.type || null;
            }),
            getContainsSubtype: jest.fn(c => {
                if (!c) return null;
                if (typeof c === 'string') return c;
                return c.subtype || null;
            }),
            isVoidTile: jest.fn(() => false),
            removePygmyTile: jest.fn()
        };

        dungeonPage = new DungeonPage({
            boardManager: mockBoardManager,
            crewManager: { crew: [{ id: 'hero1', name: 'Hero', hp: 20, max_hp: 20, level: 1 }] }
        });

        dungeonPage.displayMessage = jest.fn();
        dungeonPage.handleProjectileHitPlayer = jest.fn();
        dungeonPage.handleProjectileHitWalker = jest.fn();
        dungeonPage.projectileCanvasRef = {
            current: {
                fireProjectile: jest.fn((from, to, cb) => { if (cb) cb(); })
            }
        };
    });

    test('Neutral outpost NEVER fires at a monster tile in territory or revealed by wandering eye', () => {
        // Outpost at tile 16 (row 1, col 1)
        const outpostTile = mockBoardManager.tiles[16];
        outpostTile.building = 'outpost';
        outpostTile.territory = 'mox';
        outpostTile.contains = { type: 'building', subtype: 'outpost', territory: 'mox' };

        // Monster at tile 19 (row 1, col 4) with red aggro aura / revealed
        mockBoardManager.tiles[19].contains = {
            type: 'monster',
            subtype: 'goblin',
            id: 'monster_goblin_1',
            territory: 'mox'
        };

        // Player far away at tile 200 (row 13, col 5) - not in territory
        mockBoardManager.playerTile.location = [13, 5];

        dungeonPage.getContiguousTerritoryTileIds = jest.fn((startId, clan) => {
            return new Set([15, 16, 17, 18, 19, 20]); // Contiguous territory contains both outpost and monster
        });

        dungeonPage.tickOutpostAttacks();

        // Projectile MUST NOT be fired at the monster (tile 19)
        expect(dungeonPage.projectileCanvasRef.current.fireProjectile).not.toHaveBeenCalled();
        expect(outpostTile._lastFiredAt).toBeUndefined();
    });

    test('Neutral outpost fires at player avatar when player is inside territory', () => {
        // Outpost at tile 16 (row 1, col 1)
        const outpostTile = mockBoardManager.tiles[16];
        outpostTile.building = 'outpost';
        outpostTile.territory = 'mox';
        outpostTile.contains = { type: 'building', subtype: 'outpost', territory: 'mox' };

        // Player at tile 17 (row 1, col 2)
        mockBoardManager.playerTile.location = [1, 2];

        dungeonPage.getContiguousTerritoryTileIds = jest.fn((startId, clan) => {
            return new Set([16, 17]);
        });

        dungeonPage.tickOutpostAttacks();

        // Must fire at the player (tile 17)
        expect(dungeonPage.projectileCanvasRef.current.fireProjectile).toHaveBeenCalledWith(
            16,
            17,
            expect.any(Function),
            'fireball',
            { aimedAtPlayer: true, isOutpost: true }
        );
        expect(dungeonPage.handleProjectileHitPlayer).toHaveBeenCalledWith(17);
    });

    test('Neutral outpost without clan territory fires on player within range 4, but never on monsters', () => {
        // Outpost at tile 32 (row 2, col 2) with no clan
        const outpostTile = mockBoardManager.tiles[32];
        outpostTile.building = 'outpost';
        outpostTile.contains = { type: 'building', subtype: 'outpost' };

        // Monster at tile 34 (row 2, col 4) - distance 2
        mockBoardManager.tiles[34].contains = {
            type: 'monster',
            subtype: 'goblin'
        };

        // Player far away at tile 200 (distance > 4)
        mockBoardManager.playerTile.location = [13, 5];

        dungeonPage.getContiguousTerritoryTileIds = jest.fn(() => null);

        dungeonPage.tickOutpostAttacks();

        // Must NOT fire on monster
        expect(dungeonPage.projectileCanvasRef.current.fireProjectile).not.toHaveBeenCalled();

        // Now move player within 3 tiles of outpost: tile 35 (row 2, col 5)
        mockBoardManager.playerTile.location = [2, 5];

        dungeonPage.tickOutpostAttacks();

        // Must fire on player (tile 35), NOT monster (tile 34)
        expect(dungeonPage.projectileCanvasRef.current.fireProjectile).toHaveBeenCalledWith(
            32,
            35,
            expect.any(Function),
            'fireball',
            { aimedAtPlayer: true, isOutpost: true }
        );
        expect(dungeonPage.handleProjectileHitPlayer).toHaveBeenCalledWith(35);
    });

    test('Neutral outpost fires on player summoned Mech Walker within range and applies damage', () => {
        // Outpost at tile 45 (row 3, col 0)
        const outpostTile = mockBoardManager.tiles[45];
        outpostTile.building = 'outpost';
        outpostTile.contains = { type: 'building', subtype: 'outpost' };

        // Player avatar is far away at tile 200
        mockBoardManager.playerTile.location = [13, 5];

        // Active Combat Walker at tile 47 (row 3, col 2) - distance 2
        dungeonPage.state = {
            ...dungeonPage.state,
            activeDungeonWalker: {
                id: 'walker_1',
                active: true,
                destroyed: false,
                location: [3, 2],
                hp: 30,
                maxHp: 30,
                damageNumbers: []
            }
        };

        dungeonPage.getContiguousTerritoryTileIds = jest.fn(() => null);

        dungeonPage.tickOutpostAttacks();

        // Must fire at the Walker (tile 47)
        expect(dungeonPage.projectileCanvasRef.current.fireProjectile).toHaveBeenCalledWith(
            45,
            47,
            expect.any(Function),
            'fireball',
            { isOutpost: true }
        );
        expect(dungeonPage.handleProjectileHitWalker).toHaveBeenCalledWith(47);
    });

    test('Friendly outpost does not fire on monsters even if in territory or adjacent', () => {
        // Friendly Outpost at tile 16
        const outpostTile = mockBoardManager.tiles[16];
        outpostTile.building = 'outpost';
        outpostTile.placedBy = 'player';
        outpostTile.contains = { type: 'building', subtype: 'outpost', placedBy: 'player' };

        // Monster at tile 17
        mockBoardManager.tiles[17].contains = {
            type: 'monster',
            subtype: 'goblin'
        };

        dungeonPage.getContiguousTerritoryTileIds = jest.fn(() => null);

        dungeonPage.tickOutpostAttacks();

        // Friendly outpost must NEVER fire on monsters
        expect(dungeonPage.projectileCanvasRef.current.fireProjectile).not.toHaveBeenCalled();
    });
});
