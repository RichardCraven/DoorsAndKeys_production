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
});
