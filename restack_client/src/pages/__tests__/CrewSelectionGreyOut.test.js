import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CrewManagerPage from '../CrewManagerPage';
import { CrewManager } from '../../utils/crew-manager';
import { storeMeta } from '../../utils/session-handler';

jest.mock('../../utils/api-handler', () => ({
    updateUserRequest: jest.fn().mockResolvedValue({ status: 200 })
}));

jest.mock('../../utils/images', () => ({
    getCrewPortraitBackground: jest.fn(() => 'url(test.png)'),
    formatRosterSkillName: jest.fn(s => s),
    renderWeaknessSymbols: jest.fn(() => null),
    renderPowerRatingsPanel: jest.fn(() => null)
}));

describe('Crew Selection - Grey Out Assigned Portraits', () => {
    let crewManager;

    beforeEach(() => {
        localStorage.clear();
        crewManager = new CrewManager();
        storeMeta({ crew: [], alternateCrew: [] });
    });

    test('portraits in top row become greyed out (.assigned) when double-clicked into the roster', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const availablePortraits = container.querySelectorAll('.crew-options .portrait:not(.disabled)');
        expect(availablePortraits.length).toBeGreaterThanOrEqual(2);

        const firstPortrait = availablePortraits[0];
        expect(firstPortrait.className).not.toContain('assigned');
        expect(firstPortrait.style.filter).not.toContain('grayscale');

        // Double click to assign to roster
        fireEvent.click(firstPortrait, { detail: 2 });

        // First portrait should now be assigned and greyed out
        expect(firstPortrait.className).toContain('assigned');
        expect(firstPortrait.style.filter).toContain('grayscale');
        expect(firstPortrait.style.opacity).toBe('0.55');

        // Second portrait should still NOT be assigned
        const secondPortrait = availablePortraits[1];
        expect(secondPortrait.className).not.toContain('assigned');
        expect(secondPortrait.style.filter).not.toContain('grayscale');
    });

    test('assigned portrait un-greys when removed from the roster tray', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const availablePortraits = container.querySelectorAll('.crew-options .portrait:not(.disabled)');
        const firstPortrait = availablePortraits[0];

        // Double click to assign
        fireEvent.click(firstPortrait, { detail: 2 });
        expect(firstPortrait.className).toContain('assigned');

        // Remove from slot 0 using occupied minus button
        const occupiedRemoveBtn = container.querySelector('.add-button.occupied');
        expect(occupiedRemoveBtn).not.toBeNull();
        fireEvent.click(occupiedRemoveBtn);

        // Portrait should no longer be assigned or greyed out
        expect(firstPortrait.className).not.toContain('assigned');
        expect(firstPortrait.style.filter).not.toContain('grayscale');
        expect(firstPortrait.style.opacity).toBe('1');
    });

    test('all assigned portraits un-grey when clear button is clicked', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const availablePortraits = container.querySelectorAll('.crew-options .portrait:not(.disabled)');
        // Assign two members
        fireEvent.click(availablePortraits[0], { detail: 2 });
        fireEvent.click(availablePortraits[1], { detail: 2 });

        expect(availablePortraits[0].className).toContain('assigned');
        expect(availablePortraits[1].className).toContain('assigned');

        // Click Clear button
        const clearBtn = container.querySelector('button.clear-button, .button-row button');
        // Let's find button by text 'Clear'
        const buttons = Array.from(container.querySelectorAll('button'));
        const clearButton = buttons.find(b => b.textContent.trim().toLowerCase() === 'clear');
        expect(clearButton).toBeDefined();
        fireEvent.click(clearButton);

        expect(availablePortraits[0].className).not.toContain('assigned');
        expect(availablePortraits[1].className).not.toContain('assigned');
    });
});
