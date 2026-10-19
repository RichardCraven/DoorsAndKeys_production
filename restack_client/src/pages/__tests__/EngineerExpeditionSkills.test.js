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
import { CombatManagerRedux } from '../../utils/combat-manager-redux';
import { storeMeta, getMeta } from '../../utils/session-handler';
import {
    SCRAP_CAP,
    GRAPPLE_COST,
    EMPLACEMENT_COST,
    EMPLACEMENT_REFUND,
    EMPLACEMENT_RADIUS,
    getScrap,
    addScrap,
    trySpendScrap,
    computeSalvageYield,
    isSalvageableTile,
    salvageTile,
    computeGrapplePath,
    findZiplineFrom,
    isWithinEmplacementRange
} from '../../utils/engineer-expedition';

describe("Engineer Expedition Skills: Salvage, Grapple Winch, Forward Emplacement", () => {
    let page;
    let mockCrew;
    let mockBoardManager;

    beforeEach(() => {
        mockCrew = [
            {
                id: 9901,
                name: 'Icaron',
                type: 'engineer',
                class: 'spellcaster',
                hp: 22,
                max_hp: 22,
                stats: { hp: 22, dex: 8, baseHp: 22 },
                level: 1,
                expeditionSkills: ['engineer_salvage', 'engineer_grapple_winch', 'engineer_forward_emplacement']
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
            contains: { type: 'empty_space', subtype: null },
            type: 'board-tile',
            isVoid: false
        }));
        // Center player at (7, 7) -> index 112
        mockBoardManager.playerTile = mockBoardManager.tiles[7 * 15 + 7];
        mockBoardManager.refreshTiles = jest.fn();
        mockBoardManager.handleInteraction = jest.fn();

        storeMeta({
            resolve: 10,
            scrap: 0,
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
            playerFacing: 'right'
        };
    });

    describe('Scrap resource helpers', () => {
        test('getScrap, addScrap, trySpendScrap enforce boundaries and 30-cap', () => {
            const meta = { scrap: 0 };
            expect(getScrap(meta)).toBe(0);
            addScrap(meta, 15);
            expect(getScrap(meta)).toBe(15);
            addScrap(meta, 25);
            expect(getScrap(meta)).toBe(SCRAP_CAP); // 30 max
            expect(trySpendScrap(meta, 10)).toBe(true);
            expect(getScrap(meta)).toBe(20);
            expect(trySpendScrap(meta, 50)).toBe(false);
            expect(getScrap(meta)).toBe(20);
        });

        test('computeSalvageYield scales with DEX', () => {
            const lowDexYield = computeSalvageYield(1, () => 0.99);
            const highDexYield = computeSalvageYield(12, () => 0.99);
            expect(lowDexYield).toBeGreaterThanOrEqual(1);
            expect(highDexYield).toBeLessThanOrEqual(3);
        });
    });

    describe('Salvage Skill', () => {
        test('dismantles adjacent clutter tile, clears it, and grants scrap', () => {
            // Place litter right in front of player at (7, 8)
            const targetTile = mockBoardManager.tiles[7 * 15 + 8];
            targetTile.contains = { type: 'dungeon_litter', subtype: 'pocket_litter' };
            targetTile.isPocketLitter = true;

            expect(isSalvageableTile(targetTile)).toBe(true);

            page.triggerSelectedExpeditionSkill(0); // engineer_salvage

            const meta = getMeta();
            expect(meta.scrap).toBeGreaterThan(0);
            expect(targetTile.salvaged).toBe(true);
            expect(targetTile.isPocketLitter).toBeUndefined();
        });

        test('reports message if no clutter is adjacent', () => {
            page.displayMessage = jest.fn();
            page.triggerSelectedExpeditionSkill(0);
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining('nothing to dismantle')
            );
        });
    });

    describe('Grapple Winch Skill', () => {
        test('fails when not enough scrap', () => {
            // Player facing right, tile (7, 8) is void, tile (7, 9) is walkable
            mockBoardManager.isVoidTile = (t) => t.location[1] === 8;
            mockBoardManager.tiles[7 * 15 + 8].isVoid = true;

            const meta = getMeta();
            meta.scrap = 1; // Needs GRAPPLE_COST (3)
            storeMeta(meta);

            page.displayMessage = jest.fn();
            page.triggerSelectedExpeditionSkill(1); // engineer_grapple_winch

            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining('needs 3 ⚙️ Scrap')
            );
        });

        test('crosses void gap, spends 3 scrap, anchors zipline, and glides player', () => {
            // Player at (7, 7). Void at (7, 8). Landing at (7, 9).
            mockBoardManager.isVoidTile = (t) => t.location[1] === 8;
            mockBoardManager.tiles[7 * 15 + 8].isVoid = true;

            const meta = getMeta();
            meta.scrap = 5;
            storeMeta(meta);

            page.triggerSelectedExpeditionSkill(1);

            const updatedMeta = getMeta();
            expect(updatedMeta.scrap).toBe(2); // 5 - 3 = 2
            expect(mockBoardManager.playerTile.location).toEqual([7, 9]);

            // Re-using the skill while on the zipline anchor glides back across for free
            page.displayMessage = jest.fn();
            page.triggerSelectedExpeditionSkill(1);
            expect(mockBoardManager.playerTile.location).toEqual([7, 7]);
            expect(getMeta().scrap).toBe(2); // Free ride
        });
    });

    describe('Forward Emplacement Skill', () => {
        test('requires 5 scrap to deploy', () => {
            const meta = getMeta();
            meta.scrap = 2;
            storeMeta(meta);

            page.displayMessage = jest.fn();
            page.triggerSelectedExpeditionSkill(2); // engineer_forward_emplacement

            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining('needs 5 ⚙️ Scrap')
            );
        });

        test('places forward emplacement and refunds 3 scrap if packed up', () => {
            const meta = getMeta();
            meta.scrap = 6;
            storeMeta(meta);

            page.triggerSelectedExpeditionSkill(2);

            let updatedMeta = getMeta();
            expect(updatedMeta.scrap).toBe(1); // 6 - 5
            expect(updatedMeta.forwardEmplacement).toBeDefined();
            expect(updatedMeta.forwardEmplacement.coords).toEqual([7, 7]);

            // Re-triggering on same tile packs it up for refund
            page.triggerSelectedExpeditionSkill(2);
            updatedMeta = getMeta();
            expect(updatedMeta.forwardEmplacement).toBeUndefined();
            expect(updatedMeta.scrap).toBe(4); // 1 + 3 = 4
        });

        test('armForwardEmplacementForBattle arms when in range and combatManager deploys free turret', () => {
            const meta = getMeta();
            const boardKey = page.getEngineerBoardKey();
            meta.forwardEmplacement = { coords: [7, 7], boardKey };
            storeMeta(meta);

            // Player is within 3 tiles: at (7, 9) -> dist 2 <= 3
            mockBoardManager.playerTile.location = [7, 9];

            page.armForwardEmplacementForBattle();

            const postArmMeta = getMeta();
            expect(postArmMeta.forwardEmplacementArmed).toBe(true);
            expect(postArmMeta.forwardEmplacement).toBeUndefined();

            // CombatManagerRedux consumes the armed flag and spawns turret
            const combatManager = new CombatManagerRedux();
            combatManager.combatants = {
                eng: {
                    id: 'eng',
                    name: 'Icaron',
                    type: 'engineer',
                    isMonster: false,
                    isMinion: false,
                    dead: false,
                    coordinates: { x: 1, y: 1 },
                    specials: ['build_turret']
                }
            };
            combatManager.getCurrentInventory = () => [];
            combatManager.appendCombatLog = jest.fn();

            const deployed = combatManager._deployForwardEmplacementIfArmed();
            expect(deployed).toBe(true);
            expect(getMeta().forwardEmplacementArmed).toBeUndefined();

            // A turret combatant was created
            const hasTurret = Object.values(combatManager.combatants).some(c => c && c.type === 'turret');
            expect(hasTurret).toBe(true);
        });
    });
});
