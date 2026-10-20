// Engineer expedition skills: Salvage, Grapple Winch, Forward Emplacement.
// Pure helpers so DungeonPage stays thin and the rules are unit-testable.

export const SCRAP_CAP = 30;
export const GRAPPLE_COST = 3;
export const GRAPPLE_RANGE = 4;
export const GRAPPLE_RANGE_MAX = 7;

// Range grows with level: 4 at L1, +1 every 3 levels, capped at 7.
export function getGrappleRange(level) {
    const lvl = typeof level === 'number' && level > 0 ? level : 1;
    return Math.min(GRAPPLE_RANGE_MAX, GRAPPLE_RANGE + Math.floor((lvl - 1) / 3));
}
export const EMPLACEMENT_COST = 5;
export const EMPLACEMENT_REFUND = 3;
export const EMPLACEMENT_RADIUS = 3;
export const BOARD_WIDTH = 15;

export const ENGINEER_EXPEDITION_SKILLS = ['engineer_salvage', 'engineer_grapple_winch', 'engineer_forward_emplacement'];

// Single-tile clutter that can be dismantled. Multi-tile props (rift_embers,
// fractured_monolith) are intentionally excluded so footprints never half-vanish.
const SALVAGEABLE_KEYS = [
    'pocket_litter', 'dimension_litter', 'dungeon_litter', 'litter',
    'mana_crystals', 'ruined_arch', 'broken_wagon', 'forge_remnants',
    'astral_obelisk', 'ancient_reliquary', 'celestial_geode',
    'rubble', 'debris', 'broken_wood', 'edge_wood', 'scattered_rocks',
    'old_barrels', 'broken_crates', 'broken_urns', 'battle_debris',
    'iron_chains', 'melted_candles', 'scattered_coins', 'shattered_potions',
    'small_barrel', 'edge_bones', 'edge_rocks'
];
const NON_SALVAGEABLE_KEYS = ['rift_embers', 'fractured_monolith'];

const DIRS = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1],
    'up-right': [-1, 1],
    'up-left': [-1, -1],
    'down-right': [1, 1],
    'down-left': [1, -1]
};

export function getScrap(meta) {
    const v = meta && typeof meta.scrap === 'number' ? meta.scrap : 0;
    return Math.max(0, Math.min(SCRAP_CAP, v));
}

export function addScrap(meta, amount) {
    if (!meta) return 0;
    meta.scrap = Math.max(0, Math.min(SCRAP_CAP, getScrap(meta) + amount));
    return meta.scrap;
}

export function trySpendScrap(meta, cost) {
    if (getScrap(meta) < cost) return false;
    meta.scrap = getScrap(meta) - cost;
    return true;
}

const tileKey = (tile) => {
    if (!tile) return '';
    const c = tile.contains;
    const cObj = (c && typeof c === 'object') ? c : null;
    const imgVal = tile.image?.default || tile.image;
    return [
        cObj ? cObj.type : c,
        cObj && cObj.subtype,
        cObj && cObj.building,
        cObj && cObj.name,
        tile.building,
        typeof imgVal === 'string' ? imgVal : '',
        tile.optionType,
        tile.name
    ].filter(Boolean).join(' ').toLowerCase();
};

export function isSalvageableTile(tile) {
    if (!tile) return false;
    const key = tileKey(tile);
    if (NON_SALVAGEABLE_KEYS.some(k => key.includes(k))) return false;
    if (tile.isDimensionLitter || tile.isPocketLitter || tile.isDungeonLitter) return true;
    const cObj = (tile.contains && typeof tile.contains === 'object') ? tile.contains : null;
    if (cObj && (cObj.isDimensionLitter || cObj.isPocketLitter || cObj.isDungeonLitter)) return true;
    
    const imgStr = String(tile.image?.default || tile.image || cObj?.image?.default || cObj?.image || '').toLowerCase();
    if (imgStr.includes('litter') || imgStr.includes('debris') || imgStr.includes('rubble')) return true;
    
    if (key.includes('litter') || key.includes('debris') || key.includes('rubble')) return true;
    return SALVAGEABLE_KEYS.some(k => key.includes(k));
}

// Yield scales with DEX: 1 base, +1 per 4 DEX, capped at 3. `rand` injectable for tests.
export function computeSalvageYield(dex, rand = Math.random) {
    const d = typeof dex === 'number' ? dex : 1;
    const max = Math.min(3, 1 + Math.floor(d / 4));
    return 1 + Math.floor(rand() * max);
}

export const indexToCoords = (idx) => [Math.floor(idx / BOARD_WIDTH), idx % BOARD_WIDTH];

// Support both local [0..14, 0..14] and global BoardManager coordinates [15..29, 15..29]
export const coordsToIndex = ([r, c]) => {
    const lr = ((r % BOARD_WIDTH) + BOARD_WIDTH) % BOARD_WIDTH;
    const lc = ((c % BOARD_WIDTH) + BOARD_WIDTH) % BOARD_WIDTH;
    return lr * BOARD_WIDTH + lc;
};

