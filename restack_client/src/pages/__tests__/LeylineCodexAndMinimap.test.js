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

describe('Leyline Conduits - Codex Entry and Minimap Path Display', () => {
    describe('Codex Entry Verification', () => {
        let CodexModalModule;
        beforeAll(() => {
            CodexModalModule = require('../../components/CodexModal');
        });

        test('CodexModal exports INTERACTABLES containing leyline_conduit and domain_node', () => {
            const fs = require('fs');
            const path = require('path');
            const codexSource = fs.readFileSync(path.resolve(__dirname, '../../components/CodexModal.js'), 'utf8');

            expect(codexSource).toContain("id: 'leyline_conduit'");
            expect(codexSource).toContain("id: 'domain_node'");
            expect(codexSource).toContain('Leyline Conduits & Domain Grid');
            expect(codexSource).toContain('Cross-Board Network Flow');
            expect(codexSource).toContain('Minimap Display');
            expect(codexSource).toContain('multicolored, glowing conduits');
            expect(codexSource).toContain('Anti-Pygmy Barrier');
        });
    });

    describe('Dungeon Minimap Multicolored Leyline Rendering', () => {
        let pageInstance;

        const createProps = (boardIndex = 0, orientation = 'A', levelId = 0) => ({
            boardManager: {
                tiles: [],
                currentBoard: { id: boardIndex, tiles: [] },
                refreshTiles: jest.fn(),
                playerTile: { location: [20, 20], boardIndex },
                currentOrientation: orientation,
                currentLevel: { id: levelId }
            },
            crewManager: { crew: [] },
            user: { _id: 'test-user' }
        });

        const setupPage = (boardIndex = 0, orientation = 'A', levelId = 0) => {
            const props = createProps(boardIndex, orientation, levelId);
            pageInstance = new DungeonPage(props);
            pageInstance.state = {
                ...pageInstance.state,
                inSuperboard: false,
                levelTracker: [{ id: levelId, active: true }],
                minimap: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ active: i === boardIndex })),
                leylines: []
            };
            pageInstance.isSectionCollapsed = () => false;
            pageInstance._isMounted = true;
        };

        test('getLeylineTrailForBoard detects tile-based leylines and constructs SVG segments', () => {
            setupPage(0, 'A', 0);

            const mockTiles = [];
            for (let idx = 0; idx < 225; idx++) {
                mockTiles.push({ id: idx, contains: null, isLeyline: false });
            }
            mockTiles[15].isLeyline = true;
            mockTiles[16].isLeyline = true;

            pageInstance.props.boardManager.tiles = mockTiles;
            pageInstance.props.boardManager.currentBoard.tiles = mockTiles;

            const trail = pageInstance.getLeylineTrailForBoard(0, 0, 'A');
            expect(trail).toBeDefined();
            expect(trail.segments.length).toBeGreaterThan(0);
            expect(trail.segments[0]).toMatch(/^[0-9.]+,[0-9.]+\s+[0-9.]+,[0-9.]+$/);
        });

        test('getLeylineTrailForBoard generates cross-board edge connectors for border transitions', () => {
            setupPage(4, 'A', 0);

            pageInstance.state.leylines = [
                [
                    { boardIndex: 4, levelId: 0, orientation: 'A', row: 22, col: 28 },
                    { boardIndex: 4, levelId: 0, orientation: 'A', row: 22, col: 29 },
                    { boardIndex: 5, levelId: 0, orientation: 'A', row: 22, col: 15 },
                    { boardIndex: 5, levelId: 0, orientation: 'A', row: 22, col: 16 }
                ]
            ];

            const trailBoard4 = pageInstance.getLeylineTrailForBoard(4, 0, 'A');
            expect(trailBoard4.edgeConnectors.length).toBeGreaterThan(0);
            const eastConnector = trailBoard4.edgeConnectors.find(c => c.x2 === 50);
            expect(eastConnector).toBeDefined();

            const trailBoard5 = pageInstance.getLeylineTrailForBoard(5, 0, 'A');
            expect(trailBoard5.edgeConnectors.length).toBeGreaterThan(0);
            const westConnector = trailBoard5.edgeConnectors.find(c => c.x1 === 0);
            expect(westConnector).toBeDefined();
        });

        test('getLeylineTrailForBoard anchors Domain Monolith and Node positions', () => {
            setupPage(0, 'A', 0);

            const mockTiles = [];
            for (let idx = 0; idx < 225; idx++) {
                mockTiles.push({ id: idx, contains: null, isLeyline: false });
            }
            mockTiles[30] = {
                id: 30,
                isLeyline: true,
                building: 'domain_monolith',
                contains: { type: 'building', subtype: 'domain_monolith' },
                activated: true
            };

            pageInstance.props.boardManager.tiles = mockTiles;
            pageInstance.props.boardManager.currentBoard.tiles = mockTiles;

            const trail = pageInstance.getLeylineTrailForBoard(0, 0, 'A');
            expect(trail.nodes.length).toBeGreaterThan(0);
            expect(trail.nodes[0].type).toBe('monolith');
            expect(typeof trail.nodes[0].x).toBe('number');
            expect(typeof trail.nodes[0].y).toBe('number');
        });

        test('renderMinimapSection renders leyline-trail-svg with multicolored linearGradient', () => {
            setupPage(0, 'A', 0);

            pageInstance.state.leylines = [
                [
                    { boardIndex: 0, levelId: 0, orientation: 'A', row: 18, col: 18 },
                    { boardIndex: 0, levelId: 0, orientation: 'A', row: 18, col: 19 }
                ]
            ];

            // Render with hideHeader: true to get minimapContent directly
            const minimapContent = pageInstance.renderMinimapSection({ hideHeader: true });
            expect(minimapContent).toBeDefined();

            const mapWrapper = minimapContent.props.children;
            const minimapTiles = mapWrapper.props.children[1];
            const board0Tile = minimapTiles[0];

            const children = React.Children.toArray(board0Tile.props.children);
            const leylineSvg = children.find(child => child && child.props && child.props.className === 'leyline-trail-svg');

            expect(leylineSvg).toBeDefined();
            expect(leylineSvg.props.viewBox).toBe('0 0 50 50');

            const defs = leylineSvg.props.children[0];
            expect(defs.type).toBe('defs');
            const gradient = defs.props.children[0];
            expect(gradient.props.id).toBe('leyline-grad-0');

            // Verify stop colors in the multicolored linearGradient
            const stops = gradient.props.children;
            expect(stops.length).toBe(5);
            expect(stops[0].props.stopColor).toBe('#00f0ff');
            expect(stops[1].props.stopColor).toBe('#a855f7');
            expect(stops[2].props.stopColor).toBe('#ec4899');
            expect(stops[3].props.stopColor).toBe('#f59e0b');
            expect(stops[4].props.stopColor).toBe('#10b981');
        });
    });
});
