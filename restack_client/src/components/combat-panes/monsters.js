import React from 'react';
import Overlay from '../Overlay';
import { ROCK_DURATION } from '../../utils/shared-constants';

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
    const getLiveCombatant = (id) => (combatManager && typeof combatManager.getCombatant === 'function') ? combatManager.getCombatant(id) : null;

    const getActiveEffects = (combatant) => {
        const list = [];
        if (!combatant) return list;
        const liveUnit = combatManager?.getCombatant?.(combatant.id) || combatant;
        if (liveUnit.dead || (typeof liveUnit.hp === 'number' && liveUnit.hp <= 0)) {
            return [];
        }

        if (liveUnit.frozen) list.push({ key: 'frozen', icon: images.frozen, border: '#00bfff' });
        if (liveUnit.stunned && !liveUnit.feared) list.push({ key: 'stunned', icon: images.stunned || images.whiteskull || images.induce_fear, border: '#f5c842' });
        if (liveUnit.feared) list.push({ key: 'fear', icon: images.fear || images.induce_fear, border: '#8e2de2' });
        if (liveUnit.bleed) list.push({ key: 'bleed', icon: images.bleeding, border: '#e05555' });
        if (liveUnit.poison) list.push({ key: 'poison', icon: images.poison, border: '#7affa0' });
        if (liveUnit.shieldWallActive) list.push({ key: 'shield_wall', icon: images.shield_wall, border: '#90c4ff' });
        if (liveUnit.defensiveStanceActive || liveUnit.defensiveStance) list.push({ key: 'defensive_stance', icon: images.soldier_defensive_stance, border: '#cccccc' });
        if (liveUnit.berserkerActive) list.push({ key: 'berserker', icon: images.barbarian_berserker, border: '#ff4444' });
        if (liveUnit.weaknessRevealed) list.push({ key: 'weakness', icon: images.weakness_doubled, border: '#cc44ff' });
        if (liveUnit.marked) list.push({ key: 'marked', icon: images.ranger_mark, border: '#ffaa00' });
        if (liveUnit.ensnared) list.push({ key: 'ensnared', icon: images.ranger_ensnare, border: '#00ff00' });
        if (liveUnit.astralBeingActive) list.push({ key: 'astral_being', icon: images.monk_astral_being, border: '#21e6c1' });
        if (liveUnit.thirdEyeActive) list.push({ key: 'third_eye', icon: images.monk_third_eye, border: '#21e6c1' });

        const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
        const hexDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && normalizeName(d.name) === 'hexed') : null;
        if (hexDebuff || liveUnit.hexed) {
            list.push({ key: 'hexed', icon: images.hex, border: '#cc44ff' });
        }
        const polymorphDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && normalizeName(d.name) === 'polymorphed') : null;
        if (polymorphDebuff || liveUnit.polymorphed) {
            list.push({ key: 'polymorphed', icon: images.polymorph, border: '#22c55e' });
        }
        const betrayedDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && normalizeName(d.name) === 'betrayed') : null;
        if (betrayedDebuff || liveUnit.betrayed) {
            list.push({ key: 'betrayed', icon: images.betrayal, border: '#ff00ff' });
        }

        return list;
    };

    const formatDamageIndicatorValue = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
        if (typeof value === 'string') {
            const numericValue = Number(value);
            if (value.trim() !== '' && Number.isFinite(numericValue)) return Math.round(numericValue);
        }
        return value;
    };
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
    const processedIndicatorsRef = React.useRef(new Set());

    // Add new indicators to the queue
    React.useEffect(() => {
        Object.values(battleData).forEach(entity => {
            if (!entity || !Array.isArray(entity.damageIndicators)) return;
            const id = entity.id;
            setIndicatorQueues(prev => {
                const prevQueue = prev[id] || [];
                const newIndicators = entity.damageIndicators
                    .map((e, index) => {
                        if (!e) return null;
                        const stableId = e.id || `${id}_indicator_${index}`;
                        return { ...e, id: stableId };
                    })
                    .filter(e => e && !processedIndicatorsRef.current.has(e.id))
                    .map(e => e.timestamp ? e : { ...e, timestamp: Date.now() });
                if (newIndicators.length === 0) return prev;

                newIndicators.forEach(e => processedIndicatorsRef.current.add(e.id));

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
        // visibleDamageIndicators omitted: including it causes infinite re-renders since this effect calls setVisibleDamageIndicators
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [battleData]);

    React.useEffect(() => {
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            Object.values(indicatorTimeouts.current).forEach(clearTimeout);
        };
    }, []);

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
                if (visibleArr.some(e => e.id === next.id)) {
                    setIndicatorQueues(prev => ({ ...prev, [id]: rest }));
                    return;
                }
                let slot = 0;
                if (visibleArr.length > 0) {
                    const occupiedSlots = new Set(visibleArr.map(e => e.slot || 0));
                    while (occupiedSlots.has(slot)) {
                        slot++;
                    }
                }
                const yOffset = slot * 28;
                const nextWithOffset = { ...next, slot, yOffset };
                setVisibleDamageIndicators(prev => {
                    const currentArr = prev[id] || [];
                    if (currentArr.some(e => e.id === next.id)) return prev;
                    return { ...prev, [id]: [...currentArr, nextWithOffset] };
                });
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

    const isMountedRef = React.useRef(true);
    React.useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const deathTimeoutsRef = React.useRef({});

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
                if (deathTimeoutsRef.current[id]) {
                    clearTimeout(deathTimeoutsRef.current[id]);
                }
                const t = setTimeout(() => {
                    if (isMountedRef.current) {
                        setFullyDead(prev => {
                            if (!prev[id]) return { ...prev, [id]: true };
                            return prev;
                        });
                        setShowDeathAnimation(prev => ({ ...prev, [id]: false }));
                    }
                    delete deathTimeoutsRef.current[id];
                }, 2400); // meltDownDeath is 2000ms + 400ms buffer
                deathTimeoutsRef.current[id] = t;
            } else if (!battleData[monster.id].dead && (showDeathAnimation[monster.id] || fullyDead[monster.id])) {
                if (deathTimeoutsRef.current[monster.id]) {
                    clearTimeout(deathTimeoutsRef.current[monster.id]);
                    delete deathTimeoutsRef.current[monster.id];
                }
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
                    const id = minion.id;
                    if (deathTimeoutsRef.current[id]) {
                        clearTimeout(deathTimeoutsRef.current[id]);
                    }
                    const t = setTimeout(() => {
                        if (isMountedRef.current) {
                            setFullyDead(prev => {
                                if (!prev[id]) return { ...prev, [id]: true };
                                return prev;
                            });
                            setShowDeathAnimation(prev => ({ ...prev, [id]: false }));
                        }
                        delete deathTimeoutsRef.current[id];
                    }, 2400);
                    deathTimeoutsRef.current[id] = t;
                } else if (!minion.dead && (showDeathAnimation[minion.id] || fullyDead[minion.id])) {
                    if (deathTimeoutsRef.current[minion.id]) {
                        clearTimeout(deathTimeoutsRef.current[minion.id]);
                        delete deathTimeoutsRef.current[minion.id];
                    }
                    setShowDeathAnimation(prev => ({ ...prev, [minion.id]: false }));
                    setFullyDead(prev => ({ ...prev, [minion.id]: false }));
                }
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [battleData, monster]);

    React.useEffect(() => {
        const timeouts = deathTimeoutsRef.current;
        return () => {
            if (timeouts) {
                Object.values(timeouts).forEach(t => clearTimeout(t));
            }
        };
    }, []);

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
        <div className="mb-col monster-pane" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
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
                            pointerEvents: 'auto',
                            zIndex: 300,
                            width: `${TILE_SIZE}px`,
                            height: `${TILE_SIZE}px`,
                            position: 'absolute',
                            overflow: 'visible',
                        }}
                    >
                        {/* Damage indicators — inside vct-portrait-wrapper so they're centered over the tile */}
                        <div className="portrait-overlay" style={{ zIndex: 301, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                            <div className="damage-indicator-container" style={{ overflow: 'visible' }}>
                                {(visibleDamageIndicators[vct.id] || []).map((indicator, idx, arr) => {
                                    const isStatDebuff = !indicator.isCrit && !indicator.isMiss && typeof indicator.value === 'string' && indicator.type !== 'robbed' && isNaN(indicator.value);
                                    const yOffset = typeof indicator.yOffset === 'number' ? indicator.yOffset : 0;
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
                                            {formatDamageIndicatorValue(indicator.value)}
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

                        {/* {(() => {
                            let weaponWrapper = null;
                            if (battleData[monster.id] && battleData[monster.id].activeAbility) {
                                const activeAbility = battleData[monster.id].activeAbility;
                                if (activeAbility && activeAbility.type === 'grasp') {
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
                                            backgroundImage: `url(${battleData[monster.id].activeAbility.icon})`
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
                                pointerEvents: 'auto',
                                zIndex: `${battleData[monster.id]?.dead ? '0' : '200'}`,
                                overflow: 'visible',
                                ...transitionStyle(monster.id),
                                border: undefined
                            }}
                        >
                            {/* Effect Icons Overlay */}
                            <div style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                display: 'flex',
                                gap: '2px',
                                zIndex: 350,
                                pointerEvents: 'none'
                            }}>
                                {getActiveEffects(battleData[monster.id]).map((eff) => (
                                    <div
                                        key={eff.key}
                                        className="effect-icon-active"
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            backgroundColor: '#111',
                                            border: `2px solid ${eff.border}`,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '50%',
                                            backgroundImage: `url(${eff.icon?.default || eff.icon})`,
                                            backgroundSize: 'contain',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center'
                                        }} />
                                    </div>
                                ))}
                            </div>
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
                                        ${portraitHoveredId === monster.id ? 'hover-linked-target' : ''}
                                        ${battleData[monster.id]?.dead ? 'dead mummyDeadAnimation' : ''}
                                        ${battleData[monster.id]?.missed ? (battleData[monster.id]?.facing === 'right' ? 'missed-reversed' : 'missed') : ''}
                                        ${selectedMonster?.id === monster.id ? 'selected' : ''}
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
                                        filter: `sepia(${portraitHoveredId === monster.id ? '2' : '0'}) ${battleData[monster.id]?.frozen ? 'hue-rotate(165deg) saturate(1.35) brightness(1.08) contrast(1.05)' : ''}`,
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
                                    {/* Betrayal Overlay (pulsing pink glow) */}
                                    {(battleData[monster.id]?.betrayed || battleData[monster.id]?.activeDebuffs?.some(d => d && d.name === 'Betrayed')) && (
                                        <div style={{
                                            boxSizing: 'border-box',
                                            position: 'absolute',
                                            top: 0, left: 0, width: '100%', height: '100%',
                                            borderRadius: '6px',
                                            pointerEvents: 'none',
                                            zIndex: 14,
                                            animation: 'betrayalPulseGlow 1.5s ease-in-out infinite alternate',
                                            border: '2px solid rgba(255, 0, 255, 0.6)'
                                        }} />
                                    )}
                                </div>
                                {/* Fear-cast glow — behind the portrait via z-index, after in DOM */}
                                {fearCastingActive && !monster.isMinion && (
                                    <div className="fear-cast-glow" />
                                )}
                                {/* Overlay and indicators above portrait */
}                                <div className={`portrait-overlay ${battleData[monster.id]?.frozen ? 'frozen' : ''}`} style={{zIndex: 2, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}>
                                    <div className="damage-indicator-container" style={{ overflow: 'visible' }}>
                                        {(visibleDamageIndicators[monster.id] || []).map((indicator, idx, arr) => {
                                            const yOffset = typeof indicator.yOffset === 'number' ? indicator.yOffset : 0;
                                            const isStatDebuff = !indicator.isCrit && !indicator.isMiss && typeof indicator.value === 'string' && indicator.type !== 'robbed' && isNaN(indicator.value);
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
                                                    {formatDamageIndicatorValue(indicator.value)}
                                                </div>
                                            );
                                        })}
                                    </div>
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
                                    const target = targetId ? getLiveCombatant(targetId) : null;
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
                            {battleData[monster.id] && !battleData[monster.id]?.dead && battleData[monster.id].isChargingTransform && (
                                <Overlay animationType="transform_charging_overlay" data={battleData[monster.id]} />
                            )}
                            {!battleData[monster.id]?.dead && (
                                <div className="indicators-wrapper" style={{ display: 'flex', flexDirection: 'column-reverse', position: 'absolute', bottom: 0, left: 0, width: '100%', pointerEvents: 'none' }}>
                                    <div className="monster-hp-bar hp-bar" style={{ position: 'relative', height: '4px' }}>
                                        <div className="red-fill" style={{ width: `${(battleData[monster.id]?.hp / battleData[monster.id]?.stats.hp) * 100}%` }}></div>
                                    </div>
                                    {!(battleData[monster.id]?.type && String(battleData[monster.id]?.type).includes('spider')) && (
                                        combatManager && combatManager.round !== undefined ? (
                                            <div className="endurance-bar" style={{ height: '2px', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', position: 'relative' }}>
                                                <div className="white-fill" style={{ height: '100%', backgroundColor: '#ffffff', width: `${(battleData[monster.id]?.endurance / battleData[monster.id]?.maxEndurance) * 100}%` }}></div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="monster-energy-bar energy-bar" style={{ position: 'relative', height: '4px' }}>
                                                    <div className="yellow-fill" style={{ width: `calc(${battleData[monster.id]?.energy}%)` }}></div>
                                                </div>
                                                <div className="tempo-bar" style={{ position: 'relative', height: '4px' }}>
                                                    <div className="tempo-indicator" style={{ left: `calc(${battleData[monster.id]?.tempo}% - 4px)` }}></div>
                                                </div>
                                            </>
                                        )
                                    )}
                                </div>
                            )}
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
                        position: 'absolute',
                        left: '0px',
                        width: '100%',
                        pointerEvents: 'none',
                            ...transitionStyle(minion.id)
                        }}
                    >
                        <div
                            className={`monster-wrapper ${minion.rocked ? 'rocked' : ''} ${minion.wounded ? 'hit' : ''} ${minion.wounded ? getHitAnimation(minion) : ''} ${minion.wounded ? 'hit-flash' : ''} ${minion.facing === 'right' ? 'reversed' : ''} ${minion.stunned ? 'stunned' : ''}`}
                            style={computeHitVars(minion)}
                        >

                            {/* {minion.activeAbility && (
                                <div
                                    className={`weapon-wrapper
                                        ${getMonsterWeaponAnimation(minion)}
                                        ${minion.aiming ? 'aiming' : ''}
                                        small`}
                                    style={{
                                        left: minion.facing === 'right'
                                            ? `${minion.coordinates.x * 100 + 65 + (minion.coordinates.x * 2)}px`
                                            : `${minion.coordinates.x * 100 - 45 + (minion.coordinates.x * 2)}px`,
                                        backgroundImage: `url(${minion.activeAbility.icon})`
                                    }}
                                ></div>
                            )} */}
                            <div
                                className="portrait-wrapper"
                                style={{
                                    left: `${minion.coordinates.x * 100 + (SHOW_TILE_BORDERS ? minion.coordinates.x * 2 : 0)}px`,
                                    pointerEvents: 'auto',
                                    zIndex: `${minion.dead ? '0' : '100'}`,
                                    ...transitionStyle(minion.id)
                                }}
                            >
                                {/* Effect Icons Overlay */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-6px',
                                    right: '-6px',
                                    display: 'flex',
                                    gap: '2px',
                                    zIndex: 350,
                                    pointerEvents: 'none'
                                }}>
                                    {getActiveEffects(minion).map((eff) => (
                                        <div
                                            key={eff.key}
                                            className="effect-icon-active"
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                backgroundColor: '#111',
                                                border: `2px solid ${eff.border}`,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                backgroundImage: `url(${eff.key === 'stunned' ? images.stunned : (eff.icon?.default || eff.icon)})`,
                                                backgroundSize: 'contain',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'center'
                                            }} />
                                        </div>
                                    ))}
                                </div>
                                <div
                                    className={`portrait minion-portrait
                                            ${minion.active ? 'active' : ''}
                                            ${portraitHoveredId === minion.id ? 'hover-linked-target' : ''}
                                            ${minion.bifurcating ? 'bifurcatingAnimation' : (minion.dead ? (minion.key === 'mummy' || minion.type === 'mummy' ? 'dead mummyDeadAnimation' : 'dead monsterDeadAnimation') : '')}
                                            ${minion.isBifurcateSmall ? 'bifurcate-copy' : ''}
                                            ${minion.isBifurcateCopy ? 'bifurcate-copy-spawning' : ''}
                                            ${minion.missed ? (minion.facing === 'right' ? 'missed-reversed' : 'missed') : ''}
                                            ${selectedMonster?.id === minion.id ? 'selected' : ''}
                                            ${minion.facing === 'right' ? 'reversed' : ''}
                                            ${minion.facing === 'up' ? 'facing-up' : ''}
                                            ${minion.facing === 'down' ? 'facing-down' : ''}
                                            ${minion.regenerating ? 'regenerating' : ''}
                                            ${minion.bleed ? 'bleeding' : ''}`
                                        }
                                    style={{
                                        backgroundImage: `url(${minion.portrait})`,
                                        filter: `${minion.portraitFilter || ''} sepia(${portraitHoveredId === minion.id ? '2' : '0'}) ${minion.frozen ? 'hue-rotate(165deg) saturate(1.35) brightness(1.08) contrast(1.05)' : ''}`,
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
                                    {/* Betrayal Overlay (pulsing pink glow) */}
                                    {(minion.betrayed || minion.activeDebuffs?.some(d => d && d.name === 'Betrayed')) && (
                                        <div style={{
                                            boxSizing: 'border-box',
                                            position: 'absolute',
                                            top: 0, left: 0, width: '100%', height: '100%',
                                            borderRadius: '6px',
                                            pointerEvents: 'none',
                                            zIndex: 14,
                                            animation: 'betrayalPulseGlow 1.5s ease-in-out infinite alternate',
                                            border: '2px solid rgba(255, 0, 255, 0.6)'
                                        }} />
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
                                        const target = minion.targetId ? getLiveCombatant(minion.targetId) : null;
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
                                            const yOffset = typeof indicator.yOffset === 'number' ? indicator.yOffset : 0;
                                            const isStatDebuff = !indicator.isCrit && typeof indicator.value === 'string' && indicator.type !== 'robbed' && isNaN(indicator.value);
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
                                                    {formatDamageIndicatorValue(indicator.value)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {!minion.dead && (
                                    <div className="indicators-wrapper" style={{ display: 'flex', flexDirection: 'column-reverse', position: 'absolute', bottom: 0, left: 0, width: '100%', pointerEvents: 'none' }}>
                                        <div className="monster-hp-bar hp-bar" style={{ position: 'relative', height: '4px' }}>
                                            <div className="red-fill" style={{ width: `${(minion.hp / minion.stats.hp) * 100}%` }}></div>
                                        </div>
                                        {!(minion.type && String(minion.type).includes('spider')) && (
                                            combatManager && combatManager.round !== undefined ? (
                                                <div className="endurance-bar" style={{ height: '2px', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', position: 'relative' }}>
                                                    <div className="white-fill" style={{ height: '100%', backgroundColor: '#ffffff', width: `${(minion.endurance / minion.maxEndurance) * 100}%` }}></div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="monster-energy-bar energy-bar" style={{ position: 'relative', height: '4px' }}>
                                                        <div className="yellow-fill" style={{ width: `calc(${minion.energy}%)` }}></div>
                                                    </div>
                                                    <div className="tempo-bar" style={{ position: 'relative', height: '4px' }}>
                                                        <div className="tempo-indicator" style={{ left: `calc(${minion.tempo}% - 4px)` }}></div>
                                                    </div>
                                                </>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
        </div>
    );
};

export default MonstersCombatGrid;
