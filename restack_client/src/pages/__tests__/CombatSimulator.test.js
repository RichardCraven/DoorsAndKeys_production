import React from 'react'
import CrewManagerPage from '../CombatSimulator'
import { CrewManager } from '../../utils/crew-manager'
import { storeMeta, getMeta } from '../../utils/session-handler'

test('CombatSimulator weapon equipment constraints in applySimulatorPrep', () => {
    const mockInventoryManager = {
        weapons: {
            woodcutters_axe: { tier: 1, range: 'close', type: 'weapon' },
            shortsword_sword: { tier: 1, range: 'close', type: 'weapon' },
            sylvan_bow: { tier: 1, range: 'far', type: 'weapon' },
            razorfang_axe: { tier: 2, range: 'close', type: 'weapon' },
            cryonic_bow: { tier: 2, range: 'far', type: 'weapon' }
        },
        initializeItems: jest.fn()
    };

    const mockCrewManager = {
        adventurers: [
            { id: '1', type: 'soldier', level: 1, inventory: [] },
            { id: '2', type: 'barbarian', level: 1, inventory: [] },
            { id: '3', type: 'ranger', level: 1, inventory: [] },
            { id: '4', type: 'wizard', level: 1, inventory: [] }
        ]
    };

    const props = {
        inventoryManager: mockInventoryManager,
        crewManager: mockCrewManager,
        monsterManager: {
            getMonster: jest.fn(),
            getRandomMonster: jest.fn()
        },
        combatManager: {
            updateAllFightIntervals: jest.fn()
        }
    };

    const instance = new CrewManagerPage(props);
    instance.tempCrewManager = new CrewManager();
    instance.tempCrewManager.initializeCrew(mockCrewManager.adventurers);
    
    instance.getSimLevel = jest.fn().mockReturnValue(5); // Tier 1
    
    instance.state = {
        outfitWithEquipment: true,
        selectedCrew: [
            { id: 'soldier_1', type: 'soldier', level: 1, inventory: [] },
            { id: 'barbarian_1', type: 'barbarian', level: 1, inventory: [] },
            { id: 'ranger_1', type: 'ranger', level: 1, inventory: [] },
            { id: 'wizard_1', type: 'wizard', level: 1, inventory: [] }
        ],
        fighterLevels: {},
        fighterSkillTiers: {}
    };

    // Test applySimulatorPrep for soldier
    const soldier = { id: 'soldier_1', type: 'soldier', level: 1, inventory: [] };
    instance.applySimulatorPrep(soldier);
    expect(soldier.inventory.length).toBe(1);
    const soldierWeapon = soldier.inventory[0];
    expect(soldierWeapon.range).toBe('close');
    expect(soldierWeapon._im_key).toMatch(/_sword|_axe/);

    // Test applySimulatorPrep for barbarian
    const barbarian = { id: 'barbarian_1', type: 'barbarian', level: 1, inventory: [] };
    instance.applySimulatorPrep(barbarian);
    expect(barbarian.inventory.length).toBe(1);
    const barbarianWeapon = barbarian.inventory[0];
    expect(barbarianWeapon.range).toBe('close');
    expect(barbarianWeapon._im_key).toMatch(/_sword|_axe/);

    // Test applySimulatorPrep for ranger
    const ranger = { id: 'ranger_1', type: 'ranger', level: 1, inventory: [] };
    instance.applySimulatorPrep(ranger);
    expect(ranger.inventory.length).toBe(1);
    const rangerWeapon = ranger.inventory[0];
    expect(rangerWeapon.range).toBe('far');
    expect(rangerWeapon._im_key).toMatch(/_bow/);

    // Test applySimulatorPrep for wizard (should not get a bow)
    const wizard = { id: 'wizard_1', type: 'wizard', level: 1, inventory: [] };
    instance.applySimulatorPrep(wizard);
    expect(wizard.inventory.length).toBe(1);
    const wizardWeapon = wizard.inventory[0];
    expect(wizardWeapon.range).toBe('close');
    expect(wizardWeapon._im_key).toMatch(/_sword|_axe/);
});

