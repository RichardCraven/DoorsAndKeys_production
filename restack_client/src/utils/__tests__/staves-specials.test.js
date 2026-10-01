import { CombatManagerRedux } from '../combat-manager-redux';

describe('Staves Special Abilities', () => {
    let cm;
    let wizard;
    let dummyTarget;

    beforeEach(() => {
        cm = new CombatManagerRedux();
        wizard = {
            id: 'wizard_1',
            name: 'Zildjikan',
            type: 'wizard',
            class: 'spellcaster',
            hp: 100,
            starting_hp: 100,
            stats: { str: 0, int: 10, dex: 5, fort: 5, def: 0, hp: 100 },
            inventory: [],
            cooldowns: {},
            power: 0,
            endurance: 50,
            maxEndurance: 100,
            coordinates: { x: 5, y: 5 }
        };
        dummyTarget = {
            id: 'dummy_1',
            name: 'Training Dummy',
            hp: 200,
            starting_hp: 200,
            stats: { str: 0, int: 5, dex: 5, fort: 5, def: 20, hp: 200 },
            coordinates: { x: 5, y: 6 }
        };
        cm.combatants = { wizard_1: wizard, dummy_1: dummyTarget };
    });

    test("archmages_staff: 30% chance to not trigger a cooldown step", () => {
        wizard.inventory = [{ key: 'archmages_staff', name: "Archmage's Staff", type: 'magical', subtype: 'staff', equippedBy: 'wizard_1' }];
        
        const MathRandom = Math.random;
        Math.random = () => 0.10; // Trigger (< 0.30)
        cm._setCooldown(wizard, 'fireball', 3);
        expect(wizard.cooldowns['fireball']).toBe(0);

        Math.random = () => 0.50; // Miss (>= 0.30)
        cm._setCooldown(wizard, 'fireball', 3);
        expect(wizard.cooldowns['fireball']).toBe(3);

        Math.random = MathRandom;
    });

    test("enchanters_staff: 30% chance to double buff duration", () => {
        wizard.inventory = [{ key: 'enchanters_staff', name: "Enchanter's Staff", type: 'magical', subtype: 'staff', equippedBy: 'wizard_1' }];

        const MathRandom = Math.random;
        Math.random = () => 0.10; // Trigger (< 0.30)
        cm._applyBuff(dummyTarget, { increase_stats: { stats: [{ stat: 'atk', amount: 5 }] } }, 'Haste', 2, wizard);
        expect(dummyTarget.activeBuffs[0].roundsLeft).toBe(4);

        Math.random = MathRandom;
    });

    test("imperial_mage_staff: 25% chance for double damage and 25% chance for +25% power", () => {
        wizard.inventory = [{ key: 'imperial_mage_staff', name: 'Imperial Mage Staff', type: 'magical', subtype: 'staff', equippedBy: 'wizard_1' }];

        const MathRandom = Math.random;
        Math.random = () => 0.10; // Trigger (< 0.25)
        const baseDmg = cm.damageCheck(wizard, dummyTarget, 100);
        expect(baseDmg).toBe(150);

        cm.useAbility(wizard, { id: 'magic_missile', name: 'Magic Missile' }, dummyTarget);
        expect(wizard.power).toBeGreaterThanOrEqual(25);

        Math.random = MathRandom;
    });

    test("staff_of_espilon: 25% chance to triple buff duration and grant 25% HP shield", () => {
        wizard.inventory = [{ key: 'staff_of_espilon', name: 'Staff of Espilon', type: 'magical', subtype: 'staff', equippedBy: 'wizard_1' }];

        const MathRandom = Math.random;
        Math.random = () => 0.10; // Trigger (< 0.25)
        cm._applyBuff(dummyTarget, { increase_stats: { stats: [{ stat: 'atk', amount: 5 }] } }, 'Protection', 2, wizard);

        const buff = dummyTarget.activeBuffs.find(b => b.name === 'Protection');
        expect(buff.roundsLeft).toBe(6); // 2 * 3
        expect(dummyTarget.shielded).toBe(true);
        expect(dummyTarget.shieldAmount).toBe(50); // 25% of 200 starting HP

        Math.random = MathRandom;
    });

    test("staff_of_marduk: 50% chance to ignore armor and deal true damage", () => {
        wizard.inventory = [{ key: 'staff_of_marduk', name: 'Staff of Marduk', type: 'magical', subtype: 'staff', equippedBy: 'wizard_1' }];

        const MathRandom = Math.random;
        Math.random = () => 0.10; // Trigger (< 0.50)
        const trueDmg = cm.damageCheck(wizard, dummyTarget, 100);
        expect(trueDmg).toBe(110); // 0 reduction from armor (ignores def 20)

        Math.random = MathRandom;
    });

    test("staff_of_omicron: 15% chance for blinding speed and 15% chance to refill stamina", () => {
        wizard.inventory = [{ key: 'staff_of_omicron', name: 'Staff of Omicron', type: 'magical', subtype: 'staff', equippedBy: 'wizard_1' }];

        const MathRandom = Math.random;
        Math.random = () => 0.05; // Trigger (< 0.15)
        cm.useAbility(wizard, { id: 'magic_missile', name: 'Magic Missile' }, dummyTarget);

        expect(wizard.blindingSpeed).toBe(true);
        expect(wizard.endurance).toBeGreaterThanOrEqual(98); // Refills to 100 maxEndurance

        Math.random = MathRandom;
    });

    test("staff_of_tomorrow: 20% chance for triple damage and 25% chance for +50% power", () => {
        wizard.inventory = [{ key: 'staff_of_tomorrow', name: 'Staff of Tomorrow', type: 'magical', subtype: 'staff', equippedBy: 'wizard_1' }];

        const MathRandom = Math.random;
        Math.random = () => 0.10; // Trigger (< 0.20 and < 0.25)
        const dmg = cm.damageCheck(wizard, dummyTarget, 100);
        expect(dmg).toBe(224);

        cm.useAbility(wizard, { id: 'magic_missile', name: 'Magic Missile' }, dummyTarget);
        expect(wizard.power).toBeGreaterThanOrEqual(50);

        Math.random = MathRandom;
    });
});
