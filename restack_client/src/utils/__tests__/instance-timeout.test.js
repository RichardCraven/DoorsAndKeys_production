jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({
  getTerrainSetForLevel: jest.fn().mockReturnValue([])
}));
jest.mock('../session-handler', () => ({
  getMeta: jest.fn(),
  storeMeta: jest.fn(),
  getUserId: jest.fn().mockReturnValue('playerA')
}));
jest.mock('../api-handler', () => ({
  getAllUsersRequest: jest.fn(),
  updateUserRequest: jest.fn().mockResolvedValue({}),
  loadAllDungeonsRequest: jest.fn().mockResolvedValue({ data: [] }),
  loadDungeonRequest: jest.fn().mockResolvedValue({ data: [] }),
  updateDungeonRequest: jest.fn().mockResolvedValue({}),
  addDungeonRequest: jest.fn().mockResolvedValue({}),
  deleteDungeonRequest: jest.fn().mockResolvedValue({})
}));

import DungeonPage from '../../pages/DungeonPage';
import { getMeta, storeMeta, getUserId } from '../session-handler';
import { getAllUsersRequest, updateUserRequest } from '../api-handler';

describe('Dungeon Instance Registration Timeout Check', () => {
  let dungeonPage;
  let props;

  beforeEach(() => {
    jest.clearAllMocks();

    getUserId.mockReturnValue('playerA');
    localStorage.setItem('userId', 'playerA');

    props = {
      crewManager: {
        crew: [],
        initializeCrew: jest.fn()
      },
      inventoryManager: {
        initializeItems: jest.fn()
      },
      boardManager: {
        setDungeon: jest.fn()
      }
    };

    dungeonPage = new DungeonPage(props);
    dungeonPage.displayMessage = jest.fn();
  });

  test('checkInstanceTimeouts clears expired dungeon registrations (>7 days) and preserves active registrations', async () => {
    const now = Date.now();
    const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

    const mockUsers = [
      {
        _id: 'playerA', // Current user (should be skipped)
        username: 'Player A',
        metadata: JSON.stringify({
          dungeonId: 'inst_1',
          dungeonEntryTimestamp: eightDaysAgo
        })
      },
      {
        _id: 'playerB', // Expired registration
        username: 'Player B',
        metadata: JSON.stringify({
          dungeonId: 'inst_1',
          dungeonEntryTimestamp: eightDaysAgo
        })
      },
      {
        _id: 'playerC', // Active registration
        username: 'Player C',
        metadata: JSON.stringify({
          dungeonId: 'inst_1',
          dungeonEntryTimestamp: twoDaysAgo
        })
      },
      {
        _id: 'playerD', // Registered but no entry timestamp (legacy data, keep)
        username: 'Player D',
        metadata: JSON.stringify({
          dungeonId: 'inst_1'
        })
      }
    ];

    getAllUsersRequest.mockResolvedValue({ data: mockUsers });

    await dungeonPage.checkInstanceTimeouts();

    // Verify it called getAllUsersRequest
    expect(getAllUsersRequest).toHaveBeenCalled();

    // Should call updateUserRequest ONLY for Player B (expired)
    // playerA is current user, playerC is active, playerD has no timestamp
    expect(updateUserRequest).toHaveBeenCalledTimes(1);
    expect(updateUserRequest).toHaveBeenCalledWith('playerB', expect.not.objectContaining({
      dungeonId: expect.any(String),
      dungeonEntryTimestamp: expect.any(String)
    }));
  });
});
