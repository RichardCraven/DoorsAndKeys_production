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
    getCrewPortraitBackground: jest.fn((portrait, type) => `url(${portrait || type})`),
    formatRosterSkillName: jest.fn(s => s),
    renderWeaknessSymbols: jest.fn(() => null),
    renderPowerRatingsPanel: jest.fn(() => null),
    ranger_portrait: 'ranger_default_img.png',
    ranger_alt_portrait: 'ranger_alt_img.png',
    barbarian_portrait: 'barbarian_default_img.png',
    barbarian_alt_portrait: 'barbarian_alt_img.png',
    soldier_portrait: 'soldier_img.png',
    soldier_alt_portrait: 'soldier_alt_img.png',
    wizard_portrait: 'wizard_img.png',
    wizard_alt_portrait: 'wizard_alt_img.png',
    monk_portrait: 'monk_img.png',
    monk_alt_portrait: 'monk_alt_img.png',
    sage_portrait: 'sage_img.png',
    sage_alt_portrait: 'sage_alt_img.png',
    sage_alt_grandmotherly_portrait: 'sage_alt_img.png',
    sage_alt_shaved_portrait: 'sage_alt_shaved_img.png',
    engineer: 'engineer_img.png',
    engineer_alt_portrait: 'engineer_alt_img.png',
    summoner: 'summoner_img.png',
    summoner_alt_portrait: 'summoner_alt_img.png',
    glitterburn_portrait: 'glitterburn_img.png',
    glitterburn_alt_portrait: 'glitterburn_alt_img.png',
    hollow_portrait: 'hollow_img.png',
    hollow_alt_portrait: 'hollow_alt_img.png'
}));

