import React from 'react';
import Tile from '../../components/tile';

const getCompareFn = () => {
    // React.memo component stores the comparison function on the 'compare' property
    return Tile.compare;
};

// Helper to make a 225-element board array indexed by tile ID
const makeBoard = (tilesList) => {
    const arr = new Array(225).fill(null);
    tilesList.forEach(t => {
        arr[t.id] = t;
    });
    return arr;
};

describe('Tile React.memo propsAreEqual tests', () => {
    let compare;

    beforeAll(() => {
        compare = getCompareFn();
        expect(compare).toBeDefined();
    });

    test('should return true (skip re-render) when identical props are passed', () => {
        const prev = {
            id: 22,
            type: 'board-tile',
            color: '#6b6057',
            tileSize: 32,
            boardTiles: makeBoard([
                { id: 7, color: 'black' },
                { id: 21, color: '#6b6057' },
                { id: 22, color: '#6b6057' },
                { id: 23, color: '#6b6057' },
                { id: 37, color: '#6b6057' }
            ])
        };
        const next = { ...prev };
        expect(compare(prev, next)).toBe(true);
    });

    test('should return true (skip re-render) when boardTiles is a new reference but neighbors have same attributes', () => {
        const prev = {
            id: 22,
            type: 'board-tile',
            color: '#6b6057',
            tileSize: 32,
            boardTiles: makeBoard([
                { id: 7, color: 'black' },
                { id: 21, color: '#6b6057' },
                { id: 22, color: '#6b6057' },
                { id: 23, color: '#6b6057' },
                { id: 37, color: '#6b6057' }
            ])
        };
        const next = {
            ...prev,
            boardTiles: makeBoard([
                { id: 7, color: 'black' },
                { id: 21, color: '#6b6057' },
                { id: 22, color: '#6b6057' },
                { id: 23, color: '#6b6057' },
                { id: 37, color: '#6b6057' }
            ])
        };
        expect(compare(prev, next)).toBe(true);
    });

    test('should return false (trigger re-render) when own color changes', () => {
        const prev = {
            id: 22,
            type: 'board-tile',
            color: 'black',
            tileSize: 32
        };
        const next = {
            ...prev,
            color: '#6b6057'
        };
        expect(compare(prev, next)).toBe(false);
    });

    test('should return false (trigger re-render) when a neighbor color changes (revealing fog)', () => {
        // Tile 22 is row 1, col 7. Neighbors:
        // top: 22 - 15 = 7
        // left: 22 - 1 = 21
        // right: 22 + 1 = 23
        // bottom: 22 + 15 = 37
        const prev = {
            id: 22,
            type: 'board-tile',
            color: '#6b6057',
            tileSize: 32,
            boardTiles: makeBoard([
                { id: 7, color: 'black' },
                { id: 21, color: '#6b6057' },
                { id: 22, color: '#6b6057' },
                { id: 23, color: '#6b6057' },
                { id: 37, color: '#6b6057' }
            ])
        };
        const next = {
            ...prev,
            boardTiles: makeBoard([
                { id: 7, color: '#6b6057' }, // neighbor top is now revealed!
                { id: 21, color: '#6b6057' },
                { id: 22, color: '#6b6057' },
                { id: 23, color: '#6b6057' },
                { id: 37, color: '#6b6057' }
            ])
        };
        expect(compare(prev, next)).toBe(false);
    });

    test('should return false (trigger re-render) when a neighbor contains changes (new passage/portal)', () => {
        const prev = {
            id: 22,
            type: 'board-tile',
            color: '#6b6057',
            tileSize: 32,
            boardTiles: makeBoard([
                { id: 7, color: '#6b6057', contains: null },
                { id: 21, color: '#6b6057' },
                { id: 22, color: '#6b6057' },
                { id: 23, color: '#6b6057' },
                { id: 37, color: '#6b6057' }
            ])
        };
        const next = {
            ...prev,
            boardTiles: makeBoard([
                { id: 7, color: '#6b6057', contains: 'passage' }, // top neighbor contains changed!
                { id: 21, color: '#6b6057' },
                { id: 22, color: '#6b6057' },
                { id: 23, color: '#6b6057' },
                { id: 37, color: '#6b6057' }
            ])
        };
        expect(compare(prev, next)).toBe(false);
    });
});
