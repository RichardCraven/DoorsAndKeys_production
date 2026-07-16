import React from 'react'
import { INTERVALS, INTERVAL_DISPLAY_NAMES } from '../utils/shared-constants';
import { storeMeta, getMeta } from '../utils/session-handler';
import { CrewManager } from '../utils/crew-manager'
import { Redirect } from "react-router-dom";
import MonsterBattle from './sub-views/MonsterBattle';
import loadingGif from '../assets/highres-gifs/gifOne.gif';
import { CombatManagerRedux } from '../utils/combat-manager-redux';
import skillsMatrix from '../utils/skills-matrix';

const filterSpecialsByTier = (specials, selectedTier) => {
    // Resolve all specials to their detail object to know their tier
    const resolved = specials.map(s => {
        const key = typeof s === 'string' ? s : (s.id || s.key || '');
        const match = skillsMatrix[key];
        return match ? { ...match, original: s } : { id: key, tier: 1, original: s };
    });

    const tier1List = resolved.filter(s => s.tier === 1);
    const tier2List = resolved.filter(s => s.tier === 2);
    const tier3List = resolved.filter(s => s.tier === 3);
    const tier4List = resolved.filter(s => s.tier === 4);

    const result = [];

    if (selectedTier === 1) {
        // Up to 4 tier-1 skills
        result.push(...tier1List.slice(0, 4));
    } else if (selectedTier === 2) {
        // Up to 3 tier-1, 1 tier-2 skill
        result.push(...tier1List.slice(0, 3));
        result.push(...tier2List.slice(0, 1));
    } else if (selectedTier === 3) {
        // Up to 2 tier-1, 1 tier-2, 1 tier-3 skill
        result.push(...tier1List.slice(0, 2));
        result.push(...tier2List.slice(0, 1));
        result.push(...tier3List.slice(0, 1));
    } else if (selectedTier === 4) {
        // Up to 2 tier-1, 2 tier-2, 1 tier-3, 1 tier-4 skill
        result.push(...tier1List.slice(0, 2));
        result.push(...tier2List.slice(0, 2));
        result.push(...tier3List.slice(0, 1));
        result.push(...tier4List.slice(0, 1));
    }

    return result.map(s => s.original);
};

const WEAKNESS_SYMBOLS = {
    holy: '☀️',
    fire: '🔥',
    ice: '❄️',
    electricity: '⚡',
    arcane: '🔮',
    psionic: '🧠',
    physical: '🛡️',
    crushing: '🔨',
    cutting: '⚔️',
    blood_magic: '🩸',
    curse: '💀'
};

