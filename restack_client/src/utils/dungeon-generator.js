/**
 * dungeon-generator.js
 *
 * Procedural dungeon generation. Creates 15×15 boards with tight corridors,
 * chokepoints guarded by gates/monsters, and assembles them into multi-level
 * dungeons with vertical passages and portal networks.
 *
 * Algorithm: small-room placement → winding corridor carving → chokepoint
 * detection → content placement (gates, keys, monsters, treasure).
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

const BOARD_SIZE = 15;
const TILE_COUNT = BOARD_SIZE * BOARD_SIZE; // 225

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};
const coordToIdx = (col, row) => row * BOARD_SIZE + col;
const idxToCoord = (idx) => [idx % BOARD_SIZE, Math.floor(idx / BOARD_SIZE)];
const inBounds = (c, r) => c >= 0 && c < BOARD_SIZE && r >= 0 && r < BOARD_SIZE;
const inInterior = (c, r) => c >= 1 && c < BOARD_SIZE - 1 && r >= 1 && r < BOARD_SIZE - 1;

// Gate→Key pairings by tier
const GATE_KEY_TIERS = [
    { gate: 'minor_gate', key: 'minor_key' },
    { gate: 'major_gate', key: 'major_key' },
    { gate: 'treasury_gate', key: 'treasury_key' },
];

// ── Tile factories ────────────────────────────────────────────────────────────

function makeTile(id, col, row) {
    return {
        type: 'board-tile',
        id,
        color: 'black',
        showCoordinates: false,
        contains: { type: 'void', subtype: null },
        coordinates: [col, row],
        image: null,
        borders: null
    };
}

function setVoid(tile) {
    tile.contains = { type: 'void', subtype: null };
    tile.color = 'black';
    tile.image = null;
    tile.borders = null;
}

function setEmpty(tile) {
    tile.contains = { type: 'empty_space', subtype: null };
    tile.color = null;
    tile.image = null;
    tile.borders = null;
}

function setWayUp(tile) {
    tile.contains = { type: 'way_up', subtype: 'way_up' };
    tile.image = 'way_up';
    tile.color = null;
    tile.borders = null;
}

function setWayDown(tile) {
    tile.contains = { type: 'way_down', subtype: 'way_down' };
    tile.image = 'way_down';
    tile.color = null;
    tile.borders = null;
}

function setSpawn(tile) {
    tile.contains = { type: 'spawn', subtype: 'spawn_point' };
    tile.image = 'spawn_point';
    tile.color = null;
    tile.borders = null;
}

function setDoor(tile) {
    tile.contains = { type: 'door', subtype: 'door' };
    tile.image = 'door';
    tile.color = null;
    tile.borders = null;
}

function setTierMonster(tile, tier) {
    const tierImages = { 1: 'beholder_minion', 2: 'ogre', 3: 'witch', 4: 'sphinx' };
    tile.contains = { type: `tier_${tier}_monster`, subtype: null };
    tile.image = tierImages[tier] || 'beholder_minion';
    tile.color = null;
    tile.borders = null;
}

function setGate(tile, gateKey) {
    tile.contains = { type: 'gate', subtype: gateKey };
    tile.image = gateKey;
    tile.color = null;
    tile.borders = null;
}

function setKey(tile, keyKey) {
    tile.contains = { type: 'item', subtype: keyKey };
    tile.image = keyKey;
    tile.color = null;
    tile.borders = null;
}

function setTreasure(tile) {
    const chests = ['silver_chest', 'gold_chest', 'ornate_chest'];
    const chest = pick(chests);
    tile.contains = { type: 'item', subtype: chest };
    tile.image = chest;
    tile.color = null;
    tile.borders = null;
}

function setGold(tile) {
    tile.contains = { type: 'gold', subtype: 'gold' };
    tile.image = 'gold';
    tile.color = null;
    tile.borders = null;
}

function setFood(tile) {
    tile.contains = { type: 'food', subtype: 'food' };
    tile.image = 'food';
    tile.color = null;
    tile.borders = null;
}

function setPortal(tile, portalId, targetPortalId, targetLevelId, targetOrientation, targetMbIdx, targetCoords, portalName) {
    tile.contains = {
        type: 'dungeon_portal',
        subtype: null,
        portalId,
        targetPortalId,
        targetLevelId,
        targetOrientation,
        targetMiniboardIndex: targetMbIdx,
        targetCoordinates: targetCoords,
        portalName
    };
    tile.image = 'dungeon_portal';
    tile.color = null;
    tile.borders = null;
}

// ── Tile querying helpers ─────────────────────────────────────────────────────

function isWalkable(tile) {
    return tile.contains.type !== 'void';
}

function isEmpty(tile) {
    return tile.contains.type === 'empty_space';
}

/** Count walkable cardinal neighbours (not diagonals). */
function countWalkableNeighbours(tiles, col, row) {
    let count = 0;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dc, dr] of dirs) {
        const nc = col + dc, nr = row + dr;
        if (inBounds(nc, nr) && isWalkable(tiles[coordToIdx(nc, nr)])) count++;
    }
    return count;
}

