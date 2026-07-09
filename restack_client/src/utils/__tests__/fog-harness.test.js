import { BoardManager } from '../../utils/board-manager';

function makeEmptyBoard(id = 1) {
  const tiles = new Array(225).fill(null).map((_, i) => ({
    id: i,
    contains: null,
    color: 'black',
    original: null,
    image: null
  }));
  return { id, tiles, name: 'harness-board' };
}

describe('BoardManager fog/respawn harness', () => {
  test('defeated monster tile remains visible when in player vision after fog recalculation', () => {
    const bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();

    const board = makeEmptyBoard(101);
    board.tiles[55].contains = { type: 'monster', subtype: 'skeleton' };
    board.tiles[55].color = '#ff000078';

    const level = { id: 1, front: { miniboards: [board] }, back: { miniboards: [] }, name: 'L1' };
    bm.dungeon = { levels: [level] };
    bm.currentLevel = level;
    bm.currentOrientation = 'F';
    bm.currentBoard = board;

    const playerIndex = 53;
    bm.playerTile = { location: bm.getCoordinatesFromIndex(playerIndex), boardIndex: 0 };

    bm.initializeTilesFromMap(0, bm.getIndexFromCoordinates(bm.playerTile.location));

    expect(bm.getContainsType(bm.tiles[55].contains)).toBe('monster');

    bm.removeDefeatedMonsterTile(55);

    const runtimeAfterRemoval = bm.tiles[55];
    const persistedAfterRemoval = bm.currentBoard.tiles[55];

    expect(persistedAfterRemoval).toBeDefined();
    expect(persistedAfterRemoval.color).toBeDefined();
    expect(runtimeAfterRemoval.color).toBeDefined();
    expect(runtimeAfterRemoval.color).not.toBe('black');
    expect(runtimeAfterRemoval.image).toBeNull();

  // simulate a move which triggers fog recalc (choose a move that stays within vision)
  bm.playerTile.location = bm.getCoordinatesFromIndex(playerIndex);
  bm.moveRight();

    const runtimeAfterMove = bm.tiles[55];
    expect(runtimeAfterMove.color).toBeDefined();
    expect(runtimeAfterMove.color).not.toBe('black');
  });

  test('void tiles adjacent to player are not revealed by vertical reveal', () => {
    const bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();

    const board = makeEmptyBoard(201);
    // mark tile 70 as a void
    board.tiles[70].contains = { type: 'void', subtype: null };
    board.tiles[70].color = 'black';

    const level = { id: 2, front: { miniboards: [board] }, back: { miniboards: [] }, name: 'L2' };
    bm.dungeon = { levels: [level] };
    bm.currentLevel = level;
    bm.currentBoard = board;
    bm.currentOrientation = 'F';

    // put player directly below the void so it's adjacent vertically
    // choose index so that 70 is above 85: row/col arithmetic in BoardManager uses 15 offset
    const playerBelowVoid = 85; // 85 - 15 = 70
    bm.playerTile = { location: bm.getCoordinatesFromIndex(playerBelowVoid), boardIndex: 0 };

    bm.initializeTilesFromMap(0, bm.getIndexFromCoordinates(bm.playerTile.location));
    bm.moveUp();

    expect(bm.tiles[70].color).toBe('black');
  });

  test('movement is blocked by solid passage borders between adjacent tiles', () => {
    const bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();

    const board = makeEmptyBoard(301);
    const playerIndex = 112;
    const leftIndex = 111;

    board.tiles[playerIndex].contains = { type: 'passage', subtype: null };
    board.tiles[leftIndex].contains = { type: 'passage', subtype: null };
    board.tiles[playerIndex].borders = {
      top: '2px solid transparent',
      bottom: '2px solid transparent',
      left: '2px solid black',
      right: '2px solid transparent'
    };
    board.tiles[leftIndex].borders = {
      top: '2px solid transparent',
      bottom: '2px solid transparent',
      left: '2px solid transparent',
      right: '2px solid black'
    };

    const level = { id: 3, front: { miniboards: [board] }, back: { miniboards: [] }, name: 'L3' };
    bm.dungeon = { levels: [level] };
    bm.currentLevel = level;
    bm.currentBoard = board;
    bm.currentOrientation = 'F';

    bm.playerTile = { location: bm.getCoordinatesFromIndex(playerIndex), boardIndex: 0 };
    bm.initializeTilesFromMap(0, bm.getIndexFromCoordinates(bm.playerTile.location));

    const originalLocation = [...bm.playerTile.location];
    bm.moveLeft();

    expect(bm.playerTile.location).toEqual(originalLocation);
    expect(bm.isMovementBlocked(bm.getCoordinatesFromIndex(leftIndex))).toBe(true);
  });

  test('fog reveal includes tiles reachable around path walls within two steps', () => {
    const bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();

    const board = makeEmptyBoard(401);
    const playerIndex = 112;
    const northIndex = 97;
    const northWestIndex = 96;

    board.tiles[playerIndex].contains = { type: 'passage', subtype: null };
    board.tiles[northIndex].contains = { type: 'passage', subtype: null };

    // Player tile has a left wall, but the north tile is open to the northwest.
    board.tiles[playerIndex].borders = {
      top: '2px solid transparent',
      bottom: '2px solid transparent',
      left: '2px solid black',
      right: '2px solid transparent'
    };
    board.tiles[northIndex].borders = {
      top: '2px solid transparent',
      bottom: '2px solid transparent',
      left: '2px solid transparent',
      right: '2px solid transparent'
    };

    const level = { id: 4, front: { miniboards: [board] }, back: { miniboards: [] }, name: 'L4' };
    bm.dungeon = { levels: [level] };
    bm.currentLevel = level;
    bm.currentBoard = board;
    bm.currentOrientation = 'F';

    bm.playerTile = { location: bm.getCoordinatesFromIndex(playerIndex), boardIndex: 0 };
    bm.initializeTilesFromMap(0, bm.getIndexFromCoordinates(bm.playerTile.location));

    // Reachable in two orthogonal steps (up then left), so it should be visible.
    expect(bm.tiles[northWestIndex].color).not.toBe('black');
  });

  test('fog reveal rehydrates persisted borders on visible tiles', () => {
    const bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();

    const board = makeEmptyBoard(501);
    const playerIndex = 112;
    const southIndex = 127;
    const southWestIndex = 126;

    board.tiles[playerIndex].contains = { type: 'passage', subtype: null };
    board.tiles[southIndex].contains = { type: 'passage', subtype: null };
    board.tiles[southWestIndex].contains = { type: 'passage', subtype: null };

    board.tiles[southIndex].borders = {
      top: '2px solid transparent',
      bottom: '2px solid transparent',
      left: '2px solid black',
      right: '2px solid transparent'
    };
    board.tiles[southWestIndex].borders = {
      top: '2px solid transparent',
      bottom: '2px solid transparent',
      left: '2px solid transparent',
      right: '2px solid black'
    };

    const level = { id: 5, front: { miniboards: [board] }, back: { miniboards: [] }, name: 'L5' };
    bm.dungeon = { levels: [level] };
    bm.currentLevel = level;
    bm.currentBoard = board;
    bm.currentOrientation = 'F';

    bm.playerTile = { location: bm.getCoordinatesFromIndex(playerIndex), boardIndex: 0 };
    bm.initializeTilesFromMap(0, bm.getIndexFromCoordinates(bm.playerTile.location));

    expect(bm.tiles[southIndex].color).not.toBe('black');
    expect(bm.tiles[southWestIndex].color).not.toBe('black');
    expect(bm.tiles[southIndex].borders?.left).toBe('1px solid black');
    expect(bm.tiles[southWestIndex].borders?.right).toBe('1px solid black');
  });

  test('partial obscurity flags non-adjacent visible tiles separated by a wall', () => {
    const bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();

    const board = makeEmptyBoard(601);
    const playerIndex = 112;
    const northIndex = 97;
    const westIndex = 111;
    const northWestIndex = 96;

    board.tiles[playerIndex].contains = { type: 'empty_space', subtype: null };
    board.tiles[northIndex].contains = { type: 'passage', subtype: null };
    board.tiles[westIndex].contains = { type: 'passage', subtype: null };
    board.tiles[northWestIndex].contains = { type: 'passage', subtype: null };

    // Block only the boundary between N and NW, while NW remains reachable via W.
    board.tiles[northIndex].borders = {
      top: '2px solid transparent',
      bottom: '2px solid transparent',
      left: '2px solid black',
      right: '2px solid transparent'
    };
    board.tiles[northWestIndex].borders = {
      top: '2px solid transparent',
      bottom: '2px solid transparent',
      left: '2px solid transparent',
      right: '2px solid black'
    };

    const level = { id: 6, front: { miniboards: [board] }, back: { miniboards: [] }, name: 'L6' };
    bm.dungeon = { levels: [level] };
    bm.currentLevel = level;
    bm.currentBoard = board;
    bm.currentOrientation = 'F';

    bm.playerTile = { location: bm.getCoordinatesFromIndex(playerIndex), boardIndex: 0 };
    bm.initializeTilesFromMap(0, bm.getIndexFromCoordinates(bm.playerTile.location));

    expect(bm.tiles[northWestIndex].color).not.toBe('black');
    expect(bm.tiles[northWestIndex].partialObscured).toBe(true);

    // Directly adjacent visible tiles are never partially obscured.
    expect(bm.tiles[northIndex].partialObscured).not.toBe(true);
  });

  test('vendor tiles revealed when adjacent to player default to neutral dark-stone color (#6b6057) instead of white', () => {
    const bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();

    const board = makeEmptyBoard(701);
    
    // Set up a 2x2 vendor footprint
    // 30 (Row 2, Col 0), 31 (Row 2, Col 1), 45 (Row 3, Col 0), 46 (Row 3, Col 1)
    const vendorGroupId = 'vendor_test_30';
    const footprintIndices = [30, 31, 45, 46];
    const vendorCells = ['anchor', 'top_right', 'bottom_left', 'bottom_right'];
    
    footprintIndices.forEach((idx, i) => {
      board.tiles[idx].contains = {
        type: 'vendor',
        subtype: 'magic_shop',
        vendorGroupId,
        vendorAnchorId: 30,
        vendorCell: vendorCells[i]
      };
      board.tiles[idx].color = null;
    });

    // Place player at Row 4, Col 0 (index 60), which is adjacent to bottom-left vendor tile (index 45)
    const playerIndex = 60;
    board.tiles[playerIndex].contains = { type: 'passage', subtype: null };

    const level = { id: 7, front: { miniboards: [board] }, back: { miniboards: [] }, name: 'L7' };
    bm.dungeon = { levels: [level] };
    bm.currentLevel = level;
    bm.currentBoard = board;
    bm.currentOrientation = 'F';

    bm.playerTile = { location: bm.getCoordinatesFromIndex(playerIndex), boardIndex: 0 };
    bm.initializeTilesFromMap(0, bm.getIndexFromCoordinates(bm.playerTile.location));

    // Verify all four vendor tiles get the dark stone color fallback #6b6057, and none of them is white
    expect(bm.tiles[45].color).toBe('#6b6057');
    expect(bm.tiles[30].color).toBe('#6b6057');
    expect(bm.tiles[46].color).toBe('#6b6057');
    expect(bm.tiles[31].color).toBe('#6b6057');
  });

  test('persisted white tile color is filtered out and defaults to neutral dark-stone color (#6b6057) during fog reveal', () => {
    const bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();

    const board = makeEmptyBoard(801);
    
    // Set up a key tile with persisted legacy color 'white'
    const keyIndex = 45; // Row 3, Col 0
    board.tiles[keyIndex].contains = { type: 'item', subtype: 'minor_key' };
    board.tiles[keyIndex].color = 'white';

    // Place player at Row 4, Col 0 (index 60), adjacent to key
    const playerIndex = 60;
    board.tiles[playerIndex].contains = { type: 'passage', subtype: null };

    const level = { id: 8, front: { miniboards: [board] }, back: { miniboards: [] }, name: 'L8' };
    bm.dungeon = { levels: [level] };
    bm.currentLevel = level;
    bm.currentBoard = board;
    bm.currentOrientation = 'F';

    bm.playerTile = { location: bm.getCoordinatesFromIndex(playerIndex), boardIndex: 0 };
    bm.initializeTilesFromMap(0, bm.getIndexFromCoordinates(bm.playerTile.location));

    // Verify key tile gets the dark stone color fallback #6b6057, not white
    expect(bm.tiles[keyIndex].color).toBe('#6b6057');
  });
});
