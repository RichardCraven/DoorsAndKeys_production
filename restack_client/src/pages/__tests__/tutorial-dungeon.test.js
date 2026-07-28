jest.mock('@coreui/icons', () => ({}));
jest.mock('../../utils/images', () => ({
  getTerrainSetForLevel: () => []
}));

import React from 'react';

describe('Tutorial Dungeon Launch & Sequence Tests', () => {
  test('tutorial-export.json exists and has valid dungeon structure', () => {
    const tutorialJson = require('../../assets/tutorial-export.json');
    expect(tutorialJson).toBeDefined();
    expect(tutorialJson.name).toBe('tutorial');
    expect(Array.isArray(tutorialJson.levels)).toBe(true);
    expect(tutorialJson.levels.length).toBeGreaterThan(0);
    expect(tutorialJson.levels[0].front).toBeDefined();
    expect(Array.isArray(tutorialJson.levels[0].front.miniboards)).toBe(true);
  });

  test('fog of war reachable tiles from (9,6) [idx 99] and (10,5) [idx 85]', () => {
    const { BoardManager } = require('../../utils/board-manager');
    const tutorialJson = require('../../assets/tutorial-export.json');
    const bm = new BoardManager();
    bm.setDungeon(tutorialJson);
    bm.setCurrentLevel(tutorialJson.levels[0]);
    bm.setCurrentOrientation('F');
    bm.initializeTilesFromMap(4, 110);

    // Standing at (9,6) [tile 99]
    bm.handleFogOfWar(bm.tiles[99]);
    expect(bm.tiles[85].color).toBe('black');

    // Standing at (10,6) [tile 100]
    bm.handleFogOfWar(bm.tiles[100]);
    expect(bm.tiles[85].color).toBe('black');

    // Standing at (10,5) [tile 85]
    bm.handleFogOfWar(bm.tiles[85]);
    expect(bm.tiles[99].color).toBe('black');
  });
});