describe('Crew Portrait Toggle Mechanic', () => {
    let crewManager;

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        crewManager = new CrewManager();
        storeMeta({ crew: [], alternateCrew: [] });
    });

    test('renders toggle controls for all unlocked classes with multiple portrait options', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        // Options toggles in top row (all 9 unlocked classes have alternates)
        const toggleButtons = container.querySelectorAll('.crew-option-portrait-toggle');
        expect(toggleButtons.length).toBe(9);

        // Find Ranger in options
        const rangerOption = container.querySelector('.crew-options .portrait[data-type="ranger"]');
        expect(rangerOption).not.toBeNull();
        expect(rangerOption.querySelector('.crew-option-portrait-toggle')).not.toBeNull();

        // Find Soldier in options
        const soldierOption = container.querySelector('.crew-options .portrait[data-type="soldier"]');
        expect(soldierOption).not.toBeNull();
        expect(soldierOption.querySelector('.crew-option-portrait-toggle')).not.toBeNull();

        // Locked class (Glitterburn) should not render a toggle button
        const glitterburnOption = container.querySelector('.crew-options .portrait[data-type="glitterburn"]');
        expect(glitterburnOption).not.toBeNull();
        expect(glitterburnOption.querySelector('.crew-option-portrait-toggle')).toBeNull();
    });

    test('toggling Ranger switches portrait and updates default name from Dormund to Ekatra', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        // Click Ranger in options to select
        const rangerOption = container.querySelector('.crew-options .portrait[data-type="ranger"]');
        expect(rangerOption).not.toBeNull();
        fireEvent.click(rangerOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Dormund');

        // Toggle button in member-panel
        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();

        // Click toggle button
        fireEvent.click(toggleBtn);

        // Name should now be Ekatra
        expect(nameInput.value).toBe('Ekatra');

        // Click toggle button again to switch back
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Dormund');
    });

    test('clicking the top-row thumbnail toggle switches Ranger to Ekatra directly', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        // Find Ranger's top-row thumbnail toggle button
        const rangerOption = container.querySelector('.crew-options .portrait[data-type="ranger"]');
        const toggleInRow = rangerOption.querySelector('.crew-option-portrait-toggle');
        expect(toggleInRow).not.toBeNull();

        // Click the thumbnail toggle button
        fireEvent.click(toggleInRow);

        // Select Ranger to verify details
        fireEvent.click(rangerOption, { detail: 1 });
        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Ekatra');
    });

    test('custom name is preserved when toggling portraits', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        // Select Ranger
        const rangerOption = container.querySelector('.crew-options .portrait[data-type="ranger"]');
        fireEvent.click(rangerOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        // Type custom name
        fireEvent.change(nameInput, { target: { value: 'Shadowhunter' } });
        expect(nameInput.value).toBe('Shadowhunter');

        // Toggle portrait
        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        fireEvent.click(toggleBtn);

        // Custom name remains intact!
        expect(nameInput.value).toBe('Shadowhunter');
    });

    test('double-clicking Ekatra assigns her to the bottom roster tray with alternate portrait', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        // Select Ranger
        const rangerOption = container.querySelector('.crew-options .portrait[data-type="ranger"]');
        fireEvent.click(rangerOption, { detail: 1 });

        // Toggle to Ekatra
        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        fireEvent.click(toggleBtn);

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Ekatra');

        // Double click to assign to roster
        fireEvent.click(rangerOption, { detail: 2 });

        // Tray slots (In-Dungeon Crew has 3 slots)
        const assignedPortrait = container.querySelector('.crew-tray .portrait[data-name="Ekatra"]');
        expect(assignedPortrait).not.toBeNull();
        expect(assignedPortrait.getAttribute('title')).toBe('Ekatra');
        expect(assignedPortrait.getAttribute('data-type')).toBe('ranger');

        const { getCrewPortraitBackground } = require('../../utils/images');
        expect(getCrewPortraitBackground).toHaveBeenCalledWith('ranger_alt_img.png', 'ranger');
    });

    test('toggling Barbarian switches between Ulaf and Hildr', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        // Find Barbarian
        const barbOption = container.querySelector('.crew-options .portrait[data-type="barbarian"]');
        fireEvent.click(barbOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Ulaf');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();
        fireEvent.click(toggleBtn);

        expect(nameInput.value).toBe('Hildr');
    });

    test('toggling Soldier switches between Sardonis and Valeria', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        // Find Soldier
        const soldierOption = container.querySelector('.crew-options .portrait[data-type="soldier"]');
        fireEvent.click(soldierOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Sardonis');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();
        fireEvent.click(toggleBtn);

        expect(nameInput.value).toBe('Valeria');

        // Toggle back to Sardonis
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Sardonis');
    });

    test('toggling Wizard switches between Zildjikan and Morrigan', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const wizardOption = container.querySelector('.crew-options .portrait[data-type="wizard"]');
        fireEvent.click(wizardOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Zildjikan');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Morrigan');

        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Zildjikan');
    });

    test('toggling Monk switches between Yu and Mei', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const monkOption = container.querySelector('.crew-options .portrait[data-type="monk"]');
        fireEvent.click(monkOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Yu');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Mei');

        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Yu');
    });

    test('toggling Sage cycles between Loryastes, Theodora, and Theodora (Ascetic)', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const sageOption = container.querySelector('.crew-options .portrait[data-type="sage"]');
        fireEvent.click(sageOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Loryastes');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();
        
        // 1st toggle: switch to Theodora (Grandmotherly)
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Theodora');

        // 2nd toggle: switch to Theodora (Ascetic) (Shaved Head)
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Theodora (Ascetic)');

        // 3rd toggle: cycle back to Loryastes
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Loryastes');
    });

    test('toggling Engineer switches between Icaron and Brinna', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const engineerOption = container.querySelector('.crew-options .portrait[data-type="engineer"]');
        fireEvent.click(engineerOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Icaron');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Brinna');

        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Icaron');
    });

    test('toggling Summoner switches between Vaelis and Morwenna', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const summonerOption = container.querySelector('.crew-options .portrait[data-type="summoner"]');
        fireEvent.click(summonerOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Vaelis');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Morwenna');

        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Vaelis');
    });

    test('toggling Sage updates description to reflect Theodora and Theodora (Ascetic)', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const sageOption = container.querySelector('.crew-options .portrait[data-type="sage"]');
        fireEvent.click(sageOption, { detail: 1 });

        const descEl = container.querySelector('.description');
        expect(descEl.textContent).toContain('Loryastes is the headmaster of Citadel library');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        // Toggle to Theodora
        fireEvent.click(toggleBtn);
        expect(descEl.textContent).toContain('Theodora is the headmaster of Citadel library');
        expect(descEl.textContent).not.toContain('Loryastes');

        // Toggle to Theodora (Ascetic)
        fireEvent.click(toggleBtn);
        expect(descEl.textContent).toContain('Theodora (Ascetic) is the headmaster of Citadel library');
        expect(descEl.textContent).not.toContain('Loryastes');

        // Typing custom name in input updates description immediately
        const nameInput = container.querySelector('.member-name input');
        fireEvent.change(nameInput, { target: { value: 'Archsage Eleanor' } });
        expect(descEl.textContent).toContain('Archsage Eleanor is the headmaster of Citadel library');
    });

    test('toggling Hollow switches between Valok and Mira', () => {
        const { container } = render(
            <MemoryRouter>
                <CrewManagerPage crewManager={crewManager} />
            </MemoryRouter>
        );

        const hollowOption = container.querySelector('.crew-options .portrait[data-type="hollow"]');
        expect(hollowOption).not.toBeNull();
        fireEvent.click(hollowOption, { detail: 1 });

        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Valok');

        const toggleBtn = container.querySelector('.portrait-toggle-btn');
        expect(toggleBtn).not.toBeNull();
        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Mira');

        fireEvent.click(toggleBtn);
        expect(nameInput.value).toBe('Valok');
    });
});

