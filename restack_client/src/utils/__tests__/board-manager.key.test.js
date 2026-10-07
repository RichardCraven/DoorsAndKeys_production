import { BoardManager } from '../board-manager';

describe('BoardManager key normalization and pickup', () => {
  test('normalizeBoardTiles converts legacy key strings to item objects', () => {
    const bm = new BoardManager();

    // create a fake board with one tile using legacy 'minor key' string
    const board = { tiles: new Array(225).fill(null).map((_, i) => ({ id: i, contains: null })) };
    const keyIdx = 50;
    board.tiles[keyIdx].contains = 'minor key';

    // run normalization
    bm.normalizeBoardTiles(board);

    expect(board.tiles[keyIdx].contains).toBeDefined();
    expect(typeof board.tiles[keyIdx].contains).toBe('object');
    expect(board.tiles[keyIdx].contains.type).toBe('item');
    expect(board.tiles[keyIdx].contains.subtype).toBe('minor_key');
  });

  test('handleInteraction picks up an item-key and calls addItemToInventory and removeTileFromBoard', () => {
    const bm = new BoardManager();

    // Create tiles arrays similar to other tests
    bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: null, image: null, color: 'white' }));
    bm.overlayTiles = bm.tiles.map(t => ({ ...t }));

    const idx = 60;
    // place a normalized key object on the tile (as initializeTiles/normalize should produce)
    bm.tiles[idx].contains = { type: 'item', subtype: 'minor_key' };

    // mock callbacks
    bm.addItemToInventory = jest.fn();
    const removeSpy = jest.spyOn(bm, 'removeTileFromBoard');

    const result = bm.handleInteraction(bm.tiles[idx]);

    expect(result).toBe('item');
    // addItemToInventory should have been called with a tile object (or fallback)
    expect(bm.addItemToInventory).toHaveBeenCalled();
    // removeTileFromBoard should have been invoked to clear the tile
    expect(removeSpy).toHaveBeenCalledWith(bm.tiles[idx]);
  });

  test('isLockedGateTile returns false if the inventory contains a master key', () => {
    const bm = new BoardManager();

    // mock getCurrentInventory to return a master key
    bm.getCurrentInventory = jest.fn().mockReturnValue([
      { name: 'master key', type: 'key', subtype: 'master_key', _im_key: 'master_key' }
    ]);

    // create a locked gate tile
    const gateTile = { id: 1, contains: { type: 'gate', subtype: 'minor_gate' } };

    // check if it is locked
    const isLocked = bm.isLockedGateTile(gateTile);

    expect(isLocked).toBe(false);
  });

  test('handleGate consumes a master key if the specific key is missing', () => {
    const bm = new BoardManager();

    // mock getCurrentInventory to return only a master key
    const masterKey = { name: 'master key', type: 'key', subtype: 'master_key', _im_key: 'master_key' };
    bm.getCurrentInventory = jest.fn().mockReturnValue([masterKey]);

    // mock other dependencies
    bm.broadcastUseConsumableFromInventory = jest.fn();
    bm.messaging = jest.fn();
    bm.refreshTiles = jest.fn();
    bm.updateDungeon = jest.fn();

    // mock pending state to be the same gate
    bm.pending = { type: 'minor_gate' };

    // create a locked gate tile
    const gateTile = { id: 1, contains: { type: 'gate', subtype: 'minor_gate' }, image: 'minor_gate' };
    bm.tiles = { 1: gateTile };
    
    // mock dungeon object structure for persistence
    bm.currentLevel = { id: 1 };
    bm.currentBoard = { id: 1 };
    bm.currentOrientation = 'F';
    bm.dungeon = {
      levels: [{
        id: 1,
        front: {
          miniboards: [{
            id: 1,
            tiles: { 1: gateTile }
          }]
        }
      }]
    };

    bm.handleGate(gateTile, 'minor_gate');

    // The gate should be opened
    expect(gateTile.contains).toBe('archway');
    // The master key should be consumed via broadcast callback
    expect(bm.broadcastUseConsumableFromInventory).toHaveBeenCalledWith(masterKey);
  });

  test('Breacher skill allows forcing open a minor key gate once per level when no key is in inventory', () => {
    const bm = new BoardManager();
    bm.getCurrentInventory = jest.fn().mockReturnValue([]);
    bm.getCrew = jest.fn().mockReturnValue([
      { id: 1, type: 'soldier', globalSkills: [{ key: 'breacher', level: 1 }] }
    ]);
    bm.messaging = jest.fn();
    bm.refreshTiles = jest.fn();
    bm.updateDungeon = jest.fn();

    const gateTile1 = { id: 1, contains: { type: 'gate', subtype: 'minor_gate' }, image: 'minor_gate' };
    const gateTile2 = { id: 2, contains: { type: 'gate', subtype: 'minor_gate' }, image: 'minor_gate' };
    bm.tiles = { 1: gateTile1, 2: gateTile2 };

    bm.currentLevel = { id: 1 };
    bm.currentBoard = { id: 1 };
    bm.currentOrientation = 'F';
    bm.dungeon = {
      levels: [{
        id: 1,
        front: {
          miniboards: [{
            id: 1,
            tiles: { 1: gateTile1, 2: gateTile2 }
          }]
        }
      }]
    };

    // First minor gate on level 1: Breacher forces it open!
    bm.handleGate(gateTile1, 'minor_gate');
    expect(gateTile1.contains).toBe('archway');
    expect(bm.messaging).toHaveBeenCalledWith(expect.stringContaining('Breacher: Forced open the minor key gate'));

    // Second minor gate on level 1: Breacher already used for level 1
    bm.handleGate(gateTile2, 'minor_gate');
    expect(gateTile2.contains).not.toBe('archway');
    expect(bm.messaging).toHaveBeenCalledWith(expect.stringContaining('Breacher already used on Level 1'));
  });

  test('Breacher skill allows forcing open a major key gate when no key is in inventory', () => {
    const bm = new BoardManager();
    bm.getCurrentInventory = jest.fn().mockReturnValue([]);
    bm.getCrew = jest.fn().mockReturnValue([
      { id: 1, type: 'soldier', expeditionSkills: ['soldier_shield', 'breacher'] }
    ]);
    bm.messaging = jest.fn();
    bm.refreshTiles = jest.fn();
    bm.updateDungeon = jest.fn();

    const majorGateTile = { id: 5, contains: { type: 'gate', subtype: 'major_gate' }, image: 'major_gate' };
    bm.tiles = { 5: majorGateTile };

    bm.currentLevel = { id: 2 };
    bm.currentBoard = { id: 1 };
    bm.currentOrientation = 'F';
    bm.dungeon = {
      levels: [{
        id: 2,
        front: {
          miniboards: [{
            id: 1,
            tiles: { 5: majorGateTile }
          }]
        }
      }]
    };

    expect(bm.canBreachGate(majorGateTile, 'major_gate')).toBe(true);
    expect(bm.isLockedGateTile(majorGateTile)).toBe(false);

    bm.handleGate(majorGateTile, 'major_gate');
    expect(majorGateTile.contains).toBe('archway');
    expect(bm.messaging).toHaveBeenCalledWith(expect.stringContaining('Breacher: Forced open the major key gate'));
  });

  test('breachAdjacentGate forces open an adjacent major or minor gate', () => {
    const bm = new BoardManager();
    bm.getCurrentInventory = jest.fn().mockReturnValue([]);
    bm.getCrew = jest.fn().mockReturnValue([
      { id: 1, type: 'soldier', expeditionSkills: ['soldier_shield', 'breacher'] }
    ]);
    bm.messaging = jest.fn();
    bm.refreshTiles = jest.fn();
    bm.updateDungeon = jest.fn();

    // 15x15 board: player at [7, 7] (index 112)
    // Major gate at [7, 8] (index 113) - adjacent to player
    const majorGateTile = { id: 113, contains: 'major_gate', image: 'major_gate' };
    bm.tiles = { 113: majorGateTile };
    bm.playerTile = { location: [7, 7] };
    bm.currentLevel = { id: 3 };
    bm.currentBoard = { id: 1 };
    bm.currentOrientation = 'F';
    bm.dungeon = {
      levels: [{
        id: 3,
        front: {
          miniboards: [{
            id: 1,
            tiles: { 113: majorGateTile }
          }]
        }
      }]
    };

    const res = bm.breachAdjacentGate();
    expect(res.success).toBe(true);
    expect(majorGateTile.contains).toBe('archway');
    expect(majorGateTile.image).toBe('archway');
  });

  test('Closed gates block Fog of War vision past themselves even when player holds key', () => {
    const bm = new BoardManager();
    // 15x15 board
    bm.tiles = new Array(225).fill(null).map((_, i) => ({
      id: i,
      contains: null,
      color: 'black',
      image: null
    }));

    // Player at tile 112 (row 7, col 7)
    // Closed gate at tile 127 (row 8, col 7 - directly below player)
    // Monster behind gate at tile 142 (row 9, col 7)
    bm.tiles[127].contains = { type: 'gate', subtype: 'minor_gate' };
    bm.tiles[142].contains = { type: 'monster', subtype: 'skeleton' };

    // Player HAS minor key in inventory
    bm.getCurrentInventory = jest.fn().mockReturnValue([
      { name: 'minor key', type: 'key', subtype: 'minor_key', _im_key: 'minor_key' }
    ]);

    // Calculate reachable tiles from tile 112
    const reachable = bm.getReachableTilesWithinSteps(112, 3);

    // Closed gate tile (127) SHOULD be visible to the player
    expect(reachable.has(127)).toBe(true);

    // Monster tile behind closed gate (142) MUST NOT be visible
    expect(reachable.has(142)).toBe(false);

    // Also run handleFogOfWar and verify tile 142 stays black / hidden
    bm.handleFogOfWar(bm.tiles[112]);
    expect(bm.tiles[127].color).not.toBe('black'); // Gate tile is revealed
    expect(bm.tiles[142].color).toBe('black');     // Tile past gate remains hidden in fog of war
  });
});
