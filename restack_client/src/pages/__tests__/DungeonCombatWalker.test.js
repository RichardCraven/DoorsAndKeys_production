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
import { BoardManager } from '../../utils/board-manager';

describe('Engineer Mobile Combat Walker (In-Dungeon Board)', () => {
    let page;
    let mockCrew;
    let mockBoardManager;
    let currentTime;
    let dateSpy;

    const advanceTime = (ms) => {
        currentTime += ms;
        jest.advanceTimersByTime(ms);
    };

    beforeEach(() => {
        jest.useFakeTimers();
        currentTime = 1000000;
        dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

        mockCrew = [
            {
                id: 'engineer_1',
                name: 'Tinkerer',
                type: 'engineer',
                class: 'engineer',
                hp: 25,
                max_hp: 25,
                detached: true
            }
        ];

        mockBoardManager = new BoardManager();
        mockBoardManager.inSuperboard = false;
        mockBoardManager.currentLevel = { id: 0 };
        mockBoardManager.currentBoard = { id: 0, tiles: {} };
        mockBoardManager.currentOrientation = 'F';
        mockBoardManager.tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            location: [Math.floor(i / 15), i % 15],
            color: 'black',
            contains: { type: 'empty_space', subtype: null },
            type: 'board-tile',
            isVoid: false
        }));
        mockBoardManager.tiles.forEach(t => {
            mockBoardManager.currentBoard.tiles[t.id] = t;
        });
        mockBoardManager.playerTile = mockBoardManager.tiles[7 * 15 + 7];
        mockBoardManager.refreshTiles = jest.fn();
        mockBoardManager.messaging = jest.fn();
        mockBoardManager.handleFogOfWar = jest.fn();

        page = new DungeonPage({
            boardManager: mockBoardManager,
            crewManager: { crew: mockCrew },
            saveUserData: jest.fn()
        });

        page.state = {
            ...page.state,
            crew: mockCrew,
            selectedCrewIndex: 0,
            selectedCrewMember: mockCrew[0],
            tileSize: 48,
            boardSize: 720,
            inSuperboard: false,
            activeDungeonWalker: null
        };

        page.setState = jest.fn((updater, cb) => {
            const patch = typeof updater === 'function' ? updater(page.state) : updater;
            page.state = { ...page.state, ...patch };
            if (cb) cb();
        });
        page.displayMessage = jest.fn();
        page.refreshTiles = jest.fn();
    });

    afterEach(() => {
        if (page && typeof page.dismissDungeonWalker === 'function') {
            page.dismissDungeonWalker(true);
        }
        if (dateSpy) {
            dateSpy.mockRestore();
        }
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('1. finishConstruction for walker clears footprint tiles and deploys mobile Combat Walker with 30 HP and 15s lifespan', () => {
        const targetTileIdx = 7 * 15 + 7;
        const constructionState = {
            buildingDef: { key: 'walker', name: 'Walker' },
            targetTileIdx,
            footprint: [targetTileIdx, targetTileIdx + 1, targetTileIdx + 15, targetTileIdx + 16],
            actualBuildTimeSec: 30,
            livingContributorIds: ['engineer_1'],
            detachedEngineerId: 'engineer_1'
        };

        // Mark footprint tiles with under construction state
        constructionState.footprint.forEach(tId => {
            mockBoardManager.tiles[tId].building = 'walker_under_construction';
            mockBoardManager.tiles[tId].contains = { type: 'building', subtype: 'walker_under_construction' };
        });

        page.finishConstruction(constructionState);

        // Footprint tiles should be cleared of static building obstruction
        constructionState.footprint.forEach(tId => {
            expect(mockBoardManager.tiles[tId].building).toBeNull();
            expect(mockBoardManager.tiles[tId].contains).toEqual({ type: 'empty_space', subtype: null });
        });

        // Mobile Combat Walker should be active
        const walker = page.state.activeDungeonWalker;
        expect(walker).toBeDefined();
        expect(walker.active).toBe(true);
        expect(walker.hp).toBe(30);
        expect(walker.maxHp).toBe(30);
        expect(walker.expiresAt).toBe(currentTime + 15000);

        // Detached engineer should rejoin the crew
        expect(mockCrew[0].detached).toBe(false);
    });

    test('2. Combat Walker reveals a 1-tile radius of vision in fog of war around its position', () => {
        page.deployDungeonWalker(7 * 15 + 7);
        expect(page.state.activeDungeonWalker).toBeDefined();

        const reveals = page._walkerRevealedTiles;
        expect(reveals).toBeDefined();

        // 1-tile radius around [7, 7] should be revealed
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const key = `${7 + dr},${7 + dc}`;
                expect(reveals.has(key)).toBe(true);
                expect(reveals.get(key)).toBeGreaterThan(currentTime);
            }
        }
    });

    test('3. Combat Walker strikes adjacent monsters for 15 damage and handles monster counter-attack', () => {
        // Place walker at [7, 7]
        page.deployDungeonWalker(7 * 15 + 7);

        // Place a monster with 25 HP, 8 ATK at [7, 8] (adjacent)
        const monsterTileIdx = 7 * 15 + 8;
        const monsterTile = mockBoardManager.tiles[monsterTileIdx];
        monsterTile.contains = {
            type: 'monster',
            subtype: 'skeleton',
            name: 'Skeleton',
            hp: 25,
            maxHp: 25,
            atk: 8
        };
        mockBoardManager.currentBoard.tiles[monsterTileIdx] = monsterTile;

        // Advance 950ms for one Walker tick
        advanceTime(950);

        const walker = page.state.activeDungeonWalker;
        expect(walker.isAttacking).toBe(true);

        // Monster took 15 damage: 25 - 15 = 10 HP remaining
        expect(monsterTile.contains.hp).toBe(10);

        // Monster survived and counter-attacked for 8 damage: Walker 30 - 8 = 22 HP
        expect(walker.hp).toBe(22);
        expect(walker.monsterAttacking).toBe(true);

        // Damage numbers recorded
        expect(walker.damageNumbers.length).toBeGreaterThanOrEqual(2);
        const wDmg = walker.damageNumbers.find(d => d.isWalker);
        const mDmg = walker.damageNumbers.find(d => !d.isWalker);
        expect(wDmg.text).toBe('-15');
        expect(mDmg.text).toBe('-8');
    });

    test('4. Walker eliminates monsters when dealing lethal damage', () => {
        page.deployDungeonWalker(7 * 15 + 7);

        const monsterTileIdx = 7 * 15 + 8;
        const monsterTile = mockBoardManager.tiles[monsterTileIdx];
        monsterTile.contains = {
            type: 'monster',
            subtype: 'goblin',
            name: 'Goblin',
            hp: 12, // Less than 15 damage
            maxHp: 12,
            atk: 5
        };
        mockBoardManager.currentBoard.tiles[monsterTileIdx] = monsterTile;

        advanceTime(950);

        // Monster should be defeated and removed
        expect(!monsterTile.contains || monsterTile.contains.type === 'empty_space').toBe(true);
        expect(page.state.activeDungeonWalker.hp).toBe(30); // Monster did not survive to counter-attack
    });

    test('5. Walker is destroyed if its HP reaches 0 from monster counter-attacks', () => {
        page.deployDungeonWalker(7 * 15 + 7);
        page.state.activeDungeonWalker.hp = 5; // Low HP

        const monsterTileIdx = 7 * 15 + 8;
        const monsterTile = mockBoardManager.tiles[monsterTileIdx];
        monsterTile.contains = {
            type: 'monster',
            subtype: 'ogre',
            name: 'Ogre',
            hp: 40,
            maxHp: 40,
            atk: 10 // > 5 HP
        };
        mockBoardManager.currentBoard.tiles[monsterTileIdx] = monsterTile;

        advanceTime(950);

        // Walker took lethal retaliation
        expect(page.state.activeDungeonWalker.destroyed).toBe(true);
        expect(page.state.activeDungeonWalker.hp).toBe(0);

        // After destruction timeout (750ms), Walker is dismissed
        advanceTime(800);
        expect(page.state.activeDungeonWalker).toBeNull();
    });

    test('6. Walker expires and is dismantled after 15 seconds', () => {
        page.deployDungeonWalker(7 * 15 + 7);
        expect(page.state.activeDungeonWalker).toBeDefined();

        // Advance 15 seconds
        advanceTime(16000);

        expect(page.state.activeDungeonWalker).toBeNull();
        expect(page._walkerRevealedTiles.size).toBe(0);
    });

    test('7. Walker dismisses cleanly when battle or camp is initiated', () => {
        page.deployDungeonWalker(7 * 15 + 7);
        expect(page.state.activeDungeonWalker).toBeDefined();

        // Trigger camp
        page.setUpCamp();

        expect(page.state.activeDungeonWalker).toBeNull();
    });
});
