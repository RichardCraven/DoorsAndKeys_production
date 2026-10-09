jest.mock('../dungonBuilderViews/BoardView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlanesPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlaneView', () => () => null);
jest.mock('../dungonBuilderViews/DungeonView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPalette', () => () => null);

import React from 'react';
import MapMakerPage from '../MapmakerPage';
import { getMeta, storeMeta, setEditorPreference } from '../../utils/session-handler';
import { deleteDungeonRequest, loadAllDungeonsRequest, updateUserRequest } from '../../utils/api-handler';

jest.mock('../../utils/session-handler', () => ({
  getMeta: jest.fn(),
  storeMeta: jest.fn(),
  setEditorPreference: jest.fn()
}));

jest.mock('../../utils/api-handler', () => ({
  deleteDungeonRequest: jest.fn(() => Promise.resolve({ status: 200, data: { msg: 'deleted' } })),
  loadAllDungeonsRequest: jest.fn(() => Promise.resolve({ data: [] })),
  updateUserRequest: jest.fn(() => Promise.resolve({})),
  loadAllBoardsRequest: jest.fn(() => Promise.resolve({ data: [] })),
  loadAllPlanesRequest: jest.fn(() => Promise.resolve({ data: [] }))
}));

describe('DungeonBuilder delete dungeon prompt and dropdown update', () => {
  let mapmakerInstance;
  let confirmSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    getMeta.mockReturnValue({
      preferences: {
        editor: {}
      }
    });

    confirmSpy = jest.spyOn(window, 'confirm');

    const mockProps = {
      mapMaker: {
        initializeTiles: jest.fn(),
        formatDungeon: jest.fn((d) => d),
        tiles: []
      }
    };

    mapmakerInstance = new MapMakerPage(mockProps);
    const mockRef = { current: { value: 'Catacombs' } };
    mapmakerInstance.state = {
      loadedDungeon: {
        id: 'dungeon-123',
        name: 'Catacombs'
      },
      dungeons: [
        { id: 'dungeon-123', name: 'Catacombs' },
        { id: 'dungeon-456', name: 'Labyrinth' }
      ],
      dungeonSelectVal: mockRef,
      selectedView: 'dungeon'
    };

    mapmakerInstance.setState = jest.fn((fn, cb) => {
      const updated = typeof fn === 'function' ? fn(mapmakerInstance.state) : fn;
      mapmakerInstance.state = {
        ...mapmakerInstance.state,
        ...updated
      };
      if (typeof cb === 'function') cb();
    });

    mapmakerInstance.flashLeftReadout = jest.fn();
    mapmakerInstance.loadAllDungeons = jest.fn(() => Promise.resolve());
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  test('opens styled confirmation modal when deleteDungeon() is called and does not delete when modal is closed', async () => {
    await mapmakerInstance.deleteDungeon();

    expect(mapmakerInstance.state.showModal).toBe(true);
    expect(mapmakerInstance.state.modalType).toBe('confirm delete dungeon');

    // Close modal (cancel)
    mapmakerInstance.closeModal();
    expect(mapmakerInstance.state.showModal).toBe(false);

    // Should not call delete API or update state
    expect(deleteDungeonRequest).not.toHaveBeenCalled();
    expect(mapmakerInstance.state.loadedDungeon).not.toBeNull();
    expect(mapmakerInstance.state.dungeons.length).toBe(2);
  });

  test('calls deleteDungeonRequest with ID, removes dungeon from state and resets dropdown when confirmed', async () => {
    await mapmakerInstance.deleteDungeon();
    expect(mapmakerInstance.state.showModal).toBe(true);

    await mapmakerInstance.executeDeleteDungeon();

    expect(deleteDungeonRequest).toHaveBeenCalledWith('dungeon-123');

    // loadedDungeon should be cleared
    expect(mapmakerInstance.state.loadedDungeon).toBeNull();

    // Deleted dungeon should be removed from dungeons list
    expect(mapmakerInstance.state.dungeons).toEqual([
      { id: 'dungeon-456', name: 'Labyrinth' }
    ]);

    // Dropdown ref should be reset to 'Dungeon Selector'
    expect(mapmakerInstance.state.dungeonSelectVal.current.value).toBe('Dungeon Selector');

    // Should call loadAllDungeons and clear editor preference
    expect(setEditorPreference).toHaveBeenCalledWith('loadedDungeon', null);
    expect(mapmakerInstance.loadAllDungeons).toHaveBeenCalled();
  });

  test('falls back to finding dungeon ID from dungeons array by name if id missing on loadedDungeon', async () => {
    mapmakerInstance.state.loadedDungeon = {
      name: 'Catacombs'
      // id is omitted
    };

    await mapmakerInstance.deleteDungeon();
    await mapmakerInstance.executeDeleteDungeon();

    expect(deleteDungeonRequest).toHaveBeenCalledWith('dungeon-123');
    expect(mapmakerInstance.state.loadedDungeon).toBeNull();
    expect(mapmakerInstance.state.dungeons.some(d => d.name === 'Catacombs')).toBe(false);
  });
});
