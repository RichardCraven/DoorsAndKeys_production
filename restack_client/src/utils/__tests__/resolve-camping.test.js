import { setUpCamp, processCampTick } from '../camp-manager';
import { storeMeta, getMeta } from '../session-handler';

describe('Resolve Camping Fallback', () => {
    let mockComponent;

    beforeEach(() => {
        storeMeta({ food: 0 });
        mockComponent = {
            props: {
                crewManager: {
                    crew: [
                        { id: 'p1', level: 1, hp: 50, stats: { hp: 100, fort: 10 }, currentResolve: 50 }
                    ]
                }
            },
            state: {
                selectedCrewMember: { id: 'p1', level: 1, hp: 50, stats: { hp: 100, fort: 10 }, currentResolve: 50 }
            },
            setState: jest.fn((newState, callback) => {
                mockComponent.state = { ...mockComponent.state, ...newState };
                if (typeof newState === 'function') {
                    const functionalState = newState(mockComponent.state);
                    mockComponent.state = { ...mockComponent.state, ...functionalState };
                }
                if (callback) callback();
            }),
            forceUpdate: jest.fn()
        };
    });

    test('prompts resolve modal when food is insufficient and useResolveFallback is false', async () => {
        await setUpCamp(mockComponent, 8, false);

        expect(mockComponent.state.showResolveCampModal).toBe(true);
        expect(mockComponent.state.resolveCampFoodCost).toBe(5);
        expect(mockComponent.state.resolveCampCurrentFood).toBe(0);
        expect(mockComponent.state.pendingCampDuration).toBe(8);
        expect(getMeta().camping).toBeFalsy();
    });

    test('starts camp with isResolveCamp flag when useResolveFallback is true', async () => {
        await setUpCamp(mockComponent, 8, true);

        const meta = getMeta();
        expect(meta.camping).toBe(true);
        expect(meta.isResolveCamp).toBe(true);
    });
});
