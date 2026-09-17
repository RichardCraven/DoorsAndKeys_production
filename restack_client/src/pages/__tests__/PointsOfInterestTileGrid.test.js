jest.mock('@coreui/icons', () => ({}));
jest.mock('@coreui/icons-react', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement('span', null, children)
  };
});
jest.mock('@coreui/react', () => {
  const React = require('react');
  return {
    CButton: ({ children }) => React.createElement('button', null, children),
    CFormSelect: ({ children }) => React.createElement('select', null, children),
    CFormInput: ({ children }) => React.createElement('input', null),
    CModal: ({ children }) => React.createElement('div', null, children),
    CModalHeader: ({ children }) => React.createElement('div', null, children),
    CModalTitle: ({ children }) => React.createElement('div', null, children),
    CModalBody: ({ children }) => React.createElement('div', null, children)
  };
});
jest.mock('../../utils/images', () => ({
  eye_open: 'eye_open.png',
  eye_closed: 'eye_closed.png',
  goblin_thief: 'goblin_thief.png',
  gold_chest: 'gold_chest.png',
  witch: 'witch.png',
  kabuki_demon: 'kabuki_demon.png',
  goblin_warchief: 'goblin_warchief.png'
}));
jest.mock('../../utils/typewriter', () => ({}));
jest.mock('../../utils/narrative-manager', () => ({
  getNextNarrativePayload: jest.fn()
}));
jest.mock('../../utils/combat-manager-redux', () => ({
  CombatManagerRedux: jest.fn()
}));

import React from 'react';
import { render } from '@testing-library/react';
import DungeonPage from '../DungeonPage';

jest.mock('../../utils/session-handler', () => ({
  getMeta: jest.fn(() => ({
    camping: false,
    location: { boardIndex: 0, tileIndex: 0 },
    crew: [{ id: 'hero1', level: 1 }],
    panelConfig: {
      left: ['poi'],
      right: ['stats']
    }
  })),
  storeMeta: jest.fn(),
  getUserId: jest.fn(() => 'user-123')
}));

jest.mock('../../utils/api-handler', () => ({
  loadAllDungeonsRequest: jest.fn(() => Promise.resolve({ data: [] })),
  updateUserRequest: jest.fn(() => Promise.resolve({}))
}));

jest.spyOn(DungeonPage.prototype, 'componentDidMount').mockImplementation(() => {});
jest.spyOn(DungeonPage.prototype, 'UNSAFE_componentWillMount').mockImplementation(() => {});

describe('Points of Interest 2x2 Tile Grid', () => {
  const createMockBoardManager = (poiTiles) => {
    const allTiles = [
      { id: 0, contains: null, image: null, color: '#6b6057' },
      ...poiTiles
    ];

    return {
      establishPendingCallback: jest.fn(),
      establishMessagingCallback: jest.fn(),
      establishRefreshCallback: jest.fn(),
      establishTriggerMonsterBattleCallback: jest.fn(),
      establishSetMonsterCallback: jest.fn(),
      establishGetCurrentInventoryCallback: jest.fn(),
      establishRitualEncounterCallback: jest.fn(),
      establishNarrativeEncounterCallback: jest.fn(),
      establishVendorEncounterCallback: jest.fn(),
      establishShrineEncounterCallback: jest.fn(),
      establishLoreTabletEncounterCallback: jest.fn(),
      establishBoardTransitionCallback: jest.fn(),
      establishLevelChangeCallback: jest.fn(),
      establishUseConsumableFromInventoryCallback: jest.fn(),
      establishAvailableItems: jest.fn(),
      updateDungeon: jest.fn(),
      refreshTiles: jest.fn(),
      getIndexFromCoordinates: jest.fn((coords) => coords[0] * 15 + coords[1]),
      getCoordinatesFromIndex: jest.fn((idx) => [Math.floor(idx / 15), idx % 15]),
      playerTile: {
        location: [0, 0],
        boardIndex: 0
      },
      tiles: allTiles,
      currentBoard: {
        id: 'board-1',
        tiles: allTiles
      },
      dungeon: {
        levels: [{ id: 'level-1', front: { miniboards: [{ id: 'board-1', tiles: allTiles }] } }]
      }
    };
  };

  const defaultProps = {
    crewManager: { crew: [{ id: 'hero1', name: 'Hero' }] },
    user: { id: 'user-123' },
    auth: { user: { id: 'user-123' } }
  };

  test('Renders stacked cards when there are fewer than 3 points of interest (e.g. 2 items)', () => {
    const poiTiles = [
      { id: 1, contains: { type: 'monster', subtype: 'goblin_thief' }, image: 'goblin_thief', color: 'red' },
      { id: 2, contains: { type: 'chest', subtype: 'gold_chest' }, image: 'gold_chest', color: null, terrain: 'stone_floor' }
    ];

    const bm = createMockBoardManager(poiTiles);
    const { container } = render(<DungeonPage {...defaultProps} boardManager={bm} />);

    // Should render the stacked list container (.poi-list)
    const poiList = container.querySelector('.poi-list');
    expect(poiList).not.toBeNull();

    // Should NOT render the 2x2 grid (.poi-tile-grid)
    const poiGrid = container.querySelector('.poi-tile-grid');
    expect(poiGrid).toBeNull();

    // Should render 2 stacked portrait cards (.poi-portrait-card)
    const cards = container.querySelectorAll('.poi-portrait-card');
    expect(cards.length).toBe(2);
  });

  test('Renders 3 points of interest as stacked portrait cards', () => {
    const poiTiles = [
      { id: 1, contains: { type: 'monster', subtype: 'goblin_thief' }, image: 'goblin_thief', color: 'red' },
      { id: 2, contains: { type: 'chest', subtype: 'gold_chest' }, image: 'gold_chest', color: null, terrain: 'stone_floor' },
      { id: 3, contains: { type: 'monster', subtype: 'witch' }, image: 'witch', color: 'red' }
    ];

    const bm = createMockBoardManager(poiTiles);
    const { container } = render(<DungeonPage {...defaultProps} boardManager={bm} />);

    // Should render the stacked list container (.poi-list)
    const poiList = container.querySelector('.poi-list');
    expect(poiList).not.toBeNull();

    // Should render 3 portrait cards (.poi-portrait-card)
    const cards = container.querySelectorAll('.poi-portrait-card');
    expect(cards.length).toBe(3);
  });

  test('Renders 5 points of interest as stacked portrait cards', () => {
    const poiTiles = [
      { id: 1, contains: { type: 'monster', subtype: 'goblin_thief' }, image: 'goblin_thief', color: 'red' },
      { id: 2, contains: { type: 'chest', subtype: 'gold_chest' }, image: 'gold_chest', color: null, terrain: 'stone_floor' },
      { id: 3, contains: { type: 'monster', subtype: 'witch' }, image: 'witch', color: 'red' },
      { id: 4, contains: { type: 'monster', subtype: 'kabuki_demon' }, image: 'kabuki_demon', color: 'red' },
      { id: 5, contains: { type: 'monster', subtype: 'goblin_warchief' }, image: 'goblin_warchief', color: 'red' }
    ];

    const bm = createMockBoardManager(poiTiles);
    const { container } = render(<DungeonPage {...defaultProps} boardManager={bm} />);

    const poiList = container.querySelector('.poi-list');
    expect(poiList).not.toBeNull();

    const cards = container.querySelectorAll('.poi-portrait-card');
    expect(cards.length).toBe(5);

    // Check titles for Codex opening
    expect(cards[0].getAttribute('title')).toContain('Click to open Codex');
    expect(cards[4].getAttribute('title')).toContain('Click to open Codex');
  });
});
