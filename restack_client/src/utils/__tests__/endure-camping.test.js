import { setUpCamp } from '../camp-manager';
import { storeMeta, getMeta } from '../session-handler';

jest.mock('../api-handler', () => ({
    updateUserRequest: jest.fn().mockResolvedValue({}),
    updateDungeonRequest: jest.fn().mockResolvedValue({})
}));

describe('Barbarian Endure Camping Mechanics', () => {
    let mockComponent;
    let mockMeta;

    beforeEach(() => {
        window.localStorage.clear();
        mockMeta = { food: 0, resolve: 100 };
        storeMeta(mockMeta);

        mockComponent = {
            props: {
                crewManager: {
                    crew: [
                        {
                            id: 'barbarian_1',
                            name: 'Conan',
                            type: 'barbarian',
                            hp: 10,
                            stats: { hp: 50 },
                            globalSkills: [{ key: 'endure', level: 1 }]
                        }
                    ]
                },
                saveUserData: jest.fn()
            },
            state: { selectedCrewMember: null },
            setState: jest.fn(updater => {
                if (typeof updater === 'function') {
                    Object.assign(mockComponent.state, updater(mockComponent.state));
                } else {
                    Object.assign(mockComponent.state, updater);
                }
            }),
            forceUpdate: jest.fn(),
            _setTimeout: jest.fn()
        };
    });

    test('Endure auto-triggers on first camp with 100% chance, consuming 0 food and healing crew to 50%', async () => {
        await setUpCamp(mockComponent, 10);
        
        const storedMeta = getMeta(true);
        expect(storedMeta.camping).toBe(true);
        expect(storedMeta.food).toBe(0);
        expect(storedMeta.lastEndureUseTimestamp).toBeGreaterThan(0);
        expect(mockComponent.props.crewManager.crew[0].hp).toBe(25); // 50% of 50
    });

    test('Endure triggers exhaustion window where subsequent use within 10 minutes relies on 20% chance', async () => {
        // Pre-set last use to 2 minutes ago
        mockMeta.lastEndureUseTimestamp = Date.now() - (2 * 60 * 1000);
        storeMeta(mockMeta);

        // Mock Math.random to return 0.5 (fails 20% check)
        const spyRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);

        await setUpCamp(mockComponent, 10);

        const storedMeta = getMeta(true);
        // Camping should fail due to insufficient food when Endure fails
        expect(storedMeta.camping).toBeUndefined();
        expect(storedMeta.resolve).toBe(98); // Penalty applied

        spyRandom.mockRestore();
    });
});
