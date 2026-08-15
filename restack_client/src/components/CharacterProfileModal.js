import React, { useState } from 'react';
import SkillTree from './SkillTree';
import * as images from '../utils/images';
import { getMeta, storeMeta } from '../utils/session-handler';
import './CharacterProfileModal.css';

const DEFAULT_CLASS_LORE = {
  summoner: 'A conduit for unstable arcana who overwhelms enemies with elemental pressure by opening rifts and summoning minions.',
  monk: 'A master of martial disciplines and ethereal energy, striking with terrifying speed and redirecting incoming force.',
  soldier: 'A resilient vanguard proficient in defensive tactics, crushing shield blows, and frontline command.',
  barbarian: 'A fierce warrior of the Rootsnarl Clan who channels primal fury into sweeping cleaves and devastating blows.',
  engineer: 'A battlefield machinist who excels at spacing control, deploying turrets, traps, and tactical pressure.',
  wizard: 'An archmage of elemental destruction who commands arcana to incinerate foes and shield allies.',
  ranger: 'A deadly scout and sniper proficient with longbows, tracking targets, and setting lethal traps.',
  sage: 'A chronicler of ancient mysteries and sacred arts, providing vital healing, wards, and strategic guidance.'
};

const DEFAULT_CLASS_STATS = {
  summoner: { str: 3, speed: 5, agility: 5, stamina: 6, durability: 4, int: 8, baseHp: 11 },
  monk: { str: 6, speed: 8, agility: 8, stamina: 6, durability: 5, int: 6, baseHp: 12 },
  soldier: { str: 7, speed: 5, agility: 5, stamina: 7, durability: 8, int: 4, baseHp: 16 },
  barbarian: { str: 8, speed: 6, agility: 5, stamina: 8, durability: 7, int: 3, baseHp: 16 },
  engineer: { str: 5, speed: 6, agility: 7, stamina: 5, durability: 5, int: 6, baseHp: 10 },
  wizard: { str: 3, speed: 5, agility: 5, stamina: 4, durability: 3, int: 9, baseHp: 10 },
  ranger: { str: 5, speed: 7, agility: 8, stamina: 5, durability: 4, int: 5, baseHp: 10 },
  sage: { str: 3, speed: 5, agility: 5, stamina: 6, durability: 5, int: 7, baseHp: 10 }
};

