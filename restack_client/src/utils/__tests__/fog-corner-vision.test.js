import { BoardManager } from '../board-manager';

describe('BoardManager Around-The-Corner Fog of War Vision', () => {
  test('reveals immediate corner tile as partialObscured=true and hides tiles beyond the corner', () => {
    const bm = new BoardManager();

    // Create 15x15 board (225 tiles)
    bm.tiles = new Array(225).fill(null).map((_, i) => ({
      id: i,
      contains: null,
      color: 'black',
      image: null,
      partialObscured: false
    }));

    // Player at row 7, col 7 (tile 112)
    const playerIdx = 112; // (7, 7)
    bm.playerTile = { location: [7, 7], boardIndex: 1 };

    // Row 6, col 7 (tile 97) is open floor (vertical neighbor)
    bm.tiles[97].contains = null;

    // Row 7, col 8 (tile 113) is a corner wall / void tile (horizontal neighbor)
    bm.tiles[113].contains = 'void_fill';

    // Immediate corner tile at row 6, col 8 (tile 98) - diagonal tile around corner wall 113
    bm.tiles[98].contains = null;

    // Tile 2 steps past corner bend at row 5, col 8 (tile 83)
    bm.tiles[83].contains = null;

    // Run Fog of War (default radius 2)
    const visibleTileIds = bm.handleFogOfWar(bm.tiles[playerIdx]);

    // Player tile 112 is visible and not partialObscured
    expect(visibleTileIds.has(112)).toBe(true);
    expect(bm.tiles[112].color).not.toBe('black');
    expect(bm.tiles[112].partialObscured).toBe(false);

    // Vertical neighbor 97 is visible and in direct LOS (partialObscured = false)
    expect(visibleTileIds.has(97)).toBe(true);
    expect(bm.tiles[97].color).not.toBe('black');
    expect(bm.tiles[97].partialObscured).toBe(false);

    // Immediate corner tile 98 (around corner wall 113 via 97) SHOULD be visible, with partialObscured = true
    expect(visibleTileIds.has(98)).toBe(true);
    expect(bm.tiles[98].color).not.toBe('black');
    expect(bm.tiles[98].partialObscured).toBe(true);

    // Tile 83 (2 steps past corner bend) MUST NOT be visible (must stay hidden in black fog)
    expect(visibleTileIds.has(83)).toBe(false);
    expect(bm.tiles[83].color).toBe('black');
  });
});
