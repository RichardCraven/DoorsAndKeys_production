import React from 'react';
import CrewManagerPage from '../CrewManagerPage';
import { getMeta, storeMeta, resetDungeonInstanceMeta } from '../../utils/session-handler';
import { commitToInfirmary, dischargeFromInfirmary } from '../../utils/infirmary-manager';

jest.mock('../../utils/api-handler', () => ({
    updateUserRequest: jest.fn().mockResolvedValue({ status: 200 })
}));

describe('Infirmary Early Discharge Roster Pool Integration', () => {
    let barbarian;
    let soldier;
    let mockCrewManager;

    beforeEach(() => {
        localStorage.clear();
        barbarian = { id: 'barbarian_1', name: 'Grog', type: 'barbarian', hp: 100, starting_hp: 100 };
        soldier = { id: 'soldier_1', name: 'Brave', type: 'soldier', hp: 100, starting_hp: 100 };

        mockCrewManager = {
            adventurers: [barbarian, soldier]
        };

        const initialMeta = {
            dungeonEntered: true,
            rosterLocked: true,
            lockedRoster: ['soldier_1'], // Barbarian was in infirmary when dungeon was entered
            crew: [soldier],
            alternateCrew: [],
            infirmary: { patients: [], sageCommitted: false, lastUpdateTs: Date.now() }
        };
        storeMeta(initialMeta);
    });

    test('Discharging unit from infirmary adds them to lockedRoster and infirmaryDischarged', () => {
        // Commit barbarian to infirmary
        commitToInfirmary(barbarian);
        let meta = getMeta(true);
        expect(meta.infirmary.patients.length).toBe(1);

        // Early discharge barbarian
        dischargeFromInfirmary('barbarian_1');
        meta = getMeta(true);

        expect(meta.infirmary.patients.length).toBe(0);
        expect(meta.infirmaryDischarged).toContain('barbarian_1');
        expect(meta.lockedRoster).toContain('barbarian_1');
    });

    test('CrewManagerPage includes early discharged barbarian in options when dungeon roster is locked', () => {
        // Discharged early
        dischargeFromInfirmary('barbarian_1');

        const props = {
            crewManager: mockCrewManager
        };

        const page = new CrewManagerPage(props);
        page.setState = jest.fn((newState) => {
            page.state = { ...page.state, ...newState };
        });
        page.componentDidMount();

        const options = page.state.options;
        const barbarianOption = options.find(o => o.id === 'barbarian_1');

        expect(barbarianOption).toBeDefined();
        expect(barbarianOption.name).toBe('Grog');
    });
});
