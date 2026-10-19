import skillsMatrix from '../skills-matrix';

describe('Expedition Skills Codex Matrix Coverage', () => {
    const expeditionSkills = [
        'astral_conduit',
        'ley_tap',
        'scry',
        'healing_ground',
        'sing',
        'sneak_attack',
        'spike_trap',
        'soldier_shield',
        'breacher',
        'wandering_eye',
        'far_sight',
        'shadow_effigy',
        'void_fetch',
        'engineer_salvage',
        'engineer_grapple_winch',
        'engineer_forward_emplacement'
    ];

    expeditionSkills.forEach(skillKey => {
        it(`should have a valid codex entry in skillsMatrix for '${skillKey}'`, () => {
            const entry = skillsMatrix[skillKey];
            expect(entry).toBeDefined();
            expect(entry.name).toBeTruthy();
            expect(entry.desc).toBeTruthy();
        });
    });
});
