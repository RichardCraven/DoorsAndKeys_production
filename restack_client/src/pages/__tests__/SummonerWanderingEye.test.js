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
        if (page && page._wanderingEyeFlightTimer) {
            clearInterval(page._wanderingEyeFlightTimer);
            page._wanderingEyeFlightTimer = null;
        }
        if (page && page._wanderingEyeDecayTimer) {
            clearInterval(page._wanderingEyeDecayTimer);
            page._wanderingEyeDecayTimer = null;
        }
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

            console.log('DEBUG Test 3: Date.now() =', Date.now(), 'currentTime =', currentTime, 'exp =', mockBoardManager.wanderingEyeRevealedTiles.get(key));
            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);
            console.log('DEBUG Test 3 after handleFogOfWar: tile.color =', tile.color);
            // Expired -> returns to black fog
            expect(tile.color).toBe('black');
        });

        test('void tiles remain unrevealed void even if recorded in wanderingEyeRevealedTiles', () => {
            const voidTileId = 3;
            const voidTile = mockBoardManager.tiles[voidTileId];
            voidTile.isVoid = true;
            voidTile.type = 'void';
            voidTile.contains = 'void';

            const isVoid = mockBoardManager.isVoidTile(voidTile);
            console.log('DEBUG Test 4: isVoidTile(3) =', isVoid);
            expect(isVoid).toBe(true);

            mockBoardManager.wanderingEyeRevealedTiles.set(voidTileId, currentTime + 20000);

            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);
            console.log('DEBUG Test 4 after handleFogOfWar: voidTile.color =', voidTile.color);
            expect(voidTile.color).toBe('black');
        });

        test('supports callback via establishGetWanderingEyeRevealsCallback', () => {
            const externalMap = new Map();
            const tileId = 45;
            externalMap.set(tileId, currentTime + 20000);

            mockBoardManager.establishGetWanderingEyeRevealsCallback(() => externalMap);
            mockBoardManager.handleFogOfWar(mockBoardManager.playerTile);

            console.log('DEBUG Test 5: tile 45 color =', mockBoardManager.tiles[tileId].color, 'partialObscured =', mockBoardManager.tiles[tileId].partialObscured);
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

        test('activates wandering eye state and reveals starting 5x5 tile area', () => {
            page.activateWanderingEye();

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

        test('wandering eye moves smoothly over 5 seconds and despawns at t=5s', () => {
            page.activateWanderingEye();
            expect(page.state.wanderingEye).not.toBeNull();

            // Advance 2.5 seconds (halfway through flight)
            advanceTime(2500);
            expect(page.state.wanderingEye).not.toBeNull();
            expect(page.state.wanderingEye.active).toBe(true);

            // Eyeball should have progressed to another position
            const midRow = page.state.wanderingEye.row;
            const midCol = page.state.wanderingEye.col;
            expect(midRow !== 7 || midCol !== 7).toBe(true);

            // Advance remaining 2.5 seconds -> total 5000ms
            advanceTime(2550);

            // Eyeball despawns after 5 seconds
            expect(page.state.wanderingEye).toBeNull();
            expect(page._wanderingEyeFlightTimer).toBeNull();
        });

        test('revealed vision lingers for 20 seconds and does NOT get swallowed back up during flight or immediately after flight', () => {
            page.activateWanderingEye();

            // Check initial revealed tile count
            const initialRevealCount = page._wanderingEyeRevealedTiles.size;
            expect(initialRevealCount).toBeGreaterThan(0);

            // Advance 3 seconds: eye continues flying and reveals more tiles
            advanceTime(3000);
            expect(page._wanderingEyeRevealedTiles.size).toBeGreaterThanOrEqual(initialRevealCount);

            // Advance to 5.1 seconds: eye finishes flight and despawns
            advanceTime(2100);
            expect(page.state.wanderingEye).toBeNull();
            const totalFlightReveals = page._wanderingEyeRevealedTiles.size;
            expect(totalFlightReveals).toBeGreaterThanOrEqual(initialRevealCount);

            // Advance to 15 seconds (10s after eyeball despawned): still lingering!
            advanceTime(9900);
            expect(page._wanderingEyeRevealedTiles.size).toBe(totalFlightReveals);

            // Advance past 25 seconds (since last tiles were revealed at t=5s with 20s linger, they expire at t=25s):
            advanceTime(11000);
            expect(page._wanderingEyeRevealedTiles.size).toBe(0);
            expect(page.refreshTiles).toHaveBeenCalled();
            expect(page._wanderingEyeDecayTimer).toBeNull();
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
});
