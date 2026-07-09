jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));
jest.mock('../session-handler', () => ({
  getMeta: jest.fn().mockReturnValue(undefined),
  storeMeta: jest.fn()
}));

import { CrewManager } from '../crew-manager';
import DungeonPage from '../../pages/DungeonPage';
import { getMeta } from '../session-handler';

describe('Sharpen Blades Special Action & UI Details Popup', () => {
  let crewManager;
  let soldier;
  let dungeonPage;
  let mockInventoryManager;

  beforeEach(() => {
    jest.clearAllMocks();

    crewManager = new CrewManager();
    crewManager.initializeCrew([
      {
        id: 123,
        name: 'Sardonis',
        type: 'soldier',
        stats: { str: 8, int: 5, dex: 6, fort: 7, baseHp: 11, experience: 0 },
        specialActions: [],
        inventory: []
      }
    ]);
    soldier = crewManager.crew[0];

    mockInventoryManager = {
      inventory: [
        { type: 'weapon', subtype: 'cutting', damage: 10, name: 'Shortsword' }
      ],
      addItem: jest.fn()
    };

    const props = {
      crewManager,
      inventoryManager: mockInventoryManager,
      saveUserData: jest.fn()
    };

    dungeonPage = new DungeonPage(props);
    dungeonPage.displayMessage = jest.fn();
  });

  test('beginSpecialAction registers sharpen_blades action with a 2-hour duration', () => {
    const action = { type: 'sharpen_blades' };
    crewManager.beginSpecialAction(soldier, action, {});

    expect(soldier.specialActions).toHaveLength(1);
    const sa = soldier.specialActions[0];
    expect(sa.type).toBe('sharpen_blades');
    expect(sa.name).toBe('Sharpening Blades');
    expect(sa.available).toBe(false);

    const diffMs = new Date(sa.endDate) - new Date(sa.startDate);
    expect(diffMs).toBeCloseTo(2 * 60 * 60 * 1000, -2);
  });

  test('checkAndCollectFinishedSpecialActions applies +80% flat damage to cutting weapons on completion', () => {
    const action = { type: 'sharpen_blades' };
    crewManager.beginSpecialAction(soldier, action, {});

    // Fast-forward endDate to be in the past
    soldier.specialActions[0].endDate = new Date(Date.now() - 1000);

    const { updates } = dungeonPage.checkAndCollectFinishedSpecialActions({ markNotified: true });

    expect(updates).toHaveLength(1);
    expect(updates[0].text).toContain('finished sharpening blades! Applied +8 damage to "Shortsword (Sharpened)"');
    expect(mockInventoryManager.inventory[0].damage).toBe(18); // 10 * 1.8 = 18
    expect(mockInventoryManager.inventory[0].name).toBe('Shortsword (Sharpened)');
  });

  test('checkAndCollectFinishedSpecialActions applies +80% flat damage to equipped cutting weapons', () => {
    const action = { type: 'sharpen_blades' };
    crewManager.beginSpecialAction(soldier, action, {});

    // Empty shared inventory, put weapon in crew member's inventory
    mockInventoryManager.inventory = [];
    soldier.inventory = [
      { type: 'weapon', subtype: 'cutting', damage: 20, name: 'Broadsword', equippedSlot: 'right' }
    ];

    soldier.specialActions[0].endDate = new Date(Date.now() - 1000);

    const { updates } = dungeonPage.checkAndCollectFinishedSpecialActions({ markNotified: true });

    expect(updates).toHaveLength(1);
    expect(updates[0].text).toContain('finished sharpening blades! Applied +16 damage to "Broadsword (Sharpened)"');
    expect(soldier.inventory[0].damage).toBe(36); // 20 * 1.8 = 36
    expect(soldier.inventory[0].name).toBe('Broadsword (Sharpened)');
  });

  test('checkAndCollectFinishedSpecialActions notifies that no weapons are present if cutting weapons were sold during prep', () => {
    const action = { type: 'sharpen_blades' };
    crewManager.beginSpecialAction(soldier, action, {});

    soldier.specialActions[0].endDate = new Date(Date.now() - 1000);

    // Empty the inventory of cutting weapons
    mockInventoryManager.inventory = [];
    soldier.inventory = [];

    const { updates } = dungeonPage.checkAndCollectFinishedSpecialActions({ markNotified: true });

    expect(updates).toHaveLength(1);
    expect(updates[0].text).toContain('no valid cutting weapons were present in the inventory when the process completed');
  });
});
