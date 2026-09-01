import * as images from './images';

/**
 * Normalizes terrain subtype/key to its base prefix (e.g., 'terrain_tree_1')
 */
export function getBaseTerrainKey(tile) {
    if (!tile) return null;
    const contains = tile.contains;
    let key = null;
    if (contains && typeof contains === 'object') {
        if (contains.type === 'terrain') key = contains.subtype || contains.key;
        else if (contains.terrainSet) key = contains.terrainSet;
    }
    if (!key && tile.type === 'terrain') key = tile.subtype;
    if (!key && typeof tile.image === 'string') key = tile.image;

    if (!key) return null;
    const str = String(key).trim().toLowerCase();
    for (const prefix of ['terrain_tree_1', 'terrain_naked_trees_4', 'terrain_naked_trees_3', 'terrain_naked_trees_2', 'terrain_naked_trees', 'terrain_naked_mountains_2', 'terrain_naked_mountains', 'terrain_tree_2', 'terrain_tree_3', 'terrain_mountain_1', 'terrain_mountain_2', 'terrain_mountain_3']) {
        if (str.startsWith(prefix)) return prefix;
    }
    return null;
}

/**
 * Computes the 4-bit cardinal autotile bitmask (0..15) for a tile in a grid array.
 * Bit values: Top=1, Right=2, Bottom=4, Left=8
 */
export function getTerrainAutotileMask(tiles, tileIndex) {
    if (!tiles || tileIndex === null || tileIndex === undefined || tileIndex < 0 || tileIndex >= tiles.length) return 0;
    const targetTile = tiles[tileIndex];
    const targetBaseKey = getBaseTerrainKey(targetTile);
    if (!targetBaseKey) return 0;

    const totalTiles = tiles.length;
    const gridWidth = totalTiles === 225 ? 15 : (totalTiles === 2025 ? 45 : 15);

    const col = tileIndex % gridWidth;
    const row = Math.floor(tileIndex / gridWidth);

    const isForestKey = (k) => k && (k.startsWith('terrain_naked_trees') || k.startsWith('terrain_tree') || k.startsWith('naked_trees'));
    const isMountainKey = (k) => k && (k.startsWith('terrain_naked_mountains') || k.startsWith('terrain_mountain') || k.startsWith('naked_mountains'));
    const isMatchingTerrain = (idx) => {
        if (idx < 0 || idx >= totalTiles) return false;
        const neighborBaseKey = getBaseTerrainKey(tiles[idx]);
        if (!neighborBaseKey) return false;
        return neighborBaseKey === targetBaseKey || 
            (isForestKey(neighborBaseKey) && isForestKey(targetBaseKey)) ||
            (isMountainKey(neighborBaseKey) && isMountainKey(targetBaseKey));
    };

    let mask = 0;
    // Top (1)
    if (row > 0 && isMatchingTerrain(tileIndex - gridWidth)) mask |= 1;
    // Right (2)
    if (col < gridWidth - 1 && isMatchingTerrain(tileIndex + 1)) mask |= 2;
    // Bottom (4)
    if (row < gridWidth - 1 && isMatchingTerrain(tileIndex + gridWidth)) mask |= 4;
    // Left (8)
    if (col > 0 && isMatchingTerrain(tileIndex - 1)) mask |= 8;

    return mask;
}

/**
 * Recalculates autotile bitmask and updates image variant for tile at targetIndex and its 4 cardinal neighbors.
 */
