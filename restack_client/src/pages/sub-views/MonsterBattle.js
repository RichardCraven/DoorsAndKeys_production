// Force sync battleData from combatManager (including VCT positions)
import React from 'react'
// Show/hide tile coordinates overlay
import '../../styles/monster-battle.scss'
import * as images from '../../utils/images'
// import AnimationTile from '../../components/animation-tile';
import AnimationGrid from '../../components/animation-grid';
import { CModal } from '@coreui/react';
import '../../styles/inventory-modal.scss';
import { Redirect } from "react-router-dom";
import {storeMeta, getMeta, getUserId} from '../../utils/session-handler';
import {
        updateUserRequest,
        deleteDungeonRequest
    } from '../../utils/api-handler';
import Canvas from '../../components/Canvas/canvas'
// import Overlay from '../../components/Overlay'
// import CanvasMagicMissile from '../../components/Canvas/canvas_magic_missile'
import FightersCombatGrid from '../../components/combat-panes/fighters'
import MonstersCombatGrid from '../../components/combat-panes/monsters'

import { INTERVALS, INTERVAL_DISPLAY_NAMES } from '../../utils/shared-constants';

// const MAX_DEPTH = 7;
const NUM_COLUMNS = 8;
// ^ means 8 squares, account for depth of 0 is far left

const MAX_ROWS = 6;
const TILE_SIZE = 100;
const SHOW_TILE_BORDERS = true;
const SHOW_COMBAT_BORDER_COLORS = false;
const SHOW_INTERACTION_PANE = true;
const SHOW_MONSTER_IDS = false;
const SHOW_COORDINATES = false;

// const RANGES = {
//     close: 1,
//     medium: 3,
//     far: 5
// }

// Duration (ms) must match the CSS death animation/transition duration
const DEATH_ANIMATION_DURATION = 2200;


// const SHOW_BORDERS = true;
class MonsterBattle extends React.Component {
    getGameSpeed = () => {
        return this.props.combatManager?.FIGHT_INTERVAL;
    }

    setGameSpeed = (newInterval) => {
        if (this.props.combatManager) {
            this.props.combatManager.updateAllFightIntervals(newInterval);
            // Persist to meta
            const meta = getMeta();
            meta.combatSpeed = newInterval;
            storeMeta(meta);
            if (typeof this.forceUpdate === 'function') this.forceUpdate();
        }
    }
    // lifecycle methods implemented further below

    // All keydown logic removed; now handled in CombatSimulator

    enableManualModeForSelectedFighter = () => {
        // Implement logic to enable manual control for the selected fighter
        // For example, set a flag in state or call a combatManager method
        if (this.state.selectedFighter) {
            this.props.combatManager.setManualControl(this.state.selectedFighter.id, true);
            this.setState({ manualControl: true });
        }
    }
    // Allow AI to trigger glyph/special casting using the same path as the UI
    // Allow AI to fire glyphs without requiring the fighter to be selected
    fireSpecialForAI = (fighter, glyph = null) => {
        if (glyph) {
            // If a consumable/spell glyph was provided by AI, remove one
            // instance from the fighter's consumable specialActions so the
            // UI reflects the usage immediately. Use a best-effort match by
            // reference, subtype, or name.
            try {
                if (fighter && Array.isArray(fighter.specialActions)) {
                    const matchIndex = fighter.specialActions.findIndex(sa => {
                        if (!sa) return false;
                        if (sa === glyph) return true;
                        if (glyph.subtype && sa.subtype && sa.subtype === glyph.subtype) return true;
                        if (glyph.name && sa.name && sa.name === glyph.name) return true;
                        return false;
                    });
                    if (matchIndex !== -1) {
                        fighter.specialActions.splice(matchIndex, 1);
                        // Notify local component state to re-render immediately
                        try { this.applyFighterUpdate(fighter); } catch (err) { console.warn('applyFighterUpdate failed', err); }
                    }
                }
            } catch (err) {
                console.warn('fireSpecialForAI: failed to remove glyph from fighter.specialActions', err);
            }

            this.fireGlyph(glyph, fighter);
        } else {
            // fallback: set selectedFighter for other specials
            this.setState({ selectedFighter: fighter }, () => {
                this.fireSpecial(null);
            });
        }
    }
    // ── Shield Wall registration / expiry ─────────────────────────────────────
    registerShieldWall = (wallData, fighter) => { // eslint-disable-line no-unused-vars
        this.setState(prev => ({
            activeWalls: [...prev.activeWalls, { ...wallData, id: `wall_${Date.now()}` }]
        }));
    }
    expireShieldWall = (wallData, fighter) => { // eslint-disable-line no-unused-vars
        if (!wallData) return;
        this.setState(prev => ({
            activeWalls: prev.activeWalls.filter(w => w.callerId !== wallData.callerId)
        }));
    }
    // ─────────────────────────────────────────────────────────────────────────
    removeDeadCombatantAfterDelay = (id) => {
            if (this.props.combatManager && typeof this.props.combatManager.removeCombatant === 'function') {
                this.props.combatManager.removeCombatant(id);
            }
            // Optionally, remove overlays for this id from overlayManager if present
            if (this.props.overlayManager && typeof this.props.overlayManager.removeCombatant === 'function') {
                this.props.overlayManager.removeCombatant(id);
            } else if (this.props.overlayManager && this.props.overlayManager.overlays) {
                // Fallback: delete overlays directly if no method
                delete this.props.overlayManager.overlays[id];
            }
    }
    constructor(props){
        super(props)
        // mount flag to avoid setState on unmounted component warnings
        this._isMounted = false;
        this.state = {
            message: '',
            combatStarted : false,
            source: null,
            indicatorsMatrix: {},
            attackType: '',
            target: null,
            battleData: {},
            animationData: {tiles: []},
            catcher: null,
            selectedFighter: null,
            selectedMonster: null,
            selectedAttack: null,
            hoveredAttackTile: null,
            hoveredInventoryTile: null,
            hoveredSpecialTile: null,
            hoveredGlyphTile: null,
            showCrosshair: false,
            portraitHoveredId: null,
            greetingInProcess: true,
            combatTiles: [],
            draggedOverCombatTileId: null,
            draggingFighter: null,
            ghostPortraitMatrix: [],
            showSummaryPanel: false,
            suppressSummaryPortraits: false,
            isFinalDeath: false,
            // Inventory popup visibility
            showInventoryPopup: false,
            summaryMessage: '',
            experienceGained: null,
            goldGained: null,
            foodGained: 0,
            stolenItems: [],
            levelTransitions: {},
            battleResult: null,
            monsterPortrait: '',
            navToDeathScene: false,
            glyphTrayExpanded: false,
            arrowUpImage: null,
            animationOverlays: [],
            magicMissile_fire: false,
            magicMissile_connectParticles: true,
            magicMissile_targetDistance: 0,
               magicMissile_targetLaneDiff: 0,
            teleportingFighterId: null,
            // Active shield walls: array of wallData objects
            activeWalls: [],
            // Board-wide fear overlay
            boardFearActive: false,
            // Transient glow on the casting monster portrait when induce_fear fires
            fearCastingActive: false,
            combatLog: [],
        }
        this.combatLogContainerRef = React.createRef();
        this.latestCombatLogEntryRef = React.createRef();
        // Internal flags for special group-death flow
        this._suppressPersistFinalHP = false;
        // Internal flag to ensure we only inject wizard spells once for simulation battles
        this._wizardSpellsEnsured = false;
        // Track timers/intervals created by this component so we can clear them on unmount
        this._timers = [];
        this._intervals = [];
        this._setTimeout = (fn, t) => { const id = setTimeout(fn, t); try { this._timers.push(id); } catch(e){}; return id };
        this._setInterval = (fn, t) => { const id = setInterval(fn, t); try { this._intervals.push(id); } catch(e){}; return id };
    }

    // Public method to force sync battleData from combatManager (including VCT positions)
    forceSyncBattleData = () => {
        if (this.props.combatManager && this.props.combatManager.combatants) {
            // Deep clone to ensure React state update
            const clonedBattleData = JSON.parse(JSON.stringify(this.props.combatManager.combatants));
            this.updateBattleData(clonedBattleData);
            console.log('[DIAG][MonsterBattle] forceSyncBattleData called.');
        } else {
            console.warn('[MonsterBattle] forceSyncBattleData: combatManager or combatants missing');
        }
    }

