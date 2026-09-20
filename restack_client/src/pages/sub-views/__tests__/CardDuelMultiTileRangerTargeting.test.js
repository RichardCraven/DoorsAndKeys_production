import React from 'react';
import CardDuel from '../CardDuel';

describe('CardDuel Multi-Tile Unit & Ranger Ranged Targeting', () => {
    test('Ranger can target and attack lower tile (subnode) of vertical multi-tile Pygmy unit', () => {
        const instance = new CardDuel({});

        // Create 1x2 vertical Pygmy War Band (top tile 1_2, lower tile 2_2)
        const pygmyWarBand = {
            id: 'warband_1',
            name: 'Pygmy War Band',
            type: 'pygmy_warband',
            owner: 'reaper',
            cost: 3,
            atk: 3,
            hp: 3,
            maxHp: 3,
            width: 1,
            height: 2,
            anchorRow: 1,
            anchorCol: 2,
            occupiedKeys: ['1_2', '2_2']
        };

        // Create Ranger crew unit at Row 5, Lane 3 (4_2)
        const rangerUnit = {
            id: 'ranger_1',
            name: 'Ranger Champion',
            type: 'crew',
            owner: 'player',
            cost: 2,
            atk: 1,
            hp: 2,
            maxHp: 2,
            width: 1,
            height: 1,
            anchorRow: 4,
            anchorCol: 2,
            isRanger: true,
            summoningSickness: false,
            hasActedThisTurn: false,
            occupiedKeys: ['4_2']
        };

        const grid = {
            '1_2': pygmyWarBand,
            '2_2': pygmyWarBand,
            '4_2': rangerUnit
        };

        instance.state = {
            grid,
            currentTurn: 'player',
            gameOver: null,
            isAiThinking: false,
            selectedBoardUnit: rangerUnit,
            playerHP: 20,
            reaperHP: 20,
            playerDiscard: [],
            reaperDiscard: []
        };

        // 1. Verify getValidTargetTiles includes BOTH top tile ('1_2') and lower tile ('2_2')
        const validTargets = instance.getValidTargetTiles(rangerUnit);
        expect(validTargets.attacks).toContain('1_2');
        expect(validTargets.attacks).toContain('2_2');

        // 2. Click on the lower tile ('2_2' -> Row 3, Lane 3) to attack
        instance.handleNodeClick(2, 2);

        // 3. Verify Pygmy War Band took damage and Ranger has acted
        expect(pygmyWarBand.hp).toBe(2); // 3 - 1 ATK = 2 HP
        expect(rangerUnit.hasActedThisTurn).toBe(true);
    });
});
