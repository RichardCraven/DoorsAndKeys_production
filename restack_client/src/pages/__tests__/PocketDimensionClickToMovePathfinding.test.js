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

import { BoardManager } from '../../utils/board-manager';
import DungeonPage from '../DungeonPage';

describe('Pocket Dimension Click-To-Move Pathfinding Around Buildings', () => {
    let pageInstance;
    let bm;
    let superboard;

    beforeEach(() => {
        pageInstance = new DungeonPage({});
        bm = new BoardManager();
        pageInstance.props = { boardManager: bm };
        pageInstance.setState = (updater) => {
            const patch = typeof updater === 'function' ? updater(pageInstance.state) : updater;
            pageInstance.state = { ...pageInstance.state, ...patch };
        };
        pageInstance.displayMessage = jest.fn();
        pageInstance.openGeneratorModal = jest.fn();

        // 3x3 miniboards grid (45x45 superboard)
        const miniboards = [];
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const tiles = [];
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                tiles.push({
                    type: 'board-tile',
                    id: tIdx,
                    coordinates: [tIdx % 15, Math.floor(tIdx / 15)],
                    contains: { type: 'empty_space' },
                    color: 'rgba(15, 15, 20, 0.55)'
                });
            }
            miniboards.push({ id: mbIdx, tiles });
        }

        superboard = { miniboards };
        pageInstance.state = {
            inSuperboard: true,
            superboardType: 'pocket_plains',
            superboardPlayerPos: { gx: 5, gy: 5 },
            superboardViewMinX: 0,
            superboardViewMinY: 0,
            dungeon: {
                superboards: {
                    pocket_plains: superboard
                }
            }
        };
    });

    const setTileAt = (gx, gy, tileProps) => {
        const mbX = Math.floor(gx / 15);
        const mbY = Math.floor(gy / 15);
        const mbIdx = mbY * 3 + mbX;
        const lx = gx % 15;
        const ly = gy % 15;
        const tIdx = ly * 15 + lx;
        superboard.miniboards[mbIdx].tiles[tIdx] = {
            ...superboard.miniboards[mbIdx].tiles[tIdx],
            ...tileProps
        };
    };

    test('1. isSuperboardTilePassable accurately flags buildings, vendors, trees, and void as impassable', () => {
        // Normal ground
        expect(pageInstance.isSuperboardTilePassable(superboard, 5, 5)).toBe(true);

        // 1x1 Earthen Fort
        setTileAt(6, 5, { building: 'earthen_fort', contains: { type: 'building', subtype: 'earthen_fort' } });
        expect(pageInstance.isSuperboardTilePassable(superboard, 6, 5)).toBe(false);

        // 1x1 Outpost
        setTileAt(7, 5, { building: 'outpost', contains: { type: 'building', subtype: 'outpost' } });
        expect(pageInstance.isSuperboardTilePassable(superboard, 7, 5)).toBe(false);

        // 1x1 Wall
        setTileAt(8, 5, { building: 'wall', contains: { type: 'building', subtype: 'wall' } });
        expect(pageInstance.isSuperboardTilePassable(superboard, 8, 5)).toBe(false);

        // 1x1 Observer Platform
        setTileAt(9, 5, { building: 'observer_platform', contains: { type: 'building', subtype: 'observer_platform' } });
        expect(pageInstance.isSuperboardTilePassable(superboard, 9, 5)).toBe(false);

        // 2x2 Sawmill quadrants
        setTileAt(10, 5, { building: 'sawmill', contains: { type: 'building', subtype: 'sawmill', vendorCell: 'anchor', vendorGroupId: 'saw_1' } });
        setTileAt(11, 5, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'top_right', vendorGroupId: 'saw_1' } });
        setTileAt(10, 6, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'bottom_left', vendorGroupId: 'saw_1' } });
        setTileAt(11, 6, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'bottom_right', vendorGroupId: 'saw_1' } });
        expect(pageInstance.isSuperboardTilePassable(superboard, 10, 5)).toBe(false);
        expect(pageInstance.isSuperboardTilePassable(superboard, 11, 5)).toBe(false);
        expect(pageInstance.isSuperboardTilePassable(superboard, 10, 6)).toBe(false);
        expect(pageInstance.isSuperboardTilePassable(superboard, 11, 6)).toBe(false);

        // Tree
        setTileAt(12, 5, { image: 'tree_pine_01', contains: { type: 'tree' } });
        expect(pageInstance.isSuperboardTilePassable(superboard, 12, 5)).toBe(false);

        // Void
        setTileAt(13, 5, { contains: 'void', color: 'black' });
        expect(pageInstance.isSuperboardTilePassable(superboard, 13, 5)).toBe(false);

        // Hut is passable
        setTileAt(14, 5, { building: 'hut', contains: { type: 'building', subtype: 'hut' } });
        expect(pageInstance.isSuperboardTilePassable(superboard, 14, 5)).toBe(true);
    });

    test('2. bfsPathfindSuperboard routes cleanly around a building in the direct line of travel', () => {
        // Player at (5, 5). Target at (7, 5).
        // Obstacle (Earthen Fort) placed directly between them at (6, 5).
        setTileAt(6, 5, { building: 'earthen_fort', contains: { type: 'building', subtype: 'earthen_fort' } });

        const path = pageInstance.bfsPathfindSuperboard(superboard, 5, 5, new Set(['7,5']));
        expect(path).toBeDefined();
        expect(path.length).toBeGreaterThan(0);

        // Path must route around (6, 5), meaning neither the first step nor any step lands on (6, 5)
        let cx = 5;
        let cy = 5;
        const dirDeltas = {
            up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
            upleft: [-1, -1], upright: [1, -1], downleft: [-1, 1], downright: [1, 1]
        };
        for (const dir of path) {
            const [dx, dy] = dirDeltas[dir];
            cx += dx;
            cy += dy;
            expect(`${cx},${cy}`).not.toBe('6,5');
        }
        expect(cx).toBe(7);
        expect(cy).toBe(5);
    });

    test('3. bfsPathfindSuperboard forbids diagonal corner cutting through building edges', () => {
        // Player at (5, 5). Target at (6, 6).
        // If (6, 5) is a wall, player cannot cut the corner diagonally to (6, 6) in a single downright move
        setTileAt(6, 5, { building: 'wall', contains: { type: 'building', subtype: 'wall' } });

        const path = pageInstance.bfsPathfindSuperboard(superboard, 5, 5, new Set(['6,6']));
        expect(path).toBeDefined();
        // The first move cannot be 'downright' because (6, 5) is blocked
        expect(path[0]).not.toBe('downright');
    });

    test('4. handleClick on distant open ground pathfinds around a 2x2 building without opening generator modal', () => {
        // Player at (5, 5). Target open ground at (8, 5).
        // Place 2x2 Sawmill at (6, 4) to (7, 5)
        setTileAt(6, 4, { building: 'sawmill', contains: { type: 'building', subtype: 'sawmill', vendorCell: 'anchor', vendorGroupId: 'saw_1' } });
        setTileAt(7, 4, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'top_right', vendorGroupId: 'saw_1' } });
        setTileAt(6, 5, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'bottom_left', vendorGroupId: 'saw_1' } });
        setTileAt(7, 5, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'bottom_right', vendorGroupId: 'saw_1' } });

        const processSpy = jest.spyOn(pageInstance, 'processMovementQueue').mockImplementation(() => {});

        pageInstance.handleClick({ coordinates: [8, 5], globalX: 8, globalY: 5 });

        // Player queued movement around building
        expect(processSpy).toHaveBeenCalled();
        expect(pageInstance._movementQueue).toBeDefined();
        expect(pageInstance._movementQueue.length).toBeGreaterThan(0);
        // It should NOT have opened generator modal
        expect(pageInstance.openGeneratorModal).not.toHaveBeenCalled();
    });

    test('5. Colliding with impassable building during transit to open ground aborts movement queue without opening generator modal', () => {
        // Player has an active movement queue towards a ground destination (no end action)
        pageInstance._movementQueue = ['right', 'right'];
        pageInstance._superboardPathfindEndAction = null;
        pageInstance.state.superboardPlayerPos = { gx: 5, gy: 5 };

        // Tile (6, 5) is an earthen fort
        setTileAt(6, 5, { building: 'earthen_fort', contains: { type: 'building', subtype: 'earthen_fort' } });

        // movePlayerInSuperboard steps into (6, 5)
        pageInstance.movePlayerInSuperboard(1, 0);

        // Movement queue must be cleared and modal must NOT be opened
        expect(pageInstance._movementQueue).toEqual([]);
        expect(pageInstance.openGeneratorModal).not.toHaveBeenCalled();
    });

    test('6. Clicking directly on a building from non-adjacent tile pathfinds adjacent and sets triggerAction', () => {
        // Player at (2, 2). Click directly on Sawmill anchor at (5, 5).
        setTileAt(5, 5, { building: 'sawmill', contains: { type: 'building', subtype: 'sawmill', vendorCell: 'anchor', vendorGroupId: 'saw_1' } });
        setTileAt(6, 5, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'top_right', vendorGroupId: 'saw_1' } });
        setTileAt(5, 6, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'bottom_left', vendorGroupId: 'saw_1' } });
        setTileAt(6, 6, { building: 'sawmill', contains: { type: 'empty_space', vendorCell: 'bottom_right', vendorGroupId: 'saw_1' } });

        pageInstance.state.superboardPlayerPos = { gx: 2, gy: 2 };
        const processSpy = jest.spyOn(pageInstance, 'processMovementQueue').mockImplementation(() => {});

        pageInstance.handleClick({ coordinates: [5, 5], globalX: 5, globalY: 5 });

        // Pathfinds to adjacent tile, sets end action to triggerAction
        expect(processSpy).toHaveBeenCalled();
        expect(pageInstance._movementQueue).toBeDefined();
        expect(pageInstance._movementQueue.length).toBeGreaterThan(0);
        expect(typeof pageInstance._superboardPathfindEndAction).toBe('function');
    });

    test('7. Direct click on adjacent diagonal tile blocked by orthogonal corner obstacle does not jump directly across corner', () => {
        // Player at (5, 5). Click at (6, 6).
        // Orthogonal corner (6, 5) is a wall.
        setTileAt(6, 5, { building: 'wall', contains: { type: 'building', subtype: 'wall' } });

        const moveSpy = jest.spyOn(pageInstance, 'movePlayerInSuperboard');
        const processSpy = jest.spyOn(pageInstance, 'processMovementQueue').mockImplementation(() => {});

        pageInstance.handleClick({ coordinates: [6, 6], globalX: 6, globalY: 6 });

        // It should NOT call movePlayerInSuperboard(1, 1) directly because of corner blockage;
        // Instead it should route through bfsPathfindSuperboard
        expect(moveSpy).not.toHaveBeenCalledWith(1, 1);
        expect(processSpy).toHaveBeenCalled();
        expect(pageInstance._movementQueue).toBeDefined();
        expect(pageInstance._movementQueue.length).toBeGreaterThan(0);
    });

    test('8. Fractional start position in superboard finds microPath with exact tile reach', () => {
        // Player at (5.5, 5). Target at (8, 5).
        pageInstance.state.superboardPlayerPos = { gx: 5.5, gy: 5 };
        const microPath = pageInstance.findSuperboardMicroPath(superboard, 5.5, 5, new Set(['8,5']));

        expect(microPath).toBeDefined();
        // Distance is 8 - 5.5 = 2.5 tiles, which corresponds to exactly 5 micro-steps of 0.5
        expect(microPath.length).toBe(5);
        expect(microPath).toEqual(['right', 'right', 'right', 'right', 'right']);
    });

    test('9. Fractional position right next to building routes away from obstacle without colliding', () => {
        // Player at (5.5, 5). Tile (6, 5) is an impassable fort. Target is at (5, 8).
        pageInstance.state.superboardPlayerPos = { gx: 5.5, gy: 5 };
        setTileAt(6, 5, { building: 'earthen_fort', contains: { type: 'building', subtype: 'earthen_fort' } });

        const microPath = pageInstance.findSuperboardMicroPath(superboard, 5.5, 5, new Set(['5,8']));
        expect(microPath).toBeDefined();
        // The first micro-step must be 'left' back to (5, 5), NOT 'right' into the building at (6, 5)
        expect(microPath[0]).toBe('left');
    });

    test('10. movePlayerInSuperboard with fromQueue=true returns false on collision and suppresses generator modal even if queue is empty', () => {
        // Movement queue is empty (already shifted off by processMovementQueue)
        pageInstance._movementQueue = [];
        pageInstance._processingQueuedMove = true;
        pageInstance._superboardPathfindEndAction = null;
        pageInstance.state.superboardPlayerPos = { gx: 5, gy: 5 };

        // Tile (6, 5) is a cultivator vat (generator)
        setTileAt(6, 5, { building: 'cultivation_vat', contains: { type: 'building', subtype: 'cultivation_vat' } });

        const result = pageInstance.movePlayerInSuperboard(1, 0, { fromQueue: true });

        expect(result).toBe(false);
        expect(pageInstance.openGeneratorModal).not.toHaveBeenCalled();
    });

    test('11. handleDirectionalMove passes false didMove to resolveQueuedMovement and cancels pending end action on blocked move', () => {
        pageInstance.state.superboardPlayerPos = { gx: 5, gy: 5 };
        setTileAt(6, 5, { building: 'wall', contains: { type: 'building', subtype: 'wall' } });

        const endActionSpy = jest.fn();
        pageInstance._superboardPathfindEndAction = endActionSpy;
        pageInstance._movementQueue = [];

        const resolveSpy = jest.spyOn(pageInstance, 'resolveQueuedMovement');

        // Try to move right (dx: 0.5) into (6, 5) which is blocked
        // From 5 to 5.5 is passable, but let's place wall at (5, 5) -> right solid border
        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, borders: {} }));
        setTileAt(5, 5, { borders: { right: '3px solid #000' } });

        // Step directly into an out of bounds or wall
        pageInstance.handleDirectionalMove('right', { fromQueue: true });

        expect(resolveSpy).toHaveBeenCalled();
        expect(endActionSpy).not.toHaveBeenCalled();
    });

    test('12. Standard dungeon bfsPathfind rejects diagonal moves when intermediate orthogonal tile has an impassable building', () => {
        pageInstance.state.inSuperboard = false;
        bm.playerTile = { location: [15, 15] };

        // 15x15 board tiles
        bm.tiles = new Array(225).fill(null).map((_, i) => ({
            id: i,
            contains: { type: 'empty_space' },
            borders: {},
            image: null
        }));

        // (15, 16) is index 1, make it an impassable building
        bm.tiles[1] = {
            id: 1,
            building: 'sawmill',
            contains: { type: 'building', subtype: 'sawmill' }
        };

        const targetTile = {
            id: 16,
            coordinates: [16, 16],
            contains: { type: 'empty_space' }
        };

        const processSpy = jest.spyOn(pageInstance, 'processMovementQueue').mockImplementation(() => {});

        pageInstance.handleClick(targetTile);

        // Path cannot cut diagonally directly to (16, 16) via 'downright' because (15, 16) is a building.
        // It must route through (16, 15) first: ['down', 'right']
        if (pageInstance._movementQueue && pageInstance._movementQueue.length > 0) {
            expect(pageInstance._movementQueue[0]).not.toBe('downright');
        }
    });

    test('13. isSuperboardTilePassable returns false for friendly units (pygmies, walkers, friendly automatons) and true for dead/empty', () => {
        // Tile with friendly pygmy in superboardEntities
        pageInstance.state.superboardEntities = {
            pygmy_1: { id: 'pygmy_1', gx: 10, gy: 10, hp: 10, isAllied: true, isPocketPygmy: true, faction: 'player' }
        };
        expect(pageInstance.isSuperboardTilePassable(superboard, 10, 10)).toBe(false);

        // Dead friendly pygmy in superboardEntities (hp <= 0)
        pageInstance.state.superboardEntities.pygmy_1.hp = 0;
        expect(pageInstance.isSuperboardTilePassable(superboard, 10, 10)).toBe(true);

        // Friendly pygmy in tile.contains
        setTileAt(11, 11, {
            contains: { type: 'pygmies', subtype: 'pocket_pygmy', isAllied: true, hp: 10, affiliation: 'friendly' }
        });
        expect(pageInstance.isSuperboardTilePassable(superboard, 11, 11)).toBe(false);

        // Walker construct in tile.building
        setTileAt(12, 12, { building: 'walker', contains: { type: 'construct', subtype: 'walker', hp: 100 } });
        expect(pageInstance.isSuperboardTilePassable(superboard, 12, 12)).toBe(false);

        // Friendly automaton
        setTileAt(13, 13, {
            contains: { type: 'monsters', subtype: 'automaton', isAutomaton: true, isAllied: true, hp: 30, faction: 'player' }
        });
        expect(pageInstance.isSuperboardTilePassable(superboard, 13, 13)).toBe(false);
    });

    test('14. movePlayerInSuperboard treats friendly pygmies as impassable and never prompts attack or trades damage', () => {
        pageInstance.state.superboardPlayerPos = { gx: 5, gy: 5 };
        pageInstance.damagePlayerCrew = jest.fn();

        // Place a friendly pygmy at (6, 5)
        pageInstance.state.superboardEntities = {
            friendly_pygmy: {
                id: 'friendly_pygmy',
                gx: 6,
                gy: 5,
                hp: 10,
                maxHp: 10,
                isAllied: true,
                isPocketPygmy: true,
                faction: 'player',
                affiliation: 'friendly'
            }
        };

        // Try moving right into (6, 5)
        const moveResult = pageInstance.movePlayerInSuperboard(1, 0);

        // Movement must be blocked (return false)
        expect(moveResult).toBe(false);

        // Must NOT damage player crew (no trade damage)
        expect(pageInstance.damagePlayerCrew).not.toHaveBeenCalled();

        // Friendly pygmy must NOT have taken damage
        expect(pageInstance.state.superboardEntities.friendly_pygmy.hp).toBe(10);

        // Player must remain at (5, 5)
        expect(pageInstance.state.superboardPlayerPos).toEqual({ gx: 5, gy: 5 });

        // Also verify for friendly pygmy in tile.contains
        pageInstance.state.superboardEntities = {};
        setTileAt(6, 5, {
            contains: {
                type: 'pygmies',
                subtype: 'pocket_pygmy',
                isPocketPygmy: true,
                isAllied: true,
                hp: 10,
                affiliation: 'friendly'
            }
        });

        const moveResult2 = pageInstance.movePlayerInSuperboard(1, 0);
        expect(moveResult2).toBe(false);
        expect(pageInstance.damagePlayerCrew).not.toHaveBeenCalled();
    });

    test('15. bfsPathfindSuperboard routes around friendly pygmy obstacles', () => {
        // Player at (5, 5), target at (7, 5)
        // Friendly pygmy at (6, 5) blocking direct horizontal path
        pageInstance.state.superboardEntities = {
            friendly_pygmy: {
                id: 'friendly_pygmy',
                gx: 6,
                gy: 5,
                hp: 10,
                isAllied: true,
                isPocketPygmy: true,
                faction: 'player'
            }
        };

        const targetGoalSet = new Set(['7,5']);
        const path = pageInstance.bfsPathfindSuperboard(superboard, 5, 5, targetGoalSet);

        expect(path).not.toBeNull();
        // The path should not be ['right', 'right'] because (6, 5) is blocked
        expect(path).not.toEqual(['right', 'right']);
    });

    test('16. Hostile units (enemy automatons and hostile pygmies) still engage in combat when bumped', () => {
        pageInstance.state.superboardPlayerPos = { gx: 5, gy: 5 };
        pageInstance.damagePlayerCrew = jest.fn();

        // Place hostile automaton at (6, 5)
        setTileAt(6, 5, {
            contains: {
                type: 'monsters',
                subtype: 'automaton',
                isAutomaton: true,
                isAllied: false,
                hp: 30,
                faction: 'enemy',
                affiliation: 'hostile'
            }
        });

        bm.tiles = new Array(225).fill(null).map((_, i) => ({ id: i, borders: {} }));

        const moveResult = pageInstance.movePlayerInSuperboard(1, 0);

        // Hostile collision initiates combat (returns false to block walking through during combat)
        expect(moveResult).toBe(false);

        // Automaton took combat damage from player
        const tileTarget = superboard.miniboards[0].tiles[5 * 15 + 6];
        expect(tileTarget.contains.hp).toBeLessThan(30);

        // Player took counter-damage from hostile automaton
        expect(pageInstance.damagePlayerCrew).toHaveBeenCalled();
    });

    describe('Pocket Dimension Zoom In / Zoom Out Feature', () => {
        test('17. Initial state defaults to pocketZoomIn = false', () => {
            const freshPage = new DungeonPage({});
            expect(freshPage.state.pocketZoomIn).toBe(false);
        });

        test('18. togglePocketZoom() flips state and announces zoom level', () => {
            pageInstance.state.pocketZoomIn = false;
            pageInstance.togglePocketZoom();
            expect(pageInstance.state.pocketZoomIn).toBe(true);
            expect(pageInstance.displayMessage).toHaveBeenCalledWith('🔍 Camera: Zoomed In (1.5x)');

            pageInstance.togglePocketZoom();
            expect(pageInstance.state.pocketZoomIn).toBe(false);
            expect(pageInstance.displayMessage).toHaveBeenCalledWith('🔍 Camera: Zoomed Out (1.0x)');
        });

        test('19. togglePocketZoom(forceState) respects explicit boolean force argument', () => {
            pageInstance.state.pocketZoomIn = false;
            pageInstance.togglePocketZoom(true);
            expect(pageInstance.state.pocketZoomIn).toBe(true);

            // Forcing true again should remain true without toggling back
            pageInstance.togglePocketZoom(true);
            expect(pageInstance.state.pocketZoomIn).toBe(true);

            pageInstance.togglePocketZoom(false);
            expect(pageInstance.state.pocketZoomIn).toBe(false);
        });

        test('20. getPocketZoomTransform() returns "none" when zoomed out or not in superboard', () => {
            pageInstance.state.inSuperboard = true;
            pageInstance.state.pocketZoomIn = false;
            expect(pageInstance.getPocketZoomTransform()).toBe('none');

            pageInstance.state.inSuperboard = false;
            pageInstance.state.pocketZoomIn = true;
            expect(pageInstance.getPocketZoomTransform()).toBe('none');
        });

        test('21. getPocketZoomTransform() calculates scale(1.5) and clamps within board boundaries', () => {
            pageInstance.state.inSuperboard = true;
            pageInstance.state.pocketZoomIn = true;
            pageInstance.state.boardSize = 600;
            pageInstance.state.tileSize = 40; // 15 * 40 = 600
            pageInstance.state.superboardViewMinX = 0;
            pageInstance.state.superboardViewMinY = 0;

            // At top-left corner (0, 0), clamp should keep camera at (0, 0)
            pageInstance.state.superboardPlayerPos = { gx: 0, gy: 0 };
            let transform = pageInstance.getPocketZoomTransform();
            expect(transform).toContain('scale(1.5)');
            expect(transform).toContain('translate3d(0.0px, 0.0px, 0px)');

            // At bottom-right corner (14, 14), clamp should stop at boardSize * (1 - 1.5) = -300px
            pageInstance.state.superboardPlayerPos = { gx: 14, gy: 14 };
            transform = pageInstance.getPocketZoomTransform();
            expect(transform).toContain('scale(1.5)');
            expect(transform).toContain('translate3d(-300.0px, -300.0px, 0px)');

            // At center (7, 7), camera should be centered around the middle
            pageInstance.state.superboardPlayerPos = { gx: 7, gy: 7 };
            transform = pageInstance.getPocketZoomTransform();
            expect(transform).toContain('scale(1.5)');
            // local center: (7 + 0.5) * 40 = 300. target: 300 - 300 * 1.5 = -150px
            expect(transform).toContain('translate3d(-150.0px, -150.0px, 0px)');
        });

        test('22. getPocketZoomTransform() centers on automaton unit during automatonVision', () => {
            pageInstance.state.inSuperboard = true;
            pageInstance.state.pocketZoomIn = true;
            pageInstance.state.boardSize = 600;
            pageInstance.state.tileSize = 40;
            pageInstance.state.superboardViewMinX = 0;
            pageInstance.state.superboardViewMinY = 0;
            pageInstance.state.superboardPlayerPos = { gx: 0, gy: 0 };

            pageInstance.state.automatonVision = true;
            pageInstance.state.automatonUnit = { gx: 7, gy: 7 };

            const transform = pageInstance.getPocketZoomTransform();
            expect(transform).toContain('translate3d(-150.0px, -150.0px, 0px)');
        });

        test('23. exitSuperboardPocketDimension resets pocketZoomIn to false', () => {
            pageInstance.state.pocketZoomIn = true;
            pageInstance.props.saveDungeon = jest.fn();
            pageInstance.props.savePlayerStats = jest.fn();
            pageInstance.buildDungeonBoard = jest.fn();

            pageInstance.exitSuperboardPocketDimension();
            expect(pageInstance.state.pocketZoomIn).toBe(false);
        });

        test('24. "Z" key in keyDownHandler toggles pocket zoom when in superboard', () => {
            pageInstance.state.inSuperboard = true;
            pageInstance.state.pocketZoomIn = false;

            const preventDefault = jest.fn();
            const stopPropagation = jest.fn();

            // Simulate pressing 'z'
            pageInstance.keyDownHandler({
                key: 'z',
                preventDefault,
                stopPropagation,
                target: { tagName: 'BODY' }
            });

            expect(pageInstance.state.pocketZoomIn).toBe(true);
            expect(preventDefault).toHaveBeenCalled();

            // Pressing 'Z' (uppercase with shift or capslock) should toggle back
            pageInstance.keyDownHandler({
                key: 'Z',
                preventDefault,
                stopPropagation,
                target: { tagName: 'BODY' }
            });

            expect(pageInstance.state.pocketZoomIn).toBe(false);
        });

        test('25. "Z" key is ignored when typing in input or when a modal is open', () => {
            pageInstance.state.inSuperboard = true;
            pageInstance.state.pocketZoomIn = false;

            // Inside input
            pageInstance.keyDownHandler({
                key: 'z',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                target: { tagName: 'INPUT' }
            });
            expect(pageInstance.state.pocketZoomIn).toBe(false);

            // Modal active
            pageInstance.state.showItemDetailModal = true;
            pageInstance.keyDownHandler({
                key: 'z',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                target: { tagName: 'BODY' }
            });
            expect(pageInstance.state.pocketZoomIn).toBe(false);
        });
    });
});