    componentDidMount(){
        console.log('MonsterBattle mounted with props: ', this.props);

        // mark mounted so async callbacks can safely call setState
        this._isMounted = true;
        // Reset any previous group-death suppression flag and one-time guards
        // when mounting a new battle. This prevents prior battle state from
        // affecting subsequent battles if the component instance is reused.
        this._suppressPersistFinalHP = false;
        this._gameOverHandled = false;
        this._goldAwarded = false;
        // Reset UI state that persists across remounts (shield walls, fear, etc.)
        this.setState({ activeWalls: [], boardFearActive: false, fearCastingActive: false });

        // --- FIX: Ensure combatManager resets combatants and removes all active enemies ---
        if (this.props.combatManager && typeof this.props.combatManager.reset === 'function') {
            this.props.combatManager.reset();
        }

        this.props.combatManager.initialize();
        this.props.combatManager.connectOverlayManager(this.props.overlayManager)
        this.props.combatManager.connectAnimationManager(this.props.animationManager);

        // Log computed movement-related stats for debugging (speed/dex/moveCooldown)
        try {
            const cm = this.props.combatManager;
            if (cm && cm.combatants) {
                const speeds = Object.values(cm.combatants).map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    dex: c.stats && c.stats.dex,
                    speed: c.stats && c.stats.speed,
                    moveCooldown: c.moveCooldown,
                    movesPerTurnCycle: c.movesPerTurnCycle
                }));
                console.log('Initial combatant movement stats:', speeds);
            }
        } catch (e) { console.warn('Failed to log initial combatant speeds', e); }

        // Wire Monk teleport callback to set teleportingFighterId
        const monkAI = this.props.combatManager.fighterAI?.roster?.monk;
        if (monkAI) {
            monkAI.onTeleport = (caller) => {
                // debugger
                this.setState({ teleportingFighterId: caller.id });
                // Optionally clear after a tick for animation
                this._setTimeout(() => {
                    this.setState({ teleportingFighterId: null });
                }, 100);
            };
        }

        let arr = [], ghostPortraitMatrix = [];
    for(let i = 0; i < MAX_ROWS*NUM_COLUMNS; i++){
            let x = i%NUM_COLUMNS,
            y = Math.floor(i/NUM_COLUMNS)
            arr.push({
                id: i,
                x,
                y 
            })
            ghostPortraitMatrix.push(null)
        }
        
        // const crewLeader = this.props.crew.find(e=>e.isLeader)

        // combat manager callbacks
        this.establishMessageCallback();
        this.establishUpdateMatrixCallback();
        this.establishUpdateActorCallback();
        this.establishUpdateDataCallback();
        this.establishMorphPortraitCallback();
        this.establishGreetingCompleteCallback();
        this.establishGameOverCallback();
        this.establishOnFighterMovedToDestinationCallback();
        // Ensure both removal and selection logic are called for all combatants
        this.props.combatManager.establishOnFighterDeathCallback((id) => {
            // Wait for the death animation duration before removing
            this._setTimeout(() => {
                this.removeDeadCombatantAfterDelay(id);
            }, DEATH_ANIMATION_DURATION);
            this.handleFighterDeath(id);
        });

        // Wire up inventory callbacks so AI can read and consume communal/personal potions
        try {
            if (this.props.combatManager && typeof this.props.combatManager.establishGetCurrentInventoryCallback === 'function') {
                // Return the actual inventory objects (inventory) not the list of item keys (items)
                this.props.combatManager.establishGetCurrentInventoryCallback(() => {
                    try { return (this.props.inventoryManager && Array.isArray(this.props.inventoryManager.inventory)) ? this.props.inventoryManager.inventory : []; } catch (e) { return []; }
                });
            }
        } catch (e) {}
        try {
            if (this.props.combatManager && typeof this.props.combatManager.establishUseConsumableCallback === 'function') {
                this.props.combatManager.establishUseConsumableCallback((item) => {
                    try { if (this.props.useConsumableFromInventory) this.props.useConsumableFromInventory(item); } catch (e) { console.warn('useConsumableCallback failed', e); }
                });
            }
        } catch (e) {}
        try {
            if (this.props.combatManager && typeof this.props.combatManager.establishStolenItemCallback === 'function') {
                this._stolenItems = [];
                this.props.combatManager.establishStolenItemCallback((itemKey, itemName, itemIconKey = null) => {
                    try { if (this.props.inventoryManager) this.props.inventoryManager.removeItemByKey(itemKey); } catch (e) {}
                    this._stolenItems = this._stolenItems || [];
                    this._stolenItems.push({ itemName, itemIconKey });
                });
            }
        } catch (e) {}
        
        //overlay manager callbacks
        // this.establishInitializeOverlayManagerCallback();
        this.establishBroadcastNewAnimationCallback();
        
        // /animation CB
        this.establishUpdateAnimationDataCallback();
        // this.establishAnimationCallback();

        // Wire board-wide event callback (e.g. induce_fear overlay)
        this.props.combatManager.establishBoardEventCallback((eventType, data) => {
            if (eventType === 'induce_fear') {
                this.setState({ boardFearActive: true, fearCastingActive: true });
                const duration = (data && data.duration) ? data.duration : 20000;
                this._setTimeout(() => {
                    this.setState({ boardFearActive: false });
                }, duration);
                // Glow persists only for the cast moment, not the full fear duration
                this._setTimeout(() => {
                    this.setState({ fearCastingActive: false });
                }, 1800);
            }
        });

        // For simulation battles: seed a tier-1 weapon into the group inventory so
        // goblin sticky-fingers has a valid item to steal during testing.
        if (this.props.isSimulation && this.props.inventoryManager &&
                typeof this.props.inventoryManager.addItemsByName === 'function') {
            this.props.inventoryManager.addItemsByName(['shortsword_sword']);
        }

        // Ensure every crew member's equipped weapons reflect the current
        // damage/stat values from inventory-manager before combat begins.
        if (this.props.inventoryManager && typeof this.props.inventoryManager.refreshWeaponStats === 'function') {
            (this.props.crew || []).forEach(member => {
                if (member && Array.isArray(member.inventory)) {
                    member.inventory = this.props.inventoryManager.refreshWeaponStats(member.inventory);
                }
            });
        }

        this.props.combatManager.initializeCombat({
            crew: this.props.crew,
            leader: this.getCrewLeader(),
            monster: this.props.monster,
            minions: this.props.minions

        })

        this.props.animationManager.initialize(NUM_COLUMNS, MAX_ROWS);

        this.setState({
            combatTiles: arr, ghostPortraitMatrix,
            monsterPortrait: this.props.monster.portrait
        })

        // Log again after initializeCombat so we capture populated combatants
        try {
            const cm2 = this.props.combatManager;
            if (cm2 && cm2.combatants) {
                const speeds2 = Object.values(cm2.combatants).map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    dex: c.stats && c.stats.dex,
                    speed: c.stats && c.stats.speed,
                    moveCooldown: c.moveCooldown,
                    movesPerTurnCycle: c.movesPerTurnCycle
                }));
                console.log('Initial combatant movement stats (after initializeCombat):', speeds2);
            }
        } catch (e) { console.warn('Failed to log post-initialize combatant speeds', e); }

        // Wire the MonsterBattle component instance into the AI roster so
        // fighter profiles (e.g. Wizard) can call back to update UI state
        // directly. This is a best-effort hookup; other pages (CombatSimulator)
        // may also wire the ref.
        try {
            if (this.props.combatManager && this.props.combatManager.fighterAI && this.props.combatManager.fighterAI.roster && this.props.combatManager.fighterAI.roster.wizard) {
                this.props.combatManager.fighterAI.roster.wizard.monsterBattleRef = this;
            }
        } catch (err) {
            console.warn('failed to wire monsterBattleRef to wizard AI', err);
        }
        try {
            if (this.props.combatManager && this.props.combatManager.fighterAI && this.props.combatManager.fighterAI.roster && this.props.combatManager.fighterAI.roster.soldier) {
                this.props.combatManager.fighterAI.roster.soldier.monsterBattleRef = this;
            }
        } catch (err) {
            console.warn('failed to wire monsterBattleRef to soldier AI', err);
        }

        let arrowUp = new Image()
        arrowUp.src = images['arrowUp']
        let that = this;
        arrowUp.onload = function(){
            that.setState({
                arrowUpImage: arrowUp
            })
        }
        // key handling moved to parent DungeonPage
    }
    componentDidUpdate(prevProps, prevState) {
        // When the summary panel appears, schedule clearing of any
        // `justLeveled` flags recorded on crew members so the arrow and
        // gain details are only visible temporarily. We clear the flags on
        // the authoritative CrewManager and then force a re-render.
        try {
            if (!prevState.showSummaryPanel && this.state.showSummaryPanel) {
                const crew = (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew : [];
                crew.forEach((m) => {
                    if (m && m.justLeveled) {
                        // schedule clearing after the summary animation/timeout
                        this._setTimeout(() => {
                            try {
                                if (this.props.crewManager && typeof this.props.crewManager.clearLevelFlags === 'function') {
                                    this.props.crewManager.clearLevelFlags(m);
                                }
                                // ensure UI updates
                                try { this.forceUpdate(); } catch(e){}
                            } catch (err) {
                                console.warn('Failed to clear level flags for member', m, err);
                            }
                        }, 3500);
                    }
                });
            }
        } catch (err) {
            console.warn('componentDidUpdate: level-flag clearing failed', err);
        }

        if (prevState.combatLog.length !== this.state.combatLog.length && this.latestCombatLogEntryRef.current) {
            try {
                this.latestCombatLogEntryRef.current.scrollIntoView({
                    block: 'center',
                    behavior: 'smooth'
                });
            } catch (err) {
                console.warn('componentDidUpdate: combat-log scroll failed', err);
            }
        }
    }
    componentWillUnmount() {
        // mark unmounted to prevent async callbacks attempting setState
        try { this._isMounted = false; } catch(e){}
        // Best-effort: disconnect combat manager callbacks so no further calls come in
        try { if (this.props && this.props.combatManager && typeof this.props.combatManager.shutdown === 'function') this.props.combatManager.shutdown(); } catch(e){}
        try { if (this.props && this.props.combatManager && typeof this.props.combatManager.disconnectOverlayManager === 'function') this.props.combatManager.disconnectOverlayManager(); } catch(e){}
        // Flush all canvas and tile animations immediately so in-flight missiles,
        // fireballs etc. can't appear at the start of the next combat session.
        try { if (this.props && this.props.animationManager && typeof this.props.animationManager.reset === 'function') this.props.animationManager.reset(); } catch(e){}
        // Clear any timers/intervals this component created
        try { if (Array.isArray(this._timers)) { this._timers.forEach(t => clearTimeout(t)); this._timers = []; console.log('[MonsterBattle] Cleared this._timers'); } } catch(e){}
        try { if (Array.isArray(this._intervals)) { this._intervals.forEach(i => clearInterval(i)); this._intervals = []; console.log('[MonsterBattle] Cleared this._intervals'); } } catch(e){}
        // Deep diagnostic: log state of combatManager and timers at unmount
        try {
            if (this.props && this.props.combatManager) {
                console.log('[MonsterBattle] componentWillUnmount: combatManager state:', JSON.parse(JSON.stringify(this.props.combatManager.combatants)));
            }
        } catch (e) { console.warn('[MonsterBattle] componentWillUnmount: failed to log combatManager state', e); }
    }
    monster = () => {
        // console.log('monster: ', this.state.battleData[this.props.monster.id]);
        return this.state.battleData[this.props.monster.id]
    }
    getFighterDetails = (propsRefFighter) => {
        // console.log('monster: ', this.state.battleData[this.props.monster.id]);
        return this.state.battleData[propsRefFighter.id]
    }
    targetOf = (caller) => {
        let c = this.state.battleData[caller.id],
        target = c.targetId ? this.state.battleData[c.targetId] : null;
        return target
    }
    monsterDirectionReversed = () => {
        if(!this.monster()) return false
        return this.monster()?.coordinates.x < this.targetOf(this.monster())?.coordinates.x
    }
    minionDirectionReversed = (minionReference) => {
        const minion = this.state.battleData[minionReference.id]
        if(!minion || !minion.targetId) return false
        return minion?.coordinates?.x < this.targetOf(minion)?.coordinates.x
    }
    getHitAnimation = (combatant) => {
        if(!combatant || !combatant.wounded) return '';
        return `hit-from-${combatant.wounded.sourceDirection}-${combatant.wounded.severity}`
    }

    // Small helper to convert small counts to Roman numerals for UI badges
    romanNumeral = (n) => {
        if (!n || n <= 0) return '';
        const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
        return roman[Math.min(n, roman.length - 1)];
    }

    // fighterFacingRight = (fighter) => {
    //     return this.props.combatManager.fighterFacingRight(fighter)
    // }
    // fighterFacingUp = (fighter) => {
    //     if(!fighter) return
    //     return this.props.combatManager.fighterFacingUp(fighter)
    // }
    // fighterFacingDown = (fighter) => {
    //     if(!fighter) return
    //     return this.props.combatManager.fighterFacingDown(fighter)
    // }
    // monsterFacingUp = (monster) => {
    //     return this.props.combatManager.monsterFacingUp(monster)
    // }
    // monsterFacingDown = (monster) => {
    //     return this.props.combatManager.monsterFacingDown(monster)
    // }
    milliDelay = (numMilliseconds) => {
        return new Promise((resolve) => {
            this._setTimeout(()=>{
                resolve(numMilliseconds, ' complete')
            }, numMilliseconds)
        })
    }
    morphPortrait = () => {
        let stringBase = 'witch_p1_', count = 1, string;
        const morphInterval = this._setInterval(()=>{
            string = stringBase+count;
            this.setState({
                monsterPortrait: images[string]
            })
            count++
            if(count > 8) clearInterval(morphInterval)
        }, 300)
    }
    greetingComplete = () => {
        this.combatBegins()
        this.setState({greetingInProcess: false})
    }
    tabToFighter = () => {
        const liveCrew = this.getSortedLiveCrew();
        if (liveCrew.length === 0) return;
        const currentIndex = this.state.selectedFighter ? liveCrew.findIndex(e => e.id === this.state.selectedFighter.id) : -1;
        const nextIndex = currentIndex === liveCrew.length - 1 ? 0 : currentIndex + 1;
        const selectedFighter = liveCrew[nextIndex];
        if (!selectedFighter) return;
        if (this.props.combatManager && typeof this.props.combatManager.setSelectedFighter === 'function') {
            this.props.combatManager.setSelectedFighter(selectedFighter);
        }

        // Do NOT enable manual mode here; just select the fighter
        this.setState({
            selectedFighter,
            glyphTrayExpanded: selectedFighter.type === 'wizard',
            manualControl: false // Ensure manual mode is off when tabbing
        })
    }
    tabToRetarget = () => {
        if(!this.state.selectedFighter) return
        this.props.combatManager.manualRetarget(this.state.selectedFighter)
    }
    selectSpecial = () => {
        let selectedFighter = this.state.selectedFighter;
        let specials = selectedFighter?.specials;
        let consumableSpecials = selectedFighter?.specialActions;
        let currentSpecialIndex = specials.findIndex(a=> a.selected)
        specials.forEach(a=>a.selected = false)
        if(consumableSpecials.length){
            consumableSpecials.forEach(a=>a.selected = false) 
        }



        if(currentSpecialIndex >= 0){
            
            if(specials[currentSpecialIndex + 1]){
                specials[currentSpecialIndex + 1].selected = true;
            } else {
                // all cleared
            }
        } else {
            specials[0].selected = true;
        }
    }
    selectConsumableSpecial = () => {
        let selectedFighter = this.state.selectedFighter;
        let specials = selectedFighter?.specials;
        let consumableSpecials = selectedFighter?.specialActions;
        
        let currentSpecialIndex = consumableSpecials.findIndex(a=> a.selected);
        consumableSpecials.forEach(a=>a.selected = false)
        if(specials) specials.forEach(a=>a.selected = false)
            // currentSpecialIndex available for diagnostics
        // console.log('consumableSpecials: ', consumableSpecials, 'currentindex: ', currentSpecialIndex);
        if(currentSpecialIndex >= 0){
            if(consumableSpecials[currentSpecialIndex + 1]){
                consumableSpecials[currentSpecialIndex + 1].selected = true;
            } else {
                // all cleared
            }
        } else {
            consumableSpecials[0].selected = true;
        }
    }
    getActionBarLeftValForFighter = (id) => {
    // Determine the left pixel position for the action bar. For vertical facings
    // (up/down) we treat them like non-left-facing so the bar aligns over the
    // fighter rather than shifting left by the range width.
    const selectedFighter = this.state.battleData[id];
    const details = this.getFighterDetails(selectedFighter);
    const baseX = (details?.coordinates.x || 0) * 100;
    // Use the fighter details when asking combatManager for the range width
    const rangeWidth = this.props.combatManager.getRangeWidthVal(details) || 0;
    // If the fighter is explicitly facing left, offset to the left by the range width;
    // otherwise (right, up, down, or undefined) place the bar to the right.
    const offset = (selectedFighter?.facing === 'left') ? (0 - (rangeWidth * 100)) : 100;
    return baseX + offset;
    }
    fighterPortraitClicked = (id) => {
        const selectedFighter = this.state.battleData[id];
        const crewMember = this.props.crew.find(e => e.id === id);
        if (crewMember && crewMember.portrait) {
            selectedFighter.portrait = crewMember.portrait;
        }
        if(this.state.showCrosshair){
            this.props.combatManager.queueAction(this.state.selectedFighter.id, id, this.state.selectedAttack)
            this.setState({
                showCrosshair: false
            })
        } else {
            this.props.combatManager.setSelectedFighter(selectedFighter)
            this.setState({
                selectedFighter,
                selectedMonster: null,
                selectedAttack: null
            })
        }
    }
    pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }

    getCrewLeader = () => {
        return this.props.crew.find(e=>e.isLeader)
    }

    setMessage = (messageData) => {
        const {message, source} = messageData;
        this.setState({
            message,
            source
        })
    }
    renderAnimation = () => {
        // nothin
    }
    updateIndicatorsMatrix = (indicatorsMatrix) => {
        this.setState({
            indicatorsMatrix
        })
    }
    getAllOverlaysById = (id) => {
        const animationsMatrix = this.state.animationOverlays[id].animations;
        let finalVal = [];
        Object.values(animationsMatrix).forEach(e=>{
            finalVal = finalVal.concat(e);
        })
        return finalVal;
    }
    // initializeOverlayManager = (combatants) => {
    //     console.log('initializing overlay manager (from MB), combatants: ', combatants);
    //     combatants.forEach(c=>{
    //         this.props.overlayManager.addCombatant(c)
    //     })
    //     console.log('finally, overlayManager matrix: ', this.props.overlayManager.overlays);
    //     this.props.overlayManager.launchUpdateInterval()
    // }
    recieveAnimationBroadcastFromOverlayManager = (animationOverlaysUpdated) => {
        // const animationOverlays = this.state.animationOverlays;÷
        // switch(broadcastType){
        //     case 'add':
        //         animationOverlays.push(data.animation)
        //     break;
        //     case 'update':
        //         const overlay = animationOverlays.find(a=>a.id === data.id)
        //         console.log('found overlay: ', overlay);
        //     break;
        // }
        this.setState({
            animationOverlays: animationOverlaysUpdated
        })
        // console.log('animation overlays from state: ', this.state.animationOverlays);
    }
    updateBattleData = (battleData) => {
        // Deep clone to ensure new reference for React
        // if (Object.values(battleData).some(e => e.dead)) {
        //     console.log('*****************battleData update received in MB   ', battleData);
        //     debugger;
        // }
        const clonedBattleData = JSON.parse(JSON.stringify(battleData));

        // Ensure wizards have at least 3 "magic missile" spells available in their specialActions
        // Only for simulation-originated battles, and only once per component instance.
        if (this.props.isSimulation && !this._wizardSpellsEnsured) {
            this.ensureWizardSpells(clonedBattleData);
            this._wizardSpellsEnsured = true;
        }

        // Normalize battleData entries to ensure UI rendering doesn't get tripped
        // by missing fields (portrait, damageIndicators). This helps avoid
        // empty portrait placeholders if an upstream producer omitted the field.
        try {
            Object.values(clonedBattleData).forEach(entry => {
                if (!entry) return;
                if (typeof entry.portrait === 'undefined' || entry.portrait === null) {
                    // Use canonical avatar fallback
                    entry.portrait = images['avatar'];
                }
                if (!Array.isArray(entry.damageIndicators)) entry.damageIndicators = [];
                            if (!Array.isArray(entry.damageIndicators)) console.log('[DIAG][MonsterBattle] Initialized entry.damageIndicators as empty array for', entry);
            });
        } catch (err) {
            console.warn('updateBattleData: normalization failed', err);
        }

        const combatLog = this.props.combatManager && typeof this.props.combatManager.getCombatLog === 'function'
            ? this.props.combatManager.getCombatLog()
            : [];

        this.setState({
            battleData: clonedBattleData,
            combatLog
        }, () => {
            // If nothing is selected yet, pick the default top-most / left-most crew member
            if (!this.state.selectedFighter) {
                const liveCrew = this.getSortedLiveCrew();
                if (liveCrew && liveCrew.length) {
                    const first = liveCrew[0];
                    // inform combatManager (authoritative) and update local state
                    if (this.props.combatManager && typeof this.props.combatManager.setSelectedFighter === 'function') {
                        this.props.combatManager.setSelectedFighter(first);
                    }
                    this.setState({
                        selectedFighter: first,
                        glyphTrayExpanded: first.type === 'wizard',
                        greetingInProcess: false // show interaction pane by default
                    });
                }
            }
        })
        // NOTE: persistence of HP/dead should only occur when combat ends
        // to avoid excessive writes; see gameOver for persistence logic.
    }

    // Allow external callers (AI helpers) to push an update for a single
    // fighter object into MonsterBattle's internal `battleData` state and
    // trigger a re-render. This is used by fighter AIs (e.g. Wizard) to
    // notify the UI that a fighter's consumable `specialActions` changed so
    // the interaction pane updates immediately.
    applyFighterUpdate = (fighter) => {
        if (!fighter || !fighter.id) return;
        try {
            // Clone existing battleData to ensure React sees the new reference
            const battleData = Object.assign({}, this.state.battleData);
            // Merge/replace the fighter entry with a shallow-cloned copy
            battleData[fighter.id] = JSON.parse(JSON.stringify(fighter));
            const newState = { battleData };
            // If the updated fighter is currently selected, keep selectedFighter
            // in-sync with the authoritative object.
            if (this.state.selectedFighter && this.state.selectedFighter.id === fighter.id) {
                newState.selectedFighter = battleData[fighter.id];
            }
            this.setState(newState);

            // Also persist consumable specialActions back to the global meta so
            // the DungeonPage and other pages reflect the updated counts immediately.
            try {
                // Notify parent (DungeonPage) if it provided a handler so it can
                // update its own state/selectedCrewMember immediately.
                try {
                    if (this.props && typeof this.props.onFighterUpdate === 'function') {
                        try { this.props.onFighterUpdate(battleData[fighter.id]); } catch(e){}
                    }
                } catch(e){}
                const meta = getMeta();
                if (meta && Array.isArray(meta.crew)) {
                    const idx = meta.crew.findIndex(c => c && c.id === fighter.id);
                    if (idx !== -1) {
                        // copy the specialActions from the updated fighter into meta
                        meta.crew[idx].specialActions = JSON.parse(JSON.stringify(battleData[fighter.id].specialActions || []));
                        storeMeta(meta);
                        // fire-and-forget server update to persist the change
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e){}
                    }
                }
            } catch (err) {
                console.warn('applyFighterUpdate: failed to persist specialActions to meta', err);
            }
        } catch (err) {
            console.warn('applyFighterUpdate failed', err);
        }
    }

    // Public helper to toggle the inventory popup from parent via ref
    toggleInventory = () => {
        try {
            this.setState((prev) => ({ showInventoryPopup: !prev.showInventoryPopup }));
        } catch (err) {
            console.warn('toggleInventory failed', err);
        }
    }

    // Ensure each wizard combatant has at least 3 magic missile spells in their specialActions
    ensureWizardSpells = (battleData) => {
        if (!battleData) return;
        Object.values(battleData).forEach(combatant => {
            try {
                if (!combatant) return;
                if (combatant.type !== 'wizard') return;
                if (!combatant.specialActions) combatant.specialActions = [];
                const existing = combatant.specialActions.filter(sa => sa && sa.type === 'spell' && (sa.subtype === 'magic missile' || (sa.name && sa.name.toLowerCase().includes('magic missile'))));
                const needed = Math.max(0, 3 - existing.length);
                for (let i = 0; i < needed; i++) {
                    const newSpell = {
                        type: 'spell',
                        subtype: 'magic missile',
                        name: 'magic missile',
                        iconUrl: images['magic_missile'] || '',
                        selected: false,
                        cooldown_position: 100
                    };
                    // If a combatManager is available, merge in any canonical
                    // definition fields (energy_cost, cooldown, damage, etc.) so
                    // AI paths that expect those properties see them on the
                    // created specialAction objects.
                    try {
                        const cm = this.props && this.props.combatManager;
                        const def = cm && (
                            (cm.specialsMatrix && (cm.specialsMatrix['magic_missile'] || cm.specialsMatrix['major_magic_missile'])) ||
                            (cm.attacksMatrix  && (cm.attacksMatrix['magic_missile']  || cm.attacksMatrix['major_magic_missile']))
                        );
                        if (def) {
                            ['energy_cost', 'cooldown', 'damage', 'effect', 'level', 'icon'].forEach(k => {
                                if (typeof def[k] !== 'undefined' && typeof newSpell[k] === 'undefined') {
                                    newSpell[k] = def[k];
                                }
                            });
                        }
                    } catch (err) {
                        console.debug('ensureWizardSpells merge diagnostic error', err);
                    }
                    combatant.specialActions.push(newSpell);
                }
            } catch (err) {
                // defensive: don't break update if something unexpected exists
                console.warn('ensureWizardSpells error', err);
            }
        });
    }

    // Return live crew sorted by top-most (lowest y) first, then left-to-right (lowest x)
    getSortedLiveCrew = () => {
        const crew = Object.values(this.state.battleData).filter(e => (!e.isMonster && !e.isMinion) && !e.dead);
        crew.sort((a, b) => {
            const ay = a.coordinates?.y ?? 0;
            const by = b.coordinates?.y ?? 0;
            if (ay !== by) return ay - by; // top-most first
            const ax = a.coordinates?.x ?? 0;
            const bx = b.coordinates?.x ?? 0;
            return ax - bx; // left-to-right
        });
        return crew;
    }
    updateAnimationData = (animationData) => {
        this.setState({
            animationData
        })
    }
    confirmClicked = () => {
        this.props.battleOver(this.state.battleResult)
    }
    combatBegins = () => {
        this.setState({
            combatStarted: true
        })
    }
    gameOver = (outcome) => {
    // outcome received

        // Ensure gameOver runs only once per battle instance to avoid duplicate
        // awards or duplicated UI flows when multiple gameOver triggers fire.
        if (this._gameOverHandled) {
            // already handled
            return;
        }
        this._gameOverHandled = true;

        // Snapshot battle data BEFORE reset() wipes combatManager.combatants.
        // Attempt to use the freshest battleData available. Prefer component state
        // (updated via updateBattleData). If that's empty (race), fall back to the
        // authoritative combatManager.combatants snapshot.
        let latestBattleData = (this.state.battleData && Object.keys(this.state.battleData).length) ? this.state.battleData : (this.props.combatManager && this.props.combatManager.combatants ? JSON.parse(JSON.stringify(this.props.combatManager.combatants)) : {});

        this.props.overlayManager.reset();
        this.props.combatManager.reset();

        if(this.props.isSimulation){
            // exit simulation
            this.props.exitSimulator();
            return
        }

        let experienceGained,
            goldGained,
            foodGained = 0,
            itemsGained,
            crewWins = outcome === 'crewWins',
            summaryMessage, battleResult;

        // liveCrew should be derived from the freshest snapshot
        let liveCrew = Object.values(latestBattleData).filter(e=>!e.dead && !e.isMinion && !e.isMonster);
        if(crewWins){
            battleResult = 'win';
            summaryMessage = 'The enemy is no more!';
            if(this.props.monster.drops){
                itemsGained = [];
                this.props.monster.drops.forEach(e=>{
                    let d = Math.random();
                    if(d < e.percentChance*.01){
                        if(e.itemPool && Array.isArray(e.itemPool) && e.itemPool.length > 0){
                            // Supports both flat pools and nested pools like [WEAPONS, ARMOR, MAGICAL]
                            const pickFromPool = (pool) => {
                                if(!Array.isArray(pool) || pool.length === 0) return null;
                                const idx = Math.floor(Math.random() * pool.length);
                                const picked = pool[idx];
                                return Array.isArray(picked) ? pickFromPool(picked) : picked;
                            };
                            const itemFromPool = pickFromPool(e.itemPool);
                            if(itemFromPool) itemsGained.push(itemFromPool);
                        } else if(e.item){
                            itemsGained.push(e.item);
                        }
                    }
                })
                this.props.inventoryManager.addItemsByName(itemsGained)
            }
            experienceGained = this.props.monster.level * 10;
            goldGained = Math.floor(Math.random() * experienceGained);
            // Defensive: log inventory/gold state before adding to help trace duplicate updates
            try { /* inventory snapshot suppressed */ } catch(e){}
            // Food reward: 40% chance 5-15, 20% chance 20-30, 5% chance 40-60
            try {
                const foodRoll = Math.random();
                let foodRolled = 0;
                if (foodRoll < 0.05) {
                    foodRolled = Math.floor(Math.random() * 21) + 40; // 40-60
                } else if (foodRoll < 0.25) {
                    foodRolled = Math.floor(Math.random() * 11) + 20; // 20-30
                } else if (foodRoll < 0.65) {
                    foodRolled = Math.floor(Math.random() * 11) + 5;  // 5-15
                }
                if (foodRolled > 0) {
                    foodGained = foodRolled;
                    const metaFood = getMeta() || {};
                    metaFood.food = (typeof metaFood.food === 'number' ? metaFood.food : 55) + foodGained;
                    try { storeMeta(metaFood); } catch(e) {}
                    console.log(`[Combat] food reward: +${foodGained} (total: ${metaFood.food})`);
                }
            } catch(e) { console.warn('food reward failed', e); }
            // Ensure we only award gold once per battle
                    if (!this._goldAwarded) {
                try {
                    this.props.inventoryManager.addCurrency({type: 'gold', amount: goldGained})
                    this._goldAwarded = true;
                } catch (err) {
                    console.warn('gameOver: addCurrency failed', err);
                }
            } else {
                // gold already awarded, skipping
            }
            this._setTimeout(()=>{
                // Snapshot levels before awarding XP so we can show before→after
                const levelsBefore = {};
                try {
                    (this.props.crewManager.crew || []).forEach(c => {
                        if (c && c.id) levelsBefore[c.id] = typeof c.level === 'number' ? c.level : 0;
                    });
                } catch(e) {}
                // Use latest liveCrew snapshot when awarding experience
                try { this.props.crewManager.addExperience(liveCrew, experienceGained); } catch(e) { console.warn('addExperience failed', e); }
                // Build level transitions map for display
                const levelTransitions = {};
                try {
                    (this.props.crewManager.crew || []).forEach(c => {
                        if (!c || !c.id) return;
                        const before = levelsBefore[c.id];
                        const after = typeof c.level === 'number' ? c.level : 0;
                        if (typeof before === 'number' && after > before) {
                            levelTransitions[c.id] = { from: before, to: after };
                        }
                    });
                } catch(e) {}
                let meta = getMeta();
                meta.crew = this.props.crewManager.crew;
                storeMeta(meta)
                updateUserRequest();
                this.setState({ levelTransitions });
                this.forceUpdate();
            },1000)

            
        } else {
            battleResult = 'loss'
            summaryMessage = 'Death has come for you and yours.'
            // Implement group-death handling: track group deaths in meta.deathTracker.
            // On non-final deaths: increment counter, restore crew HP to 1, respawn at dungeon spawn,
            // and show the summary panel (do NOT navigate to the death scene).
            // On the third full-group death: clear dungeon and crew, persist, then run the final death sequence.
            try {
                const meta = getMeta();
                let deaths = meta.deathTracker || 0;
                deaths = deaths + 1;
                meta.deathTracker = deaths;
                try { storeMeta(meta); } catch(e) {}
                try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
                    // Notify parent (DungeonPage) so UI elements like death-tracker can refresh
                    try { if (this.props && typeof this.props.onDeathTrackerChanged === 'function') this.props.onDeathTrackerChanged(deaths); } catch(e) {}
                // deaths count incremented
                if (deaths >= 3) {
                    // ── FINAL DEATH ──────────────────────────────────────────────────
                    // Show "this is the end" summary for 3 seconds, then wipe the
                    // player's dungeon profile and launch the death sequence.

                    // Wipe dungeon profile immediately so it's clean before the
                    // narrative plays (profile reset is invisible behind the summary).
                    try {
                        if (meta.dungeonId) {
                            try { deleteDungeonRequest(meta.dungeonId).catch(()=>{}); } catch(e) {}
                        }
                    } catch (inner) {}
                    try { this.props.boardManager.dungeon.id = null; } catch(e) {}
                    try { this.props.inventoryManager.inventory = []; } catch(e) {}
                    meta.dungeonId = null;
                    meta.location = null;
                    meta.inventory = { items: [], gold: 0, shimmering_dust: 0, totems: 0 };
                    meta.crew = [];
                    meta.deathTracker = 0;
                    try { storeMeta(meta); } catch(e) {}
                    try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
                    try { this.props.crewManager.initializeCrew([]); } catch(e) {}

                    // Show the final-death summary (no OK button) then auto-launch
                    this._suppressPersistFinalHP = true;
                    try {
                        if (this._isMounted) this.setState({
                            showSummaryPanel: true,
                            suppressSummaryPortraits: true,
                            isFinalDeath: true,
                            summaryMessage: 'This is the end.',
                            battleResult: 'loss',
                        });
                    } catch(e) {}

                    this._setTimeout(() => {
                        this._suppressPersistFinalHP = false;
                        this.launchDeathSequence();
                    }, 3000);

                } else {
                    // We will show the battle summary (without portraits), wait 3s, then launch
                    // the death narrative and perform the respawn & restore so the narrative
                    // plays before the crew are moved/cleared in the UI.
                    try {
                        // persist the incremented death tracker now
                        try { storeMeta(meta); } catch(e) {}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
                    } catch (inner) {}

                    // Suppress the later "persist final HP" block so it does not overwrite our planned restore
                    this._suppressPersistFinalHP = true;

                    // Set a state flag so the summary-panel rendering hides portraits
                    try { if (this._isMounted) this.setState({ suppressSummaryPortraits: true }); } catch(e) {}

                    // After a short delay, close summary, restore crew and respawn (do NOT navigate to death scene for non-final deaths)
                    this._setTimeout(async () => {
                        try { if (this._isMounted) this.setState({ showSummaryPanel: false, suppressSummaryPortraits: false }); } catch(e) {}

                    this.props.battleOver('respawn');
                          

                        // allow later persistence block to run normally again
                        this._suppressPersistFinalHP = false;
                    }, 3000);
                    // Show the summary panel now (it will be visible until the timeout closes it)
                    try { if (this._isMounted) this.setState({ showSummaryPanel: true }); } catch(e) {}
                }
            } catch (err) {
                console.warn('group-death handler failed, falling back to death scene', err);
                this.launchDeathSequence();
            }
        }

        // Persist final HP and dead state for crew once when combat ends
        try {
            // If a group-death flow is in-progress, skip persisting final HP (we'll restore later)
            if (this._suppressPersistFinalHP) {
                // do nothing
            } else {
                const meta = getMeta();
                if (meta && Array.isArray(meta.crew)) {
                    let modified = false;
                    const battleEntries = this.state.battleData || {};
                    Object.values(battleEntries).forEach(entry => {
                        try {
                            if (!entry) return;
                            if (entry.isMonster || entry.isMinion) return;
                            const idx = meta.crew.findIndex(c => c && c.id === entry.id);
                            if (idx !== -1) {
                                if (typeof entry.hp !== 'undefined' && meta.crew[idx].hp !== entry.hp) {
                                    meta.crew[idx].hp = entry.hp;
                                    modified = true;
                                }
                                if (typeof entry.dead !== 'undefined' && meta.crew[idx].dead !== entry.dead) {
                                    meta.crew[idx].dead = !!entry.dead;
                                    modified = true;
                                }
                            }
                            // notify parent so DungeonPage immediately reflects final HP/dead
                            try { if (this.props && typeof this.props.onFighterUpdate === 'function') this.props.onFighterUpdate(entry); } catch(e) {}
                        } catch (inner) {}
                    });
                    if (modified) {
                        try { storeMeta(meta); } catch (e) {}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
                        try { if (this.props.saveUserData) this.props.saveUserData(); } catch(e) {}
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to persist final battle HP to meta', err);
        }

        // Ensure suppressSummaryPortraits is only true for the special group-death flow
        // (that flow sets this._suppressPersistFinalHP and this.state.suppressSummaryPortraits
        //  earlier). For all other outcomes make sure portraits are shown.
        // Add debug logging to help trace missing portraits and repeated gold updates.
        try {
            // debug: _suppressPersistFinalHP state
            // Print brief portrait info from battleData for inspection
            try {
                // portrait snapshot suppressed
                void Object.values(this.state.battleData || {}).map(b => ({ id: b && b.id, portrait: b && b.portrait }));
            } catch (inner) { console.warn('gameOver: failed to snapshot battleData portraits', inner); }
        } catch (e) {}

        this.setState({
            showSummaryPanel: true,
            goldGained,
            foodGained,
            experienceGained,
            itemsGained,
            stolenItems: this._stolenItems && this._stolenItems.length ? [...this._stolenItems] : [],
            summaryMessage,
            battleResult,
            suppressSummaryPortraits: !!this._suppressPersistFinalHP,
            isFinalDeath: false,
        })
    }
    launchDeathSequence = () => {
            this.props.setNarrativeSequence('death')
            this.setState({
                navToDeathScene: true
            })
    }
    establishAnimationCallback = () => {
        this.props.animationManager.establishAnimationCallback(this.renderAnimation)
    }
    establishUpdateActorCallback = () => {
        this.props.combatManager.establishUpdateActorCallback(this.updateCurrentActor)
    }
    establishUpdateMatrixCallback = () => {
        this.props.combatManager.establishUpdateMatrixCallback(this.updateIndicatorsMatrix)
    }
    establishMessageCallback = () => {
        this.props.combatManager.establishMessageCallback(this.setMessage)
    }
    establishUpdateDataCallback = () => {
        this.props.combatManager.establishUpdateDataCallback(this.updateBattleData)
    }
    establishUpdateAnimationDataCallback = () => {
        this.props.animationManager.establishUpdateAnimationDataCallback(this.updateAnimationData)
    }
    establishMorphPortraitCallback = () => {
        this.props.combatManager.establishMorphPortraitCallback(this.morphPortrait)
    }
    establishGreetingCompleteCallback = () => {
        this.props.combatManager.establishGreetingCompleteCallback(this.greetingComplete)
    }
    establishGameOverCallback = () => {
        this.props.combatManager.establishGameOverCallback(this.gameOver)
    }
    establishOnFighterMovedToDestinationCallback = () => {
        this.props.combatManager.establishOnFighterMovedToDestinationCallback(this.onFighterMovedToDestination)
    }

    // Called when a fighter finishes moving to their destination (including teleport)
    onFighterMovedToDestination = (destination, fighter) => {
        // If the fighter is a monk and just teleported, clear teleportingFighterId after a tick
        if (fighter && fighter.type === 'monk') {
            // setTimeout(() => {
            //     this.setState({ teleportingFighterId: null });
            // }, 50); // allow one render with .teleporting class
        }
    }
    establishOnFighterDeathCallback = () => {
        this.props.combatManager.establishOnFighterDeathCallback(this.handleFighterDeath)
    }
    // OVERLAY MANAGER
    establishBroadcastNewAnimationCallback = () => {
        this.props.overlayManager.establishBroadcastAnimationEventCallback(this.recieveAnimationBroadcastFromOverlayManager)
    }
    // establishInitializeOverlayManagerCallback = () => {
    //     this.props.combatManager.establishInitializeOverlayManagerCallback(this.initializeOverlayManager)
    // }

    handleFighterDeath = (id) => {
        if(id === 'all enemies dead'){
            this.setState({
                selectedFighter: null
            })
            return
        }
        if(id === 'all fighters dead'){
            this.setState({
                selectedFighter: null
            })
            return
        }
        // Persist death immediately so dungeon/meta reflects 0 HP even if the
        // combat manager removes the fighter from battleData shortly after.
        try {
            const entry = this.state.battleData && this.state.battleData[id] ? this.state.battleData[id] : { id };
            // mark dead and hp=0 locally
            entry.dead = true;
            entry.hp = 0;
            // update meta
            try {
                const meta = getMeta();
                if (meta && Array.isArray(meta.crew)) {
                    const idx = meta.crew.findIndex(c => c && c.id === id);
                    if (idx !== -1) {
                        meta.crew[idx].hp = 0;
                        meta.crew[idx].dead = true;
                        try { storeMeta(meta); } catch (e) {}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
                        try { if (this.props.saveUserData) this.props.saveUserData(); } catch(e) {}
                    }
                }
            } catch (inner) {
                console.warn('handleFighterDeath: failed to persist meta', inner);
            }
            // notify parent immediately so UI updates
            try { if (this.props && typeof this.props.onFighterUpdate === 'function') this.props.onFighterUpdate(entry); } catch(e) {}
        } catch (err) {
            console.warn('handleFighterDeath persistence failed', err);
        }
        if(this.state.selectedFighter && this.state.selectedFighter.id === id){
            const liveFighters = this.props.combatManager.getLiveFighters();
            if(liveFighters.length){
                this.fighterPortraitClicked(liveFighters[0].id)
            } else {
                this.setState({
                    selectedFighter: null
                })
            }
        }
    }


    getDistanceToTarget = (id) => {
        let source = this.state.battleData[id];
        if(!source) return 0;
        let targetId = this.state.battleData[id].targetId,
        target = this.state.battleData[targetId],
        returnVal = 50;
        if(!target) return 0;
        if(target.isMonster){
            //nothin 
        }
        return returnVal;
    }

    attackTileClicked = (val) => {
        if(val.cooldown_position !== 100) return;
        const formatted_val = val.name.replaceAll(' ', '_');
        this.setState({
            showCrosshair: true,
            selectedAttack: this.props.combatManager.attacksMatrix[formatted_val]
        })
    }
    attackTileHovered = (val) => {
        this.setState({
            hoveredAttackTile: val
        })
    }
    inventoryTileHovered = (val) => {
        this.setState({
            hoveredInventoryTile: val
        })
    }
    combatInventoryTileClicked = (val) => {
        this.props.combatManager.itemUsed(val, this.state.selectedFighter)
    // simulation flag inspected
        // if(!this.props.isSimulation) this.props.useConsumableFromInventory(val);
        this.props.useConsumableFromInventory(val);
    }
    specialTileClicked = (val) => {
    // special tile clicked
        if(val !== null && typeof val === 'string'){
            val = val.replaceAll('_', ' ')
        }
        try {
            if (this.state.selectedFighter && this.props.combatManager && typeof this.props.combatManager.setSelectedFighter === 'function') {
                this.props.combatManager.setSelectedFighter(this.state.selectedFighter);
            }
        } catch (err) {}
    // special tile value
        this.fireSpecial(val)

        // if(val === 'glyph'){
        //     finalVal = !this.state.glyphTrayExpanded
        //     this.setState({
        //         glyphTrayExpanded: finalVal
        //     })
        // }
    }
    manualFire = () => {
        if(!this.state.selectedFighter) return
    // manual fire invoked

        let selectedFighter = this.state.selectedFighter;
        let specials = selectedFighter?.specials,
        consumableSpecials = selectedFighter?.specialActions,
        selectedSpecial = specials.find(a=> a.selected),
        selectedConsumableSpecial = consumableSpecials.find(a=> a.selected);

        if(selectedSpecial){
            if(this.state.selectedFighter.energy < 100){
                // not enough energy
                return
            }
            // (Teleport effect will now be triggered only on actual teleport, not on special selection)
            this.props.combatManager.fighterSpecialAttack(selectedSpecial)
            specials.forEach(e=>e.selected=false)
        } else if (selectedConsumableSpecial){
            if(selectedConsumableSpecial.type === 'spell'){
                this.fireSpell(selectedConsumableSpecial)
            }
            consumableSpecials.forEach(a=>a.selected=false)
        } else {
            // manual attack: ensure the authoritative combatant has a pendingAttack selected
            try {
                const sel = this.state.selectedFighter;
                if (sel && this.props.combatManager && typeof this.props.combatManager.getCombatant === 'function') {
                    const cmF = this.props.combatManager.getCombatant(sel.id);
                    if (cmF) {
                        // If no pending attack is set, choose one using the combat manager helper
                        if (!cmF.pendingAttack) {
                            const target = (cmF.targetId) ? this.props.combatManager.getCombatant(cmF.targetId) : null;
                            try {
                                if (typeof this.props.combatManager.chooseAttackType === 'function') {
                                    this.props.combatManager.chooseAttackType(cmF, target);
                                } else if (Array.isArray(cmF.attacks) && cmF.attacks.length) {
                                    cmF.pendingAttack = cmF.attacks.find(a => a.cooldown_position === 100) || cmF.attacks[0];
                                }
                            } catch (e) {
                                // defensive fallback
                                if (Array.isArray(cmF.attacks) && cmF.attacks.length) {
                                    cmF.pendingAttack = cmF.attacks.find(a => a.cooldown_position === 100) || cmF.attacks[0];
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('manualFire: failed to ensure pendingAttack', err);
            }
            // invoke the combat manager's manual attack which calls into the fighter
            this.props.combatManager.fighterManualAttack()
        }
    }
    fireSpecial = (special) => {
        if(!this.state.selectedFighter) return
    // firing special
        // debugger

        let selectedFighter = this.state.selectedFighter;
        const cmFighter = this.props.combatManager && typeof this.props.combatManager.getCombatant === 'function'
            ? this.props.combatManager.getCombatant(selectedFighter.id)
            : null;
        const fighterRef = cmFighter || selectedFighter;
        let specials = fighterRef?.specials || [],
        consumableSpecials = fighterRef?.specialActions || [],
        selectedSpecial = specials.find(a=> a.selected),
        selectedConsumableSpecial = consumableSpecials.find(a=> a.selected);

        if (special) {
            const specialName = (typeof special === 'string' ? special : special?.name || '')
                .replaceAll('_', ' ')
                .toLowerCase();
            const clickedSpecial = specials.find(a => a && a.name && a.name.toLowerCase() === specialName) || special;
            if (!clickedSpecial || !clickedSpecial.name) return;
            if (clickedSpecial.cooldown_position !== 100) return;
            if ((fighterRef.energy || 0) < 100) return;
            this.props.combatManager.fighterSpecialAttack(clickedSpecial)
            specials.forEach(e=>e.selected=false)
            consumableSpecials.forEach(a=>a.selected=false)
            return;
        }

        if(selectedSpecial){
            this.props.combatManager.fighterSpecialAttack(selectedSpecial)
            specials.forEach(e=>e.selected=false)
        } else if (selectedConsumableSpecial){
            if(selectedConsumableSpecial.type === 'spell'){
                this.fireSpell(selectedConsumableSpecial)
            }
            consumableSpecials.forEach(a=>a.selected=false)
        } else {
            this.props.combatManager.fighterManualAttack()
        }
    }
    // Accept optional fighter argument for AI path
    fireGlyph = (glyph, fighterOverride = null) => {
    // glyph firing
        // Use override if provided (AI), else fall back to selectedFighter (manual)
        const selectedFighter = fighterOverride || this.state.selectedFighter;
        switch(glyph.subtype){
            case 'magic missile':
                // animation manager check
                //     magicMissile_targetLaneDiff: 0
                // })

                



                let specials = selectedFighter?.specials;
                let consumableSpecials = selectedFighter?.specialActions;
                if (consumableSpecials) consumableSpecials.forEach(a=>a.selected = false)
                if (specials) specials.forEach(a=>a.selected = false)



                let target = this.props.combatManager.getCombatant(selectedFighter.targetId)
                // target resolved
                if(!target) return
                // let targetDistance = this.props.combatManager.getDistanceToTarget(this.state.selectedFighter, target)
                // let laneDiff = this.props.combatManager.getLaneDifferenceToTarget(this.state.selectedFighter, target)

                // console.log('laneDiff: ', laneDiff);
                const travelTime = 1500
                // triggering magic missile via AI
                this.props.combatManager.fighterAI.roster['wizard'].triggerMagicMissile(selectedFighter, target, travelTime)
                // this.props.combatManager.lockFighter(this.state.selectedFighter.id)


                // this.props.animationManager.magicCircle(selectedFighter.coordinates, target.coordinates)
                // setTimeout(()=>{
                //     this.props.animationManager.magicTriangle(selectedFighter.coordinates, target.coordinates)
                // }, 500)


                
                
                
                // setTimeout(()=>{
                //     this.setState({
                //         magicMissile_fire: false,
                //         magicMissile_connectParticles: true
                //     })
                //     if(this.state.selectedFighter) this.props.combatManager.unlockFighter(this.state.selectedFighter.id)
                // }, 2500)
                // ^ travel time + 1 second of damage animation
            break;
            default:
                // unknown glyph subtype
        }
    }
    specialTileHovered = (val) => {
        this.setState({
            hoveredSpecialTile: val ? val.name : null
        })
    }
    
    // Minimal handler for spell hover to avoid missing-method runtime errors.
    // Logs a small message and updates hoveredSpellTile for the tooltip.
    spellTileHovered = (val) => {
    // spell hovered
        this.setState({ hoveredSpellTile: val ? (val.subtype || val.name) : null });
    }
    glyphTileHovered = (val) => {
        this.setState({
            hoveredGlyphTile: val ? val.type : null
        })
    }
    portraitHovered = (id) => {
        this.setState({portraitHoveredId: id})
    }
    getManualMovementArc = (fighter) => {
        if(!fighter) return 0
        // console.log('fighter: ', fighter);
        // console.log('manual moves for ', fighter.name, 'is ', fighter.manualMovesCurrent / fighter.manualMovesTotal * 3.6);
        const percentage = (fighter.manualMovesCurrent / fighter.manualMovesTotal) * 100;
        const arc = percentage * 3.6
        return  arc
    }
    getManualMovementArcColor = (fighter) => {
        if(!fighter) return 'black'
        if(fighter.manualMovesCurrent<1) return '#818d6e'
        return 'greenyellow'
    }
    monsterCombatPortraitClicked = (id) => {
        // console.log('battle data: ', this.state.battleData);
        // console.log('images[this.state.battleData[e]?.portrait]', this.state.battleData[id].targettedBy);
        // let targettedBy = this.state.battleData[id].targettedBy;
        // console.log('should be Sadronis: ', this.state.battleData[targettedBy]);\
        
        const selectedMonster = this.state.battleData[id];
    // monster selected
        if(this.state.showCrosshair){
            this.props.combatManager.queueAction(this.state.selectedFighter.id, id, this.state.selectedAttack)
            this.setState({
                showCrosshair: false
            })
        } else {
            this.setState({
                selectedMonster,
                selectedFighter: null,
                selectedAttack: null
            })
        }
        // selectedMonster.portrait = this.props.crew.find(e=>e.id === id).portrait
        
        
    }
    targetTileClicked = (tile) => {
        this.props.combatManager.setTargetFromClick(this.state.selectedFighter.id, tile.id)
        if(this.state.showCrosshair){
            this.props.combatManager.queueAction(this.state.selectedFighter.id, tile.id, this.state.selectedAttack)
        }
        this.setState({
            showCrosshair: false,
            selectedAttack: null
        })
        // debugger
    }
    targetTileHovered = (tile) => {
        this.setState({
            portraitHoveredId: tile ? tile.id : null
        })
    }
    queueTileHovered = (tile) => {
        if(tile === null){
            this.setState({
                draggedOverCombatTileId: null
            })
            return
        }
        switch(tile.instruction.type){
            case 'move':
                let correspondingTile = this.state.combatTiles.find(e=> e.x === tile.instruction.destinationCoordinates.x && e.y === tile.instruction.destinationCoordinates.y)
                this.setState({
                    draggedOverCombatTileId: correspondingTile.id
                })
            break;
            default:
            break;
        }
        // this.setState({
        //     draggedOverCombatTileId: tileIndex
        // })
    }
    onFighterMovedToDestination = (coordinates) => {
        const tile = this.state.combatTiles.find(t=> t.x === coordinates.x && t.y === coordinates.y)
        let arr = this.state.ghostPortraitMatrix;
        arr[tile.id] = null;
        this.setState({
            ghostPortraitMatrix: arr
        })
    }
    onDragStart = (fighter) => {
        this.setState({
            selectedFighter: this.state.battleData[fighter.id],
            draggingFighter: fighter
        })
    }
    onDragOver = (event, tileIndex) => {
        event.preventDefault();
        if(tileIndex === this.state.draggedOverCombatTileId) return
        this.setState({
            draggedOverCombatTileId: tileIndex
        })
    }
    onDrop = (tileIndex) => {
        const selectedFighter = this.state.battleData[this.state.draggingFighter.id];
        const tile = this.state.combatTiles[tileIndex]
        this.props.combatManager.setFighterDestination(selectedFighter.id, {x: tile.x, y: tile.y});
        let arr = this.state.ghostPortraitMatrix;
        arr[tileIndex] = selectedFighter.portrait;
        this.setState({
            draggedOverCombatTileId: null,
            draggingFighter: null,
            ghostPortraitMatrix: arr
        })
        
    }
    getMonsterWeaponAnimation = (monster) => {
        if(!monster.attacking) return ''
        switch(monster.pendingAttack.name){
            case 'magic missile':
                // return 'spinning'
                return 'spin-left'
            case 'void lance':
                return 'swinging-left'
            default:
            break;
        }
        if(monster.pendingAttack.name === 'magic missile'){
            // unexpected path reached
            debugger
        }
        switch(monster.pendingAttack.range){
            case 'close':
                return 'swinging-left'
            case 'medium':
                return 'lift-and-shoot'
            case 'far':
                return 'shooting';
            default:
            break;
        }
    }

    draw = (ctx, frameCount) => {
        const that = this,
            size = 20 + Math.sin(frameCount * 0.04)**2 * 5;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        ctx.drawImage(that.state.arrowUpImage, 5, 5, size, size);
    }

    render(){
                   
        // Determine the currently selected fighter's target id from the authoritative battleData
        const selectedTargetId = this.state.selectedFighter
            ? (this.state.selectedFighter.targetId ?? this.state.battleData[this.state.selectedFighter.id]?.targetId)
            : null;

        return (
            <div className={`mb-board ${this.state.showCrosshair ? 'show-crosshair' : ''}`}>
                {/* Game speed readout in upper right */}
                <div style={{position: 'absolute', top: -35, right: 20, color: 'white', fontSize: '18px', zIndex: 1000}}>
                    Game Speed: {
                        (() => {
                            // Try to get intervalDisplayNames from parent props (CombatSimulator)
                            const intervalDisplayNames = INTERVAL_DISPLAY_NAMES;
                            const intervals = INTERVALS;
                            const current = this.getGameSpeed();
                            const idx = intervals.indexOf(current);
                            return idx !== -1 ? intervalDisplayNames[idx] : `${current} ms`;
                        })()
                    }
                </div>
                { this.state.navToDeathScene && <Redirect to='/death'/>}
                <div className="combat-grid-container"
                    style={{
                        width: TILE_SIZE * NUM_COLUMNS + (SHOW_TILE_BORDERS ? NUM_COLUMNS * 2 : 0) + 'px',
                        height: TILE_SIZE * MAX_ROWS + (SHOW_TILE_BORDERS ? MAX_ROWS * 2 : 0) + 'px'
                    }}>
                    {this.state.showSummaryPanel && 
                    <div className='summary-panel'>
                        <div className="content-container">
                            <div className="summary-message-container">
                                {this.state.summaryMessage}
                            </div>
                            {this.state.itemsGained && this.state.itemsGained.length > 0 &&
                                this.state.itemsGained.map((itemKey, idx) => {
                                    const itemDef = this.props.inventoryManager.allItems[itemKey];
                                    const iconSrc = itemDef?.icon ? images[itemDef.icon] : null;
                                    const displayName = itemDef?.name || itemKey.replaceAll('_', ' ');
                                    return (
                                        <div key={idx} className="experience-container">
                                            {iconSrc && <img className="summary-icon" src={iconSrc} alt="" />}
                                            You found a {displayName}
                                        </div>
                                    );
                                })
                            }
                            {this.state.goldGained > 0 && 
                            <div className="experience-container">
                                <img className="summary-icon" src={images.gold} alt="" />
                                You found {this.state.goldGained} gold
                            </div>
                            }
                            {this.state.stolenItems && this.state.stolenItems.length > 0 &&
                                this.state.stolenItems.map((entry, idx) => {
                                    const itemName = typeof entry === 'string' ? entry : entry?.itemName;
                                    const itemIconKey = typeof entry === 'string' ? null : entry?.itemIconKey;
                                    const iconSrc = (itemIconKey && images[itemIconKey]) ? images[itemIconKey] : images.goblin_portrait;
                                    return (
                                        <div key={`stolen-${idx}`} className="experience-container stolen-item">
                                            {iconSrc && <img className="summary-icon" src={iconSrc} alt="" />}
                                            {itemName} was stolen by a goblin!
                                        </div>
                                    );
                                })
                            }
                            {this.state.foodGained > 0 &&
                            <div className="experience-container">
                                <span className="summary-icon" role="img" aria-label="meat">🍖</span>
                                Your crew foraged {this.state.foodGained} food
                            </div>
                            }
                            {this.state.experienceGained > 0 && 
                            <div className="experience-container">
                                <img className="summary-icon" src={images.exp} alt="" />
                                Each crew member has earned {this.state.experienceGained} experience
                            </div>} 
                            { !this.state.suppressSummaryPortraits && (
                                <div className="portraits-container">
                                    {Object.values(this.state.battleData).filter(e=>!e.dead && !e.isMonster && !e.isMinion).map((crewMember, i) => {
                                        // Defensive portrait resolution with avatar fallback
                                        const portraitUrl = images[crewMember.portrait] || crewMember.portrait || images['avatar'];
                                        // authoritative crew member stored in crewManager (may contain justLeveled and recent gains)
                                        const cmMember = (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew.find(c => c && (c.id === crewMember.id || c.name === crewMember.name)) : null;
                                        const percent = this.props.crewManager.calculateExpPercentage(crewMember);
                                        const shouldShowArrow = (cmMember && cmMember.justLeveled) || percent >= 100;
                                        // aggregate recent gains into a single object for display
                                        let gainsAgg = null;
                                        try {
                                            if (cmMember && Array.isArray(cmMember._recentLevelGains) && cmMember._recentLevelGains.length) {
                                                gainsAgg = {};
                                                cmMember._recentLevelGains.forEach(g => {
                                                    Object.keys(g).forEach(k => {
                                                        gainsAgg[k] = (gainsAgg[k] || 0) + (g[k] || 0);
                                                    });
                                                });
                                            }
                                        } catch (err) { gainsAgg = null }
                                        return (
                                            <div key={i} className="single-portrait-container">
                                                <div className="portrait" style={{backgroundImage: `url(${portraitUrl})`}}></div>
                                                {shouldShowArrow && (
                                                    <Canvas 
                                                        className="level-up-canvas"
                                                        width={80}
                                                        height={80}
                                                        draw={this.draw}
                                                    />
                                                )}
                                                {gainsAgg && Object.keys(gainsAgg).length > 0 && (
                                                    <div className="level-gains">
                                                        {Object.keys(gainsAgg).map((k, idx) => (
                                                            <div key={idx} className="gain-item">{k.toUpperCase()} +{gainsAgg[k]}</div>
                                                        ))}
                                                    </div>
                                                )}
                                                {this.state.levelTransitions[crewMember.id] && (
                                                    <div className="level-transition">
                                                        Lvl {this.state.levelTransitions[crewMember.id].from} → {this.state.levelTransitions[crewMember.id].to}
                                                    </div>
                                                )}
                                                <div className="experience-bar-container">
                                                    <div className="experience-bar" style={{width: `${percent}%`}}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {Object.values(this.state.battleData).filter(e=>e.dead && !e.isMonster && !e.isMinion).map((crewMember, i) => {
                                        const portraitUrl = images[crewMember.portrait] || crewMember.portrait || images['avatar'];
                                        return (
                                            <div key={i} className="single-portrait-container dead-member">
                                                <div className="portrait" style={{backgroundImage: `url(${portraitUrl})`}}>
                                                    <div className="skull-image" style={{backgroundImage: `url(${images['whiteskull']})`}}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="button-row">
                            {!this.state.isFinalDeath && <div className="confirm-button" onClick={() => this.confirmClicked()}>OK</div>}
                        </div>
                    </div>}

                    <CModal className='inventory-modal' alignment='center' visible={this.state.showInventoryPopup} onClose={() => this.setState({ showInventoryPopup: false })}>
                        <div className='inventory-content'>
                            <div className='inventory-title'>Inventory</div>
                            <div className='crew-panels'>
                                {(this.props.crew || []).map((member, idx) => {
                                    const portraitUrl = images[member.portrait] || member.portrait;
                                    return (
                                        <div className='crew-panel' key={member.id || idx}>
                                            <div className='crew-portrait' style={{backgroundImage: `url(${portraitUrl})`}}></div>
                                            <div className='crew-body' style={{backgroundImage: `url(${images.body_male})`}}></div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CModal>

                    {(this.state.message) && <div className="message-container">
                                {this.state.message}
                    </div>}

                    {/* /// ANIMATION GRID ///  */}
                    <AnimationGrid
                    animationManager={this.props.animationManager}
                    animationData={this.state.animationData}
                    tileProps={{
                        TILE_SIZE,
                        NUM_COLUMNS,
                        SHOW_TILE_BORDERS,
                        MAX_ROWS
                    }}
                    ></AnimationGrid>

                    {/* /// COMBAT GRID .   <--- not really in use, only shows grid lines */}
                    <div className="combat-grid" style={{width: TILE_SIZE * NUM_COLUMNS + (SHOW_TILE_BORDERS ? NUM_COLUMNS * 2 : 0) + 'px'}}>
                        {this.state.combatTiles.map((t,i)=>{
                            return <div 
                            key={i} 
                            className="combat-tile"
                            onDragOver={(event)=>this.onDragOver(event, i)}
                            onDrop={()=>{this.onDrop(i)}}
                            style={{
                                backgroundColor: this.state.draggedOverCombatTileId === i ? '#cccca4c1' : 'inherit',
                                border: SHOW_COMBAT_BORDER_COLORS ? '1px solid #e8e880' : '1px solid transparent'
                            }}
                            >
                                {SHOW_COORDINATES && (
                                    <div className="coord-container">
                                        {t.x}, {t.y}
                                    </div>
                                )}
                                {this.state.ghostPortraitMatrix[i] && <div className="ghost-portrait"
                                style={{
                                    backgroundImage: "url(" + this.state.ghostPortraitMatrix[i] + ")"
                                }}>
                                </div>}
                            </div>
                        })}
                    </div>
                    {/* /// SHIELD WALL OVERLAYS */}
                    {this.state.activeWalls.map((wall) => {
                        // Each wall occupies lanesAffected.length tiles vertically.
                        // Position: the wall is a thin vertical line sitting between
                        // column (wall.x - 1) and column (wall.x).
                        // left = wall.x * TILE_SIZE  (right edge of the tile at wall.x-1)
                        // top  = min(lanesAffected) * TILE_SIZE
                        // height = lanesAffected.length * TILE_SIZE
                        if (!wall.lanesAffected || !wall.lanesAffected.length) return null;
                        const minLane = Math.min(...wall.lanesAffected);
                        const topPx = minLane * TILE_SIZE;
                        const heightPx = wall.lanesAffected.length * TILE_SIZE;
                        // The wall line sits at the leading edge of wall.x column
                        const leftPx = wall.isFacingRight
                            ? wall.x * TILE_SIZE - 3
                            : (wall.x + 1) * TILE_SIZE - 3;
                        return (
                            <div
                                key={wall.id}
                                className="shield-wall-overlay"
                                style={{
                                    position: 'absolute',
                                    left: leftPx + 'px',
                                    top: topPx + 'px',
                                    width: '6px',
                                    height: heightPx + 'px',
                                    zIndex: 20,
                                    pointerEvents: 'none'
                                }}
                            />
                        );
                    })}
                    {/* /// FEAR OVERLAY — board-wide shroud when induce_fear is active */}
                    {this.state.boardFearActive && (
                        <div className="fear-overlay" />
                    )}
                    {/* /// FIGHTERS */}
                    <FightersCombatGrid 
                        crew={this.props.crew}
                        combatManager={this.props.combatManager}
                        selectedFighter={this.state.selectedFighter}
                        battleData={this.state.battleData}
                        getFighterDetails={this.getFighterDetails}
                        selectedMonster={this.state.selectedMonster}
                        // fighterFacingRight={this.fighterFacingRight}
                        // fighterFacingUp={this.fighterFacingUp}
                        // fighterFacingDown={this.fighterFacingDown}
                        portraitHoveredId={this.state.portraitHoveredId}
                        onDragStart={this.onDragStart}
                        getActionBarLeftValForFighter={this.getActionBarLeftValForFighter}
                        getManualMovementArc={this.getManualMovementArc}
                        getManualMovementArcColor={this.getManualMovementArcColor}
                        animationOverlays={this.state.animationOverlays}
                        getAllOverlaysById={this.getAllOverlaysById}
                        portraitHovered={this.portraitHovered}
                        fighterPortraitClicked={this.fighterPortraitClicked}
                        teleportingFighterId={this.state.teleportingFighterId}
                    />
                    {/* /// MONSTERS & MINIONS */}
                    <MonstersCombatGrid
                        monster={this.props.monster}
                        minions={this.props.minions}
                        battleData={this.state.battleData}
                        monsterData={this.monster()}
                        combatManager={this.props.combatManager}
                        selectedMonster={this.state.selectedMonster}
                        // monsterFacingUp={this.monsterFacingUp}
                        // monsterFacingDown={this.monsterFacingDown}
                        portraitHovered={this.portraitHovered}
                        greetingInProcess={this.state.greetingInProcess}
                        monsterCombatPortraitClicked={this.monsterCombatPortraitClicked}
                        animationOverlays={this.state.animationOverlays}
                        getAllOverlaysById={this.getAllOverlaysById}
                        minionDirectionReversed={this.minionDirectionReversed}
                        getMonsterWeaponAnimation={this.getMonsterWeaponAnimation}
                        getHitAnimation={this.getHitAnimation}
                        images={images}
                        TILE_SIZE={TILE_SIZE}
                        SHOW_TILE_BORDERS={SHOW_TILE_BORDERS}
                        SHOW_MONSTER_IDS={SHOW_MONSTER_IDS}
                        fearCastingActive={this.state.fearCastingActive}
                    />
                </div>

                {/* // INTERACTION PANE */}
                { SHOW_INTERACTION_PANE && <div className={`mb-interaction-pane ${!this.state.greetingInProcess ? 'visible' : ''} `}>
                    <div className="header-row">
                        <div className="portrait" style={{backgroundImage: "url(" + images[this.state.selectedFighter?.portrait] + ")"}}></div>
                        <div className="title">
                            <div className="name">
                                {this.state.selectedFighter?.name}
                            </div>
                            <div className="readout">
                                {(this.state.selectedFighter?.readout?.action || '')} {(this.state.selectedFighter?.readout?.result || '')}
                            </div>
                            {this.props.paused && <span className="paused-marker">PAUSED</span>}
                        </div>
                    </div>
                    <div className="interaction-row">
                        <div className="inventory-col">
                            <div className="interaction-header">Consumables</div>
                            <div className="interaction-tooltip" style={{fontSize: this.state.hoveredInventoryTile?.length > 8 ? '10px': 'inherit'}}>{this.state.hoveredInventoryTile}</div>
                            <div className="interaction-tile-container">
                                {this.state.selectedFighter && (() => {
                                    const consumables = this.props.inventoryManager?.inventory.filter(e => e.type === 'consumable') || [];
                                    if (!consumables.length) return null;
                                    const grouped = {};
                                    consumables.forEach(unit => {
                                        if (!unit) return;
                                        const key = unit.name;
                                        if (!grouped[key]) grouped[key] = [];
                                        grouped[key].push(unit);
                                    });
                                    return Object.keys(grouped).map((name) => {
                                        const group = grouped[name];
                                        const unit = group[0];
                                        const count = group.length;
                                        return (
                                            <div key={name} className='interaction-tile-wrapper' style={{position: 'relative'}}>
                                                <div
                                                    className={`interaction-tile consumable`}
                                                    style={{backgroundImage: `url(${images[unit.icon]}), radial-gradient(white 40%, black 80%)`, cursor: 'pointer'}}
                                                    onClick={() => this.combatInventoryTileClicked(unit)}
                                                    onMouseEnter={() => this.inventoryTileHovered(unit.name)}
                                                    onMouseLeave={() => this.inventoryTileHovered(null)}
                                                >
                                                </div>
                                                <div className="interaction-tile-overlay" style={{width: `${unit.cooldown_position}%`, transition: unit.cooldown_position === 0 ? '0s' : '0.2s'}}></div>
                                                {count > 1 && (
                                                    <div className="stack-badge">{this.romanNumeral(count)}</div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                        <div className="specials-col">
                            <div className="interaction-header">Specials</div>
                            <div className="interaction-tooltip">{this.state.hoveredSpecialTile}</div>
                            <div className="interaction-tile-container">
                                {this.state.selectedFighter?.specials?.map((a, i)=>{
                                    const cm = this.props.combatManager;
                                    const fallbackSpecial = (typeof a === 'string' && cm && cm.specialsMatrix)
                                        ? cm.specialsMatrix[a]
                                        : null;
                                    const normalizedSpecial = (typeof a === 'string')
                                        ? (cm?.resolveSpecial?.([a], a) || fallbackSpecial || { name: a.replaceAll('_', ' '), key: a })
                                        : a;
                                    const iconCandidate = normalizedSpecial?.iconUrl || normalizedSpecial?.icon;
                                    const resolveIconSource = (candidate) => {
                                        if (!candidate) return '';
                                        if (typeof candidate === 'string') {
                                            const trimmed = candidate.trim();
                                            if (!trimmed) return '';
                                            if (trimmed.startsWith('url(')) {
                                                return trimmed.replace(/^url\((.*)\)$/i, '$1').replace(/^['\"]|['\"]$/g, '');
                                            }
                                            const mapped = images[trimmed];
                                            if (mapped) return mapped.default || mapped;
                                            return trimmed;
                                        }
                                        if (typeof candidate === 'object' && candidate.default) return candidate.default;
                                        return '';
                                    };
                                    const cssUrl = (value) => {
                                        if (!value) return '';
                                        const normalizedValue = String(value).trim().replace(/^['\"]|['\"]$/g, '');
                                        return `url("${encodeURI(normalizedValue)}")`;
                                    };
                                    const specialIcon = resolveIconSource(iconCandidate);
                                    const specialBackgroundImage = specialIcon
                                        ? `${cssUrl(specialIcon)}, radial-gradient(white 40%, black 80%)`
                                        : 'radial-gradient(white 40%, black 80%)';
                                    return normalizedSpecial && <div key={i} className='interaction-tile-wrapper'>
                                                <div 
                                                style={{backgroundImage: specialBackgroundImage, cursor: 'pointer'}} 
                                                className={`interaction-tile special ${normalizedSpecial.selected ? 'selected' : ''}`}
                                                onClick={() => this.specialTileClicked(normalizedSpecial)} 
                                                onMouseEnter={() => this.specialTileHovered(normalizedSpecial)} 
                                                onMouseLeave={() => this.specialTileHovered(null)}>
                                                </div>
                                                <div className="interaction-tile-overlay" style={{width: `${normalizedSpecial.cooldown_position}%`, transition: normalizedSpecial.cooldown_position === 0 ? '0s' : '0.2s', backgroundColor: normalizedSpecial.cooldown_position === 100 && this.state.selectedFighter?.energy >= 100 ? 'green' : '#c2bd0f'}}></div>
                                            </div>
                                })}
                            </div>
                        </div>
                        <div className="spells-col" style={{width: this.state.glyphTrayExpanded ? '100px' : '0px'}}>
                            <div className="interaction-header">Spells</div>
                            <div className="interaction-tooltip">{this.state.hoveredSpellTile}</div>
                            <div className="interaction-tile-container">
                                {(() => {
                                    // Group spells by type
                                    const spells = this.state.selectedFighter?.specialActions?.filter(a => a.type === 'spell') || [];
                                    if (!spells.length) return null;
                                    const grouped = {};
                                    spells.forEach(spellUnit => {
                                        if (!spellUnit) return;
                                        const spellType = spellUnit.subtype;
                                        if (!grouped[spellType]) grouped[spellType] = [];
                                        grouped[spellType].push(spellUnit);
                                    });
                                    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V'];
                                    return Object.keys(grouped).map((type, idx) => {
                                        const group = grouped[type];
                                        const spellUnit = group[0];
                                        const count = group.length;
                                        return (
                                            <div key={type} className='interaction-tile-wrapper' style={{position: 'relative'}}>
                                                <div
                                                    style={{ backgroundImage: `url(${spellUnit.iconUrl}), radial-gradient(white 0%, black 60%)`, cursor: 'pointer' }}
                                                    className={`interaction-tile special ${spellUnit.selected ? 'selected' : ''}`}
                                                    onClick={() => this.fireSpell(spellUnit)}
                                                    onMouseEnter={() => this.spellTileHovered(spellUnit)}
                                                    onMouseLeave={() => this.spellTileHovered(null)}>
                                                </div>
                                                {count > 0 && (
                                                    <div className={`stack-badge small`}>{romanNumerals[Math.min(count, 5)]}</div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                        <div className="attacks-col">
                            <div className="interaction-header">Attacks</div>
                            <div className="interaction-tooltip">{this.state.hoveredAttackTile}</div>
                            <div className="interaction-tile-container">
                                {(() => {
                                    const grouped = {};
                                    (this.state.selectedFighter?.attacks || []).forEach((attack) => {
                                        if (!attack) return;
                                        const key = `${attack.name || attack.key || 'attack'}__${attack.icon || ''}__${attack.range || ''}`;
                                        if (!grouped[key]) grouped[key] = [];
                                        grouped[key].push(attack);
                                    });

                                    return Object.keys(grouped).map((groupKey) => {
                                        const group = grouped[groupKey];
                                        if (!group || group.length === 0) return null;
                                        const displayAttack = group.find((unit) => unit && unit.cooldown_position === 100) || group[0];
                                        if (!displayAttack) return null;

                                        const cooldownPosition = typeof displayAttack.cooldown_position === 'number'
                                            ? displayAttack.cooldown_position
                                            : 100;
                                        const cooldownRemaining = Math.max(0, Math.min(100, 100 - cooldownPosition));

                                        return <div key={groupKey} className='interaction-tile-wrapper'>
                                                    <div 
                                                    className={`interaction-tile ${cooldownPosition === 100 ? 'available' : ''}`} 
                                                    style={{backgroundImage: "url(" + displayAttack.icon + ")", cursor: this.state.showCrosshair ? 'crosshair' : (cooldownPosition === 100 ? 'pointer' : '')}} 
                                                    onClick={() => this.attackTileClicked(displayAttack)} 
                                                    onMouseEnter={() => this.attackTileHovered(displayAttack.name)} 
                                                    onMouseLeave={() => this.attackTileHovered(null)}
                                                    >
                                                    </div>
                                                    {cooldownRemaining > 0 && (
                                                        <div
                                                            className="interaction-tile-overlay radial"
                                                            style={{ '--cooldown-remaining': `${cooldownRemaining}%` }}
                                                        ></div>
                                                    )}
                                                    {group.length > 1 && <div className="stack-badge">{this.romanNumeral(group.length)}</div>}
                                                </div>
                                    });
                                })()}
                            </div>
                        </div>
                        <div className="target-col">
                            <div className="interaction-header">Target</div>
                            <div className="interaction-tooltip"> </div>
                            <div className="interaction-tile-container">
                                {this.state.selectedFighter && this.state.selectedFighter.name !== 'Loryastes' && Object.values(this.state.battleData).filter(e => (e.isMonster || e.isMinion) && !e.dead && !e.invisible && !e.isVCT).map((a)=>{
                                    return <div key={a.id} className='interaction-tile-wrapper'>
                                                <div 
                                                    style={{backgroundImage: "url(" + a.portrait + ")", cursor: this.state.showCrosshair ? 'crosshair' : ''}} 
                                                    className={`interaction-tile target ${selectedTargetId === a.id ? 'targetted' : ''}`} 
                                                    onClick={() => this.targetTileClicked(a)} 
                                                    onMouseEnter={() => this.targetTileHovered(a)} 
                                                    onMouseLeave={() => this.targetTileHovered(null)}>
                                                </div>
                                            </div>
                                })}

                                {this.state.selectedFighter && this.state.selectedFighter.name === 'Loryastes' && Object.values(this.state.battleData).filter(e => !e.isMonster && !e.isMinion && e.name !== 'Loryastes' && !e.dead && !e.invisible).map((a)=>{
                                return <div 
                                    key={a.id}
                                    style={{backgroundImage: "url(" + a.portrait + ")", cursor: this.state.showCrosshair ? 'crosshair' : ''}} 
                                    className={`interaction-tile target ${selectedTargetId === a.id ? 'targetted' : ''}`} 
                                    onClick={() => this.targetTileClicked(a)} 
                                    onMouseEnter={() => this.targetTileHovered(a)} 
                                    onMouseLeave={() => this.targetTileHovered(null)}
                                    >
                                    </div>
                                })}
                            </div>
                        </div>
                        <div className="combo-col">

                        </div>
                        <div className="queue-col">
                            <div className="interaction-header">Event Log</div>
                            <div className="event-log-container" ref={this.combatLogContainerRef}>
                                {this.state.combatLog.map((entry, index) => {
                                    const isLatest = index === this.state.combatLog.length - 1;
                                    return (
                                        <div
                                            key={entry.id || index}
                                            ref={isLatest ? this.latestCombatLogEntryRef : null}
                                            className="event-log-entry"
                                        >
                                            {entry.message}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>}
            </div>
        );
    }
}

export default MonsterBattle;