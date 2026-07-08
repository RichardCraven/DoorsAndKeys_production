// combat-effects.js
// Centralized helpers for applying and clearing combat effects (visual and stateful)

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

/**
 * Applies the "bleed" effect to a combatant.
 * - Sets bleed=true, bleed_eras=duration
 * @param {object} target - The combatant object
 * @param {number} duration - Duration in eras
 * @param {function} [broadcastDataUpdate] - Optional callback
 */
export function applyBleedEffect(target, duration, broadcastDataUpdate) {
    if (!target) return false;
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
 * Centralized dispatcher for applying combat effects from attacks.
 * Handles the chance roll and routes to the specific effect helper.
 * @param {object} target - The combatant being hit
 * @param {object} effect - The effect definition { type, chance, duration }
 * @param {function} [broadcastDataUpdate] - Optional callback for UI updates
 */
export function applyAttackEffect(target, effect, broadcastDataUpdate, isCrit) {
    if (!target || !effect || target.hp <= 0) return null;
    
    // Resolve effect type: prefer effect.type, but if it's 'special', use effect.name.
    // This allows the dispatcher to handle both standard attacks and special abilities.
    let type = (effect.type || '');
    if (type === 'special' && effect.name) {
        type = effect.name;
    }
    if (!type) return null;

    const baseChance = effect.chance || 100;
    // Critical hits double the chance of bleed effects (capped at 100%)
    const effectiveChance = (isCrit && type.toLowerCase() === 'bleed') ? Math.min(baseChance * 2, 100) : baseChance;
    const roll = Math.random() * 100;
    if (roll >= effectiveChance) return null;

    let applied = false;
    let appliedLabel = null;

    switch (type.toLowerCase()) {
        case 'stun':
            applied = applyStunEffect(target, effect.duration, broadcastDataUpdate);
            appliedLabel = 'stuns';
            break;
        case 'bleed':
            applied = applyBleedEffect(target, effect.duration, broadcastDataUpdate);
            appliedLabel = 'causes bleed';
            break;
        case 'energy drain':
        case 'energy_drain':
            applied = applyEnergyDrainEffect(target, effect.duration, broadcastDataUpdate);
            appliedLabel = 'drains energy';
            break;
        case 'regeneration':
        case 'greater regeneration':
        case 'greater_regeneration':
            applied = applyRegenerationEffect(target, effect.duration, effect.regeneration_percent, broadcastDataUpdate);
            appliedLabel = 'grants regeneration';
            break;
        case 'invisibility':
            applied = applyInvisibilityEffect(target, effect.duration, broadcastDataUpdate);
            appliedLabel = 'turns invisible';
            break;
        case 'petrify':
            applied = applyPetrifyEffect(target, effect.duration, broadcastDataUpdate);
            appliedLabel = 'petrifies';
            break;
        default:
            console.warn(`Unknown effect type: ${type}`);
            return null;
    }

    return applied ? appliedLabel : null;
}
