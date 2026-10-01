import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CombatGrid from '../combat-panes/CombatGrid';

describe('PvP Combat Unit Portrait Glow Effects', () => {
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

    test('renders soft blue/green glow for player unit and red glow for opponent unit in PvP mode', () => {
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

        const { container, getByTestId } = render(
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

        const playerGlow = getByTestId('pvp-player-glow');
        const opponentGlow = getByTestId('pvp-opponent-glow');

        expect(playerGlow).toBeInTheDocument();
        expect(opponentGlow).toBeInTheDocument();

        const playerStyle = playerGlow.getAttribute('style') || '';
        const opponentStyle = opponentGlow.getAttribute('style') || '';

        // Player glow styling check (soft blue/green cyan)
        expect(playerStyle).toContain('rgba(33, 230, 193');

        // Opponent glow styling check (red)
        expect(opponentStyle).toContain('rgba(255, 45, 85');
    });

    test('does not render PvP glow elements in standard PvE combat', () => {
        const battleData = {
            hero1: { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', hp: 100, starting_hp: 100, coordinates: { x: 1, y: 1 } },
            goblin: { id: 'goblin', name: 'Goblin', portrait: 'goblin', isMonster: true, hp: 50, starting_hp: 50, coordinates: { x: 5, y: 1 } }
        };

        const { queryByTestId } = render(
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

        expect(queryByTestId('pvp-player-glow')).toBeNull();
        expect(queryByTestId('pvp-opponent-glow')).toBeNull();
    });
});
