import { BoardManager } from '../board-manager';

describe('BoardManager — Observation Platform Dungeon Fog of War', () => {
    let bm;

    beforeEach(() => {
        bm = new BoardManager();
        bm.inSuperboard = false;
        bm.currentLevel = { id: 1 };
        bm.currentBoard = { id: 0, tiles: {} };

        // Create 225 tiles (15x15 board) — default unpainted tiles are void
        bm.tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            color: 'black',
            contains: 'empty',
            type: 'void',
            isVoid: true
        }));

        // Set tile 100 as a valid playable floor tile inside a room
        bm.tiles[100].isVoid = false;
        bm.tiles[100].type = 'board-tile';
        bm.tiles[100].contains = { type: 'empty_space' };
        bm.tiles[100].color = '#6b6057';

        // Mark tile 220 as explicit void
        bm.tiles[220].isVoid = true;
        bm.tiles[220].contains = 'void';
        bm.tiles[220].type = 'void';

        bm.playerTile = bm.tiles[100];
    });

    test('Observation Platform in dungeon illuminates all non-void tiles on miniboard and clears partialObscured while preserving void tiles', () => {
        // Place an observation platform on tile 50
        bm.tiles[50].contains = { type: 'observer_platform', subtype: 'observer_platform' };
        bm.tiles[50].building = 'observer_platform';
        bm.tiles[50].isVoid = false;
        bm.tiles[50].color = '#6b6057';

        bm.handleFogOfWar(bm.playerTile);

        // Non-void floor tile (tile 100) should be revealed, colored, and NOT partialObscured
        expect(bm.tiles[100].color).not.toBe('black');
        expect(bm.tiles[100].partialObscured).toBe(false);

        // Unpainted void tile (e.g. tile 10) should remain black void (black)
        expect(bm.tiles[10].color).toBe('black');

        // Explicit void tile (tile 220) should remain unrevealed void (black)
        expect(bm.tiles[220].color).toBe('black');
    });
});
