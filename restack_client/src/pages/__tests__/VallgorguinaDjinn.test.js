import { MonsterManager } from '../../utils/monster-manager';
import SKILLS_MATRIX from '../../utils/skills-matrix';

describe('Vallgorguina Djinn Monster & Skills Integration', () => {
    test('registers vallgorguina_djinn as a tier 3 eldritch monster', () => {
        const monsterManager = new MonsterManager();
        const djinn = monsterManager.getMonster('vallgorguina_djinn');
        expect(djinn).toBeDefined();
        expect(djinn.type).toBe('vallgorguina_djinn');
        expect(djinn.monster_names).toContain("Xavier's Shadow");
        expect(djinn.tier).toBe(3);
        expect(djinn.subtype).toBe('eldritch');
        expect(djinn.level).toBe(15);
        expect(djinn.portrait).toBeDefined();
    });

    test('defines all thematic Vallgorguina Djinn skills in the skills matrix', () => {
        const requiredSkills = ['obsidian_slash', 'missing_time', 'biological_sample', 'temporal_duplicate', 'induce_fear'];
        requiredSkills.forEach(skillKey => {
            expect(SKILLS_MATRIX[skillKey]).toBeDefined();
            expect(SKILLS_MATRIX[skillKey].id).toBe(skillKey);
        });
    });
});
