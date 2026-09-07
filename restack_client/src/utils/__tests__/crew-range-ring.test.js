import { getCrewRangeRingSpecs } from '../crew-range-helper';

describe('getCrewRangeRingSpecs', () => {
    it('returns null if not in superboard / pocket dimension', () => {
        const wizard = { type: 'wizard' };
        expect(getCrewRangeRingSpecs(wizard, '', false, 48)).toBeNull();
    });

    it('returns blue ring with 2-tile radius (regular vision radius) for Wizard class', () => {
        const wizard = { type: 'wizard', name: 'Zildjikan' };
        const specs = getCrewRangeRingSpecs(wizard, 'url(wizard_portrait.png)', true, 48);

        expect(specs).not.toBeNull();
        expect(specs.isWizard).toBe(true);
        expect(specs.isRanger).toBe(false);
        expect(specs.rangeTiles).toBe(2);
        expect(specs.diameterPx).toBe(192); // 2 * 2 * 48
        expect(specs.color).toBe('#38bdf8');
    });

    it('returns green ring with 4-tile radius (enhanced chemical lantern vision radius) for Ranger class', () => {
        const ranger = { type: 'ranger', name: 'Dormund' };
        const specs = getCrewRangeRingSpecs(ranger, 'url(ranger_portrait.png)', true, 48);

        expect(specs).not.toBeNull();
        expect(specs.isWizard).toBe(false);
        expect(specs.isRanger).toBe(true);
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

    it('returns null for non-Wizard and non-Ranger classes', () => {
        const soldier = { type: 'soldier', name: 'Garrick' };
        expect(getCrewRangeRingSpecs(soldier, '', true, 48)).toBeNull();

        const monk = { type: 'monk', name: 'Kael' };
        expect(getCrewRangeRingSpecs(monk, '', true, 48)).toBeNull();
    });
});
