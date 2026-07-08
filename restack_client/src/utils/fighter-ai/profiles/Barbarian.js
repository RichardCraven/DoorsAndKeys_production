// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

// Barbarian AI profile
// Nearly identical to Soldier but has no Shield Wall ability.
// Uses axe_swing (close) and axe_throw (medium) attacks.
// Movement: always advances forward first (closeTheGapForwardFirst).
//
// BERSERKER ability:
//   Auto-triggers at the start of combat if 3+ enemies are present.
//   Costs 60% energy. Doubles move speed and attack speed for one full turn cycle.
//   Portrait pulses red via the 'berserk-active' CSS class while active.

export function Barbarian(data, utilMethods, animationManager) {
    this.MAX_DEPTH  = data.MAX_DEPTH;
    this.MAX_LANES  = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME;

    this.animationManager = animationManager;

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
    this.isEnemy = (e) => {
        return (e.isMonster || e.isMinion);
    }

    this.enemies = (combatants) => {
        return Object.values(combatants).filter(e=>this.isEnemy(e));
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    this.initialize = (caller) => {
        caller.behaviorSequence = 'brawler';
        // Reset berserk tracking so repeated combat sessions start fresh
        caller.berserkerActive        = false;
        caller.berserkerChecked       = false;
        caller.berserkerStartEra      = null;
        caller._berserkerCycleCount   = 0;
        caller._berserkerPatchApplied = false;
    }

    // ─── Target acquisition ──────────────────────────────────────────────────

    this.acquireTarget = (caller, combatants, targetToAvoid = null) => {
        const liveEnemies = this.enemies(combatants).filter(e => !e.dead);
        if (!liveEnemies.length) return;

        // Chebyshev distance — max of x and y deltas — so diagonal adjacency
        // counts the same as cardinal adjacency.
        const distTo = (e) => Math.max(
            Math.abs(data.methods.getDistanceToTarget(caller, e)),
            Math.abs(data.methods.getLaneDifferenceToTarget(caller, e))
        );

        // Find the minimum distance among all live enemies
        const minDist = liveEnemies.reduce((min, e) => Math.min(min, distTo(e)), Infinity);

        // All enemies tied for closest
        const closest = liveEnemies.filter(e => distTo(e) === minDist);

        // Prefer to keep the current target if it is among the closest (avoids
        // thrashing between equally-distant enemies).
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
    }

    // ─── Attack selection ────────────────────────────────────────────────────

    this.chooseAttackType = (caller, target) => {
        if (!target) return null;
        const available  = caller.attacks.filter(e => e.cooldown_position === 100);
        const distanceToTarget = data.methods.getDistanceToTarget(caller, target);
        const laneDiff         = data.methods.getLaneDifferenceToTarget(caller, target);

        // Adjacent in X or adjacent vertically counts as close range
        const isCloseRange = Math.abs(distanceToTarget) === 1 ||
            (distanceToTarget === 0 && Math.abs(laneDiff) === 1);

        let attack, chosenAttack;

        if (available.length === 0) {
            // Nothing ready — return null to defer attack until cooldown reaches 100%
            return null;
        }

        if (isCloseRange) {
            const closeAttack = available.find(e => e.range === 'close');
            if (closeAttack) return closeAttack;
        }

        // Prefer the most-cooled ranged/medium attack
        let best = 0;
        available.filter(e => e.range === 'far' || e.range === 'medium').forEach(e => {
            if (e.cooldown_position > best) {
                best = e.cooldown_position;
                chosenAttack = e;
            }
        });
        if (chosenAttack) return chosenAttack;

        // Fall back to any available
        attack = data.methods.pickRandom(available);
        return attack;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    this.isSurrounded = (caller, combatants) => {
        const surroundings = [
            { x: caller.coordinates.x,     y: caller.coordinates.y - 1 },
            { x: caller.coordinates.x + 1, y: caller.coordinates.y - 1 },
            { x: caller.coordinates.x + 1, y: caller.coordinates.y     },
            { x: caller.coordinates.x + 1, y: caller.coordinates.y + 1 },
            { x: caller.coordinates.x,     y: caller.coordinates.y + 1 },
            { x: caller.coordinates.x - 1, y: caller.coordinates.y + 1 },
            { x: caller.coordinates.x - 1, y: caller.coordinates.y     },
            { x: caller.coordinates.x - 1, y: caller.coordinates.y - 1 },
        ];
        let adjacentEnemies = 0;
        surroundings.forEach(tile => {
            const enemy = Object.values(combatants).find(e =>
                this.isEnemy(e) && !e.dead && !e.isVCT &&
                e.coordinates.x === tile.x && e.coordinates.y === tile.y
            );
            if (enemy) adjacentEnemies++;
        });
        return adjacentEnemies >= 3;
    }

    this.tryUseConsumableForHeal = (caller) => {
        try {
            if (!caller || typeof caller.hp === 'undefined' || typeof caller.starting_hp === 'undefined') return false;
            if (!(caller.hp < (caller.starting_hp * 0.5))) return false;
            if (!this.useConsumable) return false;
            const groupInv = (typeof this.getCurrentInventory === 'function')
                ? this.getCurrentInventory()
                : (Array.isArray(caller.inventory) ? caller.inventory : []);
            if (!groupInv || !groupInv.length) return false;
            const pIdx = groupInv.findIndex(i => i && (i.effect === 'health gain' || (i.name && i.name.toLowerCase().includes('potion'))));
            if (pIdx === -1) return false;
            const isGroup = (typeof this.getCurrentInventory === 'function');
            let item;
            if (!isGroup && Array.isArray(caller.inventory)) {
                item = caller.inventory.splice(pIdx, 1)[0];
            } else {
                item = groupInv[pIdx];
            }
            try { this.useConsumable(item, caller); } catch (e) {}
            try { if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate(caller); } catch (e) {}
            return true;
        } catch (err) {
            console.warn('Barbarian.tryUseConsumableForHeal failed', err);
            return false;
        }
    }

    // ─── Spin attack (same as Soldier) ───────────────────────────────────────

    this.triggerSpinAttack = async (caller, combatants) => {
        const { x, y } = caller.coordinates;
        const directions = [
            { dx: 0,  dy: -1 },
            { dx: 1,  dy: -1 },
            { dx: 1,  dy:  0 },
            { dx: 1,  dy:  1 },
            { dx: 0,  dy:  1 },
            { dx: -1, dy:  1 },
            { dx: -1, dy:  0 },
            { dx: -1, dy: -1 },
        ];
        let bestArc = null, maxEnemies = -1;
        for (let i = 0; i < directions.length; i++) {
            const arc = [0, 1, 2].map(j => {
                const dir = directions[(i + j) % directions.length];
                return { x: x + dir.dx, y: y + dir.dy };
            });
            const enemiesHit = arc.reduce((acc, tile) => {
                const enemy = Object.values(combatants).find(e =>
                    this.isEnemy(e) && !e.dead &&
                    e.coordinates.x === tile.x && e.coordinates.y === tile.y
                );
                return acc + (enemy ? 1 : 0);
            }, 0);
            if (enemiesHit > maxEnemies) { maxEnemies = enemiesHit; bestArc = arc; }
        }
        if (!bestArc) {
            bestArc = [0, 1, 2].map(j => {
                const dir = directions[j];
                return { x: x + dir.dx, y: y + dir.dy };
            });
        }
        const sourceTileId = this.animationManager.getTileIdByCoords(caller.coordinates);
        this.animationManager.arcAttack(
            bestArc,
            sourceTileId,
            combatants,
            (enemy) => this.hitsCombatant(caller, enemy)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BERSERKER
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns true if auto-trigger conditions are met:
     *   - Not already berserking
     *   - Not already checked this combat session
     *   - Berserker special exists and is fully cooled down (cooldown_position === 100)
     *   - Caller has at least 60 energy
     *   - More than 2 live enemies are present
     */
    this.shouldUseBerserker = (caller, combatants) => {
        if (caller.berserkerActive) {
            console.log('[Barbarian] shouldUseBerserker: already active — skip');
            return false;
        }
        if (caller.berserkerChecked) {
            console.log('[Barbarian] shouldUseBerserker: already checked this session — skip');
            return false;
        }
        const spec = caller.specials && caller.specials.find(s => s && s.name === 'berserker');
        if (!spec) {
            console.warn('[Barbarian] shouldUseBerserker: no berserker special found on caller. specials:', caller.specials);
            return false;
        }
        if (spec.cooldown_position !== 100) {
            console.log(`[Barbarian] shouldUseBerserker: special not ready — cooldown_position=${spec.cooldown_position}`);
            return false;
        }
        const energy = typeof caller.energy === 'number' ? caller.energy : 100;
        if (energy < (spec.energy_cost ?? 60)) {
            console.log(`[Barbarian] shouldUseBerserker: not enough energy — energy=${energy}`);
            return false;
        }
        const liveEnemies = Object.values(combatants).filter(e => !e.dead && (e.isMonster || e.isMinion));
        console.log(`[Barbarian] shouldUseBerserker: liveEnemies=${liveEnemies.length}, need >2`);
        return liveEnemies.length > 2;
    }

    /**
     * Patch caller.restartTurnCycle once so that every turn-cycle restart
     * invokes checkBerserkerExpiry before re-running the cycle.
     * Safe to call multiple times — only patches once per combat session.
     */
    this._patchRestartTurnCycle = (caller) => {
        if (caller._berserkerPatchApplied) return;
        caller._berserkerPatchApplied = true;
        if (typeof caller.restartTurnCycle !== 'function') return;
        const original = caller.restartTurnCycle.bind(caller);
        const barb = this;
        caller.restartTurnCycle = function () {
            barb.checkBerserkerExpiry(this);
            original();
        };
    }

    /**
     * Activate berserk state.
     *   - Drains 60 energy
     *   - Stores base moveCooldown, movesPerTurnCycle, and each attack's cooldown
     *   - Halves moveCooldown and each attack's cooldown; doubles movesPerTurnCycle
     *   - Sets berserkerActive = true (triggers the CSS pulse in fighters.js)
     *   - Puts the special on recharge
     *   - Patches restartTurnCycle for expiry detection
     *   - Calls caller.restartTurnCycle() so the new moveCooldown takes effect immediately
     */
    this.triggerBerserker = (caller, combatants) => { // eslint-disable-line no-unused-vars
        const spec = caller.specials && caller.specials.find(s => s && s.name === 'berserker');
        if (!spec) {
            console.warn('[Barbarian] triggerBerserker: berserker special not found on caller!');
            return;
        }

        console.log(`[Barbarian] 🔴 BERSERKER TRIGGERED — energy=${caller.energy}, eraIndex=${caller.eraIndex}, moveCooldown=${caller.moveCooldown}, movesPerTurnCycle=${caller.movesPerTurnCycle}`);

        // Mark so auto-trigger won't fire again this session
        caller.berserkerChecked = true;

        // Energy cost
        caller.energy = Math.max(0, (typeof caller.energy === 'number' ? caller.energy : 100) - (spec.energy_cost ?? 60));

        // Store base values for restoration on expiry
        caller._berserkerBaseMoveCooldown      = caller.moveCooldown;
        caller._berserkerBaseMovesPerTurnCycle = caller.movesPerTurnCycle;
        caller._berserkerBaseAttackCooldowns   = caller.attacks.map(a => a.cooldown);

        // Apply speed buffs
        caller.moveCooldown      = caller.moveCooldown / 2;
        caller.movesPerTurnCycle = caller.movesPerTurnCycle * 2;
        caller.attacks.forEach(a => { a.cooldown = Math.max(0.5, a.cooldown / 2); });

        // Speed up the turn-cycle tick itself so tempo advances at 2× rate.
        // setFightInterval replaces the current interval with a new one at the
        // halved speed — this is the only way to visibly move/act faster.
        caller._berserkerBaseFightInterval = caller.FIGHT_INTERVAL;
        if (typeof caller.setFightInterval === 'function') {
            caller.setFightInterval(Math.max(1, Math.floor(caller.FIGHT_INTERVAL / 2)));
        }

        console.log(`[Barbarian] 🔴 BERSERKER APPLIED — new moveCooldown=${caller.moveCooldown}, movesPerTurnCycle=${caller.movesPerTurnCycle}, FIGHT_INTERVAL=${caller.FIGHT_INTERVAL}, energy=${caller.energy}`);

        // Track triggering era and cycle count for expiry.
        // Start at -1 so the restartTurnCycle call inside triggerBerserker itself
        // (which immediately follows) increments to 0 without expiring. Only the
        // *next* natural turn-cycle restart will reach 1 and expire berserk.
        caller.berserkerStartEra    = typeof caller.eraIndex === 'number' ? caller.eraIndex : 0;
        caller.berserkerActive      = true;
        caller._berserkerCycleCount = -1;

        // Put the special on recharge (20 s)
        spec.cooldown_position = 0;
        if (typeof this.kickoffSpecialCooldown === 'function') {
            this.kickoffSpecialCooldown(spec);
        }

        // Broadcast UI update (energy change + berserkerActive for CSS class)
        try { if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate(caller); } catch (e) {}

        // Patch restartTurnCycle, then restart so new moveCooldown takes effect now
        this._patchRestartTurnCycle(caller);
        try {
            if (typeof caller.restartTurnCycle === 'function') {
                console.log('[Barbarian] 🔴 Calling restartTurnCycle to apply speed buff immediately');
                caller.restartTurnCycle();
            } else {
                console.warn('[Barbarian] triggerBerserker: caller.restartTurnCycle is not a function!', typeof caller.restartTurnCycle);
            }
        } catch (e) {
            console.error('[Barbarian] triggerBerserker: restartTurnCycle threw', e);
        }
    }

    /**
     * Called by the patched restartTurnCycle on every turn-cycle restart.
     * After one full cycle has elapsed (first restart), expire berserk.
     */
    this.checkBerserkerExpiry = (caller) => {
        if (!caller.berserkerActive) return;
        caller._berserkerCycleCount = (caller._berserkerCycleCount || 0) + 1;
        console.log(`[Barbarian] checkBerserkerExpiry — cycleCount=${caller._berserkerCycleCount}`);
        if (caller._berserkerCycleCount >= 1) {
            console.log('[Barbarian] 🟢 BERSERKER EXPIRING — one full cycle elapsed');
            this._expireBerserker(caller);
        }
    }

    /**
     * Restore all pre-berserk movement and attack values.
     */
    this._expireBerserker = (caller) => {
        if (!caller.berserkerActive) return;
        console.log('[Barbarian] 🟢 BERSERKER EXPIRED — restoring base stats');
        caller.berserkerActive      = false;
        caller.berserkerStartEra    = null;
        caller._berserkerCycleCount = -1;

        if (typeof caller._berserkerBaseMoveCooldown === 'number') {
            caller.moveCooldown = caller._berserkerBaseMoveCooldown;
        }
        if (typeof caller._berserkerBaseMovesPerTurnCycle === 'number') {
            caller.movesPerTurnCycle = caller._berserkerBaseMovesPerTurnCycle;
        }
        if (Array.isArray(caller._berserkerBaseAttackCooldowns)) {
            caller.attacks.forEach((a, i) => {
                if (typeof caller._berserkerBaseAttackCooldowns[i] === 'number') {
                    a.cooldown = caller._berserkerBaseAttackCooldowns[i];
                }
            });
        }
        // Restore the original tick rate
        if (typeof caller._berserkerBaseFightInterval === 'number' && typeof caller.setFightInterval === 'function') {
            caller.setFightInterval(caller._berserkerBaseFightInterval);
        }
        delete caller._berserkerBaseMoveCooldown;
        delete caller._berserkerBaseMovesPerTurnCycle;
        delete caller._berserkerBaseAttackCooldowns;
        delete caller._berserkerBaseFightInterval;

        try { if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate(caller); } catch (e) {}
    }

    // ─── processMove ─────────────────────────────────────────────────────────

    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }
        caller.onMoveCooldown = true;
        setTimeout(() => { caller.onMoveCooldown = false; }, caller.moveCooldown);

        switch (caller.behaviorSequence) {
            case 'brawler': {
                // ── Auto-trigger berserker at start of combat (era 0, first tick) ─
                console.log(`[Barbarian] processMove — eraIndex=${caller.eraIndex}, berserkerChecked=${caller.berserkerChecked}, berserkerActive=${caller.berserkerActive}`);
                if (this.shouldUseBerserker(caller, combatants)) {
                    this.triggerBerserker(caller, combatants);
                    // triggerBerserker calls restartTurnCycle — return so the new
                    // interval picks up immediately without running a stale move tick.
                    return;
                }

                // Spin attack if surrounded (any era)
                if (this.isSurrounded(caller, combatants)) {
                    this.triggerSpinAttack(caller, combatants);
                    break;
                }

                // Heal check: eras 1, 2, 3 only
                if (caller.eraIndex >= 1 && caller.eraIndex <= 3) {
                    this.tryUseConsumableForHeal(caller);
                }

                // Movement
                data.methods.closeTheGapForwardFirst(caller, combatants);

                // Attack trigger
                {
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
                }
                break;
            }
            default:
                break;
        }

        // Keep caller.facing pointing toward the target after every move tick.
        // Use 4-directional logic to correctly handle targets above/below.
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
    }

    // ─── initiateAttack ──────────────────────────────────────────────────────

    this.initiateAttack = async (caller, manualAttack, combatants) => {
        console.log(`[Barbarian] initiateAttack called — pendingAttack="${caller.pendingAttack?.name}", manualAttack=${manualAttack}, targetId=${caller.targetId}`);
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }
        caller.onMoveCooldown = true;
        setTimeout(() => { caller.onMoveCooldown = false; }, caller.moveCooldown);

        // Helper for facing — always prefer the horizontal axis (left/right)
        // because that's the direction combat happens along. Only fall back to
        // up/down when the target is in exactly the same column (dx === 0), which
        // should be rare. Using 'up' or 'down' as the swing direction causes the
        // axe animation to check the wrong tile for a collision and the hit
        // silently misses, stalling the barbarian until the cooldown expires.
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

        // Debug log: attack name and icon
        if (caller.pendingAttack) {
            console.log('[Barbarian DEBUG]', {
                attackName: caller.pendingAttack.name,
                attackIcon: caller.pendingAttack.icon,
                attackObj: caller.pendingAttack
            });
        } else {
            console.log('[Barbarian DEBUG] No pendingAttack');
        }

        if (manualAttack) {
            if (caller.pendingAttack && caller.pendingAttack.cooldown_position < 99) return;
            if (caller.pendingAttack && caller.pendingAttack.cooldown_position === 100) {
                console.log(`[Barbarian] ⚔️ manual attack — "${caller.pendingAttack.name}", facing=${facing}`);
                const combatantHit = await this.triggerAxeSwing(caller.coordinates, facing);
                if (combatantHit) {
                    this.hitsCombatant(caller, combatantHit);
                    this.kickoffAttackCooldown(caller);
                } else {
                    this.missesTarget(caller);
                    this.kickoffAttackCooldown(caller);
                }
            }
        } else {
            await (async () => {
                switch (caller.pendingAttack.name) {
                    case 'axe swing': {
                        console.log(`[Barbarian] ⚔️ AI attack — "axe swing", facing=${facing}, coords=(${caller.coordinates.x},${caller.coordinates.y})`);
                        const combatantHit = await this.triggerAxeSwing(caller.coordinates, facing);
                        if (combatantHit) {
                            this.hitsCombatant(caller, combatantHit);
                        } else {
                            this.missesTarget(caller);
                        }
                        break;
                    }
                    case 'axe throw': {
                        console.log(`[Barbarian] ⚔️ AI attack — "axe throw", coords=(${caller.coordinates.x},${caller.coordinates.y}), target=(${target?.coordinates?.x},${target?.coordinates?.y})`);
                        const axeThrowHit = await new Promise((resolve) => {
                            this.triggerAxeThrow(caller.coordinates, target?.coordinates, resolve, caller.fighterType, caller.pendingAttack?.name);
                        });
                        if (axeThrowHit) {
                            this.hitsCombatant(caller, axeThrowHit);
                        } else {
                            this.missesTarget(caller);
                        }
                        break;
                    }
                    case 'spear throw': {
                        console.log(`[Barbarian] ⚔️ AI attack — "spear throw", facing=${facing}, coords=(${caller.coordinates.x},${caller.coordinates.y})`);
                        const spearThrowHit = await this.triggerAxeSwing(caller.coordinates, facing);
                        if (spearThrowHit) {
                            this.hitsCombatant(caller, spearThrowHit);
                        } else {
                            this.missesTarget(caller);
                        }
                        break;
                    }
                    default:
                        console.warn(`[Barbarian] ⚔️ AI attack — unhandled attack name: "${caller.pendingAttack.name}"`);
                        break;
                }
            })();
            // Kick off the attack cooldown after every AI-driven attack so the
            // pendingAttack recharges and the barbarian can attack again.
            this.kickoffAttackCooldown(caller);
        }
        caller.attacking = false;
    }

    // ─── Animation trigger ───────────────────────────────────────────────────

    /**
     * Reuses the swordSwing animation channel — same visual weight as the
     * Soldier's swing, appropriate for an axe.
     */
    this.triggerAxeSwing = (callerCoords, facing) => {
        const sourceTileId = this.animationManager.getTileIdByCoords(callerCoords);
        let targetTileId;
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
                this.animationManager.axeSwing(targetTileId, sourceTileId, facing, resolve);
            } else {
                resolve(null);
            }
        });
    }

    // Triggers the axe_throw animation
    // Accepts actual target coordinates for ranged throws
    this.triggerAxeThrow = (callerCoords, targetCoords, resolve, fighterType, attackType) => {
        const sourceTileId = this.animationManager.getTileIdByCoords(callerCoords);
        const targetTileId = this.animationManager.getTileIdByCoords(targetCoords);
        if (sourceTileId !== null && targetTileId !== null) {
            this.animationManager.axeThrow(targetTileId, sourceTileId, null, resolve || (()=>{}), fighterType, attackType);
        } else if (resolve) {
            resolve();
        }
    };
}
