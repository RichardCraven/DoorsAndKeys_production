import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';
import { loadAllDungeonsRequest, getActivePresenceRequest, ensureServerWarm, isServerWarm } from '../../utils/api-handler';
import { storeMeta } from '../../utils/session-handler';

jest.mock('../../utils/api-handler', () => ({
    loadAllDungeonsRequest: jest.fn(),
    getActivePresenceRequest: jest.fn(),
    getAllUsersRequest: jest.fn().mockResolvedValue({ data: [] }),
    updateUserRequest: jest.fn().mockResolvedValue({ status: 200 }),
    deleteDungeonRequest: jest.fn().mockResolvedValue({ status: 200 }),
    sendFeedbackNotification: jest.fn().mockResolvedValue({ status: 200 }),
    ensureServerWarm: jest.fn().mockResolvedValue(true),
    isServerWarm: jest.fn(() => true)
}));

jest.mock('../../utils/images', () => ({
    getCrewPortraitBackground: jest.fn(() => 'url(test.png)'),
    formatRosterSkillName: jest.fn(s => s),
    renderWeaknessSymbols: jest.fn(() => null),
    renderPowerRatingsPanel: jest.fn(() => null)
}));

describe('LandingPage - Dungeon Dropdown Active Player Priority', () => {
    const makeDungeon = (id, name) => ({
        _id: id,
        content: JSON.stringify({
            id,
            name,
            valid: true,
            levels: [
                {
                    id: 1,
                    front: {
                        miniboards: [
                            {
                                tiles: [
                                    { contains: 'spawn_point' }
                                ]
                            }
                        ]
                    }
                }
            ]
        })
    });

    beforeEach(() => {
        window.matchMedia = window.matchMedia || function() {
            return {
                matches: false,
                addListener: function() {},
                removeListener: function() {}
            };
        };
        localStorage.clear();
        storeMeta({});
        jest.clearAllMocks();

        loadAllDungeonsRequest.mockResolvedValue({
            data: [
                makeDungeon('dungeon_alpha', 'Alpha Crypt'),
                makeDungeon('dungeon_beta', 'Beta Ruins'),
                makeDungeon('dungeon_gamma', 'Gamma Caverns')
            ]
        });

        // Presence map: Beta has 3 players, Gamma has 1 player, Alpha has 0
        getActivePresenceRequest.mockResolvedValue({
            data: {
                'beta ruins': 3,
                'gamma caverns': 1
            }
        });
    });

    test('prioritizes dungeons with active players at the top of the dropdown listing', async () => {
        let container;
        await act(async () => {
            const res = render(
                <MemoryRouter>
                    <LandingPage />
                </MemoryRouter>
            );
            container = res.container;
        });

        // Click trigger to open dropdown
        const trigger = container.querySelector('.custom-select-trigger');
        expect(trigger).not.toBeNull();

        await act(async () => {
            fireEvent.click(trigger);
            await new Promise(r => setTimeout(r, 50));
        });

        const menu = container.querySelector('.custom-select-menu');
        expect(menu).not.toBeNull();

        const menuItems = container.querySelectorAll('.custom-select-menu .menu-item');
        expect(menuItems.length).toBe(3);

        // First item should be Beta Ruins (3 online)
        expect(menuItems[0].textContent).toContain('Beta Ruins');
        expect(menuItems[0].textContent).toContain('3 online');

        // Second item should be Gamma Caverns (1 online)
        expect(menuItems[1].textContent).toContain('Gamma Caverns');
        expect(menuItems[1].textContent).toContain('1 online');

        // Third item should be Alpha Crypt (0 online)
        expect(menuItems[2].textContent).toContain('Alpha Crypt');
        expect(menuItems[2].textContent).not.toContain('online');
    });
});
