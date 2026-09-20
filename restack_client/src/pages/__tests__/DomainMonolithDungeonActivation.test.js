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
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DungeonPage from '../DungeonPage';
import Tile from '../../components/tile';
import { storeMeta, getMeta } from '../../utils/session-handler';

describe('Dungeon 2x2 Domain Monolith Activation & Progress', () => {
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

    beforeEach(() => {
        try {
            storeMeta({ resolve: 100 });
        } catch (e) { }
    });

    const createDungeonMockProps = () => {
        // Create a 2x2 Domain Monolith at tiles [12, 13, 27, 28] on a 15x15 board
        const tiles = [];
        for (let i = 0; i < 225; i++) {
            tiles.push({
                id: i,
                index: i,
                contains: null,
                color: 'white',
                coordinates: [i % 15, Math.floor(i / 15)]
            });
        }

        // 2x2 Monolith setup:
        // Tile 12: Anchor (top-left)
        // Tile 13: top-right
        // Tile 27: bottom-left
        // Tile 28: bottom-right
        tiles[12].building = 'domain_monolith';
        tiles[12].vendorCell = 'anchor';
        tiles[12].vendorGroupId = 'monolith_group_1';
        tiles[12].vendorAnchorId = 12;
        tiles[12].contains = { subtype: 'domain_monolith', vendorCell: 'anchor', vendorGroupId: 'monolith_group_1', vendorAnchorId: 12 };

        tiles[13].building = 'domain_monolith';
        tiles[13].vendorCell = 'top_right';
        tiles[13].vendorGroupId = 'monolith_group_1';
        tiles[13].vendorAnchorId = 12;
        tiles[13].contains = { subtype: 'domain_monolith', vendorCell: 'top_right', vendorGroupId: 'monolith_group_1', vendorAnchorId: 12 };

        tiles[27].building = 'domain_monolith';
        tiles[27].vendorCell = 'bottom_left';
        tiles[27].vendorGroupId = 'monolith_group_1';
        tiles[27].vendorAnchorId = 12;
        tiles[27].contains = { subtype: 'domain_monolith', vendorCell: 'bottom_left', vendorGroupId: 'monolith_group_1', vendorAnchorId: 12 };

        tiles[28].building = 'domain_monolith';
        tiles[28].vendorCell = 'bottom_right';
        tiles[28].vendorGroupId = 'monolith_group_1';
        tiles[28].vendorAnchorId = 12;
        tiles[28].contains = { subtype: 'domain_monolith', vendorCell: 'bottom_right', vendorGroupId: 'monolith_group_1', vendorAnchorId: 12 };

        return {
            boardManager: {
                tiles,
                currentBoard: { tiles },
                playerTile: { location: [11, 0] },
                getIndexFromCoordinates: (loc) => (loc ? loc[1] * 15 + loc[0] : 0),
                getCoordinatesFromIndex: (idx) => [idx % 15, Math.floor(idx / 15)],
                refreshTiles: jest.fn(),
                handleFogOfWar: jest.fn(),
                getContainsType: (c) => typeof c === 'object' ? c?.type : c,
                getContainsSubtype: (c) => typeof c === 'object' ? (c?.subtype || c?.key) : c
            },
            inventoryManager: { items: [], inventory: [] },
            crewManager: { crew: [], initializeCrew: jest.fn() },
            saveUserData: jest.fn()
        };
    };

    test('attemptMonolithActivation on non-anchor quadrant resolves anchor and structureTileIds, and deducts 80 resolve', () => {
        const pageRef = React.createRef();
        const mockProps = createDungeonMockProps();
        render(<DungeonPage ref={pageRef} {...mockProps} />);

        const page = pageRef.current;
        const nonAnchorTile = mockProps.boardManager.tiles[28]; // bottom-right quadrant

        act(() => {
            page.attemptMonolithActivation(nonAnchorTile);
        });

        // 80 Resolve deducted from 100 -> 20
        const meta = getMeta();
        expect(meta.resolve).toBe(20);

        // monolithActivationState properly resolved
        const state = page.state.monolithActivationState;
        expect(state).toBeDefined();
        expect(state.tileId).toBe(28);
        expect(state.anchorTileId).toBe(12);
        expect(state.structureTileIds).toEqual(expect.arrayContaining([12, 13, 27, 28]));
        expect(state.duration).toBe(10000);

        if (page._monolithTimer) {
            clearInterval(page._monolithTimer);
            page._monolithTimer = null;
        }
    });

    test('Tile renders MonolithBottomProgressBar spanning 2x2 when anchor receives monolithActivationProgress', () => {
        const { container } = render(
            <Tile
                id={12}
                index={12}
                building="domain_monolith"
                contains={{ subtype: 'domain_monolith', vendorCell: 'anchor', vendorGroupId: 'monolith_group_1' }}
                vendorCell="anchor"
                vendorGroupId="monolith_group_1"
                vendorAnchorId={12}
                monolithActivationProgress={0.45}
            />
        );

        // Find bottom progress bar
        const allDivs = container.querySelectorAll('div');
        const progressBarContainer = Array.from(allDivs).find(el => {
            const style = el.getAttribute('style') || '';
            return style.includes('bottom: calc(-100% - 12px)') && style.includes('right: -100%');
        });

        expect(progressBarContainer).toBeDefined();

        // Progress bar width is 45%
        const fillBar = progressBarContainer.querySelector('div');
        expect(fillBar.getAttribute('style')).toContain('width: 45%');
    });

    test('handleActivateGenerator in dungeon sets ownedByPlayer, activated, affiliation, and territory on all 2x2 member tiles', () => {
        const pageRef = React.createRef();
        const mockProps = createDungeonMockProps();
        render(<DungeonPage ref={pageRef} {...mockProps} />);

        const page = pageRef.current;
        const anchorTile = mockProps.boardManager.tiles[12];
        page.state.activeGeneratorTile = anchorTile;

        act(() => {
            page.handleActivateGenerator();
        });

        // All 4 member tiles (12, 13, 27, 28) should be player-owned and activated
        [12, 13, 27, 28].forEach(id => {
            const t = mockProps.boardManager.tiles[id];
            expect(t.ownedByPlayer).toBe(true);
            expect(t.affiliation).toBe('player');
            expect(t.isHostile).toBe(false);
            expect(t.territory).toBe('player');
            expect(t.contains.activated).toBe(true);
            expect(t.contains.affiliation).toBe('player');
            expect(t.contains.ownedByPlayer).toBe(true);
        });

        // Verifies fog of war refresh was called
        expect(mockProps.boardManager.handleFogOfWar).toHaveBeenCalled();
        expect(mockProps.boardManager.refreshTiles).toHaveBeenCalled();
    });
});
