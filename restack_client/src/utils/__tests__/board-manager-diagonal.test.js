import { BoardManager } from '../board-manager';

describe('BoardManager diagonal movement and blocking', () => {
  test('isDiagonalPassageBlocked returns correct blocking values based on walls', () => {
    const bm = new BoardManager();

    // Create 15x15 board tiles
    bm.tiles = new Array(225).fill(null).map((_, i) => ({
      id: i,
      contains: null,
      borders: {},
      image: null,
      color: 'white'
    }));

    // indices:
    // (0,0) -> 0
    // (0,1) -> 1
    // (1,0) -> 15
    // (1,1) -> 16
    const fromIdx = 0;
    const toIdx = 16;

    // Case 1: No walls -> not blocked
    expect(bm.isDiagonalPassageBlocked(fromIdx, toIdx)).toBe(false);

    // Case 2: Wall between (0,0) and (0,1) (top-right cardinal border)
    // and no wall on the other side -> not blocked (since path 2 is open)
    bm.tiles[0].borders = { right: '3px solid #000' };
    expect(bm.isDiagonalPassageBlocked(fromIdx, toIdx)).toBe(false);

    // Case 3: Wall on both path routes -> blocked
    bm.tiles[0].borders = { right: '3px solid #000', bottom: '3px solid #000' };
    expect(bm.isDiagonalPassageBlocked(fromIdx, toIdx)).toBe(true);
  });

  test('move updates coordinates correctly for diagonal directions', () => {
    const bm = new BoardManager();

    // Create 15x15 board tiles
    bm.tiles = new Array(225).fill(null).map((_, i) => ({
      id: i,
      contains: null,
      borders: {},
      image: null,
      color: 'white'
    }));

    // Player starts at (0,0)
    bm.playerTile = {
      location: [0, 0],
      boardIndex: 1,
      id: 0
    };

    // Move player diagonally to (1,1)
    const destinationCoords = [1, 1];
    bm.move(destinationCoords, 'downright');

    expect(bm.playerTile.location).toEqual([1, 1]);
  });
});
