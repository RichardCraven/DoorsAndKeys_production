import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CombatGrid from '../combat-panes/CombatGrid';
import SiegeCombatGrid from '../combat-panes/SiegeCombatGrid';
import { AnimationManagerRedux } from '../../utils/animation-manager-redux';
import { CombatManagerRedux } from '../../utils/combat-manager-redux';

jest.mock('@coreui/icons', () => ({}));
jest.mock('../../utils/images', () => ({}));

describe('Dark Apotheosis Animation Centering on Hollow', () => {
    let cm;
    let animManager;
    let hollowUnit;
    let monsterUnit;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        animManager = new AnimationManagerRedux();
        cm.connectAnimationManagerRedux(animManager);
        cm.updateData = jest.fn();
        cm.appendCombatLog = jest.fn();

        hollowUnit = {
            id: 'hollow_pc',
            name: 'Valok',
            type: 'hollow',
            isMonster: false,
            hp: 100,
            starting_hp: 100,
            stats: { int: 10, dex: 10, speed: 5, atk: 12, def: 8 },
            coordinates: { x: 1, y: 2 },
            specials: ['dark_apotheosis']
        };

        monsterUnit = {
            id: 'monster_1',
            name: 'Dungeon Beast',
            isMonster: true,
            hp: 200,
            starting_hp: 200,
            stats: { hp: 200, speed: 1, def: 5 },
            coordinates: { x: 7, y: 2 }
        };

        cm.initializeCombat({
            crew: [hollowUnit],
            monster: monsterUnit
        });

        // Set explicit test coordinates
        cm.combatants['hollow_pc'].coordinates = { x: 1, y: 2 };
        hollowUnit.coordinates = { x: 1, y: 2 };
    });

    test('AnimationManagerRedux emits dark_apotheosis_nova and pillar centered at Hollow coordinates', () => {
        const emitted = [];
        animManager._emit = (item) => emitted.push(item);

        const spec = cm.resolveSpecial(hollowUnit, 'dark_apotheosis');
        expect(spec).toBeDefined();

        cm.useAbility(hollowUnit, spec, monsterUnit);

        const nova = emitted.find(e => e.type === 'dark_apotheosis_nova');
        const pillar = emitted.find(e => e.type === 'dark_apotheosis_pillar');

        expect(nova).toBeDefined();
        expect(pillar).toBeDefined();

        // Hollow is at (1, 2). With TILE_SIZE=100 and TILE_BORDER=2:
        // x = 1 * 102 + 50 = 152
        // y = 2 * 102 + 50 = 254
        expect(nova.srcPx.x).toBe(152);
        expect(nova.srcPx.y).toBe(254);
        expect(pillar.srcPx.x).toBe(152);
        expect(pillar.srcPx.y).toBe(254);
        expect(nova.sourceUnitId).toBe('hollow_pc');
    });

    test('CombatGrid renders dark_apotheosis_nova centered on Hollow unit tile', () => {
        const TILE_SIZE = 100;
        const SHOW_TILE_BORDERS = true;
        const tilePos = (coord) => coord * TILE_SIZE + (SHOW_TILE_BORDERS ? coord * 2 : 0);

        const activeAnimations = [
            {
                id: 'nova_1',
                type: 'dark_apotheosis_nova',
                sourceUnitId: 'hollow_pc',
                srcPx: { x: tilePos(1) + 50, y: tilePos(2) + 50 }
            }
        ];

        const battleData = {
            hollow_pc: hollowUnit,
            monster_1: monsterUnit
        };

        const { container } = render(
            <CombatGrid
                crew={[hollowUnit]}
                battleData={battleData}
                combatManager={cm}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
                activeAnimations={activeAnimations}
                TILE_SIZE={TILE_SIZE}
                SHOW_TILE_BORDERS={SHOW_TILE_BORDERS}
            />
        );

        // Find the nova animation element
        const novaElement = container.querySelector('div[style*="voidNovaExpand"]');
        expect(novaElement).toBeInTheDocument();

        // Must be centered at Hollow's tile center: left: 152px, top: 254px
        expect(novaElement.style.left).toBe('152px');
        expect(novaElement.style.top).toBe('254px');
        expect(novaElement.style.transform).toBe('translate(-50%, -50%)');
    });

    test('CombatGrid dynamically recalculates nova center if Hollow moved', () => {
        const TILE_SIZE = 100;
        const SHOW_TILE_BORDERS = true;
        const tilePos = (coord) => coord * TILE_SIZE + (SHOW_TILE_BORDERS ? coord * 2 : 0);

        // Hollow moved to (2, 3)
        const updatedHollow = { ...hollowUnit, coordinates: { x: 2, y: 3 } };

        const activeAnimations = [
            {
                id: 'nova_moved',
                type: 'dark_apotheosis_nova',
                sourceUnitId: 'hollow_pc',
                // Stale srcPx at (1, 2)
                srcPx: { x: tilePos(1) + 50, y: tilePos(2) + 50 }
            }
        ];

        const battleData = {
            hollow_pc: updatedHollow,
            monster_1: monsterUnit
        };

        const { container } = render(
            <CombatGrid
                crew={[updatedHollow]}
                battleData={battleData}
                combatManager={cm}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
                activeAnimations={activeAnimations}
                TILE_SIZE={TILE_SIZE}
                SHOW_TILE_BORDERS={SHOW_TILE_BORDERS}
            />
        );

        const novaElement = container.querySelector('div[style*="voidNovaExpand"]');
        expect(novaElement).toBeInTheDocument();

        // Must resolve to the live coordinates (2, 3):
        // left: 2 * 102 + 50 = 254px
        // top: 3 * 102 + 50 = 356px
        expect(novaElement.style.left).toBe('254px');
        expect(novaElement.style.top).toBe('356px');
        expect(novaElement.style.transform).toBe('translate(-50%, -50%)');
    });

    test('SiegeCombatGrid renders dark_apotheosis_nova centered on Hollow in siege grid', () => {
        const TILE_SIZE = 56;
        const SHOW_TILE_BORDERS = true;
        const tilePos = (coord) => coord * TILE_SIZE + (SHOW_TILE_BORDERS ? coord * 1 : 0);

        const battleData = {
            hollow_pc: hollowUnit,
            monster_1: monsterUnit
        };

        // Hollow is at (1, 2), player in siege offset is y + 4 = 6
        const activeAnimations = [
            {
                id: 'siege_nova',
                type: 'dark_apotheosis_nova',
                sourceUnitId: 'hollow_pc',
                srcPx: { x: tilePos(1) + 28, y: tilePos(6) + 28 }
            }
        ];

        const { container } = render(
            <SiegeCombatGrid
                crew={[hollowUnit]}
                battleData={battleData}
                combatManager={cm}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
                activeAnimations={activeAnimations}
                tileSize={TILE_SIZE}
                SHOW_TILE_BORDERS={SHOW_TILE_BORDERS}
            />
        );

        const novaElement = container.querySelector('div[style*="voidNovaExpand"]');
        expect(novaElement).toBeInTheDocument();

        const expectedX = `${tilePos(1) + TILE_SIZE / 2}px`;
        const expectedY = `${tilePos(6) + TILE_SIZE / 2}px`;

        expect(novaElement.style.left).toBe(expectedX);
        expect(novaElement.style.top).toBe(expectedY);
        expect(novaElement.style.transform).toBe('translate(-50%, -50%)');
    });
});
