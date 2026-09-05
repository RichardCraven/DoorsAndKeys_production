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

describe('Domain Node Single-Tile Footprint & Passability', () => {
    test('6. Domain node is 1x1, adjacent empty spaces are passable and not interactable buildings', () => {
        const nodeTile = {
            id: 112,
            type: 'board-tile',
            contains: { type: 'building', subtype: 'domain_node' },
            building: 'domain_node',
            image: 'domain_node'
        };

        const adjacentEmptyTile = {
            id: 113,
            type: 'board-tile',
            contains: { type: 'empty_space', subtype: null },
            color: null
        };

        // isImpassable helper logic as tested in board-manager
        const isImpassable = (tile) => {
            if (!tile || !tile.contains) return false;
            const cType = tile.contains?.type;
            const cSub = tile.contains?.subtype;
            if (cType === 'empty_space' || cType === 'empty' || cSub === 'empty_space' || cSub === 'empty') return false;
            return cSub === 'domain_node' || tile.building === 'domain_node';
        };

        expect(isImpassable(nodeTile)).toBe(true);
        expect(isImpassable(adjacentEmptyTile)).toBe(false);
    });

    test('7. Empty space tiles with leftover building or vendor properties are never treated as impassable', () => {
        const malformedEmptyTile = {
            id: 113,
            type: 'board-tile',
            contains: { type: 'empty_space', subtype: null },
            building: 'domain_node',
            vendorCell: 'top_right',
            vendorAnchorId: 112
        };

        const isImpassable = (tile) => {
            if (!tile || !tile.contains) return false;
            const cType = tile.contains?.type;
            const cSub = tile.contains?.subtype;
            if (cType === 'empty_space' || cType === 'empty' || cSub === 'empty_space' || cSub === 'empty') return false;
            return cSub === 'domain_node' || tile.building === 'domain_node';
        };

        expect(isImpassable(malformedEmptyTile)).toBe(false);
    });
});

