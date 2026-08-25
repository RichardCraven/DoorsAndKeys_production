import React, { useState, useEffect, useRef } from 'react'
import { Redirect } from "react-router-dom";
import { useHistory } from "react-router";
import { getMeta, storeMeta, getUserId } from '../utils/session-handler';
import { loadAllDungeonsRequest, deleteDungeonRequest, getAllUsersRequest, updateUserRequest, getActivePresenceRequest } from '../utils/api-handler';


import skillsMatrix from '../utils/skills-matrix';
import * as images from '../utils/images';
import { getCrewPortraitBackground } from '../utils/images';
import { LANDING_REDUX_CSS } from '../styles/landing-redux-css';
import InfirmaryModal from '../components/InfirmaryModal';
import { getInfirmary } from '../utils/infirmary-manager';

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
  engineer: ['build_turret', 'build_walker', 'build_wall', 'engineer_repair', 'wrench_strike'],
  wizard: ['fireball', 'ice_bolt', 'arcane_shield', 'mana_overflow'],
  ranger: ['loose', 'notch', 'mark', 'nimble_dodge', 'eagle_eye'],
  sage: ['heal', 'circle_of_protection', 'owls_insight', 'herbalism', 'breadcrumbs']
};

const DEFAULT_CLASS_STATS = {
  summoner: { str: 3, int: 8, dex: 5, fort: 6, baseHp: 11 },
  monk: { str: 6, int: 6, dex: 8, fort: 6, baseHp: 12 },
  soldier: { str: 7, int: 4, dex: 5, fort: 8, baseHp: 16 },
  barbarian: { str: 8, int: 3, dex: 4, fort: 6, baseHp: 16 },
  engineer: { str: 5, int: 6, dex: 7, fort: 6, baseHp: 10 },
  wizard: { str: 3, int: 9, dex: 5, fort: 4, baseHp: 10 },
  ranger: { str: 5, int: 5, dex: 6, fort: 3, baseHp: 10 },
  sage: { str: 3, int: 7, dex: 5, fort: 7, baseHp: 10 }
};

