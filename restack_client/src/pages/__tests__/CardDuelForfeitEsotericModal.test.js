import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CardDuel from '../sub-views/CardDuel';

describe('CardDuel Forfeit Esoteric Modal', () => {
    test('renders esoteric corners, eyebrow, title, divider, emblem frame, and action buttons', () => {
        const onFinishMock = jest.fn();
        const { container } = render(<CardDuel onFinish={onFinishMock} />);

        // Open the forfeit modal
        const forfeitBtn = container.querySelector('.pe-btn--forfeit');
        expect(forfeitBtn).toBeInTheDocument();
        fireEvent.click(forfeitBtn);

        // Verify esoteric ambush styling components
        const overlay = container.querySelector('.ambush-popup-overlay');
        expect(overlay).toBeInTheDocument();

        const card = container.querySelector('.ambush-popup-card');
        expect(card).toBeInTheDocument();

        expect(container.querySelector('.ambush-popup-card .card-corner.top-left')).toBeInTheDocument();
        expect(container.querySelector('.ambush-popup-card .card-corner.top-right')).toBeInTheDocument();
        expect(container.querySelector('.ambush-popup-card .card-corner.bottom-left')).toBeInTheDocument();
        expect(container.querySelector('.ambush-popup-card .card-corner.bottom-right')).toBeInTheDocument();

        expect(container.querySelector('.ambush-eyebrow')).toHaveTextContent('SURRENDER DUEL');
        expect(container.querySelector('.ambush-title')).toHaveTextContent('FORFEIT THE DUEL?');
        expect(container.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        expect(container.querySelector('.monster-highlight')).toHaveTextContent('25% gold penalty');

        const buttons = container.querySelectorAll('.ambush-popup-card .ambush-fight-btn');
        expect(buttons.length).toBe(2);
        expect(buttons[0]).toHaveTextContent('Cancel');
        expect(buttons[1]).toHaveTextContent('Forfeit');

        // Test cancel button closes modal
        fireEvent.click(buttons[0]);
        expect(container.querySelector('.ambush-popup-overlay')).not.toBeInTheDocument();

        // Re-open and test forfeit confirm button
        fireEvent.click(container.querySelector('.pe-btn--forfeit'));
        const confirmBtn = container.querySelectorAll('.ambush-popup-card .ambush-fight-btn')[1];
        fireEvent.click(confirmBtn);

        expect(onFinishMock).toHaveBeenCalledWith({ winner: 'reaper', forfeited: true });
    });
});
