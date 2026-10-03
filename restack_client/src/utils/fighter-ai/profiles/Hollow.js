// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

// Hollow AI profile
// DEX/INT hybrid liminal undead-adjacent fighter.
// Behavior: 'shade-stalker' — prefers medium to close range engagement.
// Attacks:
//   - void_touch (close range): reuses melee/swing animation channel
//   - death_grasp (medium range): reuses ranged projectile animation channel

export function Hollow(data, utilMethods, animationManager, overlayManager) {
    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME;

    this.animationManager = animationManager;
    this.overlayManager = overlayManager;

    this.broadcastDataUpdate    = utilMethods.broadcastDataUpdate;
    this.kickoffAttackCooldown  = utilMethods.kickoffAttackCooldown;
    this.kickoffSpecialCooldown = utilMethods.kickoffSpecialCooldown;
    this.missesTarget           = utilMethods.missesTarget;
    this.hitsTarget             = utilMethods.hitsTarget;
    this.hitsCombatant          = utilMethods.hitsCombatant;
    this.useConsumable          = utilMethods.useConsumable;
    this.getCurrentInventory    = utilMethods.getCurrentInventory;

    this.isFriendly = (e) => !e.isMonster && !e.isMinion;
    this.friendlies = (combatants) => Object.values(combatants).filter(e => this.isFriendly(e));
    this.isEnemy    = (e) => (e.isMonster || e.isMinion);
    this.enemies    = (combatants) => Object.values(combatants).filter(e => this.isEnemy(e));

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    this.initialize = (caller) => {
        caller.behaviorSequence = 'shade-stalker';
        caller.shadeMode        = false;
        caller.deathEchoActive  = false;
        caller.facing           = caller.facing || 'right';
    };

    // ─── Target acquisition ──────────────────────────────────────────────────

    this.acquireTarget = (caller, combatants, targetToAvoid = null) => {
        const liveEnemies = this.enemies(combatants).filter(e => !e.dead);
        if (!liveEnemies.length) return;

        // Chebyshev distance — max of x and y deltas
        const distTo = (e) => Math.max(
            Math.abs(data.methods.getDistanceToTarget(caller, e)),
            Math.abs(data.methods.getLaneDifferenceToTarget(caller, e))
        );

        const minDist = liveEnemies.reduce((min, e) => Math.min(min, distTo(e)), Infinity);
        const closest = liveEnemies.filter(e => distTo(e) === minDist);

        let target;
        const currentTarget = closest.find(e => e.id === caller.targetId);
        if (currentTarget) {
            target = currentTarget;
        } else if (targetToAvoid) {
            target = closest.find(e => e.id !== targetToAvoid.id) || closest[0];
        } else {
            target = closest[0];
        }

        caller.pendingAttack = this.chooseAttackType(caller, target);
        caller.targetId = target.id;
    };

    // ─── Attack selection ────────────────────────────────────────────────────

    this.chooseAttackType = (caller, target) => {
        if (!target) return null;
        const available = (caller.attacks || []).filter(e => e && e.cooldown_position === 100);
        const distanceToTarget = data.methods.getDistanceToTarget(caller, target);
        const laneDiff         = data.methods.getLaneDifferenceToTarget(caller, target);

        const isCloseRange = Math.abs(distanceToTarget) === 1 ||
            (distanceToTarget === 0 && Math.abs(laneDiff) === 1);

        if (available.length === 0) {
            return null;
        }

        if (isCloseRange) {
            const closeAttack = available.find(e => e.range === 'close');
            if (closeAttack) return closeAttack;
        }

        // Prefer medium or ranged attack
        let best = 0;
        let chosenAttack = null;
        available.filter(e => e.range === 'far' || e.range === 'medium').forEach(e => {
            if (e.cooldown_position > best) {
                best = e.cooldown_position;
                chosenAttack = e;
            }
        });
        if (chosenAttack) return chosenAttack;

        // Fall back to any available attack
        return data.methods.pickRandom(available);
    };

    // ─── Movement & Process Move ─────────────────────────────────────────────

    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }
        caller.onMoveCooldown = true;
        setTimeout(() => { caller.onMoveCooldown = false; }, caller.moveCooldown);

        // If shade mode is active, caller flickers / gathers ethereal power
        if (caller.shadeMode) {
            try { if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate(caller); } catch (e) {}
            return;
        }

        switch (caller.behaviorSequence) {
            case 'shade-stalker':
            default: {
                // Movement: close the gap toward target
                if (typeof data.methods.closeTheGap === 'function') {
                    data.methods.closeTheGap(caller, combatants);
                } else if (typeof data.methods.closeTheGapForwardFirst === 'function') {
                    data.methods.closeTheGapForwardFirst(caller, combatants);
                }

                // Attack trigger
                const era = caller.eras ? caller.eras[caller.eraIndex] : null;
                if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking && caller.pendingAttack) {
                    const target = combatants[caller.targetId];
                    if (target && !target.dead && !target.isVCT) {
                        const dx = Math.abs(caller.coordinates.x - target.coordinates.x);
                        const dy = Math.abs(caller.coordinates.y - target.coordinates.y);
                        const dist = dx + dy;
                        const atkRange = caller.pendingAttack.range || 'close';
                        const inRange = atkRange === 'close' ? dist === 1 : atkRange === 'medium' ? dist <= 3 : dist <= 6;
                        if (inRange) {
                            era.attacked = true;
                            caller.attack();
                        }
                    }
                }
                break;
            }
        }

        // Keep caller.facing pointing toward target
        if (caller.targetId && combatants[caller.targetId]) {
            const t = combatants[caller.targetId];
            const _dx = t.coordinates.x - caller.coordinates.x;
            const _dy = t.coordinates.y - caller.coordinates.y;
            if (_dx === 0) {
                caller.facing = _dy > 0 ? 'down' : 'up';
            } else {
                caller.facing = _dx > 0 ? 'right' : 'left';
            }
        }
    };

    // ─── Initiate Attack ─────────────────────────────────────────────────────

    this.initiateAttack = async (caller, manualAttack, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }
        caller.onMoveCooldown = true;
        setTimeout(() => { caller.onMoveCooldown = false; }, caller.moveCooldown);

        const callerFacing = (caller, target) => {
            if (!target) return null;
            const { x: callX, y: callY } = caller.coordinates;
            const { x: targX, y: targY } = target.coordinates;
            if (targX !== callX) return targX > callX ? 'right' : 'left';
            return targY > callY ? 'down' : 'up';
        };

        const target = combatants[caller.targetId];
        const computedFacing = callerFacing(caller, target);
        const facing = target ? (computedFacing || caller.facing) : (caller.facing || computedFacing);

        caller.attacking = true;

        if (manualAttack) {
            if (caller.pendingAttack && caller.pendingAttack.cooldown_position < 99) {
                caller.attacking = false;
                return;
            }
            if (caller.pendingAttack && caller.pendingAttack.cooldown_position === 100) {
                const combatantHit = await this.triggerVoidTouch(caller.coordinates, facing);
                if (combatantHit) {
                    if (combatantHit.isMonster || combatantHit.isMinion) {
                        this.hitsCombatant(caller, combatantHit);
                    } else {
                        this.missesTarget(caller);
                    }
                } else {
                    this.missesTarget(caller);
                }
                this.kickoffAttackCooldown(caller);
            }
        } else {
            const atkName = caller.pendingAttack?.name || '';
            const normalizedName = atkName.toLowerCase().replace(/_/g, ' ');

            if (normalizedName.includes('death grasp') || normalizedName.includes('grasp') || caller.pendingAttack?.range === 'medium') {
                const hit = await new Promise((resolve) => {
                    this.triggerDeathGrasp(caller.coordinates, target?.coordinates, resolve, caller.fighterType, caller.pendingAttack?.name);
                });
                if (hit) {
                    if (hit.isMonster || hit.isMinion) {
                        this.hitsCombatant(caller, hit);
                    } else {
                        this.missesTarget(caller);
                    }
                } else {
                    this.missesTarget(caller);
                }
            } else {
                // Default to close-range void touch
                const combatantHit = await this.triggerVoidTouch(caller.coordinates, facing);
                if (combatantHit) {
                    if (combatantHit.isMonster || combatantHit.isMinion) {
                        this.hitsCombatant(caller, combatantHit);
                    } else {
                        this.missesTarget(caller);
                    }
                } else {
                    this.missesTarget(caller);
                }
            }

            this.kickoffAttackCooldown(caller);
        }

        caller.attacking = false;
    };

    // ─── Animation Triggers ──────────────────────────────────────────────────

    this.triggerVoidTouch = (callerCoords, facing) => {
        if (!this.animationManager) return Promise.resolve(null);

        const sourceTileId = this.animationManager.getTileIdByCoords(callerCoords);
        let targetTileId = null;

        if (facing) {
            switch (facing) {
                case 'right':
                    if (callerCoords.x < this.MAX_DEPTH) {
                        targetTileId = this.animationManager.getTileIdByCoords({ x: callerCoords.x + 1, y: callerCoords.y });
                    }
                    break;
                case 'left':
                    if (callerCoords.x > 0) {
                        targetTileId = this.animationManager.getTileIdByCoords({ x: callerCoords.x - 1, y: callerCoords.y });
                    }
                    break;
                case 'up':
                    if (callerCoords.y > 0) {
                        targetTileId = this.animationManager.getTileIdByCoords({ x: callerCoords.x, y: callerCoords.y - 1 });
                    }
                    break;
                case 'down':
                    if (callerCoords.y < this.MAX_LANES - 1) {
                        targetTileId = this.animationManager.getTileIdByCoords({ x: callerCoords.x, y: callerCoords.y + 1 });
                    }
                    break;
                default:
                    break;
            }
        }

        return new Promise((resolve) => {
            if (sourceTileId !== null) {
                if (typeof this.animationManager.axeSwing === 'function') {
                    this.animationManager.axeSwing(targetTileId, sourceTileId, facing, resolve);
                } else if (typeof this.animationManager.swordSwing === 'function') {
                    this.animationManager.swordSwing(targetTileId, sourceTileId, facing, resolve);
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    };

    this.triggerDeathGrasp = (callerCoords, targetCoords, resolve, fighterType, attackType) => {
        if (!this.animationManager) {
            if (resolve) resolve(null);
            return;
        }

        const sourceTileId = this.animationManager.getTileIdByCoords(callerCoords);
        const targetTileId = targetCoords ? this.animationManager.getTileIdByCoords(targetCoords) : null;

        if (sourceTileId !== null && targetTileId !== null) {
            if (typeof this.animationManager.axeThrow === 'function') {
                this.animationManager.axeThrow(targetTileId, sourceTileId, null, resolve || (() => {}), fighterType, attackType);
            } else if (typeof this.animationManager.triggerProjectile === 'function') {
                this.animationManager.triggerProjectile(targetTileId, sourceTileId, resolve || (() => {}));
            } else if (resolve) {
                resolve(null);
            }
        } else if (resolve) {
            resolve(null);
        }
    };
}
