import { BoardManager } from '../board-manager';

describe('Connecting Path & Board Edge Transitions', () => {
    let bm;

    beforeEach(() => {
        bm = new BoardManager();
        bm.dungeon = {
            id: 'test_dungeon',
            levels: [{
                id: 0,
                front: {
                    miniboards: [
                        { id: 0, tiles: [] },
                        { id: 1, tiles: [] },
                        { id: 2, tiles: [] }
                    ]
                }
            }]
        };
        bm.currentLevel = bm.dungeon.levels[0];
        bm.currentOrientation = 'F';
        bm.currentBoard = bm.dungeon.levels[0].front.miniboards[0];
    });

    it('isConnectingPathTile correctly identifies connecting path tiles across multiple shapes', () => {
        expect(bm.isConnectingPathTile({ contains: { type: 'connecting_path' } })).toBe(true);
        expect(bm.isConnectingPathTile({ contains: 'connecting_path' })).toBe(true);
        expect(bm.isConnectingPathTile({ optionType: 'connecting path' })).toBe(true);
        expect(bm.isConnectingPathTile({ isConnectingPath: true })).toBe(true);
        expect(bm.isConnectingPathTile({ contains: { subtype: 'passage' } })).toBe(true);
        expect(bm.isConnectingPathTile({ contains: { type: 'empty_space' } })).toBe(false);
    });

    it('isPassageWallBlockingBetween does not block passage between floor tile and connecting path tile', () => {
        const floorTile = {
            id: 112,
            contains: { type: 'empty_space' },
            borders: { right: '1px solid black' }
        };
        const connectingPathTile = {
            id: 113,
            contains: { type: 'connecting_path' },
            borders: { left: '1px solid black' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[112] = floorTile;
        bm.tiles[113] = connectingPathTile;

        expect(bm.isPassageWallBlockingBetween(112, 113)).toBe(false);
    });

    it('allows board transition when player is on connecting path at right edge of miniboard 0', () => {
        const edgeConnectingTile = {
            id: 119, // row 7, col 14
            contains: { type: 'connecting_path' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[119] = edgeConnectingTile;
        bm.playerTile = {
            location: [22, 29], // row 7, col 14 (y = 15 + 14 = 29)
            boardIndex: 0
        };

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });

        bm.moveRight();

        expect(transitionDirection).toBe('right');
        expect(bm.playerTile.boardIndex).toBe(1);
    });
});
