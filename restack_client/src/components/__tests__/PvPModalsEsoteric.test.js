import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PvPChallengeModal from '../PvPChallengeModal';
import PlayerInteractionModal from '../PlayerInteractionModal';
import SettingsModal from '../SettingsModal';

describe('PvP Modals Esoteric Styling', () => {
    test('PvPChallengeModal renders esoteric corner brackets, eyebrow, divider, and action buttons', () => {
        const onAcceptMock = jest.fn();
        const onDeclineMock = jest.fn();
        const incomingChallenge = { challengerUsername: 'Vanquisher99' };

        const { container } = render(
            <PvPChallengeModal
                incomingChallenge={incomingChallenge}
                onAccept={onAcceptMock}
                onDecline={onDeclineMock}
            />
        );

        // Check overlay and card
        expect(container.querySelector('.ambush-popup-overlay')).toBeInTheDocument();
        const card = container.querySelector('.ambush-popup-card');
        expect(card).toBeInTheDocument();

        // Corners
        expect(container.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.top-right')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and divider
        expect(container.querySelector('.ambush-eyebrow')).toHaveTextContent(/TRIAL OF COMBAT/i);
        expect(container.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Title and challenger name
        expect(container.querySelector('.ambush-title')).toHaveTextContent(/CHALLENGE RECEIVED/i);
        expect(container.querySelector('.monster-highlight')).toHaveTextContent('Vanquisher99');

        // Buttons
        const buttons = container.querySelectorAll('.ambush-fight-btn');
        expect(buttons.length).toBe(2);
        expect(buttons[0]).toHaveTextContent(/ACCEPT DUEL/i);
        expect(buttons[1]).toHaveTextContent(/DECLINE/i);

        fireEvent.click(buttons[0]);
        expect(onAcceptMock).toHaveBeenCalled();
    });

    test('PlayerInteractionModal renders esoteric card, encounter eyebrow, and action buttons', () => {
        const onInviteChatMock = jest.fn();
        const onInviteDuelMock = jest.fn();
        const onCloseMock = jest.fn();
        const peerPlayer = {
            username: 'Shadowblade',
            selectedCrewMember: { name: 'Eldritch Knight', class: 'knight' }
        };

        const { container } = render(
            <PlayerInteractionModal
                peerPlayer={peerPlayer}
                onInviteChat={onInviteChatMock}
                onInviteDuel={onInviteDuelMock}
                onClose={onCloseMock}
            />
        );

        expect(container.querySelector('.ambush-popup-overlay')).toBeInTheDocument();
        expect(container.querySelector('.ambush-popup-card')).toBeInTheDocument();

        // Corners
        expect(container.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.bottom-right')).toBeInTheDocument();

        // Eyebrow and title
        expect(container.querySelector('.ambush-eyebrow')).toHaveTextContent(/ENCOUNTER/i);
        expect(container.querySelector('.ambush-title')).toHaveTextContent('Shadowblade');
        expect(container.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Buttons: Communion, Challenge, Depart
        const buttons = container.querySelectorAll('.ambush-fight-btn');
        expect(buttons.length).toBe(3);
        expect(buttons[0]).toHaveTextContent(/COMMUNION/i);
        expect(buttons[1]).toHaveTextContent(/CHALLENGE TO DUEL/i);
        expect(buttons[2]).toHaveTextContent(/DEPART/i);

        fireEvent.click(buttons[1]);
        expect(onInviteDuelMock).toHaveBeenCalled();
    });

    test('SettingsModal renders esoteric card, preferences eyebrow, and action buttons', () => {
        const onCloseMock = jest.fn();
        const onSaveMock = jest.fn();

        const { container } = render(
            <SettingsModal
                isOpen={true}
                onClose={onCloseMock}
                onSave={onSaveMock}
            />
        );

        expect(container.querySelector('.settings-modal-backdrop')).toBeInTheDocument();
        expect(container.querySelector('.ambush-popup-card')).toBeInTheDocument();

        // Corners
        expect(container.querySelector('.card-corner.top-left')).toBeInTheDocument();
        expect(container.querySelector('.card-corner.top-right')).toBeInTheDocument();

        // Eyebrow and title
        expect(container.querySelector('.ambush-eyebrow')).toHaveTextContent(/SANCTUM PREFERENCES/i);
        expect(container.querySelector('.ambush-title')).toHaveTextContent(/GAME SETTINGS/i);
        expect(container.querySelector('.ambush-divider .divider-glyph')).toHaveTextContent('❖');

        // Section headers
        expect(container).toHaveTextContent(/PROFILE IDENTITY/i);
        expect(container).toHaveTextContent(/EXPLORATION PREFERENCES/i);

        // Buttons
        const buttons = container.querySelectorAll('.ambush-fight-btn');
        expect(buttons.length).toBe(2);
        expect(buttons[0]).toHaveTextContent(/CANCEL/i);
        expect(buttons[1]).toHaveTextContent(/SAVE SETTINGS/i);

        fireEvent.click(buttons[0]);
        expect(onCloseMock).toHaveBeenCalled();
    });
});
