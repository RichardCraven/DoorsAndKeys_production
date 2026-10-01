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
import DungeonPage from '../DungeonPage';
import { storeMeta } from '../../utils/session-handler';

describe('Player Coordinates Console Command (coordinates / coords)', () => {
  let pageInstance;

  beforeEach(() => {
    storeMeta({});
    pageInstance = new DungeonPage({});
    pageInstance._isMounted = true;
    pageInstance.setState = (updater) => {
      const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
      pageInstance.state = { ...pageInstance.state, ...patch };
    };
    pageInstance.devConsoleInputRef = { current: { focus: jest.fn() } };
  });

  test('coords outputs the current avatar coordinates and tele command', () => {
    pageInstance.props = {
      boardManager: {
        currentLevel: { id: 0 },
        currentOrientation: 'F',
        playerTile: {
          boardIndex: 1,
          location: [6, 2] // y=6, x=2
        }
      }
    };
    pageInstance.state = {
      devConsoleInput: 'coords',
      devConsoleOutput: [],
      devConsoleOpen: true
    };

    const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
    pageInstance.handleDevConsoleKeyDown(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    const expectedCoordStr = 'level:0,orientation:front,board:1,x:2,y:6';
    const expectedTeleStr = `tele ${expectedCoordStr}`;
    expect(pageInstance.state.devConsoleOutput).toContain(expectedCoordStr);
    expect(pageInstance.state.devConsoleOutput).toContain(expectedTeleStr);
    expect(pageInstance.state.devConsoleInput).toBe('');
  });

  test('coordinates command works identically to coords', () => {
    pageInstance.props = {
      boardManager: {
        currentLevel: { id: -1 },
        currentOrientation: 'B',
        playerTile: {
          boardIndex: 4,
          location: [10, 5] // y=10, x=5
        }
      }
    };
    pageInstance.state = {
      devConsoleInput: 'coordinates',
      devConsoleOutput: [],
      devConsoleOpen: true
    };

    const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
    pageInstance.handleDevConsoleKeyDown(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    const expectedCoordStr = 'level:-1,orientation:back,board:4,x:5,y:10';
    const expectedTeleStr = `tele ${expectedCoordStr}`;
    expect(pageInstance.state.devConsoleOutput).toContain(expectedCoordStr);
    expect(pageInstance.state.devConsoleOutput).toContain(expectedTeleStr);
  });

  test('tele command can consume output of coords command to teleport player', () => {
    pageInstance.teleportCrew = jest.fn();
    pageInstance.props = {
      boardManager: {
        currentLevel: { id: 2 },
        currentOrientation: 'back',
        playerTile: {
          boardIndex: 3,
          location: [8, 4]
        }
      }
    };

    // First generate coords
    pageInstance.state = {
      devConsoleInput: 'coords',
      devConsoleOutput: [],
      devConsoleOpen: true
    };
    const event1 = { key: 'Enter', preventDefault: jest.fn() };
    pageInstance.handleDevConsoleKeyDown(event1);

    const generatedCoord = pageInstance.state.devConsoleOutput.find(line => line.startsWith('level:'));
    expect(generatedCoord).toBe('level:2,orientation:back,board:3,x:4,y:8');

    // Now feed it into tele command
    pageInstance.state = {
      ...pageInstance.state,
      devConsoleInput: `tele ${generatedCoord}`
    };
    const event2 = { key: 'Enter', preventDefault: jest.fn() };
    pageInstance.handleDevConsoleKeyDown(event2);

    expect(pageInstance.teleportCrew).toHaveBeenCalledWith(expect.objectContaining({
      levelId: 2,
      orientation: 'back',
      boardIndex: 3,
      x: 4,
      y: 8
    }));
  });

  test('coords resolves accurately in superboard pocket dimensions', () => {
    pageInstance.props = {
      boardManager: {
        currentLevel: { id: 'light', isSuperboard: true },
        currentOrientation: 'F'
      }
    };
    pageInstance.state = {
      inSuperboard: true,
      superboardType: 'light',
      superboardPlayerPos: { gx: 17, gy: 32 }, // gy 32 -> row 2 of mb (32%15=2), mbY=2. gx 17 -> col 2 of mb (17%15=2), mbX=1. mbIndex = 2*3+1 = 7.
      devConsoleInput: 'coords',
      devConsoleOutput: [],
      devConsoleOpen: true
    };

    const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
    pageInstance.handleDevConsoleKeyDown(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    const expectedCoordStr = 'level:light,orientation:front,board:7,x:2,y:2';
    expect(pageInstance.state.devConsoleOutput).toContain(expectedCoordStr);
    expect(pageInstance.state.devConsoleOutput).toContain(`tele ${expectedCoordStr}`);
  });

  test('coords falls back to meta.location when boardManager playerTile is not yet placed', () => {
    storeMeta({
      location: {
        levelId: 0,
        orientation: 'front',
        boardIndex: 2,
        tileIndex: 94 // 94 = 6*15 + 4 -> y=6, x=4
      }
    });

    pageInstance.props = {
      boardManager: {
        currentLevel: { id: 0 },
        currentOrientation: 'front',
        playerTile: null
      }
    };
    pageInstance.state = {
      devConsoleInput: 'coords',
      devConsoleOutput: [],
      devConsoleOpen: true
    };

    const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
    pageInstance.handleDevConsoleKeyDown(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    const expectedCoordStr = 'level:0,orientation:front,board:2,x:4,y:6';
    expect(pageInstance.state.devConsoleOutput).toContain(expectedCoordStr);
  });

  test('help command includes the coordinates / coords command description', () => {
    pageInstance.state = {
      devConsoleInput: 'help',
      devConsoleOutput: [],
      devConsoleOpen: true
    };

    const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
    pageInstance.handleDevConsoleKeyDown(mockEvent);

    const helpLine = pageInstance.state.devConsoleOutput.find(line =>
      typeof line === 'string' && line.includes('coordinates / coords')
    );
    expect(helpLine).toBeDefined();
    expect(helpLine).toContain('coordinates / coords — output player avatar coordinates for tele command');
  });

  test('tele command with x and y places avatar on requested tile instead of defaulting to (7,7)', () => {
    const mockBm = {
      currentLevel: { id: 0, front: { miniboards: [{ id: 0, tiles: Array.from({ length: 225 }, (_, i) => ({ id: i })) }] } },
      currentOrientation: 'F',
      tiles: [],
      initializeTilesFromMap: jest.fn(function(bIdx, spawnIdx) {
        this.playerTile = { boardIndex: bIdx, location: [Math.floor(spawnIdx / 15), spawnIdx % 15] };
      }),
      getIndexFromCoordinates: (loc) => loc[0] * 15 + loc[1]
    };

    pageInstance.props = { boardManager: mockBm };
    pageInstance.state = {
      devConsoleInput: 'tele level:0,orientation:front,board:0,x:22,y:19',
      devConsoleOutput: [],
      devConsoleOpen: true
    };

    const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
    pageInstance.handleDevConsoleKeyDown(mockEvent);

    // 22 % 15 = 7, 19 % 15 = 4 -> tile index 4 * 15 + 7 = 67
    expect(mockBm.initializeTilesFromMap).toHaveBeenCalledWith(0, 67);
  });
});
