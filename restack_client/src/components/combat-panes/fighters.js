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

const getActiveEffects = (combatant, combatManager) => {
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

    return list;
};

export default function FightersCombatGrid(props) {
    const getLiveCombatant = (id) => (props.combatManager && typeof props.combatManager.getCombatant === 'function') ? props.combatManager.getCombatant(id) : null;

    // Delay removal of fighter portrait after death for death animation
    const [showDeathAnimation, setShowDeathAnimation] = React.useState({});
    const [fullyDead, setFullyDead] = React.useState({});
    const formatDamageIndicatorValue = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
        if (typeof value === 'string') {
            const numericValue = Number(value);
            if (value.trim() !== '' && Number.isFinite(numericValue)) return Math.round(numericValue);
        }
        return value;
    };

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
    const prevAttackingRef = React.useRef({});
    const [consumableFlashes, setConsumableFlashes] = React.useState({});
    const prevConsumableFlashRef = React.useRef({});

    React.useLayoutEffect(() => {
        const newWeaponPos = {};
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
            }
        });
        setWeaponPositions(newWeaponPos);
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
            const now = !!details.attacking;
            // update prev ref for next tick
            prevAttackingRef.current[fighter.id] = now;
            // If attacking has ended, clear prev flag so next attack can trigger
            if (!now) {
                prevAttackingRef.current[fighter.id] = false;
            }

            // Consumable flash: show item icon for 1.5s when consumableFlash timestamp changes
            const flashTs = details.consumableFlash?.timestamp;
            const prevFlashTs = prevConsumableFlashRef.current[fighter.id];
            if (flashTs && flashTs !== prevFlashTs) {
                prevConsumableFlashRef.current[fighter.id] = flashTs;
                setConsumableFlashes(prev => ({ ...prev, [fighter.id]: details.consumableFlash.iconKey }));
                setTimeout(() => {
                    setConsumableFlashes(prev => ({ ...prev, [fighter.id]: null }));
                }, 1500);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.battleData, props.crew]);
    return (
        <div className="mb-col fighter-pane" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <div className="fighter-content" style={{ width: '100%', height: '100%' }}>
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
                                    position: 'absolute',
                                    top: '0px',
                                    left: '0px',
                                    width: '100%',
                                    pointerEvents: 'none'
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
                                        pointerEvents: 'auto'
                                    }}
                                    ref={el => { portraitWrapperRefs.current[fighter.id] = el }}
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
                                            {getActiveEffects(fighter, props.combatManager).map((eff) => (
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
                                                details?.active ? 'active' : '',
                                                facingClass,
                                                verticalFacingClass,
                                                details?.locked ? 'locked' : '',
                                                details?.chargingUpActive ? 'charging-up' : '',
                                                details?.berserkerActive && details?.feared && !details?.stunned ? 'berserk-feared' : '',
                                                details?.berserkerActive && (!details?.feared || details?.stunned) ? 'berserk-active' : '',
                                                !details?.berserkerActive && details?.feared ? 'feared' : '',
                                                getLiveCombatant(fighter.id)?.shieldWallActive ? 'shield-wall-active' : '',
                                                details?.stunned ? 'stunned' : '',
                                                details?.drained ? 'drained' : '',
                                                details?.regenerating ? 'regenerating' : '',
                                                details?.healPulse ? 'heal-pulse' : '',
                                                details?.dispelPulse ? 'dispel-pulse' : '',
                                                details?.bleed ? 'bleeding' : '',
                                                details?.frozen ? 'frozen' : '',
                                                // ── Redux AI visual states ───────────────────────
                                                getLiveCombatant(fighter.id)?.astralBeingActive ? 'astral-being' : '',
                                                getLiveCombatant(fighter.id)?.astralProjectionActive ? 'astral-projection-active' : '',
                                            ].filter(Boolean).join(' ')
                                        }
                                        style={{
                                            backgroundImage: `url(${fighter.portrait})`,
                                            backgroundSize: (details?.berserkerActive && details?.feared && !details?.stunned) ? '100% 100%' : undefined,
                                            // Astral Being: portrait becomes translucent with cyan glow
                                            opacity: getLiveCombatant(fighter.id)?.astralBeingActive ? 0.55 : 1,
                                            filter: [
                                                details?.chargingUpActive ? "url('#ripple-effect')" : null,
                                                `sepia(${props.portraitHoveredId === fighter.id ? '2' : '0'})`,
                                                details?.frozen ? 'hue-rotate(165deg) saturate(1.35) brightness(1.08) contrast(1.05)' : '',
                                                (details?.berserkerActive && details?.feared && !details?.stunned) ? 'brightness(1.18)' : ''
                                            ].filter(Boolean).join(' '),
                                            zIndex: 300,
                                            // CSS transition for astral projection slide
                                            transition: getLiveCombatant(fighter.id)?.astralProjectionActive
                                                ? 'opacity 0.4s ease-in-out'
                                                : undefined,
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
                                        {/* Ensnare Visual Overlay – green vine corners matching Sandbox */}
                                        {(() => {
                                            const liveFighter = props.combatManager?.getCombatant?.(fighter.id) || fighter;
                                            if (!liveFighter?.ensnared || details?.dead) return null;
                                            return (
                                                <div style={{
                                                    boxSizing: 'border-box',
                                                    position: 'absolute',
                                                    top: 0, left: 0, width: '100px', height: '100px',
                                                    border: '3px solid #8bc34a',
                                                    borderRadius: '6px',
                                                    boxShadow: '0 0 18px rgba(139, 195, 74, 0.9), inset 0 0 10px rgba(139, 195, 74, 0.4)',
                                                    pointerEvents: 'none',
                                                    zIndex: 13
                                                }}>
                                                    {[
                                                        { left: 0, top: 0, borderRadius: '0 0 100% 0' },
                                                        { right: 0, top: 0, borderRadius: '0 0 0 100%' },
                                                        { left: 0, bottom: 0, borderRadius: '0 100% 0 0' },
                                                        { right: 0, bottom: 0, borderRadius: '100% 0 0 0' }
                                                    ].map((pos, i) => (
                                                        <div key={i} style={{
                                                            position: 'absolute',
                                                            ...pos,
                                                            width: '18px', height: '18px',
                                                            border: '3.5px solid #558b2f',
                                                            boxShadow: '0 0 8px rgba(85,139,47,0.8)',
                                                            animation: `ensnarePulse 0.8s ease-in-out infinite ${i * 0.2}s`,
                                                            boxSizing: 'border-box'
                                                        }} />
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                        {props.animationOverlays[fighter.id] && props.getAllOverlaysById(fighter.id).map((overlay, i) => {
                                            const overlayData = {
                                                ...overlay.data,
                                                dead: props.getFighterDetails(fighter)?.dead
                                            };
                                            return <Overlay key={i} animationType={overlay.type} data={overlayData} />;
                                        })}
                                        <div className={`portrait-overlay${details?.drained ? ' drained' : ''}${details?.frozen ? ' frozen' : ''}`} >
                                            <div className="damage-indicator-container">
                                                {props.getFighterDetails(fighter)?.damageIndicators.map((e,i)=>{
                                                    const isStatDebuff = !e.isCrit && !e.isMiss && typeof e.value === 'string' && isNaN(e.value);
                                                    return <div key={e.id || i} className={`damage-indicator${isStatDebuff ? ' stat-debuff' : ''}${e.isCrit ? ' crit' : ''}${e.isMiss ? ' miss' : ''}`}>
                                                        {formatDamageIndicatorValue(e.value)}
                                                    </div>
                                                })}
                                            </div>
                                        </div>

                                        {/* Target indicator: tiny portrait of whoever this fighter is targeting */}
                                        {(() => {
                                            const liveFighter = getLiveCombatant(fighter.id);
                                            const targetId = liveFighter?.targetId;
                                            const target = targetId ? getLiveCombatant(targetId) : null;
                                            return target?.portrait && !target?.invisible && !details?.dead ? (
                                                <div className="monster-target-indicator" style={{ zIndex: 310, position: 'absolute' }}>
                                                    <div
                                                        className="monster-target-portrait"
                                                        style={{ backgroundImage: `url(${target.portrait})` }}
                                                    />
                                                </div>
                                            ) : null;
                                        })()}

                                        {/* Consumable flash indicator: top-left slot, shows item icon for 1.5s */}
                                        {consumableFlashes[fighter.id] && !details?.dead && (
                                            <div className="fighter-consumable-indicator" style={{ zIndex: 310, position: 'absolute' }}>
                                                <div
                                                    className="fighter-consumable-portrait"
                                                    style={{ backgroundImage: `url(${images[consumableFlashes[fighter.id]]})` }}
                                                />
                                            </div>
                                        )}

                                        {!props.getFighterDetails(fighter)?.dead && (
                                            <div className="indicators-wrapper" style={{ zIndex: 310, position: 'absolute', bottom: 0, left: 0, width: '100%', display: 'flex', flexDirection: 'column-reverse', pointerEvents: 'none' }}>
                                                <div className="hp-bar" style={{ position: 'relative', height: '4px' }}>
                                                    <div className="red-fill" style={{width: `${(props.getFighterDetails(fighter)?.hp / fighter.stats.hp) * 100}%`}}></div>
                                                </div>
                                                {props.combatManager && props.combatManager.round !== undefined ? (
                                                    <div className="endurance-bar" style={{ height: '2px', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', position: 'relative' }}>
                                                        <div className="white-fill" style={{ height: '100%', backgroundColor: '#ffffff', width: `${(props.getFighterDetails(fighter)?.endurance / props.getFighterDetails(fighter)?.maxEndurance) * 100}%` }}></div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="energy-bar" style={{ position: 'relative', height: '4px' }}>
                                                            <div className="yellow-fill" style={{width: `calc(${props.getFighterDetails(fighter)?.energy}%)`}}></div>
                                                        </div>
                                                        <div className="tempo-bar" style={{ position: 'relative', height: '4px' }}>
                                                            <div className="tempo-indicator" style={{left: `calc(${props.getFighterDetails(fighter)?.tempo}% - 4px)`}}></div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}


                                </div>
                            </div>
                        </div>
                    })}
                {/* ── Rift Portal tile overlay ──────────────────────────────────────── */}
                {(() => {
                    // Find any crew Summoner with an active rift portal
                    const summoner = props.crew.find(f => f.type === 'summoner');
                    if (!summoner) return null;
                    const liveSummoner = getLiveCombatant(summoner.id);
                    if (!liveSummoner?.riftPortalActive || !liveSummoner?.riftPortalPos) return null;
                    const { x, y } = liveSummoner.riftPortalPos; // {x, y} tile coords
                    const portalLeft = x * TILE_SIZE + (SHOW_TILE_BORDERS ? x * 2 : 0);
                    const portalTop  = y * TILE_SIZE + (SHOW_TILE_BORDERS ? y * 2 : 0);
                    const roundsLeft = liveSummoner.riftPortalRoundsLeft ?? 3;
                    return (
                        <div
                            className="rift-portal-tile"
                            style={{
                                position: 'absolute',
                                left: portalLeft + 'px',
                                top: portalTop + 'px',
                                width: TILE_SIZE + 'px',
                                height: TILE_SIZE + 'px',
                                zIndex: 350,
                                pointerEvents: 'none',
                            }}
                        >
                            <div className="rift-portal-inner">
                                <div className="rift-portal-rounds">{roundsLeft}</div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    )
}