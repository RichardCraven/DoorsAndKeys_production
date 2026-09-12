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
import { getCrewRangeRingSpecs } from '../../utils/crew-range-helper';

describe('Pocket Dimension Melee Autofire & Non-Military Building Filtering', () => {
    let page;
    let superboard;

    const createEmptySuperboard = () => {
        const miniboards = [];
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const tiles = [];
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                tiles.push({
                    type: 'empty_space',
                    contains: null,
                    color: '#2d4a22'
                });
            }
            miniboards.push({ tiles });
        }
        return { miniboards };
    };

    const placeTileAt = (sb, gx, gy, tileData) => {
        const mbX = Math.floor(gx / 15);
        const mbY = Math.floor(gy / 15);
        const mbIdx = mbY * 3 + mbX;
        const lX = gx % 15;
        const lY = gy % 15;
        const tIdx = lY * 15 + lX;
        sb.miniboards[mbIdx].tiles[tIdx] = {
            type: 'empty_space',
            contains: null,
            ...tileData
        };
        return sb.miniboards[mbIdx].tiles[tIdx];
    };

    beforeEach(() => {
        page = new DungeonPage({});
        superboard = createEmptySuperboard();
        page.state = {
            inSuperboard: true,
            superboardType: 'pocket_dimension',
            dungeon: {
                superboards: {
                    pocket_dimension: superboard
                }
            },
            superboardEntities: {},
            superboardViewMinX: 15,
            superboardViewMinY: 15,
            tileSize: 48,
            superboardPlayerPos: { gx: 30, gy: 30 },
            selectedCrewMember: null,
            activeMeleeSwing: null
        };
        page.props = {
            boardManager: {
                refreshTiles: jest.fn(),
                tiles: []
            },
            crewManager: {
                crew: [{ id: 'c1', name: 'Explorer', hp: 50, stats: { atk: 10 } }]
            }
        };
        page.setState = jest.fn((patch, cb) => {
            page.state = { ...page.state, ...patch };
            if (cb) cb();
        });
        page.forceUpdate = jest.fn();
        page.displayMessage = jest.fn();
        page.ensurePocketPygmiesAndStructures = jest.fn();
        page.migrateTilesToEntityRegistry = jest.fn();
        page.tickPocketDomainMonoliths = jest.fn();
        page.updateSuperboardViewport = jest.fn();
        page.movePocketPygmyUnit = jest.fn();
        page.animatePocketPygmyBump = jest.fn();
        page.autoSelectNextLivingCrewMemberInPocket = jest.fn();
        page.damagePlayerCrew = jest.fn();
    });

    describe('isNonMilitaryBuilding Helper', () => {
        test('correctly identifies non-military buildings and generators', () => {
            expect(page.isNonMilitaryBuilding({ subtype: 'farm' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'pocket_farm' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'observation_platform' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'observer_platform' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'sawmill' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'ore_mine' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'slate_mine' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'cultivation_vat' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'dust_collector' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'fungal_nursery' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'domain_monolith' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'domain_node' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ subtype: 'shrine' })).toBe(true);
            expect(page.isNonMilitaryBuilding({ generatorData: { key: 'lumber' } })).toBe(true);
            expect(page.isNonMilitaryBuilding({ building: 'larder' })).toBe(true);
        });

        test('allows military buildings as combat targets (returns false)', () => {
            expect(page.isNonMilitaryBuilding({ subtype: 'outpost' })).toBe(false);
            expect(page.isNonMilitaryBuilding({ subtype: 'wall' })).toBe(false);
            expect(page.isNonMilitaryBuilding({ subtype: 'earthen_fort' })).toBe(false);
            expect(page.isNonMilitaryBuilding({ subtype: 'war_camp' })).toBe(false);
            expect(page.isNonMilitaryBuilding({ subtype: 'war_fort' })).toBe(false);
            expect(page.isNonMilitaryBuilding({ subtype: 'keep' })).toBe(false);
            expect(page.isNonMilitaryBuilding({ subtype: 'infernal_tower' })).toBe(false);
        });

        test('allows mobile combat units as combat targets (returns false)', () => {
            expect(page.isNonMilitaryBuilding({ subtype: 'pocket_pygmy', isPygmy: true })).toBe(false);
            expect(page.isNonMilitaryBuilding({ subtype: 'automaton', isAutomaton: true })).toBe(false);
            expect(page.isNonMilitaryBuilding({ type: 'monster', hp: 20 })).toBe(false);
        });
    });

    describe('Wizard Magic Missile Autofire Filtering', () => {
        test('Wizard does NOT fire magic missiles at hostile non-military buildings', async () => {
            page.state.selectedCrewMember = { type: 'wizard', name: 'Zildjikan', stats: { atk: 12 } };
            page._lastWizardMagicMissileTime = 0;
            page.projectileCanvasRef = { current: { fireProjectileCoords: jest.fn() } };

            // Hostile farmhouse adjacent to player
            placeTileAt(superboard, 31, 30, {
                isHostile: true,
                affiliation: 'hostile',
                contains: {
                    type: 'building',
                    subtype: 'farm',
                    affiliation: 'hostile',
                    isHostile: true,
                    hp: 40
                }
            });

            // Hostile observation platform nearby (2 tiles away)
            placeTileAt(superboard, 32, 30, {
                isHostile: true,
                affiliation: 'hostile',
                contains: {
                    type: 'building',
                    subtype: 'observation_platform',
                    affiliation: 'hostile',
                    isHostile: true,
                    hp: 40
                }
            });

            await page.tickPocketPygmies();

            // Wizard should NOT fire at non-military buildings
            expect(page.projectileCanvasRef.current.fireProjectileCoords).not.toHaveBeenCalled();
            expect(page._lastWizardMagicMissileTime).toBe(0);
        });

        test('Wizard DOES fire magic missiles at hostile units and military structures', async () => {
            page.state.selectedCrewMember = { type: 'wizard', name: 'Zildjikan', stats: { atk: 12 } };
            page._lastWizardMagicMissileTime = 0;
            page.projectileCanvasRef = { current: { fireProjectileCoords: jest.fn() } };

            // Hostile enemy pygmy at (31, 31)
            page.state.superboardEntities = {
                enemy_pygmy: {
                    id: 'enemy_pygmy',
                    gx: 31,
                    gy: 31,
                    hp: 15,
                    maxHp: 15,
                    isHostile: true,
                    subtype: 'pocket_pygmy'
                }
            };

            await page.tickPocketPygmies();

            expect(page._lastWizardMagicMissileTime).toBeGreaterThan(0);
        });
    });

    describe('Barbarian Melee Autofire', () => {
        test('Barbarian swings weapon at adjacent hostile unit', async () => {
            page.state.selectedCrewMember = { type: 'barbarian', name: 'Ulaf', stats: { strength: 14, atk: 12 } };
            page._lastMeleeSwingTime = 0;

            const enemyUnit = {
                id: 'enemy_unit_1',
                gx: 31,
                gy: 30, // adjacent (1 tile to the right)
                hp: 20,
                maxHp: 20,
                isHostile: true,
                subtype: 'automaton',
                isAutomaton: true
            };
            page.state.superboardEntities = { enemy_unit_1: enemyUnit };

            await page.tickPocketPygmies();

            expect(page._lastMeleeSwingTime).toBeGreaterThan(0);
            expect(enemyUnit.hp).toBeLessThan(20);
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining('Barbarian swung a crushing cleave at')
            );
            expect(page.state.activeMeleeSwing).not.toBeNull();
            expect(page.state.activeMeleeSwing.isBarbarian).toBe(true);
            expect(page.state.activeMeleeSwing.gx).toBe(31);
            expect(page.state.activeMeleeSwing.gy).toBe(30);
        });

        test('Barbarian does NOT swing when hostile unit is out of range (> 1.5 tiles)', async () => {
            page.state.selectedCrewMember = { type: 'barbarian', name: 'Ulaf', stats: { strength: 14 } };
            page._lastMeleeSwingTime = 0;

            const enemyUnit = {
                id: 'enemy_unit_2',
                gx: 32, // 2 tiles away (distance = 2.0 > 1.5)
                gy: 30,
                hp: 20,
                isHostile: true,
                subtype: 'automaton'
            };
            page.state.superboardEntities = { enemy_unit_2: enemyUnit };

            await page.tickPocketPygmies();

            expect(page._lastMeleeSwingTime).toBe(0);
            expect(enemyUnit.hp).toBe(20);
            expect(page.displayMessage).not.toHaveBeenCalled();
            expect(page.state.activeMeleeSwing).toBeNull();
        });

        test('Barbarian does NOT attack adjacent non-military building (farm / observation platform)', async () => {
            page.state.selectedCrewMember = { type: 'barbarian', name: 'Ulaf', stats: { strength: 14 } };
            page._lastMeleeSwingTime = 0;

            // Hostile farmhouse on adjacent tile (30, 31)
            const farmTile = placeTileAt(superboard, 30, 31, {
                isHostile: true,
                affiliation: 'hostile',
                contains: {
                    type: 'building',
                    subtype: 'farm',
                    affiliation: 'hostile',
                    isHostile: true,
                    hp: 40
                }
            });

            await page.tickPocketPygmies();

            expect(page._lastMeleeSwingTime).toBe(0);
            expect(farmTile.contains.hp).toBe(40);
            expect(page.state.activeMeleeSwing).toBeNull();
        });

        test('Barbarian DOES attack adjacent hostile military building (e.g. outpost or wall)', async () => {
            page.state.selectedCrewMember = { type: 'barbarian', name: 'Ulaf', stats: { strength: 14 } };
            page._lastMeleeSwingTime = 0;

            // Hostile outpost on adjacent tile (31, 30)
            const outpostTile = placeTileAt(superboard, 31, 30, {
                isHostile: true,
                affiliation: 'hostile',
                contains: {
                    type: 'building',
                    subtype: 'outpost',
                    affiliation: 'hostile',
                    isHostile: true,
                    hp: 40
                }
            });

            await page.tickPocketPygmies();

            expect(page._lastMeleeSwingTime).toBeGreaterThan(0);
            expect(outpostTile.contains.hp).toBeLessThan(40);
            expect(page.state.activeMeleeSwing).not.toBeNull();
        });
    });

    describe('Soldier Melee Autofire', () => {
        test('Soldier swings weapon at adjacent hostile pygmy', async () => {
            page.state.selectedCrewMember = { type: 'soldier', name: 'Sardonis', stats: { strength: 10, atk: 10 } };
            page._lastMeleeSwingTime = 0;

            const enemyUnit = {
                id: 'enemy_pygmy_1',
                gx: 29, // adjacent (1 tile left)
                gy: 30,
                hp: 10,
                maxHp: 10,
                isHostile: true,
                subtype: 'pocket_pygmy',
                isPygmy: true
            };
            page.state.superboardEntities = { enemy_pygmy_1: enemyUnit };

            await page.tickPocketPygmies();

            expect(page._lastMeleeSwingTime).toBeGreaterThan(0);
            expect(enemyUnit.hp).toBeLessThan(10);
            expect(page.displayMessage).toHaveBeenCalledWith(
                expect.stringContaining('Soldier executed a disciplined sword swing at')
            );
            expect(page.state.activeMeleeSwing).not.toBeNull();
            expect(page.state.activeMeleeSwing.isBarbarian).toBe(false);
            expect(page.state.activeMeleeSwing.dCol).toBe(-1);
        });

        test('Soldier respects 4-second melee cooldown', async () => {
            page.state.selectedCrewMember = { type: 'soldier', name: 'Sardonis', stats: { atk: 10 } };
            // Swing occurred 2 seconds ago
            page._lastMeleeSwingTime = Date.now() - 2000;

            const enemyUnit = {
                id: 'enemy_pygmy_2',
                gx: 30,
                gy: 31, // adjacent (1 tile down)
                hp: 10,
                isHostile: true,
                subtype: 'pocket_pygmy',
                lastAttackTime: Date.now()
            };
            page.state.superboardEntities = { enemy_pygmy_2: enemyUnit };

            await page.tickPocketPygmies();

            // HP should be untouched because cooldown has 2s remaining
            expect(enemyUnit.hp).toBe(10);
        });
    });

    describe('Range Ring Specification Check', () => {
        test('Barbarian and Soldier do NOT receive range rings', () => {
            const barbMember = { type: 'barbarian', name: 'Ulaf' };
            const soldierMember = { type: 'soldier', name: 'Sardonis' };

            expect(getCrewRangeRingSpecs(barbMember, '', true, 48)).toBeNull();
            expect(getCrewRangeRingSpecs(soldierMember, '', true, 48)).toBeNull();
        });

        test('Wizard and Ranger DO receive range rings', () => {
            const wizMember = { type: 'wizard', name: 'Zildjikan' };
            const rangerMember = { type: 'ranger', name: 'Dormund' };

            const wizSpecs = getCrewRangeRingSpecs(wizMember, '', true, 48);
            expect(wizSpecs).not.toBeNull();
            expect(wizSpecs.isWizard).toBe(true);

            const rangerSpecs = getCrewRangeRingSpecs(rangerMember, '', true, 48);
            expect(rangerSpecs).not.toBeNull();
            expect(rangerSpecs.isRanger).toBe(true);
        });
    });
});
