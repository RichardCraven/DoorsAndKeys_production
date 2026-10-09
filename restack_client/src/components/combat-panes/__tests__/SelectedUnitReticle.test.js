jest.mock('@coreui/icons', () => ({}));
jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({}));

import React from 'react';
import { render } from '@testing-library/react';
import CombatGrid from '../CombatGrid';

describe('Selected Unit Golden Reticle Overlay', () => {
    const mockFighter = {
        id: 'fighter_soldier_1',
        name: 'Soldier',
        type: 'soldier',
        hp: 100,
        maxHp: 100,
        coordinates: { x: 1, y: 2 },
        dead: false
    };

    const mockMonster = {
        id: 'monster_goblin_1',
        name: 'Goblin',
        type: 'goblin',
        isMonster: true,
        hp: 40,
        maxHp: 40,
        coordinates: { x: 5, y: 2 },
        dead: false
    };

    const baseProps = {
        crew: [mockFighter],
        battleData: {
            [mockFighter.id]: mockFighter,
            [mockMonster.id]: mockMonster
        },
        getFighterDetails: (f) => (f.id === mockFighter.id ? mockFighter : null),
        getHitAnimation: () => '',
        getAllOverlaysById: () => [],
        animationOverlays: {},
        combatManager: {
            getCombatant: (id) => (id === mockFighter.id ? mockFighter : (id === mockMonster.id ? mockMonster : null)),
            getCombatants: () => [mockFighter, mockMonster],
            numColumns: 8,
            battleData: {
                [mockFighter.id]: mockFighter,
                [mockMonster.id]: mockMonster
            }
        }
    };

    test('renders golden reticle corners overlay on selected fighter tile', () => {
        const { container } = render(
            <CombatGrid
                {...baseProps}
                selectedFighter={mockFighter}
                selectedMonster={null}
            />
        );

        const reticleEl = container.querySelector('#unit-tile-fighter_soldier_1 .selected-unit-reticle');
        expect(reticleEl).not.toBeNull();
        expect(reticleEl.querySelector('.reticle-corner.top-left')).not.toBeNull();
        expect(reticleEl.querySelector('.reticle-corner.top-right')).not.toBeNull();
        expect(reticleEl.querySelector('.reticle-corner.bottom-left')).not.toBeNull();
        expect(reticleEl.querySelector('.reticle-corner.bottom-right')).not.toBeNull();

        // Monster should not have reticle
        const monsterReticle = container.querySelector('[data-monster-id="monster_goblin_1"] .selected-unit-reticle');
        expect(monsterReticle).toBeNull();
    });

    test('renders golden reticle corners overlay on selected monster tile', () => {
        const { container } = render(
            <CombatGrid
                {...baseProps}
                selectedFighter={null}
                selectedMonster={mockMonster}
            />
        );

        const reticleEl = container.querySelector('[data-monster-id="monster_goblin_1"] .selected-unit-reticle');
        expect(reticleEl).not.toBeNull();
        expect(reticleEl.querySelector('.reticle-corner.top-left')).not.toBeNull();
        expect(reticleEl.querySelector('.reticle-corner.top-right')).not.toBeNull();
        expect(reticleEl.querySelector('.reticle-corner.bottom-left')).not.toBeNull();
        expect(reticleEl.querySelector('.reticle-corner.bottom-right')).not.toBeNull();

        // Fighter should not have reticle
        const fighterReticle = container.querySelector('#unit-tile-fighter_soldier_1 .selected-unit-reticle');
        expect(fighterReticle).toBeNull();
    });
});
