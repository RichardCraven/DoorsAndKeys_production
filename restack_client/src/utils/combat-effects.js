// combat-effects.js
// Centralized helpers for applying and clearing combat effects (visual and stateful)
import { getDurationRounds } from './shared-constants';

/**
 * Applies the "drained" effect to a combatant (energy drain visual flag).
 * - Sets drained=true, drained_eras=1 (cleared in restartTurnCycle)
 * - Sets energy=0
 * - Optionally triggers a data update callback
 * @param {object} target - The combatant object to apply the effect to
 * @param {function} [broadcastDataUpdate] - Optional callback to trigger UI update
 */
export function applyDrainedEffect(target, broadcastDataUpdate) {
    if (!target) return false;
    target.energy = 0;
    target.drained = true;
    target.drained_eras = 1; // cleared in restartTurnCycle
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearDrainedEffect(target) {
    if (!target) return;
    target.drained = false;
    target.drained_eras = 0;
}

export function isUndead(unit) {
    if (!unit) return false;
    const subtype = String(unit.subtype || '').toLowerCase();
    const type = String(unit.type || '').toLowerCase();
    const key = String(unit.key || '').toLowerCase();
    const id = String(unit.id || '').toLowerCase();
    return subtype === 'undead' ||
           type === 'skeleton' || type === 'zombie' || type === 'wraith' || type === 'vampire' || type === 'ghoul' || type === 'mummy' ||
           key === 'skeleton' || key === 'zombie' || key === 'wraith' || key === 'vampire' || key === 'ghoul' || key === 'mummy' ||
           id.includes('skeleton') || id.includes('zombie') || id.includes('wraith') || id.includes('vampire') || id.includes('ghoul') || id.includes('mummy');
}

/**
 * Applies the "bleed" effect to a combatant.
 * - Sets bleed=true, bleed_eras=duration
 * @param {object} target - The combatant object
 * @param {number} duration - Duration in eras
 * @param {function} [broadcastDataUpdate] - Optional callback
 */
export function applyBleedEffect(target, duration, broadcastDataUpdate) {
    if (!target) return false;
    if (isUndead(target)) return false;
    target.bleed = true;
    target.bleed_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

/**
 * Clears the "bleed" effect from a combatant.
 * @param {object} target - The combatant object
 */
export function clearBleedEffect(target) {
    if (!target) return;
    target.bleed = false;
    target.bleed_eras = 0;
}

/**
 * Applies the "energy drain" effect to a combatant.
 * - Sets energy to 0
 * - Sets drained=true, drained_eras=duration
 * @param {object} target - The combatant object
 * @param {number} duration - Duration in eras
 * @param {function} [broadcastDataUpdate] - Optional callback
 */
export function applyEnergyDrainEffect(target, duration, broadcastDataUpdate) {
    if (!target) return false;
    target.energy = 0;
    target.drained = true;
    target.drained_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

/**
 * Applies the "stun" effect to a combatant.
 * - Sets stunned=true, stunned_eras=duration
 * @param {object} target - The combatant object
 * @param {number} duration - Duration in eras
 * @param {function} [broadcastDataUpdate] - Optional callback
 */
export function applyStunEffect(target, duration, broadcastDataUpdate) {
    if (!target) return false;
    // Don't refresh stun if already stunned (standard game logic in combat-manager)
    if (!target.stunned) {
        target.stunned = true;
        target.stunned_eras = duration || 1;
        if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
        return true;
    }
    return false;
}

/**
 * Clears the "stun" effect from a combatant.
 * @param {object} target - The combatant object
 */
export function clearStunEffect(target) {
    if (!target) return;
    target.stunned = false;
    target.stunned_eras = 0;
}

/**
 * Applies the "regeneration" effect to a combatant.
 * - Sets regenerating=true, regenerating_eras=duration, regeneration_percent=percent
 * @param {object} target - The combatant object
 * @param {number} duration - Duration in eras
 * @param {number} percent - Percentage of max HP to heal per era
 * @param {function} [broadcastDataUpdate] - Optional callback
 */
export function applyRegenerationEffect(target, duration, percent, broadcastDataUpdate) {
    if (!target) return false;
    target.regenerating = true;
    target.regenerating_eras = duration || 1;
    target.regeneration_percent = percent || 0;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

/**
 * Applies invisibility to a combatant.
 * - Sets invisible=true, invisible_eras=duration
 * - While invisible, combatants should be untargetable and unable to attack/special
 *   (movement and passive energy regen continue elsewhere in turn logic).
 */
export function applyInvisibilityEffect(target, duration, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    target.invisible = true;
    target.invisible_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearInvisibilityEffect(target) {
    if (!target) return;
    target.invisible = false;
    target.invisible_eras = 0;
}

/**
 * Applies petrify to a combatant.
 * - Sets petrified=true, petrified_eras=duration
 * - While petrified, combatants are immobile, unable to act, and invulnerable
 *   (invulnerability is enforced in combat-manager hit application).
 */
export function applyPetrifyEffect(target, duration, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    target.petrified = true;
    target.petrified_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearPetrifyEffect(target) {
    if (!target) return;
    target.petrified = false;
    target.petrified_eras = 0;
}

/**
 * Applies frozen to a combatant.
 * - Sets frozen=true, frozen_eras=duration
 * - While frozen, combatants take 50% reduced damage (except from arcane/psionic sources)
 * @param {object} target - The combatant object
 * @param {number} duration - Duration in eras
 * @param {function} [broadcastDataUpdate] - Optional callback
 */
export function applyFrozenEffect(target, duration, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    target.frozen = true;
    target.frozen_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearFrozenEffect(target) {
    if (!target) return;
    target.frozen = false;
    target.frozen_eras = 0;
}

/**
 * Applies a temporary defense break to a combatant.
 * - Stores current DEF once, reduces by percentage, and tracks era duration.
 * - Restoration is handled by fighter turn-cycle era ticking in factories.js.
 */
export function applyDefenseBreakEffect(target, duration, percent, broadcastDataUpdate) {
    if (!target || !target.stats || typeof target.stats.def !== 'number') return false;

    const currentDef = target.stats.def;
    if (target._defBrokenOriginalDef == null) target._defBrokenOriginalDef = currentDef;

    const reductionPercent = typeof percent === 'number' ? percent : 50;
    const reducedDef = Math.max(0, Math.floor(currentDef * (1 - (reductionPercent / 100))));
    target.stats.def = reducedDef;
    target.def = reducedDef;
    target.defBroken = true;
    target.defBroken_eras = Math.max(1, Math.floor(duration || 1));

    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearDefenseBreakEffect(target) {
    if (!target) return;
    if (target._defBrokenOriginalDef != null) {
        const restore = target._defBrokenOriginalDef;
        if (target.stats) target.stats.def = restore;
        target.def = restore;
    }
    target.defBroken = false;
    target.defBroken_eras = 0;
    target._defBrokenOriginalDef = null;
}

export function applyPsionicBurnEffect(target, duration, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    target.psionicBurn = true;
    target.psionicBurn_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearPsionicBurnEffect(target) {
    if (!target) return;
    target.psionicBurn = false;
    target.psionicBurn_eras = 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// MENTALITY DEBUFF SYSTEM
// Contested willpower resolution for mind-affecting skills.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Core contested resolution for mentality debuffs.
 * Uses caster willpower vs target willpower + the skill's intrinsic power
 * to determine outcome tier and chance of application.
 *
 * @param {object} caster - The caster combatant (needs stats.willpower)
 * @param {object} target - The target combatant (needs stats.willpower)
 * @param {object} skill  - The skill definition (needs .power and .effect)
 * @returns {{ outcome: string, applied: boolean, adjustedDuration: number, halfEffect: boolean }}
 */
export function resolveMentalityDebuff(caster, target, skill) {
    const casterWP = (caster && caster.stats && typeof caster.stats.willpower === 'number')
        ? caster.stats.willpower : 0;
    const targetWP = (target && target.stats && typeof target.stats.willpower === 'number')
        ? target.stats.willpower : 0;
    const skillPower = (skill && typeof skill.power === 'number') ? skill.power : 0;

    const dominance = (casterWP - targetWP) + (skillPower / 5);

    let outcome, chance;
    if (dominance >= 10) {
        outcome = 'full';
        chance = 100;
    } else if (dominance >= 0) {
        outcome = 'strong';
        chance = 80;
    } else if (dominance >= -9) {
        outcome = 'partial';
        chance = 50;
    } else {
        outcome = 'resisted';
        chance = 20;
    }

    const baseRawDuration = (skill && skill.effect && skill.effect.duration !== undefined)
        ? skill.effect.duration : (skill && skill.duration ? skill.duration : 'short');
    const baseDuration = getDurationRounds(baseRawDuration);
    
    const halfEffect = (outcome === 'partial' || outcome === 'resisted');
    const adjustedDuration = halfEffect ? Math.max(1, Math.ceil(baseDuration / 2)) : baseDuration;

    const roll = Math.random() * 100;
    const applied = roll < chance;

    return { outcome, applied, adjustedDuration, halfEffect };
}

// ── Sleep ─────────────────────────────────────────────────────────────────────
/**
 * Puts a target to sleep. While asleep, the target cannot move or attack.
 * Sleep is broken when the target takes damage (handled in combat-manager hit logic).
 */
export function applySleepEffect(target, duration, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    target.asleep = true;
    target.asleep_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearSleepEffect(target) {
    if (!target) return;
    target.asleep = false;
    target.asleep_eras = 0;
}

// ── Fear ──────────────────────────────────────────────────────────────────────
/**
 * Inflicts fear on a target, reducing ATK and DEF by specified percentages.
 * Stores original values so they can be restored when fear expires.
 */
export function applyFearEffect(target, duration, atkReductionPercent, defReductionPercent, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    // Don't re-apply if already feared
    if (target.feared) return false;

    const atkPct = typeof atkReductionPercent === 'number' ? atkReductionPercent : 30;
    const defPct = typeof defReductionPercent === 'number' ? defReductionPercent : 30;

    // Store original values for restoration
    if (target._fearOriginalAtk == null) target._fearOriginalAtk = target.atk;
    if (target._fearOriginalDef == null) {
        target._fearOriginalDef = (target.stats && typeof target.stats.def === 'number')
            ? target.stats.def : target.def;
    }

    target.atk = Math.max(0, Math.floor(target.atk * (1 - atkPct / 100)));
    const currentDef = (target.stats && typeof target.stats.def === 'number') ? target.stats.def : (target.def || 0);
    const newDef = Math.max(0, Math.floor(currentDef * (1 - defPct / 100)));
    if (target.stats) target.stats.def = newDef;
    target.def = newDef;

    target.feared = true;
    target.feared_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearFearEffect(target) {
    if (!target) return;
    if (target._fearOriginalAtk != null) { target.atk = target._fearOriginalAtk; delete target._fearOriginalAtk; }
    if (target._fearOriginalDef != null) {
        if (target.stats) target.stats.def = target._fearOriginalDef;
        target.def = target._fearOriginalDef;
        delete target._fearOriginalDef;
    }
    target.feared = false;
    target.feared_eras = 0;
}

// ── Ensnared (Bind) ───────────────────────────────────────────────────────────
/**
 * Ensnares a target with psychic shackles. Target cannot move but can still attack.
 */
export function applyEnsnaredEffect(target, duration, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    target.ensnared = true;
    target.ensnared_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearEnsnaredEffect(target) {
    if (!target) return;
    target.ensnared = false;
    target.ensnared_eras = 0;
}

// ── Betrayal ──────────────────────────────────────────────────────────────────
/**
 * Betrayal forces the target to switch sides for the duration.
 * Stores original isMonster/isMinion flags so they can be restored on expiry.
 * The target's current targetId is cleared so it reacquires enemies on its
 * (now-flipped) side.
 */
export function applyBetrayalEffect(target, duration, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    if (target.betrayed) return false; // don't stack

    // Store original allegiance flags
    target._betrayalOriginalIsMonster = !!target.isMonster;
    target._betrayalOriginalIsMinion = !!target.isMinion;

    // Flip sides: if they were a monster/minion, make them fight for the player.
    // If they were a player unit, make them fight for the monsters.
    if (target.isMonster || target.isMinion) {
        target.isMonster = false;
        target.isMinion = false;
    } else {
        // Player unit → now fights as a minion on the monster side
        target.isMinion = true;
    }

    // Clear current target so AI reacquires against the correct side
    target.targetId = null;
    target.pendingAttack = null;

    target.betrayed = true;
    target.betrayed_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearBetrayalEffect(target) {
    if (!target) return;

    // Restore original allegiance
    if (target._betrayalOriginalIsMonster != null) {
        target.isMonster = target._betrayalOriginalIsMonster;
        delete target._betrayalOriginalIsMonster;
    }
    if (target._betrayalOriginalIsMinion != null) {
        target.isMinion = target._betrayalOriginalIsMinion;
        delete target._betrayalOriginalIsMinion;
    }

    // Clear target so it reacquires correct enemies after switching back
    target.targetId = null;
    target.pendingAttack = null;

    target.betrayed = false;
    target.betrayed_eras = 0;
}

// ── Crimson Sight ─────────────────────────────────────────────────────────────
/**
 * Exposes vulnerabilities in the target, reducing their DEF by a percentage.
 * Stores original DEF for restoration.
 */
export function applyCrimsonSightEffect(target, duration, defReductionPercent, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;
    if (target.crimsonSight) return false; // don't stack

    const pct = typeof defReductionPercent === 'number' ? defReductionPercent : 40;
    const currentDef = (target.stats && typeof target.stats.def === 'number') ? target.stats.def : (target.def || 0);

    if (target._crimsonSightOriginalDef == null) target._crimsonSightOriginalDef = currentDef;

    const newDef = Math.max(0, Math.floor(currentDef * (1 - pct / 100)));
    if (target.stats) target.stats.def = newDef;
    target.def = newDef;

    target.crimsonSight = true;
    target.crimsonSight_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearCrimsonSightEffect(target) {
    if (!target) return;
    if (target._crimsonSightOriginalDef != null) {
        if (target.stats) target.stats.def = target._crimsonSightOriginalDef;
        target.def = target._crimsonSightOriginalDef;
        delete target._crimsonSightOriginalDef;
    }
    target.crimsonSight = false;
    target.crimsonSight_eras = 0;
}

// ── Twin Finger Stun ──────────────────────────────────────────────────────────
/**
 * Strikes critical chakra points, stunning the target and reducing ATK.
 * Combines stun + ATK debuff in a single mentality status.
 */
export function applyTwinFingerStunEffect(target, duration, atkReductionPercent, broadcastDataUpdate) {
    if (!target || target.hp <= 0) return false;

    const pct = typeof atkReductionPercent === 'number' ? atkReductionPercent : 20;

    if (target._twinFingerOriginalAtk == null) target._twinFingerOriginalAtk = target.atk;

    target.atk = Math.max(0, Math.floor(target.atk * (1 - pct / 100)));

    // Also apply stun
    target.stunned = true;
    target.stunned_eras = duration || 1;

    target.twinFingerStun = true;
    target.twinFingerStun_eras = duration || 1;
    if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
    return true;
}

export function clearTwinFingerStunEffect(target) {
    if (!target) return;
    if (target._twinFingerOriginalAtk != null) {
        target.atk = target._twinFingerOriginalAtk;
        delete target._twinFingerOriginalAtk;
    }
    target.twinFingerStun = false;
    target.twinFingerStun_eras = 0;
    // Note: stun is cleared separately via its own era countdown
}

// ══════════════════════════════════════════════════════════════════════════════
// CENTRALIZED EFFECT DISPATCHER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Centralized dispatcher for applying combat effects from attacks.
 * Handles the chance roll and routes to the specific effect helper.
 * For mentality debuffs (effect.mentalityDebuff === true), uses contested
 * willpower resolution instead of flat chance.
 * @param {object} target - The combatant being hit
 * @param {object} effect - The effect definition { type, chance, duration }
 * @param {function} [broadcastDataUpdate] - Optional callback for UI updates
 * @param {boolean} [isCrit] - Whether the triggering attack was a critical hit
 * @param {object} [caster] - The caster combatant (required for mentality debuffs)
 * @param {object} [skill] - The full skill definition (required for mentality debuffs)
 */
export function applyAttackEffect(target, effect, broadcastDataUpdate, isCrit, caster, skill) {
    if (!target || !effect || target.hp <= 0) return null;
    
    // Resolve effect type: prefer effect.type, but if it's 'special', use effect.name.
    // This allows the dispatcher to handle both standard attacks and special abilities.
    let type = (effect.type || '');
    if (type === 'special' && effect.name) {
        type = effect.name;
    }
    if (!type) return null;

    // ── Mentality Debuff Resolution ──────────────────────────────────────
    // If the effect is flagged as a mentality debuff, route through the
    // contested willpower system instead of the flat chance roll.
    if (effect.mentalityDebuff && caster) {
        const resolution = resolveMentalityDebuff(caster, target, skill || { power: 0, effect });

        if (!resolution.applied) {
            return `resists ${type} (${resolution.outcome})`;
        }

        const dur = resolution.adjustedDuration;
        const half = resolution.halfEffect;
        let applied = false;
        let appliedLabel = null;

        switch (type.toLowerCase()) {
            case 'sleep':
                applied = applySleepEffect(target, dur, broadcastDataUpdate);
                appliedLabel = resolution.outcome === 'full' ? 'puts to sleep!' : `puts to sleep (${resolution.outcome})`;
                break;
            case 'fear':
                {
                    let atkPct = effect.atkReductionPercent || 30;
                    let defPct = effect.defReductionPercent || 30;
                    if (half) { atkPct = Math.floor(atkPct / 2); defPct = Math.floor(defPct / 2); }
                    applied = applyFearEffect(target, dur, atkPct, defPct, broadcastDataUpdate);
                    appliedLabel = `induces fear (${resolution.outcome})`;
                }
                break;
            case 'ensnared':
                applied = applyEnsnaredEffect(target, dur, broadcastDataUpdate);
                appliedLabel = `binds (${resolution.outcome})`;
                break;
            case 'betrayal':
                applied = applyBetrayalEffect(target, dur, broadcastDataUpdate);
                appliedLabel = `betrays (${resolution.outcome})`;
                break;
            case 'crimson_sight':
                {
                    let defPct = effect.defReductionPercent || 40;
                    if (half) defPct = Math.floor(defPct / 2);
                    applied = applyCrimsonSightEffect(target, dur, defPct, broadcastDataUpdate);
                    appliedLabel = `exposes vulnerabilities (${resolution.outcome})`;
                }
                break;
            case 'twin_finger_stun':
                {
                    let atkPct = effect.atkReductionPercent || 20;
                    if (half) atkPct = Math.floor(atkPct / 2);
                    applied = applyTwinFingerStunEffect(target, dur, atkPct, broadcastDataUpdate);
                    appliedLabel = `disrupts chakra (${resolution.outcome})`;
                }
                break;
            default:
                console.warn(`Unknown mentality debuff type: ${type}`);
                return null;
        }

        return applied ? appliedLabel : null;
    }

    // ── Standard (non-mentality) effect resolution ───────────────────────
    const baseChance = effect.chance || 100;
    // Critical hits double the chance of bleed effects (capped at 100%)
    const effectiveChance = (isCrit && type.toLowerCase() === 'bleed') ? Math.min(baseChance * 2, 100) : baseChance;
    const roll = Math.random() * 100;
    if (roll >= effectiveChance) return null;

    // Resolve duration: prefer effect.duration, fallback to skill.duration, then 'short'
    const rawDur = effect.duration !== undefined ? effect.duration : (skill && skill.duration ? skill.duration : 'short');
    const resolvedDur = getDurationRounds(rawDur);

    let applied = false;
    let appliedLabel = null;

    switch (type.toLowerCase()) {
        case 'stun':
            applied = applyStunEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'stuns';
            break;
        case 'bleed':
            applied = applyBleedEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'causes bleed';
            break;
        case 'energy drain':
        case 'energy_drain':
            applied = applyEnergyDrainEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'drains energy';
            break;
        case 'regenerate':
            target.regenerating = true;
            target.trollRegenRoundsLeft = 10;
            if (typeof broadcastDataUpdate === 'function') broadcastDataUpdate();
            applied = true;
            appliedLabel = 'grants regeneration';
            break;
        case 'regeneration':
        case 'greater regeneration':
        case 'greater_regeneration':
            applied = applyRegenerationEffect(target, resolvedDur, effect.regeneration_percent, broadcastDataUpdate);
            appliedLabel = 'grants regeneration';
            break;
        case 'invisibility':
            applied = applyInvisibilityEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'turns invisible';
            break;
        case 'petrify':
            applied = applyPetrifyEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'petrifies';
            break;
        case 'frozen':
        case 'freeze':
            applied = applyFrozenEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'freezes';
            break;
        case 'reduce_def':
        case 'def_break':
        case 'defense break':
            applied = applyDefenseBreakEffect(target, resolvedDur, effect.percent, broadcastDataUpdate);
            appliedLabel = 'reduces defense';
            break;
        case 'psionic burn':
        case 'psionic_burn':
            applied = applyPsionicBurnEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'causes psionic burn';
            break;
        // Mentality debuff types routed through standard path when no caster is provided
        // (fallback — shouldn't normally happen for these types)
        case 'sleep':
            applied = applySleepEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'puts to sleep';
            break;
        case 'fear':
            applied = applyFearEffect(target, resolvedDur, effect.atkReductionPercent, effect.defReductionPercent, broadcastDataUpdate);
            appliedLabel = 'induces fear';
            break;
        case 'ensnared':
            applied = applyEnsnaredEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'ensnares';
            break;
        case 'betrayal':
            applied = applyBetrayalEffect(target, resolvedDur, broadcastDataUpdate);
            appliedLabel = 'betrays';
            break;
        case 'crimson_sight':
            applied = applyCrimsonSightEffect(target, resolvedDur, effect.defReductionPercent, broadcastDataUpdate);
            appliedLabel = 'exposes vulnerabilities';
            break;
        case 'twin_finger_stun':
            applied = applyTwinFingerStunEffect(target, resolvedDur, effect.atkReductionPercent, broadcastDataUpdate);
            appliedLabel = 'disrupts chakra';
            break;
        default:
            console.warn(`Unknown effect type: ${type}`);
            return null;
    }

    return applied ? appliedLabel : null;
}
