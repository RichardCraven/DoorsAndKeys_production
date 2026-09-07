import { BoardManager } from '../board-manager';

describe('Wall Collision and Board Teleportation Tests', () => {
    let bm;

    beforeEach(() => {
        bm = new BoardManager();
        bm.dungeon = {
            id: 'carcosa',
            levels: [{
                id: 0,
                front: {
                    miniboards: [
                        {
                            id: 0,
                            tiles: Array.from({ length: 225 }, (_, i) => ({
                                id: i,
                                color: null,
                                contains: { type: 'empty_space', subtype: null },
                                borders: null,
                                type: 'board-tile'
                            }))
                        }
                    ]
                }
            }]
        };
        bm.currentLevel = bm.dungeon.levels[0];
        bm.currentOrientation = 'F';
        bm.currentBoard = bm.dungeon.levels[0].front.miniboards[0];
        bm.initializeTilesFromMap(0, 112);
    });

    test('Regular floor tile with empty_space is NOT treated as a void tile', () => {
        const floorTile = bm.tiles[112];
        expect(bm.isVoidTile(floorTile)).toBe(false);
        expect(bm.isVoidTile({ id: 50, contains: { type: 'empty_space' }, color: null })).toBe(false);
    });

    test('Unpainted void tile is correctly treated as a void tile', () => {
        expect(bm.isVoidTile({ id: 0, type: 'void', contains: 'empty', color: 'black' })).toBe(true);
        expect(bm.isVoidTile({ id: 1, contains: { type: 'void' } })).toBe(true);
        expect(bm.isVoidTile({ id: 2, isVoid: true })).toBe(true);
    });

    test('Solid wall border (2px solid black) strictly blocks movement between tiles', () => {
        // Tile 112 has a right wall (facing tile 113)
        bm.tiles[112].borders = { right: '2px solid black' };
        bm.tiles[113].borders = { left: '2px solid black' };

        expect(bm.hasSolidBorder(bm.tiles[112], 'right')).toBe(true);
        expect(bm.hasSolidBorder(bm.tiles[113], 'left')).toBe(true);
        expect(bm.isPassageWallBlockingBetween(112, 113)).toBe(true);

        // Movement from 112 to 113 must not change player position
        bm.playerTile.location = bm.getCoordinatesFromIndex(112);
        bm.moveRight();
        expect(bm.getIndexFromCoordinates(bm.playerTile.location)).toBe(112);
    });

    test('Passage tile walls (top/bottom solid black) strictly block perpendicular movement through walls', () => {
        // Create corridor passage on tile 36 (row 2, col 6) with top and bottom walls
        bm.tiles[36] = {
            id: 36,
            contains: { type: 'passage', subtype: null },
            borders: {
                top: '2px solid black',
                bottom: '2px solid black',
                left: '2px solid transparent',
                right: '2px solid transparent'
            },
            type: 'passage'
        };
        // Tile 21 is directly above tile 36 (row 1, col 6)
        bm.tiles[21] = {
            id: 21,
            contains: { type: 'empty_space', subtype: null },
            borders: {
                bottom: '2px solid black'
            },
            type: 'board-tile'
        };
        // Tile 37 is directly right of tile 36 (row 2, col 7)
        bm.tiles[37] = {
            id: 37,
            contains: { type: 'passage', subtype: null },
            borders: {
                top: '2px solid black',
                bottom: '2px solid black',
                left: '2px solid transparent',
                right: '2px solid transparent'
            },
            type: 'passage'
        };

        // Moving UP from 36 to 21 is BLOCKED by top wall
        expect(bm.isPassageWallBlockingBetween(36, 21)).toBe(true);

        // Moving RIGHT from 36 to 37 is ALLOWED through open transparent border
        expect(bm.isPassageWallBlockingBetween(36, 37)).toBe(false);

        // Movement test
        bm.playerTile.location = bm.getCoordinatesFromIndex(36);
        bm.moveUp();
        expect(bm.getIndexFromCoordinates(bm.playerTile.location)).toBe(36); // blocked

        bm.moveRight();
        expect(bm.getIndexFromCoordinates(bm.playerTile.location)).toBe(37); // permitted
    });

    test('Teleporting to a board with empty_space tiles reveals tiles and does NOT leave board as void', () => {
        bm.initializeTilesFromMap(0, 112);

        // Player tile should be revealed and not black
        expect(bm.playerTile.location).toBeDefined();
        const playerIdx = bm.getIndexFromCoordinates(bm.playerTile.location);
        expect(playerIdx).toBe(112);
        expect(bm.tiles[playerIdx].color).toBe('#6b6057');

        // Can move to adjacent unobstructed tile
        bm.moveRight();
        expect(bm.getIndexFromCoordinates(bm.playerTile.location)).toBe(113);
    });
});
