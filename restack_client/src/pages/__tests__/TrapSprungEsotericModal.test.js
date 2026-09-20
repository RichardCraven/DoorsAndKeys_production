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
  CModal: ({ visible, children, className, onClose }) => visible ? (
    <div className={`modal ${className || ''}`} data-testid="cmodal">
      <div className="modal-dialog">
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  ) : null,
  CModalHeader: ({ children }) => <div>{children}</div>,
  CModalTitle: ({ children }) => <div>{children}</div>,
  CModalBody: ({ children }) => <div>{children}</div>,
  CModalFooter: ({ children }) => <div>{children}</div>
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DungeonPage from '../DungeonPage';
import * as images from '../../utils/images';

describe('Trap Sprung Esoteric Modal', () => {
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

    test('renders trap sprung popup with full esoteric styling and dismisses on button click', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container, getByText } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                showTrapPopup: true,
                trapResults: {
                    collectiveLevel: 3,
                    damageRange: '4-12',
                    keenEyeLevel: 2,
                    crewResults: [
                        {
                            name: 'Althea',
                            type: 'mage',
                            dexStat: 14,
                            d20Roll: 18,
                            keenEyeBonus: 3,
                            totalRoll: 35,
                            saved: true,
                            damageTaken: 0
                        },
                        {
                            name: 'Kael',
                            type: 'warrior',
                            dexStat: 8,
                            d20Roll: 4,
                            keenEyeBonus: 3,
                            totalRoll: 15,
                            saved: false,
                            damageTaken: 8
                        }
                    ]
                }
            });
        });

        // Overlay and Card
        const overlay = container.querySelector('.trap-popup-overlay');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveClass('ambush-popup-overlay');

        const card = container.querySelector('.trap-popup-card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveClass('ambush-popup-card');

        // Four esoteric card corners
        expect(container.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.top-right')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and Title
        expect(container.querySelector('.ambush-eyebrow')).toHaveTextContent('HAZARD DETONATED');
        expect(getByText('Trap Sprung!')).toBeInTheDocument();

        // Divider
        expect(container.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Trap emblem with image
        const emblemImg = container.querySelector('.trap-emblem-frame img');
        expect(emblemImg).toBeInTheDocument();
        expect(emblemImg.getAttribute('src')).toBe(images.trap);

        // Subtitle and damage range
        expect(getByText(/Your party triggered a hidden trap!/i)).toBeInTheDocument();
        expect(getByText(/Damage range: 4-12/i)).toBeInTheDocument();

        // Crew results
        expect(getByText('Althea')).toBeInTheDocument();
        expect(getByText('Dodged!')).toBeInTheDocument();
        expect(getByText('Kael')).toBeInTheDocument();
        expect(getByText('-8 HP')).toBeInTheDocument();

        // Keen Eye L2 badge
        expect(getByText(/KEEN EYE \(L2\): \+3 DEX SAVE BONUS APPLIED/i)).toBeInTheDocument();

        // Action button
        const continueBtn = getByText('Continue');
        expect(continueBtn.closest('button')).toHaveClass('ambush-fight-btn');
        expect(container.querySelector('.trap-shortcut-hint')).toHaveTextContent('Press [Enter] to Continue');

        // Dismiss clicking button
        fireEvent.click(continueBtn);
        expect(pageRef.current.state.showTrapPopup).toBe(false);
        expect(pageRef.current.state.trapResults).toBeNull();
    });

    test('dismisses trap sprung popup when clicking on the overlay backdrop', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                showTrapPopup: true,
                trapResults: {
                    collectiveLevel: 1,
                    damageRange: '2-6',
                    keenEyeLevel: 0,
                    crewResults: []
                }
            });
        });

        const overlay = container.querySelector('.trap-popup-overlay');
        expect(overlay).toBeInTheDocument();

        fireEvent.click(overlay);
        expect(pageRef.current.state.showTrapPopup).toBe(false);
    });
});
