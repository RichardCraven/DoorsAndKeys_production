import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrapCrewRollSection from '../TrapCrewRollSection';

describe('TrapCrewRollSection - Slot Machine Reel & Sequential Roll', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    const mockCrewResults = [
        {
            name: 'Althea',
            dexStat: 14,
            d20Roll: 18,
            keenEyeBonus: 3,
            totalRoll: 35,
            saved: true,
            damageTaken: 0
        },
        {
            name: 'Kael',
            dexStat: 8,
            d20Roll: 4,
            keenEyeBonus: 3,
            totalRoll: 15,
            saved: false,
            damageTaken: 8
        }
    ];

    test('performs sequential 0.5s slot machine rolls and reveals results one by one', () => {
        const onAllComplete = jest.fn();
        const { getByTestId, queryByText, getByText } = render(
            <TrapCrewRollSection
                crewResults={mockCrewResults}
                animateRolls={true}
                rollDurationMs={500}
                tickIntervalMs={40}
                onAllComplete={onAllComplete}
            />
        );

        const row0 = getByTestId('trap-crew-row-0');
        const row1 = getByTestId('trap-crew-row-1');

        // Initial state at t = 0ms:
        // Member 0 is rolling; Member 1 is pending
        expect(row0).toHaveClass('rolling');
        expect(row1).toHaveClass('pending');

        // Results should NOT be revealed yet for either member
        expect(queryByText('Dodged!')).toBeNull();
        expect(queryByText('-8 HP')).toBeNull();

        // Slot machine cycling on member 0
        act(() => {
            jest.advanceTimersByTime(120);
        });
        expect(row0).toHaveClass('rolling');
        expect(queryByText('Dodged!')).toBeNull();

        // Advance to 500ms (0.5s) - Member 0 should lock in!
        act(() => {
            jest.advanceTimersByTime(380); // reaches 500ms
        });

        // Member 0 is now locked, saved, and displays 'Dodged!'
        expect(row0).toHaveClass('saved');
        expect(getByText('Dodged!')).toBeInTheDocument();
        expect(row0.querySelector('.trap-roll-slot.locked')).toHaveTextContent('18');
        expect(row0.querySelector('.trap-roll-info')).toHaveTextContent('d20: 18 + DEX 14 + KE 3 = 35');

        // Member 1 has now started rolling!
        expect(row1).toHaveClass('rolling');
        expect(queryByText('-8 HP')).toBeNull();
        expect(onAllComplete).not.toHaveBeenCalled();

        // Slot machine cycling on member 1
        act(() => {
            jest.advanceTimersByTime(200);
        });
        expect(row1).toHaveClass('rolling');
        expect(queryByText('-8 HP')).toBeNull();

        // Advance another 300ms (total 1000ms = 2 * 0.5s) - Member 1 should lock in!
        act(() => {
            jest.advanceTimersByTime(300);
        });

        // Member 1 is now locked, hit, and displays '-8 HP'
        expect(row1).toHaveClass('hit');
        expect(getByText('-8 HP')).toBeInTheDocument();
        expect(row1.querySelector('.trap-roll-slot.locked')).toHaveTextContent('4');
        expect(row1.querySelector('.trap-roll-info')).toHaveTextContent('d20: 4 + DEX 8 + KE 3 = 15');

        // Both members completed and callback fired
        expect(onAllComplete).toHaveBeenCalledTimes(1);
    });

    test('clicking on trap results container skips to end immediately', () => {
        const onAllComplete = jest.fn();
        const { getByTestId, getByText, queryByText, container } = render(
            <TrapCrewRollSection
                crewResults={mockCrewResults}
                animateRolls={true}
                rollDurationMs={500}
                onAllComplete={onAllComplete}
            />
        );

        // Before click at t = 100ms
        act(() => {
            jest.advanceTimersByTime(100);
        });
        expect(queryByText('Dodged!')).toBeNull();
        expect(queryByText('-8 HP')).toBeNull();

        // Click on the container to skip
        const resultsContainer = container.querySelector('.trap-crew-results');
        fireEvent.click(resultsContainer);

        // Immediately both should be locked and visible
        expect(getByTestId('trap-crew-row-0')).toHaveClass('saved');
        expect(getByTestId('trap-crew-row-1')).toHaveClass('hit');
        expect(getByText('Dodged!')).toBeInTheDocument();
        expect(getByText('-8 HP')).toBeInTheDocument();
        expect(onAllComplete).toHaveBeenCalledTimes(1);
    });

    test('renders immediately locked when animateRolls is false', () => {
        const { getByTestId, getByText } = render(
            <TrapCrewRollSection
                crewResults={mockCrewResults}
                animateRolls={false}
            />
        );

        expect(getByTestId('trap-crew-row-0')).toHaveClass('saved');
        expect(getByTestId('trap-crew-row-1')).toHaveClass('hit');
        expect(getByText('Dodged!')).toBeInTheDocument();
        expect(getByText('-8 HP')).toBeInTheDocument();
    });
});
