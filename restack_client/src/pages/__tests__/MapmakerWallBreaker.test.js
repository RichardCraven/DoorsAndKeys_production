jest.mock('../dungonBuilderViews/BoardView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlanesPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlaneView', () => () => null);
jest.mock('../dungonBuilderViews/DungeonView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPalette', () => () => null);

import MapMakerPage from '../MapmakerPage';

describe('MapMakerPage breakPassageWall functionality', () => {
  let mapmakerInstance;

  beforeEach(() => {
    // Instantiate the class with mock props
    const mockProps = {
      mapMaker: {
        initializeTiles: jest.fn(),
        tiles: []
      }
    };
    mapmakerInstance = new MapMakerPage(mockProps);
  });

  test('breaks wall between two passages', () => {
    const tiles = [
      { id: 0, contains: { type: 'passage' }, borders: null }, // from
      { id: 1, contains: { type: 'passage' }, borders: null }  // to
    ];

    const result = mapmakerInstance.breakPassageWall(tiles, 0, 1);

    // Delta is 1 (right/left), so:
    // tile 0 right border should be transparent
    // tile 1 left border should be transparent
    expect(result[0].borders.right).toBe('2px solid transparent');
    expect(result[1].borders.left).toBe('2px solid transparent');
  });

  test('breaks wall between a passage and a void/etching tile (keeps gold border)', () => {
    const tiles = [
      { id: 0, contains: { type: 'passage' }, borders: null }, // from (passage)
      // to (void tile with gold left border representing inscription)
      { id: 1, contains: { type: 'void' }, borders: { left: '3px solid #d4a844' } }
    ];

    const result = mapmakerInstance.breakPassageWall(tiles, 0, 1);

    // Passage (0) right border becomes transparent
    expect(result[0].borders.right).toBe('2px solid transparent');
    // Void/etching (1) left border is preserved as gold and not modified
    expect(result[1].borders.left).toBe('3px solid #d4a844');
  });

  test('breaks wall when dragging from void/etching tile to passage (keeps gold border)', () => {
    const tiles = [
      // from (void tile with gold right border representing inscription)
      { id: 0, contains: { type: 'void' }, borders: { right: '3px solid #d4a844' } },
      { id: 1, contains: { type: 'passage' }, borders: null }  // to (passage)
    ];

    const result = mapmakerInstance.breakPassageWall(tiles, 0, 1);

    // Void/etching (0) right border is preserved as gold
    expect(result[0].borders.right).toBe('3px solid #d4a844');
    // Passage (1) left border becomes transparent
    expect(result[1].borders.left).toBe('2px solid transparent');
  });
});