const CharacterProfileModal = ({
  crewMember,
  onClose,
  initialTab = 'character',
  onUpdateCrewMember = null
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(crewMember?.name || '');

  if (!crewMember) return null;

  const uType = String(crewMember.type || crewMember.image || '').toLowerCase();
  const defaultStats = DEFAULT_CLASS_STATS[uType] || { str: 5, speed: 5, agility: 5, stamina: 5, durability: 5, int: 5, baseHp: 10 };

  const memberStats = crewMember.stats || {};
  const stats = {
    strength: memberStats.str ?? defaultStats.str,
    speed: memberStats.speed ?? defaultStats.speed,
    agility: memberStats.dex ?? memberStats.agility ?? defaultStats.agility,
    stamina: memberStats.vitality ? Math.round(memberStats.vitality / 5) : (memberStats.stamina ?? defaultStats.stamina),
    durability: memberStats.def ?? memberStats.durability ?? defaultStats.durability,
    intelligence: memberStats.int ?? defaultStats.int,
    health: memberStats.hp ?? memberStats.baseHp ?? defaultStats.baseHp
  };

  const maxStatValues = {
    strength: 10,
    speed: 10,
    agility: 10,
    stamina: 10,
    durability: 10,
    intelligence: 10,
    health: 100
  };

  const description = crewMember.description || DEFAULT_CLASS_LORE[uType] || 'A heroic adventurer equipped for dungeon exploration.';

  const handleSaveName = () => {
    const trimmed = editNameVal.trim();
    if (trimmed && crewMember) {
      const oldName = crewMember.name;
      crewMember.name = trimmed;
      setIsEditingName(false);
      try {
        const meta = getMeta() || {};
        if (Array.isArray(meta.crew)) {
          const match = meta.crew.find(c => (c.id && crewMember.id && c.id === crewMember.id) || c.name === oldName);
          if (match) match.name = trimmed;
          storeMeta(meta);
        }
      } catch (e) { }
      if (typeof onUpdateCrewMember === 'function') {
        onUpdateCrewMember(crewMember);
      }
    }
  };

  const renderSegmentedStatBar = (label, val, maxVal) => {
    // 10 rectangular segments
    const segmentsCount = 10;
    const filledCount = Math.min(10, Math.max(0, Math.round((val / maxVal) * 10)));

    return (
      <div key={label} className="char-stat-row">
        <div className="char-stat-label">{label}</div>
        <div className="char-stat-bar-track">
          {Array.from({ length: segmentsCount }).map((_, idx) => (
            <div
              key={idx}
              className={`char-stat-segment ${idx < filledCount ? 'filled' : 'empty'}`}
            />
          ))}
        </div>
        <div className="char-stat-value-num">{val}</div>
      </div>
    );
  };

  return (
    <div className="char-profile-modal-overlay" onClick={onClose}>
      <div className="char-profile-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Dual Tabs Header */}
        <div className="char-profile-tabs-header">
          <div className="char-profile-tabs-group">
            <button
              className={`char-profile-tab-btn ${activeTab === 'character' ? 'active' : ''}`}
              onClick={() => setActiveTab('character')}
            >
              <span className="tab-icon">👤</span> Character
            </button>
            <button
              className={`char-profile-tab-btn ${activeTab === 'skillTree' ? 'active' : ''}`}
              onClick={() => setActiveTab('skillTree')}
            >
              <span className="tab-icon">🌿</span> Skill Tree
            </button>
          </div>
          <button className="char-profile-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Modal Body Content */}
        <div className="char-profile-modal-body">
          {activeTab === 'character' ? (
            <div className="char-profile-character-tab-content">
              {/* Header Info Banner */}
              <div className="char-profile-header-banner">
                <div className="char-portrait-frame">
                  <img
                    src={crewMember.portrait || crewMember.image}
                    alt={crewMember.name}
                    className="char-portrait-img"
                  />
                </div>
                <div className="char-identity-block">
                  <div className="char-name-row">
                    {isEditingName ? (
                      <div className="char-rename-form">
                        <input
                          type="text"
                          value={editNameVal}
                          onChange={(e) => setEditNameVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                          className="char-rename-input"
                          autoFocus
                        />
                        <button className="char-rename-save-btn" onClick={handleSaveName}>✓</button>
                      </div>
                    ) : (
                      <>
                        <h2 className="char-name-text">{crewMember.name}</h2>
                        <button
                          className="char-rename-pencil-btn"
                          onClick={() => { setEditNameVal(crewMember.name || ''); setIsEditingName(true); }}
                          title="Rename character"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                  </div>
                  <div className="char-badges-row">
                    <span className="char-badge level">Level {crewMember.level || 1}</span>
                    <span className="char-badge class">{crewMember.type || crewMember.class || 'HERO'}</span>
                    {crewMember.isLeader && <span className="char-badge leader">LEADER ★</span>}
                  </div>
                  <p className="char-lore-text">{description}</p>
                </div>
              </div>

              {/* Main Content Grid: Stats Panel + Skills Panel */}
              <div className="char-profile-details-grid">
                {/* Power Ratings Stat Panel (Screenshot 2 aesthetics) */}
                <div className="char-stats-panel-box">
                  <div className="char-panel-title">
                    <span>POWER RATINGS</span>
                    <div className="char-ticks-header">
                      <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
                    </div>
                  </div>
                  <div className="char-stats-list">
                    {renderSegmentedStatBar('STRENGTH', stats.strength, maxStatValues.strength)}
                    {renderSegmentedStatBar('SPEED', stats.speed, maxStatValues.speed)}
                    {renderSegmentedStatBar('AGILITY', stats.agility, maxStatValues.agility)}
                    {renderSegmentedStatBar('STAMINA', stats.stamina, maxStatValues.stamina)}
                    {renderSegmentedStatBar('DURABILITY', stats.durability, maxStatValues.durability)}
                    {renderSegmentedStatBar('INTELLIGENCE', stats.intelligence, maxStatValues.intelligence)}
                    {renderSegmentedStatBar('HEALTH (HP)', stats.health, maxStatValues.health)}
                  </div>
                </div>

                {/* Abilities & Skills Summary Panel */}
                <div className="char-abilities-panel-box">
                  <div className="char-panel-title">SPECIALITIES & SKILLS</div>
                  <div className="char-abilities-content">
                    {Array.isArray(crewMember.skills) && crewMember.skills.length > 0 ? (
                      <div className="char-skills-chips-list">
                        {crewMember.skills.map((skKey, i) => (
                          <div key={i} className="char-skill-chip">
                            <span className="skill-chip-dot">✦</span>
                            <span>{String(skKey).replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="char-empty-msg">No skills currently unlocked.</div>
                    )}

                    {Array.isArray(crewMember.passives) && crewMember.passives.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div className="char-subpanel-title">PASSIVES</div>
                        <div className="char-skills-chips-list">
                          {crewMember.passives.map((psKey, i) => (
                            <div key={i} className="char-skill-chip passive">
                              <span className="skill-chip-dot">🛡</span>
                              <span>{String(psKey).replace(/_/g, ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="char-profile-skilltree-tab-content">
              <SkillTree crewMember={crewMember} onClose={onClose} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CharacterProfileModal;
