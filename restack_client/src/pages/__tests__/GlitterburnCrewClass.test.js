import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CrewManagerPage from '../CrewManagerPage';
import { CrewManager } from '../../utils/crew-manager';

// Mock getMeta and storeMeta
jest.mock('../../utils/images', () => {
    const original = jest.requireActual('../../utils/images');
    return {
        ...original,
        getMeta: jest.fn(() => ({ crew: [] })),
        storeMeta: jest.fn(),
        updateUserRequest: jest.fn(),
        getUserId: jest.fn(() => 'test_user')
    };
});

describe('Glitterburn Crew Class Option', () => {
    test('Glitterburn class option is included in adventurers list and marked disabled/locked', () => {
        const crewManager = new CrewManager();
        const glitterburn = crewManager.adventurers.find(a => a.type === 'glitterburn' || a.image === 'glitterburn');
        
        expect(glitterburn).toBeDefined();
        expect(glitterburn.name).toBe('Glitterburn');
        expect(glitterburn.disabled).toBe(true);
        expect(glitterburn.locked).toBe(true);
    });

    test('Glitterburn is displayed in CrewManagerPage with locked indicator and cannot be added to crew', () => {
        const crewManager = new CrewManager();
        const { container } = render(<CrewManagerPage crewManager={crewManager} />);

        // Find locked portrait
        const lockedPortraits = container.querySelectorAll('.portrait.disabled.locked');
        expect(lockedPortraits.length).toBeGreaterThan(0);

        // Verify lock symbol inside portrait
        expect(container.textContent).toContain('🔒');
        expect(container.textContent).toContain('Locked');

        // Click locked portrait
        fireEvent.click(lockedPortraits[0]);

        // Attempting to add member shouldn't add to selected crew
        const addButton = container.querySelector('.add-button.disabled');
        expect(addButton).toBeInTheDocument();
    });
});