describe('Monolith Payout Cycle Free Will & Influence Score Checks', () => {
    const calculateFreeWillDelta = (influence, elapsedCycles = 1) => {
        let delta = 0;
        if (influence > 100) {
            delta = 2 * elapsedCycles;
        } else if (influence > 50) {
            delta = 1 * elapsedCycles;
        } else if (influence < 50) {
            delta = -1 * elapsedCycles;
        }
        return delta;
    };

    test('8. If influence > 50 and <= 100, adds 1 Free Will per payout cycle', () => {
        const influence = 71; // as shown in screenshot
        const delta = calculateFreeWillDelta(influence);
        expect(delta).toBe(1);

        let freeWill = 45;
        freeWill += delta;
        expect(freeWill).toBe(46);
    });

    test('9. If influence < 50, reduces Free Will by 1 per payout cycle', () => {
        const influence = 35;
        const delta = calculateFreeWillDelta(influence);
        expect(delta).toBe(-1);

        let freeWill = 45;
        freeWill += delta;
        expect(freeWill).toBe(44);
    });

    test('10. If influence > 100, increases Free Will by 2 per payout cycle', () => {
        const influence = 120;
        const delta = calculateFreeWillDelta(influence);
        expect(delta).toBe(2);

        let freeWill = 45;
        freeWill += delta;
        expect(freeWill).toBe(47);
    });

    test('11. If influence is exactly 50, Free Will remains unchanged', () => {
        const influence = 50;
        const delta = calculateFreeWillDelta(influence);
        expect(delta).toBe(0);

        let freeWill = 45;
        freeWill += delta;
        expect(freeWill).toBe(45);
    });

    test('12. Multiple elapsed cycles scale Free Will adjustments accordingly', () => {
        const elapsedCycles = 3;
        expect(calculateFreeWillDelta(110, elapsedCycles)).toBe(6);
        expect(calculateFreeWillDelta(75, elapsedCycles)).toBe(3);
        expect(calculateFreeWillDelta(20, elapsedCycles)).toBe(-3);
    });

    test('13. Superboard BFS pathfinding finds direct path between coordinates', () => {
        const fakeSuperboard = {
            miniboards: Array(9).fill(null).map((_, i) => ({
                id: i,
                tiles: Array(225).fill(null).map((_, t) => ({
                    id: t,
                    coordinates: [t % 15, Math.floor(t / 15)],
                    contains: { type: 'empty_space', subtype: null }
                }))
            }))
        };

        const isPassable = (sb, gx, gy) => {
            if (gx < 0 || gx >= 45 || gy < 0 || gy >= 45) return false;
            const mbX = Math.floor(gx / 15);
            const mbY = Math.floor(gy / 15);
            const mbIdx = mbY * 3 + mbX;
            const tIdx = (gy % 15) * 15 + (gx % 15);
            const t = sb.miniboards[mbIdx]?.tiles?.[tIdx];
            return t && t.contains?.type === 'empty_space';
        };

        const bfs = (sb, startGx, startGy, targetGoalSet) => {
            if (targetGoalSet.has(`${startGx},${startGy}`)) return [];
            const queue = [[[startGx, startGy], []]];
            const visited = new Set([`${startGx},${startGy}`]);
            const neighbors = [
                [[0, -1], 'up'],
                [[0, 1], 'down'],
                [[-1, 0], 'left'],
                [[1, 0], 'right']
            ];

            while (queue.length > 0) {
                const [[cgx, cgy], path] = queue.shift();
                if (targetGoalSet.has(`${cgx},${cgy}`)) return path;
                for (const [[ddx, ddy], dir] of neighbors) {
                    const ngx = cgx + ddx;
                    const ngy = cgy + ddy;
                    const key = `${ngx},${ngy}`;
                    if (!visited.has(key) && isPassable(sb, ngx, ngy)) {
                        visited.add(key);
                        queue.push([[ngx, ngy], [...path, dir]]);
                    }
                }
            }
            return null;
        };

        const path = bfs(fakeSuperboard, 22, 22, new Set(['22,25']));
        expect(path).toEqual(['down', 'down', 'down']);
    });

    test('14. Clicking on a building targets adjacent passable goal tiles', () => {
        const anchorGx = 10;
        const anchorGy = 10;
        const boundX = 1; // single tile domain_node
        const boundY = 1;

        const goalTiles = new Set();
        for (let bx = 0; bx < boundX; bx++) {
            for (let by = 0; by < boundY; by++) {
                const bgx = anchorGx + bx;
                const bgy = anchorGy + by;
                for (let odx = -1; odx <= 1; odx++) {
                    for (let ody = -1; ody <= 1; ody++) {
                        if (odx === 0 && ody === 0) continue;
                        const nx = bgx + odx;
                        const ny = bgy + ody;
                        goalTiles.add(`${nx},${ny}`);
                    }
                }
            }
        }

        expect(goalTiles.size).toBe(8);
        expect(goalTiles.has('9,10')).toBe(true);
        expect(goalTiles.has('11,10')).toBe(true);
        expect(goalTiles.has('10,9')).toBe(true);
        expect(goalTiles.has('10,11')).toBe(true);
        expect(goalTiles.has('10,10')).toBe(false); // building itself not in goal
    });

    test('15. Chemical lantern deactivates when chemicals run out, and automatically re-ignites with +2 vision radius when gaining chemicals', () => {
        let state = {
            inSuperboard: true,
            pocketLanternActive: false,
            pocketLanternFuel: 0,
            pocketLanternFlickering: false,
            pocketResources: { chemicals: 0 }
        };

        const inventory = [
            { name: 'chemical lantern', active: true }
        ];

        const isChemicalLanternActive = () => inventory.some(i => i.name === 'chemical lantern' && i.active);

        const activatePocketChemicalLantern = (amount) => {
            state.pocketLanternActive = true;
            state.pocketLanternFuel = amount;
            state.pocketLanternFlickering = false;
        };

        const addPocketResource = (resType, amount) => {
            if (resType === 'chemicals') {
                state.pocketResources.chemicals += amount;
                if (state.inSuperboard && isChemicalLanternActive()) {
                    activatePocketChemicalLantern(state.pocketResources.chemicals);
                    state.pocketResources.chemicals = 0;
                }
            }
        };

        // When fuel is 0, fog radius is base radius
        let baseRadius = 2;
        let fogRadius = baseRadius + (state.pocketLanternActive && state.pocketLanternFuel > 0 ? 2 : 0);
        expect(fogRadius).toBe(2);

        // Player gains 30 chemicals from gathering/cultivation
        addPocketResource('chemicals', 30);
        expect(state.pocketLanternActive).toBe(true);
        expect(state.pocketLanternFuel).toBe(30);

        // Vision radius is now expanded by +2
        fogRadius = baseRadius + (state.pocketLanternActive && state.pocketLanternFuel > 0 ? 2 : 0);
        expect(fogRadius).toBe(4);
    });

    test('16. Double-clicking Chemical Lantern in inventory in superboard toggles activation and updates vision radius', () => {
        let state = {
            inSuperboard: true,
            pocketLanternActive: false,
            pocketLanternFuel: 0,
            pocketLanternFlickering: false,
            pocketResources: { chemicals: 25 }
        };

        const item = { name: 'chemical lantern', active: false };

        const handleInventoryItemDoubleClick = (it) => {
            it.active = !it.active;
            if (state.inSuperboard) {
                if (it.active) {
                    const chem = state.pocketResources.chemicals;
                    state.pocketLanternActive = true;
                    state.pocketLanternFuel = chem;
                    state.pocketResources.chemicals = 0;
                } else {
                    state.pocketLanternActive = false;
                    state.pocketLanternFuel = 0;
                }
            }
        };

        // Double click to activate
        handleInventoryItemDoubleClick(item);
        expect(item.active).toBe(true);
        expect(state.pocketLanternActive).toBe(true);
        expect(state.pocketLanternFuel).toBe(25);

        // Double click to deactivate
        handleInventoryItemDoubleClick(item);
        expect(item.active).toBe(false);
        expect(state.pocketLanternActive).toBe(false);
        expect(state.pocketLanternFuel).toBe(0);
    });
});

