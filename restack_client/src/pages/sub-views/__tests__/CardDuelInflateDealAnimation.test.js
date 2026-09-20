import React from 'react';
import { render } from '@testing-library/react';
import CardDuel from '../CardDuel';

describe('CardDuel Inflate Card Deal Animation', () => {
    test('drawCards tags newly drawn cards with isNewlyDealt and staggered dealtIndex', () => {
        const instance = new CardDuel({});
        const deck = [
            { id: 'c1', name: 'Card 1', cost: 1, type: 'pygmy' },
            { id: 'c2', name: 'Card 2', cost: 2, type: 'pygmy' },
            { id: 'c3', name: 'Card 3', cost: 3, type: 'pygmy' }
        ];

        const result = instance.drawCards('player', 3, deck, [], []);
        expect(result.drawnCards.length).toBe(3);
        expect(result.drawnCards[0].isNewlyDealt).toBe(true);
        expect(result.drawnCards[0].dealtIndex).toBe(0);
        expect(result.drawnCards[1].isNewlyDealt).toBe(true);
        expect(result.drawnCards[1].dealtIndex).toBe(1);
        expect(result.drawnCards[2].isNewlyDealt).toBe(true);
        expect(result.drawnCards[2].dealtIndex).toBe(2);
    });

    test('Inflate action card marks drawn cards with pe-fanned-card--dealt class and animation style', () => {
        const inflateCard = {
            id: 'inflate_1',
            name: 'Inflate',
            type: 'action',
            actionType: 'inflate',
            owner: 'player',
            cost: 3
        };

        const deck = [
            { id: 'c1', name: 'Card 1', cost: 1, type: 'pygmy' },
            { id: 'c2', name: 'Card 2', cost: 2, type: 'pygmy' },
            { id: 'c3', name: 'Card 3', cost: 3, type: 'pygmy' }
        ];

        const instance = new CardDuel({});
        instance.state = {
            playerSpirit: 5,
            playerHand: [inflateCard],
            playerDeck: deck,
            playerDiscard: [],
            selectedCard: inflateCard,
            actionCardAnim: null,
            currentTurn: 'player',
            firstPlayerOverlay: { active: false }
        };

        instance.setState = (updater, cb) => {
            const nextState = typeof updater === 'function' ? updater(instance.state) : updater;
            instance.state = { ...instance.state, ...nextState };
            if (cb) cb();
        };

        instance.playPlayerActionCard(inflateCard);

        expect(instance.state.playerHand.length).toBe(3);
        expect(instance.state.playerHand[0].isNewlyDealt).toBe(true);

        const { container } = render(instance.renderFannedPlayerHand());
        const dealtCards = container.querySelectorAll('.pe-fanned-card--dealt');
        expect(dealtCards.length).toBe(3);
    });
});
