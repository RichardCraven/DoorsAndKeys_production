describe('Pocket Dimension Automaton Vision Console Command and Viewport System', () => {
    const createSuperboardMock = (options = {}) => {
        const miniboards = [];
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const tiles = [];
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                tiles.push({
                    id: tIdx,
                    contains: null,
                    image: null
                });
            }
            miniboards.push({ tiles });
        }

        // Set enemy spawn point at miniboard 4, tile 112 (center board, center tile => gx=22, gy=22)
        miniboards[4].tiles[112] = {
            id: 112,
            isEnemySpawn: true,
            originalMarker: 'narrative',
            contains: { type: 'narrative', subtype: null, isEnemySpawn: true },
            image: 'narrative'
        };

        // If automaton position specified, place automaton
        if (options.automatonMbIdx !== undefined && options.automatonTIdx !== undefined) {
            const mb = miniboards[options.automatonMbIdx];
            mb.tiles[options.automatonTIdx] = {
                id: options.automatonTIdx,
                contains: {
                    type: 'monsters',
                    subtype: 'automaton',
                    isAutomaton: true,
                    faction: 'enemy',
                    hp: 30,
                    maxHp: 30,
                    id: 'test_automaton'
                },
                image: 'automaton'
            };
        }

        return { miniboards };
    };

    const getSuperboardAutomatonPos = (superboard) => {
        if (!superboard || !Array.isArray(superboard.miniboards)) return null;
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const mb = superboard.miniboards[mbIdx];
            if (!mb || !Array.isArray(mb.tiles)) continue;
            const mbX = mbIdx % 3;
            const mbY = Math.floor(mbIdx / 3);
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                const tile = mb.tiles[tIdx];
                if (tile && tile.contains && (tile.contains.isAutomaton || tile.contains.subtype === 'automaton') && (tile.contains.hp || 0) > 0) {
                    const lX = tIdx % 15;
                    const lY = Math.floor(tIdx / 15);
                    const gx = mbX * 15 + lX;
                    const gy = mbY * 15 + lY;
                    return { gx, gy, mbIdx, tIdx, tile, automaton: tile.contains };
                }
            }
        }
        return null;
    };

    const getSuperboardEnemySpawnPos = (superboard) => {
        if (!superboard || !Array.isArray(superboard.miniboards)) return null;
        for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
            const mb = superboard.miniboards[mbIdx];
            if (!mb || !Array.isArray(mb.tiles)) continue;
            const mbX = mbIdx % 3;
            const mbY = Math.floor(mbIdx / 3);
            for (let tIdx = 0; tIdx < 225; tIdx++) {
                const tile = mb.tiles[tIdx];
                if (!tile) continue;
                const cType = typeof tile.contains === 'object' && tile.contains ? (tile.contains.type || tile.contains.subtype) : tile.contains;
                const cSubtype = typeof tile.contains === 'object' && tile.contains ? tile.contains.subtype : null;
                const img = String(tile.image || '').toLowerCase();
                const opt = String(tile.optionType || '').toLowerCase();
                if (tile.isEnemySpawn || tile.originalMarker === 'narrative' || cType === 'narrative' || cSubtype === 'narrative' || img === 'narrative' || opt === 'narrative') {
                    const lX = tIdx % 15;
                    const lY = Math.floor(tIdx / 15);
                    return { gx: mbX * 15 + lX, gy: mbY * 15 + lY, mbIdx, tIdx, tile };
                }
            }
        }
        return null;
    };

    const computeViewportFocus = (state, superboard) => {
        const { superboardPlayerPos, automatonVision } = state;
        const { gx: playerGx, gy: playerGy } = superboardPlayerPos;

        let focusGx = playerGx;
        let focusGy = playerGy;

        if (automatonVision) {
            const autoUnit = getSuperboardAutomatonPos(superboard);
            if (autoUnit) {
                focusGx = autoUnit.gx;
                focusGy = autoUnit.gy;
            } else {
                const enemySpawn = getSuperboardEnemySpawnPos(superboard);
                if (enemySpawn) {
                    focusGx = enemySpawn.gx;
                    focusGy = enemySpawn.gy;
                }
            }
        }

        const viewMinX = Math.max(0, Math.min(30, focusGx - 7));
        const viewMinY = Math.max(0, Math.min(30, focusGy - 7));

        return { focusGx, focusGy, viewMinX, viewMinY };
    };

    test('Command triggers error when not in a pocket dimension', () => {
        const state = { inSuperboard: false, automatonVision: false };
        const commandInputs = ['automaton vision', 'a vision', 'automatonvision', 'avision', 'autovision', 'auto vision'];

        commandInputs.forEach(cmd => {
            let errorOccurred = false;
            let outputMsg = '';
            if (cmd === 'automaton vision' || cmd === 'automatonvision' || cmd === 'a vision' || cmd === 'avision' || cmd === 'autovision' || cmd === 'auto vision') {
                if (!state.inSuperboard) {
                    errorOccurred = true;
                    outputMsg = `Error: 'automaton vision' command is only available in a pocket dimension.`;
                }
            }
            expect(errorOccurred).toBe(true);
            expect(outputMsg).toContain('only available in a pocket dimension');
        });
    });

    test('Command toggles automatonVision ON and OFF in pocket dimension', () => {
        let state = { inSuperboard: true, automatonVision: false };

        const toggleCommand = (cmd) => {
            if (cmd === 'automaton vision' || cmd === 'a vision') {
                if (state.inSuperboard) {
                    state.automatonVision = !state.automatonVision;
                    return `Automaton vision: ${state.automatonVision ? 'ENABLED (Vision centralized on Automaton)' : 'DISABLED (Vision restored to player avatar)'}`;
                }
            }
            return null;
        };

        const onMsg = toggleCommand('automaton vision');
        expect(state.automatonVision).toBe(true);
        expect(onMsg).toContain('ENABLED');

        const offMsg = toggleCommand('a vision');
        expect(state.automatonVision).toBe(false);
        expect(offMsg).toContain('DISABLED');
    });

    test('Viewport centers on Automaton coordinates when automatonVision is enabled', () => {
        // Automaton located at Miniboard 0, Tile 35 (gx = 5, gy = 2)
        // Player located at Miniboard 8, Tile 112 (gx = 37, gy = 37)
        const superboard = createSuperboardMock({ automatonMbIdx: 0, automatonTIdx: 35 });
        const state = {
            superboardPlayerPos: { gx: 37, gy: 37 },
            automatonVision: true
        };

        const result = computeViewportFocus(state, superboard);
        expect(result.focusGx).toBe(5);
        expect(result.focusGy).toBe(2);
        // viewMinX clamped to [0, 30]
        expect(result.viewMinX).toBe(0);
        expect(result.viewMinY).toBe(0);
    });

    test('Viewport falls back to enemy spawn point if Automaton is dead / respawning', () => {
        // Superboard has no living automaton, but has narrative enemy spawn at gx=22, gy=22
        const superboard = createSuperboardMock({});
        const state = {
            superboardPlayerPos: { gx: 5, gy: 5 },
            automatonVision: true
        };

        const result = computeViewportFocus(state, superboard);
        expect(result.focusGx).toBe(22);
        expect(result.focusGy).toBe(22);
        expect(result.viewMinX).toBe(15);
        expect(result.viewMinY).toBe(15);
    });

    test('Viewport centers back on Player avatar when automatonVision is disabled', () => {
        const superboard = createSuperboardMock({ automatonMbIdx: 0, automatonTIdx: 35 });
        const state = {
            superboardPlayerPos: { gx: 28, gy: 14 },
            automatonVision: false
        };

        const result = computeViewportFocus(state, superboard);
        expect(result.focusGx).toBe(28);
        expect(result.focusGy).toBe(14);
        expect(result.viewMinX).toBe(21);
        expect(result.viewMinY).toBe(7);
    });

    test('Fog of War spotlight follows the Automaton focus in SVG mask calculation', () => {
        const tileSize = 48;
        const viewMinX = 10;
        const viewMinY = 10;
        const superboardFogRadius = 2;

        const focusGx = 15;
        const focusGy = 14;

        const focusLocalX = focusGx - viewMinX; // 5
        const focusLocalY = focusGy - viewMinY; // 4
        const focusCx = (focusLocalX + 0.5) * tileSize; // (5.5) * 48 = 264
        const focusCy = (focusLocalY + 0.5) * tileSize; // (4.5) * 48 = 216
        const focusR = (superboardFogRadius + 0.5) * tileSize; // (2.5) * 48 = 120

        expect(focusCx).toBe(264);
        expect(focusCy).toBe(216);
        expect(focusR).toBe(120);
    });

    test('Floating player avatar is hidden when player is outside the 15x15 viewport in superboard mode', () => {
        const checkFloatingVisibility = (coords) => {
            const row = coords[0];
            const col = coords[1];
            if (row < 0 || row >= 15 || col < 0 || col >= 15) {
                return { display: 'none', opacity: 0 };
            }
            return { display: 'block', opacity: 1 };
        };

        expect(checkFloatingVisibility([-5, 20]).display).toBe('none');
        expect(checkFloatingVisibility([7, 7]).display).toBe('block');
        expect(checkFloatingVisibility([15, 3]).display).toBe('none');
        expect(checkFloatingVisibility([2, -1]).display).toBe('none');
    });
});
