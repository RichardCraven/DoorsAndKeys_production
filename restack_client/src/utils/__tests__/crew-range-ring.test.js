import { getCrewRangeRingSpecs } from '../crew-range-helper';

describe('getCrewRangeRingSpecs', () => {
    it('returns null if no member and no background is provided', () => {
        expect(getCrewRangeRingSpecs(null, '', false, 48)).toBeNull();
    });

    it('returns blue ring with 2-tile radius (regular vision radius) for Wizard class', () => {
        const wizard = { type: 'wizard', name: 'Zildjikan' };
        const specs = getCrewRangeRingSpecs(wizard, 'url(wizard_portrait.png)', false, 48);

        expect(specs).not.toBeNull();
        expect(specs.isWizard).toBe(true);
        expect(specs.isRanger).toBe(false);
        expect(specs.isMelee).toBe(false);
        expect(specs.rangeTiles).toBe(2);
        expect(specs.diameterPx).toBe(192); // 2 * 2 * 48
        expect(specs.color).toBe('#38bdf8');
    });

    it('returns green ring with 4-tile radius for Ranger class', () => {
        const ranger = { type: 'ranger', name: 'Dormund' };
        const specs = getCrewRangeRingSpecs(ranger, 'url(ranger_portrait.png)', false, 48);

        expect(specs).not.toBeNull();
        expect(specs.isWizard).toBe(false);
        expect(specs.isRanger).toBe(true);
        expect(specs.isMelee).toBe(false);
        expect(specs.rangeTiles).toBe(4);
        expect(specs.diameterPx).toBe(384); // 4 * 2 * 48
        expect(specs.color).toBe('#4ade80');
    });

    it('identifies Wizard or Ranger by portrait / image / role fallback', () => {
        const specsWizard = getCrewRangeRingSpecs({ portrait: 'zildjikan.png' }, '', true, 50);
        expect(specsWizard.isWizard).toBe(true);
        expect(specsWizard.diameterPx).toBe(200); // 2 * 2 * 50

        const specsRanger = getCrewRangeRingSpecs({ portrait: 'dormund.png' }, '', true, 50);
        expect(specsRanger.isRanger).toBe(true);
        expect(specsRanger.diameterPx).toBe(400); // 4 * 2 * 50
    });

    it('returns amber 1-tile radius melee ring for melee classes (soldier, monk, barbarian, engineer, sage, summoner)', () => {
        const soldier = { type: 'soldier', name: 'Garrick' };
        const soldierSpecs = getCrewRangeRingSpecs(soldier, '', false, 48);
        expect(soldierSpecs).not.toBeNull();
        expect(soldierSpecs.isMelee).toBe(true);
        expect(soldierSpecs.rangeTiles).toBe(1);
        expect(soldierSpecs.diameterPx).toBe(96); // 1 * 2 * 48
        expect(soldierSpecs.color).toBe('#f59e0b');
        expect(soldierSpecs.animClass).toBe('melee-ring');

        const monk = { type: 'monk', name: 'Kael' };
        expect(getCrewRangeRingSpecs(monk, '', true, 48).isMelee).toBe(true);

        const barbarian = { type: 'barbarian', name: 'Thorg' };
        expect(getCrewRangeRingSpecs(barbarian, '', false, 48).isMelee).toBe(true);

        const summoner = { type: 'summoner', name: 'Evoker' };
        expect(getCrewRangeRingSpecs(summoner, '', false, 48).isMelee).toBe(true);
    });

    it('returns null for Glitterburn class', () => {
        const glitterburn = { type: 'glitterburn', name: 'Spark' };
        expect(getCrewRangeRingSpecs(glitterburn, '', false, 48)).toBeNull();
        expect(getCrewRangeRingSpecs(glitterburn, '', true, 48)).toBeNull();
    });
});
