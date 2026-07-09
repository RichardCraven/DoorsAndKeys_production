import React from 'react'
import CrewManagerPage from '../CombatSimulator'
import { CrewManager } from '../../utils/crew-manager'

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
