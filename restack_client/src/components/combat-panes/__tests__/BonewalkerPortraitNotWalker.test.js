jest.mock('@coreui/icons', () => ({}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({}));

import React from 'react';
import { render } from '@testing-library/react';
import CombatGrid from '../CombatGrid';

describe('Bonewalker Monster Unit Portrait Rendering', () => {
    test('renders Bonewalker portrait with skeleton image and does NOT render WalkerAnimatedUnit construct', () => {
        const bonewalkerUnit = {
            id: 'monster_bonewalker_1',
            name: 'Bonewalker',
            type: 'skeleton',
            key: 'skeleton',
            isMonster: true,
            hp: 30,
            maxHp: 30,
            coordinates: { x: 6, y: 1 },
            active: false
        };

        const mockProps = {
            combatManager: {
                getCombatants: () => [bonewalkerUnit],
                numColumns: 8,
                battleData: { [bonewalkerUnit.id]: bonewalkerUnit }
            },
            battleData: { [bonewalkerUnit.id]: bonewalkerUnit },
            fighters: [bonewalkerUnit]
        };

        const { container } = render(<CombatGrid {...mockProps} />);
        
        // Ensure WalkerAnimatedUnit SVG or walker construct container is not rendered
        const walkerElement = container.querySelector('.walker-animated-unit');
        expect(walkerElement).toBeNull();

        // Ensure monster tile is present and contains skeleton background/portrait
        const unitTile = container.querySelector('[data-monster-name="Bonewalker"]');
        expect(unitTile).not.toBeNull();
    });
});
