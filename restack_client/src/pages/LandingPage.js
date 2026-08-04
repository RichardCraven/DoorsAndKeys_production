import React, { useState, useEffect, useRef } from 'react'
import { Redirect } from "react-router-dom";
import { useHistory } from "react-router";
import { getMeta, storeMeta } from '../utils/session-handler';
import { loadAllDungeonsRequest, deleteDungeonRequest } from '../utils/api-handler';

import skillsMatrix from '../utils/skills-matrix';
import { LANDING_REDUX_CSS } from '../styles/landing-redux-css';

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

const DEFAULT_CLASS_SKILLS = {
  summoner: ['summon_skeleton', 'summon_imp', 'summoner_duplicate', 'magic_affinity'],
  monk: ['monk_palm_strike', 'ethereal_speed', 'monk_meditation', 'inner_peace'],
  soldier: ['shield_bash', 'taunt', 'heavy_strike', 'shield_mastery'],
  barbarian: ['sword_swing', 'barbarian_cleave', 'barbarian_berserker', 'fury'],
  engineer: ['sword_swing', 'axe_throw', 'force_back', 'inspiring_force'],
  wizard: ['fireball', 'ice_bolt', 'arcane_shield', 'mana_overflow'],
  ranger: ['loose', 'notch', 'mark', 'nimble_dodge', 'eagle_eye'],
  sage: ['heal', 'circle_of_protection', 'owls_insight', 'herbalism']
};

const DEFAULT_CLASS_STATS = {
  summoner: { str: 3, int: 8, dex: 5, fort: 6, baseHp: 10 },
  monk: { str: 6, int: 6, dex: 8, fort: 6, baseHp: 12 },
  soldier: { str: 7, int: 4, dex: 5, fort: 8, baseHp: 16 },
  barbarian: { str: 8, int: 3, dex: 4, fort: 6, baseHp: 52 },
  engineer: { str: 5, int: 6, dex: 7, fort: 6, baseHp: 10 },
  wizard: { str: 3, int: 9, dex: 5, fort: 4, baseHp: 10 },
  ranger: { str: 5, int: 5, dex: 6, fort: 3, baseHp: 10 },
  sage: { str: 3, int: 7, dex: 5, fort: 7, baseHp: 10 }
};

