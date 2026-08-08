import {
    getAdjustedBuildTime,
    applyBuildingStaminaPenalty,
    clearBuildingStaminaPenalties
} from '../building-utils';
import { BUILDINGS } from '../../components/BuildMenuModal';

describe('Building Construction & Stamina Tax Utils', () => {
    test('getAdjustedBuildTime returns base build time when 0% of crew is dead', () => {
        const crew = [
            { id: '1', hp: 10, dead: false },
            { id: '2', hp: 10, dead: false },
            { id: '3', hp: 10, dead: false },
            { id: '4', hp: 10, dead: false },
        ];
        const buildTime = getAdjustedBuildTime(10, crew);
        expect(buildTime).toBe(10);
    });

    test('getAdjustedBuildTime increases build time by 250% (2.5x) when 25% (1/4) of crew is dead', () => {
        const crew = [
            { id: '1', hp: 10, dead: false },
            { id: '2', hp: 10, dead: false },
            { id: '3', hp: 10, dead: false },
            { id: '4', hp: 0, dead: true },
        ];
        // 10 seconds * 2.5 = 25 seconds
        const buildTime = getAdjustedBuildTime(10, crew);
        expect(buildTime).toBe(25);
    });

    test('getAdjustedBuildTime increases build time by 650% (6.5x) when 66% (2/3) of crew is dead', () => {
        const crew = [
            { id: '1', hp: 10, dead: false },
            { id: '2', hp: 0, dead: true },
            { id: '3', hp: 0, dead: true },
        ];
        // 10 seconds * 6.5 = 65 seconds
        const buildTime = getAdjustedBuildTime(10, crew);
        expect(buildTime).toBe(65);
    });

    test('applyBuildingStaminaPenalty taxes living contributors with minimum 30% or actualBuildTimeSec', () => {
        const crew = [
            { id: '1', name: 'Soldier', hp: 10, dead: false },
            { id: '2', name: 'Rogue', hp: 0, dead: true }
        ];

        // 20s build duration -> tax should be Math.max(20, 30) = 30%
        const updated20s = applyBuildingStaminaPenalty(crew, 20, ['1']);
        expect(updated20s[0].buildingStaminaPenalty.penaltyPct).toBe(30);
        expect(updated20s[1].buildingStaminaPenalty).toBeUndefined();

        // 65s build duration -> tax should be Math.max(65, 30) = 65%
        const updated65s = applyBuildingStaminaPenalty(crew, 65, ['1']);
        expect(updated65s[0].buildingStaminaPenalty.penaltyPct).toBe(65);
    });

    test('clearBuildingStaminaPenalties removes penalty metadata from crew', () => {
        const crewWithPenalty = [
            {
                id: '1',
                name: 'Soldier',
                buildingStaminaPenalty: { penaltyPct: 30, expiresAt: Date.now() + 3600000 }
            }
        ];

        const cleared = clearBuildingStaminaPenalties(crewWithPenalty);
        expect(cleared[0].buildingStaminaPenalty).toBeUndefined();
    });

    test('BUILDINGS catalog includes Earthly, Arcane, and Obscure building categories', () => {
        const earthly = BUILDINGS.filter(b => b.category === 'earthly');
        const arcane = BUILDINGS.filter(b => b.category === 'arcane');
        const obscure = BUILDINGS.filter(b => b.category === 'obscure');

        expect(earthly.length).toBe(6);
        expect(arcane.length).toBe(3);
        expect(obscure.length).toBe(2);

        expect(arcane.map(b => b.key)).toEqual(['frozen_locus', 'emerald_locus', 'cosmic_locus']);
        expect(obscure.map(b => b.key)).toEqual(['infernal_tower', 'infernal_pit']);
    });
});
