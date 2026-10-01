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
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReaperOfferModal from '../ReaperOfferModal';
import * as deathEnemies from '../../utils/death-enemies';
import DungeonPage from '../../pages/DungeonPage';
import { storeMeta, getMeta } from '../../utils/session-handler';

describe('ReaperOfferModal Combat Death Dice Roll & Curiosity Sparing', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        jest.useFakeTimers();
        storeMeta({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    test('renders nothing when visible is false', () => {
        const { container } = render(
            <ReaperOfferModal visible={false} onAccept={jest.fn()} onSpare={jest.fn()} />
        );
        expect(container.firstChild).toBeNull();
    });

    test('starts in rolling phase with dice animation when opened', () => {
        render(
            <ReaperOfferModal visible={true} onAccept={jest.fn()} onSpare={jest.fn()} />
        );

        expect(screen.getByTestId('reaper-dice-rolling')).toBeInTheDocument();
        expect(screen.getByText(/Rolling Fate \(4\+ To Spare\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Observes Your Fate/i)).toBeInTheDocument();
    });

    test('roll of 4 or above transitions to spared outcome with curiosity dialogue and Return to Dungeon button', () => {
        const mockSpare = jest.fn();
        const mockAccept = jest.fn();

        render(
            <ReaperOfferModal
                visible={true}
                overrideRoll={5}
                onAccept={mockAccept}
                onSpare={mockSpare}
            />
        );

        act(() => {
            jest.advanceTimersByTime(1500);
        });

        expect(screen.getByTestId('reaper-outcome-spared')).toBeInTheDocument();
        expect(screen.getByText(/Rolled 5 — Spared by Curiosity \(4\+\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Spares Your Crew/i)).toBeInTheDocument();
        expect(screen.getByText(/Three ethereal individuals manifest from the void/i)).toBeInTheDocument();
        expect(screen.getByText(/Out of sheer curiosity, we shall permit you to endure/i)).toBeInTheDocument();

        const returnBtn = screen.getByText('Return to Dungeon');
        expect(returnBtn).toBeInTheDocument();

        fireEvent.click(returnBtn);
        expect(mockSpare).toHaveBeenCalledTimes(1);
        expect(mockAccept).not.toHaveBeenCalled();
    });

    test('roll of 3 or below transitions to duel outcome with current version text and Play Cards button', () => {
        const mockSpare = jest.fn();
        const mockAccept = jest.fn();

        render(
            <ReaperOfferModal
                visible={true}
                overrideRoll={2}
                onAccept={mockAccept}
                onSpare={mockSpare}
            />
        );

        act(() => {
            jest.advanceTimersByTime(1500);
        });

        expect(screen.getByTestId('reaper-outcome-duel')).toBeInTheDocument();
        expect(screen.getByText(/Rolled 2 — Duel Demanded \(3 or below\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Claims Your Souls/i)).toBeInTheDocument();
        expect(screen.getByText(/Your crew has fallen in combat/i)).toBeInTheDocument();

        const playCardsBtn = screen.getByText('Play Cards');
        expect(playCardsBtn).toBeInTheDocument();

        fireEvent.click(playCardsBtn);
        expect(mockAccept).toHaveBeenCalledTimes(1);
        expect(mockSpare).not.toHaveBeenCalled();
    });

    test('roll threshold boundary: roll=4 spares, roll=3 triggers duel', () => {
        const { unmount } = render(
            <ReaperOfferModal
                visible={true}
                overrideRoll={4}
                disableAnimation={true}
                onAccept={jest.fn()}
                onSpare={jest.fn()}
            />
        );
        expect(screen.getByTestId('reaper-outcome-spared')).toBeInTheDocument();
        expect(screen.getByText('Return to Dungeon')).toBeInTheDocument();
        unmount();

        render(
            <ReaperOfferModal
                visible={true}
                overrideRoll={3}
                disableAnimation={true}
                onAccept={jest.fn()}
                onSpare={jest.fn()}
            />
        );
        expect(screen.getByTestId('reaper-outcome-duel')).toBeInTheDocument();
        expect(screen.getByText('Play Cards')).toBeInTheDocument();
    });

    test('renders entity-specific curiosity dialogue when enemy is Eshu', () => {
        const eshuEnemy = {
            id: 'eshu',
            name: 'Eshu',
            type: 'eshu',
            classification: 'Lesser Entity',
            subtitle: 'Master of Crossroads',
            portrait: null,
            loreText: 'At the dark crossroads...',
            quote: '"Wager your soul!"'
        };
        jest.spyOn(deathEnemies, 'getCurrentDeathEnemy').mockReturnValue(eshuEnemy);

        render(
            <ReaperOfferModal
                visible={true}
                overrideRoll={6}
                disableAnimation={true}
                onAccept={jest.fn()}
                onSpare={jest.fn()}
            />
        );

        expect(screen.getByText(/Eshu Spares Your Crew/i)).toBeInTheDocument();
        expect(screen.getByText(/Eshu steps forth with a contemplative gleam/i)).toBeInTheDocument();
        expect(screen.getByText(/I am curious to see how much further you can wander/i)).toBeInTheDocument();
        expect(screen.getByText('Return to Dungeon')).toBeInTheDocument();
    });

    test('DungeonPage integration: onSpare triggers battleOver("respawn") without incrementing deathTracker', () => {
        const pageInstance = new DungeonPage({});
        pageInstance._isMounted = true;
        pageInstance.setState = (updater, cb) => {
            const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
            pageInstance.state = { ...pageInstance.state, ...patch };
            if (cb) cb();
        };
        pageInstance.battleOver = jest.fn();

        storeMeta({ deathTracker: 0 });
        pageInstance.state = {
            showReaperOfferModal: true,
            isCardScrimmage: false,
            cardDuelTileId: 'combat_loss'
        };

        // Render ReaperOfferModal configured as in DungeonPage JSX
        render(
            <ReaperOfferModal
                visible={pageInstance.state.showReaperOfferModal}
                overrideRoll={5}
                disableAnimation={true}
                onAccept={() => {
                    pageInstance.setState({ showReaperOfferModal: false }, () => {
                        pageInstance.openCardDuel('combat_loss');
                    });
                }}
                onSpare={() => {
                    pageInstance.setState({ showReaperOfferModal: false }, () => {
                        try {
                            const deathEnemy = deathEnemies.getCurrentDeathEnemy();
                            const enemyName = deathEnemy?.name || 'The Principalities';
                            pageInstance.setState({
                                toastMessage: `${enemyName} spared your crew out of curiosity! No death marker added.`
                            });
                        } catch (e) { }
                        pageInstance.battleOver('respawn');
                    });
                }}
            />
        );

        const returnBtn = screen.getByText('Return to Dungeon');
        fireEvent.click(returnBtn);

        expect(pageInstance.battleOver).toHaveBeenCalledWith('respawn');
        expect(pageInstance.state.showReaperOfferModal).toBe(false);
        expect(pageInstance.state.toastMessage).toContain('spared your crew out of curiosity! No death marker added.');
        expect(getMeta().deathTracker).toBe(0);
    });
});
