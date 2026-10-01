import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CrewManagerPage from '../CrewManagerPage';
import { CrewManager } from '../../utils/crew-manager';
import { storeMeta, getMeta } from '../../utils/session-handler';

jest.mock('../../utils/api-handler', () => ({
    updateUserRequest: jest.fn().mockResolvedValue({ status: 200 })
}));

jest.mock('../../utils/images', () => ({
    getCrewPortraitBackground: jest.fn(() => 'url(test.png)'),
    formatRosterSkillName: jest.fn(s => s),
    renderWeaknessSymbols: jest.fn(() => null),
    renderPowerRatingsPanel: jest.fn(() => null)
}));

describe('Roster and Alternate Crew System', () => {
    let crewManager;

    beforeEach(() => {
        localStorage.clear();
        crewManager = new CrewManager();
        storeMeta({ crew: [], alternateCrew: [] });
    });

    test('CrewManagerPage renders 3 In-Dungeon crew slots and 2 Alternate crew slots', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );
        
        expect(container.textContent).toContain('In-Dungeon Crew (3 Slots)');
        expect(container.textContent).toContain('Alternate Crew (2 Slots)');

        const portraitContainers = container.querySelectorAll('.selected-crew-portrait-container');
        expect(portraitContainers.length).toBe(5);

        // Leader slot (slot 0) is enlarged (125px) with Leader label
        const leaderSlot = portraitContainers[0];
        expect(leaderSlot.style.width).toBe('125px');
        expect(leaderSlot.style.height).toBe('125px');
        expect(leaderSlot.textContent).toContain('Leader');

        // Remaining in-dungeon slots (1, 2) are standard 101px
        expect(portraitContainers[1].style.width).toBe('101px');
        expect(portraitContainers[2].style.width).toBe('101px');

        // Verify In-Dungeon Crew text is placed to the right of the leader slot (not inside or wrapping slot 0)
        const inDungeonTray = container.querySelector('.in-dungeon-crew-tray');
        expect(inDungeonTray).toBeTruthy();
        expect(inDungeonTray.children[0]).toBe(leaderSlot);
        const slots1And2Group = inDungeonTray.children[1];
        expect(slots1And2Group.textContent).toContain('In-Dungeon Crew (3 Slots)');
        expect(slots1And2Group.contains(portraitContainers[1])).toBe(true);
        expect(slots1And2Group.contains(portraitContainers[2])).toBe(true);
        expect(slots1And2Group.contains(leaderSlot)).toBe(false);
    });

    test('Adding 5 members assigns first 3 to In-Dungeon crew and next 2 to Alternate crew', async () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );
        
        const availablePortraits = container.querySelectorAll('.crew-options .portrait:not(.disabled)');
        expect(availablePortraits.length).toBeGreaterThanOrEqual(5);

        // Click 5 members in the selection grid to add them to crew
        for (let i = 0; i < 5; i++) {
            fireEvent.click(availablePortraits[i]);
            const addButtons = container.querySelectorAll('.add-button:not(.disabled):not(.occupied)');
            if (addButtons.length > 0) {
                fireEvent.click(addButtons[0]);
            }
        }

        // Submit selection
        const saveButton = container.querySelector('.button-row button');
        if (saveButton) {
            await act(async () => {
                fireEvent.click(saveButton);
            });
        }

        const meta = getMeta(true);
        expect(meta.crew).toBeDefined();
        expect(meta.crew.length).toBe(3);
        expect(meta.alternateCrew).toBeDefined();
        expect(meta.alternateCrew.length).toBe(2);
        expect(meta.lockedRoster).toBeDefined();
        expect(meta.lockedRoster.length).toBe(5);
    });

    test('Roster locking hides non-roster members and displays lock indicator when dungeon is active', () => {
        const soldier = crewManager.adventurers.find(a => a.type === 'soldier');
        const wizard = crewManager.adventurers.find(a => a.type === 'wizard');

        storeMeta({
            dungeonId: 'dungeon_123',
            dungeonEntered: true,
            rosterLocked: true,
            crew: [soldier],
            alternateCrew: [wizard],
            lockedRoster: [soldier.id, wizard.id]
        });

        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        // Verify lock banner
        expect(container.textContent).toContain('Dungeon Roster Locked');

        // Verify options pool only contains the 2 locked roster members
        const optionPortraits = container.querySelectorAll('.crew-options .portrait');
        expect(optionPortraits.length).toBe(2);
    });
});
