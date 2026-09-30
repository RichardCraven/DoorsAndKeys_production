import { CrewManager } from '../crew-manager';

describe('Wizard Experience Awarding & XP Bar Calculation', () => {
    let crewManager;

    beforeEach(() => {
        crewManager = new CrewManager();
        crewManager.initializeCrew(crewManager.adventurers);
    });

    test('awards experience to Wizard (Zildjikan) correctly when liveCrew has type spellcaster or wizard', () => {
        const wizard = crewManager.crew.find(c => c.name === 'Zildjikan');
        expect(wizard).toBeDefined();
        const initialExp = wizard.stats.experience;

        const liveCrewSnapshot = [
            { id: wizard.id, name: 'Zildjikan', type: 'spellcaster', image: 'wizard' },
            { id: 123, name: 'Sardonis', type: 'soldier' },
            { id: 8080, name: 'Yu', type: 'monk' }
        ];

        // Award 30 XP
        crewManager.addExperience(liveCrewSnapshot, 30);

        expect(wizard.stats.experience).toBe(initialExp + 30);
    });

    test('calculateExpPercentage returns correct non-zero percentage for Wizard after XP gain', () => {
        const wizard = crewManager.crew.find(c => c.name === 'Zildjikan');
        wizard.stats.experience = 50;

        const pct = crewManager.calculateExpPercentage({ id: wizard.id, name: 'Zildjikan', type: 'spellcaster' });
        expect(pct).toBeGreaterThan(0);
        expect(pct).toBeLessThanOrEqual(100);
    });
});