/** Get all empty interior tiles. */
function getEmptyInterior(tiles) {
    return tiles.filter(t =>
        isEmpty(t) &&
        t.coordinates[0] > 0 && t.coordinates[0] < BOARD_SIZE - 1 &&
        t.coordinates[1] > 0 && t.coordinates[1] < BOARD_SIZE - 1
    );
}

// ── Room generation ───────────────────────────────────────────────────────────

/**
 * Generate small, close-quarters rooms.
 * Rooms range from 2×2 to 4×4 — much smaller than typical dungeon rooms,
 * creating a tight, cramped feel.
 */
function generateRooms(count) {
    const MIN_SIZE = 2;
    const MAX_SIZE = 4;
    const rooms = [];
    let attempts = 0;

    while (rooms.length < count && attempts < 200) {
        attempts++;
        const w = randInt(MIN_SIZE, MAX_SIZE);
        const h = randInt(MIN_SIZE, MAX_SIZE);
        const x = randInt(1, BOARD_SIZE - 2 - w);
        const y = randInt(1, BOARD_SIZE - 2 - h);
        const newRoom = { x, y, w, h };

        // Only allow rooms that don't overlap (with 1-tile margin for walls)
        if (!rooms.some(r => roomsOverlap(r, newRoom, 1))) {
            rooms.push(newRoom);
        }
    }

    if (rooms.length === 0) {
        rooms.push({ x: 3, y: 3, w: 3, h: 3 });
    }
    return rooms;
}

function roomsOverlap(a, b, margin) {
    return !(
        a.x + a.w + margin <= b.x || b.x + b.w + margin <= a.x ||
        a.y + a.h + margin <= b.y || b.y + b.h + margin <= a.y
    );
}

function roomCenter(room) {
    return {
        col: Math.floor(room.x + room.w / 2),
        row: Math.floor(room.y + room.h / 2)
    };
}

// ── Corridor carving ──────────────────────────────────────────────────────────

/**
 * Carve a winding 1-tile-wide corridor between two points.
 * Introduces random perpendicular jogs to create bends and make
 * the layout feel organic rather than straight-line.
 */
function carveWindingCorridor(tiles, startCol, startRow, endCol, endRow) {
    let col = startCol, row = startRow;
    let steps = 0;
    const maxSteps = 60;

    while ((col !== endCol || row !== endRow) && steps < maxSteps) {
        steps++;
        // Carve current position
        const idx = coordToIdx(col, row);
        if (inInterior(col, row) && tiles[idx].contains.type === 'void') {
            setEmpty(tiles[idx]);
        }

        const dx = endCol - col;
        const dy = endRow - row;

        // 70% move toward target, 30% random perpendicular jog
        if (Math.random() < 0.7) {
            // Move toward target — choose the axis that's farther away
            if (Math.abs(dx) > Math.abs(dy)) {
                col += dx > 0 ? 1 : -1;
            } else if (dy !== 0) {
                row += dy > 0 ? 1 : -1;
            } else {
                col += dx > 0 ? 1 : -1;
            }
        } else {
            // Random perpendicular jog
            if (Math.abs(dx) > Math.abs(dy)) {
                // Moving mainly horizontal → jog vertically
                row += Math.random() < 0.5 ? 1 : -1;
            } else {
                // Moving mainly vertical → jog horizontally
                col += Math.random() < 0.5 ? 1 : -1;
            }
        }

        // Clamp to interior bounds
        col = Math.max(1, Math.min(BOARD_SIZE - 2, col));
        row = Math.max(1, Math.min(BOARD_SIZE - 2, row));
    }

    // Make sure the end point is carved
    if (inInterior(endCol, endRow)) {
        const endIdx = coordToIdx(endCol, endRow);
        if (tiles[endIdx].contains.type === 'void') {
            setEmpty(tiles[endIdx]);
        }
    }
}

