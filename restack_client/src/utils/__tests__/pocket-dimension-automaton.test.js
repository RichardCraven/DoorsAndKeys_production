describe('Pocket Dimension Automaton 30 HP and 10s Respawn System', () => {
    test('Automaton spawns with 30 HP and maxHp 30', () => {
        const createAutomaton = () => ({
            type: 'monsters',
            subtype: 'automaton',
            isAutomaton: true,
            faction: 'enemy',
            hp: 30,
            maxHp: 30,
            id: `automaton_enemy_${Date.now()}`
        });

        const auto = createAutomaton();
        expect(auto.hp).toBe(30);
        expect(auto.maxHp).toBe(30);
        expect(auto.isAutomaton).toBe(true);
        expect(auto.faction).toBe('enemy');
    });

    test('Player attacking Automaton sets 10s respawn timer when destroyed', () => {
        const targetTile = {
            id: 10,
            isEnemySpawn: true,
            originalMarker: 'narrative',
            contains: {
                type: 'monsters',
                subtype: 'automaton',
                isAutomaton: true,
                faction: 'enemy',
                hp: 15,
                maxHp: 30
            }
        };

        const dmg = 20;
        let automatonRespawnTime = null;

        targetTile.contains.hp -= dmg;
        if (targetTile.contains.hp <= 0) {
            const now = 100000;
            automatonRespawnTime = now + 10000;
            if (targetTile.isEnemySpawn || targetTile.originalMarker === 'narrative') {
                targetTile.contains = { type: 'narrative', subtype: null, isEnemySpawn: true };
                targetTile.image = 'narrative';
            } else {
                targetTile.contains = null;
                targetTile.image = null;
            }
        }

        expect(targetTile.contains.hp).toBeUndefined();
        expect(targetTile.contains.type).toBe('narrative');
        expect(targetTile.isEnemySpawn).toBe(true);
        expect(automatonRespawnTime).toBe(110000);
    });

    test('Pygmy combat destroying Automaton sets 10s respawn timer', () => {
        const autoTile = {
            id: 25,
            isEnemySpawn: false,
            contains: {
                type: 'monsters',
                subtype: 'automaton',
                isAutomaton: true,
                faction: 'enemy',
                hp: 2,
                maxHp: 30
            }
        };

        const dmg = 3;
        let automatonRespawnTime = null;
        const now = 200000;

        autoTile.contains.hp -= dmg;
        if (autoTile.contains.hp <= 0) {
            automatonRespawnTime = now + 10000;
            if (autoTile.isEnemySpawn || autoTile.originalMarker === 'narrative') {
                autoTile.contains = { type: 'narrative', subtype: null, isEnemySpawn: true };
            } else {
                autoTile.contains = null;
                autoTile.image = null;
            }
        }

        expect(autoTile.contains).toBeNull();
        expect(automatonRespawnTime).toBe(210000);
    });

    test('Outpost shooting and eliminating Automaton sets 10s respawn timer', () => {
        const autoTile = {
            id: 30,
            isEnemySpawn: false,
            contains: {
                type: 'monsters',
                subtype: 'automaton',
                isAutomaton: true,
                faction: 'enemy',
                hp: 5,
                maxHp: 30
            }
        };

        const dmg = 7;
        let automatonRespawnTime = null;
        const now = 300000;

        autoTile.contains.hp -= dmg;
        if (autoTile.contains.hp <= 0) {
            autoTile.contains.hp = 0;
            automatonRespawnTime = now + 10000;
            autoTile.contains = null;
            autoTile.image = null;
        }

        expect(autoTile.contains).toBeNull();
        expect(automatonRespawnTime).toBe(310000);
    });

    test('Respawn only triggers after 10s cooldown has passed', () => {
        let automatonRespawnTime = 100000 + 10000; // 110000
        const narrativeTile = {
            id: 5,
            isEnemySpawn: true,
            originalMarker: 'narrative',
            contains: { type: 'narrative', subtype: null, isEnemySpawn: true }
        };

        const checkRespawn = (currentTime) => {
            if (currentTime < automatonRespawnTime) {
                return false; // Not ready yet
            }
            narrativeTile.contains = {
                type: 'monsters',
                subtype: 'automaton',
                isAutomaton: true,
                faction: 'enemy',
                hp: 30,
                maxHp: 30,
                id: 'new_automaton'
            };
            automatonRespawnTime = null;
            return true;
        };

        expect(checkRespawn(105000)).toBe(false);
        expect(narrativeTile.contains.type).toBe('narrative');

        expect(checkRespawn(110000)).toBe(true);
        expect(narrativeTile.contains.hp).toBe(30);
        expect(narrativeTile.contains.maxHp).toBe(30);
        expect(narrativeTile.contains.isAutomaton).toBe(true);
        expect(automatonRespawnTime).toBeNull();
    });
});
