jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({}));

import { setUpCamp, endCamp } from '../camp-manager';
import { getMeta, storeMeta, applyResolvePenalty } from '../session-handler';

jest.mock('../session-handler', () => {
    let mockMeta = {};
    return {
        getMeta: () => mockMeta,
        storeMeta: (m) => { mockMeta = m; },
        getUserId: () => 'test-user',
        applyResolvePenalty: jest.fn().mockReturnValue(2)
    };
});

jest.mock('../api-handler', () => ({
    updateUserRequest: jest.fn()
}));

describe('Fortify Camping Rebalance & Cooldowns', () => {
    let mockComponent;

    beforeEach(() => {
        // Reset mockMeta in session-handler
        storeMeta({
            food: 0, // 0 food to trigger Fortify
            resolve: 100
        });

        // Set up component mocks
        mockComponent = {
            campTimeout: null,
            campInterval: null,
            setState: jest.fn(),
            props: {
                crewManager: {
                    crew: [
                        {
                            id: 'soldier_1',
                            type: 'soldier',
                            level: 1,
                            dead: false,
                            globalSkills: [{ key: 'fortify', level: 1 }]
                        }
                    ]
                },
                saveUserData: jest.fn()
            }
        };
    });

    test('Fortify Level 1 cooldown (2 hours)', async () => {
        // First camping: should bypass penalty
        await setUpCamp(mockComponent);
        expect(mockComponent.setState).toHaveBeenCalledWith(
            expect.objectContaining({ campWarningMessage: expect.stringContaining('Fortify prevented') })
        );

        // Clear mock calls
        mockComponent.setState.mockClear();

        // Second camping immediately after: should be blocked by cooldown
        await setUpCamp(mockComponent);
        expect(mockComponent.setState).toHaveBeenCalledWith(
            expect.objectContaining({ campWarningMessage: expect.stringContaining('cooldown') })
        );
    });

    test('Fortify Level 2 cooldown (30 min) and endCamp resolve bonus', async () => {
        // Change crew level to 2
        mockComponent.props.crewManager.crew[0].globalSkills[0].level = 2;

        // Set last use to 35 minutes ago (should be off cooldown)
        const meta = getMeta();
        meta.lastFortifyUseTimestamp = Date.now() - (35 * 60 * 1000);
        storeMeta(meta);

        await setUpCamp(mockComponent);
        expect(mockComponent.setState).toHaveBeenCalledWith(
            expect.objectContaining({ campWarningMessage: expect.stringContaining('Fortify prevented') })
        );

        // Test endCamp resolve bonus (level 2 has 35% chance to generate 10 resolve)
        const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1); // succeeds < 0.35
        storeMeta({
            resolve: 50,
            camping: true
        });

        await endCamp(mockComponent);
        expect(getMeta().resolve).toBe(50 + 15 + 10); // 50 start + 15 base + 10 fortify bonus
        mathRandomSpy.mockRestore();
    });

    test('should heal crew members by fortitude per second and revive dead units to 1 HP', async () => {
        // Setup crew with 1 injured unit and 1 dead unit
        const injuredUnit = {
            id: 'soldier_1',
            type: 'soldier',
            level: 1,
            hp: 20,
            dead: false,
            stats: { fort: 5, hp: 50 },
            globalSkills: [{ key: 'fortify', level: 1 }]
        };
        const deadUnit = {
            id: 'sage_1',
            type: 'sage',
            level: 1,
            hp: 0,
            dead: true,
            stats: { fort: 3, hp: 30 },
            globalSkills: []
        };
        mockComponent.props.crewManager.crew = [injuredUnit, deadUnit];

        // 100 food so we can camp normally
        storeMeta({
            food: 100,
            resolve: 100
        });

        // Set up custom mock implementation of _setInterval & _setTimeout to capture the tick callback
        let tickCallback = null;
        mockComponent._setInterval = jest.fn().mockImplementation((cb, interval) => {
            tickCallback = cb;
            return 'mock-interval-id';
        });
        mockComponent._setTimeout = jest.fn().mockImplementation((cb, delay) => {
            return 'mock-timeout-id';
        });
        mockComponent.drawCooldowns = jest.fn();

        await setUpCamp(mockComponent);

        // Verify camping states initialized
        const startMeta = getMeta();
        expect(startMeta.camping).toBe(true);
        expect(startMeta.campElapsedSeconds).toBe(0);
        expect(startMeta.campTotalSeconds).toBe(10); // default durationSeconds

        // Simulate 3 seconds passing
        expect(tickCallback).toBeDefined();
        
        // Mock Date.now to simulate elapsed time
        const originalNow = Date.now;
        const startTime = Date.now();
        
        Date.now = () => startTime + 3200; // 3 seconds elapsed
        await tickCallback();

        // Verify injured unit healed by 3 * 0.3 * fortitude (4.5 HP)
        const tickMeta = getMeta();
        expect(tickMeta.campElapsedSeconds).toBe(3);
        const tickedInjured = tickMeta.crew.find(c => c.id === 'soldier_1');
        expect(tickedInjured.hp).toBe(24.5); // 20 base + 4.5 healed

        // Verify dead unit stayed dead at 0 HP
        const tickedDead = tickMeta.crew.find(c => c.id === 'sage_1');
        expect(tickedDead.hp).toBe(0);
        expect(tickedDead.dead).toBe(true);

        // Simulate final camp ending
        Date.now = originalNow;
        await endCamp(mockComponent);

        // Verify end camp resolution:
        const finalMeta = getMeta();
        expect(finalMeta.camping).toBe(false);
        expect(finalMeta.campElapsedSeconds).toBeUndefined();

        // Injured unit should keep accumulated HP (24.5), NOT jump to max HP (50)
        const finalInjured = finalMeta.crew.find(c => c.id === 'soldier_1');
        expect(finalInjured.hp).toBe(24.5);

        // Dead unit should be revived to 1 HP and marked not dead
        const finalDead = finalMeta.crew.find(c => c.id === 'sage_1');
        expect(finalDead.hp).toBe(1);
        expect(finalDead.dead).toBe(false);
    });
});
