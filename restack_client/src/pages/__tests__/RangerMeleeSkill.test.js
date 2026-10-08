import React from 'react';
import { render, screen } from '@testing-library/react';
import CrewManagerPage from '../CrewManagerPage';
import { CrewManager } from '../../utils/crew-manager';
import skillsMatrix from '../../utils/skills-matrix';
import * as images from '../../utils/images';
import { CombatManagerRedux } from '../../utils/combat-manager-redux';

jest.mock('../../utils/session-handler', () => ({
    getMeta: jest.fn(() => ({ crew: [] })),
    storeMeta: jest.fn(),
    getUserId: jest.fn(() => 'test_user')
}));

jest.mock('../../utils/api-handler', () => ({
    updateUserRequest: jest.fn(() => Promise.resolve({ ok: true }))
}));

describe('Ranger Melee Attack & Crew Selection Header', () => {
    test('hunting_knife skill is properly defined in skills-matrix with close range and piercing damage', () => {
        const skill = skillsMatrix.hunting_knife;
        expect(skill).toBeDefined();
        expect(skill.id).toBe('hunting_knife');
        expect(skill.name).toBe('Hunting Knife');
        expect(skill.class).toBe('ranger');
        expect(skill.range).toBe('close');
        expect(skill.type).toBe('damage');
        expect(skill.damageType).toBe('piercing');
        expect(skill.atkPercentage).toBeGreaterThanOrEqual(100);
        expect(skill.knownByDefault).toBe(true);
        expect(skill.icon).toBeDefined();
        expect(images.ranger_hunting_knife).toBeDefined();
    });

    test('CrewManager initializes Ranger with hunting_knife in skills', () => {
        const crewManager = new CrewManager();
        const ranger = crewManager.adventurers.find(a => a.type === 'ranger');
        expect(ranger).toBeDefined();
        expect(ranger.skills).toContain('hunting_knife');

        // Test migration-safe initialization
        const legacyRanger = {
            id: 789,
            type: 'ranger',
            skills: ['loose', 'notch', 'mark'],
            specialActions: []
        };
        crewManager.initializeCrew([legacyRanger]);
        expect(crewManager.crew[0].skills).toContain('hunting_knife');
    });

    test('CombatManagerRedux initializes hunting_knife in ranger attacks and recognizes it as melee', () => {
        const cm = new CombatManagerRedux();
        const combatData = {
            crew: [
                {
                    id: 'ranger_1',
                    type: 'ranger',
                    dead: false,
                    hp: 30,
                    stats: { atk: 10, vitality: 30 },
                    attacks: ['loose'],
                    specials: ['notch']
                }
            ]
        };

        cm.initializeCombat(combatData);
        const ranger = cm.combatants['ranger_1'];
        expect(ranger).toBeDefined();
        expect(ranger.attacks.some(a => (typeof a === 'string' ? a : a.id) === 'hunting_knife')).toBe(true);
        expect(ranger.attacks.some(a => (typeof a === 'string' ? a : a.id) === 'loose')).toBe(true);
    });

    test('CombatManagerRedux _aiRanger uses hunting_knife when an enemy is in close quarters', () => {
        const cm = new CombatManagerRedux();
        const ranger = {
            id: 'ranger_1',
            type: 'ranger',
            isMonster: false,
            dead: false,
            hp: 30,
            coordinates: { x: 5, y: 5 },
            attacks: ['loose', 'hunting_knife'],
            specials: ['notch'],
            arrowNotched: false,
            cooldowns: {},
            movesTakenThisRound: 0,
            actionsTakenThisRound: 0,
            stats: { atk: 10, speed: 5 }
        };

        const enemy = {
            id: 'monster_1',
            type: 'goblin',
            isMonster: true,
            dead: false,
            hp: 25,
            coordinates: { x: 5, y: 6 }, // Adjacent!
            cooldowns: {},
            stats: { atk: 5 }
        };

        cm.combatants = {
            ranger_1: ranger,
            monster_1: enemy
        };

        const usedAbilities = [];
        cm.useAbility = jest.fn((caller, ability, target) => {
            usedAbilities.push({ abilityId: ability.id, targetId: target.id });
        });
        cm.repositionUnit = jest.fn();

        cm._aiRanger(ranger, enemy);

        // Ranger should have struck the adjacent enemy with hunting_knife
        expect(usedAbilities.some(u => u.abilityId === 'hunting_knife' && u.targetId === 'monster_1')).toBe(true);
    });

    test('CrewManagerPage renders header bar with back button and choose your crew title cleanly separated', () => {
        render(<CrewManagerPage />);
        const backBtn = screen.getByRole('button', { name: /back/i });
        const title = screen.getByText(/choose your crew/i);

        expect(backBtn).toBeInTheDocument();
        expect(title).toBeInTheDocument();
        expect(title.style.marginTop).not.toBe('-24px');
    });
});
