import { CrewManager } from '../../utils/crew-manager';
import { CombatManagerRedux } from '../../utils/combat-manager-redux';
import skillsMatrix from '../../utils/skills-matrix';

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

describe('Glitterburn crew class registration & stats', () => {
    test('is registered unlocked with Glitterburn default and Astra alternate', () => {
        const crewManager = new CrewManager();
        const gb = crewManager.adventurers.find(a => a.type === 'glitterburn');
        expect(gb).toBeDefined();
        expect(gb.name).toBe('Glitterburn');
        expect(gb.id).toBe(9903);
        expect(gb.locked).toBeFalsy();
        expect(gb.disabled).toBeFalsy();
        expect(gb.portraitOptions.map(p => p.name)).toEqual(['Glitterburn', 'Astra']);
        expect(gb.skills).toContain('pyro_spark');
        expect(gb.skills).toContain('glitter_burst');
        expect(gb.skills).toContain('prism_snare');
        expect(gb.skills).toContain('starlight_decoy');
        expect(gb.skills).toContain('supernova_core');
        expect(gb.expeditionSkills).toEqual(['blinding_beacon', 'prismatic_flare']);
        expect(gb.passives).toEqual(['sparkling_aura', 'pyrotechnic_chain']);
    });

    test('stat constituents calculate derived attack from [int, dex] and defense from [dex, int]', () => {
        const crewManager = new CrewManager();
        const member = {
            id: 'g1',
            type: 'glitterburn',
            name: 'Glitterburn',
            stats: { int: 10, dex: 6, fort: 4, str: 2, baseHp: 24 }
        };
        crewManager.computeDerivedStats(member);
        // Derived attack = int (10) + floor(dex/2) (3) = 13
        expect(member.stats.atk).toBe(13);
        // Derived defense = dex (6) + floor(int/2) (5) = 11 (combine uses floor(sec/2))
        expect(member.stats.def).toBe(11);
    });

    test('Glitterburn skills exist in the skills matrix', () => {
        [
            'pyro_spark',
            'glitter_burst',
            'prism_snare',
            'starlight_decoy',
            'supernova_core',
            'sparkling_aura',
            'pyrotechnic_chain',
            'blinding_beacon',
            'prismatic_flare'
        ].forEach(k => expect(skillsMatrix[k]).toBeDefined());
    });
});

describe('Glitterburn combat & traps (redux)', () => {
    let cm;
    let gb;
    let monster1;
    let monster2;

    beforeEach(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
        cm = new CombatManagerRedux();
        cm.updateData = jest.fn();
        cm.glitterTraps = [];
        cm.supernovaCores = [];
        const base = () => ({ activeBuffs: [], activeDebuffs: [], damageIndicators: [], cooldowns: {}, maxEndurance: 50, endurance: 50 });
        gb = {
            ...base(),
            id: 'gb1',
            name: 'Glitterburn',
            type: 'glitterburn',
            hp: 50,
            starting_hp: 50,
            stats: { hp: 50, atk: 20, def: 8, int: 12, dex: 8 },
            coordinates: { x: 0, y: 2 },
            specials: ['pyro_spark', 'glitter_burst', 'prism_snare', 'starlight_decoy', 'supernova_core'],
            passives: ['sparkling_aura', 'pyrotechnic_chain']
        };
        monster1 = {
            ...base(),
            id: 'm1',
            name: 'Ogre',
            type: 'ogre',
            isMonster: true,
            hp: 150,
            starting_hp: 150,
            stats: { hp: 150, atk: 15, def: 0, speed: 2 },
            coordinates: { x: 3, y: 2 }
        };
        monster2 = {
            ...base(),
            id: 'm2',
            name: 'Goblin',
            type: 'goblin_thief',
            isMonster: true,
            hp: 60,
            starting_hp: 60,
            stats: { hp: 60, atk: 10, def: 0, speed: 4 },
            coordinates: { x: 3, y: 3 }
        };
        cm.combatants = { gb1: gb, m1: monster1, m2: monster2 };
        cm.damageCheck = (caller, target, raw) => raw;
    });

    test('Pyro Spark deals fire damage and applies Dazzled stack', () => {
        const ability = skillsMatrix.pyro_spark;
        cm.useAbility(gb, ability, monster1);
        expect(monster1.hp).toBeLessThan(150);
        expect(monster1.dazzled).toBe(1);
    });

    test('Starlight Decoy summons a high-priority decoy and monsters target it', () => {
        const ability = skillsMatrix.starlight_decoy;
        cm.useAbility(gb, ability, gb);

        const decoyEntry = Object.values(cm.combatants).find(c => c.isDecoy);
        expect(decoyEntry).toBeDefined();
        expect(decoyEntry.name).toBe('Starlight Decoy');
        expect(decoyEntry.hp).toBeGreaterThan(0);

        // Monster acquiring target should strongly prioritize the decoy
        const target = cm.acquireTarget(monster1);
        expect(target.isDecoy).toBe(true);
    });

    test('Prism Snare places trap hazard and triggers on step-on, rooting and refracting damage', () => {
        const ability = skillsMatrix.prism_snare;
        // Deploy trap at (3, 2) where monster1 is standing
        cm.useAbility(gb, ability, { coordinates: { x: 3, y: 2 } });
        expect(cm.glitterTraps.length).toBe(1);

        // Step-on check triggers
        cm._checkGlitterTrapTrigger(monster1);
        expect(monster1.rooted).toBe(true);
        expect(monster1.hp).toBeLessThan(150);
        // Refraction should deal splash to adjacent monster2 at (3, 3)
        expect(monster2.hp).toBeLessThan(60);
        expect(cm.glitterTraps.length).toBe(0);
    });

    test('Supernova Core pulls enemies inward and detonates after 2 rounds', () => {
        const ability = skillsMatrix.supernova_core;
        cm.useAbility(gb, ability, { coordinates: { x: 2, y: 2 } });
        expect(cm.supernovaCores.length).toBe(1);

        // Round 1 tick: suction pulls monster1 from x:3 toward x:2
        cm._tickGlitterburnTimeline();
        expect(monster1.coordinates.x).toBe(2);
        expect(cm.supernovaCores[0].roundsLeft).toBe(1);

        // Round 2 tick: detonate
        cm._tickGlitterburnTimeline();
        expect(cm.supernovaCores.length).toBe(0);
        expect(monster1.hp).toBeLessThan(150);
        expect(monster1.dazzled).toBeGreaterThanOrEqual(2);
    });
});

describe('Glitterburn special preparation actions', () => {
    test('beginSpecialAction supports phosphor_lure, flashbang_powder, and mirror_decoy', () => {
        const crewManager = new CrewManager();
        const gb = {
            id: 'gb1',
            type: 'glitterburn',
            level: 1,
            specialActions: []
        };

        crewManager.beginSpecialAction(gb, { type: 'craft_phosphor_lure' });
        expect(gb.specialActions.length).toBe(1);
        expect(gb.specialActions[0].type).toBe('phosphor_lure');
        expect(gb.specialActions[0].available).toBe(false);

        crewManager.beginSpecialAction(gb, { type: 'brew_flashbang' });
        expect(gb.specialActions.length).toBe(2);
        expect(gb.specialActions[1].type).toBe('flashbang_powder');

        crewManager.beginSpecialAction(gb, { type: 'assemble_mirror_decoy' });
        expect(gb.specialActions.length).toBe(3);
        expect(gb.specialActions[2].type).toBe('mirror_decoy');
    });
});
