import { PREMADE_INSCRIPTIONS, getRandomInscription } from '../inscriptions-manager';

describe('Inscriptions Manager', () => {
    test('PREMADE_INSCRIPTIONS has valid entries', () => {
        expect(Array.isArray(PREMADE_INSCRIPTIONS)).toBe(true);
        expect(PREMADE_INSCRIPTIONS.length).toBeGreaterThan(0);
        PREMADE_INSCRIPTIONS.forEach(text => {
            expect(typeof text).toBe('string');
            expect(text.trim().length).toBeGreaterThan(0);
        });
    });

    test('getRandomInscription returns a valid entry from PREMADE_INSCRIPTIONS', () => {
        const text = getRandomInscription();
        expect(PREMADE_INSCRIPTIONS).toContain(text);
    });

    test('getRandomInscription produces entries over multiple calls', () => {
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(getRandomInscription());
        }
        expect(results.size).toBeGreaterThan(1);
    });
});
