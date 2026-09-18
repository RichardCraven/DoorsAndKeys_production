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
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tile from '../../components/tile';
import DungeonPage from '../DungeonPage';
import { storeMeta, getMeta } from '../../utils/session-handler';

describe('Pocket Dimension Sawmill Clean Initial State (No Red Bar)', () => {
    let pageInstance;

    beforeEach(() => {
        try {
            storeMeta({});
        } catch (e) { }

        pageInstance = new DungeonPage({
            boardManager: {
                dungeon: {
                    superboards: {
                        pocket_plains: {
                            miniboards: []
                        }
                    }
                }
            }
        });
        pageInstance.state = {
            inSuperboard: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 10, gy: 10 },
            superboardEntities: {},
            monolithActivationState: null,
            domainOvertakeState: null,
            dungeon: {
                superboards: {
                    pocket_plains: {
                        miniboards: []
                    }
                }
            }
        };
    });

    describe('Tile component: MonolithBottomProgressBar scoping', () => {
        test('1. Sawmill does NOT render MonolithBottomProgressBar even if monolithActivationProgress or convertingTarget is passed', () => {
            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={true}
                    building="sawmill"
                    contains={{ type: 'building', subtype: 'sawmill', vendorCell: 'anchor', vendorGroupId: 'saw_1' }}
                    vendorCell="anchor"
                    vendorGroupId="saw_1"
                    vendorAnchorId={20}
                    image="sawmill"
                    monolithActivationProgress={0.8}
                    convertingTarget={{ startTime: Date.now() - 5000, duration: 10000 }}
                />
            );

            // Verify no red bottom progress bar exists (MonolithBottomProgressBar uses 7px height and bottom positioning)
            const allDivs = container.querySelectorAll('div');
            const redBottomBar = Array.from(allDivs).find(el => {
                const style = el.getAttribute('style') || '';
                return (style.includes('bottom: calc(-100% - 12px)') || style.includes('bottom: -12px')) &&
                    (style.includes('#ef4444') || style.includes('#38bdf8') || style.includes('#c084fc'));
            });

            expect(redBottomBar).toBeUndefined();
        });

        test('2. Ore Mine does NOT render MonolithBottomProgressBar', () => {
            const { container } = render(
                <Tile
                    id={20}
                    index={20}
                    color="#6b6057"
                    inSuperboard={true}
                    building="ore_mine"
                    contains={{ type: 'building', subtype: 'ore_mine', vendorCell: 'anchor', vendorGroupId: 'ore_1' }}
                    vendorCell="anchor"
                    vendorGroupId="ore_1"
                    vendorAnchorId={20}
                    image="ore_mine"
                />
            );

            const allDivs = container.querySelectorAll('div');
            const bottomBar = Array.from(allDivs).find(el => {
                const style = el.getAttribute('style') || '';
                return style.includes('calc(-100% - 12px)') || style.includes('bottom: -12px');
            });

            expect(bottomBar).toBeUndefined();
        });

        test('3. Domain Monolith DOES render MonolithBottomProgressBar when activating or converting', () => {
            const { container } = render(
                <Tile
                    id={50}
                    index={50}
                    color="#6b6057"
                    inSuperboard={true}
                    building="domain_monolith"
                    contains={{ type: 'building', subtype: 'domain_monolith', vendorCell: 'anchor', vendorGroupId: 'mono_1' }}
                    vendorCell="anchor"
                    vendorGroupId="mono_1"
                    vendorAnchorId={50}
                    image="domain_monolith"
                    monolithActivationProgress={0.5}
                    convertingTarget={{ startTime: Date.now() - 5000, duration: 10000 }}
                />
            );

            const allDivs = container.querySelectorAll('div');
            const monolithBar = Array.from(allDivs).find(el => {
                const style = el.getAttribute('style') || '';
                return (style.includes('calc(-100% - 12px)') || style.includes('bottom: -12px')) &&
                    (style.includes('#ef4444') || style.includes('#38bdf8') || style.includes('#c084fc'));
            });

            expect(monolithBar).toBeDefined();
        });
    });

    describe('DungeonPage superboard sanitization and clean initial state', () => {
        test('4. sanitizeSuperboardTiles strips convertingTarget, convertingMonolith, and convertingOutpost', () => {
            const mockSb = {
                miniboards: [
                    {
                        id: 0,
                        tiles: [
                            {
                                id: 20,
                                building: 'sawmill',
                                convertingTarget: { startTime: Date.now(), duration: 10000 },
                                convertingMonolith: true,
                                convertingOutpost: true,
                                contains: {
                                    type: 'building',
                                    subtype: 'sawmill',
                                    convertingTarget: { startTime: Date.now(), duration: 10000 },
                                    convertingMonolith: true,
                                    convertingOutpost: true
                                }
                            }
                        ]
                    }
                ]
            };

            pageInstance.sanitizeSuperboardTiles(mockSb);
            const tile = mockSb.miniboards[0].tiles[0];

            expect(tile.convertingTarget).toBeUndefined();
            expect(tile.convertingMonolith).toBeUndefined();
            expect(tile.convertingOutpost).toBeUndefined();
            expect(tile.contains.convertingTarget).toBeUndefined();
            expect(tile.contains.convertingMonolith).toBeUndefined();
            expect(tile.contains.convertingOutpost).toBeUndefined();
        });

        test('5. clearOrphanAutomatonConversions purges expired conversions and conversions with no nearby automaton', () => {
            const now = Date.now();
            const mockSb = {
                miniboards: [
                    {
                        id: 0,
                        tiles: [
                            {
                                id: 20,
                                building: 'sawmill',
                                convertingTarget: { startTime: now - 15000, duration: 10000, anchorGx: 5, anchorGy: 5 },
                                contains: {
                                    type: 'building',
                                    subtype: 'sawmill',
                                    convertingTarget: { startTime: now - 15000, duration: 10000, anchorGx: 5, anchorGy: 5 }
                                }
                            }
                        ]
                    }
                ]
            };

            pageInstance.state.superboardEntities = {}; // No living automatons
            pageInstance.clearOrphanAutomatonConversions(mockSb);

            const tile = mockSb.miniboards[0].tiles[0];
            expect(tile.convertingTarget).toBeUndefined();
            expect(tile.contains.convertingTarget).toBeUndefined();
        });

        test('6. ensurePocketPygmiesAndStructures clears stale conversions on non-hostile structures', () => {
            const miniboards = [];
            for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
                const tiles = [];
                for (let tIdx = 0; tIdx < 225; tIdx++) {
                    tiles.push({
                        id: tIdx,
                        type: 'board-tile',
                        contains: { type: 'empty_space', subtype: null }
                    });
                }
                miniboards.push({ id: mbIdx, tiles });
            }

            // Place neutral sawmill at miniboard 0, tile 20 with stale convertingTarget
            miniboards[0].tiles[20] = {
                id: 20,
                building: 'sawmill',
                convertingTarget: { startTime: Date.now() - 5000, duration: 10000 },
                contains: {
                    type: 'building',
                    subtype: 'sawmill',
                    affiliation: 'neutral',
                    convertingTarget: { startTime: Date.now() - 5000, duration: 10000 }
                }
            };

            const superboard = { miniboards };
            pageInstance.ensurePocketPygmiesAndStructures(superboard, 'pocket_plains');

            const cleanedTile = superboard.miniboards[0].tiles[20];
            expect(cleanedTile.convertingTarget).toBeUndefined();
            expect(cleanedTile.contains.convertingTarget).toBeUndefined();
        });
    });
});
