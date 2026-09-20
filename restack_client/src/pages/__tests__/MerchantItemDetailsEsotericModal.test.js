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

describe('Merchant Item Details Esoteric Modal', () => {
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

    const createMockProps = (customInventory = []) => {
        const inventory = [...customInventory];
        return {
            boardManager: {
                establishAvailableItems: jest.fn(),
                currentBoard: { tiles: [] },
                tiles: [],
                planes: [{ front: { miniboards: [{ tiles: [] }] } }],
                getCoordinatesFromIndex: () => [0, 0]
            },
            inventoryManager: {
                allItems: {
                    minor_health_potion: { name: 'Minor Health Potion', icon: 'potion', type: 'consumable', description: 'Restores health.' },
                    major_health_potion: { name: 'Major Health Potion', icon: 'potion', type: 'consumable', description: 'Restores large health.' },
                    minor_key: { name: 'Minor Key', icon: 'key', type: 'key', description: 'Unlocks minor doors.' },
                    automaton: { name: 'Automaton', icon: 'automaton', type: 'item', description: 'Mechanical helper.' },
                    iron_sword: { name: 'Iron Sword', icon: 'sword', type: 'weapon', subtype: 'Sword', tier: 1, damage: 5, description: 'A sturdy iron blade.' }
                },
                weapons: { iron_sword: true },
                armor: {},
                magical: {},
                inventory: inventory,
                gold: 500,
                shimmering_dust: 50,
                addItem: jest.fn((item) => inventory.push(item)),
                removeItemByIndex: jest.fn((idx) => inventory.splice(idx, 1))
            },
            crewManager: {
                crew: [
                    { name: 'Alden', type: 'soldier', level: 1 }
                ],
                initializeCrew: jest.fn()
            },
            saveUserData: jest.fn().mockResolvedValue(true)
        };
    };

    test('renders interactive icon cues in Merchant Stock and unequipped items', () => {
        const unequippedItem = {
            name: 'Worn Dagger',
            icon: 'dagger',
            type: 'weapon',
            subtype: 'Dagger',
            tier: 1,
            damage: 3,
            description: 'A modest thrusting blade.',
            equippedBy: null
        };
        const mockProps = createMockProps([unequippedItem]);
        const pageRef = React.createRef();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                showModal: true,
                modalType: 'Merchant'
            });
        });

        const iconBtns = container.querySelectorAll('.merchant-item-icon-btn');
        expect(iconBtns.length).toBeGreaterThan(0);
        
        // Check that inspect cue is rendered inside icon buttons
        const inspectCues = container.querySelectorAll('.merchant-icon-inspect-cue');
        expect(inspectCues.length).toBeGreaterThan(0);
    });

    test('clicking an item icon in Merchant Stock opens the esoteric details modal', () => {
        const mockProps = createMockProps([]);
        const pageRef = React.createRef();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                showModal: true,
                modalType: 'Merchant'
            });
        });

        // Click first item icon in Merchant Stock
        const firstStockIconBtn = container.querySelector('.merchant-screen .vendor-panel:first-of-type .merchant-item-icon-btn');
        expect(firstStockIconBtn).toBeInTheDocument();

        fireEvent.click(firstStockIconBtn);

        // Overlay and Card must render with esoteric styling
        const overlay = container.querySelector('.esoteric-item-details-overlay');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveClass('ambush-popup-overlay');

        const card = container.querySelector('.esoteric-item-details-card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveClass('ambush-popup-card');

        // Four corner brackets
        expect(card.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.top-right')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and Title
        expect(card.querySelector('.ambush-eyebrow')).toHaveTextContent('ITEM SPECIFICATION');
        expect(card.querySelector('.ambush-title')).toHaveTextContent('Minor Health Potion');

        // Divider
        expect(card.querySelector('.ambush-divider')).toBeInTheDocument();

        // Portrait frame and badge
        expect(card.querySelector('.ambush-portrait-frame')).toBeInTheDocument();
        expect(card.querySelector('.ambush-badge')).toBeInTheDocument();

        // Stats grid
        const statsGrid = card.querySelector('.ambush-stats-grid');
        expect(statsGrid).toBeInTheDocument();
        expect(card.querySelector('.ambush-stat-item.stat-gold')).toHaveTextContent('20 Gold');

        // Buy and Dismiss buttons
        const buyBtn = card.querySelector('.ambush-fight-btn.buy-action');
        expect(buyBtn).toBeInTheDocument();
        expect(buyBtn).toHaveTextContent('Buy Item');

        const dismissBtn = card.querySelector('.ambush-fight-btn.dismiss-action');
        expect(dismissBtn).toBeInTheDocument();
        expect(dismissBtn).toHaveTextContent('Dismiss');

        // Dismiss via Dismiss button
        fireEvent.click(dismissBtn);
        expect(container.querySelector('.esoteric-item-details-overlay')).not.toBeInTheDocument();
    });

    test('dismissing the esoteric details modal via close button and Escape key', () => {
        const mockProps = createMockProps([]);
        const pageRef = React.createRef();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                showModal: true,
                modalType: 'Merchant'
            });
        });

        // Click first stock item icon
        const firstStockIconBtn = container.querySelector('.merchant-screen .vendor-panel:first-of-type .merchant-item-icon-btn');
        fireEvent.click(firstStockIconBtn);

        expect(container.querySelector('.esoteric-item-details-card')).toBeInTheDocument();

        // Dismiss via top-right '×' close button
        const closeBtn = container.querySelector('.esoteric-item-close-btn');
        expect(closeBtn).toBeInTheDocument();
        fireEvent.click(closeBtn);

        expect(container.querySelector('.esoteric-item-details-card')).not.toBeInTheDocument();

        // Re-open and dismiss via Escape key
        fireEvent.click(container.querySelector('.merchant-screen .vendor-panel:first-of-type .merchant-item-icon-btn'));
        expect(container.querySelector('.esoteric-item-details-card')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(container.querySelector('.esoteric-item-details-card')).not.toBeInTheDocument();
    });

    test('clicking an item icon in Your Unequipped Items opens modal with sell option', () => {
        const unequippedItem = {
            name: 'Steel Broadsword',
            icon: 'broadsword',
            type: 'weapon',
            subtype: 'Sword',
            tier: 2,
            damage: 12,
            description: 'A sharp, heavy blade crafted by master smiths.',
            equippedBy: null
        };
        const mockProps = createMockProps([unequippedItem]);
        const pageRef = React.createRef();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                showModal: true,
                modalType: 'Merchant'
            });
        });

        // Click the unequipped item's icon button (in the second panel)
        const unequippedIconBtn = container.querySelector('.merchant-screen .vendor-panel:nth-of-type(2) .merchant-item-icon-btn');
        expect(unequippedIconBtn).toBeInTheDocument();

        fireEvent.click(unequippedIconBtn);

        // Verify card contents
        const card = container.querySelector('.esoteric-item-details-card');
        expect(card).toBeInTheDocument();
        expect(card.querySelector('.ambush-title')).toHaveTextContent('Steel Broadsword');
        expect(card.querySelector('.ambush-stat-item.stat-atk')).toHaveTextContent('+12');
        expect(card.querySelector('.ambush-stat-item.stat-gold')).toHaveTextContent('Liquidation Value');

        // Sell action button should be present
        const sellBtn = card.querySelector('.ambush-fight-btn.sell-action');
        expect(sellBtn).toBeInTheDocument();
        expect(sellBtn).toHaveTextContent('Sell Item');

        // Click Sell button and verify removeItemByIndex called
        fireEvent.click(sellBtn);
        expect(mockProps.inventoryManager.removeItemByIndex).toHaveBeenCalled();
        expect(container.querySelector('.esoteric-item-details-card')).not.toBeInTheDocument();
    });

    test('buying an item from the esoteric details modal deducts gold and closes modal', () => {
        const mockProps = createMockProps([]);
        const pageRef = React.createRef();
        const { container } = render(<DungeonPage ref={pageRef} {...mockProps} />);

        act(() => {
            pageRef.current.setState({
                showModal: true,
                modalType: 'Merchant'
            });
        });

        // Inspect first item
        const firstStockIconBtn = container.querySelector('.merchant-screen .vendor-panel:first-of-type .merchant-item-icon-btn');
        fireEvent.click(firstStockIconBtn);

        const card = container.querySelector('.esoteric-item-details-card');
        const buyBtn = card.querySelector('.ambush-fight-btn.buy-action');
        const initialGold = mockProps.inventoryManager.gold;

        fireEvent.click(buyBtn);

        // Gold should be deducted (20 gold for Minor Health Potion)
        expect(mockProps.inventoryManager.gold).toBe(initialGold - 20);
        expect(container.querySelector('.esoteric-item-details-card')).not.toBeInTheDocument();
    });
});
