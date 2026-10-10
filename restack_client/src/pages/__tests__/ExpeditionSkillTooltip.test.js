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
import { render, screen, fireEvent } from '@testing-library/react';
import DungeonPage from '../DungeonPage';

describe('Expedition Skill Custom Tooltip & Codex Button', () => {
    let mockState;

    beforeEach(() => {
        const hero = {
            id: 'hero1',
            name: 'Gandalf',
            type: 'wizard',
            class: 'wizard',
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            expeditionSkills: ['astral_conduit', 'ley_tap', 'scry'],
        };
        mockState = {
            crew: [hero],
            selectedCrewIndex: 0,
            selectedCrewMember: hero,
            activeExpeditionSkill: null,
            showCodex: false,
            codexEntry: null,
        };
    });

    test('renders custom tooltip for expedition skills with question mark button', () => {
        // Instantiate DungeonPage and test renderCrewListSection output
        const page = new DungeonPage({});
        page.isSectionCollapsed = () => false;
        page.state = {
            ...page.state,
            ...mockState,
        };

        const crewList = page.renderCrewListSection();
        const { container } = render(<>{crewList}</>);

        // Check if skill slots are rendered
        const skillSlots = container.querySelectorAll('.expedition-skill-slot');
        expect(skillSlots.length).toBeGreaterThan(0);

        // Check if tooltip elements exist inside skill slots
        const tooltips = container.querySelectorAll('.expedition-skill-tooltip');
        expect(tooltips.length).toBeGreaterThan(0);

        // Check for codex question mark button
        const codexButtons = container.querySelectorAll('.expedition-skill-codex-btn');
        expect(codexButtons.length).toBeGreaterThan(0);
    });

    test('clicking question mark button opens codex with correct skill entry', () => {
        const page = new DungeonPage({});
        page.isSectionCollapsed = () => false;
        page.state = {
            ...page.state,
            ...mockState,
        };
        page.setState = jest.fn((newState) => {
            page.state = { ...page.state, ...newState };
        });

        const crewList = page.renderCrewListSection();
        const { container } = render(<>{crewList}</>);

        const codexButton = container.querySelector('.expedition-skill-codex-btn');
        expect(codexButton).not.toBeNull();

        fireEvent.click(codexButton);

        expect(page.setState).toHaveBeenCalledWith(
            expect.objectContaining({
                showCodex: true,
                codexEntry: expect.objectContaining({
                    tab: 'skills',
                    entryId: expect.any(String),
                }),
            })
        );
    });
});
