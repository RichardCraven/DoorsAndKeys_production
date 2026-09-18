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

describe('Pocket Dimension Automaton War Strategy and Hostile Pygmy Aggro', () => {
    let page;

    beforeEach(() => {
        page = new DungeonPage({});
        page._isMounted = true;
        page.state = {
            inSuperboard: true,
            superboardType: 'pocket_dimension',
            superboardViewMinX: 0,
            superboardViewMinY: 0,
            superboardEntities: {},
            dungeon: {
                superboards: {
                    pocket_dimension: {
                        miniboards: Array.from({ length: 9 }, (_, mbIdx) => ({
                            tiles: Array.from({ length: 225 }, (_, tIdx) => ({
                                id: `tile_${mbIdx}_${tIdx}`,
                                color: 'rgb(30, 35, 45)',
                                contains: null,
                                building: null,
                                affiliation: 'neutral'
                            }))
                        }))
                    }
                }
            }
        };
    });

    test('1. Automaton prioritizes constructing War Fort towards center (22, 22) when resources available', () => {
        const superboard = page.state.dungeon.superboards.pocket_dimension;
        page._automatonResources = { wood: 100, ore: 100, slate: 100, food: 100, dust: 100 };
        page._automatonLastBuildTime = 0;

        // Place Automaton at (0, 0)
        const autoEntity = {
            id: 'automaton_test',
            isAutomaton: true,
            subtype: 'automaton',
            gx: 0,
            gy: 0,
            hp: 30,
            affiliation: 'hostile'
        };
        page.state.superboardEntities['automaton_test'] = autoEntity;
        superboard.miniboards[0].tiles[0].contains = autoEntity;

        page.tickPocketPygmies(superboard, 'pocket_dimension');

        // Automaton should acquire build plan for war_fort closest to center (22, 22)
        expect(autoEntity.buildPlan).toBeDefined();
        expect(autoEntity.buildPlan.type).toBe('war_fort');

        // Center miniboard is mbIdx 4 (gx: 15..29, gy: 15..29). Center is (22, 22).
        // Candidate site should be within mbIdx 4
        expect(autoEntity.buildPlan.mbIdx).toBe(4);
        const candCenterDist = Math.hypot(22 - autoEntity.buildPlan.gx, 22 - autoEntity.buildPlan.gy);
        expect(candCenterDist).toBeLessThanOrEqual(5);
    });

    test('2. Automaton builds War Camp towards center when War Fort is capped at 2', () => {
        const superboard = page.state.dungeon.superboards.pocket_dimension;
        page._automatonResources = { wood: 100, ore: 100, slate: 100, food: 100, dust: 100 };
        page._automatonLastBuildTime = 0;

        // Simulate 2 existing hostile War Forts (each 2x2 = 4 tiles with affiliation 'hostile')
        for (let i = 0; i < 2; i++) {
            const mb = superboard.miniboards[i];
            for (let idx of [0, 1, 15, 16]) {
                mb.tiles[idx].contains = {
                    type: 'building',
                    subtype: 'war_fort',
                    building: 'war_fort',
                    affiliation: 'hostile',
                    vendorGroupId: `fort_${i}`
                };
                mb.tiles[idx].building = 'war_fort';
                mb.tiles[idx].affiliation = 'hostile';
            }
        }

        const autoEntity = {
            id: 'automaton_test',
            isAutomaton: true,
            subtype: 'automaton',
            gx: 0,
            gy: 0,
            hp: 30,
            affiliation: 'hostile'
        };
        page.state.superboardEntities['automaton_test'] = autoEntity;
        superboard.miniboards[0].tiles[30].contains = autoEntity;

        page.tickPocketPygmies(superboard, 'pocket_dimension');

        // Should plan a War Camp next since War Fort count is 2
        expect(autoEntity.buildPlan).toBeDefined();
        expect(autoEntity.buildPlan.type).toBe('war_camp');
        expect(autoEntity.buildPlan.mbIdx).toBe(4);
    });

    test('3. Automaton respects cap of 2 War Camps and 2 War Forts', () => {
        const superboard = page.state.dungeon.superboards.pocket_dimension;
        page._automatonResources = { wood: 100, ore: 100, slate: 100, food: 100, dust: 100 };
        page._automatonLastBuildTime = 0;

        // Place 2 hostile War Forts
        for (let i = 0; i < 2; i++) {
            const mb = superboard.miniboards[i];
            for (let idx of [0, 1, 15, 16]) {
                mb.tiles[idx].contains = {
                    type: 'building',
                    subtype: 'war_fort',
                    building: 'war_fort',
                    affiliation: 'hostile',
                    vendorGroupId: `fort_${i}`
                };
                mb.tiles[idx].building = 'war_fort';
                mb.tiles[idx].affiliation = 'hostile';
            }
        }
        // Place 2 hostile War Camps
        for (let i = 2; i < 4; i++) {
            const mb = superboard.miniboards[i];
            for (let idx of [0, 1, 15, 16]) {
                mb.tiles[idx].contains = {
                    type: 'building',
                    subtype: 'war_camp',
                    building: 'war_camp',
                    affiliation: 'hostile',
                    vendorGroupId: `camp_${i}`
                };
                mb.tiles[idx].building = 'war_camp';
                mb.tiles[idx].affiliation = 'hostile';
            }
        }

        const autoEntity = {
            id: 'automaton_test',
            isAutomaton: true,
            subtype: 'automaton',
            gx: 0,
            gy: 0,
            hp: 30,
            affiliation: 'hostile'
        };
        page.state.superboardEntities['automaton_test'] = autoEntity;
        superboard.miniboards[0].tiles[45].contains = autoEntity;

        page.tickPocketPygmies(superboard, 'pocket_dimension');

        // Both war_fort and war_camp caps reached (2 each); should fall back to earthen_fort or outpost
        expect(autoEntity.buildPlan.type).not.toBe('war_fort');
        expect(autoEntity.buildPlan.type).not.toBe('war_camp');
    });

    test('4. Player building cap enforcement: rejects > 1 War Camp and > 1 War Fort', () => {
        const superboard = page.state.dungeon.superboards.pocket_dimension;
        // Add 1 player-built War Camp (2x2)
        for (let idx of [0, 1, 15, 16]) {
            superboard.miniboards[0].tiles[idx].contains = {
                type: 'building',
                subtype: 'war_camp',
                placedBy: 'player',
                vendorGroupId: 'player_camp'
            };
            superboard.miniboards[0].tiles[idx].placedBy = 'player';
        }

        const counts = page.getPocketDimensionStructureCounts();
        expect(counts.war_camp).toBe(1);
        expect(counts.war_fort).toBe(0);

        const mockMessaging = jest.fn();
        page.props = { boardManager: { messaging: mockMessaging } };

        // Attempting to build a second War Camp
        page.handleBuildBuilding({ key: 'war_camp', name: 'War Camp' });
        expect(mockMessaging).toHaveBeenCalledWith(expect.stringContaining('Cannot build more than 1 War Camp'));
    });

    test('5. Hostile Pygmy actively seeks player avatar and attacks when adjacent', () => {
        const superboard = page.state.dungeon.superboards.pocket_dimension;
        // Place player at (10, 10)
        page.state.superboardPlayerPos = { gx: 10, gy: 10 };
        page.damagePlayerCrew = jest.fn();
        page.animatePocketPygmyBump = jest.fn();
        page.displayMessage = jest.fn();

        // Place hostile pygmy at adjacent tile (10, 11)
        const hostilePygmy = {
            id: 'hostile_pygmy_1',
            isPocketPygmy: true,
            isHostile: true,
            faction: 'hostile',
            gx: 10,
            gy: 11,
            hp: 10,
            maxHp: 10,
            lastAttackTime: 0
        };
        page.state.superboardEntities['hostile_pygmy_1'] = hostilePygmy;
        superboard.miniboards[0].tiles[11 * 15 + 10].contains = hostilePygmy;

        page.tickPocketPygmies(superboard, 'pocket_dimension');

        // Pygmy should have attacked the adjacent player avatar
        expect(page.damagePlayerCrew).toHaveBeenCalled();
        expect(page.animatePocketPygmyBump).toHaveBeenCalled();
    });

    test('6. Hostile Pygmy pursues distant player building across superboard', () => {
        const superboard = page.state.dungeon.superboards.pocket_dimension;
        // Player is in hut or null
        page.state.superboardPlayerPos = null;

        // Friendly building at mbIdx 4 (gx: 20, gy: 20)
        const friendlyBldg = {
            type: 'building',
            subtype: 'war_camp',
            building: 'war_camp',
            affiliation: 'friendly',
            placedBy: 'player',
            hp: 100,
            maxHp: 100
        };
        superboard.miniboards[4].tiles[5 * 15 + 5].contains = friendlyBldg;
        superboard.miniboards[4].tiles[5 * 15 + 5].building = 'war_camp';
        superboard.miniboards[4].tiles[5 * 15 + 5].affiliation = 'friendly';

        // Hostile pygmy at (5, 5) (distance > 15 tiles)
        const hostilePygmy = {
            id: 'hostile_pygmy_far',
            isPocketPygmy: true,
            isHostile: true,
            faction: 'hostile',
            gx: 5,
            gy: 5,
            hp: 10,
            maxHp: 10
        };
        page.state.superboardEntities['hostile_pygmy_far'] = hostilePygmy;
        superboard.miniboards[0].tiles[5 * 15 + 5].contains = hostilePygmy;

        const initialDist = Math.hypot(20 - hostilePygmy.gx, 20 - hostilePygmy.gy);

        page.tickPocketPygmies(superboard, 'pocket_dimension');

        // Pygmy should have moved closer to (20, 20)
        const newDist = Math.hypot(20 - hostilePygmy.gx, 20 - hostilePygmy.gy);
        expect(newDist).toBeLessThan(initialDist);
    });
});
