import { BoardManager } from '../board-manager';

describe('BoardManager respawnShrines', () => {
  test('respawning a shrine restores its contains, image, color, and borders from the template', () => {
    const bm = new BoardManager();

    // Mock dungeon level and board structures
    const templateDungeon = {
      levels: [
        {
          id: 1,
          front: {
            id: 1,
            name: 'Level 1 Front',
            miniboards: [
              {
                id: 101,
                tiles: [
                  {
                    id: 0,
                    contains: { type: 'shrine', subtype: 'sage', key: 'shrine_sage_1' },
                    color: '#4B0082',
                    borders: { top: '3px solid black', left: '3px solid black' }
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    bm.dungeon = {
      levels: [
        {
          id: 1,
          front: {
            id: 1,
            name: 'Level 1 Front',
            miniboards: [
              {
                id: 101,
                tiles: [
                  {
                    id: 0,
                    contains: null, // used shrine
                    color: '#6b6057',
                    borders: null
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    bm.currentLevel = bm.dungeon.levels[0];
    bm.currentOrientation = 'F';
    bm.currentBoard = bm.dungeon.levels[0].front.miniboards[0];
    bm.playerTile = { location: [15, 15], boardIndex: 0 };

    bm.tiles = [
      {
        id: 0,
        contains: null,
        color: '#6b6057',
        borders: null
      }
    ];

    bm.refreshTiles = jest.fn();

    // Call respawnShrines
    const count = bm.respawnShrines(templateDungeon);

    expect(count).toBe(1);
    expect(bm.tiles[0].contains).toEqual({
      type: 'shrine',
      subtype: 'sage',
      key: 'shrine_sage_1'
    });
    expect(bm.tiles[0].color).toBe('#4B0082');
    expect(bm.tiles[0].borders).toEqual({
      top: '1px solid black',
      right: null,
      bottom: null,
      left: '1px solid black'
    });

    // Verify it updated the dungeon/board tiles structures as well
    expect(bm.currentBoard.tiles[0].contains).toEqual({
      type: 'shrine',
      subtype: 'sage',
      key: 'shrine_sage_1'
    });
    expect(bm.currentBoard.tiles[0].borders).toEqual({
      top: '3px solid black',
      left: '3px solid black'
    });

    expect(bm.refreshTiles).toHaveBeenCalled();
  });
});
