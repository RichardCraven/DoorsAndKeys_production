jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));
jest.mock('@coreui/icons-react', () => {
  return function MockCIcon() {
    return <span data-testid="cicon" />;
  };
});
jest.mock('@coreui/react', () => ({
  CButton: 'CButton',
  CFormSelect: 'CFormSelect',
  CFormInput: 'CFormInput',
  CModal: ({ visible, children, className }) => visible ? (
    <div className={`modal ${className || ''}`} data-testid="cmodal">
      <div className="modal-dialog">
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  ) : null,
  CModalHeader: ({ children }) => <div>{children}</div>,
  CModalTitle: ({ children }) => <div>{children}</div>,
  CModalBody: ({ children }) => <div>{children}</div>,
  CModalFooter: ({ children }) => <div>{children}</div>
}));

import React from 'react';
import { render } from '@testing-library/react';
import Tile from '../../components/tile';
import DungeonPage from '../DungeonPage';

describe('Pocket Dimension Dwellings: POI Panel, Occupation Slots & Resident Pygmies', () => {
    describe('Dwelling Occupation Slot White Circle Badge', () => {
        const dwellingKeys = ['manor', 'estate', 'house', 'farm', 'town_1', 'town_2', 'town_3'];

        dwellingKeys.forEach(dKey => {
            test(`renders occupation slot white circle for completed ${dKey}`, () => {
                const { container } = render(
                    <Tile
                        id={1}
                        type="structure"
                        building={dKey}
                        contains={{ type: 'building', subtype: dKey }}
                    />
                );
                const indicator = container.querySelector('.dwelling-worker-indicator');
                expect(indicator).not.toBeNull();
                // When worker is outside, circle is hollow (transparent background)
                expect(indicator.style.backgroundColor).toBe('transparent');
            });

            test(`renders solid white indicator when worker is inside ${dKey}`, () => {
                const { container } = render(
                    <Tile
                        id={2}
                        type="structure"
                        building={dKey}
                        contains={{ type: 'building', subtype: dKey, workerPygmyInside: true }}
                    />
                );
                const indicator = container.querySelector('.dwelling-worker-indicator');
                expect(indicator).not.toBeNull();
                expect(indicator.style.backgroundColor).toBe('rgb(255, 255, 255)');
            });
        });

        test('renders occupation slot when building is placed with empty_space contains', () => {
            const { container } = render(
                <Tile
                    id={3}
                    type="board-tile"
                    building="manor"
                    contains={{ type: 'empty_space', subtype: null }}
                />
            );
            const indicator = container.querySelector('.dwelling-worker-indicator');
            expect(indicator).not.toBeNull();
        });

        test('renders occupation slot when image is a pocket dwelling image URL or key', () => {
            const { container } = render(
                <Tile
                    id={4}
                    type="board-tile"
                    image="pocket_town_1"
                    contains={{ type: 'empty_space', subtype: null }}
                />
            );
            const indicator = container.querySelector('.dwelling-worker-indicator');
            expect(indicator).not.toBeNull();
        });
    });

    describe('Points of Interest Panel in Pocket Dimensions', () => {
        let page;

        beforeEach(() => {
            page = new DungeonPage({});
            page.state = {
                ...page.state,
                poiPanelExpanded: true,
                inSuperboard: true,
                superboardType: 'emerald',
                superboardPlayerPos: { gx: 7, gy: 7 },
                superboardViewMinX: 0,
                superboardViewMinY: 0,
                superboardFogVisibility: new Array(225).fill(true),
                tiles: []
            };
        });

        test('detects and renders Manor dwelling in POI panel', () => {
            // Place manor at index 113 (adjacent to player at 112)
            const tiles = new Array(225).fill(null).map((_, i) => ({
                id: i,
                contains: { type: 'empty_space', subtype: null },
                color: 'rgba(15, 15, 20, 0.55)'
            }));

            tiles[113] = {
                id: 113,
                building: 'manor',
                contains: { type: 'empty_space', subtype: null },
                image: 'pocket_manor',
                color: 'rgba(15, 15, 20, 0.55)'
            };

            page.state.tiles = tiles;
            page.props = {
                boardManager: {
                    tiles,
                    playerTile: { location: [7, 7] },
                    getIndexFromCoordinates: (loc) => loc[0] * 15 + loc[1],
                    getCoordinatesFromIndex: (idx) => [15 + Math.floor(idx / 15), 15 + (idx % 15)]
                }
            };

            const poiSection = page.renderPoiSection();
            const { container } = render(poiSection);

            const card = container.querySelector('.poi-portrait-card');
            expect(card).not.toBeNull();
            const nameEl = container.querySelector('.poi-portrait-name');
            expect(nameEl.textContent).toBe('Manor');
        });

        test('detects Town, Estate, and Farm in POI panel with correct labels', () => {
            const tiles = new Array(225).fill(null).map((_, i) => ({
                id: i,
                contains: { type: 'empty_space', subtype: null },
                color: 'rgba(15, 15, 20, 0.55)'
            }));

            // Town 1 at (7, 8) -> idx 113
            tiles[113] = {
                id: 113,
                contains: { type: 'building', subtype: 'town_1' },
                image: 'pocket_town_1',
                color: 'rgba(15, 15, 20, 0.55)'
            };
            // Estate at (8, 7) -> idx 127
            tiles[127] = {
                id: 127,
                building: 'estate',
                contains: { type: 'building', subtype: 'estate' },
                image: 'pocket_estate',
                color: 'rgba(15, 15, 20, 0.55)'
            };

            page.state.tiles = tiles;
            page.props = {
                boardManager: {
                    tiles,
                    playerTile: { location: [7, 7] },
                    getIndexFromCoordinates: (loc) => loc[0] * 15 + loc[1],
                    getCoordinatesFromIndex: (idx) => [15 + Math.floor(idx / 15), 15 + (idx % 15)]
                }
            };

            const poiSection = page.renderPoiSection();
            const { container } = render(poiSection);

            const names = Array.from(container.querySelectorAll('.poi-portrait-name')).map(el => el.textContent);
            expect(names).toContain('Town 1');
            expect(names).toContain('Estate');
        });

        test('hides dwellings when concealed by superboard fog of war', () => {
            const tiles = new Array(225).fill(null).map((_, i) => ({
                id: i,
                contains: { type: 'empty_space', subtype: null },
                color: 'rgba(15, 15, 20, 0.55)'
            }));

            tiles[113] = {
                id: 113,
                building: 'manor',
                contains: { type: 'empty_space', subtype: null },
                image: 'pocket_manor',
                color: 'rgba(15, 15, 20, 0.55)'
            };

            const fog = new Array(225).fill(true);
            fog[113] = false; // Concealed in fog

            page.state.tiles = tiles;
            page.state.superboardFogVisibility = fog;
            page.props = {
                boardManager: {
                    tiles,
                    playerTile: { location: [7, 7] },
                    getIndexFromCoordinates: (loc) => loc[0] * 15 + loc[1],
                    getCoordinatesFromIndex: (idx) => [15 + Math.floor(idx / 15), 15 + (idx % 15)]
                }
            };

            const poiSection = page.renderPoiSection();
            const { container } = render(poiSection);

            const card = container.querySelector('.poi-portrait-card');
            expect(card).toBeNull();
            expect(container.textContent).toContain('Nothing notable nearby');
        });

        test('filters non-anchor cells on multi-tile buildings to prevent duplicates', () => {
            const tiles = new Array(225).fill(null).map((_, i) => ({
                id: i,
                contains: { type: 'empty_space', subtype: null },
                color: 'rgba(15, 15, 20, 0.55)'
            }));

            // 2x2 Keep at (7, 8)
            tiles[113] = {
                id: 113,
                contains: { type: 'building', subtype: 'keep', vendorCell: 'anchor' },
                image: 'pocket_keep',
                color: 'rgba(15, 15, 20, 0.55)'
            };
            tiles[114] = {
                id: 114,
                contains: { type: 'building', subtype: 'keep', vendorCell: 'top_right' },
                image: 'pocket_keep',
                color: 'rgba(15, 15, 20, 0.55)'
            };
            tiles[128] = {
                id: 128,
                contains: { type: 'building', subtype: 'keep', vendorCell: 'bottom_left' },
                image: 'pocket_keep',
                color: 'rgba(15, 15, 20, 0.55)'
            };
            tiles[129] = {
                id: 129,
                contains: { type: 'building', subtype: 'keep', vendorCell: 'bottom_right' },
                image: 'pocket_keep',
                color: 'rgba(15, 15, 20, 0.55)'
            };

            page.state.tiles = tiles;
            page.props = {
                boardManager: {
                    tiles,
                    playerTile: { location: [7, 7] },
                    getIndexFromCoordinates: (loc) => loc[0] * 15 + loc[1],
                    getCoordinatesFromIndex: (idx) => [15 + Math.floor(idx / 15), 15 + (idx % 15)]
                }
            };

            const poiSection = page.renderPoiSection();
            const { container } = render(poiSection);

            const cards = container.querySelectorAll('.poi-portrait-card');
            // Exactly 1 card for Keep, not 4
            expect(cards.length).toBe(1);
            expect(container.querySelector('.poi-portrait-name').textContent).toBe('Keep');
        });
    });

    describe('Resident Worker Pygmy Spawning & Dwelling Hiding', () => {
        let page;
        let superboard;

        beforeEach(() => {
            page = new DungeonPage({});
            const miniboards = [];
            for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
                const tiles = [];
                for (let tIdx = 0; tIdx < 225; tIdx++) {
                    tiles.push({
                        type: 'board-tile',
                        id: tIdx,
                        contains: { type: 'empty_space', subtype: null },
                        color: 'rgba(15, 15, 20, 0.55)'
                    });
                }
                miniboards.push({ id: mbIdx, name: `mb_${mbIdx}`, tiles });
            }
            superboard = { miniboards, floorTexture: 'ground_grey' };
            page.state = {
                ...page.state,
                inSuperboard: true,
                superboardType: 'emerald',
                dungeon: { superboards: { emerald: superboard } },
                superboardPlayerPos: { gx: 7, gy: 7 },
                superboardEntities: {}
            };
        });

        test('spawns 1 resident worker pygmy for town_1 dwelling', () => {
            const mb = superboard.miniboards[4];
            mb.tiles[113] = {
                type: 'board-tile',
                id: 113,
                building: 'town_1',
                contains: { type: 'building', subtype: 'town_1' },
                image: 'pocket_town_1',
                color: 'rgba(15, 15, 20, 0.55)'
            };

            const entities = {};
            const mbX = 4 % 3;
            const mbY = Math.floor(4 / 3);
            const anchorGx = mbX * 15 + (113 % 15);
            const anchorGy = mbY * 15 + Math.floor(113 / 15);
            const dStructKey = `4_113_town_1`;

            const spawnCoord = page.findAdjacentSuperboardEmptyTile(superboard, anchorGx, anchorGy, false) || { mbIdx: 4, tIdx: 113, gx: anchorGx, gy: anchorGy };
            const workerId = `worker_pygmy_4_113`;
            entities[workerId] = {
                id: workerId,
                type: 'pygmies',
                subtype: 'worker_pygmy',
                isWorkerPygmy: true,
                homeStructureKey: dStructKey,
                homeGx: anchorGx,
                homeGy: anchorGy,
                gx: spawnCoord.gx,
                gy: spawnCoord.gy,
                mbIdx: spawnCoord.mbIdx,
                tIdx: spawnCoord.tIdx
            };

            expect(entities[workerId]).toBeDefined();
            expect(entities[workerId].homeGx).toBe(anchorGx);
            expect(entities[workerId].homeGy).toBe(anchorGy);
        });
    });
});
