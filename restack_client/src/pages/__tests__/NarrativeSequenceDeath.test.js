import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import NarrativeSequence from '../NarrativeSequence';

// Mock typewriter so it immediately displays text
jest.mock('../../utils/typewriter', () => {
    return function MockTypewriter({ text }) {
        return <span data-testid="mock-typewriter">{text}</span>;
    };
});

describe('NarrativeSequence - Death Sequence', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        act(() => {
            jest.runOnlyPendingTimers();
        });
        jest.useRealTimers();
    });

    test('renders death sequence with image, text, and progresses to ending sequence', async () => {
        const beginDeathSequence = jest.fn();
        const endDeathSequence = jest.fn();

        const { container } = render(
            <MemoryRouter initialEntries={['/death']}>
                <NarrativeSequence
                    sequenceType="death"
                    beginDeathSequence={beginDeathSequence}
                    endDeathSequence={endDeathSequence}
                />
            </MemoryRouter>
        );

        // Initial mount triggers beginDeathSequence
        expect(beginDeathSequence).toHaveBeenCalledTimes(1);

        // Initial frame is rendered
        const initialImg = container.querySelector('.intro-image');
        expect(initialImg).toBeInTheDocument();

        // Advance 1 second to start runSequence('death')
        await act(async () => {
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        // The text container with "Death has come for you" should appear
        expect(screen.getByText('Death has come for you')).toBeInTheDocument();

        // Advance 4 seconds for reading delay
        await act(async () => {
            jest.advanceTimersByTime(4000);
            await Promise.resolve();
        });

        // Wrecked glitch animation is applied
        expect(container.querySelector('.intro-image.wrecked')).toBeInTheDocument();

        // Advance 850ms for more-wrecked effect
        await act(async () => {
            jest.advanceTimersByTime(850);
            await Promise.resolve();
        });
        expect(container.querySelector('.intro-image.more-wrecked')).toBeInTheDocument();

        // Advance 1000ms for fade out
        await act(async () => {
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        // Advance 700ms for final navigation and toolbar restoration
        await act(async () => {
            jest.advanceTimersByTime(700);
            await Promise.resolve();
        });

        // endDeathSequence called to restore toolbar, and landing redirect rendered
        expect(endDeathSequence).toHaveBeenCalledTimes(1);
    });
});
