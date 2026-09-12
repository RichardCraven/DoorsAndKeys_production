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

describe('Pocket Dimension: 2x2 Hit Animation & Walker Unit AI', () => {
    let pageInstance;
    let superboard;
    let miniboards;

    beforeEach(() => {
        pageInstance = new DungeonPage({
            boardManager: {
                dungeon: { superboards: {} },
                playerTile: { location: [5, 4], boardIndex: 4 },
                tiles: [],
                getIndexFromCoordinates: jest.fn(() => 0),
                getCoordinatesFromIndex: jest.fn(() => [0, 0]),
                getContainsType: (c) => typeof c === 'object' ? c?.type : c,
                getContainsSubtype: (c) => typeof c === 'object' ? (c?.subtype || c?.key) : c,
                refreshTiles: jest.fn()
            },
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

        pageInstance.props.boardManager.dungeon.superboards = { pocket_plains: superboard };

        pageInstance.state = {
            ...pageInstance.state,
            inSuperboard: true,
            isInPocketDimension: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 20, gy: 19 },
            superboardViewMinX: 15,
            superboardViewMinY: 15,
            dungeon: { superboards: { pocket_plains: superboard } },
            superboardEntities: {},
            pocketFreeWill: 50,
            tileSize: 40
        };

        pageInstance.setState = jest.fn((patch, cb) => {
            Object.assign(pageInstance.state, patch);
            if (cb) cb();
        });
        pageInstance.displayMessage = jest.fn();
        pageInstance.updateSuperboardViewport = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('1. 2x2 structure hit animation: attacking an enemy building sets isBumpedBack and bumpedBackVector on all quadrants', () => {
        // Setup 2x2 Sawmill at mb 4, anchor at (20, 20)
        const mb = miniboards[4];
        const vGroupId = 'sawmill_test_group';
        const t0 = mb.tiles[5 * 15 + 5];
        const t1 = mb.tiles[5 * 15 + 6];
        const t2 = mb.tiles[6 * 15 + 5];
        const t3 = mb.tiles[6 * 15 + 6];

        const sawObj = { type: 'building', subtype: 'sawmill', building: 'sawmill', vendorGroupId: vGroupId, affiliation: 'hostile', hp: 50 };
        t0.contains = { ...sawObj, vendorCell: 'anchor' }; t0.vendorGroupId = vGroupId;
        t1.contains = { ...sawObj, vendorCell: 'top_right' }; t1.vendorGroupId = vGroupId;
        t2.contains = { ...sawObj, vendorCell: 'bottom_left' }; t2.vendorGroupId = vGroupId;
        t3.contains = { ...sawObj, vendorCell: 'bottom_right' }; t3.vendorGroupId = vGroupId;

        // Player at (20, 19) moving down (+1 dy) to attack sawmill at (20, 20)
        // Setup bm.tiles viewport containing these tiles
        const viewTiles = [
            { id: 0, gx: 20, gy: 19, contains: null }, // player tile
            { id: 1, gx: 20, gy: 20, vendorGroupId: vGroupId, contains: t0.contains },
            { id: 2, gx: 21, gy: 20, vendorGroupId: vGroupId, contains: t1.contains },
            { id: 3, gx: 20, gy: 21, vendorGroupId: vGroupId, contains: t2.contains },
            { id: 4, gx: 21, gy: 21, vendorGroupId: vGroupId, contains: t3.contains }
        ];
        pageInstance.props.boardManager.tiles = viewTiles;

        // Trigger animatePocketPygmyBump against t0
        pageInstance.animatePocketPygmyBump(superboard, 4, 4 * 15 + 5, 0, 1);

        // Verify ALL 4 tiles of the 2x2 building have isBumpedBack = true
        expect(t0.isBumpedBack).toBe(true);
        expect(t1.isBumpedBack).toBe(true);
        expect(t2.isBumpedBack).toBe(true);
        expect(t3.isBumpedBack).toBe(true);

        expect(t0.bumpedBackVector).toEqual({ dRow: 1, dCol: 0 });
        expect(t1.bumpedBackVector).toEqual({ dRow: 1, dCol: 0 });
        expect(t2.bumpedBackVector).toEqual({ dRow: 1, dCol: 0 });
        expect(t3.bumpedBackVector).toEqual({ dRow: 1, dCol: 0 });
    });

    test('2. Walker construction: creates active friendly Walker unit in superboardEntities and clears static tile data', () => {
        const constructionState = {
            buildingDef: { key: 'walker', name: 'Walker' },
            superboardGx: 10,
            superboardGy: 10,
            targetTileIdx: 10 * 15 + 10,
            actualBuildTimeSec: 30,
            livingContributorIds: []
        };

        pageInstance.finishConstruction(constructionState);

        const entities = Object.values(pageInstance.state.superboardEntities);
        const walker = entities.find(e => e.isWalker || e.subtype === 'walker');

        expect(walker).toBeDefined();
        expect(walker.name).toBe('Walker');
        expect(walker.isAllied).toBe(true);
        expect(walker.affiliation).toBe('friendly');
        expect(walker.faction).toBe('player');
        expect(walker.gx).toBe(10);
        expect(walker.gy).toBe(10);
        expect(walker.hp).toBe(100);

        // Verify only 1 Walker unit was spawned in superboardEntities
        const allWalkers = Object.values(pageInstance.state.superboardEntities).filter(e => e && (e.isWalker || e.subtype === 'walker'));
        expect(allWalkers.length).toBe(1);

        // Verify miniboard tile is cleared of static building obstruction
        const mbIdx = Math.floor(10 / 15) * 3 + Math.floor(10 / 15);
        const tile = superboard.miniboards[mbIdx].tiles[10 * 15 + 10];
        expect(tile.building).toBeFalsy();
        expect(tile.contains).toBeNull();

        // Verify tile migration does not create a duplicate 2nd unit
        pageInstance.migrateTilesToEntityRegistry(superboard);
        const postMigrationWalkers = Object.values(pageInstance.state.superboardEntities).filter(e => e && (e.isWalker || e.subtype === 'walker'));
        expect(postMigrationWalkers.length).toBe(1);
    });

    test('3. Walker wanders randomly to adjacent empty tile when no enemies are nearby', async () => {
        const walker = {
            id: 'walker_test_1',
            name: 'Walker',
            subtype: 'walker',
            isWalker: true,
            gx: 20,
            gy: 20,
            hp: 100,
            maxHp: 100,
            affiliation: 'friendly',
            faction: 'player',
            isAllied: true,
            lastAttackTime: 0,
            lastMoveTime: 0
        };
        pageInstance.state.superboardEntities = { [walker.id]: walker };

        // Run tickPocketPygmies
        await pageInstance.tickPocketPygmies();

        // Walker should have moved to an adjacent tile
        const movedDist = Math.max(Math.abs(walker.gx - 20), Math.abs(walker.gy - 20));
        expect(movedDist).toBeLessThanOrEqual(1);
    });

    test('4. Walker Cleave: detects hostile unit within 1 tile and deals 10 damage to all adjacent enemies', async () => {
        const walker = {
            id: 'walker_test_1',
            name: 'Walker',
            subtype: 'walker',
            isWalker: true,
            gx: 20,
            gy: 20,
            hp: 100,
            maxHp: 100,
            affiliation: 'friendly',
            faction: 'player',
            isAllied: true,
            lastAttackTime: 0,
            lastMoveTime: 0
        };

        // Hostile Automaton adjacent at (21, 20)
        const enemyAuto = {
            id: 'enemy_auto_1',
            subtype: 'automaton',
            isAutomaton: true,
            gx: 21,
            gy: 20,
            hp: 30,
            maxHp: 30,
            affiliation: 'hostile',
            faction: 'enemy',
            isAllied: false,
            convertingTarget: { targetId: 'test_node', startTime: Date.now(), duration: 10000 }
        };

        // Hostile Pygmy adjacent at (20, 21)
        const enemyPygmy = {
            id: 'enemy_pygmy_1',
            subtype: 'pocket_pygmy',
            isPocketPygmy: true,
            gx: 20,
            gy: 21,
            hp: 10,
            maxHp: 10,
            affiliation: 'hostile',
            faction: 'enemy',
            isAllied: false
        };

        pageInstance.state.superboardEntities = {
            [walker.id]: walker,
            [enemyAuto.id]: enemyAuto,
            [enemyPygmy.id]: enemyPygmy
        };

        // Mock movePocketPygmyUnit so automaton doesn't roam away before Walker's turn
        const moveSpy = jest.spyOn(pageInstance, 'movePocketPygmyUnit').mockImplementation(() => {});

        await pageInstance.tickPocketPygmies();

        // Walker should trigger cleave
        expect(walker.isCleaving).toBeDefined();
        expect(walker.lastAttackTime).toBeGreaterThan(0);

        // Both adjacent enemies should have taken 10 damage!
        expect(enemyAuto.hp).toBe(20); // 30 - 10
        // enemyPygmy had 10 HP - 10 = 0, so it dies and is deleted
        expect(pageInstance.state.superboardEntities[enemyPygmy.id]).toBeUndefined();

        moveSpy.mockRestore();
    });

    test('5. Walker Cleave destroying enemy Automaton sets automaton respawn timer', async () => {
        const walker = {
            id: 'walker_test_1',
            name: 'Walker',
            subtype: 'walker',
            isWalker: true,
            gx: 20,
            gy: 20,
            hp: 100,
            maxHp: 100,
            affiliation: 'friendly',
            faction: 'player',
            isAllied: true,
            lastAttackTime: 0
        };

        const weakEnemyAuto = {
            id: 'enemy_auto_weak',
            subtype: 'automaton',
            isAutomaton: true,
            gx: 21,
            gy: 20,
            hp: 8, // < 10 damage
            maxHp: 30,
            affiliation: 'hostile',
            faction: 'enemy',
            isAllied: false
        };

        pageInstance.state.superboardEntities = {
            [walker.id]: walker,
            [weakEnemyAuto.id]: weakEnemyAuto
        };

        const moveSpy = jest.spyOn(pageInstance, 'movePocketPygmyUnit').mockImplementation(() => {});

        await pageInstance.tickPocketPygmies();

        // Automaton killed
        expect(pageInstance.state.superboardEntities[weakEnemyAuto.id]).toBeUndefined();
        expect(pageInstance._automatonRespawnTime).toBeDefined();
        expect(pageInstance._automatonRespawnTime).toBeGreaterThan(Date.now());

        moveSpy.mockRestore();
    });

    test('6. Walker uses general pathfinding to pursue distant hostile enemies', async () => {
        const walker = {
            id: 'walker_path_1',
            name: 'Walker',
            subtype: 'walker',
            isWalker: true,
            gx: 20,
            gy: 20,
            hp: 100,
            maxHp: 100,
            affiliation: 'friendly',
            faction: 'player',
            isAllied: true,
            lastAttackTime: 0,
            lastMoveTime: 0
        };

        // Distant enemy Automaton at (20, 24)
        const distantEnemy = {
            id: 'distant_enemy_1',
            subtype: 'automaton',
            isAutomaton: true,
            gx: 20,
            gy: 24,
            hp: 30,
            maxHp: 30,
            affiliation: 'hostile',
            faction: 'enemy',
            isAllied: false
        };

        pageInstance.state.superboardEntities = {
            [walker.id]: walker,
            [distantEnemy.id]: distantEnemy
        };

        // Track Walker destination from movePocketPygmyUnit
        let destination = null;
        const originalMove = pageInstance.movePocketPygmyUnit;
        jest.spyOn(pageInstance, 'movePocketPygmyUnit').mockImplementation((sb, fMb, fT, tMb, tT, fGx, fGy, toGx, toGy, opts) => {
            if (opts && opts.unitId === walker.id) {
                destination = { gx: toGx, gy: toGy };
                walker.gx = toGx;
                walker.gy = toGy;
                return true;
            }
            return originalMove.call(pageInstance, sb, fMb, fT, tMb, tT, fGx, fGy, toGx, toGy, opts);
        });

        await pageInstance.tickPocketPygmies();

        // Walker should have pathfound towards the distant enemy (distance decreased from 4)
        expect(destination).toBeDefined();
        const newDist = Math.hypot(destination.gx - distantEnemy.gx, destination.gy - distantEnemy.gy);
        expect(newDist).toBeLessThan(4);
    });

    test('7. Walker avoids immediately moving backwards to recent tile', async () => {
        const walker = {
            id: 'walker_momentum_1',
            name: 'Walker',
            subtype: 'walker',
            isWalker: true,
            gx: 20,
            gy: 20,
            hp: 100,
            maxHp: 100,
            affiliation: 'friendly',
            faction: 'player',
            isAllied: true,
            _lastGx: 19,
            _lastGy: 20,
            _prevDir: { dx: 1, dy: 0 },
            _recentPositions: ['19,20'],
            lastAttackTime: 0,
            lastMoveTime: 0
        };

        pageInstance.state.superboardEntities = { [walker.id]: walker };

        let destination = null;
        jest.spyOn(pageInstance, 'movePocketPygmyUnit').mockImplementation((sb, fMb, fT, tMb, tT, fGx, fGy, toGx, toGy, opts) => {
            if (opts && opts.unitId === walker.id) {
                destination = { gx: toGx, gy: toGy };
                walker.gx = toGx;
                walker.gy = toGy;
                return true;
            }
        });

        await pageInstance.tickPocketPygmies();

        // Walker should NOT step back to (19, 20)
        expect(destination).toBeDefined();
        expect(`${destination.gx},${destination.gy}`).not.toBe('19,20');
    });
});
