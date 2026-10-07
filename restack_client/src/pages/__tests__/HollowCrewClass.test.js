import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CrewManagerPage from '../CrewManagerPage';
import { CrewManager } from '../../utils/crew-manager';
import { FighterAI } from '../../utils/fighter-ai/fighter-ai';

jest.mock('../../utils/images', () => {
    const original = jest.requireActual('../../utils/images');
    return {
        ...original,
        getMeta: jest.fn(() => ({ crew: [] })),
        storeMeta: jest.fn(),
        updateUserRequest: jest.fn(),
        getUserId: jest.fn(() => 'test_user')
    };
});

describe('Hollow Crew Class Option', () => {
    test('Hollow class option is registered with Valok as default and Mira as alternate', () => {
        const crewManager = new CrewManager();
        const hollow = crewManager.adventurers.find(a => a.type === 'hollow' || a.image === 'hollow');

        expect(hollow).toBeDefined();
        expect(hollow.name).toBe('Valok');
        expect(hollow.id).toBe(9904);
        expect(hollow.class).toBe('spellcaster');
        expect(hollow.disabled).toBeFalsy();
        expect(hollow.locked).toBeFalsy();

        expect(hollow.portraitOptions).toBeDefined();
        expect(hollow.portraitOptions.length).toBe(2);
        expect(hollow.portraitOptions[0].id).toBe('valok');
        expect(hollow.portraitOptions[0].name).toBe('Valok');
        expect(hollow.portraitOptions[1].id).toBe('mira');
        expect(hollow.portraitOptions[1].name).toBe('Mira');

        expect(hollow.skills).toContain('void_touch');
        expect(hollow.skills).toContain('death_grasp');
        expect(hollow.passives).toContain('undying_presence');
        expect(hollow.passives).toContain('dungeon_sense');
    });

    test('CrewManager initializes Hollow and calculates derived stats based on int/dex attack constituents', () => {
        const crewManager = new CrewManager();
        const hollowTemplate = crewManager.adventurers.find(a => a.type === 'hollow');
        const hollowCopy = JSON.parse(JSON.stringify(hollowTemplate));

        crewManager.initializeCrew([hollowCopy]);
        expect(crewManager.crew.length).toBe(1);
        const crewMember = crewManager.crew[0];
        expect(crewMember.stats.atk).toBeDefined();
        expect(crewMember.stats.def).toBeDefined();
        expect(crewMember.stats.atk).toBe(10);
        expect(crewMember.stats.def).toBe(9);
    });

    test('FighterAI registers Hollow profile with shade-stalker behavior', () => {
        const fighterAI = new FighterAI(7, 6, 400);
        fighterAI.connectUtilMethods({
            broadcastDataUpdate: jest.fn(),
            kickoffAttackCooldown: jest.fn(),
            kickoffSpecialCooldown: jest.fn(),
            missesTarget: jest.fn(),
            hitsTarget: jest.fn(),
            hitsCombatant: jest.fn(),
            targetKilled: jest.fn()
        });
        fighterAI.initializeRoster(null);

        expect(fighterAI.roster.hollow).toBeDefined();

        const caller = {
            id: 9904,
            name: 'Valok',
            type: 'hollow',
            fighterType: 'hollow',
            coordinates: { x: 2, y: 2 },
            facing: 'right',
            attacks: [
                { name: 'void touch', range: 'close', cooldown_position: 100 },
                { name: 'death grasp', range: 'medium', cooldown_position: 100 }
            ],
            moveCooldown: 300,
            onMoveCooldown: false
        };

        fighterAI.roster.hollow.initialize(caller);
        expect(caller.behaviorSequence).toBe('shade-stalker');
        expect(caller.shadeMode).toBe(false);

        const combatants = {
            9904: caller,
            'm1': {
                id: 'm1',
                name: 'Goblin',
                isMonster: true,
                dead: false,
                coordinates: { x: 3, y: 2 }
            }
        };

        fighterAI.roster.hollow.acquireTarget(caller, combatants);
        expect(caller.targetId).toBe('m1');
        expect(caller.pendingAttack).toBeDefined();
        expect(caller.pendingAttack.name).toBe('void touch');
    });

    test('Hollow is selectable in CrewManagerPage', () => {
        const crewManager = new CrewManager();
        const { container } = render(<CrewManagerPage crewManager={crewManager} />);

        const hollowOption = container.querySelector('.crew-options .portrait[data-type="hollow"]');
        expect(hollowOption).not.toBeNull();
        expect(hollowOption.classList.contains('locked')).toBe(false);

        fireEvent.click(hollowOption, { detail: 1 });
        const nameInput = container.querySelector('.member-name input');
        expect(nameInput.value).toBe('Valok');
    });
});
