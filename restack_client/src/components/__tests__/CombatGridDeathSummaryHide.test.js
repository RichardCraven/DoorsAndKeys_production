import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CombatGrid from '../combat-panes/CombatGrid';

describe('CombatGrid - Hide Mid-Death Units on Battle Summary', () => {
    const mockCrew = [
        { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', stats: { hp: 100 }, starting_hp: 100, maxEndurance: 100 },
        { id: 'hero2', name: 'Yu', portrait: 'avatar', type: 'monk', stats: { hp: 80 }, starting_hp: 80, maxEndurance: 100 }
    ];

    const mockCombatManager = {
        combatants: {},
        getCombatant: (id) => null,
        round: 1,
        showBars: true,
        combatPaused: false,
    };

    test('renders living monster and heroes when combat is ongoing and showSummaryPanel is false', () => {
        const battleData = {
            hero1: { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', hp: 100, starting_hp: 100, coordinates: { x: 1, y: 1 } },
            hero2: { id: 'hero2', name: 'Yu', portrait: 'avatar', type: 'monk', hp: 80, starting_hp: 80, coordinates: { x: 1, y: 2 } },
            monster1: { id: 'monster1', name: 'Dire Wolf', portrait: 'avatar', isMonster: true, hp: 50, starting_hp: 50, coordinates: { x: 4, y: 1 } },
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrew}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={false}
            />
        );

        expect(container.querySelector('[data-monster-id="monster1"]')).not.toBeNull();
        expect(container.querySelector('#unit-tile-hero1')).not.toBeNull();
        expect(container.querySelector('#unit-tile-hero2')).not.toBeNull();
    });

    test('completely hides dead monster when showSummaryPanel is true', () => {
        const battleData = {
            hero1: { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', hp: 100, starting_hp: 100, coordinates: { x: 1, y: 1 } },
            monster1: { id: 'monster1', name: 'Dire Wolf', portrait: 'avatar', isMonster: true, dead: true, hp: 0, starting_hp: 50, coordinates: { x: 4, y: 1 } },
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrew}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={true}
            />
        );

        // Living hero must still be rendered
        expect(container.querySelector('#unit-tile-hero1')).not.toBeNull();
        // Dead monster must NOT be rendered at all
        expect(container.querySelector('[data-monster-id="monster1"]')).toBeNull();
        expect(container.querySelector('.monster-portrait.dead')).toBeNull();
        expect(container.querySelector('.monsterDeadAnimation')).toBeNull();
    });

    test('completely hides fallen hero when showSummaryPanel is true while surviving hero remains visible', () => {
        const battleData = {
            hero1: { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', hp: 100, starting_hp: 100, coordinates: { x: 1, y: 1 } },
            hero2: { id: 'hero2', name: 'Yu', portrait: 'avatar', type: 'monk', dead: true, hp: 0, starting_hp: 80, coordinates: { x: 1, y: 2 } },
            monster1: { id: 'monster1', name: 'Dire Wolf', portrait: 'avatar', isMonster: true, dead: true, hp: 0, starting_hp: 50, coordinates: { x: 4, y: 1 } },
        };

        const { container } = render(
            <CombatGrid
                crew={mockCrew}
                battleData={battleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => battleData[f.id] || f}
                showSummaryPanel={true}
            />
        );

        // Surviving hero is rendered
        expect(container.querySelector('#unit-tile-hero1')).not.toBeNull();
        // Dead hero is completely hidden
        expect(container.querySelector('#unit-tile-hero2')).toBeNull();
        // Dead monster is completely hidden
        expect(container.querySelector('[data-monster-id="monster1"]')).toBeNull();
    });

    test('transitions from active death animation to completely hidden when showSummaryPanel becomes true', () => {
        const dyingBattleData = {
            hero1: { id: 'hero1', name: 'Sardonis', portrait: 'avatar', type: 'soldier', hp: 100, starting_hp: 100, coordinates: { x: 1, y: 1 } },
            monster1: { id: 'monster1', name: 'Dire Wolf', portrait: 'avatar', isMonster: true, dead: true, hp: 0, starting_hp: 50, coordinates: { x: 4, y: 1 } },
        };

        const { container, rerender } = render(
            <CombatGrid
                crew={mockCrew}
                battleData={dyingBattleData}
                combatManager={mockCombatManager}
                getFighterDetails={(f) => dyingBattleData[f.id] || f}
                showSummaryPanel={false}
            />
        );

        // While summary is false, dying monster renders with death animation classes
        const dyingMonster = container.querySelector('[data-monster-id="monster1"]');
        expect(dyingMonster).not.toBeNull();

        // Now battle summary modal opens
        act(() => {
            rerender(
                <CombatGrid
                    crew={mockCrew}
                    battleData={dyingBattleData}
                    combatManager={mockCombatManager}
                    getFighterDetails={(f) => dyingBattleData[f.id] || f}
                    showSummaryPanel={true}
                />
            );
        });

        // The dying monster must now be completely removed from the DOM
        expect(container.querySelector('[data-monster-id="monster1"]')).toBeNull();
        expect(container.querySelector('#unit-tile-hero1')).not.toBeNull();
    });
});
