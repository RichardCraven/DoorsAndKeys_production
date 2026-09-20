import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import CrewManagerPage from '../CrewManagerPage';
import { CrewManager } from '../../utils/crew-manager';

let mockMeta = { crew: [], alternateCrew: [] };

jest.mock('../../utils/images', () => {
    return {
        getMeta: jest.fn(() => mockMeta),
        storeMeta: jest.fn((newMeta) => { mockMeta = newMeta; }),
        updateUserRequest: jest.fn(() => Promise.resolve()),
        getUserId: jest.fn(() => 'test_user'),
        getCrewPortraitBackground: jest.fn(() => 'url(test.png)'),
        formatRosterSkillName: jest.fn(s => s),
        renderWeaknessSymbols: jest.fn(() => null),
        renderPowerRatingsPanel: jest.fn(() => null)
    };
});

describe('Roster and Alternate Crew System', () => {
    let crewManager;

    beforeEach(() => {
        crewManager = new CrewManager();
        mockMeta = { crew: [], alternateCrew: [] };
    });

    test('CrewManagerPage renders 3 In-Dungeon crew slots and 2 Alternate crew slots', () => {
        const { container } = render(<CrewManagerPage crewManager={crewManager} />);
        
        expect(container.textContent).toContain('In-Dungeon Crew (3 Slots)');
        expect(container.textContent).toContain('Alternate Crew (2 Slots)');

        const portraitContainers = container.querySelectorAll('.selected-crew-portrait-container');
        expect(portraitContainers.length).toBe(5);
    });

    test('Adding 5 members assigns first 3 to In-Dungeon crew and next 2 to Alternate crew', async () => {
        const { container } = render(<CrewManagerPage crewManager={crewManager} />);
        
        const availablePortraits = container.querySelectorAll('.roster-selection-grid .portrait:not(.disabled)');
        expect(availablePortraits.length).toBeGreaterThanOrEqual(5);

        // Click 5 members in the selection grid to add them to crew
        for (let i = 0; i < 5; i++) {
            fireEvent.click(availablePortraits[i]);
            const addButton = container.querySelector('.add-button:not(.disabled)');
            if (addButton) {
                fireEvent.click(addButton);
            }
        }

        // Submit selection
        const saveButton = container.querySelector('.save-btn');
        if (saveButton) {
            await act(async () => {
                fireEvent.click(saveButton);
            });
        }

        expect(mockMeta.crew).toBeDefined();
        expect(mockMeta.crew.length).toBe(3);
        expect(mockMeta.alternateCrew).toBeDefined();
        expect(mockMeta.alternateCrew.length).toBe(2);
        expect(mockMeta.lockedRoster).toBeDefined();
        expect(mockMeta.lockedRoster.length).toBe(5);
    });

    test('Roster locking hides non-roster members and displays lock indicator when dungeon is active', () => {
        const soldier = crewManager.adventurers.find(a => a.type === 'soldier');
        const wizard = crewManager.adventurers.find(a => a.type === 'wizard');

        mockMeta = {
            dungeonId: 'dungeon_123',
            dungeonEntered: true,
            rosterLocked: true,
            crew: [soldier],
            alternateCrew: [wizard],
            lockedRoster: [soldier.id, wizard.id]
        };

        const { container } = render(<CrewManagerPage crewManager={crewManager} />);

        // Verify lock banner
        expect(container.textContent).toContain('Dungeon Roster Locked');

        // Verify options pool only contains the 2 locked roster members
        const optionPortraits = container.querySelectorAll('.roster-selection-grid .portrait');
        expect(optionPortraits.length).toBe(2);
    });
});
