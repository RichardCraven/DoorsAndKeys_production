import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CombatGrid from '../combat-panes/CombatGrid';

describe('PvP Opponent Unit Rendering', () => {
    const mockCrew = [
        { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', stats: { hp: 100 }, starting_hp: 100, maxEndurance: 100 }
    ];

    const mockCombatManager = {
        combatants: {},
        getCombatant: (id) => null,
        round: 1,
        showBars: true,
        combatPaused: false,
    };

    test('renders opponent crew unit at 100px x 100px with opponent-portrait and facing left (scaleX(-1))', () => {
        const opponentCrew = [
            { id: 'pvp_opponent_1', name: 'Rival Warrior', portrait: 'soldier', type: 'soldier', isOpponent: true, facing: 'left' }
        ];

        const battleData = {
            hero1: { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', hp: 100, starting_hp: 100, coordinates: { x: 1, y: 1 } },
            pvp_opponent_1: {
                id: 'pvp_opponent_1',
                name: 'Rival Warrior',
                portrait: 'soldier',
                type: 'soldier',
                isOpponent: true,
                facing: 'left',
                hp: 100,
                starting_hp: 100,
                coordinates: { x: 5, y: 1 }
            }
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrew}
                opponentCrew={opponentCrew}
                isPvP={true}
                isPvPMode={true}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
            />
        );

        const opponentTile = container.querySelector('[data-monster-id="pvp_opponent_1"]');
        expect(opponentTile).not.toBeNull();

        // 1x1 dimensions (100px by 100px)
        expect(opponentTile.style.width).toBe('100px');
        expect(opponentTile.style.height).toBe('100px');

        // Position should have no large/huge monster offset (-100px)
        // tilePos(5) = 5 * 100 = 500px, tilePos(1) = 1 * 100 = 100px
        expect(opponentTile.style.transform).toBe('translate3d(500px, 100px, 0px)');

        // Classes should indicate opponent fighter, not monster or large monster
        expect(opponentTile.className).toContain('opponent-unit-tile');
        expect(opponentTile.className).toContain('fighter-unit-tile');
        expect(opponentTile.className).not.toContain('monster-unit-tile');
        expect(opponentTile.className).not.toContain('large-monster-unit-tile');
        expect(opponentTile.className).not.toContain('huge-monster-unit-tile');

        const portrait = opponentTile.querySelector('.portrait');
        expect(portrait).not.toBeNull();
        expect(portrait.className).toContain('fighter-portrait');
        expect(portrait.className).toContain('opponent-portrait');
        expect(portrait.className).not.toContain('monster-portrait');
        expect(portrait.className).not.toContain('large-portrait');
        expect(portrait.className).not.toContain('huge-portrait');
        expect(portrait.className).not.toContain('enlarged');

        // Opponent should be facing left towards the player fighters
        expect(portrait.style.transform).toContain('scaleX(-1)');
        expect(portrait.style.transformOrigin).toBe('center center');
    });

    test('opponent unit flips to scaleX(1) when facing right', () => {
        const opponentCrew = [
            { id: 'pvp_opponent_1', name: 'Rival Warrior', portrait: 'soldier', type: 'soldier', isOpponent: true, facing: 'right' }
        ];

        const battleData = {
            hero1: { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', hp: 100, starting_hp: 100, coordinates: { x: 1, y: 1 } },
            pvp_opponent_1: {
                id: 'pvp_opponent_1',
                name: 'Rival Warrior',
                portrait: 'soldier',
                type: 'soldier',
                isOpponent: true,
                facing: 'right',
                hp: 100,
                starting_hp: 100,
                coordinates: { x: 5, y: 1 }
            }
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrew}
                opponentCrew={opponentCrew}
                isPvP={true}
                isPvPMode={true}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
            />
        );

        const opponentTile = container.querySelector('[data-monster-id="pvp_opponent_1"]');
        const portrait = opponentTile.querySelector('.portrait');
        expect(portrait.style.transform).toContain('scaleX(1)');
    });

    test('retains 2x2 sizing and large classes for PvE large monsters in standard battle', () => {
        const battleData = {
            hero1: { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', hp: 100, starting_hp: 100, coordinates: { x: 1, y: 1 } },
            large_boss: {
                id: 'large_boss',
                name: 'Dragon',
                portrait: 'dragon',
                isMonster: true,
                isLarge: true,
                size: 2,
                scale: 2,
                hp: 500,
                starting_hp: 500,
                coordinates: { x: 4, y: 2 }
            }
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrew}
                isPvP={false}
                isPvPMode={false}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
            />
        );

        const bossTile = container.querySelector('[data-monster-id="large_boss"]');
        expect(bossTile).not.toBeNull();
        expect(bossTile.className).toContain('large-monster-unit-tile');
        expect(bossTile.style.width).toBe('200px');
        expect(bossTile.style.height).toBe('200px');

        const portrait = bossTile.querySelector('.portrait');
        expect(portrait.className).toContain('large-portrait');
        expect(portrait.className).toContain('monster-portrait');
        expect(portrait.className).not.toContain('opponent-portrait');
    });
});
