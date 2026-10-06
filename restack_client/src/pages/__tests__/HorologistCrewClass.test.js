import { CrewManager, getTimeDebtCap, getEffectiveTimeDebt, computeTemporalStrainTier } from '../../utils/crew-manager';
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

const HOUR = 60 * 60 * 1000;

describe('Horologist crew class', () => {
    test('is registered with Seren as default and Odran as alternate', () => {
        const crewManager = new CrewManager();
        const horo = crewManager.adventurers.find(a => a.type === 'horologist');
        expect(horo).toBeDefined();
        expect(horo.name).toBe('Seren');
        expect(horo.id).toBe(9905);
        expect(horo.locked).toBeFalsy();
        expect(horo.portraitOptions.map(p => p.name)).toEqual(['Seren', 'Odran']);
        expect(horo.stats.timeDebt).toBe(0);
    });

    test('Horologist skills exist in the skills matrix', () => {
        ['future_echo', 'set_anchor', 'recall', 'hour_of_reckoning', 'clockwork_heart', 'ledger_of_hours']
            .forEach(k => expect(skillsMatrix[k]).toBeDefined());
    });
});

describe('Ledger of Hours (time debt)', () => {
    const makeHorologist = (level = 1) => ({ id: 'h1', type: 'horologist', level, stats: { timeDebt: 0 } });
    const makeTarget = (remainingMs, now) => ({
        id: 't1',
        specialActions: [{ endDate: new Date(now + remainingMs), available: false }]
    });

    test('cap scales with level and debt repays in real time', () => {
        expect(getTimeDebtCap(1)).toBe(5 * HOUR);
        expect(getTimeDebtCap(3)).toBe(7 * HOUR);
        const stats = { timeDebt: 2 * HOUR, timeDebtUpdatedAt: 0 };
        expect(getEffectiveTimeDebt(stats, HOUR)).toBe(HOUR);
        expect(getEffectiveTimeDebt(stats, 5 * HOUR)).toBe(0);
        expect(getEffectiveTimeDebt(stats, HOUR / 2, 2)).toBe(HOUR);
    });

    test('strain tiers follow 25/50/75% of cap', () => {
        const cap = getTimeDebtCap(1);
        expect(computeTemporalStrainTier(0, 1)).toBe(0);
        expect(computeTemporalStrainTier(cap * 0.2, 1)).toBe(0);
        expect(computeTemporalStrainTier(cap * 0.3, 1)).toBe(1);
        expect(computeTemporalStrainTier(cap * 0.6, 1)).toBe(2);
        expect(computeTemporalStrainTier(cap * 0.9, 1)).toBe(3);
    });

    test('borrowTime completes the action and records debt', () => {
        const cm = new CrewManager();
        const now = 1_000_000;
        const horo = makeHorologist();
        const target = makeTarget(2 * HOUR, now);
        const res = cm.borrowTime(horo, target, 0, now);
        expect(res.ok).toBe(true);
        expect(target.specialActions[0].available).toBe(true);
        expect(horo.stats.timeDebt).toBe(2 * HOUR);
        expect(cm.getTimeDebt(horo, now + HOUR)).toBe(HOUR);
    });

    test('borrowTime refuses over cap and for non-horologists', () => {
        const cm = new CrewManager();
        const now = 1_000_000;
        expect(cm.borrowTime(makeHorologist(), makeTarget(10 * HOUR, now), 0, now).reason).toBe('over_cap');
        expect(cm.borrowTime({ type: 'wizard', stats: {} }, makeTarget(HOUR, now), 0, now).reason).toBe('not_horologist');
    });
});

