import { resetDungeonInstanceMeta } from '../../utils/session-handler';

describe('Discovered Points of Interest Minimap & Instance Reset', () => {
    test('resetDungeonInstanceMeta purges all holdover POI discovery metadata', () => {
        const meta = {
            dungeonId: 'instance_9999',
            discoveredGenerators: { 'dungeon_1_0_12': { orientation: 'A' } },
            discoveredPOIs: { 'dungeon_1_0_12': true },
            discoveredVendors: { 'dungeon_1_0_15': true },
            discoveredAlchemist: true,
            activatedGenerators: { 'dungeon_1_A_0_12': { owned: true } },
            minimapIndicators: { '12': 'generator' },
            breadcrumbTrail: ['dungeon_1_A_0_0_0'],
            visitedBoards: { '0': true },
            food: 200,
            gold: 50
        };

        resetDungeonInstanceMeta(meta);

        expect(meta.dungeonId).toBeUndefined();
        expect(meta.discoveredGenerators).toBeUndefined();
        expect(meta.discoveredPOIs).toBeUndefined();
        expect(meta.discoveredVendors).toBeUndefined();
        expect(meta.discoveredAlchemist).toBeUndefined();
        expect(meta.activatedGenerators).toBeUndefined();
        expect(meta.minimapIndicators).toBeUndefined();
        expect(meta.breadcrumbTrail).toBeUndefined();
        expect(meta.visitedBoards).toBeUndefined();

        // Standard resources should be reset to default initial state
        expect(meta.food).toBe(55);
        expect(meta.gold).toBe(50);
    });

    test('minimap POI discovery filter hides unexplored POIs and reveals discovered POIs', () => {
        const currentLevelId = 'dungeon_1';
        const currentOrientation = 'A';
        const boardIndex = 0;

        const unexploredGenTile = {
            id: 12,
            color: 'black',
            generatorData: { type: 'sawmill' },
            location: [0, 12]
        };

        const discoveredGenTile = {
            id: 15,
            color: '#1a202c', // Revealed tile color
            generatorData: { type: 'quarry' },
            location: [1, 0]
        };

        const playerBuiltOutpostTile = {
            id: 20,
            color: 'black',
            building: 'outpost',
            placedBy: 'player',
            location: [1, 5]
        };

        const boardTiles = [unexploredGenTile, discoveredGenTile, playerBuiltOutpostTile];
        const mergedByTile = new Map();
        const mockBreadcrumbs = new Set();
        const meta = {};

        boardTiles.forEach((tile) => {
            const contains = tile.contains;
            const containsType = typeof contains === 'object' && contains ? (contains.type || contains.subtype) : contains;
            const containsSubtype = typeof contains === 'object' && contains ? contains.subtype : null;
            const bldg = tile.building || contains?.building || tile.containsBuilding;
            const img = tile.image || contains?.image || '';

            const keysToCheck = [containsSubtype, containsType, bldg, img].filter(Boolean).map(k => String(k).toLowerCase());
            const isOutpost = keysToCheck.some(k => k === 'outpost' || k.includes('outpost'));

            const tRow = Array.isArray(tile.location) ? tile.location[0] : Math.floor(Number(tile.id) / 15);
            const tCol = Array.isArray(tile.location) ? tile.location[1] : (Number(tile.id) % 15);
            const crumbKey = `${currentLevelId}:${currentOrientation}:${boardIndex}:${tRow}:${tCol}`;
            const isSteppedOn = mockBreadcrumbs.has(crumbKey);
            const isTileRevealed = (tile.color && tile.color !== 'black') || !!tile.discovered || !!tile.revealed;
            const containsObj = typeof contains === 'object' && contains !== null ? contains : null;
            const isPlayerBuilt = (containsObj && (containsObj.placedBy === 'player' || containsObj.ownerId)) || tile.placedBy === 'player';

            const poiKey = `${currentLevelId}_${boardIndex}_${tile.id}`;
            const isRecordedDiscovered = !!(
                (meta?.discoveredGenerators && meta.discoveredGenerators[poiKey]) ||
                (meta?.discoveredPOIs && meta.discoveredPOIs[poiKey])
            );

            const isDiscovered = isPlayerBuilt || isTileRevealed || isSteppedOn || isRecordedDiscovered;

            const isGen = !!tile.generatorData || isOutpost;
            if (isGen && isDiscovered) {
                if (isOutpost) {
                    mergedByTile.set(`outpost_${tile.id}`, { tileId: tile.id, indicatorType: 'outpost' });
                } else {
                    mergedByTile.set(`generator_${tile.id}`, { tileId: tile.id, indicatorType: 'generator' });
                }
                if (isTileRevealed || isSteppedOn || isPlayerBuilt) {
                    meta.discoveredGenerators = meta.discoveredGenerators || {};
                    meta.discoveredGenerators[poiKey] = { orientation: currentOrientation };
                }
            }
        });

        // Unexplored generator should NOT be present on minimap
        expect(mergedByTile.has('generator_12')).toBe(false);

        // Revealed generator SHOULD be present on minimap and recorded in meta
        expect(mergedByTile.has('generator_15')).toBe(true);
        expect(meta.discoveredGenerators['dungeon_1_0_15']).toEqual({ orientation: 'A' });

        // Player built outpost SHOULD be present on minimap
        expect(mergedByTile.has('outpost_20')).toBe(true);
    });
});