test('CombatSimulator 5x HP multiplier when only 1 crew unit is selected', async () => {
    const mockInventoryManager = { weapons: {}, runes: {} };
    const mockCrewManager = { adventurers: [] };
    const props = {
        inventoryManager: mockInventoryManager,
        crewManager: mockCrewManager,
        monsterManager: {
            getMonster: jest.fn().mockReturnValue({ type: 'mummy', monster_names: ['Mummy'], stats: { hp: 100 } }),
            getRandomMonster: jest.fn()
        }
    };

    const instance = new CrewManagerPage(props);
    instance.getSimLevel = jest.fn().mockReturnValue(1);
    instance.getSimSkillTier = jest.fn().mockReturnValue(1);
    instance.state = {
        selectedCrew: [{ id: 'solo_monk', type: 'monk', level: 1, hp: 20, max_hp: 20, stats: { hp: 20 } }],
        selectedMonsterKey: 'mummy',
        selectedMinionKeys: [],
        outfitWithEquipment: false
    };

    await instance.submit();

    expect(instance.state.preppedCrew.length).toBe(1);
    const soloUnit = instance.state.preppedCrew[0];
    expect(soloUnit.hp).toBe(100); // 20 * 5
    expect(soloUnit.max_hp).toBe(100); // 20 * 5
    expect(soloUnit.stats.hp).toBe(100); // 20 * 5
});

test('CombatSimulator PvP slot helpers: add, remove, and clear PvP units', () => {
    const props = {
        inventoryManager: { initializeItems: jest.fn() },
        crewManager: { adventurers: [] },
        monsterManager: { getMonster: jest.fn() }
    };
    const instance = new CrewManagerPage(props);
    instance.setState = jest.fn((updater) => {
        const next = typeof updater === 'function' ? updater(instance.state) : updater;
        instance.state = { ...instance.state, ...next };
    });

    const wizard = { id: 'wiz1', type: 'wizard', name: 'Zildjikan', portrait: 'wiz.png' };
    const barbarian = { id: 'barb1', type: 'barbarian', name: 'Ulaf', portrait: 'barb.png' };

    // Add wizard
    instance.addPvPUnit(wizard);
    expect(instance.state.selectedPvPSlots[0]).toBeDefined();
    expect(instance.state.selectedPvPSlots[0].type).toBe('wizard');
    expect(instance.state.selectedEnemyForInfo).toBe(wizard);

    // Add barbarian
    instance.addPvPUnit(barbarian);
    expect(instance.state.selectedPvPSlots[1].type).toBe('barbarian');

    // Remove slot 0 (wizard)
    instance.removePvPSlot(0);
    expect(instance.state.selectedPvPSlots[0]).toBeNull();
    expect(instance.state.selectedPvPSlots[1].type).toBe('barbarian');

    // Clear all
    instance.clearPvPSlots();
    expect(instance.state.selectedPvPSlots.every(s => s === null)).toBe(true);
});

test('CombatSimulator handlePvPRosterClick supports single and double click as a single entry', () => {
    const props = {
        inventoryManager: { initializeItems: jest.fn() },
        crewManager: { adventurers: [] },
        monsterManager: { getMonster: jest.fn() }
    };
    const instance = new CrewManagerPage(props);
    instance.setState = jest.fn((updater) => {
        const next = typeof updater === 'function' ? updater(instance.state) : updater;
        instance.state = { ...instance.state, ...next };
    });

    const soldier = { id: 'soldier_1', type: 'soldier', name: 'Sardonis', portrait: 'soldier.png' };

    // Simulate double click (click 1 with detail: 1, click 2 with detail: 2 immediately after)
    instance.handlePvPRosterClick({ detail: 1 }, soldier);
    instance.handlePvPRosterClick({ detail: 2 }, soldier);

    // Only one entry should be in selectedPvPSlots!
    const activeSlots = instance.state.selectedPvPSlots.filter(Boolean);
    expect(activeSlots.length).toBe(1);
    expect(activeSlots[0].type).toBe('soldier');

    // Simulate clicking soldier again later (detail: 1) -> toggles it off
    // Reset tap timestamp to simulate later click
    instance._lastPvPTapTime = Date.now() - 1000;
    instance.handlePvPRosterClick({ detail: 1 }, soldier);
    expect(instance.state.selectedPvPSlots.filter(Boolean).length).toBe(0);
});

