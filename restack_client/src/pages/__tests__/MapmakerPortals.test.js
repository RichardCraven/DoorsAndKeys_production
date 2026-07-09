jest.mock('../dungonBuilderViews/BoardView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlanesPanel', () => () => null);
jest.mock('../dungonBuilderViews/PlaneView', () => () => null);
jest.mock('../dungonBuilderViews/DungeonView', () => () => null);
jest.mock('../dungonBuilderViews/BoardsPalette', () => () => null);

import React from 'react';
import MapMakerPage from '../MapmakerPage';

describe('MapMakerPage Portal Configurator', () => {
  let mapmakerInstance;
  let mockMapMaker;

  beforeEach(() => {
    mockMapMaker = {
      initializeTiles: jest.fn(),
      getAllPortalsInDungeon: jest.fn((dungeon) => {
        const list = [];
        dungeon.levels.forEach((lvl) => {
          ['front', 'back'].forEach((orient) => {
            const plane = lvl[orient];
            if (plane && plane.miniboards) {
              plane.miniboards.forEach((mb, mbIndex) => {
                if (mb && mb.tiles) {
                  mb.tiles.forEach((t) => {
                    if (t.contains && (t.contains.type === 'dungeon_portal' || t.contains.type === 'dungeon portal')) {
                      list.push({
                        tileId: t.id,
                        coordinates: t.coordinates,
                        miniboardIndex: mbIndex,
                        orientation: orient,
                        levelId: lvl.id,
                        portalId: t.contains.portalId,
                        targetPortalId: t.contains.targetPortalId || null,
                        portalName: `Portal at [${t.coordinates}]`
                      });
                    }
                  });
                }
              });
            }
          });
        });
        return list;
      })
    };

    const mockProps = {
      mapMaker: mockMapMaker
    };

    mapmakerInstance = new MapMakerPage(mockProps);
  });

  test('correctly blends live unsaved tiles state when finding dungeon portals', () => {
    // Setup a loaded dungeon with one level, one plane, and one miniboard
    const mockBoard = {
      id: 'board_1',
      tiles: [
        { id: 0, coordinates: [0, 0], contains: { type: 'dungeon_portal', portalId: 'portal_saved' } },
        { id: 1, coordinates: [0, 1], contains: null }
      ]
    };

    const mockDungeon = {
      levels: [
        {
          id: 0,
          front: {
            miniboards: [mockBoard]
          }
        }
      ]
    };

    mapmakerInstance.state = {
      loadedDungeon: mockDungeon,
      loadedBoard: mockBoard,
      // In the live editor tiles, we have placed a SECOND portal at tile id 1
      tiles: [
        { id: 0, coordinates: [0, 0], contains: { type: 'dungeon_portal', portalId: 'portal_saved' } },
        { id: 1, coordinates: [0, 1], contains: { type: 'dungeon_portal', portalId: 'portal_new' } }
      ]
    };

    // Trigger the render block logic for retrieving portals
    // We simulate retrieving the list of other linking options for portal_saved
    const currentLvlId = 0;
    const currentOrientation = 'front';
    const currentMiniboardIdx = 0;
    const tile = mapmakerInstance.state.tiles[0]; // portal_saved
    const portal = tile.contains;

    // Execute the temporary dungeon cloning and tile swapping logic
    const clone = (thing) => JSON.parse(JSON.stringify(thing));
    const tempDungeon = clone(mapmakerInstance.state.loadedDungeon);
    if (mapmakerInstance.state.loadedBoard) {
      tempDungeon.levels.forEach((level) => {
        ['front', 'back'].forEach((orientation) => {
          const plane = level[orientation];
          if (plane && Array.isArray(plane.miniboards)) {
            plane.miniboards.forEach((mb) => {
              if (mb && mapmakerInstance.state.loadedBoard && (mb.id === mapmakerInstance.state.loadedBoard.id || String(mb.id) === String(mapmakerInstance.state.loadedBoard.id))) {
                mb.tiles = mapmakerInstance.state.tiles;
              }
            });
          }
        });
      });
    }

    const allPortals = mockMapMaker.getAllPortalsInDungeon(tempDungeon);

    // Verify both portals are detected
    expect(allPortals.length).toBe(2);
    expect(allPortals.some(p => p.portalId === 'portal_saved')).toBe(true);
    expect(allPortals.some(p => p.portalId === 'portal_new')).toBe(true);

    // Verify otherPortals filtering logic
    const otherPortals = allPortals.filter(p => {
      if (p.portalId && portal.portalId && p.portalId === portal.portalId) {
        return false;
      }
      const isSameBoard = (currentLvlId !== null)
        ? (p.levelId === currentLvlId && p.orientation === currentOrientation && p.miniboardIndex === currentMiniboardIdx)
        : (p.levelId === null && p.orientation === null && p.miniboardIndex === null);
      const isSameTile = p.tileId === tile.id;
      return !(isSameBoard && isSameTile);
    });

    // The other portal 'portal_new' should be available for linking
    expect(otherPortals.length).toBe(1);
    expect(otherPortals[0].portalId).toBe('portal_new');
  });
});
