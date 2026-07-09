import React, {useState, useEffect, useRef} from 'react'
import { Redirect } from "react-router-dom";
import { useHistory } from "react-router";
import {getMeta, storeMeta} from '../utils/session-handler';
import { loadAllDungeonsRequest } from '../utils/api-handler';

export default function LandingPage(props) {
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
    try { return !!(getMeta() || {}).skipIntro; } catch(e) { return false; }
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

  useEffect(()=> {
    let mounted = true;
    history.push({
      pathname: '/landing'
    })
    if(mounted){
      if(JSON.parse(sessionStorage.getItem('isAdmin'))){
        setIsAdmin(true)
      }
    }
    return () => {
      mounted = false;
    }
  },[history])

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
    if(!meta || !meta.crew || meta.crew.length === 0){
      setShowWarning(true)
    }
  }

  const toggleSkipIntro = (checked) => {
    setSkipIntro(checked);
    try {
      const meta = getMeta() || {};
      meta.skipIntro = checked;
      storeMeta(meta);
    } catch(e) {}
  }

  const enterClicked = () => {
    const meta = getMeta();
    if(!meta || !meta.crew || meta.crew.length === 0){
      setShowWarning(true)
      return
    }
    if(meta.dungeonId){
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

  return (
       <div className="landing-pane pane">
          { navToIntro && <Redirect to='/intro'/>}
          { navToUserProfile && <Redirect to='/userProfilePage'/> }
          { navToCrew && <Redirect to='/crewManager'/> }
          { navToPortal && <Redirect to='/mapmaker'/> }
          { navToDungeon && <Redirect to='/dungeon'/> }
          { navToUsermanager && <Redirect to='/usermanager'/> }
          { navToCombatSimulator && <Redirect to='/combatSimulator'/> }
          { navToSandbox && <Redirect to='/sandbox'/> }
          <div className="landing-buttons-container">
            {/* Skip intro checkbox - positioned absolutely to float 20px above the container, left-aligned */}
            <label style={{
              position: 'absolute',
              bottom: 'calc(100% + 20px)',
              left: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#333333',
              fontSize: '14px',
              cursor: 'pointer',
              userSelect: 'none',
              letterSpacing: '0.5px',
              fontWeight: '500'
            }}>
              <input
                type="checkbox"
                checked={skipIntro}
                onChange={(e) => toggleSkipIntro(e.target.checked)}
                style={{ accentColor: '#d4a844', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Skip intro</span>
            </label>
            {showWarning && <span className="warning" style={{pointerEvents: 'none'}}>Cannot enter dungeon without a crew</span>}
            <div
              className={`landing-button enter-dungeon ${showWarning ? 'disabled' : ''}`}
              onMouseEnter={() => checkForCrew()}
              onMouseLeave={() => setShowWarning(false)}
              ref={dungeonPickerRef}
            >
              <div className="enter-main" onClick={() => enterClicked()}>Enter</div>
              <button
                className={`enter-dungeon-picker-toggle ${selectedDungeonTemplateId ? 'selected' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!showDungeonPicker) {
                    refreshValidDungeons();
                  }
                  setShowDungeonPicker((s) => !s);
                }}
                title="Choose specific dungeon"
              >
                ▾
              </button>
              {showDungeonPicker && (
                <div className="enter-dungeon-picker-menu" onClick={(e) => e.stopPropagation()}>
                  <div className={`picker-item ${!selectedDungeonTemplateId ? 'active' : ''}`} onClick={() => selectDungeonTemplate(null)}>
                    Random Valid Dungeon
                  </div>
                  {validDungeons.map((d) => (
                    <div
                      key={d.id}
                      className={`picker-item ${selectedDungeonTemplateId === d.id ? 'active' : ''}`}
                      onClick={() => selectDungeonTemplate(d)}
                    >
                      {d.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="landing-button shop"  onClick={() => setNavCrew(true)} >Crew</div>
            <div className="landing-button user-data" onClick={() => setNavUserProfile(true)}>Profile</div>
            { isAdmin && <div className="landing-button map-maker" onClick={() => setNavMapmaker(true)}>Dungeon Builder</div>}
            { isAdmin && <div className="landing-button user-manager" onClick={() => setNavUsermanager(true)}>User Manager</div>}
            { isAdmin && <div className="landing-button combat-simulator" onClick={() => setNavToCombatSimulator(true)}>Combat Simulator</div>}
            { isAdmin && <div className="landing-button landing-button-last sandbox" onClick={() => setNavToSandbox(true)}>Sandbox</div>}
          </div>
       </div>
  )
}