/** Carve a straight horizontal line (for edge connections). */
function carveHLine(tiles, x1, x2, row) {
    const lo = Math.max(0, Math.min(x1, x2));
    const hi = Math.min(BOARD_SIZE - 1, Math.max(x1, x2));
    for (let c = lo; c <= hi; c++) {
        const idx = coordToIdx(c, row);
        if (tiles[idx].contains.type === 'void') setEmpty(tiles[idx]);
    }
}

/** Carve a straight vertical line (for edge connections). */
function carveVLine(tiles, y1, y2, col) {
    const lo = Math.max(0, Math.min(y1, y2));
    const hi = Math.min(BOARD_SIZE - 1, Math.max(y1, y2));
    for (let r = lo; r <= hi; r++) {
        const idx = coordToIdx(col, r);
        if (tiles[idx].contains.type === 'void') setEmpty(tiles[idx]);
    }
}

/**
 * Carve a dead-end branch off a corridor for hidden treasure or ambushes.
 */
function carveDeadEnd(tiles) {
    // Find a walkable tile adjacent to void — a potential branching point
    const candidates = [];
    for (let r = 2; r < BOARD_SIZE - 2; r++) {
        for (let c = 2; c < BOARD_SIZE - 2; c++) {
            const idx = coordToIdx(c, r);
            if (isWalkable(tiles[idx])) {
                const neighbours = countWalkableNeighbours(tiles, c, r);
                if (neighbours >= 1 && neighbours <= 2) {
                    // Check if there's void in at least one direction to extend into
                    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    for (const [dc, dr] of dirs) {
                        const nc = c + dc, nr = r + dr;
                        const nc2 = c + dc * 2, nr2 = r + dr * 2;
                        const nc3 = c + dc * 3, nr3 = r + dr * 3;
                        if (inInterior(nc3, nr3) &&
                            !isWalkable(tiles[coordToIdx(nc, nr)]) &&
                            !isWalkable(tiles[coordToIdx(nc2, nr2)])) {
                            candidates.push({ c, r, dc, dr, length: randInt(2, 4) });
                        }
                    }
                }
            }
        }
    }

    if (candidates.length === 0) return;
    const branch = pick(candidates);

    // Carve the dead-end branch
    for (let step = 1; step <= branch.length; step++) {
        const nc = branch.c + branch.dc * step;
        const nr = branch.r + branch.dr * step;
        if (inInterior(nc, nr)) {
            setEmpty(tiles[coordToIdx(nc, nr)]);
        } else break;
    }
}

// ── Edge opening carving ──────────────────────────────────────────────────────

function carveEdgeOpenings(tiles, rooms, topOpen, bottomOpen, leftOpen, rightOpen) {
    for (const col of topOpen) {
        setEmpty(tiles[coordToIdx(col, 0)]);
        connectEdgeToInterior(tiles, rooms, col, 0, 'top');
    }
    for (const col of bottomOpen) {
        setEmpty(tiles[coordToIdx(col, BOARD_SIZE - 1)]);
        connectEdgeToInterior(tiles, rooms, col, BOARD_SIZE - 1, 'bottom');
    }
    for (const row of leftOpen) {
        setEmpty(tiles[coordToIdx(0, row)]);
        connectEdgeToInterior(tiles, rooms, 0, row, 'left');
    }
    for (const row of rightOpen) {
        setEmpty(tiles[coordToIdx(BOARD_SIZE - 1, row)]);
        connectEdgeToInterior(tiles, rooms, BOARD_SIZE - 1, row, 'right');
    }
}

