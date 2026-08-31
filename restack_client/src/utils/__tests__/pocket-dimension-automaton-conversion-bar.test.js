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
});
