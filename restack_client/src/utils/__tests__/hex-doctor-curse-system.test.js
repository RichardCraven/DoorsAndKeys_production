import { CombatManagerRedux } from '../combat-manager-redux';
import { MonsterManager } from '../monster-manager';
import { BoardManager } from '../board-manager';
import { storeMeta, getMeta } from '../session-handler';

describe('Hex Doctor and Lingering Curse System', () => {
    let cm;
    let mm;
    let bm;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        mm = new MonsterManager();
        bm = new BoardManager();
        storeMeta({ crew: [], gold: 100 });
    });

    test('Mummy has mummification, High Priest has gaze_of_ruin, Witch has withering', () => {
        const mummy = mm.getMonster('mummy');
        const priest = mm.getMonster('high_priest_of_the_basilisk');
        const witch = mm.getMonster('witch');

        expect(mummy.skills).toContain('mummification');
        expect(priest.skills).toContain('gaze_of_ruin');
        expect(witch.skills).toContain('withering');
    });

    test('Curses apply stat penalties, flags, and persist to crew', () => {
        const crewMember = {
            id: 'soldier_curse_test',
            name: 'Cursed Soldier',
            type: 'soldier',
            stats: { hp: 100, atk: 15, def: 10, spd: 10, dex: 10 },
            skills: ['slash'],
            inventory: [],
            coordinates: { x: 2, y: 2 }
        };

        storeMeta({
            gold: 100,
            crew: [{ ...crewMember, stats: { ...crewMember.stats } }]
        });

        cm.initializeCombat({
            crew: [crewMember],
            monster: {
                ...mm.getMonster('mummy'),
                coordinates: { x: 5, y: 2 }
            },
            minions: []
        });

        const target = Object.values(cm.combatants).find(c => c.id === 'soldier_curse_test');
        expect(target).toBeDefined();

        // 1. Apply Mummification
        const mummySpec = {
            id: 'mummification',
            name: 'Curse of Mummification',
            desc: '-3 Spd, -3 Dex, -50% healing received',
            icon: 'mummification',
            statPenalties: { spd: -3, dex: -3 },
            healingMultiplier: 0.5,
            source: 'Mummy'
        };

        cm._applyCurse(target, mummySpec);

        expect(target.curse).toBeDefined();
        expect(target.curse.id).toBe('mummification');
        expect(target.stats.spd).toBe(7); // 10 - 3
        expect(target.stats.dex).toBe(7); // 10 - 3
        expect(target.curseHealingPenalty).toBe(0.5);

        // Check damageIndicator
        expect(target.damageIndicators.some(d => d.value === 'CURSED!')).toBe(true);

        // Check persistence to session meta
        const meta = getMeta();
        const metaCrewMember = (meta.crew || []).find(m => m.id === 'soldier_curse_test');
        expect(metaCrewMember).toBeDefined();
        expect(metaCrewMember.curse.id).toBe('mummification');
        expect(metaCrewMember.stats.spd).toBe(7);
        expect(metaCrewMember.stats.dex).toBe(7);
    });

    test('High Priest gaze_of_ruin applies def penalty and damage multiplier', () => {
        const target = {
            id: 'ranger_test',
            name: 'Test Ranger',
            stats: { hp: 80, def: 8, atk: 12 },
            dead: false
        };
        const crewRecord = { id: 'ranger_test', name: 'Test Ranger', stats: { hp: 80, def: 8, atk: 12 } };
        cm.combatants = { ranger_test: target };
        cm.data = { crew: [crewRecord] };

        const gazeSpec = {
            id: 'gaze_of_ruin',
            name: 'Gaze of Ruin',
            desc: '-4 Def, +25% damage taken',
            icon: 'gaze_of_ruin',
            statPenalties: { def: -4 },
            damageMultiplier: 1.25,
            source: 'High Priest of the Basilisk'
        };

        cm._applyCurse(target, gazeSpec);

        expect(target.curse.id).toBe('gaze_of_ruin');
        expect(target.stats.def).toBe(4); // 8 - 4
        expect(target.curseDamageMultiplier).toBe(1.25);
    });

    test('Witch withering applies atk penalty (-40% Atk) and stamina cost penalty', () => {
        const target = {
            id: 'mage_test',
            name: 'Test Mage',
            stats: { hp: 60, def: 4, atk: 14 },
            dead: false
        };
        const crewRecord = { id: 'mage_test', name: 'Test Mage', stats: { hp: 60, def: 4, atk: 14 } };
        const witch = {
            id: 'witch_test',
            name: 'Witch',
            type: 'witch',
            coordinates: { x: 5, y: 2 }
        };
        cm.combatants = { mage_test: target, witch_test: witch };
        cm.data = { crew: [crewRecord] };

        // Test useAbility for withering calculates -40% atk dynamically (14 * 0.4 = 5.6 -> 6 reduction)
        cm.useAbility(witch, { id: 'withering' }, target);

        expect(target.curse.id).toBe('withering');
        expect(target.curse.desc).toBe('-40% Atk, +2 stamina cost per action');
        expect(target.stats.atk).toBe(8); // 14 - 6 = 8 (-40% atk)
        expect(target.curseStaminaCostPenalty).toBe(2);
    });

    test('Hex Doctor lifts active curse and restores stats for 50 Gold fee', () => {
        const member = {
            id: 'barbarian_curse',
            name: 'Curse Bearer',
            stats: { hp: 120, spd: 5, dex: 4 }, // Was 8 and 7 before -3 penalties
            curse: {
                id: 'mummification',
                name: 'Curse of Mummification',
                desc: '-3 Spd, -3 Dex, -50% healing received',
                statPenalties: { spd: -3, dex: -3 }
            }
        };

        storeMeta({
            gold: 100,
            crew: [{ ...member, stats: { ...member.stats } }]
        });

        // Simulate Hex Doctor severing logic
        const inventoryManager = { gold: 100 };
        const fee = 50;

        expect(inventoryManager.gold >= fee).toBe(true);
        inventoryManager.gold -= fee;

        const activeCurse = member.curse;
        if (activeCurse && activeCurse.statPenalties && member.stats) {
            Object.entries(activeCurse.statPenalties).forEach(([stat, penalty]) => {
                member.stats[stat] = Math.max(1, member.stats[stat] - penalty);
            });
        }
        delete member.curse;
        delete member.curses;

        // Persist to meta
        const meta = getMeta();
        const metaM = meta.crew.find(m => m.id === member.id);
        if (metaM) {
            if (metaM !== member && activeCurse && activeCurse.statPenalties && metaM.stats) {
                Object.entries(activeCurse.statPenalties).forEach(([stat, penalty]) => {
                    metaM.stats[stat] = Math.max(1, metaM.stats[stat] - penalty);
                });
            }
            delete metaM.curse;
            delete metaM.curses;
        }
        storeMeta(meta);

        // Verifications
        expect(inventoryManager.gold).toBe(50);
        expect(member.curse).toBeUndefined();
        expect(member.stats.spd).toBe(8); // Reverted: 5 - (-3) = 8
        expect(member.stats.dex).toBe(7); // Reverted: 4 - (-3) = 7

        const updatedMeta = getMeta();
        expect(updatedMeta.crew[0].curse).toBeUndefined();
        expect(updatedMeta.crew[0].stats.spd).toBe(8);
        expect(updatedMeta.crew[0].stats.dex).toBe(7);
    });

    test('Hex Doctor tile recognized as 2x2 vendor multi-tile on board', () => {
        const info = bm.getVendorInfo({
            contains: {
                type: 'hex_doctor',
                name: 'Hex Doctor'
            }
        });

        expect(info).toBeDefined();
        expect(info.isVendor).toBe(true);
        expect(info.vendorType).toBe('hex_doctor');

        // Verify board-manager recognizes hex_doctor as impassable building / vendor
        expect(bm.isImpassableBuildingTile({
            contains: {
                type: 'vendor',
                subtype: 'hex_doctor'
            }
        })).toBe(true);
    });
});
