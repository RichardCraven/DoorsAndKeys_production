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
jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => mockMeta),
    storeMeta: jest.fn((newMeta) => { mockMeta = { ...newMeta }; }),
    getUserId: jest.fn(() => 'player_1')
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import DungeonPage from '../DungeonPage';

describe('Sticky Right Panel Header & Mode Toggle', () => {
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
            dungeon: { name: 'CARCOSA_4658' },
            currentOrientation: 'A',
            currentBoard: { name: 'Level 1' },
            tiles: [],
            establishAvailableItems: jest.fn()
        },
        inventoryManager: { items: [] },
        crewManager: { initializeCrew: jest.fn(), crew: [] },
        user: { email: 'player@example.com', displayName: 'Hero' }
    };

    test('renders sticky header with dungeon name and mode toggle buttons', () => {
        const { container } = render(<DungeonPage {...mockProps} />);
        
        const stickyHeader = container.querySelector('.sticky-right-panel-header');
        expect(stickyHeader).not.toBeNull();

        const title = container.querySelector('.sticky-header-dungeon-title');
        expect(title.textContent).toBe('CARCOSA 4658');

        const panelBtn = screen.getByTitle('View Game Panels (Minimap, Status, Crew)');
        const chatBtn = screen.getByTitle('View In-Game Instance Chat');

        expect(panelBtn).not.toBeNull();
        expect(chatBtn).not.toBeNull();
        expect(panelBtn.className).toContain('active');
        expect(chatBtn.className).not.toContain('active');
    });

    test('toggles rightPanelMode state when chat and panel buttons are clicked', () => {
        const { container } = render(<DungeonPage {...mockProps} />);

        const chatBtn = screen.getByTitle('View In-Game Instance Chat');
        fireEvent.click(chatBtn);

        const chatContainer = container.querySelector('.instance-chat-container');
        expect(chatContainer).not.toBeNull();

        const panelBtn = screen.getByTitle('View Game Panels (Minimap, Status, Crew)');
        expect(panelBtn.className).not.toContain('active');
        expect(chatBtn.className).toContain('active');

        fireEvent.click(panelBtn);
        expect(container.querySelector('.instance-chat-container')).toBeNull();
        expect(panelBtn.className).toContain('active');
    });
});
