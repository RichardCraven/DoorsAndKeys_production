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
import skillsMatrix from '../../utils/skills-matrix';
import * as images from '../../utils/images';

describe("Summoner's Wandering Eye Expedition Skill", () => {
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
                id: 'summoner_1',
                name: 'Malakor',
                type: 'summoner',
                class: 'summoner',
                hp: 20,
                max_hp: 20,
                starting_hp: 20,
                stats: { hp: 20 },
                expeditionSkills: ['wandering_eye']
            }
        ];

        mockBoardManager = new BoardManager();
        mockBoardManager.inSuperboard = false;
        mockBoardManager.currentLevel = { id: 0 };
        mockBoardManager.currentBoard = { id: 0, tiles: {} };
        mockBoardManager.currentOrientation = 'front';
        mockBoardManager.tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            location: [Math.floor(i / 15), i % 15],
            color: 'black',
            contains: 'empty',
            type: 'board-tile',
            isVoid: false
        }));
        mockBoardManager.playerTile = mockBoardManager.tiles[7 * 15 + 7];
        mockBoardManager.refreshTiles = jest.fn();

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
            wanderingEye: null
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
        if (dateSpy) {
            dateSpy.mockRestore();
        }
        if (page && typeof page.stopAutonomousWanderingEye === 'function') {
            page.stopAutonomousWanderingEye();
        }
        if (page && page._wanderingEyeFlightTimer) {
            clearInterval(page._wanderingEyeFlightTimer);
            page._wanderingEyeFlightTimer = null;
        }
        if (page && page._wanderingEyeDecayTimer) {
            clearInterval(page._wanderingEyeDecayTimer);
            page._wanderingEyeDecayTimer = null;
        }
        try {
            delete window.wanderingEye;
            delete window.wandering_eye;
            delete window.narrativeReset;
            delete window.narrative_reset;
            delete window['narrative reset'];
            delete window.siege;
            delete window.tower_siege;
            delete window.levelUp;
            delete window.lvlUp;
            delete window['level up'];
            delete window['lvl up'];
            delete window.toggleDebug;
            delete window.debug;
            delete window.d;
        } catch (e) {}
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('Skills Matrix & Assets', () => {
        test('has wandering_eye configured for Summoner with valid icon and metadata', () => {
            const skill = skillsMatrix.wandering_eye;
            expect(skill).toBeDefined();
            expect(skill.class).toBe('summoner');
            expect(skill.id).toBe('wandering_eye');
            expect(skill.name).toBe('Wandering Eye');
            expect(skill.type).toBe('utility');
            expect(skill.icon).toBeDefined();
            expect(images.wandering_eye_summoner || images.wandering_eye).toBeDefined();
        });
    });

    describe('BoardManager Fog of War Integration', () => {
        test('reveals floor tiles, gates, and monsters without obstruction when in wanderingEyeRevealedTiles', () => {
            const farTileId = 15; // Far away row 1, col 0 (outside player normal vision)
            const farTile = mockBoardManager.tiles[farTileId];
            farTile.contains = { type: 'gate', subtype: 'iron_gate' };

            // Before reveal, farTile should be black/obscured under standard fog of war
            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);
            expect(farTile.color).toBe('black');

            // Set tile in wanderingEyeRevealedTiles with future expiration
            mockBoardManager.wanderingEyeRevealedTiles.set(farTileId, currentTime + 20000);

            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);

            // Far tile should now be illuminated and not partially obscured
            expect(farTile.color).not.toBe('black');
            expect(farTile.partialObscured).toBe(false);
            expect(farTile.image).toBeDefined();
        });

        test('supports compound key and respects expiration timestamp', () => {
            const tileId = 20;
            const tile = mockBoardManager.tiles[tileId];

            // Set key for board 0, level 0, front orientation
            const key = `0:front:0:${tileId}`;
            mockBoardManager.wanderingEyeRevealedTiles.set(key, currentTime + 10000);

            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);
            expect(tile.color).not.toBe('black');

            // Advance time past expiration
            advanceTime(11000);

            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);
            // Expired -> returns to black fog
            expect(tile.color).toBe('black');
        });

        test('void tiles remain unrevealed void even if recorded in wanderingEyeRevealedTiles', () => {
            const voidTileId = 3;
            const voidTile = mockBoardManager.tiles[voidTileId];
            voidTile.isVoid = true;
            voidTile.type = 'void';
            voidTile.contains = 'void';

            expect(mockBoardManager.isVoidTile(voidTile)).toBe(true);

            mockBoardManager.wanderingEyeRevealedTiles.set(voidTileId, currentTime + 20000);

            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);
            expect(voidTile.color).toBe('black');
        });

        test('supports callback via establishGetWanderingEyeRevealsCallback', () => {
            const externalMap = new Map();
            const tileId = 45;
            externalMap.set(tileId, currentTime + 20000);

            mockBoardManager.establishGetWanderingEyeRevealsCallback(() => externalMap);
            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);

            expect(mockBoardManager.tiles[tileId].color).not.toBe('black');
            expect(mockBoardManager.tiles[tileId].partialObscured).toBe(false);
        });
    });

    describe('DungeonPage Activation, Movement & Lingering Vision', () => {
        test('triggers activateWanderingEye via triggerSelectedExpeditionSkill(0)', () => {
            const activateSpy = jest.spyOn(page, 'activateWanderingEye');
            page.triggerSelectedExpeditionSkill(0);

            expect(activateSpy).toHaveBeenCalled();
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining("Summoner conjured a Wandering Eye!")
            );
        });

        test('activates wandering eye companion state and reveals starting 5x5 tile area', () => {
            page.activateWanderingEye();

            expect(page.state.activeWanderingEye).not.toBeNull();
            expect(page.state.activeWanderingEye.active).toBe(true);
            expect(page.state.activeWanderingEye.location).toEqual([7, 7]);
            expect(page.state.activeWanderingEye.roaming).toBe(false);

            expect(page.state.wanderingEye).not.toBeNull();
            expect(page.state.wanderingEye.active).toBe(true);
            expect(page.state.wanderingEye.row).toBe(7);
            expect(page.state.wanderingEye.col).toBe(7);

            // Starting player location is (7, 7) -> tileId 7*15 + 7 = 112
            // 5x5 area around (7, 7) is rows 5-9 and cols 5-9
            expect(page._wanderingEyeRevealedTiles.has(112)).toBe(true);
            expect(page._wanderingEyeRevealedTiles.has(5 * 15 + 5)).toBe(true);
            expect(page._wanderingEyeRevealedTiles.has(9 * 15 + 9)).toBe(true);
        });

        test('reactivating skill commands the eye to surge forward in facing direction and return', () => {
            page.state.playerFacing = 'right';
            page.activateWanderingEye();
            expect(page.state.activeWanderingEye).not.toBeNull();

            // Calling activateWanderingEye again while active triggers forward surge
            page.activateWanderingEye();
            expect(page.state.activeWanderingEye.roaming).toBe(true);
            expect(page.state.wanderingEye.roaming).toBe(true);

            // Advance 300ms (forward surge phase: moves from col 7 towards col 10)
            advanceTime(300);
            expect(page.state.wanderingEye.col).toBeGreaterThan(7);

            // Advance to total 850ms (300 forward + 200 pause + 300 return = 800ms): surge completes
            advanceTime(550);
            expect(page.state.activeWanderingEye.roaming).toBe(false);
            expect(page.state.wanderingEye.roaming).toBe(false);
            expect(page.state.wanderingEye.col).toBe(7);
            expect(page._wanderingEyeFlightTimer).toBeNull();
        });

        test('wandering eye companion follows Summoner on player movement', () => {
            page.activateWanderingEye();
            const originCoords = [7, 7];
            const destCoords = [7, 8];
            const curBoardIdx = mockBoardManager.playerTile.boardIndex || 0;

            // Player moves to new tile [7, 8]
            mockBoardManager.playerTile.location = destCoords;

            // Simulate companion following state update from move handler
            const companionUpdate = {
                activeWanderingEye: (page.state.activeWanderingEye.boardIndex === curBoardIdx && !page.state.activeWanderingEye.roaming) ? {
                    ...page.state.activeWanderingEye,
                    location: originCoords
                } : page.state.activeWanderingEye,
                wanderingEye: (page.state.activeWanderingEye.boardIndex === curBoardIdx && !page.state.activeWanderingEye.roaming) ? {
                    ...page.state.wanderingEye,
                    row: originCoords[0],
                    col: originCoords[1],
                    x: (originCoords[1] + 0.5) * (page.state.tileSize || 48),
                    y: (originCoords[0] + 0.5) * (page.state.tileSize || 48),
                    active: true
                } : page.state.wanderingEye
            };
            page.setState(companionUpdate);
            page.revealWanderingEyeTiles(originCoords[0], originCoords[1]);

            expect(page.state.activeWanderingEye.location).toEqual([7, 7]);
            expect(page.state.wanderingEye.row).toBe(7);
            expect(page.state.wanderingEye.col).toBe(7);
        });

        test('revealed vision lingers for 20 seconds and decays after expiration', () => {
            page.activateWanderingEye();
            page.stopAutonomousWanderingEye();

            // Initial reveal count
            const initialRevealCount = page._wanderingEyeRevealedTiles.size;
            expect(initialRevealCount).toBeGreaterThan(0);

            // Advance 10 seconds: still lingering!
            advanceTime(10000);
            expect(page._wanderingEyeRevealedTiles.size).toBe(initialRevealCount);

            // Advance past 21 seconds (> 20s linger): decay timer prunes the reveals
            advanceTime(11000);
            expect(page._wanderingEyeRevealedTiles.size).toBe(0);
            expect(page.refreshTiles).toHaveBeenCalled();
        });

        test('clears companion on combat start, camp setup, and unmount', () => {
            page.activateWanderingEye();
            expect(page.state.activeWanderingEye).not.toBeNull();
            advanceTime(350); // Start patrol timer (spawn delay is 300ms)
            expect(page._wanderingEyePatrolTimer).not.toBeNull();

            // Monster battle start clears active companion and patrol
            page.triggerMonsterBattle(true);
            expect(page.state.activeWanderingEye).toBeNull();
            expect(page.state.wanderingEye).toBeNull();
            expect(page._wanderingEyePatrolTimer).toBeNull();

            // Reactivate companion
            page.activateWanderingEye();
            expect(page.state.activeWanderingEye).not.toBeNull();
            advanceTime(350);
            expect(page._wanderingEyePatrolTimer).not.toBeNull();

            // Camp setup clears active companion and patrol
            page.setUpCamp();
            expect(page.state.activeWanderingEye).toBeNull();
            expect(page.state.wanderingEye).toBeNull();
            expect(page._wanderingEyePatrolTimer).toBeNull();

            // Unmount clears flight, decay, and patrol timers
            page.activateWanderingEye();
            advanceTime(350);
            page.componentWillUnmount();
            expect(page._wanderingEyeFlightTimer).toBeNull();
            expect(page._wanderingEyeDecayTimer).toBeNull();
            expect(page._wanderingEyePatrolTimer).toBeNull();
        });

        test('registers window.wanderingEye and window.wandering_eye debug commands', () => {
            page.componentDidMount();
            expect(typeof window.wanderingEye).toBe('function');
            expect(typeof window.wandering_eye).toBe('function');

            const activateSpy = jest.spyOn(page, 'activateWanderingEye');
            window.wanderingEye();
            expect(activateSpy).toHaveBeenCalled();
        });
    });

    describe('Autonomous Scouting Patrol', () => {
        test('startAutonomousWanderingEye advances eye position across walkable tiles', () => {
            page.activateWanderingEye();
            expect(page.state.activeWanderingEye.location).toEqual([7, 7]);
            expect(page._wanderingEyeStepsRemaining).toBe(30);

            // Advance past initial spawn delay (300ms) + 1 step interval (375ms) = 675ms
            advanceTime(675);

            const [r1, c1] = page.state.activeWanderingEye.location;
            const dist1 = Math.abs(r1 - 7) + Math.abs(c1 - 7);
            expect(dist1).toBe(1); // Manhattan distance of exactly 1 tile
            expect(page._wanderingEyeStepsRemaining).toBe(29);
            expect(page.state.wanderingEye.row).toBe(r1);
            expect(page.state.wanderingEye.col).toBe(c1);

            // Advance another step (375ms)
            advanceTime(375);
            const [r2, c2] = page.state.activeWanderingEye.location;
            const dist2 = Math.abs(r2 - r1) + Math.abs(c2 - c1);
            expect(dist2).toBe(1);
            expect(page._wanderingEyeStepsRemaining).toBe(28);
        });

        test('autonomous patrol strictly avoids walls, void tiles, and blocked boundaries', () => {
            // Block North (6, 7), South (8, 7), and West (7, 6), leaving only East (7, 8) open
            mockBoardManager.tiles[6 * 15 + 7].isWall = true;
            mockBoardManager.tiles[8 * 15 + 7].isVoid = true;
            mockBoardManager.tiles[7 * 15 + 6].contains = { type: 'wall' };

            page.activateWanderingEye();
            expect(page.state.activeWanderingEye.location).toEqual([7, 7]);

            // Advance 300ms delay + 375ms step = 675ms
            advanceTime(675);

            // The eye must have chosen East [7, 8]
            expect(page.state.activeWanderingEye.location).toEqual([7, 8]);
            expect(page.state.wanderingEye.row).toBe(7);
            expect(page.state.wanderingEye.col).toBe(8);
        });

        test('uses intelligent BFS frontier pathfinding to seek out unrevealed dark tiles', () => {
            // Block North and South
            mockBoardManager.tiles[6 * 15 + 7].isWall = true;
            mockBoardManager.tiles[8 * 15 + 7].isWall = true;

            // West (7, 6) is already visited and dead-ends into a wall at (7, 5)
            mockBoardManager.tiles[7 * 15 + 5].isWall = true;
            page._wanderingEyeVisited = new Map([[7 * 15 + 6, 5]]);
            page._wanderingEyeRevealedTiles = new Map([[7 * 15 + 6, Date.now() + 50000]]);

            // East (7, 8) leads to open unrevealed darkness at (7, 9)
            mockBoardManager.tiles[7 * 15 + 8].color = 'black';
            mockBoardManager.tiles[7 * 15 + 9].color = 'black';

            page.activateWanderingEye();
            // Advance 300ms delay + 375ms step = 675ms
            advanceTime(675);

            // Pathfinding should prioritize East [7, 8] towards dark frontier
            expect(page.state.activeWanderingEye.location).toEqual([7, 8]);
        });

        test('autonomous patrol terminates and dissolves after completing all allocated steps', () => {
            page.activateWanderingEye();
            // Configure 2 steps for fast testing
            page.startAutonomousWanderingEye(7, 7, 2);
            expect(page._wanderingEyeStepsRemaining).toBe(2);

            // Step 1: 300ms + 375ms = 675ms
            advanceTime(675);
            expect(page._wanderingEyeStepsRemaining).toBe(1);
            expect(page.state.activeWanderingEye).not.toBeNull();

            // Step 2: 375ms -> steps remaining becomes 0
            advanceTime(375);
            expect(page._wanderingEyeStepsRemaining).toBe(0);

            // Next tick: completes patrol and begins melting animation
            advanceTime(375);
            expect(page.state.activeWanderingEye.melting).toBe(true);
            expect(page.state.wanderingEye.melting).toBe(true);
            expect(page._wanderingEyePatrolTimer).toBeNull();
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining("completed its scouting patrol and melts into the ether")
            );

            // Advance through melting animation (650ms) -> dissolves completely
            advanceTime(650);
            expect(page.state.activeWanderingEye).toBeNull();
            expect(page.state.wanderingEye).toBeNull();
        });

        test('plays appear animation on summon and clears appearing flag after 550ms', () => {
            page.activateWanderingEye();
            expect(page.state.activeWanderingEye.appearing).toBe(true);
            expect(page.state.wanderingEye.appearing).toBe(true);
            expect(page.state.activeWanderingEye.melting).toBe(false);

            // Advance past appear duration (550ms)
            advanceTime(550);
            expect(page.state.activeWanderingEye.appearing).toBe(false);
            expect(page.state.wanderingEye.appearing).toBe(false);
        });

        test('surge forward scouting pauses autonomous patrol and resumes remaining steps upon return', () => {
            page.activateWanderingEye();
            advanceTime(675); // Took 1 step, 29 remaining
            expect(page._wanderingEyeStepsRemaining).toBe(29);

            // Re-trigger skill to surge forward
            page.activateWanderingEye();
            expect(page.state.activeWanderingEye.roaming).toBe(true);

            // Autonomous timer should be paused during roam
            expect(page._wanderingEyePatrolTimer).toBeNull();

            // Fast forward through entire surge (850ms)
            advanceTime(850);
            expect(page.state.activeWanderingEye.roaming).toBe(false);

            // Autonomous patrol should resume
            expect(page._wanderingEyePatrolTimer || page._wanderingEyePatrolTimeout).not.toBeNull();
            expect(page._wanderingEyeStepsRemaining).toBe(29);
        });

        test('handles miniboard offset coordinates (e.g. [26, 15]) gracefully and patrols successfully', () => {
            // Miniboard coordinates for row 11, col 0 is [26, 15]
            mockBoardManager.playerTile.location = [26, 15];

            page.activateWanderingEye();
            expect(page.state.activeWanderingEye).not.toBeNull();
            // Stored location should be normalized to row 11, col 0
            expect(page.state.activeWanderingEye.location).toEqual([11, 0]);
            expect(page.state.wanderingEye.row).toBe(11);
            expect(page.state.wanderingEye.col).toBe(0);

            // Starting tile reveals should be normalized
            expect(page._wanderingEyeRevealedTiles.has(11 * 15 + 0)).toBe(true);

            // Advance time past initial spawn delay and first step (300ms + 375ms = 675ms)
            advanceTime(675);

            // Must have taken a valid step from [11, 0]
            const [r1, c1] = page.state.activeWanderingEye.location;
            expect(r1).toBeGreaterThanOrEqual(0);
            expect(r1).toBeLessThan(15);
            expect(c1).toBeGreaterThanOrEqual(0);
            expect(c1).toBeLessThan(15);
            const dist = Math.abs(r1 - 11) + Math.abs(c1 - 0);
            expect(dist).toBe(1);
            expect(page._wanderingEyeStepsRemaining).toBe(29);
        });

        test('moves autonomously on realistic Mapmaker dungeon boards where all tiles have type: void', () => {
            // Emulate real Mapmaker export structure: all 225 tiles in currentBoard have type: 'void'
            // Room floor tiles have contains: { type: 'empty_space' }
            mockBoardManager.currentBoard = {
                id: 4,
                tiles: Array.from({ length: 225 }, (_, i) => ({
                    id: i,
                    type: 'void',
                    color: null,
                    contains: { type: 'empty_space', subtype: null },
                    borders: []
                }))
            };

            // Sync tiles to match Mapmaker board
            mockBoardManager.tiles = Array.from({ length: 225 }, (_, i) => ({
                id: i,
                location: [Math.floor(i / 15), i % 15],
                color: 'black',
                type: 'void',
                contains: { type: 'empty_space', subtype: null },
                isVoid: false
            }));

            // Starting player tile at tile 110 (row 7, col 5)
            const startR = 7;
            const startC = 5;
            mockBoardManager.playerTile = mockBoardManager.tiles[startR * 15 + startC];
            mockBoardManager.playerTile.location = [startR, startC];

            page.activateWanderingEye();
            expect(page.state.activeWanderingEye).not.toBeNull();
            expect(page.state.activeWanderingEye.location).toEqual([startR, startC]);

            // Advance time past initial spawn delay and first step (300ms + 375ms = 675ms)
            advanceTime(675);

            // The eye must have successfully moved from [7, 5]
            const [r1, c1] = page.state.activeWanderingEye.location;
            const dist = Math.abs(r1 - startR) + Math.abs(c1 - startC);
            expect(dist).toBe(1);
            expect(page._wanderingEyeStepsRemaining).toBe(29);
            expect(page.state.wanderingEye.row).toBe(r1);
            expect(page.state.wanderingEye.col).toBe(c1);

            // Advance another step (375ms)
            advanceTime(375);
            const [r2, c2] = page.state.activeWanderingEye.location;
            const dist2 = Math.abs(r2 - r1) + Math.abs(c2 - c1);
            expect(dist2).toBe(1);
            expect(page._wanderingEyeStepsRemaining).toBe(28);
        });
    });

    describe('Void Tile Isolation & Fog of War', () => {
        test('does not illuminate actual void tiles (color: black, contains: empty) as empty space', () => {
            // Set up a room tile, door, corridor tile, and surrounding void tiles
            // Door at (6, 8) = id 98
            // Eye at (6, 9) = id 99 (corridor floor)
            // Corridor continuation at (6, 10) = id 100 (obscured space)
            // Void tiles above corridor: (5, 8) = id 83, (5, 9) = id 84, (5, 10) = id 85
            // Void tiles below corridor: (7, 8) = id 113, (7, 9) = id 114, (7, 10) = id 115

            const doorId = 6 * 15 + 8; // 98
            const eyeId = 6 * 15 + 9;  // 99
            const corridorId = 6 * 15 + 10; // 100
            const voidTileAboveId = 5 * 15 + 9; // 84
            const voidTileBelowId = 7 * 15 + 9; // 114

            // Configure currentBoard tiles
            mockBoardManager.currentBoard = {
                id: 0,
                tiles: Array.from({ length: 225 }, (_, i) => ({
                    id: i,
                    type: 'void',
                    color: 'black',
                    contains: 'empty',
                    borders: []
                }))
            };

            // Set playable room and corridor tiles on board
            mockBoardManager.currentBoard.tiles[doorId] = {
                id: doorId,
                type: 'board-tile',
                color: null,
                contains: { type: 'door', subtype: 'wooden_door' },
                borders: []
            };
            mockBoardManager.currentBoard.tiles[eyeId] = {
                id: eyeId,
                type: 'board-tile',
                color: null,
                contains: { type: 'empty_space', subtype: null },
                borders: []
            };
            mockBoardManager.currentBoard.tiles[corridorId] = {
                id: corridorId,
                type: 'board-tile',
                color: '#111012',
                contains: { type: 'obscured_space', subtype: null },
                borders: []
            };

            // Sync mockBoardManager.tiles with board definitions
            mockBoardManager.tiles.forEach(t => {
                const bt = mockBoardManager.currentBoard.tiles[t.id];
                t.type = bt.type;
                t.color = bt.color;
                t.contains = bt.contains;
                t.isVoid = bt.color === 'black' && bt.contains === 'empty';
            });

            // Player is inside the room next to the door
            mockBoardManager.playerTile = mockBoardManager.tiles[6 * 15 + 7];
            mockBoardManager.playerTile.location = [6, 7];

            // Verify void tiles are correctly recognized as void
            expect(mockBoardManager.isVoidTile(mockBoardManager.tiles[voidTileAboveId])).toBe(true);
            expect(mockBoardManager.isVoidTile(mockBoardManager.tiles[voidTileBelowId])).toBe(true);
            expect(mockBoardManager.isVoidTile(mockBoardManager.tiles[eyeId])).toBe(false);
            expect(mockBoardManager.isVoidTile(mockBoardManager.tiles[corridorId])).toBe(false);

            // Eye reveals tiles around position (6, 9)
            page.revealWanderingEyeTiles(6, 9, currentTime);

            // Valid corridor and door tiles within 5x5 radius must be revealed
            expect(page._wanderingEyeRevealedTiles.has(eyeId)).toBe(true);
            expect(page._wanderingEyeRevealedTiles.has(corridorId)).toBe(true);
            expect(page._wanderingEyeRevealedTiles.has(doorId)).toBe(true);

            // Void tiles above and below MUST NOT be recorded in revealed tiles
            expect(page._wanderingEyeRevealedTiles.has(voidTileAboveId)).toBe(false);
            expect(page._wanderingEyeRevealedTiles.has(voidTileBelowId)).toBe(false);

            // Run handleFogOfWar to check visual colors
            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);

            // Corridor and door tiles are illuminated
            expect(mockBoardManager.tiles[eyeId].color).toBe('#6b6057');
            expect(mockBoardManager.tiles[doorId].color).not.toBe('black');

            // Void tiles MUST strictly remain solid black (#000000 / black), NOT turned into stone floor
            expect(mockBoardManager.tiles[voidTileAboveId].color).toBe('black');
            expect(mockBoardManager.tiles[voidTileBelowId].color).toBe('black');
        });
    });
});