export function updateTerrainAutotiles(tiles, targetIndex) {
    if (!tiles || targetIndex === null || targetIndex === undefined || targetIndex < 0 || targetIndex >= tiles.length) return tiles;

    const totalTiles = tiles.length;
    const gridWidth = totalTiles === 225 ? 15 : (totalTiles === 2025 ? 45 : 15);
    const col = targetIndex % gridWidth;
    const row = Math.floor(targetIndex / gridWidth);

    const indicesToUpdate = [targetIndex];
    if (row > 0) indicesToUpdate.push(targetIndex - gridWidth); // Top
    if (col < gridWidth - 1) indicesToUpdate.push(targetIndex + 1); // Right
    if (row < gridWidth - 1) indicesToUpdate.push(targetIndex + gridWidth); // Bottom
    if (col > 0) indicesToUpdate.push(targetIndex - 1); // Left

    indicesToUpdate.forEach(idx => {
        if (idx >= 0 && idx < totalTiles && tiles[idx]) {
            const baseKey = getBaseTerrainKey(tiles[idx]);
            if (baseKey) {
                const mask = getTerrainAutotileMask(tiles, idx);
                const variantKey = `${baseKey}_${mask}`;
                const hasVariantImage = Boolean(images[variantKey]);
                const resolvedImage = hasVariantImage ? images[variantKey] : (images[baseKey] || tiles[idx].image || images.pine_tree_medium || baseKey);
                const seed = (typeof tiles[idx].variantSeed === 'number')
                    ? tiles[idx].variantSeed
                    : ((typeof tiles[idx].contains === 'object' && typeof tiles[idx].contains?.variantSeed === 'number')
                        ? tiles[idx].contains.variantSeed
                        : Math.floor(Math.random() * 3));
                const fTier = (typeof tiles[idx].forestDensityTier === 'number')
                    ? tiles[idx].forestDensityTier
                    : ((typeof tiles[idx].contains === 'object' && typeof tiles[idx].contains?.forestDensityTier === 'number')
                        ? tiles[idx].contains.forestDensityTier
                        : undefined);
                const mTier = (typeof tiles[idx].mountainDensityTier === 'number')
                    ? tiles[idx].mountainDensityTier
                    : ((typeof tiles[idx].contains === 'object' && typeof tiles[idx].contains?.mountainDensityTier === 'number')
                        ? tiles[idx].contains.mountainDensityTier
                        : undefined);
                tiles[idx] = {
                    ...tiles[idx],
                    variantSeed: seed,
                    ...(fTier !== undefined ? { forestDensityTier: fTier } : {}),
                    ...(mTier !== undefined ? { mountainDensityTier: mTier } : {}),
                    image: resolvedImage,
                    contains: (typeof tiles[idx].contains === 'object' && tiles[idx].contains !== null)
                        ? { ...tiles[idx].contains, autotileMask: mask, variantKey, variantSeed: seed, ...(fTier !== undefined ? { forestDensityTier: fTier } : {}), ...(mTier !== undefined ? { mountainDensityTier: mTier } : {}) }
                        : { type: 'terrain', subtype: baseKey, autotileMask: mask, variantKey, variantSeed: seed, ...(fTier !== undefined ? { forestDensityTier: fTier } : {}), ...(mTier !== undefined ? { mountainDensityTier: mTier } : {}) }
                };
            } else {
                delete tiles[idx].forestDensityTier;
                delete tiles[idx].mountainDensityTier;
                delete tiles[idx].autotileMask;
                delete tiles[idx].variantSeed;
                if (tiles[idx].contains && typeof tiles[idx].contains === 'object') {
                    delete tiles[idx].contains.forestDensityTier;
                    delete tiles[idx].contains.mountainDensityTier;
                    delete tiles[idx].contains.autotileMask;
                    delete tiles[idx].contains.variantSeed;
                }
            }
        }
    });

    return tiles;
}

/**
 * Returns the grass base texture image for a given variation seed (0, 1, or 2).
 */
export function getGrassBaseForVariant(seed = 0) {
    const v = Math.abs(Number(seed) || 0) % 3;
    if (v === 1) return images.grass_rocks_base_2;
    if (v === 2) return images.grass_rocks_base_3;
    return images.grass_rocks_base;
}

/**
 * Returns layered tree sprite configurations (src, positioning, zIndex)
 * based on 4-bit cardinal autotile connectivity mask (0..15) and variation seed (0, 1, 2).
 */
