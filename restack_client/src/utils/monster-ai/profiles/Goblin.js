// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

import { AcquireTargetMethods } from '../../shared-ai-methods/acquire-target-methods';

export function Goblin(data, utilMethods, animationManager, overlayManager){
    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME;

    this.animationManager = animationManager;
    this.overlayManager = overlayManager;

    this.broadcastDataUpdate = utilMethods.broadcastDataUpdate;
    this.kickoffAttackCooldown = utilMethods.kickoffAttackCooldown;
    this.kickoffSpecialCooldown = utilMethods.kickoffSpecialCooldown;
    this.missesTarget = utilMethods.missesTarget;
    this.hitsTarget = utilMethods.hitsTarget;
    this.hitsCombatant = utilMethods.hitsCombatant;
    this.chooseAttackType = utilMethods.chooseAttackType;
    this.getCurrentInventory = utilMethods.getCurrentInventory;
    this.stealItem = utilMethods.stealItem;
    this.escapeFromCombat = utilMethods.escapeFromCombat;

    this.initialize = (caller) => {
        caller.behaviorSequence = 'brawler';
    }

    this.acquireTarget = (caller, combatants) => {
        const target = AcquireTargetMethods.acquireClosestSoftTarget(caller, combatants);
        if (!target) return;
        if (target.isVCT) {
            caller.targetId = null;
            caller.pendingAttack = null;
            return;
        }
        caller.pendingAttack = this.chooseAttackType(caller, target);
        caller.targetId = target.id;
    }

    // Returns true when the goblin is orthogonally adjacent to its target.
    this._isAdjacentToTarget = (caller, combatants) => {
        const target = Object.values(combatants).find(e => e.id === caller.targetId);
        if (!target || target.isVCT) return false;
        const dx = Math.abs(caller.coordinates.x - target.coordinates.x);
        const dy = Math.abs(caller.coordinates.y - target.coordinates.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    // Steal a random non-equipped item from the communal inventory.
    // Returns true if a theft occurred.
    this.triggerStickyFingers = (caller, target, stickySpecial) => {
        let inventory = [];
        try { inventory = this.getCurrentInventory() || []; } catch (e) { console.warn('[Goblin] getCurrentInventory threw:', e); }

        // Only steal non-equipped, non-null items
        const stealable = inventory.filter(item =>
            item &&
            item.equippedSlot == null &&
            item.equippedBy == null
        );
        // Nothing to steal — abort without consuming energy or cooldown
        if (stealable.length === 0) return false;

        // Only deduct energy and start cooldown when a steal is actually possible
        if (stickySpecial) {
            caller.energy = Math.max(0, (caller.energy || 0) - (stickySpecial.energy_cost || 100));
            this.kickoffSpecialCooldown(stickySpecial);
        }

        const stolen = stealable[Math.floor(Math.random() * stealable.length)];
        const itemKey = stolen._im_key || stolen.name || 'item';
        const itemIconKey = (typeof stolen.icon === 'string' && stolen.icon)
            ? stolen.icon
            : ((typeof stolen._im_key === 'string' && stolen._im_key) ? stolen._im_key : null);
        const displayName = stolen.name || itemKey.replaceAll('_', ' ');
        // Push "Robbed!" floating indicator on the victim
        if (target) {
            if (!Array.isArray(target.damageIndicators)) target.damageIndicators = [];
            const indId = Date.now() + Math.random();
            const indObj = { id: indId, value: 'Robbed!', source: 'Goblin', type: 'robbed' };
            target.damageIndicators.push(indObj);
            setTimeout(() => {
                const idx = target.damageIndicators.findIndex(e => e && e.id === indId);
                if (idx !== -1) target.damageIndicators.splice(idx, 1);
                if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
            }, 2000);
        }

        // Remove item from inventory and report for battle summary
        try { this.stealItem(itemKey, displayName, itemIconKey); } catch (e) {}

        // Record stolen item on the goblin and switch to flee behavior
        caller.stolenItem = displayName;
        // `_im_key` is a stable inventory identifier, but UI icon resolution
        // uses `images[iconKey]`, so prefer the item's icon key for rendering.
        caller.stolenItemIcon = itemIconKey;
        caller.isFleeing = true;
        caller.behaviorSequence = 'flee';
        caller.targetId = null;

        if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
        return true;
    }

    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }
        caller.onMoveCooldown = true;
        setTimeout(() => {
            caller.onMoveCooldown = false;
        }, caller.moveCooldown);

        switch (caller.behaviorSequence) {
            case 'brawler': {
                // Move toward target if not adjacent
                if (!this._isAdjacentToTarget(caller, combatants)) {
                    data.methods.closeTheGap(caller, combatants);
                }

                // Sticky fingers check: per-era 15% chance when adjacent, energy available, off cooldown
                const target = Object.values(combatants).find(e => e.id === caller.targetId);
                const isAdj = this._isAdjacentToTarget(caller, combatants);
                if (target && !target.dead && !target.isVCT && isAdj) {
                    const allSpecials = caller.specials;
                    const sf = Array.isArray(allSpecials)
                        ? allSpecials.find(s => s && (s.name === 'sticky_fingers' || s.name === 'sticky fingers'))
                        : null;
                    const stickySpecial = sf && sf.cooldown_position >= 100 ? sf : null;
                    const energyCost = stickySpecial ? (stickySpecial.energy_cost || 100) : 100;
                    const roll = Math.random();
                    if (stickySpecial && (caller.energy || 0) >= energyCost && roll < 0.15) {
                        const stole = this.triggerStickyFingers(caller, target, stickySpecial);
                        if (stole) return; // behaviorSequence now 'flee', skip attack this era
                    }
                }

                // Attack trigger
                {
                    const era = caller.eras ? caller.eras[caller.eraIndex] : null;
                    const attackTarget = Object.values(combatants).find(e => e.id === caller.targetId);
                    // restartTurnCycle clears pendingAttack at the start of every turn cycle.
                    // acquireTarget is only called in era 0 when targetId is null, so pendingAttack
                    // would stay null forever after the first cycle. Repopulate it here.
                    if (!caller.pendingAttack && attackTarget && !attackTarget.dead && !attackTarget.isVCT) {
                        caller.pendingAttack = this.chooseAttackType(caller, attackTarget);
                    }
                    if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking &&
                            caller.pendingAttack && attackTarget && !attackTarget.dead && !attackTarget.isVCT) {
                        const dx = Math.abs(caller.coordinates.x - attackTarget.coordinates.x);
                        const dy = Math.abs(caller.coordinates.y - attackTarget.coordinates.y);
                        const dist = dx + dy;
                        const atkRange = caller.pendingAttack.range || 'close';
                        const inRange = atkRange === 'close' ? dist === 1 : atkRange === 'medium' ? dist <= 3 : dist <= 6;
                        if (inRange) {
                            era.attacked = true;
                            this.initiateAttack(caller, combatants);
                        }
                    }
                }
                break;
            }
            case 'flee': {
                // movement-methods.js caps movement at MAX_DEPTH-2 (its hardcoded MAX_DEPTH=7
                // marks column MAX_DEPTH-1 as out-of-bounds, so last reachable col = MAX_DEPTH-2).
                // data.MAX_DEPTH (from combat-manager) is 8, so escapeX = 6.
                const escapeX = this.MAX_DEPTH - 2;
                if (caller.coordinates.x >= escapeX) {
                    // Goblin is at the last visible column — render portrait here for one tick,
                    // then escape on the next processMove call.
                    if (caller._escapePending) {
                        try { this.escapeFromCombat(caller.id); } catch (e) {}
                    } else {
                        caller._escapePending = true;
                        if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
                    }
                } else {
                    const prevX = caller.coordinates.x;
                    // Aim well past the edge so goTowards never stalls on the "target is
                    // directly east and occupied" branch in the final approach.
                    const fleeTarget = { x: escapeX + 3, y: caller.coordinates.y };
                    data.methods.goTowards(caller, combatants, fleeTarget, true);
                    if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
                    if (caller.coordinates.x >= escapeX) {
                        // Just arrived at escape column — stay for one tick so portrait is visible.
                        caller._escapePending = true;
                    } else if (caller.coordinates.x === prevX && caller.coordinates.x >= escapeX - 1) {
                        // Stuck at escapeX-1 (another goblin is blocking escapeX).
                        // Give one tick reprieve, then escape from here to unblock the lane.
                        if (caller._escapePending) {
                            try { this.escapeFromCombat(caller.id); } catch (e) {}
                        } else {
                            caller._escapePending = true;
                        }
                    }
                }
                break;
            }
            default:
                break;
        }
    }

    this.triggerClawAttack = async (caller, target) => {
        if (this.animationManager && typeof this.animationManager.clawSwipe === 'function') {
            const sourceTileId = this.animationManager.getTileIdByCoords(caller.coordinates);
            const targetTileId = this.animationManager.getTileIdByCoords(target.coordinates);
            if (sourceTileId == null || targetTileId == null) return target;
            await new Promise(resolve => {
                this.animationManager.clawSwipe(targetTileId, sourceTileId, caller.facing, resolve);
            });
        }
        return target;
    }

    this.initiateAttack = async (caller, combatants) => {
        if (caller.behaviorSequence === 'flee') return;

        const target = Object.values(combatants).find(e => e.id === caller.targetId);
        if (!target || target.dead || target.isVCT) return;

        if (!caller.pendingAttack) {
            caller.pendingAttack = this.chooseAttackType(caller, target);
        }
        if (!caller.pendingAttack) return;

        const dx = Math.abs(caller.coordinates.x - target.coordinates.x);
        const dy = Math.abs(caller.coordinates.y - target.coordinates.y);
        const inRange = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
        if (!inRange) return;

        caller.attacking = true;

        try {
            switch (caller.pendingAttack.name) {
                case 'claws': {
                    const combatantHit = await this.triggerClawAttack(caller, target);
                    if (combatantHit) {
                        this.hitsCombatant(caller, combatantHit, { increasedCritChance: false });
                    } else {
                        this.missesTarget(caller, target, caller.pendingAttack);
                    }
                    break;
                }
                default: {
                    // Fallback animation for bite and any other attacks
                    try {
                        if (this.animationManager && typeof this.animationManager.triggerAttackAnimation === 'function') {
                            await this.animationManager.triggerAttackAnimation({
                                coordinates: caller.coordinates,
                                facing: caller.facing,
                                icon: caller.pendingAttack?.icon,
                                type: caller.pendingAttack?.name || 'bite',
                                selectedAction: caller.pendingAttack
                            });
                        }
                        this.hitsCombatant(caller, target);
                    } catch (e) {
                        console.warn('[Goblin] Fallback attack animation failed:', e);
                        this.hitsCombatant(caller, target);
                    }
                    break;
                }
            }
            this.kickoffAttackCooldown(caller, caller.pendingAttack);
            caller.pendingAttack = null;
        } finally {
            // Always clear the attacking flag so future attacks aren't blocked
            caller.attacking = false;
        }
    }

    this.handleOverlap = (caller, combatants) => {
        if (caller.isFleeing) {
            // Fleeing goblins that overlap each other should shift lanes so one
            // can continue east rather than both hanging at the same tile forever.
            const N = { x: caller.coordinates.x, y: caller.coordinates.y - 1 };
            const S = { x: caller.coordinates.x, y: caller.coordinates.y + 1 };
            if (data.methods.isAvailableToMoveInto(N, combatants, caller.coordinates, caller)) {
                caller.coordinates = N;
            } else if (data.methods.isAvailableToMoveInto(S, combatants, caller.coordinates, caller)) {
                caller.coordinates = S;
            }
            return;
        }
        data.methods.closeTheGap(caller, combatants);
    }
}

