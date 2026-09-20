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

describe('Pocket Dimension Clean Re-entry & Defeat Prevention', () => {
    let page;

    beforeEach(() => {
        jest.useFakeTimers();
        page = new DungeonPage({});
        page.props = {
            crewManager: {
                crew: []
            },
            boardManager: {
                dungeon: {
                    superboards: {}
                },
                normalizeBoardTiles: jest.fn(),
                getIndexFromCoordinates: jest.fn(() => 112),
                playerTile: { location: [7, 7], boardIndex: 4 }
            }
        };
        page.state = {
            inSuperboard: false,
            isInPocketDimension: false,
            portalTransitionClass: '',
            justSpawnedInSuperboard: false,
            showPocketDefeatModal: false,
            showPocketVictoryModal: false,
            pocketDimensionWon: false,
            keysLocked: false,
            selectedCrewMember: null,
            superboardEntities: {},
            superboardPlayerPos: { gx: 22, gy: 22 }
        };
        page.setState = jest.fn((newState, cb) => {
            page.state = { ...page.state, ...newState };
            if (cb) cb();
        });
        page.displayMessage = jest.fn();
        page.updateFloatingPlayerPosition = jest.fn();
        page.updateSuperboardViewport = jest.fn();
        page.clearIlluminatedTile = jest.fn();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('migrateTilesToEntityRegistry with clearExisting=true discards old stale entities from state', () => {
        page.state.superboardEntities = {
            'stale_automaton_123': {
                id: 'stale_automaton_123',
                isAutomaton: true,
                gx: 40,
                gy: 40,
                hp: 30
            }
        };

        const superboard = {
            miniboards: [
                {
                    tiles: [
                        {
                            contains: {
                                id: 'fresh_automaton_456',
                                isAutomaton: true,
                                subtype: 'automaton',
                                hp: 30
                            }
                        }
                    ]
                }
            ]
        };

        const freshEntities = page.migrateTilesToEntityRegistry(superboard, true);

        expect(freshEntities['stale_automaton_123']).toBeUndefined();
        expect(freshEntities['fresh_automaton_456']).toBeDefined();
        expect(freshEntities['fresh_automaton_456'].gx).toBe(0);
        expect(freshEntities['fresh_automaton_456'].gy).toBe(0);
    });

    test('migrateTilesToEntityRegistry with clearExisting=false merges existing entities', () => {
        page.state.superboardEntities = {
            'existing_walker': {
                id: 'existing_walker',
                isWalker: true,
                gx: 5,
                gy: 5,
                hp: 100
            }
        };

        const superboard = {
            miniboards: [
                {
                    tiles: [
                        {
                            contains: {
                                id: 'fresh_pygmy',
                                isPocketPygmy: true,
                                subtype: 'pocket_pygmy',
                                hp: 10
                            }
                        }
                    ]
                }
            ]
        };

        const merged = page.migrateTilesToEntityRegistry(superboard, false);

        expect(merged['existing_walker']).toBeDefined();
        expect(merged['fresh_pygmy']).toBeDefined();
    });

    test('enterSuperboardPocketDimension automatically revives crew if all crew are dead, preventing defeat popup', () => {
        const deadCrew = [
            { id: 'c1', name: 'Ranger', hp: 0, dead: true, max_hp: 20 },
            { id: 'c2', name: 'Mage', hp: 0, dead: true, starting_hp: 15 }
        ];
        page.props.crewManager.crew = deadCrew;

        page.enterSuperboardPocketDimension('test_dimension');

        // Advance transition timer
        jest.advanceTimersByTime(600);

        // Crew must be revived
        expect(page.props.crewManager.crew[0].hp).toBe(20);
        expect(page.props.crewManager.crew[0].dead).toBe(false);
        expect(page.props.crewManager.crew[0].selected).toBe(true);
        expect(page.props.crewManager.crew[1].hp).toBe(15);
        expect(page.props.crewManager.crew[1].dead).toBe(false);

        // Defeat modal must NOT be open
        expect(page.state.showPocketDefeatModal).toBe(false);
        expect(page.state.inSuperboard).toBe(true);
        expect(page.state.justSpawnedInSuperboard).toBe(true);
    });

    test('enterSuperboardPocketDimension resets automaton resources and building counts', () => {
        page._automatonResources = { wood: 500, slate: 400, ore: 300, food: 200, dust: 100 };
        page._automatonFortsBuilt = 5;
        page._automatonWarCampsBuilt = 2;
        page._automatonWarFortsBuilt = 2;
        page._automatonLastBuildTime = 99999999;
        page._automatonTargetMbIdx = 3;

        page.enterSuperboardPocketDimension('test_dimension');
        jest.advanceTimersByTime(600);

        expect(page._automatonResources).toEqual({ wood: 20, slate: 20, ore: 20, food: 20, dust: 20 });
        expect(page._automatonFortsBuilt).toBe(0);
        expect(page._automatonWarCampsBuilt).toBe(0);
        expect(page._automatonWarFortsBuilt).toBe(0);
        expect(page._automatonLastBuildTime).toBe(0);
        expect(page._automatonTargetMbIdx).toBeNull();
    });

    test('autoSelectNextLivingCrewMemberInPocket does not trigger defeat if transition or justSpawned is active', () => {
        page.props.crewManager.crew = [
            { id: 'c1', hp: 0, dead: true }
        ];

        // 1. In transition
        page.state.inSuperboard = true;
        page.state.portalTransitionClass = 'pocket-transition-in';
        page.state.justSpawnedInSuperboard = false;
        expect(page.autoSelectNextLivingCrewMemberInPocket()).toBe(false);
        expect(page.state.showPocketDefeatModal).toBe(false);

        // 2. Just spawned in superboard
        page.state.portalTransitionClass = '';
        page.state.justSpawnedInSuperboard = true;
        expect(page.autoSelectNextLivingCrewMemberInPocket()).toBe(false);
        expect(page.state.showPocketDefeatModal).toBe(false);

        // 3. Not in superboard
        page.state.inSuperboard = false;
        page.state.justSpawnedInSuperboard = false;
        expect(page.autoSelectNextLivingCrewMemberInPocket()).toBe(false);
        expect(page.state.showPocketDefeatModal).toBe(false);
    });

    test('damagePlayerCrew does not trigger defeat modal during transition or initial spawn', () => {
        page.props.crewManager.crew = [
            { id: 'c1', hp: 0, dead: true }
        ];
        page.state.inSuperboard = true;
        page.state.portalTransitionClass = 'pocket-transition-in';
        page.state.justSpawnedInSuperboard = false;

        page.damagePlayerCrew(10);
        jest.advanceTimersByTime(500);

        expect(page.state.showPocketDefeatModal).toBe(false);
    });

    test('exitSuperboardPocketDimension cleanly resets all automaton state and registry', () => {
        page._automatonResources = { wood: 99, slate: 99, ore: 99, food: 99, dust: 99 };
        page._automatonFortsBuilt = 3;
        page._automatonWarCampsBuilt = 2;
        page.state.inSuperboard = true;
        page.state.superboardEntities = { auto_1: { id: 'auto_1' } };

        page.exitSuperboardPocketDimension();
        jest.advanceTimersByTime(600);

        expect(page.state.inSuperboard).toBe(false);
        expect(page.state.superboardEntities).toEqual({});
        expect(page._automatonFortsBuilt).toBe(0);
        expect(page._automatonWarCampsBuilt).toBe(0);
        expect(page._automatonResources).toEqual({ wood: 20, slate: 20, ore: 20, food: 20, dust: 20 });
    });
});
