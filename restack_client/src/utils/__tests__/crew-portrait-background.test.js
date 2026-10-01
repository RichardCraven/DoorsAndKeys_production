import { getCrewPortraitBackground } from '../images';

describe('getCrewPortraitBackground Replacement vs Overlay', () => {
    test('returns a single url string when portraitUrl is provided, without overlaying fallback', () => {
        const bg = getCrewPortraitBackground('/static/media/wizard_alt_compressed.png', 'wizard');
        expect(bg).toBe('url("/static/media/wizard_alt_compressed.png")');
        // Must NOT contain multiple comma-separated URLs
        expect(bg).not.toContain(',');
    });

    test('replaces soldier portrait with alternate soldier without layering Sardonis underneath', () => {
        const bg = getCrewPortraitBackground('/static/media/soldier_alt_compressed.png', 'soldier');
        expect(bg).toBe('url("/static/media/soldier_alt_compressed.png")');
        expect(bg.split(',').length).toBe(1);
    });

    test('falls back to classType portrait when portraitUrl is empty or undefined', () => {
        const bg = getCrewPortraitBackground(undefined, 'monk');
        expect(bg).toMatch(/^url\("?.+"?\)$/);
        expect(bg).not.toContain(',');
    });

    test('returns single fallback when both portraitUrl and classType are missing', () => {
        const bg = getCrewPortraitBackground(null, null);
        expect(bg.split(',').length).toBe(1);
    });
});
