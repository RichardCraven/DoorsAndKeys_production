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
import { render } from '@testing-library/react';
import DungeonPage from '../DungeonPage';
import Tile from '../../components/tile';

describe('Pocket Dimension Domain Node Territory Activation & Growth', () => {
    let pageInstance;
    let superboard;

    const createMockSuperboard = () => {
        const miniboards = [];
        for (let mb = 0; mb < 9; mb++) {
            const mbX = (mb % 3) * 15;
            const mbY = Math.floor(mb / 3) * 15;
            const tiles = [];
            for (let t = 0; t < 225; t++) {
                const gx = mbX + (t % 15);
                const gy = mbY + Math.floor(t / 15);
                tiles.push({
                    id: t,
                    globalX: gx,
                    globalY: gy,
                    coordinates: [t % 15, Math.floor(t / 15)],
                    contains: null,
                    building: null,
                    terrain: 'grass'
                });
            }
            miniboards.push({ id: mb, tiles });
        }
        return { miniboards };
    };

    beforeEach(() => {
        superboard = createMockSuperboard();
        const props = {
            boardManager: {
                tiles: [],
                currentBoard: { tiles: [] },
                refreshTiles: jest.fn(),
                playerTile: { location: [7, 7] },
                currentOrientation: 'F',
                getContainsType: (c) => typeof c === 'object' ? c?.type : c,
                getContainsSubtype: (c) => typeof c === 'object' ? (c?.subtype || c?.key) : c,
                dungeon: {
                    superboards: {
                        pocket_plains: superboard
                    }
                }
            },
            crewManager: {
                crew: [{ id: 'hero', name: 'Hero', hp: 50, stats: { atk: 15 } }]
            },
            user: { _id: 'test-user-1' }
        };

        pageInstance = new DungeonPage(props);
        pageInstance.state = {
            ...pageInstance.state,
            inSuperboard: true,
            isInPocketDimension: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 7, gy: 7 },
            pocketFreeWill: 50,
            dungeon: {
                superboards: {
                    pocket_plains: superboard
                }
            }
        };
        pageInstance._isMounted = true;
        pageInstance.setState = (newState, callback) => {
            pageInstance.state = {
                ...pageInstance.state,
                ...(typeof newState === 'function' ? newState(pageInstance.state) : newState)
            };
            if (callback) callback();
        };
        pageInstance.forceUpdate = jest.fn();
        pageInstance.displayMessage = jest.fn();
        pageInstance.closeGeneratorModal = jest.fn();
        pageInstance.updateSuperboardViewport = jest.fn();
    });

    test('getGeneratorDef correctly resolves domain_node and dark_domain_node', () => {
        const nodeTile = { contains: { subtype: 'domain_node' } };
        const darkNodeTile = { contains: { subtype: 'dark_domain_node' } };

        const nodeDef = pageInstance.getGeneratorDef(nodeTile);
        const darkNodeDef = pageInstance.getGeneratorDef(darkNodeTile);

        expect(nodeDef).toBeDefined();
        expect(nodeDef.key).toBe('domain_node');
        expect(nodeDef.resource).toBe('Territory');
        expect(nodeDef.isMultiTile).toBe(false);

        expect(darkNodeDef).toBeDefined();
        expect(darkNodeDef.key).toBe('dark_domain_node');
        expect(darkNodeDef.resource).toBe('Territory');
    });

    test('handleActivateGenerator activates a 1x1 domain_node and claims 9 tiles (3x3 ring 1) immediately', () => {
        // Place domain_node at global (7, 7) in miniboard 0 (tIdx = 7 * 15 + 7 = 112)
        const targetTile = superboard.miniboards[0].tiles[112];
        targetTile.contains = {
            subtype: 'domain_node',
            key: 'domain_node',
            type: 'building'
        };
        pageInstance.state.activeGeneratorTile = targetTile;

        pageInstance.handleActivateGenerator();

        // 1. Anchor tile itself is claimed for player
        expect(targetTile.territory).toBe('player');
        expect(targetTile.territoryAffiliation).toBe('player');
        expect(targetTile.contains.affiliation).toBe('player');
        expect(targetTile.contains.activated).toBe(true);
        expect(targetTile.contains.growthCycles).toBe(1);

        // 2. Surrounding 1-tile ring (dx in [-1, 1], dy in [-1, 1]) is claimed
        let claimedCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const gx = 7 + dx;
                const gy = 7 + dy;
                const tIdx = gy * 15 + gx;
                const t = superboard.miniboards[0].tiles[tIdx];
                expect(t.territory).toBe('player');
                expect(t.territoryAffiliation).toBe('player');
                claimedCount++;
            }
        }
        expect(claimedCount).toBe(9);

        // 3. Tile at distance 2 is NOT claimed at cycle 1
        const dist2Tile = superboard.miniboards[0].tiles[9 * 15 + 7]; // (7, 9), dy = 2
        expect(dist2Tile.territory).toBeUndefined();

        // 4. Generator modal was closed and confirmation message was displayed
        expect(pageInstance.closeGeneratorModal).toHaveBeenCalled();
        expect(pageInstance.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining('Activated Domain Node')
        );
    });

    test('triggerSuperboardMonolithImmediateGrowth expands domain around 1x1 domain_node footprint', () => {
        const targetTile = superboard.miniboards[0].tiles[112]; // (7, 7)
        targetTile.contains = {
            id: 'node_7_7',
            subtype: 'domain_node',
            key: 'domain_node'
        };

        const growthAnchor = {
            ...targetTile,
            globalX: 7,
            globalY: 7,
            key: 'domain_node',
            subtype: 'domain_node',
            contains: {
                id: 'node_7_7',
                key: 'domain_node',
                subtype: 'domain_node'
            }
        };

        pageInstance.triggerSuperboardMonolithImmediateGrowth(growthAnchor, 'player', 1);

        // All 9 tiles in 3x3 box must have territory: 'player'
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const gx = 7 + dx;
                const gy = 7 + dy;
                const t = superboard.miniboards[0].tiles[gy * 15 + gx];
                expect(t.territory).toBe('player');
                expect(t.territoryMonolithId).toBe('node_7_7');
            }
        }
    });

    test('tickPocketDomainMonoliths grows 1x1 domain_node into cycle 2 (5x5 footprint) over time', () => {
        const targetTile = superboard.miniboards[0].tiles[112]; // (7, 7)
        targetTile.contains = {
            id: 'node_7_7',
            subtype: 'domain_node',
            key: 'domain_node',
            activated: true,
            affiliation: 'player',
            growthCycles: 1,
            lastGrowthTime: Date.now() - 35000 // 35 seconds ago (> 30s)
        };
        targetTile.activated = true;
        targetTile.growthCycles = 1;
        targetTile.lastGrowthTime = Date.now() - 35000;

        pageInstance.tickPocketDomainMonoliths(superboard);

        // Target tile now at cycle 2
        expect(targetTile.contains.growthCycles).toBe(2);

        // 5x5 footprint around (7, 7) claimed
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const gx = 7 + dx;
                const gy = 7 + dy;
                const t = superboard.miniboards[0].tiles[gy * 15 + gx];
                expect(t.territory).toBe('player');
            }
        }

        // Tile at distance 3 is still unclaimed
        const dist3Tile = superboard.miniboards[0].tiles[10 * 15 + 7]; // (7, 10), dy = 3
        expect(dist3Tile.territory).toBeUndefined();
    });

    test('handleActivateGenerator on dark_domain_node deducts 5 Free Will and converts to friendly territory', () => {
        const darkTile = superboard.miniboards[0].tiles[112]; // (7, 7)
        darkTile.contains = {
            subtype: 'dark_domain_node',
            key: 'dark_domain_node',
            type: 'building',
            affiliation: 'hostile',
            isHostile: true
        };
        darkTile.isHostile = true;
        darkTile.affiliation = 'hostile';
        darkTile.territory = 'hostile';

        pageInstance.state.activeGeneratorTile = darkTile;
        pageInstance.state.pocketFreeWill = 50;

        pageInstance.handleActivateGenerator();

        // 5 Free Will deducted
        expect(pageInstance.state.pocketFreeWill).toBe(45);

        // Converted to player territory
        expect(darkTile.territory).toBe('player');
        expect(darkTile.affiliation).toBe('player');
        expect(darkTile.isHostile).toBe(false);
        expect(darkTile.contains.affiliation).toBe('player');
        expect(darkTile.contains.isHostile).toBe(false);

        expect(pageInstance.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining('Reclaimed enemy Domain Node')
        );
    });

    test('handleActivateGenerator correctly resolves coordinates in Miniboard 4 without hijacking to Miniboard 0', () => {
        // Miniboard 4 is center: mbX = 1, mbY = 1, global origin = (15, 15)
        // Place a 2x2 domain_monolith at local tile (5, 5) -> global (20, 20)
        // In miniboard 4, tIdx = 5 * 15 + 5 = 80
        const mb4Tile = superboard.miniboards[4].tiles[80];
        mb4Tile.globalX = 20;
        mb4Tile.globalY = 20;
        mb4Tile.contains = {
            subtype: 'domain_monolith',
            key: 'domain_monolith',
            type: 'building',
            vendorCell: 'anchor'
        };

        pageInstance.state.superboardPlayerPos = { gx: 20, gy: 20 };
        pageInstance.state.activeGeneratorTile = mb4Tile;

        pageInstance.handleActivateGenerator();

        // 1. Miniboard 4 target tile was activated and claimed
        expect(mb4Tile.territory).toBe('player');
        expect(mb4Tile.contains.affiliation).toBe('player');

        // 2. Surrounding ring in Miniboard 4 is claimed (gx: 19..22, gy: 19..22)
        const neighborTileMb4 = superboard.miniboards[4].tiles[4 * 15 + 4]; // local (4, 4) -> global (19, 19)
        expect(neighborTileMb4.territory).toBe('player');

        // 3. Miniboard 0 tile 80 (local 5, 5 -> global 5, 5) was NOT claimed!
        const mb0Tile80 = superboard.miniboards[0].tiles[80];
        expect(mb0Tile80.territory).toBeUndefined();
    });

    test('isSuperboardDomainPerfectSquare returns true even when trees are present in territory', () => {
        // Place domain node at (7, 7) in mb 0 with territory: player
        const nodeTile = superboard.miniboards[0].tiles[112];
        nodeTile.contains = { subtype: 'domain_node', key: 'domain_node', growthCycles: 1, affiliation: 'player' };

        // Claim 3x3 territory around (7, 7)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const t = superboard.miniboards[0].tiles[(7 + dy) * 15 + (7 + dx)];
                t.territory = 'player';
                t.territoryAffiliation = 'player';
            }
        }

        // Add a tree tile in the territory
        const treeTile = superboard.miniboards[0].tiles[6 * 15 + 7]; // (7, 6)
        treeTile.contains = { type: 'tree', subtype: 'tree' };

        const isSquare = pageInstance.isSuperboardDomainPerfectSquare(superboard, 7, 7, 1, 'player');
        expect(isSquare).toBe(true);
    });

    test('getActiveSuperboardPerfectSquares recognizes player-reclaimed dark domain node as player affiliation and includes isSquare', () => {
        const darkNodeTile = superboard.miniboards[0].tiles[112];
        darkNodeTile.contains = {
            subtype: 'dark_domain_node',
            key: 'dark_domain_node',
            type: 'building',
            affiliation: 'player',
            activated: true,
            growthCycles: 1,
            lastGrowthTime: 1234567
        };
        darkNodeTile.affiliation = 'player';
        darkNodeTile.activated = true;

        // Territory partially claimed (not a full square yet)
        darkNodeTile.territory = 'player';

        const activeSquares = pageInstance.getActiveSuperboardPerfectSquares(superboard);
        expect(activeSquares.length).toBe(1);
        expect(activeSquares[0].isFriendly).toBe(true);
        expect(activeSquares[0].isHostile).toBe(false);
        expect(activeSquares[0].affiliation).toBe('player');
        expect(activeSquares[0].lastGrowthTime).toBe(1234567);
        expect(activeSquares[0].isSquare).toBe(false); // Not full square yet
    });

    test('renderSuperboardRotatingDomainSquares renders shockwave and flare for active structures even if isSquare is false', () => {
        const nodeTile = superboard.miniboards[0].tiles[112]; // (7, 7)
        nodeTile.contains = {
            subtype: 'domain_node',
            key: 'domain_node',
            type: 'building',
            affiliation: 'player',
            activated: true,
            growthCycles: 1,
            lastGrowthTime: 999999
        };
        nodeTile.affiliation = 'player';
        nodeTile.activated = true;
        nodeTile.territory = 'player';

        pageInstance.state.inSuperboard = true;
        pageInstance.state.superboardViewMinX = 0;
        pageInstance.state.superboardViewMinY = 0;

        const rendered = pageInstance.renderSuperboardRotatingDomainSquares();
        expect(rendered).not.toBeNull();

        // Check that children or elements inside contain the shockwave and flare
        const children = rendered.props.children;
        const classNames = children.map(c => c.props.className);

        expect(classNames).toContain('domain-beacon-flare');
        expect(classNames).toContain('domain-expansion-shockwave');
        // Rotating square is NOT rendered because isSquare is false
        expect(classNames).not.toContain('domain-rotating-square');

        // Check shockwave key contains lastGrowthTime
        const shockwaveEl = children.find(c => c.props.className === 'domain-expansion-shockwave');
        expect(shockwaveEl.key).toContain('999999');
    });

    test('renderSuperboardRotatingDomainSquares renders rotating square when territory forms a full square', () => {
        const nodeTile = superboard.miniboards[0].tiles[112]; // (7, 7)
        nodeTile.contains = {
            subtype: 'domain_node',
            key: 'domain_node',
            type: 'building',
            affiliation: 'player',
            activated: true,
            growthCycles: 1,
            lastGrowthTime: 888888
        };
        nodeTile.affiliation = 'player';
        nodeTile.activated = true;

        // Fully claim 3x3 square
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const t = superboard.miniboards[0].tiles[(7 + dy) * 15 + (7 + dx)];
                t.territory = 'player';
                t.territoryAffiliation = 'player';
            }
        }

        pageInstance.state.inSuperboard = true;
        pageInstance.state.superboardViewMinX = 0;
        pageInstance.state.superboardViewMinY = 0;

        const rendered = pageInstance.renderSuperboardRotatingDomainSquares();
        const children = rendered.props.children;
        const classNames = children.map(c => c.props.className);

        expect(classNames).toContain('domain-beacon-flare');
        expect(classNames).toContain('domain-expansion-shockwave');
        expect(classNames).toContain('domain-rotating-square');
    });

    test('1x1 domain_node with vendorCell: bottom_right never shifts anchor and strictly centers 3x3 territory on the node', () => {
        // Place domain_node at global (14, 9) in miniboard 0
        // If the old bug occurred, vendorCell 'bottom_right' would decrement anchor to (13, 8)
        const tIdx = 9 * 15 + 14;
        const nodeTile = superboard.miniboards[0].tiles[tIdx];
        nodeTile.globalX = 14;
        nodeTile.globalY = 9;
        nodeTile.vendorCell = 'bottom_right';
        nodeTile.contains = {
            subtype: 'domain_node',
            key: 'domain_node',
            type: 'building',
            vendorCell: 'bottom_right'
        };

        pageInstance.state.superboardPlayerPos = { gx: 13.5, gy: 8.5 }; // Micro-grid sub-tile float
        pageInstance.state.activeGeneratorTile = nodeTile;

        pageInstance.handleActivateGenerator();

        const getTileAt = (gx, gy) => {
            const mbX = Math.floor(gx / 15);
            const mbY = Math.floor(gy / 15);
            const mbIdx = mbY * 3 + mbX;
            const lx = gx % 15;
            const ly = gy % 15;
            return superboard.miniboards[mbIdx].tiles[ly * 15 + lx];
        };

        // The territory must be centered at (14, 9): X in [13..15], Y in [8..10]
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const gx = 14 + dx;
                const gy = 9 + dy;
                const t = getTileAt(gx, gy);
                expect(t.territory).toBe('player');
            }
        }

        // Tile at (12, 7) or (12, 8) which would have been claimed if anchor was shifted to (13, 8) must NOT be claimed!
        const wrongColTile = getTileAt(12, 8);
        expect(wrongColTile.territory).toBeUndefined();
    });

    test('triggerSuperboardMonolithImmediateGrowth with vendorCell: bottom_right on domain_node strictly centers 3x3 box', () => {
        const tIdx = 9 * 15 + 14;
        const nodeTile = superboard.miniboards[0].tiles[tIdx];
        nodeTile.globalX = 14;
        nodeTile.globalY = 9;
        nodeTile.vendorCell = 'bottom_right';
        nodeTile.contains = {
            id: 'node_14_9',
            subtype: 'domain_node',
            key: 'domain_node',
            vendorCell: 'bottom_right'
        };

        const growthAnchor = {
            ...nodeTile,
            vendorCell: 'bottom_right',
            contains: {
                id: 'node_14_9',
                subtype: 'domain_node',
                key: 'domain_node',
                vendorCell: 'bottom_right'
            }
        };

        pageInstance.state.superboardPlayerPos = { gx: 14.5, gy: 9.5 }; // Float position
        pageInstance.triggerSuperboardMonolithImmediateGrowth(growthAnchor, 'player', 1);

        const getTileAt = (gx, gy) => {
            const mbX = Math.floor(gx / 15);
            const mbY = Math.floor(gy / 15);
            const mbIdx = mbY * 3 + mbX;
            const lx = gx % 15;
            const ly = gy % 15;
            return superboard.miniboards[mbIdx].tiles[ly * 15 + lx];
        };

        // Center is (14, 9)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const gx = 14 + dx;
                const gy = 9 + dy;
                const t = getTileAt(gx, gy);
                expect(t.territory).toBe('player');
            }
        }

        // Tile (12, 8) must not be claimed
        expect(getTileAt(12, 8).territory).toBeUndefined();
    });

    test('openGeneratorModal scans miniboards by reference without corruption even when superboardViewMinX is 0 and tile is in Miniboard 2', () => {
        // Miniboard 2: mbX = 2 (gx: 30..44), mbY = 0 (gy: 0..14)
        // Local tile coordinates are [5, 5] inside Miniboard 2 -> global (35, 5)
        const mb2Tile = superboard.miniboards[2].tiles[5 * 15 + 5];
        mb2Tile.globalX = undefined;
        mb2Tile.globalY = undefined;
        mb2Tile.coordinates = [5, 5]; // Miniboard-local coordinates
        mb2Tile.contains = {
            subtype: 'domain_node',
            key: 'domain_node',
            type: 'building'
        };

        pageInstance.state.superboardViewMinX = 0; // Viewport is at miniboard 0
        pageInstance.state.superboardViewMinY = 0;
        pageInstance.state.superboardPlayerPos = { gx: 34.5, gy: 5.5 }; // Near the tile in micro-grid

        pageInstance.openGeneratorModal(mb2Tile);

        // Must resolve to Miniboard 2 global coordinates (35, 5), NOT (0 + 5 = 5, 5)!
        expect(mb2Tile.globalX).toBe(35);
        expect(mb2Tile.globalY).toBe(5);
        expect(mb2Tile.mbIdx).toBe(2);
        expect(mb2Tile.tIdx).toBe(80);
    });

    test('openGeneratorModal does not redirect single-tile domain_node to vAnchor', () => {
        const t = superboard.miniboards[0].tiles[112];
        t.id = 112;
        t.globalX = 7;
        t.globalY = 7;
        t.vendorAnchorId = 999; // Stale or mock anchor
        t.contains = {
            subtype: 'domain_node',
            key: 'domain_node',
            vendorAnchorId: 999
        };

        pageInstance.state.superboardPlayerPos = { gx: 6, gy: 7 };
        pageInstance.openGeneratorModal(t);

        // Active generator tile must remain tile 112 at (7, 7), NOT redirected to 999
        expect(pageInstance.state.activeGeneratorTile.id).toBe(112);
        expect(pageInstance.state.activeGeneratorTile.globalX).toBe(7);
        expect(pageInstance.state.activeGeneratorTile.globalY).toBe(7);
    });

    test('Tile renders continuous domain plane without dashed border or inset shadow in pocket dimension', () => {
        const { container } = render(
            <Tile
                id={112}
                type="board-tile"
                inSuperboard={true}
                territory="player"
                territoryAffiliation="player"
                territoryMonolithId="domain_node_7_7"
                color="rgba(15, 15, 20, 0.55)"
            />
        );

        const territoryDiv = container.querySelector('.territory-bg');
        expect(territoryDiv).not.toBeNull();
        expect(territoryDiv.style.border).not.toContain('dashed');
        expect(territoryDiv.style.boxShadow).not.toContain('inset');
        expect(territoryDiv.style.backgroundColor).toBe('rgba(14, 116, 144, 0.28)');
    });

    test('Tile preserves dashed borders and inset shadow for pygmy clan territory in pocket dimension', () => {
        const { container } = render(
            <Tile
                id={112}
                type="board-tile"
                inSuperboard={true}
                territory="woodland"
                color="rgba(15, 15, 20, 0.55)"
            />
        );

        const territoryDiv = container.querySelector('.territory-bg');
        expect(territoryDiv).not.toBeNull();
        expect(territoryDiv.style.border).toContain('dashed');
        expect(territoryDiv.style.boxShadow).toContain('inset');
    });
});