test('CombatSimulator PvP submission initiates PvP combat with opponentCrew', async () => {
    const mockInventoryManager = { weapons: {}, runes: {} };
    const mockCrewManager = { adventurers: [] };
    const props = {
        inventoryManager: mockInventoryManager,
        crewManager: mockCrewManager,
        monsterManager: {
            getMonster: jest.fn().mockReturnValue({ type: 'mummy', monster_names: ['Mummy'], stats: { hp: 100 } }),
            getRandomMonster: jest.fn()
        }
    };

    const instance = new CrewManagerPage(props);
    instance.getSimLevel = jest.fn().mockReturnValue(5);
    instance.getSimSkillTier = jest.fn().mockReturnValue(1);

    const wizardPvP = { id: 'pvp_wiz', type: 'wizard', name: 'Zildjikan', stats: { hp: 50, baseHp: 20 }, portrait: 'wiz.png' };
    const monkPvP = { id: 'pvp_monk', type: 'monk', name: 'Yu', stats: { hp: 60, baseHp: 25 }, portrait: 'monk.png' };

    instance.state = {
        selectedCrew: [{ id: 'player_soldier', type: 'soldier', level: 1, hp: 40, stats: { hp: 40 } }],
        selectedPvPSlots: [wizardPvP, monkPvP, null, null, null],
        selectedMonsterKey: 'mummy',
        selectedMinionKeys: [],
        outfitWithEquipment: false,
        useReduxCombat: true
    };

    await instance.submit();

    expect(instance.state.isPvP).toBe(true);
    expect(instance.state.isPvPMode).toBe(true);
    expect(instance.state.opponentCrew).toBeDefined();
    expect(instance.state.opponentCrew.length).toBe(2);

    const opp1 = instance.state.opponentCrew[0];
    expect(opp1.type).toBe('wizard');
    expect(opp1.isOpponent).toBe(true);
    expect(opp1.isMonster).toBe(true);
    expect(opp1.facing).toBe('left');

    const opp2 = instance.state.opponentCrew[1];
    expect(opp2.type).toBe('monk');
    expect(opp2.isOpponent).toBe(true);
    expect(opp2.isMonster).toBe(true);
    expect(opp2.facing).toBe('left');

    expect(instance.reduxCombatManager).toBeDefined();
    expect(instance.reduxCombatManager.isPvP).toBe(true);
});

test('CombatSimulator getRealActiveCrew strictly filters out benched units, infirmary patients, committed sage, and dead units', () => {
    const liveWizard = { id: 'wiz1', type: 'wizard', name: 'Zildjikan', hp: 50, dead: false, level: 5 };
    const benchedBarbarian = { id: 'barb1', type: 'barbarian', name: 'Ulaf', hp: 60, dead: false, level: 6 };
    const infirmarySoldier = { id: 'sold1', type: 'soldier', name: 'Sardonis', hp: 10, dead: false, level: 4 };
    const deadRanger = { id: 'rang1', type: 'ranger', name: 'Dormund', hp: 0, dead: true, level: 3 };
    const committedSage = { id: 'sage1', type: 'sage', name: 'Loryastes', hp: 45, dead: false, level: 4 };
    const liveMonk = { id: 'monk1', type: 'monk', name: 'Yu', hp: 55, dead: false, level: 5 };

    storeMeta({
        crew: [liveWizard, benchedBarbarian, infirmarySoldier, deadRanger, committedSage, liveMonk],
        alternateCrew: [benchedBarbarian],
        infirmary: {
            patients: [{ id: 'sold1', name: 'Sardonis', hp: 10 }],
            sageCommitted: true,
            assignedSage: { id: 'sage1', type: 'sage' }
        }
    });

    const mockCrewManager = {
        crew: [liveWizard, benchedBarbarian, infirmarySoldier, deadRanger, committedSage, liveMonk],
        adventurers: [
            { id: 'wiz1', type: 'wizard', name: 'Zildjikan', portrait: 'wiz.png', stats: { hp: 50 } },
            { id: 'monk1', type: 'monk', name: 'Yu', portrait: 'monk.png', stats: { hp: 55 } },
            { id: 'barb1', type: 'barbarian', name: 'Ulaf', portrait: 'barb.png', stats: { hp: 60 } },
            { id: 'sold1', type: 'soldier', name: 'Sardonis', portrait: 'sold.png', stats: { hp: 40 } },
            { id: 'rang1', type: 'ranger', name: 'Dormund', portrait: 'rang.png', stats: { hp: 35 } },
            { id: 'sage1', type: 'sage', name: 'Loryastes', portrait: 'sage.png', stats: { hp: 45 } }
        ]
    };

    const instance = new CrewManagerPage({
        inventoryManager: { initializeItems: jest.fn() },
        crewManager: mockCrewManager,
        monsterManager: { getMonster: jest.fn() }
    });

    const activeEligible = instance.getRealActiveCrew();

    // Only liveWizard and liveMonk should be eligible
    expect(activeEligible.length).toBe(2);
    expect(activeEligible.map(m => m.id)).toEqual(['wiz1', 'monk1']);
});

