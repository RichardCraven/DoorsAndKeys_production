import { CrewManager } from '../crew-manager';
import { getMeta, storeMeta } from '../session-handler';

describe('Final Death Rollback and Level History System', () => {
    let crewManager;

    beforeEach(() => {
        crewManager = new CrewManager();
        crewManager.initializeCrew(crewManager.adventurers);
        storeMeta({
            deathTracker: 0,
            crew: [],
            alternateCrew: [],
            userLevel: 5,
            userExperience: 1200,
            userPerks: ['scavenger_insight', 'field_medic']
        });
    });

    test('initializeCrew preserves initial level 1 snapshot in levelHistory', () => {
        const soldier = crewManager.crew.find(c => c.type === 'soldier');
        expect(soldier).toBeDefined();
        expect(Array.isArray(soldier.levelHistory)).toBe(true);
        expect(soldier.levelHistory.length).toBeGreaterThanOrEqual(1);

        const lvl1Snapshot = soldier.levelHistory.find(h => h.level === 1);
        expect(lvl1Snapshot).toBeDefined();
        expect(lvl1Snapshot.level).toBe(1);
        expect(lvl1Snapshot.stats.str).toBe(soldier.stats.str);
        expect(lvl1Snapshot.skills).toEqual(soldier.skills);
    });

    test('levelUp and applyLevelUpChoices record running level history with chosen stats & perks', () => {
        const soldier = crewManager.crew.find(c => c.type === 'soldier');
        expect(soldier.level).toBe(1);
        const lvl1Str = soldier.stats.str;

        // Level up from 1 to 2
        crewManager.levelUp(soldier);
        expect(soldier.level).toBe(2);

        // Apply level 2 choices: +2 FORT attrBoost and unlock whirlwind skill
        crewManager.applyLevelUpChoices(soldier, {
            attrBoost: { stat: 'fort', amount: 2 },
            skillKey: 'whirlwind'
        });

        const lvl2Snapshot = soldier.levelHistory.find(h => h.level === 2);
        expect(lvl2Snapshot).toBeDefined();
        expect(lvl2Snapshot.level).toBe(2);
        expect(lvl2Snapshot.skills).toContain('whirlwind');
        expect(lvl2Snapshot.stats.fort).toBe(soldier.stats.fort);

        // Level up from 2 to 3
        crewManager.levelUp(soldier);
        expect(soldier.level).toBe(3);

        crewManager.applyLevelUpChoices(soldier, {
            attrBoost: { stat: 'dex', amount: 2 },
            skillKey: 'shield_bash'
        });

        // Level up from 3 to 4
        crewManager.levelUp(soldier);
        expect(soldier.level).toBe(4);

        crewManager.applyLevelUpChoices(soldier, {
            attrBoost: { stat: 'str', amount: 2 },
            skillKey: 'battle_cry'
        });

        expect(soldier.levelHistory.length).toBe(4);
        expect(soldier.levelHistory.map(h => h.level)).toEqual([1, 2, 3, 4]);
    });

    test('rollbackCrewMemberToHalfLevel sets level back to 1/2 (rounded down) and restores level state', () => {
        const soldier = crewManager.crew.find(c => c.type === 'soldier');

        // Level up to Level 4
        crewManager.levelUp(soldier); // lvl 2
        crewManager.applyLevelUpChoices(soldier, { attrBoost: { stat: 'fort', amount: 2 }, skillKey: 'whirlwind' });
        const lvl2Stats = JSON.parse(JSON.stringify(soldier.stats));
        const lvl2Skills = [...soldier.skills];

        crewManager.levelUp(soldier); // lvl 3
        crewManager.applyLevelUpChoices(soldier, { attrBoost: { stat: 'dex', amount: 2 }, skillKey: 'shield_bash' });

        crewManager.levelUp(soldier); // lvl 4
        crewManager.applyLevelUpChoices(soldier, { attrBoost: { stat: 'str', amount: 2 }, skillKey: 'battle_cry' });
        expect(soldier.level).toBe(4);

        // Equip items
        soldier.inventory = [{ id: 'sword_of_might', type: 'weapon' }, { id: 'iron_shield', type: 'shield' }];

        // Roll back from Level 4: Math.floor(4 / 2) = 2
        crewManager.rollbackCrewMemberToHalfLevel(soldier);

        expect(soldier.level).toBe(2);
        expect(soldier.stats.fort).toBe(lvl2Stats.fort);
        expect(soldier.skills).toEqual(lvl2Skills);
        expect(soldier.skills).not.toContain('battle_cry');
        expect(soldier.skills).not.toContain('shield_bash');
        // All items lost
        expect(soldier.inventory).toEqual([]);
        // Alive and health restored
        expect(soldier.dead).toBe(false);
        expect(soldier.hp).toBeGreaterThan(0);
        // History pruned to <= 2
        expect(soldier.levelHistory.map(h => h.level)).toEqual([1, 2]);
    });

    test('rollbackCrewMemberToHalfLevel correctly handles odd levels (Level 3 -> Level 1, Level 5 -> Level 2)', () => {
        const wizard = crewManager.crew.find(c => c.type === 'wizard');
        const lvl1Stats = JSON.parse(JSON.stringify(wizard.stats));
        const lvl1Skills = [...wizard.skills];

        // Level up to Level 3
        crewManager.levelUp(wizard); // lvl 2
        crewManager.applyLevelUpChoices(wizard, { attrBoost: { stat: 'int', amount: 2 }, skillKey: 'chain_lightning' });
        crewManager.levelUp(wizard); // lvl 3
        crewManager.applyLevelUpChoices(wizard, { attrBoost: { stat: 'dex', amount: 2 }, skillKey: 'arcane_nova' });

        expect(wizard.level).toBe(3);
        wizard.inventory = [{ id: 'wand_of_fire', type: 'wand' }];

        // Math.floor(3 / 2) = 1
        crewManager.rollbackCrewMemberToHalfLevel(wizard);

        expect(wizard.level).toBe(1);
        expect(wizard.stats.int).toBe(lvl1Stats.int);
        expect(wizard.skills).toEqual(lvl1Skills);
        expect(wizard.skills).not.toContain('chain_lightning');
        expect(wizard.skills).not.toContain('arcane_nova');
        expect(wizard.inventory).toEqual([]);
    });

    test('rollbackCrewMemberToHalfLevel minimum level is 1 for level 1 units', () => {
        const monk = crewManager.crew.find(c => c.type === 'monk');
        expect(monk.level).toBe(1);
        monk.inventory = [{ id: 'fist_wrap', type: 'weapon' }];

        crewManager.rollbackCrewMemberToHalfLevel(monk);

        expect(monk.level).toBe(1);
        expect(monk.inventory).toEqual([]);
        expect(monk.dead).toBe(false);
    });

    test('triggerFinalDeath rollbacks all session roster members, clears crew & dungeon, and keeps user level untouched', () => {
        const soldier = crewManager.crew.find(c => c.type === 'soldier');
        const wizard = crewManager.crew.find(c => c.type === 'wizard');

        // Level up soldier to 4
        crewManager.levelUp(soldier);
        crewManager.applyLevelUpChoices(soldier, { attrBoost: { stat: 'fort', amount: 2 } });
        crewManager.levelUp(soldier);
        crewManager.applyLevelUpChoices(soldier, { attrBoost: { stat: 'str', amount: 2 } });
        crewManager.levelUp(soldier);
        crewManager.applyLevelUpChoices(soldier, { attrBoost: { stat: 'dex', amount: 2 } });
        soldier.inventory = [{ id: 'sword', type: 'weapon' }];
        expect(soldier.level).toBe(4);

        // Level up wizard to 2
        crewManager.levelUp(wizard);
        crewManager.applyLevelUpChoices(wizard, { attrBoost: { stat: 'int', amount: 2 } });
        wizard.inventory = [{ id: 'staff', type: 'staff' }];
        expect(wizard.level).toBe(2);

        // Session setup
        const meta = {
            deathTracker: 2,
            dungeonId: 'dungeon_instance_123',
            selectedDungeon: 'DreamTower_1234',
            selectedDungeonTemplateId: 'dream_tower_template',
            selectedDungeonTemplateName: 'DreamTower',
            location: 'board_2',
            userLevel: 7,
            userExperience: 4500,
            userPerks: ['dungeon_mastery', 'keen_eye'],
            lockedRoster: [soldier.id, wizard.id],
            rosterLocked: true,
            dungeonEntered: true,
            crew: [soldier, wizard],
            alternateCrew: []
        };
        storeMeta(meta);

        // Mock DungeonPage instance triggerFinalDeath execution
        const mockInventoryManager = {
            inventory: [{ id: 'wood', amount: 10 }, { id: 'potion', amount: 1 }],
            gold: 500,
            shimmering_dust: 5
        };

        // Simulate triggerFinalDeath logic
        const currentMeta = getMeta();
        const sessionRosterMembers = [];
        const seenRosterIds = new Set();
        const addSessionMember = (m) => {
            if (!m) return;
            const mid = m.id || m.name || m.type;
            if (mid && !seenRosterIds.has(mid)) {
                seenRosterIds.add(mid);
                sessionRosterMembers.push(m);
            }
        };

        if (Array.isArray(currentMeta.crew)) currentMeta.crew.forEach(addSessionMember);
        if (Array.isArray(currentMeta.alternateCrew)) currentMeta.alternateCrew.forEach(addSessionMember);
        if (Array.isArray(currentMeta.lockedRoster) && Array.isArray(crewManager.adventurers)) {
            currentMeta.lockedRoster.forEach(id => {
                const adv = crewManager.adventurers.find(a => a && a.id === id);
                if (adv) addSessionMember(adv);
            });
        }
        if (Array.isArray(crewManager.crew)) {
            crewManager.crew.forEach(addSessionMember);
        }

        sessionRosterMembers.forEach(m => crewManager.rollbackCrewMemberToHalfLevel(m));

        currentMeta.crew = [];
        currentMeta.alternateCrew = [];
        delete currentMeta.lockedRoster;
        delete currentMeta.rosterLocked;
        delete currentMeta.dungeonEntered;
        crewManager.crew = [];

        currentMeta.dungeonId = null;
        currentMeta.location = null;
        currentMeta.selectedDungeon = null;
        delete currentMeta.selectedDungeonTemplateId;
        delete currentMeta.selectedDungeonTemplateName;
        currentMeta.deathTracker = 0;
        storeMeta(currentMeta);

        // Verifications
        const updatedMeta = getMeta();

        // 1. Crew cleared
        expect(updatedMeta.crew).toEqual([]);
        expect(updatedMeta.alternateCrew).toEqual([]);
        expect(updatedMeta.lockedRoster).toBeUndefined();
        expect(crewManager.crew).toEqual([]);

        // 2. Selected dungeon cleared
        expect(updatedMeta.dungeonId).toBeNull();
        expect(updatedMeta.selectedDungeon).toBeNull();
        expect(updatedMeta.selectedDungeonTemplateId).toBeUndefined();
        expect(updatedMeta.selectedDungeonTemplateName).toBeUndefined();

        // 3. User level advancement untouched
        expect(updatedMeta.userLevel).toBe(7);
        expect(updatedMeta.userExperience).toBe(4500);
        expect(updatedMeta.userPerks).toEqual(['dungeon_mastery', 'keen_eye']);

        // 4. Crew rolled back to 1/2 level and items lost
        expect(soldier.level).toBe(2);
        expect(soldier.inventory).toEqual([]);
        expect(wizard.level).toBe(1);
        expect(wizard.inventory).toEqual([]);
    });
});
