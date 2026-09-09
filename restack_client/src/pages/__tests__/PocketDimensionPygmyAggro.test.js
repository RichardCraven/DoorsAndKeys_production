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

describe('Pocket Dimension Pygmy Aggression: Neutral & Hostile Pygmies', () => {
    let page;
    let superboard;

    const createEmptySuperboard = () => {
        const miniboards = [];
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const tiles = [];
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                tiles.push({
                    type: 'empty_space',
                    contains: null,
                    color: '#2d4a22'
                });
            }
            miniboards.push({ tiles });
        }
        return { miniboards };
    };

    const placeTileAt = (sb, gx, gy, tileData) => {
        const mbX = Math.floor(gx / 15);
        const mbY = Math.floor(gy / 15);
        const mbIdx = mbY * 3 + mbX;
        const lX = gx % 15;
        const lY = gy % 15;
        const tIdx = lY * 15 + lX;
        sb.miniboards[mbIdx].tiles[tIdx] = {
            type: 'empty_space',
            contains: null,
            ...tileData
        };
        return sb.miniboards[mbIdx].tiles[tIdx];
    };

    beforeEach(() => {
        page = new DungeonPage({});
        superboard = createEmptySuperboard();
        page.state = {
            inSuperboard: true,
            superboardType: 'pocket_dimension',
            dungeon: {
                superboards: {
                    pocket_dimension: superboard
                }
            },
            superboardEntities: {},
            superboardViewMinX: 15,
            superboardViewMinY: 15,
            tileSize: 48,
            superboardPlayerPos: { gx: 30, gy: 30 }
        };
        page.props = {
            boardManager: {
                refreshTiles: jest.fn(),
                tiles: []
            },
            crewManager: {
                crew: [{ id: 'c1', name: 'Explorer', hp: 50, stats: { atk: 10 } }]
            }
        };
        page.setState = jest.fn((patch) => {
            page.state = { ...page.state, ...patch };
        });
        page.ensurePocketPygmiesAndStructures = jest.fn();
        page.migrateTilesToEntityRegistry = jest.fn();
        page.tickPocketDomainMonoliths = jest.fn();
        page.animatePocketPygmyBump = jest.fn();
        page.updateSuperboardViewport = jest.fn();
        page.displayMessage = jest.fn();
        page.damagePlayerCrew = jest.fn();
        page.isPlayerInHut = jest.fn().mockReturnValue(false);
        page.isSuperboardCoordVisibleToUser = jest.fn().mockReturnValue(true);
    });

    test('Neutral pygmy attacks player avatar on micro-tile coordinates', async () => {
        // Player is at fractional micro-step (22.5, 22.0)
        page.state.superboardPlayerPos = { gx: 22.5, gy: 22.0 };

        const pygmy = {
            id: 'pygmy_neutral_1',
            gx: 22,
            gy: 22,
            hp: 10,
            maxHp: 10,
            faction: 'neutral',
            affiliation: 'neutral',
            isPocketPygmy: true,
            lastAttackTime: 0
        };

        placeTileAt(superboard, 22, 22, {
            contains: pygmy
        });
        page.state.superboardEntities = { [pygmy.id]: pygmy };

        await page.tickPocketPygmies();

        expect(page.damagePlayerCrew).toHaveBeenCalled();
        expect(pygmy.lastAttackTime).toBeGreaterThan(0);
        expect(page.animatePocketPygmyBump).toHaveBeenCalled();
    });

    test('Hostile pygmy attacks player avatar on micro-tile coordinates', async () => {
        page.state.superboardPlayerPos = { gx: 21.5, gy: 22.0 };

        const pygmy = {
            id: 'pygmy_hostile_1',
            gx: 22,
            gy: 22,
            hp: 10,
            maxHp: 10,
            faction: 'hostile',
            isHostile: true,
            affiliation: 'hostile',
            isPocketPygmy: true,
            lastAttackTime: 0
        };

        placeTileAt(superboard, 22, 22, {
            contains: pygmy
        });
        page.state.superboardEntities = { [pygmy.id]: pygmy };

        await page.tickPocketPygmies();

        expect(page.damagePlayerCrew).toHaveBeenCalled();
        expect(pygmy.lastAttackTime).toBeGreaterThan(0);
    });

    test('Neutral pygmy attacks adjacent user-affiliated sawmill', async () => {
        // Player is far away
        page.state.superboardPlayerPos = { gx: 5, gy: 5 };

        // Sawmill placed by player at (23, 22)
        const sawmillTile = placeTileAt(superboard, 23, 22, {
            building: 'sawmill',
            affiliation: 'friendly',
            placedBy: 'player',
            contains: {
                type: 'building',
                subtype: 'sawmill',
                affiliation: 'friendly',
                placedBy: 'player',
                hp: 40,
                maxHp: 40
            }
        });

        const pygmy = {
            id: 'pygmy_neutral_2',
            gx: 22,
            gy: 22,
            hp: 10,
            maxHp: 10,
            faction: 'neutral',
            affiliation: 'neutral',
            isPocketPygmy: true,
            lastAttackTime: 0
        };

        placeTileAt(superboard, 22, 22, {
            contains: pygmy
        });
        page.state.superboardEntities = { [pygmy.id]: pygmy };

        await page.tickPocketPygmies();

        expect(sawmillTile.contains.hp).toBeLessThan(40);
        expect(pygmy.lastAttackTime).toBeGreaterThan(0);
        expect(page.animatePocketPygmyBump).toHaveBeenCalled();
    });

    test('Hostile pygmy attacks adjacent user-affiliated mine and neutralizes it at 0 HP', async () => {
        page.state.superboardPlayerPos = { gx: 5, gy: 5 };

        // Mine with low HP placed by player
        const mineTile = placeTileAt(superboard, 22, 23, {
            building: 'ore_mine',
            affiliation: 'friendly',
            placedBy: 'player',
            contains: {
                type: 'building',
                subtype: 'ore_mine',
                affiliation: 'friendly',
                placedBy: 'player',
                hp: 1,
                maxHp: 40,
                generatorData: { activated: true }
            }
        });

        const pygmy = {
            id: 'pygmy_hostile_2',
            gx: 22,
            gy: 22,
            hp: 10,
            maxHp: 10,
            faction: 'hostile',
            isHostile: true,
            affiliation: 'hostile',
            isPocketPygmy: true,
            lastAttackTime: 0
        };

        placeTileAt(superboard, 22, 22, {
            contains: pygmy
        });
        page.state.superboardEntities = { [pygmy.id]: pygmy };

        await page.tickPocketPygmies();

        expect(mineTile.contains.hp).toBe(0);
        expect(mineTile.contains.affiliation).toBe('neutral');
        expect(mineTile.contains.placedBy).toBeNull();
        expect(mineTile.contains.owned).toBe(false);
    });

    test('Hostile pygmy destroys user wall at 0 HP and clears the tile', async () => {
        page.state.superboardPlayerPos = { gx: 5, gy: 5 };

        const wallTile = placeTileAt(superboard, 23, 22, {
            building: 'wall',
            affiliation: 'friendly',
            placedBy: 'player',
            contains: {
                type: 'building',
                subtype: 'wall',
                affiliation: 'friendly',
                placedBy: 'player',
                hp: 1,
                maxHp: 40
            }
        });

        const pygmy = {
            id: 'pygmy_hostile_wall',
            gx: 22,
            gy: 22,
            hp: 10,
            maxHp: 10,
            faction: 'hostile',
            isHostile: true,
            affiliation: 'hostile',
            isPocketPygmy: true,
            lastAttackTime: 0
        };

        placeTileAt(superboard, 22, 22, {
            contains: pygmy
        });
        page.state.superboardEntities = { [pygmy.id]: pygmy };

        await page.tickPocketPygmies();

        expect(wallTile.contains).toBeNull();
        expect(wallTile.building).toBeNull();
    });

    test('Neutral pygmy pursues nearby user-affiliated building within vision radius', async () => {
        page.state.superboardPlayerPos = { gx: 40, gy: 40 };

        // Place user building at (24, 22) - distance 2 from pygmy at (22, 22)
        placeTileAt(superboard, 24, 22, {
            building: 'sawmill',
            affiliation: 'friendly',
            placedBy: 'player',
            contains: {
                type: 'building',
                subtype: 'sawmill',
                affiliation: 'friendly',
                placedBy: 'player',
                hp: 40,
                maxHp: 40
            }
        });

        const pygmy = {
            id: 'pygmy_neutral_pursuit',
            gx: 22,
            gy: 22,
            hp: 10,
            maxHp: 10,
            faction: 'neutral',
            affiliation: 'neutral',
            isPocketPygmy: true,
            lastAttackTime: Date.now() // Cannot attack this tick, must move
        };

        placeTileAt(superboard, 22, 22, {
            contains: pygmy
        });
        page.state.superboardEntities = { [pygmy.id]: pygmy };
        page.movePocketPygmyUnit = jest.fn();

        await page.tickPocketPygmies();

        expect(page.movePocketPygmyUnit).toHaveBeenCalled();
        const moveCall = page.movePocketPygmyUnit.mock.calls[0];
        const destGx = moveCall[7];
        const destGy = moveCall[8];
        // Must move closer to (24, 22) from (22, 22), so destGx should be 23
        expect(destGx).toBe(23);
        expect(destGy).toBe(22);
    });

    test('Pygmy picks patrol destination several tiles away when no targets are in range, and records movement history', async () => {
        page.state.superboardPlayerPos = { gx: 40, gy: 40 };

        const pygmy = {
            id: 'pygmy_patrol_1',
            gx: 20,
            gy: 20,
            hp: 10,
            maxHp: 10,
            faction: 'neutral',
            affiliation: 'neutral',
            isPocketPygmy: true,
            lastAttackTime: Date.now()
        };

        placeTileAt(superboard, 20, 20, { contains: pygmy });
        page.state.superboardEntities = { [pygmy.id]: pygmy };
        page.movePocketPygmyUnit = jest.fn((sb, fMb, fT, tMb, tT, fgx, fgy, tgx, tgy, opt) => {
            pygmy.gx = tgx;
            pygmy.gy = tgy;
        });

        await page.tickPocketPygmies();

        expect(pygmy._patrolTarget).toBeDefined();
        const patrolDist = Math.max(Math.abs(pygmy._patrolTarget.gx - 20), Math.abs(pygmy._patrolTarget.gy - 20));
        // Must pick a point several tiles away (3 to 6 tiles)
        expect(patrolDist).toBeGreaterThanOrEqual(3);
        expect(patrolDist).toBeLessThanOrEqual(6);

        // Unit should have moved towards the patrol target
        expect(page.movePocketPygmyUnit).toHaveBeenCalled();
        expect(pygmy._recentHistory).toBeDefined();
        expect(pygmy._recentHistory.length).toBeGreaterThan(0);
        expect(pygmy._recentHistory[0]).toEqual({ gx: 20, gy: 20 });
    });

    test('Pygmy avoids retracing steps in its recent history', async () => {
        page.state.superboardPlayerPos = { gx: 40, gy: 40 };

        const pygmy = {
            id: 'pygmy_retrace_test',
            gx: 21,
            gy: 20,
            hp: 10,
            maxHp: 10,
            faction: 'neutral',
            affiliation: 'neutral',
            isPocketPygmy: true,
            lastAttackTime: Date.now(),
            _lastGx: 20,
            _lastGy: 20,
            _recentHistory: [{ gx: 19, gy: 20 }, { gx: 20, gy: 20 }],
            _patrolTarget: { gx: 25, gy: 20 }
        };

        placeTileAt(superboard, 21, 20, { contains: pygmy });
        page.state.superboardEntities = { [pygmy.id]: pygmy };
        page.movePocketPygmyUnit = jest.fn();

        await page.tickPocketPygmies();

        expect(page.movePocketPygmyUnit).toHaveBeenCalled();
        const moveCall = page.movePocketPygmyUnit.mock.calls[0];
        const destGx = moveCall[7];
        const destGy = moveCall[8];

        // Should NOT retrace back to (20, 20)
        expect(destGx === 20 && destGy === 20).toBe(false);
        // Should move forward towards (25, 20), stepping to (22, 20)
        expect(destGx).toBe(22);
        expect(destGy).toBe(20);
    });

    test('Finishing Earthen Fort construction in Pocket Dimension immediately spawns an Allied Pocket Pygmy', () => {
        const constructionState = {
            buildingDef: {
                key: 'earthen_fort',
                name: 'Earthen Fort',
                imageKey: 'buildable_earthen_fort',
                buildTime: 20
            },
            superboardGx: 22,
            superboardGy: 22,
            superboardType: 'pocket_dimension',
            footprint: [7]
        };

        // Anchor tile at (22, 22)
        placeTileAt(superboard, 22, 22, {
            type: 'empty_space'
        });

        page.finishConstruction(constructionState);

        // Fort tile must have level 1 and hp 40
        const mb = superboard.miniboards[4];
        const tIdx = (22 % 15) * 15 + (22 % 15);
        const fortTile = mb.tiles[tIdx];
        expect(fortTile.building).toBe('earthen_fort');
        expect(fortTile.contains.level).toBe(1);
        expect(fortTile.contains.hp).toBe(40);

        // An Allied Pocket Pygmy must be spawned in superboardEntities
        const entities = page.state.superboardEntities || {};
        const spawnedPygmy = Object.values(entities).find(e => e && e.isPocketPygmy && e.isAllied);
        expect(spawnedPygmy).toBeDefined();
        expect(spawnedPygmy.faction).toBe('player');
        expect(spawnedPygmy.affiliation).toBe('friendly');
        expect(spawnedPygmy.homeStructureKey).toContain('earthen_fort');
    });
});