function connectEdgeToInterior(tiles, rooms, col, row, edge) {
    let bestRoom = rooms[0];
    let bestDist = Infinity;
    for (const room of rooms) {
        const c = roomCenter(room);
        const dist = Math.abs(c.col - col) + Math.abs(c.row - row);
        if (dist < bestDist) { bestDist = dist; bestRoom = room; }
    }
    const target = roomCenter(bestRoom);

    switch (edge) {
        case 'top':
            carveVLine(tiles, 0, target.row, col);
            carveHLine(tiles, col, target.col, target.row);
            break;
        case 'bottom':
            carveVLine(tiles, BOARD_SIZE - 1, target.row, col);
            carveHLine(tiles, col, target.col, target.row);
            break;
        case 'left':
            carveHLine(tiles, 0, target.col, row);
            carveVLine(tiles, row, target.row, target.col);
            break;
        case 'right':
            carveHLine(tiles, BOARD_SIZE - 1, target.col, row);
            carveVLine(tiles, row, target.row, target.col);
            break;
        default: break;
    }
}

// ── Chokepoint detection ──────────────────────────────────────────────────────

/**
 * Find tiles that are "chokepoints" — walkable tiles where exactly 2
 * walkable neighbours exist, forming a narrow passage. Great for gates.
 */
function findChokepoints(tiles) {
    const chokepoints = [];
    for (let r = 1; r < BOARD_SIZE - 1; r++) {
        for (let c = 1; c < BOARD_SIZE - 1; c++) {
            const idx = coordToIdx(c, r);
            if (!isEmpty(tiles[idx])) continue;

            const walkableN = countWalkableNeighbours(tiles, c, r);
            if (walkableN === 2) {
                // Check that the two neighbours are on opposite sides (true corridor)
                const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                const walkDirs = dirs.filter(([dc, dr]) => {
                    const nc = c + dc, nr = r + dr;
                    return inBounds(nc, nr) && isWalkable(tiles[coordToIdx(nc, nr)]);
                });
                if (walkDirs.length === 2) {
                    // Check if they're on opposite sides (straight corridor)
                    const [d1, d2] = walkDirs;
                    if (d1[0] + d2[0] === 0 && d1[1] + d2[1] === 0) {
                        chokepoints.push({ col: c, row: r, idx });
                    }
                }
            }
        }
    }
    return chokepoints;
}

// ── Config computation ────────────────────────────────────────────────────────

function computeConfig(tiles) {
    const topRow = [];
    for (let p = 0; p < BOARD_SIZE; p++) {
        if (tiles[p].contains.type !== 'void') topRow.push(p);
    }
    const rightCol = [];
    for (let p = 0; p < BOARD_SIZE; p++) {
        const idx = p * BOARD_SIZE + (BOARD_SIZE - 1);
        if (tiles[idx].contains.type !== 'void') rightCol.push(idx);
    }
    const botRow = [];
    for (let p = 210; p < TILE_COUNT; p++) {
        if (tiles[p].contains.type !== 'void') botRow.push(p);
    }
    const leftCol = [];
    for (let p = 0; p < BOARD_SIZE; p++) {
        const idx = p * BOARD_SIZE;
        if (tiles[idx].contains.type !== 'void') leftCol.push(idx);
    }
    return [topRow, rightCol, botRow, leftCol];
}

// ── Board generation ──────────────────────────────────────────────────────────

/**
 * Generates a 15×15 board with tight rooms, winding corridors, chokepoints,
 * gates/keys, monsters, and treasure.
 */
