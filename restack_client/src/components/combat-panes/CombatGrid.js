/**
 * CombatGrid — Unified grid that renders ALL combatants (fighters, monsters,
 * minions) in a single absolute-positioned layer.
 *
 * DOM structure (Sandbox-style, no lane-wrapper or monster-wrapper):
 *   .combat-units-layer
 *     .unit-tile  (position: absolute, left: xPos, top: yPos, TILE_SIZE × TILE_SIZE)
 *       .portrait + overlays
 */
import React from 'react';
import * as images from '../../utils/images';
import Overlay from '../Overlay';


const TILE_SIZE = 100;
const SHOW_TILE_BORDERS = false;


function CurvedProjectile({ srcPx, tgtPx, spherePx, duration = 400, onComplete, color = '#d946ef', shadowColor = '#701a75', isNetherBolt = false }) {
    const [pos, setPos] = React.useState(srcPx);
    const [angle, setAngle] = React.useState(0);
    const [opacity, setOpacity] = React.useState(1);
    const [scale, setScale] = React.useState(1);
    const startTimeRef = React.useRef(null);

    React.useEffect(() => {
        let animId;
        const tick = (now) => {
            if (!startTimeRef.current) startTimeRef.current = now;
            const elapsed = now - startTimeRef.current;
            const t = Math.min(elapsed / duration, 1);

            const mt = 1 - t;
            const x = mt * mt * srcPx.x + 2 * mt * t * tgtPx.x + t * t * spherePx.x;
            const y = mt * mt * srcPx.y + 2 * mt * t * tgtPx.y + t * t * spherePx.y;

            const nextT = Math.min(t + 0.01, 1);
            const nextMt = 1 - nextT;
            const nextX = nextMt * nextMt * srcPx.x + 2 * nextMt * nextT * tgtPx.x + nextT * nextT * spherePx.x;
            const nextY = nextMt * nextMt * srcPx.y + 2 * nextMt * nextT * tgtPx.y + nextT * nextT * spherePx.y;
            const newAngle = Math.atan2(nextY - y, nextX - x) * (180 / Math.PI);

            setPos({ x, y });
            setAngle(newAngle);

            if (t > 0.6) {
                const fadeProgress = (t - 0.6) / 0.4;
                setOpacity(1 - fadeProgress);
                setScale(1 - fadeProgress);
            }

            if (t < 1) {
                animId = requestAnimationFrame(tick);
            } else {
                if (onComplete) onComplete();
            }
        };
        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, [srcPx, tgtPx, spherePx, duration, onComplete]);

    return (
        <div style={{
            position: 'absolute',
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            width: isNetherBolt ? '32px' : '18px',
            height: isNetherBolt ? '32px' : '18px',
            pointerEvents: 'none',
            zIndex: 4000,
            transform: `translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`,
            opacity: opacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {isNetherBolt ? (
                <img
                    src={images['nether_bolt']}
                    alt="nether bolt"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 4px #a21caf)'
                    }}
                />
            ) : (
                <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                    background: `radial-gradient(circle, #ffffff 15%, ${color} 45%, ${shadowColor} 80%)`,
                    boxShadow: `0 0 10px ${color}, 0 0 20px ${shadowColor}, inset 0 0 4px #ffffff`,
                }} />
            )}
        </div>
    );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const getRadialLineCoordsFromPct = (pct) => {
    const ratio = pct / 100;
    const angle = (1 - ratio) * 360;
    const rad = angle * (Math.PI / 180);
    return {
        x2: 10 + 10 * Math.cos(rad),
        y2: 10 + 10 * Math.sin(rad)
    };
};

export const getActiveEffects = (combatant, combatManager) => {
    const list = [];
    if (!combatant) return list;
    const liveUnit = combatManager?.getCombatant?.(combatant.id) || combatant;
    if (liveUnit.dead || (typeof liveUnit.hp === 'number' && liveUnit.hp <= 0)) {
        return [];
    }
    if (combatManager && typeof combatManager.isUnitInWeb === 'function' && combatManager.isUnitInWeb(liveUnit)) {
        list.push({
            key: 'spiderweb',
            icon: images.spiderweb || images.ranger_ensnare,
            border: '#9b5de5',
            roundsLeft: 1,
            totalDuration: 1,
            alwaysShowBadge: false
        });
    }
    const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

    // Helper to extract debuff rounds
    const getDebuffRounds = (name) => {
        if (Array.isArray(liveUnit.activeDebuffs)) {
            const match = liveUnit.activeDebuffs.find(d => d && normalizeName(d.name) === normalizeName(name));
            return match ? match.roundsLeft || 0 : 0;
        }
        return 0;
    };

    const getBuffRounds = (name) => {
        if (Array.isArray(liveUnit.activeBuffs)) {
            const match = liveUnit.activeBuffs.find(b => b && normalizeName(b.name) === normalizeName(name));
            return match ? match.roundsLeft || 0 : 0;
        }
        return 0;
    };

    const getBuff = (name) => Array.isArray(liveUnit.activeBuffs)
        ? liveUnit.activeBuffs.find(b => b && normalizeName(b.name) === normalizeName(name))
        : null;

    if (liveUnit.frozen) {
        const frozenRounds = liveUnit.frozenRounds || 0;
        const frozenStackDuration = liveUnit.frozenStackDuration || frozenRounds || 1;
        list.push({
            key: 'frozen',
            icon: images.frozen,
            border: '#00bfff',
            roundsLeft: frozenRounds,
            totalDuration: liveUnit.frozenTotalRounds || frozenRounds || frozenStackDuration,
            stackDuration: frozenStackDuration,
            stacks: Math.ceil(frozenRounds / frozenStackDuration),
            endTimeMs: liveUnit.frozenEndTimeMs,
            totalDurationMs: liveUnit.frozenTotalDurationMs
        });
    }
    if (liveUnit.stunned && !liveUnit.asleep && !liveUnit.feared) {
        list.push({
            key: 'stunned',
            icon: images.stunned || images.whiteskull || images.induce_fear,
            border: '#f5c842',
            roundsLeft: liveUnit.stunnedRounds || 0,
            totalDuration: liveUnit.stunnedTotalRounds || liveUnit.stunnedRounds || 4,
            endTimeMs: liveUnit.stunnedEndTimeMs,
            totalDurationMs: liveUnit.stunnedTotalDurationMs
        });
    }
    if (liveUnit.asleep) {
        list.push({
            key: 'sleep',
            icon: images.wizard_sleep,
            border: '#90caf9',
            roundsLeft: liveUnit.sleepRounds || liveUnit.stunnedRounds || 0,
            totalDuration: liveUnit.sleepTotalRounds || liveUnit.stunnedTotalRounds || liveUnit.sleepRounds || liveUnit.stunnedRounds || 4,
            endTimeMs: liveUnit.sleepEndTimeMs,
            totalDurationMs: liveUnit.sleepTotalDurationMs
        });
    }
    if (liveUnit.feared) {
        list.push({
            key: 'fear',
            icon: images.fear || images.induce_fear,
            border: '#8e2de2',
            roundsLeft: liveUnit.fearRounds || liveUnit.stunnedRounds || 0,
            totalDuration: liveUnit.fearTotalRounds || liveUnit.stunnedTotalRounds || liveUnit.fearRounds || liveUnit.stunnedRounds || 4,
            endTimeMs: liveUnit.fearEndTimeMs,
            totalDurationMs: liveUnit.fearTotalDurationMs
        });
    }
    if (liveUnit.bleed) {
        const bleedDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && d.name === 'bleed') : null;
        list.push({
            key: 'bleed',
            icon: images.bleeding,
            border: '#e05555',
            roundsLeft: bleedDebuff?.roundsLeft || getDebuffRounds('bleed'),
            totalDuration: bleedDebuff?.totalRounds || bleedDebuff?.roundsLeft || 4,
            endTimeMs: bleedDebuff?.endTimeMs,
            totalDurationMs: bleedDebuff?.totalDurationMs,
            stacks: bleedDebuff?.stacks || 1
        });
    }
    if (liveUnit.poison) {
        const poisonDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && d.name === 'poison') : null;
        const poisonRounds = poisonDebuff?.roundsLeft || getDebuffRounds('poison');
        const poisonSingleDuration = poisonDebuff?.singleDurationRounds || poisonRounds || 1;
        list.push({
            key: 'poison',
            icon: images.poison,
            border: '#7affa0',
            roundsLeft: poisonRounds,
            totalDuration: poisonDebuff?.totalRounds || poisonRounds || poisonSingleDuration,
            stackDuration: poisonSingleDuration,
            stacks: Math.ceil(poisonRounds / poisonSingleDuration),
            segmented: true,
            endTimeMs: poisonDebuff?.endTimeMs,
            totalDurationMs: poisonDebuff?.totalDurationMs
        });
    }
    const defensiveStanceBuff = getBuff('Defensive Stance');
    if (defensiveStanceBuff || liveUnit.defensiveStanceActive || liveUnit.defensiveStance) {
        list.push({
            key: 'defensive_stance',
            icon: images.soldier_defense_stance_mini_icon || images.soldier_defensive_stance,
            border: '#3b82f6',
            roundsLeft: defensiveStanceBuff?.roundsLeft || liveUnit.defensiveStanceRoundsLeft || liveUnit.defensiveStanceRounds || 0,
            totalDuration: defensiveStanceBuff?.totalRounds || liveUnit.defensiveStanceTotalRounds || liveUnit.defensiveStanceRoundsLeft || liveUnit.defensiveStanceRounds || 4,
            endTimeMs: defensiveStanceBuff?.endTimeMs,
            totalDurationMs: defensiveStanceBuff?.totalDurationMs
        });
    }
    const berserkerBuff = getBuff('barbarian_berserker') || getBuff('berserker');
    if (liveUnit.berserkerActive || berserkerBuff) {
        list.push({
            key: 'berserker',
            icon: images.barbarian_berserker,
            border: '#ff3333',
            roundsLeft: liveUnit.berserkerRoundsLeft || liveUnit.berserkerRounds || berserkerBuff?.roundsLeft || getBuffRounds('barbarian_berserker') || getBuffRounds('berserker') || 0,
            totalDuration: berserkerBuff?.totalRounds || liveUnit.berserkerTotalRounds || liveUnit.berserkerRoundsLeft || liveUnit.berserkerRounds || 4,
            endTimeMs: berserkerBuff?.endTimeMs,
            totalDurationMs: berserkerBuff?.totalDurationMs
        });
    }
    if (liveUnit.weaknessRevealed) {
        const weaknessRounds = liveUnit.weaknessRevealedRounds || liveUnit.weaknessRounds || 0;
        const weaknessSingleDuration = liveUnit.weaknessRevealedStackDuration || weaknessRounds || 1;
        list.push({
            key: 'weakness',
            icon: images.weakness_doubled,
            border: '#cc44ff',
            roundsLeft: weaknessRounds,
            totalDuration: liveUnit.weaknessRevealedTotalRounds || weaknessRounds || weaknessSingleDuration,
            stackDuration: weaknessSingleDuration,
            stacks: Math.max(1, Math.ceil(weaknessRounds / weaknessSingleDuration)),
            segmented: true,
            alwaysShowBadge: true,
            badgeBackground: '#000',
            badgeBorder: '#ff007f',
            endTimeMs: liveUnit.weaknessRevealedEndTimeMs,
            totalDurationMs: liveUnit.weaknessRevealedTotalDurationMs
        });
    }
    if (liveUnit.marked) {
        list.push({
            key: 'marked',
            icon: images.ranger_mark,
            border: '#ffaa00',
            roundsLeft: liveUnit.markedRounds || 0,
            totalDuration: liveUnit.markedTotalRounds || liveUnit.markedRounds || 4,
            endTimeMs: liveUnit.markedEndTimeMs,
            totalDurationMs: liveUnit.markedTotalDurationMs
        });
    }
    if (liveUnit.ensnared) {
        list.push({
            key: 'ensnared',
            icon: images.ranger_ensnare,
            border: '#8bc34a',
            roundsLeft: liveUnit.ensnaredRounds || 0,
            totalDuration: liveUnit.ensnaredTotalRounds || liveUnit.ensnaredRounds || 3,
            endTimeMs: liveUnit.ensnaredEndTimeMs,
            totalDurationMs: liveUnit.ensnaredTotalDurationMs
        });
    }
    const shadowCurseDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && d.name === 'shadow_curse') : null;
    if (shadowCurseDebuff) {
        list.push({
            key: 'shadow_curse',
            icon: images.shadow_curse,
            border: '#7209b7',
            roundsLeft: shadowCurseDebuff.roundsLeft || 0,
            totalDuration: shadowCurseDebuff.totalRounds || shadowCurseDebuff.roundsLeft || 4,
            endTimeMs: shadowCurseDebuff.endTimeMs,
            totalDurationMs: shadowCurseDebuff.totalDurationMs
        });
    }
    const hexDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && normalizeName(d.name) === 'hexed') : null;
    if (hexDebuff || liveUnit.hexed) {
        const hexRounds = hexDebuff?.roundsLeft || liveUnit.hexRounds || 0;
        list.push({
            key: 'hexed',
            icon: images.hex,
            border: '#cc44ff',
            roundsLeft: hexRounds,
            totalDuration: hexDebuff?.totalRounds || liveUnit.hexTotalRounds || hexRounds || 4,
            endTimeMs: hexDebuff?.endTimeMs,
            totalDurationMs: hexDebuff?.totalDurationMs
        });
    }
    const polymorphDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && normalizeName(d.name) === 'polymorphed') : null;
    if (polymorphDebuff || liveUnit.polymorphed) {
        const polymorphRounds = polymorphDebuff?.roundsLeft || liveUnit.polymorphRounds || 0;
        list.push({
            key: 'polymorphed',
            icon: images.polymorph,
            border: '#22c55e',
            roundsLeft: polymorphRounds,
            totalDuration: polymorphDebuff?.totalRounds || liveUnit.polymorphTotalRounds || polymorphRounds || 4,
            endTimeMs: polymorphDebuff?.endTimeMs,
            totalDurationMs: polymorphDebuff?.totalDurationMs
        });
    }
    const betrayedDebuff = Array.isArray(liveUnit.activeDebuffs) ? liveUnit.activeDebuffs.find(d => d && normalizeName(d.name) === 'betrayed') : null;
    if (betrayedDebuff || liveUnit.betrayed) {
        const betrayedRounds = betrayedDebuff?.roundsLeft || liveUnit.betrayed_eras || 0;
        list.push({
            key: 'betrayed',
            icon: images.betrayal,
            border: '#ff00ff',
            roundsLeft: betrayedRounds,
            totalDuration: betrayedDebuff?.totalRounds || betrayedRounds || 4,
            endTimeMs: betrayedDebuff?.endTimeMs,
            totalDurationMs: betrayedDebuff?.totalDurationMs
        });
    }
    if (liveUnit.isBones) {
        list.push({
            key: 'skeleton_bones_hourglass',
            icon: images.hourglass1,
            border: '#9d4edd',
            roundsLeft: liveUnit.bonesRoundsLeft || 0,
            totalDuration: liveUnit.bonesTotalRounds || liveUnit.bonesRoundsLeft || 4,
            endTimeMs: liveUnit.bonesEndTimeMs,
            totalDurationMs: liveUnit.bonesTotalDurationMs
        });
    }
    const astralBeingBuff = getBuff('astral_being');
    if (liveUnit.astralBeingActive || astralBeingBuff) {
        list.push({
            key: 'astral_being',
            icon: images.monk_astral_being,
            border: '#21e6c1',
            roundsLeft: liveUnit.astralBeingRoundsLeft || liveUnit.astralBeingRounds || astralBeingBuff?.roundsLeft || 0,
            totalDuration: liveUnit.astralBeingTotalRounds || liveUnit.astralBeingRoundsLeft || liveUnit.astralBeingRounds || astralBeingBuff?.totalRounds || 6,
            stackDuration: 3,
            segmented: true,
            endTimeMs: liveUnit.astralBeingEndTimeMs || astralBeingBuff?.endTimeMs,
            totalDurationMs: liveUnit.astralBeingTotalDurationMs || astralBeingBuff?.totalDurationMs
        });
    }
    if (liveUnit.etherealSpeedActive) {
        list.push({
            key: 'ethereal_speed',
            icon: images.monk_ethereal_speed,
            border: '#ffdd57',
            roundsLeft: liveUnit.etherealSpeedRoundsLeft || 0,
            totalDuration: liveUnit.etherealSpeedTotalRounds || liveUnit.etherealSpeedRoundsLeft || 4,
            endTimeMs: liveUnit.etherealSpeedEndTimeMs,
            totalDurationMs: liveUnit.etherealSpeedTotalDurationMs
        });
    }
    const innerFireBuff = getBuff('Inner Fire');
    if (innerFireBuff) {
        list.push({
            key: 'inner_fire',
            icon: images.monk_inner_fire,
            border: '#ff5400',
            roundsLeft: innerFireBuff.roundsLeft || 0,
            totalDuration: innerFireBuff.totalRounds || innerFireBuff.roundsLeft || 4,
            endTimeMs: innerFireBuff.endTimeMs,
            totalDurationMs: innerFireBuff.totalDurationMs
        });
    }
    const inspireBuff = getBuff('Inspire');
    if (inspireBuff) {
        list.push({
            key: 'inspire',
            icon: images.inspire,
            border: '#ffdd57',
            roundsLeft: inspireBuff.roundsLeft || 0,
            totalDuration: inspireBuff.totalRounds || inspireBuff.roundsLeft || 4,
            endTimeMs: inspireBuff.endTimeMs,
            totalDurationMs: inspireBuff.totalDurationMs
        });
    }
    if (liveUnit.thirdEyeActive) {
        list.push({
            key: 'third_eye',
            icon: images.monk_third_eye,
            border: '#21e6c1',
            roundsLeft: liveUnit.thirdEyeRoundsLeft || liveUnit.thirdEyeRounds || 0,
            totalDuration: liveUnit.thirdEyeTotalRounds || liveUnit.thirdEyeRoundsLeft || liveUnit.thirdEyeRounds || 4,
            endTimeMs: liveUnit.thirdEyeEndTimeMs,
            totalDurationMs: liveUnit.thirdEyeTotalDurationMs
        });
    }
    const copBuff = getBuff('circle_of_protection');
    if (copBuff) {
        const sameTeamSage = combatManager && combatManager.combatants && Object.values(combatManager.combatants).find(c => {
            if (!c || c.dead || c.isVCT) return false;
            const sameTeam = (liveUnit.isMonster || liveUnit.isMinion)
                ? (c.isMonster || c.isMinion)
                : (!c.isMonster && !c.isMinion);
            return sameTeam && c.type === 'sage';
        });
        if (sameTeamSage) {
            const dx = liveUnit.coordinates.x - sameTeamSage.coordinates.x;
            const dy = liveUnit.coordinates.y - sameTeamSage.coordinates.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 1.9) {
                list.push({
                    key: 'shielded',
                    icon: images.shielded,
                    border: '#00bfff',
                    roundsLeft: copBuff.roundsLeft || 0,
                    totalDuration: copBuff.totalRounds || copBuff.roundsLeft || 4,
                    endTimeMs: copBuff.endTimeMs,
                    totalDurationMs: copBuff.totalDurationMs
                });
            } else if (d <= 2.25) {
                list.push({
                    key: 'shielded_partial',
                    icon: images.shielded_partial,
                    border: '#00bfff',
                    roundsLeft: copBuff.roundsLeft || 0,
                    totalDuration: copBuff.totalRounds || copBuff.roundsLeft || 4,
                    endTimeMs: copBuff.endTimeMs,
                    totalDurationMs: copBuff.totalDurationMs
                });
            }
        }
    }

    // Invigorate effect icon
    const invigorateBuff = getBuff('invigorate');
    if (invigorateBuff) {
        const sameTeamSage = combatManager && combatManager.combatants && Object.values(combatManager.combatants).find(c => {
            if (!c || c.dead || c.isVCT) return false;
            const sameTeam = (liveUnit.isMonster || liveUnit.isMinion)
                ? (c.isMonster || c.isMinion)
                : (!c.isMonster && !c.isMinion);
            return sameTeam && c.type === 'sage';
        });
        if (sameTeamSage) {
            const dx = liveUnit.coordinates.x - sameTeamSage.coordinates.x;
            const dy = liveUnit.coordinates.y - sameTeamSage.coordinates.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= 2.25) {
                list.push({
                    key: 'invigorate',
                    icon: images.invigorate,
                    border: '#32cd32',
                    roundsLeft: invigorateBuff.roundsLeft || 0,
                    totalDuration: invigorateBuff.totalRounds || invigorateBuff.roundsLeft || 3,
                    endTimeMs: invigorateBuff.endTimeMs,
                    totalDurationMs: invigorateBuff.totalDurationMs
                });
            }
        }
    }

    // Circle of Deflection effect icon
    const codBuff = getBuff('circle_of_deflection');
    if (codBuff) {
        const sameTeamSage = combatManager && combatManager.combatants && Object.values(combatManager.combatants).find(c => {
            if (!c || c.dead || c.isVCT) return false;
            const sameTeam = (liveUnit.isMonster || liveUnit.isMinion)
                ? (c.isMonster || c.isMinion)
                : (!c.isMonster && !c.isMinion);
            return sameTeam && c.type === 'sage';
        });
        if (sameTeamSage) {
            const dx = liveUnit.coordinates.x - sameTeamSage.coordinates.x;
            const dy = liveUnit.coordinates.y - sameTeamSage.coordinates.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 1.9) {
                list.push({
                    key: 'circle_of_deflection',
                    icon: images.circle_of_deflection,
                    border: '#20e8c8',
                    roundsLeft: codBuff.roundsLeft || 0,
                    totalDuration: codBuff.totalRounds || codBuff.roundsLeft || 4,
                    endTimeMs: codBuff.endTimeMs,
                    totalDurationMs: codBuff.totalDurationMs
                });
            }
        }
    }
    const arcaneBarrierBuff = getBuff('Arcane Barrier');
    if (liveUnit.arcaneBarrierActive || arcaneBarrierBuff) {
        list.push({
            key: 'arcane_barrier',
            icon: images.arcane_barrier,
            border: '#ff5400',
            roundsLeft: liveUnit.arcaneBarrierRoundsLeft || arcaneBarrierBuff?.roundsLeft || 0,
            totalDuration: liveUnit.arcaneBarrierTotalRounds || liveUnit.arcaneBarrierRoundsLeft || arcaneBarrierBuff?.totalRounds || 4,
            endTimeMs: liveUnit.arcaneBarrierEndTimeMs,
            totalDurationMs: liveUnit.arcaneBarrierTotalDurationMs
        });
    }

    return list.filter((eff, index, arr) => arr.findIndex(candidate => candidate.key === eff.key) === index);
};

const formatDamageValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
    if (typeof value === 'string') {
        const n = Number(value);
        if (value.trim() !== '' && Number.isFinite(n)) return Math.round(n);
    }
    return value;
};

// ── Hit animation CSS variable helpers ───────────────────────────────────────
const DEBUG_FORCE_BIG_BULGE = true;
const MINION_DEBUG_FACTOR = 0.3;

const computeHitVars = (combatant, getHitAnimation, isMobileLandscape) => {
    // CombatGrid portraits fill their container via width:100%/height:100%,
    // so --portrait-base-scale should always be 1 (container is already 200px for large monsters).
    const baseScale = '1';
    const isFighter = combatant && !combatant.isMonster && !combatant.isMinion;
    const flip = isFighter
        ? (combatant.facing === 'left' ? '-1' : '1')
        : (combatant.facing === 'right' ? '-1' : '1');

    let scaleVal = combatant && (combatant.isShrineGuardian ? '1' : (combatant.type === 'spider_minion' ? '0.5' : ((combatant.isMinion && combatant.tier !== 3 && combatant.tier !== 4) ? '1' : '2')));
    if (isMobileLandscape && combatant && !combatant.isMonster && !combatant.isMinion && !combatant.isShrineGuardian) {
        scaleVal = '1';
    }

    if (!combatant || !combatant.wounded) {
        let healthyScale = '2';
        if (combatant) {
            healthyScale = combatant.isShrineGuardian ? '1' : (combatant.type === 'spider_minion' ? '0.5' : ((combatant.isMinion && combatant.tier !== 3 && combatant.tier !== 4) ? '1' : '2'));
            if (isMobileLandscape && !combatant.isMonster && !combatant.isMinion && !combatant.isShrineGuardian) {
                healthyScale = '1';
            }
        } else {
            healthyScale = baseScale;
        }
        return { '--portrait-base-scale': healthyScale, '--portrait-flip': flip };
    }
    const hc = (getHitAnimation && getHitAnimation(combatant)) || '';
    let severity = 'minor';
    if (hc.indexOf('severe') !== -1) severity = 'severe';
    if (hc.indexOf('lethal') !== -1) severity = 'lethal';
    const dirLeft = hc.indexOf('left') !== -1;
    const dirRight = hc.indexOf('right') !== -1;
    const dirTop = hc.indexOf('top') !== -1;
    const dirBottom = hc.indexOf('bottom') !== -1;
    const perspective = severity === 'minor' ? '600px' : severity === 'severe' ? '800px' : '1000px';
    let rotateY = '0deg', translateX = '0px';
    if (dirLeft) { rotateY = '-10deg'; translateX = '4px'; }
    else if (dirRight) { rotateY = '10deg'; translateX = '-4px'; }

    const interp = (base, debug) => {
        const b = parseFloat(base), d = parseFloat(debug);
        if (isNaN(b) || isNaN(d)) return base;
        return String((b * (1 - MINION_DEBUG_FACTOR) + d * MINION_DEBUG_FACTOR).toFixed(3));
    };

    let baseBulgeMinor = '1.003', baseBulgeSevere = '1.006', baseBulgeLethal = '1.01';
    if (combatant && combatant.isMinion) { baseBulgeMinor = '1.02'; baseBulgeSevere = '1.03'; baseBulgeLethal = '1.05'; }

    let bulgeMinor = baseBulgeMinor, bulgeSevere = baseBulgeSevere, bulgeLethal = baseBulgeLethal;
    if (DEBUG_FORCE_BIG_BULGE && combatant && combatant.isMinion) {
        bulgeMinor = interp(baseBulgeMinor, '1.6'); bulgeSevere = interp(baseBulgeSevere, '1.9'); bulgeLethal = interp(baseBulgeLethal, '2.2');
    } else if (DEBUG_FORCE_BIG_BULGE) {
        bulgeMinor = '1.6'; bulgeSevere = '1.9'; bulgeLethal = '2.2';
    }

    const bulgeValue = severity === 'minor' ? bulgeMinor : severity === 'severe' ? bulgeSevere : bulgeLethal;
    let bulgeX = '1', bulgeY = '1', transformOrigin = '50% 80%';
    if (dirLeft) { bulgeX = bulgeValue; transformOrigin = '0% 50%'; }
    else if (dirRight) { bulgeX = bulgeValue; transformOrigin = '100% 50%'; }
    else if (dirTop) { bulgeY = bulgeValue; transformOrigin = '50% 0%'; }
    else if (dirBottom) { bulgeY = bulgeValue; transformOrigin = '50% 100%'; }
    else { bulgeX = bulgeValue; bulgeY = bulgeValue; }

    return {
        '--portrait-perspective': perspective,
        '--portrait-rotateY': rotateY,
        '--portrait-translateX': translateX,
        '--portrait-bulge-x': bulgeX,
        '--portrait-bulge-y': bulgeY,
        '--portrait-transform-origin': transformOrigin,
        '--portrait-base-scale': scaleVal,
        '--portrait-flip': combatant.facing === 'right' ? '-1' : '1',
        '--portrait-animation-duration': (combatant.isMinion && combatant.tier !== 3 && combatant.tier !== 4) ? '520ms' : '420ms',
        '--portrait-animation-timing': (combatant.isMinion && combatant.tier !== 3 && combatant.tier !== 4) ? 'cubic-bezier(.18,.9,.22,1)' : 'cubic-bezier(.2,.8,.2,1)'
    };
};

