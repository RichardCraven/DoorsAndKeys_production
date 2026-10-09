jest.mock('@coreui/icons', () => ({
  cilSave: 'cilSave',
  cilPencil: 'cilPencil',
  cilTrash: 'cilTrash',
  cilPlus: 'cilPlus'
}));
jest.mock('@coreui/icons-react', () => () => <span data-testid="c-icon" />);
jest.mock('@coreui/react', () => ({
  CSpinner: () => <span data-testid="c-spinner" />
}));

import React from 'react';
import { render } from '@testing-library/react';
import BoardView from '../dungonBuilderViews/BoardView';

describe('BoardView Patrol Path & Visual Representation', () => {
  const createMockTiles = () => {
    const tiles = [];
    for (let i = 0; i < 225; i++) {
      tiles.push({
        id: i,
        type: 'board-tile',
        contains: { type: 'empty_space', subtype: null },
        color: null,
        image: null
      });
    }
    return tiles;
  };

  test('calculateArcPath computes valid quadratic Bezier curves for horizontal and vertical distances', () => {
    const boardView = new BoardView({});

    // Zero distance returns empty string
    expect(boardView.calculateArcPath(100, 100, 100, 100)).toBe('');

    // Horizontal path (startX: 100, targetX: 300)
    const horizPath = boardView.calculateArcPath(100, 100, 300, 100);
    expect(horizPath).toMatch(/^M 100 100 Q \d+(\.\d+)? \d+(\.\d+)? 300 100$/);

    // Vertical path
    const vertPath = boardView.calculateArcPath(100, 300, 100, 100);
    expect(vertPath).toMatch(/^M 100 300 Q \d+(\.\d+)? \d+(\.\d+)? 100 100$/);
  });

  test('applies patrol-placement-cursor class and renders live arc and target reticle when in placement mode', () => {
    const tiles = createMockTiles();
    tiles[15] = {
      id: 15,
      type: 'board-tile',
      contains: { type: 'monster', subtype: 'goblin', behavior: 'patrol' }
    };

    const mockProps = {
      tileSize: 40,
      boardSize: 600,
      tiles: tiles,
      patrolPlacement: { originTileId: 15, superboardKey: null },
      hoveredTileIdx: 45, // tile 45: col 0, row 3
      setHover: jest.fn(),
      handleClick: jest.fn(),
      handleHover: jest.fn(),
      handleContextMenu: jest.fn()
    };

    const { container } = render(<BoardView {...mockProps} />);

    // Cursor class applied to board
    const boardDiv = container.querySelector('.board.map-board');
    expect(boardDiv).toHaveClass('patrol-placement-cursor');

    // SVG Overlay exists
    const svgOverlay = container.querySelector('svg.patrol-route-overlay');
    expect(svgOverlay).toBeInTheDocument();

    // Live patrol group is present with live arc and reticle
    const liveGroup = container.querySelector('.patrol-route-group.live');
    expect(liveGroup).toBeInTheDocument();

    const liveArc = container.querySelector('.patrol-arc-line');
    expect(liveArc).toBeInTheDocument();

    const reticle = container.querySelector('.patrol-target-reticle');
    expect(reticle).toBeInTheDocument();

    // Destination text is rendered
    expect(container.textContent).toContain('PATROL DESTINATION');
  });

  test('renders committed patrol route, origin indicator, round-trip badge, and destination waypoint', () => {
    const tiles = createMockTiles();
    tiles[10] = {
      id: 10,
      type: 'board-tile',
      behavior: 'patrol',
      patrolTarget: { tileId: 40, col: 10, row: 2, coordinates: [10, 2] },
      contains: {
        type: 'monster',
        subtype: 'goblin',
        behavior: 'patrol',
        patrolTarget: { tileId: 40, col: 10, row: 2, coordinates: [10, 2] }
      }
    };

    const mockProps = {
      tileSize: 40,
      boardSize: 600,
      tiles: tiles,
      patrolPlacement: null,
      hoveredTileIdx: null,
      setHover: jest.fn(),
      handleClick: jest.fn(),
      handleHover: jest.fn(),
      handleContextMenu: jest.fn()
    };

    const { container } = render(<BoardView {...mockProps} />);

    // Board does not have placement cursor when not in placement mode
    const boardDiv = container.querySelector('.board.map-board');
    expect(boardDiv).not.toHaveClass('patrol-placement-cursor');

    // Committed route group is rendered
    const committedGroup = container.querySelector('.patrol-route-group.committed');
    expect(committedGroup).toBeInTheDocument();

    const committedArc = container.querySelector('.patrol-arc-line-committed');
    expect(committedArc).toBeInTheDocument();

    // Origin and destination text labels
    expect(container.textContent).toContain('ORIGIN');
    expect(container.textContent).toContain('PATROL TARGET');
    expect(container.textContent).toContain('⇄');
  });
});
