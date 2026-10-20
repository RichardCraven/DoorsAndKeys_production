import { BoardManager } from '../board-manager';
import { getMeta, storeMeta } from '../session-handler';
import { SCRAP_CAP } from '../engineer-expedition';

describe('Engineer Scrap Spawning and Pickup Logic', () => {
  let bm;

  beforeEach(() => {
    sessionStorage.clear();
    bm = new BoardManager();
  });

  const createMockBoard = (id = 'mock_board_1') => {
    const tiles = [];
    for (let i = 0; i < 225; i++) {
      tiles.push({
        id: i,
        color: '#6b6057',
        contains: { type: 'empty_space' },
        hasTrap: false,
        trapRevealed: false
      });
    }
    return {
      id,
      tiles,
      config: {}
    };
  };

  test('Randomly spawns 2 to 4 scrap piles on empty board load', () => {
    const board = createMockBoard();
    const plane = { miniboards: [board] };
    bm.currentLevel = { id: 1, front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };

    bm.initializeTilesFromMap(0, 112);

    const scrapTiles = bm.tiles.filter(t => t.contains && t.contains.type === 'scrap');
    expect(scrapTiles.length).toBeGreaterThanOrEqual(2);
    expect(scrapTiles.length).toBeLessThanOrEqual(4);

    scrapTiles.forEach(tile => {
      expect(tile.contains.subtype).toBe('scrap');
      expect(tile.contains.name).toBe('Scrap');
      expect(board.tiles[tile.id].image).toBe('scrap');
      expect(bm.getImageForContains(tile.contains, tile)).toBe('scrap');
      // Should not spawn on spawn tile 112
      expect(tile.id).not.toBe(112);
      // Should be interior tile
      const r = Math.floor(tile.id / 15);
      const c = tile.id % 15;
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThan(14);
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThan(14);
    });
  });

  test('Does not spawn scrap on void tiles, traps, or spawn tile', () => {
    const board = createMockBoard();
    // Mark some tiles as void or traps
    board.tiles[16].isVoid = true;
    board.tiles[16].type = 'void';
    board.tiles[17].hasTrap = true;

    const plane = { miniboards: [board] };
    bm.currentLevel = { id: 1, front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };

    bm.initializeTilesFromMap(0, 18);

    expect(board.tiles[16].contains.type).not.toBe('scrap');
    expect(board.tiles[17].contains.type).not.toBe('scrap');
    expect(board.tiles[18].contains?.type).not.toBe('scrap');
  });

  test('Respects maximum cap of 4 scrap piles on a single board across repeated loads', () => {
    const board = createMockBoard();
    // Pre-populate with 4 scrap piles
    board.tiles[20].contains = { type: 'scrap', subtype: 'scrap', amount: 1 };
    board.tiles[21].contains = { type: 'scrap', subtype: 'scrap', amount: 1 };
    board.tiles[22].contains = { type: 'scrap', subtype: 'scrap', amount: 1 };
    board.tiles[23].contains = { type: 'scrap', subtype: 'scrap', amount: 1 };

    const plane = { miniboards: [board] };
    bm.currentLevel = { id: 1, front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };

    bm.initializeTilesFromMap(0, 112);

    const scrapTiles = bm.tiles.filter(t => t.contains && t.contains.type === 'scrap');
    expect(scrapTiles.length).toBe(4);
  });

  test('Spawns only up to the cap of 4 when some scrap already exists', () => {
    const board = createMockBoard();
    // Pre-populate with 3 scrap piles
    board.tiles[20].contains = { type: 'scrap', subtype: 'scrap', amount: 1 };
    board.tiles[21].contains = { type: 'scrap', subtype: 'scrap', amount: 1 };
    board.tiles[22].contains = { type: 'scrap', subtype: 'scrap', amount: 1 };

    const plane = { miniboards: [board] };
    bm.currentLevel = { id: 1, front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };

    bm.initializeTilesFromMap(0, 112);

    const scrapTiles = bm.tiles.filter(t => t.contains && t.contains.type === 'scrap');
    expect(scrapTiles.length).toBeLessThanOrEqual(4);
  });

  test('Does not spawn random scrap in tutorial dungeon', () => {
    const board = createMockBoard();
    const plane = { miniboards: [board] };
    bm.currentLevel = { id: 1, front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { id: 'tutorial_dungeon', isTutorial: true, levels: [{ id: 1, front: plane }] };

    bm.initializeTilesFromMap(0, 112);

    const scrapTiles = bm.tiles.filter(t => t.contains && t.contains.type === 'scrap');
    expect(scrapTiles.length).toBe(0);
  });

  test('handleInteraction picks up scrap, calls callback, clears tile, and returns "scrap"', () => {
    const board = createMockBoard();
    const plane = { miniboards: [board] };
    bm.currentLevel = { id: 1, front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };
    bm.initializeTilesFromMap(0, 112);

    const scrapTile = {
      id: 20,
      contains: { type: 'scrap', subtype: 'scrap', name: 'Scrap', amount: 2 },
      image: 'scrap',
      color: '#6b6057'
    };
    bm.tiles[20] = scrapTile;

    let callbackTile = null;
    bm.establishAddScrapToInventoryCallback((tile) => {
      callbackTile = tile;
    });

    const result = bm.handleInteraction(scrapTile);

    expect(result).toBe('scrap');
    expect(callbackTile).toBe(scrapTile);
    expect(scrapTile.contains).toBeNull();
    expect(scrapTile.image).toBeNull();
  });

  test('handleInteraction default fallback adds to meta.scrap up to SCRAP_CAP', () => {
    const board = createMockBoard();
    const plane = { miniboards: [board] };
    bm.currentLevel = { id: 1, front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };
    bm.initializeTilesFromMap(0, 112);

    const meta = { scrap: 29 };
    storeMeta(meta);

    const scrapTile = {
      id: 35,
      contains: { type: 'scrap', subtype: 'scrap', amount: 2 },
      image: 'scrap',
      color: '#6b6057'
    };
    bm.tiles[35] = scrapTile;

    const result = bm.handleInteraction(scrapTile);

    expect(result).toBe('scrap');
    const updatedMeta = getMeta();
    // 29 + 2 capped at 30
    expect(updatedMeta.scrap).toBe(SCRAP_CAP);
    expect(scrapTile.contains).toBeNull();
  });

  test('handleInteraction routes type: item with subtype: scrap to scrap pickup', () => {
    const board = createMockBoard();
    const plane = { miniboards: [board] };
    bm.currentLevel = { id: 1, front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };
    bm.initializeTilesFromMap(0, 112);

    const itemScrapTile = {
      id: 40,
      contains: { type: 'item', subtype: 'scrap', amount: 1 },
      image: 'scrap',
      color: '#6b6057'
    };
    bm.tiles[40] = itemScrapTile;

    let pickedUp = false;
    bm.establishAddScrapToInventoryCallback(() => {
      pickedUp = true;
    });

    const result = bm.handleInteraction(itemScrapTile);

    expect(result).toBe('scrap');
    expect(pickedUp).toBe(true);
    expect(itemScrapTile.contains).toBeNull();
  });
});