const CLASS_SPECIALTIES = {
  sage: [
    {
      id: 'herbalist',
      name: 'Herbalist',
      description: 'A master of botanical remedies who accelerates natural recovery and improves the potency of all consumables prepared at camp.',
      bonuses: ['+20% Food Restoration', '+15% Potion Potency', 'Herb Forage Chance']
    },
    {
      id: 'battle_medic',
      name: 'Battle Medic',
      description: 'Trained to heal under fire, this specialist applies wards and mending arts with remarkable speed during combat encounters.',
      bonuses: ['+1 Heal Range', 'Instant Ward Cast', '-20% Healing Cooldown']
    },
    {
      id: 'arcane_scholar',
      name: 'Arcane Scholar',
      description: 'A studious keeper of esoteric knowledge whose insight amplifies spell resonance and reveals hidden dungeon lore.',
      bonuses: ['+2 INT Rating', 'Codex Bonus Reveals', '+10% Arcane Skill Power']
    },
    {
      id: 'ward_keeper',
      name: 'Ward Keeper',
      description: 'Specializes in protective circles and defensive barriers, extending the duration and coverage of all protective effects.',
      bonuses: ['+40% Ward Duration', 'Shared Protection Aura', '-1 Ward AP Cost']
    }
  ],
  soldier: [
    {
      id: 'iron_vanguard',
      name: 'Iron Vanguard',
      description: 'A frontline specialist who positions at the tip of every engagement, absorbing punishment and holding ground through attrition.',
      bonuses: ['+3 Armor Rating', '+25% Taunt Effectiveness', 'Immovable Stance Passive']
    },
    {
      id: 'shield_wall',
      name: 'Shield Wall',
      description: 'Trained to form defensive formations, this soldier extends their protection to adjacent allies and punishes flanking attempts.',
      bonuses: ['Adjacent Ally Block +15%', 'Counter-Flank Riposte', '+10% Fortitude']
    },
    {
      id: 'executioner',
      name: 'Executioner',
      description: 'Foregoes defensive training for brutal offensive power, delivering crushing finishing blows against weakened targets.',
      bonuses: ['+30% Damage vs Low HP', 'Execute Threshold: 15%', '+2 STR Rating']
    },
    {
      id: 'quartermaster',
      name: 'Quartermaster',
      description: 'A logistics specialist who stretches expedition resources and ensures the crew operates with maximum efficiency between engagements.',
      bonuses: ['+10% Resource Conservation', 'Supply Cache Passive', 'Reduced Ration Use']
    }
  ],
  monk: [
    {
      id: 'way_empty_fist',
      name: 'Way of the Empty Fist',
      description: 'Channels all energy into explosive unarmed strikes, magnifying the damage of every palm blow and counterattack sequence.',
      bonuses: ['+25% Strike Damage', 'Combo Multiplier +1', '+2 DEX Rating']
    },
    {
      id: 'way_iron_skin',
      name: 'Way of the Iron Skin',
      description: 'Hardens the body through rigorous conditioning, granting exceptional resistance to physical and elemental punishment.',
      bonuses: ['+3 Physical Resistance', '+15% Elemental Mitigation', 'Injury Recovery Bonus']
    },
    {
      id: 'way_wind',
      name: 'Way of the Wind',
      description: 'Prioritizes fluid movement and evasion, dramatically increasing mobility and making the monk difficult to pin down.',
      bonuses: ['+2 Movement Range', '+20% Dodge Rating', 'Repositioning Step Passive']
    },
    {
      id: 'way_mind',
      name: 'Way of the Mind',
      description: 'Turns the mind into a weapon, enabling psychic disruption of enemy concentration and enhanced perception of threats.',
      bonuses: ['+15% Meditation Restore', 'Disrupt Focus Ability', '+2 INT Rating']
    }
  ],
  barbarian: [
    {
      id: 'berserkers_blood',
      name: "Berserker's Blood",
      description: 'Enters a frenzied state as health drops, growing more dangerous and relentless the closer to death the barbarian becomes.',
      bonuses: ['Rage Scales with Damage', '+40% Low-HP Attack Speed', 'Pain Threshold Passive']
    },
    {
      id: 'runebound',
      name: 'Runebound',
      description: 'Ancient clan runes carved into flesh grant primal magic resistance and channel battle fury into runic strikes.',
      bonuses: ['+3 Magic Resistance', 'Rune Strike Ability', 'Ancestral Ward Passive']
    },
    {
      id: 'stone_tusk',
      name: 'Stone Tusk',
      description: 'Becomes an immovable anchor of the battlefield, trading speed for unbreakable endurance and devastating charge attacks.',
      bonuses: ['+4 FORT Rating', 'Unstoppable Charge', 'Knockback Immunity']
    },
    {
      id: 'war_howler',
      name: 'War Howler',
      description: 'A terrifying war cry specialist whose battle shouts weaken enemy resolve, lower their defenses, and inspire nearby allies.',
      bonuses: ['Demoralize Aura', 'Ally Morale Boost', '-15% Enemy Defense']
    }
  ],
  engineer: [
    {
      id: 'trap_master',
      name: 'Trap Master',
      description: 'Perfects the art of mechanical ambush, constructing traps with greater lethality, trigger sensitivity, and blast radius.',
      bonuses: ['+35% Trap Damage', 'Chain Trigger Passive', '+1 Trap Placement Range']
    },
    {
      id: 'battle_machinist',
      name: 'Battle Machinist',
      description: 'Specializes in rapid battlefield construction and turret deployment, keeping pressure on enemies through sustained mechanical fire.',
      bonuses: ['-20% Turret Deploy Time', '+2 Turret HP', 'Overcharge Shot Passive']
    },
    {
      id: 'demolitions_expert',
      name: 'Demolitions Expert',
      description: 'Masters explosive ordnance and area denial, creating controlled blasts that reshape the flow of combat.',
      bonuses: ['AOE Blast +25%', 'Explosive Chain Passive', 'Smoke Cover Ability']
    },
    {
      id: 'field_medic',
      name: 'Field Medic',
      description: 'Applies mechanical ingenuity to medicine, crafting automated recovery devices and emergency stabilization tools.',
      bonuses: ['Emergency Stabilize Ability', '+10% Camp Heal Bonus', 'Auto-Patch Passive']
    }
  ],
  wizard: [
    {
      id: 'elementalist',
      name: 'Elementalist',
      description: 'Commands raw elemental forces with amplified intensity, maximizing the destructive output of fire, frost, and lightning.',
      bonuses: ['+30% Elemental Spell Power', 'Dual Element Cast', '+2 INT Rating']
    },
    {
      id: 'arcanist',
      name: 'Arcanist',
      description: 'Channels raw arcane energy with refined precision, reducing spell costs and extending magical endurance across long encounters.',
      bonuses: ['-25% Mana Cost', '+20% Spell Duration', 'Arcane Reserve Passive']
    },
    {
      id: 'conjurer',
      name: 'Conjurer',
      description: 'Bridges the gap between disciplines, summoning arcane constructs and barriers that protect allies and contain enemies.',
      bonuses: ['Arcane Barrier Ability', '+15% Construct HP', 'Containment Field Passive']
    },
    {
      id: 'rift_walker',
      name: 'Rift Walker',
      description: 'Bends spatial reality to reposition allies, displace enemies, and open dimensional shortcuts across the battlefield.',
      bonuses: ['Dimensional Shift Ability', 'Enemy Displacement', '+2 DEX Rating']
    }
  ],
  ranger: [
    {
      id: 'pathfinder',
      name: 'Pathfinder',
      description: 'An unmatched scout who reads terrain instinctively, revealing hidden threats and identifying optimal routes through the dungeon.',
      bonuses: ['+1 Exploration Reveal Radius', 'Ambush Detection Passive', 'Trap Sight Passive']
    },
    {
      id: 'assassins_eye',
      name: "Assassin's Eye",
      description: 'Trains the eye for lethal precision, delivering devastating headshots and critical strikes against isolated targets.',
      bonuses: ['+25% Critical Strike Chance', 'Headshot Passive', '+2 DEX Rating']
    },
    {
      id: 'beast_bonder',
      name: 'Beast Bonder',
      description: 'Forms a primal bond with the wilds, gaining the ability to communicate with and command creatures encountered in the dungeon.',
      bonuses: ['Beast Ally Passive', '+10% Nature Resistance', 'Creature Affinity Bonus']
    },
    {
      id: 'trapper',
      name: 'Trapper',
      description: 'Lays intricate snares and pitfalls before battle begins, controlling enemy movement and weakening them before the first blow is struck.',
      bonuses: ['+2 Trap Placements', 'Ensnare Duration +50%', 'Pre-Combat Lay Passive']
    }
  ],
  summoner: [
    {
      id: 'bone_weaver',
      name: 'Bone Weaver',
      description: 'Raises undead constructs of unusual resilience, animating the fallen and binding them into a durable skeletal host.',
      bonuses: ['+30% Undead HP', 'Revive Fallen Minion', '+2 Max Skeleton Cap']
    },
    {
      id: 'rift_keeper',
      name: 'Rift Keeper',
      description: 'Stabilizes the arcane rifts used for summoning, reducing the cost of calling creatures and allowing multiple simultaneous summons.',
      bonuses: ['-20% Summon Cost', '+1 Active Summon Slot', 'Rift Stability Passive']
    },
    {
      id: 'spirit_binder',
      name: 'Spirit Binder',
      description: 'Binds ethereal entities to physical anchors, creating persistent spectral guardians that linger long beyond their initial summoning.',
      bonuses: ['Specter Persistence +60%', 'Ethereal Shield Ability', '+2 INT Rating']
    },
    {
      id: 'void_channeler',
      name: 'Void Channeler',
      description: 'Opens a conduit to the void itself, channeling raw entropic energy through minions and amplifying their destructive potential.',
      bonuses: ['+25% Minion Damage', 'Void Surge Passive', 'Entropy Aura Ability']
    }
  ]
};


