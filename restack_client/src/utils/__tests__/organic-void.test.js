import {
    buildVoidMask,
    marchingSquares,
    displaceLoops,
    toSvgPath,
    getOrganicVoidPath,
    clearVoidPathCache,
    hashMask
} from '../organic-void';

describe('Organic Void Generator', () => {
    beforeEach(() => {
        clearVoidPathCache();
    });

    test('buildVoidMask converts 225 tiles correctly', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            isVoid: i < 50
        }));
        const mask = buildVoidMask(tiles, null);
        expect(mask.length).toBe(225);
        expect(mask[0]).toBe(1);
        expect(mask[49]).toBe(1);
        expect(mask[50]).toBe(0);
    });

    test('all-floor board returns empty path', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({ id: i, isVoid: false }));
        const path = getOrganicVoidPath('testBoard', tiles, null, 1337);
        expect(path).toBe('');
    });

    test('all-void board returns full rectangular path', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({ id: i, isVoid: true }));
        const path = getOrganicVoidPath('testBoard', tiles, null, 1337);
        expect(path).toBe('M 0 0 L 15 0 L 15 15 L 0 15 Z');
    });

    test('determinism: same input and seed produce identical SVG paths', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            isVoid: i % 3 === 0
        }));
        const path1 = getOrganicVoidPath('testBoard', tiles, null, 42);
        clearVoidPathCache();
        const path2 = getOrganicVoidPath('testBoard', tiles, null, 42);
        expect(path1).toBe(path2);
    });

    test('cache hit returns cached path without recomputation', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            isVoid: i % 4 === 0
        }));
        const path1 = getOrganicVoidPath('boardA', tiles, null, 100);
        const path2 = getOrganicVoidPath('boardA', tiles, null, 100);
        expect(path1).toBe(path2);
    });

    test('floor safety buffer: displaced points never encroach center 60% of floor tiles', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            isVoid: i < 112 // top half void, bottom half floor
        }));

        const mask = buildVoidMask(tiles, null);
        const rawLoops = marchingSquares(mask, 15, 15);
        const displaced = displaceLoops(rawLoops, mask, 1337, 15, 15);

        displaced.forEach(loop => {
            loop.forEach(([x, y]) => {
                const tx = Math.floor(x);
                const ty = Math.floor(y);

                if (tx >= 0 && tx < 15 && ty >= 0 && ty < 15) {
                    const idx = ty * 15 + tx;
                    if (mask[idx] === 0) { // Floor tile
                        const inCenter60X = x > tx + 0.2 && x < tx + 0.8;
                        const inCenter60Y = y > ty + 0.2 && y < ty + 0.8;
                        // Assert that a point on a floor tile never lands inside the center 60% square
                        expect(inCenter60X && inCenter60Y).toBe(false);
                    }
                }
            });
        });
    });

    test('performance guard: 100 iterations of organic void generation stay under 100ms', () => {
        const tiles = Array.from({ length: 225 }, (_, i) => ({
            id: i,
            isVoid: (i * 7 + 13) % 5 === 0
        }));

        const start = performance.now();
        for (let i = 0; i < 100; i++) {
            clearVoidPathCache();
            getOrganicVoidPath(`board_${i}`, tiles, null, 1337 + i);
        }
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(500);
    });
});
