import { CombatManagerRedux } from '../combat-manager-redux';
import skillsMatrix from '../skills-matrix';

describe('Soul Tap Passive Skill', () => {
  test('soul_tap exists in skillsMatrix for Summoner as a Tier 2 passive skill', () => {
    expect(skillsMatrix.soul_tap).toBeDefined();
    expect(skillsMatrix.soul_tap.class).toBe('summoner');
    expect(skillsMatrix.soul_tap.tier).toBe(2);
    expect(skillsMatrix.soul_tap.name).toBe('Soul Tap');
    expect(skillsMatrix.soul_tap.isPassive).toBe(true);
  });

  test('transfers accumulated power from dead friendly PC unit to living Summoner with soul_tap', () => {
    const cm = new CombatManagerRedux();

    const summoner = {
      id: 'summoner_1',
      type: 'summoner',
      name: 'Summoner X',
      isMonster: false,
      power: 20,
      globalSkills: [{ key: 'soul_tap', level: 1 }],
      coordinates: { x: 1, y: 1 }
    };

    const fallenAlly = {
      id: 'fighter_2',
      type: 'soldier',
      name: 'Fallen Soldier',
      isMonster: false,
      power: 45,
      coordinates: { x: 3, y: 3 }
    };

    cm.combatants = {
      summoner_1: summoner,
      fighter_2: fallenAlly
    };

    cm.data = {
      crew: [{ id: 'summoner_1' }, { id: 'fighter_2' }]
    };

    cm.animManagerRedux = {
      triggerAbility: jest.fn()
    };

    cm.appendCombatLog = jest.fn();

    // Trigger unit death
    cm.targetKilled(fallenAlly);

    // Power transferred: 20 + 45 = 65
    expect(summoner.power).toBe(65);
    // Visual energy transfer animation triggered from fallen ally to summoner
    expect(cm.animManagerRedux.triggerAbility).toHaveBeenCalledWith(
      { x: 3, y: 3 },
      { x: 1, y: 1 },
      'soul_tap'
    );
  });
});