export default function LandingPage(props) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showInfirmary, setShowInfirmary] = useState(false);

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

    // TEMP SCRIPT: Grant 'breadcrumbs' to any Sage in the party
    try {
      const meta = getMeta() || {};
      let changed = false;
      if (Array.isArray(meta.crew)) {
        meta.crew.forEach(member => {
          if (member && typeof member.class === 'string' && member.class.toLowerCase() === 'sage') {
            member.skills = member.skills || [];
            if (!member.skills.includes('breadcrumbs')) {
              member.skills.push('breadcrumbs');
              changed = true;
            }
          }
        });
      }
      if (changed) {
        storeMeta(meta);
        try {
          if (typeof updateUserRequest === 'function' && typeof getUserId === 'function') {
            updateUserRequest(getUserId(), meta).catch(() => { });
          }
        } catch (err) { }
        if (props.crewManager) {
          props.crewManager.crew = meta.crew;
        }
      }
    } catch (e) {
      console.error('Failed to run temp script for breadcrumbs:', e);
    }

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
  const [usersList, setUsersList] = useState([]);
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

      try {
        const usersRes = await getAllUsersRequest();
        if (usersRes && usersRes.data) {
          setUsersList(usersRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch users for Instance Manager:', err);
      }
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

  const [pendingDeleteInstance, setPendingDeleteInstance] = useState(null);

  const handleDeleteInstance = (id, name) => {
    setPendingDeleteInstance({ id, name });
  };

  const confirmDeleteInstance = async () => {
    if (!pendingDeleteInstance) return;
    const { id, name } = pendingDeleteInstance;
    setPendingDeleteInstance(null);
    setDeletingInstanceId(id);
    try {
      await deleteDungeonRequest(id);
      const meta = getMeta() || {};
      if (meta.dungeonId === id) {
        delete meta.dungeonId;
        delete meta.dungeonEntryTimestamp;
        delete meta.boardIndex;
        delete meta.tileIndex;
        delete meta.location;
        delete meta.spawnPoint;
        delete meta.visitedBoards;
        delete meta.deathTracker;
        delete meta.scroungeActive;
        delete meta.scoutActive;
        delete meta.activatedGenerators;
        delete meta.disabledOutposts;
        delete meta.failedMonolithActivations;
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
  const [activePresenceMap, setActivePresenceMap] = useState({})
  const [showDungeonPicker, setShowDungeonPicker] = useState(false)
  const [selectedDungeonTemplateId, setSelectedDungeonTemplateId] = useState(null)
  const [pendingDungeonSelection, setPendingDungeonSelection] = useState(null)
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
    let presenceMap = {};
    try {
      const presenceRes = await getActivePresenceRequest();
      if (presenceRes && presenceRes.data) {
        presenceMap = presenceRes.data;
        setActivePresenceMap(presenceRes.data);
      }
    } catch (err) {
    }
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

    const totalInstances = all.filter((d) => isInstanceDungeonName(d.name) || (d.name && d.name.includes('_'))).length;
    const isUnderInstanceLimit = totalInstances < 10;

    const validOnly = all.filter((d) => {
      const spawnDiag = findSpawnPointDiagnostic(d);
      return d.valid === true && spawnDiag.found && isUnderInstanceLimit;
    });
    const baseValidOnly = validOnly.filter((d) => !isInstanceDungeonName(d.name));
    setValidDungeons(baseValidOnly);

    if (Object.keys(presenceMap).length > 0) {
      console.log('[PresenceDiagnostic] Evaluated Dungeon Presence Counts:', baseValidOnly.map((d) => ({
        name: d.name,
        id: d.id,
        onlineCount: getDungeonOnlineCount(d, presenceMap, all)
      })));
    }

    const meta = getMeta() || {};
    let selectedId = meta.selectedDungeonTemplateId || null;

    // If selectedId is missing but meta.dungeonId exists, attempt to resolve matching template from baseValidOnly
    if (!selectedId && meta.dungeonId && baseValidOnly.length > 0) {
      const activeInst = all.find(x => String(x.id || x._id || '') === String(meta.dungeonId));
      const activeName = activeInst ? activeInst.name : (typeof meta.dungeonId === 'string' ? meta.dungeonId : null);
      if (activeName) {
        const baseName = activeName.split('_')[0].toLowerCase();
        const matchedTmpl = baseValidOnly.find(b => (b.name || '').toLowerCase() === baseName || (b.name || '').toLowerCase().startsWith(baseName));
        if (matchedTmpl) {
          selectedId = matchedTmpl.id;
          meta.selectedDungeonTemplateId = matchedTmpl.id;
          meta.selectedDungeonTemplateName = matchedTmpl.name;
          storeMeta(meta);
        }
      }
    }

    const selected = selectedId ? baseValidOnly.find((d) => d.id === selectedId) : null;
    if (selected) {
      setSelectedDungeonTemplateId(selected.id);
      if (!meta.selectedDungeonTemplateId) {
        meta.selectedDungeonTemplateId = selected.id;
        meta.selectedDungeonTemplateName = selected.name;
        storeMeta(meta);
      }
    } else if (selectedId && baseValidOnly.length > 0) {
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

  const getDungeonOnlineCount = (d, presenceMap, allDungeons = []) => {
    if (!d || !presenceMap) return 0;
    const baseName = (d.name || '').toLowerCase().trim();
    const normBase = baseName.replace(/[^a-z0-9]/g, '');
    const dungeonIdStr = String(d.id || d._id || '').toLowerCase();

    let totalOnline = 0;
    const countedKeys = new Set();

    Object.keys(presenceMap).forEach((key) => {
      const count = presenceMap[key] || 0;
      if (!count || countedKeys.has(key)) return;

      const keyStr = String(key).toLowerCase();
      const normKey = keyStr.replace(/[^a-z0-9]/g, '');

      const matchesId = dungeonIdStr && (keyStr === dungeonIdStr);
      const matchesBaseName = keyStr === baseName || keyStr.startsWith(baseName + '_') || baseName.startsWith(keyStr + '_');
      const matchesNorm = normBase && (normKey === normBase || normKey.startsWith(normBase) || normBase.startsWith(normKey));

      let matchesInstanceLookup = false;
      if (Array.isArray(allDungeons) && allDungeons.length > 0) {
        const instMatch = allDungeons.find(x => String(x.id || x._id || '').toLowerCase() === keyStr);
        if (instMatch && instMatch.name) {
          const instName = String(instMatch.name).toLowerCase();
          if (instName === baseName || instName.startsWith(baseName + '_')) {
            matchesInstanceLookup = true;
          }
        }
      }

      if (matchesId || matchesBaseName || matchesNorm || matchesInstanceLookup) {
        totalOnline += count;
        countedKeys.add(key);
      }
    });
    return totalOnline;
  };

  useEffect(() => {
    refreshValidDungeons();
    const interval = setInterval(() => {
      refreshValidDungeons();
    }, 10000);
    return () => clearInterval(interval);
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

  const isSameDungeon = (dungeon, meta, allDungeons = []) => {
    if (!dungeon || !meta) return false;
    if (meta.selectedDungeonTemplateId && meta.selectedDungeonTemplateId === dungeon.id) return true;
    if (meta.selectedDungeonTemplateName && meta.selectedDungeonTemplateName.toLowerCase() === (dungeon.name || '').toLowerCase()) return true;
    if (meta.dungeonId && (meta.dungeonId === dungeon.id || meta.dungeonId === dungeon._id)) return true;

    if (meta.dungeonId && Array.isArray(allDungeons)) {
      const activeInst = allDungeons.find(x => String(x.id || x._id || '') === String(meta.dungeonId));
      if (activeInst) {
        const instName = (activeInst.name || '').toLowerCase();
        const selName = (dungeon.name || '').toLowerCase();
        if (instName === selName || instName.startsWith(selName + '_') || selName.startsWith(instName + '_')) {
          return true;
        }
      }
    }

    if (meta.dungeonId && typeof meta.dungeonId === 'string' && dungeon.name) {
      const dName = dungeon.name.toLowerCase();
      const activeIdStr = String(meta.dungeonId).toLowerCase();
      if (activeIdStr.startsWith(dName) || activeIdStr.includes(dName)) return true;
    }

    return false;
  };

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

    // Only show warning if switching to a TRULY DIFFERENT dungeon template
    if (meta.dungeonId && !isSameDungeon(dungeon, meta, validDungeons)) {
      setPendingDungeonSelection(dungeon);
      setShowDungeonPicker(false);
      return;
    }

    setSelectedDungeonTemplateId(dungeon.id);
    meta.selectedDungeonTemplateId = dungeon.id;
    meta.selectedDungeonTemplateName = dungeon.name;
    storeMeta(meta);
    setShowDungeonPicker(false);
  }

  const confirmDungeonChange = () => {
    if (!pendingDungeonSelection) return;
    const dungeon = pendingDungeonSelection;
    const meta = getMeta() || {};
    delete meta.dungeonId;
    delete meta.dungeonEntryTimestamp;
    delete meta.boardIndex;
    delete meta.tileIndex;
    delete meta.location;
    delete meta.spawnPoint;
    delete meta.visitedBoards;
    delete meta.deathTracker;
    delete meta.scroungeActive;
    delete meta.scoutActive;
    delete meta.activatedGenerators;
    delete meta.disabledOutposts;
    delete meta.failedMonolithActivations;

    setSelectedDungeonTemplateId(dungeon.id);
    meta.selectedDungeonTemplateId = dungeon.id;
    meta.selectedDungeonTemplateName = dungeon.name;
    storeMeta(meta);
    if (typeof updateUserRequest === 'function' && typeof getUserId === 'function') {
      updateUserRequest(getUserId(), meta).catch(() => { });
    }
    setPendingDungeonSelection(null);
    setShowDungeonPicker(false);
  };

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
      <style dangerouslySetInnerHTML={{ __html: LANDING_REDUX_CSS }} />
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
          <span className="logo-subtitle">v 0.5.11 BETA</span>
        </div>
        <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

          <div className="user-info" style={{ cursor: 'pointer' }} onClick={() => setNavUserProfile(true)} title="View User Profile">
            Welcome <span>{username}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {showInfirmary && <InfirmaryModal onClose={() => setShowInfirmary(false)} crewManager={props.crewManager} />}

      <main className="landing-main-grid">
        {/* Dungeon Change Warning Modal */}
        {pendingDungeonSelection && (
          <div className="crew-showcase-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPendingDungeonSelection(null)}>
            <div className="crew-showcase-modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px', margin: 'auto', backgroundColor: '#1c1917', border: '1px solid rgba(229, 181, 79, 0.3)', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ color: '#e5b54f', fontFamily: "'Outfit', sans-serif", marginBottom: '20px', fontSize: '1.5rem', marginTop: '0', textTransform: 'uppercase', letterSpacing: '1px' }}>Warning</h3>
              <p style={{ color: '#d6d3d1', marginBottom: '30px', lineHeight: '1.5', fontFamily: "'Inter', sans-serif", fontSize: '0.95rem' }}>
                Choosing a new dungeon will clear all progress in the current dungeon, though the crew remains.<br /><br />
                Are you sure you want to change dungeons?
              </p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  onClick={() => setPendingDungeonSelection(null)}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #78716c',
                    color: '#a8a29e',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    minWidth: '100px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#a8a29e'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDungeonChange}
                  style={{
                    padding: '10px 20px',
                    background: '#e5b54f',
                    border: 'none',
                    color: '#0c0a09',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    minWidth: '100px',
                    transition: 'all 0.2s',
                    boxShadow: '0 0 10px rgba(229, 181, 79, 0.3)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(229, 181, 79, 0.6)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(229, 181, 79, 0.3)'; }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Instance Confirmation Modal */}
        {pendingDeleteInstance && (
          <div
            className="crew-showcase-overlay"
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setPendingDeleteInstance(null)}
          >
            <div
              className="crew-showcase-modal"
              style={{
                maxWidth: '440px',
                width: '100%',
                textAlign: 'center',
                padding: '28px 24px',
                backgroundColor: '#1c1917',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 25px rgba(239, 68, 68, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗑️</div>
              <h3
                style={{
                  color: '#ef4444',
                  fontFamily: "'Cinzel', 'Cinzel Decorative', serif",
                  marginBottom: '14px',
                  fontSize: '1.35rem',
                  marginTop: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Delete Instance
              </h3>
              <p
                style={{
                  color: '#d6d3d1',
                  marginBottom: '28px',
                  lineHeight: '1.5',
                  fontFamily: "'Inter', 'Outfit', sans-serif",
                  fontSize: '0.95rem'
                }}
              >
                Are you sure you want to delete dungeon instance{' '}
                <strong style={{ color: '#e5b54f', fontFamily: "'Outfit', sans-serif" }}>
                  "{pendingDeleteInstance.name}"
                </strong>
                ?<br />
                <span style={{ fontSize: '0.82rem', color: '#a8a29e', marginTop: '6px', display: 'inline-block' }}>
                  This action cannot be undone.
                </span>
              </p>
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                <button
                  onClick={() => setPendingDeleteInstance(null)}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #78716c',
                    color: '#a8a29e',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    minWidth: '110px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#a8a29e';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteInstance}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.95rem',
                    minWidth: '130px',
                    transition: 'all 0.2s',
                    boxShadow: '0 0 12px rgba(220, 38, 38, 0.4)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 0 18px rgba(220, 38, 38, 0.7)';
                    e.currentTarget.style.background = '#ef4444';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(220, 38, 38, 0.4)';
                    e.currentTarget.style.background = '#dc2626';
                  }}
                >
                  Delete Instance
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="hero-column">
          <div className="hero-card">
            <div className="hero-card-header">
              {/* Select Dungeon Dropdown */}
              <div className="dungeon-selector-group" ref={dungeonPickerRef}>
                <span className="selector-label">Target Dungeon</span>
                {(() => {
                  const selectedDungeonObj = validDungeons.find((d) => d.id === selectedDungeonTemplateId);
                  const selectedOnlineCount = selectedDungeonObj ? getDungeonOnlineCount(selectedDungeonObj, activePresenceMap, validDungeons) : 0;
                  const selectedDungeonName = getMeta()?.selectedDungeonTemplateName || selectedDungeonObj?.name || 'Select a Dungeon...';

                  return (
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
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{selectedDungeonName}</span>
                        {selectedOnlineCount > 0 && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              color: '#10b981',
                              fontWeight: 'bold'
                            }}
                            title={`${selectedOnlineCount} player(s) active in live instance`}
                          >
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#10b981',
                              boxShadow: '0 0 8px #10b981'
                            }} />
                            {selectedOnlineCount} online
                          </span>
                        )}
                      </div>
                      <span>▼</span>
                    </div>
                  );
                })()}

                {showDungeonPicker && (
                  <div className="custom-select-menu">
                    {validDungeons.map((d) => {
                      const totalOnline = getDungeonOnlineCount(d, activePresenceMap, validDungeons);
                      const isActive = totalOnline > 0;

                      return (
                        <div
                          key={d.id}
                          className={`menu-item ${selectedDungeonTemplateId === d.id ? 'active' : ''}`}
                          onClick={() => selectDungeonTemplate(d)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '12px' }}
                        >
                          <span>{d.name}</span>
                          {isActive && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                color: '#10b981',
                                fontWeight: 'bold'
                              }}
                              title={`${totalOnline} player(s) active in live instance`}
                            >
                              <span style={{
                                width: '9px',
                                height: '9px',
                                borderRadius: '50%',
                                backgroundColor: '#10b981',
                                boxShadow: '0 0 10px #10b981'
                              }} />
                              {totalOnline} online
                            </span>
                          )}
                        </div>
                      );
                    })}
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
                      {(() => {
                        let orderedCrew = [...crew];
                        const leaderIdx = orderedCrew.findIndex(m => m && m.isLeader);
                        if (leaderIdx !== -1 && orderedCrew.length > 1) {
                          const leader = orderedCrew.splice(leaderIdx, 1)[0];
                          const centerIdx = Math.floor(orderedCrew.length / 2);
                          orderedCrew.splice(centerIdx, 0, leader);
                        }
                        return orderedCrew.map((member, i) => (
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
                            <div
                              className={`selected-crew-avatar-wrapper type-${String(member.type || member.image || '').toLowerCase()}${member.isLeader ? ' is-leader' : ''}`}
                              style={{
                                backgroundImage: getCrewPortraitBackground(member.portrait, member.type || member.image),
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative'
                              }}
                            >
                              <img src={member.portrait || member.image} alt={member.name} className="crew-avatar-img" onError={(e) => { e.target.style.display = 'none'; }} />
                              {(() => {
                                const hp = typeof member.hp === 'number' ? member.hp : (member.stats?.hp || member.starting_hp || 100);
                                const maxHp = member.stats?.hp || member.starting_hp || 100;
                                const isMissingHp = hp < maxHp;
                                const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
                                const isDead = member.dead || hp <= 0;

                                return (
                                  <>
                                    {(isMissingHp || isDead) && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: 0, left: 0, right: 0, bottom: 0,
                                          borderRadius: '50%',
                                          pointerEvents: 'none',
                                          zIndex: 5,
                                          background: isDead
                                            ? 'rgba(0, 0, 0, 0.75)'
                                            : `linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.75) ${100 - hpPct}%, transparent ${100 - hpPct}%, transparent 100%)`
                                        }}
                                      />
                                    )}
                                    {isDead && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: '-4px',
                                          right: '-4px',
                                          width: '24px',
                                          height: '24px',
                                          zIndex: 6,
                                          backgroundImage: `url("${images?.whiteskull?.default || images?.whiteskull || images?.['whiteskull'] || ''}")`,
                                          backgroundSize: 'contain',
                                          backgroundRepeat: 'no-repeat',
                                          backgroundPosition: 'center',
                                          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
                                        }}
                                      />
                                    )}
                                    {(hpPct < 15 || isDead) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setShowInfirmary(true); }}
                                        style={{
                                          position: 'absolute',
                                          bottom: '-8px',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          zIndex: 20,
                                          backgroundColor: '#b91c1c',
                                          color: '#fff',
                                          border: '1px solid #fca5a5',
                                          borderRadius: '4px',
                                          padding: '2px 6px',
                                          fontSize: '0.65rem',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        Injured
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <span className="selected-crew-name" title={member.name}>
                              {member.name}
                            </span>
                            <span className="selected-crew-level">
                              LVL {member.level || 1}
                            </span>
                            <span className="selected-crew-type" title={member.type}>
                              {member.type ? (member.type.charAt(0).toUpperCase() + member.type.slice(1)) : ''}
                            </span>
                          </div>
                        ));
                      })()}
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

              {/* Play Button (Desktop) */}
              {(() => {
                const hasActiveDungeon = !!(getMeta()?.dungeonId);
                const noDungeonSelected = !selectedDungeonTemplateId && !hasActiveDungeon;
                const isDisabled = showWarning || noDungeonSelected;
                return (
                  <button
                    className={`btn-play btn-play-desktop ${isDisabled ? 'disabled' : ''}`}
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

              {(() => {
                const infirmary = getInfirmary();
                if (infirmary && (infirmary.patients.length > 0 || infirmary.sageCommitted)) {
                  return (
                    <button
                      className="btn-play btn-play-desktop"
                      onClick={() => setShowInfirmary(true)}
                      type="button"
                    >
                      Visit Infirmary ({infirmary.patients.length} Healing)
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        <div className={`menu-column ${!isAdmin ? 'basic-user' : ''}`}>
          <div className="menu-cards-grid">
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

          {/* Mobile Play Button (Right Column Bottom Highlighted) */}
          <div className="mobile-btn-play-container">
            {(() => {
              const hasActiveDungeon = !!(getMeta()?.dungeonId);
              const noDungeonSelected = !selectedDungeonTemplateId && !hasActiveDungeon;
              const isDisabled = showWarning || noDungeonSelected;
              return (
                <button
                  className={`mobile-btn-play ${isDisabled ? 'disabled' : ''}`}
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
                        flexDirection: 'column',
                        background: 'rgba(12, 10, 9, 0.6)',
                        border: isCurrentActive ? '1px solid #e5b54f' : '1px solid rgba(120, 113, 108, 0.25)',
                        borderRadius: '6px',
                        padding: '14px 18px',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontWeight: 'bold',
                              fontSize: '0.95rem',
                              color: '#ffffff',
                              fontFamily: "'Outfit', sans-serif"
                            }}>
                              {inst.name}
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

                      {/* Registered Users Table */}
                      {(() => {
                        const registeredUsers = usersList.filter(user => {
                          if (!user.metadata) return false;
                          try {
                            const uMeta = JSON.parse(user.metadata);
                            return uMeta && uMeta.dungeonId === inst.id;
                          } catch (e) {
                            return false;
                          }
                        });

                        if (registeredUsers.length === 0) return null;

                        return (
                          <div style={{
                            background: 'rgba(0, 0, 0, 0.35)',
                            borderRadius: '4px',
                            border: '1px solid rgba(212, 168, 68, 0.15)',
                            padding: '10px 14px',
                            marginTop: '4px'
                          }}>
                            <div style={{
                              fontSize: '0.8rem',
                              color: '#e5b54f',
                              fontWeight: '700',
                              marginBottom: '8px',
                              fontFamily: "'Outfit', sans-serif",
                              letterSpacing: '0.5px',
                              textAlign: 'left'
                            }}>
                              Registered Players ({registeredUsers.length})
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#d6d3d1' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(212, 168, 68, 0.25)', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 8px', color: '#a8a29e', fontWeight: '600' }}>Player</th>
                                    <th style={{ padding: '6px 8px', color: '#a8a29e', fontWeight: '600' }}>Leader</th>
                                    <th style={{ padding: '6px 8px', color: '#a8a29e', fontWeight: '600' }}>Entered</th>
                                    <th style={{ padding: '6px 8px', color: '#a8a29e', fontWeight: '600', textAlign: 'right' }}>Time Remaining</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {registeredUsers.map(u => {
                                    const uMeta = JSON.parse(u.metadata);
                                    const entryTimeStr = uMeta.dungeonEntryTimestamp
                                      ? new Date(uMeta.dungeonEntryTimestamp).toLocaleString()
                                      : 'N/A';

                                    let timeRemainingStr = 'N/A';
                                    let isExpired = false;
                                    if (uMeta.dungeonEntryTimestamp) {
                                      const entryTime = new Date(uMeta.dungeonEntryTimestamp).getTime();
                                      const elapsed = Date.now() - entryTime;
                                      const sevenDays = 7 * 24 * 60 * 60 * 1000;
                                      const remaining = sevenDays - elapsed;
                                      if (remaining <= 0) {
                                        timeRemainingStr = 'Expired';
                                        isExpired = true;
                                      } else {
                                        const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
                                        const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                                        timeRemainingStr = `${days}d ${hours}h`;
                                      }
                                    }

                                    return (() => {
                                      let leaderDisplay = '—';
                                      try {
                                        const metaCrew = Array.isArray(uMeta.crew) ? uMeta.crew : [];
                                        const leaderEntry = metaCrew.find(m => m && m.isLeader);
                                        if (leaderEntry) {
                                          const cls = (leaderEntry.type || leaderEntry.image || '').toLowerCase();
                                          leaderDisplay = cls ? cls.charAt(0).toUpperCase() + cls.slice(1) : '?';
                                        }
                                      } catch (e) { }
                                      return (
                                        <tr key={u._id} style={{ borderBottom: '1px solid rgba(120, 113, 108, 0.15)' }}>
                                          <td style={{ padding: '8px 8px', fontWeight: '600', color: '#ffffff', textAlign: 'left' }}>{u.username}</td>
                                          <td style={{ padding: '8px 8px', textAlign: 'left' }}>
                                            <span style={{
                                              display: 'inline-block',
                                              background: leaderDisplay !== '—' ? 'rgba(212,168,68,0.12)' : 'transparent',
                                              border: leaderDisplay !== '—' ? '1px solid rgba(212,168,68,0.35)' : 'none',
                                              color: leaderDisplay !== '—' ? '#e5b54f' : '#6b7280',
                                              borderRadius: '4px',
                                              padding: '1px 7px',
                                              fontSize: '0.7rem',
                                              fontWeight: '700',
                                              letterSpacing: '0.5px',
                                            }}>{leaderDisplay}</span>
                                          </td>
                                          <td style={{ padding: '8px 8px', textAlign: 'left' }}>{entryTimeStr}</td>
                                          <td style={{
                                            padding: '8px 8px',
                                            textAlign: 'right',
                                            color: isExpired ? '#ef4444' : '#10b981',
                                            fontWeight: '700'
                                          }}>
                                            {timeRemainingStr}
                                          </td>
                                        </tr>
                                      );
                                    })();
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="crew-showcase-type-tag">
                      Lvl {showcaseUnit.level || 1} {showcaseUnit.type || showcaseUnit.class || 'HERO'}
                    </div>
                    {showcaseUnit.isLeader && (
                      <div className="crew-showcase-leader-tag" style={{
                        display: 'inline-block',
                        fontSize: '0.8rem',
                        color: '#ffd700',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        fontWeight: '700',
                        background: 'rgba(212, 168, 68, 0.25)',
                        border: '1px solid rgba(212, 168, 68, 0.6)',
                        padding: '3px 12px',
                        borderRadius: '12px',
                        width: 'fit-content'
                      }}>
                        LEADER
                      </div>
                    )}
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

                {/* Specialization Panel */}
                {(() => {
                  const classKey = uType;
                  const specialties = CLASS_SPECIALTIES[classKey] || [];
                  const meta = getMeta() || {};
                  const isDungeonActive = !!(meta.dungeonId);
                  const currentMember = Array.isArray(meta.crew)
                    ? meta.crew.find(c =>
                      (c.id && showcaseUnit.id && c.id === showcaseUnit.id) ||
                      (c.type || c.image) === (showcaseUnit.type || showcaseUnit.image)
                    )
                    : null;
                  const selectedSpecialty = currentMember?.specialty || showcaseUnit.specialty || null;
                  const isSpecLocked = isDungeonActive && !!selectedSpecialty;

                  if (specialties.length === 0) return null;

                  const handleSelectSpecialty = (specId) => {
                    if (isSpecLocked) return;
                    const newMeta = getMeta() || {};
                    showcaseUnit.specialty = specId;
                    if (Array.isArray(newMeta.crew)) {
                      const m = newMeta.crew.find(c =>
                        (c.id && showcaseUnit.id && c.id === showcaseUnit.id) ||
                        (c.type || c.image) === (showcaseUnit.type || showcaseUnit.image)
                      );
                      if (m) m.specialty = specId;
                    }
                    storeMeta(newMeta);
                    setForceUpdateToggle(prev => prev + 1);
                  };

                  return (
                    <div className="crew-showcase-panel specialty-panel">
                      <h3 className="crew-showcase-panel-title specialty-panel-title">
                        <span className="specialty-title-diamond" aria-hidden="true"></span>
                        Specialization
                        {isSpecLocked && (
                          <span className="specialty-locked-badge">Locked</span>
                        )}
                      </h3>

                      {isSpecLocked && (
                        <p className="specialty-lock-notice">
                          This crew member's specialization was sealed upon entering the dungeon. Choose specializations before your next expedition.
                        </p>
                      )}

                      {!isSpecLocked && (
                        <p className="specialty-prompt-notice">
                          {isDungeonActive
                            ? "Select a specialization path. Once chosen, it will be sealed for the rest of this expedition."
                            : "Select a specialization path. This choice will be sealed when the crew enters the dungeon."}
                        </p>
                      )}

                      <div className="specialty-grid">
                        {specialties.map((spec) => {
                          const isSelected = selectedSpecialty === spec.id;
                          return (
                            <div
                              key={spec.id}
                              className={`specialty-card ${isSelected ? 'selected' : ''} ${isSpecLocked ? 'locked' : ''}`}
                              onClick={() => handleSelectSpecialty(spec.id)}
                              role={isSpecLocked ? undefined : 'button'}
                              tabIndex={isSpecLocked ? -1 : 0}
                              onKeyDown={e => { if (!isSpecLocked && (e.key === 'Enter' || e.key === ' ')) handleSelectSpecialty(spec.id); }}
                            >
                              <div className="specialty-card-header">
                                <span className="specialty-card-name">{spec.name}</span>
                                {isSelected && (
                                  <span className="specialty-selected-mark" aria-label="Selected">&#10003;</span>
                                )}
                              </div>
                              <p className="specialty-card-desc">{spec.description}</p>
                              <div className="specialty-bonus-tags">
                                {spec.bonuses.map((bonus, bi) => (
                                  <span key={bi} className="specialty-bonus-tag">{bonus}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}