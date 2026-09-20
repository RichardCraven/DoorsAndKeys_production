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
import Tile, { propsAreEqual } from '../../components/tile';
import DungeonPage from '../DungeonPage';
import { storeMeta } from '../../utils/session-handler';

describe('Pocket Dimension Destination Reticle', () => {
    let pageInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        try {
            storeMeta({});
        } catch (e) { }

        const mockMiniboards = Array.from({ length: 9 }, (_, mbIdx) => ({
            id: mbIdx,
            tiles: Array.from({ length: 225 }, (_, tIdx) => ({
                id: tIdx,
                type: 'empty_space',
                contains: { type: 'empty_space' }
            }))
        }));

        pageInstance = new DungeonPage({
            boardManager: {
                dungeon: {
                    superboards: {
                        pocket_plains: {
                            miniboards: mockMiniboards
                        }
                    }
                }
            }
        });
        pageInstance._isMounted = true;
        pageInstance.state = {
            inSuperboard: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 10, gy: 10 },
            superboardViewMinX: 0,
            superboardViewMinY: 0,
            pocketDestinationReticles: [],
            dungeon: {
                superboards: {
                    pocket_plains: {
                        miniboards: mockMiniboards
                    }
                }
            }
        };
        pageInstance.setState = jest.fn((patch, cb) => {
            const nextPatch = typeof patch === 'function' ? patch(pageInstance.state) : patch;
            pageInstance.state = { ...pageInstance.state, ...nextPatch };
            if (typeof cb === 'function') cb();
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('Tile component renders faint white corner brackets when destinationReticle is passed', () => {
        const { container, rerender } = render(
            <Tile
                id={0}
                tileSize={48}
                inSuperboard={true}
                destinationReticle={{ id: 'reticle_1', gx: 5, gy: 5, fading: false }}
            />
        );

        const reticleEl = container.querySelector('.pocket-destination-reticle');
        expect(reticleEl).toBeInTheDocument();
        expect(reticleEl).not.toHaveClass('fading-out');

        // Verify the 4 distinct corners ("just the corners of the square" instead of fully connected edges)
        const topLeft = container.querySelector('.reticle-corner.top-left');
        const topRight = container.querySelector('.reticle-corner.top-right');
        const bottomLeft = container.querySelector('.reticle-corner.bottom-left');
        const bottomRight = container.querySelector('.reticle-corner.bottom-right');

        expect(topLeft).toBeInTheDocument();
        expect(topRight).toBeInTheDocument();
        expect(bottomLeft).toBeInTheDocument();
        expect(bottomRight).toBeInTheDocument();

        // Rerender with fading: true
        rerender(
            <Tile
                id={0}
                tileSize={48}
                inSuperboard={true}
                destinationReticle={{ id: 'reticle_1', gx: 5, gy: 5, fading: true }}
            />
        );

        expect(container.querySelector('.pocket-destination-reticle')).toHaveClass('fading-out');
    });

    test('propsAreEqual returns false when destinationReticle changes to ensure Tile re-renders', () => {
        const baseProps = {
            id: 0,
            type: 'board-tile',
            inSuperboard: true,
            destinationReticle: null
        };

        const reticleActive = {
            ...baseProps,
            destinationReticle: { id: 'r1', gx: 5, gy: 5, fading: false }
        };

        const reticleFading = {
            ...baseProps,
            destinationReticle: { id: 'r1', gx: 5, gy: 5, fading: true }
        };

        const reticleMoved = {
            ...baseProps,
            destinationReticle: { id: 'r2', gx: 6, gy: 6, fading: false }
        };

        expect(propsAreEqual(baseProps, reticleActive)).toBe(false);
        expect(propsAreEqual(reticleActive, reticleFading)).toBe(false);
        expect(propsAreEqual(reticleActive, reticleMoved)).toBe(false);
        expect(propsAreEqual(reticleActive, { ...reticleActive })).toBe(true);
    });

    test('setPocketDestinationReticle creates active reticle at coordinates', () => {
        pageInstance.setPocketDestinationReticle(15, 20);

        expect(pageInstance.state.pocketDestinationReticles.length).toBe(1);
        const reticle = pageInstance.state.pocketDestinationReticles[0];
        expect(reticle.gx).toBe(15);
        expect(reticle.gy).toBe(20);
        expect(reticle.fading).toBe(false);
    });

    test('clicking a different destination marks old reticle as fading and sets new one active', () => {
        pageInstance.setPocketDestinationReticle(15, 20);
        expect(pageInstance.state.pocketDestinationReticles.length).toBe(1);
        expect(pageInstance.state.pocketDestinationReticles[0].fading).toBe(false);

        // Click new tile (18, 22)
        pageInstance.setPocketDestinationReticle(18, 22);

        // Both should exist momentarily during transition
        expect(pageInstance.state.pocketDestinationReticles.length).toBe(2);
        const oldReticle = pageInstance.state.pocketDestinationReticles.find(r => r.gx === 15 && r.gy === 20);
        const newReticle = pageInstance.state.pocketDestinationReticles.find(r => r.gx === 18 && r.gy === 22);

        expect(oldReticle.fading).toBe(true);
        expect(newReticle.fading).toBe(false);

        // After 350ms fade animation duration, old reticle is cleaned up
        jest.advanceTimersByTime(400);
        expect(pageInstance.state.pocketDestinationReticles.length).toBe(1);
        expect(pageInstance.state.pocketDestinationReticles[0].gx).toBe(18);
        expect(pageInstance.state.pocketDestinationReticles[0].gy).toBe(22);
    });

    test('updatePocketDestinationReticleOnMove initiates fade-out when avatar walks over destination tile', () => {
        // Destination set at (12, 10)
        pageInstance.setPocketDestinationReticle(12, 10);
        expect(pageInstance.state.pocketDestinationReticles[0].fading).toBe(false);

        // Avatar is at (10, 10) - distance is 2.0 -> should stay active
        pageInstance.updatePocketDestinationReticleOnMove(10, 10);
        expect(pageInstance.state.pocketDestinationReticles[0].fading).toBe(false);

        // Avatar moves to (11, 10) - distance is 1.0 -> still active before walking over it
        pageInstance.updatePocketDestinationReticleOnMove(11, 10);
        expect(pageInstance.state.pocketDestinationReticles[0].fading).toBe(false);

        // Avatar steps onto (12, 10) - walks over destination tile -> starts fading
        pageInstance.updatePocketDestinationReticleOnMove(12, 10);
        expect(pageInstance.state.pocketDestinationReticles[0].fading).toBe(true);

        // After fade duration, cleaned up completely
        jest.advanceTimersByTime(400);
        expect(pageInstance.state.pocketDestinationReticles.length).toBe(0);
    });

    test('fadeAllPocketDestinationReticles fades out all active reticles', () => {
        pageInstance.setPocketDestinationReticle(14, 14);
        expect(pageInstance.state.pocketDestinationReticles[0].fading).toBe(false);

        pageInstance.fadeAllPocketDestinationReticles();
        expect(pageInstance.state.pocketDestinationReticles[0].fading).toBe(true);

        jest.advanceTimersByTime(400);
        expect(pageInstance.state.pocketDestinationReticles.length).toBe(0);
    });

    test('clearPocketDestinationReticles immediately empties reticles and cancels timers', () => {
        pageInstance.setPocketDestinationReticle(14, 14);
        expect(pageInstance.state.pocketDestinationReticles.length).toBe(1);

        pageInstance.clearPocketDestinationReticles();
        expect(pageInstance.state.pocketDestinationReticles.length).toBe(0);
    });

    describe('Arrow-key destination reticle support', () => {
        test('pressing up once creates active destination reticle at the tile adjacent to avatar', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 };
            pageInstance.handleDirectionalMove('up', { fromQueue: false });

            const reticles = pageInstance.state.pocketDestinationReticles;
            expect(reticles.length).toBe(1);
            expect(reticles[0].gx).toBe(10);
            expect(reticles[0].gy).toBe(9);
            expect(reticles[0].fading).toBe(false);
            expect(pageInstance._movementQueue.length).toBeGreaterThan(0);
        });

        test('pressing up rapidly 3 times pushes destination reticle 3 tiles farther out before avatar reaches it', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 };

            // Press 1: reticle at (10, 9)
            pageInstance.handleDirectionalMove('up', { fromQueue: false });
            let activeReticle = pageInstance.state.pocketDestinationReticles.find(r => !r.fading);
            expect(activeReticle.gx).toBe(10);
            expect(activeReticle.gy).toBe(9);

            // Press 2 rapidly: reticle advances to (10, 8)
            pageInstance.handleDirectionalMove('up', { fromQueue: false });
            activeReticle = pageInstance.state.pocketDestinationReticles.find(r => !r.fading);
            expect(activeReticle.gx).toBe(10);
            expect(activeReticle.gy).toBe(8);

            // Press 3 rapidly: reticle advances to (10, 7)
            pageInstance.handleDirectionalMove('up', { fromQueue: false });
            activeReticle = pageInstance.state.pocketDestinationReticles.find(r => !r.fading);
            expect(activeReticle.gx).toBe(10);
            expect(activeReticle.gy).toBe(7);

            // Verify queue is directed towards (10, 7)
            expect(pageInstance._movementQueue.length).toBeGreaterThanOrEqual(4);
        });

        test('pressing opposite direction reverses and targets adjacent in the new direction', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 };

            // Moving up, reticle at (10, 8)
            pageInstance.handleDirectionalMove('up', { fromQueue: false });
            pageInstance.handleDirectionalMove('up', { fromQueue: false });
            let activeReticle = pageInstance.state.pocketDestinationReticles.find(r => !r.fading);
            expect(activeReticle.gy).toBe(8);

            // Press Down: reverses and targets (10, 11)
            pageInstance.handleDirectionalMove('down', { fromQueue: false });
            activeReticle = pageInstance.state.pocketDestinationReticles.find(r => !r.fading);
            expect(activeReticle.gx).toBe(10);
            expect(activeReticle.gy).toBe(11);
        });

        test('keyDownHandler preserves movement queue in superboard and triggers directional move', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 };
            pageInstance.enqueueDirectionalMove = jest.fn((dir, opts) => {
                pageInstance.handleDirectionalMove(dir, opts);
            });

            const event = {
                key: 'ArrowUp',
                preventDefault: jest.fn(),
                shiftKey: false
            };
            pageInstance.keyDownHandler(event);

            expect(pageInstance.enqueueDirectionalMove).toHaveBeenCalledWith('up', expect.anything());
            const activeReticle = pageInstance.state.pocketDestinationReticles.find(r => !r.fading);
            expect(activeReticle).toBeDefined();
            expect(activeReticle.gx).toBe(10);
            expect(activeReticle.gy).toBe(9);
        });
    });

    describe('Spawn point enlargement and spinning', () => {
        test('spawn point tile is normal size and not spinning when avatar is not nearby', () => {
            const { container } = render(
                <Tile
                    id={0}
                    image="spawn_point"
                    isSpawnPoint={true}
                    isPlayerAdjacent={false}
                    isPlayerOnTile={false}
                />
            );
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.classList.contains('spawn-point-spinning')).toBe(false);
            expect(portrait.style.transform).not.toContain('scale(2');
        });

        test('spawn point tile enlarges to 2x scale and spins with center transformOrigin when avatar is adjacent', () => {
            const { container } = render(
                <Tile
                    id={0}
                    image="spawn_point"
                    isSpawnPoint={true}
                    isPlayerAdjacent={true}
                    isPlayerOnTile={false}
                />
            );
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.classList.contains('spawn-point-spinning')).toBe(true);
            expect(portrait.style.transform).toContain('scale(2');
            expect(portrait.style.transformOrigin).toBe('center center');
            expect(portrait.style.zIndex).toBe('35');

            const tileRoot = container.querySelector('.tile');
            expect(tileRoot.style.overflow).toBe('visible');
        });

        test('spawn point tile enlarges to 2x scale and spins when avatar is directly on top of tile', () => {
            const { container } = render(
                <Tile
                    id={0}
                    image="spawn_point"
                    isSpawnPoint={true}
                    isPlayerAdjacent={false}
                    isPlayerOnTile={true}
                />
            );
            const portrait = container.querySelector('.portrait');
            expect(portrait).not.toBeNull();
            expect(portrait.classList.contains('spawn-point-spinning')).toBe(true);
            expect(portrait.style.transform).toContain('scale(2');
            expect(portrait.style.transformOrigin).toBe('center center');
        });

        test('propsAreEqual triggers re-render when isSpawnPoint, isPlayerAdjacent, or isPlayerOnTile changes', () => {
            const baseProps = {
                id: 10,
                image: 'spawn_point',
                isSpawnPoint: true,
                isPlayerAdjacent: false,
                isPlayerOnTile: false
            };

            // Avatar moves adjacent -> must return false so it re-renders
            expect(propsAreEqual(baseProps, { ...baseProps, isPlayerAdjacent: true })).toBe(false);

            // Avatar moves on top -> must return false
            expect(propsAreEqual(baseProps, { ...baseProps, isPlayerOnTile: true })).toBe(false);

            // isSpawnPoint toggles -> must return false
            expect(propsAreEqual(baseProps, { ...baseProps, isSpawnPoint: false })).toBe(false);

            // Unchanged props -> must return true
            expect(propsAreEqual(baseProps, { ...baseProps })).toBe(true);
        });
    });

    describe('Moving into resource generator via arrow keys triggers interaction panel', () => {
        test('moving into an adjacent resource generator via arrow keys opens generator modal', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 8 };
            pageInstance.openGeneratorModal = jest.fn();

            // Set up sawmill resource generator at (10, 9) (adjacent DOWN)
            const mb = pageInstance.state.dungeon.superboards.pocket_plains.miniboards[0];
            const tIdx = 9 * 15 + 10;
            mb.tiles[tIdx] = {
                id: tIdx,
                globalX: 10,
                globalY: 9,
                contains: { type: 'building', subtype: 'sawmill', building: 'sawmill' },
                building: 'sawmill'
            };

            // Press DOWN towards the generator
            pageInstance.handleDirectionalMove('down', { fromQueue: false });

            // Verify generator modal was opened
            expect(pageInstance.openGeneratorModal).toHaveBeenCalled();
            const calledTile = pageInstance.openGeneratorModal.mock.calls[0][0];
            expect(calledTile.building).toBe('sawmill');

            // Verify player was blocked from walking onto the building
            expect(pageInstance.state.superboardPlayerPos.gx).toBe(10);
            expect(pageInstance.state.superboardPlayerPos.gy).toBe(8);
        });

        test('moving into an adjacent ore_mine via arrow keys clears queue and triggers interaction', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 };
            pageInstance.openGeneratorModal = jest.fn();

            // Set up ore_mine at (11, 10) (adjacent RIGHT)
            const mb = pageInstance.state.dungeon.superboards.pocket_plains.miniboards[0];
            const tIdx = 10 * 15 + 11;
            mb.tiles[tIdx] = {
                id: tIdx,
                globalX: 11,
                globalY: 10,
                contains: { type: 'building', subtype: 'ore_mine', building: 'ore_mine' },
                building: 'ore_mine'
            };

            // Set an active reticle prior to bumping
            pageInstance.setState({
                pocketDestinationReticles: [{ id: 'ret_1', gx: 11, gy: 10, fading: false }]
            });

            // Press RIGHT towards the generator
            pageInstance.handleDirectionalMove('right', { fromQueue: false });

            // Verify interaction triggered
            expect(pageInstance.openGeneratorModal).toHaveBeenCalled();
            expect(pageInstance.openGeneratorModal.mock.calls[0][0].building).toBe('ore_mine');

            // Verify movement queue is cleared
            expect(pageInstance._movementQueue.length).toBe(0);
        });

        test('moving into a passable tile still creates destination reticle without opening generator modal', () => {
            pageInstance.state.superboardPlayerPos = { gx: 10, gy: 10 };
            pageInstance.openGeneratorModal = jest.fn();

            // Tile at (10, 11) is empty grass
            const mb = pageInstance.state.dungeon.superboards.pocket_plains.miniboards[0];
            const tIdx = 11 * 15 + 10;
            mb.tiles[tIdx] = {
                id: tIdx,
                type: 'empty_space',
                contains: { type: 'empty_space' }
            };

            // Press DOWN towards grass
            pageInstance.handleDirectionalMove('down', { fromQueue: false });

            // Generator modal should NOT be called
            expect(pageInstance.openGeneratorModal).not.toHaveBeenCalled();

            // Destination reticle should be placed at (10, 11)
            const activeReticle = pageInstance.state.pocketDestinationReticles.find(r => !r.fading);
            expect(activeReticle).toBeDefined();
            expect(activeReticle.gx).toBe(10);
            expect(activeReticle.gy).toBe(11);
        });
    });
});