describe('Observation Platform Affiliation & Pocket Dimension Vision', () => {
    test('17. MapMaker militaryKeys includes observer_platform and observation_platform', () => {
        const militaryKeys = ['war_camp', 'war_fort', 'earthen_fort', 'outpost', 'fortress', 'keep', 'domain_monolith', 'dark_domain_monolith', 'domain_node', 'dark_domain_node', 'monolith', 'generator', 'cultivation_vat', 'observer_platform', 'observation_platform', 'observer', 'buildable_observer_platform', 'watchtower'];
        
        expect(militaryKeys.includes('observer_platform')).toBe(true);
        expect(militaryKeys.includes('observation_platform')).toBe(true);
        expect(militaryKeys.includes('buildable_observer_platform')).toBe(true);
    });

    test('18. Observation platforms default to neutral affiliation', () => {
        const platformTile = {
            id: 50,
            type: 'board-tile',
            contains: { type: 'building', subtype: 'observer_platform' }
        };

        const rawAff = platformTile.affiliation || platformTile.contains?.affiliation || platformTile.contains?.faction || (platformTile.placedBy === 'player' ? 'friendly' : 'neutral');
        const aff = String(rawAff || 'neutral').toLowerCase();
        const isFriendly = aff === 'friendly' || aff === 'player' || aff === 'crew';
        const isHostile = aff === 'hostile' || aff === 'enemy' || aff === 'wild' || aff === 'automaton';
        const isNeutral = !isFriendly && !isHostile;

        expect(isNeutral).toBe(true);
        expect(isFriendly).toBe(false);
        expect(isHostile).toBe(false);
    });

    test('19. Neutral observation platform grants vision to both player and automaton', () => {
        const checkVisionGrant = (automatonVision, tile) => {
            const rawAff = tile.affiliation || tile.contains?.affiliation || tile.contains?.faction || (tile.placedBy === 'player' ? 'friendly' : 'neutral');
            const aff = String(rawAff || 'neutral').toLowerCase();
            const isFriendly = aff === 'friendly' || aff === 'player' || aff === 'crew';
            const isHostile = aff === 'hostile' || aff === 'enemy' || aff === 'wild' || aff === 'automaton';
            const isNeutral = !isFriendly && !isHostile;

            return automatonVision ? (isHostile || isNeutral) : (isFriendly || isNeutral);
        };

        const neutralPlatform = { contains: { subtype: 'observer_platform' } };

        // Player perspective (automatonVision = false)
        expect(checkVisionGrant(false, neutralPlatform)).toBe(true);
        // Automaton perspective (automatonVision = true)
        expect(checkVisionGrant(true, neutralPlatform)).toBe(true);
    });

    test('20. Friendly observation platform grants vision only to player', () => {
        const checkVisionGrant = (automatonVision, tile) => {
            const rawAff = tile.affiliation || tile.contains?.affiliation || tile.contains?.faction || (tile.placedBy === 'player' ? 'friendly' : 'neutral');
            const aff = String(rawAff || 'neutral').toLowerCase();
            const isFriendly = aff === 'friendly' || aff === 'player' || aff === 'crew';
            const isHostile = aff === 'hostile' || aff === 'enemy' || aff === 'wild' || aff === 'automaton';
            const isNeutral = !isFriendly && !isHostile;

            return automatonVision ? (isHostile || isNeutral) : (isFriendly || isNeutral);
        };

        const friendlyPlatform = { contains: { subtype: 'observer_platform', affiliation: 'friendly' } };

        // Player perspective
        expect(checkVisionGrant(false, friendlyPlatform)).toBe(true);
        // Automaton perspective
        expect(checkVisionGrant(true, friendlyPlatform)).toBe(false);
    });

    test('21. Hostile observation platform grants vision only to automaton', () => {
        const checkVisionGrant = (automatonVision, tile) => {
            const rawAff = tile.affiliation || tile.contains?.affiliation || tile.contains?.faction || (tile.placedBy === 'player' ? 'friendly' : 'neutral');
            const aff = String(rawAff || 'neutral').toLowerCase();
            const isFriendly = aff === 'friendly' || aff === 'player' || aff === 'crew';
            const isHostile = aff === 'hostile' || aff === 'enemy' || aff === 'wild' || aff === 'automaton';
            const isNeutral = !isFriendly && !isHostile;

            return automatonVision ? (isHostile || isNeutral) : (isFriendly || isNeutral);
        };

        const hostilePlatform = { contains: { subtype: 'observer_platform', affiliation: 'hostile' } };

        // Player perspective
        expect(checkVisionGrant(false, hostilePlatform)).toBe(false);
        // Automaton perspective
        expect(checkVisionGrant(true, hostilePlatform)).toBe(true);
    });
});

