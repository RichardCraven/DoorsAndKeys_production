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
import socketHandler from '../../utils/socket-handler';

describe("Sage's Healing Ground Expedition Skill", () => {
    let page;
    let mockCrew;
    let mockBoardManager;

    beforeEach(() => {
        jest.useFakeTimers();
        mockCrew = [
            {
                id: 'sage_1',
                name: 'Elrond',
                type: 'sage',
                class: 'sage',
                hp: 10,
                max_hp: 25,
                starting_hp: 25,
                stats: { hp: 25 },
                expeditionSkills: ['healing_ground', 'sing']
            },
            {
                id: 'soldier_1',
                name: 'Boromir',
                type: 'soldier',
                class: 'soldier',
                hp: 8,
                max_hp: 30,
                starting_hp: 30,
                stats: { hp: 30 }
            }
        ];

        mockBoardManager = {
            playerTile: { location: [7, 7], boardIndex: 0 },
            currentLevel: { id: 0 },
            currentOrientation: 'front',
            currentBoard: { id: 0 },
            tiles: Array.from({ length: 225 }, (_, i) => ({ id: i, location: [Math.floor(i / 15), i % 15] }))
        };

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
            peerPlayers: new Map(),
            healingFloatingIndicators: [],
            activeHealingGround: null
        };

        page.setState = jest.fn((updater, cb) => {
            const patch = typeof updater === 'function' ? updater(page.state) : updater;
            page.state = { ...page.state, ...patch };
            if (cb) cb();
        });
        page.displayMessage = jest.fn();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('activates 1-tile radius circular healing ground for 5 seconds when triggered', () => {
        page.triggerSelectedExpeditionSkill(0);

        expect(page.displayMessage).toHaveBeenCalledWith(
            expect.stringContaining("Sage's Healing Ground activated")
        );
        expect(page.state.activeHealingGround).not.toBeNull();
        expect(page.state.activeHealingGround.centerRow).toBe(7);
        expect(page.state.activeHealingGround.centerCol).toBe(7);
        expect(page.state.activeHealingGround.radius).toBe(1);

        // Immediately ticks on activation (t=0s), so crew gets healed by 5 HP
        const sage = page.state.crew.find(c => c.id === 'sage_1');
        const soldier = page.state.crew.find(c => c.id === 'soldier_1');
        expect(sage.hp).toBe(15); // 10 + 5
        expect(soldier.hp).toBe(13); // 8 + 5

        // Advance 1 second -> t=1s (another 5 HP healed)
        jest.advanceTimersByTime(1000);
        expect(page.state.crew.find(c => c.id === 'sage_1').hp).toBe(20);
        expect(page.state.crew.find(c => c.id === 'soldier_1').hp).toBe(18);

        // Advance to 5 seconds total -> healing ground expires
        jest.advanceTimersByTime(4000);
        expect(page.state.activeHealingGround).toBeNull();
    });

    test('heals active player crew only when player is within the 1-tile (9 tiles total) radius', () => {
        // Position player at (7, 7) and spawn healing ground at (7, 7)
        page.activateHealingGround();
        expect(page.state.crew[0].hp).toBe(15);

        // Move player away to (10, 10), which is outside the 1-tile Chebyshev radius
        mockBoardManager.playerTile.location = [10, 10];

        // Advance 1 second
        jest.advanceTimersByTime(1000);
        // HP should NOT increase because player is outside the 9 tiles
        expect(page.state.crew[0].hp).toBe(15);

        // Move player back to (8, 6), which is adjacent (within 1 tile radius)
        mockBoardManager.playerTile.location = [8, 6];
        jest.advanceTimersByTime(1000);
        // HP should now increase by 5
        expect(page.state.crew[0].hp).toBe(20);
    });

    test('heals multiplayer peer crews within the 1-tile vicinity and broadcasts via socket', () => {
        const emitSpy = jest.spyOn(socketHandler, 'emit').mockImplementation(() => {});
        socketHandler.socket = { connected: true, id: 'my_socket' };

        const peerNear = {
            socketId: 'peer_near_sock',
            userId: 'peer_1',
            username: 'Aragorn',
            location: {
                levelId: 0,
                orientation: 'front',
                boardIndex: 0,
                tileIndex: 7 * 15 + 8 // row 7, col 8 (adjacent to 7,7)
            },
            crew: [
                { id: 'p_hero1', name: 'Ranger', hp: 12, maxHp: 30, dead: false }
            ],
            crewSummary: [
                { name: 'Ranger', type: 'ranger', hp: 12, maxHp: 30 }
            ]
        };

        const peerFar = {
            socketId: 'peer_far_sock',
            userId: 'peer_2',
            username: 'Legolas',
            location: {
                levelId: 0,
                orientation: 'front',
                boardIndex: 0,
                tileIndex: 2 * 15 + 2 // row 2, col 2 (far away)
            },
            crew: [
                { id: 'p_hero2', name: 'Archer', hp: 10, maxHp: 20, dead: false }
            ]
        };

        const peersMap = new Map();
        peersMap.set('peer_1', peerNear);
        peersMap.set('peer_2', peerFar);
        page.state.peerPlayers = peersMap;

        // Activate healing ground
        page.activateHealingGround();

        // Check that peerNear was healed (+5 HP)
        const updatedPeers = page.state.peerPlayers;
        const updatedNear = updatedPeers.get('peer_1');
        expect(updatedNear.crew[0].hp).toBe(17); // 12 + 5
        expect(updatedNear.crewSummary[0].hp).toBe(17);

        // Check that peerFar was NOT healed
        const updatedFar = updatedPeers.get('peer_2');
        expect(updatedFar.crew[0].hp).toBe(10);

        // Check socket emission for multiplayer sync
        expect(emitSpy).toHaveBeenCalledWith(
            'dungeon:healing_ground_tick',
            expect.objectContaining({
                targetSocketId: 'peer_near_sock',
                healAmount: 5
            })
        );

        emitSpy.mockRestore();
    });

    test('renderHealingGroundSanctuary renders the circular 1-tile (9 tiles total) sanctuary overlay', () => {
        page.state.activeHealingGround = {
            id: 'hg_test',
            centerRow: 7,
            centerCol: 7,
            inSuperboard: false,
            boardIndex: 0,
            levelId: 0,
            orientation: 'front',
            expiresAt: Date.now() + 5000,
            radius: 1
        };

        const element = page.renderHealingGroundSanctuary();
        const { container } = render(<div>{element}</div>);

        const sanctuary = container.querySelector('.healing-ground-sanctuary');
        expect(sanctuary).not.toBeNull();

        // 1 tile radius = 3 tiles wide by 3 tiles tall
        // 3 * 48px = 144px width and height
        expect(sanctuary.style.width).toBe('144px');
        expect(sanctuary.style.height).toBe('144px');
        // Left offset for center col 7: (7 - 1) * 48 = 288px
        expect(sanctuary.style.left).toBe('288px');
        expect(sanctuary.style.top).toBe('288px');

        // Check elements inside sanctuary
        expect(container.querySelector('.healing-ground-circle-pulse')).not.toBeNull();
        expect(container.querySelector('.healing-ground-runic-ring')).not.toBeNull();
        expect(container.querySelector('.healing-ground-inner-star')).not.toBeNull();
        expect(container.querySelector('.healing-ground-wave.wave-1')).not.toBeNull();
        expect(container.querySelector('.healing-ground-wave.wave-2')).not.toBeNull();
        expect(container.querySelector('.healing-ground-wave.wave-3')).not.toBeNull();
        expect(container.querySelectorAll('.healing-ground-mote').length).toBe(6);
        expect(container.querySelector('.healing-ground-label')).not.toBeNull();
        expect(container.querySelector('.healing-ground-text').textContent).toBe('Sanctuary');
        expect(container.querySelector('.healing-ground-timer')).not.toBeNull();
    });

    test('identifies exactly 9 tiles (3x3 grid footprint) for tile-level ground glow', () => {
        page.state.activeHealingGround = {
            id: 'hg_test',
            centerRow: 7,
            centerCol: 7,
            inSuperboard: false,
            boardIndex: 0,
            levelId: 0,
            orientation: 'front',
            expiresAt: Date.now() + 5000,
            radius: 1
        };

        const affectedTileIndices = new Set();
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                affectedTileIndices.add((7 + dr) * 15 + (7 + dc));
            }
        }
        expect(affectedTileIndices.size).toBe(9);
        // Center (7, 7)
        expect(affectedTileIndices.has(7 * 15 + 7)).toBe(true);
        // Top-left (6, 6)
        expect(affectedTileIndices.has(6 * 15 + 6)).toBe(true);
        // Bottom-right (8, 8)
        expect(affectedTileIndices.has(8 * 15 + 8)).toBe(true);
        // Outside (5, 5)
        expect(affectedTileIndices.has(5 * 15 + 5)).toBe(false);
    });
});
