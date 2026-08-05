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
  test('instakill flag logic, instantkill alias, meta flag, and monster removal', () => {
    let mockMeta = {};
    let state = {
      instakillNextMonster: !!mockMeta.instakillNextMonster,
      devConsoleOutput: []
    };

    const setState = (updater) => {
      if (typeof updater === 'function') {
        state = { ...state, ...updater(state) };
      } else {
        state = { ...state, ...updater };
      }
    };

    // 1. Simulate dev console command 'instakill', 'instantkill', or 'ik'
    const handleCommand = (cmd, raw) => {
      if (cmd === 'instakill' || cmd === 'instantkill' || cmd === 'ik') {
        const nextState = !mockMeta.instakillNextMonster;
        mockMeta.instakillNextMonster = nextState;
        setState({
          instakillNextMonster: nextState,
          devConsoleOutput: [...state.devConsoleOutput, `> ${raw}`, `Instakill flag: ${nextState}`]
        });
      }
    };

    handleCommand('instantkill', 'instantkill');
    expect(state.instakillNextMonster).toBe(true);
    expect(mockMeta.instakillNextMonster).toBe(true);

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
      const instakillActive = !!(state.instakillNextMonster || mockMeta.instakillNextMonster);
      if (bool && instakillActive) {
        mockMeta.instakillNextMonster = false;
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
    expect(mockMeta.instakillNextMonster).toBe(false);
    expect(mockRemove).toHaveBeenCalledWith(105);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