export function isStepInBounds(playerCoords, [dr, dc], step = 1) {
    if (!playerCoords) return false;
    const lr = ((playerCoords[0] % BOARD_WIDTH) + BOARD_WIDTH) % BOARD_WIDTH;
    const lc = ((playerCoords[1] % BOARD_WIDTH) + BOARD_WIDTH) % BOARD_WIDTH;
    const targetR = lr + dr * step;
    const targetC = lc + dc * step;
    return targetR >= 0 && targetR < BOARD_WIDTH && targetC >= 0 && targetC < BOARD_WIDTH;
}

export function findAdjacentSalvageTarget(tiles, playerCoords, facing, boardTiles = null) {
    if (!Array.isArray(tiles) || !playerCoords) return null;
    
    const facingDir = (facing && DIRS[facing]) ? facing : null;
    const cardinals = ['up', 'down', 'left', 'right'];
    const diagonals = ['up-right', 'down-right', 'down-left', 'up-left'];
    const order = [facingDir, ...cardinals, ...diagonals].filter((d, i, a) => d && a.indexOf(d) === i);

    for (const d of order) {
        const [dr, dc] = DIRS[d];
        if (!isStepInBounds(playerCoords, [dr, dc])) continue;
        const coords = [playerCoords[0] + dr, playerCoords[1] + dc];
        const idx = coordsToIndex(coords);
        const t = tiles[idx];
        const bt = boardTiles && boardTiles[idx];
        if (isSalvageableTile(t) || isSalvageableTile(bt)) {
            return { idx, coords, tile: t || bt, dir: d };
        }
    }
    
    // Also allow salvaging clutter on the player's own tile if standing directly on it
    const currentIdx = coordsToIndex(playerCoords);
    const curT = tiles[currentIdx];
    const curBt = boardTiles && boardTiles[currentIdx];
    if (isSalvageableTile(curT) || isSalvageableTile(curBt)) {
        return { idx: currentIdx, coords: playerCoords, tile: curT || curBt, dir: 'here' };
    }
    
    return null;
}

export function salvageTile(tile) {
    if (!tile) return;
    tile.contains = { type: 'empty_space', subtype: null };
    tile.image = null;
    tile.imageOverride = null;
    tile.building = null;
    delete tile.isDimensionLitter;
    delete tile.isPocketLitter;
    delete tile.isDungeonLitter;
    if (tile.optionType === 'dungeon litter' || tile.optionType === 'dungeon_litter' || tile.optionType === 'pocket litter' || tile.optionType === 'dimension litter') {
        tile.optionType = null;
    }
    tile.salvaged = true;
}

/**
 * Compute a zipline from playerCoords in `facing`.
 * helpers: { isVoid(tile), isBlocking(tile), isWalkable(tile) }
 * The line may cross void / impassable floor, but walls (closed gates, structures)
 * stop it. It anchors on the FIRST walkable tile after at least one gap tile.
 */
export function computeGrapplePath(tiles, playerCoords, facing, helpers, range = GRAPPLE_RANGE) {
    const dir = DIRS[facing];
    if (!dir) return { ok: false, reason: 'no_direction' };
    if (!Array.isArray(tiles) || !playerCoords) return { ok: false, reason: 'no_board' };
    const { isVoid, isBlocking, isWalkable } = helpers || {};
    let gap = 0;
    for (let step = 1; step <= range; step++) {
        if (!isStepInBounds(playerCoords, dir, step)) return { ok: false, reason: 'edge' };
        const coords = [playerCoords[0] + dir[0] * step, playerCoords[1] + dir[1] * step];
        const idx = coordsToIndex(coords);
        const t = tiles[idx];
        if (isBlocking && isBlocking(t)) return { ok: false, reason: 'blocked' };
        const voidLike = !t || (isVoid && isVoid(t));
        if (voidLike) { gap++; continue; }
        if (isWalkable && !isWalkable(t)) { gap++; continue; }
        if (gap === 0) return { ok: false, reason: 'no_gap' };
        return { ok: true, endCoords: coords, endIdx: idx, span: step };
    }
    return { ok: false, reason: 'out_of_range' };
}

export function findZiplineFrom(ziplines, coords) {
    if (!Array.isArray(ziplines) || !coords) return null;
    for (const z of ziplines) {
        if (z.from[0] === coords[0] && z.from[1] === coords[1]) return { line: z, dest: z.to };
        if (z.to[0] === coords[0] && z.to[1] === coords[1]) return { line: z, dest: z.from };
    }
    return null;
}

export function isWithinEmplacementRange(emplacement, coords, boardKey, radius = EMPLACEMENT_RADIUS) {
    if (!emplacement || !coords || !emplacement.coords) return false;
    if (boardKey != null && emplacement.boardKey != null && emplacement.boardKey !== boardKey) return false;
    const dr = Math.abs(emplacement.coords[0] - coords[0]);
    const dc = Math.abs(emplacement.coords[1] - coords[1]);
    return Math.max(dr, dc) <= radius;
}
