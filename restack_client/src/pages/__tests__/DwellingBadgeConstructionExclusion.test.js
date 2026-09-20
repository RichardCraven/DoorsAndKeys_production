import React from 'react';
import { render } from '@testing-library/react';
import Tile from '../../components/tile';

describe('Dwelling Worker Badge Indicator Construction Exclusion', () => {
    test('construction site tiles do not show the dwelling worker badge', () => {
        const { container } = render(
            <Tile
                id={1}
                type="structure"
                building="house_under_construction"
                contains={{ type: 'construction', subtype: 'house_under_construction', underConstruction: true }}
            />
        );
        expect(container.querySelector('.dwelling-worker-indicator')).toBeNull();
    });

    test('buildable construction site tiles do not show the dwelling worker badge', () => {
        const { container } = render(
            <Tile
                id={2}
                type="structure"
                building="buildable_farm"
                contains={{ type: 'construction', subtype: 'buildable_farm' }}
            />
        );
        expect(container.querySelector('.dwelling-worker-indicator')).toBeNull();
    });

    test('non-dwelling buildings like windmill do not show the dwelling worker badge', () => {
        const { container } = render(
            <Tile
                id={3}
                type="structure"
                building="windmill"
                contains={{ type: 'building', subtype: 'windmill' }}
            />
        );
        expect(container.querySelector('.dwelling-worker-indicator')).toBeNull();
    });

    test('completed occupiable dwellings like house render the dwelling worker badge', () => {
        const { container } = render(
            <Tile
                id={4}
                type="structure"
                building="house"
                contains={{ type: 'building', subtype: 'house' }}
            />
        );
        expect(container.querySelector('.dwelling-worker-indicator')).not.toBeNull();
    });

    test('completed occupiable dwellings like farm render the dwelling worker badge', () => {
        const { container } = render(
            <Tile
                id={5}
                type="structure"
                building="farm"
                contains={{ type: 'building', subtype: 'farm' }}
            />
        );
        expect(container.querySelector('.dwelling-worker-indicator')).not.toBeNull();
    });
});
