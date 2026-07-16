import React from 'react';
import '../../styles/tower-siege.scss';
import '../../styles/monster-battle.scss';
import SiegeCombatGrid from '../../components/combat-panes/SiegeCombatGrid';
import { MonsterManager } from '../../utils/monster-manager';
import { AnimationManagerRedux } from '../../utils/animation-manager-redux';
import * as images from '../../utils/images';
import { storeMeta, getMeta } from '../../utils/session-handler';
import { INTERVALS } from '../../utils/shared-constants';

// ── Board constants ──────────────────────────────────────────────────────────
const SIEGE_ROWS = 15;
const SIEGE_COLS = 20;
const SIEGE_TILE_SIZE = 56;
const SIEGE_TILE_BORDER = 1;
const SIEGE_MAX_DEPTH = 19; // column index 0-19

const BOARD_WIDTH  = SIEGE_COLS * (SIEGE_TILE_SIZE + SIEGE_TILE_BORDER);  // 1140px
const BOARD_HEIGHT = SIEGE_ROWS * (SIEGE_TILE_SIZE + SIEGE_TILE_BORDER);  // 855px

// ── Phase sequence timings (ms) ──────────────────────────────────────────────
const PHASE_TIMINGS = {
    empty:     0,
    crew:      600,
    hashmallim: 2200,
    armies:    3800,
    combat:    5600,
};

// ── Default siege army (used when triggered from console) ────────────────────
const DEFAULT_SIEGE_ARMY_TYPES = [
    { type: 'skeleton', id: 'siege_sk_1', label: 'Skeleton' },
    { type: 'skeleton', id: 'siege_sk_2', label: 'Skeleton' },
    { type: 'goblin',   id: 'siege_gb_1', label: 'Goblin'   },
    { type: 'goblin',   id: 'siege_gb_2', label: 'Goblin'   },
    { type: 'mummy',    id: 'siege_mu_1', label: 'Mummy'    },
];

// ── Hashmallim army composition ──────────────────────────────────────────────
const HASHMALLIM_MINION_TYPES = [
    'beholder', 'beholder',
    'beholder_minion', 'beholder_minion', 'beholder_minion',
    'beholder_minion', 'beholder_minion', 'beholder_minion',
];

/**
 * TowerSiege — full-screen large-scale combat event.
 *
 * Lifecycle:
 *  1. Mount → build tile grid, compute board scale, start fade-in sequence
 *  2. Phases: empty → crew → hashmallim → armies → combat
 *  3. Combat runs via CombatManagerRedux (initializeSiegeCombat)
 *  4. Combat ends → show SiegeSummaryPanel → call onSiegeComplete
 */