export default function LandingPage(props) {
  useEffect(() => {
    const styleId = 'landing-redux-injected-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = LANDING_REDUX_CSS;
      document.head.appendChild(styleEl);
    }
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if iOS and not standalone
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      const dismissed = localStorage.getItem('ios-pwa-prompt-dismissed');
      if (!dismissed) {
        setShowIOSPrompt(true);
      }
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const [navToUserProfile, setNavUserProfile] = useState(false);
  const [navToCombatSimulator, setNavToCombatSimulator] = useState(false);
  const [navToCrew, setNavCrew] = useState(false);
  const [navToPortal, setNavMapmaker] = useState(false);

  const [navToUsermanager, setNavUsermanager] = useState(false);
  const [navToDungeon, setNavDungeon] = useState(false);
  const [navToSandbox, setNavToSandbox] = useState(false);
  const [navToTutorials, setNavToTutorials] = useState(false);

  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [instancesList, setInstancesList] = useState([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [deletingInstanceId, setDeletingInstanceId] = useState(null);
  const [instanceFeedbackMsg, setInstanceFeedbackMsg] = useState(null);
  const [showcaseUnit, setShowcaseUnit] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  const [, setForceUpdateToggle] = useState(0);

  const fetchInstances = async () => {
    setIsLoadingInstances(true);
    try {
      const res = await loadAllDungeonsRequest();
      const all = (res?.data || []).map((row) => {
        if (!row || !row.content) return null;
        try {
          const d = JSON.parse(row.content);
          d.id = row._id;
          return d;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      const instances = all.filter((d) => isInstanceDungeonName(d.name) || (d.name && d.name.includes('_')));
      setInstancesList(instances);
    } catch (e) {
      console.error('Failed to fetch instances:', e);
    } finally {
      setIsLoadingInstances(false);
    }
  };

  const openInstanceManager = () => {
    setShowInstanceManager(true);
    setInstanceFeedbackMsg(null);
    fetchInstances();
  };

  const handleDeleteInstance = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete dungeon instance "${name}"?`)) {
      return;
    }
    setDeletingInstanceId(id);
    try {
      await deleteDungeonRequest(id);
      const meta = getMeta() || {};
      if (meta.dungeonId === id) {
        delete meta.dungeonId;
        storeMeta(meta);
      }
      setInstanceFeedbackMsg(`Deleted instance "${name}".`);
      await fetchInstances();
      await refreshValidDungeons();
    } catch (e) {
      console.error('Failed to delete instance:', e);
      setInstanceFeedbackMsg(`Failed to delete instance "${name}".`);
    } finally {
      setDeletingInstanceId(null);
    }
  };

  const [isAdmin, setIsAdmin] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [validDungeons, setValidDungeons] = useState([])
  const [showDungeonPicker, setShowDungeonPicker] = useState(false)
  const [selectedDungeonTemplateId, setSelectedDungeonTemplateId] = useState(null)
  const [skipIntro, setSkipIntro] = useState(() => {
    try {
      const isAdminUser = localStorage.getItem('isAdmin') === 'true';
      if (!isAdminUser) return false;
      return !!(getMeta() || {}).skipIntro;
    } catch (e) {
      return false;
    }
  })

  const [navToIntro, setNavToIntro] = useState(false)

  const history = useHistory();
  const dungeonPickerRef = useRef(null);

  const isInstanceDungeonName = (name) => {
    const raw = `${name || ''}`;
    // Matches new format like BigDungeon_3467 or old format like BigDungeon_richardcraven_3467
    return /_\d+$/i.test(raw) || /_[^_]+_[a-z0-9]{4}$/i.test(raw);
  };

  const findSpawnPointDiagnostic = (dungeon) => {
    const levels = Array.isArray(dungeon?.levels) ? dungeon.levels : [];
    for (const level of levels) {
      const levelId = level?.id;
      const planes = [level?.front, level?.back];
      const planeLabels = ['front', 'back'];
      for (let p = 0; p < planes.length; p++) {
        const plane = planes[p];
        const planeLabel = planeLabels[p];
        const miniboards = Array.isArray(plane?.miniboards) ? plane.miniboards : [];
        for (let mb = 0; mb < miniboards.length; mb++) {
          const miniboard = miniboards[mb];
          const tiles = Array.isArray(miniboard?.tiles) ? miniboard.tiles : [];
          for (let ti = 0; ti < tiles.length; ti++) {
            const tile = tiles[ti];
            if (tile?.image === 'spawn_point') {
              return {
                found: true,
                levelId,
                plane: planeLabel,
                miniboardIndex: mb,
                tileIndex: ti,
                via: 'tile.image'
              };
            }
            const containsType = typeof tile?.contains === 'object' ? tile?.contains?.type : tile?.contains;
            if (containsType === 'spawn_point') {
              return {
                found: true,
                levelId,
                plane: planeLabel,
                miniboardIndex: mb,
                tileIndex: ti,
                via: 'tile.contains.type'
              };
            }
          }
        }
      }
    }
    return { found: false };
  };

  const refreshValidDungeons = async () => {
    const res = await loadAllDungeonsRequest();
    const all = (res?.data || []).map((row) => {
      if (!row || !row.content) return null;
      try {
        const dungeon = JSON.parse(row.content);
        dungeon.id = row._id;
        return dungeon;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    console.groupCollapsed("[LandingPage] Dungeon Dropdown Diagnostics");
    console.log(`Loaded ${all.length} total dungeons from API.`);

    const diagnostics = all.map((d) => {
      const spawnDiag = findSpawnPointDiagnostic(d);
      const isValidProp = d.valid === true;
      const hasSpawn = spawnDiag.found;
      const isInstance = isInstanceDungeonName(d.name);
      const passesAll = isValidProp && hasSpawn && !isInstance;

      let reason = "PASSED";
      if (!isValidProp) reason = "valid property is not true";
      else if (!hasSpawn) reason = "no spawn point found";
      else if (isInstance) reason = "is an instance dungeon (filtered out of templates)";

      return {
        name: d.name,
        id: d.id,
        validProp: d.valid,
        spawnPointFound: hasSpawn,
        spawnPointDetails: spawnDiag,
        isInstanceDungeon: isInstance,
        verdict: reason
      };
    });

    console.table(diagnostics);
    console.groupEnd();

    const validOnly = all.filter((d) => {
      const spawnDiag = findSpawnPointDiagnostic(d);
      return d.valid === true && spawnDiag.found;
    });
    const baseValidOnly = validOnly.filter((d) => !isInstanceDungeonName(d.name));
    setValidDungeons(baseValidOnly);

    const meta = getMeta() || {};
    const selectedId = meta.selectedDungeonTemplateId || null;
    const selected = selectedId ? baseValidOnly.find((d) => d.id === selectedId) : null;
    if (selected) {
      setSelectedDungeonTemplateId(selected.id);
    } else if (selectedId) {
      setSelectedDungeonTemplateId(null);
      delete meta.selectedDungeonTemplateId;
      delete meta.selectedDungeonTemplateName;
      storeMeta(meta);
    }
  };

  useEffect(() => {
    let mounted = true;
    history.push({
      pathname: '/landing'
    })
    if (mounted) {
      const isAdminUser = localStorage.getItem('isAdmin') === 'true';
      if (isAdminUser) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        setSkipIntro(false)
      }
    }
    return () => {
      mounted = false;
    }
  }, [history])

  useEffect(() => {
    refreshValidDungeons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!showDungeonPicker) return;
      if (dungeonPickerRef.current && !dungeonPickerRef.current.contains(event.target)) {
        setShowDungeonPicker(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showDungeonPicker]);

  const checkForCrew = () => {
    const meta = getMeta();
    if (!meta || !meta.crew || meta.crew.length === 0) {
      setShowWarning(true)
    }
  }

  const toggleSkipIntro = (checked) => {
    setSkipIntro(checked);
    try {
      const meta = getMeta() || {};
      meta.skipIntro = checked;
      storeMeta(meta);
    } catch (e) { }
  }

  const enterClicked = () => {
    const meta = getMeta();
    if (!meta || !meta.crew || meta.crew.length === 0) {
      setShowWarning(true)
      return
    }
    if (meta.dungeonId) {
      setNavDungeon(true)
      return
    }
    const nextMeta = meta || {};
    if (selectedDungeonTemplateId) {
      const selectedDungeon = validDungeons.find((d) => d.id === selectedDungeonTemplateId);
      nextMeta.selectedDungeonTemplateId = selectedDungeonTemplateId;
      nextMeta.selectedDungeonTemplateName = selectedDungeon ? selectedDungeon.name : undefined;
    } else {
      delete nextMeta.selectedDungeonTemplateId;
      delete nextMeta.selectedDungeonTemplateName;
    }
    storeMeta(nextMeta);

    if (skipIntro) {
      setNavDungeon(true);
    } else {
      props.setNarrativeSequence('intro');
      setNavToIntro(true);
    }
  }

  const selectDungeonTemplate = (dungeon) => {
    const meta = getMeta() || {};
    if (!dungeon) {
      setSelectedDungeonTemplateId(null);
      delete meta.selectedDungeonTemplateId;
      delete meta.selectedDungeonTemplateName;
      storeMeta(meta);
      setShowDungeonPicker(false);
      return;
    }

    setSelectedDungeonTemplateId(dungeon.id);
    meta.selectedDungeonTemplateId = dungeon.id;
    meta.selectedDungeonTemplateName = dungeon.name;
    storeMeta(meta);
    setShowDungeonPicker(false);
  }

  const triggerInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    history.push('/login');
    window.location.reload();
  };

  const username = localStorage.getItem('userName') || localStorage.getItem('username') || 'Adventurer';

  return (
    <div className="redux-landing-container">
      {deferredPrompt && (
        <div className="pwa-install-banner">
          <div className="pwa-banner-content">
            <span className="pwa-icon" role="img" aria-label="phone">📱</span>
            <div className="pwa-text-group">
              <div className="pwa-title">Play in Full Screen</div>
              <div className="pwa-desc">Install DreamTower to your home screen for the full borderless experience.</div>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button className="pwa-btn pwa-btn-install" onClick={triggerInstall}>Install</button>
            <button className="pwa-btn pwa-btn-close" onClick={() => setDeferredPrompt(null)}>✕</button>
          </div>
        </div>
      )}

      {showIOSPrompt && (
        <div className="pwa-install-banner">
          <div className="pwa-banner-content">
            <span className="pwa-icon" role="img" aria-label="apple">🍎</span>
            <div className="pwa-text-group">
              <div className="pwa-title">Install on iPhone / iPad</div>
              <div className="pwa-desc">Tap the <strong style={{ color: '#e5b54f' }}>Share button</strong> (square with up arrow) in Safari, then select <strong style={{ color: '#e5b54f' }}>"Add to Home Screen"</strong>.</div>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button className="pwa-btn pwa-btn-close" onClick={() => {
              setShowIOSPrompt(false);
              localStorage.setItem('ios-pwa-prompt-dismissed', 'true');
            }}>Got it</button>
          </div>
        </div>
      )}

      {navToIntro && <Redirect to='/intro' />}
      {navToUserProfile && <Redirect to='/userProfilePage' />}
      {navToCrew && <Redirect to='/crewManager' />}
      {navToPortal && <Redirect to='/mapmaker' />}
      {navToDungeon && <Redirect to='/dungeon' />}
      {navToUsermanager && <Redirect to='/usermanager' />}
      {navToCombatSimulator && <Redirect to='/combatSimulator' />}
      {navToSandbox && <Redirect to='/sandbox' />}
      {navToTutorials && <Redirect to='/tutorials' />}

      <header className="landing-header">
        <div className="header-logo">
          <span className="logo-title">Dream Tower</span>
          <span className="logo-subtitle">v 0.3.5 BETA</span>
        </div>
        <div className="header-user">
          <div className="user-info">
            Welcome <span>{username}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="landing-main-grid">
        <div className="hero-column">
          <div className="hero-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Select Dungeon Dropdown */}
              <div className="dungeon-selector-group" ref={dungeonPickerRef}>
                <span className="selector-label">Target Dungeon</span>
                <div
                  className={`custom-select-trigger ${selectedDungeonTemplateId ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!showDungeonPicker) {
                      refreshValidDungeons();
                    }
                    setShowDungeonPicker((s) => !s);
                  }}
                >
                  <span>{getMeta()?.selectedDungeonTemplateName || 'Select a Dungeon...'}</span>
                  <span>▼</span>
                </div>

                {showDungeonPicker && (
                  <div className="custom-select-menu">
                    {validDungeons.map((d) => (
                      <div
                        key={d.id}
                        className={`menu-item ${selectedDungeonTemplateId === d.id ? 'active' : ''}`}
                        onClick={() => selectDungeonTemplate(d)}
                      >
                        🏰 {d.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skip Intro - Render only if admin */}
              {isAdmin && (
                <label className="skip-intro-label">
                  <input
                    type="checkbox"
                    checked={skipIntro}
                    onChange={(e) => toggleSkipIntro(e.target.checked)}
                  />
                  <span>Skip cinematic introduction</span>
                </label>
              )}
            </div>

            {/* Leave space for future dungeon graphic/previews */}
            <div className="dungeon-preview-space">
              {(() => {
                const crew = getMeta()?.crew || [];
                if (crew.length === 0) {
                  return (
                    <div className="no-crew-warning">
                      No crew recruited. Visit the Crew Manager to recruit party members.
                    </div>
                  );
                }
                return (
                  <div className="selected-crew-preview-card">
                    <span className="selected-crew-title">Selected Crew</span>
                    <div className="selected-crew-list">
                      {crew.map((member, i) => (
                        <div
                          key={i}
                          className="selected-crew-member-item"
                          onClick={() => {
                            setShowcaseUnit(member);
                            setIsEditingName(false);
                            setEditNameVal(member.name || '');
                          }}
                          style={{ cursor: 'pointer' }}
                          title={`Click to view profile & stats for ${member.name}`}
                        >
                          <div className={`selected-crew-avatar-wrapper type-${String(member.type || member.image || '').toLowerCase()}`}>
                            <img src={member.portrait || member.image} alt={member.name} className="crew-avatar-img" />
                            <span className="selected-crew-badge">
                              Lvl {member.level || 1}
                            </span>
                          </div>
                          <span className="selected-crew-name" title={member.name}>
                            {member.name}
                          </span>
                          <span className="selected-crew-type">
                            {member.type || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {showWarning && (
                <div className="warning-box" style={{ margin: '0 0 10px 0' }}>
                  ⚠️ Cannot enter dungeon without a crew. Recruit members first!
                </div>
              )}

              {/* Play Button */}
              {(() => {
                const hasActiveDungeon = !!(getMeta()?.dungeonId);
                const noDungeonSelected = !selectedDungeonTemplateId && !hasActiveDungeon;
                const isDisabled = showWarning || noDungeonSelected;
                return (
                  <button
                    className={`btn-play ${isDisabled ? 'disabled' : ''}`}
                    onMouseEnter={checkForCrew}
                    onMouseLeave={() => setShowWarning(false)}
                    onClick={isDisabled ? undefined : enterClicked}
                    disabled={isDisabled}
                    type="button"
                  >
                    Enter Dungeon
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="menu-column">
          {/* Crew Card */}
          <div className="menu-card" onClick={() => setNavCrew(true)}>
            <div className="card-top">
              <span className="card-title">Crew Manager</span>
              <span className="card-desc">Recruit and manage your heroes, view statistics, and assemble your crew.</span>
            </div>
            <span className="card-arrow">Manage →</span>
          </div>

          {/* Profile Card */}
          <div className="menu-card" onClick={() => setNavUserProfile(true)}>
            <div className="card-top">
              <span className="card-title">Profile</span>
              <span className="card-desc">Review your accomplishments, collection progress, and player credentials.</span>
            </div>
            <span className="card-arrow">View →</span>
          </div>

          {/* Combat Simulator Card */}
          <div className="menu-card" onClick={() => setNavToCombatSimulator(true)}>
            <div className="card-top">
              <span className="card-title">Combat Simulator</span>
              <span className="card-desc">Simulate battle scenarios, adjust speed constants, and balance combatant parameters.</span>
            </div>
            <span className="card-arrow">Simulate →</span>
          </div>

          {/* Tutorials Card */}
          <div className="menu-card" onClick={() => setNavToTutorials(true)}>
            <div className="card-top">
              <span className="card-title">Tutorials</span>
              <span className="card-desc">Master the mechanics of exploration, combat, card dueling, and unlock new secrets.</span>
            </div>
            <span className="card-arrow">Learn →</span>
          </div>

          {/* Admin Cards */}
          {isAdmin && (
            <>
              <div className="menu-card" onClick={() => setNavMapmaker(true)}>
                <div className="card-top">
                  <span className="card-title">Dungeon Builder</span>
                  <span className="card-desc">Construct new maps, design boards, design custom planes, and orchestrate campaigns.</span>
                </div>
                <span className="card-arrow">Build →</span>
              </div>

              <div className="menu-card" onClick={() => setNavUsermanager(true)}>
                <div className="card-top">
                  <span className="card-title">User Manager</span>
                  <span className="card-desc">Administer player accounts, permissions, and session records.</span>
                </div>
                <span className="card-arrow">Administer →</span>
              </div>

              <div className="menu-card" onClick={() => setNavToSandbox(true)}>
                <div className="card-top">
                  <span className="card-title">Sandbox</span>
                  <span className="card-desc">Test prototype mechanics and procedural features.</span>
                </div>
                <span className="card-arrow">Test →</span>
              </div>

              <div className="menu-card" onClick={openInstanceManager}>
                <div className="card-top">
                  <span className="card-title">Instance Manager</span>
                  <span className="card-desc">Review active dungeon instances and manage obsolete session records.</span>
                </div>
                <span className="card-arrow">Manage →</span>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Instance Manager Modal */}
      {showInstanceManager && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setShowInstanceManager(false)}>
          <div style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            backgroundColor: '#161311',
            border: '2px solid rgba(212, 168, 68, 0.4)',
            borderRadius: '8px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(212, 168, 68, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#f5f5f7'
          }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(212, 168, 68, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(12, 10, 9, 0.6)'
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
                  color: '#e5b54f',
                  fontSize: '1.4rem',
                  letterSpacing: '1px'
                }}>
                  Instance Manager
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#a8a29e' }}>
                  Manage active dungeon instances ({instancesList.length} total)
                </span>
              </div>
              <button
                onClick={() => setShowInstanceManager(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a8a29e',
                  fontSize: '1.6rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1
                }}
                onMouseEnter={e => e.target.style.color = '#e5b54f'}
                onMouseLeave={e => e.target.style.color = '#a8a29e'}
              >
                ×
              </button>
            </div>

            {/* Modal Body / Instance List */}
            <div style={{
              padding: '20px 24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {instanceFeedbackMsg && (
                <div style={{
                  background: 'rgba(46, 204, 113, 0.15)',
                  border: '1px solid rgba(46, 204, 113, 0.4)',
                  color: '#2ecc71',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  {instanceFeedbackMsg}
                </div>
              )}

              {isLoadingInstances ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#a8a29e' }}>
                  Loading dungeon instances...
                </div>
              ) : instancesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#78716c', fontStyle: 'italic' }}>
                  No dungeon instances found.
                </div>
              ) : (
                instancesList.map((inst) => {
                  const isCurrentActive = getMeta()?.dungeonId === inst.id;
                  return (
                    <div
                      key={inst.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(12, 10, 9, 0.6)',
                        border: isCurrentActive ? '1px solid #e5b54f' : '1px solid rgba(120, 113, 108, 0.25)',
                        borderRadius: '6px',
                        padding: '14px 18px',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontWeight: 'bold',
                            fontSize: '0.95rem',
                            color: '#ffffff',
                            fontFamily: "'Outfit', sans-serif"
                          }}>
                            🏰 {inst.name}
                          </span>
                          {isCurrentActive && (
                            <span style={{
                              background: 'rgba(229, 181, 79, 0.2)',
                              border: '1px solid rgba(229, 181, 79, 0.4)',
                              color: '#e5b54f',
                              fontSize: '0.65rem',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase'
                            }}>
                              Active Session
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#78716c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ID: {inst.id} {inst.lastRelockIso ? `• Relocked: ${new Date(inst.lastRelockIso).toLocaleString()}` : ''}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteInstance(inst.id, inst.name)}
                        disabled={deletingInstanceId === inst.id}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#ef4444',
                          padding: '8px 14px',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          cursor: deletingInstanceId === inst.id ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => {
                          if (deletingInstanceId !== inst.id) {
                            e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                            e.target.style.borderColor = '#ef4444';
                          }
                        }}
                        onMouseLeave={e => {
                          if (deletingInstanceId !== inst.id) {
                            e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                            e.target.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                          }
                        }}
                      >
                        {deletingInstanceId === inst.id ? 'Deleting...' : 'Delete 🗑️'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid rgba(212, 168, 68, 0.15)',
              background: 'rgba(12, 10, 9, 0.4)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowInstanceManager(false)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: 'rgba(120, 113, 108, 0.2)',
                  border: '1px solid rgba(120, 113, 108, 0.3)',
                  color: '#a8a29e',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Crew Unit Showcase Overlay */}
      {showcaseUnit && (() => {
        const uType = String(showcaseUnit.type || showcaseUnit.image || '').toLowerCase();
        const defaultStats = DEFAULT_CLASS_STATS[uType] || { str: 5, int: 5, dex: 5, fort: 5, baseHp: 10 };
        const stats = {
          str: showcaseUnit.stats?.str ?? defaultStats.str,
          int: showcaseUnit.stats?.int ?? defaultStats.int,
          dex: showcaseUnit.stats?.dex ?? defaultStats.dex,
          fort: showcaseUnit.stats?.fort ?? defaultStats.fort,
          baseHp: showcaseUnit.stats?.baseHp ?? defaultStats.baseHp
        };

        const description = showcaseUnit.description || DEFAULT_CLASS_LORE[uType] || 'A heroic adventurer equipped for dungeon exploration.';
        const rawSkills = Array.isArray(showcaseUnit.skills) && showcaseUnit.skills.length > 0 ? showcaseUnit.skills : (DEFAULT_CLASS_SKILLS[uType] || []);
        const rawPassives = Array.isArray(showcaseUnit.passives) ? showcaseUnit.passives : [];
        const allSkillKeys = Array.from(new Set([...rawSkills, ...rawPassives]));

        const renderStatBar = (label, value, maxVal, color) => {
          const pct = Math.min(100, Math.max(8, (value / maxVal) * 100));
          return (
            <div key={label} className="crew-showcase-stat-item">
              <div className="stat-label-row">
                <span>{label}</span>
                <span className="stat-value">{value}</span>
              </div>
              <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        };

        return (
          <div className="crew-showcase-overlay" onClick={() => setShowcaseUnit(null)}>
            <div className="crew-showcase-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="crew-showcase-close-btn"
                onClick={() => setShowcaseUnit(null)}
                title="Close Profile"
              >
                ✕
              </button>

              {/* Header */}
              <div className={`crew-showcase-header theme-${uType}`}>
                <div className="crew-showcase-portrait-container">
                  <div className={`crew-showcase-portrait theme-${uType}`}>
                    <img src={showcaseUnit.portrait || showcaseUnit.image} alt={showcaseUnit.name} className="crew-avatar-img" />
                    <span className="crew-showcase-level-badge">Lvl {showcaseUnit.level || 1}</span>
                  </div>
                </div>
                <div className="crew-showcase-identity">
                  {isEditingName ? (
                    <div className="crew-showcase-rename-form" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <input
                        type="text"
                        value={editNameVal}
                        onChange={(e) => setEditNameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const trimmed = editNameVal.trim();
                            if (trimmed && showcaseUnit) {
                              const oldName = showcaseUnit.name;
                              showcaseUnit.name = trimmed;
                              setIsEditingName(false);
                              const meta = getMeta() || {};
                              if (Array.isArray(meta.crew)) {
                                const memberInMeta = meta.crew.find(c =>
                                  (c.id && showcaseUnit.id && c.id === showcaseUnit.id) ||
                                  c.name === oldName ||
                                  (c.type || c.image) === (showcaseUnit.type || showcaseUnit.image)
                                );
                                if (memberInMeta) {
                                  memberInMeta.name = trimmed;
                                }
                                storeMeta(meta);
                              }
                              setForceUpdateToggle(prev => prev + 1);
                            }
                          }
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        autoFocus
                        style={{
                          background: 'rgba(12, 10, 9, 0.9)',
                          border: '1px solid rgba(212, 168, 68, 0.7)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '6px 12px',
                          fontSize: '1.2rem',
                          fontWeight: '700',
                          fontFamily: 'Cinzel, serif',
                          outline: 'none',
                          width: '200px'
                        }}
                      />
                      <button
                        onClick={() => {
                          const trimmed = editNameVal.trim();
                          if (trimmed && showcaseUnit) {
                            const oldName = showcaseUnit.name;
                            showcaseUnit.name = trimmed;
                            setIsEditingName(false);
                            const meta = getMeta() || {};
                            if (Array.isArray(meta.crew)) {
                              const memberInMeta = meta.crew.find(c =>
                                (c.id && showcaseUnit.id && c.id === showcaseUnit.id) ||
                                c.name === oldName ||
                                (c.type || c.image) === (showcaseUnit.type || showcaseUnit.image)
                              );
                              if (memberInMeta) {
                                memberInMeta.name = trimmed;
                              }
                              storeMeta(meta);
                            }
                            setForceUpdateToggle(prev => prev + 1);
                          }
                        }}
                        title="Save Name"
                        style={{
                          background: 'linear-gradient(135deg, #ffd700, #c9932b)',
                          border: 'none',
                          color: '#000000',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        title="Cancel"
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#aaaaaa',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 className="crew-showcase-name">{showcaseUnit.name}</h2>
                      <button
                        onClick={() => {
                          setEditNameVal(showcaseUnit.name || '');
                          setIsEditingName(true);
                        }}
                        title="Rename Unit"
                        style={{
                          background: 'rgba(212, 168, 68, 0.15)',
                          border: '1px solid rgba(212, 168, 68, 0.4)',
                          color: '#ffd700',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(212, 168, 68, 0.3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(212, 168, 68, 0.15)'}
                      >
                        ✏️ Rename
                      </button>
                    </div>
                  )}
                  <div className="crew-showcase-type-tag">
                    {showcaseUnit.type || showcaseUnit.class || 'HERO'}
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="crew-showcase-body">
                {/* Background Info Panel */}
                <div className="crew-showcase-panel lore-panel">
                  <h3 className="crew-showcase-panel-title">
                    <span className="panel-icon">📜</span> Background & Lore
                  </h3>
                  <p className="crew-showcase-lore-text">{description}</p>
                </div>

                {/* Stats Panel */}
                <div className="crew-showcase-panel stats-panel">
                  <h3 className="crew-showcase-panel-title">
                    <span className="panel-icon">⚔️</span> Attributes & Stats
                  </h3>
                  <div className="crew-showcase-stats-grid">
                    {renderStatBar('Strength (STR)', stats.str, 10, '#e63946')}
                    {renderStatBar('Intelligence (INT)', stats.int, 10, '#457b9d')}
                    {renderStatBar('Dexterity (DEX)', stats.dex, 10, '#2a9d8f')}
                    {renderStatBar('Fortitude (FORT)', stats.fort, 10, '#f4a261')}
                    {renderStatBar('Base Health (HP)', stats.baseHp, 60, '#e76f51')}
                  </div>
                </div>

                {/* Skills & Passives Panel */}
                <div className="crew-showcase-panel skills-panel">
                  <h3 className="crew-showcase-panel-title">
                    <span className="panel-icon">✨</span> Active Skills & Passives
                  </h3>
                  <div className="crew-showcase-skills-list">
                    {allSkillKeys.length === 0 ? (
                      <p style={{ color: '#a1a1a6', margin: 0, fontSize: '0.85rem' }}>
                        No specific skills recorded for this unit.
                      </p>
                    ) : (
                      allSkillKeys.map((skKey, idx) => {
                        const skDef = skillsMatrix[skKey] || {
                          id: skKey,
                          name: String(skKey).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                          desc: 'Special combat ability or passive perk.',
                          isPassive: skKey.includes('passive') || rawPassives.includes(skKey)
                        };
                        return (
                          <div key={idx} className="crew-showcase-skill-card">
                            {skDef.icon ? (
                              <img src={skDef.icon} alt={skDef.name} className="skill-card-icon" />
                            ) : (
                              <div className="skill-card-icon-placeholder">✨</div>
                            )}
                            <div className="skill-card-info">
                              <div className="skill-card-header">
                                <span className="skill-card-name">{skDef.name || skKey}</span>
                                <span className={`skill-card-tag ${skDef.isPassive ? 'passive' : 'active'}`}>
                                  {skDef.isPassive ? 'PASSIVE' : 'ACTIVE'}
                                </span>
                              </div>
                              <p className="skill-card-desc">
                                {skDef.desc || skDef.description || 'Special class ability.'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}