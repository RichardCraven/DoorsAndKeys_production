import { BoardManager } from '../board-manager';

describe('Tier Tile Resolution at Dungeon Load Time', () => {
    let bm;

    beforeEach(() => {
        bm = new BoardManager();
    });

    test('resolves tier_1_weapon tile to a specific Tier 1 weapon item at board initialization time', () => {
        const testBoard = {
            id: 'board_1',
            tiles: Array.from({ length: 225 }, (_, i) => ({
                id: i,
                type: 'board-tile',
                contains: i === 50 ? { type: 'tier_1_weapon', subtype: null } : { type: 'empty_space', subtype: null }
            }))
        };

        bm.normalizeBoardTiles(testBoard);

        const tile50 = testBoard.tiles[50];
        expect(tile50.contains.type).toBe('item');
        expect(tile50.contains.subtype).toBeTruthy();
        expect(tile50.contains.subtype).not.toBe('tier_1_weapon');
        expect(tile50.image).toBe(tile50.contains.subtype);
    });

    test('resolves tier_2_weapon and tier_3_weapon tiles to category-specific items', () => {
        const testBoard = {
            id: 'board_2',
            tiles: Array.from({ length: 225 }, (_, i) => ({
                id: i,
                type: 'board-tile',
                contains: i === 10 ? { type: 'tier_2_weapon', subtype: null } :
                          i === 20 ? { type: 'tier_3_weapon', subtype: null } :
                          { type: 'empty_space', subtype: null }
            }))
        };

        bm.normalizeBoardTiles(testBoard);

        const tile10 = testBoard.tiles[10];
        const tile20 = testBoard.tiles[20];

        expect(tile10.contains.type).toBe('item');
        expect(tile10.contains.subtype).not.toBe('tier_2_weapon');

        expect(tile20.contains.type).toBe('item');
        expect(tile20.contains.subtype).not.toBe('tier_3_weapon');
    });

    test('resolves tier_1_armor and tier_1_magical tiles to appropriate items', () => {
        const testBoard = {
            id: 'board_3',
            tiles: Array.from({ length: 225 }, (_, i) => ({
                id: i,
                type: 'board-tile',
                contains: i === 30 ? { type: 'tier_1_armor', subtype: null } :
                          i === 40 ? { type: 'tier_1_magical', subtype: null } :
                          { type: 'empty_space', subtype: null }
            }))
        };

        bm.normalizeBoardTiles(testBoard);

        const tile30 = testBoard.tiles[30];
        const tile40 = testBoard.tiles[40];

        expect(tile30.contains.type).toBe('item');
        expect(tile30.contains.subtype).not.toBe('tier_1_armor');

        expect(tile40.contains.type).toBe('item');
        expect(tile40.contains.subtype).not.toBe('tier_1_magical');
    });

    test('resolves tier_1_monster tile to a specific monster of tier 1', () => {
        const testBoard = {
            id: 'board_4',
            tiles: Array.from({ length: 225 }, (_, i) => ({
                id: i,
                type: 'board-tile',
                contains: i === 60 ? { type: 'tier_1_monster', subtype: null } : { type: 'empty_space', subtype: null }
            }))
        };

        bm.normalizeBoardTiles(testBoard);

        const tile60 = testBoard.tiles[60];
        expect(tile60.contains.type).toBe('monster');
        expect(tile60.contains.subtype).toBeTruthy();
        expect(tile60.contains.subtype).not.toBe('tier_1_monster');
    });
});
