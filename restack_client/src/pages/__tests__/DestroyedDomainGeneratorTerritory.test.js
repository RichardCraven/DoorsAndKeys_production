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

describe('Destroyed Enemy Domain Generator Territory Loss', () => {
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
                    id: mb * 225 + t,
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
                getIndexFromCoordinates: jest.fn(() => 0),
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
            superboardPlayerPos: { gx: 10, gy: 10 },
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

    test('clearMonolithTerritory removes all territory claimed by a dark domain monolith', () => {
        // Setup a 2x2 dark domain monolith at (20, 20) with vendorGroupId
        const anchorTile = superboard.miniboards[4].tiles[80]; // somewhere in center miniboard
        anchorTile.globalX = 20;
        anchorTile.globalY = 20;
        anchorTile.coordinates = [5, 5];
        anchorTile.vendorCell = 'anchor';
        anchorTile.vendorGroupId = 'dark_monolith_group_1';
        anchorTile.contains = {
            type: 'building',
            subtype: 'dark_domain_monolith',
            id: 'monolith_20_20',
            vendorGroupId: 'dark_monolith_group_1',
            vendorCell: 'anchor',
            affiliation: 'hostile',
            growthCycles: 3,
            maxGrowthCycles: 5,
            hp: 0,
            destroyedAt: Date.now()
        };

        // Populate 10 tiles with hostile territory tagged with this monolithId
        const claimedTiles = [];
        for (let i = 1; i <= 10; i++) {
            const t = superboard.miniboards[4].tiles[80 + i];
            t.territory = 'hostile';
            t.territoryAffiliation = 'hostile';
            t.territoryMonolithId = 'monolith_20_20';
            t.newlyClaimed = true;
            t.contains = {
                type: 'empty_space',
                territory: 'hostile',
                territoryAffiliation: 'hostile',
                territoryMonolithId: 'monolith_20_20'
            };
            claimedTiles.push(t);
        }

        expect(claimedTiles.every(t => t.territory === 'hostile')).toBe(true);

        // Clear the monolith territory
        const cleared = pageInstance.clearMonolithTerritory(superboard, 'monolith_20_20', 'hostile', 20, 20);
        expect(cleared).toBeGreaterThanOrEqual(10);

        // Verify territory is cleared on every claimed tile
        claimedTiles.forEach(t => {
            expect(t.territory).toBeUndefined();
            expect(t.territoryAffiliation).toBeUndefined();
            expect(t.territoryMonolithId).toBeUndefined();
            expect(t.contains.territory).toBeUndefined();
            expect(t.contains.territoryAffiliation).toBeUndefined();
            expect(t.contains.territoryMonolithId).toBeUndefined();
        });

        // Verify the monolith itself had growthCycles and activated reset
        expect(anchorTile.contains.growthCycles).toBe(0);
        expect(anchorTile.contains.activated).toBe(false);
    });

    test('tickPocketDomainMonoliths detects destroyed monolith and purges territory instead of growing', () => {
        const anchorTile = superboard.miniboards[0].tiles[50];
        anchorTile.coordinates = [5, 3];
        anchorTile.globalX = 5;
        anchorTile.globalY = 3;
        anchorTile.vendorCell = 'anchor';
        anchorTile.contains = {
            type: 'building',
            subtype: 'dark_domain_monolith',
            id: 'monolith_5_3',
            affiliation: 'hostile',
            growthCycles: 2,
            hp: 0,
            destroyedAt: Date.now()
        };

        // Surrounding tiles claimed by this monolith
        const t1 = superboard.miniboards[0].tiles[51];
        t1.territory = 'hostile';
        t1.territoryAffiliation = 'hostile';
        t1.territoryMonolithId = 'monolith_5_3';

        const t2 = superboard.miniboards[0].tiles[52];
        t2.territory = 'hostile';
        t2.territoryAffiliation = 'hostile';
        t2.territoryMonolithId = 'monolith_5_3';

        // Tick pocket domain monoliths
        pageInstance.tickPocketDomainMonoliths(superboard);

        // Territory should have been wiped
        expect(t1.territory).toBeUndefined();
        expect(t1.territoryMonolithId).toBeUndefined();
        expect(t2.territory).toBeUndefined();
        expect(t2.territoryMonolithId).toBeUndefined();
        expect(anchorTile.contains.growthCycles).toBe(0);
    });

    test('Walker cleave destroying a dark domain node clears its territory', () => {
        const nodeTile = superboard.miniboards[0].tiles[32];
        nodeTile.coordinates = [2, 2];
        nodeTile.globalX = 2;
        nodeTile.globalY = 2;
        nodeTile.contains = {
            type: 'building',
            subtype: 'dark_domain_node',
            id: 'monolith_2_2',
            affiliation: 'hostile',
            hp: 5,
            maxHp: 40
        };

        const tNeighbor = superboard.miniboards[0].tiles[33];
        tNeighbor.territory = 'hostile';
        tNeighbor.territoryAffiliation = 'hostile';
        tNeighbor.territoryMonolithId = 'monolith_2_2';

        // Set up walker adjacent at (1, 2)
        const walker = {
            id: 'walker_1',
            gx: 1,
            gy: 2,
            mbIdx: 0,
            tIdx: 31,
            isWalker: true,
            subtype: 'walker',
            hp: 50,
            lastAttackTime: 0
        };
        pageInstance.state.superboardEntities = {
            [walker.id]: walker
        };

        // Run tickPocketPygmies which processes walker cleave
        pageInstance.tickPocketPygmies(superboard);

        // Node took 10 cleave damage, reducing hp from 5 to 0 (destroyed)
        expect(nodeTile.contains.hp).toBe(0);
        expect(nodeTile.contains.destroyedAt).toBeDefined();

        // Territory should be cleared
        expect(tNeighbor.territory).toBeUndefined();
        expect(tNeighbor.territoryMonolithId).toBeUndefined();
    });

    test('Pygmy attack destroying a domain monolith clears its territory', () => {
        const monolithTile = superboard.miniboards[0].tiles[65];
        monolithTile.coordinates = [5, 4];
        monolithTile.globalX = 5;
        monolithTile.globalY = 4;
        monolithTile.contains = {
            type: 'building',
            subtype: 'dark_domain_monolith',
            id: 'monolith_5_4',
            affiliation: 'hostile',
            hp: 1,
            maxHp: 40
        };

        const territoryTile = superboard.miniboards[0].tiles[66];
        territoryTile.territory = 'hostile';
        territoryTile.territoryAffiliation = 'hostile';
        territoryTile.territoryMonolithId = 'monolith_5_4';

        // Friendly pygmy at (4, 4) targeting the monolith
        const pygmy = {
            id: 'pygmy_friendly_1',
            gx: 4,
            gy: 4,
            mbIdx: 0,
            tIdx: 64,
            affiliation: 'player',
            isHostile: false,
            isPocketPygmy: true,
            subtype: 'pocket_pygmy',
            hp: 20,
            lastAttackTime: 0
        };
        pageInstance.state.superboardEntities = {
            [pygmy.id]: pygmy
        };

        // Trigger tickPocketPygmies
        pageInstance.tickPocketPygmies(superboard);

        // Monolith should be destroyed and territory cleared
        expect(monolithTile.contains.hp).toBe(0);
        expect(monolithTile.contains.destroyedAt).toBeDefined();
        expect(territoryTile.territory).toBeUndefined();
        expect(territoryTile.territoryMonolithId).toBeUndefined();
    });

    test('Moving into a neutral domain monolith opens generator modal and does NOT destroy it', () => {
        const monolithTile = superboard.miniboards[0].tiles[80];
        monolithTile.coordinates = [5, 5];
        monolithTile.globalX = 5;
        monolithTile.globalY = 5;
        monolithTile.building = 'domain_monolith';
        monolithTile.contains = {
            type: 'building',
            subtype: 'domain_monolith',
            id: 'monolith_5_5',
            affiliation: 'neutral',
            hp: 40,
            maxHp: 40
        };

        // Player is at (4, 5) and moves right towards (5, 5)
        pageInstance.state.superboardPlayerPos = { gx: 4, gy: 5 };
        pageInstance.movePlayerInSuperboard(1, 0);

        // Monolith MUST NOT be destroyed
        expect(monolithTile.contains.hp).toBe(40);
        expect(monolithTile.contains.destroyedAt).toBeUndefined();
    });

    test('Friendly pygmy units destroying a hostile resource generator makes it neutral with 10s cooldown and blocks activation', () => {
        const vendorGroupId = 'building_fungal_nursery_95';
        const anchorTile = superboard.miniboards[0].tiles[95];
        const trTile = superboard.miniboards[0].tiles[96];
        const blTile = superboard.miniboards[0].tiles[110];
        const brTile = superboard.miniboards[0].tiles[111];

        const cells = [
            { tile: anchorTile, vCell: 'anchor', gx: 5, gy: 6 },
            { tile: trTile, vCell: 'top_right', gx: 6, gy: 6 },
            { tile: blTile, vCell: 'bottom_left', gx: 5, gy: 7 },
            { tile: brTile, vCell: 'bottom_right', gx: 6, gy: 7 }
        ];

        cells.forEach(({ tile, vCell, gx, gy }) => {
            tile.globalX = gx;
            tile.globalY = gy;
            tile.building = 'fungal_nursery';
            tile.affiliation = 'hostile';
            tile.vendorGroupId = vendorGroupId;
            tile.vendorCell = vCell;
            tile.contains = {
                type: 'building',
                subtype: 'fungal_nursery',
                id: `gen_${gx}_${gy}`,
                affiliation: 'hostile',
                vendorGroupId,
                vendorCell: vCell,
                hp: 1,
                maxHp: 40,
                generatorData: {
                    key: 'fungal_nursery',
                    name: 'Fungal Nursery',
                    resource: 'spores',
                    rate: 5,
                    activated: true,
                    affiliation: 'hostile'
                }
            };
        });

        // Place friendly pygmy at (4, 6) next to anchor
        const pygmy = {
            id: 'pygmy_friendly_fn',
            gx: 4,
            gy: 6,
            mbIdx: 0,
            tIdx: 94,
            affiliation: 'player',
            isHostile: false,
            isPocketPygmy: true,
            subtype: 'pocket_pygmy',
            hp: 20,
            lastAttackTime: 0
        };
        pageInstance.state.superboardEntities = {
            [pygmy.id]: pygmy
        };

        const now = Date.now();
        pageInstance.tickPocketPygmies(superboard);

        // 1. All cells of vendorGroupId should be neutral, hp 0, and have 10s cooldown
        cells.forEach(({ tile }) => {
            expect(tile.contains.hp).toBe(0);
            expect(tile.contains.affiliation).toBe('neutral');
            expect(tile.affiliation).toBe('neutral');
            expect(tile.contains.destroyedAt).toBeDefined();
            expect(tile.contains.destroyedDuration).toBe(10000);
            expect(tile.contains.disabledUntil).toBeGreaterThanOrEqual(now + 10000);
        });

        // 2. User trying to activate it while destroyed is unable to
        pageInstance.state.activeGeneratorTile = anchorTile;
        pageInstance.handleActivateGenerator();
        expect(pageInstance.displayMessage).toHaveBeenCalledWith(expect.stringContaining('Cannot activate a destroyed building'));
        expect(anchorTile.contains.generatorData?.activated).toBe(false);

        pageInstance.displayMessage.mockClear();
        pageInstance.startClaimingPocketOutpost(anchorTile);
        expect(pageInstance.displayMessage).toHaveBeenCalledWith(expect.stringContaining('Cannot activate a destroyed building'));
        expect(anchorTile.contains.generatorData?.activated).toBe(false);

        // 3. Automaton AI targeting skips destroyed resource generator
        const auto = {
            id: 'auto_enemy_1',
            gx: 4,
            gy: 5,
            mbIdx: 0,
            tIdx: 79,
            hp: 30,
            maxHp: 30,
            isAutomaton: true,
            subtype: 'automaton',
            affiliation: 'hostile',
            faction: 'hostile'
        };
        pageInstance.state.superboardEntities[auto.id] = auto;

        // Ticking pygmies (which includes automaton logic) will not assign destroyed generator as target
        pageInstance.tickPocketPygmies(superboard);
        expect(auto.convertingTarget).toBeUndefined();

        // 4. After 10 seconds, tickPocketResourceGenerators restores it to neutral with full HP
        const originalNow = Date.now;
        try {
            Date.now = () => now + 10500;
            pageInstance.tickPocketResourceGenerators(superboard);

            // Destroyed badge & flags cleared, hp restored to maxHp (40)
            expect(anchorTile.contains.destroyedAt).toBeUndefined();
            expect(anchorTile.contains.disabledUntil).toBeUndefined();
            expect(anchorTile.contains.hp).toBe(40);
            expect(trTile.contains.destroyedAt).toBeUndefined();
            expect(trTile.contains.hp).toBe(40);

            // Building is now available to activate
            pageInstance.state.activeGeneratorTile = anchorTile;
            pageInstance.handleActivateGenerator();
            expect(anchorTile.generatorData.activated).toBe(true);
            expect(anchorTile.contains.generatorData.activated).toBe(true);
        } finally {
            Date.now = originalNow;
        }
    });

    test('getActiveSuperboardPerfectSquares returns empty when dark domain node is destroyed or disabled', () => {
        const nodeTile = superboard.miniboards[0].tiles[30];
        nodeTile.coordinates = [0, 2];
        nodeTile.globalX = 0;
        nodeTile.globalY = 2;
        nodeTile.contains = {
            type: 'building',
            subtype: 'dark_domain_node',
            id: 'monolith_0_2',
            affiliation: 'hostile',
            hp: 0,
            destroyedAt: Date.now(),
            disabledUntil: Date.now() + 10000
        };

        const activeSquares = pageInstance.getActiveSuperboardPerfectSquares(superboard);
        expect(activeSquares).toEqual([]);
    });
});

