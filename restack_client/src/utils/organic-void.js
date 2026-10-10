/**
 * organic-void.js
 * Generator for organic void/floor boundary SVG paths in DreamTower dungeon boards.
 * Uses Marching Squares + 2-octave deterministic value noise + Catmull-Rom smoothing + LRU caching.
 */

// LRU Cache for computed void paths (Max 32 entries)
const PATH_CACHE = new Map();
const MAX_CACHE_SIZE = 32;

/**
 * Hash function (FNV-1a) for array of bytes/values.
 */
export function hashMask(mask) {
    let hash = 2166136261;
    for (let i = 0; i < mask.length; i++) {
        hash ^= mask[i];
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
}

/**
 * Deterministic pseudo-random noise generator (Value Noise 2D with 2 octaves)
 */
function pseudoRandom(x, y, seed = 1337) {
    let n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453123;
    return n - Math.floor(n);
}

function smoothNoise2D(x, y, seed = 1337) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    // Smoothstep interpolation
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const n00 = pseudoRandom(xi, yi, seed);
    const n10 = pseudoRandom(xi + 1, yi, seed);
    const n01 = pseudoRandom(xi, yi + 1, seed);
    const n11 = pseudoRandom(xi + 1, yi + 1, seed);

    const x1 = n00 + u * (n10 - n00);
    const x2 = n01 + u * (n11 - n01);
    return x1 + v * (x2 - x1);
}

export function organicNoise2D(x, y, seed = 1337) {
    // 2 octaves of value noise normalized to [-1, 1]
    const oct1 = smoothNoise2D(x * 1.5, y * 1.5, seed);
    const oct2 = smoothNoise2D(x * 3.2 + 100, y * 3.2 + 100, seed + 1);
    const combined = oct1 * 0.7 + oct2 * 0.3; // [0, 1]
    return (combined - 0.5) * 2; // [-1, 1]
}

/**
 * Builds 15x15 void mask (1 = void tile, 0 = floor tile)
 */
export function buildVoidMask(tiles, boardManager) {
    const size = 15;
    const mask = new Uint8Array(size * size);
    if (!tiles || tiles.length === 0) return mask;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = y * size + x;
            const tile = tiles[idx];
            if (!tile) {
                mask[idx] = 1;
                continue;
            }

            const isConnecting = boardManager && typeof boardManager.isConnectingPathTile === 'function'
                ? boardManager.isConnectingPathTile(tile)
                : false;

            const isVoid = boardManager && typeof boardManager.isVoidTile === 'function'
                ? boardManager.isVoidTile(tile)
                : (tile.isVoid === true || tile.contains === 'void' || (tile.contains && tile.contains.type === 'void'));

            mask[idx] = (isVoid && !isConnecting) ? 1 : 0;
        }
    }
    return mask;
}

/**
 * Runs Marching Squares over a 16x16 corner grid to extract closed boundary loops.
 */
