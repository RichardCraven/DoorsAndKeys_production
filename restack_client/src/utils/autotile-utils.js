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
    for (const prefix of ['terrain_tree_1', 'terrain_naked_trees', 'terrain_tree_2', 'terrain_tree_3', 'terrain_mountain_1', 'terrain_mountain_2', 'terrain_mountain_3']) {
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

    const isMatchingTerrain = (idx) => {
        if (idx < 0 || idx >= totalTiles) return false;
        const neighborBaseKey = getBaseTerrainKey(tiles[idx]);
        return neighborBaseKey === targetBaseKey;
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
                const resolvedImage = images[variantKey] || variantKey;
                const seed = (typeof tiles[idx].variantSeed === 'number')
                    ? tiles[idx].variantSeed
                    : ((typeof tiles[idx].contains === 'object' && typeof tiles[idx].contains?.variantSeed === 'number')
                        ? tiles[idx].contains.variantSeed
                        : Math.floor(Math.random() * 3));
                tiles[idx] = {
                    ...tiles[idx],
                    variantSeed: seed,
                    image: resolvedImage,
                    contains: (typeof tiles[idx].contains === 'object' && tiles[idx].contains !== null)
                        ? { ...tiles[idx].contains, autotileMask: mask, variantKey, variantSeed: seed }
                        : { type: 'terrain', subtype: baseKey, autotileMask: mask, variantKey, variantSeed: seed }
                };
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
        // Variation 1 (Layout B - 5 Pine Trees Staggered Grove)
        layers.push({ id: 'tall_back_right', src: images.pine_tree_tall, style: { position: 'absolute', left: '46%', top: '-14%', width: '46%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'tall_back_left', src: images.pine_tree_tall, style: { position: 'absolute', left: '8%', top: '-8%', width: '44%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
        layers.push({ id: 'med_center', src: images.pine_tree_medium, style: { position: 'absolute', left: '28%', top: '18%', width: '42%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
        layers.push({ id: 'med_front_right', src: images.pine_tree_medium, style: { position: 'absolute', left: '54%', top: '36%', width: '40%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
        layers.push({ id: 'small_front_left', src: images.pine_tree_small, style: { position: 'absolute', left: '6%', top: '38%', width: '34%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
    } else if (v === 2) {
        // Variation 2 (Layout C - 5 Pine Trees Wide Canopy)
        layers.push({ id: 'tall_center', src: images.pine_tree_tall, style: { position: 'absolute', left: '28%', top: '-16%', width: '50%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'med_outer_left', src: images.pine_tree_medium, style: { position: 'absolute', left: '-4%', top: '8%', width: '42%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        layers.push({ id: 'med_outer_right', src: images.pine_tree_medium, style: { position: 'absolute', left: '56%', top: '10%', width: '42%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        layers.push({ id: 'small_mid_left', src: images.pine_tree_small, style: { position: 'absolute', left: '14%', top: '34%', width: '36%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
        layers.push({ id: 'small_mid_right', src: images.pine_tree_small, style: { position: 'absolute', left: '46%', top: '38%', width: '36%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
    } else {
        // Variation 0 (Layout A - 5 Pine Trees Dense Cluster)
        layers.push({ id: 'tall_back', src: images.pine_tree_tall, style: { position: 'absolute', left: '24%', top: '-12%', width: '48%', height: 'auto', zIndex: 1, pointerEvents: 'none' } });
        layers.push({ id: 'med_left', src: images.pine_tree_medium, style: { position: 'absolute', left: '4%', top: '14%', width: '42%', height: 'auto', zIndex: 3, pointerEvents: 'none' } });
        layers.push({ id: 'med_right', src: images.pine_tree_medium, style: { position: 'absolute', left: '52%', top: '16%', width: '44%', height: 'auto', zIndex: 4, pointerEvents: 'none' } });
        layers.push({ id: 'small_front_left', src: images.pine_tree_small, style: { position: 'absolute', left: '18%', top: '40%', width: '32%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
        layers.push({ id: 'small_front_right', src: images.pine_tree_small, style: { position: 'absolute', left: '50%', top: '42%', width: '34%', height: 'auto', zIndex: 6, pointerEvents: 'none' } });
    }

    // Edge neighbor overlap tree overlays
    if (top) {
        layers.push({ id: 'top_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '16%', top: '-22%', width: '38%', height: 'auto', zIndex: 0, pointerEvents: 'none' } });
        layers.push({ id: 'top_2', src: images.pine_tree_medium, style: { position: 'absolute', left: '46%', top: '-22%', width: '38%', height: 'auto', zIndex: 0, pointerEvents: 'none' } });
    }

    if (right) {
        layers.push({ id: 'right_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '68%', top: '12%', width: '38%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
        layers.push({ id: 'right_2', src: images.pine_tree_small, style: { position: 'absolute', left: '66%', top: '44%', width: '35%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
    }

    if (bottom) {
        layers.push({ id: 'bot_1', src: images.pine_tree_tall, style: { position: 'absolute', left: '22%', top: '64%', width: '38%', height: 'auto', zIndex: 7, pointerEvents: 'none' } });
        layers.push({ id: 'bot_2', src: images.pine_tree_small, style: { position: 'absolute', left: '52%', top: '66%', width: '34%', height: 'auto', zIndex: 8, pointerEvents: 'none' } });
    }

    if (left) {
        layers.push({ id: 'left_1', src: images.pine_tree_medium, style: { position: 'absolute', left: '-18%', top: '12%', width: '38%', height: 'auto', zIndex: 2, pointerEvents: 'none' } });
        layers.push({ id: 'left_2', src: images.pine_tree_small, style: { position: 'absolute', left: '-12%', top: '44%', width: '35%', height: 'auto', zIndex: 5, pointerEvents: 'none' } });
    }

    return layers;
}
