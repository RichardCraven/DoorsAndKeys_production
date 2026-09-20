import React from 'react';
import { render } from '@testing-library/react';
import Tile from '../../components/tile';

describe('In-Dungeon Hut Badge Exclusion', () => {
    test('renders hut structure without dwelling worker indicator badge', () => {
        const { container } = render(
            <Tile
                id={1}
                type="structure"
                building="hut"
                contains={{
                    type: 'structure',
                    subtype: 'hut'
                }}
            />
        );

        const indicator = container.querySelector('.dwelling-worker-indicator');
        expect(indicator).toBeNull();
    });

    test('renders buildable_hut structure without dwelling worker indicator badge', () => {
        const { container } = render(
            <Tile
                id={2}
                type="board-tile"
                building="buildable_hut"
                contains={{
                    type: 'structure',
                    subtype: 'buildable_hut'
                }}
            />
        );

        const indicator = container.querySelector('.dwelling-worker-indicator');
        expect(indicator).toBeNull();
    });

    test('renders house dwelling with dwelling worker indicator badge when completed', () => {
        const { container } = render(
            <Tile
                id={3}
                type="structure"
                building="house"
                contains={{
                    type: 'structure',
                    subtype: 'house'
                }}
            />
        );

        const indicator = container.querySelector('.dwelling-worker-indicator');
        expect(indicator).not.toBeNull();
    });
});
