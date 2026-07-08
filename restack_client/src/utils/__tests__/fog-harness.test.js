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
});
