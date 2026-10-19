jest.mock('@coreui/icons', () => ({}));
jest.mock('../images', () => ({
    campfire: 'campfire.png',
    avatar: 'avatar.png'
}));

import { CombatManagerRedux } from '../combat-manager-redux';
import { setUpCamp } from '../camp-manager';
import * as sessionHandler from '../session-handler';

describe('Minion Stamina Decay and Recuperate Facing Orientation', () => {
    describe('Stamina Indicator Labels', () => {
        let cm;

        beforeEach(() => {
            cm = new CombatManagerRedux();
            cm.updateData = jest.fn();
            cm.appendCombatLog = jest.fn();
        });

        test('minion stamina decay shows -N stamina (not -N STAM)', () => {
            const summoner = {
                id: 'summoner_1',
                name: 'Summoner',
                type: 'summoner',
                coordinates: { x: 1, y: 1 },
                isMonster: false
            };
            const minion = {
                id: 'minion_1',
                name: 'Wugum',
                type: 'skeleton',
                isMinion: true,
                summonedBy: 'summoner_1',
                maxEndurance: 20,
                endurance: 20,
                hp: 10,
                coordinates: { x: 2, y: 1 },
                isMonster: false,
                activeBuffs: [],
                activeDebuffs: []
            };

            cm.combatants = {
                [summoner.id]: summoner,
                [minion.id]: minion
            };

            jest.useFakeTimers();
            cm.processRoundTurns();
            jest.runAllTimers();
            jest.useRealTimers();

            expect(minion.endurance).toBe(18); // 20 - 2 (10% of 20 = 2)
            expect(minion.damageIndicators).toBeDefined();
            const decayIndicator = minion.damageIndicators.find(ind => ind.value.includes('stamina'));
            expect(decayIndicator).toBeDefined();
            expect(decayIndicator.value).toBe('-2 stamina');
            // Ensure old 'STAM' is nowhere in the indicator
            expect(minion.damageIndicators.some(ind => ind.value.includes('STAM'))).toBe(false);
        });

        test('sage invigorate stamina regen shows +N stamina (not +N STAM)', () => {
            const sage = {
                id: 'sage_1',
                name: 'Sage',
                type: 'sage',
                coordinates: { x: 2, y: 2 },
                activeBuffs: [{ name: 'invigorate', roundsLeft: 3 }],
                isMonster: false
            };
            const ally = {
                id: 'ally_1',
                name: 'Ally',
                type: 'soldier',
                coordinates: { x: 3, y: 2 },
                activeBuffs: [{ name: 'invigorate', roundsLeft: 3 }],
                maxEndurance: 100,
                endurance: 50,
                isMonster: false
            };

            cm.combatants = {
                [sage.id]: sage,
                [ally.id]: ally
            };

            cm._tickUnitBuffs(ally);

            expect(ally.endurance).toBe(70);
            expect(ally.damageIndicators).toBeDefined();
            const regenIndicator = ally.damageIndicators.find(ind => ind.value.includes('stamina'));
            expect(regenIndicator).toBeDefined();
            expect(regenIndicator.value).toBe('+20 stamina');
            expect(ally.damageIndicators.some(ind => ind.value.includes('STAM'))).toBe(false);
        });
    });

    describe('Camp Recuperation Timing & Position Updates', () => {
        test('setUpCamp invokes updateFloatingPlayerPosition immediately upon setting meta.camping', async () => {
            const mockLocation = [5, 5];
            const updateFloatingPlayerPosition = jest.fn();
            const placePlayer = jest.fn();
            const mockComponent = {
                props: {
                    boardManager: {
                        playerTile: { location: mockLocation },
                        placePlayer,
                        overlayTiles: []
                    },
                    crewManager: {
                        crew: [{ id: 'hero', level: 1, hp: 50, stats: { hp: 50 } }]
                    }
                },
                state: { poiPanelExpanded: false },
                setState: jest.fn(),
                updateFloatingPlayerPosition,
                _setTimeout: (fn) => setTimeout(fn, 1000)
            };

            // Set up meta with plenty of food
            sessionHandler.storeMeta({ food: 100, resolve: 100 });

            await setUpCamp(mockComponent, 10);

            // updateFloatingPlayerPosition must have been called
            expect(updateFloatingPlayerPosition).toHaveBeenCalledWith(mockLocation);
            expect(placePlayer).toHaveBeenCalledWith(mockLocation);

            const meta = sessionHandler.getMeta();
            expect(meta.camping).toBe(true);
        });
    });
});
