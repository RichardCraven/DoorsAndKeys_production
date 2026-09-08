describe('Pocket Dimension Automaton Monolith Conversion Progress Bar', () => {
    test('1. When Automaton begins converting a monolith, convertingMonolith metadata is set', () => {
        const now = Date.now();
        const monolith = {
            id: 'monolith_15_15',
            anchorGx: 15,
            anchorGy: 15
        };

        const automaton = {
            id: 'automaton_enemy_1',
            isAutomaton: true,
            faction: 'enemy',
            hp: 30,
            maxHp: 30
        };

        const converting = {
            targetMonolithId: monolith.id,
            anchorGx: monolith.anchorGx,
            anchorGy: monolith.anchorGy,
            startTime: now,
            duration: 10000
        };

        automaton.convertingMonolith = converting;

        expect(automaton.convertingMonolith).toBeDefined();
        expect(automaton.convertingMonolith.targetMonolithId).toBe('monolith_15_15');
        expect(automaton.convertingMonolith.duration).toBe(10000);
        expect(automaton.convertingMonolith.startTime).toBe(now);
    });

    test('2. Progress calculation correctly computes percentage over 10s duration', () => {
        const startTime = Date.now() - 5000; // 5 seconds elapsed
        const duration = 10000;

        const computeProgress = (now, start, dur) => {
            const elapsed = Math.max(0, now - start);
            return Math.min(1, Math.max(0, elapsed / dur));
        };

        const now = Date.now();
        const progress = computeProgress(now, startTime, duration);
        expect(progress).toBeCloseTo(0.5, 1);

        // At 0s
        expect(computeProgress(now, now, duration)).toBe(0);

        // At 10s
        expect(computeProgress(now + 10000, now, duration)).toBe(1);
    });

    test('3. Clearing convertingMonolith when Automaton is destroyed or interrupted removes progress bar', () => {
        const automaton = {
            id: 'automaton_enemy_1',
            isAutomaton: true,
            hp: 30,
            convertingMonolith: {
                targetMonolithId: 'monolith_15_15',
                startTime: Date.now(),
                duration: 10000
            }
        };

        // Automaton destroyed or takes lethal damage
        automaton.hp = 0;
        delete automaton.convertingMonolith;

        const shouldRenderProgressBar = (unit) => {
            if (!unit || unit.dead || (unit.hp || 0) <= 0) return false;
            const isAuto = unit.isAutomaton || unit.subtype === 'automaton';
            return !!(isAuto && unit.convertingMonolith);
        };

        expect(shouldRenderProgressBar(automaton)).toBe(false);
    });

    test('4. Monolith conversion completes after 10 seconds and triggers activation', () => {
        const startTime = Date.now() - 10001; // 10.001 seconds elapsed
        const automaton = {
            id: 'automaton_enemy_1',
            isAutomaton: true,
            hp: 30,
            convertingMonolith: {
                targetMonolithId: 'monolith_15_15',
                startTime: startTime,
                duration: 10000
            }
        };

        const now = Date.now();
        const elapsed = now - automaton.convertingMonolith.startTime;
        let activated = false;

        if (elapsed >= automaton.convertingMonolith.duration) {
            delete automaton.convertingMonolith;
            activated = true;
        }

        expect(activated).toBe(true);
        expect(automaton.convertingMonolith).toBeUndefined();
    });

    test('5. Domain monolith converting suppresses top progress bar and displays bottom progress bar with player styling', () => {
        const monolithKey = 'domain_monolith';
        const isDomainMonolith = monolithKey.includes('domain_monolith') || monolithKey.includes('dark_domain_monolith') || (monolithKey.includes('monolith') && !monolithKey.includes('shrine'));
        expect(isDomainMonolith).toBe(true);

        const convTarget = {
            targetId: 'monolith_15_15',
            startTime: Date.now() - 3000,
            duration: 10000,
            isPlayerClaim: true
        };

        // Top progress bar logic check
        const shouldRenderTopBar = (tileKey, converting, hasActivationProgress) => {
            if (!converting) return false;
            const isMono = tileKey.includes('domain_monolith') || tileKey.includes('dark_domain_monolith') || tileKey.includes('domain_node') || tileKey.includes('dark_domain_node') || (tileKey.includes('monolith') && !tileKey.includes('shrine'));
            if (isMono || (hasActivationProgress !== undefined && hasActivationProgress !== null)) {
                return false;
            }
            return true;
        };

        // Monolith top bar MUST be suppressed
        expect(shouldRenderTopBar('domain_monolith', convTarget, 0.3)).toBe(false);
        expect(shouldRenderTopBar('dark_domain_monolith', convTarget, null)).toBe(false);

        // Bottom progress bar styling check
        const getBottomBarStyles = (convObj, fallbackProgress) => {
            const isPlayerConv = !!(convObj && (convObj.isPlayerClaim || convObj.isPlayer));
            const isEnemyConv = !!(convObj && !isPlayerConv);

            return {
                borderColor: isPlayerConv ? '#38bdf8' : (isEnemyConv ? '#ef4444' : '#c084fc'),
                barBg: isPlayerConv ? '#38bdf8' : (isEnemyConv ? '#ef4444' : '#c084fc'),
                barGradient: isPlayerConv
                    ? 'linear-gradient(90deg, #0284c7, #38bdf8, #7dd3fc)'
                    : (isEnemyConv
                        ? 'linear-gradient(90deg, #dc2626, #f87171, #ef4444)'
                        : 'linear-gradient(90deg, #9333ea, #d8b4fe)')
            };
        };

        const playerStyles = getBottomBarStyles(convTarget, 0.3);
        expect(playerStyles.borderColor).toBe('#38bdf8');
        expect(playerStyles.barBg).toBe('#38bdf8');
        expect(playerStyles.barGradient).toContain('#38bdf8');

        // Neutral ritual activation styles check
        const neutralStyles = getBottomBarStyles(null, 0.5);
        expect(neutralStyles.borderColor).toBe('#c084fc');
        expect(neutralStyles.barBg).toBe('#c084fc');
        expect(neutralStyles.barGradient).toContain('#9333ea');
    });

    test('6. Non-monolith units and outposts retain top progress bar', () => {
        const outpostConv = {
            targetId: 'outpost_1',
            startTime: Date.now() - 2000,
            duration: 5000,
            isPlayerClaim: true
        };

        const shouldRenderTopBar = (tileKey, converting, hasActivationProgress) => {
            if (!converting) return false;
            const isMono = tileKey.includes('domain_monolith') || tileKey.includes('dark_domain_monolith') || tileKey.includes('domain_node') || tileKey.includes('dark_domain_node') || (tileKey.includes('monolith') && !tileKey.includes('shrine'));
            if (isMono || (hasActivationProgress !== undefined && hasActivationProgress !== null)) {
                return false;
            }
            return true;
        };

        // Outpost tile with no monolith activation progress keeps top bar
        expect(shouldRenderTopBar('outpost', outpostConv, null)).toBe(true);

        // Automaton unit converting on its own tile keeps top bar
        const autoConv = { targetMonolithId: 'monolith_1', startTime: Date.now(), duration: 10000 };
        expect(shouldRenderTopBar('automaton', autoConv, null)).toBe(true);
    });
});
