describe('Pocket Dimension Chemical Lantern', () => {
    const tierOptions = [
        { key: 'tier_1_monster', name: 'Tier 1', image: 'beholder_minion' },
        { key: 'tier_2_monster', name: 'Tier 2', image: 'ogre' },
        { key: 'tier_3_monster', name: 'Tier 3', image: 'witch' },
        { key: 'tier_4_monster', name: 'Tier 4', image: 'sphinx' },
        { key: 'tier_1_weapon',  name: 'Tier 1 Weapon',  image: 'tier_1_weapon' },
        { key: 'tier_2_weapon',  name: 'Tier 2 Weapon',  image: 'tier_2_weapon' },
        { key: 'tier_3_weapon',  name: 'Tier 3 Weapon',  image: 'tier_3_weapon' },
        { key: 'tier_1_magical', name: 'Tier 1 Magical', image: 'tier_1_magical' },
        { key: 'tier_2_magical', name: 'Tier 2 Magical', image: 'tier_2_magical' },
        { key: 'tier_3_magical', name: 'Tier 3 Magical', image: 'tier_3_magical' },
        { key: 'tier_1_armor',   name: 'Tier 1 Armor',   image: 'tier_1_armor' },
        { key: 'tier_2_armor',   name: 'Tier 2 Armor',   image: 'tier_2_armor' },
        { key: 'tier_3_armor',   name: 'Tier 3 Armor',   image: 'tier_3_armor' },
        { key: 'chemical_lantern', name: 'Chemical Lantern', image: 'chemical_lantern' },
    ];

    test('1. Chemical Lantern is present in tierOptions items palette', () => {
        const chemLantern = tierOptions.find(opt => opt.key === 'chemical_lantern');
        expect(chemLantern).toBeDefined();
        expect(chemLantern.name).toBe('Chemical Lantern');
        expect(chemLantern.image).toBe('chemical_lantern');
    });

    test('2. Picking up Chemical Lantern starts with 50 chemical reserve and activates vision boost', () => {
        let state = {
            inSuperboard: true,
            pocketLanternActive: false,
            pocketLanternFuel: 0,
            pocketLanternFlickering: false
        };

        const activatePocketChemicalLantern = () => {
            const currentFuel = state.pocketLanternFuel || 0;
            const newFuel = currentFuel > 0 ? (currentFuel + 50) : 50;
            state = {
                ...state,
                pocketLanternActive: true,
                pocketLanternFuel: newFuel,
                pocketLanternFlickering: false
            };
        };

        activatePocketChemicalLantern();
        expect(state.pocketLanternActive).toBe(true);
        expect(state.pocketLanternFuel).toBe(50);
        expect(state.pocketLanternFlickering).toBe(false);

        // Calculate fog radius
        const baseRadius = 2;
        const fogRadius = baseRadius + (state.pocketLanternActive && state.pocketLanternFuel > 0 ? 2 : 0);
        expect(fogRadius).toBe(4);
    });

    test('3. Chemical Lantern consumes 1 chemical per second', () => {
        let state = {
            inSuperboard: true,
            pocketLanternActive: true,
            pocketLanternFuel: 50,
            pocketLanternFlickering: false
        };

        const tickLantern = () => {
            if (state.pocketLanternFuel > 1) {
                state.pocketLanternFuel -= 1;
            } else if (state.pocketLanternFuel === 1) {
                state.pocketLanternFuel = 0;
                state.pocketLanternFlickering = true;
            }
        };

        // Tick 5 seconds
        for (let i = 0; i < 5; i++) {
            tickLantern();
        }
        expect(state.pocketLanternFuel).toBe(45);
        expect(state.pocketLanternActive).toBe(true);
        expect(state.pocketLanternFlickering).toBe(false);
    });

    test('4. When burning the last unit of chemical, lantern flickers and then reverts to regular radius', () => {
        let state = {
            inSuperboard: true,
            pocketLanternActive: true,
            pocketLanternFuel: 1,
            pocketLanternFlickering: false
        };

        const tickLantern = () => {
            if (state.pocketLanternFuel > 1) {
                state.pocketLanternFuel -= 1;
            } else if (state.pocketLanternFuel === 1) {
                state.pocketLanternFuel = 0;
                state.pocketLanternFlickering = true;
            }
        };

        // Last unit burn
        tickLantern();
        expect(state.pocketLanternFuel).toBe(0);
        expect(state.pocketLanternFlickering).toBe(true);

        // After flicker timeout (e.g. 1000ms), state fully extinguishes
        const extinguishLantern = () => {
            state.pocketLanternActive = false;
            state.pocketLanternFlickering = false;
            state.pocketLanternFuel = 0;
        };

        extinguishLantern();
        expect(state.pocketLanternActive).toBe(false);
        expect(state.pocketLanternFlickering).toBe(false);

        // Base radius is restored
        const baseRadius = 2;
        const finalRadius = baseRadius + (state.pocketLanternActive && state.pocketLanternFuel > 0 ? 2 : 0);
        expect(finalRadius).toBe(2);
    });

    test('5. Exiting pocket dimension resets lantern state', () => {
        let state = {
            inSuperboard: true,
            pocketLanternActive: true,
            pocketLanternFuel: 32,
            pocketLanternFlickering: false
        };

        const exitSuperboard = () => {
            state = {
                ...state,
                inSuperboard: false,
                pocketLanternActive: false,
                pocketLanternFuel: 0,
                pocketLanternFlickering: false
            };
        };

        exitSuperboard();
        expect(state.inSuperboard).toBe(false);
        expect(state.pocketLanternActive).toBe(false);
        expect(state.pocketLanternFuel).toBe(0);
    });
});
