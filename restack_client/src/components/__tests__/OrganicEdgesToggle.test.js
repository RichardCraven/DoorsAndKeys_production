import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tile from '../tile';
import VoidOrganicLayer from '../VoidOrganicLayer';

// Mock session-handler for meta persistence
jest.mock('../../utils/session-handler', () => {
    let metaStore = {};
    return {
        getMeta: jest.fn(() => metaStore),
        storeMeta: jest.fn((meta) => { metaStore = { ...metaStore, ...meta }; }),
        getUserId: jest.fn(() => 'test-user'),
        getUserName: jest.fn(() => 'TestUser'),
        applyResolvePenalty: jest.fn()
    };
});

describe('Organic Edges Toggle Behavior', () => {
    const mockBoardTiles = Array.from({ length: 225 }, (_, i) => ({
        id: i,
        color: i < 15 ? 'black' : '#888888', // row 0 is void (black), row 1 is floor
        isVoid: i < 15
    }));

    test('Tile does not apply organic clipPath when showOrganicEdges is false or omitted (default off)', () => {
        // Tile 16 is in row 1, adjacent to void in row 0
        const { container: defaultOffContainer } = render(
            <Tile
                id={16}
                color="#888888"
                boardTiles={mockBoardTiles}
            />
        );

        const defaultOffTile = defaultOffContainer.querySelector('.tile');
        expect(defaultOffTile).not.toBeNull();
        expect(defaultOffTile.style.clipPath).toBeFalsy();

        const { container: explicitOffContainer } = render(
            <Tile
                id={16}
                color="#888888"
                boardTiles={mockBoardTiles}
                showOrganicEdges={false}
            />
        );

        const explicitOffTile = explicitOffContainer.querySelector('.tile');
        expect(explicitOffTile).not.toBeNull();
        expect(explicitOffTile.style.clipPath).toBeFalsy();
    });

    test('Tile applies polygon clipPath when showOrganicEdges is true and adjacent to void', () => {
        const { container } = render(
            <Tile
                id={16}
                color="#888888"
                boardTiles={mockBoardTiles}
                showOrganicEdges={true}
            />
        );

        const tileEl = container.querySelector('.tile');
        expect(tileEl).not.toBeNull();
        // Since tile 16 has a top neighbor (tile 1) that is void/black, it gets clipped
        expect(tileEl.style.clipPath).toContain('polygon');
    });

    test('Tile does not apply clipPath in superboard even if showOrganicEdges is true', () => {
        const { container } = render(
            <Tile
                id={16}
                color="#888888"
                boardTiles={mockBoardTiles}
                showOrganicEdges={true}
                inSuperboard={true}
            />
        );

        const tileEl = container.querySelector('.tile');
        expect(tileEl).not.toBeNull();
        expect(tileEl.style.clipPath).toBeFalsy();
    });

    test('VoidOrganicLayer renders null when enabled is false (default off)', () => {
        const { container } = render(
            <VoidOrganicLayer
                tiles={mockBoardTiles}
                enabled={false}
                active={true}
            />
        );

        expect(container.querySelector('svg.void-organic-layer')).toBeNull();
    });

    test('VoidOrganicLayer renders SVG paths when enabled is true', () => {
        const { container } = render(
            <VoidOrganicLayer
                tiles={mockBoardTiles}
                enabled={true}
                active={true}
            />
        );

        const svg = container.querySelector('svg.void-organic-layer');
        expect(svg).not.toBeNull();
        const path = svg.querySelector('path');
        expect(path).not.toBeNull();
        expect(path.getAttribute('d')).toBeTruthy();
    });
});
