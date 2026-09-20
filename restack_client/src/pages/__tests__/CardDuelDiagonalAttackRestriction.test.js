import React from 'react';
import CardDuel from '../sub-views/CardDuel';

describe('CardDuel Diagonal Attack Restriction (Limited to Wizard)', () => {
    let instance;

    beforeEach(() => {
        instance = new CardDuel({});
        instance.setState = (newState, callback) => {
            if (typeof newState === 'function') {
                instance.state = { ...instance.state, ...newState(instance.state) };
            } else {
                instance.state = { ...instance.state, ...newState };
            }
            if (callback) callback();
        };

        instance.state = {
            playerHP: 20,
            playerMaxHP: 20,
            reaperHP: 20,
            reaperMaxHP: 20,
            turnNumber: 1,
            currentTurn: 'player',
            playerSpirit: 5,
            reaperSpirit: 5,
            maxSpirit: 5,
            grid: {},
            territory: {},
            playerHand: [],
            playerDeck: [],
            playerDiscard: [],
            reaperHand: [],
            reaperDeck: [],
            reaperDiscard: [],
            selectedCard: null,
            selectedBoardUnit: null,
            gameOver: null,
            log: []
        };
    });

    test('regular pygmy unit cannot attack diagonally, only directly in front or to the side', () => {
        const pygmy = {
            id: 'player_pygmy',
            name: 'Cave Pygmy',
            type: 'pygmy',
            owner: 'player',
            atk: 1,
            hp: 1,
            maxHp: 1,
            anchorRow: 3,
            anchorCol: 2,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['3_2']
        };

        const enemyInFront = { id: 'enemy_front', owner: 'reaper', hp: 2, anchorRow: 2, anchorCol: 2 };
        const enemyLeft = { id: 'enemy_left', owner: 'reaper', hp: 2, anchorRow: 3, anchorCol: 1 };
        const enemyRight = { id: 'enemy_right', owner: 'reaper', hp: 2, anchorRow: 3, anchorCol: 3 };
        const enemyDiagNW = { id: 'enemy_nw', owner: 'reaper', hp: 2, anchorRow: 2, anchorCol: 1 };
        const enemyDiagNE = { id: 'enemy_ne', owner: 'reaper', hp: 2, anchorRow: 2, anchorCol: 3 };
        const enemyBehind = { id: 'enemy_behind', owner: 'reaper', hp: 2, anchorRow: 4, anchorCol: 2 };

        instance.state.grid = {
            '3_2': pygmy,
            '2_2': enemyInFront,
            '3_1': enemyLeft,
            '3_3': enemyRight,
            '2_1': enemyDiagNW,
            '2_3': enemyDiagNE,
            '4_2': enemyBehind
        };

        const targets = instance.getValidTargetTiles(pygmy);

        // Can attack in front and to the sides
        expect(targets.attacks).toContain('2_2'); // In front
        expect(targets.attacks).toContain('3_1'); // Left
        expect(targets.attacks).toContain('3_3'); // Right

        // CANNOT attack diagonally
        expect(targets.attacks).not.toContain('2_1'); // NW diagonal
        expect(targets.attacks).not.toContain('2_3'); // NE diagonal

        // CANNOT attack behind
        expect(targets.attacks).not.toContain('4_2');
    });

    test('wizard unit has special ability to attack diagonally in addition to front and side', () => {
        const wizard = {
            id: 'player_wizard',
            name: 'Wizard Champion',
            type: 'crew',
            memberType: 'Wizard',
            isWizard: true,
            owner: 'player',
            atk: 2,
            hp: 1,
            maxHp: 1,
            anchorRow: 3,
            anchorCol: 2,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['3_2']
        };

        const enemyInFront = { id: 'enemy_front', owner: 'reaper', hp: 2, anchorRow: 2, anchorCol: 2 };
        const enemyLeft = { id: 'enemy_left', owner: 'reaper', hp: 2, anchorRow: 3, anchorCol: 1 };
        const enemyRight = { id: 'enemy_right', owner: 'reaper', hp: 2, anchorRow: 3, anchorCol: 3 };
        const enemyDiagNW = { id: 'enemy_nw', owner: 'reaper', hp: 2, anchorRow: 2, anchorCol: 1 };
        const enemyDiagNE = { id: 'enemy_ne', owner: 'reaper', hp: 2, anchorRow: 2, anchorCol: 3 };

        instance.state.grid = {
            '3_2': wizard,
            '2_2': enemyInFront,
            '3_1': enemyLeft,
            '3_3': enemyRight,
            '2_1': enemyDiagNW,
            '2_3': enemyDiagNE
        };

        const targets = instance.getValidTargetTiles(wizard);

        // Wizard can attack in front, sides, AND diagonals (NW and NE)
        expect(targets.attacks).toContain('2_2'); // Front
        expect(targets.attacks).toContain('3_1'); // Left
        expect(targets.attacks).toContain('3_3'); // Right
        expect(targets.attacks).toContain('2_1'); // NW diagonal
        expect(targets.attacks).toContain('2_3'); // NE diagonal
    });

    test('handleNodeClick rejects diagonal attack for regular pygmy and adds log explanation', () => {
        const pygmy = {
            id: 'player_pygmy',
            name: 'Cave Pygmy',
            type: 'pygmy',
            owner: 'player',
            atk: 1,
            hp: 1,
            maxHp: 1,
            anchorRow: 3,
            anchorCol: 2,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['3_2']
        };

        const enemyDiagNW = {
            id: 'enemy_nw',
            name: 'Skeleton',
            owner: 'reaper',
            atk: 1,
            hp: 2,
            maxHp: 2,
            anchorRow: 2,
            anchorCol: 1,
            occupiedKeys: ['2_1']
        };

        instance.state.grid = {
            '3_2': pygmy,
            '2_1': enemyDiagNW
        };
        instance.state.selectedBoardUnit = pygmy;

        // Player clicks on diagonal enemy at 2, 1
        instance.handleNodeClick(2, 1);

        // Pygmy should NOT have attacked
        expect(pygmy.hasActedThisTurn).toBe(false);
        expect(enemyDiagNW.hp).toBe(2);
        expect(instance.state.log.some(l => l.includes('cannot attack diagonally'))).toBe(true);
    });

    test('handleNodeClick executes diagonal attack for Wizard unit', () => {
        const wizard = {
            id: 'player_wizard',
            name: 'Wizard',
            type: 'crew',
            memberType: 'Wizard',
            isWizard: true,
            owner: 'player',
            atk: 2,
            hp: 1,
            maxHp: 1,
            anchorRow: 3,
            anchorCol: 2,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['3_2']
        };

        const enemyDiagNE = {
            id: 'enemy_ne',
            name: 'Skeleton',
            owner: 'reaper',
            atk: 1,
            hp: 2,
            maxHp: 2,
            anchorRow: 2,
            anchorCol: 3,
            occupiedKeys: ['2_3']
        };

        instance.state.grid = {
            '3_2': wizard,
            '2_3': enemyDiagNE
        };
        instance.state.selectedBoardUnit = wizard;

        // Player clicks on diagonal enemy at 2, 3
        instance.handleNodeClick(2, 3);

        // Wizard deals 2 damage -> Skeleton dies!
        expect(wizard.hasActedThisTurn).toBe(true);
        expect(instance.state.grid['2_3']).toBeUndefined();
        expect(instance.state.reaperDiscard.length).toBe(1);
    });

    test('executeReaperTurn restricts AI pygmy units from attacking diagonally', () => {
        const reaperPygmy = {
            id: 'reaper_pygmy',
            name: 'Reaper Pygmy',
            type: 'pygmy',
            owner: 'reaper',
            atk: 1,
            hp: 2,
            maxHp: 2,
            anchorRow: 1,
            anchorCol: 1,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['1_1']
        };

        // Player unit placed diagonally from reaper pygmy (row 2, col 2)
        const playerUnit = {
            id: 'player_target',
            name: 'Player Soldier',
            owner: 'player',
            atk: 2,
            hp: 3,
            maxHp: 3,
            anchorRow: 2,
            anchorCol: 2,
            occupiedKeys: ['2_2']
        };

        instance.state.grid = {
            '1_1': reaperPygmy,
            '2_2': playerUnit
        };
        instance.state.currentTurn = 'reaper';

        instance.executeReaperTurn();

        // Player unit was diagonal, so Reaper Pygmy could NOT attack it
        expect(playerUnit.hp).toBe(3);
    });
});
