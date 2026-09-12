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
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import DungeonPage from '../DungeonPage';

describe('Pocket Dimension Enemy Resource Generator Conversion', () => {
    let pageInstance;
    let superboard;
    let miniboards;
    let enemySawmillAnchor;
    let enemySawmillTiles;

    beforeEach(() => {
        pageInstance = new DungeonPage({
            crewManager: { crew: [] },
            inventoryManager: { inventory: [] }
        });

        miniboards = [];
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const tiles = [];
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                const col = tIdx % 15;
                const row = Math.floor(tIdx / 15);
                tiles.push({
                    type: 'board-tile',
                    id: mbIdx * 225 + tIdx,
                    coordinates: [col, row],
                    contains: { type: 'empty_space', subtype: null },
                    color: '#6b6057'
                });
            }
            miniboards.push({ id: mbIdx, name: `mb_${mbIdx}`, tiles });
        }
        superboard = { miniboards, floorTexture: 'ground_grey' };

        // Place 2x2 enemy Sawmill at miniboard 4 (anchor at globalX=20, globalY=20 => local col=5, row=5)
        const mbIdx = 4;
        const tIdx0 = 5 * 15 + 5;
        const tIdx1 = 5 * 15 + 6;
        const tIdx2 = 6 * 15 + 5;
        const tIdx3 = 6 * 15 + 6;

        const makeSawmillTile = (id, role, gx, gy) => ({
            id,
            building: 'sawmill',
            image: 'buildable_sawmill',
            affiliation: 'hostile',
            isHostile: true,
            globalX: gx,
            globalY: gy,
            vendorGroupId: 'sawmill_group_1',
            vendorCell: role,
            generatorData: { owned: false, affiliation: 'hostile', isHostile: true, activated: true, key: 'sawmill', resource: 'Wood', rate: 5 },
            contains: {
                type: 'building',
                subtype: 'sawmill',
                building: 'sawmill',
                affiliation: 'hostile',
                isHostile: true,
                vendorGroupId: 'sawmill_group_1',
                vendorCell: role,
                generatorData: { owned: false, affiliation: 'hostile', isHostile: true, activated: true, key: 'sawmill', resource: 'Wood', rate: 5 }
            }
        });

        enemySawmillAnchor = makeSawmillTile(tIdx0, 'anchor', 20, 20);
        const tile1 = makeSawmillTile(tIdx1, 'top_right', 21, 20);
        const tile2 = makeSawmillTile(tIdx2, 'bottom_left', 20, 21);
        const tile3 = makeSawmillTile(tIdx3, 'bottom_right', 21, 21);

        miniboards[mbIdx].tiles[tIdx0] = enemySawmillAnchor;
        miniboards[mbIdx].tiles[tIdx1] = tile1;
        miniboards[mbIdx].tiles[tIdx2] = tile2;
        miniboards[mbIdx].tiles[tIdx3] = tile3;

        enemySawmillTiles = [enemySawmillAnchor, tile1, tile2, tile3];

        pageInstance.props = {
            boardManager: {
                dungeon: {
                    superboards: {
                        pocket_plains: superboard
                    }
                },
                playerTile: { location: [5, 4], boardIndex: 4 },
                getIndexFromCoordinates: jest.fn(() => 0),
                getCoordinatesFromIndex: jest.fn(() => [0, 0]),
                getContainsType: (c) => typeof c === 'object' ? c?.type : c,
                getContainsSubtype: (c) => typeof c === 'object' ? (c?.subtype || c?.key) : c,
                refreshTiles: jest.fn()
            },
            crewManager: { crew: [] },
            inventoryManager: { inventory: [] }
        };

        pageInstance.state = {
            ...pageInstance.state,
            isLoadingDungeon: false,
            inSuperboard: true,
            isInPocketDimension: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 20, gy: 19 },
            superboardViewMinX: 15,
            superboardViewMinY: 15,
            dungeon: pageInstance.props.boardManager.dungeon,
            pocketFreeWill: 50,
            tileSize: 40,
            showGeneratorModal: true,
            activeGeneratorTile: enemySawmillAnchor
        };

        pageInstance.setState = jest.fn((patch, cb) => {
            Object.assign(pageInstance.state, patch);
            if (cb) cb();
        });
        pageInstance.displayMessage = jest.fn();
        pageInstance.updateSuperboardViewport = jest.fn();
        pageInstance.getTotalPlayerDomainCount = jest.fn(() => 25); // cap = 5
        pageInstance.getPocketActiveResourceGeneratorsCount = jest.fn(() => 0); // 0 active
    });

    afterEach(() => {
        cleanup();
        if (pageInstance._playerClaimInterval) {
            clearInterval(pageInstance._playerClaimInterval);
            pageInstance._playerClaimInterval = null;
        }
    });

    test('1. Interacting with enemy resource generator displays CONVERT button instead of ACTIVATE', () => {
        const modalJSX = pageInstance.render();
        const { container } = render(<div>{modalJSX}</div>);

        // Verify status displays Active (Enemy)
        expect(container.textContent).toContain('Active (Enemy)');

        // Verify button says CONVERT
        const convertBtn = screen.getByRole('button', { name: /^CONVERT$/i });
        expect(convertBtn).toBeInTheDocument();
        expect(convertBtn.textContent).toBe('CONVERT');

        // Verify it does NOT say ACTIVATE SAWMILL
        expect(screen.queryByRole('button', { name: /ACTIVATE/i })).not.toBeInTheDocument();
    });

    test('2. Clicking CONVERT deducts 5 Free Will and initiates a 10-second conversion', () => {
        pageInstance.startClaimingPocketOutpost = jest.fn(pageInstance.startClaimingPocketOutpost);
        const modalJSX = pageInstance.render();
        render(<div>{modalJSX}</div>);

        const convertBtn = screen.getByRole('button', { name: /^CONVERT$/i });
        fireEvent.click(convertBtn);

        // Verify startClaimingPocketOutpost was called
        expect(pageInstance.startClaimingPocketOutpost).toHaveBeenCalledWith(enemySawmillAnchor);

        // Verify 5 Free Will deducted
        expect(pageInstance.state.pocketFreeWill).toBe(45);

        // Verify convertingTarget set with 10s duration
        expect(enemySawmillAnchor.convertingTarget).toBeDefined();
        expect(enemySawmillAnchor.convertingTarget.duration).toBe(10000);
        expect(enemySawmillAnchor.convertingTarget.isPlayerClaim).toBe(true);

        // Verify user received converting message
        expect(pageInstance.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining('Converting enemy Sawmill')
        );
    });

    test('3. Advancing time by 10 seconds completes conversion to friendly and active', () => {
        jest.useFakeTimers();

        pageInstance.startClaimingPocketOutpost(enemySawmillAnchor);

        // Still converting at 5 seconds
        jest.advanceTimersByTime(5000);
        expect(enemySawmillAnchor.affiliation).toBe('hostile');
        expect(enemySawmillAnchor.convertingTarget).toBeDefined();

        // Complete the remaining 5 seconds
        jest.advanceTimersByTime(5100);

        // All quadrants converted to friendly and owned
        enemySawmillTiles.forEach(t => {
            expect(t.affiliation).toBe('friendly');
            expect(t.placedBy).toBe('player');
            expect(t.ownedByPlayer).toBe(true);
            expect(t.isHostile).toBeUndefined();
            expect(t.generatorData.activated).toBe(true);
            expect(t.generatorData.owned).toBe(true);
            expect(t.generatorData.cycleIntervalSec).toBe(10);
            expect(t.convertingTarget).toBeUndefined();
        });

        expect(pageInstance.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining('Successfully converted enemy Sawmill')
        );

        jest.useRealTimers();
    });

    test('4. Moving away (>2.5 tiles) cancels the conversion', () => {
        jest.useFakeTimers();

        pageInstance.startClaimingPocketOutpost(enemySawmillAnchor);
        expect(enemySawmillAnchor.convertingTarget).toBeDefined();

        // Player moves away
        pageInstance.state.superboardPlayerPos = { gx: 30, gy: 30 };
        jest.advanceTimersByTime(200);

        // Conversion cancelled
        expect(enemySawmillAnchor.convertingTarget).toBeUndefined();
        expect(enemySawmillAnchor.affiliation).toBe('hostile');
        expect(pageInstance.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining('Conversion cancelled')
        );

        jest.useRealTimers();
    });

    test('5. When influence capacity is exceeded, CONVERT button is disabled and displays threshold message', () => {
        pageInstance.getTotalPlayerDomainCount = jest.fn(() => 5); // maxCap = 1
        pageInstance.getPocketActiveResourceGeneratorsCount = jest.fn(() => 1); // 1 active => 1 >= 1 cap reached

        const modalJSX = pageInstance.render();
        render(<div>{modalJSX}</div>);

        const thresholdBtn = screen.getByRole('button', { name: /INFLUENCE THRESHOLD NOT REACHED/i });
        expect(thresholdBtn).toBeInTheDocument();
        expect(thresholdBtn).toBeDisabled();

        // Attempting to call startClaimingPocketOutpost directly also prevents conversion
        pageInstance.startClaimingPocketOutpost(enemySawmillAnchor);
        expect(pageInstance.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining('Influence threshold not reached')
        );
        expect(enemySawmillAnchor.convertingTarget).toBeUndefined();
    });

    test('6. handleGeneratorModalPrimaryAction triggers 10s conversion instead of instantaneous activation', () => {
        jest.useFakeTimers();

        pageInstance.handleGeneratorModalPrimaryAction();

        // Free will deducted and convertingTarget initiated
        expect(pageInstance.state.pocketFreeWill).toBe(45);
        expect(enemySawmillAnchor.convertingTarget).toBeDefined();
        expect(enemySawmillAnchor.convertingTarget.duration).toBe(10000);

        // Not instantly friendly
        expect(enemySawmillAnchor.affiliation).toBe('hostile');

        // After 10 seconds, finishes
        jest.advanceTimersByTime(10100);
        expect(enemySawmillAnchor.affiliation).toBe('friendly');
        expect(enemySawmillAnchor.generatorData.activated).toBe(true);

        jest.useRealTimers();
    });

    test('7. Interacting with neutral Cultivation Vat displays ACTIVATE button instead of CONVERT, and status Inactive', () => {
        const neutralVatAnchor = {
            id: 800,
            building: 'cultivation_vat',
            image: 'cultivation_vat',
            globalX: 30,
            globalY: 30,
            affiliation: 'neutral',
            isHostile: false,
            generatorData: { owned: false, activated: false, key: 'cultivation_vat', resource: 'Chemicals', rate: 5, affiliation: 'neutral', isHostile: false },
            contains: {
                type: 'building',
                subtype: 'cultivation_vat',
                building: 'cultivation_vat',
                affiliation: 'neutral',
                isHostile: false,
                generatorData: { owned: false, activated: false, key: 'cultivation_vat', resource: 'Chemicals', rate: 5, affiliation: 'neutral', isHostile: false }
            }
        };

        pageInstance.state.activeGeneratorTile = neutralVatAnchor;
        pageInstance.state.showGeneratorModal = true;

        const modalJSX = pageInstance.render();
        const { container } = render(<div>{modalJSX}</div>);

        // Verify status displays Inactive (not Active (Enemy))
        expect(container.textContent).toContain('Inactive');
        expect(container.textContent).not.toContain('Active (Enemy)');

        // Verify button says ACTIVATE CULTIVATION VAT
        const activateBtn = screen.getByRole('button', { name: /ACTIVATE CULTIVATION VAT/i });
        expect(activateBtn).toBeInTheDocument();

        // Verify it does NOT say CONVERT
        expect(screen.queryByText(/^CONVERT$/i)).toBeNull();
    });

    test('8. Clicking ACTIVATE on neutral Cultivation Vat immediately activates it without 10s channel or Free Will deduction', () => {
        const neutralVatAnchor = {
            id: 800,
            building: 'cultivation_vat',
            image: 'cultivation_vat',
            globalX: 30,
            globalY: 30,
            affiliation: 'neutral',
            isHostile: false,
            generatorData: { owned: false, activated: false, key: 'cultivation_vat', resource: 'Chemicals', rate: 5, affiliation: 'neutral', isHostile: false },
            contains: {
                type: 'building',
                subtype: 'cultivation_vat',
                building: 'cultivation_vat',
                affiliation: 'neutral',
                isHostile: false,
                generatorData: { owned: false, activated: false, key: 'cultivation_vat', resource: 'Chemicals', rate: 5, affiliation: 'neutral', isHostile: false }
            }
        };

        pageInstance.state.activeGeneratorTile = neutralVatAnchor;
        pageInstance.state.showGeneratorModal = true;
        pageInstance.handleActivateGenerator = jest.fn();

        pageInstance.handleGeneratorModalPrimaryAction();

        // Should call handleActivateGenerator immediately
        expect(pageInstance.handleActivateGenerator).toHaveBeenCalled();
        // Free will should NOT be deducted
        expect(pageInstance.state.pocketFreeWill).toBe(50);
        // No 10s convertingTarget
        expect(neutralVatAnchor.convertingTarget).toBeUndefined();
    });

    test('9. Clicking a structure from a distance does NOT open modal, but initiates pathfinding to an adjacent tile', () => {
        pageInstance.state.showGeneratorModal = false;
        pageInstance.state.activeGeneratorTile = null;
        pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 }; // Distant from (20, 20)
        pageInstance.bfsPathfindSuperboard = jest.fn(() => ['down', 'right']);
        pageInstance.processMovementQueue = jest.fn();

        // Click on the sawmill tile at (20, 20) which is at local viewport [5, 5] if viewMin is (15, 15)
        const clickedTile = {
            coordinates: [5, 5],
            type: 'board-tile',
            id: enemySawmillAnchor.id
        };

        pageInstance.handleClick(clickedTile);

        // Modal should NOT be opened
        expect(pageInstance.state.showGeneratorModal).toBe(false);

        // BFS pathfinding should have been called with player pos (10, 10) and adjacent goal tiles around (20, 20)
        expect(pageInstance.bfsPathfindSuperboard).toHaveBeenCalled();
        const goalTilesArg = pageInstance.bfsPathfindSuperboard.mock.calls[0][3];
        // Adjacent tiles around 2x2 structure at (20, 20) should include (19, 20), (20, 19), etc.
        expect(goalTilesArg.has('19,20') || goalTilesArg.has('20,19') || goalTilesArg.has('22,20')).toBe(true);

        // End action should be set to trigger once player arrives
        expect(typeof pageInstance._superboardPathfindEndAction).toBe('function');
        expect(pageInstance.processMovementQueue).toHaveBeenCalled();
    });

    test('10. Clicking an unreachable structure displays message and does NOT show modal or queue path', () => {
        pageInstance.state.showGeneratorModal = false;
        pageInstance.state.activeGeneratorTile = null;
        pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 };
        // Pathfinding blocked / no path
        pageInstance.bfsPathfindSuperboard = jest.fn(() => null);
        pageInstance.processMovementQueue = jest.fn();

        const clickedTile = {
            coordinates: [5, 5],
            type: 'board-tile',
            id: enemySawmillAnchor.id
        };

        pageInstance.handleClick(clickedTile);

        // Modal should NOT be opened
        expect(pageInstance.state.showGeneratorModal).toBe(false);
        // Error message displayed
        expect(pageInstance.displayMessage).toHaveBeenCalledWith('Cannot find a path to that structure.');
        // End action should NOT be set
        expect(pageInstance._superboardPathfindEndAction).toBeNull();
    });

    test('11. openGeneratorModal rejects showing modal when player is not adjacent in superboard', () => {
        pageInstance.state.showGeneratorModal = false;
        pageInstance.state.activeGeneratorTile = null;
        pageInstance.state.superboardPlayerPos = { gx: 5, gy: 5 }; // Far away from (20, 20)

        pageInstance.openGeneratorModal(enemySawmillAnchor);

        // Modal should NOT open because avatar is not adjacent
        expect(pageInstance.state.showGeneratorModal).toBe(false);
        expect(pageInstance.state.activeGeneratorTile).toBeNull();

        // But when player IS adjacent (e.g. at 20, 19):
        pageInstance.state.superboardPlayerPos = { gx: 20, gy: 19 };
        pageInstance.openGeneratorModal(enemySawmillAnchor);
        expect(pageInstance.state.showGeneratorModal).toBe(true);
        expect(pageInstance.state.activeGeneratorTile).toBeDefined();
    });

    test('12. clearAutomatonConversionOnTarget clears automaton convertingTarget across 2x2 footprint while preserving player claim conversions', () => {
        // Setup automaton conversion on enemySawmillTiles
        const autoConv = { targetId: 'sawmill_1', anchorGx: 20, anchorGy: 20, startTime: Date.now(), duration: 10000 };
        enemySawmillTiles.forEach(t => {
            t.convertingTarget = { ...autoConv };
            t.contains.convertingTarget = { ...autoConv };
        });

        // Setup player claim on a different tile
        const playerTile = miniboards[0].tiles[0];
        const playerConv = { isPlayerClaim: true, isPlayer: true, targetId: 'player_outpost', anchorGx: 0, anchorGy: 0, startTime: Date.now(), duration: 10000 };
        playerTile.convertingTarget = { ...playerConv };
        playerTile.contains.convertingTarget = { ...playerConv };

        pageInstance.clearAutomatonConversionOnTarget(superboard, 20, 20, 'sawmill_1');

        // Automaton conversion should be cleansed from all 4 tiles of the 2x2 structure
        enemySawmillTiles.forEach(t => {
            expect(t.convertingTarget).toBeUndefined();
            expect(t.contains.convertingTarget).toBeUndefined();
        });

        // Player conversion must be preserved!
        expect(playerTile.convertingTarget).toBeDefined();
        expect(playerTile.convertingTarget.isPlayerClaim).toBe(true);
    });

    test('13. clearOrphanAutomatonConversions clears stale automaton conversions when no automaton is nearby', () => {
        // Place an automaton conversion on sawmill with no living automaton near it
        const autoConv = { targetId: 'sawmill_1', anchorGx: 20, anchorGy: 20, startTime: Date.now(), duration: 10000 };
        enemySawmillTiles[0].convertingTarget = { ...autoConv };
        enemySawmillTiles[0].contains.convertingTarget = { ...autoConv };

        // Player conversion on another tile
        const playerTile = miniboards[0].tiles[0];
        const playerConv = { isPlayerClaim: true, isPlayer: true, targetId: 'player_outpost', anchorGx: 0, anchorGy: 0, startTime: Date.now(), duration: 10000 };
        playerTile.convertingTarget = { ...playerConv };
        playerTile.contains.convertingTarget = { ...playerConv };

        // Living automaton far away at (5, 5)
        miniboards[0].tiles[5 * 15 + 5].contains = { isAutomaton: true, hp: 30, isDying: false };

        pageInstance.clearOrphanAutomatonConversions(superboard);

        // Orphan automaton conversion at (20, 20) should be wiped because distance > 2
        expect(enemySawmillTiles[0].convertingTarget).toBeUndefined();
        expect(enemySawmillTiles[0].contains.convertingTarget).toBeUndefined();

        // Player conversion preserved
        expect(playerTile.convertingTarget).toBeDefined();
    });

    test('14. Automaton completes 10s conversion on military/resource structure, converting all quadrants to hostile control', async () => {
        // Setup friendly outpost at (10, 10) in miniboard 0
        const outpostTile = miniboards[0].tiles[10 * 15 + 10];
        outpostTile.building = 'outpost';
        outpostTile.affiliation = 'friendly';
        outpostTile.placedBy = 'player';
        outpostTile.ownedByPlayer = true;
        outpostTile.contains = {
            id: 'outpost_10_10',
            type: 'building',
            subtype: 'outpost',
            building: 'outpost',
            affiliation: 'friendly',
            placedBy: 'player',
            isAllied: true
        };

        // Automaton adjacent at (10, 9)
        const autoTile = miniboards[0].tiles[9 * 15 + 10];
        const automaton = {
            isAutomaton: true,
            hp: 30,
            convertingTarget: { targetId: 'outpost_10_10', anchorGx: 10, anchorGy: 10, startTime: Date.now() - 11000, duration: 10000 }
        };
        autoTile.contains = automaton;

        pageInstance.state.inSuperboard = true;
        pageInstance.state.superboardType = 'pocket_plains';
        pageInstance.displayMessage = jest.fn();
        pageInstance.updateSuperboardViewport = jest.fn();
        pageInstance.animatePocketPygmyBump = jest.fn();
        await pageInstance.tickPocketPygmies();

        // Outpost should now be hostile and owned by automaton
        expect(outpostTile.affiliation).toBe('hostile');
        expect(outpostTile.isHostile).toBe(true);
        expect(outpostTile.placedBy).toBe('automaton');
        expect(outpostTile.ownedByPlayer).toBeUndefined();
        expect(outpostTile.contains.affiliation).toBe('hostile');
        expect(outpostTile.contains.isHostile).toBe(true);
        expect(outpostTile.contains.isAllied).toBeUndefined();

        // Conversion state cleared on both structure and automaton
        expect(outpostTile.convertingTarget).toBeUndefined();
        expect(autoTile.contains.convertingTarget).toBeUndefined();
    });
});
