jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));
jest.mock('@coreui/icons-react', () => {
  return function MockCIcon() {
    return <span data-testid="cicon" />;
  };
});
jest.mock('@coreui/react', () => ({
  CButton: 'CButton',
  CFormSelect: 'CFormSelect',
  CFormInput: 'CFormInput',
  CModal: ({ visible, children, className }) => visible ? (
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

describe('Domain Activation & Overtake Esoteric Modals', () => {
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

    test('renders domain activation failed modal with full esoteric styling and dismisses on button click', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container, getByText } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                monolithActivationResultModal: {
                    success: false,
                    message: 'Attunement Failed! The monolith rejected your energy. Subsequent attempts will have a 75.0% chance of failing for 24 hours.'
                }
            });
        });

        // Overlay and Card
        const overlay = container.querySelector('.domain-activation-popup-overlay');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveClass('ambush-popup-overlay');

        const card = container.querySelector('.domain-activation-popup-card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveClass('ambush-popup-card');

        // Four esoteric card corners
        expect(card.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.top-right')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and Title
        expect(card.querySelector('.ambush-eyebrow')).toHaveTextContent('LEY-LINE REJECTION');
        expect(card.querySelector('.ambush-title')).toHaveTextContent('ATTUNEMENT FAILED');

        // Diamond divider
        expect(card.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Emblem frame
        const emblemFrame = card.querySelector('.domain-activation-emblem-frame');
        expect(emblemFrame).toBeInTheDocument();

        // Narrative subtitle
        expect(card.querySelector('.ambush-subtitle')).toHaveTextContent(/Attunement Failed! The monolith rejected your energy/i);

        // Penalty Plaque
        const penaltyPlaque = card.querySelector('.domain-penalty-plaque');
        expect(penaltyPlaque).toBeInTheDocument();
        expect(penaltyPlaque).toHaveTextContent(/LEY-LINE DESTABILIZATION/i);

        // Action button
        const button = getByText('ACKNOWLEDGE');
        expect(button.closest('button')).toHaveClass('ambush-fight-btn');

        // Shortcut hint
        expect(card.querySelector('.ambush-shortcut-hint')).toHaveTextContent('Press [Enter] or [Esc] to Continue');

        // Dismiss on button click
        fireEvent.click(button);
        expect(pageRef.current.state.monolithActivationResultModal).toBeNull();
    });

    test('dismisses domain activation failed popup when clicking the overlay backdrop', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                monolithActivationResultModal: {
                    success: false,
                    message: 'Attunement Failed! The monolith rejected your energy.'
                }
            });
        });

        const overlay = container.querySelector('.domain-activation-popup-overlay');
        expect(overlay).toBeInTheDocument();

        fireEvent.click(overlay);
        expect(pageRef.current.state.monolithActivationResultModal).toBeNull();
    });

    test('dismisses domain activation failed popup when pressing Enter or Escape', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        render(<DungeonPage ref={pageRef} {...mockProps} />);

        // Test Escape
        act(() => {
            pageRef.current.setState({
                monolithActivationResultModal: {
                    success: false,
                    message: 'Attunement Failed!'
                }
            });
        });
        expect(pageRef.current.state.monolithActivationResultModal).not.toBeNull();

        act(() => {
            pageRef.current.keyDownHandler({
                key: 'Escape',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            });
        });
        expect(pageRef.current.state.monolithActivationResultModal).toBeNull();

        // Test Enter
        act(() => {
            pageRef.current.setState({
                monolithActivationResultModal: {
                    success: false,
                    message: 'Attunement Failed!'
                }
            });
        });
        expect(pageRef.current.state.monolithActivationResultModal).not.toBeNull();

        act(() => {
            pageRef.current.keyDownHandler({
                key: 'Enter',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            });
        });
        expect(pageRef.current.state.monolithActivationResultModal).toBeNull();
    });

    test('renders domain activation success modal with harmonious esoteric styling', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container, getByText } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                monolithActivationResultModal: {
                    success: true,
                    message: 'Attunement Successful! The Domain Monolith is now generating territory for you.'
                }
            });
        });

        const card = container.querySelector('.domain-activation-popup-card');
        expect(card).toBeInTheDocument();

        // Eyebrow and Title
        expect(card.querySelector('.ambush-eyebrow')).toHaveTextContent('DOMAIN HARMONIZED');
        expect(card.querySelector('.ambush-title')).toHaveTextContent('ATTUNEMENT SUCCESSFUL');

        // Action button
        expect(getByText('CLAIM TERRITORY')).toBeInTheDocument();

        // Penalty plaque must NOT be rendered on success
        expect(card.querySelector('.domain-penalty-plaque')).toBeNull();
    });

    test('renders overtake failed modal with command resisted styling', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                monolithActivationResultModal: {
                    success: false,
                    message: 'Overtake Failed! The generator resisted your command. Subsequent overtake attempts on this structure will suffer a 75.0% failure rate for 24 hours.'
                }
            });
        });

        const card = container.querySelector('.domain-activation-popup-card');
        expect(card).toBeInTheDocument();

        expect(card.querySelector('.ambush-eyebrow')).toHaveTextContent('COMMAND RESISTED');
        expect(card.querySelector('.ambush-title')).toHaveTextContent('OVERTAKE FAILED');
    });

    test('renders floating monolith attunement progress HUD during active attunement', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                monolithActivationState: {
                    tileId: 42,
                    anchorTileId: 40,
                    structureTileIds: [40, 41, 55, 56],
                    defName: 'Domain Monolith',
                    imageKey: 'domain_monolith',
                    startTime: Date.now() - 3000,
                    duration: 10000,
                    progress: 0.3
                }
            });
        });

        const hud = container.querySelector('[data-testid="monolith-attunement-hud"]');
        expect(hud).toBeInTheDocument();
        expect(hud).toHaveTextContent(/ATTUNING: DOMAIN MONOLITH/i);
        expect(hud).toHaveTextContent(/30%/);
        expect(hud).toHaveTextContent(/remaining/i);
    });
});
