jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { BoardManager } from '../board-manager';

describe('BoardManager Trap Loading and Roll Logic', () => {
  let bm;

  beforeEach(() => {
    bm = new BoardManager();
    bm.updateDungeon = jest.fn();
    bm.refreshTiles = jest.fn();
  });

  const createMockBoard = () => {
    const tiles = [];
    for (let i = 0; i < 225; i++) {
      tiles.push({
        id: i,
        color: 'white',
        contains: { type: 'empty_space' },
        hasTrap: false,
        trapRevealed: false
      });
    }
    return {
      id: 'mock_board_123',
      tiles,
      config: {}
    };
  };

  test('Trap spawn roll executes on initial board load', () => {
    const board = createMockBoard();
    const plane = { miniboards: [board] };
    bm.currentLevel = { front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };
    bm.currentLevel.id = 1;

    // Load board
    bm.initializeTilesFromMap(0, 112);

    // Verify trapsRolled is now marked true
    expect(board.trapsRolled).toBe(true);
  });

  test('Trap load uses existing traps if already rolled', () => {
    const board = createMockBoard();
    board.trapsRolled = true;
    board.tiles[20].hasTrap = true; // Inject one trap

    const plane = { miniboards: [board] };
    bm.currentLevel = { front: plane };
    bm.currentOrientation = 'F';
    bm.dungeon = { levels: [{ id: 1, front: plane }] };
    bm.currentLevel.id = 1;

    // Load board
    bm.initializeTilesFromMap(0, 112);

    // Verify trap tile exists in trap set
    expect(bm.trapTileIds.has(20)).toBe(true);
  });
});
