jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({
  CButton: 'CButton',
  CFormSelect: 'CFormSelect',
  CFormInput: 'CFormInput',
  CModal: 'CModal',
  CModalHeader: 'CModalHeader',
  CModalTitle: 'CModalTitle',
  CModalBody: 'CModalBody',
  CModalFooter: 'CModalFooter'
}));

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tile, {
  isTerritoryLanternItem,
  checkHasTerritoryLantern,
  isPlayerAdjacentOrInsideContiguousTerritory,
  getTileTerritoryAffiliationHelper
} from '../../components/tile';

describe('Dungeon Territory Perimeter Lantern & Proximity Restriction', () => {
  describe('isTerritoryLanternItem helper', () => {
    test('identifies territory / territorial lantern items correctly', () => {
      expect(isTerritoryLanternItem({ name: 'territory lantern' })).toBe(true);
      expect(isTerritoryLanternItem({ name: 'territorial lantern' })).toBe(true);
      expect(isTerritoryLanternItem({ name: 'Territorial Lantern' })).toBe(true);
      expect(isTerritoryLanternItem({ _im_key: 'territorial_lantern' })).toBe(true);
      expect(isTerritoryLanternItem({ key: 'territory_lantern' })).toBe(true);
      expect(isTerritoryLanternItem({ type: 'territorial_lantern' })).toBe(true);
    });

    test('rejects generic lanterns and unrelated items', () => {
      expect(isTerritoryLanternItem({ name: 'lantern' })).toBe(false);
      expect(isTerritoryLanternItem({ name: 'chemical lantern' })).toBe(false);
      expect(isTerritoryLanternItem({ name: 'mining lantern' })).toBe(false);
      expect(isTerritoryLanternItem({ name: 'torch' })).toBe(false);
      expect(isTerritoryLanternItem(null)).toBe(false);
      expect(isTerritoryLanternItem(undefined)).toBe(false);
      expect(isTerritoryLanternItem({})).toBe(false);
    });
  });

  describe('isPlayerAdjacentOrInsideContiguousTerritory helper', () => {
    // 15x15 board (225 tiles)
    // Territory A: tiles 31, 32, 46, 47 (rows 2-3, cols 1-2) with affiliation 'shadow_clan'
    // Territory B: tiles 208, 209, 223, 224 (rows 13-14, cols 13-14) with affiliation 'cave_clan'
    const createTestBoard = () => {
      const tiles = [];
      for (let i = 0; i < 225; i++) {
        tiles.push({ id: i, type: 'board-tile', territory: null });
      }
      [31, 32, 46, 47].forEach(idx => {
        tiles[idx].territory = 'shadow_clan';
      });
      [208, 209, 223, 224].forEach(idx => {
        tiles[idx].territory = 'cave_clan';
      });
      return tiles;
    };

    test('returns true when player is inside the territory', () => {
      const board = createTestBoard();
      // Player is at tile 31 (inside Territory A)
      const isAdjOrInside = isPlayerAdjacentOrInsideContiguousTerritory(32, 'shadow_clan', board, { playerIdx: 31 });
      expect(isAdjOrInside).toBe(true);
    });

    test('returns true when player is adjacent (Chebyshev distance 1) to the territory', () => {
      const board = createTestBoard();
      // Tile 16 is row 1, col 1 (immediately above tile 31)
      const isAdj = isPlayerAdjacentOrInsideContiguousTerritory(31, 'shadow_clan', board, { playerIdx: 16 });
      expect(isAdj).toBe(true);

      // And for tile 47 (which is contiguous with 31), checking contiguous connectivity:
      const isContigAdj = isPlayerAdjacentOrInsideContiguousTerritory(47, 'shadow_clan', board, { playerIdx: 16 });
      expect(isContigAdj).toBe(true);
    });

    test('returns false when player is adjacent to Territory A but checking distant Territory B', () => {
      const board = createTestBoard();
      // Player is adjacent to Territory A (at tile 16)
      // Checking Territory B (tile 208)
      const isAdjB = isPlayerAdjacentOrInsideContiguousTerritory(208, 'cave_clan', board, { playerIdx: 16 });
      expect(isAdjB).toBe(false);
    });

    test('returns false when player is far away from all territories', () => {
      const board = createTestBoard();
      // Player is at center of map: tile 112 (row 7, col 7)
      const isAdjA = isPlayerAdjacentOrInsideContiguousTerritory(31, 'shadow_clan', board, { playerIdx: 112 });
      const isAdjB = isPlayerAdjacentOrInsideContiguousTerritory(208, 'cave_clan', board, { playerIdx: 112 });
      expect(isAdjA).toBe(false);
      expect(isAdjB).toBe(false);
    });
  });

  describe('Tile component territory perimeter rendering', () => {
    const createSurroundingBoard = (targetIdx, terrName) => {
      const tiles = [];
      for (let i = 0; i < 225; i++) {
        tiles.push({ id: i, type: 'board-tile', territory: null });
      }
      tiles[targetIdx].territory = terrName;
      return tiles;
    };

    test('dungeon tile: does NOT render boundary when showTerritoryBoundary is false', () => {
      const board = createSurroundingBoard(50, 'shadow_clan');
      const { container } = render(
        <Tile
          id={50}
          index={50}
          type="board-tile"
          territory="shadow_clan"
          boardTiles={board}
          inSuperboard={false}
          showTerritoryBoundary={false}
          hasTerritoryLantern={false}
        />
      );

      // Should not render glowing red boundary line
      expect(container.innerHTML).not.toContain('0 0 6px');
      expect(container.innerHTML).not.toContain('#ef4444');
    });

    test('dungeon tile: does NOT render boundary when player has no lantern even if adjacent', () => {
      const board = createSurroundingBoard(50, 'shadow_clan');
      const { container } = render(
        <Tile
          id={50}
          index={50}
          type="board-tile"
          territory="shadow_clan"
          boardTiles={board}
          inSuperboard={false}
          showTerritoryBoundary={false}
          hasTerritoryLantern={false}
          playerIdx={49}
        />
      );

      expect(container.innerHTML).not.toContain('0 0 6px');
      expect(container.innerHTML).not.toContain('#ef4444');
    });

    test('dungeon tile: DOES render boundary when player has territory lantern AND is adjacent/inside', () => {
      const board = createSurroundingBoard(50, 'shadow_clan');
      const { container } = render(
        <Tile
          id={50}
          index={50}
          type="board-tile"
          territory="shadow_clan"
          boardTiles={board}
          inSuperboard={false}
          showTerritoryBoundary={true}
          hasTerritoryLantern={true}
          playerIdx={49}
        />
      );

      // Boundary line should render with glowing red outline
      expect(container.innerHTML).toContain('0 0 6px');
      expect(container.innerHTML).toContain('#ef4444');
    });

    test('dungeon tile fallback: evaluates proximity and lantern when showTerritoryBoundary is not passed', () => {
      const board = createSurroundingBoard(50, 'shadow_clan');

      // 1. With lantern and adjacent -> renders
      const { container: c1 } = render(
        <Tile
          id={50}
          index={50}
          type="board-tile"
          territory="shadow_clan"
          boardTiles={board}
          inSuperboard={false}
          hasTerritoryLantern={true}
          playerIdx={49}
        />
      );
      expect(c1.innerHTML).toContain('0 0 6px');

      // 2. With lantern but distant -> does NOT render
      const { container: c2 } = render(
        <Tile
          id={50}
          index={50}
          type="board-tile"
          territory="shadow_clan"
          boardTiles={board}
          inSuperboard={false}
          hasTerritoryLantern={true}
          playerIdx={0}
        />
      );
      expect(c2.innerHTML).not.toContain('0 0 6px');

      // 3. Without lantern even if adjacent -> does NOT render
      const { container: c3 } = render(
        <Tile
          id={50}
          index={50}
          type="board-tile"
          territory="shadow_clan"
          boardTiles={board}
          inSuperboard={false}
          hasTerritoryLantern={false}
          playerIdx={49}
        />
      );
      expect(c3.innerHTML).not.toContain('0 0 6px');
    });

    test('Pocket Dimension superboard tile: domain boundaries render without dungeon lantern restriction', () => {
      const board = createSurroundingBoard(50, 'friendly');
      const { container } = render(
        <Tile
          id={50}
          index={50}
          type="board-tile"
          territory="friendly"
          boardTiles={board}
          inSuperboard={true}
        />
      );

      // In superboard, domain boundary renders with blue outline (#3b82f6)
      expect(container.innerHTML).toContain('0 0 6px');
      expect(container.innerHTML).toContain('#3b82f6');
    });

    test('Builder / Mapmaker mode: territory boundaries render for editing regardless of player or lantern', () => {
      const board = createSurroundingBoard(50, 'shadow_clan');
      const { container } = render(
        <Tile
          id={50}
          index={50}
          type="board-tile"
          isBuilder={true}
          territory="shadow_clan"
          boardTiles={board}
          inSuperboard={false}
          hasTerritoryLantern={false}
        />
      );

      expect(container.innerHTML).toContain('0 0 6px');
      expect(container.innerHTML).toContain('#ef4444');
    });
  });
});
