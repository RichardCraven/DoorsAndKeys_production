import React from 'react';
import { render, screen } from '@testing-library/react';
import ResourceCostBar, { ResourceCostBarList } from '../ResourceCostBar';

describe('ResourceCostBar Component', () => {
    test('renders resource bar with 100 max scale for current <= 100', () => {
        render(
            <ResourceCostBar
                resourceKey="ore"
                resourceName="Ore"
                currentAmount={40}
                costAmount={20}
            />
        );

        expect(screen.getByText('Ore')).toBeInTheDocument();
        expect(screen.getByText('40')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('(-20)')).toBeInTheDocument();
    });

    test('renders resource bar with 500 max scale and glowing border for current > 100', () => {
        const { container } = render(
            <ResourceCostBar
                resourceKey="ore"
                resourceName="Ore"
                currentAmount={250}
                costAmount={50}
            />
        );

        expect(screen.getByText('250')).toBeInTheDocument();
        expect(screen.getByText('500')).toBeInTheDocument();
        expect(screen.getByText('(-50)')).toBeInTheDocument();

        // Check container track for glowing border style
        const track = container.querySelector('[style*="2px solid"]');
        expect(track).toBeInTheDocument();
    });

    test('strictly maxes out Resolve at 100 even if user has high resolve', () => {
        render(
            <ResourceCostBar
                resourceKey="resolve"
                resourceName="Resolve"
                currentAmount={85}
                costAmount={10}
            />
        );

        expect(screen.getByText('Resolve')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('(-10)')).toBeInTheDocument();
    });

    test('ResourceCostBarList renders list of required resource cost bars', () => {
        render(
            <ResourceCostBarList
                costs={{ ore: 20, resolve: 10 }}
                available={{ ore: 40, resolve: 85 }}
                inSuperboard={true}
            />
        );

        expect(screen.getByText('Ore')).toBeInTheDocument();
        expect(screen.getByText('Resolve')).toBeInTheDocument();
    });
});
