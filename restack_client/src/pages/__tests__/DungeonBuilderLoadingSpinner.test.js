jest.mock('@coreui/icons', () => ({
  cilSave: 'cilSave',
  cilPencil: 'cilPencil',
  cilTrash: 'cilTrash',
  cilPlus: 'cilPlus'
}));
jest.mock('@coreui/icons-react', () => () => <span data-testid="c-icon" />);
jest.mock('@coreui/react', () => ({
  CSpinner: ({ style, color, size }) => <span data-testid="c-spinner" data-color={color} style={style} />,
  CFormSelect: ({ options, value, onChange, ...rest }) => (
    <select value={value} onChange={onChange || (() => {})} data-testid="c-form-select" {...rest}>
      {(options || []).map((opt, i) => (
        <option key={i} value={typeof opt === 'object' ? opt.value : opt}>
          {typeof opt === 'object' ? opt.label : opt}
        </option>
      ))}
    </select>
  ),
  CFormCheck: () => <input type="radio" data-testid="c-form-check" />,
  CButtonGroup: ({ children }) => <div data-testid="c-button-group">{children}</div>,
  CDropdown: ({ children }) => <div>{children}</div>,
  CDropdownToggle: ({ children }) => <div>{children}</div>,
  CDropdownMenu: ({ children }) => <div>{children}</div>,
  CDropdownItem: ({ children }) => <div>{children}</div>,
  CCollapse: ({ children }) => <div>{children}</div>
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import BoardView from '../dungonBuilderViews/BoardView';
import PlaneView from '../dungonBuilderViews/PlaneView';
import DungeonView from '../dungonBuilderViews/DungeonView';
import MapMakerPage from '../MapmakerPage';
import { loadDungeonRequest, loadAllBoardsRequest } from '../../utils/api-handler';
import { getMeta, storeMeta, setEditorPreference } from '../../utils/session-handler';

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

describe('Dungeon Builder Loading Spinner & Empty Board Suppression', () => {
  const createMockTiles = () => {
    return Array.from({ length: 225 }, (_, i) => ({
      id: i,
      type: 'board-tile',
      coordinates: [i % 15, Math.floor(i / 15)],
      contains: { type: 'empty_space', subtype: null },
      color: null,
      image: null
    }));
  };

  describe('BoardView Loading State', () => {
    test('renders loading spinner and suppresses empty board and action buttons when loadingData is true', () => {
      const { container } = render(
        <BoardView
          loadingData={true}
          boardSize={540}
          tileSize={36}
          tiles={createMockTiles()}
          loadedBoard={null}
        />
      );

      // Loading spinner should be present
      expect(screen.getByTestId('board-loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading dungeon...')).toBeInTheDocument();

      // Board container with 225 tiles should NOT be rendered
      expect(container.querySelector('.board.map-board')).not.toBeInTheDocument();
      // Action buttons (save, rename, delete, etc.) should be hidden while loading
      expect(container.querySelector('.plane-action-buttons')).not.toBeInTheDocument();
    });

    test('renders board and action buttons normally when loadingData is false', () => {
      const { container } = render(
        <BoardView
          loadingData={false}
          boardSize={540}
          tileSize={36}
          tiles={createMockTiles()}
          loadedBoard={{ id: 'b-1', name: 'TestBoard' }}
        />
      );

      // Loading spinner should NOT be present
      expect(screen.queryByTestId('board-loading-spinner')).not.toBeInTheDocument();

      // Board container with tiles should be rendered
      expect(container.querySelector('.board.map-board')).toBeInTheDocument();
      // Action buttons should be visible
      expect(container.querySelector('.plane-action-buttons')).toBeInTheDocument();
    });
  });

  describe('PlaneView Loading State', () => {
    test('renders loading spinner and suppresses plane board and action buttons when loadingData is true', () => {
      const { container } = render(
        <PlaneView
          loadingData={true}
          boardSize={540}
          tileSize={36}
          loadedPlane={null}
          miniboards={[]}
        />
      );

      // Loading spinner should be present
      expect(screen.getByTestId('plane-loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading dungeon...')).toBeInTheDocument();

      // Board container should NOT be rendered
      expect(container.querySelector('.board.map-board')).not.toBeInTheDocument();
      expect(container.querySelector('.plane-action-buttons')).not.toBeInTheDocument();
    });

    test('renders plane board normally when loadingData is false', () => {
      const { container } = render(
        <PlaneView
          loadingData={false}
          boardSize={540}
          tileSize={36}
          loadedPlane={{ id: 'p-1', name: 'TestPlane' }}
          miniboards={[]}
        />
      );

      expect(screen.queryByTestId('plane-loading-spinner')).not.toBeInTheDocument();
      expect(container.querySelector('.board.map-board')).toBeInTheDocument();
      expect(container.querySelector('.plane-action-buttons')).toBeInTheDocument();
    });
  });

  describe('DungeonView Loading State', () => {
    test('renders loading spinner with Loading dungeon... and suppresses dungeon planes when loadingData is true', () => {
      const mockDungeon = {
        id: 'd-1',
        name: 'LoadedDungeon',
        levels: [
          {
            id: 0,
            front: { id: 'p-1', miniboards: [] },
            back: { id: 'p-2', miniboards: [] }
          }
        ]
      };

      const { container } = render(
        <DungeonView
          loadingData={true}
          loadedDungeon={mockDungeon}
          dungeons={[mockDungeon]}
          selectedDungeonName="LoadedDungeon"
          boardSize={540}
          tileSize={36}
        />
      );

      expect(screen.getByTestId('dungeon-loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading dungeon...')).toBeInTheDocument();
      expect(container.querySelector('.loaded-dungeon-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('MapmakerPage loadDungeon and dungeonSelectOnChange loadingData handling', () => {
    let mapmakerInstance;
    const mockDungeonData = {
      _id: 'dungeon-123',
      name: 'CryptOfShadows',
      content: JSON.stringify({
        id: 'dungeon-123',
        name: 'CryptOfShadows',
        levels: [{ id: 0, front: null, back: null }]
      })
    };

    beforeEach(() => {
      jest.clearAllMocks();
      getMeta.mockReturnValue({ preferences: { editor: {} } });

      const mockProps = {
        mapMaker: {
          initializeTiles: jest.fn(),
          formatDungeon: jest.fn((d) => d),
          markPassages: jest.fn(() => null),
          getMapConfiguration: jest.fn(() => [[], [], [], []]),
          filterMapAdjacency: jest.fn(() => ({ top: [], bottom: [], left: [], right: [], bot: [] })),
          tiles: createMockTiles()
        }
      };

      mapmakerInstance = new MapMakerPage(mockProps);
      mapmakerInstance.state = {
        ...mapmakerInstance.state,
        loadingData: false,
        dungeons: [{ id: 'dungeon-123', name: 'CryptOfShadows' }],
        boards: [],
        planes: [],
        loadedDungeon: null,
        tiles: mapmakerInstance.createBlankBoardTiles()
      };
    });

    test('loadDungeon sets loadingData: true at start and loadingData: false upon completion', async () => {
      const stateHistory = [];
      mapmakerInstance.setState = jest.fn((fn, cb) => {
        const updated = typeof fn === 'function' ? fn(mapmakerInstance.state) : fn;
        mapmakerInstance.state = { ...mapmakerInstance.state, ...updated };
        stateHistory.push({ ...updated });
        if (cb) cb();
      });

      loadDungeonRequest.mockResolvedValueOnce({ data: [mockDungeonData] });
      loadAllBoardsRequest.mockResolvedValueOnce({ data: [] });

      await mapmakerInstance.loadDungeon('dungeon-123');

      // First setState should have loadingData: true
      expect(stateHistory[0]).toMatchObject({ loadingData: true });

      // Final setState should reset loadingData: false
      const lastState = stateHistory[stateHistory.length - 1];
      expect(lastState).toMatchObject({ loadingData: false });
      expect(mapmakerInstance.state.loadedDungeon.name).toBe('CryptOfShadows');
    });

    test('dungeonSelectOnChange triggers loadingData: true when selecting a dungeon', async () => {
      const stateHistory = [];
      mapmakerInstance.setState = jest.fn((fn, cb) => {
        const updated = typeof fn === 'function' ? fn(mapmakerInstance.state) : fn;
        mapmakerInstance.state = { ...mapmakerInstance.state, ...updated };
        stateHistory.push({ ...updated });
        if (cb) cb();
      });

      loadDungeonRequest.mockResolvedValueOnce({ data: [mockDungeonData] });
      loadAllBoardsRequest.mockResolvedValueOnce({ data: [] });

      mapmakerInstance.dungeonSelectOnChange({ target: { value: 'CryptOfShadows' } });

      // First setState in dungeonSelectOnChange must set loadingData: true
      expect(stateHistory[0]).toMatchObject({ loadingData: true });
    });
  });
});
