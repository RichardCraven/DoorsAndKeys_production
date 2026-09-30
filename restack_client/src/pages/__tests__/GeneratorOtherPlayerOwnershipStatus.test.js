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
  CModal: () => null,
  CModalHeader: () => null,
  CModalTitle: () => null,
  CModalBody: () => null,
  CModalFooter: () => null
}));

let mockMeta = {};
let mockUserId = 'user_player1';
let mockUserName = 'Player One';

jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => mockMeta),
    storeMeta: jest.fn((newMeta) => { mockMeta = { ...newMeta }; }),
    getUserId: jest.fn(() => mockUserId),
    getUserName: jest.fn(() => mockUserName)
}));

import React from 'react';
import { render } from '@testing-library/react';
import DungeonPage from '../DungeonPage';

describe('Resource Generator Ownership Status Text', () => {
    let originalComponentDidMount;
    let originalWillMount;

    beforeAll(() => {
        originalComponentDidMount = DungeonPage.prototype.componentDidMount;
        originalWillMount = DungeonPage.prototype.UNSAFE_componentWillMount;
        DungeonPage.prototype.componentDidMount = jest.fn();
        DungeonPage.prototype.UNSAFE_componentWillMount = jest.fn();
    });

    afterAll(() => {
        DungeonPage.prototype.componentDidMount = originalComponentDidMount;
        DungeonPage.prototype.UNSAFE_componentWillMount = originalWillMount;
    });

    const mockProps = {
        boardManager: {
            dungeon: { name: 'POCKET DIMENSION' },
            currentOrientation: 'A',
            currentBoard: { name: 'Level 1' },
            tiles: [],
            establishAvailableItems: jest.fn()
        },
        inventoryManager: { items: [] },
        crewManager: { initializeCrew: jest.fn(), crew: [] },
        user: { email: 'player1@example.com', displayName: 'Player One' }
    };

    test('renders Active (Owned) [Lv 1] when generator is owned by current player', () => {
        const ref = React.createRef();
        const { container } = render(<DungeonPage {...mockProps} ref={ref} />);
        ref.current.setState({
            showGeneratorModal: true,
            activeGeneratorTile: {
                id: 10,
                placedBy: 'player',
                generatorData: {
                    activated: true,
                    owned: true,
                    ownedByPlayer: true,
                    ownerId: 'user_player1',
                    ownerName: 'Player One',
                    level: 1,
                    key: 'sawmill',
                    resource: 'Wood',
                    rate: 5
                },
                contains: {
                    type: 'building',
                    subtype: 'sawmill',
                    building: 'sawmill',
                    name: 'Sawmill'
                }
            }
        });

        expect(container.textContent).toContain('Active (Owned) [Lv 1]');
    });

    test('renders Active (Owned by Sir Lancelot) [Lv 1] when generator is owned by another player', () => {
        const ref = React.createRef();
        const { container } = render(<DungeonPage {...mockProps} ref={ref} />);
        ref.current.setState({
            showGeneratorModal: true,
            activeGeneratorTile: {
                id: 10,
                generatorData: {
                    activated: true,
                    owned: true,
                    ownedByPlayer: false,
                    ownerId: 'user_player2',
                    ownerName: 'Sir Lancelot',
                    level: 1,
                    key: 'sawmill',
                    resource: 'Wood',
                    rate: 5
                },
                contains: {
                    type: 'building',
                    subtype: 'sawmill',
                    building: 'sawmill',
                    name: 'Sawmill'
                }
            }
        });

        expect(container.textContent).toContain('Active (Owned by Sir Lancelot) [Lv 1]');
    });

    test('renders Active (Owned by another player) [Lv 1] when generator is owned by another player with no name set', () => {
        const ref = React.createRef();
        const { container } = render(<DungeonPage {...mockProps} ref={ref} />);
        ref.current.setState({
            showGeneratorModal: true,
            activeGeneratorTile: {
                id: 10,
                generatorData: {
                    activated: true,
                    owned: true,
                    ownedByPlayer: false,
                    ownerId: 'user_player2',
                    level: 1,
                    key: 'sawmill',
                    resource: 'Wood',
                    rate: 5
                },
                contains: {
                    type: 'building',
                    subtype: 'sawmill',
                    building: 'sawmill',
                    name: 'Sawmill'
                }
            }
        });

        expect(container.textContent).toContain('Active (Owned by another player) [Lv 1]');
    });

    test('renders Active (Enemy) [Lv 1] when generator is hostile / enemy owned', () => {
        const ref = React.createRef();
        const { container } = render(<DungeonPage {...mockProps} ref={ref} />);
        ref.current.setState({
            showGeneratorModal: true,
            activeGeneratorTile: {
                id: 10,
                isHostile: true,
                generatorData: {
                    activated: true,
                    owned: false,
                    isHostile: true,
                    ownerName: 'Enemy',
                    level: 1,
                    key: 'sawmill',
                    resource: 'Wood',
                    rate: 5
                },
                contains: {
                    type: 'building',
                    subtype: 'sawmill',
                    building: 'sawmill',
                    name: 'Sawmill',
                    isHostile: true
                }
            }
        });

        expect(container.textContent).toContain('Active (Enemy) [Lv 1]');
    });
});