function generateRandomBoard(opts = {}) {
    const {
        topOpen = [], bottomOpen = [], leftOpen = [], rightOpen = [],
        monsterTier = 1,
        monsterCount = 3,
        treasureCount = 1,
        placeGold = true,
        placeFood = true,
        gateTier = 0,         // 0=none, 1=minor, 2=major, 3=treasury
        gateCount = 0,        // how many gate+key pairs
        trapCount = randInt(1, 3),
    } = opts;

    // 1. Initialize all tiles as void
    const tiles = [];
    for (let i = 0; i < TILE_COUNT; i++) {
        const [col, row] = idxToCoord(i);
        tiles.push(makeTile(i, col, row));
    }

    // 2. Generate small, close-quarters rooms (4-7 rooms)
    const numRooms = randInt(4, 7);
    const rooms = generateRooms(numRooms);

    // 3. Carve rooms
    for (const room of rooms) {
        for (let r = room.y; r < room.y + room.h; r++) {
            for (let c = room.x; c < room.x + room.w; c++) {
                if (inBounds(c, r)) setEmpty(tiles[coordToIdx(c, r)]);
            }
        }
    }

    // 4. Connect rooms with winding corridors
    // Sort rooms spatially for a connected path, then add extra connections
    const sortedRooms = [...rooms].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (let i = 0; i < sortedRooms.length - 1; i++) {
        const a = roomCenter(sortedRooms[i]);
        const b = roomCenter(sortedRooms[i + 1]);
        carveWindingCorridor(tiles, a.col, a.row, b.col, b.row);
    }

    // Extra connections for loops (prevents dead-end sections)
    if (rooms.length > 3) {
        const a = roomCenter(rooms[rooms.length - 1]);
        const b = roomCenter(rooms[0]);
        carveWindingCorridor(tiles, a.col, a.row, b.col, b.row);
    }
    if (rooms.length > 5) {
        const a = roomCenter(rooms[2]);
        const b = roomCenter(rooms[rooms.length - 2]);
        carveWindingCorridor(tiles, a.col, a.row, b.col, b.row);
    }

    // 5. Carve dead-end branches (1-3)
    const deadEndCount = randInt(1, 3);
    for (let i = 0; i < deadEndCount; i++) {
        carveDeadEnd(tiles);
    }

    // 6. Carve edge openings and connect to interior
    carveEdgeOpenings(tiles, rooms, topOpen, bottomOpen, leftOpen, rightOpen);

    // 7. Place gates at chokepoints
    if (gateCount > 0 && gateTier > 0) {
        const chokepoints = findChokepoints(tiles);
        shuffle(chokepoints);
        const gkPair = GATE_KEY_TIERS[Math.min(gateTier - 1, GATE_KEY_TIERS.length - 1)];
        const numGates = Math.min(gateCount, chokepoints.length);

        for (let i = 0; i < numGates; i++) {
            const cp = chokepoints[i];
            setGate(tiles[cp.idx], gkPair.gate);

            // Place the corresponding key in a random empty tile
            // (preferably not past the gate)
            const emptyTiles = getEmptyInterior(tiles);
            if (emptyTiles.length > 0) {
                setKey(pick(emptyTiles), gkPair.key);
            }
        }
    }

    // 8. Place monsters at strategic positions
    // First, place at remaining chokepoints (guarding passages)
    const monsterChokepoints = findChokepoints(tiles);
    shuffle(monsterChokepoints);
    let monstersPlaced = 0;
    const targetMonsters = monsterCount;

    // Place some monsters at chokepoints
    const chokepointMonsters = Math.min(Math.ceil(targetMonsters * 0.4), monsterChokepoints.length);
    for (let i = 0; i < chokepointMonsters; i++) {
        const cp = monsterChokepoints[i];
        if (isEmpty(tiles[cp.idx])) {
            setTierMonster(tiles[cp.idx], monsterTier);
            monstersPlaced++;
        }
    }

    // Place remaining monsters in rooms/corridors
    const emptyForMonsters = getEmptyInterior(tiles);
    shuffle(emptyForMonsters);
    for (let i = 0; monstersPlaced < targetMonsters && i < emptyForMonsters.length; i++) {
        if (isEmpty(emptyForMonsters[i])) {
            setTierMonster(emptyForMonsters[i], monsterTier);
            monstersPlaced++;
        }
    }

    // 9. Place treasure (prefer dead ends and small rooms)
    const emptyForTreasure = getEmptyInterior(tiles);
    shuffle(emptyForTreasure);
    // Prioritize tiles with fewer walkable neighbours (dead ends, corners)
    emptyForTreasure.sort((a, b) => {
        const na = countWalkableNeighbours(tiles, a.coordinates[0], a.coordinates[1]);
        const nb = countWalkableNeighbours(tiles, b.coordinates[0], b.coordinates[1]);
        return na - nb; // fewer neighbours first → dead ends
    });
    let placed = 0;
    for (let i = 0; i < treasureCount && placed < emptyForTreasure.length; i++) {
        if (isEmpty(emptyForTreasure[placed])) {
            setTreasure(emptyForTreasure[placed]);
        }
        placed++;
    }

    // 10. Scatter gold and food
    const emptyForMisc = getEmptyInterior(tiles);
    shuffle(emptyForMisc);
    let miscIdx = 0;
    if (placeGold) {
        const goldCount = randInt(1, 3);
        for (let i = 0; i < goldCount && miscIdx < emptyForMisc.length; i++) {
            if (isEmpty(emptyForMisc[miscIdx])) setGold(emptyForMisc[miscIdx]);
            miscIdx++;
        }
    }
    if (placeFood && Math.random() < 0.6) {
        if (miscIdx < emptyForMisc.length && isEmpty(emptyForMisc[miscIdx])) {
            setFood(emptyForMisc[miscIdx]);
            miscIdx++;
        }
    }

    // 10.5. Scatter traps
    const emptyForTraps = getEmptyInterior(tiles);
    shuffle(emptyForTraps);
    let trapsPlaced = 0;
    for (let i = 0; i < emptyForTraps.length && trapsPlaced < trapCount; i++) {
        const tile = emptyForTraps[i];
        if (isEmpty(tile)) {
            tile.hasTrap = true;
            tile.trapRevealed = false;
            trapsPlaced++;
        }
    }

    // 11. Compute config
    const config = computeConfig(tiles);

    return {
        name: `gen_board_${Date.now()}_${randInt(1000, 9999)}`,
        tiles,
        config,
    };
}