class TowerSiege extends React.Component {
    constructor(props) {
        super(props);
        this._mm = new MonsterManager();
        this._isMounted = false;
        this._phaseTimers = [];
        this._combatInterval = null;
        this.state = {
            siegePhase: 'loading',
            combatTiles: [],
            battleData: {},
            showSummaryPanel: false,
            summaryResult: null,
            boardScale: 1,
            activeAnimations: [],
            animationOverlays: {},
            localPaused: false,
            isMobileLandscape: window.matchMedia("(max-width: 1024px) and (orientation: landscape)").matches,
        };
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

    // ── Animation connection helpers ─────────────────────────────────────────

    renderAnimation = () => {
        // no-op, matching expected callback signature
    };

    updateAnimationData = (activeAnimations) => {
        if (this._isMounted) {
            this.setState({ activeAnimations });
        }
    };

    recieveAnimationBroadcastFromOverlayManager = (animationOverlays) => {
        if (this._isMounted) {
            this.setState({ animationOverlays });
        }
    };

    getAllOverlaysById = (id) => {
        const overlays = this.state.animationOverlays?.[id]?.animations;
        if (!overlays) return [];
        let finalVal = [];
        Object.values(overlays).forEach(e => {
            if (Array.isArray(e)) {
                finalVal = finalVal.concat(e);
            }
        });
        return finalVal;
    };

    // ── Lifecycle ────────────────────────────────────────────────────────────

    _handleKeyDown = (event) => {
        if (event.key === 'p' || event.key === 'P') {
            this.setState(prev => {
                const localPaused = !prev.localPaused;
                const { combatManager } = this.props;
                if (combatManager) {
                    try { combatManager.pauseCombat(localPaused); } catch (e) {}
                }
                return { localPaused };
            });
        }
    };

    componentDidMount() {
        this._isMounted = true;
        this._buildTiles();
        this._updateBoardScale();
        window.addEventListener('resize', this._updateBoardScale);
        window.addEventListener('keydown', this._handleKeyDown);

        const { combatManager, animationManager, overlayManager } = this.props;
        if (combatManager && overlayManager) {
            combatManager.connectOverlayManager(overlayManager);
            overlayManager.establishBroadcastAnimationEventCallback(this.recieveAnimationBroadcastFromOverlayManager);
        }
        if (combatManager && animationManager) {
            combatManager.connectAnimationManager(animationManager);
            animationManager.TILE_SIZE = this.getTileSize();
            animationManager.TILE_BORDER = SIEGE_TILE_BORDER;
            animationManager.isSiegeMode = true;
            if (typeof animationManager.establishAnimationCallback === 'function') {
                animationManager.establishAnimationCallback(this.renderAnimation);
            }
            if (typeof animationManager.connect === 'function') {
                animationManager.connect(this.updateAnimationData);
            } else if (typeof animationManager.establishUpdateAnimationDataCallback === 'function') {
                animationManager.establishUpdateAnimationDataCallback(this.updateAnimationData);
            }
        }
        
        // Instantiate and connect Sandbox-style AnimationManagerRedux (used by combatManager)
        this._animManagerRedux = new AnimationManagerRedux();
        this._animManagerRedux.TILE_SIZE = this.getTileSize();
        this._animManagerRedux.TILE_BORDER = SIEGE_TILE_BORDER;
        this._animManagerRedux.isSiegeMode = true;
        this._animManagerRedux.connect(this.updateAnimationData);
        if (combatManager && typeof combatManager.connectAnimationManagerRedux === 'function') {
            combatManager.connectAnimationManagerRedux(this._animManagerRedux);
        }

        // Initialize combat state immediately so units are loaded and can fade in sequentially
        this._initializeSiegeCombat();
        
        this._startFadeInSequence();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.paused !== this.props.paused) {
            const { combatManager } = this.props;
            if (combatManager) {
                try { combatManager.pauseCombat(this.props.paused); } catch (e) {}
            }
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
        this._phaseTimers.forEach(t => clearTimeout(t));
        if (this._combatInterval) clearInterval(this._combatInterval);
        window.removeEventListener('resize', this._updateBoardScale);
        window.removeEventListener('keydown', this._handleKeyDown);

        const { combatManager, animationManager, overlayManager } = this.props;
        if (combatManager) {
            try { combatManager.reset(); } catch (e) {}
            if (typeof combatManager.disconnectOverlayManager === 'function') {
                combatManager.disconnectOverlayManager();
            }
            if (typeof combatManager.connectAnimationManagerRedux === 'function') {
                combatManager.connectAnimationManagerRedux(null);
            }
        }
        if (animationManager) {
            animationManager.isSiegeMode = false;
            animationManager.TILE_SIZE = 100;
            animationManager.TILE_BORDER = 2;
            if (typeof animationManager.reset === 'function') {
                try { animationManager.reset(); } catch (_) {}
            }
        }
        if (overlayManager) {
            if (typeof overlayManager.reset === 'function') {
                try { overlayManager.reset(); } catch (_) {}
            }
        }
    }

    // ── Board setup ──────────────────────────────────────────────────────────

    _buildTiles = () => {
        const tiles = [];
        for (let i = 0; i < SIEGE_ROWS * SIEGE_COLS; i++) {
            tiles.push({ id: i, x: i % SIEGE_COLS, y: Math.floor(i / SIEGE_COLS) });
        }
        this.setState({ combatTiles: tiles });
    };

    getTileSize = () => {
        return this.state.isMobileLandscape ? 32 : 56;
    };

    getBoardWidth = () => {
        return SIEGE_COLS * (this.getTileSize() + SIEGE_TILE_BORDER);
    };

    getBoardHeight = () => {
        return SIEGE_ROWS * (this.getTileSize() + SIEGE_TILE_BORDER);
    };

    _updateBoardScale = () => {
        const isMobileLandscape = window.matchMedia("(max-width: 1024px) and (orientation: landscape)").matches;
        const currentTileSize = isMobileLandscape ? 32 : 56;
        const currentBoardWidth = SIEGE_COLS * (currentTileSize + SIEGE_TILE_BORDER);
        const currentBoardHeight = SIEGE_ROWS * (currentTileSize + SIEGE_TILE_BORDER);

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const scaleX = vw < currentBoardWidth  ? vw  / currentBoardWidth  : 1;
        const scaleY = vh < currentBoardHeight ? vh  / currentBoardHeight : 1;
        const scale  = Math.min(scaleX, scaleY);

        if (this._isMounted) {
            this.setState({
                boardScale: scale,
                isMobileLandscape
            });
            const { animationManager } = this.props;
            if (animationManager) {
                animationManager.TILE_SIZE = currentTileSize;
            }
            if (this._animManagerRedux) {
                this._animManagerRedux.TILE_SIZE = currentTileSize;
            }
        }
    };

    // ── Fade-in sequence ─────────────────────────────────────────────────────

    _startFadeInSequence = () => {
        Object.entries(PHASE_TIMINGS).forEach(([phase, delay]) => {
            const t = setTimeout(() => {
                if (!this._isMounted) return;
                this.setState({ siegePhase: phase });
                if (phase === 'combat') {
                    this._startCombatTick();
                }
            }, delay);
            this._phaseTimers.push(t);
        });
    };

    // ── Combat initialization ────────────────────────────────────────────────

    _buildSiegeArmy = () => {
        return DEFAULT_SIEGE_ARMY_TYPES.map(entry => {
            const monsterDef = this._mm.getMonster(entry.type);
            if (!monsterDef) return null;
            return {
                ...monsterDef,
                id: entry.id,
                name: entry.label || monsterDef.name || entry.type,
                isMonster: false,
                isSiegeUnit: true,
                isSiegeArmy: true,
                // Strip minions — siege army units don't spawn their own minions
                minions: [],
                stats: { ...(monsterDef.stats || {}) },
            };
        }).filter(Boolean);
    };

    _buildHashmallimArmy = () => {
        const hashmallim = this._mm.getMonster('hashmallim');
        const minions = HASHMALLIM_MINION_TYPES.map((type, idx) => {
            const def = this._mm.getMonster(type);
            if (!def) return null;
            return { ...def, id: `hm_minion_${idx}`, isMinion: true };
        }).filter(Boolean);
        return { monster: hashmallim, minions };
    };

    _initializeSiegeCombat = () => {
        const { combatManager, crew } = this.props;
        if (!combatManager) return;

        const siegeArmy = this._buildSiegeArmy();
        const { monster, minions } = this._buildHashmallimArmy();

        // Wire up data update callback so SiegeCombatGrid stays current
        combatManager.updateData = (combatants) => {
            if (this._isMounted) this.setState({ battleData: combatants });
        };

        // Wire game-over callback
        combatManager.gameOver = (result) => {
            if (!this._isMounted) return;
            if (this._combatInterval) {
                clearInterval(this._combatInterval);
                this._combatInterval = null;
            }
            const summaryResult = result && result.crewWon ? 'victory' : 'defeat';
            this.setState({ siegePhase: 'summary', showSummaryPanel: true, summaryResult });
        };

        try {
            combatManager.initializeSiegeCombat({
                crew: crew || [],
                siegeArmy,
                monster,
                minions,
                siegeMaxDepth: SIEGE_MAX_DEPTH,
            });
        } catch (e) {
            console.error('[TowerSiege] initializeSiegeCombat failed', e);
        }
    };

    _startCombatTick = () => {
        const { combatManager } = this.props;
        if (!combatManager) return;
        
        // Start the standard Redux round timer and turns
        try {
            combatManager.startRoundTimer();
            combatManager.processRoundTurns();
            // Sync current pause state
            combatManager.pauseCombat(!!this.props.paused);
        } catch (e) {
            console.error('[TowerSiege] startRoundTimer/processRoundTurns failed', e);
        }
    };

    // ── Event handlers ───────────────────────────────────────────────────────

    handleExit = () => {
        if (this.props.onSiegeComplete) this.props.onSiegeComplete();
    };

    // ── Tile position helper ─────────────────────────────────────────────────

    tilePos = (coord) => coord * (this.getTileSize() + SIEGE_TILE_BORDER);

    // ── Render ───────────────────────────────────────────────────────────────

    render() {
        const { siegePhase, combatTiles, battleData, boardScale, showSummaryPanel, summaryResult } = this.state;

        const combatStarted = siegePhase === 'combat' || siegePhase === 'summary';
        const showCrew      = ['crew', 'hashmallim', 'armies', 'combat', 'summary'].includes(siegePhase);
        const showHashmallim = ['hashmallim', 'armies', 'combat', 'summary'].includes(siegePhase);
        const showArmies    = ['armies', 'combat', 'summary'].includes(siegePhase);

        return (
            <div className="ts-overlay">
                <div
                    className="ts-board-scaler"
                    style={{ transform: `scale(${boardScale})`, transformOrigin: 'top left' }}
                >
                    {/* ── Background tile grid ── */}
                    <div className="ts-board" style={{ width: this.getBoardWidth(), height: this.getBoardHeight() }}>
                        <div className="ts-tile-grid">
                            {combatTiles.map((t) => (
                                <div
                                    key={t.id}
                                    className={`ts-tile ${(t.x + t.y) % 2 === 0 ? 'ts-tile--light' : 'ts-tile--dark'}`}
                                    style={{
                                        width: this.getTileSize(),
                                        height: this.getTileSize(),
                                        left: this.tilePos(t.x),
                                        top: this.tilePos(t.y),
                                    }}
                                />
                            ))}
                        </div>

                        {/* ── Faction zone overlays ── */}
                        <div className="ts-zone ts-zone--player" style={{ width: this.tilePos(2), height: this.getBoardHeight() }} />
                        <div className="ts-zone ts-zone--enemy"  style={{ width: this.tilePos(3), height: this.getBoardHeight(), left: this.tilePos(17) }} />

                        {/* ── Unit portraits ── */}
                        <SiegeCombatGrid
                            crew={this.props.crew}
                            combatManager={this.props.combatManager}
                            battleData={battleData}
                            tileSize={this.getTileSize()}
                            tileBorder={SIEGE_TILE_BORDER}
                            siegeCols={SIEGE_COLS}
                            siegeRows={SIEGE_ROWS}
                            showCrew={showCrew}
                            showHashmallim={showHashmallim}
                            showArmies={showArmies}
                            combatStarted={combatStarted}
                            activeAnimations={this.state.activeAnimations}
                            animationOverlays={this.state.animationOverlays}
                            getAllOverlaysById={this.getAllOverlaysById}
                            isMobileLandscape={this.state.isMobileLandscape}
                        />

                        {/* ── Phase label (during fade-in only) ── */}
                        {!combatStarted && siegePhase !== 'empty' && (
                            <div className="ts-phase-label">
                                {siegePhase === 'crew'       && 'Your crew stands ready…'}
                                {siegePhase === 'hashmallim' && 'The Hashmallim arrives…'}
                                {siegePhase === 'armies'     && 'Forces converge…'}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── HUD bar ── */}
                <div className="ts-hud">
                    <div className="ts-hud__title">TOWER SIEGE {this.state.localPaused ? '(PAUSED)' : ''}</div>
                    <div className="ts-hud__phase">{siegePhase === 'combat' ? (this.state.localPaused ? '⏸ PAUSED — press P to resume' : 'Combat in progress') : siegePhase.toUpperCase()}</div>

                    {/* Game Speed and Round Clock */}
                    {this.props.combatManager && this.props.combatManager.round !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'white', marginRight: '20px' }}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                    onClick={() => this.setGameSpeed('slowest')}
                                    style={{
                                        backgroundColor: this.props.combatManager.gameSpeed === 'slowest' ? '#ffffff' : 'rgba(255,255,255,0.1)',
                                        color: this.props.combatManager.gameSpeed === 'slowest' ? '#000000' : '#ffffff',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Slowest
                                </button>
                                <button
                                    onClick={() => this.setGameSpeed('slow')}
                                    style={{
                                        backgroundColor: this.props.combatManager.gameSpeed === 'slow' ? '#ffffff' : 'rgba(255,255,255,0.1)',
                                        color: this.props.combatManager.gameSpeed === 'slow' ? '#000000' : '#ffffff',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Slow
                                </button>
                                <button
                                    onClick={() => this.setGameSpeed('fast')}
                                    style={{
                                        backgroundColor: this.props.combatManager.gameSpeed === 'fast' ? '#ffffff' : 'rgba(255,255,255,0.1)',
                                        color: this.props.combatManager.gameSpeed === 'fast' ? '#000000' : '#ffffff',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Fast
                                </button>
                            </div>

                            <div
                                style={{
                                    position: 'relative',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: `conic-gradient(rgba(255,255,255,0.8) 0deg, rgba(255,255,255,0.8) ${this.props.combatManager.roundTimeRemainingRatio * 360}deg, rgba(255,255,255,0.1) ${this.props.combatManager.roundTimeRemainingRatio * 360}deg, rgba(255,255,255,0.1) 360deg)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                                }}
                            >
                                <div
                                    style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        backgroundColor: '#111111',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {this.props.combatManager.round}
                                </div>
                            </div>
                        </div>
                    )}

                    <button className="ts-hud__exit" onClick={this.handleExit}><span role="img" aria-label="retreat">✕</span> Retreat</button>
                </div>

                {/* ── Summary panel ── */}
                {showSummaryPanel && (
                    <div className="ts-summary">
                        <div className={`ts-summary__result ts-summary__result--${summaryResult}`}>
                            {summaryResult === 'victory'
                                ? <><span role="img" aria-label="victory">⚔</span> Victory!</>
                                : (
                                    <>
                                        <span 
                                            style={{
                                                display: 'inline-block',
                                                width: '0.85em',
                                                height: '0.85em',
                                                backgroundImage: `url(${images.whiteskull})`,
                                                backgroundSize: 'contain',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'center',
                                                marginRight: '0.2em',
                                                verticalAlign: 'middle',
                                                filter: 'drop-shadow(0 0 15px #cc3322)'
                                            }}
                                        />
                                        Defeated
                                    </>
                                )}
                        </div>
                        <p className="ts-summary__text">
                            {summaryResult === 'victory'
                                ? 'The Hashmallim has fallen. The siege is won.'
                                : 'Your forces have been overwhelmed. The siege is lost.'}
                        </p>
                        <button className="ts-summary__btn" onClick={this.handleExit}>
                            Return to Dungeon
                        </button>
                    </div>
                )}
            </div>
        );
    }
}

export default TowerSiege;
