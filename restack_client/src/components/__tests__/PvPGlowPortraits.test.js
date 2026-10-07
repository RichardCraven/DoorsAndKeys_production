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
        expect(playerStyle).toContain('0 0 10px 1px'); // Reduced outer ring
        expect(playerStyle).toContain('0.18'); // Reduced outer ring opacity

        // Opponent glow styling check (red)
        expect(opponentStyle).toContain('rgba(255, 45, 85');
        expect(opponentStyle).toContain('0 0 10px 1px'); // Reduced outer ring
        expect(opponentStyle).toContain('0.2'); // Reduced outer ring opacity
    });

    test('renders player-team glow for player engineer summoned walker and opponent glow for opponent summoned walker', () => {
        const mockCrewWithEngineer = [
            { id: 'player_eng', name: 'Icaron', portrait: 'engineer', type: 'engineer', stats: { hp: 100 }, starting_hp: 100 }
        ];

        const opponentCrewWithEngineer = [
            { id: 'pvp_opponent_eng', name: 'Enemy Engineer', portrait: 'engineer', type: 'engineer', isOpponent: true, facing: 'left' }
        ];

        const battleData = {
            player_eng: {
                id: 'player_eng',
                name: 'Icaron',
                portrait: 'engineer',
                type: 'engineer',
                hp: 100,
                starting_hp: 100,
                coordinates: { x: 0, y: 1 }
            },
            pvp_opponent_eng: {
                id: 'pvp_opponent_eng',
                name: 'Enemy Engineer',
                portrait: 'engineer',
                type: 'engineer',
                isOpponent: true,
                facing: 'left',
                hp: 100,
                starting_hp: 100,
                coordinates: { x: 7, y: 1 }
            },
            construct_player_walker: {
                id: 'construct_player_walker',
                type: 'walker',
                name: 'Mechanical Walker',
                isMinion: true,
                isConstruct: true,
                isMonster: false,
                isOpponent: false,
                summonedBy: 'player_eng',
                facing: 'right',
                hp: 30,
                starting_hp: 30,
                coordinates: { x: 1, y: 1 }
            },
            construct_opponent_walker: {
                id: 'construct_opponent_walker',
                type: 'walker',
                name: 'Mechanical Walker',
                isMinion: true,
                isConstruct: true,
                isMonster: true,
                isOpponent: true,
                summonedBy: 'pvp_opponent_eng',
                facing: 'left',
                hp: 30,
                starting_hp: 30,
                coordinates: { x: 6, y: 1 }
            }
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrewWithEngineer}
                opponentCrew={opponentCrewWithEngineer}
                isPvP={true}
                isPvPMode={true}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
            />
        );

        const playerWalkerTile = container.querySelector('[data-monster-id="construct_player_walker"]');
        const opponentWalkerTile = container.querySelector('[data-monster-id="construct_opponent_walker"]');

        expect(playerWalkerTile).toBeInTheDocument();
        expect(opponentWalkerTile).toBeInTheDocument();

        // Player walker should have player glow (soft blue/green cyan)
        const playerWalkerGlow = playerWalkerTile.querySelector('.pvp-player-glow');
        const playerWalkerEnemyGlow = playerWalkerTile.querySelector('.pvp-opponent-glow');
        expect(playerWalkerGlow).toBeInTheDocument();
        expect(playerWalkerEnemyGlow).toBeNull();
        expect(playerWalkerGlow.getAttribute('style')).toContain('rgba(33, 230, 193');

        // Opponent walker should have opponent glow (red)
        const opponentWalkerGlow = opponentWalkerTile.querySelector('.pvp-opponent-glow');
        const opponentWalkerPlayerGlow = opponentWalkerTile.querySelector('.pvp-player-glow');
        expect(opponentWalkerGlow).toBeInTheDocument();
        expect(opponentWalkerPlayerGlow).toBeNull();
        expect(opponentWalkerGlow.getAttribute('style')).toContain('rgba(255, 45, 85');
    });

    test('correctly identifies player-summoned unit even if isOpponent flag is omitted on unit', () => {
        const mockCrewWithEngineer = [
            { id: 'player_eng', name: 'Icaron', portrait: 'engineer', type: 'engineer', stats: { hp: 100 }, starting_hp: 100 }
        ];

        const battleData = {
            player_eng: {
                id: 'player_eng',
                name: 'Icaron',
                portrait: 'engineer',
                type: 'engineer',
                hp: 100,
                starting_hp: 100,
                coordinates: { x: 0, y: 1 }
            },
            construct_fallback_walker: {
                id: 'construct_fallback_walker',
                type: 'walker',
                name: 'Mechanical Walker',
                isMinion: true,
                isConstruct: true,
                summonedBy: 'player_eng', // Looked up via summonedBy -> player_eng in crew
                hp: 30,
                starting_hp: 30,
                coordinates: { x: 1, y: 1 }
            }
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrewWithEngineer}
                opponentCrew={[]}
                isPvP={true}
                isPvPMode={true}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
            />
        );

        const walkerTile = container.querySelector('[data-monster-id="construct_fallback_walker"]');
        expect(walkerTile).toBeInTheDocument();

        // Walker must receive player glow
        const playerGlow = walkerTile.querySelector('.pvp-player-glow');
        expect(playerGlow).toBeInTheDocument();
        expect(walkerTile.querySelector('.pvp-opponent-glow')).toBeNull();
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
