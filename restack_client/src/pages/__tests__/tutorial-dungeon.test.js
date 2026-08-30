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
    expect(bm.tiles[85].color).not.toBe('black');

    // Standing at (10,6) [tile 100]
    bm.handleFogOfWar(bm.tiles[100]);
    expect(bm.tiles[85].color).not.toBe('black');

    // Standing at (10,5) [tile 85]
    bm.handleFogOfWar(bm.tiles[85]);
    expect(bm.tiles[99].color).not.toBe('black');
  });

  test('superboard 45x45 viewport calculation clamps top-left correctly', () => {
    const computeViewportOffset = (gx, gy) => {
      const idealMinX = gx - 7;
      const idealMinY = gy - 7;
      return {
        viewMinX: Math.max(0, Math.min(30, idealMinX)),
        viewMinY: Math.max(0, Math.min(30, idealMinY))
      };
    };

    // Center of superboard (22, 22) -> (15, 15)
    expect(computeViewportOffset(22, 22)).toEqual({ viewMinX: 15, viewMinY: 15 });

    // Top-left outer boundary (2, 2) -> clamped to (0, 0)
    expect(computeViewportOffset(2, 2)).toEqual({ viewMinX: 0, viewMinY: 0 });

    // Bottom-right outer boundary (42, 44) -> clamped to (30, 30)
    expect(computeViewportOffset(42, 44)).toEqual({ viewMinX: 30, viewMinY: 30 });
  });

  test('active chemical lantern expands fog vision radius by +1', () => {
    const { BoardManager } = require('../../utils/board-manager');
    const tutorialJson = require('../../assets/tutorial-export.json');
    const bm = new BoardManager();
    bm.setDungeon(tutorialJson);
    bm.setCurrentLevel(tutorialJson.levels[0]);
    bm.setCurrentOrientation('F');
    bm.initializeTilesFromMap(4, 110); // Tile (7, 5) = index 110

    let chemActive = false;
    bm.getCurrentInventory = () => [
      { name: 'chemical lantern', active: chemActive }
    ];

    // Find a tile reachable in exactly 3 steps from tile 110 that is hidden at 2 steps
    const tilesDist2 = bm.getReachableTilesWithinSteps(110, 2);
    const tilesDist3 = bm.getReachableTilesWithinSteps(110, 3);
    const dist3OnlyTileId = Array.from(tilesDist3).find(id => !tilesDist2.has(id));

    expect(dist3OnlyTileId).toBeDefined();

    bm.handleFogOfWar(bm.tiles[110]);
    expect(bm.tiles[dist3OnlyTileId].color).toBe('black'); // Dist 3 hidden without lantern

    // Activate Chemical Lantern
    chemActive = true;
    bm.handleFogOfWar(bm.tiles[110]);
    expect(bm.tiles[dist3OnlyTileId].color).not.toBe('black'); // Dist 3 revealed with lantern!
  });

  test('inventoryManager preserves active item state and chemical resources across re-initialization', () => {
    const { InventoryManager } = require('../../utils/inventory-manager');
    const im = new InventoryManager();
    im.initializeItems({
      items: [
        { name: 'chemical lantern', active: true, _im_key: 'chemical_lantern' }
      ],
      unstable_chemicals: 50,
      stable_chemicals: 50
    });

    expect(im.unstable_chemicals).toBe(50);
    expect(im.stable_chemicals).toBe(50);
    const lantern = im.inventory.find(item => item && (item.name === 'chemical lantern' || item._im_key === 'chemical_lantern'));
    expect(lantern).toBeDefined();
    expect(lantern.active).toBe(true);
  });
});
