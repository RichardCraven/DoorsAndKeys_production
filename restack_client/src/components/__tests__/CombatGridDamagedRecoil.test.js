import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CombatGrid from '../combat-panes/CombatGrid';

describe('CombatGrid Damaged Animation & Recoil', () => {
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

    test('renders unit-damaged-recoil-wrapper with directional jerk and hit-flash when player unit takes damage', () => {
        const battleData = {
            hero1: {
                id: 'hero1',
                name: 'Sardonis',
                portrait: 'avatar',
                type: 'soldier',
                hp: 75,
                starting_hp: 100,
                facing: 'right',
                coordinates: { x: 1, y: 1 },
                damageIndicators: [
                    { id: 'dmg_1', value: 25, type: 'damage' }
                ]
            }
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

        // Fighter portrait should be wrapped in recoil wrapper
        const recoilWrapper = container.querySelector('.unit-damaged-recoil-wrapper');
        expect(recoilWrapper).toBeInTheDocument();
        // Facing right -> recoils left (opposite facing)
        expect(recoilWrapper.className).toContain('damaged-jerk-left');

        // Hit flash overlay should be present on the damaged unit
        const hitFlash = container.querySelector('.hit-flash-overlay');
        expect(hitFlash).toBeInTheDocument();

        // indicators-wrapper (health & endurance bars) must NOT be inside the recoil wrapper
        const indicatorsInsideRecoil = recoilWrapper.querySelector('.indicators-wrapper');
        expect(indicatorsInsideRecoil).toBeNull();
    });

    test('renders unit-damaged-recoil-wrapper with damaged-jerk-right when monster takes damage', () => {
        const battleData = {
            hero1: {
                id: 'hero1',
                name: 'Sardonis',
                portrait: 'avatar',
                type: 'soldier',
                hp: 100,
                starting_hp: 100,
                facing: 'right',
                coordinates: { x: 1, y: 1 }
            },
            goblin: {
                id: 'goblin',
                name: 'Goblin',
                portrait: 'goblin',
                isMonster: true,
                hp: 35,
                starting_hp: 50,
                facing: 'left',
                coordinates: { x: 5, y: 1 },
                damageIndicators: [
                    { id: 'dmg_goblin_1', value: 15, type: 'damage' }
                ]
            }
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

        // Monster unit-tile should contain the recoil wrapper
        const monsterTile = container.querySelector('[data-monster-id="goblin"]');
        expect(monsterTile).toBeInTheDocument();

        const monsterRecoil = monsterTile.querySelector('.unit-damaged-recoil-wrapper');
        expect(monsterRecoil).toBeInTheDocument();
        // Facing left -> recoils right
        expect(monsterRecoil.className).toContain('damaged-jerk-right');

        // Hit flash overlay inside monster
        const monsterHitFlash = monsterTile.querySelector('.hit-flash-overlay');
        expect(monsterHitFlash).toBeInTheDocument();

        // HP bar is outside the recoil wrapper
        const hpBarInsideRecoil = monsterRecoil.querySelector('.indicators-wrapper');
        expect(hpBarInsideRecoil).toBeNull();
    });

    test('directional recoil respects attack sourceDirection (e.g. from top recoils down)', () => {
        const battleData = {
            hero1: {
                id: 'hero1',
                name: 'Sardonis',
                portrait: 'avatar',
                type: 'soldier',
                hp: 80,
                starting_hp: 100,
                facing: 'right',
                coordinates: { x: 1, y: 1 },
                damageIndicators: [
                    { id: 'dmg_top_1', value: 20, type: 'damage', sourceDirection: 'top' }
                ]
            }
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

        const recoilWrapper = container.querySelector('.unit-damaged-recoil-wrapper');
        expect(recoilWrapper).toBeInTheDocument();
        // Attack from top -> jerk down
        expect(recoilWrapper.className).toContain('damaged-jerk-down');
    });

    test('dead units do not render active recoil jerk animations', () => {
        const battleData = {
            hero1: {
                id: 'hero1',
                name: 'Sardonis',
                portrait: 'avatar',
                type: 'soldier',
                dead: true,
                hp: 0,
                starting_hp: 100,
                coordinates: { x: 1, y: 1 },
                damageIndicators: [
                    { id: 'fatal_1', value: 100, type: 'damage' }
                ]
            }
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

        const activeJerk = container.querySelector('.damaged-jerk-left, .damaged-jerk-right, .damaged-jerk-up, .damaged-jerk-down');
        expect(activeJerk).toBeNull();
    });
});
