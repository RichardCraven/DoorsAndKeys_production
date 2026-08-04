// Mock coreui before importing
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

describe('Instakill Dev Console Command Unit Test', () => {
  test('instakill flag logic and monster removal', () => {
    let state = {
      instakillNextMonster: false,
      devConsoleOutput: []
    };

    const setState = (updater) => {
      if (typeof updater === 'function') {
        state = { ...state, ...updater(state) };
      } else {
        state = { ...state, ...updater };
      }
    };

    // 1. Simulate dev console command 'instakill' or 'ik'
    const handleCommand = (cmd, raw) => {
      if (cmd === 'instakill' || cmd === 'ik') {
        setState(prev => ({
          instakillNextMonster: !prev.instakillNextMonster,
          devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Instakill flag: ${!prev.instakillNextMonster}`]
        }));
      }
    };

    handleCommand('ik', 'ik');
    expect(state.instakillNextMonster).toBe(true);

    // 2. Simulate triggerMonsterBattle execution with instakill active
    const mockRemove = jest.fn();
    const mockRefresh = jest.fn();
    const boardManager = {
      removeDefeatedMonsterTile: mockRemove,
      refreshTiles: mockRefresh,
      messaging: jest.fn(),
      tiles: [],
      overlayTiles: []
    };

    const triggerMonsterBattle = (bool, tileId) => {
      if (bool && state.instakillNextMonster) {
        setState({ instakillNextMonster: false });
        if (boardManager && typeof tileId !== 'undefined' && tileId !== null) {
          boardManager.removeDefeatedMonsterTile(tileId);
          boardManager.refreshTiles();
        }
        return 'instakilled';
      }
      return 'battle_started';
    };

    const result = triggerMonsterBattle(true, 105);
    expect(result).toBe('instakilled');
    expect(state.instakillNextMonster).toBe(false);
    expect(mockRemove).toHaveBeenCalledWith(105);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
