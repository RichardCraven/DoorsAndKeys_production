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

    it('isPassageWallBlockingBetween does not block passage between floor tile and connecting path tile even with solid wall borders', () => {
        const floorTile = {
            id: 112,
            contains: { type: 'empty_space' },
            borders: { right: '2px solid black' }
        };
        const connectingPathTile = {
            id: 113,
            contains: { type: 'connecting_path' },
            borders: { left: '2px solid black' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[112] = floorTile;
        bm.tiles[113] = connectingPathTile;

        expect(bm.isPassageWallBlockingBetween(112, 113)).toBe(false);
        expect(bm.isPassageWallBlockingBetween(113, 112)).toBe(false);
    });

    it('isPassageWallBlockingBetween does not block passage between two connecting path tiles', () => {
        const path1 = {
            id: 112,
            contains: { type: 'connecting_path' },
            borders: { right: '2px solid black' }
        };
        const path2 = {
            id: 113,
            contains: { type: 'connecting_path' },
            borders: { left: '2px solid black' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[112] = path1;
        bm.tiles[113] = path2;

        expect(bm.isPassageWallBlockingBetween(112, 113)).toBe(false);
    });

    it('isPassageWallBlockingBetween blocks stepping off connecting path into pure void dropoff', () => {
        const path = {
            id: 112,
            contains: { type: 'connecting_path' }
        };
        const voidTile = {
            id: 113,
            isVoid: true,
            contains: { type: 'void' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[112] = path;
        bm.tiles[113] = voidTile;

        expect(bm.isPassageWallBlockingBetween(112, 113)).toBe(true);
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

    it('allows board transition when boardIndex is a string', () => {
        const edgeConnectingTile = {
            id: 119,
            contains: { type: 'connecting_path' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[119] = edgeConnectingTile;
        bm.playerTile = {
            location: [22, 29],
            boardIndex: '0'
        };

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });

        bm.moveRight();

        expect(transitionDirection).toBe('right');
        expect(bm.playerTile.boardIndex).toBe(1);
    });

    it('does NOT allow board transition when player is on a regular floor tile at right edge of miniboard 0', () => {
        const floorTile = {
            id: 119, // row 7, col 14
            contains: { type: 'empty_space' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[119] = floorTile;
        bm.playerTile = {
            location: [22, 29],
            boardIndex: 0
        };

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });
        bm.messaging = jest.fn();

        bm.moveRight();

        expect(transitionDirection).toBeNull();
        expect(bm.playerTile.boardIndex).toBe(0);
        expect(bm.messaging).toHaveBeenCalledWith('A wall blocks your way.');
    });

    it('does NOT allow board transition when player is on a regular floor tile at top edge of miniboard 3', () => {
        const floorTile = {
            id: 7, // row 0, col 7
            contains: { type: 'empty_space' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[7] = floorTile;
        bm.playerTile = {
            location: [15, 22],
            boardIndex: 3
        };

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });
        bm.messaging = jest.fn();

        bm.moveUp();

        expect(transitionDirection).toBeNull();
        expect(bm.playerTile.boardIndex).toBe(3);
        expect(bm.messaging).toHaveBeenCalledWith('A wall blocks your way.');
    });

    it('does NOT allow board transition when target board landing tile is an unpainted void dropoff', () => {
        const edgeConnectingTile = {
            id: 119, // row 7, col 14
            contains: { type: 'connecting_path' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[119] = edgeConnectingTile;
        bm.playerTile = {
            location: [22, 29],
            boardIndex: 0
        };

        // Populate target board miniboards[1] where landing tile (row 7, col 0 -> idx 105) is pure void
        const targetBoardTiles = new Array(225).fill(null).map((_, i) => ({
            id: i,
            isVoid: true,
            contains: { type: 'void' }
        }));
        bm.dungeon.levels[0].front.miniboards[1].tiles = targetBoardTiles;

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });
        bm.messaging = jest.fn();

        bm.moveRight();

        expect(transitionDirection).toBeNull();
        expect(bm.playerTile.boardIndex).toBe(0);
        expect(bm.messaging).toHaveBeenCalledWith('A wall blocks your way.');
    });

    it('allows board transition when target board landing tile is a connecting path', () => {
        const edgeConnectingTile = {
            id: 119, // row 7, col 14
            contains: { type: 'connecting_path' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[119] = edgeConnectingTile;
        bm.playerTile = {
            location: [22, 29],
            boardIndex: 0
        };

        // Populate target board miniboards[1] where landing tile (row 7, col 0 -> idx 105) is also a connecting path
        const targetBoardTiles = new Array(225).fill(null).map((_, i) => ({
            id: i,
            isVoid: true,
            contains: { type: 'void' }
        }));
        targetBoardTiles[105] = {
            id: 105,
            contains: { type: 'connecting_path' }
        };
        bm.dungeon.levels[0].front.miniboards[1].tiles = targetBoardTiles;

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });

        bm.moveRight();

        expect(transitionDirection).toBe('right');
        expect(bm.playerTile.boardIndex).toBe(1);
    });

    it('enter connecting path tile should transport to the next board', () => {
        // Player starts on interior tile (row 7, col 13: [22, 28])
        const fromTile = {
            id: 118,
            contains: { type: 'empty_space' }
        };
        // Right edge connecting path tile (row 7, col 14: [22, 29])
        const edgeConnectingTile = {
            id: 119,
            contains: { type: 'connecting_path' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[118] = fromTile;
        bm.tiles[119] = edgeConnectingTile;

        bm.playerTile = {
            location: [22, 28],
            boardIndex: 0
        };

        // Target miniboard 1 landing tile (row 7, col 0: idx 105) is passable
        const targetBoardTiles = new Array(225).fill(null).map((_, i) => ({
            id: i,
            contains: { type: 'empty_space' }
        }));
        bm.dungeon.levels[0].front.miniboards[1].tiles = targetBoardTiles;

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });

        // Moving onto the edge connecting path tile immediately transports to the next board
        bm.move([22, 29], 'right');

        expect(transitionDirection).toBe('right');
        expect(bm.playerTile.boardIndex).toBe(1);
    });

    it('enter connecting path tile on left edge transports to left miniboard', () => {
        bm.currentBoard = bm.dungeon.levels[0].front.miniboards[1];
        bm.playerTile = {
            location: [22, 16], // row 7, col 1
            boardIndex: 1
        };

        const edgeConnectingTile = {
            id: 105, // row 7, col 0 (y = 15 + 0 = 15)
            contains: { type: 'connecting_path' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[105] = edgeConnectingTile;

        // Target miniboard 0 landing tile (row 7, col 14: idx 119) is passable
        const targetBoardTiles = new Array(225).fill(null).map((_, i) => ({
            id: i,
            contains: { type: 'empty_space' }
        }));
        bm.dungeon.levels[0].front.miniboards[0].tiles = targetBoardTiles;

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });

        bm.move([22, 15], 'left');

        expect(transitionDirection).toBe('left');
        expect(bm.playerTile.boardIndex).toBe(0);
    });

    it('does NOT transport when entering an interior connecting path tile that is not at the board edge', () => {
        const interiorConnectingTile = {
            id: 112, // row 7, col 7
            contains: { type: 'connecting_path' }
        };

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, contains: { type: 'empty_space' } }));
        bm.tiles[112] = interiorConnectingTile;

        bm.playerTile = {
            location: [22, 21], // row 7, col 6
            boardIndex: 0
        };

        let transitionDirection = null;
        bm.establishBoardTransitionCallback((dir) => {
            transitionDirection = dir;
        });

        bm.move([22, 22], 'right');

        expect(transitionDirection).toBeNull();
        expect(bm.playerTile.boardIndex).toBe(0);
        expect(bm.playerTile.location).toEqual([22, 22]);
    });
});
