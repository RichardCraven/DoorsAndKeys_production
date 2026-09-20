import React from 'react';
import CardDuel from '../CardDuel';

describe('CardDuel Tactical Arcing Arrows (Move & Attack)', () => {
    let instance;

    beforeEach(() => {
        instance = new CardDuel({});
        instance.state = {
            grid: {},
            territory: {},
            currentTurn: 'player',
            gameOver: null,
            isAiThinking: false,
            selectedBoardUnit: null,
            selectedCard: null,
            hoveredNodeKey: null,
            moveAnims: {},
            playerHP: 20,
            reaperHP: 20,
            playerDiscard: [],
            reaperDiscard: [],
            log: []
        };
        instance._isMounted = true;
        instance.setState = (updater, callback) => {
            if (typeof updater === 'function') {
                instance.state = { ...instance.state, ...updater(instance.state) };
            } else {
                instance.state = { ...instance.state, ...updater };
            }
            if (callback) callback();
        };
    });

    describe('calculateArcPath', () => {
        it('calculates smooth quadratic bezier arc paths for horizontal, vertical, and diagonal trajectories', () => {
            // Horizontal move East: (150, 250) -> (250, 250)
            const eastPath = instance.calculateArcPath(150, 250, 250, 250);
            expect(eastPath).toMatch(/^M 150 250 Q \d+(\.\d+)? \d+(\.\d+)? 250 250$/);

            // Vertical move North: (250, 350) -> (250, 250)
            const northPath = instance.calculateArcPath(250, 350, 250, 250);
            expect(northPath).toMatch(/^M 250 350 Q \d+(\.\d+)? \d+(\.\d+)? 250 250$/);

            // Diagonal move North-East: (150, 350) -> (250, 250)
            const nePath = instance.calculateArcPath(150, 350, 250, 250);
            expect(nePath).toMatch(/^M 150 350 Q \d+(\.\d+)? \d+(\.\d+)? 250 250$/);

            // Returns empty string if distance is negligible
            expect(instance.calculateArcPath(100, 100, 100, 100)).toBe('');
        });
    });

    describe('Selection & Action Point Requirements', () => {
        it('selects a friendly unit that has an action point (no summoning sickness, has not acted)', () => {
            const readyUnit = {
                id: 'soldier_1',
                name: 'Vanguard Soldier',
                type: 'crew',
                owner: 'player',
                atk: 2,
                hp: 4,
                maxHp: 4,
                anchorRow: 3,
                anchorCol: 2,
                summoningSickness: false,
                hasActedThisTurn: false,
                occupiedKeys: ['3_2']
            };

            instance.state.grid = { '3_2': readyUnit };

            // Click the unit on the board
            instance.handleNodeClick(3, 2);

            expect(instance.state.selectedBoardUnit).toBe(readyUnit);

            // Verify valid targets are computed
            const validTargets = instance.getValidTargetTiles(instance.state.selectedBoardUnit);
            expect(validTargets.moves.length).toBeGreaterThan(0);
        });

        it('does NOT select unit and logs warning if unit has summoning sickness', () => {
            const sickUnit = {
                id: 'soldier_sick',
                name: 'Fresh Soldier',
                type: 'crew',
                owner: 'player',
                atk: 2,
                hp: 4,
                maxHp: 4,
                anchorRow: 3,
                anchorCol: 2,
                summoningSickness: true,
                hasActedThisTurn: false,
                occupiedKeys: ['3_2']
            };

            instance.state.grid = { '3_2': sickUnit };

            instance.handleNodeClick(3, 2);

            expect(instance.state.selectedBoardUnit).toBeNull();
            expect(instance.state.log.some(l => l.includes('Summoning Sickness'))).toBe(true);
        });

        it('does NOT select unit and logs warning if unit has already acted this turn', () => {
            const exhaustedUnit = {
                id: 'soldier_exhausted',
                name: 'Tired Soldier',
                type: 'crew',
                owner: 'player',
                atk: 2,
                hp: 4,
                maxHp: 4,
                anchorRow: 3,
                anchorCol: 2,
                summoningSickness: false,
                hasActedThisTurn: true,
                occupiedKeys: ['3_2']
            };

            instance.state.grid = { '3_2': exhaustedUnit };

            instance.handleNodeClick(3, 2);

            expect(instance.state.selectedBoardUnit).toBeNull();
            expect(instance.state.log.some(l => l.includes('already acted'))).toBe(true);
        });
    });

    describe('Tactical Arcing Arrow Elements in renderGridNodes', () => {
        it('renders move and attack arcing arrows when a ready friendly unit is selected', () => {
            const friendlyUnit = {
                id: 'paladin_1',
                name: 'Paladin',
                type: 'crew',
                owner: 'player',
                atk: 2,
                hp: 5,
                maxHp: 5,
                anchorRow: 3,
                anchorCol: 2,
                width: 1,
                height: 1,
                summoningSickness: false,
                hasActedThisTurn: false,
                occupiedKeys: ['3_2']
            };

            const enemyUnit = {
                id: 'goblin_1',
                name: 'Goblin Imp',
                type: 'pygmy',
                owner: 'reaper',
                atk: 1,
                hp: 2,
                maxHp: 2,
                anchorRow: 2,
                anchorCol: 2, // Directly in front (Row 3 -> Row 2)
                width: 1,
                height: 1,
                occupiedKeys: ['2_2']
            };

            instance.state.grid = {
                '3_2': friendlyUnit,
                '2_2': enemyUnit
            };
            instance.state.selectedBoardUnit = friendlyUnit;

            const gridVNode = instance.renderGridNodes();

            // Find the overlay svg element
            const svgChild = gridVNode.props.children[gridVNode.props.children.length - 1];
            expect(svgChild).toBeTruthy();
            expect(svgChild.props.className).toBe('pe-grid-ability-overlay-svg');

            // Find tactical unit actions group
            const actionGroup = svgChild.props.children.find(
                child => child && child.key === 'tactical-unit-actions'
            );
            expect(actionGroup).toBeTruthy();

            // Check for move and attack arrow groups
            const moveGroups = actionGroup.props.children.find(c => Array.isArray(c) && c.some(g => g && g.key && g.key.startsWith('move_arc_')));
            expect(moveGroups).toBeTruthy();

            const attackGroups = actionGroup.props.children.find(c => Array.isArray(c) && c.some(g => g && g.key && g.key.startsWith('attack_arc_')));
            expect(attackGroups).toBeTruthy();

            // Verify attack arrow points to '2_2' (enemy Goblin)
            const goblinAttackGroup = attackGroups.find(g => g.key === 'attack_arc_2_2');
            expect(goblinAttackGroup).toBeTruthy();
            const attackPath = goblinAttackGroup.props.children.find(c => c.type === 'path');
            expect(attackPath.props.className).toContain('pe-tactical-arc--attack');
            expect(attackPath.props.markerEnd).toBe('url(#pe-attack-arrow)');
        });

        it('renders direct hero attack arc when friendly unit is on Row 0 and ready', () => {
            const rowZeroUnit = {
                id: 'berserker_1',
                name: 'Berserker',
                type: 'crew',
                owner: 'player',
                atk: 4,
                hp: 3,
                maxHp: 3,
                anchorRow: 0,
                anchorCol: 2,
                width: 1,
                height: 1,
                summoningSickness: false,
                hasActedThisTurn: false,
                occupiedKeys: ['0_2']
            };

            instance.state.grid = { '0_2': rowZeroUnit };
            instance.state.selectedBoardUnit = rowZeroUnit;

            const gridVNode = instance.renderGridNodes();
            const svgChild = gridVNode.props.children[gridVNode.props.children.length - 1];
            const actionGroup = svgChild.props.children.find(c => c && c.key === 'tactical-unit-actions');
            expect(actionGroup).toBeTruthy();

            // Check for hero attack group
            const heroAttackGroup = actionGroup.props.children.find(c => c && c.key === 'hero_attack_arc');
            expect(heroAttackGroup).toBeTruthy();

            const heroPath = heroAttackGroup.props.children.find(c => c.type === 'path');
            expect(heroPath.props.className).toContain('pe-tactical-arc--hero');
            expect(heroPath.props.markerEnd).toBe('url(#pe-hero-attack-arrow)');
        });

        it('clears arcing arrows after tactical move is executed', () => {
            const movingUnit = {
                id: 'scout_1',
                name: 'Scout',
                type: 'crew',
                owner: 'player',
                atk: 1,
                hp: 2,
                maxHp: 2,
                anchorRow: 3,
                anchorCol: 2,
                summoningSickness: false,
                hasActedThisTurn: false,
                occupiedKeys: ['3_2']
            };

            instance.state.grid = { '3_2': movingUnit };
            instance.state.selectedBoardUnit = movingUnit;

            // Click adjacent empty node at Row 4, Lane 3 (3_3)
            instance.handleNodeClick(3, 3);

            // Selection is cleared after moving
            expect(instance.state.selectedBoardUnit).toBeNull();
            expect(movingUnit.hasActedThisTurn).toBe(true);

            // renderGridNodes should not have tactical-unit-actions
            const gridVNode = instance.renderGridNodes();
            const svgChild = gridVNode.props.children[gridVNode.props.children.length - 1];
            expect(svgChild).toBeNull();
        });
    });
});