// ── Plane generation ──────────────────────────────────────────────────────────

/**
 * Board layout in a plane:
 *   [0][1][2]
 *   [3][4][5]
 *   [6][7][8]
 *
 * Outer edges = void. Inner shared edges = matching openings (2-4 tiles).
 */
function generateRandomPlane(opts = {}) {
    const { monsterTier = 1, gateTier = 1, isGroundLevel = false } = opts;

    // Pre-determine shared edges (fewer openings = more constrained entry points)
    const hShared = []; // horizontal shared edges (between board rows)
    for (let bRow = 0; bRow < 2; bRow++) {
        const row = [];
        for (let bCol = 0; bCol < 3; bCol++) {
            const numOpen = randInt(2, 4);
            const candidates = [];
            for (let c = 2; c < BOARD_SIZE - 2; c++) candidates.push(c);
            shuffle(candidates);
            row.push(candidates.slice(0, numOpen).sort((a, b) => a - b));
        }
        hShared.push(row);
    }

    const vShared = []; // vertical shared edges (between board columns)
    for (let bRow = 0; bRow < 3; bRow++) {
        const row = [];
        for (let bCol = 0; bCol < 2; bCol++) {
            const numOpen = randInt(2, 4);
            const candidates = [];
            for (let r = 2; r < BOARD_SIZE - 2; r++) candidates.push(r);
            shuffle(candidates);
            row.push(candidates.slice(0, numOpen).sort((a, b) => a - b));
        }
        vShared.push(row);
    }

    const miniboards = [];
    for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
        const bRow = Math.floor(boardIdx / 3);
        const bCol = boardIdx % 3;

        let topOpen = bRow > 0 ? hShared[bRow - 1][bCol] : [];
        let bottomOpen = bRow < 2 ? hShared[bRow][bCol] : [];
        let leftOpen = bCol > 0 ? vShared[bRow][bCol - 1] : [];
        let rightOpen = bCol < 2 ? vShared[bRow][bCol] : [];

        const isCenterBoard = boardIdx === 4;
        const isCorner = (bRow === 0 || bRow === 2) && (bCol === 0 || bCol === 2);

        // More monsters on edges, fewer in center if ground level
        const mc = isCenterBoard && isGroundLevel
            ? randInt(1, 2)
            : (isCorner ? randInt(3, 5) : randInt(2, 4));

        const tc = isCenterBoard && isGroundLevel ? 0 : randInt(1, 2);

        // Gates: corners and edges get gates, center is safer
        const gc = isCenterBoard && isGroundLevel ? 0 : (isCorner ? randInt(1, 2) : randInt(0, 1));

        const board = generateRandomBoard({
            topOpen, bottomOpen, leftOpen, rightOpen,
            monsterTier,
            monsterCount: mc,
            treasureCount: tc,
            placeGold: true,
            placeFood: true,
            gateTier: gateTier,
            gateCount: gc,
        });

        board.id = `gen_${Date.now()}_${boardIdx}_${randInt(1000, 9999)}`;
        board.name = `gen_board_${boardIdx}`;
        board.valid = true;

        miniboards.push(board);
    }

    return {
        name: `gen_plane_${Date.now()}_${randInt(1000, 9999)}`,
        miniboards,
        valid: true
    };
}

