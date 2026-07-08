import React from 'react';
import Overlay from '../Overlay';
import { ROCK_DURATION } from '../../utils/shared-constants';
import * as images from '../../utils/images';

const MonstersCombatGrid = ({
    monster,
    minions,
    combatManager,
    selectedMonster,
    selectedFighter,
    battleData,
    portraitHoveredId,
    animationOverlays,
    getAllOverlaysById,
    monsterCombatPortraitClicked,
    portraitHovered,
    images,
    TILE_SIZE,
    SHOW_TILE_BORDERS,
    // minionDirectionReversed removed, use facing property instead
    getMonsterWeaponAnimation,
    getHitAnimation,
    // monsterFacingUp,
    // monsterFacingDown,
    greetingInProcess,
    SHOW_MONSTER_IDS = false,
    teleportingFighterId,
    fearCastingActive,
}) => {
    const [monsterHitFlashKey, setMonsterHitFlashKey] = React.useState(0); // eslint-disable-line no-unused-vars
    const [showMonsterHitFlash, setShowMonsterHitFlash] = React.useState(false); // eslint-disable-line no-unused-vars
    const prevMonsterWounded = React.useRef(false); // eslint-disable-line no-unused-vars
    const monsterFlashTimeout = React.useRef(); // eslint-disable-line no-unused-vars
    const monsterFlashHasOccurred = React.useRef(false); // eslint-disable-line no-unused-vars
    const monsterDiagInterval = React.useRef(); // eslint-disable-line no-unused-vars
    const [minionHitFlash, setMinionHitFlash] = React.useState({}); // eslint-disable-line no-unused-vars
    const prevMinionWounded = React.useRef({}); // eslint-disable-line no-unused-vars


    // --- Damage Indicator Queuing System ---
    // --- Simultaneous Damage Indicator System ---
    // --- Queued Damage Indicator System ---
    // --- Stacked Simultaneous Damage Indicator System ---
    // --- Time-staggered Damage Indicator System ---
    // For each monster/minion, queue indicators and instantiate each with a delay if triggered close together
    // Each indicator: { id, value, source, timestamp }
    const [visibleDamageIndicators, setVisibleDamageIndicators] = React.useState({}); // { [id]: [indicatorObjects] }
    const [indicatorQueues, setIndicatorQueues] = React.useState({}); // { [id]: [indicatorObjects] }
    const indicatorTimeouts = React.useRef({});
    const STAGGER_DELAY = 150; // ms between instantiations

    // Add new indicators to the queue
    React.useEffect(() => {
        Object.values(battleData).forEach(entity => {
            if (!entity || !Array.isArray(entity.damageIndicators)) return;
            const id = entity.id;
            setIndicatorQueues(prev => {
                const prevQueue = prev[id] || [];
                const visibleIds = (visibleDamageIndicators[id] || []).map(e => e.id);
                const queueIds = prevQueue.map(e => e.id);
                const newIndicators = entity.damageIndicators
                    .filter(e => e && !visibleIds.includes(e.id) && !queueIds.includes(e.id))
                    .map(e => e.timestamp ? e : { ...e, timestamp: Date.now() });
                if (newIndicators.length === 0) return prev;
                return { ...prev, [id]: [...prevQueue, ...newIndicators] };
            });
        });
        // Clean up queues for entities no longer present
        setIndicatorQueues(prev => {
            const validIds = Object.values(battleData).map(e => e.id);
            const cleaned = {};
            validIds.forEach(id => { if (prev[id]) cleaned[id] = prev[id]; });
            return cleaned;
        });
        setVisibleDamageIndicators(prev => {
            const validIds = Object.values(battleData).map(e => e.id);
            const cleaned = {};
            validIds.forEach(id => { if (prev[id]) cleaned[id] = prev[id]; });
            return cleaned;
        });
        // Capture ref at effect-run time, not cleanup time (satisfies react-hooks/exhaustive-deps)
        const timeoutsToClean = indicatorTimeouts.current;
        // Cleanup on unmount
        return () => {
            Object.values(timeoutsToClean).forEach(clearTimeout);
        };
    // visibleDamageIndicators omitted: including it causes infinite re-renders since this effect calls setVisibleDamageIndicators
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [battleData]);

    // Staggered instantiation: show next indicator from queue after delay
    React.useEffect(() => {
        Object.keys(indicatorQueues).forEach(id => {
            if (!indicatorQueues[id] || indicatorQueues[id].length === 0) return;
            // If none currently being instantiated (i.e., last in visible is older than STAGGER_DELAY)
            const visibleArr = visibleDamageIndicators[id] || [];
            const lastTimestamp = visibleArr.length > 0 ? Math.max(...visibleArr.map(e => e.timestamp)) : 0;
            const now = Date.now();
            if (visibleArr.length === 0 || (now - lastTimestamp >= STAGGER_DELAY)) {
                // Show next in queue
                const [next, ...rest] = indicatorQueues[id];
                setVisibleDamageIndicators(prev => ({ ...prev, [id]: [...(prev[id] || []), next] }));
                setIndicatorQueues(prev => ({ ...prev, [id]: rest }));
                // Set timer to remove after ROCK_DURATION
                if (!indicatorTimeouts.current[next.id]) {
                    indicatorTimeouts.current[next.id] = setTimeout(() => {
                        setVisibleDamageIndicators(current => {
                            const arr = (current[id] || []).filter(e => e.id !== next.id);
                            return { ...current, [id]: arr };
                        });
                        // Remove from battleData as well
                        const entityRef = battleData[id];
                        if (entityRef && Array.isArray(entityRef.damageIndicators)) {
                            entityRef.damageIndicators = entityRef.damageIndicators.filter(e => e && e.id !== next.id);
                            battleData[id].damageIndicators = entityRef.damageIndicators;
                        }
                        delete indicatorTimeouts.current[next.id];
                    }, ROCK_DURATION || 1800);
                }
            }
        });
    }, [indicatorQueues, visibleDamageIndicators, battleData]);

    // Delay removal of monster/minion portrait after death for death animation
    const [showDeathAnimation, setShowDeathAnimation] = React.useState({});
    const [fullyDead, setFullyDead] = React.useState({});

    React.useEffect(() => {
        // Main monster
        if (monster && battleData[monster.id]) {
            if (battleData[monster.id].dead && !showDeathAnimation[monster.id] && !fullyDead[monster.id]) {
                setShowDeathAnimation(prev => ({ ...prev, [monster.id]: true }));
                // Fallback: if onAnimationEnd never fires (e.g. animation conflict),
                // force fullyDead after the death animation duration + buffer.
                const id = monster.id;
                const t = setTimeout(() => {
                    setFullyDead(prev => {
                        if (!prev[id]) return { ...prev, [id]: true };
                        return prev;
                    });
                    setShowDeathAnimation(prev => ({ ...prev, [id]: false }));
                }, 2400); // meltDownDeath is 2000ms + 400ms buffer
                return () => clearTimeout(t);
            } else if (!battleData[monster.id].dead && (showDeathAnimation[monster.id] || fullyDead[monster.id])) {
                setShowDeathAnimation(prev => ({ ...prev, [monster.id]: false }));
                setFullyDead(prev => ({ ...prev, [monster.id]: false }));
            }
        }
        // Minions
        Object.values(battleData).forEach(minion => {
            if (minion.isMinion) {
                // Don't trigger the death animation for bifurcating minions — they use their own shrink animation
                if (minion.dead && !minion.bifurcating && !showDeathAnimation[minion.id] && !fullyDead[minion.id]) {
                    setShowDeathAnimation(prev => ({ ...prev, [minion.id]: true }));
                } else if (!minion.dead && (showDeathAnimation[minion.id] || fullyDead[minion.id])) {
                    setShowDeathAnimation(prev => ({ ...prev, [minion.id]: false }));
                    setFullyDead(prev => ({ ...prev, [minion.id]: false }));
                }
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [battleData, monster]);

    // Fallback: ensure minion fullyDead is set after death animation even if onAnimationEnd is missed
    React.useEffect(() => {
        const timers = [];
        Object.values(battleData).forEach(minion => {
            if (minion.isMinion && minion.dead && showDeathAnimation[minion.id] && !fullyDead[minion.id]) {
                const id = minion.id;
                const t = setTimeout(() => {
                    setFullyDead(prev => {
                        if (!prev[id]) return { ...prev, [id]: true };
                        return prev;
                    });
                    setShowDeathAnimation(prev => ({ ...prev, [id]: false }));
                }, 2400);
                timers.push(t);
            }
        });
        return () => timers.forEach(t => clearTimeout(t));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showDeathAnimation]);

    // Determine if monster or minion is teleporting (by id)
    const isTeleporting = (id) => {
        // Accept teleportingFighterId as a prop (passed in destructured args)
        return (typeof teleportingFighterId !== 'undefined' && teleportingFighterId === id);
    };
    const transitionStyle = (id) => ({ transition: isTeleporting(id) ? 'none' : '1s' });
    // Helper: compute inline CSS vars for hit animations so wrappers always expose
    // --portrait-* properties even if stylesheet selectors fail to match.
    // DEBUG: toggle to temporarily increase bulge so the effect is visible while testing.
    // Set to true for a very large debug bulge; remember to set back to false afterwards.
    const DEBUG_FORCE_BIG_BULGE = true;
    // When DEBUG is enabled, control how strongly minion bulge moves toward the
    // extreme debug values. 0 = keep base minion value, 1 = use full debug value.
    // Set to 0.5 to pick a halfway intensity as requested.
    const MINION_DEBUG_FACTOR = 0.3;
    const computeHitVars = (combatant) => {
        // Always expose --portrait-base-scale so meltDownDeath uses the right start scale.
        const baseScale = (combatant && combatant.isMinion) ? '1' : '2';
        const flip = (combatant && combatant.facing === 'right') ? '-1' : '1';
        if (!combatant || !combatant.wounded) return { '--portrait-base-scale': baseScale, '--portrait-flip': flip };
        const hc = getHitAnimation(combatant) || '';
        let severity = 'minor';
        if (hc.indexOf('severe') !== -1) severity = 'severe';
        if (hc.indexOf('lethal') !== -1) severity = 'lethal';
        const dirLeft = hc.indexOf('left') !== -1;
        const dirRight = hc.indexOf('right') !== -1;
        const dirTop = hc.indexOf('top') !== -1;
        const dirBottom = hc.indexOf('bottom') !== -1;
        const perspective = severity === 'minor' ? '600px' : severity === 'severe' ? '800px' : '1000px';
        let rotateY = '0deg';
        let translateX = '0px';
        if (dirLeft) {
            rotateY = '-10deg';
            translateX = '4px';
        } else if (dirRight) {
            rotateY = '10deg';
            translateX = '-4px';
        }
        // Default small bulge values (subtle)
        let baseBulgeMinor = '1.003';
        let baseBulgeSevere = '1.006';
        let baseBulgeLethal = '1.01';
        // Slightly increase base bulge intensity for minions so direction is more visible
        if (combatant && combatant.isMinion) {
            baseBulgeMinor = '1.02';
            baseBulgeSevere = '1.03';
            baseBulgeLethal = '1.05';
        }

        // Extreme debug values (only used when DEBUG_FORCE_BIG_BULGE is true)
        const debugBulgeMinor = '1.6';
        const debugBulgeSevere = '1.9';
        const debugBulgeLethal = '2.2';

        // Compute final bulge values. If debug is enabled, interpolate between
        // the base minion value and the debug extreme using MINION_DEBUG_FACTOR.
        const interp = (base, debug) => {
            try {
                const b = parseFloat(base);
                const d = parseFloat(debug);
                if (Number.isNaN(b) || Number.isNaN(d)) return base;
                return String((b * (1 - MINION_DEBUG_FACTOR) + d * MINION_DEBUG_FACTOR).toFixed(3));
            } catch (err) {
                return base;
            }
        };

        let bulgeMinor = baseBulgeMinor;
        let bulgeSevere = baseBulgeSevere;
        let bulgeLethal = baseBulgeLethal;
        if (DEBUG_FORCE_BIG_BULGE && combatant && combatant.isMinion) {
            bulgeMinor = interp(baseBulgeMinor, debugBulgeMinor);
            bulgeSevere = interp(baseBulgeSevere, debugBulgeSevere);
            bulgeLethal = interp(baseBulgeLethal, debugBulgeLethal);
        } else if (DEBUG_FORCE_BIG_BULGE) {
            // If debug is enabled but not a minion, use the full debug values for visibility.
            bulgeMinor = debugBulgeMinor;
            bulgeSevere = debugBulgeSevere;
            bulgeLethal = debugBulgeLethal;
        }

        const bulgeValue = severity === 'minor' ? bulgeMinor : severity === 'severe' ? bulgeSevere : bulgeLethal;

        // Axis-specific bulge and transform-origin so bulge direction matches hit side
        let bulgeX = '1';
        let bulgeY = '1';
        let transformOrigin = '50% 80%';
        if (dirLeft) {
            bulgeX = bulgeValue;
            bulgeY = '1';
            transformOrigin = '0% 50%';
        } else if (dirRight) {
            bulgeX = bulgeValue;
            bulgeY = '1';
            transformOrigin = '100% 50%';
        } else if (dirTop) {
            bulgeY = bulgeValue;
            bulgeX = '1';
            transformOrigin = '50% 0%';
        } else if (dirBottom) {
            bulgeY = bulgeValue;
            bulgeX = '1';
            transformOrigin = '50% 100%';
        } else {
            // Fallback: small uniform bulge
            bulgeX = bulgeValue;
            bulgeY = bulgeValue;
        }

        // If it's a minion and the hit is vertical, nudge the vertical bulge a bit
        // to make the direction more visible (minion portraits are smaller).
        if (combatant && combatant.isMinion && (dirTop || dirBottom)) {
            // bump by a small factor depending on severity
            const bump = severity === 'minor' ? 1.03 : severity === 'severe' ? 1.06 : 1.08;
            // parse and multiply numeric value (strings like '1.02')
            try {
                const n = parseFloat(bulgeY);
                if (!Number.isNaN(n)) {
                    bulgeY = String(Math.max(n * bump, n + 0.02).toFixed(3));
                }
            } catch (err) {
                // ignore parse errors, keep existing value
            }
        }

        return {
            '--portrait-perspective': perspective,
            '--portrait-rotateY': rotateY,
            '--portrait-translateX': translateX,
            '--portrait-bulge-x': bulgeX,
            '--portrait-bulge-y': bulgeY,
            '--portrait-transform-origin': transformOrigin,
            // Preserve the base scale for main monsters so animations don't reset scale(2)
            '--portrait-base-scale': combatant.isMinion ? '1' : '2',
            // Preserve facing direction so the hit animation never un-flips the portrait.
            // facing === 'right' means the portrait is mirrored (reversed class = scaleX(-1)).
            '--portrait-flip': combatant.facing === 'right' ? '-1' : '1',
            // Per-element animation tuning: make minions a touch slower/smoother
            '--portrait-animation-duration': combatant.isMinion ? '520ms' : '420ms',
            '--portrait-animation-timing': combatant.isMinion ? 'cubic-bezier(.18,.9,.22,1)' : 'cubic-bezier(.2,.8,.2,1)'
        };
    };
    // Find VCT for this monster (if present)
    let vct = null;
    if (monster && battleData[`${monster.id}_VCT`]) {
        vct = battleData[`${monster.id}_VCT`];
    }
    return (
        <div className="mb-col monster-pane" style={{ overflow: 'visible' }}>
            {/* VCT: render above the monster if present */}
            {vct && (
                <div
                    className="lane-wrapper vct-wrapper"
                    style={{
                        top: `${vct.coordinates.y * TILE_SIZE + (SHOW_TILE_BORDERS ? vct.coordinates.y * 2 : 0)}px`,
                        height: `${TILE_SIZE}px`,
                        overflow: 'visible',
                        zIndex: 300
                    }}
                >
                    <div
                        className="vct-portrait-wrapper"
                        style={{
                            left: `${vct.coordinates.x * 100 + (SHOW_TILE_BORDERS ? vct.coordinates.x * 2 : 0)}px`,
                            zIndex: 300,
                            width: `${TILE_SIZE}px`,
                            height: `${TILE_SIZE}px`,
                            position: 'absolute',
                            pointerEvents: 'none',
                            overflow: 'visible',
                        }}
                    >
                        {/* Damage indicators — inside vct-portrait-wrapper so they're centered over the tile */}
                        <div className="portrait-overlay" style={{ zIndex: 301, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                            <div className="damage-indicator-container" style={{ overflow: 'visible' }}>
                                {(visibleDamageIndicators[vct.id] || []).map((indicator, idx, arr) => {
                                    const isStatDebuff = !indicator.isCrit && !indicator.isMiss && typeof indicator.value === 'string' && indicator.type !== 'robbed';
                                    const yOffset = idx * 28;
                                    return (
                                        <div
                                            className={`damage-indicator${isStatDebuff ? ' stat-debuff' : ''}${indicator.isCrit ? ' crit' : ''}${indicator.type === 'heal' ? ' heal' : ''}${indicator.type === 'robbed' ? ' robbed' : ''}${indicator.isMiss ? ' miss' : ''}`}
                                            key={indicator.id}
                                            style={{
                                                transform: `translateY(-${yOffset}px)`,
                                                zIndex: 10 + (arr.length - idx),
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                margin: '0 auto',
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            {indicator.value}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Main Monster: only render if not dead, or if dead but still animating */}
            {monster && battleData[monster.id] && !battleData[monster.id]?.invisible && (!battleData[monster.id].dead || (showDeathAnimation[monster.id] && !fullyDead[monster.id])) && (
                <div
                    className="lane-wrapper"
                    style={{
                        top: `${battleData[monster.id]?.coordinates.y * TILE_SIZE + (SHOW_TILE_BORDERS ? battleData[monster.id]?.coordinates.y * 2 : 0)}px`,
                        height: `${TILE_SIZE}px`,
                        overflow: 'visible',
                        ...transitionStyle(monster.id)
                    }}
                >
                    <div
                        className={`monster-wrapper ${battleData[monster.id]?.rocked ? 'rocked' : ''} ${battleData[monster.id]?.wounded ? 'hit' : ''} ${battleData[monster.id]?.wounded ? getHitAnimation(battleData[monster.id]) : ''} ${battleData[monster.id]?.wounded ? 'hit-flash' : ''} ${battleData[monster.id]?.facing === 'right' ? 'reversed' : ''} ${battleData[monster.id]?.stunned ? 'stunned' : ''}`}
                        style={computeHitVars(battleData[monster.id])}
                    >
                        <div
                            className="action-bar-wrapper"
                            style={{
                                width: !!battleData[monster.id]?.targetId ? `${combatManager.getDistanceToTargetWidthString(battleData[monster.id])}px` : '5px',
                                left: `calc(100px * ${combatManager.getCombatant(battleData[monster.id]?.targetId)?.coordinates.x} + 50px)`
                            }}
                        >
                            <div className={`action-bar ${battleData[monster.id]?.attacking ? (battleData[monster.id]?.facing === 'right' ? 'monsterHitsAnimation_LtoR' : 'monsterHitsAnimation') : ''}`}></div>
                        </div>
                        {/* {(() => {
                            let weaponWrapper = null;
                            if (battleData[monster.id] && battleData[monster.id].pendingAttack) {
                                const pendingAttack = battleData[monster.id].pendingAttack;
                                if (pendingAttack && pendingAttack.type === 'grasp') {
                                    debugger;
                                }
                                weaponWrapper = (
                                    <div
                                        className={`weapon-wrapper
                                            ${getMonsterWeaponAnimation(battleData[monster.id])}
                                            ${battleData[monster.id]?.aiming ? 'aiming' : ''}
                                            small`}
                                        style={{
                                            left: battleData[monster.id]?.facing === 'right'
                                                ? `${battleData[monster.id]?.coordinates.x * 100 + 65 + (battleData[monster.id]?.coordinates.x * 2)}px`
                                                : `${battleData[monster.id]?.coordinates.x * 100 - 45 + (battleData[monster.id]?.coordinates.x * 2)}px`,
                                            backgroundImage: `url(${battleData[monster.id].pendingAttack.icon})`
                                        }}
                                    ></div>
                                );
                            }
                            return weaponWrapper;
                        })()} */}
                        <div
                            className="portrait-wrapper monster-portrait-wrapper"
                            style={{
                                left: `${battleData[monster.id]?.coordinates.x * 100 + (SHOW_TILE_BORDERS ? battleData[monster.id]?.coordinates.x * 2 : 0)}px`,
                                zIndex: `${battleData[monster.id]?.dead ? '0' : '200'}`,
                                overflow: 'visible',
                                ...transitionStyle(monster.id),
                                border: undefined
                            }}
                        >
                            <div
                                className="portrait-relative-container"
                                onMouseEnter={() => portraitHovered(monster.id)}
                                onMouseLeave={() => portraitHovered(null)}
                                onClick={() => monsterCombatPortraitClicked(monster.id)}
                                style={{ position: 'relative' }}
                            >
                                {/* Portrait at the bottom (lowest z-index) */}
                                <div
                                    className={`portrait monster-portrait
                                        ${greetingInProcess ? 'enlarged' : ''}
                                        ${battleData[monster.id]?.active ? 'active' : ''}
                                        ${battleData[monster.id]?.dead ? 'dead monsterDeadAnimation' : ''}
                                        ${battleData[monster.id]?.missed ? (battleData[monster.id]?.facing === 'right' ? 'missed-reversed' : 'missed') : ''}
                                        ${selectedMonster?.id === monster.id ? 'selected' : ''}
                                        ${selectedFighter?.targetId === monster.id ? 'targetted' : ''}
                                        ${battleData[monster.id]?.facing === 'right' ? 'reversed' : ''}
                                        ${battleData[monster.id]?.facing === 'up' ? 'facing-up' : ''}
                                        ${battleData[monster.id]?.facing === 'down' ? 'facing-down' : ''}
                                        ${battleData[monster.id]?.chargingUpActive ? 'charging-up' : ''}
                                        ${battleData[monster.id]?.regenerating ? 'regenerating' : ''}
                                        ${battleData[monster.id]?.bleed ? 'bleeding' : ''}`}
                                    ref={el => {
                                        if (battleData[monster.id]?.wounded) {
                                            // console.log('MONSTER WOUNDED:', battleData[monster.id]?.wounded, 'classes:',
                                            //     `hit`,
                                            //     minionDirectionReversed(monster) ? 'hit-from-right-minor' : 'hit-from-left-minor',
                                            //     'hit-flash');
                                        }
                                    }}
                                    style={{
                                        backgroundImage: monster.portrait ? `url(${monster.portrait})` : 'none',
                                        filter: `saturate(${((battleData[monster.id]?.hp / monster.stats.hp) * 100) / 2}) sepia(${portraitHoveredId === monster.id ? '2' : '0'})`,
                                        zIndex: 1,
                                        position: 'relative',
                                        // Never apply BulgePortrait when dead — it competes with meltDownDeath
                                        animation: (battleData[monster.id]?.wounded && !battleData[monster.id]?.dead) ? 'BulgePortrait var(--portrait-animation-duration, 420ms) var(--portrait-animation-timing, cubic-bezier(.2,.8,.2,1))' : undefined,
                                        animationFillMode: (battleData[monster.id]?.wounded && !battleData[monster.id]?.dead) ? 'forwards' : undefined
                                    }}
                                    onAnimationEnd={e => {
                                        if (
                                            battleData[monster.id]?.dead &&
                                            e.animationName &&
                                            e.animationName.includes('meltDownDeath') &&
                                            showDeathAnimation[monster.id]
                                        ) {
                                            setFullyDead(prev => ({ ...prev, [monster.id]: true }));
                                            setShowDeathAnimation(prev => ({ ...prev, [monster.id]: false }));
                                        }
                                    }}
                                    onAnimationStart={e => {
                                        // try {
                                        //     if (e && e.animationName && e.animationName.includes('BulgePortrait')) {
                                        //         // eslint-disable-next-line no-console
                                        //         console.log('ANIM START: BulgePortrait on monster', monster.id, 'event:', e);
                                        //     }
                                        // } catch (err) {
                                        //     // eslint-disable-next-line no-console
                                        //     console.error('Error in onAnimationStart (monster)', err);
                                        // }
                                    }}
                                >
                                    {SHOW_MONSTER_IDS ? monster.id : null}
                                    {/* Blue hit-flash overlay: show for transient flash OR when wounded (keeps behavior consistent with minions) */}
                                    {(showMonsterHitFlash || battleData[monster.id]?.wounded) && (
                                        <div className="hit-flash-overlay" key={monsterHitFlashKey} />
                                    )}
                                </div>
                                {/* Fear-cast glow — behind the portrait via z-index, after in DOM */}
                                {fearCastingActive && !monster.isMinion && (
                                    <div className="fear-cast-glow" />
                                )}
                                {/* Overlay and indicators above portrait */
}                                <div className={`portrait-overlay ${battleData[monster.id]?.frozen ? 'frozen' : ''}`} style={{zIndex: 2, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}>
                                    {!vct && (
                                        <div className="damage-indicator-container" style={{ overflow: 'visible' }}>
                                            {(visibleDamageIndicators[monster.id] || []).map((indicator, idx, arr) => {
                                                const yOffset = idx * 28;
                                                const isStatDebuff = !indicator.isCrit && typeof indicator.value === 'string' && indicator.type !== 'robbed';
                                                return (
                                                    <div
                                                        className={`damage-indicator${isStatDebuff ? ' stat-debuff' : ''}${indicator.isCrit ? ' crit' : ''}${indicator.type === 'heal' ? ' heal' : ''}${indicator.type === 'robbed' ? ' robbed' : ''}`}
                                                        key={indicator.id}
                                                        style={{
                                                            transform: `translateY(-${yOffset}px)`,
                                                            zIndex: 10 + (arr.length - idx),
                                                            position: 'absolute',
                                                            left: 0,
                                                            right: 0,
                                                            margin: '0 auto',
                                                            pointerEvents: 'none',
                                                        }}
                                                    >
                                                        {indicator.value}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {/* { !battleData[monster.id]?.dead && (
                                  <div className="targetted-by-container" style={{zIndex: 3, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}>
                                    {battleData[monster.id]?.targettedBy.map((e, i) => (
                                        <div
                                            key={i}
                                            className="targetted-by-portrait"
                                            style={{ backgroundImage: `url(${images[battleData[e]?.portrait]})` }}
                                        ></div>
                                    ))}
                                  </div>
                                )} */}
                                {/* Target indicator: tiny portrait of whoever this monster is targeting */}
                                {(() => {
                                    const targetId = battleData[monster.id]?.targetId;
                                    const target = targetId ? combatManager.getCombatant(targetId) : null;
                                    return target?.portrait && !target?.invisible && !battleData[monster.id]?.dead ? (
                                        <div className="monster-target-indicator" style={{ zIndex: 10 }}>
                                            <div
                                                className="monster-target-portrait"
                                                style={{ backgroundImage: `url(${target.portrait})` }}
                                            />
                                        </div>
                                    ) : null;
                                })()}
                                {/* Stolen item indicator: icon in upper-left when goblin has stolen something */}
                                {(() => {
                                    const stolenIconKey = battleData[monster.id]?.stolenItemIcon;
                                    const stolenImg = stolenIconKey
                                        ? (images[stolenIconKey] || stolenIconKey)
                                        : null;
                                    return stolenImg && !battleData[monster.id]?.dead ? (
                                        <div className="monster-stolen-item-indicator" style={{ zIndex: 10 }}>
                                            <div
                                                className="monster-stolen-item-portrait"
                                                style={{ backgroundImage: `url(${stolenImg})` }}
                                            />
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                            {battleData[monster.id] && !battleData[monster.id]?.dead && animationOverlays[monster.id] && getAllOverlaysById(monster.id).map((overlay, i) => {
                                // Ensure overlay.data contains up-to-date 'dead' property
                                const overlayData = {
                                    ...overlay.data,
                                    dead: battleData[monster.id]?.dead
                                };
                                return <Overlay key={i} animationType={overlay.type} data={overlayData} />;
                            })}
                            <div className="indicators-wrapper">
                                <div className="monster-hp-bar hp-bar">
                                    {!battleData[monster.id]?.dead && (
                                        <div className="red-fill" style={{ width: `${(battleData[monster.id]?.hp / battleData[monster.id]?.stats.hp) * 100}%` }}></div>
                                    )}
                                </div>
                                <div className="monster-energy-bar energy-bar">
                                    {!battleData[monster.id]?.dead && (
                                        <div className="yellow-fill" style={{ width: `calc(${battleData[monster.id]?.energy}%)` }}></div>
                                    )}
                                </div>
                                <div className="tempo-bar">
                                    {!battleData[monster.id]?.dead && (
                                        <div className="tempo-indicator" style={{ left: `calc(${battleData[monster.id]?.tempo}% - 4px)` }}></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
                {/* Minions: render only those present in battleData and flagged as isMinion */}
                {Object.values(battleData).filter(m => m.isMinion && !m.invisible && (!m.dead || m.bifurcating || (showDeathAnimation[m.id] && !fullyDead[m.id]))).map((minion) => (
                    <div
                        key={minion.id}
                        className="lane-wrapper"
                        style={{
                            top: `${minion.coordinates.y * TILE_SIZE + (SHOW_TILE_BORDERS ? minion.coordinates.y * 2 : 0)}px`,
                            height: `${TILE_SIZE}px`,
                            ...transitionStyle(minion.id)
                        }}
                    >
                        <div
                            className={`monster-wrapper ${minion.rocked ? 'rocked' : ''} ${minion.wounded ? 'hit' : ''} ${minion.wounded ? getHitAnimation(minion) : ''} ${minion.wounded ? 'hit-flash' : ''} ${minion.facing === 'right' ? 'reversed' : ''} ${minion.stunned ? 'stunned' : ''}`}
                            style={computeHitVars(minion)}
                        >
                            <div
                                className="action-bar-wrapper"
                                style={{
                                    width: !!minion.targetId ? `${combatManager.getDistanceToTargetWidthString(minion)}px` : '5px',
                                    left: `calc(100px * ${combatManager.getCombatant(minion.targetId)?.coordinates.x} + 50px)`
                                }}
                            >
                                <div className={`action-bar ${minion.attacking ? (minion.facing === 'right' ? 'monsterHitsAnimation_LtoR' : 'monsterHitsAnimation') : ''}`}></div>
                            </div>
                            {/* {minion.pendingAttack && (
                                <div
                                    className={`weapon-wrapper
                                        ${getMonsterWeaponAnimation(minion)}
                                        ${minion.aiming ? 'aiming' : ''}
                                        small`}
                                    style={{
                                        left: minion.facing === 'right'
                                            ? `${minion.coordinates.x * 100 + 65 + (minion.coordinates.x * 2)}px`
                                            : `${minion.coordinates.x * 100 - 45 + (minion.coordinates.x * 2)}px`,
                                        backgroundImage: `url(${minion.pendingAttack.icon})`
                                    }}
                                ></div>
                            )} */}
                            <div
                                className="portrait-wrapper"
                                style={{
                                    left: `${minion.coordinates.x * 100 + (SHOW_TILE_BORDERS ? minion.coordinates.x * 2 : 0)}px`,
                                    zIndex: `${minion.dead ? '0' : '100'}`,
                                    ...transitionStyle(minion.id)
                                }}
                            >
                                <div
                                    className={`portrait minion-portrait
                                            ${minion.active ? 'active' : ''}
                                            ${minion.bifurcating ? 'bifurcatingAnimation' : (minion.dead ? 'dead monsterDeadAnimation' : '')}
                                            ${minion.isBifurcateSmall ? 'bifurcate-copy' : ''}
                                            ${minion.isBifurcateCopy ? 'bifurcate-copy-spawning' : ''}
                                            ${minion.missed ? (minion.facing === 'right' ? 'missed-reversed' : 'missed') : ''}
                                            ${selectedMonster?.id === minion.id ? 'selected' : ''}
                                            ${selectedFighter?.targetId === minion.id ? 'targetted' : ''}
                                            ${minion.facing === 'right' ? 'reversed' : ''}
                                            ${minion.facing === 'up' ? 'facing-up' : ''}
                                            ${minion.facing === 'down' ? 'facing-down' : ''}
                                            ${minion.regenerating ? 'regenerating' : ''}
                                            ${minion.bleed ? 'bleeding' : ''}`
                                        }
                                    style={{
                                        backgroundImage: `url(${minion.portrait})`,
                                        filter: `saturate(${((minion.hp / minion.stats.hp) * 100) / 2}) ${minion.portraitFilter || ''} sepia(${portraitHoveredId === minion.id ? '2' : '0'})`,
                                        zIndex: 2, // Always below fighter portraits
                                        // Never apply BulgePortrait when dead — it competes with meltDownDeath
                                        animation: (minion.wounded && !minion.dead) ? 'BulgePortrait var(--portrait-animation-duration, 420ms) var(--portrait-animation-timing, cubic-bezier(.2,.8,.2,1))' : undefined,
                                        animationFillMode: (minion.wounded && !minion.dead) ? 'forwards' : undefined
                                    }}
                                    onClick={() => monsterCombatPortraitClicked(minion.id)}
                                    ref={el => {
                                        if (minion.wounded) {
                                            // console.log('MINION WOUNDED:', minion.id, minion.wounded, 'class:', getHitAnimation(minion));
                                        }
                                    }}
                                    onAnimationEnd={e => {
                                        if (
                                            minion.dead &&
                                            e.animationName &&
                                            e.animationName.includes('meltDownDeath') &&
                                            showDeathAnimation[minion.id]
                                        ) {
                                            setFullyDead(prev => ({ ...prev, [minion.id]: true }));
                                            setShowDeathAnimation(prev => ({ ...prev, [minion.id]: false }));
                                        }
                                        // Bifurcate shrink: remove from the board once the animation finishes
                                        if (
                                            e.animationName &&
                                            e.animationName.includes('bifurcateShrink')
                                        ) {
                                            setFullyDead(prev => ({ ...prev, [minion.id]: true }));
                                        }
                                    }}
                                        onAnimationStart={e => {
                                            // try {
                                            //     if (e && e.animationName && e.animationName.includes('BulgePortrait')) {
                                            //         // eslint-disable-next-line no-console
                                            //         console.log('ANIM START: BulgePortrait on minion', minion.id, 'event:', e);
                                            //     }
                                            // } catch (err) {
                                            //     // eslint-disable-next-line no-console
                                            //     console.error('Error in onAnimationStart (minion)', err);
                                            // }
                                        }}
                                >
                                    {SHOW_MONSTER_IDS ? minion.id : null}
                                    {/* White hit-flash overlay for minions */}
                                    {minionHitFlash[minion.id] && (
                                        <div className="hit-flash-overlay" />
                                    )}
                                </div>
                                {animationOverlays[minion.id] && getAllOverlaysById(minion.id).map((overlay, i) => {
                                    const overlayData = {
                                        ...overlay.data,
                                        dead: minion.dead
                                    };
                                    return <Overlay key={i} animationType={overlay.type} data={overlayData} />;
                                })}
                                <div
                                    className="portrait-relative-container"
                                    onMouseEnter={() => portraitHovered(minion.id)}
                                    onMouseLeave={() => portraitHovered(null)}
                                    onClick={() => monsterCombatPortraitClicked(minion.id)}
                                >
                                    <div className="targetted-by-container">
                                        {minion.targettedBy && minion.targettedBy.map((e, i) => (
                                            <div
                                                key={i}
                                                className="targetted-by-portrait"
                                                // style={{ backgroundImage: `url(${images[battleData[e]?.portrait]})` }}
                                            ></div>
                                        ))}
                                    </div>
                                    {/* Target indicator: tiny portrait of whoever this minion is targeting */}
                                    {(() => {
                                        const target = minion.targetId ? combatManager.getCombatant(minion.targetId) : null;
                                        return target?.portrait && !minion.dead ? (
                                            <div className="monster-target-indicator" style={{ zIndex: 10 }}>
                                                <div
                                                    className="monster-target-portrait"
                                                    style={{ backgroundImage: `url(${target.portrait})` }}
                                                />
                                            </div>
                                        ) : null;
                                    })()}
                                    {/* Stolen item indicator: icon in upper-left when minion has stolen something */}
                                    {(() => {
                                        const stolenIconKey = minion.stolenItemIcon;
                                        const stolenImg = stolenIconKey
                                            ? (images[stolenIconKey] || stolenIconKey)
                                            : null;
                                        return stolenImg && !minion.dead ? (
                                            <div className="monster-stolen-item-indicator" style={{ zIndex: 10 }}>
                                                <div
                                                    className="monster-stolen-item-portrait"
                                                    style={{ backgroundImage: `url(${stolenImg})` }}
                                                />
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                                <div className={`portrait-overlay ${minion.frozen ? 'frozen' : ''}`}> 
                                    <div className="damage-indicator-container">
                                        {(visibleDamageIndicators[minion.id] || []).map((indicator, idx, arr) => {
                                            // For minions, always use the default offset.
                                            const yOffset = idx * 28;
                                            const isStatDebuff = !indicator.isCrit && typeof indicator.value === 'string' && indicator.type !== 'robbed';
                                            return (
                                                <div
                                                    className={`damage-indicator${isStatDebuff ? ' stat-debuff' : ''}${indicator.isCrit ? ' crit' : ''}${indicator.type === 'heal' ? ' heal' : ''}${indicator.type === 'robbed' ? ' robbed' : ''}`}
                                                    key={indicator.id}
                                                    style={{
                                                        transform: `translateY(-${yOffset}px)`,
                                                        zIndex: 10 + (arr.length - idx),
                                                        position: 'absolute',
                                                        left: 0,
                                                        right: 0,
                                                        margin: '0 auto',
                                                        pointerEvents: 'none',
                                                    }}
                                                >
                                                    {indicator.value}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="indicators-wrapper">
                                    <div className="monster-hp-bar hp-bar">
                                        {!minion.dead && (
                                            <div className="red-fill" style={{ width: `${(minion.hp / minion.stats.hp) * 100}%` }}></div>
                                        )}
                                    </div>
                                    <div className="monster-energy-bar energy-bar">
                                        {!minion.dead && (
                                            <div className="yellow-fill" style={{ width: `calc(${minion.energy}%)` }}></div>
                                        )}
                                    </div>
                                    <div className="tempo-bar">
                                        {!minion.dead && (
                                            <div className="tempo-indicator" style={{ left: `calc(${minion.tempo}% - 4px)` }}></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            {/* </div> */}
        </div>
    );
};

export default MonstersCombatGrid;