export function marchingSquares(mask, width = 15, height = 15) {
    // Build corner values grid (16x16)
    const cornerW = width + 1;
    const cornerH = height + 1;
    const corners = new Float32Array(cornerW * cornerH);

    for (let cy = 0; cy < cornerH; cy++) {
        for (let cx = 0; cx < cornerW; cx++) {
            let sum = 0;
            let count = 0;
            for (let dy = -1; dy <= 0; dy++) {
                for (let dx = -1; dx <= 0; dx++) {
                    const tx = cx + dx;
                    const ty = cy + dy;
                    if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                        sum += mask[ty * width + tx];
                    } else {
                        sum += 1; // Pad outer boundary as void
                    }
                    count++;
                }
            }
            corners[cy * cornerW + cx] = sum / count;
        }
    }

    const iso = 0.5;
    const segments = [];

    // Process cells (15x15 cell grid)
    for (let cy = 0; cy < height; cy++) {
        for (let cx = 0; cx < width; cx++) {
            const v0 = corners[cy * cornerW + cx];         // Top-Left
            const v1 = corners[cy * cornerW + (cx + 1)];     // Top-Right
            const v2 = corners[(cy + 1) * cornerW + (cx + 1)]; // Bottom-Right
            const v3 = corners[(cy + 1) * cornerW + cx];     // Bottom-Left

            const state = ((v0 >= iso) ? 1 : 0) |
                          ((v1 >= iso) ? 2 : 0) |
                          ((v2 >= iso) ? 4 : 0) |
                          ((v3 >= iso) ? 8 : 0);

            if (state === 0 || state === 15) continue;

            // Interpolated edge positions:
            // Edge 0: Top (cx, cy) -> (cx+1, cy)
            // Edge 1: Right (cx+1, cy) -> (cx+1, cy+1)
            // Edge 2: Bottom (cx, cy+1) -> (cx+1, cy+1)
            // Edge 3: Left (cx, cy) -> (cx, cy+1)

            const lerp = (valA, valB, pA, pB) => {
                if (Math.abs(valB - valA) < 1e-5) return (pA + pB) / 2;
                const t = (iso - valA) / (valB - valA);
                return pA + t * (pB - pA);
            };

            const pTop = [lerp(v0, v1, cx, cx + 1), cy];
            const pRight = [cx + 1, lerp(v1, v2, cy, cy + 1)];
            const pBottom = [lerp(v3, v2, cx, cx + 1), cy + 1];
            const pLeft = [cx, lerp(v0, v3, cy, cy + 1)];

            const addSeg = (pA, pB) => segments.push([pA, pB]);

            switch (state) {
                case 1: addSeg(pLeft, pTop); break;
                case 2: addSeg(pTop, pRight); break;
                case 3: addSeg(pLeft, pRight); break;
                case 4: addSeg(pRight, pBottom); break;
                case 5:
                    // Saddle case 1
                    if ((v0 + v1 + v2 + v3) / 4 >= iso) {
                        addSeg(pLeft, pTop);
                        addSeg(pRight, pBottom);
                    } else {
                        addSeg(pLeft, pBottom);
                        addSeg(pRight, pTop);
                    }
                    break;
                case 6: addSeg(pTop, pBottom); break;
                case 7: addSeg(pLeft, pBottom); break;
                case 8: addSeg(pBottom, pLeft); break;
                case 9: addSeg(pTop, pBottom); break;
                case 10:
                    // Saddle case 2
                    if ((v0 + v1 + v2 + v3) / 4 >= iso) {
                        addSeg(pTop, pRight);
                        addSeg(pBottom, pLeft);
                    } else {
                        addSeg(pTop, pLeft);
                        addSeg(pBottom, pRight);
                    }
                    break;
                case 11: addSeg(pRight, pBottom); break;
                case 12: addSeg(pBottom, pRight); break;
                case 13: addSeg(pTop, pRight); break;
                case 14: addSeg(pLeft, pTop); break;
                default: break;
            }
        }
    }

    // Connect segments into closed loops
    return connectSegmentsToLoops(segments);
}

function connectSegmentsToLoops(segments) {
    if (segments.length === 0) return [];

    const key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
    const map = new Map();

    segments.forEach(([p1, p2]) => {
        const k1 = key(p1);
        const k2 = key(p2);
        if (!map.has(k1)) map.set(k1, []);
        if (!map.has(k2)) map.set(k2, []);
        map.get(k1).push({ point: p1, nextKey: k2, nextPoint: p2, used: false });
        map.get(k2).push({ point: p2, nextKey: k1, nextPoint: p1, used: false });
    });

    const loops = [];

    for (const [startKey, edges] of map.entries()) {
        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];
            if (edge.used) continue;

            const loop = [edge.point];
            edge.used = true;
            let currKey = edge.nextKey;
            let currPoint = edge.nextPoint;

            while (currKey && currKey !== startKey) {
                loop.push(currPoint);
                const candidates = map.get(currKey) || [];
                const nextEdge = candidates.find(e => !e.used);
                if (!nextEdge) break;

                nextEdge.used = true;
                // Mark reverse edge if present
                const revKey = currKey;
                const rev = map.get(nextEdge.nextKey)?.find(e => !e.used && e.nextKey === revKey);
                if (rev) rev.used = true;

                currKey = nextEdge.nextKey;
                currPoint = nextEdge.nextPoint;
            }

            if (loop.length >= 3) {
                loops.push(loop);
            }
        }
    }

    return loops;
}

/**
 * Resamples and displaces contour loops organically while respecting floor safety boundaries.
 */
