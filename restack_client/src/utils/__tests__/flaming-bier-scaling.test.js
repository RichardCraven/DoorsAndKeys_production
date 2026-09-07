describe('Flaming Bier Proximity Scaling', () => {
    test('isBierTile matches enemy spawn point and narrative tiles', () => {
        const isBierTileCheck = (tile) => {
            if (!tile) return false;
            const contains = tile.contains || {};
            const type = contains.type || tile.type;
            const subtype = contains.subtype || tile.subtype;
            const sKey = String(subtype || type || tile.image || '').toLowerCase();
            const isEnemySpawnTile = !!(tile.isEnemySpawn || contains.isEnemySpawn || tile.originalMarker === 'narrative');
            const isNarrative = (type === 'narrative' || type === 'narrative_visited' || isEnemySpawnTile);
            return isNarrative || isEnemySpawnTile || sKey.includes('narrative') || sKey.includes('flaming_bier') || sKey.includes('bier');
        };

        expect(isBierTileCheck({ isEnemySpawn: true })).toBe(true);
        expect(isBierTileCheck({ contains: { type: 'narrative' } })).toBe(true);
        expect(isBierTileCheck({ contains: { type: 'narrative_visited' } })).toBe(true);
        expect(isBierTileCheck({ contains: { subtype: 'flaming_bier' } })).toBe(true);
        expect(isBierTileCheck({ contains: { type: 'hut' } })).toBe(false);
    });

    test('adjacency check evaluates true for adjacent tile positions', () => {
        const checkAdjacency = (pIdx, tIdx) => {
            const pRow = Math.floor(pIdx / 15);
            const pCol = pIdx % 15;
            const tRow = Math.floor(tIdx / 15);
            const tCol = tIdx % 15;
            return Math.abs(tRow - pRow) <= 1 && Math.abs(tCol - pCol) <= 1;
        };

        const playerIdx = 112; // (7, 7)
        expect(checkAdjacency(playerIdx, 112)).toBe(true); // On tile
        expect(checkAdjacency(playerIdx, 113)).toBe(true); // Right adjacent
        expect(checkAdjacency(playerIdx, 97)).toBe(true);  // Top adjacent
        expect(checkAdjacency(playerIdx, 128)).toBe(true); // Bottom-right diagonal
        expect(checkAdjacency(playerIdx, 115)).toBe(false); // 3 tiles away
    });
});