// Resolve portrait/icon to a string URL
const resolvePortrait = (portraitVal) => {
    if (!portraitVal) return '';
    let res = '';
    if (typeof portraitVal === 'string') {
        const mapped = images[portraitVal];
        if (mapped) {
            res = mapped.default || mapped;
        } else {
            res = portraitVal;
        }
    } else if (typeof portraitVal === 'object') {
        res = portraitVal.default || '';
    }
    return res;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function CombatGrid(props) {
    const TILE_SIZE = props.TILE_SIZE !== undefined ? props.TILE_SIZE : 100;
    const SHOW_TILE_BORDERS = props.SHOW_TILE_BORDERS !== undefined ? props.SHOW_TILE_BORDERS : false;
    const CELL_SIZE = TILE_SIZE + (SHOW_TILE_BORDERS ? 2 : 0);
    const tilePos = (coord) => coord * TILE_SIZE + (SHOW_TILE_BORDERS ? coord * 2 : 0);

    const {
        crew = [],
        combatManager,
        battleData = {},
        selectedFighter,
        selectedMonster,
        portraitHoveredId,
        animationOverlays = {},
        getAllOverlaysById,
        portraitHovered,
        fighterPortraitClicked,
        monsterCombatPortraitClicked,
        onDragStart,
        onFighterMouseDown,
        onFighterShiftClick,
        onFighterRightClick,
        groupSelectedIds = [],
        getManualMovementArc,
        getManualMovementArcColor,
        getFighterDetails,
        getHitAnimation,
        teleportingFighterId,
        fearCastingActive,
        greetingInProcess,
        SHOW_MONSTER_IDS = false,
        // Sandbox-style CSS animation events from AnimationManagerRedux
        activeAnimations = [],
    } = props;
    const crewIds = new Set(crew.map(f => f.id));

    const checkHuge = (unit) => {
        if (!unit || unit.isShrineGuardian) return false;
        const hugeByTemplate = (
            (typeof unit.huge === 'boolean' && unit.huge === true) ||
            (unit.type === 'dragon') ||
            (unit.tier === 4) ||
            (typeof unit.size === 'number' && unit.size === 3) ||
            (typeof unit.scale === 'number' && unit.scale === 3)
        );
        if (hugeByTemplate) return true;
        if ((unit.isMainMonster || (!unit.isMinion && !unit.isSiegeUnit && !unit.isSiegeArmy && unit.tier === 4 && !crewIds.has(unit.id))) && unit.tier === 4) return true;
        return false;
    };

    const checkLarge = (unit) => {
        if (!unit || unit.isShrineGuardian) return false;
        if (checkHuge(unit)) return false;
        const largeByTemplate = (
            (typeof unit.large === 'boolean' && unit.large === true) ||
            (unit.type === 'beholder' || unit.type === 'sphinx' || unit.type === 'abomination') ||
            (unit.tier === 3) ||
            (typeof unit.size === 'number' && unit.size === 2) ||
            (typeof unit.scale === 'number' && unit.scale === 2)
        );
        if (largeByTemplate) return true;
        const isClassicMainMonster = (unit.isMonster === true || unit.isMainMonster === true) && unit.isMinion !== true && !unit.isSiegeUnit && !unit.isSiegeArmy && !crewIds.has(unit.id);
        if (isClassicMainMonster) return true;
        return false;
    };

    const getLiveCombatant = (id) => (combatManager && typeof combatManager.getCombatant === 'function') ? combatManager.getCombatant(id) : null;

    // ── Mounted check Ref ─────────────────────────────────────────────────────
    const isMountedRef = React.useRef(true);
    React.useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ── Death animation state ─────────────────────────────────────────────────
    const [showDeathAnimation, setShowDeathAnimation] = React.useState({});
    const [fullyDead, setFullyDead] = React.useState({});
    const [meltScales, setMeltScales] = React.useState({});
    const deathTimeoutsRef = React.useRef({});
    const consumableTimeoutsRef = React.useRef({});

    // ── High-frequency render loop for status effect durations ────────────────
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
        let animId;
        const tickLoop = () => {
            if (isMountedRef.current) {
                setTick(t => t + 1);
                animId = requestAnimationFrame(tickLoop);
            }
        };

        const hasActiveEffects = Object.values(battleData).some(unit => {
            if (!unit || unit.dead) return false;
            const effs = getActiveEffects(unit, combatManager);
            return effs.some(eff => eff.endTimeMs && eff.endTimeMs > Date.now());
        });

        if (hasActiveEffects) {
            animId = requestAnimationFrame(tickLoop);
        }

        return () => {
            if (animId) cancelAnimationFrame(animId);
        };
    }, [battleData, combatManager]);

    React.useEffect(() => {
        const allUnits = Object.values(battleData);
        allUnits.forEach(unit => {
            if (!unit) return;
            if (unit.dead && !showDeathAnimation[unit.id] && !fullyDead[unit.id]) {
                if (isMountedRef.current) {
                    setShowDeathAnimation(prev => ({ ...prev, [unit.id]: true }));
                }
                const id = unit.id;
                
                // Animate organic melt scale from 0 to 120 using requestAnimationFrame
                const duration = 2000;
                const startTime = performance.now();
                let animId;
                const animate = (now) => {
                    if (!isMountedRef.current) return;
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const currentScale = progress * 120;
                    setMeltScales(prev => ({ ...prev, [id]: currentScale }));
                    if (progress < 1) {
                        animId = requestAnimationFrame(animate);
                        if (deathTimeoutsRef.current[id]) {
                            deathTimeoutsRef.current[id].animId = animId;
                        }
                    }
                };
                animId = requestAnimationFrame(animate);

                if (deathTimeoutsRef.current[id]) {
                    if (deathTimeoutsRef.current[id].timeout) clearTimeout(deathTimeoutsRef.current[id].timeout);
                    if (deathTimeoutsRef.current[id].animId) cancelAnimationFrame(deathTimeoutsRef.current[id].animId);
                }
                const t = setTimeout(() => {
                    if (isMountedRef.current) {
                        setFullyDead(prev => { if (!prev[id]) return { ...prev, [id]: true }; return prev; });
                        setShowDeathAnimation(prev => ({ ...prev, [id]: false }));
                        setMeltScales(prev => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                        });
                    }
                    delete deathTimeoutsRef.current[id];
                }, 2400);
                deathTimeoutsRef.current[id] = { timeout: t, animId };
            } else if (!unit.dead && (showDeathAnimation[unit.id] || fullyDead[unit.id])) {
                if (deathTimeoutsRef.current[unit.id]) {
                    const item = deathTimeoutsRef.current[unit.id];
                    if (item.timeout) clearTimeout(item.timeout);
                    if (item.animId) cancelAnimationFrame(item.animId);
                    delete deathTimeoutsRef.current[unit.id];
                }
                if (isMountedRef.current) {
                    setShowDeathAnimation(prev => ({ ...prev, [unit.id]: false }));
                    setFullyDead(prev => ({ ...prev, [unit.id]: false }));
                    setMeltScales(prev => {
                        const next = { ...prev };
                        delete next[unit.id];
                        return next;
                    });
                }
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [battleData]);

    React.useEffect(() => {
        const timeouts = deathTimeoutsRef.current;
        return () => {
            if (timeouts) {
                Object.values(timeouts).forEach(item => {
                    if (item.timeout) clearTimeout(item.timeout);
                    if (item.animId) cancelAnimationFrame(item.animId);
                });
            }
        };
    }, []);

    // ── Damage indicator system ───────────────────────────────────────────────
    const [visibleDamageIndicators, setVisibleDamageIndicators] = React.useState({});
    const [indicatorQueues, setIndicatorQueues] = React.useState({});
    const indicatorTimeouts = React.useRef({});
    const STAGGER_DELAY = 150;
    const processedIndicatorsRef = React.useRef(new Set());

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [battleData]);

    React.useEffect(() => {
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            Object.values(indicatorTimeouts.current).forEach(clearTimeout);
        };
    }, []);

    React.useEffect(() => {
        let activeTimeout = null;

        const processQueues = () => {
            let nextCheckDelay = null;

            Object.keys(indicatorQueues).forEach(id => {
                if (!indicatorQueues[id] || indicatorQueues[id].length === 0) return;
                const visibleArr = visibleDamageIndicators[id] || [];
                const lastTimestamp = visibleArr.length > 0 ? Math.max(...visibleArr.map(e => e.timestamp)) : 0;
                const timeDiff = Date.now() - lastTimestamp;

                if (visibleArr.length === 0 || timeDiff >= STAGGER_DELAY) {
                    const [next, ...rest] = indicatorQueues[id];
                    if (visibleArr.some(e => e.id === next.id)) {
                        setIndicatorQueues(prev => ({ ...prev, [id]: rest }));
                        return;
                    }
                    let xOffset = 0;
                    if (visibleArr.length > 0) {
                        const offsets = [-15, 15, -8, 8];
                        xOffset = offsets[(visibleArr.length - 1) % offsets.length];
                    }
                    let slot = 0;
                    if (visibleArr.length > 0) {
                        const occupiedSlots = new Set(visibleArr.map(e => e.slot || 0));
                        while (occupiedSlots.has(slot)) {
                            slot++;
                        }
                    }
                    const yOffset = slot * 16;
                    const nextWithOffset = { ...next, xOffset, slot, yOffset };
                    setVisibleDamageIndicators(prev => {
                        const currentArr = prev[id] || [];
                        if (currentArr.some(e => e.id === next.id)) return prev;
                        return { ...prev, [id]: [...currentArr, nextWithOffset] };
                    });
                    setIndicatorQueues(prev => ({ ...prev, [id]: rest }));
                    if (!indicatorTimeouts.current[next.id]) {
                        indicatorTimeouts.current[next.id] = setTimeout(() => {
                            setVisibleDamageIndicators(current => {
                                const arr = (current[id] || []).filter(e => e.id !== next.id);
                                return { ...current, [id]: arr };
                            });
                            const entityRef = battleData[id];
                            if (entityRef && Array.isArray(entityRef.damageIndicators)) {
                                entityRef.damageIndicators = entityRef.damageIndicators.filter(e => e && e.id !== next.id);
                            }
                            delete indicatorTimeouts.current[next.id];
                        }, 2000);
                    }
                } else {
                    const neededDelay = STAGGER_DELAY - timeDiff;
                    if (nextCheckDelay === null || neededDelay < nextCheckDelay) {
                        nextCheckDelay = neededDelay;
                    }
                }
            });

            if (nextCheckDelay !== null) {
                activeTimeout = setTimeout(processQueues, nextCheckDelay);
            }
        };

        processQueues();

        return () => {
            if (activeTimeout) clearTimeout(activeTimeout);
        };
    }, [indicatorQueues, visibleDamageIndicators, battleData]);

    React.useEffect(() => {
        Object.values(battleData).forEach(entity => {
            if (entity && typeof entity.inTrial === 'number') {
                prevCoordsRef.current[entity.id] = false;
            }
        });
    }, [battleData]);

    // ── Refs ─────────────────────────────────────────────────────────────────
    // portraitWrapperRefs kept for any external code that reads them
    const portraitWrapperRefs = React.useRef({});
    // Track previous coordinates to prevent animation from top-left on spawn/mount
    const prevCoordsRef = React.useRef({});
    // fighterWrapperRefs no longer needed (no fighter-wrapper element) but kept
    // so any ref captures still get a no-op assignment
    const fighterWrapperRefs = React.useRef({}); // eslint-disable-line no-unused-vars

    const [consumableFlashes, setConsumableFlashes] = React.useState({});
    const prevConsumableFlashRef = React.useRef({});

    React.useEffect(() => {
        crew.forEach(fighter => {
            const details = getFighterDetails(fighter);
            if (!details) return;
            const flashTs = details.consumableFlash?.timestamp;
            const prevFlashTs = prevConsumableFlashRef.current[fighter.id];
            if (flashTs && flashTs !== prevFlashTs) {
                prevConsumableFlashRef.current[fighter.id] = flashTs;
                setConsumableFlashes(prev => ({ ...prev, [fighter.id]: details.consumableFlash.iconKey }));
                if (consumableTimeoutsRef.current[fighter.id]) {
                    clearTimeout(consumableTimeoutsRef.current[fighter.id]);
                }
                consumableTimeoutsRef.current[fighter.id] = setTimeout(() => {
                    setConsumableFlashes(prev => ({ ...prev, [fighter.id]: null }));
                    delete consumableTimeoutsRef.current[fighter.id];
                }, 1500);
            }
        });
        return () => {
            Object.values(consumableTimeoutsRef.current).forEach(clearTimeout);
            consumableTimeoutsRef.current = {};
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [battleData, crew]);

    const isTeleporting = (id) => teleportingFighterId === id;



    // ── Shared: effect icon row ───────────────────────────────────────────────
    const renderEffectIcons = (unit) => (
        <div style={{ position: 'absolute', top: '-6px', right: '-6px', display: 'flex', gap: '2px', zIndex: 350, pointerEvents: 'none' }}>
            {getActiveEffects(unit, combatManager).map((eff) => {
                const roundsLeft = eff.roundsLeft || 0;
                const total = eff.totalDuration || 4;
                const roundDurationMs = combatManager?.roundDurationMs || (combatManager?.gameSpeed === 'fast' ? 1000 : 2000);
                
                let preciseRoundsLeft = 0;
                if (eff.endTimeMs && eff.totalDurationMs && eff.totalDurationMs > 0) {
                    // When paused, freeze the sweep at the moment combat was paused
                    const now = (combatManager?.combatPaused && combatManager?.pauseStartTimestamp)
                        ? combatManager.pauseStartTimestamp
                        : Date.now();
                    const timeLeftMs = eff.endTimeMs - now;
                    preciseRoundsLeft = Math.max(0, (timeLeftMs / eff.totalDurationMs) * total);
                } else {
                    const roundProgress = (combatManager?.roundTimeElapsedMs || 0) / roundDurationMs;
                    preciseRoundsLeft = roundsLeft > 0 ? Math.max(0, roundsLeft - roundProgress) : 0;
                }

                const segmentedDuration = eff.stackDuration || 0;
                const segmentedRoundsLeft = eff.segmented && segmentedDuration > 0
                    ? (() => {
                        const modulo = preciseRoundsLeft % segmentedDuration;
                        return modulo === 0 && preciseRoundsLeft > 0 ? segmentedDuration : modulo;
                    })()
                    : preciseRoundsLeft;
                const pctBase = eff.segmented && segmentedDuration > 0 ? segmentedDuration : total;
                let pct = pctBase > 0 ? Math.min(100, Math.max(0, (segmentedRoundsLeft / pctBase) * 100)) : 0;
                // Radial cooldown sweep math: radius=5, circumference=31.42
                const dashOffset = (pct / 100) * 31.42;
                const coords = getRadialLineCoordsFromPct(pct);
                const showBadge = eff.alwaysShowBadge ? (eff.stacks || 0) > 0 : (eff.stacks || 0) > 1;

                return (
                    <div key={eff.key} className="effect-icon-active" style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        backgroundColor: '#111', border: `2px solid ${eff.border}`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        position: 'relative',
                        overflow: 'visible'
                    }}>
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
                        {preciseRoundsLeft > 0 && (
                            <svg 
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    transform: 'rotate(-90deg)',
                                    pointerEvents: 'none',
                                    zIndex: 10
                                }}
                                viewBox="0 0 20 20"
                            >
                                <circle
                                    cx="10"
                                    cy="10"
                                    r="5"
                                    fill="none"
                                    stroke="rgba(0, 0, 0, 0.4)"
                                    strokeWidth="10"
                                    strokeDasharray="31.42"
                                    strokeDashoffset={dashOffset}
                                />
                                {coords && (
                                    <line
                                        x1="10"
                                        y1="10"
                                        x2={coords.x2}
                                        y2={coords.y2}
                                        stroke="#ffffff"
                                        strokeWidth="0.8"
                                    />
                                )}
                            </svg>
                        )}
                        {showBadge && (
                            <div style={{
                                position: 'absolute',
                                bottom: '-4px',
                                left: '-8px',
                                background: eff.badgeBackground || eff.border,
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                width: '12px',
                                height: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${eff.badgeBorder || '#111'}`,
                                zIndex: 11
                            }}>
                                {eff.stacks}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // ── Shared: stacked damage indicators ────────────────────────────────────
    const renderDamageIndicators = (unitId) => {
        const indicators = visibleDamageIndicators[unitId] || [];
        return (
            <div className="damage-indicator-container" style={{ overflow: 'visible' }}>
                {indicators.map((indicator, idx, arr) => {
                    const isStatDebuff = !indicator.isCrit && !indicator.isMiss && typeof indicator.value === 'string' && indicator.type !== 'robbed' && isNaN(indicator.value);
                    const xOffset = typeof indicator.xOffset === 'number' ? indicator.xOffset : 0;
                    const yOffset = typeof indicator.yOffset === 'number' ? indicator.yOffset : 0;

                    return (
                        <div
                            key={indicator.id}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                width: '100%',
                                margin: '0 auto',
                                transform: `translate(${xOffset}px, -${yOffset}px)`,
                                zIndex: 10 + (arr.length - idx),
                                pointerEvents: 'none'
                            }}
                        >
                            <div
                                className={`damage-indicator${isStatDebuff ? ' stat-debuff' : ''}${indicator.isCrit ? ' crit' : ''}${indicator.type === 'heal' ? ' heal' : ''}${indicator.type === 'robbed' ? ' robbed' : ''}${indicator.isMiss ? ' miss' : ''}`}
                            >
                                {formatDamageValue(indicator.value)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── Fighter rendering ─────────────────────────────────────────────────────
    const activeCrew = crew.filter(f => {
        const details = getFighterDetails(f);
        // Hide fighters who are currently in a Sphinx trial (off-board)
        const liveFighter = getLiveCombatant(f.id) || details || f;
        if (typeof liveFighter?.inTrial === 'number') return false;
        return battleData[f.id] && !details?.invisible && (!details?.dead || (showDeathAnimation[f.id] && !fullyDead[f.id]));
    });

    const renderFighter = (fighter) => {
        const details = getFighterDetails(fighter);
        const facingClass = details?.facing === 'left' ? 'reversed' : '';
        const verticalFacingClass = details?.facing === 'up' ? 'facing-up' : (details?.facing === 'down' ? 'facing-down' : '');
        const isTelep = isTeleporting(fighter.id);
        const coords = battleData[fighter.id]?.coordinates;
        if (!coords) return null;
        const xPos = tilePos(coords.x);
        const yPos = tilePos(coords.y);

        const isFirstRender = !prevCoordsRef.current[fighter.id];
        prevCoordsRef.current[fighter.id] = true;
        const shouldTransition = !isFirstRender;

        // Detect rift pushback overlay — use sweep-matched transition instead of the normal spring
        const riftPushbackAnim = activeAnimations.find(a =>
            a.type === 'rift_pushback' && a.sourceUnitId === fighter.id
        );

        const liveFighter = getLiveCombatant(fighter.id) || details || fighter;
        const berserkerBuffActive = Array.isArray(liveFighter.activeBuffs)
            && liveFighter.activeBuffs.some(b => b && ['barbarian_berserker', 'berserker'].includes((b.name || '').toLowerCase().replace(/\s+/g, '_')));
        const fighterSleepDebuff = Array.isArray(liveFighter.activeDebuffs)
            && liveFighter.activeDebuffs.some(d => d && d.name && ['sleep', 'sleep_spell'].includes(d.name.toLowerCase()) && (d.roundsLeft || 0) > 0);
        const isAsleepFighter = !!liveFighter.asleep || (liveFighter.sleepRounds || 0) > 0 || fighterSleepDebuff;
        const activeLeapAnim = activeAnimations.find((anim) => {
            if (anim.type !== 'leap_attack_jump') return false;
            if (anim.sourceUnitId) return anim.sourceUnitId === fighter.id;
            if (!anim.srcPx) return false;
            return Math.abs(anim.srcPx.x - (xPos + TILE_SIZE / 2)) < 1 && Math.abs(anim.srcPx.y - (yPos + TILE_SIZE / 2)) < 1;
        });
        const activeShieldSlamAnim = activeAnimations.find((anim) => {
            if (anim.type !== 'shield_slam_connect' && anim.type !== 'head_butt_lunge') return false;
            return anim.sourceUnitId === fighter.id;
        });
        const activeStompCast = activeAnimations.find((anim) => {
            if (anim.type !== 'stomp_cast') return false;
            return anim.sourceUnitId === fighter.id;
        });
        const activeFistOfHonorAnim = activeAnimations.find((anim) => {
            if (anim.type !== 'fist_of_honor_effect') return false;
            return anim.sourceUnitId === fighter.id;
        });

        const activeReturnTrialAnim = activeAnimations.find(a => 
            a.type === 'return_from_trial' && 
            (a.sourceUnitId === fighter.id || (Math.abs(a.tgtPx.x - (xPos + TILE_SIZE / 2)) < 5 && Math.abs(a.tgtPx.y - (yPos + TILE_SIZE / 2)) < 5))
        );

        // All visual-state classes go on the unit-tile (100×100) — no full-width ancestors
        const isDisintegrating = activeAnimations.some(a => a.type === 'disintegrate_beam' && a.tgtPx && Math.abs(a.tgtPx.x - xPos - TILE_SIZE/2) < 5 && Math.abs(a.tgtPx.y - yPos - TILE_SIZE/2) < 5);
        const unitTileClasses = [
            'unit-tile',
            'fighter-unit-tile',
            fighter.isLeader ? 'leader-unit-tile' : '',
            isTelep ? 'teleporting' : '',
            details?.rocked ? 'rocked' : '',
            details?.wounded ? 'hit' : '',
            details?.wounded ? (getHitAnimation ? getHitAnimation(details) : '') : '',
            details?.wounded ? 'hit-flash' : '',
            details?.facing === 'right' ? 'reversed' : '',
            (details?.stunned && !isAsleepFighter) ? 'stunned' : '',
            isDisintegrating ? 'disintegrate-shaking' : '',
            activeReturnTrialAnim ? 'respawn-fade-in' : '',
        ].filter(Boolean).join(' ');

        const portraitClasses = [
            'portrait', 'fighter-portrait',
            isTelep ? 'teleporting' : '',
            selectedFighter?.id === fighter.id && !fighter.dead ? 'selected' : '',
            details?.dead ? 'dead fighterDeadAnimation' : '',
            details?.active ? 'active' : '',
            facingClass, verticalFacingClass,
            details?.locked ? 'locked' : '',
            details?.chargingUpActive ? 'charging-up' : '',
            berserkerBuffActive && details?.feared && !details?.stunned ? 'berserk-feared' : '',
            berserkerBuffActive && (!details?.feared || details?.stunned) ? 'berserk-active' : '',
            !berserkerBuffActive && details?.feared ? 'feared' : '',
            getLiveCombatant(fighter.id)?.shieldWallActive ? 'shield-wall-active' : '',
            details?.drained ? 'drained' : '',
            details?.regenerating ? 'regenerating' : '',
            details?.healPulse ? 'heal-pulse' : '',
            details?.dispelPulse ? 'dispel-pulse' : '',
            details?.bleed ? 'bleeding' : '',
            details?.frozen ? 'frozen' : '',
            details?.activeDebuffs?.some(d => d && d.name === 'shadow_curse') ? 'shadow-cursed' : '',
            getLiveCombatant(fighter.id)?.astralBeingActive ? 'astral-being' : '',
            getLiveCombatant(fighter.id)?.astralProjectionActive ? 'astral-projection-active' : '',
            fighter.isLeader ? 'leader-portrait' : '',
            groupSelectedIds.includes(fighter.id) && !details?.dead ? 'group-selected' : '',
            details?.isCelebrating ? 'victory-celebrating' : '',
        ].filter(Boolean).join(' ');

        const isBatFlying = activeAnimations.some(a => a.type === 'bat_fly_anim' && a.sourceUnitId === fighter.id);
        const isEthereal = !!(liveFighter?.etherealSpeedActive || details?.etherealSpeedActive || fighter.etherealSpeedActive);

        return (
            <div
                key={fighter.id}
                id={`unit-tile-${fighter.id}`}
                className={unitTileClasses}
                style={{
                    position: 'absolute',
                    transform: `translate3d(${xPos}px, ${yPos}px, 0px)`,
                    width: `${TILE_SIZE}px`,
                    height: `${TILE_SIZE}px`,
                    overflow: 'visible',
                    pointerEvents: 'none',
                    zIndex: activeLeapAnim ? 350 : 300,
                    transition: (isTelep || isBatFlying || activeReturnTrialAnim || activeLeapAnim || liveFighter.attacking || !shouldTransition)
                        ? 'none'
                        : riftPushbackAnim
                            ? `transform ${riftPushbackAnim.duration}ms ease-out`
                            : `transform ${isEthereal ? 500 : 1000}ms cubic-bezier(0.25, 1, 0.5, 1)`,
                    opacity: isBatFlying ? 0 : 1,
                    ...computeHitVars(details || fighter, getHitAnimation, props.isMobileLandscape),
                }}
                ref={el => { portraitWrapperRefs.current[fighter.id] = el; }}
            >
                {renderEffectIcons(details || fighter)}
                {selectedFighter?.id === fighter.id && !fighter.dead && (
                    <div className="portrait-overlay" style={{ overflow: 'visible', zIndex: 0 }}>
                        <div className="circular-progress selected" style={{
                            background: `conic-gradient(${getManualMovementArcColor(getFighterDetails(fighter))} ${getManualMovementArc(getFighterDetails(fighter))}deg, transparent 0deg)`,
                        }}>
                            <div className="inner-circle" />
                        </div>
                    </div>
                )}
                <div
                    className="portrait-relative-container"
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'auto',
                        overflow: 'visible',
                        animation: activeLeapAnim 
                            ? `barbarianLeapTravel ${activeLeapAnim.duration / 1000}s linear both` 
                            : (activeShieldSlamAnim 
                                ? `${activeShieldSlamAnim.type === 'head_butt_lunge' ? 'headbuttLunge' : 'shieldSlamLunge'} ${activeShieldSlamAnim.duration / 1000}s ease-in-out both` 
                                : (activeFistOfHonorAnim
                                    ? `fistOfHonorLunge ${activeFistOfHonorAnim.duration / 1000}s ease-in-out both`
                                    : (activeStompCast
                                        ? `stompScale ${activeStompCast.duration / 1000}s ease-in-out both`
                                        : undefined))),
                        '--leap-dx': activeLeapAnim ? `${activeLeapAnim.dx}px` : '0px',
                        '--leap-dy': activeLeapAnim ? `${activeLeapAnim.dy}px` : '0px',
                        '--slam-dx': activeShieldSlamAnim ? `${activeShieldSlamAnim.tgtPx.x - activeShieldSlamAnim.srcPx.x}px` : '0px',
                        '--slam-dy': activeShieldSlamAnim ? `${activeShieldSlamAnim.tgtPx.y - activeShieldSlamAnim.srcPx.y}px` : '0px',
                        '--fist-dx': activeFistOfHonorAnim ? `${activeFistOfHonorAnim.tgtPx.x - activeFistOfHonorAnim.srcPx.x}px` : '0px',
                        '--fist-dy': activeFistOfHonorAnim ? `${activeFistOfHonorAnim.tgtPx.y - activeFistOfHonorAnim.srcPx.y}px` : '0px',
                        transformOrigin: '50% 50%',
                        willChange: (activeLeapAnim || activeShieldSlamAnim || activeFistOfHonorAnim || activeStompCast) ? 'transform' : 'auto',
                        zIndex: (activeLeapAnim || activeShieldSlamAnim || activeFistOfHonorAnim || activeStompCast) ? 4500 : undefined,
                        opacity: isBatFlying ? 0 : 1,
                        transition: 'opacity 0.25s ease-in-out'
                    }}
                >
                    <div
                        className={portraitClasses}
                        style={{
                            backgroundImage: `url("${resolvePortrait(
                                (fighter.type === 'archaic_familiar' && activeAnimations.some(a => a.sourceUnitId === fighter.id))
                                ? 'stone_familiar_glowing'
                                : fighter.portrait
                            )}")`,
                            opacity: getLiveCombatant(fighter.id)?.astralBeingActive ? 0.55 : 1,
                            filter: [
                                details?.chargingUpActive ? "url('#ripple-effect')" : null,
                                `sepia(${portraitHoveredId === fighter.id ? '2' : '0'})`,
                                details?.frozen ? 'hue-rotate(165deg) saturate(1.35) brightness(1.08) contrast(1.05)' : '',
                                (details?.berserkerActive && details?.feared && !details?.stunned) ? 'brightness(1.18)' : '',
                                meltScales[fighter.id] !== undefined ? `url('#melt-effect-${fighter.id}')` : null
                            ].filter(Boolean).join(' '),
                            transform: (getLiveCombatant(fighter.id)?.isUpsideDown || details?.isUpsideDown) ? 'rotate(180deg)' : undefined,
                            boxShadow: (getLiveCombatant(fighter.id)?.isSinisterReflection || details?.isSinisterReflection) ? '0 0 15px rgba(220, 20, 60, 0.8), inset 0 0 10px rgba(220, 20, 60, 0.5)' : undefined,
                            zIndex: 300,
                            animation: (getLiveCombatant(fighter.id)?.isSinisterReflection || details?.isSinisterReflection)
                                ? 'sinisterPulse 1.5s ease-in-out infinite alternate'
                                : ((details?.stunned && !isAsleepFighter && !details?.dead)
                                    ? 'stunWobble 0.6s ease-in-out infinite'
                                    : ((details?.wounded && !details?.dead)
                                        ? 'BulgePortrait var(--portrait-animation-duration, 420ms) var(--portrait-animation-timing, cubic-bezier(.2,.8,.2,1)) forwards'
                                        : undefined)),
                        }}

                        onClick={(e) => {
                            // Shift+click is handled by onMouseDown; block normal selection when shift is held
                            if (e.shiftKey) return;
                            fighterPortraitClicked(fighter.id);
                        }}
                        onMouseDown={(e) => {
                            if (!details?.dead && !details?.isMonster && !details?.isMinion) {
                                e.preventDefault();
                                const liveDetails = getLiveCombatant(fighter.id) || details || fighter;
                                if (e.shiftKey && onFighterShiftClick) {
                                    // Shift-click: add/remove from group selection (onClick won't fire after this due to the guard above)
                                    onFighterShiftClick(fighter.id);
                                } else if (onFighterMouseDown) {
                                    onFighterMouseDown(liveDetails, e);
                                }
                            }
                        }}
                        onContextMenu={(e) => {
                            if (!details?.dead && !details?.isMonster && !details?.isMinion && onFighterRightClick) {
                                e.preventDefault();
                                onFighterRightClick(fighter.id, e.clientX, e.clientY);
                            }
                        }}
                        onMouseEnter={() => portraitHovered(fighter.id)}
                        onMouseLeave={() => portraitHovered(null)}
                        onDragStart={(event) => onDragStart(fighter)}
                        draggable
                        onAnimationEnd={e => {
                            if (details?.dead && e.animationName && e.animationName.includes('meltDownDeath') && showDeathAnimation[fighter.id]) {
                                setFullyDead(prev => ({ ...prev, [fighter.id]: true }));
                                setShowDeathAnimation(prev => ({ ...prev, [fighter.id]: false }));
                            }
                        }}
                    />
                    {details?.marked && !details?.dead && (
                        <div style={{
                            position: 'absolute',
                            top: '18.75%',
                            left: '18.75%',
                            width: '62.5%',
                            height: '62.5%',
                            backgroundImage: `url(${images.ranger_mark?.default || images.ranger_mark})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            zIndex: 310,
                            animation: 'markPulse 1.5s infinite ease-in-out',
                            opacity: 0.25,
                            pointerEvents: 'none',
                        }}></div>
                    )}
                    {activeShieldSlamAnim && activeShieldSlamAnim.type === 'head_butt_lunge' && (
                        <div style={{
                            position: 'absolute',
                            top: '10%',
                            left: '10%',
                            width: '80%',
                            height: '80%',
                            backgroundImage: `url(${images.head_butt?.default || images.head_butt})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            zIndex: 350,
                            pointerEvents: 'none',
                        }}></div>
                    )}
                    {fighter.type === 'ranger' && details?.arrowNotched && details?.notchedArrowType && (
                        <div style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '-6px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#111',
                            border: '2px solid #ffb703',
                            backgroundImage: `url(${
                                details.notchedArrowType === 'ice' ? (images.ranger_ice_arrow?.default || images.ranger_ice_arrow) :
                                details.notchedArrowType === 'force' ? (images.ranger_force_arrow?.default || images.ranger_force_arrow) :
                                details.notchedArrowType === 'poison' ? (images.ranger_poison_arrow?.default || images.ranger_poison_arrow) :
                                (images.ranger_celestial_arrow?.default || images.ranger_celestial_arrow)
                            })`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            zIndex: 350,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            animation: 'scaleUp 0.2s ease-out'
                        }} />
                    )}
                    {details?.wounded && <div className="hit-flash-overlay" />}
                    {/* Ensnare Visual Overlay – green vine corners matching Sandbox */}
                    {details?.ensnared && !details?.dead && (
                        details.ensnaredSourceAbility === 'bind' ? (
                            <div style={{
                                position: 'absolute',
                                left: 0, top: 0, width: '100%', height: '100%',
                                pointerEvents: 'none',
                                zIndex: 315,
                            }}>
                                <svg style={{
                                    position: 'absolute',
                                    left: 0, top: 0, width: '100%', height: '100%',
                                }} viewBox="0 0 100 100">
                                    <path d="M 10,25 C 30,15 70,35 90,25 M 5,50 C 25,65 75,35 95,50 M 10,75 C 30,65 70,85 90,75 M 20,10 C 10,40 40,60 30,90 M 80,10 C 90,40 60,60 70,90" 
                                          fill="none" 
                                          stroke="#ffffff" 
                                          strokeWidth="5" 
                                          strokeLinecap="round"
                                          style={{ 
                                              filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8)) drop-shadow(0 0 2px rgba(0,0,0,0.8))',
                                              strokeDasharray: '300',
                                              strokeDashoffset: '300',
                                              animation: 'drawRopes 0.8s ease-out forwards'
                                          }} 
                                    />
                                </svg>
                            </div>
                        ) : (
                            <div style={{
                                boxSizing: 'border-box',
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                border: '3px solid #8bc34a',
                                borderRadius: '6px',
                                boxShadow: '0 0 18px rgba(139, 195, 74, 0.9), inset 0 0 10px rgba(139, 195, 74, 0.4)',
                                pointerEvents: 'none',
                                zIndex: 315
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
                        )
                    )}
                    {/* Poison Overlay (pulsing green glow) */}
                    {details?.poison && !details?.dead && (
                        <div style={{
                            boxSizing: 'border-box',
                            position: 'absolute',
                            top: 0, left: 0, width: '100%', height: '100%',
                            borderRadius: '6px',
                            pointerEvents: 'none',
                            zIndex: 314,
                            animation: 'poisonPulseGlow 1.5s ease-in-out infinite alternate',
                            border: '2px solid rgba(56, 176, 0, 0.6)'
                        }} />
                    )}
                    {/* Bleed Overlay (pulsing red glow) */}
                    {details?.bleed && !details?.dead && (
                        <div style={{
                            boxSizing: 'border-box',
                            position: 'absolute',
                            top: 0, left: 0, width: '100%', height: '100%',
                            borderRadius: '6px',
                            pointerEvents: 'none',
                            zIndex: 314,
                            animation: 'bleedPulseGlow 1.5s ease-in-out infinite alternate',
                            border: '2px solid rgba(224, 85, 85, 0.6)'
                        }} />
                    )}
                    {/* Betrayal Overlay (pulsing pink glow) */}
                    {(details?.betrayed || (details?.activeDebuffs && details.activeDebuffs.some(d => d && (d.name === 'Betrayed' || d.name === 'betrayed')))) && !details?.dead && (
                        <div style={{
                            boxSizing: 'border-box',
                            position: 'absolute',
                            top: 0, left: 0, width: '100%', height: '100%',
                            borderRadius: '6px',
                            pointerEvents: 'none',
                            zIndex: 314,
                            animation: 'betrayalPulseGlow 1.5s ease-in-out infinite alternate',
                            border: '2px solid rgba(255, 0, 255, 0.6)'
                        }} />
                    )}
                    {/* Dominated Overlay (pulsing gold glow) */}
                    {(details?.dominated || (details?.activeDebuffs && details.activeDebuffs.some(d => d && (d.name === 'Dominated' || d.name === 'dominated')))) && !details?.dead && (
                        <div style={{
                            boxSizing: 'border-box',
                            position: 'absolute',
                            top: 0, left: 0, width: '100%', height: '100%',
                            borderRadius: '6px',
                            pointerEvents: 'none',
                            zIndex: 314,
                            animation: 'dominatedPulseGlow 1.5s ease-in-out infinite alternate',
                            border: '2px solid rgba(255, 215, 0, 0.6)'
                        }} />
                    )}
                    {/* Madness Overlay (cycling purple/magenta/teal glow + floating glyphs) */}
                    {(details?.madness || (details?.activeDebuffs && details.activeDebuffs.some(d => d && (d.name === 'Madness' || d.name === 'madness')))) && !details?.dead && (
                        <>
                            <div style={{
                                boxSizing: 'border-box',
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                borderRadius: '6px',
                                pointerEvents: 'none',
                                zIndex: 314,
                                animation: 'madnessPulseGlow 2.5s ease-in-out infinite alternate',
                                border: '2.5px solid rgba(176, 96, 255, 0.8)'
                            }} />
                            {/* Floating psyche-fracture glyphs */}
                            {[{ char: '?', left: '18%', delay: '0s', color: '#b060ff' },
                              { char: '!', left: '60%', delay: '0.9s', color: '#ff00c8' },
                              { char: '※', left: '38%', delay: '1.7s', color: '#00e6ff' }].map((g, gi) => (
                                <div key={gi} style={{
                                    position: 'absolute',
                                    bottom: '75%',
                                    left: g.left,
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    color: g.color,
                                    textShadow: `0 0 6px ${g.color}`,
                                    pointerEvents: 'none',
                                    zIndex: 315,
                                    animation: `madnessSymbolFloat 2.2s ease-out infinite ${g.delay}`,
                                    userSelect: 'none'
                                }}>{g.char}</div>
                            ))}
                        </>
                    )}
                    {/* Dripping Acid Drops */}
                    {details?.poison && !details?.dead && (images.acid_drop || images.poison) && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, width: '100%', height: '100%',
                            pointerEvents: 'none',
                            zIndex: 315,
                            overflow: 'hidden',
                            borderRadius: '6px'
                        }}>
                            <img
                                src={images.acid_drop?.default || images.acid_drop || images.poison?.default || images.poison}
                                alt="drip 1"
                                style={{
                                    position: 'absolute',
                                    left: '20%',
                                    width: '10px',
                                    height: '15px',
                                    animation: 'acidDrip 2s linear infinite'
                                }}
                            />
                            <img
                                src={images.acid_drop?.default || images.acid_drop || images.poison?.default || images.poison}
                                alt="drip 2"
                                style={{
                                    position: 'absolute',
                                    left: '70%',
                                    width: '8px',
                                    height: '12px',
                                    animation: 'acidDrip 2.4s linear infinite 0.7s'
                                }}
                            />
                            <img
                                src={images.acid_drop?.default || images.acid_drop || images.poison?.default || images.poison}
                                alt="drip 3"
                                style={{
                                    position: 'absolute',
                                    left: '45%',
                                    width: '12px',
                                    height: '18px',
                                    animation: 'acidDrip 1.7s linear infinite 1.3s'
                                }}
                            />
                        </div>
                    )}
                    {(() => {
                        if (isAsleepFighter && !details?.dead) {
                            return (
                                <>
                                    <div style={{ position: 'absolute', right: '15%', top: '20%', color: '#90caf9', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 320 }}>Z</div>
                                    <div style={{ position: 'absolute', right: '35%', top: '30%', color: '#90caf9', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite 0.6s', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 320 }}>Z</div>
                                    <div style={{ position: 'absolute', right: '22%', top: '42%', color: '#42a5f5', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite 1.2s', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 320 }}>Z</div>
                                </>
                            );
                        }
                        return null;
                    })()}
                    {fighter.type === 'monk' && getLiveCombatant(fighter.id)?.etherealSpeedActive && (
                        <div style={{
                            position: 'absolute',
                            top: '-10px', left: '-10px', right: '-10px', bottom: '-10px',
                            zIndex: 290,
                            border: '3px solid rgba(255, 221, 87, 0.95)',
                            boxShadow: '0 0 25px 8px #ffdd57, inset 0 0 12px 4px #ffdd57',
                            background: 'rgba(255, 221, 87, 0.15)',
                            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                            animation: 'organicGlow 4s linear infinite',
                            pointerEvents: 'none'
                        }} />
                    )}
                    {!details?.dead && fighter.type !== 'darkness_sphere' && (
                        <div className="indicators-wrapper" style={{
                            zIndex: 310,
                            position: 'absolute',
                            bottom: 0,
                            top: 'auto',
                            left: 0,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column-reverse',
                            pointerEvents: 'none',
                            opacity: greetingInProcess ? 0 : 1,
                            transition: 'opacity 0.5s ease-in-out'
                        }}>
                            <div className="hp-bar" style={{ position: 'relative', bottom: 'auto', top: 'auto', height: '4px' }}>
                                <div className="red-fill" style={{
                                    width: greetingInProcess ? '0%' : `${(getFighterDetails(fighter)?.hp / fighter.stats.hp) * 100}%`,
                                    transition: 'width 1.2s cubic-bezier(0.15, 0.85, 0.35, 1)'
                                }} />
                            </div>
                            {combatManager && combatManager.round !== undefined ? (
                                <div className="endurance-bar" style={{ height: '2px', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', position: 'relative', bottom: 'auto', top: 'auto' }}>
                                    <div className="white-fill" style={{
                                        height: '100%',
                                        backgroundColor: '#ffffff',
                                        width: greetingInProcess ? '0%' : `${(getFighterDetails(fighter)?.endurance / getFighterDetails(fighter)?.maxEndurance) * 100}%`,
                                        transition: 'width 1.2s cubic-bezier(0.15, 0.85, 0.35, 1)'
                                    }} />
                                </div>
                            ) : null}
                        </div>
                    )}
                    {details?.stunned && !isAsleepFighter && !details?.dead && !details?.paradoxEngineActive && (
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '60px',
                            height: '20px',
                            pointerEvents: 'none',
                            zIndex: 350,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {/* Tilted Ellipse Ring */}
                            <div style={{
                                position: 'absolute',
                                width: '50px',
                                height: '12px',
                                borderRadius: '50%',
                                border: '1.2px dashed rgba(255, 221, 87, 0.45)',
                                boxShadow: '0 0 4px rgba(255, 221, 87, 0.15)',
                                pointerEvents: 'none'
                            }} />
                            {/* Orbiting Star 1 */}
                            <div style={{
                                position: 'absolute',
                                fontSize: '12px',
                                color: '#ffe600',
                                textShadow: '0 0 5px #ffe600',
                                animation: 'birdieOrbit1 1.6s linear infinite',
                                fontWeight: 'bold',
                                userSelect: 'none'
                            }}>
                                ✦
                            </div>
                            {/* Orbiting Star 2 */}
                            <div style={{
                                position: 'absolute',
                                fontSize: '12px',
                                color: '#ffdd57',
                                textShadow: '0 0 5px #ffdd57',
                                animation: 'birdieOrbit2 1.6s linear infinite',
                                fontWeight: 'bold',
                                userSelect: 'none'
                            }}>
                                ✦
                            </div>
                        </div>
                    )}
                    {getLiveCombatant(fighter.id)?.arcaneBarrierActive && (
                        <div style={{
                            position: 'absolute',
                            width: '130%',
                            height: '130%',
                            left: '-15%',
                            top: '-15%',
                            zIndex: 340,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                border: '3px solid rgba(255, 84, 0, 0.85)',
                                boxShadow: '0 0 25px rgba(255, 84, 0, 0.7), inset 0 0 15px rgba(255, 84, 0, 0.4)',
                                position: 'relative',
                                animation: 'spin-slow 20s linear infinite',
                            }}>
                                {['\u16A0', '\u16A2', '\u16A6', '\u16A8', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                                    const angle = (i / 12) * 360;
                                    const radius = 42;
                                    const rad = (angle - 90) * (Math.PI / 180);
                                    return (
                                        <span
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                left: `${50 + radius * Math.cos(rad)}%`,
                                                top: `${50 + radius * Math.sin(rad)}%`,
                                                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                                                color: 'rgba(255, 84, 0, 0.95)',
                                                fontSize: '21px',
                                                textShadow: '0 0 8px rgba(255, 84, 0, 1)',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {rune}
                                        </span>
                                    );
                                })}
                                <div style={{
                                    position: 'absolute',
                                    top: '15%',
                                    left: '15%',
                                    width: '70%',
                                    height: '70%',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(255, 84, 0, 0.3)',
                                }} />
                            </div>
                        </div>
                    )}
                </div>
                {animationOverlays[fighter.id] && getAllOverlaysById(fighter.id).map((overlay, i) => (
                    <Overlay key={i} animationType={overlay.type} data={{ ...overlay.data, dead: details?.dead }} />
                ))}
                <div className={`portrait-overlay${details?.drained ? ' drained' : ''}${details?.frozen ? ' frozen' : ''}`} style={{ overflow: 'visible', zIndex: 2, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 0 }}>
                    {renderDamageIndicators(fighter.id)}
                </div>
                {/* Target indicator */}
                {(() => {
                    const liveFighter = getLiveCombatant(fighter.id);
                    const target = liveFighter?.targetId ? getLiveCombatant(liveFighter.targetId) : null;
                    return target?.portrait && !target?.invisible && !details?.dead ? (
                        <div className="monster-target-indicator" style={{ zIndex: 310, position: 'absolute' }}>
                            <div className="monster-target-portrait" style={{ backgroundImage: `url("${resolvePortrait(target.portrait)}")` }} />
                        </div>
                    ) : null;
                })()}
                {consumableFlashes[fighter.id] && !details?.dead && (
                    <div className="fighter-consumable-indicator" style={{ zIndex: 310, position: 'absolute' }}>
                        <div className="fighter-consumable-portrait" style={{ backgroundImage: `url("${resolvePortrait(consumableFlashes[fighter.id])}")` }} />
                    </div>
                )}

                {(() => {
                    const hasPerceiveActive = details && activeAnimations.some(anim => anim.type === 'perceive_anim' && Math.floor(anim.srcPx.x / CELL_SIZE) === details.coordinates.x && Math.floor(anim.srcPx.y / CELL_SIZE) === details.coordinates.y);
                    const hasEnergyDrainActive = details && activeAnimations.some(anim => anim.type === 'energy_drain_beam' && Math.floor(anim.tgtPx.x / CELL_SIZE) === details.coordinates.x && Math.floor(anim.tgtPx.y / CELL_SIZE) === details.coordinates.y);
                    const hasMeditateActive = details && activeAnimations.some(anim => anim.type === 'monk_meditate' && anim.srcPx && Math.floor(anim.srcPx.x / CELL_SIZE) === details.coordinates.x && Math.floor(anim.srcPx.y / CELL_SIZE) === details.coordinates.y);
                    const hasHeartbeatActive = Object.values(battleData).some(m =>
                        m && m.isMonster && !m.dead && m.activeBuffs && m.activeBuffs.some(b => b.name === 'Crimson Sight')
                    );
                    const hasEyeActive = details?.activeBuffs && details.activeBuffs.some(b => b.name === 'Crimson Sight');

                    return (
                        <>
                            {hasPerceiveActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    border: '2px solid #ff007f',
                                    backgroundImage: `url(${images.perceive})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 0 10px #ff007f',
                                    zIndex: 320,
                                    animation: 'hoverFloat 2s ease-in-out forwards'
                                }} />
                            )}
                            {hasEnergyDrainActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    border: '2px solid #ff00ff',
                                    backgroundImage: `url(${images.energy_drain})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 0 10px #ff00ff',
                                    zIndex: 320,
                                    animation: 'hoverFloat 1.5s ease-in-out forwards'
                                }} />
                            )}
                            {hasMeditateActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    border: '2px solid #ffdd57',
                                    backgroundImage: `url(${images.monk_meditate})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 0 10px #ffdd57',
                                    zIndex: 320,
                                    animation: 'hoverFloat 1.8s ease-in-out forwards'
                                }} />
                            )}
                            {hasEyeActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    border: '2px solid #ff3333',
                                    backgroundImage: `url(${images.crimson_sight?.default || images.crimson_sight})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 0 10px #ff3333',
                                    zIndex: 320,
                                    animation: 'hoverFloatLoop 2s ease-in-out infinite'
                                }} />
                            )}
                            {hasHeartbeatActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-21px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '42px',
                                    height: '42px',
                                    backgroundImage: `url(${images.heartbeat?.default || images.heartbeat})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    zIndex: 320,
                                    animation: 'heartbeatPulse 0.9s infinite ease-in-out'
                                }} />
                            )}
                        </>
                    );
                })()}
            </div>
        );
    };

    // ── Monster/minion rendering ──────────────────────────────────────────────
    const renderMonsterUnit = (unit) => {
        const isMonster = unit.isMonster;
        const isMinion = unit.isMinion;
        const isDead = unit.dead;
        const shouldShow = !unit.invisible && (!isDead || unit.bifurcating || (showDeathAnimation[unit.id] && !fullyDead[unit.id]));
        if (!shouldShow) return null;
        if (!unit.coordinates) return null;

        const hitAnim = getHitAnimation ? getHitAnimation(unit) : '';
        const xPos = tilePos(unit.coordinates.x);
        const yPos = tilePos(unit.coordinates.y);
        const isTelep = isTeleporting(unit.id);

        const isHuge = checkHuge(unit);
        const isLarge = checkLarge(unit);
        const width = isHuge 
            ? TILE_SIZE * 3 + (SHOW_TILE_BORDERS ? 4 : 0) 
            : (isLarge ? TILE_SIZE * 2 + (SHOW_TILE_BORDERS ? 2 : 0) : TILE_SIZE);
        const height = isHuge 
            ? TILE_SIZE * 3 + (SHOW_TILE_BORDERS ? 4 : 0) 
            : (isLarge ? TILE_SIZE * 2 + (SHOW_TILE_BORDERS ? 2 : 0) : TILE_SIZE);

        const hOffset = isHuge 
            ? ((unit.coordinates.x >= 4) ? -TILE_SIZE * 2 - (SHOW_TILE_BORDERS ? 4 : 0) : 0)
            : ((isLarge && unit.coordinates.x >= 4) ? -TILE_SIZE - (SHOW_TILE_BORDERS ? 2 : 0) : 0);
        const vOffset = isHuge 
            ? -TILE_SIZE * 2 - (SHOW_TILE_BORDERS ? 4 : 0) 
            : (isLarge ? -TILE_SIZE - (SHOW_TILE_BORDERS ? 2 : 0) : 0);

        const isMainMonster = unit.isMainMonster || (isMonster && !isMinion);
        const showEnlarged = greetingInProcess && isMainMonster && !props.isMobileLandscape;
        const numCols = props.numColumns || combatManager?.numColumns || 8;
        const boardWidth = numCols * TILE_SIZE + (SHOW_TILE_BORDERS ? numCols * 2 : 0);
        const centeredLeft = (boardWidth - width) / 2;

        const leftPos = showEnlarged ? centeredLeft : (xPos + hOffset);
        const topPos = yPos + vOffset;

        const isFirstRender = !prevCoordsRef.current[unit.id];
        prevCoordsRef.current[unit.id] = true;
        const shouldTransition = !isFirstRender;

        // Detect rift pushback overlay — use sweep-matched transition instead of the normal spring
        const riftPushbackAnim = activeAnimations.find(a =>
            a.type === 'rift_pushback' && a.sourceUnitId === unit.id
        );

        const isDisintegrating = activeAnimations.some(a => a.type === 'disintegrate_beam' && a.tgtPx && Math.abs(a.tgtPx.x - (leftPos + width/2)) < 15 && Math.abs(a.tgtPx.y - (topPos + height/2)) < 15);
        const isBatFlying = activeAnimations.some(a => a.type === 'bat_fly_anim' && a.sourceUnitId === unit.id);
        const activeShieldSlamAnim = activeAnimations.find((anim) => {
            if (anim.type !== 'shield_slam_connect' && anim.type !== 'head_butt_lunge') return false;
            return anim.sourceUnitId === unit.id;
        });
        const activeStompCast = activeAnimations.find((anim) => {
            if (anim.type !== 'stomp_cast') return false;
            return anim.sourceUnitId === unit.id;
        });
        const activeFistOfHonorAnim = activeAnimations.find((anim) => {
            if (anim.type !== 'fist_of_honor_effect') return false;
            return anim.sourceUnitId === unit.id;
        });
        const liveMonster = getLiveCombatant(unit.id) || unit;
        const monsterSleepDebuff = Array.isArray(liveMonster.activeDebuffs)
            && liveMonster.activeDebuffs.some(d => d && d.name && ['sleep', 'sleep_spell'].includes(d.name.toLowerCase()) && (d.roundsLeft || 0) > 0);
        const isAsleepMonster = !!liveMonster.asleep || (liveMonster.sleepRounds || 0) > 0 || monsterSleepDebuff;
        const activeReturnTrialAnim = activeAnimations.find(a => 
            a.type === 'return_from_trial' && 
            (a.sourceUnitId === unit.id || (Math.abs(a.tgtPx.x - (leftPos + width / 2)) < 5 && Math.abs(a.tgtPx.y - (topPos + height / 2)) < 5))
        );

        // All state classes go on unit-tile — not on any full-width wrapper
        const unitTileClasses = [
            'unit-tile',
            isMinion ? 'minion-unit-tile' : 'monster-unit-tile',
            isHuge ? 'huge-monster-unit-tile' : (isLarge ? 'large-monster-unit-tile' : ''),
            unit.rocked ? 'rocked' : '',
            unit.wounded ? 'hit' : '',
            unit.wounded ? hitAnim : '',
            unit.wounded ? 'hit-flash' : '',
            unit.facing === 'right' ? 'reversed' : '',
            (unit.stunned && !isAsleepMonster) ? 'stunned' : '',
            isDisintegrating ? 'disintegrate-shaking' : '',
            activeReturnTrialAnim ? 'respawn-fade-in' : '',
        ].filter(Boolean).join(' ');

        const portraitClasses = [
            'portrait',
            isMinion ? 'minion-portrait' : 'monster-portrait',
            isHuge ? 'huge-portrait' : (isLarge ? 'large-portrait' : ''),
            showEnlarged ? 'enlarged' : '',
            unit.active ? 'active' : '',
            portraitHoveredId === unit.id ? 'hover-linked-target' : '',
            unit.bifurcating ? 'bifurcatingAnimation' : (isDead ? (unit.type === 'mummy' || unit.key === 'mummy' || isLarge || isHuge ? 'dead mummyDeadAnimation' : 'dead monsterDeadAnimation') : ''),
            unit.isBifurcateSmall ? 'bifurcate-copy' : '',
            unit.isBifurcateCopy ? 'bifurcate-copy-spawning' : '',
            unit.missed ? (unit.facing === 'right' ? 'missed-reversed' : 'missed') : '',
            selectedMonster?.id === unit.id ? 'selected' : '',
            unit.facing === 'right' ? 'reversed' : '',
            unit.facing === 'up' ? 'facing-up' : '',
            unit.facing === 'down' ? 'facing-down' : '',
            liveMonster.chargingUpActive ? 'charging-up' : '',
            liveMonster.regenerating ? 'regenerating' : '',
            liveMonster.bleed ? 'bleeding' : '',
            liveMonster.frozen ? 'frozen' : '',
            liveMonster.activeDebuffs?.some(d => d && d.name === 'shadow_curse') ? 'shadow-cursed' : '',
            unit.fadingIn ? 'minion-fade-in' : '',
            unit.image === 'witch_transformed' ? 'witch-demon-portrait' : '',
            liveMonster?.beholderInvisible ? 'beholder-invisible' : '',
        ].filter(Boolean).join(' ');

        let hashmallimFilter = '';
        if (unit.type === 'hashmallim' || unit.key === 'hashmallim') {
            const hasSaturateAnim = activeAnimations.some(anim => {
                const isCaster = anim.casterId === unit.id;
                return isCaster && (
                    anim.type === 'dominate_success_overlay' ||
                    anim.type === 'dominate_fail_overlay' ||
                    anim.type === 'bombard_emission' ||
                    (anim.type === 'bombard_strike' && anim.isMeteors)
                );
            });

            const hasInvertAnim = activeAnimations.some(anim => {
                const isCaster = anim.casterId === unit.id;
                return isCaster && (
                    anim.type === 'overload_success_overlay' ||
                    anim.type === 'overload_fail_overlay'
                );
            });

            if (hasInvertAnim) {
                hashmallimFilter = 'invert(1)';
            } else if (hasSaturateAnim) {
                hashmallimFilter = 'saturate(46.5)';
            }
        }

        const isEthereal = !!(liveMonster?.etherealSpeedActive || unit.etherealSpeedActive);

        return (
            <div
                key={unit.id}
                className={unitTileClasses}
                style={{
                    position: 'absolute',
                    transform: `translate3d(${leftPos}px, ${topPos}px, 0px)`,
                    width: `${width}px`,
                    height: `${height}px`,
                    overflow: 'visible',
                    pointerEvents: 'none',
                    zIndex: isDead ? 0 : (isMonster ? 200 : 100),
                    transition: (isTelep || isBatFlying || activeReturnTrialAnim || !shouldTransition)
                        ? 'none'
                        : riftPushbackAnim
                            ? `transform ${riftPushbackAnim.duration}ms ease-out`
                            : `transform ${isEthereal ? 500 : 1000}ms cubic-bezier(0.25, 1, 0.5, 1)`,
                    opacity: typeof unit.opacity === 'number' ? unit.opacity : (isBatFlying ? 0 : 1),
                    ...computeHitVars(unit, getHitAnimation, props.isMobileLandscape),
                }}
            >
                {renderEffectIcons(unit)}
                <div
                    className="portrait-relative-container"
                    onMouseEnter={() => portraitHovered(unit.id)}
                    onMouseLeave={() => portraitHovered(null)}
                    onClick={() => monsterCombatPortraitClicked(unit.id)}
                    style={{
                        position: 'relative',
                        pointerEvents: (unit.opacity === 0) ? 'none' : 'auto',
                        width: '100%',
                        height: '100%',
                        borderRadius: '8px',
                        overflow: 'visible',
                        opacity: typeof unit.opacity === 'number' ? unit.opacity : (isBatFlying ? 0 : 1),
                        animation: activeShieldSlamAnim 
                            ? `${activeShieldSlamAnim.type === 'head_butt_lunge' ? 'headbuttLunge' : 'shieldSlamLunge'} ${activeShieldSlamAnim.duration / 1000}s ease-in-out both` 
                            : (activeFistOfHonorAnim
                                ? `fistOfHonorLunge ${activeFistOfHonorAnim.duration / 1000}s ease-in-out both`
                                : (activeStompCast
                                    ? `stompScale ${activeStompCast.duration / 1000}s ease-in-out both`
                                    : undefined)),
                        '--slam-dx': activeShieldSlamAnim ? `${activeShieldSlamAnim.tgtPx.x - activeShieldSlamAnim.srcPx.x}px` : '0px',
                        '--slam-dy': activeShieldSlamAnim ? `${activeShieldSlamAnim.tgtPx.y - activeShieldSlamAnim.srcPx.y}px` : '0px',
                        '--fist-dx': activeFistOfHonorAnim ? `${activeFistOfHonorAnim.tgtPx.x - activeFistOfHonorAnim.srcPx.x}px` : '0px',
                        '--fist-dy': activeFistOfHonorAnim ? `${activeFistOfHonorAnim.tgtPx.y - activeFistOfHonorAnim.srcPx.y}px` : '0px',
                        willChange: (activeShieldSlamAnim || activeFistOfHonorAnim || activeStompCast) ? 'transform' : 'auto',
                        zIndex: (activeShieldSlamAnim || activeFistOfHonorAnim || activeStompCast) ? 4500 : undefined,
                        transition: typeof unit.opacityTransition === 'string' ? unit.opacityTransition : 'opacity 0.25s ease-in-out'
                    }}
                >
                    <div
                        className={portraitClasses}
                        style={{
                            backgroundImage: unit.portrait ? `url("${resolvePortrait(
                                (unit.type === 'archaic_familiar' && activeAnimations.some(a => a.sourceUnitId === unit.id))
                                ? 'stone_familiar_glowing'
                                : unit.portrait
                            )}")` : 'none',
                            backgroundSize: undefined,
                            backgroundPosition: undefined,
                            filter: `${unit.portraitFilter || ''} sepia(${portraitHoveredId === unit.id ? '2' : '0'}) ${liveMonster.frozen ? 'hue-rotate(165deg) saturate(1.35) brightness(1.08) contrast(1.05)' : ''} ${meltScales[unit.id] !== undefined ? `url(#melt-effect-${unit.id})` : ''} ${hashmallimFilter}`.trim(),
                            zIndex: isMinion ? 2 : 1,
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            transform: showEnlarged
                                ? `scale(3) ${unit.facing === 'right' ? 'scaleX(-1)' : ''}`.trim()
                                : ((isLarge || isHuge)
                                    ? `${unit.isUpsideDown ? 'rotate(180deg)' : ''} ${unit.facing === 'right' ? 'scaleX(-1)' : ''} ${(greetingInProcess && !props.isMobileLandscape) ? 'scale(1.5)' : ''}`.trim() || 'none'
                                    : (unit.isUpsideDown 
                                        ? 'rotate(180deg)' 
                                        : (unit.type === 'spider_minion' ? 'scale(0.5)' : undefined))),
                            transformOrigin: showEnlarged ? 'center' : undefined,
                            boxShadow: unit.isSinisterReflection ? '0 0 15px rgba(220, 20, 60, 0.8), inset 0 0 10px rgba(220, 20, 60, 0.5)' : undefined,
                            borderRadius: '0',
                            transition: 'filter 0.25s ease-in-out',
                            maskImage: unit.type === 'darkness_sphere' ? 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 72%)' : undefined,
                            WebkitMaskImage: unit.type === 'darkness_sphere' ? 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 72%)' : undefined,
                            animation: unit.isSinisterReflection
                                ? 'sinisterPulse 1.5s ease-in-out infinite alternate'
                                : (unit.type === 'darkness_sphere'
                                    ? 'sphereOfDarknessFadeIn 1.5s cubic-bezier(0.19, 1, 0.22, 1) forwards'
                                    : ((unit.stunned && !isAsleepMonster && !isDead)
                                        ? 'stunWobble 0.6s ease-in-out infinite'
                                        : ((unit.wounded && !isDead)
                                            ? 'BulgePortrait var(--portrait-animation-duration, 420ms) var(--portrait-animation-timing, cubic-bezier(.2,.8,.2,1)) forwards'
                                            : undefined)))
                        }}
                        onAnimationEnd={e => {
                            if (isDead && e.animationName && e.animationName.includes('meltDownDeath') && showDeathAnimation[unit.id]) {
                                setFullyDead(prev => ({ ...prev, [unit.id]: true }));
                                setShowDeathAnimation(prev => ({ ...prev, [unit.id]: false }));
                            }
                            if (e.animationName && e.animationName.includes('bifurcateShrink')) {
                                setFullyDead(prev => ({ ...prev, [unit.id]: true }));
                            }
                        }}
                    >
                        {unit.isLord && unit.lordBadge && (
                            <div 
                                className="lord-badge"
                                style={{
                                    backgroundImage: `url("${resolvePortrait(`${unit.lordBadge}_badge`)}")`
                                }}
                            />
                        )}
                        {SHOW_MONSTER_IDS ? unit.id : null}
                        {unit.wounded && <div className="hit-flash-overlay" />}
                        {unit.type === 'darkness_sphere' && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: '100%',
                                    height: '100%',
                                    backgroundImage: `url(${images['invoke_darkness']})`,
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    zIndex: 10,
                                    animation: 'invokeDarknessSkillTransition 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                        {(() => {
                            if (isAsleepMonster && !isDead) {
                                return (
                                    <>
                                        <div style={{ position: 'absolute', right: '15%', top: '20%', color: '#90caf9', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 320 }}>Z</div>
                                        <div style={{ position: 'absolute', right: '35%', top: '30%', color: '#90caf9', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite 0.6s', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 320 }}>Z</div>
                                        <div style={{ position: 'absolute', right: '22%', top: '42%', color: '#42a5f5', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', animation: 'zzzFloat 2s infinite 1.2s', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 320 }}>Z</div>
                                    </>
                                );
                            }
                            return null;
                        })()}
                        {/* Poison Overlay (pulsing green glow) */}
                        {liveMonster?.poison && !isDead && (
                            <div style={{
                                boxSizing: 'border-box',
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                borderRadius: '6px',
                                pointerEvents: 'none',
                                zIndex: 14,
                                animation: 'poisonPulseGlow 1.5s ease-in-out infinite alternate',
                                border: '2px solid rgba(56, 176, 0, 0.6)'
                            }} />
                        )}
                        {liveMonster?.poison && !isDead && (images.acid_drop || images.poison) && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                pointerEvents: 'none',
                                zIndex: 15,
                                overflow: 'hidden',
                                borderRadius: '6px'
                            }}>
                                <img
                                    src={images.acid_drop?.default || images.acid_drop || images.poison?.default || images.poison}
                                    alt="drip 1"
                                    style={{
                                        position: 'absolute',
                                        left: '20%',
                                        width: '10px',
                                        height: '15px',
                                        animation: 'acidDrip 2s linear infinite'
                                    }}
                                />
                                <img
                                    src={images.acid_drop?.default || images.acid_drop || images.poison?.default || images.poison}
                                    alt="drip 2"
                                    style={{
                                        position: 'absolute',
                                        left: '70%',
                                        width: '8px',
                                        height: '12px',
                                        animation: 'acidDrip 2.4s linear infinite 0.7s'
                                    }}
                                />
                                <img
                                    src={images.acid_drop?.default || images.acid_drop || images.poison?.default || images.poison}
                                    alt="drip 3"
                                    style={{
                                        position: 'absolute',
                                        left: '45%',
                                        width: '12px',
                                        height: '18px',
                                        animation: 'acidDrip 1.7s linear infinite 1.3s'
                                    }}
                                />
                            </div>
                        )}
                        {/* Bleed Overlay (pulsing red glow) */}
                        {liveMonster?.bleed && !isDead && (
                            <div style={{
                                boxSizing: 'border-box',
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                borderRadius: '6px',
                                pointerEvents: 'none',
                                zIndex: 14,
                                animation: 'bleedPulseGlow 1.5s ease-in-out infinite alternate',
                                border: '2px solid rgba(224, 85, 85, 0.6)'
                            }} />
                        )}
                        {/* Betrayal Overlay (pulsing pink glow) */}
                        {(liveMonster?.betrayed || liveMonster?.activeDebuffs?.some(d => d && d.name === 'Betrayed')) && !isDead && (
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
                        {/* Dominated Overlay (pulsing gold glow) */}
                        {(liveMonster?.dominated || liveMonster?.activeDebuffs?.some(d => d && d.name === 'Dominated')) && !isDead && (
                            <div style={{
                                boxSizing: 'border-box',
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                borderRadius: '6px',
                                pointerEvents: 'none',
                                zIndex: 14,
                                animation: 'dominatedPulseGlow 1.5s ease-in-out infinite alternate',
                                border: '2px solid rgba(255, 215, 0, 0.6)'
                            }} />
                        )}
                        {/* Madness Overlay (cycling purple/magenta/teal glow + floating glyphs) */}
                        {(liveMonster?.madness || liveMonster?.activeDebuffs?.some(d => d && d.name === 'Madness')) && !isDead && (
                            <>
                                <div style={{
                                    boxSizing: 'border-box',
                                    position: 'absolute',
                                    top: 0, left: 0, width: '100%', height: '100%',
                                    borderRadius: '6px',
                                    pointerEvents: 'none',
                                    zIndex: 14,
                                    animation: 'madnessPulseGlow 2.5s ease-in-out infinite alternate',
                                    border: '2.5px solid rgba(176, 96, 255, 0.8)'
                                }} />
                                {/* Floating psyche-fracture glyphs */}
                                {[{ char: '?', left: '18%', delay: '0s', color: '#b060ff' },
                                  { char: '!', left: '60%', delay: '0.9s', color: '#ff00c8' },
                                  { char: '※', left: '38%', delay: '1.7s', color: '#00e6ff' }].map((g, gi) => (
                                    <div key={gi} style={{
                                        position: 'absolute',
                                        bottom: '75%',
                                        left: g.left,
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        color: g.color,
                                        textShadow: `0 0 6px ${g.color}`,
                                        pointerEvents: 'none',
                                        zIndex: 15,
                                        animation: `madnessSymbolFloat 2.2s ease-out infinite ${g.delay}`,
                                        userSelect: 'none'
                                    }}>{g.char}</div>
                                ))}
                            </>
                        )}
                    </div>
                    {liveMonster?.marked && !isDead && (
                        <div style={{
                            position: 'absolute',
                            top: '-12.5%',
                            left: '-12.5%',
                            width: '125%',
                            height: '125%',
                            backgroundImage: `url(${images.ranger_mark?.default || images.ranger_mark})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            zIndex: 12,
                            animation: 'markPulse 1.5s infinite ease-in-out',
                            opacity: 0.25,
                            pointerEvents: 'none',
                        }}></div>
                    )}
                    {activeShieldSlamAnim && activeShieldSlamAnim.type === 'head_butt_lunge' && (
                        <div style={{
                            position: 'absolute',
                            top: '10%',
                            left: '10%',
                            width: '80%',
                            height: '80%',
                            backgroundImage: `url(${images.head_butt?.default || images.head_butt})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            zIndex: 350,
                            pointerEvents: 'none',
                        }}></div>
                    )}
                    {/* Ensnare Visual Overlay – green vine corners matching Sandbox */}
                    {liveMonster?.ensnared && !isDead && (
                        liveMonster.ensnaredSourceAbility === 'bind' ? (
                            <div style={{
                                position: 'absolute',
                                left: 0, top: 0, width: '100%', height: '100%',
                                pointerEvents: 'none',
                                zIndex: 13,
                            }}>
                                <svg style={{
                                    position: 'absolute',
                                    left: 0, top: 0, width: '100%', height: '100%',
                                }} viewBox="0 0 100 100">
                                    <path d="M 10,25 C 30,15 70,35 90,25 M 5,50 C 25,65 75,35 95,50 M 10,75 C 30,65 70,85 90,75 M 20,10 C 10,40 40,60 30,90 M 80,10 C 90,40 60,60 70,90" 
                                          fill="none" 
                                          stroke="#ffffff" 
                                          strokeWidth="5" 
                                          strokeLinecap="round"
                                          style={{ 
                                              filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8)) drop-shadow(0 0 2px rgba(0,0,0,0.8))',
                                              strokeDasharray: '300',
                                              strokeDashoffset: '300',
                                              animation: 'drawRopes 0.8s ease-out forwards'
                                          }} 
                                    />
                                </svg>
                            </div>
                        ) : (
                            <div style={{
                                boxSizing: 'border-box',
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
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
                        )
                    )}
                    {unit.stunned && !isAsleepMonster && !isDead && !unit.paradoxEngineActive && (
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '60px',
                            height: '20px',
                            pointerEvents: 'none',
                            zIndex: 350,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {/* Tilted Ellipse Ring */}
                            <div style={{
                                position: 'absolute',
                                width: '50px',
                                height: '12px',
                                borderRadius: '50%',
                                border: '1.2px dashed rgba(255, 221, 87, 0.45)',
                                boxShadow: '0 0 4px rgba(255, 221, 87, 0.15)',
                                pointerEvents: 'none'
                            }} />
                            {/* Orbiting Star 1 */}
                            <div style={{
                                position: 'absolute',
                                fontSize: '12px',
                                color: '#ffe600',
                                textShadow: '0 0 5px #ffe600',
                                animation: 'birdieOrbit1 1.6s linear infinite',
                                fontWeight: 'bold',
                                userSelect: 'none'
                            }}>
                                ✦
                            </div>
                            {/* Orbiting Star 2 */}
                            <div style={{
                                position: 'absolute',
                                fontSize: '12px',
                                color: '#ffdd57',
                                textShadow: '0 0 5px #ffdd57',
                                animation: 'birdieOrbit2 1.6s linear infinite',
                                fontWeight: 'bold',
                                userSelect: 'none'
                            }}>
                                ✦
                            </div>
                        </div>
                    )}
                    {fearCastingActive && !unit.isMinion && <div className="fear-cast-glow" />}
                    <div className={`portrait-overlay ${liveMonster.frozen ? 'frozen' : ''}`} style={{ zIndex: 2, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 0, overflow: 'visible' }}>
                        {renderDamageIndicators(unit.id)}
                    </div>
                    {/* Target indicator */}
                    {(() => {
                        const target = unit.targetId ? combatManager?.getCombatant?.(unit.targetId) : null;
                        return target?.portrait && !isDead ? (
                            <div className="monster-target-indicator" style={{ zIndex: 10 }}>
                                <div className="monster-target-portrait" style={{ backgroundImage: `url(${resolvePortrait(target.portrait)})` }} />
                            </div>
                        ) : null;
                    })()}
                    {/* Stolen item */}
                    {(() => {
                        const stolenImg = unit.stolenItemIcon ? resolvePortrait(unit.stolenItemIcon) : null;
                        return stolenImg && !isDead ? (
                            <div className="monster-stolen-item-indicator" style={{ zIndex: 10 }}>
                                <div className="monster-stolen-item-portrait" style={{ backgroundImage: `url(${stolenImg})` }} />
                            </div>
                        ) : null;
                    })()}
                    {liveMonster?.arcaneBarrierActive && (
                        <div style={{
                            position: 'absolute',
                            width: '130%',
                            height: '130%',
                            left: '-15%',
                            top: '-15%',
                            zIndex: 340,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                border: '3px solid rgba(255, 84, 0, 0.85)',
                                boxShadow: '0 0 25px rgba(255, 84, 0, 0.7), inset 0 0 15px rgba(255, 84, 0, 0.4)',
                                position: 'relative',
                                animation: 'spin-slow 20s linear infinite',
                            }}>
                                {['\u16A0', '\u16A2', '\u16A6', '\u16A8', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                                    const angle = (i / 12) * 360;
                                    const radius = 42;
                                    const rad = (angle - 90) * (Math.PI / 180);
                                    return (
                                        <span
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                left: `${50 + radius * Math.cos(rad)}%`,
                                                top: `${50 + radius * Math.sin(rad)}%`,
                                                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                                                color: 'rgba(255, 84, 0, 0.95)',
                                                fontSize: isMinion ? '13px' : (isLarge ? '26px' : '20px'),
                                                textShadow: '0 0 8px rgba(255, 84, 0, 1)',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {rune}
                                        </span>
                                    );
                                })}
                                <div style={{
                                    position: 'absolute',
                                    top: '15%',
                                    left: '15%',
                                    width: '70%',
                                    height: '70%',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(255, 84, 0, 0.3)',
                                }} />
                            </div>
                        </div>
                    )}
                </div>
                {animationOverlays[unit.id] && getAllOverlaysById(unit.id).map((overlay, i) => (
                    <Overlay key={i} animationType={overlay.type} data={{ ...overlay.data, dead: isDead }} />
                ))}
                {(() => {
                    const hasPerceiveActive = activeAnimations.some(anim => anim.type === 'perceive_anim' && Math.floor(anim.srcPx.x / CELL_SIZE) === unit.coordinates.x && Math.floor(anim.srcPx.y / CELL_SIZE) === unit.coordinates.y);
                    const hasEnergyDrainActive = activeAnimations.some(anim => anim.type === 'energy_drain_beam' && Math.floor(anim.tgtPx.x / CELL_SIZE) === unit.coordinates.x && Math.floor(anim.tgtPx.y / CELL_SIZE) === unit.coordinates.y);
                    const hasHeartbeatActive = Object.values(battleData).some(f =>
                        f && !f.isMonster && !f.dead && f.activeBuffs && f.activeBuffs.some(b => b.name === 'Crimson Sight')
                    );
                    const hasEyeActive = liveMonster?.activeBuffs && liveMonster.activeBuffs.some(b => b.name === 'Crimson Sight');

                    return (
                        <>
                            {hasPerceiveActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    border: '2px solid #ff007f',
                                    backgroundImage: `url(${images.perceive})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 0 10px #ff007f',
                                    zIndex: 320,
                                    animation: 'hoverFloat 2s ease-in-out forwards'
                                }} />
                            )}
                            {hasEnergyDrainActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    border: '2px solid #ff00ff',
                                    backgroundImage: `url(${images.energy_drain})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 0 10px #ff00ff',
                                    zIndex: 320,
                                    animation: 'hoverFloat 1.5s ease-in-out forwards'
                                }} />
                            )}
                            {hasEyeActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    border: '2px solid #ff3333',
                                    backgroundImage: `url(${images.crimson_sight?.default || images.crimson_sight})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 0 10px #ff3333',
                                    zIndex: 320,
                                    animation: 'hoverFloatLoop 2s ease-in-out infinite'
                                }} />
                            )}
                            {hasHeartbeatActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-21px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '42px',
                                    height: '42px',
                                    backgroundImage: `url(${images.heartbeat?.default || images.heartbeat})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    zIndex: 320,
                                    animation: 'heartbeatPulse 0.9s infinite ease-in-out'
                                }} />
                            )}
                        </>
                    );
                })()}

                {!isDead && unit.type !== 'darkness_sphere' && (
                    <div className="indicators-wrapper" style={{
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        position: 'absolute',
                        bottom: 0,
                        top: 'auto',
                        left: 0,
                        width: '100%',
                        pointerEvents: 'none',
                        opacity: greetingInProcess ? 0 : 1,
                        transition: 'opacity 0.5s ease-in-out'
                    }}>
                        <div className="monster-hp-bar hp-bar" style={{ position: 'relative', bottom: 'auto', top: 'auto', height: '4px' }}>
                            <div className="red-fill" style={{
                                width: greetingInProcess ? '0%' : `${(unit.hp / (unit.stats?.hp || unit.starting_hp || 1)) * 100}%`,
                                transition: 'width 1.2s cubic-bezier(0.15, 0.85, 0.35, 1)'
                            }} />
                        </div>
                        {!(unit.type && String(unit.type).includes('spider')) && (
                            combatManager && combatManager.round !== undefined ? (
                                <div className="endurance-bar" style={{ height: '2px', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', position: 'relative', bottom: 'auto', top: 'auto' }}>
                                    <div className="white-fill" style={{
                                        height: '100%',
                                        backgroundColor: '#ffffff',
                                        width: greetingInProcess ? '0%' : `${(unit.endurance / unit.maxEndurance) * 100}%`,
                                        transition: 'width 1.2s cubic-bezier(0.15, 0.85, 0.35, 1)'
                                    }} />
                                </div>
                            ) : (
                                <>
                                    <div className="monster-energy-bar energy-bar" style={{ position: 'relative', bottom: 'auto', top: 'auto', height: '4px' }}>
                                        <div className="yellow-fill" style={{
                                            width: greetingInProcess ? '0%' : `calc(${unit.energy}%)`,
                                            transition: 'width 1.2s cubic-bezier(0.15, 0.85, 0.35, 1)'
                                        }} />
                                    </div>
                                    <div className="tempo-bar" style={{ position: 'relative', bottom: 'auto', top: 'auto', height: '4px', opacity: greetingInProcess ? 0 : 1, transition: 'opacity 0.5s ease-in-out' }}>
                                        <div className="tempo-indicator" style={{
                                            left: greetingInProcess ? '0%' : `calc(${unit.tempo}% - 4px)`,
                                            transition: 'left 1.2s cubic-bezier(0.15, 0.85, 0.35, 1)'
                                        }} />
                                    </div>
                                </>
                            )
                        )}
                    </div>
                )}
            </div>
        );
    };

    // ── Sandbox-style CSS animation overlay ───────────────────────────────────
    const renderAnimation = (anim) => {
        if (!anim) return null;
        const key = anim.id;

        if (anim.type === 'eldritch_wind_overlay') {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(13, 238, 189, 0.25) 0%, rgba(3, 160, 90, 0.1) 70%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 3500,
                    animation: 'scaleUpFadeOut 1.5s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'paradox_warp_source' && anim.srcPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '100px',
                    height: '100px',
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle, #5b21b6 0%, #1e1b4b 60%, transparent 100%)',
                    boxShadow: '0 0 25px #8b5cf6, 0 0 50px #4c1d95',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'implodeVortex 1.0s ease-in-out forwards',
                }} />
            );
        }

        if (anim.type === 'paradox_warp_target' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '100px',
                    height: '100px',
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle, #8b5cf6 0%, #312e81 60%, transparent 100%)',
                    boxShadow: '0 0 25px #a78bfa, 0 0 50px #6d28d9',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'explodeVortex 1.0s ease-in-out forwards',
                }} />
            );
        }

        if (anim.type === 'paradox_fail_burst' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '80px',
                    height: '80px',
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
                    border: '2px dashed #ef4444',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'shatterBurst 1.0s ease-out forwards',
                }}>
                    <div style={{
                        color: '#ef4444',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        textAlign: 'center',
                        marginTop: '28px',
                        textShadow: '0 0 4px #000'
                    }}>RESISTED</div>
                </div>
            );
        }

        if (anim.type === 'betrayal_success_overlay' && anim.tgtPx) {
            const imgUrl = images.betrayal_hit?.default || images.betrayal_hit;
            const size = anim.isTargetLarge ? TILE_SIZE * 2 : TILE_SIZE;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    backgroundImage: `url(${imgUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    pointerEvents: 'none',
                    zIndex: 2500,
                    animation: 'betrayalHitFade 1.2s ease-out forwards'
                }} />
            );
        }

        if (anim.type === 'dominate_success_overlay' && anim.tgtPx) {
            const imgUrl = images.hashmallim_dominate?.default || images.hashmallim_dominate;
            const size = anim.isTargetLarge ? TILE_SIZE * 2.5 : TILE_SIZE * 1.5;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                }}>
                    {/* Golden Runic Ring spinning clockwise */}
                    <div style={{
                        position: 'absolute',
                        inset: '-10%',
                        border: '3px double #ffd700',
                        borderRadius: '50%',
                        boxShadow: '0 0 25px rgba(255, 215, 0, 0.8), inset 0 0 20px rgba(255, 215, 0, 0.6)',
                        animation: 'geomSpinClockwise 2s linear infinite, dominateRingIn 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }}>
                        {/* Golden Runes inside the ring */}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            animation: 'spin-slow 20s linear infinite',
                        }}>
                            {['\u16A0', '\u16A8', '\u16B1', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                                const angle = (i / 8) * 360;
                                const rad = (angle - 90) * (Math.PI / 180);
                                return (
                                    <span
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: `${50 + 40 * Math.cos(rad)}%`,
                                            top: `${50 + 40 * Math.sin(rad)}%`,
                                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                                            color: '#ffd700',
                                            fontSize: anim.isTargetLarge ? '26px' : '16px',
                                            textShadow: '0 0 8px #ffd700',
                                        }}
                                    >
                                        {rune}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Concentric smaller counter-spinning dashed ring */}
                    <div style={{
                        position: 'absolute',
                        inset: '10%',
                        border: '2px dashed #ffb700',
                        borderRadius: '50%',
                        boxShadow: '0 0 15px rgba(255, 183, 0, 0.7)',
                        animation: 'geomSpinCounter 1.5s linear infinite, dominateRingIn 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }} />

                    {/* Descending & Pulsing Golden Eye/Crown icon (using hashmallim_dominate) */}
                    <div style={{
                        position: 'absolute',
                        inset: '20%',
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        filter: 'drop-shadow(0 0 15px #ffd700) drop-shadow(0 0 30px #ffb700)',
                        animation: 'dominateIconDescend 2s cubic-bezier(0.19, 1, 0.22, 1) forwards',
                    }} />

                    {/* Dramatic flash burst overlay */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #ffffff 0%, #ffd700 60%, transparent 100%)',
                        animation: 'dominateFlash 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                    }} />

                    {/* Golden particles exploding outwards */}
                    {[...Array(8)].map((_, idx) => {
                        const angle = (idx * 360) / 8;
                        const rad = angle * (Math.PI / 180);
                        const dist = anim.isTargetLarge ? 120 : 70;
                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    width: '8px', height: '8px',
                                    backgroundColor: '#ffffff',
                                    border: '2px solid #ffd700',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 12px #ffd700',
                                    transform: 'translate(-50%, -50%)',
                                    animation: 'dominateParticleFly 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                                    animationDelay: '0.2s',
                                    '--target-x': `${Math.cos(rad) * dist}px`,
                                    '--target-y': `${Math.sin(rad) * dist}px`,
                                }}
                            />
                        );
                    })}
                </div>
            );
        }


        if (anim.type === 'madness_projectile' && anim.srcPx && anim.tgtPx) {
            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const colors = ['#b060ff', '#ff00c8', '#00e6ff'];
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '28px', height: '28px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4800,
                    '--proj-dx': `${dx}px`,
                    '--proj-dy': `${dy}px`,
                    animation: `madnessProjFly ${anim.duration || 650}ms cubic-bezier(0.4, 0, 0.6, 1) forwards`,
                }}>
                    {/* Psychic orb core */}
                    <div style={{
                        position: 'absolute', inset: '20%',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #ffffff 0%, #b060ff 50%, #ff00c8 100%)',
                        boxShadow: '0 0 15px #b060ff, 0 0 30px #ff00c8',
                    }} />
                    {/* Outer spinning ring */}
                    <div style={{
                        position: 'absolute', inset: '5%',
                        borderRadius: '50%',
                        border: '2px solid #00e6ff',
                        boxShadow: '0 0 8px #00e6ff',
                        animation: 'geomSpinClockwise 0.4s linear infinite',
                    }} />
                    {/* Trail sparks */}
                    {colors.map((c, ci) => (
                        <div key={ci} style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: '5px', height: '5px',
                            borderRadius: '50%',
                            backgroundColor: c,
                            boxShadow: `0 0 6px ${c}`,
                            transform: `translate(-50%, -50%) translateX(${-8 - ci * 6}px)`,
                            opacity: 0.7 - ci * 0.15,
                        }} />
                    ))}
                </div>
            );
        }

        if (anim.type === 'madness_cast_overlay' && anim.tgtPx) {
            const size = TILE_SIZE * 2.8;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4700,
                }}>
                    {/* Outer vortex ring: purple */}
                    <div style={{
                        position: 'absolute', inset: '-5%',
                        border: '3px solid #b060ff',
                        borderRadius: '50%',
                        boxShadow: '0 0 30px rgba(176, 96, 255, 0.9), inset 0 0 25px rgba(176, 96, 255, 0.6)',
                        animation: 'madnessCastRingIn 1.6s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }} />
                    {/* Inner counter-ring: magenta dashed */}
                    <div style={{
                        position: 'absolute', inset: '12%',
                        border: '2px dashed #ff00c8',
                        borderRadius: '50%',
                        boxShadow: '0 0 20px rgba(255, 0, 200, 0.7)',
                        animation: 'madnessCastRingInner 1.4s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }} />
                    {/* Innermost ring: teal dotted */}
                    <div style={{
                        position: 'absolute', inset: '28%',
                        border: '2px dotted #00e6ff',
                        borderRadius: '50%',
                        boxShadow: '0 0 12px rgba(0, 230, 255, 0.6)',
                        animation: 'madnessCastRingIn 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }} />
                    {/* Chaotic flash burst */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(176,96,255,0.6) 40%, rgba(255,0,200,0.3) 70%, transparent 100%)',
                        animation: 'madnessCastFlash 1.6s cubic-bezier(0.1, 0.8, 0.2, 1) forwards',
                    }} />
                    {/* Floating psyche-fracture runes in the vortex */}
                    {['?', '!', '※', '?', '!'].map((ch, ci) => {
                        const angle = (ci / 5) * 360 - 90;
                        const rad = angle * (Math.PI / 180);
                        const r = 38;
                        return (
                            <span key={ci} style={{
                                position: 'absolute',
                                left: `${50 + r * Math.cos(rad)}%`,
                                top: `${50 + r * Math.sin(rad)}%`,
                                transform: 'translate(-50%, -50%)',
                                fontSize: '18px', fontWeight: 'bold',
                                color: ['#b060ff', '#ff00c8', '#00e6ff', '#b060ff', '#ff00c8'][ci],
                                textShadow: `0 0 10px ${['#b060ff', '#ff00c8', '#00e6ff', '#b060ff', '#ff00c8'][ci]}`,
                                animation: 'madnessCastRingIn 1.6s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                                animationDelay: `${ci * 0.1}s`,
                                userSelect: 'none',
                            }}>{ch}</span>
                        );
                    })}
                    {/* Exploding tri-color particles */}
                    {[...Array(12)].map((_, idx) => {
                        const angle = (idx * 360) / 12;
                        const rad = angle * (Math.PI / 180);
                        const dist = 90;
                        const colorSet = ['#b060ff', '#ff00c8', '#00e6ff'];
                        const c = colorSet[idx % 3];
                        return (
                            <div key={idx} style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                width: '7px', height: '7px',
                                backgroundColor: '#ffffff',
                                border: `2px solid ${c}`,
                                borderRadius: '50%',
                                boxShadow: `0 0 10px ${c}`,
                                transform: 'translate(-50%, -50%)',
                                animation: 'madnessCastParticleFly 1.4s cubic-bezier(0.1, 0.8, 0.2, 1) forwards',
                                animationDelay: '0.15s',
                                '--target-x': `${Math.cos(rad) * dist}px`,
                                '--target-y': `${Math.sin(rad) * dist}px`,
                            }} />
                        );
                    })}
                </div>
            );
        }

        if (anim.type === 'madness_success_overlay' && anim.tgtPx) {
            const imgUrl = images.hashmallim_madness?.default || images.hashmallim_madness;
            const size = anim.isTargetLarge ? TILE_SIZE * 2.8 : TILE_SIZE * 1.8;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4600,
                }}>
                    {/* Expanding psychic shockwave ring */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        borderRadius: '50%',
                        border: '4px solid #b060ff',
                        boxShadow: '0 0 25px rgba(176, 96, 255, 0.9)',
                        animation: 'madnessSuccessShockwave 1.8s cubic-bezier(0.1, 0.8, 0.2, 1) forwards',
                    }} />
                    {/* Second shockwave: magenta, delayed */}
                    <div style={{
                        position: 'absolute', inset: '10%',
                        borderRadius: '50%',
                        border: '3px solid #ff00c8',
                        boxShadow: '0 0 18px rgba(255, 0, 200, 0.8)',
                        animation: 'madnessSuccessShockwave 1.6s cubic-bezier(0.1, 0.8, 0.2, 1) forwards',
                        animationDelay: '0.18s',
                    }} />
                    {/* Central madness icon with bloom */}
                    {imgUrl && (
                        <div style={{
                            position: 'absolute', inset: '22%',
                            backgroundImage: `url(${imgUrl})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            animation: 'madnessSuccessIcon 1.8s cubic-bezier(0.19, 1, 0.22, 1) forwards',
                        }} />
                    )}
                    {/* Mind-shatter particles (purple, magenta, teal, white) */}
                    {[...Array(16)].map((_, idx) => {
                        const angle = (idx * 360) / 16;
                        const rad = angle * (Math.PI / 180);
                        const dist = anim.isTargetLarge ? 130 : 85;
                        const colorSet = ['#b060ff', '#ff00c8', '#00e6ff', '#ffffff'];
                        const c = colorSet[idx % 4];
                        return (
                            <div key={idx} style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                width: idx % 4 === 3 ? '5px' : '7px',
                                height: idx % 4 === 3 ? '5px' : '7px',
                                backgroundColor: '#ffffff',
                                border: `2px solid ${c}`,
                                borderRadius: idx % 3 === 0 ? '2px' : '50%',
                                boxShadow: `0 0 10px ${c}`,
                                transform: 'translate(-50%, -50%)',
                                animation: 'madnessSuccessParticleFly 1.7s cubic-bezier(0.1, 0.8, 0.2, 1) forwards',
                                animationDelay: `${0.1 + idx * 0.04}s`,
                                '--target-x': `${Math.cos(rad) * dist}px`,
                                '--target-y': `${Math.sin(rad) * dist}px`,
                            }} />
                        );
                    })}
                    {/* Big central flash */}
                    <div style={{
                        position: 'absolute', inset: '-5%',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(176,96,255,0.5) 35%, rgba(255,0,200,0.25) 65%, transparent 100%)',
                        animation: 'madnessCastFlash 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                    }} />
                </div>
            );
        }

        if (anim.type === 'dominate_fail_overlay' && anim.tgtPx) {
            const imgUrl = images.hashmallim_dominate?.default || images.hashmallim_dominate;
            const size = anim.isTargetLarge ? TILE_SIZE * 2.5 : TILE_SIZE * 1.5;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                }}>
                    {/* Dark Red/Purple Runic Ring spinning clockwise but with fail animation */}
                    <div style={{
                        position: 'absolute',
                        inset: '-10%',
                        border: '3px double #ff0055',
                        borderRadius: '50%',
                        boxShadow: '0 0 25px rgba(255, 0, 85, 0.8), inset 0 0 20px rgba(255, 0, 85, 0.6)',
                        animation: 'geomSpinClockwise 2s linear infinite, dominateFailRingIn 1.5s ease-in-out forwards',
                    }}>
                        {/* Red/Purple Runes inside the ring */}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            animation: 'spin-slow 20s linear infinite',
                        }}>
                            {['\u16A0', '\u16A8', '\u16B1', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                                const angle = (i / 8) * 360;
                                const rad = (angle - 90) * (Math.PI / 180);
                                return (
                                    <span
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: `${50 + 40 * Math.cos(rad)}%`,
                                            top: `${50 + 40 * Math.sin(rad)}%`,
                                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                                            color: '#ff0055',
                                            fontSize: anim.isTargetLarge ? '26px' : '16px',
                                            textShadow: '0 0 8px #ff0055',
                                        }}
                                    >
                                        {rune}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Concentric smaller counter-spinning dashed ring in purple */}
                    <div style={{
                        position: 'absolute',
                        inset: '10%',
                        border: '2px dashed #800080',
                        borderRadius: '50%',
                        boxShadow: '0 0 15px rgba(128, 0, 128, 0.7)',
                        animation: 'geomSpinCounter 1.5s linear infinite, dominateFailRingIn 1.3s ease-in-out forwards',
                    }} />

                    {/* Descending & Pulsing Crimson Eye/Crown icon (using hue shift to turn gold into violet/red) */}
                    <div style={{
                        position: 'absolute',
                        inset: '20%',
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        filter: 'drop-shadow(0 0 15px #ff0055) sepia(1) saturate(10) hue-rotate(320deg)',
                        animation: 'dominateFailIconDescend 1.5s ease-in-out forwards',
                    }} />

                    {/* Violet/Red flash burst overlay */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #ffffff 0%, #ff0055 60%, transparent 100%)',
                        animation: 'dominateFailFlash 1.5s ease-in-out forwards',
                    }} />

                    {/* Violet particles exploding outwards */}
                    {[...Array(8)].map((_, idx) => {
                        const angle = (idx * 360) / 8;
                        const rad = angle * (Math.PI / 180);
                        const dist = anim.isTargetLarge ? 100 : 60;
                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    width: '6px', height: '6px',
                                    backgroundColor: '#ffffff',
                                    border: '2px solid #ff0055',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 8px #ff0055',
                                    transform: 'translate(-50%, -50%)',
                                    animation: 'dominateParticleFly 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                                    animationDelay: '0.1s',
                                    '--target-x': `${Math.cos(rad) * dist}px`,
                                    '--target-y': `${Math.sin(rad) * dist}px`,
                                }}
                            />
                        );
                    })}
                </div>
            );
        }

        if (anim.type === 'overload_success_overlay' && anim.tgtPx) {
            const imgUrl = images.hashmallim_overload?.default || images.hashmallim_overload;
            const size = anim.isTargetLarge ? TILE_SIZE * 3 : TILE_SIZE * 2;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                }}>
                    {/* Techno ring 1: Spinning cyan cyber-circle */}
                    <div style={{
                        position: 'absolute',
                        inset: '5%',
                        border: '2px solid #00f0ff',
                        borderRadius: '50%',
                        boxShadow: '0 0 20px rgba(0, 240, 255, 0.8), inset 0 0 15px rgba(0, 240, 255, 0.5)',
                        animation: 'geomSpinClockwise 1s linear infinite, overloadRingIn 0.5s ease-out forwards',
                    }} />

                    {/* Techno ring 2: Counter-spinning red dashed cyber-circle */}
                    <div style={{
                        position: 'absolute',
                        inset: '15%',
                        border: '2px dashed #ff3300',
                        borderRadius: '50%',
                        boxShadow: '0 0 15px rgba(255, 51, 0, 0.7)',
                        animation: 'geomSpinCounter 1.5s linear infinite, overloadRingIn 0.7s ease-out forwards',
                    }} />

                    {/* Shockwave expanding out */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '3px solid #ffffff',
                        boxShadow: '0 0 30px #00f0ff',
                        animation: 'overloadShockwave 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                    }} />

                    {/* Central Overload Icon (Warning sign / Energy core) */}
                    <div style={{
                        position: 'absolute',
                        inset: '25%',
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        animation: 'overloadIconPulse 1.8s ease-in-out forwards',
                    }} />

                    {/* Rapid lightning bolts/lines crackling */}
                    {[...Array(6)].map((_, idx) => {
                        const rot = idx * 60;
                        const delay = idx * 0.1;
                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    width: '4px', height: '40%',
                                    background: 'linear-gradient(to bottom, #ffffff, #00f0ff, transparent)',
                                    transform: `translate(-50%, -50%) rotate(${rot}deg) translateY(-30%)`,
                                    boxShadow: '0 0 8px #00f0ff',
                                    animation: 'overloadBolt 0.4s ease-out infinite alternate',
                                    animationDelay: `${delay}s`,
                                    '--rot': `${rot}deg`
                                }}
                            />
                        );
                    })}

                    {/* Exploding high-energy particles (cyan & red) */}
                    {[...Array(12)].map((_, idx) => {
                        const angle = (idx * 360) / 12;
                        const rad = angle * (Math.PI / 180);
                        const dist = anim.isTargetLarge ? 140 : 90;
                        const isCyan = idx % 2 === 0;
                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    width: isCyan ? '8px' : '6px',
                                    height: isCyan ? '8px' : '6px',
                                    backgroundColor: '#ffffff',
                                    border: `2px solid ${isCyan ? '#00f0ff' : '#ff3300'}`,
                                    borderRadius: '50%',
                                    boxShadow: `0 0 10px ${isCyan ? '#00f0ff' : '#ff3300'}`,
                                    transform: 'translate(-50%, -50%)',
                                    animation: 'overloadParticleFly 1.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                                    animationDelay: '0.1s',
                                    '--target-x': `${Math.cos(rad) * dist}px`,
                                    '--target-y': `${Math.sin(rad) * dist}px`,
                                }}
                            />
                        );
                    })}
                </div>
            );
        }

        if (anim.type === 'overload_fail_overlay' && anim.tgtPx) {
            const imgUrl = images.hashmallim_overload?.default || images.hashmallim_overload;
            const size = anim.isTargetLarge ? TILE_SIZE * 2.5 : TILE_SIZE * 1.5;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                }}>
                    {/* Unstable flickering cyber-ring */}
                    <div style={{
                        position: 'absolute',
                        inset: '10%',
                        border: '2px dotted #0088ff',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px rgba(0, 136, 255, 0.4)',
                        animation: 'geomSpinClockwise 3s linear infinite, overloadFailRing 1s ease-out forwards',
                    }} />

                    {/* Dimmed Overload Icon with split/crack blur */}
                    <div style={{
                        position: 'absolute',
                        inset: '25%',
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        filter: 'grayscale(0.8) contrast(0.5) blur(1px)',
                        opacity: 0.7,
                        animation: 'overloadFailIcon 1s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
                    }} />

                    {/* Warning text "✕ MISSED" floating up */}
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#ff3355',
                        fontFamily: "'Outfit', 'Inter', sans-serif",
                        fontSize: '14px',
                        fontWeight: 'bold',
                        letterSpacing: '1px',
                        textShadow: '0 0 6px rgba(255, 51, 85, 0.8)',
                        animation: 'overloadFailText 1s ease-out forwards',
                    }}>
                        ✕ MISSED
                    </div>

                    {/* Fizzling smoke particles drifting upwards */}
                    {[...Array(5)].map((_, idx) => {
                        const delay = idx * 0.12;
                        const xOffset = (idx - 2) * 12;
                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    bottom: '50%',
                                    left: `calc(50% + ${xOffset}px)`,
                                    width: '12px', height: '12px',
                                    backgroundColor: '#556677',
                                    borderRadius: '50%',
                                    filter: 'blur(2px)',
                                    opacity: 0.6,
                                    animation: 'overloadSmoke 0.9s ease-out forwards',
                                    animationDelay: `${delay}s`,
                                }}
                            />
                        );
                    })}
                </div>
            );
        }

        if (anim.type === 'stomp_shockwave' && anim.centerPx) {
            return (
                <div
                    key={key}
                    style={{
                        position: 'absolute',
                        left: `${anim.centerPx.x}px`,
                        top: `${anim.centerPx.y}px`,
                        transform: 'translate(-50%, -50%)',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '4px solid #ffdd57',
                        boxShadow: '0 0 15px #ffdd57, inset 0 0 10px #ffdd57',
                        animation: 'shockwaveExpand 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                        pointerEvents: 'none',
                        zIndex: 4500
                    }}
                />
            );
        }

        if (anim.type === 'headbutt_connect' && anim.tgtPx && anim.srcPx) {
            return null;
        }

        if (anim.type === 'bite_chomping' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '100px',
                    height: '100px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 5000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={images.bite_animation_top?.default || images.bite_animation_top}
                        alt="bite top"
                        style={{
                            position: 'absolute',
                            width: '90px',
                            height: '45px',
                            top: '5px',
                            objectFit: 'contain',
                            animation: 'biteCloseTop 0.7s ease-in-out forwards',
                            pointerEvents: 'none',
                            zIndex: 50
                        }}
                    />
                    <img
                        src={images.bite_animation_bottom?.default || images.bite_animation_bottom}
                        alt="bite bottom"
                        style={{
                            position: 'absolute',
                            width: '90px',
                            height: '45px',
                            bottom: '5px',
                            objectFit: 'contain',
                            animation: 'biteCloseBottom 0.7s ease-in-out forwards',
                            pointerEvents: 'none',
                            zIndex: 50
                        }}
                    />
                </div>
            );
        }

        if (anim.type === 'dragon_whirlwind_effect' && anim.centerPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.centerPx.x}px`,
                    top: `${anim.centerPx.y}px`,
                    width: '300px',
                    height: '300px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 5000,
                }}>
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: '50px',
                        height: '50px',
                        transform: 'translate(-50%, -50%)',
                        border: '4px double rgba(176, 224, 230, 0.8)',
                        borderRadius: '50%',
                        boxShadow: '0 0 30px rgba(176, 224, 230, 0.6)',
                        animation: 'windstormExpand 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) both',
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: '40px', left: '40px', right: '40px', bottom: '40px',
                        border: '2px dashed rgba(240, 248, 255, 0.7)',
                        borderRadius: '50%',
                        animation: 'windstormBobble 1.5s linear infinite',
                    }} />
                    {[...Array(4)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            transform: `rotate(${i * 45}deg)`,
                            transformOrigin: 'center center',
                            pointerEvents: 'none',
                        }}>
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: '50px',
                                height: '50px',
                                transform: 'translate(-50%, -50%)',
                                border: '1.5px solid rgba(135, 206, 235, 0.5)',
                                borderRadius: '50%',
                                animation: 'windstormExpand 1.5s ease-out both',
                                animationDelay: `${i * 0.15}s`,
                            }} />
                        </div>
                    ))}
                </div>
            );
        }

        if (anim.type === 'melee_whirlwind_effect' && anim.centerPx) {
            const sourceUnit = anim.sourceUnitId 
                ? ((combatManager && combatManager.combatants && combatManager.combatants[anim.sourceUnitId])
                    || crew.find(f => f.id === anim.sourceUnitId) 
                    || battleData[anim.sourceUnitId]) 
                : null;
            const isMonk = sourceUnit ? sourceUnit.type === 'monk' : (anim.abilityName === 'monk_whirlwind');
            
            let resolvedIcon = null;
            if (isMonk) {
                resolvedIcon = images.monk_punch?.default || images.monk_punch;
            } else if (sourceUnit) {
                const equippedWeapon = (sourceUnit.inventory || []).find(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === sourceUnit.id));
                const isBarbarian = sourceUnit.type === 'barbarian' || sourceUnit.class === 'barbarian';
                resolvedIcon = equippedWeapon 
                    ? (images[equippedWeapon.icon]?.default || images[equippedWeapon.icon] || images[equippedWeapon.id]?.default || images[equippedWeapon.id] || equippedWeapon.image || images[equippedWeapon.name]) 
                    : (isBarbarian ? (images.axe?.default || images.axe) : (images.longsword?.default || images.longsword));
            } else {
                resolvedIcon = images.axe?.default || images.axe;
            }

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.centerPx.x}px`,
                    top: `${anim.centerPx.y}px`,
                    width: '0px',
                    height: '0px',
                    zIndex: 5000,
                    pointerEvents: 'none',
                }}>
                    {[...Array(2)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '40px',
                            height: '40px',
                            animation: 'meleeWhirlwindSpin 1s cubic-bezier(0.2, 0.8, 0.2, 1) both',
                            animationDelay: `${i * 0.15}s`,
                        }}>
                            <img 
                                src={resolvedIcon} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain',
                                    filter: isMonk 
                                      ? 'drop-shadow(0 0 5px #ffaa00) drop-shadow(0 0 10px #ff5500)' 
                                      : 'drop-shadow(0 0 5px #ff3333) drop-shadow(0 0 10px #990000)',
                                }} 
                                alt="spinning-weapon"
                            />
                        </div>
                    ))}
                </div>
            );
        }

        if (anim.type === 'bombard_emission' && anim.centerPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.centerPx.x}px`,
                    top: `${anim.centerPx.y - 100}px`,
                    width: '300px',
                    height: '100px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                }}>
                    {[...Array(10)].map((_, i) => {
                        const delay = i * 0.04;
                        const size = 6 + (i % 3) * 3;
                        const leftOffset = ((i * 17) % 80 + 10);
                        const topOffset = ((i * 23) % 80 + 10);
                        const shadowColor = (i % 2 === 0) ? '#00ffff' : '#ffffff';
                        const signX1 = i % 2 === 0 ? 1 : -1;
                        const signX2 = i % 3 === 0 ? -1 : 1;
                        const signX3 = i % 4 === 0 ? 1 : -1;

                        const bx1 = signX1 * (20 + (i * 11) % 50);
                        const by1 = ((i * 7) % 30 - 15);
                        const bx2 = signX2 * (30 + (i * 13) % 70);
                        const by2 = ((i * 9) % 30 - 15);
                        const bx3 = signX3 * (40 + (i * 17) % 90);
                        const by3 = ((i * 11) % 30 - 15);
                        const sx = (signX1 * (30 + (i * 5) % 50));

                        return (
                            <div key={i} style={{
                                position: 'absolute',
                                left: `${leftOffset}%`,
                                top: `${topOffset}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                boxShadow: `0 0 10px ${shadowColor}, 0 0 20px ${shadowColor}, inset 0 0 5px #ffffff`,
                                animation: 'bombardParticle 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                                animationDelay: `${delay}s`,
                                '--bounce-x1': `${bx1}px`,
                                '--bounce-y1': `${by1}px`,
                                '--bounce-x2': `${bx2}px`,
                                '--bounce-y2': `${by2}px`,
                                '--bounce-x3': `${bx3}px`,
                                '--bounce-y3': `${by3}px`,
                                '--shoot-x': `${sx}px`,
                            }} />
                        );
                    })}
                </div>
            );
        }

        if (anim.type === 'bombard_strike' && anim.barrages) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: 0, top: 0, width: '100%', height: '100%',
                    pointerEvents: 'none',
                    zIndex: 4600,
                }}>
                    {anim.barrages.map((barrage, bIdx) => (
                        <React.Fragment key={bIdx}>
                            {barrage.beams.map((beam, i) => {
                                const delay = beam.delay;
                                const width = beam.width;
                                const left = beam.left;
                                const top = beam.top;
                                const glowColor = beam.glowColor;

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: `${barrage.tilePx.x + left}px`,
                                            top: `${barrage.tilePx.y + top}px`,
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: `-${width / 2}px`,
                                                width: `${width}px`,
                                                height: '800px',
                                                background: `linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 30%, ${glowColor} 70%, #ffffff 100%)`,
                                                boxShadow: `0 0 15px ${glowColor}, 0 0 30px ${glowColor}`,
                                                borderRadius: `${width / 2}px ${width / 2}px 0 0`,
                                                transformOrigin: 'bottom center',
                                                opacity: 0,
                                                animation: `bombardBeamFall 1.0s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s both`,
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '-50px',
                                                top: '-50px',
                                                width: '100px',
                                                height: '100px',
                                                borderRadius: '50%',
                                                background: `radial-gradient(circle, #ffffff 10%, ${glowColor} 50%, rgba(255, 255, 255, 0) 70%)`,
                                                boxShadow: `0 0 30px ${glowColor}, inset 0 0 15px #ffffff`,
                                                animation: `bombardBeamSplash 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) ${delay + 0.5}s forwards`,
                                                opacity: 0,
                                                transform: 'scale(0)'
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            );
        }

        if (anim.type === 'dragon_dispel_cast_icon' && anim.centerPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.centerPx.x}px`,
                    top: `${anim.centerPx.y - 180}px`,
                    width: '60px',
                    height: '60px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 5100,
                    backgroundImage: `url(${images.dispell})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    filter: 'drop-shadow(0 0 10px #9b5de5) drop-shadow(0 0 20px #00bfff)',
                    animation: 'floatIcon 1.5s ease-in-out forwards',
                }} />
            );
        }

        if (anim.type === 'dragon_dispel_wave' && anim.centerPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.centerPx.x}px`,
                    top: `${anim.centerPx.y}px`,
                    width: '200px',
                    height: '200px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4900,
                }}>
                    <div className="dragon-dispel-wave" />
                </div>
            );
        }

        if (anim.type === 'dragon_fire_breath' && anim.originPx) {
            const duration = anim.duration || 1500;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.originPx.x}px`,
                    top: `${anim.originPx.y}px`,
                    width: `${anim.length}px`,
                    height: '300px',
                    transformOrigin: '0 50%',
                    transform: `translateY(-50%) rotate(${anim.angle}deg)`,
                    pointerEvents: 'none',
                    zIndex: 4800,
                    overflow: 'visible',
                }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        transformOrigin: 'left center',
                        animation: `dragonBreathFlame ${duration}ms cubic-bezier(0.1, 0.8, 0.3, 1) forwards`,
                        overflow: 'visible',
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'conic-gradient(from 0deg at 0% 50%, transparent 70deg, rgba(0, 50, 255, 0.3) 76deg, rgba(0, 140, 255, 0.75) 84deg, #00e5ff 90deg, rgba(0, 140, 255, 0.75) 96deg, rgba(0, 50, 255, 0.3) 104deg, transparent 110deg)',
                            filter: 'blur(8px) drop-shadow(0 0 20px #00d4ff)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, white 25px, white calc(100% - 60px), transparent)',
                            maskImage: 'linear-gradient(to right, transparent, white 25px, white calc(100% - 60px), transparent)',
                            animation: 'dragonBreathFlicker 0.12s ease-in-out infinite alternate',
                        }} />
                    </div>
                </div>
            );
        }

        if (anim.type === 'vampiric_bite_chomping' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '120px',
                    height: '120px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 5000,
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${images.vamp_bite_background})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        animation: 'vampBiteBackgroundFade 1s ease-in-out forwards',
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${images.vamp_bite_top})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        animation: 'vampBiteCloseTop 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${images.vamp_bite_bottom})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        animation: 'vampBiteCloseBottom 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                    }} />
                </div>
            );
        }

        if (anim.type === 'bat_fly_anim' && anim.srcPx && anim.tgtPx) {
            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 4500,
                }}>
                    {[0, 1, 2, 3, 4].map(i => {
                        const delay = i * 0.1;
                        const offsetLeft = (i - 2) * 15;
                        const offsetTop = (i - 2) * 10;
                        return (
                            <div key={i} style={{
                                position: 'absolute',
                                left: `${anim.srcPx.x + offsetLeft}px`,
                                top: `${anim.srcPx.y + offsetTop}px`,
                                width: '30px',
                                height: '30px',
                                backgroundImage: `url(${images.bat_individual || images.bat_fly})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                animation: `batTravelMeander${i} 0.6s ease-in-out ${0.3 + delay}s forwards`,
                                '--fb-dx': `${dx}px`,
                                '--fb-dy': `${dy}px`,
                            }} />
                        );
                    })}
                </div>
            );
        }

        if (anim.type === 'soul_suck_beam' && anim.srcPx && anim.tgtPx) {
            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${len}px`,
                    height: '12px',
                    background: 'linear-gradient(to right, rgba(139, 0, 0, 0.1), #8b0000, #ff3333, #8b0000, rgba(139, 0, 0, 0.1))',
                    boxShadow: '0 0 12px #ff3333, 0 0 24px #8b0000',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg) translateY(-50%)`,
                    zIndex: 4000,
                    pointerEvents: 'none',
                    filter: 'blur(1px)',
                    animation: 'pinkBeamPulse 1s ease-out forwards',
                }} />
            );
        }

        if ((anim.type === 'claw_swipe' || anim.type === 'undead_grasp_swipe') && anim.midPx && anim.icon) {
            const sourceUnit = anim.sourceUnitId ? (combatManager?.getCombatant?.(anim.sourceUnitId) || battleData[anim.sourceUnitId]) : null;
            const isHugeSource = sourceUnit && (
                sourceUnit.huge === true
                || sourceUnit.type === 'dragon'
                || sourceUnit.tier === 4
                || sourceUnit.size === 3
                || sourceUnit.scale === 3
            );
            const scaleVal = isHugeSource ? 1.5 : 1.0;
            const isUndeadGrasp = anim.type === 'undead_grasp_swipe';
            // Rotated claw image placed between attacker and target
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.midPx.x}px`,
                    top: `${anim.midPx.y}px`,
                    width: '60px',
                    height: '60px',
                    transform: `translate(-50%, -50%) rotate(${anim.angle}deg) scale(${scaleVal})`,
                    pointerEvents: 'none',
                    zIndex: 5000,
                    filter: isUndeadGrasp ? 'hue-rotate(270deg) saturate(2.5) drop-shadow(0 0 8px rgba(147, 51, 234, 0.8))' : 'none'
                }}>
                    <img
                        src={anim.icon}
                        alt="claw swipe"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: '80px 30px',
                            animation: 'leftFacingClawArc 0.75s ease-in-out forwards'
                        }}
                    />
                </div>
            );
        }

        if (anim.type === 'claw_hit' && anim.tgtPx && anim.icon) {
            const sourceUnit = anim.sourceUnitId ? (combatManager?.getCombatant?.(anim.sourceUnitId) || battleData[anim.sourceUnitId]) : null;
            const isHugeSource = sourceUnit && (
                sourceUnit.huge === true
                || sourceUnit.type === 'dragon'
                || sourceUnit.tier === 4
                || sourceUnit.size === 3
                || sourceUnit.scale === 3
            );
            const scaleVal = isHugeSource ? 1.5 : 1.0;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x - 40}px`,
                    top: `${anim.tgtPx.y - 40}px`,
                    width: '80px',
                    height: '80px',
                    backgroundImage: `url(${anim.icon})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    pointerEvents: 'none',
                    zIndex: 5000,
                    transform: `scale(${scaleVal})`,
                    animation: 'fadeInOut 0.4s ease-in-out forwards',
                }} />
            );
        }

        if (anim.type === 'energy_drain_beam' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${anim.length}px`,
                    height: '8px',
                    background: 'linear-gradient(to right, rgba(255, 105, 180, 0.1), #ff69b4, #fff, #ff69b4, rgba(255, 105, 180, 0.1))',
                    boxShadow: '0 0 10px #ff69b4, 0 0 20px #ff1493',
                    transformOrigin: '0 50%',
                    transform: `rotate(${anim.angle}deg) translateY(-50%)`,
                    zIndex: 4000,
                    pointerEvents: 'none',
                    filter: 'blur(1.5px)',
                    animation: 'pinkBeamPulse 1.5s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'hex_overlay' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '120px',
                    height: '120px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                }}>
                    {/* Outer clockwise dashed ring */}
                    <div style={{
                        position: 'absolute',
                        top: '10px', left: '10px', right: '10px', bottom: '10px',
                        border: '2px dashed #ab47bc',
                        borderRadius: '50%',
                        boxShadow: '0 0 12px rgba(171, 71, 188, 0.6), inset 0 0 12px rgba(171, 71, 188, 0.6)',
                        animation: 'hexRingSpinCw 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }} />
                    {/* Inner counter-clockwise dotted ring */}
                    <div style={{
                        position: 'absolute',
                        top: '22px', left: '22px', right: '22px', bottom: '22px',
                        border: '1.5px dotted #e040fb',
                        borderRadius: '50%',
                        boxShadow: '0 0 8px rgba(224, 64, 251, 0.5), inset 0 0 8px rgba(224, 64, 251, 0.5)',
                        animation: 'hexRingSpinCcw 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }} />
                    {/* Overlapping glowing squares forming an 8-pointed star */}
                    <div style={{
                        position: 'absolute',
                        top: '32px', left: '32px', right: '32px', bottom: '32px',
                        border: '1.5px solid #d500f9',
                        boxShadow: '0 0 15px #d500f9',
                        transform: 'rotate(0deg)',
                        animation: 'hexStarPulse 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: '32px', left: '32px', right: '32px', bottom: '32px',
                        border: '1.5px solid #d500f9',
                        boxShadow: '0 0 15px #d500f9',
                        transform: 'rotate(45deg)',
                        animation: 'hexStarPulseOffset 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }} />
                    {/* Glowing core */}
                    <div style={{
                        position: 'absolute',
                        top: '45px', left: '45px', right: '45px', bottom: '45px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #ffffff 0%, #aa00ff 50%, transparent 100%)',
                        boxShadow: '0 0 20px #d500f9',
                        animation: 'hexCorePulse 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                    }} />
                    {/* Floating curse runes */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        color: '#d500f9',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        textShadow: '0 0 8px #d500f9',
                        transform: 'translate(-50%, -50%)',
                        animation: 'hexRuneFloat 1.5s ease-out forwards',
                    }}>
                        ☠
                    </div>
                    {/* Glowing particle burst */}
                    {[...Array(6)].map((_, idx) => {
                        const angle = (idx * 360) / 6;
                        const rad = angle * (Math.PI / 180);
                        const dist = 45; // Max distance
                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    width: '6px', height: '6px',
                                    backgroundColor: '#e040fb',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 8px #e040fb',
                                    transform: 'translate(-50%, -50%)',
                                    animation: `hexParticleFly 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`,
                                    '--target-x': `${Math.cos(rad) * dist}px`,
                                    '--target-y': `${Math.sin(rad) * dist}px`,
                                }}
                            />
                        );
                    })}
                </div>
            );
        }

        if (anim.type === 'shadow_curse_rings' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '120px',
                    height: '120px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                }}>
                    <div className="shadow-curse-ring ring-1" />
                    <div className="shadow-curse-ring ring-2" />
                    <div className="shadow-curse-ring ring-3" />
                </div>
            );
        }

        if (anim.type === 'induce_fear_overlay') {
            const hasTarget = !!anim.tgtPx;
            const width = hasTarget ? '95px' : '380px';
            const height = hasTarget ? '95px' : '380px';
            const left = hasTarget ? `${anim.tgtPx.x}px` : '50%';
            const top = hasTarget ? `${anim.tgtPx.y}px` : '50%';
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: left,
                    top: top,
                    transform: 'translate(-50%, -50%)',
                    width: width,
                    height: height,
                    backgroundImage: anim.icon ? `url(${anim.icon})` : `url(${images.induce_fear})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 0.5,
                    pointerEvents: 'none',
                    zIndex: 3500,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    animation: 'fearOverlayPulse 1.5s ease-in-out forwards',
                }} />
            );
        }

        if (anim.type === 'despair_overlay') {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '420px',
                    height: '420px',
                    backgroundImage: anim.icon ? `url(${anim.icon})` : `url(${images.shadow_presence})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 0.65,
                    pointerEvents: 'none',
                    zIndex: 3500,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    animation: 'fearOverlayPulse 1.5s ease-in-out forwards',
                }} />
            );
        }

        if (anim.type === 'fireball_projectile' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #fff 0%, #ff6600 40%, #ff2200 70%, transparent 100%)',
                    boxShadow: '0 0 16px #ff4400, 0 0 32px #ff2200',
                    transform: `translate(-50%, -50%)`,
                    transformOrigin: 'center',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: `fireballTravel 1s cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
                    '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                    '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                }} />
            );
        }

        if (anim.type === 'explosion' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x - 100}px`,
                    top: `${anim.tgtPx.y - 100}px`,
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #fff 0%, #ffaa00 30%, #ff4400 60%, transparent 100%)',
                    boxShadow: '0 0 30px #ff6600, 0 0 60px #ff2200',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'explosionPop 0.6s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'fire_secondary_ring' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: '3px solid rgba(255, 140, 0, 0.95)',
                    boxShadow: '0 0 16px rgba(255, 140, 0, 0.85), 0 0 28px rgba(255, 106, 0, 0.65)',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4460,
                    animation: 'fireBlastRing 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                }} />
            );
        }

        if (anim.type === 'magic_missile_projectile' && anim.srcPx && anim.tgtPx) {
            const isNetherBolt = anim.abilityName === 'nether_bolt';
            if (anim.spherePx) {
                return (
                    <CurvedProjectile
                        key={key}
                        srcPx={anim.srcPx}
                        tgtPx={anim.tgtPx}
                        spherePx={anim.spherePx}
                        duration={anim.duration}
                        color={isNetherBolt ? '#a21caf' : '#d946ef'}
                        shadowColor={isNetherBolt ? '#4a044e' : '#701a75'}
                        isNetherBolt={isNetherBolt}
                    />
                );
            }
            const durationS = anim.duration ? anim.duration / 1000 : 0.4;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: isNetherBolt ? '32px' : '18px',
                    height: isNetherBolt ? '32px' : '18px',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: `fireballTravel ${durationS}s linear forwards`,
                    '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                    '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isNetherBolt ? `translate(-50%, -50%) rotate(${anim.angle}deg)` : 'none'
                }}>
                    {isNetherBolt ? (
                        <img
                            src={images['nether_bolt']}
                            alt="nether bolt"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 0 4px #a21caf)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: '2px solid #ffffff',
                            background: 'radial-gradient(circle, #ffffff 15%, #d946ef 45%, #701a75 80%)',
                            boxShadow: '0 0 10px #d946ef, 0 0 20px #701a75, inset 0 0 4px #ffffff',
                            animation: 'missileGlow 0.15s ease-in-out infinite alternate',
                        }} />
                    )}
                </div>
            );
        }

        if (anim.type === 'magic_missile_hit_sigil' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '60px',
                    height: '60px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'explode 0.35s ease-out forwards',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <svg viewBox="0 0 100 100" style={{ 
                        width: '100%', 
                        height: '100%', 
                        animation: 'geomSpinClockwise 1.2s linear infinite',
                        filter: 'drop-shadow(0 0 4px #b5179e)'
                    }}>
                        {/* Outer circle */}
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#b5179e" strokeWidth="3" />
                        {/* Inner dashed circle */}
                        <circle cx="50" cy="50" r="28" fill="none" stroke="#9d4edd" strokeWidth="2" strokeDasharray="6 6" />
                        {/* Star / Hexagram double triangle */}
                        <polygon points="50,15 80,70 20,70" fill="none" stroke="#7209b7" strokeWidth="2.5" />
                        <polygon points="50,85 80,30 20,30" fill="none" stroke="#7209b7" strokeWidth="2.5" />
                    </svg>
                </div>
            );
        }

        if (anim.type === 'magic_missile_miss_dot' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '10px',
                    height: '10px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'explode 0.35s ease-out forwards',
                    borderRadius: '50%',
                    border: '1px solid #ffffff',
                    background: 'radial-gradient(circle, #ffffff 30%, #d946ef 70%)',
                    boxShadow: '0 0 6px #d946ef, inset 0 0 2px #ffffff'
                }} />
            );
        }

        if (anim.type === 'acid_blast_miss_dot' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '10px',
                    height: '10px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'explode 0.35s ease-out forwards',
                    borderRadius: '50%',
                    border: '1px solid #ffffff',
                    background: 'radial-gradient(circle, #ffffff 30%, #adff2f 70%)',
                    boxShadow: '0 0 6px #70e000, inset 0 0 2px #ffffff'
                }} />
            );
        }

        if (anim.type === 'projectile_drip' && anim.tgtPx) {
            const variant = anim.variant || 'fireball';
            let width = '32px';
            let height = '32px';
            let background = '';
            let boxShadow = '';

            if (variant === 'fireball') {
                width = '32px';
                height = '32px';
                background = 'radial-gradient(circle, #fff 0%, #ff6600 40%, #ff2200 70%, transparent 100%)';
                boxShadow = '0 0 16px #ff4400, 0 0 32px #ff2200';
            } else if (variant === 'ice_blast') {
                width = '24px';
                height = '24px';
                background = 'radial-gradient(circle, #fff 0%, #00bfff 50%, #0080ff 100%)';
                boxShadow = '0 0 12px #00bfff, 0 0 24px #0080ff';
            } else if (variant === 'acid_blast') {
                width = '30px';
                height = '30px';
                background = 'radial-gradient(circle, #fff 0%, #adff2f 40%, #38b000 80%, transparent 100%)';
                boxShadow = '0 0 12px #39ff14, 0 0 24px #38b000';
            }

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width,
                    height,
                    borderRadius: '50%',
                    background,
                    boxShadow,
                    transform: 'translate(-50%, -50%)',
                    transformOrigin: 'center center',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: 'projectileDrip 1.0s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                }} />
            );
        }

        if (anim.type === 'ice_projectile' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #fff 0%, #00bfff 50%, #0080ff 100%)',
                    boxShadow: '0 0 12px #00bfff, 0 0 24px #0080ff',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: 'fireballTravel 0.7s ease-in forwards',
                    '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                    '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                }} />
            );
        }

        if (anim.type === 'ice_burst' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '60px',
                    height: '60px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'explode 0.3s ease-out forwards',
                }}>
                    {/* Solid Hexagon Spinning Clockwise */}
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 50%, #00bfff 100%)',
                        animation: 'geomSpinClockwise 3s linear infinite',
                    }} />
                    {/* Hollow Hexagon Spinning Counter-Clockwise */}
                    <svg style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        animation: 'geomSpinCounter 4.5s linear infinite',
                    }} viewBox="0 0 100 100">
                        <polygon
                            points="50,2 98,26 98,74 50,98 2,74 2,26"
                            fill="none"
                            stroke="#00bfff"
                            strokeWidth="5"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0 0 4px #00bfff)' }}
                        />
                    </svg>
                </div>
            );
        }

        if (anim.type === 'overload_projectile' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '40px',
                    height: '40px',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: 'fireballTravel 0.7s linear forwards',
                    '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                    '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {/* Intermediate wrapper that applies the vertical lob translation */}
                    <div style={{
                        animation: 'acidBlastLobY 0.7s ease-in-out forwards',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {/* Glowing Orb: cyan & red high energy */}
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #ffffff 10%, #00f0ff 50%, #ff3300 90%)',
                            boxShadow: '0 0 12px #00f0ff, 0 0 24px #ff3300, inset 0 0 6px #ffffff',
                            animation: 'geomSpinClockwise 1.5s linear infinite',
                            position: 'relative'
                        }}>
                            {/* Inner core spinning counter */}
                            <div style={{
                                position: 'absolute',
                                inset: '20%',
                                borderRadius: '50%',
                                border: '2px dashed #ffffff',
                                animation: 'geomSpinCounter 1s linear infinite'
                            }} />
                        </div>
                    </div>
                </div>
            );
        }

        if (anim.type === 'acid_projectile' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '40px',
                    height: '40px',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: 'fireballTravel 0.7s linear forwards',
                    '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                    '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {/* Intermediate wrapper that applies the vertical lob translation */}
                    <div style={{
                        animation: 'acidBlastLobY 0.7s ease-in-out forwards',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {/* Rotated wrapper so the projectile graphic faces the direction of travel */}
                        <div style={{
                            transform: `rotate(${anim.angle}deg)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {/* Conical Bubble Projectile Graphic */}
                            <div style={{
                                position: 'relative',
                                width: '45px',
                                height: '40px',
                                filter: 'drop-shadow(0 0 6px #39ff14) drop-shadow(0 0 12px #38b000)'
                            }}>
                                {/* Front tip of the cone (small bubbles) */}
                                <div style={{ position: 'absolute', right: '1px', top: '15px', width: '7px', height: '7px', borderRadius: '50%', background: 'radial-gradient(circle, #adff2f 10%, #39ff14 80%)', opacity: 0.95, animation: 'bubbleWobble 0.2s ease-in-out infinite' }} />
                                <div style={{ position: 'absolute', right: '5px', top: '18px', width: '4px', height: '4px', borderRadius: '50%', background: '#adff2f', opacity: 0.85, animation: 'bubbleWobbleAlt 0.18s ease-in-out infinite 0.05s' }} />
                                <div style={{ position: 'absolute', right: '6px', top: '12px', width: '5px', height: '5px', borderRadius: '50%', background: '#adff2f', opacity: 0.85, animation: 'bubbleWobble 0.22s ease-in-out infinite 0.1s' }} />
                                
                                {/* Mid-front section (medium-small bubbles) */}
                                <div style={{ position: 'absolute', right: '10px', top: '9px', width: '10px', height: '10px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.9, animation: 'bubbleWobbleAlt 0.25s ease-in-out infinite 0.03s' }} />
                                <div style={{ position: 'absolute', right: '10px', top: '21px', width: '9px', height: '9px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.9, animation: 'bubbleWobble 0.23s ease-in-out infinite 0.08s' }} />
                                
                                {/* Mid section (medium-large bubbles) */}
                                <div style={{ position: 'absolute', right: '18px', top: '5px', width: '13px', height: '13px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.85, animation: 'bubbleWobble 0.3s ease-in-out infinite 0.12s' }} />
                                <div style={{ position: 'absolute', right: '18px', top: '22px', width: '12px', height: '12px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.85, animation: 'bubbleWobbleAlt 0.28s ease-in-out infinite 0.05s' }} />
                                <div style={{ position: 'absolute', right: '16px', top: '13px', width: '16px', height: '16px', borderRadius: '50%', background: 'radial-gradient(circle, #adff2f 10%, #38b000 80%)', opacity: 0.95, animation: 'bubbleWobble 0.26s ease-in-out infinite 0.02s' }} />
                                
                                {/* Back tail of the cone (largest bubbles and dispersion) */}
                                <div style={{ position: 'absolute', left: '4px', top: '2px', width: '11px', height: '11px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.85, animation: 'bubbleWobbleAlt 0.32s ease-in-out infinite 0.15s' }} />
                                <div style={{ position: 'absolute', left: '4px', top: '27px', width: '10px', height: '10px', borderRadius: '50%', background: 'radial-gradient(circle, #39ff14 20%, #38b000 80%)', opacity: 0.85, animation: 'bubbleWobble 0.34s ease-in-out infinite 0.07s' }} />
                                <div style={{ position: 'absolute', left: '8px', top: '10px', width: '18px', height: '18px', borderRadius: '50%', background: 'radial-gradient(circle, #adff2f 10%, #38b000 80%)', opacity: 0.95, animation: 'bubbleWobbleAlt 0.24s ease-in-out infinite 0.1s' }} />
                                
                                {/* Scattered tiny bubbles at the tail/perimeters */}
                                <div style={{ position: 'absolute', left: '0px', top: '16px', width: '6px', height: '6px', borderRadius: '50%', background: '#adff2f', opacity: 0.8, animation: 'bubbleWobble 0.2s ease-in-out infinite 0.18s' }} />
                                <div style={{ position: 'absolute', left: '10px', top: '0px', width: '4px', height: '4px', borderRadius: '50%', background: '#adff2f', opacity: 0.8, animation: 'bubbleWobbleAlt 0.22s ease-in-out infinite 0.04s' }} />
                                <div style={{ position: 'absolute', left: '15px', top: '34px', width: '5px', height: '5px', borderRadius: '50%', background: '#adff2f', opacity: 0.8, animation: 'bubbleWobble 0.19s ease-in-out infinite 0.11s' }} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (anim.type === 'spiderweb_detonation' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '80px',
                    height: '80px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'explode 0.3s ease-out forwards',
                }}>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        clipPath: 'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)',
                        background: 'linear-gradient(135deg, #a200ff 0%, #00d2ff 50%, #7a00ff 100%)',
                        animation: 'geomSpinClockwise 3s linear infinite',
                        boxShadow: '0 0 15px #a200ff'
                    }} />
                    <svg style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        animation: 'geomSpinCounter 4.5s linear infinite',
                    }} viewBox="0 0 100 100">
                        <polygon
                            points="50,2 62,38 98,50 62,62 50,98 38,62 2,50 38,38"
                            fill="none"
                            stroke="#7a00ff"
                            strokeWidth="5"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0 0 6px #00d2ff)' }}
                        />
                    </svg>
                </div>
            );
        }

        if (anim.type === 'poison_burst' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '70px',
                    height: '70px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'explode 0.3s ease-out forwards',
                }}>
                    {/* Solid Star Spinning Clockwise */}
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        clipPath: 'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)',
                        background: 'linear-gradient(135deg, #adff2f 0%, #70e000 50%, #38b000 100%)',
                        animation: 'geomSpinClockwise 3s linear infinite',
                    }} />
                    {/* Hollow Star Spinning Counter-Clockwise */}
                    <svg style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        animation: 'geomSpinCounter 4.5s linear infinite',
                    }} viewBox="0 0 100 100">
                        <polygon
                            points="50,2 62,38 98,50 62,62 50,98 38,62 2,50 38,38"
                            fill="none"
                            stroke="#38b000"
                            strokeWidth="5"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0 0 4px #adff2f)' }}
                        />
                    </svg>
                </div>
            );
        }

        if (anim.type === 'force_burst' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '80px',
                    height: '80px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'explode 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                }}>
                    {/* Expanding shockwave ring */}
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '3px solid #ff9f1c',
                        boxShadow: '0 0 20px #ff9f1c, inset 0 0 12px #ff9f1c',
                        background: 'radial-gradient(circle, rgba(255,159,28,0.1) 0%, transparent 70%)',
                    }} />
                    {/* Rhombus kinetic shard spinning clockwise */}
                    <div style={{
                        position: 'absolute',
                        left: '20%',
                        top: '20%',
                        width: '60%',
                        height: '60%',
                        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                        background: 'linear-gradient(135deg, #ffe0b2 0%, #ffb74d 50%, #f57c00 100%)',
                        boxShadow: '0 0 10px #ffb74d',
                        animation: 'geomSpinClockwise 2s linear infinite',
                    }} />
                    {/* Outer svg kinetic wind spokes */}
                    <svg style={{
                        position: 'absolute',
                        left: '-20%',
                        top: '-20%',
                        width: '140%',
                        height: '140%',
                        animation: 'geomSpinCounter 4s linear infinite',
                    }} viewBox="0 0 140 140">
                        <line x1="70" y1="10" x2="70" y2="35" stroke="#ffe0b2" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
                        <line x1="70" y1="105" x2="70" y2="130" stroke="#ffe0b2" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
                        <line x1="10" y1="70" x2="35" y2="70" stroke="#ffe0b2" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
                        <line x1="105" y1="70" x2="130" y2="70" stroke="#ffe0b2" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
                    </svg>
                </div>
            );
        }

        if (anim.type === 'acid_secondary_ring' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '2px solid rgba(112, 224, 0, 0.95)',
                    boxShadow: '0 0 14px rgba(112, 224, 0, 0.8), 0 0 24px rgba(56, 176, 0, 0.6)',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4120,
                    animation: 'annihilationRing 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                }} />
            );
        }

        if (anim.type === 'shield_wall' && anim.srcPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '100px',
                    height: '100px',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 191, 255, 0.25)',
                    border: '3px solid #00bfff',
                    boxShadow: '0 0 15px #00ffff, inset 0 0 15px #00ffff',
                    borderRadius: '10px',
                    pointerEvents: 'none',
                    zIndex: 4050,
                    animation: 'shieldWallPulse 1.2s ease-in-out infinite alternate',
                }} />
            );
        }

        if (anim.type === 'shield_slam_connect' && anim.srcPx && anim.tgtPx) {
            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const midX = anim.srcPx.x + dx * 0.5;
            const midY = anim.srcPx.y + dy * 0.5;
            const shieldSlamIcon = anim.icon || images.shield_slam?.default || images.shield_slam || '';
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${midX}px`,
                    top: `${midY}px`,
                    width: '56px',
                    height: '56px',
                    backgroundImage: `url("${shieldSlamIcon}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
                    maskImage: 'radial-gradient(circle, black 50%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 100%)'
                }} />
            );
        }

        if (anim.type === 'silence_projectile' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #a8ffb2 0%, #a020f0 40%, #00ff00 75%, transparent 100%)',
                    boxShadow: '0 0 16px #a020f0, 0 0 32px #00ff00',
                    transform: `translate(-50%, -50%)`,
                    transformOrigin: 'center',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: `fireballTravel 1s cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
                    '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                    '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                }} />
            );
        }

        if (anim.type === 'silence_hit' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x - 40}px`,
                    top: `${anim.tgtPx.y - 40}px`,
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #ffffff 0%, #a020f0 50%, transparent 80%)',
                    boxShadow: '0 0 20px #00ff00',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'explosionPop 0.5s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'demon_mark_overlay') {
            const markIcon = anim.icon || images.demon_mark || '';
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '380px',
                    height: '380px',
                    backgroundImage: `url(${markIcon})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 0.6,
                    pointerEvents: 'none',
                    zIndex: 3500,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 70%)',
                    animation: 'fearOverlayPulse 1.5s ease-in-out forwards',
                }} />
            );
        }

        if (anim.type === 'demon_mark_hit' && anim.tgtPx) {
            const markIcon = anim.icon || images.demon_mark || '';
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '70px',
                    height: '70px',
                    backgroundImage: `url("${markIcon}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'scaleUpFadeOut 1.2s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'death_missile_burst' && anim.tgtPx) {
            const hitIcon = anim.icon || images.death_missile_hit || '';
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '90px',
                    height: '90px',
                    backgroundImage: `url("${hitIcon}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'scaleUpFadeOut 0.8s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'new_moon_overlay') {
            const moonIcon = anim.icon || images.new_moon || '';
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '380px',
                    height: '380px',
                    backgroundImage: `url(${moonIcon})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 0.75,
                    pointerEvents: 'none',
                    zIndex: 3500,
                    animation: 'scaleUpFadeOut 1.8s ease-in-out forwards',
                }} />
            );
        }

        if (anim.type === 'fear_pulse' && anim.tgtPx) {
            const fearIcon = anim.icon || images.fear || '';
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '64px',
                    height: '64px',
                    backgroundImage: `url("${fearIcon}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'scaleUpFadeOut 1.0s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'summon_portal' && anim.tgtPx) {
            const portalIcon = anim.icon?.default || anim.icon || '';
            return (
                <div
                    key={key}
                    style={{
                        position: 'absolute',
                        left: `${anim.tgtPx.x}px`,
                        top: `${anim.tgtPx.y}px`,
                        width: '90px',
                        height: '90px',
                        backgroundImage: `url("${portalIcon}")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        transform: 'translate(-50%, -50%)',
                        animation: 'summonPortalIn 1.2s linear both',
                        pointerEvents: 'none',
                        zIndex: 4100,
                        opacity: 0.8,
                        maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 70%)',
                        WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 70%)',
                        filter: anim.summonType === 'skeleton_knight' 
                            ? 'drop-shadow(0 0 8px #00bfff) drop-shadow(0 0 15px #00ffff)' 
                            : anim.summonType === 'duplicate'
                                ? 'drop-shadow(0 0 8px #d800ff) drop-shadow(0 0 15px #ff007f)'
                                : anim.summonType === 'triplicate'
                                    ? 'drop-shadow(0 0 8px #8a2be2) drop-shadow(0 0 15px #4b0082)'
                                    : 'drop-shadow(0 0 8px #2ec4b6) drop-shadow(0 0 15px #a2d2ff)'
                    }}
                />
            );
        }
        if (anim.type === 'generic_projectile' && anim.srcPx && anim.tgtPx) {
            if (anim.spherePx) {
                const arrowTypeColors = {
                    force: '#ff9f1c',
                    ice: '#00bfff',
                    poison: '#38b000',
                    celestial: '#ffdd57'
                };
                const projColor = arrowTypeColors[anim.arrowType] || '#ff9f1c';
                return (
                    <CurvedProjectile
                        key={key}
                        srcPx={anim.srcPx}
                        tgtPx={anim.tgtPx}
                        spherePx={anim.spherePx}
                        duration={anim.duration}
                        color={projColor}
                        shadowColor='#000000'
                    />
                );
            }
            const isArrow = ['loose', 'execute', 'deadeye_shot'].includes(anim.subtype);
            if (isArrow) {
                const arrowTypeColors = {
                    force: '#ff9f1c',
                    ice: '#00bfff',
                    poison: '#38b000',
                    celestial: '#ffdd57'
                };
                const arrowColor = arrowTypeColors[anim.arrowType] || '#ff9f1c';
                return (
                    <div key={key} style={{
                        position: 'absolute',
                        left: `${anim.srcPx.x}px`,
                        top: `${anim.srcPx.y}px`,
                        width: '32px',
                        height: '32px',
                        pointerEvents: 'none',
                        zIndex: 4000,
                        animation: 'fireballTravel 0.7s linear forwards',
                        '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                        '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                    }}>
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: '120px',
                            height: '6px',
                            transform: `translate(-100%, -50%) rotate(${anim.angle}deg)`,
                            transformOrigin: '100% 50%',
                            pointerEvents: 'none',
                        }}>
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                {/* Arrow head */}
                                <div style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderTop: '3px solid transparent',
                                    borderBottom: '3px solid transparent',
                                    borderLeft: `6px solid ${arrowColor}`,
                                    filter: `drop-shadow(0 0 3px ${arrowColor})`
                                }} />
                                {/* Arrow shaft - tapered tail */}
                                <div style={{
                                    position: 'absolute',
                                    right: '6px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '108px',
                                    height: '4px',
                                    background: `linear-gradient(to left, ${arrowColor}, transparent)`,
                                    clipPath: 'polygon(0% 50%, 100% 10%, 100% 90%)',
                                    boxShadow: `0 0 4px ${arrowColor}40`
                                }} />
                                {/* Poison droplets */}
                                {anim.arrowType === 'poison' && (
                                    <>
                                        <div style={{ position: 'absolute', left: '3px', top: '-3px', width: '3px', height: '3px', borderRadius: '50%', background: '#38b000', opacity: 0.7, animation: 'poisonDrop 0.3s ease-out infinite', boxShadow: '0 0 3px #38b000' }} />
                                        <div style={{ position: 'absolute', left: '10px', top: '6px', width: '2px', height: '2px', borderRadius: '50%', background: '#4ade80', opacity: 0.6, animation: 'poisonDrop 0.3s ease-out 0.1s infinite' }} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }

            // Net projectile for Ensnare
            if (anim.subtype === 'ensnare_net' && anim.isNet) {
                const netIcon = anim.netIcon?.default || anim.netIcon || '';
                const durSec = `${(anim.duration || 800) / 1000}s`;
                return (
                    <div key={key} style={{
                        position: 'absolute',
                        left: `${anim.srcPx.x}px`,
                        top: `${anim.srcPx.y}px`,
                        width: '40px',
                        height: '40px',
                        pointerEvents: 'none',
                        zIndex: 4000,
                        animation: `fireballTravel ${durSec} linear forwards`,
                        '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                        '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            animation: `acidBlastLobY ${durSec} ease-in-out forwards`,
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundImage: netIcon ? `url(${netIcon})` : 'none',
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                transform: 'translate(-50%, -50%)',
                                filter: 'drop-shadow(0 0 6px rgba(139, 195, 74, 0.8))',
                                animation: 'spinAxis 0.5s linear infinite'
                            }} />
                        </div>
                    </div>
                );
            }

            const sourceUnit = anim.sourceUnitId 
                ? ((combatManager && combatManager.combatants && combatManager.combatants[anim.sourceUnitId])
                    || crew.find(f => f.id === anim.sourceUnitId) 
                    || battleData[anim.sourceUnitId]) 
                : null;
            const equippedWeapon = sourceUnit ? (sourceUnit.inventory || []).find(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === sourceUnit.id)) : null;

            let projectileImage = anim.projectileIcon;
            if (!projectileImage) {
                if (anim.subtype === 'spear_throw') {
                    projectileImage = images.spear || '';
                } else if (equippedWeapon && (anim.subtype === 'axe_throw' || anim.subtype === 'barbarian_axe_throw')) {
                    projectileImage = images[equippedWeapon.icon]?.default || images[equippedWeapon.icon] || images[equippedWeapon.id]?.default || images[equippedWeapon.id] || equippedWeapon.image || images[equippedWeapon.name];
                } else {
                    projectileImage = images.barbarian_axe_throw || images.axe_throw || images.axe || '';
                }
            }
            const resolvedImg = projectileImage?.default || projectileImage || '';
            const isSpinning = anim.subtype !== 'death_missile';
            const rotation = anim.subtype === 'death_missile' ? `${anim.angle}deg` : '0deg';

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '32px',
                    height: '32px',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: 'fireballTravel 0.7s linear forwards',
                    '--fb-dx': `${anim.tgtPx.x - anim.srcPx.x}px`,
                    '--fb-dy': `${anim.tgtPx.y - anim.srcPx.y}px`,
                }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: resolvedImg ? `url(${resolvedImg})` : 'none',
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        transform: `translate(-50%, -50%) rotate(${rotation})`,
                        animation: isSpinning ? 'spinAxis 0.5s linear infinite' : 'none'
                    }} />
                </div>
            );
        }


        // ── Beholder: Chainbolt beam ────────────────────────────────────────
        if (anim.type === 'chainbolt_beam' && anim.srcPx && anim.tgtPx) {
            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${len}px`,
                    height: '14px',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg) translateY(-50%)`,
                    zIndex: 4800,
                    pointerEvents: 'none',
                }}>
                    {/* Outer Glow */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        background: 'linear-gradient(to right, rgba(255,255,255,0.05), #e0f0ff, #ffffff, #e0f0ff, rgba(255,255,255,0.05))',
                        boxShadow: '0 0 12px #ffffff, 0 0 24px #aaddff, 0 0 35px #3399ff',
                        borderRadius: '6px',
                        opacity: 0.45,
                        animation: `beamTravel ${anim.duration || 500}ms linear forwards, beamFlicker 0.12s infinite alternate`,
                    }} />
                    {/* Inner Core */}
                    <div style={{
                        position: 'absolute',
                        top: '5px', left: 0, width: '100%', height: '4px',
                        background: '#ffffff',
                        boxShadow: '0 0 6px #ffffff, 0 0 12px #ffffff',
                        borderRadius: '2px',
                        animation: `beamTravel ${anim.duration || 500}ms linear forwards, beamFlicker 0.08s infinite alternate`,
                    }} />
                </div>
            );
        }

        if (anim.type === 'chainbolt_hit' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '50px',
                    height: '50px',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #ffffff 0%, #aaddff 50%, transparent 100%)',
                    boxShadow: '0 0 20px #ffffff, 0 0 35px #aaddff',
                    pointerEvents: 'none',
                    zIndex: 4900,
                    animation: 'explode 0.45s ease-out forwards',
                }} />
            );
        }

        // ── Beholder: Mind Swap beam ────────────────────────────────────────
        if (anim.type === 'mind_swap_beam' && anim.srcPx && anim.tgtPx) {
            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const isChain = anim.variant === 'mind_swap_chain';
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${len}px`,
                    height: isChain ? '10px' : '16px',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg) translateY(-50%)`,
                    zIndex: 4800,
                    pointerEvents: 'none',
                    opacity: isChain ? 0.75 : 1.0,
                    '--mind-swap-duration': `${anim.duration || 1500}ms`
                }}>
                    {/* Outer Glow */}
                    <div key="glow" className={isChain ? "mind-swap-chain-beam-glow" : "mind-swap-beam-glow"} />
                    {/* Inner Core */}
                    <div key="core" className={isChain ? "mind-swap-chain-beam-core" : "mind-swap-beam-core"} style={{
                        height: isChain ? '4px' : '6px'
                    }} />
                </div>
            );
        }

        if (anim.type === 'mind_swap_hit' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '70px',
                    height: '70px',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #cc80ff 0%, #9b30ff 40%, transparent 100%)',
                    boxShadow: '0 0 25px #9b30ff, 0 0 40px #6600cc',
                    pointerEvents: 'none',
                    zIndex: 4900,
                    animation: 'explode 1.0s ease-out forwards',
                }} />
            );
        }

        // ── Sage/Wizard: Healing Beam ──────────────────────────────────────
        if (anim.type === 'healing_beam' && anim.srcPx && anim.tgtPx) {
            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${len}px`,
                    height: '20px',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg) translateY(-50%)`,
                    zIndex: 4800,
                    pointerEvents: 'none',
                }}>
                    {/* Glowing outer green channel beam */}
                    <div style={{
                        position: 'absolute',
                        top: '4px',
                        left: 0,
                        width: '100%',
                        height: '12px',
                        background: 'linear-gradient(90deg, rgba(46,204,113,0.1), rgba(46,204,113,0.85) 50%, rgba(46,204,113,0.1))',
                        boxShadow: '0 0 15px rgba(46,204,113,0.7), 0 0 30px rgba(46,204,113,0.4)',
                        borderRadius: '6px',
                        animation: 'healBeamPulse 0.4s ease-in-out infinite alternate',
                    }} />
                    {/* Core bright beam line */}
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: 0,
                        width: '100%',
                        height: '4px',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.2))',
                        boxShadow: '0 0 8px rgba(255,255,255,0.9)',
                        borderRadius: '2px',
                    }} />
                    {/* Elaborate travelling light sparks */}
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{
                            position: 'absolute',
                            top: '5px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 0 10px #2ecc71, 0 0 20px #2ecc71, 0 0 30px #2ecc71',
                            animation: 'healSparkTravel 1.0s linear infinite',
                            animationDelay: `${i * 0.25}s`,
                            pointerEvents: 'none',
                        }} />
                    ))}
                </div>
            );
        }

        // ── Beholder: Displacement Ray ──────────────────────────────────────
        if (anim.type === 'displacement_ray_beam' && anim.srcPx && anim.tgtPx) {
            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${len}px`,
                    height: '14px',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg) translateY(-50%)`,
                    zIndex: 4800,
                    pointerEvents: 'none',
                }}>
                    {/* Outer Glow */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        background: 'linear-gradient(to right, rgba(255,120,0,0.05), #ff8800, #ffcc44, #ff8800, rgba(255,120,0,0.05))',
                        boxShadow: '0 0 12px #ff8800, 0 0 24px #cc5500, 0 0 35px #ff3300',
                        borderRadius: '6px',
                        opacity: 0.5,
                        animation: `beamTravel ${anim.duration || 600}ms linear forwards, beamFlicker 0.1s infinite alternate`,
                    }} />
                    {/* Inner Core */}
                    <div style={{
                        position: 'absolute',
                        top: '5px', left: 0, width: '100%', height: '4px',
                        background: '#ffffff',
                        boxShadow: '0 0 6px #ffffff, 0 0 12px #ffcc44',
                        borderRadius: '2px',
                        animation: `beamTravel ${anim.duration || 600}ms linear forwards, beamFlicker 0.08s infinite alternate`,
                    }} />
                </div>
            );
        }

        if (anim.type === 'displacement_ray_hit' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '80px',
                    height: '80px',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #ffcc44 0%, #ff8800 50%, transparent 100%)',
                    boxShadow: '0 0 25px #ff8800, 0 0 40px #cc5500',
                    pointerEvents: 'none',
                    zIndex: 4900,
                    animation: 'explode 0.5s ease-out forwards',
                }} />
            );
        }

        // ── Beholder: Invisibility shimmer ─────────────────────────────────
        if (anim.type === 'beholder_invisibility_shimmer' && anim.srcPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '100px',
                    height: '100px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4950,
                    borderRadius: '8px',
                    background: 'radial-gradient(circle, rgba(150,255,255,0.25) 0%, rgba(100,180,255,0.15) 50%, transparent 100%)',
                    boxShadow: '0 0 30px rgba(150,255,255,0.5), inset 0 0 20px rgba(255,255,255,0.1)',
                    animation: 'beholderFadeIn 1.2s ease-out forwards',
                    border: '1px solid rgba(180,255,255,0.3)',
                }} />
            );
        }

        // ── Beholder: Voidbite ──────────────────────────────────────────────
        if (anim.type === 'voidbite_chomp' && (anim.midPx || anim.tgtPx)) {
            const pos = anim.midPx || anim.tgtPx;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: '90px',
                    height: '90px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 5000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {/* Dark void top jaw */}
                    <div style={{
                        position: 'absolute',
                        width: '80px',
                        height: '40px',
                        top: '5px',
                        background: 'radial-gradient(ellipse at center bottom, rgba(80,0,120,0.9) 0%, rgba(20,0,40,0.95) 70%, transparent 100%)',
                        borderRadius: '50% 50% 0 0',
                        boxShadow: '0 0 18px rgba(120,0,200,0.8)',
                        animation: 'biteCloseTop 0.7s ease-in-out forwards',
                        pointerEvents: 'none',
                    }} />
                    {/* Dark void bottom jaw */}
                    <div style={{
                        position: 'absolute',
                        width: '80px',
                        height: '40px',
                        bottom: '5px',
                        background: 'radial-gradient(ellipse at center top, rgba(80,0,120,0.9) 0%, rgba(20,0,40,0.95) 70%, transparent 100%)',
                        borderRadius: '0 0 50% 50%',
                        boxShadow: '0 0 18px rgba(120,0,200,0.8)',
                        animation: 'biteCloseBottom 0.7s ease-in-out forwards',
                        pointerEvents: 'none',
                    }} />
                </div>
            );
        }

        if (anim.type === 'voidbite_hit' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '60px',
                    height: '60px',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(140,0,220,0.8) 0%, rgba(40,0,80,0.6) 60%, transparent 100%)',
                    boxShadow: '0 0 20px rgba(120,0,200,0.9), 0 0 35px rgba(60,0,100,0.6)',
                    pointerEvents: 'none',
                    zIndex: 4900,
                    animation: 'explode 0.4s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'circle_of_protection' && anim.srcPx) {
            const sageUnit = Object.values(combatManager?.combatants || {}).find(c => {
                if (!c || c.dead || c.isVCT) return false;
                const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
                return c.type === 'sage' && Array.isArray(c.activeBuffs) && c.activeBuffs.some(b => b && normalizeName(b.name) === 'circle_of_protection');
            });
            if (!sageUnit) return null;

            const currentPx = {
                x: sageUnit.coordinates.x * 100 + 50,
                y: sageUnit.coordinates.y * 100 + 50
            };

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${currentPx.x}px`,
                    top: `${currentPx.y}px`,
                    width: '400px',
                    height: '400px',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2000,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '5px solid rgba(0, 191, 255, 0.75)',
                    boxShadow: '0 0 35px rgba(0, 191, 255, 0.45), inset 0 0 35px rgba(0, 191, 255, 0.15)',
                    position: 'relative',
                    animation: 'spin-slow 20s linear infinite',
                  }}>
                    {['\u16A0', '\u16A2', '\u16A6', '\u16A8', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                      const angle = (i / 12) * 360;
                      const radius = 42;
                      const rad = (angle - 90) * (Math.PI / 180);
                      return (
                        <span
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${50 + radius * Math.cos(rad)}%`,
                            top: `${50 + radius * Math.sin(rad)}%`,
                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                            color: 'rgba(0, 191, 255, 0.85)',
                            fontSize: '22px',
                            fontWeight: 'bold',
                            textShadow: '0 0 10px rgba(0, 191, 255, 0.65)',
                            pointerEvents: 'none',
                            userSelect: 'none'
                          }}
                        >
                          {rune}
                        </span>
                      );
                    })}
                  </div>
                </div>
            );
        }

        if (anim.type === 'invigorate' && anim.srcPx) {
            const sageUnit = Object.values(combatManager?.combatants || {}).find(c => {
                if (!c || c.dead || c.isVCT) return false;
                const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
                return c.type === 'sage' && Array.isArray(c.activeBuffs) && c.activeBuffs.some(b => b && normalizeName(b.name) === 'invigorate');
            });
            if (!sageUnit) return null;

            const currentPx = {
                x: sageUnit.coordinates.x * 100 + 50,
                y: sageUnit.coordinates.y * 100 + 50
            };

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${currentPx.x}px`,
                    top: `${currentPx.y}px`,
                    width: '400px',
                    height: '400px',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2000,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '5px solid rgba(50, 205, 50, 0.75)',
                    boxShadow: '0 0 35px rgba(50, 205, 50, 0.45), inset 0 0 35px rgba(50, 205, 50, 0.15)',
                    position: 'relative',
                    animation: 'spin-slow 20s linear infinite',
                  }}>
                    {['\u16A0', '\u16A2', '\u16A6', '\u16A8', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                      const angle = (i / 12) * 360;
                      const radius = 42;
                      const rad = (angle - 90) * (Math.PI / 180);
                      return (
                        <span
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${50 + radius * Math.cos(rad)}%`,
                            top: `${50 + radius * Math.sin(rad)}%`,
                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                            color: 'rgba(50, 205, 50, 0.85)',
                            fontSize: '22px',
                            fontWeight: 'bold',
                            textShadow: '0 0 10px rgba(50, 205, 50, 0.65)',
                            pointerEvents: 'none',
                            userSelect: 'none'
                          }}
                        >
                          {rune}
                        </span>
                      );
                    })}
                  </div>
                </div>
            );
        }

        if (anim.type === 'circle_of_deflection' && anim.srcPx) {
            const sageUnit = Object.values(combatManager?.combatants || {}).find(c => {
                if (!c || c.dead || c.isVCT) return false;
                const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
                return c.type === 'sage' && Array.isArray(c.activeBuffs) && c.activeBuffs.some(b => b && normalizeName(b.name) === 'circle_of_deflection');
            });
            if (!sageUnit) return null;

            const currentPx = {
                x: sageUnit.coordinates.x * 100 + 50,
                y: sageUnit.coordinates.y * 100 + 50
            };

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${currentPx.x}px`,
                    top: `${currentPx.y}px`,
                    width: '400px',
                    height: '400px',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2000,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '5px solid rgba(32, 232, 200, 0.75)',
                    boxShadow: '0 0 35px rgba(32, 232, 200, 0.45), inset 0 0 35px rgba(32, 232, 200, 0.15)',
                    position: 'relative',
                    animation: 'spin-slow 14s linear infinite reverse',
                  }}>
                    {['\u16A0', '\u16A2', '\u16A6', '\u16A8', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16C1', '\u16C3', '\u16C8'].map((rune, i) => {
                      const angle = (i / 12) * 360;
                      const radius = 42;
                      const rad = (angle - 90) * (Math.PI / 180);
                      return (
                        <span
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${50 + radius * Math.cos(rad)}%`,
                            top: `${50 + radius * Math.sin(rad)}%`,
                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                            color: 'rgba(32, 232, 200, 0.85)',
                            fontSize: '22px',
                            fontWeight: 'bold',
                            textShadow: '0 0 10px rgba(32, 232, 200, 0.65)',
                            pointerEvents: 'none',
                            userSelect: 'none'
                          }}
                        >
                          {rune}
                        </span>
                      );
                    })}
                  </div>
                </div>
            );
        }


        if (anim.type === 'sword_slash' && anim.srcPx && anim.tgtPx) {
            const sourceUnit = anim.sourceUnitId 
                ? ((combatManager && combatManager.combatants && combatManager.combatants[anim.sourceUnitId])
                    || crew.find(f => f.id === anim.sourceUnitId) 
                    || battleData[anim.sourceUnitId]) 
                : null;
            const isBarbarian = sourceUnit?.type === 'barbarian' || sourceUnit?.class === 'barbarian';
            const equippedWeapon = sourceUnit ? (sourceUnit.inventory || []).find(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === sourceUnit.id)) : null;
            const weaponIcon = equippedWeapon 
                ? (images[equippedWeapon.icon]?.default || images[equippedWeapon.icon] || images[equippedWeapon.id]?.default || images[equippedWeapon.id] || equippedWeapon.image || images[equippedWeapon.name]) 
                : (isBarbarian 
                    ? (images.axe?.default || images.axe || images.axe_white?.default || images.axe_white) 
                    : (images.longsword?.default || images.longsword));
            const duration = anim.duration || 600;

            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Calculate midpoint and pivot offset
            const midX = anim.srcPx.x + dx / 2;
            const midY = anim.srcPx.y + dy / 2;
            const halfDistPx = dist / 2;

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${midX}px`,
                    top: `${midY}px`,
                    width: '60px',
                    height: '60px',
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                    pointerEvents: 'none',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={weaponIcon}
                        alt="weapon swing"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: `${30 - halfDistPx}px 30px`,
                            animation: `${(dx < 0 || (dx === 0 && sourceUnit && sourceUnit.facing === 'left')) ? 'weaponSwingArcFlipped' : 'weaponSwingArc'} ${duration / 1000}s ease-in-out forwards`
                        }}
                    />
                </div>
            );
        }

        if (anim.type === 'imbued_strike' && anim.srcPx && anim.tgtPx) {
            const sourceUnit = anim.sourceUnitId ? (crew.find(f => f.id === anim.sourceUnitId) || battleData[anim.sourceUnitId]) : null;
            const equippedWeapon = sourceUnit ? (sourceUnit.inventory || []).find(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === sourceUnit.id)) : null;
            const weaponIcon = equippedWeapon 
                ? (images[equippedWeapon.icon]?.default || images[equippedWeapon.icon] || images[equippedWeapon.id]?.default || images[equippedWeapon.id] || equippedWeapon.image || images[equippedWeapon.name]) 
                : (images.longsword?.default || images.longsword);

            const dx = anim.tgtPx.x - anim.srcPx.x;
            const dy = anim.tgtPx.y - anim.srcPx.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const halfDistPx = dist / 2;
            const midX = anim.srcPx.x + dx * 0.5;
            const midY = anim.srcPx.y + dy * 0.5;

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${midX}px`,
                    top: `${midY}px`,
                    width: '60px',
                    height: '60px',
                    transform: `translate(-50%, -50%) rotate(${anim.angle}deg)`,
                    pointerEvents: 'none',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={weaponIcon}
                        alt="imbued strike weapon"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: `${30 - halfDistPx}px 30px`,
                            animation: 'imbuedStrikeThrust 1.0s ease-in-out forwards',
                            filter: 'drop-shadow(0 0 6px rgba(0, 191, 255, 0.95)) drop-shadow(0 0 12px rgba(0, 191, 255, 0.6))'
                        }}
                    />
                </div>
            );
        }


        if (anim.type === 'heal_glow' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x - 40}px`,
                    top: `${anim.tgtPx.y - 40}px`,
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(100,255,150,0.6) 0%, rgba(0,200,100,0.1) 70%, transparent 100%)',
                    boxShadow: '0 0 20px rgba(100,255,150,0.5)',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: 'healGlowPop 0.8s ease-out forwards',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={images.healing_hands?.default || images.healing_hands}
                        alt="healing hands"
                        style={{
                            width: '40px',
                            height: '40px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 5px #2ecc71)',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                        }}
                    />
                </div>
            );
        }

        if (anim.type === 'direct_dispel_glow' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x - 40}px`,
                    top: `${anim.tgtPx.y - 40}px`,
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,255,255,0.6) 0%, rgba(0,191,255,0.1) 70%, transparent 100%)',
                    boxShadow: '0 0 20px rgba(0,255,255,0.5)',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: 'healGlowPop 0.8s ease-out forwards',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={images.direct_dispel?.default || images.direct_dispel}
                        alt="direct dispel"
                        style={{
                            width: '40px',
                            height: '40px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 5px #00bfff)',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                        }}
                    />
                </div>
            );
        }

        if (anim.type === 'annihilation_beam' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${anim.length}px`,
                    height: '12px',
                    background: 'linear-gradient(to right, rgba(123, 44, 191, 0.18), #8e2de2 25%, #c77dff 50%, #8e2de2 75%, rgba(123, 44, 191, 0.18))',
                    boxShadow: '0 0 14px #7b2cbf, 0 0 28px #8e2de2, 0 0 42px rgba(199, 125, 255, 0.7)',
                    transformOrigin: '0 50%',
                    transform: `rotate(${anim.angle}deg) translateY(-50%)`,
                    zIndex: 4000,
                    pointerEvents: 'none',
                    filter: 'blur(0.8px) saturate(1.2)',
                    animation: 'pinkBeamPulse 1.2s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'annihilation_burst' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '0px',
                    height: '0px',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4500,
                    animation: 'annihilationRing 0.7s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                }} />
            );
        }

        if (anim.type === 'annihilation_portal' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '100px',
                    height: '100px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 4500
                }}>
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                border: '2.5px solid #ff007f',
                                borderRadius: '50%',
                                boxShadow: '0 0 15px #8e2de2, inset 0 0 10px #ff007f',
                                animation: 'organicGlow 3s linear infinite, collapsarRing 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
                                animationDelay: `${i * 0.5}s`,
                                opacity: 0,
                                boxSizing: 'border-box'
                            }}
                        />
                    ))}
                </div>
            );
        }

        if (anim.type === 'sleep_rings' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '100px',
                    height: '100px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 4500
                }}>
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '100%',
                                height: '100%',
                                border: '2.2px dashed rgba(160, 160, 165, 0.75)',
                                borderRadius: '60% 40% 50% 50% / 40% 50% 60% 50%',
                                boxShadow: '0 0 10px rgba(160, 160, 165, 0.35), inset 0 0 6px rgba(160, 160, 165, 0.25)',
                                animation: 'sleepShrinkRing 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                                animationDelay: `${i * 0.4}s`,
                                opacity: 0,
                                boxSizing: 'border-box'
                            }}
                        />
                    ))}
                </div>
            );
        }

        if (anim.type === 'disintegrate_beam' && anim.tgtPx) {
            return (
                <React.Fragment key={key}>
                    {/* Vertical beam */}
                    <div style={{
                        position: 'absolute',
                        left: `${anim.tgtPx.x}px`,
                        width: '8px',
                        background: 'linear-gradient(to right, #ff1a1a, #ffffff 40%, #ffffff 60%, #ff1a1a)',
                        top: 0,
                        height: `${anim.tgtPx.y}px`,
                        transform: 'translateX(-50%)',
                        zIndex: 4000,
                        pointerEvents: 'none',
                        animation: 'disintegrateBeam 2.2s linear forwards'
                    }} />
                    {/* Wobbly organic glow ball tip */}
                    <div style={{
                        position: 'absolute',
                        left: `${anim.tgtPx.x}px`,
                        top: `${anim.tgtPx.y}px`,
                        transform: 'translate(-50%, -50%)',
                        width: '45px',
                        height: '45px',
                        zIndex: 4100,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'radial-gradient(circle, #ffffff 20%, #ff1a1a 60%, rgba(255, 26, 26, 0) 100%)',
                            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                            animation: 'organicGlow 1.5s linear infinite',
                            boxShadow: '0 0 15px #ff1a1a, 0 0 30px #ff1a1a',
                            opacity: 0.95
                        }} />
                    </div>
                </React.Fragment>
            );
        }

        if (anim.type === 'berserker_rage' && anim.srcPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    transform: 'translate(-50%, -50%)',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '4px solid #ff3333',
                    boxShadow: '0 0 20px #ff3333, inset 0 0 20px #ff3333',
                    pointerEvents: 'none',
                    zIndex: 4200,
                    animation: 'berserkerRageExpansion 1.0s ease-out forwards'
                }} />
            );
        }

        if (anim.type === 'leap_attack_jump' && anim.srcPx && anim.tgtPx) {
            return null;
        }

        if (anim.type === 'vortex' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${TILE_SIZE * 3}px`,
                    height: `${TILE_SIZE * 3}px`,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    backgroundImage: `url(${images['wizard_vortex']})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    pointerEvents: 'none',
                    zIndex: 4400,
                    opacity: 0.5,
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 70%)',
                    filter: 'drop-shadow(0 0 12px #7b2cbf) drop-shadow(0 0 25px #8e2de2)',
                    animation: 'combatVortexSpin 4s linear infinite'
                }} />
            );
        }

        if (anim.type === 'monk_meditate' && anim.srcPx) {
            return null;
        }

        if ((anim.type === 'monk_punch_effect' || anim.type === 'monk_force_punch_effect') && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x + anim.leftOffset}px`,
                    top: `${anim.tgtPx.y + anim.topOffset}px`,
                    width: '56px',
                    height: '56px',
                    transform: anim.facing === 'left' ? 'translate(-50%, -50%) scaleX(-1)' : 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={anim.icon || images['monk_punch']}
                        alt="monk punch connect"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                        }}
                    />
                </div>
            );
        }

        if (anim.type === 'fist_of_honor_effect' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x + (anim.leftOffset || 0)}px`,
                    top: `${anim.tgtPx.y + (anim.topOffset || 0)}px`,
                    width: '56px',
                    height: '56px',
                    transform: `translate(-50%, -50%) rotate(${(anim.baseAngle || 0) + 180}deg) rotate(-90deg) scaleX(-1)`,
                    pointerEvents: 'none',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maskImage: 'radial-gradient(circle, black 50%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 100%)'
                }}>
                    <img
                        src={anim.icon || images['soldier_fist_of_honor']}
                        alt="fist connect"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            animation: 'scaleUp 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                        }}
                    />
                </div>
            );
        }

        if (anim.type === 'barbarian_cleave_effect' && anim.tgtPx) {
            const barbarianUnit = anim.sourceUnitId 
                ? ((combatManager && combatManager.combatants && combatManager.combatants[anim.sourceUnitId]) 
                    || crew.find(f => f.id === anim.sourceUnitId) 
                    || Object.values(combatManager?.combatants || {}).find(c => c.type === 'barbarian' || c.image === 'barbarian')
                    || crew.find(f => f.class === 'barbarian' || f.type === 'barbarian' || f.image === 'barbarian'))
                : (Object.values(combatManager?.combatants || {}).find(c => c.type === 'barbarian' || c.image === 'barbarian')
                    || crew.find(f => f.class === 'barbarian' || f.type === 'barbarian' || f.image === 'barbarian'));
            const equippedWeapon = barbarianUnit ? (barbarianUnit.inventory || []).find(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === barbarianUnit.id)) : null;
            const weaponIcon = equippedWeapon ? (images[equippedWeapon.icon] || equippedWeapon.icon || images[equippedWeapon.id] || equippedWeapon.image || images[equippedWeapon.name]) : images['axe_2'];

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x + anim.leftOffset}px`,
                    top: `${anim.tgtPx.y + anim.topOffset}px`,
                    width: '60px',
                    height: '60px',
                    transform: `translate(-50%, -50%) rotate(${anim.baseAngle}deg)`,
                    pointerEvents: 'none',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={weaponIcon}
                        alt="cleave weapon"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: `${30 - anim.halfDistPx}px 30px`,
                            animation: 'cleaveStuck 1.1s ease-in-out forwards'
                        }}
                    />
                </div>
            );
        }

        if (anim.type === 'lightning_beam' && anim.tgtPx) {
            const width = 100;
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x - width / 2}px`,
                    top: 0,
                    width: `${width}px`,
                    height: `${anim.tgtPx.y}px`,
                    pointerEvents: 'none',
                    zIndex: 4000,
                    overflow: 'hidden'
                }}>
                    <svg
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            filter: 'drop-shadow(0 0 4px #00ffff) drop-shadow(0 0 8px #ffffff)'
                        }}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                    >
                        <polyline
                            points="30,0 20,40 50,35 25,75 45,70 15,100"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                animation: 'lightningFlash 0.15s ease-in-out infinite'
                            }}
                        />
                        <polyline
                            points="75,0 85,35 60,30 80,65 55,60 70,100"
                            fill="none"
                            stroke="#00ffff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                animation: 'lightningFlash 0.15s ease-in-out infinite 0.05s'
                            }}
                        />
                        <polyline
                            points="50,10 40,45 65,40 45,75 55,70 35,90"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                animation: 'lightningFlash 0.15s ease-in-out infinite 0.1s'
                            }}
                        />
                    </svg>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 255, 255, 0.25)',
                        animation: 'lightningBgFlash 0.12s ease-in-out infinite'
                    }} />
                </div>
            );
        }

        if (anim.type === 'lightning_hit' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x - 50}px`,
                    top: `${anim.tgtPx.y - 50}px`,
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(0,255,255,0.8) 40%, transparent 70%)',
                    boxShadow: '0 0 20px #00ffff, 0 0 40px #ffffff',
                    pointerEvents: 'none',
                    zIndex: 4100,
                    animation: 'explosionPop 0.4s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'bind_beam' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${anim.length}px`,
                    height: '8px',
                    background: 'linear-gradient(to right, rgba(255, 255, 255, 0.1), #ffffff 20%, #e0e7ff 50%, #ffffff 80%, rgba(255, 255, 255, 0.1))',
                    boxShadow: '0 0 8px #ffffff, 0 0 16px #c7d2fe, 0 0 24px rgba(255, 255, 255, 0.6)',
                    transformOrigin: '0 50%',
                    transform: `rotate(${anim.angle}deg) translateY(-50%)`,
                    zIndex: 4800,
                    pointerEvents: 'none',
                    filter: 'blur(0.3px)',
                    animation: 'whiteBeamPulse 0.6s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'bind_hit_ropes' && anim.tgtPx) {
            const size = anim.isTargetLarge ? TILE_SIZE * 2 : TILE_SIZE;
            
            // Find target combatant for portrait overlay
            const targetUnit = anim.tgt ? Object.values(combatManager?.combatants || {}).find(c => {
                if (!c || c.dead || c.isVCT) return false;
                const coords = (Array.isArray(c.occupiedCoords) && c.occupiedCoords.length > 0) ? c.occupiedCoords : [c.coordinates];
                return coords.some(tc => tc.x === anim.tgt.x && tc.y === anim.tgt.y);
            }) : null;
            const portraitUrl = targetUnit?.portrait;

            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4100,
                }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        animation: 'bindRopesOverlay 1.2s ease-out forwards',
                    }}>
                        {portraitUrl && (
                            <div style={{
                                position: 'absolute',
                                left: '10%',
                                top: '10%',
                                width: '80%',
                                height: '80%',
                                backgroundImage: `url(${portraitUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: '50%',
                                border: '3px solid rgba(255, 255, 255, 0.8)',
                                boxShadow: '0 0 15px rgba(255, 255, 255, 0.6)',
                                animation: 'portraitBindSqueeze 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards',
                                zIndex: 1,
                            }} />
                        )}
                        <svg style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 2,
                        }} viewBox="0 0 100 100">
                            <path d="M 10,25 C 30,15 70,35 90,25 M 5,50 C 25,65 75,35 95,50 M 10,75 C 30,65 70,85 90,75 M 20,10 C 10,40 40,60 30,90 M 80,10 C 90,40 60,60 70,90" 
                                  fill="none" 
                                  stroke="#ffffff" 
                                  strokeWidth="5" 
                                  strokeLinecap="round"
                                  style={{ 
                                      filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8)) drop-shadow(0 0 2px rgba(0,0,0,0.8))',
                                      strokeDasharray: '300',
                                      strokeDashoffset: '300',
                                      animation: 'drawRopes 0.8s ease-out forwards'
                                  }} 
                            />
                        </svg>
                    </div>
                </div>
            );
        }

        if (anim.type === 'generic_hit' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x - 25}px`,
                    top: `${anim.tgtPx.y - 25}px`,
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,100,0.7) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: 4000,
                    animation: 'explosionPop 0.4s ease-out forwards',
                }} />
            );
        }

        // ── Trials Beam (purple beam from trials icon to fighter) ─────────────
        if (anim.type === 'trials_beam' && anim.srcPx && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: `${anim.length}px`,
                    height: '10px',
                    background: 'linear-gradient(to right, rgba(138, 43, 226, 0.2), #7b2ff7 25%, #d8b4fe 50%, #7b2ff7 75%, rgba(138, 43, 226, 0.2))',
                    boxShadow: '0 0 12px #7b2cbf, 0 0 24px #a855f7, 0 0 36px rgba(168, 85, 247, 0.6)',
                    transformOrigin: '0 50%',
                    transform: `rotate(${anim.angle}deg) translateY(-50%)`,
                    zIndex: 4800,
                    pointerEvents: 'none',
                    filter: 'blur(0.5px)',
                    animation: 'pinkBeamPulse 1.0s ease-out forwards',
                }} />
            );
        }

        if (anim.type === 'trials_burst' && anim.tgtPx) {
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '0px',
                    height: '0px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4900,
                    animation: 'annihilationRing 0.7s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                }} />
            );
        }

        if ((anim.type === 'trials_icon_appear' || anim.type === 'trials_icon_destroy') && anim.srcPx) {
            // Just a glow pulse — the persistent spinning icon is already rendered separately.
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.srcPx.x}px`,
                    top: `${anim.srcPx.y}px`,
                    width: '200px',
                    height: '200px',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.55) 0%, rgba(123,44,191,0.25) 50%, transparent 80%)',
                    pointerEvents: 'none',
                    zIndex: 5100,
                    animation: anim.type === 'trials_icon_appear'
                        ? 'fadeIn 0.9s ease-out forwards'
                        : 'explosionPop 0.8s ease-out forwards',
                }} />
            );
        }

        // ── Djinn Rift – Phase 1: vertical energy line appears ──────────────
        // ── Djinn Rift – Phase 1: vertical energy line appears ──────────────
        if (anim.type === 'rift_line_appear' && anim.spawnPx) {
            const lineH = TILE_SIZE * 3;
            const containerW = 40;
            const embers = [
                { id: 1, top: '15%', left: '8px', size: '5px', delay: '0s', color: '#c084fc' },
                { id: 2, top: '35%', left: '22px', size: '4px', delay: '0.4s', color: '#a855f7' },
                { id: 3, top: '50%', left: '12px', size: '6px', delay: '0.2s', color: '#ffffff' },
                { id: 4, top: '65%', left: '26px', size: '3px', delay: '0.7s', color: '#c084fc' },
                { id: 5, top: '80%', left: '14px', size: '5px', delay: '0.1s', color: '#a855f7' },
                { id: 6, top: '92%', left: '20px', size: '4px', delay: '0.9s', color: '#ffffff' }
            ];
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.spawnPx.x - TILE_SIZE / 2}px`,
                    top:  `${anim.spawnPx.y - lineH / 2}px`,
                    width: `${containerW}px`,
                    height: `${lineH}px`,
                    transformOrigin: 'center top',
                    zIndex: 4900,
                    pointerEvents: 'none',
                    animation: `riftLineAppear ${anim.duration || 1800}ms ease-out forwards`,
                    overflow: 'visible',
                }}>
                    <svg
                        viewBox="0 0 40 300"
                        width="100%"
                        height="100%"
                        preserveAspectRatio="none"
                        style={{
                            overflow: 'visible',
                            animation: 'riftFluidWobble 4s ease-in-out infinite alternate'
                        }}
                    >
                        <path
                            d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                            fill="none"
                            stroke="#7c3aed"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: 'blur(3px)', opacity: 0.8 }}
                        />
                        <path
                            d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                            fill="none"
                            stroke="#c084fc"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0 0 6px #7c3aed)' }}
                        />
                        <path
                            d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ animation: 'riftCoreShimmer 0.8s ease-in-out infinite alternate' }}
                        />
                    </svg>
                    {embers.map(e => (
                        <div key={e.id} style={{
                            position: 'absolute',
                            top: e.top,
                            left: e.left,
                            width: e.size,
                            height: e.size,
                            borderRadius: '50%',
                            backgroundColor: e.color,
                            boxShadow: `0 0 6px ${e.color}, 0 0 12px ${e.color}`,
                            pointerEvents: 'none',
                            animation: `riftEmbers 1.4s ease-out infinite`,
                            animationDelay: e.delay
                        }} />
                    ))}
                </div>
            );
        }

        // ── Djinn Rift – Phase 2: line sweeps 2 tiles forward and fades ──────
        if (anim.type === 'rift_line_sweep' && anim.spawnPx) {
            const lineH = TILE_SIZE * 3;
            const containerW = 40;
            const sweepPx = anim.sweepDistancePx || TILE_SIZE * 2;
            const embers = [
                { id: 1, top: '15%', left: '8px', size: '5px', delay: '0s', color: '#c084fc' },
                { id: 2, top: '35%', left: '22px', size: '4px', delay: '0.4s', color: '#a855f7' },
                { id: 3, top: '50%', left: '12px', size: '6px', delay: '0.2s', color: '#ffffff' },
                { id: 4, top: '65%', left: '26px', size: '3px', delay: '0.7s', color: '#c084fc' },
                { id: 5, top: '80%', left: '14px', size: '5px', delay: '0.1s', color: '#a855f7' },
                { id: 6, top: '92%', left: '20px', size: '4px', delay: '0.9s', color: '#ffffff' }
            ];
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.spawnPx.x - TILE_SIZE / 2}px`,
                    top:  `${anim.spawnPx.y - lineH / 2}px`,
                    width: `${containerW}px`,
                    height: `${lineH}px`,
                    transformOrigin: 'center center',
                    zIndex: 4950,
                    pointerEvents: 'none',
                    animation: `riftLineSweep ${anim.duration || 500}ms ease-in forwards`,
                    '--rift-sweep': `${-sweepPx}px`,
                    overflow: 'visible',
                }}>
                    <svg
                        viewBox="0 0 40 300"
                        width="100%"
                        height="100%"
                        preserveAspectRatio="none"
                        style={{
                            overflow: 'visible',
                            animation: 'riftFluidWobble 4s ease-in-out infinite alternate'
                        }}
                    >
                        <path
                            d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                            fill="none"
                            stroke="#7c3aed"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: 'blur(3px)', opacity: 0.8 }}
                        />
                        <path
                            d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                            fill="none"
                            stroke="#c084fc"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0 0 6px #7c3aed)' }}
                        />
                        <path
                            d="M 20,0 L 12,30 L 28,60 L 10,90 L 30,120 L 14,150 L 26,180 L 10,210 L 28,240 L 12,270 L 20,300"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ animation: 'riftCoreShimmer 0.8s ease-in-out infinite alternate' }}
                        />
                    </svg>
                    {embers.map(e => (
                        <div key={e.id} style={{
                            position: 'absolute',
                            top: e.top,
                            left: e.left,
                            width: e.size,
                            height: e.size,
                            borderRadius: '50%',
                            backgroundColor: e.color,
                            boxShadow: `0 0 6px ${e.color}, 0 0 12px ${e.color}`,
                            pointerEvents: 'none',
                            animation: `riftEmbers 1.4s ease-out infinite`,
                            animationDelay: e.delay
                        }} />
                    ))}
                </div>
            );
        }

        // ── Return from Trial overlay ─────────────────────────────────────────
        if (anim.type === 'return_from_trial' && anim.tgtPx) {
            const returnIcons = [
                images['return_from_trial_1'],
                images['return_from_trial_2'],
                images['return_from_trial_3'],
            ];
            const iconSrc = returnIcons[anim.trialIndex] || returnIcons[0];
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${anim.tgtPx.x}px`,
                    top: `${anim.tgtPx.y}px`,
                    width: '140px',
                    height: '140px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 5600,
                    animation: 'scaleUpFadeOut 2.5s ease-out forwards',
                    backgroundImage: `url(${iconSrc})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 75%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 75%)',
                    filter: 'drop-shadow(0 0 14px #a855f7) drop-shadow(0 0 28px #7b2cbf)',
                }} />
            );
        }
        if (anim.type === 'celestial_arrow_hit' && anim.x !== undefined && anim.y !== undefined) {
            const px = {
                x: tilePos(anim.x) + TILE_SIZE / 2,
                y: tilePos(anim.y) + TILE_SIZE / 2
            };
            return (
                <div key={key} style={{
                    position: 'absolute',
                    left: `${px.x}px`,
                    top: `${px.y}px`,
                    width: '160px',
                    height: '160px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 4200,
                }}>
                    <div style={{
                        width: '100%', height: '100%',
                        position: 'absolute', top: 0, left: 0,
                        animation: 'scaleUpFadeOut 0.5s ease-out forwards',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.9) 10%, rgba(255,221,87,0.7) 40%, transparent 70%)',
                        boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,221,87,0.5)',
                        borderRadius: '50%',
                        mixBlendMode: 'screen'
                    }} />
                    <div style={{
                        width: '100%', height: '100%',
                        position: 'absolute', top: 0, left: 0,
                        animation: 'scaleUpFadeOut 0.7s ease-out forwards',
                        border: '4px solid rgba(255, 255, 255, 0.6)',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px rgba(255, 221, 87, 0.8)'
                    }} />
                </div>
            );
        }

        return null;
    };


    // ── VCT units — damage indicators only, no portrait ──────────────────────
    const vctUnits = Object.values(battleData).filter(u => u && u.isVCT);

    // ── Rift Portal rendering helper ─────────────────────────────────────────
    const renderRiftPortal = () => {
        // Find any crew Summoner with an active rift portal
        const summoner = crew.find(f => f.type === 'summoner');
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
    };

    // ── Monster units — exclude VCT and trials_icon (rendered separately) ─────
    const monsterUnits = Object.values(battleData).filter(u => u && (u.isMonster || u.isMinion) && !crewIds.has(u.id) && !u.isVCT && !u.isTrialIcon);

    const getUnitCenterPx = (unitId) => {
        // Find in crew
        const fighter = crew.find(f => f.id === unitId);
        if (fighter) {
            const coords = battleData[fighter.id]?.coordinates;
            if (!coords) return null;
            return {
                x: tilePos(coords.x) + TILE_SIZE / 2,
                y: tilePos(coords.y) + TILE_SIZE / 2
            };
        }
        // Find in monsters
        const unit = Object.values(battleData).find(u => u && u.id === unitId);
        if (unit && unit.coordinates) {
            const isHuge = checkHuge(unit);
            const isLarge = checkLarge(unit);
            const width = isHuge 
                ? TILE_SIZE * 3 + (SHOW_TILE_BORDERS ? 4 : 0) 
                : (isLarge ? TILE_SIZE * 2 + (SHOW_TILE_BORDERS ? 2 : 0) : TILE_SIZE);
            const height = isHuge 
                ? TILE_SIZE * 3 + (SHOW_TILE_BORDERS ? 4 : 0) 
                : (isLarge ? TILE_SIZE * 2 + (SHOW_TILE_BORDERS ? 2 : 0) : TILE_SIZE);
            const hOffset = isHuge 
                ? ((unit.coordinates.x >= 4) ? -TILE_SIZE * 2 - (SHOW_TILE_BORDERS ? 4 : 0) : 0)
                : ((isLarge && unit.coordinates.x >= 4) ? -TILE_SIZE - (SHOW_TILE_BORDERS ? 2 : 0) : 0);
            const vOffset = isHuge 
                ? -TILE_SIZE * 2 - (SHOW_TILE_BORDERS ? 4 : 0) 
                : (isLarge ? -TILE_SIZE - (SHOW_TILE_BORDERS ? 2 : 0) : 0);
            return {
                x: tilePos(unit.coordinates.x) + hOffset + width / 2,
                y: tilePos(unit.coordinates.y) + vOffset + height / 2
            };
        }
        return null;
    };

    const renderSoulSuckChannelingBeams = () => {
        return Object.values(battleData).map(unit => {
            if (!unit || !unit.soulSuckChanneling || unit.dead) return null;
            const { targetId } = unit.soulSuckChanneling;
            const srcPx = getUnitCenterPx(unit.id);
            const tgtPx = getUnitCenterPx(targetId);
            if (!srcPx || !tgtPx) return null;

            const dx = tgtPx.x - srcPx.x;
            const dy = tgtPx.y - srcPx.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
                <div key={`soul_suck_channel_${unit.id}`} style={{
                    position: 'absolute',
                    left: `${srcPx.x}px`,
                    top: `${srcPx.y}px`,
                    width: `${len}px`,
                    height: '24px',
                    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 0%, #ffffff 50%, rgba(255, 255, 255, 0.2) 100%)',
                    boxShadow: '0 0 15px #ffffff, 0 0 30px #ffffff',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg) translateY(-50%)`,
                    zIndex: 4000,
                    pointerEvents: 'none',
                    animation: 'pinkBeamPulse 0.8s ease-in-out infinite alternate',
                }} />
            );
        });
    };

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="combat-units-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    {Object.entries(meltScales).map(([unitId, scale]) => (
                        <filter key={unitId} id={`melt-effect-${unitId}`}>
                            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.15" numOctaves="2" result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale} xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                    ))}
                </defs>
            </svg>
            {/* Fighters */}
            {activeCrew.map(renderFighter)}
            {renderRiftPortal()}

            {/* VCT damage indicators only */}
            {vctUnits.map(vct => {
                if (!vct.coordinates) return null;
                return (
                    <div key={vct.id} className="vct-unit-tile" style={{
                        position: 'absolute',
                        left: `${tilePos(vct.coordinates.x)}px`,
                        top: `${tilePos(vct.coordinates.y)}px`,
                        width: `${TILE_SIZE}px`,
                        height: `${TILE_SIZE}px`,
                        overflow: 'visible',
                        zIndex: 300,
                        pointerEvents: 'none',
                    }}>
                        <div className="portrait-overlay" style={{ zIndex: 301, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                            {renderDamageIndicators(vct.id)}
                        </div>
                    </div>
                );
            })}

            {/* Monsters + Minions */}
            {monsterUnits.map(renderMonsterUnit)}

            {/* Soul Suck continuous channeling beams */}
            {renderSoulSuckChannelingBeams()}

            {/* ── Sphinx Trials: spinning trial effect icon above Sphinx ── */}
            {(() => {
                const trialsIcon = battleData['trials_icon'];
                if (!trialsIcon || !trialsIcon.coordinates) return null;
                // Fixed coords set at cast time — icon never moves
                const ic = trialsIcon.coordinates;
                // 2×2 tile block — standard top-left positioning (same as fighter tiles)
                const iconLeft = tilePos(ic.x);
                const iconTop  = tilePos(ic.y);
                const iconW    = TILE_SIZE * 2;   // 200px
                const iconH    = TILE_SIZE * 2;   // 200px
                const hpPct    = trialsIcon.maxHp > 0 ? Math.max(0, trialsIcon.hp / trialsIcon.maxHp) : 0;
                const isDying  = !!trialsIcon.dying;
                // Core: single tile, centered within the 2×2 block
                const coreSize = TILE_SIZE;
                const coreLeft = iconLeft + (iconW - coreSize) / 2;  // = iconLeft + 50
                const coreTop  = iconTop  + (iconH - coreSize) / 2;  // = iconTop  + 50
                // HP bar: flush at the south pixel edge of the 2×2 block
                const barH    = 3;
                const barTop  = iconTop + iconH - barH;              // = iconTop + 197

                return (
                    <React.Fragment key="trials_icon_persistent">
                        {/* Outer vortex container — 2×2 tile block, pure rotate (no translate) */}
                        <div
                            style={{
                                position: 'absolute',
                                left: `${iconLeft}px`,
                                top: `${iconTop}px`,
                                width: `${iconW}px`,
                                height: `${iconH}px`,
                                zIndex: 5200,
                                pointerEvents: isDying ? 'none' : 'auto',
                                cursor: isDying ? 'default' : 'pointer',
                                overflow: 'visible',
                            }}
                        >
                            {/* Glow halo — extends slightly beyond the container */}
                            <div style={{
                                position: 'absolute',
                                top: '-20%', left: '-20%',
                                width: '140%', height: '140%',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(123,44,191,0.18) 45%, transparent 70%)',
                                filter: 'blur(20px)',
                                animation: isDying
                                    ? 'trialIconMelt 2.5s cubic-bezier(0.6,0,1,1) forwards'
                                    : 'trialOuterSpin 8s linear infinite reverse',
                                pointerEvents: 'none',
                            }} />
                            {/* Spinning outer icon — fills the 2×2 block exactly, fuzzy circular mask */}
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                backgroundImage: `url(${images['trial_effect_icon']})`,
                                backgroundSize: 'cover',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0.65) 52%, rgba(0,0,0,0) 75%)',
                                WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0.65) 52%, rgba(0,0,0,0) 75%)',
                                filter: 'drop-shadow(0 0 14px #a855f7) drop-shadow(0 0 30px #7b2cbf)',
                                animation: isDying
                                    ? 'trialIconMelt 2.5s cubic-bezier(0.6,0,1,1) forwards'
                                    : 'trialOuterSpin 3s linear infinite',
                                opacity: isDying ? undefined : 0.92,
                                pointerEvents: 'none',
                                transformOrigin: 'center center',
                            }} />
                        </div>
                        {/* Trial Core — single tile centered in the 2×2 block, spins counter-clockwise */}
                        <div style={{
                            position: 'absolute',
                            left: `${coreLeft}px`,
                            top: `${coreTop}px`,
                            width: `${coreSize}px`,
                            height: `${coreSize}px`,
                            zIndex: 5210,
                            pointerEvents: 'none',
                            backgroundImage: `url(${images['trial_core']})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            // Very fuzzy radial mask — fade to transparent well before the edges
                            maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 22%, rgba(0,0,0,0.7) 42%, rgba(0,0,0,0.2) 62%, rgba(0,0,0,0) 80%)',
                            WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 22%, rgba(0,0,0,0.7) 42%, rgba(0,0,0,0.2) 62%, rgba(0,0,0,0) 80%)',
                            filter: 'drop-shadow(0 0 10px #f59e0b) drop-shadow(0 0 22px #d97706)',
                            animation: isDying
                                ? 'trialCoreFade 2.5s cubic-bezier(0.6,0,1,1) forwards'
                                : 'trialCoreSpin 4s linear infinite',
                            transformOrigin: 'center center',
                        }} />
                        {/* HP bar — flush at south edge of the 2×2 block, hidden while dying */}
                        {!isDying && (
                            <div style={{
                                position: 'absolute',
                                left: `${iconLeft}px`,
                                top: `${barTop}px`,
                                width: `${iconW}px`,
                                height: `${barH}px`,
                                background: 'rgba(0,0,0,0.5)',
                                borderRadius: '2px',
                                overflow: 'hidden',
                                zIndex: 5201,
                                pointerEvents: 'none',
                            }}>
                                <div style={{
                                    width: `${hpPct * 100}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #c0392b, #e74c3c)',
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })()}

            {/* ── Sphinx Trials: trial marker icons for off-board fighters ── */}
            {crew.map(f => {
                const liveFighter = getLiveCombatant(f.id) || battleData[f.id];
                if (!liveFighter || typeof liveFighter.inTrial !== 'number') return null;
                const preCoords = liveFighter.preTrialCoordinates;
                if (!preCoords) return null;
                const markerIcons = [
                    images['first_trial'],
                    images['second_trial'],
                    images['third_trial'],
                ];
                const markerSrc = markerIcons[liveFighter.inTrial] || markerIcons[0];
                // Position exactly like fighters: tilePos(x/y), TILE_SIZE × TILE_SIZE
                const mx = tilePos(preCoords.x);
                const my = tilePos(preCoords.y);
                return (
                    <div
                        key={`trial_marker_${f.id}`}
                        style={{
                            position: 'absolute',
                            left: `${mx}px`,
                            top: `${my}px`,
                            width: `${TILE_SIZE}px`,
                            height: `${TILE_SIZE}px`,
                            zIndex: 400,
                            pointerEvents: 'none',
                            overflow: 'visible',
                        }}
                    >
                        {/* Fuzzy outer glow halo centered */}
                        <div style={{
                            position: 'absolute',
                            top: '10px', left: '10px',
                            width: '80px', height: '80px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(123,44,191,0.1) 50%, transparent 75%)',
                            filter: 'blur(10px)',
                            animation: 'trialOuterSpin 8s linear infinite reverse',
                        }} />
                        {/* Portal icon centered within the tile */}
                        <div style={{
                            position: 'absolute',
                            top: '20px', left: '20px',
                            width: '60px', height: '60px',
                            backgroundImage: `url(${markerSrc})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 78%)',
                            WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 78%)',
                            filter: 'drop-shadow(0 0 10px #a855f7) drop-shadow(0 0 20px #7b2cbf)',
                            animation: 'trialOuterSpin 4s linear infinite',
                            opacity: 0.9,
                            transformOrigin: 'center center',
                        }} />
                    </div>
                );
            })}

            {/* Sandbox-style CSS animation overlays from AnimationManagerRedux */}
            {activeAnimations.map(renderAnimation)}

            {/* --- Bombard Warning Shimmer Overlays --- */}
            {combatManager && combatManager.bombardWarnings && combatManager.bombardWarnings.tiles && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
                    {combatManager.bombardWarnings.tiles.map((tile, tIdx) => {
                        const top = tilePos(tile.y);
                        const left = tilePos(tile.x);
                        return (
                            <div 
                                key={`bombard-warning-${tIdx}`}
                                className="bombard-warning-shimmer"
                                style={{
                                    position: 'absolute',
                                    left: `${left}px`,
                                    top: `${top}px`,
                                    width: `${TILE_SIZE}px`,
                                    height: `${TILE_SIZE}px`,
                                    backgroundColor: 'rgba(0, 255, 255, 0.03)',
                                    zIndex: 30
                                }}
                            />
                        );
                    })}
                </div>
            )}

            {/* --- Meteor Warning Shimmer Overlays --- */}
            {combatManager && combatManager.meteorWarnings && combatManager.meteorWarnings.tiles && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
                    {combatManager.meteorWarnings.tiles.map((tile, tIdx) => {
                        const top = tilePos(tile.y);
                        const left = tilePos(tile.x);
                        return (
                            <div 
                                key={`meteor-warning-${tIdx}`}
                                className="meteor-warning-shimmer"
                                style={{
                                    position: 'absolute',
                                    left: `${left}px`,
                                    top: `${top}px`,
                                    width: `${TILE_SIZE}px`,
                                    height: `${TILE_SIZE}px`,
                                    backgroundColor: 'rgba(255, 140, 0, 0.03)',
                                    zIndex: 30
                                }}
                            />
                        );
                    })}
                </div>
            )}

            {/* --- Spiderweb Area Overlays --- */}
            {combatManager && Array.isArray(combatManager.activeWebs) && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 25 }}>
                    {combatManager.activeWebs.map((web) => {
                        const top = tilePos(web.y - 1);
                        const left = tilePos(web.x - 1);
                        const size = TILE_SIZE * 3 + (SHOW_TILE_BORDERS ? 4 : 0);
                        const webIconUrl = images.spiderweb?.default || images.spiderweb || '';
                        return (
                            <div 
                                key={`web-${web.id}`}
                                className="web-overlay-single"
                                style={{
                                    position: 'absolute',
                                    left: `${left}px`,
                                    top: `${top}px`,
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    backgroundImage: webIconUrl ? `url(${webIconUrl})` : 'none',
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    opacity: 0.55,
                                    mixBlendMode: 'screen',
                                    pointerEvents: 'none',
                                    zIndex: 25,
                                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%)',
                                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%)',
                                    animation: 'pulse 2s ease-in-out infinite'
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