export function getTreeLayersForMask(mask = 0, seed = 0) {
    const top = Boolean(mask & 1);
    const right = Boolean(mask & 2);
    const bottom = Boolean(mask & 4);
    const left = Boolean(mask & 8);

    const v = Math.abs(Number(seed) || 0) % 3;
    const layers = [];

    if (v === 1) {
        // Variation 1 (Dense Grove - 11 trees)
        // Back row (deep background, tall & large pines)
        layers.push({ id: 'bg_1', src: images.pine_tree_tall, style: { position: 'absolute', left: '-8%', top: '-24%', width: '60%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'bg_2', src: images.pine_tree_tall, style: { position: 'absolute', left: '26%', top: '-26%', width: '66%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'bg_3', src: images.pine_tree_tall, style: { position: 'absolute', left: '60%', top: '-22%', width: '58%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
        // Mid-back row
        const midCluster1 = images.naked_trees_2 || images.pine_tree_medium;
        layers.push({ id: 'mb_1', src: midCluster1, style: { position: 'absolute', left: '2%', top: '-6%', width: '64%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        layers.push({ id: 'mb_2', src: images.pine_tree_medium, style: { position: 'absolute', left: '50%', top: '-2%', width: '54%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        // Mid-front row
        layers.push({ id: 'mf_1', src: images.pine_tree_small, style: { position: 'absolute', left: '-6%', top: '16%', width: '42%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
        layers.push({ id: 'mf_2', src: images.pine_tree_tall, style: { position: 'absolute', left: '22%', top: '12%', width: '64%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        layers.push({ id: 'mf_3', src: images.pine_tree_medium, style: { position: 'absolute', left: '62%', top: '18%', width: '52%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        // Front row
        layers.push({ id: 'fg_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '4%', top: '34%', width: '56%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        const frontCluster1 = images.naked_trees_2 || images.pine_tree_tall;
        layers.push({ id: 'fg_2', src: frontCluster1, style: { position: 'absolute', left: '34%', top: '32%', width: '62%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        layers.push({ id: 'fg_3', src: images.pine_tree_small, style: { position: 'absolute', left: '68%', top: '42%', width: '40%', height: 'auto', zIndex: 8, pointerEvents: 'none' } });
    } else if (v === 2) {
        // Variation 2 (Dense Wide Canopy - 11 trees)
        // Back row
        layers.push({ id: 'bg_1', src: images.pine_tree_tall, style: { position: 'absolute', left: '12%', top: '-26%', width: '68%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'bg_2', src: images.pine_tree_tall, style: { position: 'absolute', left: '52%', top: '-22%', width: '62%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'bg_3', src: images.pine_tree_small, style: { position: 'absolute', left: '-10%', top: '-14%', width: '44%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
        // Mid-back row
        layers.push({ id: 'mb_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '-4%', top: '2%', width: '58%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        const midCluster2 = images.naked_trees_2 || images.pine_tree_tall;
        layers.push({ id: 'mb_2', src: midCluster2, style: { position: 'absolute', left: '36%', top: '-4%', width: '66%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        // Mid-front row
        layers.push({ id: 'mf_1', src: images.pine_tree_small, style: { position: 'absolute', left: '14%', top: '18%', width: '42%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
        layers.push({ id: 'mf_2', src: images.pine_tree_tall, style: { position: 'absolute', left: '46%', top: '14%', width: '64%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        layers.push({ id: 'mf_3', src: images.pine_tree_medium, style: { position: 'absolute', left: '-8%', top: '24%', width: '52%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        // Front row
        const frontCluster2 = images.naked_trees_2 || images.pine_tree_medium;
        layers.push({ id: 'fg_1', src: frontCluster2, style: { position: 'absolute', left: '8%', top: '34%', width: '62%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        layers.push({ id: 'fg_2', src: images.pine_tree_medium, style: { position: 'absolute', left: '50%', top: '34%', width: '56%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        layers.push({ id: 'fg_3', src: images.pine_tree_small, style: { position: 'absolute', left: '-4%', top: '44%', width: '40%', height: 'auto', zIndex: 8, pointerEvents: 'none' } });
    } else {
        // Variation 0 (Dense Clustered Thicket - 11 trees)
        // Back row
        layers.push({ id: 'bg_1', src: images.pine_tree_tall, style: { position: 'absolute', left: '4%', top: '-24%', width: '66%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'bg_2', src: images.pine_tree_tall, style: { position: 'absolute', left: '44%', top: '-24%', width: '66%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'bg_3', src: images.pine_tree_small, style: { position: 'absolute', left: '74%', top: '-14%', width: '42%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
        // Mid-back row
        const midCluster0 = images.naked_trees_2 || images.pine_tree_tall;
        layers.push({ id: 'mb_1', src: midCluster0, style: { position: 'absolute', left: '20%', top: '-4%', width: '66%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        layers.push({ id: 'mb_2', src: images.pine_tree_medium, style: { position: 'absolute', left: '-8%', top: '4%', width: '54%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        // Mid-front row
        layers.push({ id: 'mf_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '54%', top: '12%', width: '56%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        layers.push({ id: 'mf_2', src: images.pine_tree_small, style: { position: 'absolute', left: '4%', top: '18%', width: '42%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        layers.push({ id: 'mf_3', src: images.pine_tree_tall, style: { position: 'absolute', left: '28%', top: '16%', width: '62%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
        // Front row
        layers.push({ id: 'fg_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '-4%', top: '36%', width: '56%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        const frontCluster0 = images.naked_trees_2 || images.pine_tree_medium;
        layers.push({ id: 'fg_2', src: frontCluster0, style: { position: 'absolute', left: '38%', top: '34%', width: '64%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        layers.push({ id: 'fg_3', src: images.pine_tree_small, style: { position: 'absolute', left: '68%', top: '44%', width: '38%', height: 'auto', zIndex: 8, pointerEvents: 'none' } });
    }

    // Edge neighbor overlap tree overlays
    if (top) {
        layers.push({ id: 'top_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '8%', top: '-32%', width: '52%', height: 'auto', zIndex: 0, pointerEvents: 'none' } });
        layers.push({ id: 'top_2', src: images.pine_tree_tall, style: { position: 'absolute', left: '46%', top: '-34%', width: '56%', height: 'auto', zIndex: 0, pointerEvents: 'none' } });
    }
    if (right) {
        layers.push({ id: 'right_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '64%', top: '4%', width: '52%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
        layers.push({ id: 'right_2', src: images.pine_tree_small, style: { position: 'absolute', left: '66%', top: '38%', width: '42%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
    }
    if (bottom) {
        layers.push({ id: 'bot_1', src: images.pine_tree_tall, style: { position: 'absolute', left: '14%', top: '56%', width: '58%', height: 'auto', zIndex: 9, pointerEvents: 'none' } });
        layers.push({ id: 'bot_2', src: images.pine_tree_medium, style: { position: 'absolute', left: '48%', top: '58%', width: '54%', height: 'auto', zIndex: 9, pointerEvents: 'none' } });
    }
    if (left) {
        layers.push({ id: 'left_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '-24%', top: '4%', width: '52%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
        layers.push({ id: 'left_2', src: images.pine_tree_small, style: { position: 'absolute', left: '-18%', top: '38%', width: '42%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
    }

    return layers;
}

/**
 * Computes forest density tier (0..4) based on distance from center, stamp shape, and seeded jitter.
 * 4: Dense Core, 3: Mid Forest, 2: Light Forest, 1: Sparse Edge, 0: Skip / Ground.
 */
export function getForestDensityTier(dx, dy, rx, ry, shape = 'rect', seed = 0) {
    let normDist;
    if (shape === 'oval') {
        const normX = rx > 0 ? dx / rx : 0;
        const normY = ry > 0 ? dy / ry : 0;
        normDist = Math.sqrt(normX * normX + normY * normY);
        if (normDist > 1.25) return 0;
    } else {
        const normX = rx > 0 ? Math.abs(dx / rx) : 0;
        const normY = ry > 0 ? Math.abs(dy / ry) : 0;
        normDist = Math.max(normX, normY);
        if (normDist > 1.0) return 0;
    }

    const s = Math.abs(Number(seed) || 0);
    const jitter = (((s * 9301 + 49297) % 233280) / 233280) * 0.20 - 0.10;

    // For rectangle shape, keep the entire inner core as Tier 4:
    // S (3x3): center is 4, ring is 3/2
    // M (5x5): inner 3x3 is 4, outer ring is 3/2/1
    // L (7x7): inner 5x5 is 4, outer ring is 3/2/1
    if (shape === 'rect') {
        const maxRadius = Math.max(Math.abs(dx), Math.abs(dy));
        if (maxRadius < rx) {
            return 4;
        } else {
            const edgeVal = (1.0 - normDist) + jitter;
            if (edgeVal >= -0.02) return 3;
            if (edgeVal >= -0.06) return 2;
            return 1;
        }
    } else {
        if (normDist <= 0.65 + jitter) return 4;
        if (normDist <= 0.90 + jitter) return 3;
        if (normDist <= 1.10 + jitter) return 2;
        if (normDist <= 1.25) return 1;
        return 0;
    }
}

/**
 * Returns layered tree sprite configurations based on density tier (1..4), seed, mask, and tree type.
 */
export function getTreeLayersForDensity(tier = 4, seed = 0, mask = 0, treeType = 'terrain_naked_trees') {
    if (tier <= 0) return [];
    if (tier >= 4) return getTreeLayersForMask(mask, seed);

    const v = Math.abs(Number(seed) || 0) % 3;
    const layers = [];

    if (tier === 3) {
        // Mid Forest: 7-8 trees per tile with mix of large and small
        if (v === 1) {
            layers.push({ id: 'lg_back_1', src: images.pine_tree_tall, style: { position: 'absolute', left: '26%', top: '-22%', width: '66%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'sm_back_2', src: images.pine_tree_small, style: { position: 'absolute', left: '-4%', top: '-10%', width: '42%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
            layers.push({ id: 'med_back_3', src: images.pine_tree_medium, style: { position: 'absolute', left: '56%', top: '-8%', width: '50%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
            const midCluster3 = images.naked_trees_2 || images.pine_tree_tall;
            layers.push({ id: 'lg_mid_1', src: midCluster3, style: { position: 'absolute', left: '10%', top: '8%', width: '62%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
            layers.push({ id: 'sm_mid_2', src: images.pine_tree_small, style: { position: 'absolute', left: '56%', top: '16%', width: '40%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
            layers.push({ id: 'med_front_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '26%', top: '34%', width: '56%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front_2', src: images.pine_tree_small, style: { position: 'absolute', left: '-2%', top: '42%', width: '38%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front_3', src: images.pine_tree_small, style: { position: 'absolute', left: '62%', top: '44%', width: '38%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        } else if (v === 2) {
            layers.push({ id: 'lg_back_1', src: images.pine_tree_tall, style: { position: 'absolute', left: '12%', top: '-22%', width: '68%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'med_back_2', src: images.pine_tree_medium, style: { position: 'absolute', left: '50%', top: '-10%', width: '52%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
            layers.push({ id: 'med_mid_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '-6%', top: '10%', width: '54%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
            layers.push({ id: 'lg_mid_2', src: images.pine_tree_tall, style: { position: 'absolute', left: '38%', top: '8%', width: '62%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
            layers.push({ id: 'sm_mid_3', src: images.pine_tree_small, style: { position: 'absolute', left: '14%', top: '22%', width: '40%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
            const clusterSrc2 = images.naked_trees_2 || images.pine_tree_medium;
            layers.push({ id: 'lg_front_1', src: clusterSrc2, style: { position: 'absolute', left: '28%', top: '34%', width: '60%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front_2', src: images.pine_tree_small, style: { position: 'absolute', left: '-4%', top: '44%', width: '38%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        } else {
            layers.push({ id: 'lg_back_1', src: images.pine_tree_tall, style: { position: 'absolute', left: '18%', top: '-22%', width: '66%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'med_back_2', src: images.pine_tree_medium, style: { position: 'absolute', left: '58%', top: '-8%', width: '50%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
            layers.push({ id: 'sm_back_3', src: images.pine_tree_small, style: { position: 'absolute', left: '-8%', top: '-6%', width: '42%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
            layers.push({ id: 'med_mid_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '2%', top: '10%', width: '54%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
            const clusterSrc3 = images.naked_trees_2 || images.pine_tree_medium;
            layers.push({ id: 'lg_mid_2', src: clusterSrc3, style: { position: 'absolute', left: '38%', top: '12%', width: '60%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front_1', src: images.pine_tree_small, style: { position: 'absolute', left: '10%', top: '40%', width: '40%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
            layers.push({ id: 'med_front_2', src: images.pine_tree_medium, style: { position: 'absolute', left: '46%', top: '36%', width: '54%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
        }

        // Overlaps for Tier 3
        if (mask & 1) layers.push({ id: 'top_mid', src: images.pine_tree_medium, style: { position: 'absolute', left: '24%', top: '-26%', width: '48%', height: 'auto', zIndex: 0, pointerEvents: 'none' } });
        if (mask & 2) layers.push({ id: 'right_mid', src: images.pine_tree_small, style: { position: 'absolute', left: '64%', top: '16%', width: '40%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        if (mask & 4) layers.push({ id: 'bot_mid', src: images.pine_tree_medium, style: { position: 'absolute', left: '28%', top: '56%', width: '50%', height: 'auto', zIndex: 8, pointerEvents: 'none' } });
        if (mask & 8) layers.push({ id: 'left_mid', src: images.pine_tree_small, style: { position: 'absolute', left: '-20%', top: '16%', width: '40%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });

    } else if (tier === 2) {
        // Light Forest: 4-5 trees per tile (1-2 large + 2-3 medium/small)
        if (v === 1) {
            layers.push({ id: 'lg_back', src: images.pine_tree_tall, style: { position: 'absolute', left: '30%', top: '-16%', width: '62%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'med_mid', src: images.pine_tree_medium, style: { position: 'absolute', left: '-2%', top: '10%', width: '50%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
            layers.push({ id: 'sm_mid', src: images.pine_tree_small, style: { position: 'absolute', left: '52%', top: '16%', width: '40%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front', src: images.pine_tree_small, style: { position: 'absolute', left: '20%', top: '38%', width: '42%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        } else if (v === 2) {
            layers.push({ id: 'lg_mid', src: images.pine_tree_tall, style: { position: 'absolute', left: '12%', top: '-10%', width: '64%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'med_right', src: images.pine_tree_medium, style: { position: 'absolute', left: '46%', top: '12%', width: '50%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front_1', src: images.pine_tree_small, style: { position: 'absolute', left: '6%', top: '36%', width: '38%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front_2', src: images.pine_tree_small, style: { position: 'absolute', left: '50%', top: '40%', width: '38%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
        } else {
            layers.push({ id: 'med_left', src: images.pine_tree_medium, style: { position: 'absolute', left: '2%', top: '2%', width: '52%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
            layers.push({ id: 'lg_right', src: images.pine_tree_tall, style: { position: 'absolute', left: '36%', top: '-12%', width: '60%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front_1', src: images.pine_tree_small, style: { position: 'absolute', left: '12%', top: '38%', width: '40%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
            layers.push({ id: 'sm_front_2', src: images.pine_tree_small, style: { position: 'absolute', left: '54%', top: '36%', width: '38%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        }

    } else if (tier === 1) {
        // Sparse Edge: 2-3 trees with varied sizes for natural edge taper
        if (v === 1) {
            layers.push({ id: 'lg_edge', src: images.pine_tree_medium, style: { position: 'absolute', left: '14%', top: '4%', width: '56%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
            layers.push({ id: 'sm_edge', src: images.pine_tree_small, style: { position: 'absolute', left: '48%', top: '34%', width: '38%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        } else if (v === 2) {
            const clusterSrc = images.naked_trees_2 || images.pine_tree_medium;
            layers.push({ id: 'cluster_edge', src: clusterSrc, style: { position: 'absolute', left: '12%', top: '8%', width: '58%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
            layers.push({ id: 'sm_edge', src: images.pine_tree_small, style: { position: 'absolute', left: '54%', top: '38%', width: '36%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        } else {
            layers.push({ id: 'med_edge', src: images.pine_tree_tall, style: { position: 'absolute', left: '22%', top: '-6%', width: '58%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
            layers.push({ id: 'sm_edge', src: images.pine_tree_small, style: { position: 'absolute', left: '4%', top: '30%', width: '38%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        }
    }

    return layers;
}

/**
 * Computes mountain density tier (0..4) based on distance from center, stamp shape, and seeded jitter.
 */
export function getMountainDensityTier(dx, dy, rx, ry, shape = 'rect', seed = 0) {
    return getForestDensityTier(dx, dy, rx, ry, shape, seed);
}

/**
 * Returns layered mountain sprite configurations based on autotile mask and variation seed for Tier 4 Dense Core.
 * Exclusively uses pure grey rocky stone mountain peaks (terrain_mountain_1 and terrain_mountain_2).
 */
export function getMountainLayersForMask(mask = 0, seed = 0) {
    const top = Boolean(mask & 1);
    const right = Boolean(mask & 2);
    const bottom = Boolean(mask & 4);
    const left = Boolean(mask & 8);

    const v = Math.abs(Number(seed) || 0) % 3;
    const layers = [];

    const peak1 = images.terrain_mountain_1;
    const peak2 = images.terrain_mountain_2;

    if (v === 1) {
        // Variation 1: Jagged alpine massif
        layers.push({ id: 'mt_bg_1', src: peak1, style: { position: 'absolute', left: '-6%', top: '-28%', width: '82%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'mt_bg_2', src: peak2, style: { position: 'absolute', left: '36%', top: '-24%', width: '76%', height: 'auto', transform: 'scaleX(-1)', zIndex: 2, pointerEvents: 'none' } });
        layers.push({ id: 'mt_mid_1', src: peak2, style: { position: 'absolute', left: '6%', top: '0%', width: '85%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
        layers.push({ id: 'mt_fg_1', src: peak1, style: { position: 'absolute', left: '-10%', top: '24%', width: '68%', height: 'auto', transform: 'scaleX(-1)', zIndex: 6, pointerEvents: 'none' } });
        layers.push({ id: 'mt_fg_2', src: peak1, style: { position: 'absolute', left: '42%', top: '26%', width: '68%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
    } else if (v === 2) {
        // Variation 2: Wide panoramic ridge
        layers.push({ id: 'mt_bg_1', src: peak2, style: { position: 'absolute', left: '18%', top: '-30%', width: '86%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'mt_bg_2', src: peak1, style: { position: 'absolute', left: '-12%', top: '-20%', width: '74%', height: 'auto', transform: 'scaleX(-1)', zIndex: 2, pointerEvents: 'none' } });
        layers.push({ id: 'mt_mid_1', src: peak1, style: { position: 'absolute', left: '-2%', top: '4%', width: '78%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
        layers.push({ id: 'mt_mid_2', src: peak2, style: { position: 'absolute', left: '42%', top: '6%', width: '72%', height: 'auto', transform: 'scaleX(-1)', zIndex: 5, pointerEvents: 'none' } });
        layers.push({ id: 'mt_fg_1', src: peak2, style: { position: 'absolute', left: '14%', top: '28%', width: '76%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
    } else {
        // Variation 0: Towering central fortress peaks
        layers.push({ id: 'mt_bg_1', src: peak1, style: { position: 'absolute', left: '12%', top: '-30%', width: '88%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'mt_bg_2', src: peak2, style: { position: 'absolute', left: '48%', top: '-20%', width: '70%', height: 'auto', transform: 'scaleX(-1)', zIndex: 2, pointerEvents: 'none' } });
        layers.push({ id: 'mt_mid_1', src: peak2, style: { position: 'absolute', left: '-8%', top: '2%', width: '84%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
        layers.push({ id: 'mt_fg_1', src: peak1, style: { position: 'absolute', left: '0%', top: '26%', width: '72%', height: 'auto', transform: 'scaleX(-1)', zIndex: 6, pointerEvents: 'none' } });
        layers.push({ id: 'mt_fg_2', src: peak2, style: { position: 'absolute', left: '34%', top: '28%', width: '76%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
    }

    // Ridge connector overlaps across neighbor borders
    if (top) {
        layers.push({ id: 'mt_top_1', src: peak1, style: { position: 'absolute', left: '12%', top: '-38%', width: '74%', height: 'auto', zIndex: 0, pointerEvents: 'none' } });
        layers.push({ id: 'mt_top_2', src: peak2, style: { position: 'absolute', left: '46%', top: '-36%', width: '70%', height: 'auto', zIndex: 0, pointerEvents: 'none' } });
    }
    if (right) {
        layers.push({ id: 'mt_right_1', src: peak2, style: { position: 'absolute', left: '58%', top: '4%', width: '68%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        layers.push({ id: 'mt_right_2', src: peak1, style: { position: 'absolute', left: '56%', top: '34%', width: '64%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
    }
    if (bottom) {
        layers.push({ id: 'mt_bot_1', src: peak1, style: { position: 'absolute', left: '10%', top: '50%', width: '78%', height: 'auto', zIndex: 8, pointerEvents: 'none' } });
        layers.push({ id: 'mt_bot_2', src: peak2, style: { position: 'absolute', left: '44%', top: '52%', width: '72%', height: 'auto', zIndex: 9, pointerEvents: 'none' } });
    }
    if (left) {
        layers.push({ id: 'mt_left_1', src: peak2, style: { position: 'absolute', left: '-30%', top: '4%', width: '68%', height: 'auto', transform: 'scaleX(-1)', zIndex: 3, pointerEvents: 'none' } });
        layers.push({ id: 'mt_left_2', src: peak1, style: { position: 'absolute', left: '-26%', top: '34%', width: '64%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
    }

    return layers;
}

/**
 * Returns layered mountain sprite configurations based on density tier (1..4), seed, mask, and mountain type.
 */
export function getMountainLayersForDensity(tier = 4, seed = 0, mask = 0, mountainType = 'terrain_mountain_1') {
    if (tier <= 0) return [];
    if (tier >= 4) return getMountainLayersForMask(mask, seed);

    const v = Math.abs(Number(seed) || 0) % 3;
    const layers = [];

    const peak1 = images.terrain_mountain_1;
    const peak2 = images.terrain_mountain_2;

    if (tier === 3) {
        // Mid Mountains: 3-4 peaks per tile + partial neighbor overlaps
        if (v === 1) {
            layers.push({ id: 'mt_bg_1', src: peak1, style: { position: 'absolute', left: '16%', top: '-24%', width: '80%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'mt_mid_1', src: peak2, style: { position: 'absolute', left: '-6%', top: '4%', width: '72%', height: 'auto', transform: 'scaleX(-1)', zIndex: 3, pointerEvents: 'none' } });
            layers.push({ id: 'mt_fg_1', src: peak2, style: { position: 'absolute', left: '32%', top: '26%', width: '74%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
        } else if (v === 2) {
            layers.push({ id: 'mt_bg_1', src: peak2, style: { position: 'absolute', left: '8%', top: '-26%', width: '84%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'mt_mid_1', src: peak1, style: { position: 'absolute', left: '40%', top: '2%', width: '74%', height: 'auto', transform: 'scaleX(-1)', zIndex: 4, pointerEvents: 'none' } });
            layers.push({ id: 'mt_fg_1', src: peak1, style: { position: 'absolute', left: '-4%', top: '24%', width: '72%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
        } else {
            layers.push({ id: 'mt_bg_1', src: peak2, style: { position: 'absolute', left: '26%', top: '-24%', width: '82%', height: 'auto', transform: 'scaleX(-1)', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'mt_mid_1', src: peak1, style: { position: 'absolute', left: '-8%', top: '6%', width: '74%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
            layers.push({ id: 'mt_fg_1', src: peak1, style: { position: 'absolute', left: '22%', top: '28%', width: '76%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
        }

        // Overlaps for Tier 3
        if (mask & 1) layers.push({ id: 'mt_top', src: peak1, style: { position: 'absolute', left: '20%', top: '-34%', width: '68%', height: 'auto', zIndex: 0, pointerEvents: 'none' } });
        if (mask & 2) layers.push({ id: 'mt_right', src: peak2, style: { position: 'absolute', left: '56%', top: '16%', width: '62%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        if (mask & 4) layers.push({ id: 'mt_bot', src: peak2, style: { position: 'absolute', left: '22%', top: '48%', width: '68%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        if (mask & 8) layers.push({ id: 'mt_left', src: peak1, style: { position: 'absolute', left: '-26%', top: '16%', width: '62%', height: 'auto', transform: 'scaleX(-1)', zIndex: 2, pointerEvents: 'none' } });

    } else if (tier === 2) {
        // Foothills: 2 peaks per tile
        if (v === 1) {
            layers.push({ id: 'mt_bg', src: peak1, style: { position: 'absolute', left: '20%', top: '-18%', width: '76%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'mt_fg', src: peak2, style: { position: 'absolute', left: '-4%', top: '22%', width: '68%', height: 'auto', transform: 'scaleX(-1)', zIndex: 4, pointerEvents: 'none' } });
        } else if (v === 2) {
            layers.push({ id: 'mt_bg', src: peak2, style: { position: 'absolute', left: '-6%', top: '-14%', width: '78%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'mt_fg', src: peak1, style: { position: 'absolute', left: '34%', top: '24%', width: '70%', height: 'auto', transform: 'scaleX(-1)', zIndex: 4, pointerEvents: 'none' } });
        } else {
            layers.push({ id: 'mt_bg', src: peak1, style: { position: 'absolute', left: '12%', top: '-12%', width: '78%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
            layers.push({ id: 'mt_fg', src: peak2, style: { position: 'absolute', left: '26%', top: '26%', width: '72%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
        }

    } else if (tier === 1) {
        // Sparse Outcrop: 1 peak
        if (v === 1) {
            layers.push({ id: 'mt_single', src: peak2, style: { position: 'absolute', left: '14%', top: '8%', width: '72%', height: 'auto', transform: 'scaleX(-1)', zIndex: 3, pointerEvents: 'none' } });
        } else if (v === 2) {
            layers.push({ id: 'mt_single', src: peak2, style: { position: 'absolute', left: '10%', top: '10%', width: '76%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        } else {
            layers.push({ id: 'mt_single', src: peak1, style: { position: 'absolute', left: '16%', top: '6%', width: '74%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        }
    }

    return layers;
}

/**
 * Applies a forest density stamp centered at centerIdx on a grid array.
 */
export function applyForestStamp(tiles, centerIdx, options = {}) {
    if (!tiles || centerIdx === null || centerIdx === undefined || centerIdx < 0 || centerIdx >= tiles.length) return tiles;
    const totalTiles = tiles.length;
    const gridWidth = totalTiles === 225 ? 15 : (totalTiles === 2025 ? 45 : 15);
    const size = options.size || 'M'; // 'S' | 'M' | 'L'
    const shape = options.shape || 'rect'; // 'rect' | 'oval'
    const treeType = options.treeType || 'terrain_naked_trees';

    // Radii in tiles: S -> 1 (3x3), M -> 2 (5x5), L -> 3 (7x7)
    let rx = 2;
    let ry = 2;
    if (size === 'S') { rx = 1; ry = 1; }
    else if (size === 'L') { rx = 3; ry = 3; }

    const cx = centerIdx % gridWidth;
    const cy = Math.floor(centerIdx / gridWidth);

    const updatedTiles = tiles.map(t => ({ ...t }));
    const modifiedIndices = [];

    for (let dy = -ry; dy <= ry; dy++) {
        for (let dx = -rx; dx <= rx; dx++) {
            const tx = cx + dx;
            const ty = cy + dy;
            if (tx < 0 || tx >= gridWidth || ty < 0 || ty >= Math.floor(totalTiles / gridWidth)) continue;
            const idx = ty * gridWidth + tx;
            if (idx < 0 || idx >= totalTiles || !updatedTiles[idx]) continue;

            const seed = (idx * 17 + tx * 31 + ty * 59 + centerIdx * 13) % 100000;
            const tier = getForestDensityTier(dx, dy, rx, ry, shape, seed);
            if (tier <= 0) continue; // skipped or outside oval

            updatedTiles[idx] = {
                ...updatedTiles[idx],
                color: null,
                forestDensityTier: tier,
                variantSeed: seed % 3,
                contains: {
                    ...(typeof updatedTiles[idx].contains === 'object' && updatedTiles[idx].contains !== null ? updatedTiles[idx].contains : {}),
                    type: 'terrain',
                    subtype: treeType,
                    forestDensityTier: tier,
                    variantSeed: seed % 3
                },
                image: treeType
            };
            modifiedIndices.push(idx);
        }
    }

    // Recalculate autotiles for all modified tiles and their adjacent neighbors
    const neighborsToUpdate = new Set();
    modifiedIndices.forEach(idx => {
        const c = idx % gridWidth;
        const r = Math.floor(idx / gridWidth);
        neighborsToUpdate.add(idx);
        if (r > 0) neighborsToUpdate.add(idx - gridWidth);
        if (c < gridWidth - 1) neighborsToUpdate.add(idx + 1);
        if (r < Math.floor(totalTiles / gridWidth) - 1) neighborsToUpdate.add(idx + gridWidth);
        if (c > 0) neighborsToUpdate.add(idx - 1);
    });

    neighborsToUpdate.forEach(idx => {
        updateTerrainAutotiles(updatedTiles, idx);
    });

    return updatedTiles;
}

/**
 * Applies a mountain density stamp centered at centerIdx on a grid array.
 */
export function applyMountainStamp(tiles, centerIdx, options = {}) {
    if (!tiles || centerIdx === null || centerIdx === undefined || centerIdx < 0 || centerIdx >= tiles.length) return tiles;
    const totalTiles = tiles.length;
    const gridWidth = totalTiles === 225 ? 15 : (totalTiles === 2025 ? 45 : 15);
    const size = options.size || 'M'; // 'S' | 'M' | 'L'
    const shape = options.shape || 'rect'; // 'rect' | 'oval'
    const mountainType = options.mountainType || 'terrain_mountain_1';

    // Radii in tiles: S -> 1 (3x3), M -> 2 (5x5), L -> 3 (7x7)
    let rx = 2;
    let ry = 2;
    if (size === 'S') { rx = 1; ry = 1; }
    else if (size === 'L') { rx = 3; ry = 3; }

    const cx = centerIdx % gridWidth;
    const cy = Math.floor(centerIdx / gridWidth);

    const updatedTiles = tiles.map(t => ({ ...t }));
    const modifiedIndices = [];

    for (let dy = -ry; dy <= ry; dy++) {
        for (let dx = -rx; dx <= rx; dx++) {
            const tx = cx + dx;
            const ty = cy + dy;
            if (tx < 0 || tx >= gridWidth || ty < 0 || ty >= Math.floor(totalTiles / gridWidth)) continue;
            const idx = ty * gridWidth + tx;
            if (idx < 0 || idx >= totalTiles || !updatedTiles[idx]) continue;

            const seed = (idx * 19 + tx * 37 + ty * 61 + centerIdx * 17) % 100000;
            const tier = getMountainDensityTier(dx, dy, rx, ry, shape, seed);
            if (tier <= 0) continue; // skipped or outside oval

            updatedTiles[idx] = {
                ...updatedTiles[idx],
                color: null,
                mountainDensityTier: tier,
                variantSeed: seed % 3,
                contains: {
                    ...(typeof updatedTiles[idx].contains === 'object' && updatedTiles[idx].contains !== null ? updatedTiles[idx].contains : {}),
                    type: 'terrain',
                    subtype: mountainType,
                    mountainDensityTier: tier,
                    variantSeed: seed % 3
                },
                image: mountainType
            };
            modifiedIndices.push(idx);
        }
    }

    // Recalculate autotiles for all modified tiles and their adjacent neighbors
    const neighborsToUpdate = new Set();
    modifiedIndices.forEach(idx => {
        const c = idx % gridWidth;
        const r = Math.floor(idx / gridWidth);
        neighborsToUpdate.add(idx);
        if (r > 0) neighborsToUpdate.add(idx - gridWidth);
        if (c < gridWidth - 1) neighborsToUpdate.add(idx + 1);
        if (r < Math.floor(totalTiles / gridWidth) - 1) neighborsToUpdate.add(idx + gridWidth);
        if (c > 0) neighborsToUpdate.add(idx - 1);
    });

    neighborsToUpdate.forEach(idx => {
        updateTerrainAutotiles(updatedTiles, idx);
    });

    return updatedTiles;
}

