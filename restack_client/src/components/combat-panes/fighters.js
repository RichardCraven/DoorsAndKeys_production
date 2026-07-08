import React from 'react';
import * as images from '../../utils/images';
import Overlay from '../Overlay'
import { FIGHTER_MOVE_TRANSITION_MS } from '../../utils/shared-constants'

const MAX_DEPTH = 7; // eslint-disable-line no-unused-vars
const NUM_COLUMNS = 8; // eslint-disable-line no-unused-vars
// ^ means 8 squares, account for depth of 0 is far left
const MAX_ROWS = 5; // eslint-disable-line no-unused-vars
const TILE_SIZE = 100;
const SHOW_TILE_BORDERS = false;
const SHOW_COMBAT_BORDER_COLORS = true; // eslint-disable-line no-unused-vars
const SHOW_INTERACTION_PANE=true // eslint-disable-line no-unused-vars


export default function FightersCombatGrid(props) {
    // Delay removal of fighter portrait after death for death animation
    const [showDeathAnimation, setShowDeathAnimation] = React.useState({});
    const [fullyDead, setFullyDead] = React.useState({});

    React.useEffect(() => {
        props.crew.forEach(fighter => {
            const details = props.getFighterDetails(fighter);
            if (details?.dead && !showDeathAnimation[fighter.id] && !fullyDead[fighter.id]) {
                setShowDeathAnimation(prev => ({ ...prev, [fighter.id]: true }));
            } else if (!details?.dead && (showDeathAnimation[fighter.id] || fullyDead[fighter.id])) {
                setShowDeathAnimation(prev => ({ ...prev, [fighter.id]: false }));
                setFullyDead(prev => ({ ...prev, [fighter.id]: false }));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.crew, props.battleData]);

    // Only render fighters still present in battleData (i.e., not removed from combat),
    // and if dead, only if showDeathAnimation is true and not fullyDead
    const activeCrew = props.crew.filter(f => {
        const details = props.getFighterDetails(f);
        return props.battleData[f.id] && !details?.invisible && (!details?.dead || (showDeathAnimation[f.id] && !fullyDead[f.id]));
    });
    // Refs to portrait wrappers and fighter containers so we can measure DOM for precise weapon placement
    const portraitWrapperRefs = React.useRef({});
    const fighterWrapperRefs = React.useRef({});
    const [weaponPositions, setWeaponPositions] = React.useState({});
    const [actionBarPositions, setActionBarPositions] = React.useState({});
    const [animatingHits, setAnimatingHits] = React.useState({});
    const prevAttackingRef = React.useRef({});

    // Compute weapon positions based on the rendered portrait positions. Use layout effect to read DOM
    React.useLayoutEffect(() => {
        const newWeaponPos = {};
        const newActionBarPos = {};
        props.crew.forEach(fighter => {
            const details = props.getFighterDetails(fighter);
            if (!details || details.dead || !details.pendingAttack) return;
            const portraitEl = portraitWrapperRefs.current[fighter.id];
            // prefer explicit wrapper ref (offsetParent should be fighter-wrapper)
            const parentEl = portraitEl ? (portraitEl.offsetParent || fighterWrapperRefs.current[fighter.id]) : fighterWrapperRefs.current[fighter.id];
            if (portraitEl && parentEl) {
                const pRect = portraitEl.getBoundingClientRect();
                const parentRect = parentEl.getBoundingClientRect();
                const weaponW = 90; // CSS default weapon size
                const weaponH = 90;
                // Prefer offsetLeft/offsetTop (relative to offsetParent) when available —
                // more robust against page scroll and transforms than client bounding rect diffs.
                const portraitOffsetLeft = (typeof portraitEl.offsetLeft === 'number') ? portraitEl.offsetLeft : Math.round(pRect.left - parentRect.left);
                const portraitOffsetTop = (typeof portraitEl.offsetTop === 'number') ? portraitEl.offsetTop : Math.round(pRect.top - parentRect.top);
                // Place the icon at the leading edge of the portrait (the divide between
                // the fighter and their target) rather than centered on the portrait.
                // Use TILE_SIZE (100) rather than pRect.width — portrait-wrapper has no
                // explicit width so getBoundingClientRect can return unreliable values.
                let left;
                if (details.facing === 'right') {
                    // Center the icon on the right edge of the portrait tile, nudged
                    // slightly inward so it visually straddles the divide.
                    left = portraitOffsetLeft + TILE_SIZE - weaponW;
                } else if (details.facing === 'left') {
                    left = portraitOffsetLeft;
                } else {
                    // up/down: centre horizontally
                    left = portraitOffsetLeft + (TILE_SIZE / 2) - (weaponW / 2);
                }
                let top;
                if (details.facing === 'up') {
                    top = portraitOffsetTop - (weaponH / 2);
                } else if (details.facing === 'down') {
                    top = portraitOffsetTop + pRect.height - (weaponH / 2) + 10; // nudge down a little
                } else {
                    top = portraitOffsetTop;
                }
                newWeaponPos[fighter.id] = { left: `${Math.round(left)}px`, top: `${Math.round(top)}px` };

                // Compute action-bar left anchored to the portrait's tile so it matches
                // the grid-based calculation in `getActionBarLeftValForFighter`.
                const rangeWidth = props.combatManager.getRangeWidthVal(details) || 0;
                const offset = (details?.facing === 'left') ? (-(rangeWidth * 100)) : 100;
                const barLeft = portraitOffsetLeft + offset;
                newActionBarPos[fighter.id] = { left: `${Math.round(barLeft)}px` };
            }
        });
        setWeaponPositions(newWeaponPos);
        setActionBarPositions(newActionBarPos);
        // Recompute when battle data changes, overlays change, or crew list changes
    }, [props.crew, props.battleData, props.animationOverlays, props.selectedFighter]); // eslint-disable-line react-hooks/exhaustive-deps

    // Track when an attack animation should play visually (decoupled from the
    // battle state). We set a transient flag when the fighter begins attacking
    // and clear it on the animationend event so the CSS class is removed
    // deterministically when the animation finishes (prevents lingering).
    // Trigger a single visual play when `attacking` transitions false->true.
    // Use a ref to remember the previous attacking state per fighter so we don't
    // retrigger while the combat state keeps `attacking === true` for the
    // duration of the attack — the animation should only play once per attack.
    React.useEffect(() => {
        props.crew.forEach(fighter => {
            const details = props.getFighterDetails(fighter);
            if (!details) return;
            const prev = !!prevAttackingRef.current[fighter.id];
            const now = !!details.attacking;
            if (!prev && now) {
                // attacking went from false -> true: start visual animation
                setAnimatingHits(prevState => ({ ...prevState, [fighter.id]: true }));
                // Clear the hit class after 1s since the CSS animation was removed
                // (the onAnimationEnd handler is no longer reliable for this class).
                setTimeout(() => {
                    setAnimatingHits(prevState => ({ ...prevState, [fighter.id]: false }));
                }, 1000);
            }
            // update prev ref for next tick
            prevAttackingRef.current[fighter.id] = now;
            // If attacking has ended, clear prev flag so next attack can trigger
            if (!now) {
                prevAttackingRef.current[fighter.id] = false;
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.battleData, props.crew]);
    return (
        <div className="mb-col fighter-pane">
            <div className="fighter-content">
                {activeCrew.map((fighter) => {
                    const isTeleporting = props.teleportingFighterId === fighter.id;
                    // Always use the facing at the moment of death for the death animation
                    const details = props.getFighterDetails(fighter);
                    // only mark reversed when explicitly facing left; support up/down classes separately
                    const facingClass = details?.facing === 'left' ? 'reversed' : '';
                    const verticalFacingClass = details?.facing === 'up' ? 'facing-up' : (details?.facing === 'down' ? 'facing-down' : '');
                    const xPos = props.battleData[fighter.id]?.coordinates.x * 100 + (SHOW_TILE_BORDERS ? props.battleData[fighter.id]?.coordinates.x * 2 : 0);
                    const yPos = props.battleData[fighter.id]?.coordinates.y * TILE_SIZE + (SHOW_TILE_BORDERS ? props.battleData[fighter.id]?.coordinates.y * 2 : 0);
                    return  <div key={fighter.id}  className={`lane-wrapper ${isTeleporting ? ' teleporting' : ''}`}
                                style={{ 
                                    height: `${TILE_SIZE}px`,
                                }}>
                                <div 
                                ref={el => { fighterWrapperRefs.current[fighter.id] = el }}
                                className={`fighter-wrapper${fighter.isLeader ? ' leader-wrapper' : ''}${isTeleporting ? ' teleporting' : ''}`}
                                >
                                    <div className={`portrait-wrapper${isTeleporting ? ' teleporting' : ''}`}
                                    style={{
                                        transform: `translate(${xPos}px, ${yPos}px)`,
                                        transition: isTeleporting ? 'none' : `transform ${FIGHTER_MOVE_TRANSITION_MS}ms`,
                                        zIndex: 300,
                                    }}
                                    ref={el => { portraitWrapperRefs.current[fighter.id] = el }}
                                    >
                                        <div 
                                        className={
                                            [
                                                'portrait',
                                                'fighter-portrait',
                                                isTeleporting ? 'teleporting' : '',
                                                props.selectedFighter?.id === fighter.id && !fighter.dead ? 'selected' : '',
                                                (details?.wounded && details?.wounded.severity === 'minor') ? (details?.facing === 'right' ? 'hit-from-right-minor' : 'hit-from-left-minor') : '',
                                                (details?.wounded && details?.wounded.severity === 'severe') ? (details?.facing === 'right' ? 'hit-from-right-severe' : 'hit-from-left-severe') : '',
                                                (details?.wounded && details?.wounded.severity === 'lethal') ? (details?.facing === 'right' ? 'hit-from-right-lethal' : 'hit-from-left-lethal') : '',
                                                details?.rocked ? 'rocked' : '',
                                                fighter.isLeader ? 'leader-portrait' : '',
                                                details?.dead ? 'dead fighterDeadAnimation' : '',
                                                (props.selectedFighter?.targetId === fighter.id || props.selectedMonster?.targetId === fighter.id) && !details?.dead ? 'targetted' : '',
                                                details?.active ? 'active' : '',
                                                facingClass,
                                                verticalFacingClass,
                                                details?.locked ? 'locked' : '',
                                                details?.chargingUpActive ? 'charging-up' : '',
                                                details?.berserkerActive && details?.feared ? 'berserk-feared' : '',
                                                details?.berserkerActive && !details?.feared ? 'berserk-active' : '',
                                                !details?.berserkerActive && details?.feared ? 'feared' : '',
                                                props.combatManager.getCombatant(fighter.id)?.shieldWallActive ? 'shield-wall-active' : '',
                                                details?.stunned ? 'stunned' : '',
                                                details?.drained ? 'drained' : '',
                                                details?.regenerating ? 'regenerating' : '',
                                                details?.bleed ? 'bleeding' : '',
                                            ].filter(Boolean).join(' ')
                                        }
                                        style={{
                                            backgroundImage: `url(${fighter.portrait})`,
                                            backgroundSize: (details?.berserkerActive && details?.feared) ? '100% 100%' : undefined,
                                            filter: [
                                                details?.chargingUpActive ? "url('#ripple-effect')" : null,
                                                `saturate(${((details?.hp / fighter.stats.hp) * 100) / 2}) sepia(${props.portraitHoveredId === fighter.id ? '2' : '0'})`,
                                                (details?.berserkerActive && details?.feared) ? 'brightness(1.18)' : ''
                                            ].filter(Boolean).join(' '),
                                            zIndex: 300,
                                            }} 
                                        onClick={() => props.fighterPortraitClicked(fighter.id)}
                                        onMouseEnter={() => props.portraitHovered(fighter.id)} 
                                        onMouseLeave={() => props.portraitHovered(null)}
                                        onDragStart = {(event) => props.onDragStart(fighter)}
                                        draggable
                                        onAnimationEnd={e => {
                                            if (
                                                details?.dead &&
                                                e.animationName &&
                                                e.animationName.includes('meltDownDeath') &&
                                                showDeathAnimation[fighter.id]
                                            ) {
                                                setFullyDead(prev => ({ ...prev, [fighter.id]: true }));
                                                setShowDeathAnimation(prev => ({ ...prev, [fighter.id]: false }));
                                            }
                                        }}
                                        >
                                        </div>
                                        {props.animationOverlays[fighter.id] && props.getAllOverlaysById(fighter.id).map((overlay, i) => {
                                            const overlayData = {
                                                ...overlay.data,
                                                dead: props.getFighterDetails(fighter)?.dead
                                            };
                                            return <Overlay key={i} animationType={overlay.type} data={overlayData} />;
                                        })}
                                        <div className={`portrait-overlay${details?.drained ? ' drained' : ''}`} >
                                            <div className="damage-indicator-container">
                                                {props.getFighterDetails(fighter)?.damageIndicators.map((e,i)=>{
                                                    const isStatDebuff = !e.isCrit && !e.isMiss && typeof e.value === 'string';
                                                    return <div key={e.id || i} className={`damage-indicator${isStatDebuff ? ' stat-debuff' : ''}${e.isCrit ? ' crit' : ''}${e.isMiss ? ' miss' : ''}`}>
                                                        {e.value}
                                                    </div>
                                                })}
                                            </div>
                                            {/* Only show circular progress for the manually selected fighter */}
                                            {props.selectedFighter?.id === fighter.id && !fighter.dead && (
                                                <div className={`circular-progress selected`} style={{
                                                    background: `conic-gradient(${props.getManualMovementArcColor(props.getFighterDetails(fighter))} ${props.getManualMovementArc(props.getFighterDetails(fighter))}deg, black 0deg)`,
                                                }}  data-inner-circle-color="lightgrey" data-percentage={(() => {
                                                    const fd = props.getFighterDetails(fighter) || {};
                                                    // Prefer new movementPoints fields, fall back to manualMoves for compatibility
                                                    const current = (typeof fd.movementPointsCurrent === 'number') ? fd.movementPointsCurrent : fd.manualMovesCurrent || 0;
                                                    const total = (typeof fd.movementPointsMax === 'number') ? fd.movementPointsMax : fd.manualMovesTotal || 1;
                                                    const pct = total ? Math.round((current) / total * 100) : 0;
                                                    return pct;
                                                })()} data-progress-color="crimson" data-bg-color="black">
                                                    <div className="inner-circle"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="hp-bar">
                                        {!props.getFighterDetails(fighter)?.dead && <div className="red-fill" 
                                            style={{width: `${(props.getFighterDetails(fighter)?.hp / fighter.stats.hp) * 100}%`}}
                                            ></div>}
                                        </div>
                                        <div className="energy-bar">
                                            {!props.getFighterDetails(fighter)?.dead && <div className="yellow-fill" style={{width: `calc(${props.getFighterDetails(fighter)?.energy}%)`}}></div>}
                                        </div>
                                        <div className="tempo-bar">
                                            {!props.getFighterDetails(fighter)?.dead &&  <div className="tempo-indicator" style={{left: `calc(${props.getFighterDetails(fighter)?.tempo}% - 4px)`}}></div>}

                                        {/* Target indicator: tiny portrait of whoever this fighter is targeting */}
                                        {(() => {
                                            const liveFighter = props.combatManager.getCombatant(fighter.id);
                                            const targetId = liveFighter?.targetId;
                                            const target = targetId ? props.combatManager.getCombatant(targetId) : null;
                                            return target?.portrait && !target?.invisible && !details?.dead ? (
                                                <div className="monster-target-indicator" style={{ zIndex: 310, position: 'absolute' }}>
                                                    <div
                                                        className="monster-target-portrait"
                                                        style={{ backgroundImage: `url(${target.portrait})` }}
                                                    />
                                                </div>
                                            ) : null;
                                        })()}
                                        </div>
                                    { props.getFighterDetails(fighter) && props.getFighterDetails(fighter).pendingAttack && props.getFighterDetails(fighter).attacking && !props.getFighterDetails(fighter).dead && (() => {
                                        const details = props.getFighterDetails(fighter);
                                        const isMonk = fighter.type === 'monk';
                                        if (!isMonk) return null;
                                        const isBasicPunch = details.pendingAttack.range === 'close' && details.pendingAttack.name !== 'dragon punch';
                                        const icon = isBasicPunch ? images.fist_punch : props.battleData[fighter.id].pendingAttack.icon;

                                        // position weapon using measured portrait positions when available
                                        const measured = weaponPositions[fighter.id];
                                        const weaponStyle = measured ? { ...measured, backgroundImage: `url(${icon})`, opacity: 1 } : (() => {
                                            // fallback to original coordinate math if measurement not ready
                                            const tileW = 100;
                                            const weaponW = 90;
                                            if (details?.facing === 'right') return { left: `${details?.coordinates.x * tileW + tileW - weaponW}px`, opacity: 1, backgroundImage: `url(${icon})` };
                                            if (details?.facing === 'left') return { left: `${details?.coordinates.x * tileW}px`, opacity: 1, backgroundImage: `url(${icon})` };
                                            if (details?.facing === 'up') return { left: `${details?.coordinates.x * tileW + (tileW / 2) - (weaponW / 2)}px`, top: `-40px`, opacity: 1, backgroundImage: `url(${icon})`, transform: 'rotate(-90deg)' };
                                            if (details?.facing === 'down') return { left: `${details?.coordinates.x * tileW + (tileW / 2) - (weaponW / 2)}px`, top: `110px`, opacity: 1, backgroundImage: `url(${icon})`, transform: 'rotate(90deg)' };
                                            // Default: center
                                            const left = `${details?.coordinates.x * tileW + (tileW / 2) - (weaponW / 2)}px`;
                                            const top = `50px`;
                                            return { left, top, opacity: 1, backgroundImage: `url(${icon})` };
                                        })();

                                        return (
                                            <div className={`weapon-wrapper ${details?.facing === 'left' ? 'reversed' : ''} ${verticalFacingClass} ${details?.aiming ? 'aiming' : ''} medium`} style={weaponStyle}>
                                            </div>
                                        );
                                    })()}
                                    <div className={`action-bar-wrapper ${verticalFacingClass === 'facing-up' ? 'pointing-up' : (verticalFacingClass === 'facing-down' ? 'pointing-down' : '')}`} 
                                        style={{
                                        zIndex: 1001,
                                        height: '100%',
                                        width: !!props.getFighterDetails(fighter)?.pendingAttack ? `${props.combatManager.getRangeWidthVal(props.getFighterDetails(fighter)) * 100}px` : '0px',
                                        // Prefer measured DOM position for pixel-perfect alignment; fall back to grid math
                                        left: props.getFighterDetails(fighter)?.pendingAttack ? (actionBarPositions[fighter.id]?.left || `${props.getActionBarLeftValForFighter(props.getFighterDetails(fighter)?.id)}px`) : 0
                                    }}
                                    >
                                        <div className={`
                                        action-bar 
                                        ${(animatingHits[fighter.id]) ? (props.getFighterDetails(fighter)?.facing === 'right' ? 'fighterHitsAnimation' : 'fighterHitsAnimation_RtoL') : ''}
                                        ${(props.getFighterDetails(fighter)?.healing) ? 'fighterHealsAnimation' : ''}
                                        `}
                                        onAnimationEnd={e => {
                                            // Clear heals animation flag when the FighterHits keyframe completes.
                                            // (Hit animation classes no longer have CSS animations so they are
                                            //  cleared via the setTimeout in the useEffect below instead.)
                                            if (e && e.animationName && e.animationName.includes('FighterHits')) {
                                                setAnimatingHits(prev => ({ ...prev, [fighter.id]: false }));
                                            }
                                        }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    })}
            </div>
        </div>
    )
}