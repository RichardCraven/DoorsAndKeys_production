import React from 'react';

import { INTERVALS } from '../utils/shared-constants';
import '../styles/dungeon-board.scss'
import Tile from '../components/tile'
import MonsterBattle from './sub-views/MonsterBattle';
import CardDuel from './sub-views/CardDuel';
// import ExpositionPane from './sub-views/ExpositionPane';
import {
    loadAllDungeonsRequest,
    loadDungeonRequest,
    updateDungeonRequest,
    updateUserRequest,
    addDungeonRequest
  } from '../utils/api-handler';
import {storeMeta, getMeta, getUserId, getUserName} from '../utils/session-handler';
import { keyCleanup, itemCleanup, resolveItemPools, resolveMonsterPools } from '../utils/cache-cleanup';
import * as CampManager from '../utils/camp-manager';
import Typewriter from '../utils/typewriter';
import { getNextNarrativePayload } from '../utils/narrative-manager';
import { cilCaretRight, cilCaretLeft, cilMenu} from '@coreui/icons';
import  CIcon  from '@coreui/icons-react';

import { CButton, CFormSelect, CFormInput, CModal, CModalHeader, CModalTitle, CModalBody} from '@coreui/react';
import * as images from '../utils/images'
import { RITUALS } from '../utils/spells-table'
import { RECIPES } from '../utils/spells-table'
import '../styles/inventory-modal.scss'
import '../styles/quests-modal.scss'
import '../styles/camp-modal.scss'
import '../styles/narrative-overlay.scss'

