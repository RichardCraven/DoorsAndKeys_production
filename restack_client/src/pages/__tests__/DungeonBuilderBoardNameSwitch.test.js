jest.mock('../dungonBuilderViews/BoardView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlanesPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlaneView', () => () => null);
jest.mock('../dungonBuilderViews/DungeonView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPalette', () => () => null);

import React from 'react';
import MapMakerPage from '../MapmakerPage';
import { getMeta, storeMeta, setEditorPreference } from '../../utils/session-handler';
import { loadDungeonRequest, loadAllBoardsRequest, updateUserRequest } from '../../utils/api-handler';

jest.mock('../../utils/session-handler', () => ({
  getMeta: jest.fn(),
  storeMeta: jest.fn(),
  setEditorPreference: jest.fn()
}));

jest.mock('../../utils/api-handler', () => ({
  loadDungeonRequest: jest.fn(),
  loadAllBoardsRequest: jest.fn(),
  loadAllPlanesRequest: jest.fn(() => Promise.resolve({ data: [] })),
  loadAllDungeonsRequest: jest.fn(() => Promise.resolve({ data: [] })),
  updateUserRequest: jest.fn(() => Promise.resolve({}))
}));

describe('Dungeon Builder Board Name Switch and Ownership', () => {
  let mapmakerInstance;
  let mockMeta;

  const dungeon1 = {
    id: 'dungeon-1',
    _id: 'dungeon-1',
    name: 'DungeonOne',
    levels: [
      {
        id: 0,
        front: {
          id: 'p-1',
          name: 'DungeonOne_0_F',
          miniboards: [
            { id: 'b-1', name: 'DungeonOne_0_front_0', tiles: [] }
          ]
        },
        back: {
          id: 'p-2',
          name: 'DungeonOne_0_B',
          miniboards: []
        }
      }
    ],
    superboards: {
      light: { miniboards: [{ id: 'sb-light-1', name: 'DungeonOne_sb_light', tiles: [] }] },
      dark: { miniboards: [] }
    }
  };

  const dungeon2 = {
    id: 'dungeon-2',
    _id: 'dungeon-2',
    name: 'DungeonTwo',
    levels: [
      {
        id: 0,
        front: {
          id: 'p-3',
          name: 'DungeonTwo_0_F',
          miniboards: [
            { id: 'b-2', name: 'DungeonTwo_0_front_0', tiles: [] }
          ]
        },
        back: {
          id: 'p-4',
          name: 'DungeonTwo_0_B',
          miniboards: []
        }
      }
    ],
    superboards: {
      light: { miniboards: [] },
      dark: { miniboards: [] }
    }
  };

  const board1 = {
    id: 'b-1',
    name: 'DungeonOne_0_front_0',
    tiles: [{ id: 0, image: 'spawn_point', contains: { type: 'spawn', subtype: 'spawn_point' } }]
  };

  const board2 = {
    id: 'b-2',
    name: 'DungeonTwo_0_front_0',
    tiles: [{ id: 0, image: 'wall', contains: { type: 'wall', subtype: null } }]
  };

  const plane1 = {
    id: 'p-1',
    name: 'DungeonOne_0_F',
    miniboards: [board1]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMeta = {
      preferences: {
        editor: {}
      }
    };
    getMeta.mockReturnValue(mockMeta);

    const mockProps = {
      mapMaker: {
        initializeTiles: jest.fn(),
        formatDungeon: jest.fn((d) => d),
        markPassages: jest.fn(() => null),
        getMapConfiguration: jest.fn(() => [[], [], [], []]),
        filterMapAdjacency: jest.fn(() => ({ top: [], bottom: [], left: [], right: [], bot: [] })),
        tiles: Array.from({ length: 225 }, (_, i) => ({
          type: 'board-tile',
          id: i,
          coordinates: [i % 15, Math.floor(i / 15)],
          contains: { type: 'empty_space', subtype: null },
          color: null,
          image: null
        }))
      }
    };

    mapmakerInstance = new MapMakerPage(mockProps);
    mapmakerInstance.state = {
      ...mapmakerInstance.state,
      loadedDungeon: dungeon1,
      loadedBoard: null,
      loadedPlane: null,
      selectedView: 'dungeon',
      selectedThingTitle: 'Dungeon: DungeonOne',
      dungeons: [dungeon1, dungeon2],
      boards: [board1, board2],
      planes: [plane1],
      tiles: mapmakerInstance.createBlankBoardTiles()
    };

    mapmakerInstance.setState = jest.fn((fn, cb) => {
      const updated = typeof fn === 'function' ? fn(mapmakerInstance.state) : fn;
      mapmakerInstance.state = {
        ...mapmakerInstance.state,
        ...updated
      };
      if (typeof cb === 'function') cb();
    });

    mapmakerInstance.setLoadedDungeonDropdownValue = jest.fn();
    mapmakerInstance.addDungeonPlanesAndBoardsToState = jest.fn();
  });

  describe('boardBelongsToDungeon and planeBelongsToDungeon', () => {
    test('correctly identifies if a board belongs to a dungeon', () => {
      expect(mapmakerInstance.boardBelongsToDungeon(board1, dungeon1)).toBe(true);
      expect(mapmakerInstance.boardBelongsToDungeon(board1, dungeon2)).toBe(false);
      expect(mapmakerInstance.boardBelongsToDungeon(board2, dungeon2)).toBe(true);
      expect(mapmakerInstance.boardBelongsToDungeon(board2, dungeon1)).toBe(false);
      expect(mapmakerInstance.boardBelongsToDungeon(null, dungeon1)).toBe(false);
      expect(mapmakerInstance.boardBelongsToDungeon(board1, null)).toBe(false);
    });

    test('identifies superboard miniboards as belonging to the dungeon', () => {
      const superboardMiniboard = { id: 'sb-light-1', name: 'DungeonOne_sb_light' };
      expect(mapmakerInstance.boardBelongsToDungeon(superboardMiniboard, dungeon1)).toBe(true);
      expect(mapmakerInstance.boardBelongsToDungeon(superboardMiniboard, dungeon2)).toBe(false);
    });

    test('correctly identifies if a plane belongs to a dungeon', () => {
      expect(mapmakerInstance.planeBelongsToDungeon(plane1, dungeon1)).toBe(true);
      expect(mapmakerInstance.planeBelongsToDungeon(plane1, dungeon2)).toBe(false);
      expect(mapmakerInstance.planeBelongsToDungeon(null, dungeon1)).toBe(false);
      expect(mapmakerInstance.planeBelongsToDungeon(plane1, null)).toBe(false);
    });
  });

  describe('setViewState foreign entity cleanup', () => {
    test('retains board name if loaded board belongs to loaded dungeon', () => {
      mapmakerInstance.state.loadedDungeon = dungeon1;
      mapmakerInstance.state.loadedBoard = board1;

      mapmakerInstance.setViewState('board');

      expect(mapmakerInstance.state.selectedThingTitle).toBe('Board: DungeonOne_0_front_0');
      expect(mapmakerInstance.state.loadedBoard).toEqual(board1);
    });

    test('clears board name, board state, and tiles if loaded board belongs to a different dungeon', () => {
      mapmakerInstance.state.loadedDungeon = dungeon2;
      mapmakerInstance.state.loadedBoard = board1; // belongs to dungeon1

      mapmakerInstance.setViewState('board');

      expect(mapmakerInstance.state.selectedThingTitle).toBe('');
      expect(mapmakerInstance.state.loadedBoard).toBeNull();
      expect(setEditorPreference).toHaveBeenCalledWith('loadedBoardId', null);
      // Blank tiles should have 225 tiles of empty_space
      expect(mapmakerInstance.state.tiles.length).toBe(225);
      expect(mapmakerInstance.state.tiles[0].contains.type).toBe('empty_space');
    });

    test('clears plane name if loaded plane belongs to a different dungeon', () => {
      mapmakerInstance.state.loadedDungeon = dungeon2;
      mapmakerInstance.state.loadedPlane = plane1; // belongs to dungeon1

      mapmakerInstance.setViewState('plane');

      expect(mapmakerInstance.state.selectedThingTitle).toBe('');
      expect(mapmakerInstance.state.loadedPlane).toBeNull();
      expect(setEditorPreference).toHaveBeenCalledWith('loadedPlaneId', null);
    });
  });

  describe('Dungeon switching and Board View transition', () => {
    test('does not show the board name from the other dungeon when switching dungeons and returning to Board View', async () => {
      // 1. User starts in Board View with board1 from Dungeon 1 selected
      mapmakerInstance.state.selectedView = 'board';
      mapmakerInstance.state.loadedDungeon = dungeon1;
      mapmakerInstance.state.loadedBoard = board1;
      mapmakerInstance.state.selectedThingTitle = `Board: ${board1.name}`;

      // 2. User switches to Dungeon View
      mapmakerInstance.setViewState('dungeon');
      expect(mapmakerInstance.state.selectedThingTitle).toBe('Dungeon: DungeonOne');

      // 3. User selects Dungeon 2
      loadDungeonRequest.mockResolvedValueOnce({
        data: {
          _id: dungeon2.id,
          content: JSON.stringify(dungeon2)
        }
      });
      loadAllBoardsRequest.mockResolvedValueOnce({
        data: [
          { _id: board1.id, content: JSON.stringify(board1) },
          { _id: board2.id, content: JSON.stringify(board2) }
        ]
      });

      await mapmakerInstance.loadDungeon(dungeon2.id);

      expect(mapmakerInstance.state.loadedDungeon.name).toBe('DungeonTwo');
      expect(mapmakerInstance.state.selectedThingTitle).toBe('Dungeon: DungeonTwo');
      // Foreign board must have been unloaded
      expect(mapmakerInstance.state.loadedBoard).toBeNull();

      // 4. User goes back to Board View
      mapmakerInstance.setViewState('board');

      // 5. Must NOT see board1's name from Dungeon 1
      expect(mapmakerInstance.state.selectedThingTitle).toBe('');
      expect(mapmakerInstance.state.loadedBoard).toBeNull();
    });

    test('clears foreign board title immediately when changing dungeon while in Board View', async () => {
      // User is directly in Board View
      mapmakerInstance.state.selectedView = 'board';
      mapmakerInstance.state.loadedDungeon = dungeon1;
      mapmakerInstance.state.loadedBoard = board1;
      mapmakerInstance.state.selectedThingTitle = `Board: ${board1.name}`;

      // Change dungeon to Dungeon 2
      loadDungeonRequest.mockResolvedValueOnce({
        data: {
          _id: dungeon2.id,
          content: JSON.stringify(dungeon2)
        }
      });
      loadAllBoardsRequest.mockResolvedValueOnce({ data: [] });

      await mapmakerInstance.loadDungeon(dungeon2.id);

      expect(mapmakerInstance.state.loadedDungeon.name).toBe('DungeonTwo');
      expect(mapmakerInstance.state.selectedThingTitle).toBe('');
      expect(mapmakerInstance.state.loadedBoard).toBeNull();
      expect(setEditorPreference).toHaveBeenCalledWith('loadedBoardId', null);
    });

    test('clearing dungeon dropdown to Dungeon Selector unloads board and clears title in Board View', () => {
      mapmakerInstance.state.selectedView = 'board';
      mapmakerInstance.state.loadedDungeon = dungeon1;
      mapmakerInstance.state.loadedBoard = board1;
      mapmakerInstance.state.selectedThingTitle = `Board: ${board1.name}`;

      // User selects "Dungeon Selector" (empty)
      mapmakerInstance.dungeonSelectOnChange({ target: { value: 'Dungeon Selector' } });

      expect(mapmakerInstance.state.loadedDungeon).toBeNull();
      expect(mapmakerInstance.state.loadedBoard).toBeNull();
      expect(mapmakerInstance.state.selectedThingTitle).toBe('');
      expect(setEditorPreference).toHaveBeenCalledWith('loadedBoardId', null);
      expect(setEditorPreference).toHaveBeenCalledWith('loadedPlaneId', null);
    });

    test('selecting unpersisted dungeon resets foreign board and clears title in Board View', () => {
      mapmakerInstance.state.selectedView = 'board';
      mapmakerInstance.state.loadedDungeon = dungeon1;
      mapmakerInstance.state.loadedBoard = board1;
      mapmakerInstance.state.selectedThingTitle = `Board: ${board1.name}`;

      const unpersistedDungeon = {
        name: 'VirtualDungeon',
        levels: []
      };
      mapmakerInstance.state.dungeons.push(unpersistedDungeon);

      mapmakerInstance.dungeonSelectOnChange({ target: { value: 'VirtualDungeon' } });

      expect(mapmakerInstance.state.loadedDungeon.name).toBe('VirtualDungeon');
      expect(mapmakerInstance.state.loadedBoard).toBeNull();
      expect(mapmakerInstance.state.selectedThingTitle).toBe('');
    });
  });
});
