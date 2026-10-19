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
import DungeonPage from '../DungeonPage';
import MonsterBattle from '../sub-views/MonsterBattle';
import { CrewManager } from '../../utils/crew-manager';
import {
    SPIRIT_VESSELS,
    VESSEL_SPIRIT_SLOT_COST,
    VESSEL_SPIRIT_PREP_TIME,
    computeVesselPrepTime
} from '../../utils/spells-table';
import { getMeta, storeMeta } from '../../utils/session-handler';

window.matchMedia = window.matchMedia || function () {
    return {
        matches: false,
        addListener: function () { },
        removeListener: function () { }
    };
};

describe('Summoner Preparation Actions: Spirit Vessels & Homunculus Assembly', () => {
    let crewManager;
    let summoner;
    let dungeonPage;
    let meta;

    beforeEach(() => {
        crewManager = new CrewManager();
        crewManager.initializeCrew([
            {
                id: 'vaelis_summoner',
                name: 'Vaelis',
                type: 'summoner',
                stats: { str: 4, int: 12, dex: 6, fort: 5, baseHp: 30, experience: 0 },
                specialActions: [],
                skills: ['summon_skeleton', 'summon_imp', 'summon_skeleton_knight'],
                homunculusGrafts: [],
                inventory: [],
                selected: true
            }
        ]);
        summoner = crewManager.crew[0];
        summoner.selected = true;

        meta = { crew: crewManager.crew };
        storeMeta(meta);

        const props = {
            crewManager,
            inventoryManager: { inventory: [], addItem: jest.fn() },
            saveUserData: jest.fn()
        };

        dungeonPage = new DungeonPage(props);
        dungeonPage.displayMessage = jest.fn();
        dungeonPage.setState = (update, callback) => {
            if (typeof update === 'function') {
                dungeonPage.state = { ...dungeonPage.state, ...update(dungeonPage.state) };
            } else {
                dungeonPage.state = { ...dungeonPage.state, ...update };
            }
            if (callback) callback();
        };
        dungeonPage.state = {
            ...dungeonPage.state,
            selectedCrewMember: summoner,
            vesselBuilderOpen: null,
            vesselBuilderSpirits: []
        };
    });

    describe('Spirit Vessels Data Definitions', () => {
        test('SPIRIT_VESSELS defines bone_fetish, clay_effigy, obsidian_phylactery with correct slots', () => {
            expect(SPIRIT_VESSELS.bone_fetish).toBeDefined();
            expect(SPIRIT_VESSELS.bone_fetish.slots).toBe(2);

            expect(SPIRIT_VESSELS.clay_effigy).toBeDefined();
            expect(SPIRIT_VESSELS.clay_effigy.slots).toBe(3);

            expect(SPIRIT_VESSELS.obsidian_phylactery).toBeDefined();
            expect(SPIRIT_VESSELS.obsidian_phylactery.slots).toBe(5);
        });

        test('computeVesselPrepTime calculates prep duration based on spirit tiers', () => {
            const spiritDefs = [
                { id: 'summon_skeleton', tier: 1, name: 'Summon Skeleton' },
                { id: 'summon_skeleton_knight', tier: 2, name: 'Summon Skeleton Knight' },
            ];
            // T1 = 5m, T2 = 20m -> 25m = 1500000 ms
            const totalMs = computeVesselPrepTime(spiritDefs);
            expect(totalMs).toBe(25 * 60 * 1000);
        });
    });

    describe('Spirit Vessel Preparation Lifecycle', () => {
        test('getCharacterActions includes Spirit Vessels for Summoner with 3 tiers', () => {
            const actionsJSX = dungeonPage.getCharacterActions(summoner);
            expect(actionsJSX).toBeDefined();

            const vesselWrapper = actionsJSX.props.children.find(
                child => child && child.props && child.props.className && child.props.className.includes('action-wrapper--spirit_vessel')
            );
            expect(vesselWrapper).toBeDefined();
        });

        test('handleVesselSpiritToggle enforces vessel slot capacities', () => {
            dungeonPage.state.vesselBuilderOpen = 'bone_fetish'; // 2 slots max
            dungeonPage.state.vesselBuilderSpirits = [];

            // Add T1 (cost 1) -> 1/2 slots used
            dungeonPage.handleVesselSpiritToggle('summon_skeleton');
            expect(dungeonPage.state.vesselBuilderSpirits).toHaveLength(1);

            // Add T2 (cost 2) -> 1 + 2 = 3 > 2 (should not add because overflow)
            dungeonPage.handleVesselSpiritToggle('summon_skeleton_knight');
            expect(dungeonPage.state.vesselBuilderSpirits).toHaveLength(1);

            // Add another T1 -> 1 + 1 = 2/2 slots used
            dungeonPage.handleVesselSpiritToggle('summon_imp');
            expect(dungeonPage.state.vesselBuilderSpirits).toHaveLength(2);

            // Toggling again removes it
            dungeonPage.handleVesselSpiritToggle('summon_imp');
            expect(dungeonPage.state.vesselBuilderSpirits).toHaveLength(1);
        });

        test('beginSpecialAction starts spirit_vessel preparation on the crew member', () => {
            const spiritDefs = [
                { id: 'summon_skeleton', tier: 1, name: 'Summon Skeleton' }
            ];
            crewManager.beginSpecialAction(summoner, { type: 'spirit_vessel' }, {
                vesselTier: 'bone_fetish',
                spiritDefs
            });

            expect(summoner.specialActions).toHaveLength(1);
            const sa = summoner.specialActions[0];
            expect(sa.type).toBe('spirit_vessel');
            expect(sa.vesselTier).toBe('bone_fetish');
            expect(sa.available).toBe(false);
            expect(sa.spirits).toEqual(['summon_skeleton']);
            expect(sa.slotsUsed).toBe(1);
        });

        test('checkAndCollectFinishedSpecialActions marks spirit vessel available when time passes', () => {
            summoner.specialActions = [
                {
                    type: 'spirit_vessel',
                    vesselTier: 'bone_fetish',
                    name: 'Bone Fetish',
                    spirits: ['summon_skeleton'],
                    spiritDefs: [{ id: 'summon_skeleton', tier: 1, name: 'Summon Skeleton' }],
                    slotsUsed: 1,
                    available: false,
                    startDate: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                    endDate: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                    notified: false
                }
            ];
            meta.crew = [summoner];
            storeMeta(meta);

            const result = dungeonPage.checkAndCollectFinishedSpecialActions();
            expect(summoner.specialActions[0].available).toBe(true);
            expect(summoner.specialActions[0].notified).toBe(true);
            expect(result.updates).toHaveLength(1);
            expect(result.updates[0].text).toContain('sealed and ready for combat');
        });
    });

    describe('Homunculus Assembly Lifecycle', () => {
        test('getCharacterActions includes Homunculus with graft count', () => {
            const actionsJSX = dungeonPage.getCharacterActions(summoner);
            const homunculusWrapper = actionsJSX.props.children.find(
                child => child && child.props && child.props.className && child.props.className.includes('action-wrapper--homunculus_assembly')
            );
            expect(homunculusWrapper).toBeDefined();
        });

        test('handleActionClick opens Homunculus overlay for Summoner', () => {
            const action = { type: 'homunculus_assembly' };
            dungeonPage.handleActionClick(action);

            expect(dungeonPage.state.showHomunculusOverlay).toBe(true);
            expect(dungeonPage.state.homunculusOverlayMemberId).toBe('vaelis_summoner');
        });

        test('handleAssembleHomunculusGraft initiates graft assembly with progressive duration', () => {
            dungeonPage.state.homunculusOverlayMemberId = 'vaelis_summoner';
            dungeonPage.state.homunculusSelectedSlot = 'void_core';
            dungeonPage.state.homunculusSelectedDesign = 'abyssal_heart';

            dungeonPage.handleAssembleHomunculusGraft();

            expect(summoner.homunculusAssembling).toBeDefined();
            expect(summoner.homunculusAssembling.slot).toBe('void_core');
            expect(summoner.homunculusAssembling.design).toBe('abyssal_heart');
            expect(summoner.homunculusAssembling.index).toBe(0);

            // 1st graft duration = 30 minutes
            const start = new Date(summoner.homunculusAssembling.startDate).getTime();
            const end = new Date(summoner.homunculusAssembling.endDate).getTime();
            expect(end - start).toBe(30 * 60 * 1000);
        });

        test('completing homunculus assembly applies permanent stat boosts and stores graft', () => {
            const initialInt = summoner.stats.int;
            const initialEnergy = summoner.stats.maxEnergy || 0;

            // Simulate completed assembly in meta.crew
            summoner.homunculusAssembling = {
                design: 'abyssal_heart', // +3 INT, +15 Max Energy
                slot: 'void_core',
                startDate: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
                endDate: new Date(Date.now() - 10 * 60 * 1000).toISOString()
            };
            meta.crew = [summoner];
            storeMeta(meta);

            // Trigger tick loop completion check via checkAndCollectFinishedSpecialActions
            dungeonPage.checkAndCollectFinishedSpecialActions();

            expect(summoner.homunculusAssembling).toBeUndefined();
            expect(summoner.homunculusGrafts).toHaveLength(1);
            expect(summoner.homunculusGrafts[0].design).toBe('abyssal_heart');
            expect(summoner.homunculusGrafts[0].slot).toBe('void_core');

            // Verify permanent stat boosts applied
            expect(summoner.stats.int).toBe(initialInt + 3);
            expect(summoner.stats.maxEnergy).toBe(initialEnergy + 15);
        });
    });

    describe('Combat Integration: Spirit Vessel auto-deploy and firing', () => {
        test('fireSpiritVessel triggers slotted summons and consumes vessel from specialActions', () => {
            const mockCombatManager = {
                getCombatant: jest.fn().mockReturnValue({ id: 'enemy_1', isMonster: true, dead: false }),
                appendCombatLog: jest.fn(),
                fighterSpecialAttack: jest.fn(),
                getCombatLog: jest.fn().mockReturnValue([]),
                specialsMatrix: {}
            };

            const vessel = {
                type: 'spirit_vessel',
                vesselTier: 'bone_fetish',
                name: 'Bone Fetish',
                spirits: ['summon_skeleton', 'summon_imp'],
                spiritDefs: [
                    { id: 'summon_skeleton', tier: 1, name: 'Summon Skeleton' },
                    { id: 'summon_imp', tier: 1, name: 'Summon Imp' }
                ],
                available: true
            };

            summoner.specialActions = [{ ...vessel }];
            meta.crew = [summoner];
            storeMeta(meta);

            const battle = new MonsterBattle({
                crew: [summoner],
                combatManager: mockCombatManager
            });
            battle.setState = (update, cb) => {
                battle.state = { ...battle.state, ...update };
                if (cb) cb();
            };
            battle.state = { selectedFighter: summoner };

            battle.fireSpiritVessel(vessel);

            // Vessel consumed from selectedFighter specialActions
            expect(summoner.specialActions).toHaveLength(0);
            expect(mockCombatManager.appendCombatLog).toHaveBeenCalledWith(
                expect.stringContaining('[Spirit Vessel]')
            );
        });
    });
});
