import { BoardManager } from '../../utils/board-manager';

// Mock coreui before importing
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

describe('TeleportCrew Passable Tile and Fog of War Tests', () => {
  let bm;
  let mockDungeon;

  beforeEach(() => {
    bm = new BoardManager();
    // Build a 15x15 board where perimeter tiles (row 0, row 14, col 0, col 14) are void,
    // and interior tiles (e.g. 112) are floor
    const tiles = [];
    for (let i = 0; i < 225; i++) {
      const row = Math.floor(i / 15);
      const col = i % 15;
      const isPerimeterVoid = row === 0 || row === 14 || col === 0 || col === 14;
      tiles.push({
        id: i,
        color: isPerimeterVoid ? 'black' : '#6b6057',
        contains: isPerimeterVoid ? { type: 'void', subtype: null } : null,
        isVoid: isPerimeterVoid
      });
    }

    mockDungeon = {
      id: 'test_dungeon',
      levels: [
        {
          id: 0,
          front: {
            miniboards: [
              { id: 'board_0', tiles: JSON.parse(JSON.stringify(tiles)) }
            ]
          },
          back: {
            miniboards: [
              { id: 'board_0_b', tiles: JSON.parse(JSON.stringify(tiles)) }
            ]
          }
        }
      ]
    };

    bm.setDungeon(mockDungeon);
    bm.currentLevel = mockDungeon.levels[0];
    bm.currentOrientation = 'F';
  });

  test('initializeTilesFromMap automatically redirects void spawn tile to nearest passable floor tile', () => {
    // Tile 0 is perimeter void
    bm.initializeTilesFromMap(0, 0);

    const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
    const spawnedTile = bm.tiles[playerIdx];

    // Player must NOT be on a void tile
    expect(bm.isVoidTile(spawnedTile)).toBe(false);
    expect(spawnedTile.color).not.toBe('black');
  });

  test('handleFogOfWar does not blank out board when destination tile is void', () => {
    bm.initializeTilesFromMap(0, 112);

    // Call handleFogOfWar with a void tile (tile 0)
    const voidTile = bm.tiles[0];
    expect(bm.isVoidTile(voidTile)).toBe(true);

    bm.handleFogOfWar(voidTile);

    // Some non-void tiles must be revealed and have color !== 'black'
    const revealedTiles = bm.tiles.filter(t => !bm.isVoidTile(t) && t.color !== 'black');
    expect(revealedTiles.length).toBeGreaterThan(0);
  });

  test('DungeonPage parseCoordinates parses full format, short format, and single tile ID', () => {
    const DungeonPage = require('../DungeonPage').default;
    const pageInstance = new DungeonPage({ boardManager: bm, crewManager: { crew: [] } });

    // 1. Full coordinate string
    const fullParsed = pageInstance.parseCoordinates('level:0,orientation:front,board:0,x:3,y:4');
    expect(fullParsed).toEqual(expect.objectContaining({
      levelId: 0,
      orientation: 'front',
      boardIndex: 0,
      x: 3,
      y: 4,
      tileIndex: 63
    }));

    // 2. Comma-separated format
    const csvParsed = pageInstance.parseCoordinates('0,front,0,3,4');
    expect(csvParsed).toEqual(expect.objectContaining({
      levelId: 0,
      orientation: 'front',
      boardIndex: 0,
      x: 3,
      y: 4,
      tileIndex: 63
    }));

    // 3. Short format "x, y"
    const shortParsed = pageInstance.parseCoordinates('3, 4');
    expect(shortParsed).toEqual(expect.objectContaining({
      x: 3,
      y: 4,
      tileIndex: 63
    }));

    // 4. Single tile index "63"
    const singleParsed = pageInstance.parseCoordinates('63');
    expect(singleParsed).toEqual(expect.objectContaining({
      x: 3,
      y: 4,
      tileIndex: 63
    }));
  });

  test('teleportCrew unlocks keys, resets inSuperboard to false, and spawns player on non-void tile', () => {
    const DungeonPage = require('../DungeonPage').default;
    const pageInstance = new DungeonPage({ boardManager: bm, crewManager: { crew: [] } });

    // Mock setState to update pageInstance.state synchronously for test
    pageInstance.state = {
      inSuperboard: true,
      superboardType: 'pocket',
      keysLocked: true,
      levelTracker: [{ id: 0, active: false }],
      minimap: [{ active: false }],
      tiles: [],
      overlayTiles: []
    };
    pageInstance.setState = (updater, cb) => {
      const next = typeof updater === 'function' ? updater(pageInstance.state) : updater;
      pageInstance.state = { ...pageInstance.state, ...next };
      if (typeof cb === 'function') cb();
    };
    bm.inSuperboard = true;

    // Teleport to level 0, board 0, tile 0 (which is void)
    pageInstance.teleportCrew({
      levelId: 0,
      boardIndex: 0,
      orientation: 'front',
      tileIndex: 0
    });

    // InSuperboard must be reset to false
    expect(pageInstance.state.inSuperboard).toBe(false);
    expect(bm.inSuperboard).toBe(false);

    // Keys must be unlocked
    expect(pageInstance.state.keysLocked).toBe(false);
    expect(pageInstance._isMoving).toBe(false);

    // Player must be placed on a non-void tile
    const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
    const playerTile = bm.tiles[playerIdx];
    expect(bm.isVoidTile(playerTile)).toBe(false);

    // Revealed tiles exist (board is not pitch black)
    const revealedTiles = pageInstance.state.tiles.filter(t => !bm.isVoidTile(t) && t.color !== 'black');
    expect(revealedTiles.length).toBeGreaterThan(0);
  });
});
