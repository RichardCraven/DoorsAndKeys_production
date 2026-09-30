import React from 'react';
import { render } from '@testing-library/react';
import CardDuel from '../CardDuel';

describe('CardDuel Multi-Tile Unit Sideways Movement Validation', () => {
    let instance;

    beforeEach(() => {
        const { container } = render(<CardDuel testMode={true} />);
        instance = container;
    });

    test('prevents 2-tile unit from moving sideways if lower sub-tile target is occupied', () => {
        const duel = new CardDuel({ testMode: true });
        duel.state = {
            ...duel.state,
            currentTurn: 'player',
            isAiThinking: false,
            gameOver: null,
            grid: {},
            territory: {}
        };

        // Create a 1x2 player unit at anchor (2, 1) occupying (2, 1) and (3, 1)
        const unit2Tile = {
            id: 'player_2tile_1',
            name: 'Principalities Knight',
            owner: 'player',
            width: 1,
            height: 2,
            anchorRow: 2,
            anchorCol: 1,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['2_1', '3_1']
        };

        // Create a blocker unit at (3, 2) and another at (1, 2) so all rightward anchors involving lane 2 are blocked
        const blockerUnit = {
            id: 'blocker_1',
            name: 'Imp Blocker',
            owner: 'player',
            width: 1,
            height: 1,
            anchorRow: 3,
            anchorCol: 2,
            occupiedKeys: ['3_2']
        };

        const blockerUnit2 = {
            id: 'blocker_2',
            name: 'Imp Blocker 2',
            owner: 'player',
            width: 1,
            height: 1,
            anchorRow: 1,
            anchorCol: 2,
            occupiedKeys: ['1_2']
        };

        duel.state.grid = {
            '2_1': unit2Tile,
            '3_1': unit2Tile,
            '3_2': blockerUnit,
            '1_2': blockerUnit2
        };

        // Check if candidate anchor (2, 2) is valid for the 2-tile unit
        // (2, 2) requires (2, 2) AND (3, 2) to be empty. Since (3, 2) is occupied, it should return false.
        const canMoveRight = duel.canUnitMoveTo(unit2Tile, 2, 2, duel.state.grid);
        expect(canMoveRight).toBe(false);

        // Check getValidTargetTiles for unit2Tile
        const validTargets = duel.getValidTargetTiles(unit2Tile);
        // Anchor (2, 2) is invalid because 3_2 is blocked
        // Anchor (1, 2) is invalid because 1_2 is blocked
        // Anchor (3, 2) is invalid because 3_2 is blocked
        expect(validTargets.moves).not.toContain('2_2');
        expect(validTargets.moves).not.toContain('3_2');
    });

    test('allows 2-tile unit to move sideways if all required sub-tile target slots are empty', () => {
        const duel = new CardDuel({ testMode: true });
        duel.state = {
            ...duel.state,
            currentTurn: 'player',
            isAiThinking: false,
            gameOver: null,
            grid: {},
            territory: {}
        };

        const unit2Tile = {
            id: 'player_2tile_1',
            name: 'Principalities Knight',
            owner: 'player',
            width: 1,
            height: 2,
            anchorRow: 2,
            anchorCol: 1,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['2_1', '3_1']
        };

        duel.state.grid = {
            '2_1': unit2Tile,
            '3_1': unit2Tile
        };

        const canMoveRight = duel.canUnitMoveTo(unit2Tile, 2, 2, duel.state.grid);
        expect(canMoveRight).toBe(true);

        const validTargets = duel.getValidTargetTiles(unit2Tile);
        expect(validTargets.moves).toContain('2_2');
        expect(validTargets.moves).toContain('3_2');
    });
});
