import skillsMatrix from '../../utils/skills-matrix';

// Mock coreui before importing
jest.mock('@coreui/icons', () => ({
  cilCaretRight: 'cilCaretRight',
  cilCaretLeft: 'cilCaretLeft',
  cilMenu: 'cilMenu'
}));

jest.mock('@coreui/icons-react', () => 'CIcon');
jest.mock('@coreui/react', () => ({
  CButton: 'CButton',
  CFormSelect: 'CFormSelect',
  CFormInput: 'CFormInput',
  CModal: 'CModal',
  CModalHeader: 'CModalHeader',
  CModalTitle: 'CModalTitle',
  CModalBody: 'CModalBody',
  CModalFooter: 'CModalFooter'
}));

describe('Max Skills Console Command Unit Tests', () => {
  test('monk max skills command populates all monk skills for matching crew member', () => {
    const monkMember = {
      id: 8080,
      name: 'Yu',
      type: 'monk',
      skills: ['monk_punch'],
      globalSkills: [],
      passives: [],
      shrineSkills: []
    };

    const crewList = [monkMember];
    let devConsoleOutput = [];

    const handleMaxSkillsCommand = (cmd, raw) => {
      const maxSkillsMatch = cmd.match(/^([a-z0-9_-]+)\s+max\s+skills?$/i) || cmd.match(/^max\s+skills?\s+([a-z0-9_-]+)$/i);
      if (maxSkillsMatch) {
        const clsTarget = maxSkillsMatch[1].toLowerCase().trim();
        const matchingMembers = crewList.filter(m => {
          if (!m) return false;
          const mType = (m.type || m.class || m.image || m.shrineClass || m.heroClass || m.name || '').toLowerCase();
          return mType === clsTarget || mType.includes(clsTarget) || clsTarget.includes(mType);
        });

        if (matchingMembers.length === 0) {
          devConsoleOutput.push(`Error: No crew member matching class "${clsTarget}" found in crew.`);
        } else {
          const classSkillKeys = Object.keys(skillsMatrix).filter(key => {
            const sk = skillsMatrix[key];
            if (!sk) return false;
            const skClass = (sk.class || '').toLowerCase();
            if (skClass === clsTarget) return true;
            if (key.toLowerCase().startsWith(clsTarget + '_')) return true;
            return false;
          });

          matchingMembers.forEach(member => {
            if (!Array.isArray(member.skills)) member.skills = [];
            if (!Array.isArray(member.globalSkills)) member.globalSkills = [];
            if (!Array.isArray(member.passives)) member.passives = [];
            if (!Array.isArray(member.shrineSkills)) member.shrineSkills = [];

            classSkillKeys.forEach(skKey => {
              const skDef = skillsMatrix[skKey];
              if (!member.skills.includes(skKey)) {
                member.skills.push(skKey);
              }
              const hasGS = member.globalSkills.some(g => (typeof g === 'string' ? g : g.key) === skKey);
              if (!hasGS) {
                member.globalSkills.push({ key: skKey, level: 1 });
              }
              if (skDef && (skDef.isPassive || skDef.type === 'passive' || skDef.treePath === 'global')) {
                if (!member.passives.includes(skKey)) {
                  member.passives.push(skKey);
                }
              }
              if (!member.shrineSkills.includes(skKey)) {
                member.shrineSkills.push(skKey);
              }
            });
          });

          devConsoleOutput.push(`Maxed skills for ${matchingMembers.map(m => m.name).join(', ')}: unlocked ${classSkillKeys.length} skills (tier 1 each).`);
        }
      }
    };

    handleMaxSkillsCommand('monk max skills', 'monk max skills');

    expect(devConsoleOutput.length).toBe(1);
    expect(devConsoleOutput[0]).toContain('Maxed skills for Yu');
    
    // Check that silent_awareness and ethereal speed are now present
    expect(monkMember.skills).toContain('silent_awareness');
    expect(monkMember.skills).toContain('monk_ethereal_speed');
    expect(monkMember.globalSkills.some(g => g.key === 'silent_awareness')).toBe(true);
  });

  test('reports error if class not in crew', () => {
    const wizardMember = { id: 1, name: 'Zildjikan', type: 'wizard', skills: [] };
    const crewList = [wizardMember];
    let devConsoleOutput = [];

    const handleMaxSkillsCommand = (cmd, raw) => {
      const maxSkillsMatch = cmd.match(/^([a-z0-9_-]+)\s+max\s+skills?$/i) || cmd.match(/^max\s+skills?\s+([a-z0-9_-]+)$/i);
      if (maxSkillsMatch) {
        const clsTarget = maxSkillsMatch[1].toLowerCase().trim();
        const matchingMembers = crewList.filter(m => {
          if (!m) return false;
          const mType = (m.type || m.class || m.image || m.shrineClass || m.heroClass || m.name || '').toLowerCase();
          return mType === clsTarget || mType.includes(clsTarget) || clsTarget.includes(mType);
        });

        if (matchingMembers.length === 0) {
          devConsoleOutput.push(`Error: No crew member matching class "${clsTarget}" found in crew.`);
        }
      }
    };

    handleMaxSkillsCommand('barbarian max skills', 'barbarian max skills');
    expect(devConsoleOutput[0]).toBe('Error: No crew member matching class "barbarian" found in crew.');
  });
});
