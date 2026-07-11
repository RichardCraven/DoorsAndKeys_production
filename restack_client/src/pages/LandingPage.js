import React, { useState, useEffect, useRef } from 'react'
import { Redirect } from "react-router-dom";
import { useHistory } from "react-router";
import { getMeta, storeMeta } from '../utils/session-handler';
import { loadAllDungeonsRequest } from '../utils/api-handler';

import { LANDING_REDUX_CSS } from '../styles/landing-redux-css';


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
  const [navToUserProfile, setNavUserProfile] = useState(false);
  const [navToCombatSimulator, setNavToCombatSimulator] = useState(false);
  const [navToCrew, setNavCrew] = useState(false);
  const [navToPortal, setNavMapmaker] = useState(false);

  const [navToUsermanager, setNavUsermanager] = useState(false);
  const [navToDungeon, setNavDungeon] = useState(false);
  const [navToSandbox, setNavToSandbox] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [validDungeons, setValidDungeons] = useState([])
  const [showDungeonPicker, setShowDungeonPicker] = useState(false)
  const [selectedDungeonTemplateId, setSelectedDungeonTemplateId] = useState(null)
  const [skipIntro, setSkipIntro] = useState(() => {
    try {
      const isAdminUser = sessionStorage.getItem('isAdmin') === 'true';
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
    // Instance names are created as: <base>_<username>_<last4UserId>
    // Keep dropdown focused on base templates only.
    return /_[^_]+_[a-z0-9]{4}$/i.test(raw);
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
      const isAdminUser = sessionStorage.getItem('isAdmin') === 'true';
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

  const handleLogout = () => {
    sessionStorage.clear();
    history.push('/login');
    window.location.reload();
  };

  const username = sessionStorage.getItem('userName') || sessionStorage.getItem('username') || 'Adventurer';

  return (
    <div className="redux-landing-container">
      {navToIntro && <Redirect to='/intro' />}
      {navToUserProfile && <Redirect to='/userProfilePage' />}
      {navToCrew && <Redirect to='/crewManager' />}
      {navToPortal && <Redirect to='/mapmaker' />}
      {navToDungeon && <Redirect to='/dungeon' />}
      {navToUsermanager && <Redirect to='/usermanager' />}
      {navToCombatSimulator && <Redirect to='/combatSimulator' />}
      {navToSandbox && <Redirect to='/sandbox' />}

      <header className="landing-header">
        <div className="header-logo">
          <span className="logo-title">Dream Tower</span>
          <span className="logo-subtitle">v 0.1.9 BETA</span>
        </div>
        <div className="header-user">
          <div className="user-info">
            Welcome <span>{username}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <main className="landing-main-grid">
        <div className="hero-column">
          <div className="hero-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div />

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
            <div className="dungeon-preview-space" style={{ flexGrow: 1 }} />

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
                    ⚔️ Enter Dungeon
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
              <span className="card-desc">Recruit and manage your heroes, view statistics, and assemble your party.</span>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}