jest.mock('../dungonBuilderViews/BoardView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlanesPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlaneView', () => () => null);
jest.mock('../dungonBuilderViews/DungeonView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPalette', () => () => null);

import React from 'react';
import MapMakerPage from '../MapmakerPage';
import { getMeta, storeMeta, setEditorPreference } from '../../utils/session-handler';
import { loadAllPlanesRequest, updateUserRequest } from '../../utils/api-handler';

jest.mock('../../utils/session-handler', () => ({
  getMeta: jest.fn(),
  storeMeta: jest.fn(),
  setEditorPreference: jest.fn()
}));

jest.mock('../../utils/api-handler', () => ({
  loadAllPlanesRequest: jest.fn(),
  updateUserRequest: jest.fn(() => Promise.resolve({}))
}));

describe('MapMakerPage folder state persistence', () => {
  let mapmakerInstance;
  let mockMeta;

  beforeEach(() => {
    mockMeta = {
      preferences: {
        editor: {
          planesFoldersExpanded: {
            'dream': true,
            'dream_0': false
          }
        }
      }
    };
    getMeta.mockReturnValue(mockMeta);

    const mockProps = {
      mapMaker: {
        initializeTiles: jest.fn(),
        tiles: []
      }
    };
    mapmakerInstance = new MapMakerPage(mockProps);
    mapmakerInstance.state = {
      planesFoldersExpanded: {
        'dream': false,
        'dream_0': false
      }
    };
    mapmakerInstance.setState = jest.fn((fn, cb) => {
      const updated = typeof fn === 'function' ? fn() : fn;
      mapmakerInstance.state = {
        ...mapmakerInstance.state,
        ...updated
      };
      if (typeof cb === 'function') cb();
    });
  });

  test('expandCollapsePlaneFolders updates state and persists preference', () => {
    mapmakerInstance.expandCollapsePlaneFolders('dream');

    // State should be toggled
    expect(mapmakerInstance.state.planesFoldersExpanded['dream']).toBe(true);

    // Should call setEditorPreference and storeMeta
    expect(setEditorPreference).toHaveBeenCalledWith('planesFoldersExpanded', {
      'dream': true,
      'dream_0': false
    });
    expect(storeMeta).toHaveBeenCalled();
  });

  test('loadAllPlanes restores plane folder expansion states from meta', async () => {
    const planesData = {
      data: [
        {
          _id: 'plane-1',
          content: JSON.stringify({
            id: 'plane-1',
            name: 'dream_0_front',
            miniboards: []
          })
        }
      ]
    };
    loadAllPlanesRequest.mockResolvedValue(planesData);

    await mapmakerInstance.loadAllPlanes();

    // Check that state.planesFoldersExpanded was populated and merged with meta
    expect(mapmakerInstance.state.planesFoldersExpanded['dream']).toBe(true);
    expect(mapmakerInstance.state.planesFoldersExpanded['dream_0']).toBeDefined();
  });
});
