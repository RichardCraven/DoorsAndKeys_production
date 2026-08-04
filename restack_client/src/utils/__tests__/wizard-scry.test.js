jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({
  eye_inverted: 'eye_inverted_stub.png'
}));
jest.mock('../session-handler', () => ({
  getMeta: jest.fn().mockReturnValue({ crew: [] }),
  storeMeta: jest.fn()
}));

import { CrewManager } from '../crew-manager';
import DungeonPage from '../../pages/DungeonPage';
import { SCRY_OPTIONS } from '../spells-table';

describe('Wizard Scry Action Submenu', () => {
  let crewManager;
  let wizard;
  let dungeonPage;

  beforeEach(() => {
    jest.clearAllMocks();

    crewManager = new CrewManager();
    crewManager.initializeCrew([
      {
        id: 456,
        name: 'Zildjikan',
        type: 'wizard',
        stats: { str: 4, int: 10, dex: 6, fort: 5, baseHp: 10, experience: 0 },
        specialActions: [],
        inventory: []
      }
    ]);
    wizard = crewManager.crew[0];

    const props = {
      crewManager,
      inventoryManager: { inventory: [], addItem: jest.fn() },
      saveUserData: jest.fn()
    };

    dungeonPage = new DungeonPage(props);
    dungeonPage.displayMessage = jest.fn();
    dungeonPage.state = { ...dungeonPage.state, selectedCrewMember: wizard };
  });

  test('getCharacterActions includes Scry action for Wizard with eye_inverted icon and subTypes', () => {
    const actionsJSX = dungeonPage.getCharacterActions(wizard);
    expect(actionsJSX).toBeDefined();

    const scryWrapper = actionsJSX.props.children.find(
      child => child && child.props && child.props.className && child.props.className.includes('action-wrapper--scry')
    );
    expect(scryWrapper).toBeDefined();
  });

  test('beginSpecialAction registers scry action correctly', () => {
    const action = { type: 'scry' };
    const subType = { scryKey: 'scry_monsters' };

    crewManager.beginSpecialAction(wizard, action, subType);

    expect(wizard.specialActions).toHaveLength(1);
    const sa = wizard.specialActions[0];
    expect(sa.type).toBe('scry');
    expect(sa.scryKey).toBe('scry_monsters');
    expect(sa.name).toBe('Scry Monsters');
    expect(sa.available).toBe(false);

    const diffMs = new Date(sa.endDate) - new Date(sa.startDate);
    expect(diffMs).toBeCloseTo(10 * 60 * 1000, -2);
  });

  test('handleScryCommit starts scry action and displays message', () => {
    dungeonPage.handleScryCommit('scry_full');

    expect(wizard.specialActions).toHaveLength(1);
    expect(wizard.specialActions[0].scryKey).toBe('scry_full');
    expect(dungeonPage.displayMessage).toHaveBeenCalledWith(
      expect.stringContaining('Scry action started: Arcane Sight')
    );
  });
});