test('CombatSimulator cloneRealCrew clones real crew without mutating original references and sets isRealCrewCloned to true', () => {
    const liveWizard = { id: 'wiz1', type: 'wizard', name: 'Zildjikan', hp: 50, dead: false, level: 7, inventory: [] };
    const liveMonk = { id: 'monk1', type: 'monk', name: 'Yu', hp: 55, dead: false, level: 6, inventory: [] };

    storeMeta({
        crew: [liveWizard, liveMonk],
        alternateCrew: [],
        infirmary: { patients: [], sageCommitted: false }
    });

    const mockCrewManager = {
        crew: [liveWizard, liveMonk],
        adventurers: [
            { id: 'wiz1', type: 'wizard', name: 'Zildjikan', portrait: 'wiz.png', stats: { hp: 50 } },
            { id: 'monk1', type: 'monk', name: 'Yu', portrait: 'monk.png', stats: { hp: 55 } }
        ]
    };

    const instance = new CrewManagerPage({
        inventoryManager: { initializeItems: jest.fn() },
        crewManager: mockCrewManager,
        monsterManager: { getMonster: jest.fn() }
    });
    instance.tempCrewManager = new CrewManager();
    instance.tempCrewManager.initializeCrew([]);
    instance.setState = jest.fn((updater) => {
        const next = typeof updater === 'function' ? updater(instance.state) : updater;
        instance.state = { ...instance.state, ...next };
    });

    instance.cloneRealCrew();

    expect(instance.state.isRealCrewCloned).toBe(true);
    expect(instance.state.selectedCrew.length).toBe(2);
    expect(instance.state.fighterLevels['wizard']).toBe(7);
    expect(instance.state.fighterLevels['monk']).toBe(6);

    // Verify it is a true deep clone and not the same reference
    expect(instance.state.selectedCrew[0]).not.toBe(liveWizard);
    instance.state.selectedCrew[0].hp = 999;
    expect(liveWizard.hp).toBe(50);
});

test('CombatSimulator manual edits reset isRealCrewCloned to false', () => {
    const instance = new CrewManagerPage({
        inventoryManager: { initializeItems: jest.fn() },
        crewManager: { adventurers: [] },
        monsterManager: { getMonster: jest.fn() }
    });
    instance.setState = jest.fn((updater) => {
        const next = typeof updater === 'function' ? updater(instance.state) : updater;
        instance.state = { ...instance.state, ...next };
    });

    // 1. Double tap crew member adds and resets isRealCrewCloned
    instance.state.isRealCrewCloned = true;
    instance.state.selectedCrew = [];
    const member = { id: 'm1', type: 'barbarian' };
    instance.selectCrewMember({ detail: 2 }, member);
    expect(instance.state.isRealCrewCloned).toBe(false);

    // 2. addMember resets isRealCrewCloned
    instance.state.isRealCrewCloned = true;
    instance.state.selectedCrewMember = { id: 'm2', type: 'soldier' };
    instance.addMember(0);
    expect(instance.state.isRealCrewCloned).toBe(false);

    // 3. removeMember resets isRealCrewCloned
    instance.state.isRealCrewCloned = true;
    instance.removeMember(0);
    expect(instance.state.isRealCrewCloned).toBe(false);

    // 4. clear resets isRealCrewCloned
    instance.state.isRealCrewCloned = true;
    instance.clear();
    expect(instance.state.isRealCrewCloned).toBe(false);
});

