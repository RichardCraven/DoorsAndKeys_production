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
import { CrewManager } from '../../utils/crew-manager';
import skillsMatrix from '../../utils/skills-matrix';
import { storeMeta, getMeta } from '../../utils/session-handler';

describe("Summoner Novel Expedition Skills: Shadow Effigy & Void Fetch", () => {
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
                name: 'Vaelis',
                type: 'summoner',
                class: 'summoner',
                hp: 20,
                max_hp: 20,
                starting_hp: 20,
                stats: { hp: 20, int: 8 },
                expeditionSkills: ['wandering_eye', 'shadow_effigy', 'void_fetch']
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
            isVoid: false,
            hasTrap: false,
            trapDisarmed: false,
            trapRevealed: false
        }));
        mockBoardManager.playerTile = mockBoardManager.tiles[7 * 15 + 7]; // (7, 7)
        mockBoardManager.refreshTiles = jest.fn();
        mockBoardManager.handleInteraction = jest.fn();

        storeMeta({
            resolve: 10,
            crew: mockCrew,
            inventory: []
        });

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
            playerFacing: 'right',
            activeShadowEffigy: null,
            activeVoidFetch: null
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
        if (page && page._shadowEffigyInterval) {
            clearInterval(page._shadowEffigyInterval);
            page._shadowEffigyInterval = null;
        }
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('Skills Matrix & Crew Defaults', () => {
        test('registers shadow_effigy in skillsMatrix with expected metadata', () => {
            const skill = skillsMatrix.shadow_effigy;
            expect(skill).toBeDefined();
            expect(skill.class).toBe('summoner');
            expect(skill.type).toBe('utility');
            expect(skill.name).toBe('Shadow Effigy');
            expect(skill.resolveCost).toBe(3);
            expect(skill.knownByDefault).toBe(true);
            expect(skill.desc).toContain('spectral decoy');
            expect(skill.icon).toBeDefined();
        });

        test('registers void_fetch in skillsMatrix with expected metadata', () => {
            const skill = skillsMatrix.void_fetch;
            expect(skill).toBeDefined();
            expect(skill.class).toBe('summoner');
            expect(skill.type).toBe('utility');
            expect(skill.name).toBe('Void Fetch');
            expect(skill.resolveCost).toBe(2);
            expect(skill.knownByDefault).toBe(true);
            expect(skill.desc).toContain('winged shade');
            expect(skill.icon).toBeDefined();
        });

        test('CrewManager initializes default summoner with all 3 expedition skills', () => {
            const cm = new CrewManager();
            const summoner = cm.adventurers.find(c => c && (c.type === 'summoner' || c.image === 'summoner'));
            expect(summoner).toBeDefined();
            expect(summoner.expeditionSkills).toEqual(['wandering_eye', 'shadow_effigy', 'void_fetch']);
        });

        test('CrewManager migrates legacy summoner missing novel expedition skills', () => {
            const cm = new CrewManager();
            const legacySummoner = {
                id: 1234,
                name: 'Legacy Summoner',
                type: 'summoner',
                specialActions: [],
                expeditionSkills: ['wandering_eye']
            };
            cm.initializeCrew([legacySummoner]);
            expect(legacySummoner.expeditionSkills).toContain('wandering_eye');
            expect(legacySummoner.expeditionSkills).toContain('shadow_effigy');
            expect(legacySummoner.expeditionSkills).toContain('void_fetch');
        });
    });

    describe('Expedition Slot Dispatch in DungeonPage', () => {
        test('slot 1 triggers activateShadowEffigy', () => {
            const effigySpy = jest.spyOn(page, 'activateShadowEffigy');
            page.triggerSelectedExpeditionSkill(1);
            expect(effigySpy).toHaveBeenCalled();
        });

        test('slot 2 triggers activateVoidFetch', () => {
            const voidSpy = jest.spyOn(page, 'activateVoidFetch');
            page.triggerSelectedExpeditionSkill(2);
            expect(voidSpy).toHaveBeenCalled();
        });
    });

    describe('Shadow Effigy Mechanics', () => {
        test('fails and displays error message if player has insufficient resolve (< 3)', () => {
            storeMeta({ resolve: 2 });
            page.activateShadowEffigy();
            expect(page.displayMessage).toHaveBeenCalledWith("❌ Shadow Effigy requires 3 Resolve!");
            expect(page.state.activeShadowEffigy).toBeNull();
        });

        test('deducts 3 Resolve and spawns activeShadowEffigy at player location', () => {
            storeMeta({ resolve: 10 });
            page.state.playerFacing = 'right';
            page.activateShadowEffigy();

            expect(getMeta().resolve).toBe(7);
            expect(page.state.activeShadowEffigy).toEqual({
                row: 7,
                col: 7,
                facing: 'right',
                bursting: false
            });
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining("Summoner conjured a Shadow Effigy")
            );
        });

        test('strides forward in facing direction and freezes monster patrols on impact', () => {
            storeMeta({ resolve: 10 });
            page.state.playerFacing = 'right';
            page.activateShadowEffigy();

            // Advance one step (360ms) -> moves from (7, 7) to (7, 8)
            advanceTime(360);
            expect(page.state.activeShadowEffigy.row).toBe(7);
            expect(page.state.activeShadowEffigy.col).toBe(8);
            expect(page.state.activeShadowEffigy.bursting).toBe(false);

            // Put a monster on tile (7, 9)
            const monsterTile = mockBoardManager.tiles[7 * 15 + 9];
            monsterTile.contains = 'monster';

            // Advance next step (360ms) -> hits monster at (7, 9)
            advanceTime(360);
            expect(page.state.activeShadowEffigy.col).toBe(9);
            expect(page.state.activeShadowEffigy.bursting).toBe(true);
            expect(page.state.stopwatchFrozenUntil).toBe(currentTime + 8000);
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining("Shadow Effigy shattered in a burst of wraith-frost")
            );

            // After burst duration (650ms), activeShadowEffigy is cleared
            advanceTime(650);
            expect(page.state.activeShadowEffigy).toBeNull();
        });

        test('shatters upon reaching dungeon boundary', () => {
            storeMeta({ resolve: 10 });
            page.state.playerFacing = 'up';
            mockBoardManager.playerTile.location = [1, 5];
            page.activateShadowEffigy();

            // Step 1: from [1, 5] to [0, 5]
            advanceTime(360);
            expect(page.state.activeShadowEffigy.row).toBe(0);

            // Step 2: out of bounds (< 0) -> shatters at [0, 5]
            advanceTime(360);
            expect(page.state.activeShadowEffigy.bursting).toBe(true);
            expect(page.state.stopwatchFrozenUntil).toBe(currentTime + 8000);
        });
    });

    describe('Void Fetch Mechanics', () => {
        test('fails and displays error message if player has insufficient resolve (< 2)', () => {
            storeMeta({ resolve: 1 });
            page.activateVoidFetch();
            expect(page.displayMessage).toHaveBeenCalledWith("❌ Void Fetch requires 2 Resolve!");
            expect(page.state.activeVoidFetch).toBeNull();
        });

        test('displays message if no loot or traps are within 5 tiles', () => {
            storeMeta({ resolve: 10 });
            // Dungeon has only empty tiles
            page.activateVoidFetch();
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining("No reachable loot or traps within 5 tiles")
            );
            expect(page.state.activeVoidFetch).toBeNull();
            // Resolve should NOT be deducted if no valid target was found
            expect(getMeta().resolve).toBe(10);
        });

        test('detects and disarms distant trap within 5 tiles', () => {
            storeMeta({ resolve: 10 });
            // Player is at (7, 7). Place trap at (7, 10) (dist = 3)
            const trapTile = mockBoardManager.tiles[7 * 15 + 10];
            trapTile.hasTrap = true;
            trapTile.trapDisarmed = false;

            page.activateVoidFetch();

            expect(getMeta().resolve).toBe(8);
            expect(trapTile.hasTrap).toBe(false);
            expect(trapTile.trapDisarmed).toBe(true);
            expect(page.state.activeVoidFetch).toEqual({
                startRow: 7,
                startCol: 7,
                targetRow: 7,
                targetCol: 10,
                stage: 'flying_out'
            });

            // Advance timer for returning stage
            advanceTime(350);
            expect(page.state.activeVoidFetch.stage).toBe('returning');
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining("safely disarmed it with a summoned bone")
            );

            // Advance timer to complete flight
            advanceTime(400);
            expect(page.state.activeVoidFetch).toBeNull();
        });

        test('detects and retrieves distant loot within 5 tiles', () => {
            storeMeta({ resolve: 10 });
            // Player is at (7, 7). Place gold loot at (5, 7) (dist = 2)
            const lootTile = mockBoardManager.tiles[5 * 15 + 7];
            lootTile.contains = 'gold';

            page.activateVoidFetch();

            expect(getMeta().resolve).toBe(8);
            expect(mockBoardManager.handleInteraction).toHaveBeenCalledWith(lootTile);
            expect(page.state.activeVoidFetch).toEqual({
                startRow: 7,
                startCol: 7,
                targetRow: 5,
                targetCol: 7,
                stage: 'flying_out'
            });

            // Advance timer for returning stage
            advanceTime(350);
            expect(page.state.activeVoidFetch.stage).toBe('returning');
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining("retrieved gold")
            );

            // Complete animation
            advanceTime(400);
            expect(page.state.activeVoidFetch).toBeNull();
        });

        test('prioritizes closest loot over distant trap when both are in range', () => {
            storeMeta({ resolve: 10 });
            // Player is at (7, 7)
            // Loot at (7, 9) (dist = 2)
            const lootTile = mockBoardManager.tiles[7 * 15 + 9];
            lootTile.contains = 'food';

            // Trap at (7, 11) (dist = 4)
            const trapTile = mockBoardManager.tiles[7 * 15 + 11];
            trapTile.hasTrap = true;
            trapTile.trapDisarmed = false;

            page.activateVoidFetch();

            expect(mockBoardManager.handleInteraction).toHaveBeenCalledWith(lootTile);
            expect(page.state.activeVoidFetch.targetRow).toBe(7);
            expect(page.state.activeVoidFetch.targetCol).toBe(9);
            // Trap remains untouched because loot was targeted
            expect(trapTile.hasTrap).toBe(true);
        });
    });
});
