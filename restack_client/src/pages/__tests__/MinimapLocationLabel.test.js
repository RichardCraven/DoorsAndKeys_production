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

describe('Minimap Section Header Location Label', () => {
    let pageInstance;

    const createProps = (boardIndex = 0, orientation = 'A', levelId = 0) => ({
        boardManager: {
            tiles: [],
            currentBoard: { id: boardIndex, tiles: [] },
            refreshTiles: jest.fn(),
            playerTile: { location: [7, 7], boardIndex },
            currentOrientation: orientation,
            currentLevel: { id: levelId }
        },
        crewManager: { crew: [] },
        user: { _id: 'test-user' }
    });

    const setupPage = (boardIndex = 0, orientation = 'A', levelId = 0, collapsed = false) => {
        const props = createProps(boardIndex, orientation, levelId);
        pageInstance = new DungeonPage(props);
        pageInstance.state = {
            ...pageInstance.state,
            inSuperboard: false,
            levelTracker: [{ id: levelId, active: true }],
            minimap: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ active: i === boardIndex }))
        };
        pageInstance.isSectionCollapsed = (id) => id === 'minimap' ? collapsed : false;
        pageInstance._isMounted = true;
    };

    test('renders location label Lvl 0 F NW with tooltip for board 0 on Front side', () => {
        setupPage(0, 'A', 0, false);
        const section = pageInstance.renderMinimapSection();
        
        // Find header element and location label
        const header = section.props.children[0];
        const titleWrapper = header.props.children;
        const locationSpan = titleWrapper.props.children[1];

        expect(locationSpan).toBeTruthy();
        expect(locationSpan.props.children).toBe('Lvl 0 F NW');
        expect(locationSpan.props.title).toBe('Level 0, Front Side, North West area');
    });

    test('renders all 9 board area names correctly (NW, N, NE, W, Middle, E, SW, S, SE)', () => {
        const expected = [
            { short: 'NW', verbose: 'North West area' },
            { short: 'N', verbose: 'North area' },
            { short: 'NE', verbose: 'North East area' },
            { short: 'W', verbose: 'West area' },
            { short: 'Middle', verbose: 'Middle area' },
            { short: 'E', verbose: 'East area' },
            { short: 'SW', verbose: 'South West area' },
            { short: 'S', verbose: 'South area' },
            { short: 'SE', verbose: 'South East area' }
        ];

        expected.forEach((exp, idx) => {
            setupPage(idx, 'F', 2, false);
            const section = pageInstance.renderMinimapSection();
            const header = section.props.children[0];
            const titleWrapper = header.props.children;
            const locationSpan = titleWrapper.props.children[1];

            expect(locationSpan.props.children).toBe(`Lvl 2 F ${exp.short}`);
            expect(locationSpan.props.title).toBe(`Level 2, Front Side, ${exp.verbose}`);
        });
    });

    test('renders Back Side orientation correctly (B and Back Side)', () => {
        setupPage(4, 'B', 1, false);
        const section = pageInstance.renderMinimapSection();
        const header = section.props.children[0];
        const titleWrapper = header.props.children;
        const locationSpan = titleWrapper.props.children[1];

        expect(locationSpan.props.children).toBe('Lvl 1 B Middle');
        expect(locationSpan.props.title).toBe('Level 1, Back Side, Middle area');
    });

    test('does not render location label when minimap is collapsed', () => {
        setupPage(0, 'A', 0, true);
        const section = pageInstance.renderMinimapSection();
        const header = section.props.children[0];
        const titleWrapper = header.props.children;
        const locationSpan = titleWrapper.props.children[1];

        expect(locationSpan).toBeFalsy();
    });
});
