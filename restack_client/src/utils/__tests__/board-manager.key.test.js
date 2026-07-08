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
});