const showWeaknessPopup = (type, label) => {
    const existing = document.getElementById('weakness-popup');
    if (existing) existing.remove();
    const existingOverlay = document.getElementById('weakness-popup-overlay');
    if (existingOverlay) existingOverlay.remove();

    const definitions = {
        fire: 'Deals fire damage and can burn targets, causing damage over time.',
        ice: 'Deals cold damage and slows down movement and action speeds.',
        electricity: 'Deals lightning damage, with potential to chain to nearby units.',
        arcane: 'Pure magical energy that bypasses standard physical armor.',
        psionic: 'Attacks the target\'s mind, triggering mental debuffs or bypassing physical defenses.',
        holy: 'Sacred energy that is highly effective against undead, demons, and aberrations.',
        physical: 'Standard physical damage from weapons, heavily reduced by armor.',
        crushing: 'Heavy blunt force that damages stamina and has a high chance to stun.',
        cutting: 'Sharp physical damage that can cause targets to bleed over time.',
        blood_magic: 'Dark magic that drains the target\'s health to heal the caster.',
        curse: 'Malevolent magic that reduces target statistics or infects them with debuffs.'
    };

    const desc = definitions[type.toLowerCase().replace('-', '_')] || 'A damage type that this unit is vulnerable to, taking increased damage.';

    const popup = document.createElement('div');
    popup.id = 'weakness-popup';
    popup.style.position = 'fixed';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = '999999';
    popup.style.background = '#18181b';
    popup.style.color = '#fff';
    popup.style.padding = '20px';
    popup.style.borderRadius = '12px';
    popup.style.border = '1px solid #c084fc';
    popup.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(192, 132, 252, 0.2)';
    popup.style.maxWidth = '300px';
    popup.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    popup.style.textAlign = 'center';

    popup.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">${WEAKNESS_SYMBOLS[type.toLowerCase().replace('-', '_')] || '❓'}</div>
        <div style="font-weight: 700; font-size: 18px; color: #c084fc; margin-bottom: 8px;">${label}</div>
        <div style="font-size: 14px; color: #d4d4d8; line-height: 1.5; margin-bottom: 16px;">${desc}</div>
        <button id="close-weakness-popup" style="background: #c084fc; color: #18181b; border: none; padding: 6px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Close</button>
    `;

    document.body.appendChild(popup);

    const overlay = document.createElement('div');
    overlay.id = 'weakness-popup-overlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '999998';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(2px)';
    document.body.appendChild(overlay);

    const closePopup = () => {
        popup.remove();
        overlay.remove();
    };

    document.getElementById('close-weakness-popup').onclick = closePopup;
    overlay.onclick = closePopup;
};

const renderWeaknessSymbols = (weaknesses) => {
    if (!weaknesses || !Array.isArray(weaknesses)) return null;
    return weaknesses.map((w, idx) => {
        const type = typeof w === 'object' && w !== null ? (w.id || w.name || '') : w;
        const normalized = type.toLowerCase().replace('-', '_');
        const symbol = WEAKNESS_SYMBOLS[normalized] || WEAKNESS_SYMBOLS[type] || '❓';
        const label = type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return (
            <span 
                key={idx} 
                title={label} 
                onClick={() => showWeaknessPopup(type, label)}
                style={{ 
                    marginRight: '6px', 
                    fontSize: '1.2em', 
                    cursor: 'pointer', 
                    display: 'inline-block' 
                }}
            >
                {symbol}
            </span>
        );
    });
};


// import useScript from '../hooks/useScript.js'

// const useScriptCustom = (file) => {
//     const script = document.createElement('script');

//     script.src = file;
//     script.type = 'type/javascript';
//     // script.async = true;
//     script.onload = () => {
//         // this.scriptLoaded();
//     }

//     document.body.appendChild(script);
// }

const clone = (val) => {
    return JSON.parse(JSON.stringify(val))
}

const formatRosterSkillName = (e) => {
    const name = typeof e === 'object' && e !== null ? e.name : String(e || '');
    const stripped = name.replace(/^(monk|wizard|ranger|soldier|barbarian|sage|priest|rogue|summoner|engineer)_/, '');
    return stripped.replace(/_/g, ' ');
};

class CrewManagerPage extends React.Component {
    // The available speed intervals (should match combat-manager.js)
    intervals = INTERVALS;
    intervalDisplayNames = INTERVAL_DISPLAY_NAMES;
    constructor(props) {
        super(props)
        this.monsterBattleComponentRef = React.createRef()
        // Temporary crew manager used by the Combat Simulator to avoid mutating the global crew
        this.tempCrewManager = null;
        // Ref for scrolling to the enemy selection section
        this.enemySectionRef = React.createRef();
        this.crewSelectorRef = React.createRef();
        this.state = {
            monster: null,
            minions: null,
            // dungeon: null,
            user: null,
            options: [],
            selectedCrew: [],
            selectedCrewMember: null,
            navToLanding: false,
            crewSlots: [null, null, null, null],
            advancedUser: false,
            crewSelected: false,
            shiftDown: false,
            ctrlDown: false,
            // Simulator-only: per-fighter target level (keyed by fighter type) and gear option
            fighterLevels: {},
            fighterSkillTiers: {},
            preppedCrew: [],
            outfitWithEquipment: true,
            useReduxCombat: true,
            // Enemy selection
            selectedMonsterKey: 'mummy',
            selectedMinionKeys: ['skeleton', 'skeleton', 'skeleton', null],
            selectedEnemyForInfo: null,
            lord: false,
            loadingSimulator: false,
            randomTierPoints: 6,
        }
    }
    timer = null;

    componentDidMount() {
        const meta = getMeta();
        // Combat Simulator always starts with resolve at 50 (mid-point morale)
        meta.resolve = 50;
        storeMeta(meta);


        // Restore combat speed from meta if present
        if (meta && meta.combatSpeed && this.props.combatManager) {
            if (typeof this.props.combatManager.updateAllFightIntervals === 'function') {
                this.props.combatManager.updateAllFightIntervals(meta.combatSpeed);
            } else {
                this.props.combatManager.FIGHT_INTERVAL = meta.combatSpeed;
            }
            this.forceUpdate();
        }

        this.props.inventoryManager.initializeItems()
        let options = this.props.crewManager.adventurers;
        // Create a temporary CrewManager instance for the simulator so we don't mutate the global crew state
        this.tempCrewManager = new CrewManager();
        // initialize with a deep-cloned options array to avoid sharing references
        this.tempCrewManager.initializeCrew(clone(options));
        // let wizard = this.tempCrewManager.crew.find(e=>e.type==='wizard')
        // let wizclone = clone(wizard);

        // Example for new structure:
        // let action = {
        //   type: 'spell',
        //   name: 'Magic Missile',
        //   iconUrl: '/static/media/magic_missile.png',
        //   subtype: 'magic missile',
        //   count: 1,
        //   startDate,
        //   endDate,
        //   available: false,
        //   notified: false,
        // }

        // Ref wiring will be done after MonsterBattle is mounted in componentDidUpdate
        // After MonsterBattle is mounted, wire up the ref to Wizard AI synchronously
        this.wireMonsterBattleRefToWizardAI();
        // this.props.crewManager.beginSpecialAction(wizard, action)
        // wizard.specialActions.push(action)

        let selectedCrew = [];
        // selectedCrew.push(options[0])
        // selectedCrew.push(options[1])
        // selectedCrew.push(options[2])

        selectedCrew.push(this.tempCrewManager.crew.find(e => e.type === 'wizard'))
        selectedCrew.push(this.tempCrewManager.crew.find(e => e.type === 'soldier'))
        // selectedCrew.push(this.props.crewManager.crew.find(e=>e.type==='ranger'))
        selectedCrew.push(this.tempCrewManager.crew.find(e => e.type === 'barbarian'))
        selectedCrew.push(this.tempCrewManager.crew.find(e => e.type === 'monk'))

        // useScript('../assets/particles/particles.js')

        // useScriptCustom('../assets/particles/particles.js')


        this.initializeListeners();

        // Restore default enemy selection from meta if saved
        const savedDefaults = getMeta()?.simulatorDefaults;
        const enemyState = savedDefaults
            ? { 
                selectedMonsterKey: savedDefaults.selectedMonsterKey ?? 'mummy', 
                selectedMinionKeys: savedDefaults.selectedMinionKeys ?? ['skeleton', 'skeleton', 'skeleton', null],
                lord: savedDefaults.lord ?? false,
                randomTierPoints: savedDefaults.randomTierPoints ?? 6
              }
            : { 
                selectedMonsterKey: 'mummy', 
                selectedMinionKeys: ['skeleton', 'skeleton', 'skeleton', null],
                lord: false,
                randomTierPoints: 6
              };

        // Restore saved crew roster if present; otherwise fall back to the hardcoded defaults above
        if (savedDefaults?.selectedCrewTypes && Array.isArray(savedDefaults.selectedCrewTypes)) {
            const restoredCrew = savedDefaults.selectedCrewTypes
                .map(type => this.tempCrewManager.crew.find(m => m.type === type))
                .filter(Boolean);
            if (restoredCrew.length > 0) selectedCrew = restoredCrew;
        }

        const initialMonsterKey = enemyState.selectedMonsterKey || 'mummy';
        const initialMonster = this.props.monsterManager.getMonster(initialMonsterKey);

        this.setState({
            options,
            selectedCrew,
            selectedCrewMember: selectedCrew[0],
            ...(savedDefaults?.fighterLevels ? { fighterLevels: savedDefaults.fighterLevels } : {}),
            ...(savedDefaults?.fighterSkillTiers ? { fighterSkillTiers: savedDefaults.fighterSkillTiers } : {}),
            ...enemyState,
            selectedEnemyForInfo: initialMonster || null
        })
    }

    componentDidUpdate(prevProps, prevState) {
        // Only wire the ref if crewSelected just became true and MonsterBattle is mounted
        if (!prevState.crewSelected && this.state.crewSelected) {
            this.wireMonsterBattleRefToWizardAI();
        }
    }

    wireMonsterBattleRefToWizardAI = () => {
        const cm = this.state.useReduxCombat ? this.reduxCombatManager : this.props.combatManager;
        if (
            this.monsterBattleComponentRef.current &&
            cm &&
            cm.fighterAI &&
            cm.fighterAI.roster &&
            cm.fighterAI.roster.wizard
        ) {
            cm.fighterAI.roster.wizard.monsterBattleRef = this.monsterBattleComponentRef.current;
        }
    }
    //   useScript('../assets/fullYear.js')


    pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
    initializeListeners = () => {
        window.addEventListener('keydown', this.combatKeyDownHandler);
        window.addEventListener('keyup', this.combatKeyUpListener)
        window.addEventListener('beforeunload', this.componentCleanup);
    }
    componentCleanup = () => {
        // Add logs for crew, monsters, and listeners
        // Clear any timers/intervals on this instance
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this._intervals && Array.isArray(this._intervals)) {
            this._intervals.forEach(i => { try { clearInterval(i); } catch (e) { } });
            this._intervals = [];
        }
        if (this._timers && Array.isArray(this._timers)) {
            this._timers.forEach(t => { try { clearTimeout(t); } catch (e) { } });
            this._timers = [];
        }
        window.removeEventListener('keydown', this.combatKeyDownHandler)
        window.removeEventListener('keyup', this.combatKeyUpListener)
        window.removeEventListener('beforeunload', this.componentCleanup);
    }
    getDungeonDetails = async () => {
        // const user = getMeta();
    }
    singleClick = (crewMember) => {
        this.setState({
            selectedCrewMember: crewMember
        })
    }
    exitSimulator = () => {
        this.componentCleanup();
        this.props.navToLanding();
        // const history = useHistory();
        // history.push('/landing')
    }
    selectCrewMember = (event, crewMember) => {
        clearTimeout(this.timer);
        const now = Date.now();
        const isDoubleTap = this._lastCrewTap === crewMember.id && (now - this._lastCrewTapTime < 300);
        this._lastCrewTap = crewMember.id;
        this._lastCrewTapTime = now;

        if (event.detail === 2 || isDoubleTap) {
            let crew = this.state.selectedCrew;
            if (crew.length === 4) return;
            if (!crew.includes(crewMember)) crew.push(crewMember);
            this.setState({
                selectedCrew: crew
            });
        } else {
            this.timer = setTimeout(() => this.singleClick(crewMember), 200);
        }
        this.setState({
            selectedCrewMember: crewMember
        });
    }
    addMember = (index) => {
        let member = this.state.selectedCrewMember
        let crew = this.state.selectedCrew;
        if (crew.length >= 4) return
        if (!crew.includes(member)) crew.push(member)
        this.setState({
            selectedCrew: crew
        })
    }
    setMonster = (monsterKey, minionKeys) => {
        const useMonsterKey = monsterKey || this.state.selectedMonsterKey || 'mummy';
        const useMinionKeys = minionKeys || this.state.selectedMinionKeys || [];
        let monster = this.props.monsterManager.getMonster(useMonsterKey);
        if (!monster) monster = this.props.monsterManager.getRandomMonster();
        let monsterName = this.pickRandom(monster.monster_names) || (monster.type ? monster.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown');
        monster.name = monsterName
        monster.inventory = [];
        if (this.state.lord) {
            monster.isLord = true;
        }

        let minions = [];
        useMinionKeys.forEach((key, i) => {
            if (!key) return;
            const minion = this.props.monsterManager.getMonster(key);
            if (!minion) return;
            minion.id = minion.id + (i * 10) + 700;
            minion.name = this.pickRandom(minion.monster_names) || (minion.type ? minion.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown');
            minion.inventory = [];
            minions.push(minion);
        });

        this.setState({ monster, minions });
    }

    updateCombatSpeed = (newInterval) => {
        if (this.props.combatManager) {
            if (typeof this.props.combatManager.updateAllFightIntervals === 'function') {
                this.props.combatManager.updateAllFightIntervals(newInterval);
            } else {
                this.props.combatManager.FIGHT_INTERVAL = newInterval;
            }
            // Persist to meta
            const meta = getMeta();
            meta.combatSpeed = newInterval;
            storeMeta(meta);
            this.forceUpdate();
        }
    }

    // ── Enemy selection helpers ────────────────────────────────────────────────

    scrollToEnemySection = () => {
        if (this.enemySectionRef.current) {
            this.enemySectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }

    saveDefaultEnemy = () => {
        const meta = getMeta();
        meta.simulatorDefaults = {
            selectedMonsterKey: this.state.selectedMonsterKey,
            selectedMinionKeys: this.state.selectedMinionKeys,
            selectedCrewTypes: this.state.selectedCrew.filter(Boolean).map(m => m.type),
            fighterLevels: this.state.fighterLevels,
            fighterSkillTiers: this.state.fighterSkillTiers,
            lord: this.state.lord,
            randomTierPoints: this.state.randomTierPoints,
        };
        storeMeta(meta);
        this.setState({ defaultEnemySaved: true });
        setTimeout(() => this.setState({ defaultEnemySaved: false }), 1500);
    }

    selectEnemyForInfo = (monsterKey) => {
        this.setState({ selectedEnemyForInfo: monsterKey });
    }

    setSelectedMonsterSlot = (monsterKey) => {
        this.setState({ selectedMonsterKey: monsterKey });
    }

    setSelectedMinionSlot = (index, monsterKey) => {
        const keys = this.state.selectedMinionKeys.slice();
        keys[index] = monsterKey;
        this.setState({ selectedMinionKeys: keys });
    }

    removeEnemySlot = (slotType, index) => {
        if (slotType === 'monster') {
            this.setState({ selectedMonsterKey: null, selectedMinionKeys: [null, null, null, null] });
        } else {
            const keys = this.state.selectedMinionKeys.slice();
            keys[index] = null;
            this.setState({ selectedMinionKeys: keys });
        }
    }

    // ── Random encounter: build a monster + minions lineup from a tier budget ─
    startRandomCombat = async () => {
        const { monsterManager } = this.props;
        const budget = this.state.randomTierPoints;
        const allRosterKeys = ['skeleton', 'goblin', 'ogre', 'troll', 'mummy', 'wraith', 'vampire', 'gorgon', 'witch', 'beholder', 'kabuki_demon', 'djinn', 'dragon', 'sphinx', 'goat_demon', 'cyclops', 'high_priest_of_the_basilisk', 'shade', 'hashmallim', 'hagigah', 'blalok'];
        const rosterMonsters = allRosterKeys
            .map(k => monsterManager.getMonster(k))
            .filter(m => m && m.tier && !m.isMinion);

        // Shuffle helper
        const shuffle = (arr) => {
            const a = arr.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        // Build a combination of monsters that exactly fills (or gets as close to) the budget
        // Strategy: pick a random main monster first (tier <= budget), then fill remaining budget with minions (max 4 total slots)
        let remaining = budget;
        let chosenMonsterKey = null;
        let chosenMinionKeys = [null, null, null, null];

        // Shuffle roster and try to pick a main monster that fits
        const shuffled = shuffle(rosterMonsters);
        const mainCandidates = shuffled.filter(m => m.tier <= remaining);
        if (mainCandidates.length === 0) {
            // Fallback: pick the lowest tier monster
            const fallback = rosterMonsters.slice().sort((a, b) => a.tier - b.tier)[0];
            chosenMonsterKey = fallback ? fallback.key : 'mummy';
            remaining = 0;
        } else {
            const main = mainCandidates[Math.floor(Math.random() * mainCandidates.length)];
            chosenMonsterKey = main.key;
            remaining -= main.tier;
        }

        // Fill minion slots with random monsters that fit remaining budget (up to 4 slots)
        const minionCandidates = shuffle(rosterMonsters);
        let minionSlot = 0;
        while (remaining > 0 && minionSlot < 4) {
            const fits = minionCandidates.filter(m => {
                if (m.tier > remaining) return false;
                // Avoid duplicating a tier 4 unit
                if (m.tier === 4) {
                    const alreadyChosen = chosenMonsterKey === m.key || chosenMinionKeys.includes(m.key);
                    if (alreadyChosen) return false;
                }
                return true;
            });
            if (fits.length === 0) break;
            const pick = fits[Math.floor(Math.random() * fits.length)];
            chosenMinionKeys[minionSlot] = pick.key;
            remaining -= pick.tier;
            minionSlot++;
        }

        // Immediately kick off combat with the selected lineup
        this.setState({
            selectedMonsterKey: chosenMonsterKey,
            selectedMinionKeys: chosenMinionKeys,
            lord: false,
        }, () => {
            this.submit();
        });
    }

    addEnemyFromRoster = (monsterKey) => {
        // Fill main monster slot first, then minion slots in order
        if (!this.state.selectedMonsterKey) {
            const monster = this.props.monsterManager.getMonster(monsterKey);
            const defaultMinions = (monster && Array.isArray(monster.minions)) ? monster.minions : [];
            const newMinions = [...defaultMinions];
            while (newMinions.length < 4) {
                newMinions.push(null);
            }
            this.setState({
                selectedMonsterKey: monsterKey,
                selectedMinionKeys: newMinions
            });
            return;
        }
        const keys = this.state.selectedMinionKeys.slice();
        const emptyIndex = keys.findIndex(k => !k);
        if (emptyIndex !== -1) {
            keys[emptyIndex] = monsterKey;
            this.setState({ selectedMinionKeys: keys });
        }
    }

    // ── Simulator-only level & gear helpers ────────────────────────────────────

    /**
     * Returns the target level for a given fighter type.
     * Defaults to 3 if not explicitly set.
     */
    getSimLevel = (type) => {
        const { fighterLevels } = this.state;
        return (typeof fighterLevels[type] === 'number') ? fighterLevels[type] : 3;
    }

    setSimLevel = (type, delta) => {
        const current = this.getSimLevel(type);
        const next = Math.max(1, Math.min(20, current + delta));
        this.setState(prev => ({
            fighterLevels: { ...prev.fighterLevels, [type]: next }
        }));
    }

    getSimSkillTier = (type) => {
        const { fighterSkillTiers } = this.state;
        return (fighterSkillTiers && typeof fighterSkillTiers[type] === 'number') ? fighterSkillTiers[type] : 1;
    }

    setSimSkillTier = (type, tier) => {
        this.setState(prev => ({
            fighterSkillTiers: { ...prev.fighterSkillTiers, [type]: tier }
        }));
    }

    /**
     * Apply level-up bonuses (up to targetLevel) and optionally equip a weapon,
     * on a cloned crew member that is already in tempCrewManager.
     * Tier: levels 1-9 → tier 1, 10-19 → tier 2, 20+ → tier 3.
     */
    applySimulatorPrep = (member) => {
        const targetLevel = this.getSimLevel(member.type);
        const currentLevel = typeof member.level === 'number' ? member.level : 0;

        // Apply level-up bonuses for each level from current+1 up to targetLevel
        for (let i = currentLevel; i < targetLevel; i++) {
            try { this.tempCrewManager.levelUp(member); } catch (e) { }
        }

        // Optionally equip a weapon based on tier
        if (this.state.outfitWithEquipment) {
            const tier = targetLevel >= 20 ? 3 : targetLevel >= 10 ? 2 : 1;
            try {
                const allWeapons = this.props.inventoryManager.weapons;
                let tierWeapons = Object.entries(allWeapons)
                    .filter(([key, w]) => w && w.tier === tier)
                    .map(([key, w]) => {
                        const cloned = clone(w);
                        if (cloned) cloned._im_key = key;
                        return cloned;
                    });

                const isBow = (w) => {
                    const k = w._im_key || '';
                    return k.endsWith('_bow') || k === 'merklins_peacekeeper' || w.range === 'far';
                };
                const isMartial = (w) => {
                    const k = w._im_key || '';
                    return k.endsWith('_sword') || k.endsWith('_axe') || w.range === 'close';
                };

                if (member.type === 'ranger') {
                    tierWeapons = tierWeapons.filter(isBow);
                } else if (member.type === 'soldier' || member.type === 'barbarian') {
                    tierWeapons = tierWeapons.filter(isMartial);
                } else {
                    tierWeapons = tierWeapons.filter(w => !isBow(w));
                }

                if (tierWeapons.length > 0) {
                    const weapon = clone(tierWeapons[Math.floor(Math.random() * tierWeapons.length)]);
                    weapon.equippedBy = member.id;
                    member.inventory = member.inventory || [];
                    // Replace any existing weapon slot; keep other items
                    member.inventory = member.inventory.filter(i => !i || i.type !== 'weapon');
                    member.inventory.push(weapon);
                }
            } catch (e) { console.warn('applySimulatorPrep: gear assignment failed', e); }
        }
    }

    submit = async () => {
        this.setState({ loadingSimulator: true });

        // Create a fresh clone of selectedCrew to keep original intact when returning or displaying
        const clonedCrew = clone(this.state.selectedCrew);

        // Apply simulator level + gear to each cloned crew member
        if (this.tempCrewManager) {
            clonedCrew.forEach(member => {
                if (member) {
                    // Level up
                    const targetLevel = this.getSimLevel(member.type);
                    const currentLevel = typeof member.level === 'number' ? member.level : 0;
                    for (let i = currentLevel; i < targetLevel; i++) {
                        try { this.tempCrewManager.levelUp(member); } catch (e) { }
                    }

                    // Filter specials by selected skill tier
                    const selectedTier = this.getSimSkillTier(member.type);

                    if (member.skills) {
                        const BASIC_ATTACK_KEYS = [
                            'slash', 'magic_missile', 'monk_punch', 'heal', 'loose', 
                            'barbarian_slash', 'sword_swing', 'axe_throw', 'summon_skeleton', 
                            'claw_strike', 'claws', 'rake', 'gore_horns', 'snake_strike', 
                            'grasp', 'void_lance', 'crush', 'tackle', 'major_magic_missile', 'greater_magic_missile',
                            'vampiric_bite', 'induce_madness', 'lightning', 'bite'
                        ];
                        const basics = member.skills.filter(s => BASIC_ATTACK_KEYS.includes(s));
                        let specials = member.skills.filter(s => !BASIC_ATTACK_KEYS.includes(s));
                        specials = filterSpecialsByTier(specials, selectedTier);

                        if (member.type === 'ranger') {
                            if (!specials.includes('notch')) specials.push('notch');
                            if (!basics.includes('loose')) basics.push('loose');
                        } else if (member.type === 'sage') {
                            if (!basics.includes('heal')) basics.push('heal');
                        } else if (member.type === 'soldier') {
                            if (!basics.includes('slash')) basics.push('slash');
                        } else if (member.type === 'barbarian') {
                            if (!basics.includes('barbarian_slash')) basics.push('barbarian_slash');
                        }
                        member.skills = [...basics, ...specials];
                    } else {
                        member.specials = filterSpecialsByTier(member.specials || [], selectedTier);

                        // Ensure fundamental abilities are always available
                        if (member.type === 'ranger') {
                            member.specials = member.specials || [];
                            if (!member.specials.includes('notch')) member.specials.push('notch');
                            member.attacks = member.attacks || [];
                            if (!member.attacks.includes('loose')) member.attacks.push('loose');
                        } else if (member.type === 'sage') {
                            member.attacks = member.attacks || [];
                            if (!member.attacks.includes('heal')) member.attacks.push('heal');
                        } else if (member.type === 'soldier') {
                            member.attacks = member.attacks || [];
                            if (!member.attacks.includes('slash')) member.attacks.push('slash');
                        } else if (member.type === 'barbarian') {
                            member.attacks = member.attacks || [];
                            if (!member.attacks.includes('barbarian_slash')) member.attacks.push('barbarian_slash');
                        }
                    }

                    // Gear assignment
                    if (this.state.outfitWithEquipment) {
                        const tier = targetLevel >= 20 ? 3 : targetLevel >= 10 ? 2 : 1;
                        try {
                            const allWeapons = this.props.inventoryManager.weapons;
                            let tierWeapons = Object.entries(allWeapons)
                                .filter(([key, w]) => w && w.tier === tier)
                                .map(([key, w]) => {
                                    const cloned = clone(w);
                                    if (cloned) cloned._im_key = key;
                                    return cloned;
                                });

                            const isBow = (w) => {
                                const k = w._im_key || '';
                                  return k.endsWith('_bow') || k === 'merklins_peacekeeper' || w.range === 'far';
                            };
                            const isMartial = (w) => {
                                const k = w._im_key || '';
                                return k.endsWith('_sword') || k.endsWith('_axe') || w.range === 'close';
                            };

                            if (member.type === 'ranger') {
                                tierWeapons = tierWeapons.filter(isBow);
                            } else if (member.type === 'soldier' || member.type === 'barbarian') {
                                tierWeapons = tierWeapons.filter(isMartial);
                            } else {
                                tierWeapons = tierWeapons.filter(w => !isBow(w));
                            }

                            if (tierWeapons.length > 0) {
                                const weapon = clone(tierWeapons[Math.floor(Math.random() * tierWeapons.length)]);
                                weapon.equippedBy = member.id;
                                member.inventory = member.inventory || [];
                                member.inventory = member.inventory.filter(i => !i || i.type !== 'weapon');
                                member.inventory.push(weapon);
                            }
                        } catch (e) { }
                    }
                }
            });

            // Automatically equip archaic_rune on the first PC unit of the group that has a pet slot
            const firstPC = clonedCrew.find(member => member);
            if (firstPC) {
                try {
                    const archaicRuneBase = this.props.inventoryManager.runes['archaic_rune'];
                    if (archaicRuneBase) {
                        const archaicRune = clone(archaicRuneBase);
                        archaicRune._im_key = 'archaic_rune';
                        archaicRune.equippedBy = firstPC.id;
                        archaicRune.equippedSlot = 'pet';
                        firstPC.inventory = firstPC.inventory || [];
                        firstPC.inventory = firstPC.inventory.filter(i => !i || i.equippedSlot !== 'pet');
                        firstPC.inventory.push(archaicRune);
                    }
                } catch (e) {
                    console.warn('Simulator archaic rune default assignment failed', e);
                }
            }
        }

        // Calculate monster and minions synchronously
        const useMonsterKey = this.state.selectedMonsterKey || 'mummy';
        const useMinionKeys = this.state.selectedMinionKeys || [];
        let monster = this.props.monsterManager.getMonster(useMonsterKey);
        if (!monster) monster = this.props.monsterManager.getRandomMonster();
        let monsterName = this.pickRandom(monster.monster_names) || (monster.type ? monster.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown');
        monster.name = monsterName
        monster.inventory = [];
        if (this.state.lord) {
            monster.isLord = true;
        }

        let minions = [];
        useMinionKeys.forEach((key, i) => {
            if (!key) return;
            const minion = this.props.monsterManager.getMonster(key);
            if (!minion) return;
            minion.id = minion.id + (i * 10) + 700;
            minion.name = this.pickRandom(minion.monster_names) || (minion.type ? minion.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown');
            minion.inventory = [];
            minions.push(minion);
        });

        if (this.state.useReduxCombat) {
            this.reduxCombatManager = new CombatManagerRedux();
        } else {
            this.reduxCombatManager = null;
        }

        // Pre-load all character and monster portraits while showing the loader
        const startTime = Date.now();
        const crewPortraits = clonedCrew.map(m => m && m.portrait).filter(Boolean);
        const monsterPortraits = [monster, ...minions].map(m => m && m.portrait).filter(Boolean);
        const allPortraits = [...new Set([...crewPortraits, ...monsterPortraits])];

        await Promise.all(allPortraits.map(src => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve();
                img.onerror = () => resolve();
            });
        }));

        // Enforce a minimum display time of 1.8 seconds so loading feels smooth and premium
        const elapsed = Date.now() - startTime;
        const minDuration = 1800;
        if (elapsed < minDuration) {
            await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
        }

        this.setState({
            monster,
            minions,
            preppedCrew: clonedCrew,
            crewSelected: true,
            loadingSimulator: false
        });
    }
    clear = () => {
        // Clear only the simulator-local crew selection and temp manager; do not mutate global meta or the app's crewManager
        if (this.tempCrewManager) this.tempCrewManager.crew = [];
        this.setState({ selectedCrew: [] })
    }
    removeMember = (index) => {
        const crew = this.state.selectedCrew.slice();
        crew.splice(index, 1);
        this.setState({ selectedCrew: crew });
    }
    goBack = () => {
        this.setState({
            navToLanding: true
        })
    }
    useConsumableFromInventory = (item) => {
        let foundItem = this.props.inventoryManager.inventory.find(e => e.name === item.name),
            foundIndex = this.props.inventoryManager.inventory.findIndex(e => e.name === item.name);
        if (foundItem) {
            foundItem.animation = 'consumed';
            this.forceUpdate();
            setTimeout(() => {
                foundItem.animation = '';
                this.props.inventoryManager.removeItemByIndex(foundIndex);
                this.forceUpdate();
            }, 500);
        }
    }
    combatKeyDownHandler = (event) => {
        let key = event.key, code = event.code;
        const battleRef = this.monsterBattleComponentRef.current;
        const selectedFighter = battleRef?.state?.selectedFighter;
        const selectedCombatant = selectedFighter && this.props.combatManager?.getCombatant
            ? this.props.combatManager.getCombatant(selectedFighter.id)
            : null;
        if (
            selectedCombatant &&
            !selectedCombatant.isMonster &&
            !selectedCombatant.isMinion &&
            !event.metaKey &&
            this.props.combatManager &&
            typeof this.props.combatManager.startManualCommandCooldown === 'function'
        ) {
            this.props.combatManager.startManualCommandCooldown(selectedCombatant.id);
        }
        if (code === 'Space') {
            // Allow spacebar to fire a basic attack if a player fighter (not monster/minion) is selected
            if (battleRef && selectedCombatant && !selectedCombatant.isMonster && !selectedCombatant.isMinion) {
                event.preventDefault();
                battleRef.manualFire();
            }
        }
        switch (key) {
            // =/+ key: increase speed (decrease interval)
            case '=':
            case '+': {
                const current = this.props.combatManager?.FIGHT_INTERVAL;
                const idx = INTERVALS.indexOf(current);
                if (idx < INTERVALS.length - 1) {
                    this.updateCombatSpeed(INTERVALS[idx + 1]);
                }
                break;
            }
            // - key: decrease speed (increase interval)
            case '-': {
                const current = this.props.combatManager?.FIGHT_INTERVAL;
                const idx = INTERVALS.indexOf(current);
                if (idx > 0) {
                    this.updateCombatSpeed(INTERVALS[idx - 1]);
                }
                break;
            }
            case 'd':
                // ...existing code...
                debugger
                break;
            case 'p':
                let paused = !this.state.paused;
                this.props.combatManager.pauseCombat(paused)
                this.setState({
                    paused
                })
                break;
            case 'q':
                if (this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.selectSpecial();
                break;
            case 'w':
                if (this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.selectConsumableSpecial();
                break;
            case 'Tab':
                try { console.debug('[CombatSimulator] Tab pressed, shiftDown=', this.state.shiftDown, 'ctrlDown=', this.state.ctrlDown); } catch (e) { }
                event.preventDefault();
                if (this.state.shiftDown) {
                    if (this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToRetarget();
                } else if (this.state.ctrlDown) {
                    // ...existing code...
                } else {
                    if (this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
                }
                break;
            case 'Control':
                event.preventDefault();
                this.setState({ ctrlDown: true })
                break;
            case 'Shift':
                event.preventDefault();
                this.setState({ shiftDown: true })
                break;
            case 'ArrowUp':
                if (this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('up');
                break;
            case 'ArrowDown':
                if (this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('down');
                break;
            case 'ArrowLeft':
                if (this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('left');
                break;
            case 'ArrowRight':
                if (this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('right');
                break;
            default:
                // nuttin
                break;
        }
    }
    combatKeyUpListener = (event) => {
        let key = event.key;
        switch (key) {
            case 'Shift':
                this.setState({
                    shiftDown: false
                })
                break;
            case 'Control':
                this.setState({
                    ctrlDown: false
                })
                break;
            case 'q':
                if (this.state.specialDown) {
                    // cycle specials
                    // ...existing code...
                }
                this.setState({
                    specialDown: false
                })
                break;
            default:
                break;
        }
    }
    render() {
        const formatMonsterType = (type) => type ? type.replace(/_/g, ' ') : '';
        return (
            <div className="page-container">
                {this.state.loadingSimulator && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: '#0c0b0e',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999999,
                        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
                    }}>
                        <img 
                            src={loadingGif} 
                            alt="Loading..." 
                            style={{
                                width: '280px',
                                height: '280px',
                                objectFit: 'contain',
                                marginBottom: '24px',
                                filter: 'drop-shadow(0 0 20px rgba(192, 132, 252, 0.25))'
                            }}
                        />
                        <div style={{
                            color: '#c084fc',
                            fontSize: '18px',
                            fontWeight: '700',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                            textShadow: '0 0 10px rgba(192, 132, 252, 0.4)'
                        }}>
                            Preparing Combat Simulation
                        </div>
                        <div style={{
                            color: '#a1a1aa',
                            fontSize: '13px',
                            fontWeight: '400',
                            letterSpacing: '0.5px'
                        }}>
                            Loading high-resolution combat assets...
                        </div>
                    </div>
                )}
                {!this.state.crewSelected && <div className="crew-manager">
                    {this.state.navToLanding && <Redirect to='/' />}
                    <div className="content-container">
                        <div className="button-row-top">
                            <button onClick={() => this.exitSimulator()}>Back</button>
                        </div>
                        <div className="title">
                            Choose your crew
                            <button className="enemy-section-scroll-btn" onClick={this.scrollToEnemySection} title="Jump to enemy selection">
                                Enemies ↓
                            </button>
                        </div>
                        <div className="crew-selector" ref={this.crewSelectorRef}>
                            <div className="crew-options">
                                {this.state.options.map((e, i) => {
                                    const isSelected = this.state.selectedCrewMember && (
                                        this.state.selectedCrewMember.id === e.id || this.state.selectedCrewMember.name === e.name
                                    );
                                    return <div className={`portrait${isSelected ? ' selected' : ''}`} key={i}
                                        style={{ backgroundImage: "url(" + e.portrait + ")" }}
                                        onClick={(event) => this.selectCrewMember(event, e)}
                                    ></div>
                                }
                                )}
                            </div>
                            <div className="member-panel">
                                {this.state.selectedCrewMember && <div className='giant-portrait'
                                    style={{ backgroundImage: "url(" + this.state.selectedCrewMember.portrait + ")" }}
                                ></div>}
                                {this.state.selectedCrewMember && <div className="details-pane">
                                    <div className="member-name">{this.state.selectedCrewMember.name}</div>
                                    <div className="description">
                                        {this.state.selectedCrewMember.description}
                                    </div>
                                </div>}
                                {this.state.selectedCrewMember && <div className="stats-pane">
                                    <div className="stat">Strength: {this.state.selectedCrewMember.stats.str}</div>
                                    <div className="stat">Dexterity: {this.state.selectedCrewMember.stats.dex}</div>
                                    <div className="stat">Intelligence: {this.state.selectedCrewMember.stats.int}</div>
                                    {/* Vitality removed */}
                                    <div className="stat">Fortitude: {this.state.selectedCrewMember.stats.fort}</div>
                                </div>}
                                {this.state.selectedCrewMember && <div className="abilities-pane">
                                     {this.state.selectedCrewMember.skills ? (
                                         <div className="specials">Skills: &nbsp;
                                             {this.state.selectedCrewMember.skills.map((e, i) => {
                                                 const name = formatRosterSkillName(e);
                                                 return <div key={i}>{name}{i !== this.state.selectedCrewMember.skills.length - 1 ? ',' : ''} &nbsp; </div>
                                             })}
                                         </div>
                                     ) : (
                                         <>
                                             <div className="attacks">Attacks: &nbsp;
                                                 {this.state.selectedCrewMember.attacks.map((e, i) => {
                                                     const name = formatRosterSkillName(e);
                                                     return <div key={i}>{name}{i !== this.state.selectedCrewMember.attacks.length - 1 ? ',' : ''} &nbsp; </div>
                                                 })}
                                             </div>
                                             <div className="specials">Specials: &nbsp;
                                                 {this.state.selectedCrewMember.specials.map((e, i) => {
                                                     const name = formatRosterSkillName(e);
                                                     return <div key={i}>{name}{i !== this.state.selectedCrewMember.specials.length - 1 ? ',' : ''} &nbsp; </div>
                                                 })}
                                             </div>
                                         </>
                                     )}
                                    <div className="passives">Passives: &nbsp;
                                        {this.state.selectedCrewMember.passives.map((e, i) => {
                                            const name = formatRosterSkillName(e);
                                            return <div key={i}>{name}{i !== this.state.selectedCrewMember.passives.length - 1 ? ',' : ''} &nbsp; </div>
                                        })}
                                    </div>
                                    <div className="weaknesses" style={{ display: 'flex', alignItems: 'center' }}>Weaknesses: &nbsp;
                                        {renderWeaknessSymbols(this.state.selectedCrewMember.weaknesses)}
                                    </div>
                                </div>}
                            </div>
                            <div className="crew-tray">
                                {this.state.crewSlots.map((slot, i) => {
                                    return <div key={i} className="selected-crew-portrait-container">

                                        <div className={`add-button ${!this.state.selectedCrewMember ? 'disabled' : ''}`} onClick={() => this.addMember(i)}>&oplus;</div>

                                        {this.state.selectedCrew[i] && <div
                                            className="portrait"
                                            style={{ backgroundImage: "url(" + this.state.selectedCrew[i].portrait + ")" }}
                                            title="Double-click to remove"
                                            onClick={(e) => {
                                                const now = Date.now();
                                                const isDoubleTap = this._lastCrewRemoveTap === i && (now - this._lastCrewRemoveTapTime < 300);
                                                this._lastCrewRemoveTap = i;
                                                this._lastCrewRemoveTapTime = now;
                                                if (e.detail === 2 || isDoubleTap) {
                                                    this.removeMember(i);
                                                }
                                            }}
                                        ></div>}

                                        {this.state.selectedCrew[i] && <div className="sim-level-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                                            <button style={{ padding: '0 5px', fontSize: '11px', lineHeight: '16px' }}
                                                onClick={() => this.setSimLevel(this.state.selectedCrew[i].type, -1)}>−</button>
                                            <span style={{ fontSize: '11px', minWidth: '52px', textAlign: 'center', color: '#ccc' }}>
                                                Lv {this.getSimLevel(this.state.selectedCrew[i].type)}
                                            </span>
                                            <button style={{ padding: '0 5px', fontSize: '11px', lineHeight: '16px' }}
                                                onClick={() => this.setSimLevel(this.state.selectedCrew[i].type, 1)}>+</button>
                                        </div>}

                                        {this.state.selectedCrew[i] && <div className="sim-tier-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '11px', color: '#ccc' }}>Tier:</span>
                                            <select
                                                value={this.getSimSkillTier(this.state.selectedCrew[i].type)}
                                                onChange={(e) => this.setSimSkillTier(this.state.selectedCrew[i].type, Number(e.target.value))}
                                                style={{ fontSize: '11px', padding: '1px 2px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '3px' }}
                                            >
                                                <option value={1}>Tier 1</option>
                                                <option value={2}>Tier 2</option>
                                                <option value={3}>Tier 3</option>
                                                <option value={4}>Tier 4</option>
                                            </select>
                                        </div>}
                                    </div>
                                })}
                             </div>
                                <div className="sim-gear-option" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ccc', fontSize: '12px' }}>
                                    <input
                                        id="outfit-equipment-cb"
                                        type="checkbox"
                                        checked={this.state.outfitWithEquipment}
                                        onChange={e => this.setState({ outfitWithEquipment: e.target.checked })}
                                    />
                                    <label htmlFor="outfit-equipment-cb">Outfit with equipment</label>
                                </div>
                        </div>

                        {/* ── Enemy Selection Section ── */}
                        <div className="enemy-selection-section" ref={this.enemySectionRef}>
                            <div className="enemy-section-title">
                                Choose your enemies
                                <button
                                    className={`save-default-enemy-btn${this.state.defaultEnemySaved ? ' saved' : ''}`}
                                    onClick={this.saveDefaultEnemy}
                                    title="Save current enemy selection as default"
                                >
                                    {this.state.defaultEnemySaved ? '✓ Saved' : 'Save as default'}
                                </button>
                            </div>

                            {/* Main monster + 4 minion slots + Info panel */}
                            <div className="enemy-selection-container">
                                <div className="enemy-slots-row" style={{ margin: 0, flexWrap: 'nowrap' }}>
                                    {/* Main monster slot */}
                                    <div className="enemy-slot-group">
                                        <div className="enemy-slot-label">Monster</div>
                                        <div
                                            className={`enemy-slot ${!this.state.selectedMonsterKey ? 'empty' : ''}`}
                                            title={this.state.selectedMonsterKey ? 'Double-click to remove' : 'Select from roster below'}
                                            onClick={(e) => {
                                                const now = Date.now();
                                                const isDoubleTap = this._lastMonsterRemoveTap && (now - this._lastMonsterRemoveTapTime < 300);
                                                this._lastMonsterRemoveTap = true;
                                                this._lastMonsterRemoveTapTime = now;
                                                if (e.detail === 2 || isDoubleTap) {
                                                    this.removeEnemySlot('monster', 0);
                                                } else if (this.state.selectedMonsterKey) {
                                                    const m = this.props.monsterManager.getMonster(this.state.selectedMonsterKey);
                                                    this.setState({ selectedEnemyForInfo: m });
                                                }
                                            }}
                                        >
                                            {this.state.selectedMonsterKey && (() => {
                                                const m = this.props.monsterManager.getMonster(this.state.selectedMonsterKey);
                                                return m ? <div className="enemy-slot-portrait" style={{ backgroundImage: `url(${m.portrait})` }}></div> : null;
                                            })()}
                                            {!this.state.selectedMonsterKey && <span className="enemy-slot-placeholder">＋</span>}
                                        </div>
                                        <div className="enemy-slot-name">
                                            {(() => {
                                                if (this.state.selectedMonsterKey) {
                                                    const m = this.props.monsterManager.getMonster(this.state.selectedMonsterKey);
                                                    if (m) return formatMonsterType(m.type);
                                                }
                                                return '\u00a0';
                                            })()}
                                        </div>
                                        <div className="lord-checkbox-container" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ccc', fontSize: '12px', justifyContent: 'center' }}>
                                            <input
                                                id="lord-cb"
                                                type="checkbox"
                                                checked={this.state.lord || false}
                                                onChange={e => this.setState({ lord: e.target.checked })}
                                            />
                                            <label htmlFor="lord-cb" style={{ cursor: 'pointer', userSelect: 'none' }}>lord</label>
                                        </div>
                                    </div>

                                    {/* 4 minion slots */}
                                    {[0, 1, 2, 3].map(i => {
                                        const key = this.state.selectedMinionKeys[i];
                                        const m = key ? this.props.monsterManager.getMonster(key) : null;
                                        return (
                                            <div className="enemy-slot-group" key={i}>
                                                <div className="enemy-slot-label">Minion {i + 1}</div>
                                                <div
                                                    className={`enemy-slot ${!key ? 'empty' : ''}`}
                                                    title={key ? 'Double-click to remove' : 'Select from roster below'}
                                                    onClick={(e) => {
                                                        const now = Date.now();
                                                        const isDoubleTap = this._lastMinionRemoveTap === i && (now - this._lastMinionRemoveTapTime < 300);
                                                        this._lastMinionRemoveTap = i;
                                                        this._lastMinionRemoveTapTime = now;
                                                        if (e.detail === 2 || isDoubleTap) {
                                                            this.removeEnemySlot('minion', i);
                                                        } else if (m) {
                                                            this.setState({ selectedEnemyForInfo: m });
                                                        }
                                                    }}
                                                >
                                                    {m && <div className="enemy-slot-portrait" style={{ backgroundImage: `url(${m.portrait})` }}></div>}
                                                    {!key && <span className="enemy-slot-placeholder">＋</span>}
                                                </div>
                                                <div className="enemy-slot-name">
                                                    {m ? formatMonsterType(m.type) : '\u00a0'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Info panel for selected enemy — always rendered at fixed height so roster never shifts */}
                                <div className={`enemy-info-panel${this.state.selectedEnemyForInfo ? '' : ' enemy-info-panel--empty'}`} style={{ flex: '1', margin: 0, boxSizing: 'border-box' }}>
                                    {this.state.selectedEnemyForInfo && (<>
                                        <div className="enemy-info-portrait" style={{ backgroundImage: `url(${this.state.selectedEnemyForInfo.portrait})` }}></div>
                                        <div className="enemy-info-details">
                                            <div className="enemy-info-columns">
                                                {/* Left Column: Type, Level and Stats */}
                                                <div className="enemy-info-col-left">
                                                    <div className="enemy-info-type">{formatMonsterType(this.state.selectedEnemyForInfo.type)}</div>
                                                    <div className="enemy-info-stat" style={{ whiteSpace: 'nowrap' }}>Level: {this.state.selectedEnemyForInfo.level} &nbsp;|&nbsp; HP: {this.state.selectedEnemyForInfo.stats?.hp} &nbsp;|&nbsp; ATK: {this.state.selectedEnemyForInfo.stats?.atk} &nbsp;|&nbsp; DEF: {this.state.selectedEnemyForInfo.stats?.def}</div>
                                                </div>
                                                {/* Right Column: Skills and Weaknesses */}
                                                <div className="enemy-info-col-right">
                                                    {((this.state.selectedEnemyForInfo.skills?.length > 0) || (this.state.selectedEnemyForInfo.specials?.length > 0)) && (
                                                        <div className="enemy-info-stat">Skills: {((this.state.selectedEnemyForInfo.skills || this.state.selectedEnemyForInfo.specials) || []).map(s => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ')}</div>
                                                    )}
                                                    {this.state.selectedEnemyForInfo.weaknesses?.length > 0 && (
                                                        <div className="enemy-info-stat" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>Weaknesses: &nbsp; {renderWeaknessSymbols(this.state.selectedEnemyForInfo.weaknesses)}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>)}
                                </div>
                            </div>

                            {/* ── Random encounter row ── */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                marginTop: '10px',
                            }}>
                                <button
                                    id="random-combat-btn"
                                    onClick={this.startRandomCombat}
                                    style={{
                                        padding: '7px 18px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        letterSpacing: '0.5px',
                                        background: 'rgba(139, 92, 246, 0.15)',
                                        color: '#a78bfa',
                                        border: '1px solid rgba(139, 92, 246, 0.45)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.18s ease',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.28)';
                                        e.currentTarget.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.25)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    Random
                                </button>
                                <select
                                    id="random-tier-points-select"
                                    value={this.state.randomTierPoints}
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        this.setState({ randomTierPoints: val });
                                        const meta = getMeta();
                                        if (!meta.simulatorDefaults) meta.simulatorDefaults = {};
                                        meta.simulatorDefaults.randomTierPoints = val;
                                        storeMeta(meta);
                                    }}
                                    title="Total tier points for random encounter"
                                    style={{
                                        background: '#1a1a1f',
                                        color: '#a78bfa',
                                        border: '1px solid rgba(139, 92, 246, 0.35)',
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        width: '52px',
                                        textAlign: 'center',
                                    }}
                                >
                                    {[1,2,3,4,5,6,7,8,9].map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Monster roster */}
                            <div className="monster-roster-label">Monster Roster — click to select, click again to add to slot</div>
                            <div className="monster-roster">
                                {Object.values(this.props.monsterManager.monsters)
                                    .filter(m => ['skeleton', 'goblin', 'ogre', 'troll', 'mummy', 'wraith', 'vampire', 'gorgon', 'witch', 'beholder', 'beholder_minion', 'kabuki_demon', 'djinn', 'dragon', 'sphinx', 'goat_demon', 'cyclops', 'horned_pet', 'high_priest_of_the_basilisk', 'basilisk_cultists', 'shade', 'hashmallim', 'hagigah', 'blalok'].includes(m.key))
                                    .map((m, i) => (
                                        <div
                                            key={i}
                                            className="monster-roster-portrait"
                                            style={{ backgroundImage: `url(${m.portrait})` }}
                                            title={formatMonsterType(m.type)}
                                            onClick={() => {
                                                if (this.state.selectedEnemyForInfo && this.state.selectedEnemyForInfo.key === m.key) {
                                                    this.addEnemyFromRoster(m.key);
                                                } else {
                                                    this.setState({ selectedEnemyForInfo: m });
                                                }
                                            }}
                                        >
                                            <div className="monster-roster-name">{formatMonsterType(m.type)}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="simulator-bottom-actions">
                            <div className="button-row-bottom-left">
                                <button onClick={() => this.clear()}>Clear</button>
                            </div>
                            <div className="button-row">
                                <button onClick={() => this.submit()}>Submit</button>
                            </div>
                        </div>
                    </div>
                </div>}


                {this.state.crewSelected && <div>
                    <MonsterBattle
                        isSimulation={true}
                        exitSimulator={this.exitSimulator}
                        ref={this.monsterBattleComponentRef}
                        overlayManager={this.props.overlayManager}
                        combatManager={this.state.useReduxCombat ? this.reduxCombatManager : (this.props.combatManager || null)}
                        inventoryManager={this.props.inventoryManager}
                        animationManager={this.props.animationManager}
                        crewManager={this.tempCrewManager || this.props.crewManager || null}
                        crew={this.state.preppedCrew || null}
                        monster={this.state.monster ? JSON.parse(JSON.stringify(this.state.monster)) : null}
                        minions={this.state.minions ? JSON.parse(JSON.stringify(this.state.minions)) : null}
                        battleOver={this.battleOver || null}
                        paused={this.state.paused || null}
                        setNarrativeSequence={this.props.setNarrativeSequence || null}
                        useConsumableFromInventory={this.useConsumableFromInventory || null}
                        intervals={INTERVALS}
                        intervalDisplayNames={INTERVAL_DISPLAY_NAMES}
                    ></MonsterBattle>
                </div>}
            </div>
        )
    }
}

export default CrewManagerPage;