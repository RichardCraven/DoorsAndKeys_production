import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CardDuel from '../CardDuel';

describe('CardDuel Victory & Defeat Esoteric Modals', () => {
    test('renders victory modal with esoteric corner brackets, eyebrow, title, divider, and claim button', () => {
        const onFinishMock = jest.fn();
        let cardDuelRef = null;
        const { container } = render(
            <CardDuel
                ref={el => { cardDuelRef = el; }}
                onFinish={onFinishMock}
            />
        );

        // Force state to victory
        cardDuelRef.setState({
            gameOver: 'victory'
        });

        const overlay = container.querySelector('.ambush-popup-overlay');
        expect(overlay).toBeInTheDocument();

        const card = container.querySelector('.ambush-popup-card');
        expect(card).toBeInTheDocument();

        // Corner brackets
        expect(card.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.top-right')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-left')).toBeInTheDocument();
        expect(card.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and Title
        expect(card.querySelector('.ambush-eyebrow')).toHaveTextContent(/DUEL CONQUERED/i);
        expect(card.querySelector('.ambush-title')).toHaveTextContent(/VICTORY/i);
        expect(card.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Claim button
        const claimBtn = card.querySelector('.ambush-fight-btn');
        expect(claimBtn).toHaveTextContent(/CLAIM VICTORY/i);

        fireEvent.click(claimBtn);
        expect(onFinishMock).toHaveBeenCalledWith(expect.objectContaining({ winner: 'player' }));
    });

    test('renders defeat modal with esoteric styling and return button', () => {
        const onFinishMock = jest.fn();
        let cardDuelRef = null;
        const { container } = render(
            <CardDuel
                ref={el => { cardDuelRef = el; }}
                onFinish={onFinishMock}
            />
        );

        // Force state to defeat
        cardDuelRef.setState({
            gameOver: 'defeat'
        });

        const card = container.querySelector('.ambush-popup-card');
        expect(card).toBeInTheDocument();

        // Eyebrow and Title
        expect(card.querySelector('.ambush-eyebrow')).toHaveTextContent(/TRIAL FAILED/i);
        expect(card.querySelector('.ambush-title')).toHaveTextContent(/DEFEATED/i);
        expect(card.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Return button
        const returnBtn = card.querySelector('.ambush-fight-btn');
        expect(returnBtn).toHaveTextContent(/RETURN/i);

        fireEvent.click(returnBtn);
        expect(onFinishMock).toHaveBeenCalledWith(expect.objectContaining({ winner: 'reaper' }));
    });
});
