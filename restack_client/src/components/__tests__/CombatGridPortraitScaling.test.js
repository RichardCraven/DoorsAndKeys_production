import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CombatGrid from '../combat-panes/CombatGrid';

describe('CombatGrid Portrait Scaling', () => {
    const mockCrew = [
        { id: 'hero1', name: 'Yu', portrait: 'monk', type: 'monk', stats: { hp: 80 }, starting_hp: 80, maxEndurance: 80 }
    ];

    const mockCombatManager = {
        combatants: {},
        getCombatant: (id) => null,
        round: 1,
        showBars: true,
        combatPaused: false,
    };

    test('player portrait scales to 100% of tile width and height when TILE_SIZE is smaller (e.g. large combat grid)', () => {
        const battleData = {
            hero1: {
                id: 'hero1',
                name: 'Yu',
                portrait: 'monk',
                type: 'monk',
                hp: 80,
                starting_hp: 80,
                facing: 'right',
                coordinates: { x: 0, y: 2 }
            }
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrew}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
                TILE_SIZE={65}
            />
        );

        // Unit tile matches TILE_SIZE
        const unitTile = container.querySelector('#unit-tile-hero1');
        expect(unitTile).toBeInTheDocument();
        expect(unitTile.style.width).toBe('65px');
        expect(unitTile.style.height).toBe('65px');

        // Fighter portrait inside has width: 100% and height: 100% to fit tile without spilling out
        const portrait = unitTile.querySelector('.portrait.fighter-portrait');
        expect(portrait).toBeInTheDocument();
        expect(portrait.style.width).toBe('100%');
        expect(portrait.style.height).toBe('100%');
    });

    test('pvp player glow scales with TILE_SIZE rather than staying hardcoded to 120px', () => {
        const battleData = {
            hero1: {
                id: 'hero1',
                name: 'Yu',
                portrait: 'monk',
                type: 'monk',
                hp: 80,
                starting_hp: 80,
                facing: 'right',
                coordinates: { x: 0, y: 2 }
            }
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrew}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
                isPvP={true}
                TILE_SIZE={65}
            />
        );

        const glow = container.querySelector('[data-testid="pvp-player-glow"]');
        expect(glow).toBeInTheDocument();
        expect(glow.style.width).toBe('85px');
        expect(glow.style.height).toBe('85px');
    });
});