// ── Dungeon generation ────────────────────────────────────────────────────────

/**
 * Generates a 3-level dungeon (-1, 0, +1) with:
 * - Tight, corridor-heavy maps with chokepoints
 * - Gates guarding passages (tier scaling by level)
 * - Monsters at chokepoints and in rooms
 * - Way up/down connections between levels (2-3 per transition)
 * - Portal pairs within and between levels
 * - Spawn point on level 0 center
 */
function generateRandomDungeon() {
    const levelConfigs = [
        { id: -1, monsterTier: 1, gateTier: 1, isGroundLevel: false },
        { id:  0, monsterTier: 1, gateTier: 1, isGroundLevel: true  },
        { id:  1, monsterTier: 2, gateTier: 2, isGroundLevel: false },
    ];

    const planes = {};
    for (const cfg of levelConfigs) {
        planes[cfg.id] = generateRandomPlane({
            monsterTier: cfg.monsterTier,
            gateTier: cfg.gateTier,
            isGroundLevel: cfg.isGroundLevel,
        });
    }

    // ── Spawn point on level 0 center ─────────────────────────────────────
    const centerBoard = planes[0].miniboards[4];
    const emptyInCenter = centerBoard.tiles.filter(t =>
        isEmpty(t) && t.coordinates[0] > 2 && t.coordinates[0] < 12 &&
        t.coordinates[1] > 2 && t.coordinates[1] < 12
    );
    if (emptyInCenter.length > 0) {
        setSpawn(emptyInCenter[Math.floor(emptyInCenter.length / 2)]);
    } else {
        const fallback = centerBoard.tiles[coordToIdx(7, 7)];
        setEmpty(fallback);
        setSpawn(fallback);
    }

    // ── Vertical connections (way up / way down) ──────────────────────────
    // Level -1 ↔ 0: 2-3 connections
    placeVerticalConnections(planes[-1], planes[0], randInt(2, 3));
    // Level 0 ↔ 1: 2-3 connections
    placeVerticalConnections(planes[0], planes[1], randInt(2, 3));

    // ── Doors (between rooms as flavor — implies front/back connection) ───
    placeDoors(planes);

    // ── Portal pairs within/between levels ────────────────────────────────
    placePortalPairs(planes, levelConfigs);

    // ── Assemble dungeon ──────────────────────────────────────────────────
    const levels = levelConfigs.map(cfg => ({
        id: cfg.id,
        front: planes[cfg.id],
        back: null,
        valid: false
    }));

    return {
        name: 'Generated Dungeon',
        levels,
        pocket_planes: [
            { firmament: null },
            { sheol: null },
            { hyperspace: null }
        ],
        descriptions: 'Randomly generated dungeon',
        valid: false
    };
}

/**
 * Place way_up / way_down pairs between two adjacent level planes.
 * @param {number} count  How many connections (2-3)
 */
