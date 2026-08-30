import React from 'react';
import CardDuel from '../sub-views/CardDuel';

describe('CardDuel Discard and Deck Reshuffle Mechanics', () => {
    let instance;

    beforeEach(() => {
        instance = new CardDuel({ crewManager: { crew: [] } });
        instance.setState = (newState, callback) => {
            instance.state = { ...instance.state, ...newState };
            if (callback) callback();
        };
    });

    test('Unit death sends unit card to discard pile with restored HP', () => {
        const pUnit = {
            id: 'test_unit_1',
            name: 'Test Knight',
            type: 'crew',
            owner: 'player',
            cost: 2,
            atk: 2,
            hp: 0,
            maxHp: 3,
            width: 1,
            height: 1,
            anchorRow: 2,
            anchorCol: 2,
            occupiedKeys: ['2_2']
        };

        const rUnit = {
            id: 'test_reaper_1',
            name: 'Cave Pygmy',
            type: 'pygmy',
            owner: 'reaper',
            cost: 1,
            atk: 1,
            hp: 0,
            maxHp: 1,
            width: 1,
            height: 1,
            anchorRow: 1,
            anchorCol: 2,
            occupiedKeys: ['1_2']
        };

        instance.state = {
            ...instance.state,
            grid: { '2_2': pUnit, '1_2': rUnit },
            territory: { '2_2': 'contested', '1_2': 'contested' },
            playerDiscard: [],
            reaperDiscard: [],
            gameOver: null,
            log: []
        };

        jest.useFakeTimers();
        instance.stepCombatInColumn(2, [pUnit], [rUnit], instance.state.grid);
        jest.advanceTimersByTime(800);
        jest.useRealTimers();

        expect(instance.state.playerDiscard.length).toBe(1);
        expect(instance.state.playerDiscard[0].id).toBe('test_unit_1');
        expect(instance.state.playerDiscard[0].hp).toBe(3); // HP restored

        expect(instance.state.reaperDiscard.length).toBe(1);
        expect(instance.state.reaperDiscard[0].id).toBe('test_reaper_1');
        expect(instance.state.reaperDiscard[0].hp).toBe(1); // HP restored
    });

    test('Action card goes to discard pile when played', () => {
        const actionCard = {
            id: 'action_overdrive_1',
            name: 'Overdrive',
            type: 'action',
            actionType: 'overdrive',
            cost: 1,
            owner: 'player'
        };

        instance.state = {
            ...instance.state,
            playerSpirit: 3,
            playerHand: [actionCard],
            playerDiscard: [],
            log: []
        };

        instance.playPlayerActionCard(actionCard);

        expect(instance.state.playerDiscard.length).toBe(1);
        expect(instance.state.playerDiscard[0].id).toBe('action_overdrive_1');
    });

    test('Empty deck reshuffles discard pile back into deck when drawing cards', () => {
        const discardUnit1 = { id: 'disc_1', name: 'Card 1', type: 'pygmy', maxHp: 1, hp: 0 };
        const discardUnit2 = { id: 'disc_2', name: 'Card 2', type: 'pygmy', maxHp: 1, hp: 0 };

        instance.state = {
            ...instance.state,
            playerDeck: [],
            playerDiscard: [discardUnit1, discardUnit2],
            playerHand: [],
            log: []
        };

        const res = instance.drawCards('player', 1, instance.state.playerDeck, instance.state.playerDiscard, instance.state.playerHand);

        // Discard pile should have been reshuffled into deck, then 1 card drawn into hand
        expect(res.hand.length).toBe(1);
        expect(res.deck.length).toBe(1);
        expect(res.discard.length).toBe(0);
        expect(res.hand[0].hp).toBe(1); // Restored health
    });
});