export function displaceLoops(loops, mask, seed = 1337, width = 15, height = 15) {
    const displacedLoops = [];
    const amp = 0.18; // Max displacement amplitude in tile units

    loops.forEach(loop => {
        if (loop.length < 3) return;

        // Subdivide loop for organic detail
        const densePoints = [];
        for (let i = 0; i < loop.length; i++) {
            const p1 = loop[i];
            const p2 = loop[(i + 1) % loop.length];
            const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
            const steps = Math.max(1, Math.ceil(dist / 0.25));

            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                densePoints.push([
                    p1[0] + t * (p2[0] - p1[0]),
                    p1[1] + t * (p2[1] - p1[1])
                ]);
            }
        }

        const displaced = [];
        const numPoints = densePoints.length;

        for (let i = 0; i < numPoints; i++) {
            const prev = densePoints[(i - 1 + numPoints) % numPoints];
            const curr = densePoints[i];
            const next = densePoints[(i + 1) % numPoints];

            // Tangent and normal vectors
            const tx = next[0] - prev[0];
            const ty = next[1] - prev[1];
            const len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len;
            const ny = tx / len;

            // Compute noise shift
            const noise = organicNoise2D(curr[0], curr[1], seed);
            let dx = curr[0] + nx * noise * amp;
            let dy = curr[1] + ny * noise * amp;

            // Clamp point so it never encroaches into center 60% of floor tiles
            // Center 60% of tile (tx, ty) is [tx + 0.2, tx + 0.8] x [ty + 0.2, ty + 0.8]
            const tileX = Math.floor(dx);
            const tileY = Math.floor(dy);

            if (tileX >= 0 && tileX < width && tileY >= 0 && tileY < height) {
                const isFloor = mask[tileY * width + tileX] === 0;
                if (isFloor) {
                    const minX = tileX + 0.2;
                    const maxX = tileX + 0.8;
                    const minY = tileY + 0.2;
                    const maxY = tileY + 0.8;

                    // If inside center 60%, pull out to closest boundary
                    if (dx > minX && dx < maxX && dy > minY && dy < maxY) {
                        const dMinX = dx - minX;
                        const dMaxX = maxX - dx;
                        const dMinY = dy - minY;
                        const dMaxY = maxY - dy;
                        const minDist = Math.min(dMinX, dMaxX, dMinY, dMaxY);

                        if (minDist === dMinX) dx = minX;
                        else if (minDist === dMaxX) dx = maxX;
                        else if (minDist === dMinY) dy = minY;
                        else dy = maxY;
                    }
                }
            }

            displaced.push([dx, dy]);
        }

        displacedLoops.push(displaced);
    });

    return displacedLoops;
}

/**
 * Converts displaced polygon loops into SVG path string (Catmull-Rom -> Cubic Bezier).
 */
export function toSvgPath(loops) {
    if (!loops || loops.length === 0) return '';

    let d = '';

    loops.forEach(loop => {
        if (loop.length < 3) return;

        const n = loop.length;
        d += `M ${loop[0][0].toFixed(3)} ${loop[0][1].toFixed(3)} `;

        for (let i = 0; i < n; i++) {
            const p0 = loop[(i - 1 + n) % n];
            const p1 = loop[i];
            const p2 = loop[(i + 1) % n];
            const p3 = loop[(i + 2) % n];

            // Catmull-Rom to Cubic Bezier conversion (tension = 1)
            const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
            const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

            d += `C ${cp1x.toFixed(3)} ${cp1y.toFixed(3)}, ${cp2x.toFixed(3)} ${cp2y.toFixed(3)}, ${p2[0].toFixed(3)} ${p2[1].toFixed(3)} `;
        }

        d += 'Z ';
    });

    return d.trim();
}

/**
 * Main API: Returns cached or freshly calculated SVG path for organic void edges.
 */
export function getOrganicVoidPath(boardKey, tiles, boardManager, seed = 1337) {
    if (!tiles || tiles.length === 0) return '';

    const mask = buildVoidMask(tiles, boardManager);

    // Check if mask has any void tiles at all
    let hasVoid = false;
    let hasFloor = false;
    for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 1) hasVoid = true;
        else hasFloor = true;
    }

    if (!hasVoid) return ''; // All floor tiles -> no void path needed

    const maskHash = hashMask(mask);
    const cacheKey = `${boardKey || 'board'}_${seed}_${maskHash}`;

    if (PATH_CACHE.has(cacheKey)) {
        return PATH_CACHE.get(cacheKey);
    }

    let svgPath = '';

    if (!hasFloor) {
        // All void tiles -> full 15x15 rectangle
        svgPath = 'M 0 0 L 15 0 L 15 15 L 0 15 Z';
    } else {
        const rawLoops = marchingSquares(mask, 15, 15);
        const organicLoops = displaceLoops(rawLoops, mask, seed, 15, 15);
        svgPath = toSvgPath(organicLoops);
    }

    // Manage LRU cache
    if (PATH_CACHE.size >= MAX_CACHE_SIZE) {
        const oldestKey = PATH_CACHE.keys().next().value;
        PATH_CACHE.delete(oldestKey);
    }

    PATH_CACHE.set(cacheKey, svgPath);
    return svgPath;
}

/**
 * Clears the path cache (useful for testing or full reset).
 */
export function clearVoidPathCache() {
    PATH_CACHE.clear();
}