function placeVerticalConnections(lowerPlane, upperPlane, count) {
    const preferredBoards = shuffle([1, 3, 4, 5, 7]);
    const selected = preferredBoards.slice(0, Math.min(count, preferredBoards.length));

    for (const mbIdx of selected) {
        const lowerBoard = lowerPlane.miniboards[mbIdx];
        const upperBoard = upperPlane.miniboards[mbIdx];

        const lowerEmpty = lowerBoard.tiles.filter(t =>
            isEmpty(t) && inInterior(t.coordinates[0], t.coordinates[1])
        );
        if (lowerEmpty.length === 0) continue;

        const pickedTile = pick(lowerEmpty);
        const tileId = pickedTile.id;

        // Ensure matching tile on upper board is available
        const upperTile = upperBoard.tiles[tileId];
        if (!isEmpty(upperTile)) setEmpty(upperTile);

        setWayUp(lowerBoard.tiles[tileId]);
        setWayDown(upperBoard.tiles[tileId]);
    }
}

/**
 * Scatter a few doors across the dungeon for atmosphere.
 * Doors placed in rooms near corridors (1-2 per level).
 */
function placeDoors(planes) {
    for (const levelId of Object.keys(planes)) {
        const plane = planes[levelId];
        const doorsToPlace = randInt(1, 2);
        let doorsPlaced = 0;

        // Pick random miniboards for doors
        const mbIndices = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
        for (const mbIdx of mbIndices) {
            if (doorsPlaced >= doorsToPlace) break;
            const board = plane.miniboards[mbIdx];
            const emptyTiles = board.tiles.filter(t =>
                isEmpty(t) && inInterior(t.coordinates[0], t.coordinates[1]) &&
                countWalkableNeighbours(board.tiles, t.coordinates[0], t.coordinates[1]) >= 2
            );
            if (emptyTiles.length > 0) {
                setDoor(pick(emptyTiles));
                doorsPlaced++;
            }
        }
    }
}

/**
 * Place connected portal pairs. Creates 1-2 portal pairs per level,
 * linking different miniboards for fast travel.
 */
function placePortalPairs(planes, levelConfigs) {
    for (const cfg of levelConfigs) {
        const plane = planes[cfg.id];
        const numPairs = randInt(1, 2);

        for (let p = 0; p < numPairs; p++) {
            // Pick two different miniboards
            const mbIndices = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
            const mbA = mbIndices[0];
            const mbB = mbIndices[1];

            const boardA = plane.miniboards[mbA];
            const boardB = plane.miniboards[mbB];

            const emptyA = boardA.tiles.filter(t =>
                isEmpty(t) && inInterior(t.coordinates[0], t.coordinates[1])
            );
            const emptyB = boardB.tiles.filter(t =>
                isEmpty(t) && inInterior(t.coordinates[0], t.coordinates[1])
            );

            if (emptyA.length === 0 || emptyB.length === 0) continue;

            const tileA = pick(emptyA);
            const tileB = pick(emptyB);

            const portalIdA = `gen_portal_${Date.now()}_${randInt(10000, 99999)}`;
            const portalIdB = `gen_portal_${Date.now()}_${randInt(10000, 99999)}_b`;

            const nameA = `Lvl ${cfg.id} (Front) Board ${mbA + 1} at [${tileA.coordinates}]`;
            const nameB = `Lvl ${cfg.id} (Front) Board ${mbB + 1} at [${tileB.coordinates}]`;

            setPortal(tileA, portalIdA, portalIdB, cfg.id, 'front', mbB, tileB.coordinates, nameB);
            setPortal(tileB, portalIdB, portalIdA, cfg.id, 'front', mbA, tileA.coordinates, nameA);
        }
    }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
    generateRandomBoard,
    generateRandomPlane,
    generateRandomDungeon,
    computeConfig,
    setEmpty,
    setVoid,
    setWayUp,
    setWayDown,
    setSpawn,
    setDoor,
    setTierMonster,
    setTreasure,
    setGate,
    setKey,
    setPortal,
    BOARD_SIZE,
    TILE_COUNT,
};