const NarrativeOverlay = ({ sequence, onClose }) => {
    if (!sequence) return null;

    return (
        <div className="narrative-overlay">
            <div className="narrative-overlay__panel">
                <button className="narrative-overlay__close" onClick={onClose} aria-label="Close narrative">
                    ×
                </button>
                <div className="narrative-overlay__figure">
                    <div
                        className="narrative-overlay__image"
                        style={{ backgroundImage: `url(${sequence.narratorImage})` }}
                    />
                </div>
                <div className="narrative-overlay__content">
                    <div className="narrative-overlay__eyebrow">Narrative Sequence</div>
                    <div className="narrative-overlay__name">{sequence.narratorName}</div>
                    <div className="narrative-overlay__text">
                        <Typewriter key={sequence.id} text={sequence.text} delay={28} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// helper: convert 3/6-digit hex to rgba string
function hexToRgba(hex, alpha = 1){
    if (!hex) return `rgba(128, 128, 128, ${alpha})`; // default gray if no color
    let h = hex.replace('#','').trim();
    if(h.length === 3){
        h = h.split('').map(c=>c+c).join('');
    }
    if(h.length !== 6) return hex;
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Small subcomponent to render modal header + body based on modalType
const ModalInner = ({ modalType, updates, crew, tileSize, handleMemberClickRitual, handleCrewTileHover, setMemberRitualOptions, onLearnRitual }) => {

    // Helper: format ms as "1 hour", "3 hours", "6 hours" etc.
    const formatPrepTime = (ms) => {
        const hours = ms / (1000 * 60 * 60);
        if (hours >= 1) return hours === 1 ? '1 hour' : `${hours} hours`;
        const mins = ms / (1000 * 60);
        return mins === 1 ? '1 minute' : `${Math.round(mins)} minutes`;
    };

    return (
        <CModalBody>
            {modalType === 'Updates' && (
                <div className='updates-zone'>
                    {(updates || []).map((update, i) => (
                        <div key={i}>{update.text}</div>
                    ))}
                </div>
            )}

            {modalType === 'PrepComplete' && (
                <div>
                    <p>Spell preparation completed.</p>
                    {(updates || []).map((update, i) => (
                        <div key={i}>{update.text}</div>
                    ))}
                </div>
            )}

            {modalType === 'RitualComplete' && (
                <div className="ritual-complete-zone">
                    <div className="ritual-complete-icon"><span role="img" aria-label="sparkles">✨</span></div>
                    <h3 className="ritual-complete-title">Ritual Complete</h3>
                    {(updates || []).map((update, i) => (
                        <div key={i} className="ritual-complete-text">{update.text}</div>
                    ))}
                    <p className="ritual-complete-note">The ritual is now ready to use in combat.</p>
                </div>
            )}

            {modalType === 'FoodComplete' && (
                <div className="food-complete-zone">
                    <div className="food-complete-icon"><span role="img" aria-label="meat">🍖</span></div>
                    <h3 className="food-complete-title">Food Ready!</h3>
                    {(updates || []).map((u, i) => <div key={i} className="food-complete-text">{u.text}</div>)}
                    <p className="food-complete-note">Food has been added to your supplies.</p>
                </div>
            )}

            {modalType === 'Magic' && (
                <div className="ritual-encounter-zone">
                    <div className="ritual-encounter-header">
                        <div className="ritual-encounter-title">✦ A Nexus of Power ✦</div>
                        <div className="ritual-encounter-subtitle">
                            The air crackles with latent magic. Your wizard or sage may study the flows of power and learn a ritual.
                        </div>
                    </div>

                    {/* Magic user selector */}
                    <div className="ritual-magic-users">
                        {crew.filter(e => e.type === 'wizard' || e.type === 'sage').map((magicUser, i) => (
                            <div
                                key={i}
                                className={`ritual-magic-user-tile ${setMemberRitualOptions && setMemberRitualOptions.id === magicUser.id ? 'selected' : ''}`}
                                onClick={() => handleMemberClickRitual({ data: magicUser })}
                            >
                                <Tile
                                    id={i}
                                    tileSize={tileSize}
                                    image={magicUser.image ? magicUser.image : null}
                                    imageOverride={magicUser.portrait ? magicUser.portrait : null}
                                    contains={magicUser.type}
                                    data={magicUser}
                                    color={magicUser.color}
                                    editMode={false}
                                    type={'crew-tile'}
                                    handleClick={handleMemberClickRitual}
                                    handleHover={handleCrewTileHover}
                                    className="crew-tile"
                                />
                                <div className="ritual-magic-user-name">{magicUser.name}</div>
                            </div>
                        ))}
                    </div>

                    {/* Ritual cards — always show all 3; grey out unknown */}
                    {(() => {
                        const activeMagicUser = setMemberRitualOptions
                            || (crew.find(e => e.type === 'wizard' || e.type === 'sage'));
                        if (!activeMagicUser) return null;
                        const knownRituals = activeMagicUser.knownRituals || [];
                        const inProgressKeys = (activeMagicUser.specialActions || [])
                            .filter(a => a && a.type === 'ritual' && !a.available)
                            .map(a => a.ritualKey || a.subtype);

                        return (
                            <div className="ritual-cards">
                                {Object.values(RITUALS).map((ritual, i) => {
                                    const isKnown = knownRituals.includes(ritual.key);
                                    const isInProgress = inProgressKeys.includes(ritual.key);
                                    return (
                                        <div key={i} className={`ritual-card ${isKnown ? 'known' : 'unknown'}`}>
                                            <div className="ritual-card-header">
                                                <div
                                                    className="ritual-card-icon"
                                                    style={{
                                                        backgroundImage: `url(${images[ritual.icon] || ''})`,
                                                        ...(ritual.key === 'wardingCircle' ? { filter: 'invert(1)' } : {}),
                                                    }}
                                                />
                                                <div className="ritual-card-name">{ritual.name}</div>
                                            </div>
                                            <div className="ritual-card-flavor">{ritual.flavorText}</div>
                                            <div className="ritual-card-description">{ritual.description}</div>
                                            <div className="ritual-card-footer">
                                                <div className="ritual-card-prep-time">⏱ {formatPrepTime(ritual.prepareTime)}</div>
                                                {isInProgress ? (
                                                    <div className="ritual-card-btn preparing">Preparing…</div>
                                                ) : isKnown ? (
                                                    <div className="ritual-card-btn known-badge">Known ✓</div>
                                                ) : (
                                                    <div
                                                        className="ritual-card-btn learn-btn"
                                                        onClick={() => onLearnRitual && onLearnRitual(activeMagicUser, ritual)}
                                                    >
                                                        Learn
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}
        </CModalBody>
    )
}

// eslint-disable-next-line no-extend-native
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}
// eslint-disable-next-line no-extend-native
Date.prototype.addMinutes= function(minutes){
    this.setMinutes(this.getMinutes()+minutes);
    return this;
}
// eslint-disable-next-line no-extend-native
Date.prototype.addSeconds= function(s){
    this.setSeconds(this.getSeconds()+s);
    return this;
}
// eslint-disable-next-line no-extend-native
Date.prototype.addMinutes= function(minutes){
    this.setMinutes(this.getMinutes()+minutes);
    return this;
}
function diff_minutes(dt2, dt1){
  var diff =(dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.round(diff);
}
function diff_seconds(dt2,dt1){
    var diff =(dt2.getTime() - dt1.getTime()) / 1000;
    // diff /= 60;
    return Math.round(diff);
}

// const MAX_DEPTH = 8;
// const MAX_ROWS = 5;
// const TILE_SIZE = 100;
// const SHOW_TILE_BORDERS = false;

const MARKER_TYPES = [
    'enemy',
    'gate',
    'merchant',
    'stairs',
    'misc',
    'custom'
]

class DungeonPage extends React.Component {
    getCharacterActions = (character) => {
        // Show all potential glyphs for wizard, with only magic missile available initially
        let actions = [];
        if (character.type === 'wizard') {
            // Count available for each subtype
                const mmCount = (character.specialActions || []).filter(a => a.subtype === 'magic missile' && a.available).length;
            actions.push({
                type: 'glyph',
                name: 'Etch Glyph',
                iconUrl: images['glyph_inverted'],
                subTypes: [
                    {
                        type: 'magic missile',
                        iconUrl: images['magic_missile_inverted'],
                        available: true,
                        count: mmCount
                    },
                    {
                        type: 'doppleganger',
                        iconUrl: '',
                        available: false,
                        count: 0
                    },
                    {
                        type: 'yawning rift',
                        iconUrl: '',
                        available: false,
                        count: 0
                    }
                ]
            });

            // Prepare Ritual action — always shown for wizards; each subtype reflects a ritual
            // known/unknown is indicated by subtype.available (greyed out if unknown)
            const knownRituals = character.knownRituals || [];
            const ritualSubTypes = Object.values(RITUALS).map(r => {
                const isAvailable = knownRituals.includes(r.key);
                return {
                    type: r.name,
                    ritualKey: r.key,
                    iconUrl: images[r.icon] || '',
                    available: isAvailable,
                    count: 0
                };
            });
            actions.push({
                type: 'ritual',
                name: 'Prepare Ritual',
                iconUrl: images['magic_moon_1'] || '',
                subTypes: ritualSubTypes
            });
        }
        // Sage also gets the Prepare Ritual action (same ritual pool as wizard)
        if (character.type === 'sage') {
            const knownRituals = character.knownRituals || [];
            const ritualSubTypes = Object.values(RITUALS).map(r => {
                const isAvailable = knownRituals.includes(r.key);
                return {
                    type: r.name,
                    ritualKey: r.key,
                    iconUrl: images[r.icon] || '',
                    available: isAvailable,
                    count: 0
                };
            });
            actions.push({
                type: 'ritual',
                name: 'Prepare Ritual',
                iconUrl: images['magic_moon_1'] || '',
                subTypes: ritualSubTypes
            });
        }
        // Add other class logic here as needed
        // Compute per-action maximum: only count subtypes belonging to that action type.
        // A shared global count caused the ritual sub-menu to show "maximum reached" when
        // the wizard had 3+ etched glyphs — rituals have no count so they should never cap.
        const getMaxReachedForAction = (action) => {
            const actionCount = (action.subTypes || []).reduce((sum, s) => sum + (s.count || 0), 0);
            return actionCount >= 3;
        };
        return <div className='actions-container'>
            {actions.map((action, i) => {
                const maximumReached = getMaxReachedForAction(action);
                // find the active special action that matches THIS action's type
                // (e.g. 'glyph'/'spell' row shows spell progress; 'ritual' row shows ritual progress)
                const activeAction = (character.specialActions || []).find(a => {
                    if (!a || !a.startDate || !a.endDate) return false;
                    if (a.type !== action.type && !(action.type === 'glyph' && a.type === 'spell')) return false;
                    const start = new Date(a.startDate);
                    const end = new Date(a.endDate);
                    const now = new Date();
                    return now >= start && now < end;
                });
                return (
                <div className={`action-wrapper action-wrapper--${action.type}`} key={i}>
                    <div className='action-hover-wrapper' onClick={() => this.handleActionClick(action)} style={{
                        border: `${this.getActionCooldownPercentage() && (character.specialActions || []).find(e=>e.type === action.type) ? '1px solid #635b4a' : ''}`
                    }}>
                        {/* placeholder used by canvas to draw high-frequency progress overlays */}
                        {(() => {
                            // Use a stable placeholder id so the DOM node isn't recreated on every render.
                            // Recreating the node caused the canvas overlay to flicker when it tried to
                            // draw into a rapidly-unmounting element. Use the character id/type and
                            // action type to form a stable key.
                            const placeholderId = `po-${character.id || character.type}-${action.type}`;
                            const start = activeAction ? activeAction.startDate : '';
                            const end = activeAction ? activeAction.endDate : '';
                            return (
                                <div
                                    id={placeholderId}
                                    ref={el => this.placeholderRef(el, placeholderId, start, end)}
                                    className="progress-overlay progress-overlay-placeholder"
                                    data-start={start}
                                    data-end={end}
                                ></div>
                            );
                        })()}
                        <div className='action-icon' style={{backgroundImage: `url(${action.iconUrl})`}}></div>
                        <div className="action-text">{action.name}</div>
                    </div>
                    {/* <div className="info-icon" style={{backgroundImage: `url(${images['info']})`}}></div> */}
                    <div className={`action-sub-menu ${(Array.isArray(this.state.actionMenuTypeExpanded) ? this.state.actionMenuTypeExpanded : []).includes(action.type) ? 'expanded' : ''}`}>
                        {maximumReached && <div className='max-reached'>maximum reached</div>}
                        {action.subTypes && action.subTypes.map((subType, j) => (
                            <div key={j} onClick={() => this.handleActionSubtypeClick(action, subType)}
                                className={`action-subtype ${this.getSubtypeClass(subType, maximumReached)} `}>
                                {subType.type} {subType.count !== 0 && this.getSubtypeImageCountElement(subType)}
                            </div>
                        ))}
                    </div>
                </div>
                )
            })}
        </div>;
    }
    
    // Scans crew specialActions for finished preparations, marks availability, optionally marks notified,
    // persists meta and returns any collected updates.
    checkAndCollectFinishedSpecialActions = ({ markNotified = true } = {}) => {
        const meta = getMeta();
        let updates = [];
        let modified = false;
        let numeralUpdate = false;
        let hasRitualUpdate = false;

        meta.crew.forEach(member => {
            (member.specialActions || []).forEach(a => {
                if (!a || !a.endDate) return;
                const end = new Date(a.endDate);
                const now = new Date();
                        if (end - now < 0) {
                    if (!a.available) {
                        a.available = true;
                        modified = true;
                        numeralUpdate = true;
                    }
                    if (markNotified) {
                        if (!a.notified) {
                            const isRitual = a.type === 'ritual';
                            if (isRitual) hasRitualUpdate = true;
                            const updateText = isRitual
                                ? `${member.name}'s ritual "${a.name}" is complete and ready to use`
                                : `${member.name} has finished ${a.name}`;
                            updates.push({
                                text: updateText,
                                owner: `${member.name}`,
                                actionType: a.type,
                                ritualKey: a.ritualKey || null
                            });
                            a.notified = true;
                            modified = true;
                        }
                    } else {
                        if (!a.notified) {
                            const isRitual = a.type === 'ritual';
                            if (isRitual) hasRitualUpdate = true;
                            const updateText = isRitual
                                ? `${member.name}'s ritual "${a.name}" is complete and ready to use`
                                : `${member.name} has finished ${a.name}`;
                            updates.push({
                                text: updateText,
                                owner: `${member.name}`,
                                actionType: a.type,
                                ritualKey: a.ritualKey || null
                            });
                        }
                    }
                }
            });
        });

        if (modified) {
            meta.crew = meta.crew; // eslint-disable-line no-self-assign
            storeMeta(meta);
            this.props.crewManager.crew = meta.crew;
            this.props.saveUserData();
        }

        return { updates, modified, numeralUpdate, hasRitualUpdate };
    }
    getRotateDegreesLeft = (percentage) => {
        let deg = Math.floor(percentage / 100 * 360);
        return deg;
    }

    getRotateDegreesRight = (percentage) => {
        let deg = Math.floor(percentage / 100 * 360);
        if (percentage >= 50) deg = 180;
        return deg;
    }
    realTimeSpecialActionCheckInterval = null;
    prepCompleteTimeout = null;
    // Canvas-based cooldown overlay for high-frequency updates
    cooldownCanvas = null;
    cooldownAnimationFrame = null;
    constructor(props){
        super(props)
        this.monsterBattleComponentRef = React.createRef()
        this.devConsoleInputRef = React.createRef()
        this.devConsoleOutputRef = React.createRef()
        this.playerFloatRef = React.createRef()
        // internal registry of active placeholders (id -> { el, start:Date, end:Date })
        this._placeholderRegistry = new Map();
        this._nextPlaceholderId = 1;
        this._lastDrawTimestamp = 0;
        this._fpsLimit = 30; // cap draw loop to 30fps
        // Breadcrumb trail: Map keyed "boardIndex:row:col" → { boardIndex, row, col, ts, seq }
        this._breadcrumbs = new Map();
        this._breadcrumbSeq = 0;
        this.state = {
            tileSize: 0,
            boardSize: 0,
            tiles: [],
            overlayTiles: [],
            spawn: {},
            showMessage: false,
            messageToDisplay: '',
            showSaving: true,
            intervalId: null,
            showDarkMask: false,
            currentBoard: '',
            leftPanelExpanded: false,
            rightPanelExpanded: false,
            inventoryHoverMatrix: {},
            crewHoverMatrix: {},
            selectedCrewMember: {},
            pending: null,
            showInventoryPopup: false,
            activeInventoryItem: null,
            keysLocked: false,
            inMonsterBattle: false,
            monster: null,
            crewSize: 0,
            paused: false,
            minimap: [],
            minimapZoomedTile: null,
            minimapMarkerTrayOpen: false,
            minimapPlaceMapMarkerStarted: false,
            minimapIndicators: [],
            overlayHoveredTileId: null,
            mapMarkerInput: React.createRef(),
            markerSelectVal: React.createRef(),
            levelTracker: [
                {id: 2, active: false},
                {id: 1, active: false},
                {id: 0, active: true},
                {id: -1, active: false},
                {id: -2, active: false},
            ],
            markerName: '',
            markerType: '',
            descriptionText: '',
            hoveredInventoryItem: null,
            actionsTrayExpanded: false,
            actionMenuExpanded: '',
            modalType: '',
            showModal: false,
            updates: [],
            timeToRespawn: '',
            itemTimeToRespawn: '',
            respawnUpdateInterval: null,
            monsterBattleTileId: null,
            setMemberRitualOptions: null,
            ritualWrecked: false,
            shiftDown: false,
            showFullScreen: false
            , showCardDuelModal: false
            , cardDuelTileId: null
            , toastMessage: null
            , mapZoomedLevelId: null
            , mapUnzoomingLevelId: null
            , mapRevealAfterUnzoom: false
            , mapPendingZoomLevelId: null
            , mapSelectedLevelId: null
            // floating player animation state
            , playerFloatVisible: false
            , playerFloatStyle: { left: 0, top: 0, transform: 'translate3d(0px, 0px, 0px)' }
            , playerAnimating: false
            , animOriginIndex: null
            , animDestIndex: null
            , devConsoleOpen: false
            , devConsoleInput: ''
            , devConsoleOutput: []
            , showQuestsPopup: false
            , showCampPopup: false
            , campWarningMessage: null
            , showFoodPrepOverlay: false
            , showSpellsOverlay: false
            , showMapOverlay: false
            , activeNarrativeSequence: null
            , showNarrativeOverlay: false
        }
    // Native browser tooltip will be used for death-tracker; no custom tooltip state required.
        // Track timers/intervals created by this component so we can clear on unmount
        this._timers = [];
        this._intervals = [];
        this._setTimeout = (fn, t) => { const id = setTimeout(fn, t); try { this._timers.push(id); } catch(e){}; return id };
        
        this._setInterval = (fn, t) => { const id = setInterval(fn, t); try { this._intervals.push(id); } catch(e){}; return id };
    }

    // Reverted to native browser tooltip; no custom tooltip lifecycle is necessary.
    
        componentDidUpdate(prevProps, prevState) {
            // Auto-scroll dev console output to bottom when new output is added
            if (
                this.state.devConsoleOpen &&
                this.devConsoleOutputRef &&
                this.devConsoleOutputRef.current &&
                prevState.devConsoleOutput !== this.state.devConsoleOutput
            ) {
                // Defer scroll to ensure DOM is updated with new output
                setTimeout(() => {
                    const outputDiv = this.devConsoleOutputRef.current;
                    if (outputDiv) {
                        console.log('OUTPUT DIV: ', outputDiv);
                        outputDiv.scrollTop = outputDiv.scrollHeight;
                    }
                    if (
                        this.state.devConsoleOpen &&
                        this.devConsoleOutputRef &&
                        this.devConsoleOutputRef.current &&
                        prevState.devConsoleOutput !== this.state.devConsoleOutput
                    ) {
                        // Defer scroll to ensure DOM is updated with new output
                        setTimeout(() => {
                            const outputDiv = this.devConsoleOutputRef.current;
                            if (outputDiv && outputDiv.lastElementChild) {
                                outputDiv.lastElementChild.scrollIntoView({ behavior: 'auto' });
                            }
                        }, 0);
                    }
                }, 0);
            }
    }
    UNSAFE_componentWillMount(){
        let tileSize = this.getTileSize(),
            boardSize = tileSize*15;
        this.initializeListeners();
        // this.startSaveInterval();
        if(this.props.mapMaker) this.props.mapMaker.initializeTiles();
        let arr = []
        for(let i = 0; i < 9; i++){
            arr.push([])
        }
        const meta = getMeta();
        console.log('META:', meta);
        // meta.crew[0].stats.hp = 1000;
        // remove this after debugging ^

        // Initialize crew-level resource stats if not yet set
        if (meta) {
            let metaDirty = false;
            if (typeof meta.food !== 'number') { meta.food = 55; metaDirty = true; }
            if (typeof meta.resolve !== 'number') { meta.resolve = 100; metaDirty = true; }
            // DEV: force deathTracker to 2 on load so the next battle loss triggers final death
            // meta.deathTracker = 2; metaDirty = true;
            if (metaDirty) { try { storeMeta(meta); } catch(e) {} }
        }

        // const meta = null
        this.props.boardManager.establishAvailableItems(this.props.inventoryManager.items);

        
        if(!meta || !meta.dungeonId){
            console.log('DungeonPage.componentWillMount: no dungeonId, calling initializeCrew with meta.crew=', meta && meta.crew);
            this.props.crewManager.initializeCrew(meta.crew);
            itemCleanup(null, meta.crew);
            if (this.props.inventoryManager && typeof this.props.inventoryManager.refreshWeaponStats === 'function') {
                this.props.crewManager.crew.forEach(m => { if (m && Array.isArray(m.inventory)) m.inventory = this.props.inventoryManager.refreshWeaponStats(m.inventory); });
            }
            this.loadNewDungeon();
        } else {
            this.props.inventoryManager.initializeItems(meta.inventory);

            // this.props.inventoryManager.addItem(this.props.inventoryManager.allItems['minor_key'])

            console.log('DungeonPage.componentWillMount: dungeonId=', meta.dungeonId, 'calling initializeCrew with meta.crew=', meta.crew);
            this.props.crewManager.initializeCrew(meta.crew);
            if (this.props.inventoryManager && typeof this.props.inventoryManager.refreshWeaponStats === 'function') {
                this.props.crewManager.crew.forEach(m => { if (m && Array.isArray(m.inventory)) m.inventory = this.props.inventoryManager.refreshWeaponStats(m.inventory); });
            }
            this.loadExistingDungeon(meta.dungeonId)
        }
        // Set selectedCrewMember synchronously here (crew was just initialized above).
        // loadExistingDungeon is async so its setState races; setting it now ensures the
        // crew panel renders immediately without waiting for the dungeon fetch to resolve.
        const initialSelectedCrewMember = (meta && meta.crew && meta.crew.find(c => c.selected)) || (meta && meta.crew && meta.crew[0]) || {};
        const minimap = [];
        for(let i = 0; i<9; i++){
            minimap.push({active: false})
        }
        
        // Consolidated check: mark finished special actions available and collect updates
        const { updates, modified } = this.checkAndCollectFinishedSpecialActions({ markNotified: false }); // eslint-disable-line no-unused-vars
        this.setState((state, props) => {
            return {
                tileSize,
                boardSize,
                leftPanelExpanded: meta?.leftExpanded,
                rightPanelExpanded: meta?.rightExpanded,
                // persist/rehydrate crew actions tray expanded state
                crewActionsTrayExpanded: meta?.crewActionsTrayExpanded || false,
                crewSize: meta.crew.length,
                minimap,
                updates,
                selectedCrewMember: initialSelectedCrewMember,
                actionsTrayExpanded: initialSelectedCrewMember ? initialSelectedCrewMember.actionsTrayExpanded : false,
                actionMenuTypeExpanded: initialSelectedCrewMember ? (Array.isArray(initialSelectedCrewMember.actionMenuTypeExpanded) ? initialSelectedCrewMember.actionMenuTypeExpanded : (initialSelectedCrewMember.actionMenuTypeExpanded ? [initialSelectedCrewMember.actionMenuTypeExpanded] : [])) : [],
                // Do NOT open the modal at mount time — the CModal 'modal-open' body class
                // from an immediately-visible modal can persist and trap all clicks if a
                // second modal (quests popup) opens before CoreUI finishes the close animation.
                // The interval will show it once the dungeon is loaded.
                modalType: '',
                showModal: false
            };
        });
    }

    handleDeathTrackerChanged = (deaths) => {
        try {
            const meta = getMeta() || {};
            meta.deathTracker = deaths;
            storeMeta(meta);
            // trigger a re-render so UI elements that read meta will update
            this.forceUpdate();
        } catch (e) {
            console.warn('handleDeathTrackerChanged failed', e);
        }
    }

    // --- Card Duel modal helpers ---
    openCardDuel = (tileId) => {
        this.setState({ showCardDuelModal: true, cardDuelTileId: tileId, toastMessage: null });
    }

    closeCardDuel = () => {
        this.setState({ showCardDuelModal: false, cardDuelTileId: null });
    }

    handleCardDuelFinish = (result) => {
        try{
            if(result && result.winner === 'player'){
                console.log('you win');
            } else if(result && result.winner === 'reaper'){
                // Surface a toast informing of the pending tax, but DO NOT apply it here.
                const taxPercent = 25;
                this.setState({ toastMessage: `You lost the duel — pending tax ${taxPercent}% gold (NOT applied in test)` });
            }
        } catch(e){ console.warn('handleCardDuelFinish failed', e); }
        this.closeCardDuel();
    }

    componentDidMount(){
        // Migration: normalize legacy equippedSlot keys to 'pet'
        try {
            const metaForMigration = getMeta() || {};
            let migrated = false;
            (metaForMigration.crew || []).forEach(member => {
                (member.inventory || []).forEach(item => {
                    try {
                        if (item && item.equippedSlot === 'bottom-left') {
                            item.equippedSlot = 'pet';
                            migrated = true;
                        }
                    } catch (e) {}
                });
            });
            if (migrated) {
                try { storeMeta(metaForMigration); } catch (e) {}
                try { updateUserRequest(getUserId(), metaForMigration).catch(()=>{}); } catch (e) {}
            }
        } catch (e) {}
        
        // One-time debug initializer: add one of each sword to the player's inventory
        try {
            const metaDebug = getMeta() || {};
            // Only run once: if debug flag is falsy, add swords and mark debug true
            if (!metaDebug.debug && this.props && this.props.inventoryManager) {
                try {
                    const im = this.props.inventoryManager;
                    // pick weapon keys that look like swords
                    const swordKeys = (im.weapons_names || []).filter(k => typeof k === 'string' && k.endsWith('_sword'));
                    if (swordKeys.length > 0) {
                        im.addItemsByName(swordKeys);
                        // persist inventory into meta and mark debug
                        metaDebug.inventory = {
                            items: im.inventory,
                            gold: im.gold,
                            shimmering_dust: im.shimmering_dust,
                            totems: im.totems
                        };
                        metaDebug.debug = true;
                        try { storeMeta(metaDebug); } catch(e) {}
                        try { updateUserRequest(getUserId(), metaDebug).catch(()=>{}); } catch(e) {}
                        // Trigger any higher-level save handler if provided
                        try { if (this.props.saveUserData) this.props.saveUserData(); } catch(e) {}
                    }
                } catch(e) { console.warn('One-time debug sword initialization failed', e); }
            }
        } catch(e) {}
        // Real-time check for completed special actions
    this.realTimeSpecialActionCheckInterval = this._setInterval(() => {
        // If quests popup is visible, or another modal is already open, suppress
        // additional modals so they don't stack (two CModal backdrops trap all clicks).
        try { if (this.state.showQuestsPopup || this.state.showModal) return; } catch(e) {}
            // Use centralized helper to find finished actions and optionally mark them notified
            const { updates, modified, numeralUpdate, hasRitualUpdate } = this.checkAndCollectFinishedSpecialActions({ markNotified: true });

            const meta = getMeta();

            if (updates.length > 0) {
                // Also update selectedCrewMember reference so numerals/counts update immediately
                let selectedCrewMember = this.state.selectedCrewMember;
                if (selectedCrewMember && selectedCrewMember.id) {
                    const updated = meta.crew.find(c => c.id === selectedCrewMember.id);
                    if (updated) selectedCrewMember = { ...updated };
                }
                // Use RitualComplete modal if the finished action was a ritual; otherwise PrepComplete
                const completionModalType = hasRitualUpdate ? 'RitualComplete' : 'PrepComplete';
                    this.setState({
                        updates,
                        modalType: completionModalType,
                        showModal: true,
                        selectedCrewMember,
                        numeralUpdate: (this.state.numeralUpdate || false) ? false : true // toggle dummy state
                    }, () => {
                        this.forceUpdate();
                        // auto-dismiss completion modal after a short delay
                        try {
                            if (this.prepCompleteTimeout) clearTimeout(this.prepCompleteTimeout);
                        } catch (e) {}
                        this.prepCompleteTimeout = this._setTimeout(() => {
                            if ((this.state.modalType === 'PrepComplete' || this.state.modalType === 'RitualComplete') && this.state.showModal) {
                                this.onUpdateModalClosed();
                            }
                        }, 3500);
                    });
            } else if (modified || numeralUpdate) {
                // If no popup, still force update for numeral/count UI
                this.setState(prevState => {
                    let selectedCrewMember = prevState.selectedCrewMember;
                    if (selectedCrewMember && selectedCrewMember.id) {
                        const updated = meta.crew.find(c => c.id === selectedCrewMember.id);
                        if (updated) selectedCrewMember = { ...updated };
                    }
                    return { selectedCrewMember, numeralUpdate: (prevState.numeralUpdate || false) ? false : true };
                }, () => {
                    this.forceUpdate();
                });
            } else {
                // No updates/modified flags — but the cooldown visuals rely on frequent re-renders
                // (getActionCooldownPercentage uses current time). Only trigger a lightweight
                // re-render if any special action is currently in-progress to avoid needless work.
                const anyActive = meta.crew && meta.crew.some(member =>
                    (member.specialActions || []).some(a => {
                        if (!a || !a.startDate || !a.endDate) return false;
                        const start = new Date(a.startDate);
                        const end = new Date(a.endDate);
                        const now = new Date();
                        return now >= start && now < end;
                    })
                );
                if (anyActive) {
                    // ensure canvas draw loop is running — no setState needed, the rAF
                    // loop draws independently of React renders so triggering a re-render
                    // here only caused the placeholder refs to unmount/remount and flicker.
                        try {
                            if (!this.cooldownAnimationFrame) {
                                this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
                            }
                        } catch (e) {}
                } else {
                    // stop canvas loop if running and clear canvas
                    try {
                        if (this.cooldownAnimationFrame) {
                            cancelAnimationFrame(this.cooldownAnimationFrame);
                            this.cooldownAnimationFrame = null;
                        }
                        if (this.cooldownCanvas) {
                            const ctx = this.cooldownCanvas.getContext && this.cooldownCanvas.getContext('2d');
                            if (ctx) ctx.clearRect(0, 0, this.cooldownCanvas.width, this.cooldownCanvas.height);
                        }
                    } catch (e) {}
                }
            }

            // Check meta.campCooking for completion
            try {
                const cookMeta = getMeta() || {};
                if (cookMeta.campCooking && !cookMeta.campCooking.notified) {
                    const cookEnd = new Date(cookMeta.campCooking.endDate);
                    if (new Date() >= cookEnd) {
                        const { recipeName, foodYield } = cookMeta.campCooking;
                        cookMeta.food = (typeof cookMeta.food === 'number' ? cookMeta.food : 0) + foodYield;
                        cookMeta.campCooking.notified = true;
                        try { storeMeta(cookMeta); } catch(e) {}
                        try { updateUserRequest(getUserId(), cookMeta).catch(() => {}); } catch(e) {}
                        try { if (this.props.saveUserData) this.props.saveUserData(); } catch(e) {}
                        if (!this.state.showModal && !this.state.showQuestsPopup) {
                            this.setState({
                                updates: [{ text: `${recipeName} is ready! +${foodYield} food` }],
                                modalType: 'FoodComplete',
                                showModal: true,
                            }, () => {
                                if (this.prepCompleteTimeout) clearTimeout(this.prepCompleteTimeout);
                                this.prepCompleteTimeout = this._setTimeout(() => {
                                    if (this.state.modalType === 'FoodComplete' && this.state.showModal) {
                                        this.onUpdateModalClosed();
                                    }
                                }, 3500);
                            });
                        }
                    }
                }
            } catch(e) {}
    }, 100);
        // Create a full-page canvas used to draw cooldown overlays at high frequency
        try {
            if (!this.cooldownCanvas) {
                this.cooldownCanvas = document.createElement('canvas');
                this.cooldownCanvas.id = 'cooldownCanvas';
                Object.assign(this.cooldownCanvas.style, {
                    position: 'fixed',
                    left: '0',
                    top: '0',
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: '9999'
                });
                document.body.appendChild(this.cooldownCanvas);
            }
        } catch (e) {
            console.warn('Could not create cooldown canvas', e);
        }
        // start the draw loop only if there are active cooldowns
        try {
            if (this.hasActiveCooldowns()) {
                this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
            }
        } catch (e) {}

        // If a camp was active before a reload, rehydrate the camping state so the
        // progress continues from the stored start/end times and the endCamp is scheduled.
        try {
            const meta = getMeta() || {};
            if (meta.camping && meta.campingEnd) {
                const now = new Date();
                const end = new Date(meta.campingEnd);
                const remaining = end - now;
                if (remaining > 0) {
                    // ensure continuous draw loop while camping
                    this._forcedDraw = true;
                    if (!this.cooldownAnimationFrame) this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
                    // lock movement hotkeys while rehydrated camping is active
                    try { this.setState({ keysLocked: true }); } catch(e) {}
                    // schedule endCamp after the remaining time
                    try { this.campTimeout = this._setTimeout(() => { try { this.endCamp(); } catch(e){ console.warn('endCamp timeout failed during rehydrate', e); } }, remaining + 200); } catch(e){}
                    // refresh player visuals and overlay tiles
                    try{ if (this.props.boardManager && typeof this.props.boardManager.placePlayer === 'function') this.props.boardManager.placePlayer(this.props.boardManager.playerTile.location); } catch(e){}
                    try{ this.setState({ overlayTiles: this.props.boardManager.overlayTiles }); } catch(e){}
                } else {
                    // expired while offline / between reloads: end immediately
                    // Clear the stale camping flags from meta now so the player is not
                    // left locked on reload if endCamp throws (boardManager not ready yet).
                    try {
                        const staleMeta = getMeta() || {};
                        staleMeta.camping = false;
                        delete staleMeta.campingStart;
                        delete staleMeta.campingEnd;
                        storeMeta(staleMeta);
                    } catch(e) {}
                    // Unlock keys synchronously — endCamp may throw if boardManager isn't
                    // initialized yet (loadExistingDungeon is still in flight at this point).
                    try { this.setState({ keysLocked: false }); } catch(e) {}
                    try { this._setTimeout(() => { try { this.endCamp(); } catch(e){} }, 50); } catch(e){}
                }
            }
        } catch(e) {}
        
        this.props.boardManager.establishAddItemToInventoryCallback(this.addItemToInventory)
        this.props.boardManager.establishAddTreasureToInventoryCallback(this.addTreasureToInventory)
        this.props.boardManager.establishAddCurrencyToInventoryCallback(this.addCurrencyToInventory)
        this.props.boardManager.establishAddFoodToSuppliesCallback(this.addFoodToSupplies)
        this.props.boardManager.establishUpdateDungeonCallback(this.updateDungeon)
        this.props.boardManager.establishPendingCallback(this.setPending)
        this.props.boardManager.establishMessagingCallback(this.messaging)
        this.props.boardManager.establishRefreshCallback(this.refreshTiles)
        this.props.boardManager.establishTriggerMonsterBattleCallback(this.triggerMonsterBattle)
        this.props.boardManager.establishSetMonsterCallback(this.setMonster)
        this.props.boardManager.establishGetCurrentInventoryCallback(this.getCurrentInventory)
        this.props.boardManager.establishRitualEncounterCallback(this.triggerRitualEncounter)
        this.props.boardManager.establishNarrativeEncounterCallback(this.triggerNarrativeEncounter)

        this.props.boardManager.establishBoardTransitionCallback(this.boardTransition)
        this.props.boardManager.establishLevelChangeCallback(this.handleLevelChange)

        this.props.boardManager.establishUseConsumableFromInventoryCallback(this.useConsumableFromInventory)
        // this.props.inventoryManager.establishUseConsumableFromInventoryCallback(this.useConsumableFromInventory)

        window.addEventListener('beforeunload', this.componentCleanup);
        // Ensure initial layout calculations run once on mount so the board renders
        // correctly without requiring a manual window resize.
        try {
            this.handleResize();
        } catch (e) {}
        
    let respawnInterval = this._setInterval(()=>{
            // let meta = getMeta();
            // let respawn = new Date(meta.respawnDate);
            // if()
            // if()
            this.handleRespawnTime();
        }, 1000)
        this.setState({
            respawnUpdateInterval: respawnInterval
        })

        
        this.checkDungeon();

        // Register this component's displayMessage with App so external callers
        // (e.g. the Save button) can post messages to the dungeon message container.
        if (typeof this.props.registerMessaging === 'function') {
            this.props.registerMessaging(this.displayMessage);
        }

        // Breadcrumb decay: prune stale trail entries every 60 seconds and re-render.
        this._breadcrumbDecayInterval = this._setInterval(this._pruneBreadcrumbs, 60 * 1000);
    }

    // Compute pixel position (left, top) for a tile index within the board
    getPixelForIndex = (index) => {
        const tileSize = this.state.tileSize || 0;
        const col = index % 15;
        const row = Math.floor(index / 15);
        return { left: col * tileSize, top: row * tileSize };
    }

    // High-level move handler that performs a smooth single-stage tween for within-board moves.
    handleDirectionalMove = (direction) => {
    const TOTAL_MOVE_MS = 120;
    const BUFFER_MS = 12;
        try {
            const bm = this.props.boardManager;
            const curCoords = bm.playerTile.location;
            // detect board-edge moves and fall back to immediate boardManager methods
            if (direction === 'up' && curCoords[0] === 15) {
                bm.moveUp();
                this.setState({ tiles: [...bm.tiles], overlayTiles: bm.overlayTiles });
                this.recordBreadcrumb();
                return;
            }
            if (direction === 'down' && curCoords[0] === 29) {
                bm.moveDown();
                this.setState({ tiles: [...bm.tiles], overlayTiles: bm.overlayTiles });
                this.recordBreadcrumb();
                return;
            }
            if (direction === 'left' && curCoords[1] === 15) {
                bm.moveLeft();
                this.setState({ tiles: [...bm.tiles], overlayTiles: bm.overlayTiles });
                this.recordBreadcrumb();
                return;
            }
            if (direction === 'right' && curCoords[1] === 29) {
                bm.moveRight();
                this.setState({ tiles: [...bm.tiles], overlayTiles: bm.overlayTiles });
                this.recordBreadcrumb();
                return;
            }

            // compute destination coordinates (mirror of BoardManager.move switch)
            let destCoords = [curCoords[0], curCoords[1]];
            switch (direction) {
                case 'up': destCoords = [curCoords[0] - 1, curCoords[1]]; break;
                case 'down': destCoords = [curCoords[0] + 1, curCoords[1]]; break;
                case 'left': destCoords = [curCoords[0], curCoords[1] - 1]; break;
                case 'right': destCoords = [curCoords[0], curCoords[1] + 1]; break;
                default: break;
            }

            const originIndex = bm.getIndexFromCoordinates(curCoords);
            const destIndex = bm.getIndexFromCoordinates(destCoords);
            // Check if movement is blocked (void, locked gate, large monster, etc.)
            // If blocked, do NOT start the animation - just call the move method which
            // will handle messaging and return early
            try {
                if (bm.isMovementBlocked(destCoords)) {
                    // Call move() to trigger the gate message, but don't animate
                    switch (direction) {
                        case 'up': bm.moveUp(); break;
                        case 'down': bm.moveDown(); break;
                        case 'left': bm.moveLeft(); break;
                        case 'right': bm.moveRight(); break;
                        default: break;
                    }
                    this.setState({ tiles: [...bm.tiles], overlayTiles: bm.overlayTiles });
                    return;
                }
            } catch (e) {}
            const originPixel = this.getPixelForIndex(originIndex);
            const destPixel = this.getPixelForIndex(destIndex);

            const deltaX = destPixel.left - originPixel.left;
            const deltaY = destPixel.top - originPixel.top;

            // Choose image for floating player (camp or avatar)
            let meta = {};
            try { meta = getMeta() || {}; } catch (e) { meta = {}; }
            const playerImgKey = (meta && meta.camping) ? 'camp' : 'avatar';

            // Compute board DOM position so we can place the floating element in viewport coordinates
            let boardRect = null;
            try {
                const boardEl = document.querySelector('.center-board-wrapper .board');
                boardRect = boardEl ? boardEl.getBoundingClientRect() : null;
            } catch (e) { boardRect = null }

            // Place floating element at origin (use fixed coords so it's viewport-aligned)
            // Keep floats (no rounding) to avoid sub-pixel jumps during transform.
            const floatLeft = (boardRect ? boardRect.left : 0) + originPixel.left;
            const floatTop = (boardRect ? boardRect.top : 0) + originPixel.top;

            // Apply logical move first, then animate overlay from old world position to new one.
            switch (direction) {
                case 'up': bm.moveUp(); break;
                case 'down': bm.moveDown(); break;
                case 'left': bm.moveLeft(); break;
                case 'right': bm.moveRight(); break;
                default: break;
            }

            this.setState({
                tiles: [...bm.tiles],
                overlayTiles: bm.overlayTiles,
                playerFloatVisible: true,
                playerAnimating: true,
                animOriginIndex: originIndex,
                animDestIndex: destIndex,
                playerFloatStyle: {
                    left: floatLeft,
                    top: floatTop,
                    transform: 'translate3d(0px, 0px, 0px)',
                    backgroundImage: `url(${images[playerImgKey]})`
                }
            }, () => {
                this.recordBreadcrumb();
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        try {
                            const el = this.playerFloatRef.current;
                            if (!el) return;

                            let newBoardRect = null;
                            try {
                                const boardEl = document.querySelector('.center-board-wrapper .board');
                                newBoardRect = boardEl ? boardEl.getBoundingClientRect() : null;
                            } catch (e) { newBoardRect = null; }

                            const newDestAbsLeft = (newBoardRect ? newBoardRect.left : 0) + destPixel.left;
                            const newDestAbsTop = (newBoardRect ? newBoardRect.top : 0) + destPixel.top;
                            const fullX = newDestAbsLeft - floatLeft;
                            const fullY = newDestAbsTop - floatTop;

                            el.style.willChange = 'transform';
                            el.style.transition = `transform ${TOTAL_MOVE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
                            el.style.transform = `translate3d(${fullX.toFixed(2)}px, ${fullY.toFixed(2)}px, 0px)`;

                            this._setTimeout(() => {
                                this.setState({ playerFloatVisible: false, playerAnimating: false, animOriginIndex: null, animDestIndex: null });
                                const el2 = this.playerFloatRef.current;
                                if (el2) {
                                    el2.style.transition = '';
                                    el2.style.transform = 'translate3d(0px, 0px, 0px)';
                                    el2.style.willChange = 'auto';
                                }
                            }, TOTAL_MOVE_MS + BUFFER_MS);
                        } catch (e) {
                            console.warn('post-move tween failed', e);
                            this.setState({ playerFloatVisible: false, playerAnimating: false, animOriginIndex: null, animDestIndex: null });
                        }
                    });
                });
            });

        } catch (e) {
            console.warn('handleDirectionalMove failed', e);
            // Fallback: perform immediate move
            try {
                const bm = this.props.boardManager;
                switch (direction) {
                    case 'up': bm.moveUp(); break;
                    case 'down': bm.moveDown(); break;
                    case 'left': bm.moveLeft(); break;
                    case 'right': bm.moveRight(); break;
                    default: break;
                }
                this.setState({ tiles: [...bm.tiles], overlayTiles: bm.overlayTiles });
                this.recordBreadcrumb();
            } catch (err) {}
        }
    }
    checkDungeon = async () => {
        const allDungeons = await loadAllDungeonsRequest();
        
        let dungeons = [];
            
        allDungeons.data.forEach((e, i) => {
            let d = JSON.parse(e.content)
            d.id = e._id
            dungeons.push(d)
        })
        // const selectedDungeon = dungeons.find(e=>e.name === 'Primari');
    }
    handleRespawnTime = () => {
        const meta = getMeta() || {};
        // Ensure both monster and item respawn dates exist
        if (!meta.respawnDate) this.setNewRespawnDate();
        if (!meta.itemRespawnDate) this.setNewItemRespawnDate();

        // Monster respawn timer
        try {
            let respawn = new Date(meta.respawnDate);
            let now = new Date();
            let diffInMinutes = diff_minutes(respawn, now)
            let diffInSeconds = diff_seconds(respawn, now)
            let respawnString = ''
            if(diffInMinutes > 1){
                respawnString = `${diffInMinutes} m`
            } else if(diffInMinutes < 2 && diffInSeconds > 1){
                respawnString = `${diffInSeconds} s`
            } else {
                this.respawnMonsters();
                respawnString = ''
                this.setNewRespawnDate();
            }
            this.setState({ timeToRespawn: respawnString });
        } catch (e) {}

        // Item respawn timer (3x monster)
        try {
            let irespawn = new Date(meta.itemRespawnDate);
            let now2 = new Date();
            let idiffInMinutes = diff_minutes(irespawn, now2)
            let idiffInSeconds = diff_seconds(irespawn, now2)
            let itemRespawnString = ''
            if(idiffInMinutes > 1){
                itemRespawnString = `${idiffInMinutes} m`
            } else if(idiffInMinutes < 2 && idiffInSeconds > 1){
                itemRespawnString = `${idiffInSeconds} s`
            } else {
                this.respawnItems();
                itemRespawnString = ''
                this.setNewItemRespawnDate();
            }
            this.setState({ itemTimeToRespawn: itemRespawnString });
        } catch (e) {}
    }

    setNewItemRespawnDate = () => {
        // Item respawn interval: 20 minutes
        let soon = new Date().addMinutes(20)
        let meta = getMeta() || {};
        meta.itemRespawnDate = soon;
        try { storeMeta(meta); } catch (e) {}

        let respawn = new Date(soon);
        let now = new Date();
        let diffInMinutes = diff_minutes(respawn, now);
        let respawnString = `${diffInMinutes} m`
        this.setState({ itemTimeToRespawn: respawnString });
    }
    respawnMonsters = async () => {
        let dungeons = [],
        selectedDungeon;
        
        const allDungeons = await loadAllDungeonsRequest();

        allDungeons.data.forEach((e, i) => {
            let d = JSON.parse(e.content)
            d.id = e._id
            dungeons.push(d)
        })
        selectedDungeon = dungeons[0];
        // Fallback: if no saved templates are available, try using the current in-memory dungeon
        if (!selectedDungeon) {
            try {
                selectedDungeon = (this.props && this.props.boardManager && this.props.boardManager.dungeon) || this.dungeon || null;
            } catch (e) { selectedDungeon = null }
        }
        try {
            if (this.props.boardManager && typeof this.props.boardManager.respawnMonsters === 'function') {
                this.props.boardManager.respawnMonsters(selectedDungeon)
            } else {
                console.warn('respawnMonsters: boardManager.respawnMonsters not available');
            }
            // Persist meta after a respawn event so UI/session state is saved
            try {
                const meta = getMeta();
                storeMeta(meta);
            } catch (e) {
                // ignore storeMeta failures
            }
            if (this.props.saveUserData) {
                try {
                    this.props.saveUserData();
                } catch (e) {
                    // ignore save failures
                }
            }
        } catch (e) {
            console.warn('Error triggering respawnMonsters', e);
        }
    }
    respawnItems = async () => {
        let dungeons = [],
        selectedDungeon;
        const allDungeons = await loadAllDungeonsRequest();

        allDungeons.data.forEach((e, i) => {
            let d = JSON.parse(e.content)
            d.id = e._id
            dungeons.push(d)
        })
        selectedDungeon = dungeons[0];
        try {
            if (this.props.boardManager && typeof this.props.boardManager.respawnItems === 'function') {
                this.props.boardManager.respawnItems(selectedDungeon)
            }
            // Persist meta after an item respawn event so UI/session state is saved
            try {
                const meta = getMeta();
                storeMeta(meta);
            } catch (e) {}
            if (this.props.saveUserData) {
                try {
                    this.props.saveUserData();
                } catch (e) {}
            }
        } catch (e) {
            console.warn('Error triggering respawnItems', e);
        }
    }
    componentWillUnmount(){
        // Clear any timers/intervals created via helpers
        try { if (Array.isArray(this._timers)) { this._timers.forEach(t => clearTimeout(t)); this._timers = []; } } catch(e){}
        try { if (Array.isArray(this._intervals)) { this._intervals.forEach(i => clearInterval(i)); this._intervals = []; } } catch(e){}
        // Backwards compat: clear any direct references as well
        try { if (this.realTimeSpecialActionCheckInterval) { clearInterval(this.realTimeSpecialActionCheckInterval); } } catch(e){}
        try { if (this.prepCompleteTimeout) { clearTimeout(this.prepCompleteTimeout); this.prepCompleteTimeout = null; } } catch(e){}
        try { if (this.campTimeout) { clearTimeout(this.campTimeout); this.campTimeout = null; } } catch(e){}
        try { if (this.state && this.state.respawnUpdateInterval) { clearInterval(this.state.respawnUpdateInterval); } } catch(e){}
        // stop canvas animation and remove canvas
        try {
            if (this.cooldownAnimationFrame) {
                cancelAnimationFrame(this.cooldownAnimationFrame);
                this.cooldownAnimationFrame = null;
            }
            if (this.cooldownCanvas) {
                if (this.cooldownCanvas.parentNode) this.cooldownCanvas.parentNode.removeChild(this.cooldownCanvas);
                this.cooldownCanvas = null;
            }
        } catch (e) {
            console.warn('Error cleaning up cooldown canvas', e);
        }
        this.componentCleanup();
        window.removeEventListener('beforeunload', this.componentCleanup); 
    }
    
    componentCleanup = () => {
        window.removeEventListener('keydown', this.keyDownHandler)
        window.removeEventListener('resize', this.handleResize.bind(this));
        clearInterval(this.state.intervalId)
    }

    // Dev console handlers
    handleDevConsoleInputChange = (e) => {
        this.setState({ devConsoleInput: e.target.value });
    }

    handleDevConsoleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const raw = (this.state.devConsoleInput || '').trim();
            const cmd = raw.toLowerCase();
            // built-in commands
            const monsterCommands = ['monster-spawn','monsterspawn','mspawn'];
            const itemCommands = ['item-spawn','itemspawn','ispawn'];

            // Allow commands with optional args, e.g. "mspawn 1" or "mspawn:1"
            const monsterCommandMatch = monsterCommands.find(c => cmd.startsWith(c));
            const itemCommandMatch = itemCommands.find(c => cmd.startsWith(c));

            if (monsterCommandMatch) {
                // trigger monster spawn without touching timers
                try {
                    this.respawnMonsters();
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Triggered monster spawn (dev console)'], devConsoleInput: '' }));
                } catch (err) {
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                }
            } else if (itemCommandMatch) {
                try {
                    this.respawnItems();
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Triggered item spawn (dev console)'], devConsoleInput: '' }));
                } catch (err) {
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                }
            } else {
                // Developer: restore full health to all crew
                if (cmd === 'fullhealth' || cmd === 'full-health' || cmd === 'revive') {
                    try {
                        const cm = this.props.crewManager;
                        if (cm && Array.isArray(cm.crew)) {
                            cm.crew.forEach(m => {
                                try {
                                    // Prefer derived max hp from stats.hp or starting_hp
                                    const maxHp = (m && m.stats && typeof m.stats.hp === 'number') ? m.stats.hp : (typeof m.starting_hp === 'number' ? m.starting_hp : 1);
                                    m.hp = maxHp;
                                    m.dead = false;
                                } catch (inner) {}
                            });
                            // Spread members into new objects so React.memo on Tile detects the change
                            cm.crew = cm.crew.map(m => ({ ...m }));
                        }
                        const meta = getMeta() || {};
                        if (Array.isArray(meta.crew) && this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                            meta.crew = this.props.crewManager.crew.map(m => {
                                try {
                                    const maxHp = (m && m.stats && typeof m.stats.hp === 'number') ? m.stats.hp : (typeof m.starting_hp === 'number' ? m.starting_hp : 1);
                                    m.hp = maxHp;
                                    m.dead = false;
                                } catch (inner) {}
                                return m;
                            });
                        }
                        try { storeMeta(meta); } catch(e){}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e){}
                        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e){}
                        // Refresh selectedCrewMember and UI
                        try {
                            if (this.state.selectedCrewMember && this.state.selectedCrewMember.id) {
                                const updated = (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew.find(c => c && c.id === this.state.selectedCrewMember.id) : null;
                                if (updated) this.setState({ selectedCrewMember: { ...updated } });
                            }
                            this.forceUpdate();
                        } catch(e){}
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'All crew restored to full health'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // list available commands
                if (cmd === 'list' || cmd === 'help') {
                    const commands = [
                        'monster-spawn / monsterspawn / mspawn',
                        'item-spawn / itemspawn / ispawn',
                        'fullhealth / full-health / revive',
                        'food — fill food count to 55',
                        'kill reset — reset death tracker to 0',
                        'remove rituals — clear all learned rituals from every crew member',
                        'weapons t1 / weapons1 / weaponst1 — add 2 random tier-1 weapons',
                        'weapons t2 / weapons2 / weaponst2 — add 2 random tier-2 weapons',
                        'weapons t3 / weapons3 / weaponst3 — add 2 random tier-3 weapons',
                        'open board — jump to mapmaker board view for current board',
                        'launch cardgame — start a card duel battle',
                        'list / help'
                    ];
                    this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, ...commands], devConsoleInput: '' }));
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // kill reset — reset death tracker to 0
                if (cmd === 'kill reset') {
                    try {
                        this.handleDeathTrackerChanged(0);
                        try { updateUserRequest(getUserId(), getMeta()).catch(()=>{}); } catch(e){}
                        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e){}
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Death tracker reset to 0'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // food — fill food count to 55 and save
                if (cmd === 'food') {
                    try {
                        const meta = getMeta() || {};
                        meta.food = 55;
                        try { storeMeta(meta); } catch(e){}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e){}
                        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e){}
                        try { this.forceUpdate(); } catch(e){}
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Food set to 55'], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // weapons tier commands: weapons t1 / weapons1 / weaponst1 (and t2/t3)
                const weaponTierAlias = {
                    1: ['weapons t1', 'weapons1', 'weaponst1'],
                    2: ['weapons t2', 'weapons2', 'weaponst2'],
                    3: ['weapons t3', 'weapons3', 'weaponst3'],
                };
                const weaponTier = [1, 2, 3].find(t => weaponTierAlias[t].includes(cmd));
                if (weaponTier !== undefined) {
                    try {
                        const im = this.props.inventoryManager;
                        const allKeys = (im && Array.isArray(im.weapons_names)) ? im.weapons_names : [];
                        const tierKeys = allKeys.filter(k => im.allItems && im.allItems[k] && im.allItems[k].tier === weaponTier);
                        if (tierKeys.length === 0) {
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `No tier-${weaponTier} weapons found`], devConsoleInput: '' }));
                        } else {
                            // shuffle and take 2
                            const shuffled = tierKeys.slice().sort(() => Math.random() - 0.5).slice(0, 2);
                            im.addItemsByName(shuffled);
                            const names = shuffled.map(k => (im.allItems[k] && im.allItems[k].name) ? im.allItems[k].name : k);
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Added ${names.length} tier-${weaponTier} weapon(s): ${names.join(', ')}`], devConsoleInput: '' }));
                        }
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // launch cardgame — instantiate a card duel for testing
                if (cmd === 'launch cardgame' || cmd === 'launchcardgame' || cmd === 'card game') {
                    this.setState(prev => ({ 
                        showCardDuelModal: true, 
                        devConsoleInput: '',
                        devConsoleOpen: false,
                        devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Launching Card Duel...'] 
                    }));
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // open board — navigate to mapmaker board view for the current board
                if (cmd === 'open board') {
                    try {
                        const board = this.props.boardManager && this.props.boardManager.currentBoard;
                        if (!board || !board.id) {
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, 'Error: no current board loaded'], devConsoleInput: '' }));
                        } else {
                            // Persist handoff data so MapmakerPage picks it up on mount
                            sessionStorage.setItem('devConsoleHandoff', JSON.stringify({
                                boardId: board.id,
                                returnTo: 'dungeon',
                                consoleOpen: true
                            }));
                            this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Opening board "${board.name}" in mapmaker...`], devConsoleInput: '' }));
                            // Short delay so the output is visible before navigating
                            setTimeout(() => { window.location.href = '/mapmaker'; }, 400);
                        }
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // remove rituals — clear all learned rituals and in-progress ritual actions from every crew member
                if (cmd === 'remove rituals' || cmd === 'removerituals' || cmd === 'clear rituals' || cmd === 'clearrituals') {
                    try {
                        const cm = this.props.crewManager;
                        const ritualTypes = ['wizard', 'sage']; // eslint-disable-line no-unused-vars
                        const affectedNames = [];
                        if (cm && Array.isArray(cm.crew)) {
                            cm.crew.forEach(member => {
                                if (!member) return;
                                let changed = false;
                                if (Array.isArray(member.knownRituals) && member.knownRituals.length > 0) {
                                    member.knownRituals = [];
                                    changed = true;
                                }
                                // Also clear any in-progress ritual special actions
                                if (Array.isArray(member.specialActions)) {
                                    const before = member.specialActions.length;
                                    member.specialActions = member.specialActions.filter(a => a && a.type !== 'ritual');
                                    if (member.specialActions.length !== before) changed = true;
                                }
                                if (changed) affectedNames.push(member.name || member.type || member.id);
                            });
                        }
                        const meta = getMeta() || {};
                        meta.crew = cm.crew;
                        try { storeMeta(meta); } catch(e){}
                        try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e){}
                        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e){}
                        // Refresh selectedCrewMember if affected
                        try {
                            if (this.state.selectedCrewMember && this.state.selectedCrewMember.id) {
                                const updated = cm.crew.find(c => c && c.id === this.state.selectedCrewMember.id);
                                if (updated) this.setState({ selectedCrewMember: { ...updated } });
                            }
                            this.forceUpdate();
                        } catch(e){}
                        const msg = affectedNames.length > 0
                            ? `Rituals cleared for: ${affectedNames.join(', ')}`
                            : 'No rituals found to clear';
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, msg], devConsoleInput: '' }));
                    } catch (err) {
                        this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Error: ${err && err.message ? err.message : err}`], devConsoleInput: '' }));
                    }
                    try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
                    e.preventDefault();
                    return;
                }
                // unknown command: echo
                this.setState(prev => ({ devConsoleOutput: [...prev.devConsoleOutput, `> ${raw}`, `Unknown command: ${raw}`], devConsoleInput: '' }));
            }
            // keep focus
            try { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); } catch (err) {}
            e.preventDefault();
        } else if (e.key === 'Escape') {
            // close console
            this.setState({ devConsoleOpen: false });
        }
    }

    // Draw cooldown overlays onto the full-page canvas. This runs on requestAnimationFrame
    drawCooldowns = (timestamp) => {
        // throttle to _fpsLimit
        try {
            if (this._lastDrawTimestamp && timestamp && (timestamp - this._lastDrawTimestamp) < (1000 / this._fpsLimit)) {
                // still need to schedule next frame if active
                if (this.hasActiveCooldowns()) {
                    this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
                } else {
                    this.cooldownAnimationFrame = null;
                }
                return;
            }
            this._lastDrawTimestamp = timestamp || performance.now();
        } catch (e) {}
        try {
            const canvas = this.cooldownCanvas;
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = document.documentElement.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const cw = Math.floor(width * dpr);
            const ch = Math.floor(height * dpr);
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw;
                canvas.height = ch;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            // reset transform/clear
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(dpr, dpr);
            const now = new Date();
            try { if (!this._lastDebugLogTime) this._lastDebugLogTime = 0; } catch(e) { this._lastDebugLogTime = 0; }
            for (const [id, entry] of this._placeholderRegistry) {
                try {
                    const { el, start, end } = entry;
                    // debug: occasional log (disabled to avoid console spam)
                    if (!el || !start || !end) continue;
                    // Skip canvas drawing for the camp CSS-driven placeholder so we don't double-draw
                    try {
                        if (id === 'camp-progress-placeholder' || (el.classList && el.classList.contains && el.classList.contains('camp-anim'))) {
                            continue;
                        }
                    } catch (e) {}
                    if (now < start || now >= end) continue;
                    const pct = Math.min(1, (now - start) / (end - start));
                    const r = el.getBoundingClientRect();
                    const x = r.left;
                    const y = r.top;
                    const w = r.width;
                    const h = r.height;
                    // Skip if the element itself has zero size
                    if (w <= 0 || h <= 0) continue;
                    // Skip if any ancestor clips this element to zero height
                    // (e.g. the actions-tray collapses to height:0 with overflow:hidden —
                    // getBoundingClientRect on the child still reports its own full size,
                    // so we must check the ancestor chain ourselves)
                    let hidden = false;
                    try {
                        let ancestor = el.parentElement;
                        while (ancestor && ancestor !== document.body) {
                            const cs = window.getComputedStyle(ancestor);
                            if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
                                const ar = ancestor.getBoundingClientRect();
                                if (ar.height <= 0 || ar.width <= 0) { hidden = true; break; }
                                // also skip if the element's top edge is below the ancestor's bottom
                                if (r.top >= ar.bottom || r.bottom <= ar.top) { hidden = true; break; }
                            }
                            ancestor = ancestor.parentElement;
                        }
                    } catch(e) {}
                    if (hidden) continue;
                    // draw a semi-opaque overlay matching the original style
                    ctx.fillStyle = 'rgba(249,177,21,0.6)';
                    ctx.fillRect(x, y, w * pct, h);
                    // debug: draw logging disabled to avoid frequent console output
                } catch (inner) {
                    // skip problematic element
                }
            }

            // restore transform before next frame
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        } catch (e) {
            console.warn('Error drawing cooldowns', e);
        }

        // Schedule next frame while there are active cooldowns or forced draw is enabled
        try {
            if (this.hasActiveCooldowns() || this._forcedDraw) {
                this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
            } else {
                this.cooldownAnimationFrame = null;
            }
        } catch (e) {
            this.cooldownAnimationFrame = null;
        }
    }

    // Returns true when any placeholder indicates an in-progress cooldown
    hasActiveCooldowns = () => {
        try {
            const now = new Date();
            for (const [, entry] of this._placeholderRegistry) {
                const { start, end } = entry;
                if (!start || !end) continue;
                if (now >= start && now < end) return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }
    
    // ref callback used to register/unregister placeholders
    placeholderRef = (el, id, start, end) => {
        try {
            if (el) {
                // normalize start/end to Date
                const s = start ? new Date(start) : null;
                const e = end ? new Date(end) : null;
                this._placeholderRegistry.set(id, { el, start: s, end: e });
                // For CSS-animated elements (camp-anim), set animationDuration and animationDelay
                // imperatively on first mount so React re-renders never touch those properties.
                // Changing animationDelay on an already-running element restarts the animation,
                // causing the visible jumps. We only set it if not already applied.
                try {
                    if (el.classList && el.classList.contains('camp-anim') && !el._campAnimApplied) {
                        const now = new Date();
                        const totalSeconds = (s && e) ? Math.max(0, (e - s) / 1000) : 0;
                        const elapsedSeconds = s ? Math.max(0, (now - s) / 1000) : 0;
                        el.style.animationDuration = `${totalSeconds}s`;
                        el.style.animationDelay = `-${elapsedSeconds}s`;
                        el._campAnimApplied = true;
                    }
                } catch (e) {}
                // ensure the draw loop is running when a new active placeholder is registered
                try {
                    if (!this.cooldownAnimationFrame && (this.hasActiveCooldowns() || this._forcedDraw)) {
                        this.cooldownAnimationFrame = requestAnimationFrame(this.drawCooldowns);
                    }
                } catch (e) {}
            } else {
                // React fires ref=null just before firing ref=el on the same element during
                // re-renders (e.g. the respawn interval setState fires every second and causes
                // the whole component to re-render). Deleting the registry entry here and
                // re-adding it a frame later creates a gap that the canvas draws a blank frame
                // into, causing visible flicker.
                // Instead: just null out the el reference so the draw loop skips this entry,
                // but keep the entry itself so the start/end times survive the re-render.
                // The next ref=el call will restore the live element.
                const existing = this._placeholderRegistry.get(id);
                if (existing) {
                    existing.el = null;
                }
                // Only fully remove the entry (and possibly stop the loop) if this id was
                // never re-registered within the same microtask — schedule cleanup deferred.
                this._schedulePlaceholderCleanup(id);
            }
        } catch (e) {
            // ignore
        }
    }

    // Deferred cleanup: if a placeholder id has el===null after a short delay it has
    // truly unmounted (component removed), so stop the loop if no more active entries.
    _schedulePlaceholderCleanup = (id) => {
        try {
            setTimeout(() => {
                try {
                    const entry = this._placeholderRegistry.get(id);
                    if (!entry || entry.el !== null) return; // re-mounted, skip
                    this._placeholderRegistry.delete(id);
                    if (!this.hasActiveCooldowns() && !this._forcedDraw && this.cooldownAnimationFrame) {
                        cancelAnimationFrame(this.cooldownAnimationFrame);
                        this.cooldownAnimationFrame = null;
                        if (this.cooldownCanvas) {
                            const ctx = this.cooldownCanvas.getContext && this.cooldownCanvas.getContext('2d');
                            if (ctx) ctx.clearRect(0, 0, this.cooldownCanvas.width, this.cooldownCanvas.height);
                        }
                    }
                } catch(e) {}
            }, 100);
        } catch(e) {}
    }
    logMeta = () => {
        const meta = getMeta(); // eslint-disable-line no-unused-vars
    }
    setNewRespawnDate = () => {
        let soon = new Date().addMinutes(3)
        let meta = getMeta();
        meta.respawnDate = soon;
        storeMeta(meta)


        let respawn = new Date(soon);
        let now = new Date();
        let diffInMinutes = diff_minutes(respawn, now);


        let respawnString = `${diffInMinutes} m`

        this.setState({
            timeToRespawn: respawnString,
        })
    }
    pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
    addCurrencyToInventory = (data) => {
        let type;
        switch(data.type){
            case 'gold':
                type = 'gold';
            break;
            case 'shimmering_dust':
                type = 'shimmering dust'
            break;
            case 'totems':
                type = data.amount > 1 ? 'totems' : 'totem'
            break;
            default:
            break;
        }
        this.displayMessage(`You found ${data.amount} ${type}!`)
        this.props.inventoryManager.addCurrency(data)
    }
    addFoodToSupplies = () => {
        const crew = (this.props.crewManager && Array.isArray(this.props.crewManager.crew))
            ? this.props.crewManager.crew
            : [];
        const collectiveLevel = crew.reduce((sum, member) => {
            const level = Number(member && member.level);
            return sum + (Number.isFinite(level) ? level : 0);
        }, 0);

        let foodAmount = 30;
        if (collectiveLevel >= 20) {
            foodAmount = 90;
        } else if (collectiveLevel >= 11) {
            foodAmount = 60;
        }

        const meta = getMeta() || {};
        meta.food = (typeof meta.food === 'number' ? meta.food : 0) + foodAmount;
        storeMeta(meta);
        try { updateUserRequest(getUserId(), meta).catch(() => {}); } catch (e) {}

        this.displayMessage(`You found food! +${foodAmount} supplies`);
        this.forceUpdate();
    }
    establishAnimationCallback = () => {
        this.props.animationManager.establishAnimationCallback(this.renderAnimation)
    }
    addItemToInventory = (tile) => {
        //this is coming from a board tile
        const tileContains = tile.contains;
        this.props.inventoryManager.addItem(this.props.inventoryManager.allItems[tileContains])
        const matrix = this.state.inventoryHoverMatrix;
        this.props.inventoryManager.inventory.forEach((e,i)=>{
            matrix[i] = '';
        })
        this.displayMessage(`You found a ${tileContains}!`)
        this.setState({
            inventoryHoverMatrix: matrix
        })
    }
    addTreasureToInventory = (treasure) => {
        let item = treasure.item
        const message = `You open the treasure chest and find a ${item.replaceAll('_',' ')} and ${treasure.currency.amount} ${treasure.currency.type.replace('_',' ')}!`
        this.displayMessage(message);
        this.props.inventoryManager.addItem(this.props.inventoryManager.allItems[treasure.item])
        this.props.inventoryManager.addCurrency(treasure.currency);
    }
    useConsumableFromInventory = (item) => {
        let foundItem = this.props.inventoryManager.inventory.find(e=> e.name === item.name),
        foundIndex = this.props.inventoryManager.inventory.findIndex(e=> e.name === item.name);
        foundItem.animation = 'consumed';
        this.forceUpdate();
        this._setTimeout(()=>{
            foundItem.animation = '';
            this.props.inventoryManager.removeItemByIndex(foundIndex)
            this.forceUpdate();
            this.props.saveUserData();
        }, 500)
    }
    updateDungeon = async (dungeon) => {
        await updateDungeonRequest(dungeon.id, dungeon);
    }
    messaging = (message) => {
        this.displayMessage(message)
    }
    setPending = (pendingState) => {
        this.setState({pending: pendingState})
    }
    refreshTiles = (levelIdOverride) => {
        let newTiles = this.props.boardManager.tiles,
            newOverlayTiles = this.props.boardManager.overlayTiles

        // Ensure each visible (non-void) tile has a randomly chosen terrain background
        try {
            if (Array.isArray(newTiles) && this.props.boardManager && typeof this.props.boardManager.getContainsType === 'function') {
                const meta = getMeta() || {};
                const activeLevel = this.state.levelTracker ? this.state.levelTracker.find(e => e.active) : null;
                const currentLevelId = levelIdOverride !== undefined ? Number(levelIdOverride) : (activeLevel !== null && activeLevel !== undefined ? Number(activeLevel.id) : Number(meta.location?.levelId ?? 0));
                const terrainSet = images.getTerrainSetForLevel(currentLevelId);
                for (let i = 0; i < newTiles.length; i++) {
                    const t = newTiles[i];
                    if (!t) continue;
                    const containsType = this.props.boardManager.getContainsType(t.contains);
                    // skip void tiles or currently hidden (black) tiles — fog-of-war will mark hidden tiles as black
                    if (containsType === 'void' || t.color === 'black') continue;
                    // Always re-derive the terrain from the current level's set so that
                    // switching levels updates tile visuals. Use tile id as a stable seed
                    // so each tile always picks the same variant number across refreshes.
                    const variantIndex = Math.abs(t.id * 2654435761 >>> 0) % 16;
                    t.terrain = terrainSet[variantIndex];
                }
            }
        } catch (e) {
            // defensive: if anything goes wrong, don't block the refresh
            console.warn('refreshTiles: failed to assign terrain:', e);
        }

        this.setState({
            tiles: newTiles,
            overlayTiles: newOverlayTiles
        })
    }
    triggerMonsterBattle = (bool, tileId) => {
        // When entering combat: remember current side-panel state and
        // collapse both panels. On exit, restore the saved state.
        try {
            if (bool) {
                // entering combat - save previous panel expand/collapse state
                this._preCombatPanels = {
                    left: !!this.state.leftPanelExpanded,
                    right: !!this.state.rightPanelExpanded
                };
                this.setState({
                    keysLocked: bool,
                    inMonsterBattle: bool,
                    monsterBattleTileId: tileId,
                    leftPanelExpanded: false,
                    rightPanelExpanded: false
                });
            } else {
                // exiting combat - restore previous panel state if we saved it
                const prev = this._preCombatPanels || { left: false, right: false };
                this.setState({
                    keysLocked: bool,
                    inMonsterBattle: bool,
                    monsterBattleTileId: tileId,
                    leftPanelExpanded: !!prev.left,
                    rightPanelExpanded: !!prev.right
                });
                this._preCombatPanels = null;
            }
        } catch (e) {
            // Fallback to original behavior if anything goes wrong
            this.setState({
                keysLocked: bool,
                inMonsterBattle: bool,
                monsterBattleTileId: tileId
            })
        }
    }
    setMonster = (monsterString) => {
        // monsterString = 'beholder'
        let monster = this.props.monsterManager.getMonster(monsterString), 
        minions = null;
        if(monster && monster.minions){
            minions = [];
            monster.minions.forEach((e,i)=>{
                const minion = this.props.monsterManager.getMonster(e)
                minion.id = minion.id+i+700
                let minionName = this.pickRandom(minion.monster_names)
                minion.name = minionName
                minion.inventory = [];

                minions.push(minion)
            })
        }


        if(!monster) monster = this.props.monsterManager.getRandomMonster();
        let monsterName = this.pickRandom(monster.monster_names)
        monster.name = monsterName
        monster.inventory = [];
        this.setState({
            monster,
            minions
        })
    }
    getCurrentInventory = () => {
        return this.props.inventoryManager.inventory;
    }
    
    handleLevelChange = (newLevelId) => {
        const levelTracker = this.state.levelTracker;
        levelTracker.forEach(e=>e.active = false)
        const level = levelTracker.find(e=>e.id === newLevelId);
        if(!level){
            // level missing -- initialize better
            debugger
        }
        level.active = true;


        const meta = getMeta();
        let orientation = this.props.boardManager.currentOrientation;
        let indicatorsGroup = meta.minimapIndicators.find(e=>e.level === level.id && e.orientation === orientation)
        

        

        if(!indicatorsGroup){
            let newIndicators = []
            for(let i = 0; i < 9; i++){
                newIndicators.push({
                    enemies: [],
                    gates: [],
                    merchant: [],
                    stairs: [],
                    misc: [],
                    custom: []
                })
            }
            indicatorsGroup = {
                level: level.id,
                orientation,
                indicators: newIndicators
            }
            meta.minimapIndicators.push(indicatorsGroup)
            storeMeta(meta)
        }
        // Keep meta.location.levelId in sync so other code reading meta gets the right level
        if (meta.location) {
            meta.location.levelId = newLevelId;
            storeMeta(meta);
        }
        this.setState({
            levelTracker,
            minimapZoomedTile: null,
            minimapIndicators: indicatorsGroup.indicators
        })
        // Re-assign terrain now that the level is confirmed, bypassing the stale meta.
        this.refreshTiles(newLevelId);
    }
    boardTransition = (direction) => {
        const minimap = this.state.minimap;
        const currentIndex = minimap.findIndex(e=>e.active === true);
        let newIndex;
        minimap.forEach(e=>e.active = false)
        switch(direction){
            case 'left': 
                newIndex = currentIndex-1;
            break;
            case 'right':
                newIndex = currentIndex+1;
            break;
            case 'up':
                newIndex = currentIndex-3;
            break;
            case 'down':
                newIndex = currentIndex+3;
            break;
            default:
                break;
        }
        let zoomed = null;
        if(this.state.minimapZoomedTile !== null){
            zoomed = newIndex;
        }
        minimap[newIndex].active = true;
        this.setState({
            minimap,
            minimapZoomedTile: zoomed
        })
    }
    getTileSize(){
        const h = Math.floor((window.innerHeight/17));
        const w = Math.floor((window.innerWidth/17));
        let tsize = 0;
        if(h < w){
            tsize = h;
          } else {
            tsize = w;
        }
        return tsize;
    }

    handleResize() {
        let tileSize = this.getTileSize(),
            boardSize = tileSize*15;

        this.setState((state, props) => {
            return {
                tileSize,
                boardSize
            }
        })
    }

    initializeListeners = () => {
        window.addEventListener('keydown', this.keyDownHandler);
        // window.addEventListener('mouseup', this.mouseUpHandler);
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    startSaveInterval = () => {
        let intervalId = this._setInterval( async () => {
            this.setState(()=>{
                return {
                    showMessage : true
                }
            })
            this.props.saveUserData()
            this.displayMessage('saving...')
        }, 45000); 
        this.setState({intervalId: intervalId})
    }
    displayMessage = (message) => {
        this.setState(()=>{
            return {
                showMessage : true,
                messageToDisplay: message
            }
        })
        this._setTimeout(() => {
            this.setState(()=>{
                return {
                    showMessage : false
                }
            })
        },2500)
    }
    displayMessageAndHold = (message) => {
        this.setState(()=>{
            return {
                showMessage : true,
                messageToDisplay: message
            }
        })
    }
    toggleFullscreen = () => {
        const currentState = this.state.showFullScreen;
        this.toggleLeftSidePanel({expanded: !currentState});
        this.toggleRightSidePanel({expanded: !currentState});
        this.setState(()=>{
            return {
                showFullScreen: !currentState
            }
        })
    }

    keyDownHandler = (event) => {
        // Toggle dev console with Shift+Space
        try {
            if ((event.code === 'Space' || event.key === ' ') && event.shiftKey) {
                event.preventDefault();
                this.setState(prev => ({ devConsoleOpen: !prev.devConsoleOpen }), () => {
                    if (this.state.devConsoleOpen) {
                        // focus input after open
                        try { setTimeout(() => { if (this.devConsoleInputRef.current) this.devConsoleInputRef.current.focus(); }, 0); } catch (e) {}
                    }
                });
                return;
            }
        } catch (e) {}
        // Allow global 'i' to toggle MonsterBattle inventory when a battle is active
        // If the developer console is open, disable all hotkeys here (except Shift+Space
        // which is handled above). This prevents typed commands like 'revive' from
        // being intercepted by global shortcuts (e.g. 'i' toggling inventory).
        try {
            if (this.state.devConsoleOpen) {
                // Let the focused input handle its own key events (handleDevConsoleKeyDown)
                return;
            }
            const maybeKey = event.key;
            // Enter should confirm summary panel when visible inside MonsterBattle
            if ((maybeKey === 'Enter' || maybeKey === 'Return') && this.state.inMonsterBattle && this.monsterBattleComponentRef && this.monsterBattleComponentRef.current) {
                try {
                    const mb = this.monsterBattleComponentRef.current;
                    if (mb.state && mb.state.showSummaryPanel) {
                        event.preventDefault();
                        if (typeof mb.confirmClicked === 'function') mb.confirmClicked();
                        return;
                    }
                } catch (err) {
                    console.warn('failed to invoke MonsterBattle.confirmClicked via ref', err);
                }
            }
            if ((maybeKey === 'i' || maybeKey === 'I') && this.state.inMonsterBattle && this.monsterBattleComponentRef && this.monsterBattleComponentRef.current) {
                event.preventDefault();
                try {
                    const mb = this.monsterBattleComponentRef.current;
                    if (mb && typeof mb.toggleInventory === 'function') {
                        mb.toggleInventory();
                    } else if (mb) {
                        // fallback
                        mb.setState((prev) => ({ showInventoryPopup: !prev.showInventoryPopup }));
                    }
                } catch (err) {
                    console.warn('failed to toggle MonsterBattle inventory via ref', err);
                }
                return;
            }
            // Toggle dungeon-level inventory when not in a monster battle
            if ((maybeKey === 'i' || maybeKey === 'I') && !this.state.inMonsterBattle) {
                event.preventDefault();
                    this.setState((prev) => ({ showInventoryPopup: !prev.showInventoryPopup }));
                return;
            }
            // 'c' — toggle Camp popup (works regardless of keysLocked; blocked during battle)
            if ((maybeKey === 'c' || maybeKey === 'C') && !this.state.inMonsterBattle) {
                event.preventDefault();
                this.setState((prev) => ({ showCampPopup: !prev.showCampPopup }));
                return;
            }
            // 'q' — toggle Quests popup (blocked during battle)
            if ((maybeKey === 'q' || maybeKey === 'Q') && !this.state.inMonsterBattle) {
                event.preventDefault();
                this.setState((prev) => ({ showQuestsPopup: !prev.showQuestsPopup }));
                return;
            }
            // 'm' — open Camp Map overlay directly from dungeon (blocked during battle)
            if ((maybeKey === 'm' || maybeKey === 'M') && !this.state.inMonsterBattle) {
                event.preventDefault();
                const tracker = this.state.levelTracker || [];
                const activeLevel = tracker.find((entry) => entry && entry.active);
                const currentLevelId = activeLevel ? Number(activeLevel.id) : Number((getMeta() || {}).location?.levelId || 0);
                this.setState({
                    showCampPopup: true,
                    showMapOverlay: true,
                    showFoodPrepOverlay: false,
                    showSpellsOverlay: false,
                    mapRevealAfterUnzoom: false,
                    mapPendingZoomLevelId: null,
                    mapUnzoomingLevelId: null,
                    mapSelectedLevelId: currentLevelId
                });
                return;
            }
        } catch (err) {
            // ignore key handling errors
        }

        // Ensure Tab navigation still works while keys are locked (camping).
        // Use event.shiftKey / event.ctrlKey so held-modifier state is respected
        // even when key state (this.state.shiftDown) may not be updated while keys are locked.
        if (event.key === 'Tab') {
            // debug: ensure Tab is being received while camping
            try { console.debug('[DungeonPage] Tab pressed, keysLocked=', this.state.keysLocked, 'inMonsterBattle=', this.state.inMonsterBattle, 'shiftKey=', event.shiftKey); } catch(e) {}
            event.preventDefault();
            if (this.state.inMonsterBattle) {
                if (event.shiftKey) {
                    if (this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToRetarget();
                } else if (event.ctrlKey) {
                    // reserved for future
                } else {
                    if (this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
                }
            } else {
                // Dungeon-level tab handling: cycle selected crew member when not in a monster battle
                const direction = event.shiftKey ? 'prev' : 'next';
                this.cycleSelectedCrewMember(direction);
            }
            return;
        }

        if(this.state.keysLocked && this.state.inMonsterBattle){
            this.combatKeyDownHandler(event);
            return
        }

        if(this.state.keysLocked) return
        let key = event.key, code = event.code
        let newTiles = [], overlayTiles = []; // eslint-disable-line no-unused-vars
        // if(code === 'Space'){
        //     let paused = !this.state.paused;
        //     this.props.combatManager.pauseCombat(paused)
        //     this.setState({
        //         paused
        //     })
        // }

    // debug code/key log removed
        if(code === 'p'){
            let paused = !this.state.paused;
            this.props.combatManager.pauseCombat(paused)
            this.setState({
                paused
            })
        }
        if(code === 'Space'){
            this.checkWhichSideOfBoard();
        }
        switch(key){
                case '1':
                this.toggleFullscreen();
            break;
            case 'Space':
                
            break;
            case 'Tab':
                event.preventDefault();
                // Battle-specific tab handling (existing behavior)
                // if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
                if(this.state.shiftDown){
                    if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToRetarget();
                } else {
                    if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
                }
                // Dungeon-level tab handling: cycle selected crew member when not in a monster battle
                if(!this.state.inMonsterBattle){
                    const direction = this.state.shiftDown ? 'prev' : 'next';
                    this.cycleSelectedCrewMember(direction);
                }
            break;
            case 'Shift':
                event.preventDefault();
                this.setState({
                    shiftDown: true
                })
        break;
            case 'ArrowUp':
                if(this.state.keysLocked) return
                this.handleDirectionalMove('up')
                
            break;
            case 'ArrowDown':
                if(this.state.keysLocked) return
                this.handleDirectionalMove('down')
            break;
            case 'ArrowLeft':
                if(this.state.keysLocked) return
                this.handleDirectionalMove('left')
            break;
            case 'ArrowRight':
                if(this.state.keysLocked) return
                this.handleDirectionalMove('right')
            break;
            default:
                // nathin
            break;
        }
    }
    combatKeyDownHandler = (event) => {
        let key = event.key, code = event.code;
        if(code === 'Space'){
            if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.manualFire();
        }
        switch(key){
                // =/+ key: increase speed (decrease interval)
                case '=':
                case '+': {
                    const current = this.props.combatManager?.FIGHT_INTERVAL;
                    const idx = INTERVALS.indexOf(current);
                    if (idx < INTERVALS.length - 1) {
                        const newInterval = INTERVALS[idx + 1];
                        this.props.combatManager.updateAllFightIntervals(newInterval);
                        // Persist to meta
                        const meta = getMeta();
                        meta.combatSpeed = newInterval;
                        storeMeta(meta);
                        this.forceUpdate();
                    }
                    break;
                }
                // - key: decrease speed (increase interval)
                case '-': {
                    const current = this.props.combatManager?.FIGHT_INTERVAL;
                    const idx = INTERVALS.indexOf(current);
                    if (idx > 0) {
                        const newInterval = INTERVALS[idx - 1];
                        this.props.combatManager.updateAllFightIntervals(newInterval);
                        // Persist to meta
                        const meta = getMeta();
                        meta.combatSpeed = newInterval;
                        storeMeta(meta);
                        this.forceUpdate();
                    }
                    break;
                }
            case 'p':
                let paused = !this.state.paused;
                this.props.combatManager.pauseCombat(paused)
                this.setState({
                    paused
                })
            break;
            case 'q':
                if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.selectSpecial();
            break;
            case 'w':
                if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.selectConsumableSpecial();
            break;
            case 'Tab':
                event.preventDefault();
                if(this.state.shiftDown){
                    if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToRetarget();
                } else if(this.state.ctrlDown){
                    
                } else {
                    if(this.monsterBattleComponentRef.current) this.monsterBattleComponentRef.current.tabToFighter();
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
                if(this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('up');
            break;
            case 'ArrowDown':
                if(this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('down');
            break;
            case 'ArrowLeft':
                if(this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('left');
            break;
            case 'ArrowRight':
                if(this.state.selectedCrewMember) this.props.combatManager.moveFighterOneSpace('right');
            break;
            default:
                // nuttin
            break;
        }
    }

    //might need to put this function somewhere else so it doesnt fire on every rerender
    // useEventListener('keydown', this.keyDownHandler);


    handleHover = (id, type, tile) => {
    }
    handleOverlayHover = (id, type, tile) => {
        this.setState({
            overlayHoveredTileId: id
        })
    }
    handleInventoryTileHover = (tileProps) => {
        let inv = this.state.inventoryHoverMatrix,
        descriptionText = '';
        this.props.inventoryManager.inventory.forEach((e,i)=>{
            inv[i] = '';
        })
        if(tileProps){
            inv[tileProps.id] = tileProps.contains;
            descriptionText = tileProps.description
        }

        this.setState({
            inventoryHoverMatrix: inv,
            descriptionText,
            hoveredInventoryItem: tileProps ? (tileProps.data || null) : null,
        })
    }
    
    handleCrewTileHover = (tileProps) => {
        let crew = this.state.crewHoverMatrix;
        this.props.crewManager.crew.forEach((e,i)=>{
            crew[i] = '';
        })
        if(tileProps) crew[tileProps.id] = tileProps.contains;
        this.setState({
            crewHoverMatrix: crew
        })
    }
    handleClick = (tile) => {
        // nothing
        console.log('tile: ', tile);
    }
    handleOverlayClick = (tile, event) => {
        if(!this.state.minimapPlaceMapMarkerStarted) return
        // this is for marking the minimap
        
        let minimapIndicators = this.state.minimapIndicators,
        activeMinimapIndex = this.state.minimap.findIndex(e=>e.active),
        indicatorContainer = minimapIndicators[activeMinimapIndex],
        inputElement = this.state.mapMarkerInput.current;
        switch(this.state.markerType){
            case 'enemy':
                {
                    const c = this.props.boardManager.tiles[tile.id].contains;
                    const typeVal = (typeof c === 'object' && c !== null) ? c.subtype || c.type : c;
                    indicatorContainer.enemies.push({ type: typeVal, tileId: tile.id })
                    inputElement.value = typeVal
                }
            break;
            case 'merchant':
                // merchant marker handling not implemented yet
            break;
            case 'gate':
                {
                    const c = this.props.boardManager.tiles[tile.id].contains;
                    const typeVal = (typeof c === 'object' && c !== null) ? (c.subtype || c.type) : c;
                    indicatorContainer.gates.push({ type: typeVal, tileId: tile.id })
                    inputElement.value = typeVal;
                }
            break;
            case 'stairs':
                {
                    const c = this.props.boardManager.tiles[tile.id].contains;
                    const typeVal = (typeof c === 'object' && c !== null) ? (c.subtype || c.type) : c;
                    indicatorContainer.stairs.push({ type: typeVal, tileId: tile.id })
                    inputElement.value = typeVal;
                }
            break;
            case 'custom':
                // custom marker handling not implemented yet
            break;
            default:
                break;
        }
        this.setState({
            minimapIndicators,
            minimapPlaceMapMarkerStarted: false
        })
    }

    handleMemberClickRitual = (member) => {
        this.setState({
            setMemberRitualOptions: member.data
        })
    }
    learnNewRitual = (magicUser) => {
        this.setState({ritualWrecked: true})
        this._setTimeout(()=>{
            this.setState({ritualWrecked: false}) 
        }, 1500)
    }

    handleLearnRitual = (magicUser, ritual) => {
        try {
            // Update meta (persisted)
            const meta = getMeta() || {};
            const metaMember = (meta.crew || []).find(c => c.id === magicUser.id);
            if (metaMember) {
                if (!Array.isArray(metaMember.knownRituals)) metaMember.knownRituals = [];
                if (!metaMember.knownRituals.includes(ritual.key)) metaMember.knownRituals.push(ritual.key);
            }
            // Update live crewManager copy
            const liveMember = (this.props.crewManager.crew || []).find(c => c.id === magicUser.id);
            if (liveMember) {
                if (!Array.isArray(liveMember.knownRituals)) liveMember.knownRituals = [];
                if (!liveMember.knownRituals.includes(ritual.key)) liveMember.knownRituals.push(ritual.key);
            }
            try { storeMeta(meta); } catch(e) {}
            try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
            try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e) {}
            // Refresh selectedCrewMember so the actions tray reflects the new ritual immediately
            if (this.state.selectedCrewMember && this.state.selectedCrewMember.id === magicUser.id) {
                const updatedKnown = liveMember ? liveMember.knownRituals : [ritual.key];
                this.setState(prev => ({
                    selectedCrewMember: { ...prev.selectedCrewMember, knownRituals: updatedKnown }
                }));
            }
        } catch(e) {
            console.warn('handleLearnRitual failed', e);
        }
        // Close the modal and unlock keys
        this.setState({ showModal: false, keysLocked: false, setMemberRitualOptions: null },
            () => this._cleanupModalBodyClass());
    }
    handleMemberClick = (member) => {
        let meta = getMeta(), val;
        if(!member.data){
            return
        }
        // Match by type first, fall back to id so restored crew objects (which may have
        // been rebuilt by initializeCrew and only carry id) are still found.
        let foundMember = this.props.crewManager.crew.find(e => e.type === member.data.type)
                       || this.props.crewManager.crew.find(e => e.id === member.data.id);
        if(foundMember){
            this.props.crewManager.crew.forEach(c=>{
                c.selected = false;
            })
            foundMember.selected = true;
            meta.crew = this.props.crewManager.crew;
            storeMeta(meta);
            this.props.saveUserData();
        }
        if(this.state.selectedCrewMember && this.state.selectedCrewMember.type === member.data.type){
            val = {};
        } else {
            val = member.data;
        }

        this.setState({
            selectedCrewMember: val,
            actionsTrayExpanded: foundMember ? foundMember.actionsTrayExpanded : false,
            actionMenuTypeExpanded: foundMember ? (Array.isArray(foundMember.actionMenuTypeExpanded) ? foundMember.actionMenuTypeExpanded : (foundMember.actionMenuTypeExpanded ? [foundMember.actionMenuTypeExpanded] : [])) : []
        })
    }

    cycleSelectedCrewMember = (direction = 'next') => {
        // direction: 'next' or 'prev'
        const crew = (this.props.crewManager && this.props.crewManager.crew) || [];
        if(!crew || crew.length === 0) return;

        const current = this.state.selectedCrewMember;
        const currentType = current && current.type;
        const currentId   = current && current.id;
        let currentIndex = crew.findIndex(c => c.type === currentType);
        // Fall back to id match in case type is missing or was rebuilt differently
        if (currentIndex === -1 && currentId) currentIndex = crew.findIndex(c => c.id === currentId);
        if (currentIndex === -1) currentIndex = 0;

        let nextIndex = 0;
        if(direction === 'prev'){
            nextIndex = (currentIndex - 1 + crew.length) % crew.length;
        } else {
            nextIndex = (currentIndex + 1) % crew.length;
        }

    // clear selection on all crew
        crew.forEach(c => c.selected = false);
        const foundMember = crew[nextIndex];
        foundMember.selected = true;

    // debug: log the selected member when cycling (Tab) so dev can inspect available stats
    try { console.log('cycleSelectedCrewMember selected:', foundMember); } catch (e) {}

        // persist selection to meta so other parts of the app see it
        try{
            const meta = getMeta();
            meta.crew = crew;
            storeMeta(meta);
            if(this.props.saveUserData) this.props.saveUserData();
        } catch (e) {
            console.warn('failed to store meta when cycling selected crew', e);
        }

        // update local state so UI updates (inventory popup border, etc.)
        this.setState({
            selectedCrewMember: foundMember,
            actionsTrayExpanded: foundMember.actionsTrayExpanded,
            actionMenuTypeExpanded: Array.isArray(foundMember.actionMenuTypeExpanded) ? foundMember.actionMenuTypeExpanded : (foundMember.actionMenuTypeExpanded ? [foundMember.actionMenuTypeExpanded] : [])
        })
    }
    handleEquipmentItemClick = (item) => {
        if(!item)return;
        const selectedCrewMember = this.state.selectedCrewMember;
        const itemIndex = selectedCrewMember.inventory.findIndex(e=>e===item);
        item.equippedBy = null;
        this.props.inventoryManager.addItem(item)
        selectedCrewMember.inventory.splice(itemIndex,1);
        this.setState({
            selectedCrewMember
        })
    }
    handleItemClick = (item, index) => {
        // New equip logic: place item into an appropriate equip slot on the selected crew member
        if(!item || index === undefined || index === null) return;
        const selected = this.state.selectedCrewMember;
        if(!selected || !selected.id){
            // nothing to equip to
            return;
        }

        // ensure inventory array exists on member
        if(!Array.isArray(selected.inventory)) selected.inventory = [];

        const subtype = item.subtype || '';
        const type = item.type || '';

        const slotOccupied = (slotName) => selected.inventory.some(i => i.equippedSlot === slotName);

        let targetSlot = null;

        // Map by subtype/type
        if(['helm','mask'].includes(subtype)){
            targetSlot = 'head';
            if(slotOccupied(targetSlot)) targetSlot = null;
        } else if(['amulet','armor'].includes(subtype)){
            targetSlot = 'chest';
            if(slotOccupied(targetSlot)) targetSlot = null;
        } else if(subtype === 'wand' || type === 'weapon' || subtype === 'shield'){
            // prefer left, then right
            if(!slotOccupied('left')) targetSlot = 'left';
            else if(!slotOccupied('right')) targetSlot = 'right';
            else targetSlot = null;
        } else if(subtype === 'charm'){
            // ancillary slots
            if(!slotOccupied('ancillary-left')) targetSlot = 'ancillary-left';
            else if(!slotOccupied('ancillary-right')) targetSlot = 'ancillary-right';
            else targetSlot = null;
        }

        if(!targetSlot){
            // no eligible slot or all relevant slots full — do nothing
            return;
        }

        // equip: set metadata on item, move from global inventory into crew member inventory
        try{
            item.equippedBy = selected.id;
            item.equippedSlot = targetSlot;

            // remove from player's global inventory by index
            if(this.props.inventoryManager && typeof this.props.inventoryManager.removeItemByIndex === 'function'){
                this.props.inventoryManager.removeItemByIndex(index);
            }

            // add to crew member inventory
            selected.inventory.push(item);

            // persist selection to meta and save
            const meta = getMeta();
            const crew = meta.crew || this.props.crewManager.crew;
            const found = crew.find(c => c.id === selected.id);
            if(found){
                // ensure found.inventory reflects selected.inventory
                found.inventory = selected.inventory;
            }
            meta.crew = crew;
            storeMeta(meta);
            if(this.props.saveUserData) this.props.saveUserData();

            // update state so UI refreshes
            this.setState({
                activeInventoryItem: item,
                selectedCrewMember: selected
            });
        } catch (err) {
            console.warn('failed to equip item', err);
        }
    }
    outfitNewCrew = () => {
        const meta = getMeta(),
        crew = meta.crew;
        crew.forEach((c)=>{
            let weapon;
            switch(c.type){
                case 'rogue':
                    weapon = this.props.inventoryManager.allItems['longbow']
                    c.inventory.push(weapon);
                break;
                case 'monk':
                    weapon = this.props.inventoryManager.allItems['flail']
                    c.inventory.push(weapon);
                break;
                case 'wizard':
                    weapon = this.props.inventoryManager.allItems['scepter']
                    c.inventory.push(weapon);
                break;
                case 'soldier':
                    weapon = this.props.inventoryManager.allItems['sword']
                    c.inventory.push(weapon);
                break;
                case 'sage':
                    weapon = this.props.inventoryManager.allItems['scepter']
                    c.inventory.push(weapon);
                break;
                case 'barbarian':
                    weapon = this.props.inventoryManager.allItems['axe']
                    c.inventory.push(weapon);
                break;
                default:
                    break;
            }
        })

    }
    loadNewDungeon = async () => {
        const meta = getMeta(),
              userId = getUserId(),
              userName = getUserName();
        const allDungeons = await loadAllDungeonsRequest();
        
        let dungeons = [],
            spawnList = [], // eslint-disable-line no-unused-vars
            selectedDungeon,
            spawnPoint;
            
        allDungeons.data.forEach((e, i) => {
            let d = JSON.parse(e.content)
            d.id = e._id
            dungeons.push(d)
        })
    // dungeons loaded
        selectedDungeon = dungeons[0]
        // selectedDungeon = dungeons.find(e=>e.name === 'Primari');
        let newDungeonPayload = {
            name: `${selectedDungeon.name}_${userName}_${userId.slice(userId.length-4)}`,
            levels: selectedDungeon.levels,
            pocket_planes: selectedDungeon.pocket_planes,
            descriptions: `${userName}'s dungeon`,
            spawn_points: selectedDungeon.spawn_points,
            valid: selectedDungeon.valid
          }
        const newDungeonRes = await addDungeonRequest(newDungeonPayload);
        selectedDungeon = JSON.parse(newDungeonRes.data.content);
        selectedDungeon.id = newDungeonRes.data._id;
        // spawnPoint = selectedDungeon.spawn_points[Math.floor(Math.random()*spawnList.length)]
        // ^ need to populate spawnList
        spawnPoint = selectedDungeon.spawn_points[0]


        this.props.inventoryManager.initializeItems()
    // spawnpoint selected
        if(spawnPoint){
            // return
            this.props.boardManager.setDungeon(selectedDungeon);
            let sp = spawnPoint.locationCode.split('_');
            const levelId =  spawnPoint.level;
            const level = selectedDungeon.levels.find(e=>e.id === levelId)
            const miniboardIndex = spawnPoint.miniboardIndex
            const orientation = sp[4];
            const spawnTileIndex = spawnPoint.id;
            const board = orientation === 'F' ? level.front.miniboards[miniboardIndex] : (orientation === 'B' ? level.back.miniboards[miniboardIndex] : null)
            if(board === null){
                // board is null -- investigate
                debugger
            }
            meta.selectedDungeon = selectedDungeon;
            meta.spawnPoint = spawnPoint;
            meta.location = {
                boardIndex: spawnPoint.miniboardIndex,
                tileIndex: spawnPoint.id,
                levelId,
                orientation
            }
            meta.dungeonId = selectedDungeon.id;
            storeMeta(meta)
            await updateUserRequest(userId, meta);
            this.props.boardManager.setCurrentLevel(level);
            this.props.boardManager.setCurrentOrientation(orientation);
            this.props.boardManager.initializeTilesFromMap(miniboardIndex, spawnTileIndex);
            const levelTracker = this.state.levelTracker;
            const minimap = this.state.minimap;
            minimap[miniboardIndex].active = true;
            let foundLevel = levelTracker.find(e=>e.id === levelId)
            foundLevel.active = true;

            let newIndicators = []
            for(let i = 0; i < 9; i++){
                newIndicators.push({
                    enemies: [],
                    gates: [],
                    merchant: [],
                    stairs: [],
                    misc: [],
                    custom: []
                })
            }

            meta.minimapIndicators = [{
                indicators: newIndicators,
                orientation,
                level: level.id
            }]

            storeMeta(meta);

            this.setState(()=>{
                return {
                    overlayTiles: this.props.boardManager.overlayTiles,
                    tiles: this.props.boardManager.tiles,
                    minimap,
                    levelTracker,
                    minimapZoomedTile: null,
                    minimapIndicators: {
                        level: foundLevel.id,
                        orientation,
                        indicators: newIndicators
                    }
                }
            })
            const firstCrewMember = this.props.crewManager.crew[0];
            this.handleMemberClick({data:firstCrewMember})
            this._setTimeout(()=>{
                this.toggleLeftSidePanel();
                this.toggleRightSidePanel();
            }, 1000)
        } else {
            // no valid dungeon
            // alert('no valid dungeon!')
        }
    }
    loadExistingDungeon = async (dungeonId) => {
        const meta = getMeta();

        // clear death tracker if you want:
        
        // try {
        //     meta.deathTracker = 0;
        //     storeMeta(meta);
        //     await updateUserRequest(getUserId(), meta).catch(()=>{});
        //     // Notify local UI/state handlers immediately so death-tracker visuals update.
        //     try { if (typeof this.handleDeathTrackerChanged === 'function') this.handleDeathTrackerChanged(0); } catch(e){}
        //     console.log('meta cleared: , meta:', meta);
        // } catch (e) {
        //     // best-effort: still persist locally
        //     try { meta.deathTracker = 0; storeMeta(meta); } catch (inner) {}
        // }

        const res = await loadDungeonRequest(dungeonId);
        if(res.data && res.data.length === 0){
            // cached dungeon deleted; go to first time flow
            this.loadNewDungeon();
            return
        }
        const dungeon = JSON.parse(res.data[0].content)
        dungeon.id = res.data[0]._id;
        keyCleanup(dungeon);
        itemCleanup(dungeon, meta.crew);
        resolveItemPools(dungeon, this.props.inventoryManager.allItems);
        resolveMonsterPools(dungeon, this.props.monsterManager.monsters);
        const cleanupSummary = this.props.boardManager.setDungeon(dungeon)
        console.log('DungeonPage.loadExistingDungeon: called boardManager.setDungeon; cleanupSummary:', cleanupSummary);
        try {
            const metaAfter = getMeta() || {};
            if (metaAfter.lastMonsterTileCleanup) console.log('DungeonPage.loadExistingDungeon: meta.lastMonsterTileCleanup =', metaAfter.lastMonsterTileCleanup);
        } catch (e) {}

        // If meta.location is missing or incomplete, derive safe defaults from the dungeon data
        if (!meta.location || meta.location.levelId == null) {
            console.warn('DungeonPage.loadExistingDungeon: meta.location missing — deriving defaults from dungeon data', meta);
            const firstLevel = dungeon.levels && dungeon.levels[0];
            const levelZero = dungeon.levels && dungeon.levels.find(level => Number(level.id) === 0);
            const defaultLevel = levelZero || firstLevel;
            // Try to use the dungeon's stored spawn point for a sensible starting tile
            const spawnFallback = dungeon.spawn_points && dungeon.spawn_points[0];
            const fallbackTileIndex = spawnFallback ? spawnFallback.id : 112; // 112 = center of 15x15 board
            const fallbackBoardIndex = spawnFallback ? (spawnFallback.miniboardIndex || 0) : 0;
            const fallbackOrientation = spawnFallback ? (spawnFallback.locationCode && spawnFallback.locationCode.split('_')[4]) || 'F' : 'F';
            meta.location = {
                levelId: defaultLevel ? defaultLevel.id : null,
                orientation: fallbackOrientation,
                boardIndex: fallbackBoardIndex,
                tileIndex: fallbackTileIndex
            };
        }
        // If tileIndex is 0 (top-left corner — almost never a real spawn), try to find a
        // spawn point on the same level, or scan the board for a walkable tile near center.
        // We do NOT cross levels — using a spawn from level 0 when the player is on level 2
        // would place them on the wrong miniboard entirely.
        if (meta.location.tileIndex === 0 || meta.location.tileIndex == null) {
            const levelId = meta.location.levelId;
            const levelSpawn = dungeon.spawn_points && dungeon.spawn_points.find(
                sp => sp.level === levelId || sp.level === Number(levelId)
            );
            if (levelSpawn && levelSpawn.id) {
                console.log('DungeonPage.loadExistingDungeon: tileIndex was 0/null, replacing with same-level spawn point id', levelSpawn.id, 'level', levelSpawn.level);
                meta.location.tileIndex = levelSpawn.id;
                meta.location.boardIndex = levelSpawn.miniboardIndex != null ? levelSpawn.miniboardIndex : meta.location.boardIndex;
            } else {
                // No spawn on this level — find the first walkable (non-void) tile scanning
                // outward from center (112) so the player doesn't land in a void.
                try {
                    const coerceId = meta.location.levelId != null ? Number(meta.location.levelId) : null;
                    const lvl = dungeon.levels.find(l => Number(l.id) === coerceId) || dungeon.levels[0];
                    const boardIdx = meta.location.boardIndex || 0;
                    const orientation = meta.location.orientation || 'F';
                    const plane = orientation === 'F' ? lvl.front : lvl.back;
                    const boardTiles = plane && plane.miniboards && plane.miniboards[boardIdx] && plane.miniboards[boardIdx].tiles;
                    let foundTile = null;
                    if (boardTiles) {
                        // scan from center outward
                        const order = [112, 97, 127, 111, 113, 96, 98, 126, 128, 82, 142, 110, 114];
                        for (const idx of order) {
                            const t = boardTiles[idx];
                            if (t && t.type !== 'void' && (!t.contains || t.contains.type !== 'void') && t.color !== 'void') {
                                foundTile = idx;
                                break;
                            }
                        }
                        // if still null, do a full scan
                        if (foundTile == null) {
                            for (let i = 0; i < boardTiles.length; i++) {
                                const t = boardTiles[i];
                                if (t && t.type !== 'void' && (!t.contains || t.contains.type !== 'void')) {
                                    foundTile = i;
                                    break;
                                }
                            }
                        }
                    }
                    meta.location.tileIndex = foundTile != null ? foundTile : 112;
                    console.log('DungeonPage.loadExistingDungeon: tileIndex was 0/null, scanned for walkable tile, using', meta.location.tileIndex);
                } catch (e) {
                    meta.location.tileIndex = 112;
                    console.log('DungeonPage.loadExistingDungeon: tileIndex scan failed, using center tile 112');
                }
            }
        }
        console.log('DungeonPage.loadExistingDungeon: meta.location =', JSON.stringify(meta.location));
        // Coerce levelId to a number for comparison — it may have been serialised as a string
        const targetLevelId = meta.location.levelId != null ? Number(meta.location.levelId) : null;
        const dungeonLevel = dungeon.levels.find(l => Number(l.id) === targetLevelId) || dungeon.levels[0];
        console.log('DungeonPage.loadExistingDungeon: dungeonLevel =', dungeonLevel ? dungeonLevel.id : null, '| dungeon.levels ids:', dungeon.levels && dungeon.levels.map(l=>l.id));
        if (!dungeonLevel) {
            console.error('DungeonPage.loadExistingDungeon: dungeon has no levels, cannot initialize board');
            return;
        }
        // Patch meta.location so the rest of the function uses the resolved id
        meta.location.levelId = dungeonLevel.id;

        this.props.boardManager.setCurrentLevel(dungeonLevel);
        this.props.boardManager.setCurrentOrientation(meta.location.orientation);
        console.log('DungeonPage.loadExistingDungeon: calling initializeTilesFromMap boardIndex=', meta.location.boardIndex, 'tileIndex=', meta.location.tileIndex);
        try {
            this.props.boardManager.initializeTilesFromMap(meta.location.boardIndex, meta.location.tileIndex);
            console.log('DungeonPage.loadExistingDungeon: initializeTilesFromMap complete, tiles.length=', this.props.boardManager.tiles && this.props.boardManager.tiles.length);
        } catch (initErr) {
            console.error('DungeonPage.loadExistingDungeon: initializeTilesFromMap THREW:', initErr);
            return;
        }
        const minimap = this.state.minimap,
        levels = this.state.levelTracker;
        let level = levels.find(e => Number(e.id) === Number(meta.location.levelId));
        if (!level) {
            console.warn('DungeonPage.loadExistingDungeon: levelId not found in levelTracker, falling back to first entry', meta.location.levelId, levels);
            level = levels[0];
        }
        if (!level) {
            console.error('DungeonPage.loadExistingDungeon: no levels in levelTracker, cannot continue');
            return;
        }
        levels.forEach(e=>e.active = false)
        level.active = true;
        const safeBoardIndex = meta.location.boardIndex != null ? meta.location.boardIndex : 0;
        if (minimap[safeBoardIndex]) minimap[safeBoardIndex].active = true;
        
    let orientation = this.props.boardManager.currentOrientation;
    // Ensure meta.minimapIndicators is always an array before using it.
    if (!meta.minimapIndicators || !Array.isArray(meta.minimapIndicators)) meta.minimapIndicators = [];
    let indicatorsGroup = meta.minimapIndicators.find(e=>e.level === level.id && e.orientation === orientation);

        if(!indicatorsGroup){
            let newIndicators = []
            for(let i = 0; i < 9; i++){
                newIndicators.push({
                    enemies: [],
                    gates: [],
                    merchant: [],
                    stairs: [],
                    misc: [],
                    custom: []
                })
            }
            indicatorsGroup = {
                level: level.id,
                orientation,
                indicators: newIndicators
            }
            meta.minimapIndicators.push(indicatorsGroup)
            storeMeta(meta)
        }
    let selectedCrewMember = this.props.crewManager.crew.find(c=>c.selected) || {};
        // Generate a fresh quest set for this dungeon run
        if (this.props.questManager) {
            this.props.questManager.generateQuestSet(dungeon, this.props.monsterManager, this.props.inventoryManager);
        }
        this.setState(()=>{
            return {
                spawn: meta.location.tileIndex,
                tiles: this.props.boardManager.tiles,
                overlayTiles: this.props.boardManager.overlayTiles,
                minimap,
                minimapIndicators: indicatorsGroup.indicators,
                levelTracker: levels,
                selectedCrewMember,
                actionsTrayExpanded: selectedCrewMember ? selectedCrewMember.actionsTrayExpanded : false,
                actionMenuTypeExpanded: selectedCrewMember ? (Array.isArray(selectedCrewMember.actionMenuTypeExpanded) ? selectedCrewMember.actionMenuTypeExpanded : (selectedCrewMember.actionMenuTypeExpanded ? [selectedCrewMember.actionMenuTypeExpanded] : [])) : []
            }
        })
    }
    toggleLeftSidePanel = async (val = null) => {
        // toggle left side panel
        // If called as an onClick handler it may receive an event object.
        // Accept either an object like { expanded: true } or no arg to toggle.
        const newVal = (val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'expanded')) ? val.expanded : !this.state.leftPanelExpanded;
        this.setState({leftPanelExpanded: newVal})
        const meta = getMeta()
        meta.leftExpanded = newVal
        storeMeta(meta)
        await updateUserRequest(getUserId(), meta)
    }
    toggleRightSidePanel = async (val = null) => {
        // Handle event objects from onClick; accept { expanded } objects or toggle when no arg
        const newVal = (val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'expanded')) ? val.expanded : !this.state.rightPanelExpanded
        this.setState({rightPanelExpanded: newVal})
        const meta = getMeta()
        meta.rightExpanded = newVal;
        storeMeta(meta)
        await updateUserRequest(getUserId(), meta)
    }
    toggleActionsTray = () => {
        const newVal = !this.state.actionsTrayExpanded

        let foundMember = this.props.crewManager.crew.find(c=>c.selected);
        foundMember.actionsTrayExpanded = newVal;
        let meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();


        this.setState({actionsTrayExpanded: newVal})
    }
    toggleCrewActionsTray = () => {
        const newVal = !this.state.crewActionsTrayExpanded;
        // persist crew actions tray state to meta so it survives reloads
        try {
            const meta = getMeta() || {};
            meta.crewActionsTrayExpanded = newVal;
            storeMeta(meta);
            if (this.props.saveUserData) this.props.saveUserData();
        } catch (e) {}
        this.setState({ crewActionsTrayExpanded: newVal });
    }

    // Delegates camping start to CampManager
    setUpCamp = async (maybeDuration) => {
        return CampManager.setUpCamp(this, maybeDuration);
    }

    // Delegates camping end to CampManager
    endCamp = async () => {
        console.log('[DungeonPage.endCamp] wrapper called');
        await CampManager.endCamp(this);
        console.log('[DungeonPage.endCamp] CampManager.endCamp resolved, calling forceUpdate');
        // After endCamp resolves, force another re-render so crew tiles pick up
        // the restored hp values from the new member objects in crewManager.crew.
        try { this.forceUpdate(); } catch(e) {}
        setTimeout(() => { try { this.forceUpdate(); } catch(e) {} }, 50);
    }
    uppercaseFirstLetter = (text) => {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    battleOver = (result) => {
        const monsterLabel = this.state.monster ? (this.state.monster.name || this.state.monster.type || 'unknown monster') : 'unknown monster';
        console.log('battle over result: ', result, '| monster:', monsterLabel);
        if(result === 'win'){
            // Suppress any lingering battle callbacks from overwriting HP/dead after win
            this._suppressFighterDeadHpUpdates = true;
            this.props.boardManager.removeDefeatedMonsterTile(this.state.monsterBattleTileId)
            this.props.crewManager.checkForLevelUp(this.props.crewManager.crew)
            let meta = getMeta()
            meta.crew = this.props.crewManager.crew;
            storeMeta(meta)
            this.props.saveUserData()
            // Refresh selectedCrewMember from the live crew so dead/hp flags set during
            // battle are replaced with the end-of-battle values (survivors still alive).
            try {
                const crew = this.props.crewManager.crew || [];
                const prev = this.state.selectedCrewMember;
                const updated = prev && prev.id
                    ? crew.find(c => c && c.id === prev.id)
                    : crew.find(c => c && !c.dead) || crew[0];
                if (updated) {
                    this.setState({ selectedCrewMember: { ...updated } });
                }
            } catch(e) {}
            // Re-enable after a tick so any final in-flight combat callbacks have cleared
            setTimeout(() => { this._suppressFighterDeadHpUpdates = false; }, 0);
        } else if(result === 'respawn'){
                  // Try to respawn the player at spawn point (guard against missing boardManager)
                  const meta2 = getMeta();
                    if (meta2 && Array.isArray(meta2.crew)) {
                        meta2.crew.forEach(c => {
                            if (!c) return;
                            c.hp = 1;
                            c.dead = false;
                        });
                        const spawnPoint = meta2.spawnPoint;
                        console.log('spawn point: ', spawnPoint);
                        const selectedDungeon = meta2.selectedDungeon;
                        if (spawnPoint && spawnPoint.locationCode && selectedDungeon) {
                            let sp = spawnPoint.locationCode.split('_');
                            const levelId =  spawnPoint.level;
                            const level = selectedDungeon.levels.find(e=>e.id === levelId)
                            const miniboardIndex = spawnPoint.miniboardIndex
                            const orientation = sp[4];
                            const spawnTileIndex = spawnPoint.id; // eslint-disable-line no-unused-vars
                            const board = orientation === 'F' ? level.front.miniboards[miniboardIndex] : (orientation === 'B' ? level.back.miniboards[miniboardIndex] : null) // eslint-disable-line no-unused-vars

                            meta2.location = {
                                boardIndex: spawnPoint.miniboardIndex,
                                tileIndex: spawnPoint.id,
                                levelId,
                                orientation
                            }
                        } else {
                            console.warn('battleOver respawn: no spawnPoint in meta — keeping current location');
                        }
                        // Re-fetch meta so we don't overwrite values (e.g. deathTracker) written
                        // by gameOver in MonsterBattle between when we fetched meta2 and now.
                        const freshMeta = getMeta();
                        meta2.deathTracker = freshMeta.deathTracker;
                        try { storeMeta(meta2); } catch(e) {}
                        try { this.props.crewManager.initializeCrew(meta2.crew); } catch(e) {}
                        try {
                            if (this.props.inventoryManager && typeof this.props.inventoryManager.refreshWeaponStats === 'function') {
                                this.props.crewManager.crew.forEach(m => { if (m && Array.isArray(m.inventory)) m.inventory = this.props.inventoryManager.refreshWeaponStats(m.inventory); });
                            }
                        } catch(e) {}
                        // Explicitly clear dead/hp on crewManager.crew as a second pass — initializeCrew
                        // rebuilds from meta2.crew (hp=1/dead=false) but any in-flight callbacks from
                        // combat may have mutated the objects. Force-clear here so the Tile dead-overlay
                        // and HP bar render correctly immediately after respawn.
                        // Also set the suppress flag so handleFighterUpdateFromBattle ignores dead/hp
                        // writes from any lingering battle callbacks during the cleanup window.
                        this._suppressFighterDeadHpUpdates = true;
                        try {
                            if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                                this.props.crewManager.crew.forEach(c => {
                                    if (!c) return;
                                    c.hp = 1;
                                    c.dead = false;
                                });
                            }
                        } catch(e) {}
                        try { if (this.props.saveUserData) this.props.saveUserData(); } catch(e) {}

                        // // Notify parent UI for each crew member so DungeonPage updates portrait overlays
                        // Ensure UI reflects restored crew state (hp/dead flags). Force a re-render
                        // and update any selectedCrewMember references so portrait overlays refresh.
                        const refreshCrewUI = () => {
                            try {
                                // Update selectedCrewMember if present — read from the now-clean crewManager.crew
                                if (this.state.selectedCrewMember && this.state.selectedCrewMember.id) {
                                    const updated = (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) ? this.props.crewManager.crew.find(c => c && c.id === this.state.selectedCrewMember.id) : null;
                                    if (updated) {
                                        try { this.setState({ selectedCrewMember: { ...updated, hp: 1, dead: false } }); } catch(e) {}
                                    }
                                }
                                // Force update to refresh crew tiles and death overlays
                                try { this.forceUpdate(); } catch(e) {}
                            } catch (inner) { console.warn('post-respawn UI refresh failed', inner); }
                        };
                        // Run immediately, then again after a tick so any in-flight battle
                        // callbacks that may race with the respawn are also overridden.
                        refreshCrewUI();
                        setTimeout(() => {
                            refreshCrewUI();
                            // Safe to re-enable dead/hp updates from battle callbacks now
                            this._suppressFighterDeadHpUpdates = false;
                        }, 0);
                    }
            try {
                
                console.log('current location: ', meta2.location);
                // debugger
                if (meta2 && meta2.location && this.props && this.props.boardManager) {
                    try {
                        const bm = this.props.boardManager;
                        // Place the player at the saved location without reinitializing the
                        // entire board (which could reintroduce removed items). Then
                        // respawn monsters only using the boardManager.respawnMonsters
                        // method which only affects monster tiles.
                        if (typeof bm.getCoordinatesFromIndex === 'function' && typeof bm.placePlayer === 'function') {
                            const coords = bm.getCoordinatesFromIndex(meta2.location.tileIndex);
                            bm.placePlayer(coords);
                        }
                        try {
                            // Use the manager's own dungeon/template to respawn monsters.
                            if (typeof bm.respawnMonsters === 'function') bm.respawnMonsters(bm.dungeon || {});
                        } catch (inner) { console.warn('respawnMonsters failed', inner); }
                        try { if (typeof this.setState === 'function') this.setState({ overlayTiles: bm.overlayTiles, tiles: bm.tiles }); } catch(e){}
                    } catch (inner) {
                        console.warn('group-death: respawn failed', inner);
                    }
                } else {
                    console.warn('group-death: cannot respawn - boardManager missing');
                }
            } catch (inner) { console.warn('group-death: respawn failed', inner); }
        }
        try {
            // If we saved the pre-combat panel state, restore it now so the UI returns
            // to the same expanded/collapsed configuration the player had before combat.
            if (this._preCombatPanels) {
                const prev = this._preCombatPanels;
                try {
                    this.setState({
                        leftPanelExpanded: !!prev.left,
                        rightPanelExpanded: !!prev.right
                    });
                } catch (e) {}
                try {
                    const meta = getMeta() || {};
                    meta.leftExpanded = !!prev.left;
                    meta.rightExpanded = !!prev.right;
                    try { storeMeta(meta); } catch (e) {}
                    try { updateUserRequest(getUserId(), meta).catch(()=>{}); } catch(e) {}
                } catch (inner) {}
                this._preCombatPanels = null;
            }
        } catch (err) {
            console.warn('battleOver: failed to restore panel state', err);
        }

        this.setState({
            keysLocked : false,
            inMonsterBattle: false
        })
    }
    minimapTileClicked = (index) => {
        this.setState({
            minimapZoomedTile: index
        })
    }
    calcPlayerIndicatorTop = () => {
        let formattedCoords = {x: this.props.boardManager.playerTile.location[0]-15, y: this.props.boardManager.playerTile.location[1]-15};
        let fromTop = formattedCoords.x
        return `${fromTop / 14 * 100}%`
    }
    calcPlayerIndicatorLeft = () => {
        let formattedCoords = {x: this.props.boardManager.playerTile.location[0]-15, y: this.props.boardManager.playerTile.location[1]-15}
        let fromLeft = formattedCoords.y;
        return `${fromLeft / 14 * 100}%`
    }
    calcIndicator = (tileId) => {
        let coords = this.props.boardManager.getCoordinatesFromIndex(tileId);
        return {
            left: `${(coords[1]-15) / 14 * 100}%`,
            top: `${(coords[0]-15) / 14 * 100}%`
        }
    }

    // ── Breadcrumb trail ────────────────────────────────────────────
    // Record the player's current position onto the breadcrumb map.
    // Each unique (levelId, orientation, boardIndex, row, col) cell gets one entry;
    // revisiting a cell just refreshes its timestamp (keeping the most-recent visit).
    recordBreadcrumb = () => {
        try {
            const bm = this.props.boardManager;
            if (!bm || !bm.playerTile) return;
            const [row, col] = bm.playerTile.location;
            const boardIndex = this.state.minimap.findIndex(e => e.active);
            if (boardIndex < 0) return;
            const levelId = (this.state.levelTracker.find(e => e.active) || {}).id;
            const orientation = bm.currentOrientation || 'A';
            const key = `${levelId}:${orientation}:${boardIndex}:${row}:${col}`;
            const existing = this._breadcrumbs.get(key);
            this._breadcrumbs.set(key, {
                levelId,
                orientation,
                boardIndex,
                row,
                col,
                ts: Date.now(),
                // preserve original seq so the path stays in order; only update ts
                seq: existing ? existing.seq : ++this._breadcrumbSeq,
            });
        } catch (e) {}
    }

    // Evict breadcrumbs older than 30 minutes, then trigger a re-render so the
    // trail visually fades and disappears.
    _pruneBreadcrumbs = () => {
        try {
            const EXPIRE_MS = 30 * 60 * 1000;
            const now = Date.now();
            let pruned = false;
            this._breadcrumbs.forEach((val, key) => {
                if (now - val.ts > EXPIRE_MS) {
                    this._breadcrumbs.delete(key);
                    pruned = true;
                }
            });
            if (pruned) {
                try { this.forceUpdate(); } catch (e) {}
            }
        } catch (e) {}
    }
    clearAllMarkers = () => {
        let meta = getMeta();
        meta.minimapIndicators = []
        storeMeta(meta)

        let newIndicators = []
        for(let i = 0; i < 9; i++){
            newIndicators.push({
                enemies: [],
                gates: [],
                merchant: [],
                stairs: [],
                misc: [],
                custom: []
            })
        }
        
        this.setState({
            minimapIndicators: newIndicators
        })
    }
    beginMarkingMap = () => {
        let current = this.state.minimapMarkerTrayOpen;
        this.setState({
            minimapMarkerTrayOpen: !current
        })
    }
    placeMapMarkerStart = () => {
        this.setState({
            minimapPlaceMapMarkerStarted: true
        })

    }
    submitMarkers = () => {
        let meta = getMeta();
        let indicators = this.state.minimapIndicators;
        let orientation = this.props.boardManager.currentOrientation;
        let levelId = this.props.boardManager.currentLevel.id
        let obj = {
            level: levelId,
            orientation,
            indicators
        }
        if(!meta['minimapIndicators']){
            meta['minimapIndicators'] = [obj]
        } else if(meta.minimapIndicators.find(e=>e.level === levelId && e.orientation === orientation)){
            let existing = meta.minimapIndicators.find(e=>e.level === levelId && e.orientation === orientation);
            existing.indicators = indicators;
        } else {
            meta.minimapIndicators.push(obj)
        }
        storeMeta(meta)
        // this.state.mapMarkerInput.current.value = null;
        // this.state.markerSelectVal.current.value = 'Marker Type';
        this.setState({
            minimapMarkerTrayOpen: false,
            minimapPlaceMapMarkerStarted: false,
            markerName: '',
            markerType: 'Marker Type'
        })
    }
    onMarkerNameInputChange = (markerName) => {
        this.setState({
            markerName
        })
    }
    onMarkerTypeDropdownChange = (markerType) => {
        this.setState({
            markerType
        })
    }
    handleActionClick = (action) => {
        const current = Array.isArray(this.state.actionMenuTypeExpanded) ? this.state.actionMenuTypeExpanded : [];
        const isOpen = current.includes(action.type);
        const val = isOpen ? current.filter(t => t !== action.type) : [...current, action.type];

        let foundMember = this.props.crewManager.crew.find(c=>c.selected);
        if(foundMember.actionMenuExpanded){
            delete foundMember.actionMenuExpanded
        }
        foundMember.actionMenuTypeExpanded = val;
        let meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();

        this.setState({
            actionMenuTypeExpanded: val
        })
    }
    getSubtypeClass = (subtype, maxReached) => {
        if(!subtype.available) return 'disabled'
        if(maxReached) return 'max-reached'
        if(this.state.selectedCrewMember.specialActions.some(a=> {
            let end = new Date(a.endDate);
            let now = new Date()
            return end > now
        })) return 'in-progress'
    }
    // For special-action-icon: Roman numerals as text
    getSubtypeNumeralElement = (subtype) => {
        if (!subtype.count || subtype.count < 1) return null;
        const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
        const idx = Math.max(0, Math.min(subtype.count, numerals.length - 1));
        return <div className="numeral">{numerals[idx]}</div>;
    }

    // For action-sub-menu/action-subtype: image-based numbers
    getSubtypeImageCountElement = (subtype) => {
        let arr = ['zero','one','two','three','four','five','six','seven','eight','nine'];
        if (!subtype.count || subtype.count < 1) return null;
        let idx = Math.max(0, Math.min(subtype.count, arr.length - 1));
        return <div className="numeral" style={{backgroundImage: `url(${images[arr[idx]]})`}}></div>;
    }
    handleActionSubtypeClick = (action, subType) => {
        let characterFromCrew = this.props.crewManager.crew.find(e=> e.id === this.state.selectedCrewMember.id)
        this.props.crewManager.beginSpecialAction(characterFromCrew, action, subType)
        const meta = getMeta();
        meta.crew = this.props.crewManager.crew;
        storeMeta(meta);
        this.props.saveUserData();
        // Force update to reflect new specialActions count immediately
        // Find updated selectedCrewMember from crewManager
        const updatedCrewMember = this.props.crewManager.crew.find(e => e.id === this.state.selectedCrewMember.id);
        if (updatedCrewMember) {
            this.setState({ selectedCrewMember: { ...updatedCrewMember } });
        }
    }

    // Called by MonsterBattle (via prop) when a fighter's consumable specialActions change
    handleFighterUpdateFromBattle = (fighter) => {
        if (!fighter || !fighter.id) return;
        try {
            // Update crewManager's copy — replace the array slot with a new spread object
            // so React.memo on Tile sees a changed `data` prop reference and re-renders.
            if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
                const idx = this.props.crewManager.crew.findIndex(c => c && c.id === fighter.id);
                if (idx !== -1) {
                    const cur = this.props.crewManager.crew[idx];
                    const updates = { specialActions: JSON.parse(JSON.stringify(fighter.specialActions || [])) };
                    // Skip dead/hp writes during respawn so battle-end callbacks can't clobber the restored state
                    if (!this._suppressFighterDeadHpUpdates) {
                        if (typeof fighter.hp !== 'undefined') updates.hp = fighter.hp;
                        if (typeof fighter.dead !== 'undefined') updates.dead = !!fighter.dead;
                    }
                    this.props.crewManager.crew[idx] = { ...cur, ...updates };
                }
            }

            // If this fighter is currently selected, update selectedCrewMember state so UI updates immediately.
            // Either way, forceUpdate so the crew tile list re-renders with the new member object reference.
            if (this.state.selectedCrewMember && this.state.selectedCrewMember.id === fighter.id) {
                this.setState({ selectedCrewMember: { ...this.state.selectedCrewMember, specialActions: JSON.parse(JSON.stringify(fighter.specialActions || [])), ...(!this._suppressFighterDeadHpUpdates && { hp: (typeof fighter.hp !== 'undefined' ? fighter.hp : this.state.selectedCrewMember.hp), dead: (typeof fighter.dead !== 'undefined' ? !!fighter.dead : this.state.selectedCrewMember.dead) }) } });
            } else {
                try { this.forceUpdate(); } catch(e) {}
            }

            // Persist to meta as well
            try {
                const meta = getMeta();
                if (meta && Array.isArray(meta.crew)) {
                    const mIdx = meta.crew.findIndex(c => c && c.id === fighter.id);
                    if (mIdx !== -1) {
                        meta.crew[mIdx].specialActions = JSON.parse(JSON.stringify(fighter.specialActions || []));
                        if (!this._suppressFighterDeadHpUpdates) {
                            if (typeof fighter.hp !== 'undefined') meta.crew[mIdx].hp = fighter.hp;
                            if (typeof fighter.dead !== 'undefined') meta.crew[mIdx].dead = !!fighter.dead;
                        }
                        storeMeta(meta);
                        if (typeof this.props.saveUserData === 'function') this.props.saveUserData();
                    }
                }
            } catch (err) {
                console.warn('handleFighterUpdateFromBattle: failed to persist meta', err);
            }
        } catch (err) {
            console.warn('handleFighterUpdateFromBattle failed', err);
        }
    }
    getActionCooldownPercentage = (action) => {
    if(!action) return;
    const startDate = new Date(action.startDate);
    const endDate = new Date(action.endDate);
    let diffInMilli = endDate - startDate;
    let diffInMinutes = diffInMilli / (1000 * 60);
    let currentTime = new Date();
    let minutesElapsed = (currentTime - startDate) / (1000 * 60);
    let percentageComplete = Math.ceil(minutesElapsed/diffInMinutes*100);
    if(percentageComplete > 100) percentageComplete = 100;
    return percentageComplete;
    }
    onUpdateModalClosed = () => {
        switch(this.state.modalType){
            case 'Updates':
                const meta = getMeta();
                let updates = this.state.updates;
                let crew = meta.crew;
                crew.forEach(c=>{
                    if(updates.some(e=>e.owner === c.name)){
                        let update = updates.find(e=>e.owner === c.name)
                        let ref = c.specialActions.find(e=> e.type === update.actionType && !e.notified)
                        if (ref) ref.notified = true;
                    }
                })
                meta.crew = crew;
                this.props.crewManager.crew = crew;
                storeMeta(meta);
                this.props.saveUserData();
                this.setState({showModal: false}, () => this._cleanupModalBodyClass())
            break;
            case 'PrepComplete':
                // In-session preparation completion modal — clear auto-dismiss timeout and close
                if (this.prepCompleteTimeout) {
                    clearTimeout(this.prepCompleteTimeout);
                    this.prepCompleteTimeout = null;
                }
                this.setState({ showModal: false }, () => this._cleanupModalBodyClass());
            break;
            case 'RitualComplete':
                // Ritual completion modal — same dismiss logic as PrepComplete
                if (this.prepCompleteTimeout) {
                    clearTimeout(this.prepCompleteTimeout);
                    this.prepCompleteTimeout = null;
                }
                this.setState({ showModal: false }, () => this._cleanupModalBodyClass());
            break;
            case 'FoodComplete':
                if (this.prepCompleteTimeout) {
                    clearTimeout(this.prepCompleteTimeout);
                    this.prepCompleteTimeout = null;
                }
                this.setState({ showModal: false }, () => this._cleanupModalBodyClass());
            break;
            case 'Magic':
                this.setState({keysLocked: false}, () => this._cleanupModalBodyClass())
            break;
            default: break;
        }
    }

    // CoreUI CModal adds 'modal-open' + 'overflow:hidden' to <body> while any modal is
    // visible. If two modals open/close in rapid succession the class can be left behind
    // even after all modals are dismissed. Call this after every modal close to force-
    // clean it up whenever no modal is actually open.
    _cleanupModalBodyClass = () => {
        try {
            if (!this.state.showModal && !this.state.showQuestsPopup) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
        } catch (e) {}
    }
    checkWhichSideOfBoard = () => {
        let side = this.props.boardManager.playerTile.location[0] < 22 ? 'top' : 'bottom'
        // console.log('side of board: ', side);
        return side
    }
    triggerRitualEncounter = () => {
        this.setState({
            keysLocked: true,
            modalType: 'Magic',
            showModal: true
        })
    }

    triggerNarrativeEncounter = () => {
        let meta = {};
        try { meta = getMeta() || {}; } catch (e) { meta = {}; }

        const { sequence, meta: updatedMeta } = getNextNarrativePayload(meta);
        if (!sequence) return;

        try { storeMeta(updatedMeta); } catch (e) {}
        try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch (e) {}

        this._setTimeout(() => {
            this.setState({
                activeNarrativeSequence: sequence,
                showNarrativeOverlay: true,
                keysLocked: true
            });
        }, 140);
    }

    closeNarrativeOverlay = () => {
        this.setState({
            activeNarrativeSequence: null,
            showNarrativeOverlay: false,
            keysLocked: false
        });
    }

    handleCloseQuestsPopup = () => {
        try {
            // Mark as seen for this session only so a full page refresh will show it again
            this.seenQuests = true;
        } catch (e) {}
        // Clear any pending scheduled popup to avoid it reopening
        try { if (this.questsPopupTimeout) { clearTimeout(this.questsPopupTimeout); this.questsPopupTimeout = null; } } catch(e){}
        try { this.setState({ showQuestsPopup: false }, () => this._cleanupModalBodyClass()); } catch(e){}
    }

    handleOpenQuestsPopup = () => {
        try { this.setState({ showQuestsPopup: true }); } catch(e) {}
    }

    handleOpenCampPopup = () => {
        try { this.setState({ showCampPopup: true }); } catch(e) {}
    }

    handleCloseCampPopup = () => {
        try { this.setState({ showCampPopup: false, showFoodPrepOverlay: false, showSpellsOverlay: false, showMapOverlay: false, mapZoomedLevelId: null, mapUnzoomingLevelId: null, mapRevealAfterUnzoom: false, mapPendingZoomLevelId: null, mapSelectedLevelId: null }, () => this._cleanupModalBodyClass()); } catch(e) {}
    }

    handleOpenFoodPrep = () => {
        this.setState({ showFoodPrepOverlay: true });
    }

    handleFoodPrepBack = () => {
        this.setState({ showFoodPrepOverlay: false });
    }

    handleOpenSpells = () => {
        this.setState({ showSpellsOverlay: true });
    }

    handleSpellsBack = () => {
        this.setState({ showSpellsOverlay: false });
    }

    handleOpenMapOverlay = () => {
        const tracker = this.state.levelTracker || [];
        const activeLevel = tracker.find((entry) => entry && entry.active);
        const currentLevelId = activeLevel ? Number(activeLevel.id) : Number((getMeta() || {}).location?.levelId || 0);
        this.setState({ showMapOverlay: true, mapSelectedLevelId: currentLevelId });
    }

    handleMapOverlayBack = () => {
        this.setState({ showMapOverlay: false, mapZoomedLevelId: null, mapUnzoomingLevelId: null, mapRevealAfterUnzoom: false, mapPendingZoomLevelId: null, mapSelectedLevelId: null });
    }

    handleMapLevelSelect = (levelId) => {
        const nextLevel = Number(levelId);
        if (Number.isNaN(nextLevel)) return;
        this.setState({
            mapSelectedLevelId: nextLevel,
            mapZoomedLevelId: null,
            mapUnzoomingLevelId: null,
            mapRevealAfterUnzoom: false,
            mapPendingZoomLevelId: null
        });
    }

    handleMapZoomClose = () => {
        const exitingLevelId = this.state.mapZoomedLevelId;
        if (exitingLevelId === null || typeof exitingLevelId === 'undefined') return;

        this.setState({ mapZoomedLevelId: null, mapUnzoomingLevelId: exitingLevelId, mapRevealAfterUnzoom: false, mapPendingZoomLevelId: null });
        this._setTimeout(() => {
            this.setState((prev) => {
                if (prev.mapUnzoomingLevelId !== exitingLevelId) return null;
                return { mapUnzoomingLevelId: null, mapRevealAfterUnzoom: true };
            });
        }, 750);

        this._setTimeout(() => {
            this.setState((prev) => {
                if (prev.mapZoomedLevelId !== null || prev.mapUnzoomingLevelId !== null) return null;
                if (!prev.mapRevealAfterUnzoom) return null;
                return { mapRevealAfterUnzoom: false };
            });
        }, 1700);
    }

    handleMapZoomInStart = (levelId, levelCount, selectedIndex) => {
        const MAP_FADE_DURATION_MS = 1000;
        const MAP_FADE_STAGGER_MS = 90;
        const totalLevels = Math.max(Number(levelCount) || 1, 1);
        const safeSelectedIndex = Number.isInteger(selectedIndex) ? selectedIndex : 0;
        const highestIndex = totalLevels - 1;
        const maxNonSelectedIndex = safeSelectedIndex === highestIndex ? Math.max(highestIndex - 1, 0) : highestIndex;
        const zoomStartDelay = MAP_FADE_DURATION_MS + (maxNonSelectedIndex * MAP_FADE_STAGGER_MS);

        this.setState({
            mapPendingZoomLevelId: levelId,
            mapZoomedLevelId: null,
            mapUnzoomingLevelId: null,
            mapRevealAfterUnzoom: false
        });

        this._setTimeout(() => {
            this.setState((prev) => {
                if (prev.mapPendingZoomLevelId !== levelId) return null;
                return { mapZoomedLevelId: levelId, mapPendingZoomLevelId: null };
            });
        }, zoomStartDelay);
    }

    getMapBoardHighlightSvg = (boardIndex) => {
        const idx = Number(boardIndex);
        if (Number.isNaN(idx) || idx < 0 || idx > 8) return '';

        // The tower plane is visually rotated relative to the row-major minimap grid.
        // This remap rotates minimap indices clockwise into the projected slab cells.
        const projectedIndexByMinimapIndex = [6, 3, 0, 7, 4, 1, 8, 5, 2];
        const projectedIndex = projectedIndexByMinimapIndex[idx];
        const row = Math.floor(projectedIndex / 3);
        const col = projectedIndex % 3;
        const a0 = col / 3;
        const a1 = (col + 1) / 3;
        const b0 = row / 3;
        const b1 = (row + 1) / 3;

        const point = (a, b) => {
            const x = 50 + (50 * (a - b));
            const y = 50 * (a + b);
            return `${x.toFixed(3)},${y.toFixed(3)}`;
        };

        const rawPoints = [
            point(a0, b0),
            point(a1, b0),
            point(a1, b1),
            point(a0, b1)
        ].map((pair) => {
            const [x, y] = pair.split(',').map(Number);
            return { x, y };
        });

        const center = rawPoints.reduce((acc, p) => ({
            x: acc.x + p.x,
            y: acc.y + p.y
        }), { x: 0, y: 0 });
        center.x /= rawPoints.length;
        center.y /= rawPoints.length;

        // Pull edges inward to create a true inner border (not overlapping grid lines).
        const insetFactor = 0.17;
        const insetPoints = rawPoints.map((p) => {
            const x = p.x + ((center.x - p.x) * insetFactor);
            const y = p.y + ((center.y - p.y) * insetFactor);
            return `${x.toFixed(3)},${y.toFixed(3)}`;
        }).join(' ');

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${insetPoints}" fill="none" stroke="#66c2ff" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
        return `url("data:image/svg+xml;base64,${btoa(svg)}")`;  
    }

    handleStartRecipe = (recipe) => {
        try {
            const meta = getMeta() || {};
            const currentFood = typeof meta.food === 'number' ? meta.food : 0;
            if (currentFood < recipe.foodCost) return;
            if (meta.campCooking && !meta.campCooking.notified) return; // already cooking
            meta.food = currentFood - recipe.foodCost;
            const startDate = new Date();
            const endDate = new Date(Date.now() + recipe.cookTime);
            meta.campCooking = {
                recipeKey: recipe.key,
                recipeName: recipe.name,
                foodYield: recipe.foodYield,
                startDate,
                endDate,
                notified: false,
            };
            try { storeMeta(meta); } catch(e) {}
            try { updateUserRequest(getUserId(), meta).catch(() => {}); } catch(e) {}
            try { if (typeof this.props.saveUserData === 'function') this.props.saveUserData(); } catch(e) {}
        } catch(e) { console.warn('handleStartRecipe failed', e); }
        this.setState({ showFoodPrepOverlay: false, showCampPopup: false }, () => this._cleanupModalBodyClass());
    }
    render(){
        const crew = ((this.props.crewManager && this.props.crewManager.crew) || []);
        const hasMeleeTrainerCandidate = crew.some(member => ['soldier', 'monk', 'barbarian'].includes((member.type || '').toLowerCase()));
        const hasMagicUser = crew.some(member => ['wizard', 'sage'].includes((member.type || '').toLowerCase()));
        const magicUsers = crew.filter(member => ['wizard', 'sage'].includes((member.type || '').toLowerCase()));

        return (
        <div className={`dungeon-container ${this.state.ritualWrecked ? 'wrecked' : ''}`}>
            {this.state.showNarrativeOverlay && this.state.activeNarrativeSequence && (
                <NarrativeOverlay
                    sequence={this.state.activeNarrativeSequence}
                    onClose={this.closeNarrativeOverlay}
                />
            )}
            <CModal className={this.state.modalType === 'PrepComplete' ? 'prep-complete-modal' : this.state.modalType === 'RitualComplete' ? 'ritual-complete-modal' : this.state.modalType === 'Magic' ? 'ritual-encounter-modal' : this.state.modalType === 'FoodComplete' ? 'food-complete-modal' : ''} alignment="center" visible={this.state.showModal} onClose={() => this.onUpdateModalClosed()}>
                <ModalInner
                    modalType={this.state.modalType}
                    updates={this.state.updates}
                    crew={this.props.crewManager.crew}
                    tileSize={this.state.tileSize}
                    handleMemberClickRitual={this.handleMemberClickRitual}
                    handleCrewTileHover={this.handleCrewTileHover}
                    setMemberRitualOptions={this.state.setMemberRitualOptions}
                    onLearnRitual={this.handleLearnRitual}
                />
            </CModal>
            {/* Quests popup */}
            <CModal className={`quests-modal${this.state.showCampPopup ? ' quests-above-camp' : ''}`} alignment="center" visible={this.state.showQuestsPopup} onClose={this.handleCloseQuestsPopup} backdrop={true} style={this.state.showCampPopup ? {zIndex: 1100} : undefined}>
                <CModalHeader>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                        <CModalTitle>Quests</CModalTitle>
                        <button aria-label="Close quests" className="quests-close" onClick={this.handleCloseQuestsPopup} style={{background: 'transparent', border: 'none', color: '#fff', fontSize: 20}}>✕</button>
                    </div>
                </CModalHeader>
                <CModalBody>
                    {(() => {
                        const QUEST_STYLES = {
                            travel:         { bg: '#1a2535', border: '#4a90d9', titleColor: '#7eb8f7', emoji: '🗺️' },
                            bounty:         { bg: '#2a1515', border: '#c0392b', titleColor: '#e74c3c', emoji: '⚔️' },
                            item_retrieval: { bg: '#162216', border: '#27ae60', titleColor: '#2ecc71', emoji: '🔍' },
                        };
                        const quests = (this.props.questManager && this.props.questManager.activeQuests) || [];
                        if (!quests.length) {
                            return <div style={{color: '#aaa', textAlign: 'center', padding: '32px 0'}}>No active quests. Explore a dungeon to receive missions.</div>;
                        }
                        return (
                            <div className="quests-grid" style={{display:'flex', flexDirection:'row', flexWrap:'wrap', gap: 16, justifyContent: 'center'}}>
                                {quests.map(quest => {
                                    const s = QUEST_STYLES[quest.type] || QUEST_STYLES.travel;
                                    const showProgress = quest.progressTarget > 1;
                                    return (
                                        <div key={quest.id} className="quest-panel" style={{width: 200, padding: 14, background: s.bg, color: '#fff', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.7)', borderTop: `3px solid ${s.border}`, opacity: quest.completed ? 0.5 : 1}}>
                                            <div style={{fontSize: 32, textAlign: 'center', marginBottom: 6}}>{s.emoji}</div>
                                            <div style={{fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: s.titleColor, marginBottom: 6}}>{quest.title}</div>
                                            <div style={{fontSize: 12, color: '#ccc', lineHeight: 1.5}}>{quest.description}</div>
                                            {showProgress && (
                                                <div style={{marginTop: 10}}>
                                                    <div style={{fontSize: 11, color: '#aaa', marginBottom: 3}}>{quest.progress} / {quest.progressTarget}</div>
                                                    <div style={{height: 4, background: '#333', borderRadius: 2}}>
                                                        <div style={{height: '100%', width: `${Math.round((quest.progress / quest.progressTarget) * 100)}%`, background: s.border, borderRadius: 2, transition: 'width 0.3s'}} />
                                                    </div>
                                                </div>
                                            )}
                                            {quest.completed && <div style={{marginTop: 8, fontSize: 11, color: '#8bc34a', fontWeight: 700}}>✓ COMPLETE</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </CModalBody>
            </CModal>
            {/* Camp popup */}
            <CModal className={'camp-modal'} alignment="center" visible={this.state.showCampPopup} onClose={this.handleCloseCampPopup} backdrop={true}>
                {/* Background: camp icon at cover opacity 0.3 */}
                <div className="camp-modal-bg" style={{backgroundImage: `url(${images.camp})`}}></div>
                <CModalHeader>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', position:'relative', zIndex:2}}>
                        <CModalTitle>Camp</CModalTitle>
                        <button aria-label="Close camp" className="camp-close" onClick={this.handleCloseCampPopup} style={{background:'transparent', border:'none', color:'#fff', fontSize:20}}>✕</button>
                    </div>
                </CModalHeader>
                <CModalBody style={{position:'relative', zIndex:2}}>
                    {/* TOP: crew portrait row */}
                    <div className="camp-crew-row">
                        {crew.map((member, i) => (
                            <div key={i} className="camp-crew-tile">
                                <Tile
                                    id={i}
                                    tileSize={108}
                                    image={member.image || null}
                                    imageOverride={member.portrait || null}
                                    contains={member.type}
                                    data={member}
                                    color={member.color}
                                    editMode={false}
                                    type={'crew-tile'}
                                    handleClick={() => {}}
                                    handleHover={() => {}}
                                />
                                <div className="camp-crew-name">{member.name}</div>
                            </div>
                        ))}
                    </div>

                    {/* MIDDLE: action buttons */}
                    <div className="camp-actions-section">
                        <button className="camp-action-btn" onClick={() => { this.handleCloseCampPopup(); this.setUpCamp(); }}>
                            <span className="camp-btn-icon"><span role="img" aria-label="campsite">🏕️</span></span>
                            <span>Recuperate</span>
                        </button>
                        <button className="camp-action-btn" onClick={this.handleOpenQuestsPopup}>
                            <span className="camp-btn-icon"><span role="img" aria-label="scroll">📜</span></span>
                            <span>Quests</span>
                        </button>
                        <button className="camp-action-btn" onClick={this.handleOpenFoodPrep}>
                            <span className="camp-btn-icon"><span role="img" aria-label="meat">🍖</span></span>
                            <span>Prepare Food</span>
                        </button>
                        <button className="camp-action-btn" onClick={this.handleOpenMapOverlay}>
                            <span className="camp-btn-icon"><span role="img" aria-label="map">🗺️</span></span>
                            <span>Map</span>
                        </button>
                        {hasMeleeTrainerCandidate && (
                            <button className="camp-action-btn" onClick={() => {}}>
                                <span className="camp-btn-icon"><span role="img" aria-label="crossed swords">⚔️</span></span>
                                <span>Train</span>
                            </button>
                        )}
                        {hasMagicUser && (
                            <button className="camp-action-btn" onClick={this.handleOpenSpells}>
                                <span className="camp-btn-icon"><span role="img" aria-label="sparkles">✨</span></span>
                                <span>Spells</span>
                            </button>
                        )}
                    </div>

                    {/* BOTTOM: trophies / card deck / shards tiles */}
                    <div className="camp-bottom-tiles">
                        <div className="camp-bottom-tile">
                            <div className="camp-bottom-tile-icon"><span role="img" aria-label="trophy">🏆</span></div>
                            <div className="camp-bottom-tile-label">Trophies</div>
                        </div>
                        <div className="camp-bottom-tile">
                            <div className="camp-bottom-tile-icon" style={{backgroundImage:`url(${images.grimoire})`, backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center', width:54, height:54}}></div>
                            <div className="camp-bottom-tile-label">Card Deck</div>
                        </div>
                        <div className="camp-bottom-tile">
                            <div className="camp-bottom-tile-icon" style={{backgroundImage:`url(${images.eclipse})`, backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center', width:54, height:54}}></div>
                            <div className="camp-bottom-tile-label">Shards</div>
                        </div>
                    </div>
                </CModalBody>

                {/* Food prep overlay — slides over the modal body */}
                {this.state.showFoodPrepOverlay && (() => {
                    const meta = getMeta() || {};
                    const currentFood = typeof meta.food === 'number' ? meta.food : 0;
                    const isCookingAnything = meta.campCooking && !meta.campCooking.notified;
                    return (
                        <div className="food-prep-overlay">
                            <div className="food-prep-header">
                                <button className="food-prep-back" onClick={this.handleFoodPrepBack}>← Back</button>
                                <div className="food-prep-title"><span role="img" aria-label="meat">🍖</span> Prepare Food</div>
                                <div className="food-prep-supply">Supply: {currentFood} <span role="img" aria-label="meat">🍖</span></div>
                            </div>
                            <div className="recipe-cards">
                                {Object.values(RECIPES).map((recipe, i) => {
                                    const canAfford = currentFood >= recipe.foodCost;
                                    const isCookingThis = isCookingAnything && meta.campCooking.recipeKey === recipe.key;
                                    const cookTimeLabel = recipe.cookTime >= 3600000
                                        ? `${recipe.cookTime / 3600000}h`
                                        : `${recipe.cookTime / 60000}m`;
                                    return (
                                        <div key={i} className={`recipe-card${!canAfford ? ' unaffordable' : ''}${isCookingThis ? ' cooking' : ''}`}>
                                            <div className="recipe-card-icon">{recipe.icon}</div>
                                            <div className="recipe-card-name">{recipe.name}</div>
                                            <div className="recipe-card-description">{recipe.description}</div>
                                            <div className="recipe-card-meta">
                                                <span className="recipe-cost"><span role="img" aria-label="meat">🍖</span> -{recipe.foodCost}</span>
                                                <span className="recipe-arrow">→</span>
                                                <span className="recipe-yield">+{recipe.foodYield}</span>
                                            </div>
                                            <div className="recipe-card-duration"><span role="img" aria-label="timer">⏱</span> {cookTimeLabel}</div>
                                            {isCookingThis ? (
                                                <div className="recipe-card-btn cooking-badge">Cooking…</div>
                                            ) : (
                                                <div
                                                    className={`recipe-card-btn${canAfford && !isCookingAnything ? ' start-btn' : ' disabled'}`}
                                                    onClick={() => canAfford && !isCookingAnything && this.handleStartRecipe(recipe)}
                                                >
                                                    {isCookingAnything ? 'Busy' : canAfford ? 'Cook' : 'Not enough food'}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {this.state.showSpellsOverlay && (() => {
                    const normalizeImgUrl = (value) => {
                        if (!value) return '';
                        const resolved = typeof value === 'string' ? value : (value.default || '');
                        if (!resolved) return '';
                        return `url(\"${encodeURI(resolved)}\")`;
                    };

                    return (
                        <div className="spells-overlay">
                            <div className="spells-overlay-header">
                                <button className="spells-overlay-back" onClick={this.handleSpellsBack}>← Back</button>
                                <div className="spells-overlay-title"><span role="img" aria-label="sparkles">✨</span> Dungeon Spells</div>
                                <div className="spells-overlay-subtitle">Combat spells are excluded here. Rituals and prep magic only.</div>
                            </div>

                            <div className="spells-user-list">
                                {magicUsers.map((member) => {
                                    const knownRitualKeys = member.knownRituals || [];
                                    const preparedRituals = (member.specialActions || [])
                                        .filter(action => action && action.type === 'ritual' && action.available)
                                        .map(action => action.ritualKey || action.subtype);
                                    const inProgressRituals = (member.specialActions || [])
                                        .filter(action => action && action.type === 'ritual' && !action.available)
                                        .map(action => action.ritualKey || action.subtype);

                                    return (
                                        <div key={member.id || member.name} className="spells-user-block">
                                            <div className="spells-user-portrait-wrap">
                                                <Tile
                                                    id={member.id || member.name}
                                                    tileSize={108}
                                                    image={member.image || null}
                                                    imageOverride={member.portrait || null}
                                                    contains={member.type}
                                                    data={member}
                                                    color={member.color}
                                                    editMode={false}
                                                    type={'crew-tile'}
                                                    handleClick={() => {}}
                                                    handleHover={() => {}}
                                                />
                                                <div className="spells-user-name">{member.name}</div>
                                                <div className="spells-user-class">{member.type}</div>
                                            </div>

                                            <div className="spells-tiles-grid">
                                                {knownRitualKeys.length === 0 && (
                                                    <div className="spells-empty">No dungeon spells learned yet.</div>
                                                )}

                                                {Object.values(RITUALS)
                                                    .filter(ritual => knownRitualKeys.includes(ritual.key))
                                                    .map((ritual) => {
                                                        const isReady = preparedRituals.includes(ritual.key);
                                                        const isPreparing = inProgressRituals.includes(ritual.key);
                                                        const iconUrl = images[ritual.icon];

                                                        return (
                                                            <div key={`${member.id || member.name}-${ritual.key}`} className={`spell-tile ${isReady ? 'ready' : ''} ${isPreparing ? 'preparing' : ''}`}>
                                                                <div
                                                                    className="spell-tile-icon"
                                                                    style={{ backgroundImage: normalizeImgUrl(iconUrl) }}
                                                                ></div>
                                                                <div className="spell-tile-name">{ritual.name}</div>
                                                                <div className="spell-tile-description">{ritual.description}</div>
                                                                <div className="spell-tile-status">
                                                                    {isReady ? 'Ready' : isPreparing ? 'Preparing' : 'Known'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {this.state.showMapOverlay && (() => {
                    const tracker = this.state.levelTracker || [];
                    const trackerIds = tracker.map((entry) => Number(entry.id)).filter((id) => !Number.isNaN(id));
                    const dungeonIds = ((this.props.boardManager && this.props.boardManager.dungeon && this.props.boardManager.dungeon.levels) || [])
                        .map((level) => Number(level.id))
                        .filter((id) => !Number.isNaN(id));
                    const sourceLevelIds = trackerIds.length ? trackerIds : dungeonIds;
                    const levelIds = Array.from(new Set(sourceLevelIds)).sort((a, b) => b - a);
                    const activeLevel = tracker.find((entry) => entry && entry.active);
                    const currentLevelId = activeLevel ? Number(activeLevel.id) : Number((getMeta() || {}).location?.levelId || 0);
                    const selectedLevelId = this.state.mapSelectedLevelId === null || typeof this.state.mapSelectedLevelId === 'undefined'
                        ? currentLevelId
                        : Number(this.state.mapSelectedLevelId);
                    const activeMinimapIndex = Array.isArray(this.state.minimap) ? this.state.minimap.findIndex((entry) => entry && entry.active) : -1;
                    const boardHighlightImage = this.getMapBoardHighlightSvg(activeMinimapIndex);
                    const playerSlabDot = (() => {
                        try {
                            const bm = this.props.boardManager;
                            if (!bm || !bm.playerTile || !bm.playerTile.location) return null;
                            if (activeMinimapIndex < 0 || activeMinimapIndex > 8) return null;
                            // Determine which 1/3 cell of the diamond this board occupies.
                            const projectedIndexByMinimapIndex = [6, 3, 0, 7, 4, 1, 8, 5, 2];
                            const projectedIndex = projectedIndexByMinimapIndex[activeMinimapIndex];
                            const cellRow = Math.floor(projectedIndex / 3);
                            const cellCol = projectedIndex % 3;
                            const a0 = cellCol / 3;       // u start
                            const a1 = (cellCol + 1) / 3; // u end
                            const b0 = cellRow / 3;       // v start
                            const b1 = (cellRow + 1) / 3; // v end
                            // Match minimap convention exactly:
                            // minimap left  = (loc[1]-15)/14  → col → this is isometric U axis
                            // minimap top   = (loc[0]-15)/14  → row → this is isometric V axis
                            const loc = bm.playerTile.location;
                            const pu = (loc[1] - 15) / 14; // col normalized 0→1 (left-right across diamond)
                            const pv = (loc[0] - 15) / 14; // row normalized 0→1 (top-bottom down diamond)
                            // Map player position into the cell's portion of the diamond
                            const u = a0 + pu * (a1 - a0);
                            const v = b0 + pv * (b1 - b0);
                            // Isometric projection: diamond viewBox 0-100 x 0-100
                            // x increases right as col increases, left as row increases
                            // y increases down as both col and row increase
                            const xPct = (50 + 50 * (u - v)).toFixed(2);
                            const yPct = (50 * (u + v)).toFixed(2);
                            return {
                                left: `${xPct}%`,
                                top: `${yPct}%`
                            };
                        } catch (e) { return null; }
                    })();
                    const zoomedLevelId = this.state.mapZoomedLevelId;
                    const unzoomingLevelId = this.state.mapUnzoomingLevelId;
                    const revealAfterUnzoom = !!this.state.mapRevealAfterUnzoom;
                    const pendingZoomLevelId = this.state.mapPendingZoomLevelId;
                    const hasZoomedLevel = zoomedLevelId !== null && typeof zoomedLevelId !== 'undefined';
                    const hasUnzoomingLevel = unzoomingLevelId !== null && typeof unzoomingLevelId !== 'undefined';
                    const hasPendingZoomLevel = pendingZoomLevelId !== null && typeof pendingZoomLevelId !== 'undefined';
                    const isPreUnzoom = hasUnzoomingLevel && !revealAfterUnzoom;

                    return (
                        <div className="camp-map-overlay" onClick={hasZoomedLevel ? this.handleMapZoomClose : undefined}>
                            <div className="camp-map-header">
                                <button className="camp-map-back" onClick={this.handleMapOverlayBack}>Back</button>
                                <div className="camp-map-title">Dungeon Tower</div>
                                {/* <div className="camp-map-subtitle">Stacked floors from an isometric view</div> */}
                            </div>

                            <div className="camp-map-scene-wrap" onClick={(e) => e.stopPropagation()}>
                                <div className={`camp-map-scene ${hasZoomedLevel ? 'zoomed' : ''} ${hasPendingZoomLevel ? 'pre-zoom' : ''} ${isPreUnzoom ? 'pre-unzoom' : ''} ${revealAfterUnzoom ? 'reveal-others' : ''}`} role="list" aria-label="Dungeon tower floors">
                                    {levelIds.map((levelId, index) => {
                                        const isCurrent = levelId === currentLevelId;
                                        const isSelected = levelId === selectedLevelId;
                                        const isZoomed = zoomedLevelId === levelId;
                                        const showBoardHighlight = isCurrent && isZoomed && !!boardHighlightImage;
                                        const isUnzooming = unzoomingLevelId === levelId;
                                        const isPendingZoom = pendingZoomLevelId === levelId;
                                        const holdOthersHidden = hasZoomedLevel || hasPendingZoomLevel || (hasUnzoomingLevel && !revealAfterUnzoom);
                                        const depthOffset = index * 52;
                                        const slabZIndex = (isZoomed || isUnzooming) ? 1000 : (levelIds.length - index);
                                        return (
                                            <button
                                                key={levelId}
                                                role="listitem"
                                                className={`tower-floor-slab ${isSelected ? 'active' : ''} ${isZoomed ? 'zoomed-in' : ''} ${showBoardHighlight ? 'show-board-highlight' : ''} ${isUnzooming ? 'zooming-out' : ''} ${isPendingZoom ? 'pending-zoom' : ''} ${holdOthersHidden && !isZoomed && !isUnzooming && !isPendingZoom ? 'faded' : ''}`}
                                                style={{
                                                    '--tower-offset': `${depthOffset}px`,
                                                    '--tower-zoom-shift': `${124 - depthOffset}px`,
                                                    '--fade-in-delay': `${index * 90}ms`,
                                                    '--fade-out-delay': `${index * 90}ms`,
                                                    animationDelay: `${index * 70}ms`,
                                                    zIndex: slabZIndex
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // If this level is already selected in map view
                                                    if (isSelected) {
                                                        // If already zoomed, unzoom
                                                        if (isZoomed) {
                                                            this.handleMapZoomClose();
                                                        } else {
                                                            // If selected but not zoomed, zoom in
                                                            this.handleMapZoomInStart(levelId, levelIds.length, index);
                                                        }
                                                    } else {
                                                        // If not selected, select this level in map view only
                                                        this.handleMapLevelSelect(levelId);
                                                    }
                                                }}
                                                title={`Go to level ${levelId}`}
                                            >
                                                <span className="slab-shadow"></span>
                                                <span className="slab-face slab-top"></span>
                                                <span className="slab-face slab-grid"></span>
                                                <span className="slab-face slab-board-highlight" style={showBoardHighlight ? { backgroundImage: boardHighlightImage } : undefined}>
                                                    {showBoardHighlight && playerSlabDot && (
                                                        <span className="slab-player-dot" style={playerSlabDot} />
                                                    )}
                                                </span>
                                                <span className="slab-face slab-left"></span>
                                                <span className="slab-face slab-right"></span>
                                                <span className="slab-label">L{levelId}</span>
                                                {isCurrent && <span className="slab-active-badge">Current</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </CModal>
            {/* <ExpositionPane></ExpositionPane> */}
            {this.props.boardManager.currentOrientation === 'B' && <div className="dark-mask"></div>}
            <div className={`left-side-panel ${this.state.leftPanelExpanded ? 'expanded' : ''}`}>
                <div className="expand-collapse-button icon-container" onClick={this.toggleLeftSidePanel}>
                    <CIcon icon={cilCaretRight} className={`expand-icon ${this.state.leftPanelExpanded ? 'expanded' : ''}`} size="sm"/>
                </div>
                {/* <div className="minimap-container">

                </div> */}
                {/* crew-container moved to right-side panel */}
                {this.state.selectedCrewMember.name && <div className="crew-info-section">
                        <div className="portrait-wrapper">
                            <div className="status-container">
                                <div className="member-level-indicator">Lvl {this.state.selectedCrewMember.level}</div>
                            </div>
                            <div className="portrait" style={{backgroundImage: "url(" + this.state.selectedCrewMember.portrait + ")"}}></div>
                            <div className="cooldowns-container">
                                {/* Group special actions by type (flat structure) */}
                                {(() => {
                                    const actions = this.state.selectedCrewMember.specialActions || [];
                                    const grouped = {};
                                    actions.forEach(action => {
                                        const type = action.type;
                                        if (!grouped[type]) grouped[type] = [];
                                        grouped[type].push(action);
                                    });
                                    return Object.keys(grouped).map((type, i) => {
                                        const group = grouped[type];
                                        const action = group[0]; // representative
                                        const count = group.filter(a => a.available).length;
                                        // Prefer an in-progress action (one whose start/end bracket 'now') for the circular progress UI.
                                        const now = new Date();
                                        const inProgressAction = group.find(a => {
                                            if (!a || !a.startDate || !a.endDate) return false;
                                            const s = new Date(a.startDate);
                                            const e = new Date(a.endDate);
                                            return now >= s && now < e;
                                        });
                                        const progressPct = inProgressAction ? this.getActionCooldownPercentage(inProgressAction) : 0;
                                        
                                        // Prefer iconUrlInverted for DungeonPage (dark bg), fallback to iconUrl, then subtype/default
                                        let iconUrl = action.iconUrlInverted || action.iconUrl;
                                        if (!iconUrl && action.subtype === 'magic missile' && typeof images !== 'undefined') {
                                            iconUrl = images['magic_missile_inverted'] || images['magic_missile'];
                                        }
                                        if (!iconUrl && typeof images !== 'undefined') {
                                            iconUrl = images['glyph_inverted'] || '';
                                        }
                                        return (
                                            <div key={type} className="special-action-wrapper" style={{position: 'relative'}}>
                                                <div className="special-action-icon" style={{backgroundImage: `url(${iconUrl})`}}></div>
                                                {inProgressAction && progressPct < 50 && <div className="progress-overlay"></div>}
                                                {inProgressAction && <div className="left" style={{transform: `rotate(${this.getRotateDegreesLeft(progressPct)}deg)`}}></div>}
                                                {inProgressAction && <div className="right" style={{transform: `rotate(${this.getRotateDegreesRight(progressPct)}deg)`}}></div>}
                                                {count >= 1 && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 6,
                                                        right: -16,
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                        borderRadius: '50%',
                                                        minWidth: 18,
                                                        minHeight: 18,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 10,
                                                        zIndex: 99,
                                                    }}>
                                                        {this.getSubtypeNumeralElement({count})}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                        <div className="name-line">{this.state.selectedCrewMember.name} the {this.uppercaseFirstLetter(this.state.selectedCrewMember.type || this.state.selectedCrewMember.image)}</div>
                        {/* HP bar (hp-line-container) - shows current HP proportion */}
                        {(() => {
                            const selected = this.state.selectedCrewMember || {};
                            const maxHp = (selected.stats && selected.stats.hp) ? selected.stats.hp : 0;
                            const currentHp = (typeof selected.hp !== 'undefined') ? selected.hp : maxHp;
                            const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, Math.ceil((currentHp / maxHp) * 100))) : 0;
                            return (
                                <div className="hp-line-container" style={{width: '100%'}}>
                                    <div className="hp-line" style={{width: `${hpPct}%`}}></div>
                                </div>
                            )
                        })()}

                        <div className="experience-line-container">
                            <div className="experience-line" style={{width: `${this.props.crewManager.calculateExpPercentage(this.state.selectedCrewMember)}%`}}></div>
                        </div>

                        {/* Max HP stat-line under the experience container */}
                        {(() => {
                            const selected = this.state.selectedCrewMember || {};
                            const maxHp = (selected.stats && selected.stats.hp) ? selected.stats.hp : 0;
                            return (
                                <div className="stat-line"> <span className="stat-name">Max HP</span>  <span className='stat-value'>{maxHp} </span> </div>
                            )
                        })()}
                        <div className="stat-line"> <span className="stat-name">Strength</span>  <span className='stat-value'>{this.state.selectedCrewMember.stats?.str} </span> </div>
                        <div className="stat-line">Dexterity <span className='stat-value'> {this.state.selectedCrewMember.stats?.dex} </span></div>
                        <div className="stat-line">Intelligence <span className='stat-value'>{this.state.selectedCrewMember.stats?.int} </span></div>
                        {/* Vitality removed */}
                        <div className="stat-line">Fortitude <span className='stat-value'> {this.state.selectedCrewMember.stats?.fort} </span></div>
                        <div className="icon-container menu" onClick={this.toggleActionsTray}>
                            <CIcon icon={cilMenu} className={`menu-icon ${this.state.leftPanelExpanded ? 'expanded' : ''}`} size="sm"/>
                            Actions
                        </div>
                        <div className={`actions-tray ${this.state.actionsTrayExpanded && (Array.isArray(this.state.actionMenuTypeExpanded) ? this.state.actionMenuTypeExpanded.length > 0 : !!this.state.actionMenuTypeExpanded) ? 'double-expanded' : 
                        (this.state.actionsTrayExpanded ? 'expanded' : '')}`}>
                            {this.getCharacterActions(this.state.selectedCrewMember)}
                        </div>
                        <div className="equipment-panel">
                            {/* Replaced with a direct copy of the `.crew-body` from the inventory popup */}
                            <div className='crew-body' style={{filter: 'invert(1)', marginTop: '-16px'}}>
                                <div className='crew-body-image' style={{backgroundImage: `url(${images.body_male})`}} />
                                {/* equip slots: chest, right-hand, left-hand, head, ancillary-left, ancillary-right */}
                                {(() => {
                                    const selected = this.state.selectedCrewMember || {};
                                    const findEquipped = (slot) => {
                                        const slotsToCheck = (slot === 'pet' || slot === 'bottom-left') ? ['pet','bottom-left'] : [slot];
                                        return (selected.inventory || []).find(i => slotsToCheck.includes(i.equippedSlot));
                                    };
                                    const chest = findEquipped('chest');
                                    const right = findEquipped('right');
                                    const left = findEquipped('left');
                                    const head = findEquipped('head');
                                    const boots = findEquipped('boots');
                                    const bottomLeft = findEquipped('pet');
                                    const ancillaryLeft = findEquipped('ancillary-left');
                                    const ancillaryRight = findEquipped('ancillary-right');
                                    // Read-only slot — no click, just a name tooltip on hover
                                    const ReadOnlySlot = ({ item, slotClass }) => (
                                        <div className={`equip-slot ${slotClass} ep-slot-wrapper`}>
                                            {item && (
                                                <>
                                                    <Tile
                                                        id={item.id}
                                                        data={item}
                                                        tileSize={this.state.tileSize}
                                                        image={item.icon}
                                                        contains={item.name ? item.name.replace(' ', '_') : null}
                                                        color={item.color}
                                                        editMode={false}
                                                        type={'inventory-tile'}
                                                        handleClick={() => {}}
                                                        handleHover={() => {}}
                                                    />
                                                    <div className="ep-slot-name">{item.name}</div>
                                                </>
                                            )}
                                        </div>
                                    );
                                    return (
                                        <>
                                            <ReadOnlySlot item={chest}        slotClass="slot-chest" />
                                            <ReadOnlySlot item={right}        slotClass="slot-right" />
                                            <ReadOnlySlot item={left}         slotClass="slot-left" />
                                            <ReadOnlySlot item={head}         slotClass="slot-head" />
                                            <ReadOnlySlot item={boots}        slotClass="slot-boots" />
                                            <ReadOnlySlot item={ancillaryLeft}  slotClass="slot-ancillary-left" />
                                            <ReadOnlySlot item={ancillaryRight} slotClass="slot-ancillary-right" />
                                            <ReadOnlySlot item={bottomLeft}   slotClass="slot-pet" />
                                        </>
                                    )
                                })()}
                            </div>
                            {/* left-body-preview mirror (kept for legacy styling hooks) */}
                            <div className='left-body-preview' style={{backgroundImage: `url(${images.body_male})`, backgroundSize: '130%'}}></div>
                            {/* stats display area removed from left panel (kept only in inventory popup) */}
                        </div>
                        <div className="description-panel">
                            {this.state.descriptionText}
                        </div>
                </div>}
            </div>
            {/* Dev console panel (toggled with Shift+Space) */}
            {this.state.devConsoleOpen && (
                <div className="dev-console">
                    <div className="dev-console-inner">
                        <div className="dev-console-left">
                            <input
                                ref={this.devConsoleInputRef}
                                className="dev-console-input"
                                value={this.state.devConsoleInput}
                                onChange={this.handleDevConsoleInputChange}
                                onKeyDown={this.handleDevConsoleKeyDown}
                                placeholder="type command..."
                            />
                            <div className="dev-console-typed">{this.state.devConsoleInput}</div>
                        </div>
                        <div className="dev-console-divider" />
                        <div className="dev-console-right">
                            <div className="dev-console-output" ref={this.devConsoleOutputRef}>
                                {this.state.devConsoleOutput.map((line, idx) => (
                                    <div key={idx} className="dev-console-line">{line}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className={`right-side-panel ${this.state.rightPanelExpanded ? 'expanded' : ''}`}>
                <div className="minimap-container">
                    <div className="map-wrapper">
                        <div className="level-indicator">
                            {this.state.levelTracker && this.state.levelTracker.map((e,i)=>{
                                return <div key={i} className={`floor-level ${e.active ? 'active' : ''} `}></div>
                            })}
                        </div>
                        {this.state.minimap.map((e,i)=>{
                            // Build breadcrumb SVG trail for this board tile
                            const bcTrail = (() => {
                                try {
                                    const now = Date.now();
                                    const DIM_MS  = 20 * 60 * 1000; // 20 min → dim
                                    const TILE_PX = 50; // matches .minimap-tile height/width
                                    // Current plane — must match what recordBreadcrumb stored
                                    const currentLevelId = (this.state.levelTracker.find(e => e.active) || {}).id;
                                    const currentOrientation = (this.props.boardManager && this.props.boardManager.currentOrientation) || 'A';
                                    // Gather all crumbs for this board on this plane, sorted by visit order
                                    const crumbs = [];
                                    this._breadcrumbs.forEach(val => {
                                        if (
                                            val.boardIndex === i &&
                                            val.levelId === currentLevelId &&
                                            val.orientation === currentOrientation
                                        ) crumbs.push(val);
                                    });
                                    if (crumbs.length === 0) return null;
                                    crumbs.sort((a, b) => a.seq - b.seq);
                                    // Convert row/col (15–29) to SVG pixel coords within 50px tile
                                    const toXY = c => ({
                                        x: ((c.col - 15) / 14) * TILE_PX,
                                        y: ((c.row - 15) / 14) * TILE_PX,
                                    });
                                    // Split into consecutive fresh / dim segments for two-colour rendering.
                                    const freshPts = [];
                                    const dimPts   = [];
                                    crumbs.forEach(c => {
                                        const age = now - c.ts;
                                        const {x, y} = toXY(c);
                                        if (age <= DIM_MS) freshPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                                        else               dimPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                                    });
                                    return { freshPts, dimPts };
                                } catch(e) { return null; }
                            })();
                            return <div className={`minimap-tile 
                            ${this.state.minimap[i].active ? 'active' : ''}
                            ${this.props.boardManager && this.props.boardManager.currentOrientation === 'B' && this.state.minimap[i].active ? 'backside' : ''}
                            ${this.state.minimapZoomedTile === i ? 'zoomed' : ''}
                            ${this.state.minimapZoomedTile === i && i === 0 ? 'topLeft' : ''}
                            ${this.state.minimapZoomedTile === i && i === 1 ? 'topMid' : ''}
                            ${this.state.minimapZoomedTile === i && i === 2 ? 'topRight' : ''}
                            ${this.state.minimapZoomedTile === i && i === 3 ? 'midLeft' : ''}
                            ${this.state.minimapZoomedTile === i && i === 5 ? 'midRight' : ''}
                            ${this.state.minimapZoomedTile === i && i === 6 ? 'botLeft' : ''}
                            ${this.state.minimapZoomedTile === i && i === 7 ? 'botMid' : ''}
                            ${this.state.minimapZoomedTile === i && i === 8 ? 'botRight' : ''}
                            `} key={i} onClick={() => this.minimapTileClicked(i)}>

                                {/* Breadcrumb trail SVG — rendered below the player dot */}
                                {bcTrail && (bcTrail.freshPts.length > 1 || bcTrail.dimPts.length > 1) && (
                                    <svg className="breadcrumb-trail-svg" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                                        {bcTrail.dimPts.length > 1 && (
                                            <polyline
                                                points={bcTrail.dimPts.join(' ')}
                                                className="bc-dim"
                                            />
                                        )}
                                        {bcTrail.freshPts.length > 1 && (
                                            <polyline
                                                points={bcTrail.freshPts.join(' ')}
                                                className="bc-fresh"
                                            />
                                        )}
                                    </svg>
                                )}

                                {/* // player // */}
                                {this.state.minimap[i].active && <div className="player-position-indicator"
                                style={{
                                    left: this.calcPlayerIndicatorLeft(),
                                    top: this.calcPlayerIndicatorTop()
                                }}></div>}

                                {/* per-tile backside badge removed in favor of a single centralized indicator */}

                                {/* // enemies // */}
                                {this.state.minimapIndicators[i] && this.state.minimapIndicators[i].enemies.map((indicator,idx)=>{
                                    return <div key={idx} className={`minimap-indicator enemy`}
                                    style={{
                                        left: this.calcIndicator(indicator.tileId).left,
                                        top: this.calcIndicator(indicator.tileId).top
                                    }}>
                                    </div>
                                })}

                                {/* // stairs // */}
                                {this.state.minimapIndicators[i] && this.state.minimapIndicators[i].stairs.map((indicator,idx)=>{
                                    return <div key={idx} className={`minimap-indicator stairs`}
                                    style={{
                                        left: this.calcIndicator(indicator.tileId).left,
                                        top: this.calcIndicator(indicator.tileId).top
                                    }}>
                                    </div>
                                })}

                                {/* // gates // */}
                                {this.state.minimapIndicators[i] && this.state.minimapIndicators[i].gates.map((indicator,idx)=>{
                                    return <div key={idx} className={`minimap-indicator gate`}
                                    style={{
                                        left: this.calcIndicator(indicator.tileId).left,
                                        top: this.calcIndicator(indicator.tileId).top
                                    }}>
                                    </div>
                                })}

                            </div>
                        })}
                    </div>
                    {/* Backside indicator: shows centered text when the board is on the backside plane */}
                    
                        <div className="backside-indicator">
                            {this.props.boardManager && this.props.boardManager.currentOrientation === 'B' && <span>backside</span>}
                        </div>
                    <div className={`tray-wrapper ${this.state.minimapZoomedTile !== null ? (this.state.minimapMarkerTrayOpen ? 'double-expanded' : 'expanded') : ''}`}>
                        {/* <button className="one" onClick={() => this.setState({minimapZoomedTile: null, minimapMarkerTrayOpen: false})}>Zoom Out</button> */}
                        {/* <button className="one" onClick={() => this.beginMarkingMap()}>Mark Map</button> */}
                        <CButton onClick={() => this.setState({minimapZoomedTile: null, minimapMarkerTrayOpen: false})}>Zoom Out</CButton>
                        <CButton onClick={() => this.beginMarkingMap()}>Mark Map</CButton>


                        {/* <button className="one">three</button> */}
                        <div className={`mark-map-tray ${this.state.minimapMarkerTrayOpen ? 'expanded' : ''}`}>
                            <CFormSelect 
                                aria-label="Marker Selector"
                                // ref={this.state.markerSelectVal}
                                options={
                                    ['Marker Type'].concat(MARKER_TYPES.map((e, i)=>{
                                    return e
                                    }))
                                }
                                value={this.state.markerType}
                                
                                onChange={e => this.onMarkerTypeDropdownChange(e.target.value)}
                                // onChange={this.props.dungeonSelectOnChange}
                            />
                            <CFormInput
                                type="text"
                                // ref={this.state.mapMarkerInput}
                                value={this.state.markerName}
                                onChange={e => this.onMarkerNameInputChange(e.target.value)}
                                placeholder="marker name"
                                aria-describedby="marker name"
                            ></CFormInput>
                            <CButton onClick={() => this.placeMapMarkerStart()} className='place-marker-button' component="a" color="light" href="#" role="button">Place Marker</CButton>
                            <CButton onClick={() => this.submitMarkers()} component="a" color="light" href="#" role="button">Submit</CButton>

                        </div>
                        <CButton className='clear-all-markers' onClick={() => this.clearAllMarkers()} color="danger">Clear All Markers</CButton>
                    </div>
                </div>
                <div className="crew-container">
                    {/* <div className="title">Crew</div> */}

                    {/* Death tracker: shows skull icons for recent group deaths (meta.deathTracker) */}
                    {(() => {
                        try {
                            const meta = getMeta() || {};
                            const deaths = meta.deathTracker || 0;
                            const tooltip = 'Your crew has met death and been spared. If this happens thrice, your journey is over';
                            // Always render the container (so the portal ref exists and the UI is inspectable)
                            // but only render skulls when deaths > 0
                                if (!deaths || deaths <= 0) return null;
                                return (
                                <div className="death-tracker" aria-label={tooltip}>
                                    {new Array(deaths).fill(0).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="death-skull-wrapper"
                                            tabIndex={0}
                                            title={tooltip}
                                            aria-label={tooltip}
                                            role="button"
                                            onClick={() => this.openCardDuel(idx)}
                                            style={{cursor: 'pointer'}}
                                        >
                                            <div className="death-skull" style={{backgroundImage: `url(${images['whiteskull']})`}}></div>
                                        </div>
                                    ))}
                                </div>
                            );
                        } catch (e) { return null; }
                    })()}
                    {this.state.toastMessage && <div className="dungeon-toast" style={{marginTop:8, padding:8, background:'#2b1b1b', color:'#f0d', borderRadius:4}}>{this.state.toastMessage}</div>}
                    {/* Quicklook Panel: crew-wide stats summary */}
                    {(() => {
                        const meta = getMeta() || {};
                        const crew = this.props.crewManager.crew || [];
                        const totalAtk = crew.reduce((sum, m) => sum + (m && m.stats && typeof m.stats.atk === 'number' ? m.stats.atk : 0), 0);
                        const totalDef = crew.reduce((sum, m) => sum + (m && m.stats && typeof m.stats.def === 'number' ? m.stats.def : 0), 0);
                        const food = typeof meta.food === 'number' ? meta.food : 55;
                        const resolve = typeof meta.resolve === 'number' ? meta.resolve : 100;
                        return (
                            <div className="quicklook-panel">
                                <div className="ql-row"><span className="ql-label"><span role="img" aria-label="crossed swords">⚔</span> Attack</span><span className="ql-value">{totalAtk}</span></div>
                                <div className="ql-row"><span className="ql-label"><span role="img" aria-label="shield">🛡</span> Defense</span><span className="ql-value">{totalDef}</span></div>
                                <div className="ql-row"><span className="ql-label"><span role="img" aria-label="meat">🍖</span> Food</span><span className="ql-value">{food}</span></div>
                                <div className="ql-row"><span className="ql-label"><span role="img" aria-label="fist">✊</span> Resolve</span><span className="ql-value">{resolve}</span></div>
                            </div>
                        );
                    })()}
                    <div className="crew-tile-container">
                        {   this.props.crewManager.crew &&
                            this.props.crewManager.crew.map((member, i) => {
                                const isSelectedTile = this.state.selectedCrewMember && this.state.selectedCrewMember.id === member.id;
                                return <div className="sub-container" key={i} style={{opacity: isSelectedTile ? 1 : 0.5}}>
                                            { this.state.crewHoverMatrix[i] && <div className="hover-message">{this.state.crewHoverMatrix[i]}</div>}
                                            <Tile 
                                            key={i}
                                            id={i}
                                            tileSize={this.state.tileSize}
                                            image={member.image ? member.image : null}
                                            imageOverride={member.portrait ? member.portrait : null}
                                            contains={member.type}
                                            data={member}
                                            color={member.color}
                                            backgroundColor={hexToRgba(member.color, 0.5)}
                                            editMode={false}
                                            type={'crew-tile'}
                                            handleClick={this.handleMemberClick}
                                            handleHover={this.handleCrewTileHover}
                                            className={`crew-tile `}
                                            >
                                            </Tile>
                                        </div>
                            })
                        }
                    </div>
                    {/* Crew Actions: a right-panel mirror of the left Actions menu */}
                    <div className="menu crew-actions" onClick={this.toggleCrewActionsTray}>
                        <CIcon icon={cilMenu} className={`menu-icon ${this.state.crewActionsTrayExpanded ? 'expanded' : ''}`} size="sm"/>
                        Crew Actions
                    </div>
                    <div className={`actions-tray crew-actions-tray ${this.state.crewActionsTrayExpanded ? 'expanded' : ''}`}>
                        {(() => {
                            const meta = getMeta() || {};
                            const camping = meta.camping;
                            if (camping) {
                                const start = meta.campingStart || '';
                                const end = meta.campingEnd || '';
                                // use a stable id so the placeholder element is not recreated each render
                                const placeholderId = 'camp-progress-placeholder';
                                return (
                                    <div className="crew-action-item action-row" style={{position:'relative'}}>
                                        <div className="camp-label">
                                            <span style={{position: 'relative', zIndex: 2}}>Recuperating in Camp...</span>
                                            <div
                                                id={placeholderId}
                                                ref={el => this.placeholderRef(el, placeholderId, start, end)}
                                                className={`progress-overlay camp-anim`}
                                                data-start={start}
                                                data-end={end}
                                            ></div>
                                            <div
                                                onClick={() => this.endCamp()}
                                                role="button"
                                                aria-label="Close camp"
                                                style={{position: 'absolute', right: 6, top: 2, cursor: 'pointer', fontWeight: 700, zIndex: 3}}
                                            >
                                                ×
                                            </div>
                                            </div>
                                        
                                    </div>
                                );
                            }
                            return (
                                <div className="crew-action-item action-row" style={{display:'flex', flexDirection:'column', gap:6}}>
                                    <div onClick={() => this.handleOpenCampPopup()} style={{cursor:'pointer', paddingLeft: '15px'}}>Go to camp</div>
                                    {this.state.campWarningMessage && (
                                        <div style={{paddingLeft: 15, fontSize: 11, color: '#e74c3c', lineHeight: 1.4}}>
                                            {this.state.campWarningMessage}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
                <div className="expand-collapse-button icon-container" onClick={this.toggleRightSidePanel}>
                    <CIcon icon={cilCaretLeft} className={`expand-icon ${this.state.rightPanelExpanded ? 'expanded' : ''}`} size="sm"/>
                </div>
            </div>
            {this.state.currentBoard && <div className="info-panel">{this.props.boardManager.currentBoard.name}</div>}
            {this.state.inMonsterBattle === false && <div style={{
                    opacity: this.state.tiles.length > 0 ? 1 : 0,
                    transition: 'opacity 1s'
                    }} className={`center-board-wrapper ${this.state.minimapPlaceMapMarkerStarted ? 'show-map-marker-cursor' : ''}`}>
                <div className="message-container" style={{opacity: this.state.showMessage ? 1 : 0, transition: 'opacity 0.5s'}}>
                    {this.state.messageToDisplay}
                </div>
                <div className="respawn-message-container" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <div style={{width: 10, height: 10, borderRadius: 10, background: 'red'}}></div>
                        <div style={{fontSize: 12}}>{this.state.timeToRespawn}</div>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <div style={{width: 10, height: 10, borderRadius: 10, background: 'gold'}}></div>
                        <div style={{fontSize: 12}}>{this.state.itemTimeToRespawn}</div>
                    </div>
                </div>
                <div  className="overlay-board" style={{
                    width: this.state.boardSize+'px', height: this.state.boardSize+ 'px',
                    backgroundColor: 'transparent',
                    pointerEvents: this.state.minimapPlaceMapMarkerStarted ? 'auto' : 'none'
                    }}>
                    {this.state.overlayTiles && this.state.overlayTiles.map((tile, i) => {
                        // suppress the player's static avatar on origin/destination while animating
                        let overlayImage = tile.image ? tile.image : null;
                        if (this.state.playerAnimating && (i === this.state.animOriginIndex || i === this.state.animDestIndex)) overlayImage = null;
                        return <Tile 
                        key={i}
                        id={i}
                        cursor={this.state.minimapPlaceMapMarkerStarted ? 'crosshair' : 'default'}
                        tileSize={this.state.tileSize}
                        image={overlayImage}
                        imageOverride={overlayImage && overlayImage.includes('/') ? overlayImage : null}
                        contains={tile.contains}
                        terrain={tile.terrain}
                        color={tile.color ? tile.color : 'lightgrey'}
                        borders={tile.borders}
                        coordinates={tile.coordinates}
                        index={tile.id}
                        editMode={false}
                        handleHover={this.handleOverlayHover}
                        type={'overlay-tile'}
                        passThrough={!this.state.minimapPlaceMapMarkerStarted}
                        handleClick={(e)=>this.handleOverlayClick}
                        // For overlay tiles we want the background color to reflect overlay state (e.g. edge indicator)
                        backgroundColor={tile.color ? tile.color : (this.state.overlayHoveredTileId === i && this.state.minimapPlaceMapMarkerStarted ? 'rgba(100, 100, 38, 0.272)' : 'transparent')}
                        >
                        </Tile>
                    })}
                </div>
                <div  className="board" style={{
                    width: this.state.boardSize+'px', height: this.state.boardSize+ 'px',
                    backgroundColor: 'white'
                    }}>
                    {this.state.tiles && this.state.tiles.map((tile, i) => {
                        // suppress the player's static avatar on origin/destination while animating
                        let boardImage = tile.image ? tile.image : (tile.icon ? tile.icon : null);
                        if (this.state.playerAnimating && (i === this.state.animOriginIndex || i === this.state.animDestIndex)) boardImage = null;
                        return <Tile 
                        key={i}
                        cursor={this.state.minimapPlaceMapMarkerStarted ? 'crosshair' : 'default'}
                        tileSize={this.state.tileSize}
                        image={boardImage}
                        imageOverride={boardImage && boardImage.includes ? (boardImage.includes('/') ? boardImage : null) : null}
                        contains={tile.contains}
                        terrain={tile.terrain}
                        color={tile.color ? tile.color : 'lightgrey'}
                        borders={tile.borders}
                        coordinates={tile.coordinates}
                        index={tile.id}
                        showCoordinates={this.props.showCoordinates}
                        editMode={false}
                        handleHover={this.handleHover}
                        type={tile.type}
                        handleClick={this.handleClick}
                        >
                        </Tile>
                    })}
                </div>
            </div>}

            {/* Floating player overlay element used for two-stage movement animation */}
            {this.state.playerFloatVisible && (
                <div
                    ref={this.playerFloatRef}
                    className="floating-player"
                    aria-hidden="true"
                    style={{
                        position: 'fixed',
                        left: this.state.playerFloatStyle.left,
                        top: this.state.playerFloatStyle.top,
                        width: this.state.tileSize,
                        height: this.state.tileSize,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        pointerEvents: 'none',
                        transform: this.state.playerFloatStyle.transform,
                        zIndex: 9999,
                        backgroundImage: this.state.playerFloatStyle.backgroundImage
                    }}
                />
            )}
            
            
            {/* /// ANIMATION GRID ///  */}
            {/* { this.state.keysLocked && 
                <AnimationGrid
                        animationManager={this.props.animationManager}
                        tileProps={{
                            TILE_SIZE,
                            MAX_DEPTH,
                            SHOW_TILE_BORDERS,
                            MAX_ROWS
                        }}
                ></AnimationGrid>
            } */}


            { this.state.keysLocked && this.state.inMonsterBattle &&
            <MonsterBattle
                ref={this.monsterBattleComponentRef}
                combatManager={this.props.combatManager}
                overlayManager={this.props.overlayManager}
                inventoryManager={this.props.inventoryManager}
                animationManager={this.props.animationManager}
                crewManager={this.props.crewManager}
                crew={this.props.crewManager.crew}
                monster={this.state.monster}
                minions={this.state.minions}
                battleOver={this.battleOver}
                paused={this.state.paused}
                setNarrativeSequence={this.props.setNarrativeSequence}
                useConsumableFromInventory={this.useConsumableFromInventory}
                onFighterUpdate={this.handleFighterUpdateFromBattle}
                onDeathTrackerChanged={this.handleDeathTrackerChanged}
            ></MonsterBattle>}

            <CModal className='inventory-modal' alignment='center' visible={this.state.showInventoryPopup} onClose={() => this.setState({ showInventoryPopup: false })}>
                <div className='inventory-content'>
                    <div className='inventory-header'>
                        <div className='inventory-title'>Inventory</div>
                        {this.props.inventoryManager && this.props.inventoryManager.gold > 0 && (
                            <div className='inventory-gold'>
                                <div className='gold-readout'>Gold: {this.props.inventoryManager.gold}</div>
                            </div>
                        )}
                    </div>
                    <div className='crew-panels'>
                        {((this.props.crewManager && this.props.crewManager.crew) || []).map((member, idx) => {
                            const portraitUrl = (images && images[member.portrait]) || member.portrait;
                            const isSelected = this.state.selectedCrewMember && this.state.selectedCrewMember.id === member.id;
                            return (
                                <div className='crew-panel' key={member.id || idx}>
                                    <div
                                        className='crew-portrait'
                                        style={{
                                            backgroundImage: `url(${portraitUrl})`,
                                            border: isSelected ? '3px solid lightgreen' : '3px solid transparent',
                                            boxSizing: 'border-box'
                                        }}
                                    ></div>
                                    <div className='crew-body' style={{
                                        filter: 'invert(1)',
                                        pointerEvents: isSelected ? 'auto' : 'none',
                                        marginTop: '-16px'
                                    }}>
                                        <div className='crew-body-image' style={{backgroundImage: `url(${images.body_male})`}} />
                                        {/* equip slots: chest, right-hand, left-hand, head, and ancillary */}
                                        {(() => {
                                            const findEquipped = (m, slot) => {
                                                const slotsToCheck = (slot === 'pet' || slot === 'bottom-left') ? ['pet', 'bottom-left'] : [slot];
                                                return (m.inventory || []).find(i => slotsToCheck.includes(i.equippedSlot));
                                            };
                                            const chest = findEquipped(member, 'chest');
                                            const right = findEquipped(member, 'right');
                                            const left = findEquipped(member, 'left');
                                            const head = findEquipped(member, 'head');
                                            const boots = findEquipped(member, 'boots');
                                            const bottomLeft = findEquipped(member, 'pet');
                                            const ancillaryLeft = findEquipped(member, 'ancillary-left');
                                            const ancillaryRight = findEquipped(member, 'ancillary-right');
                                            return (
                                                <>
                                                    <div className='equip-slot slot-chest' style={{outline: isSelected && chest ? '2px solid #782d7b' : undefined}}>{chest && (
                                                        <Tile
                                                            id={chest.id}
                                                            data={chest}
                                                            tileSize={this.state.tileSize}
                                                            image={chest.icon}
                                                            contains={chest.name ? chest.name.replace(' ', '_') : null}
                                                            color={chest.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(chest) : null}
                                                            handleHover={this.handleInventoryTileHover}
                                                        />
                                                    )}</div>
                                                    <div className='equip-slot slot-right' style={{outline: isSelected && right ? '2px solid #782d7b' : undefined}}>{right && (
                                                        <Tile
                                                            id={right.id}
                                                            data={right}
                                                            tileSize={this.state.tileSize}
                                                            image={right.icon}
                                                            contains={right.name ? right.name.replace(' ', '_') : null}
                                                            color={right.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(right) : null}
                                                            handleHover={this.handleInventoryTileHover}
                                                        />
                                                    )}</div>
                                                    <div className='equip-slot slot-left' style={{outline: isSelected && left ? '2px solid #782d7b' : undefined}}>{left && (
                                                        <Tile
                                                            id={left.id}
                                                            data={left}
                                                            tileSize={this.state.tileSize}
                                                            image={left.icon}
                                                            contains={left.name ? left.name.replace(' ', '_') : null}
                                                            color={left.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(left) : null}
                                                            handleHover={this.handleInventoryTileHover}
                                                        />
                                                    )}</div>
                                                    <div className='equip-slot slot-head' style={{outline: isSelected && head ? '2px solid #782d7b' : undefined}}>{head && (
                                                        <Tile
                                                            id={head.id}
                                                            data={head}
                                                            tileSize={this.state.tileSize}
                                                            image={head.icon}
                                                            contains={head.name ? head.name.replace(' ', '_') : null}
                                                            color={head.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(head) : null}
                                                            handleHover={this.handleInventoryTileHover}
                                                        />
                                                    )}</div>
                                                    <div className='equip-slot slot-boots' style={{outline: isSelected && boots ? '2px solid #782d7b' : undefined}}>{boots && (
                                                        <Tile
                                                            id={boots.id}
                                                            data={boots}
                                                            tileSize={this.state.tileSize}
                                                            image={boots.icon}
                                                            contains={boots.name ? boots.name.replace(' ', '_') : null}
                                                            color={boots.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(boots) : null}
                                                            handleHover={this.handleInventoryTileHover}
                                                        />
                                                    )}</div>
                                                    <div className='equip-slot slot-ancillary-left' style={{outline: isSelected && ancillaryLeft ? '2px solid #782d7b' : undefined}}>{ancillaryLeft && (
                                                        <Tile
                                                            id={ancillaryLeft.id}
                                                            data={ancillaryLeft}
                                                            tileSize={this.state.tileSize}
                                                            image={ancillaryLeft.icon}
                                                            contains={ancillaryLeft.name ? ancillaryLeft.name.replace(' ', '_') : null}
                                                            color={ancillaryLeft.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(ancillaryLeft) : null}
                                                            handleHover={this.handleInventoryTileHover}
                                                        />
                                                    )}</div>
                                                    <div className='equip-slot slot-ancillary-right' style={{outline: isSelected && ancillaryRight ? '2px solid #782d7b' : undefined}}>{ancillaryRight && (
                                                        <Tile
                                                            id={ancillaryRight.id}
                                                            data={ancillaryRight}
                                                            tileSize={this.state.tileSize}
                                                            image={ancillaryRight.icon}
                                                            contains={ancillaryRight.name ? ancillaryRight.name.replace(' ', '_') : null}
                                                            color={ancillaryRight.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(ancillaryRight) : null}
                                                            handleHover={this.handleInventoryTileHover}
                                                        />
                                                    )}</div>
                                    <div className='equip-slot slot-pet' style={{outline: isSelected && bottomLeft ? '2px solid #782d7b' : undefined}}>{bottomLeft && (
                                                        <>
                                                        <Tile
                                                            id={bottomLeft.id}
                                                            data={bottomLeft}
                                                            tileSize={this.state.tileSize}
                                                            image={bottomLeft.icon}
                                                            contains={bottomLeft.name ? bottomLeft.name.replace(' ', '_') : null}
                                                            color={bottomLeft.color}
                                                            editMode={false}
                                                            type={'inventory-tile'}
                                                            handleClick={() => isSelected ? this.handleEquipmentItemClick(bottomLeft) : null}
                                                            handleHover={this.handleInventoryTileHover}
                                                        />
                                                        <div className="pet-overlay" aria-hidden="true">🐾</div>
                                                        </>
                                                    )}</div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                    <div className="stats-display" style={{width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '8px', boxSizing: 'border-box', marginTop: '-38px', opacity: isSelected ? 1 : 0.5}}>
                                        {[
                                            'attack',
                                            'defense',
                                            'speed',
                                            'luck',
                                            'willpower',
                                            'hp',
                                            'energy max',
                                            'energy regeneration'
                                        ].map((key) => {
                                            let value = 0;
                                            try {
                                                if (key === 'attack') value = (member && member.stats && typeof member.stats.atk === 'number') ? member.stats.atk : 0;
                                                else if (key === 'defense') value = (member && member.stats && typeof member.stats.def === 'number') ? member.stats.def : 0;
                                                else if (key === 'hp') value = (member && member.stats && typeof member.stats.hp === 'number') ? member.stats.hp : 0;
                                            } catch (e) {}

                                            // compute equipped weapon percent bonus (sum of equipped weapons)
                                            let weaponPercent = 0;
                                            // compute equipped armor percent bonus (sum of equipped armor pieces)
                                            let armorPercent = 0;
                                            try {
                                                if (member && Array.isArray(member.inventory)) {
                                                    if (key === 'attack') {
                                                        const equippedWeapons = member.inventory.filter(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === member.id));
                                                        if (equippedWeapons.length) {
                                                            weaponPercent = equippedWeapons.reduce((acc, w) => acc + (typeof w.damage === 'number' ? w.damage : 0), 0);
                                                        }
                                                    }
                                                    if (key === 'defense') {
                                                        const equippedArmor = member.inventory.filter(i => i && i.type === 'armor' && (i.equippedSlot || i.equippedBy === member.id));
                                                        if (equippedArmor.length) {
                                                            armorPercent = equippedArmor.reduce((acc, a) => acc + (typeof a.armor === 'number' ? a.armor : 0), 0);
                                                        }
                                                    }
                                                }
                                            } catch (e) { weaponPercent = 0; armorPercent = 0 }

                                            return (
                                                <div key={key} className="stat-line" style={{display: 'flex', justifyContent: 'space-between', width: '100%', padding: '2px 0'}}>
                                                    <span className="stat-name">{key === 'hp' ? 'hp max' : key}</span>
                                                    {key === 'attack' ? (
                                                        (() => {
                                                            const percent = weaponPercent;
                                                            const boosted = percent > 0 ? (value * (1 + percent / 100)) : null;
                                                            return (
                                                                <span className="stat-value" style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                                    {percent > 0 && (
                                                                        <span className="stat-percent">{`+${percent}%`}</span>
                                                                    )}
                                                                    <span className="stat-base">{value}</span>
                                                                    {boosted !== null && (
                                                                        <span className="stat-boosted" style={{color: 'lightgreen'}}>{boosted.toFixed(2)}</span>
                                                                    )}
                                                                </span>
                                                            )
                                                        })()
                                                    ) : key === 'defense' ? (
                                                        (() => {
                                                            const percent = armorPercent;
                                                            const boosted = percent > 0 ? (value * (1 + percent / 100)) : null;
                                                            return (
                                                                <span className="stat-value" style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                                    {percent > 0 && (
                                                                        <span className="stat-percent">{`+${percent}%`}</span>
                                                                    )}
                                                                    <span className="stat-base">{value}</span>
                                                                    {boosted !== null && (
                                                                        <span className="stat-boosted" style={{color: 'lightgreen'}}>{boosted.toFixed(2)}</span>
                                                                    )}
                                                                </span>
                                                            )
                                                        })()
                                                    ) : (
                                                        <span className="stat-value">{value}</span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="inventory-descriptor-panel">
                        {(() => {
                            const item = this.state.hoveredInventoryItem;
                            const iconImg = item && item.icon ? images[item.icon] : null;
                            return (
                                <div className="idp-content">
                                    {item && (
                                        <div className="idp-icon">
                                            {iconImg && <img src={iconImg} alt={item.name || ''} />}
                                        </div>
                                    )}
                                    <div className="idp-details">
                                        {!item
                                            ? <span className="idp-placeholder">Hover over an item to see details</span>
                                            : <>
                                                <div className="idp-name">{item.name || '—'}</div>
                                                <div className="idp-meta">
                                                    {item.subtype && <span className="idp-tag idp-subtype">{item.subtype}</span>}
                                                    {item.range && <span className="idp-tag idp-range">{item.range}</span>}
                                                </div>
                                                {item.description && <div className="idp-description">{item.description}</div>}
                                            </>
                                        }
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                    <div className='inventory-strip'>
                        {(() => {
                            const inv = (this.props.inventoryManager && this.props.inventoryManager.inventory) || [];
                            const grouped = {};
                            inv.forEach((item, idx) => {
                                const key = item.name || item.type || `item_${idx}`;
                                if (!grouped[key]) grouped[key] = { items: [], firstIndex: idx };
                                grouped[key].items.push(item);
                            });

                            return Object.keys(grouped).map((key, gIdx) => {
                                const group = grouped[key];
                                const count = group.items.length;
                                const item = group.items[0];
                                const firstIndex = group.firstIndex;
                                return (
                                    <div className={`strip-item sub-container ${item.animation === 'consumed' ? 'consumed' : ''}`} key={gIdx} style={{position: 'relative'}}>
                                        <div className="hover-message-container">
                                            <div className="hover-message">{this.state.inventoryHoverMatrix[firstIndex] ? this.state.inventoryHoverMatrix[firstIndex].replaceAll('_', ' ') : '\u00A0'}</div>
                                        </div>
                                        <Tile
                                            key={gIdx}
                                            id={firstIndex}
                                            data={item}
                                            tileSize={this.state.tileSize}
                                            image={item.icon ? item.icon : null}
                                            contains={item.name ? item.name.replace(' ', '_') : null}
                                            color={item.color}
                                            editMode={false}
                                            type={'inventory-tile'}
                                            handleClick={() => this.handleItemClick(item, firstIndex)}
                                            handleHover={this.handleInventoryTileHover}
                                            className={`inventory-tile ${this.state.activeInventoryItem?.id === firstIndex ? 'active' : ''}`}
                                            isActiveInventory={this.state.activeInventoryItem?.id === firstIndex}
                                        />
                                        {count > 1 && (
                                            <div className='stack-count-badge'>
                                                {count}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </div>
            </CModal>

            {/* Card duel fullscreen overlay - Rendered at root for clean stacking context */}
            {this.state.showCardDuelModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 1000000,
                    background: '#000',
                    overflow: 'hidden',
                    pointerEvents: 'auto'
                }}>
                    <CardDuel 
                        onFinish={this.handleCardDuelFinish} 
                        onClose={() => this.setState({ showCardDuelModal: false })}
                        saveUserData={this.props.saveUserData} 
                        inventoryManager={this.props.inventoryManager} 
                    />
                </div>
            )}
        </div>
        )
    }
}

export default DungeonPage;