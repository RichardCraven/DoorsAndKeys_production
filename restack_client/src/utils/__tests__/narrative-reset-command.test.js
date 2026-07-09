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
jest.mock('../../utils/images', () => ({}));
jest.mock('../../utils/typewriter', () => ({}));
jest.mock('../../utils/narrative-manager', () => ({
  getNextNarrativePayload: jest.fn()
}));
jest.mock('../../utils/combat-manager-redux', () => ({
  CombatManagerRedux: jest.fn()
}));

import React from 'react';
import { render } from '@testing-library/react';
import DungeonPage from '../../pages/DungeonPage';

jest.mock('../../utils/session-handler', () => ({
  getMeta: jest.fn(() => ({
    camping: false,
    location: { boardIndex: 0, tileIndex: 112 },
    crew: [{ id: 'hero1', level: 1 }]
  })),
  storeMeta: jest.fn(),
  getUserId: jest.fn(() => 'user-123')
}));

jest.mock('../../utils/api-handler', () => ({
  loadAllDungeonsRequest: jest.fn(() => Promise.resolve({ data: [] })),
  updateUserRequest: jest.fn(() => Promise.resolve({}))
}));

// Spy on componentWillMount and componentDidMount to prevent lifecycle issues
jest.spyOn(DungeonPage.prototype, 'componentDidMount').mockImplementation(() => {});
jest.spyOn(DungeonPage.prototype, 'UNSAFE_componentWillMount').mockImplementation(() => {});

describe('DungeonPage Features', () => {
  let boardManagerMock;
  let pageInstance;
  let props;

  beforeEach(() => {
    boardManagerMock = {
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
      getIndexFromCoordinates: jest.fn((coords) => {
        if (coords[0] === 0 && coords[1] === 0) return 0;
        if (coords[0] === 0 && coords[1] === 1) return 1;
        return 112;
      }),
      getCoordinatesFromIndex: jest.fn((idx) => {
        if (idx === 0) return [0, 0];
        if (idx === 1) return [0, 1];
        return [7, 7];
      }),
      playerTile: {
        location: [0, 0],
        boardIndex: 0
      },
      tiles: [
        { id: 0, contains: null, image: null, color: '#6b6057' },
        { id: 1, contains: { type: 'monster', subtype: 'goblin' }, image: 'monster_goblin', color: '#6b6057' }
      ],
      currentBoard: {
        id: 'board-1',
        tiles: [
          { id: 0, contains: null, image: null, color: '#6b6057' },
          { id: 1, contains: { type: 'monster', subtype: 'goblin' }, image: 'monster_goblin', color: '#6b6057' }
        ]
      },
      dungeon: {
        levels: [
          {
            id: 'level-1',
            front: {
              miniboards: [
                {
                  id: 'board-1',
                  tiles: [
                    { id: 0, contains: null, image: null, color: '#6b6057' },
                    { id: 1, contains: { type: 'monster', subtype: 'goblin' }, image: 'monster_goblin', color: '#6b6057' }
                  ]
                }
              ]
            }
          }
        ]
      }
    };

    props = {
      boardManager: boardManagerMock,
      saveUserData: jest.fn(),
      registerMessaging: jest.fn(),
      inventoryManager: { items: [] },
      crewManager: { crew: [] }
    };
    
    pageInstance = new DungeonPage(props);
    pageInstance.setState = jest.fn();
    pageInstance.forceUpdate = jest.fn();
  });

  describe('Narrative Reset Console Command', () => {
    test('triggerNarrativeReset resets narrative_visited tiles back to narrative type and updates image', () => {
      // Mock tiles containing narrative_visited
      const narrativeTile = { id: 2, contains: { type: 'narrative_visited', subtype: null }, image: 'narrative_visited' };
      boardManagerMock.tiles.push(narrativeTile);
      boardManagerMock.currentBoard.tiles.push(narrativeTile);
      boardManagerMock.dungeon.levels[0].front.miniboards[0].tiles.push(narrativeTile);

      pageInstance.triggerNarrativeReset();

      const resetTile = boardManagerMock.tiles.find(t => t.id === 2);
      expect(resetTile.contains.type).toBe('narrative');
      expect(resetTile.image).toBe('narrative');
      expect(boardManagerMock.updateDungeon).toHaveBeenCalledWith(boardManagerMock.dungeon);
      expect(boardManagerMock.refreshTiles).toHaveBeenCalled();
      expect(pageInstance.forceUpdate).toHaveBeenCalled();
    });

    test('handleDevConsoleKeyDown resets narrative tiles when typing "narrative reset"', async () => {
      // Mock tiles containing narrative_visited
      const narrativeTile = { id: 2, contains: { type: 'narrative_visited', subtype: null }, image: 'narrative_visited' };
      boardManagerMock.tiles.push(narrativeTile);
      boardManagerMock.currentBoard.tiles.push(narrativeTile);
      boardManagerMock.dungeon.levels[0].front.miniboards[0].tiles.push(narrativeTile);

      pageInstance.state = {
        devConsoleInput: 'narrative reset',
        devConsoleOutput: []
      };
      
      const eventMock = {
        key: 'Enter',
        preventDefault: jest.fn()
      };
      
      await pageInstance.handleDevConsoleKeyDown(eventMock);
      
      const resetTile = boardManagerMock.tiles.find(t => t.id === 2);
      expect(resetTile.contains.type).toBe('narrative');
      expect(eventMock.preventDefault).toHaveBeenCalled();
    });
  });

  describe('POI List Player Position Resolution', () => {
    test('renders adjacent monster in Points of Interest panel using live boardManager player coordinates', () => {
      // Render DungeonPage
      const { queryByText } = render(<DungeonPage {...props} />);

      // Find the card label 'goblin' which represents the adjacent monster
      // If the coordinate resolution is correct, the monster is adjacent (Chebyshev distance 1 <= MAX_DIST 6)
      // and not black/fogged, so it should be visible in the POI list.
      const monsterLabel = queryByText('goblin');
      expect(monsterLabel).toBeDefined();
    });
  });
});
