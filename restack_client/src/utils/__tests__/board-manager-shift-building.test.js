import { BoardManager } from '../board-manager';

describe('BoardManager — Shift Key Movement Through User Buildings', () => {
    let bm;

    beforeEach(() => {
        bm = new BoardManager();
        bm.inSuperboard = false;
        bm.currentLevel = { id: 1 };
        bm.currentBoard = { id: 0, tiles: {} };

        // Create 225 tiles (15x15 board)
        bm.tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            color: '#6b6057',
            contains: { type: 'empty_space' },
            type: 'board-tile',
            isVoid: false
        }));

        bm.playerTile = bm.tiles[112]; // row 7, col 7 -> [7, 7]
        bm.playerTile.location = [7, 7];
    });

    test('Moving onto a Locus tile without Shift returns impassable interaction', () => {
        // Tile 113 is row 7, col 8 -> right of player
        bm.tiles[113].contains = { type: 'locus', subtype: 'locus' };
        bm.tiles[113].building = 'locus';

        const interaction = bm.handleInteraction(bm.tiles[113], {});
        expect(interaction).toBe('impassable');

        // Normal move without shift fails to update player location
        bm.moveRight({});
        expect(bm.playerTile.location).toEqual([7, 7]);
    });

    test('Moving onto a Locus tile WITH Shift key moves player onto the tile and bypasses interaction modal', () => {
        bm.tiles[113].contains = { type: 'locus', subtype: 'locus' };
        bm.tiles[113].building = 'locus';

        const interaction = bm.handleInteraction(bm.tiles[113], { shiftKey: true });
        expect(interaction).toBeNull();

        // Move right with shiftKey: true
        bm.moveRight({ shiftKey: true });
        expect(bm.playerTile.location).toEqual([7, 8]);
    });

    test('Moving onto an Outpost Tower tile WITH Shift key moves player onto the tile', () => {
        bm.tiles[113].contains = { type: 'building', subtype: 'outpost_tower' };
        bm.tiles[113].building = 'outpost_tower';

        const interaction = bm.handleInteraction(bm.tiles[113], { shiftKey: true });
        expect(interaction).toBeNull();

        bm.moveRight({ shiftKey: true });
        expect(bm.playerTile.location).toEqual([7, 8]);
    });

    test('Moving through a user building in a passage WITH Shift key allows passage traversal', () => {
        // Setup passage wall blocking check
        bm.tiles[112].isPassageTile = true;
        bm.tiles[113].isPassageTile = true;
        bm.tiles[113].contains = { type: 'building', subtype: 'outpost_tower' };
        bm.tiles[113].building = 'outpost_tower';

        const isBlockedNoShift = bm.isPassageWallBlockingBetween(112, 113, {});
        expect(isBlockedNoShift).toBe(true);

        const isBlockedWithShift = bm.isPassageWallBlockingBetween(112, 113, { shiftKey: true });
        expect(isBlockedWithShift).toBe(false);
    });
});
