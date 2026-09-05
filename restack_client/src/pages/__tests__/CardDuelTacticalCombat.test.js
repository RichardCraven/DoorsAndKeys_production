import React from 'react';
import CardDuel from '../sub-views/CardDuel';

describe('CardDuel Tactical Combat & Movement Mechanics', () => {
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

        // Initialize state for testing
        instance.state = {
            playerHP: 20,
            playerMaxHP: 20,
            reaperHP: 20,
            reaperMaxHP: 20,
            turnNumber: 1,
            startingPlayer: 'player',
            currentTurn: 'player',
            playerSpirit: 5,
            reaperSpirit: 5,
            maxSpirit: 5,
            grid: {},
            territory: {
                '0_0': 'reaper', '0_1': 'reaper',
                '1_0': 'reaper', '1_1': 'reaper',
                '2_0': 'contested', '2_1': 'contested',
                '3_0': 'player', '3_1': 'player',
                '4_0': 'player', '4_1': 'player'
            },
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

    test('newly played unit enters with summoning sickness', () => {
        const card = {
            id: 'unit_soldier',
            name: 'Soldier',
            type: 'crew',
            cost: 2,
            atk: 2,
            hp: 3,
            maxHp: 3,
            width: 1,
            height: 1
        };

        instance.playCardToNode(card, 3, 0);

        const placedUnit = instance.state.grid['3_0'];
        expect(placedUnit).toBeDefined();
        expect(placedUnit.summoningSickness).toBe(true);
        expect(placedUnit.hasActedThisTurn).toBe(false);
    });

    test('turn refresh clears summoning sickness and resets acted state', () => {
        const unit = {
            id: 'unit_soldier',
            name: 'Soldier',
            owner: 'player',
            atk: 2,
            hp: 3,
            maxHp: 3,
            anchorRow: 3,
            anchorCol: 0,
            summoningSickness: true,
            hasActedThisTurn: true,
            occupiedKeys: ['3_0']
        };

        instance.state.grid = { '3_0': unit };
        instance.state.currentTurn = 'reaper';
        instance.state.turnNumber = 2; // Turn 2 was Reaper

        // Advance turn to Player turn (Turn 3)
        instance.advanceToNextTurn(); // Turn 3 (player)

        expect(instance.state.currentTurn).toBe('player');
        expect(unit.summoningSickness).toBe(false);
        expect(unit.hasActedThisTurn).toBe(false);
    });

    test('unit movement moves to 1-space empty tile and sets acted flag', () => {
        const unit = {
            id: 'unit_soldier',
            name: 'Soldier',
            owner: 'player',
            atk: 2,
            hp: 3,
            maxHp: 3,
            anchorRow: 3,
            anchorCol: 0,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['3_0']
        };

        instance.state.grid = { '3_0': unit };

        // Move from 3,0 to 2,0
        instance.executeTacticalMove(unit, 2, 0);

        expect(instance.state.grid['3_0']).toBeUndefined();
        expect(instance.state.grid['2_0']).toBeDefined();
        expect(instance.state.grid['2_0'].anchorRow).toBe(2);
        expect(instance.state.grid['2_0'].anchorCol).toBe(0);
        expect(unit.hasActedThisTurn).toBe(true);
    });

    test('attack kills defender outright when defender HP is less than or equal to attacker ATK', () => {
        const attacker = {
            id: 'unit_3_2',
            name: 'Strong Unit',
            owner: 'player',
            atk: 3,
            hp: 2,
            maxHp: 2,
            anchorRow: 3,
            anchorCol: 0,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['3_0']
        };

        const defender = {
            id: 'unit_2_2',
            name: 'Enemy Unit',
            owner: 'reaper',
            atk: 2,
            hp: 2,
            maxHp: 2,
            anchorRow: 2,
            anchorCol: 0,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['2_0']
        };

        instance.state.grid = { '3_0': attacker, '2_0': defender };

        instance.executeTacticalAttack(attacker, defender);

        // Defender dies, attacker survives at full 2 HP and remains in 3_0
        expect(instance.state.grid['2_0']).toBeUndefined();
        expect(instance.state.grid['3_0']).toBeDefined();
        expect(attacker.hp).toBe(2);
        expect(attacker.hasActedThisTurn).toBe(true);
        expect(instance.state.reaperDiscard.length).toBe(1);
    });

    test('defender counter-attacks when surviving initial strike', () => {
        const attacker = {
            id: 'unit_1_1',
            name: 'Pygmy',
            owner: 'player',
            atk: 1,
            hp: 1,
            maxHp: 1,
            anchorRow: 3,
            anchorCol: 0,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['3_0']
        };

        const defender = {
            id: 'unit_3_2',
            name: 'Defender Giant',
            owner: 'reaper',
            atk: 3,
            hp: 2,
            maxHp: 2,
            anchorRow: 2,
            anchorCol: 0,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['2_0']
        };

        instance.state.grid = { '3_0': attacker, '2_0': defender };

        instance.executeTacticalAttack(attacker, defender);

        // Attacker deals 1 damage (Defender HP becomes 1/2).
        // Defender counter-attacks for 3 damage -> Attacker dies!
        expect(defender.hp).toBe(1);
        expect(instance.state.grid['2_0']).toBeDefined();
        expect(instance.state.grid['3_0']).toBeUndefined();
        expect(instance.state.playerDiscard.length).toBe(1);
    });

    test('direct hero attack reduces enemy HP', () => {
        const attacker = {
            id: 'unit_soldier',
            name: 'Soldier',
            owner: 'player',
            atk: 4,
            hp: 3,
            maxHp: 3,
            anchorRow: 0,
            anchorCol: 0,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['0_0']
        };

        instance.state.grid = { '0_0': attacker };
        instance.state.reaperHP = 20;

        instance.executeDirectHeroAttack(attacker);

        expect(instance.state.reaperHP).toBe(16);
        expect(attacker.hasActedThisTurn).toBe(true);
    });
});
