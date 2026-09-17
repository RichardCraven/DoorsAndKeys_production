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

describe('Food Expired (Spoiled Provisions) Modal', () => {
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

    test('images export includes spoiled_rations asset', () => {
        expect(images.spoiled_rations).toBeDefined();
    });

    test('renders food-gone-bad modal with OK button and esoteric styling', () => {
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        const { getByText, queryByText, container } = render(<DungeonPage ref={pageRef} {...mockProps} />);
        
        act(() => {
            pageRef.current.setState({
                showFoodGoneBadPopup: true,
                foodGoneBadLimit: 300,
                foodGoneBadAmount: 102
            });
        });

        // Eyebrow / former header should NOT be present
        expect(queryByText(/PERISHABLE PROVISIONS/i)).toBeNull();

        // Title should be SPOILED PROVISIONS
        expect(getByText('SPOILED PROVISIONS')).toBeInTheDocument();

        // Limit and amount
        expect(getByText('300')).toBeInTheDocument();
        expect(getByText(/Food Lost to Decay/i)).toBeInTheDocument();

        // Modal content container and corner brackets
        const modal = container.querySelector('.food-gone-bad-modal');
        expect(modal).toBeInTheDocument();
        expect(container.querySelector('.food-gone-bad-card')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.top-left')).toBeInTheDocument();

        // Text-only OK button
        const btn = getByText('OK');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);

        expect(pageRef.current.state.showFoodGoneBadPopup).toBe(false);
    });

    test('auto-closes food gone bad modal after 6 seconds', () => {
        jest.useFakeTimers();
        const pageRef = React.createRef();
        const mockProps = createMockProps();
        render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                showFoodGoneBadPopup: true,
                foodGoneBadLimit: 250,
                foodGoneBadAmount: 38
            });
        });

        expect(pageRef.current.state.showFoodGoneBadPopup).toBe(true);

        act(() => {
            jest.advanceTimersByTime(6000);
        });

        expect(pageRef.current.state.showFoodGoneBadPopup).toBe(false);
        jest.useRealTimers();
    });
});