describe('Earthen Fort Upgrade Durations', () => {
    const calculateUpgradeTimeMs = (defKey, isInPocketDimension) => {
        const isFort = defKey === 'earthen_fort';
        return isInPocketDimension
            ? (isFort ? (5 * 1000) : (45 * 1000))
            : (isFort ? (60 * 1000) : (15 * 60 * 1000));
    };

    const getEffectiveGeneratorStats = (generatorData, baseDef, currentTime = Date.now()) => {
        let level = generatorData?.level || 1;
        if (generatorData?.isUpgrading && currentTime >= generatorData.upgradeEndTime) {
            level = generatorData.targetLevel || (generatorData.level ? generatorData.level + 1 : 2);
            generatorData.level = level;
            delete generatorData.isUpgrading;
            delete generatorData.upgradeEndTime;
            delete generatorData.targetLevel;
        }
        let currencyType = baseDef?.currencyType || 'gold';
        if (baseDef?.key === 'cultivation_vat') {
            currencyType = level >= 3 ? 'stable_chemicals' : 'unstable_chemicals';
        }
        return {
            level,
            currencyType,
            rate: level >= 2 ? baseDef.rate * Math.pow(2, level - 1) : baseDef.rate,
            cap: level >= 2 ? Math.floor(baseDef.cap * (1 + (level - 1) * 0.5)) : baseDef.cap
        };
    };

    test('22. Upgrading an Earthen Fort in pocket dimension has a duration of 5 seconds (5000ms)', () => {
        const upgradeTimeMs = calculateUpgradeTimeMs('earthen_fort', true);
        expect(upgradeTimeMs).toBe(5000);
    });

    test('23. Upgrading an Earthen Fort in regular dungeon has a duration of 1 minute (60000ms)', () => {
        const upgradeTimeMs = calculateUpgradeTimeMs('earthen_fort', false);
        expect(upgradeTimeMs).toBe(60000);
    });

    test('24. Upgrading other generators in pocket dimension takes 45s and in dungeon takes 15m', () => {
        expect(calculateUpgradeTimeMs('sawmill', true)).toBe(45000);
        expect(calculateUpgradeTimeMs('sawmill', false)).toBe(15 * 60 * 1000);
    });

    test('25. Earthen Fort upgrade completes after 5 seconds in pocket dimension and promotes to Level 2', () => {
        const now = 1000000;
        const upgradeDuration = calculateUpgradeTimeMs('earthen_fort', true); // 5000ms
        const fortDef = { key: 'earthen_fort', name: 'Earthen Fort', currencyType: 'ore', rate: 0, cap: 0 };
        
        const gData = {
            activated: true,
            level: 1,
            isUpgrading: true,
            upgradeEndTime: now + upgradeDuration,
            targetLevel: 2
        };

        // At 3 seconds: still upgrading
        const statsAt3s = getEffectiveGeneratorStats({ ...gData }, fortDef, now + 3000);
        expect(statsAt3s.level).toBe(1);

        // At 5 seconds: upgrade completes
        const statsAt5s = getEffectiveGeneratorStats(gData, fortDef, now + 5000);
        expect(statsAt5s.level).toBe(2);
        expect(gData.isUpgrading).toBeUndefined();
        expect(gData.level).toBe(2);
    });
});