test('CombatSimulator submit preserves real weapons and skills when isRealCrewCloned is true', async () => {
    const realWeapon = { _im_key: 'custom_legendary_sword', type: 'weapon', name: 'Excalibur', tier: 3 };
    const liveSoldier = {
        id: 'soldier_real',
        type: 'soldier',
        name: 'Sardonis',
        level: 8,
        hp: 120,
        stats: { hp: 120 },
        inventory: [realWeapon],
        skills: ['custom_soldier_skill_1', 'custom_soldier_skill_2']
    };

    const instance = new CrewManagerPage({
        inventoryManager: {
            weapons: {
                standard_sword: { tier: 1, range: 'close', type: 'weapon' }
            },
            runes: {}
        },
        crewManager: { adventurers: [] },
        monsterManager: {
            getMonster: jest.fn().mockReturnValue({ type: 'mummy', monster_names: ['Mummy'], stats: { hp: 100 } }),
            getRandomMonster: jest.fn()
        }
    });
    instance.tempCrewManager = new CrewManager();
    instance.tempCrewManager.initializeCrew([liveSoldier]);

    instance.state = {
        selectedCrew: [liveSoldier, { id: 'dummy2', type: 'monk', level: 8, hp: 100, stats: { hp: 100 }, inventory: [] }],
        selectedMonsterKey: 'mummy',
        selectedMinionKeys: [],
        outfitWithEquipment: true,
        isRealCrewCloned: true,
        fighterLevels: { soldier: 8, monk: 8 },
        fighterSkillTiers: { soldier: 1, monk: 1 }
    };

    await instance.submit();

    const preppedSoldier = instance.state.preppedCrew[0];
    // Real weapon must be preserved, not overwritten by tier 1 weapon
    expect(preppedSoldier.inventory.find(i => i.type === 'weapon')).toEqual(realWeapon);
    // Real skills must be preserved
    expect(preppedSoldier.skills).toEqual(['custom_soldier_skill_1', 'custom_soldier_skill_2']);
});

test('CombatSimulator toggleCrewMemberPortrait cycles through portraitOptions', () => {
    const portraitOptions = [
        { id: 'seren', name: 'Seren', portrait: 'seren.png' },
        { id: 'odran', name: 'Odran', portrait: 'odran.png' }
    ];
    const horoAdv = { id: 'horo1', type: 'horologist', name: 'Seren', portrait: 'seren.png', portraitOptions };

    const instance = new CrewManagerPage({
        inventoryManager: { initializeItems: jest.fn() },
        crewManager: { adventurers: [horoAdv] },
        monsterManager: { getMonster: jest.fn() }
    });

    instance.setState = jest.fn((updater) => {
        const next = typeof updater === 'function' ? updater(instance.state) : updater;
        instance.state = { ...instance.state, ...next };
    });

    instance.state = {
        options: [horoAdv],
        selectedCrew: [horoAdv],
        selectedCrewMember: horoAdv
    };

    // First toggle: Seren -> Odran
    instance.toggleCrewMemberPortrait({ stopPropagation: jest.fn(), preventDefault: jest.fn() }, horoAdv);
    expect(instance.state.selectedCrewMember.portrait).toBe('odran.png');
    expect(instance.state.selectedCrewMember.name).toBe('Odran');
    expect(instance.state.selectedCrew[0].portrait).toBe('odran.png');
    expect(instance.state.options[0].portrait).toBe('odran.png');

    // Second toggle: Odran -> Seren
    instance.toggleCrewMemberPortrait({ stopPropagation: jest.fn(), preventDefault: jest.fn() }, instance.state.selectedCrewMember);
    expect(instance.state.selectedCrewMember.portrait).toBe('seren.png');
    expect(instance.state.selectedCrewMember.name).toBe('Seren');
    expect(instance.state.selectedCrew[0].portrait).toBe('seren.png');
});