describe('Horologist combat (redux)', () => {
    let cm;
    let horo;
    let ally;
    let enemy;

    beforeEach(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
        cm = new CombatManagerRedux();
        cm.updateData = jest.fn();
        cm.futureEchoes = [];
        cm.timeAnchors = [];
        const base = () => ({ activeBuffs: [], activeDebuffs: [], damageIndicators: [], cooldowns: {}, maxEndurance: 50, endurance: 50 });
        horo = { ...base(), id: 'h', name: 'Seren', type: 'horologist', hp: 60, starting_hp: 60, stats: { hp: 60, atk: 20, def: 5, dex: 7 }, coordinates: { x: 0, y: 0 }, specials: ['future_echo', 'set_anchor', 'recall', 'hour_of_reckoning'] };
        ally = { ...base(), id: 'a', name: 'Ally', type: 'soldier', hp: 80, starting_hp: 80, stats: { hp: 80, atk: 10, def: 5, dex: 4 }, coordinates: { x: 1, y: 1 } };
        enemy = { ...base(), id: 'e', name: 'Ogre', type: 'brute', isMonster: true, hp: 200, starting_hp: 200, stats: { hp: 200, atk: 10, def: 0, dex: 3 }, coordinates: { x: 4, y: 0 } };
        cm.combatants = { h: horo, a: ally, e: enemy };
        cm.damageCheck = (caller, target, raw) => raw; // isolate horologist math from armor/amulets
    });

    test('Future Echo deals more damage the longer it is delayed', () => {
        const ability = skillsMatrix.future_echo;
        const e1 = cm._queueFutureEcho(horo, enemy, ability, 1);
        const e3 = cm._queueFutureEcho(horo, enemy, ability, 3);
        expect(cm._echoDamage(horo, e1)).toBe(Math.round(20 * 1.35));
        expect(cm._echoDamage(horo, e3)).toBe(Math.round(20 * 2.05));
    });

    test('echoes tick down and land on schedule', () => {
        cm._queueFutureEcho(horo, enemy, skillsMatrix.future_echo, 2);
        cm._tickHorologistTimeline();
        expect(enemy.hp).toBe(200);
        expect(enemy.incomingEchoes[0].roundsLeft).toBe(1);
        cm._tickHorologistTimeline();
        expect(enemy.hp).toBe(200 - Math.round(20 * 1.7));
        expect(cm.futureEchoes.length).toBe(0);
    });

    test('echo redirects to nearest enemy when its target dies', () => {
        const enemy2 = { ...enemy, id: 'e2', name: 'Imp', hp: 50, coordinates: { x: 5, y: 0 }, damageIndicators: [] };
        cm.combatants.e2 = enemy2;
        cm._queueFutureEcho(horo, enemy, skillsMatrix.future_echo, 1);
        enemy.dead = true;
        enemy.hp = 0;
        cm._tickHorologistTimeline();
        expect(enemy2.hp).toBeLessThan(50);
    });

    test('Recall heals an ally back to the anchored HP and position', () => {
        cm.canFitAt = () => true;
        cm.updateUnitCoordinates = (u, x, y) => { u.coordinates = { x, y }; };
        const anchor = cm._setAnchor(horo, ally, skillsMatrix.set_anchor);
        ally.hp = 30;
        ally.coordinates = { x: 3, y: 3 };
        cm._recallAnchor(horo, anchor);
        expect(ally.hp).toBe(80);
        expect(ally.coordinates).toEqual({ x: 1, y: 1 });
        expect(cm.timeAnchors.length).toBe(0);
    });

    test('Recall on an enemy removes healing since the anchor and detonates pending echoes', () => {
        cm.canFitAt = () => false;
        enemy.hp = 100;
        const anchor = cm._setAnchor(horo, enemy, skillsMatrix.set_anchor);
        enemy.hp = 150; // enemy healed
        cm._queueFutureEcho(horo, enemy, skillsMatrix.future_echo, 3);
        cm._recallAnchor(horo, anchor);
        expect(enemy.hp).toBe(100 - Math.round(20 * 2.05));
        expect(cm.futureEchoes.length).toBe(0);
    });

    test('anchors crystallize after 4 rounds and Shatter for 150% of the HP change', () => {
        const anchor = cm._setAnchor(horo, enemy, skillsMatrix.set_anchor);
        enemy.hp = 160; // took 40 damage since anchor
        for (let i = 0; i < 4; i++) cm._tickHorologistTimeline();
        expect(anchor.crystallized).toBe(true);
        expect(enemy.timeAnchor.crystallized).toBe(true);
        cm._recallAnchor(horo, anchor, 1.5);
        expect(enemy.hp).toBe(160 - 60);
    });

    test('only two anchors per Horologist; the oldest unwinds', () => {
        const enemy2 = { ...enemy, id: 'e2', damageIndicators: [] };
        cm.combatants.e2 = enemy2;
        cm._setAnchor(horo, ally, skillsMatrix.set_anchor);
        cm._setAnchor(horo, enemy, skillsMatrix.set_anchor);
        cm._setAnchor(horo, enemy2, skillsMatrix.set_anchor);
        expect(cm.timeAnchors.map(a => a.targetId)).toEqual(['e', 'e2']);
    });

    test('Clockwork Heart locks turn-order speed against haste', () => {
        expect(cm._hasClockworkHeart(horo)).toBe(true);
        const before = cm._getTurnOrderSpeed(horo);
        horo.stats.speed = 99;
        expect(cm._getTurnOrderSpeed(horo)).toBe(before);
        ally.stats.speed = 99;
        expect(cm._getTurnOrderSpeed(ally)).toBe(99);
    });

    test('Temporal Strain is read from the Horologist time debt', () => {
        horo.level = 1;
        horo.stats.timeDebt = getTimeDebtCap(1) * 0.6;
        horo.stats.timeDebtUpdatedAt = Date.now();
        expect(cm._getTemporalStrainTier(horo)).toBe(2);
        expect(cm._getTemporalStrainTier(enemy)).toBe(0);
    });

    test('Hour of Reckoning fires all echoes at max delay', () => {
        cm._queueFutureEcho(horo, enemy, skillsMatrix.future_echo, 1);
        cm._queueFutureEcho(horo, enemy, skillsMatrix.future_echo, 1);
        cm._executeHorologistAbility(horo, skillsMatrix.hour_of_reckoning, 'hour_of_reckoning', horo);
        expect(enemy.hp).toBe(200 - 2 * Math.round(20 * 2.05));
        expect(cm.futureEchoes.length).toBe(0);
    });
});
