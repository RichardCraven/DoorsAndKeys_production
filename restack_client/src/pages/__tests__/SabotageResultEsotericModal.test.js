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

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DungeonPage from '../DungeonPage';

describe('Sabotage Result Esoteric Modal', () => {
    let originalComponentDidMount;
    let originalComponentWillMount;

    beforeAll(() => {
        originalComponentDidMount = DungeonPage.prototype.componentDidMount;
        originalComponentWillMount = DungeonPage.prototype.UNSAFE_componentWillMount;
        DungeonPage.prototype.componentDidMount = jest.fn();
        DungeonPage.prototype.UNSAFE_componentWillMount = jest.fn();
    });

    afterAll(() => {
        DungeonPage.prototype.componentDidMount = originalComponentDidMount;
        DungeonPage.prototype.UNSAFE_componentWillMount = originalComponentWillMount;
    });

    const createMockProps = () => ({
        boardManager: {
            establishAvailableItems: jest.fn(),
            currentBoard: { tiles: [] },
            tiles: [],
            planes: [{ front: { miniboards: [{ tiles: [] }] } }],
            getCoordinatesFromIndex: () => [0, 0]
        },
        inventoryManager: {
            items: [],
            inventory: []
        },
        crewManager: {
            crew: [],
            initializeCrew: jest.fn()
        },
        saveUserData: jest.fn()
    });

    test('renders Sabotage Failed popup with full esoteric styling and dismisses on button click', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container, getByText } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                sabotageResultModal: {
                    success: false,
                    message: 'Sabotage Failed! The enemy sentries repelled your attempt.'
                }
            });
        });

        // Overlay and Card
        const overlay = container.querySelector('.sabotage-result-popup-overlay');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveClass('ambush-popup-overlay');

        const card = container.querySelector('.sabotage-result-popup-card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveClass('ambush-popup-card');

        // Four metallic corner brackets
        expect(container.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.top-right')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and Title
        expect(container.querySelector('.ambush-eyebrow')).toHaveTextContent('DETECTION & REPEL');
        expect(getByText('SABOTAGE FAILED')).toBeInTheDocument();

        // Diamond Divider
        expect(container.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Sabotage emblem frame
        expect(container.querySelector('.sabotage-emblem-frame')).toBeInTheDocument();

        // Subtitle message
        expect(getByText('Sabotage Failed! The enemy sentries repelled your attempt.')).toBeInTheDocument();

        // Action button with CONTINUE text
        const continueBtn = container.querySelector('.ambush-fight-btn');
        expect(continueBtn).toBeInTheDocument();
        expect(continueBtn).toHaveTextContent('CONTINUE');

        // Shortcut hint
        expect(container.querySelector('.ambush-shortcut-hint')).toHaveTextContent('Press [Enter] or [Esc] to Continue');

        // Dismiss modal via button click
        act(() => {
            fireEvent.click(continueBtn);
        });

        expect(pageRef.current.state.sabotageResultModal).toBeNull();
    });

    test('dismisses Sabotage Result popup on Escape or Enter key', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        render(<DungeonPage ref={pageRef} {...mockProps} />);

        // Test Escape
        act(() => {
            pageRef.current.setState({
                sabotageResultModal: {
                    success: false,
                    message: 'Sabotage Failed! The enemy sentries repelled your attempt.'
                }
            });
        });

        expect(pageRef.current.state.sabotageResultModal).not.toBeNull();

        act(() => {
            pageRef.current.keyDownHandler({
                key: 'Escape',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            });
        });

        expect(pageRef.current.state.sabotageResultModal).toBeNull();

        // Test Enter
        act(() => {
            pageRef.current.setState({
                sabotageResultModal: {
                    success: false,
                    message: 'Sabotage Failed! The enemy sentries repelled your attempt.'
                }
            });
        });

        expect(pageRef.current.state.sabotageResultModal).not.toBeNull();

        act(() => {
            pageRef.current.keyDownHandler({
                key: 'Enter',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            });
        });

        expect(pageRef.current.state.sabotageResultModal).toBeNull();
    });

    test('dismisses Sabotage Result popup on overlay backdrop click', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                sabotageResultModal: {
                    success: false,
                    message: 'Sabotage Failed! The enemy sentries repelled your attempt.'
                }
            });
        });

        const overlay = container.querySelector('.sabotage-result-popup-overlay');
        expect(overlay).toBeInTheDocument();

        fireEvent.click(overlay);
        expect(pageRef.current.state.sabotageResultModal).toBeNull();
    });

    test('renders Sabotage Successful popup with emerald esoteric styling', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container, getByText } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                sabotageResultModal: {
                    success: true,
                    message: 'Sabotage Successful! The enemy outpost has been disabled for 30 minutes.'
                }
            });
        });

        expect(container.querySelector('.ambush-eyebrow')).toHaveTextContent('SUBTERFUGE COMPLETED');
        expect(getByText('SABOTAGE SUCCESSFUL')).toBeInTheDocument();
        expect(getByText('Sabotage Successful! The enemy outpost has been disabled for 30 minutes.')).toBeInTheDocument();
    });
});
