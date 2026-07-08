// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

/**
 * BeholderMinion AI profile
 *
 * Abilities
 * ─────────
 * duplicate  — Costs ALL energy. Spawns an exact copy of this minion (same
 *              current stats / attacks) as a new minion. The copy does NOT
 *              receive the duplicate special so it cannot chain-duplicate.
 *
 * bifurcate  — Triggers when energy reaches 100 (full pool).
 *              The original is destroyed and replaced by TWO new copies, each
 *              with 50% of the original's current HP.
 *              Neither copy inherits the bifurcate (or duplicate) ability.
 *
 * Energy note: minions start at 0 energy and must earn a full pool (100) via
 * normal regen before bifurcate can fire.
 */
export function BeholderMinion(data, utilMethods, animationManager, overlayManager) {
    this.MAX_DEPTH   = data.MAX_DEPTH;
    this.MAX_LANES   = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME;

    this.animationManager  = animationManager;
    this.overlayManager    = overlayManager;

    this.broadcastDataUpdate   = utilMethods.broadcastDataUpdate;
    this.kickoffAttackCooldown = utilMethods.kickoffAttackCooldown;
    this.kickoffSpecialCooldown = utilMethods.kickoffSpecialCooldown;
    this.missesTarget          = utilMethods.missesTarget;
    this.hitsTarget            = utilMethods.hitsTarget;
    this.hitsCombatant         = utilMethods.hitsCombatant;
    this.getCombatants         = utilMethods.getCombatants;
    this.spawnMinion           = utilMethods.spawnMinion;
    this.chooseAttackType      = utilMethods.chooseAttackType;

    // ── helpers ─────────────────────────────────────────────────────────────

    /**
     * Find an unoccupied lane near `caller` on the monster side of the board.
     * Returns { x, y } coordinates for the clone, or null if every lane is taken.
     */
    this._findSpawnCoords = (caller, combatants) => {
        const occupiedYs = new Set(
            Object.values(combatants).filter(c => !c.dead).map(c => c.coordinates.y)
        );
        // Try the same column as the caller first, then one column back
        const preferredXs = [caller.coordinates.x, Math.max(0, caller.coordinates.x - 1)];
        for (const x of preferredXs) {
            for (let y = 0; y < this.MAX_LANES; y++) {
                if (!occupiedYs.has(y)) return { x, y };
            }
        }
        return null; // board is full — cannot spawn
    };

    /**
     * Build a lean stats snapshot from a live combatant so `spawnMinion` gets
     * the correct *current* values (not the originals from the monster-manager).
     */
    this._buildStatsFromCombatant = (combatant) => ({
        hp:        combatant.hp,
        atk:       combatant.atk,
        def:       combatant.stats ? combatant.stats.def  : combatant.atk,
        speed:     combatant.stats ? combatant.stats.speed : 5,
        willpower: combatant.stats ? (combatant.stats.willpower || 0) : 0,
        str:       combatant.stats ? (combatant.stats.str  || 0) : 0,
        dex:       combatant.stats ? (combatant.stats.dex  || 0) : 0,
        int:       combatant.stats ? (combatant.stats.int  || 0) : 0,
        fort:      combatant.stats ? (combatant.stats.fort || 0) : 0,
    });

    /**
     * Strip the cloning special (duplicate OR bifurcate) from a specials array
     * so the copy cannot chain-clone indefinitely.
     */
    this._stripCloningSpecials = (specials) => {
        if (!Array.isArray(specials)) return [];
        return specials.filter(s => {
            if (!s) return false;
            const n = (s.name || '').toLowerCase().replace(/\s+/g, '_');
            return n !== 'duplicate' && n !== 'bifurcate';
        });
    };

    this._hasPassive = (caller, passiveKey) => {
        if (!caller || !Array.isArray(caller.passives) || !passiveKey) return false;
        const normalizedTarget = String(passiveKey).replace(/\s+/g, '_').toLowerCase();
        return caller.passives.some((passive) => {
            const name = typeof passive === 'string' ? passive : (passive && (passive.name || passive.key)) || '';
            const normalizedName = String(name).replace(/\s+/g, '_').toLowerCase();
            return normalizedName === normalizedTarget;
        });
    };

    this._isOccupied = (coords, combatants, caller) => {
        return Object.values(combatants).some(c => {
            if (!c || c.dead || c.id === caller.id) return false;
            if (c.coordinates && c.coordinates.x === coords.x && c.coordinates.y === coords.y) return true;
            if (Array.isArray(c.occupiedCoords)) return c.occupiedCoords.some(oc => oc.x === coords.x && oc.y === coords.y);
            return false;
        });
    };

    // Flying movement can hop over blockers, but may not end on occupied tiles.
    this._flyTowardTarget = (caller, combatants, target) => {
        if (!caller || !caller.coordinates || !target || !target.coordinates) return false;

        const dx = target.coordinates.x - caller.coordinates.x;
        const dy = target.coordinates.y - caller.coordinates.y;
        const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
        const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

        const candidates = [
            { x: caller.coordinates.x + (stepX * 2), y: caller.coordinates.y },
            { x: caller.coordinates.x + stepX, y: caller.coordinates.y + stepY },
            { x: caller.coordinates.x + (stepX * 2), y: caller.coordinates.y + stepY },
            { x: caller.coordinates.x + stepX, y: caller.coordinates.y + (stepY * 2) },
            { x: caller.coordinates.x, y: caller.coordinates.y + (stepY * 2) },
            { x: caller.coordinates.x + stepX, y: caller.coordinates.y },
            { x: caller.coordinates.x, y: caller.coordinates.y + stepY }
        ].filter((coords) => (
            coords.x >= 0 && coords.x <= this.MAX_DEPTH && coords.y >= 0 && coords.y < this.MAX_LANES
        ));

        for (const next of candidates) {
            if (!this._isOccupied(next, combatants, caller)) {
                caller.coordinates = next;
                return true;
            }
        }

        return false;
    };

    // ── duplicate ────────────────────────────────────────────────────────────
    this.triggerDuplicate = (caller, combatants, dupSpecial) => {
        if (!dupSpecial || dupSpecial.cooldown_position < 100) return;
        if ((caller.energy || 0) < 100) return;
        if (caller._hasCloned) return;

        const coords = this._findSpawnCoords(caller, combatants);
        if (!coords) {
            console.log(`[BeholderMinion] duplicate — no free spawn tile, aborting`);
            return;
        }

        console.log(`[BeholderMinion] *** DUPLICATE activated by ${caller.name || caller.type} ***`);

        // Drain energy completely
        caller.energy = 0;
        caller._hasCloned = true;

        // Build the template from current live stats
        const cloneStats = this._buildStatsFromCombatant(caller);
        const cloneSpecials = this._stripCloningSpecials(
            Array.isArray(caller.specials)
                ? caller.specials.map(s => {
                    const n = (s && s.name) ? s.name : (s || '');
                    return typeof n === 'string' ? n.replace(/\s+/g, '_').toLowerCase() : n;
                })
                : []
        );

        const cloneTemplate = {
            type:    caller.type,
            name:    (caller.name || caller.type) + ' (copy)',
            portrait: caller.portrait,
            ...(caller.portraitFilter ? { portraitFilter: caller.portraitFilter } : {}),
            stats:   cloneStats,
            attacks: Array.isArray(caller.attacks)
                ? caller.attacks.map(a => {
                    const name = (a && typeof a === 'object') ? (a.name || '') : (a || '');
                    return name.replace(/\s+/g, '_').toLowerCase();
                }).filter(Boolean)
                : [],
            specials: cloneSpecials,
            weaknesses: caller.weaknesses || [],
            inventory: [],
            isMinion: true,
            coordinates: coords,
        };

        const clone = this.spawnMinion(cloneTemplate, { hp: cloneStats.hp });
        if (clone) {
            clone._hasCloned = true; // copy cannot clone again
            console.log(`[BeholderMinion] duplicate — clone spawned: id=${clone.id}`);
        }

        this.kickoffSpecialCooldown(dupSpecial);
        if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
    };

    // ── bifurcate ────────────────────────────────────────────────────────────
    // The original is destroyed. Two new copies spawn, each at 50% of the
    // original's current HP. Neither copy has bifurcate or duplicate.
    this.triggerBifurcate = (caller, combatants, bifSpecial) => {
        if (!bifSpecial || bifSpecial.cooldown_position < 100) return;
        if ((caller.energy || 0) < 100) return;
        if (caller._hasCloned) return;

        // Need at least two free tiles to spawn both copies
        const coords1 = this._findSpawnCoords(caller, combatants);
        if (!coords1) {
            console.log(`[BeholderMinion] bifurcate — no free spawn tile for copy 1, aborting`);
            return;
        }
        // Temporarily mark coords1 occupied so _findSpawnCoords finds a different tile
        const tempBlocker = { dead: false, coordinates: coords1 };
        const tempId = '__bif_temp__';
        combatants[tempId] = tempBlocker;
        const coords2 = this._findSpawnCoords(caller, combatants);
        delete combatants[tempId];

        if (!coords2) {
            console.log(`[BeholderMinion] bifurcate — no free spawn tile for copy 2, aborting`);
            return;
        }

        console.log(`[BeholderMinion] *** BIFURCATE activated by ${caller.name || caller.type} (hp=${caller.hp}) ***`);

        const originalHp = caller.hp;
        const halfHp     = Math.max(1, Math.floor(originalHp / 2));

        // Build shared template data from the original's current live stats
        const cloneStats = this._buildStatsFromCombatant(caller);
        cloneStats.hp    = halfHp;

        const cloneSpecials = this._stripCloningSpecials(
            Array.isArray(caller.specials)
                ? caller.specials.map(s => {
                    const n = (s && s.name) ? s.name : (s || '');
                    return typeof n === 'string' ? n.replace(/\s+/g, '_').toLowerCase() : n;
                })
                : []
        );
        // Bifurcate copies are small, scrappy melee fighters — strip void lance so
        // they only have claws. Void lance at non-adjacent range would show the icon
        // but never actually satisfy targetInRange (close), causing stale icon display.
        const cloneAttacks = Array.isArray(caller.attacks)
            ? caller.attacks.map(a => {
                const name = (a && typeof a === 'object') ? (a.name || '') : (a || '');
                return name.replace(/\s+/g, '_').toLowerCase();
            }).filter(name => Boolean(name) && name !== 'void_lance')
            : [];
        // Ensure copies always have at least claws
        if (!cloneAttacks.includes('claws')) cloneAttacks.push('claws');

        const makeTemplate = (coords, suffix) => ({
            type:      caller.type,
            name:      (caller.name || caller.type) + suffix,
            portrait:  caller.portrait,
            ...(caller.portraitFilter ? { portraitFilter: caller.portraitFilter } : {}),
            stats:     { ...cloneStats },
            attacks:   cloneAttacks,
            specials:  cloneSpecials,
            weaknesses: caller.weaknesses || [],
            inventory: [],
            isMinion:  true,
            coordinates: coords,
        });

        // ── Animate the original shrinking, then kill it and spawn copies ──
        // Set bifurcating flag immediately so the UI plays the shrink animation.
        // Lock the caller so it cannot move, attack, or be re-targeted during the animation.
        caller._hasCloned = true;
        caller.energy = 0;
        caller.bifurcating = true;
        caller.locked = true;
        if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();

        setTimeout(() => {
            // Kill the original now that the shrink animation has played
            caller.dead = true;
            caller.bifurcating = false;
            console.log(`[BeholderMinion] bifurcate — original ${caller.id} marked dead`);

            const copy1 = this.spawnMinion(makeTemplate(coords1, ' α'), { hp: halfHp, isBifurcateCopy: true, isBifurcateSmall: true });
            const copy2 = this.spawnMinion(makeTemplate(coords2, ' β'), { hp: halfHp, isBifurcateCopy: true, isBifurcateSmall: true });

            if (copy1) { copy1._hasCloned = true; copy1.isBifurcateCopy = true; copy1.isBifurcateSmall = true; console.log(`[BeholderMinion] bifurcate — copy α: id=${copy1.id} hp=${copy1.hp}`); }
            if (copy2) { copy2._hasCloned = true; copy2.isBifurcateCopy = true; copy2.isBifurcateSmall = true; console.log(`[BeholderMinion] bifurcate — copy β: id=${copy2.id} hp=${copy2.hp}`); }

            if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();

            // Clear only the spawning animation flag after it completes —
            // isBifurcateSmall stays true permanently so copies remain at 50% scale.
            setTimeout(() => {
                if (copy1) { copy1.isBifurcateCopy = false; }
                if (copy2) { copy2.isBifurcateCopy = false; }
                if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
            }, 600); // matches bifurcateCopySpawn duration (500ms) + buffer
        }, 700); // matches bifurcateShrink animation duration
    };

    // ── standard AI hooks ────────────────────────────────────────────────────

    this.initialize = (caller) => {
        caller.behaviorSequence = 'skirmisher'; // prefers mid-range; backs off from melee
    };

    // ── chooseAttackType ─────────────────────────────────────────────────────
    /**
     * Range-aware attack selection:
     *  • Adjacent (dx=1, dy=0 OR dx=0, dy=1) → claws (melee)
     *  • Medium distance (dx 2–3)             → void lance
     *  • Fallback                             → best cooled-down attack
     */
    this.chooseAttackType = (caller, target) => {
        if (!target || !caller.attacks || !caller.attacks.length) return null;

        const dx = Math.abs((caller.coordinates.x || 0) - (target.coordinates.x || 0));
        const dy = Math.abs((caller.coordinates.y || 0) - (target.coordinates.y || 0));
        const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
        const isMedium   = dx >= 2 && dx <= 3;

        // Helper: find a ready attack by name (cooldown_position === 100)
        const ready = (name) => caller.attacks.find(a => a && a.name === name && a.cooldown_position === 100);
        // Helper: most-cooled attack overall
        const bestAvailable = () => {
            const sorted = [...caller.attacks].sort((a, b) => (b.cooldown_position || 0) - (a.cooldown_position || 0));
            return sorted[0] || null;
        };

        if (isAdjacent) {
            return ready('claws') || ready('void lance') || bestAvailable();
        }
        if (isMedium) {
            return ready('void lance') || ready('claws') || bestAvailable();
        }
        // Out of all ranges — prefer void lance (medium) so movement AI can close to range
        return ready('void lance') || bestAvailable();
    };

    /**
     * Fire the magic missile overlay animation then apply damage after the
     * projectile travel time (matches Wizard.triggerMagicMissile).
     */
    this.triggerMagicMissile = (caller, target, travelTime = 1500) => {
        console.log(`[BeholderMinion] triggerMagicMissile — src=(${caller.coordinates.x},${caller.coordinates.y}) tgt=(${target.coordinates.x},${target.coordinates.y}) animMgr=${!!this.animationManager}`);
        if (this.animationManager && caller && target) {
            // Use minorMagicMissile if available (green, fewer particles), fall back to major
            const missileOptions = {
                getCurrentTargetCoords: () => {
                    if (!target || target.dead || !target.coordinates) return null;
                    return target.coordinates;
                }
            };
            if (typeof this.animationManager.minorMagicMissile === 'function') {
                this.animationManager.minorMagicMissile(caller.coordinates, target.coordinates, missileOptions);
            } else {
                this.animationManager.magicMissile(caller.coordinates, target.coordinates, 'major', missileOptions);
            }
        }
        const applyHit = () => {
            if (!caller || !target || target.dead) return;
            try {
                this.hitsCombatant(caller, target);
            } catch (e) {
                console.warn('[BeholderMinion] triggerMagicMissile damage failed', e);
            }
        };
        setTimeout(() => {
            applyHit();
        }, travelTime);
    };

    /**
     * Fire the void lance overlay animation then apply damage after the beam
     * reaches the target (travel time computed by AnimationManager.voidLance).
     */
    this.triggerVoidLance = (caller, target) => {
        console.log(`[BeholderMinion] triggerVoidLance — src=(${caller.coordinates.x},${caller.coordinates.y}) tgt=(${target.coordinates.x},${target.coordinates.y})`);
        if (this.animationManager && typeof this.animationManager.voidLance === 'function') {
            this.animationManager.voidLance(caller.coordinates, target.coordinates)
                .then((travelMs) => {
                    const delay = Math.max(travelMs, 80);
                    setTimeout(() => {
                        if (!caller || !target || target.dead) return;
                        try {
                            this.hitsCombatant(caller, target);
                        } catch (e) {
                            console.warn('[BeholderMinion] triggerVoidLance damage failed', e);
                        }
                    }, delay);
                });
        } else {
            // Fallback: no animation manager — apply damage immediately
            try {
                this.hitsCombatant(caller, target);
            } catch (e) {
                console.warn('[BeholderMinion] triggerVoidLance fallback damage failed', e);
            }
        }
    };

    this.initiateAttack = async (caller, combatants) => {
        if (caller.attacking) return;
        const target = combatants[caller.targetId];
        caller.attacking = true;
        try {
            if (!target || target.dead || target.isVCT) {
                if (!target) {
                    console.log('[BeholderMinion] initiateAttack — no target');
                } else if (target.isVCT) {
                    console.warn('[BeholderMinion] initiateAttack — target is VCT, skipping attack');
                }
                this.kickoffAttackCooldown(caller);
                caller.pendingAttack = null;
                return;
            }

            // If no pending attack has been chosen yet, pick one now
            if (!caller.pendingAttack) {
                caller.pendingAttack = this.chooseAttackType(caller, target);
            }

            const attackName = caller.pendingAttack && caller.pendingAttack.name;
            console.log(`[BeholderMinion] initiateAttack — "${attackName}" vs ${target.name || target.type}`);

            if (attackName === 'void lance') {
                // Animated projectile — damage fires after beam arrives
                this.triggerVoidLance(caller, target);
            } else if (attackName === 'claws') {
                // Melee — direct hit, icon shows via pendingAttack
                try {
                    this.hitsCombatant(caller, target);
                } catch (e) {
                    console.warn('[BeholderMinion] claws hit failed', e);
                    try { this.missesTarget(caller); } catch (_) {}
                }
            } else {
                // All other attacks — direct hit
                try {
                    this.hitsCombatant(caller, target);
                } catch (e) {
                    console.warn('[BeholderMinion] initiateAttack failed', e);
                    try { this.missesTarget(caller); } catch (_) {}
                }
            }

            this.kickoffAttackCooldown(caller);
            caller.pendingAttack = null;
        } finally {
            caller.attacking = false;
        }
    };

    this.acquireTarget = (caller, combatants) => {
        const { AcquireTargetMethods } = require('../../shared-ai-methods/acquire-target-methods');
        const target = AcquireTargetMethods.acquireClosestSoftTarget(caller, combatants);
        if (!target) return;
        // Final guard: never allow targeting a VCT
        if (target.isVCT) {
            caller.targetId = null;
            caller.pendingAttack = null;
            return;
        }
        caller.targetId = target.id;
        caller.pendingAttack = this.chooseAttackType(caller, target);
    };

    this.handleOverlap = (caller, combatants) => {
        data.methods.closeTheGap(caller, combatants);
        if (caller.targetId) {
            data.methods.evade(caller, combatants);
        }
    };

    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }

        caller.onMoveCooldown = true;
        setTimeout(() => { caller.onMoveCooldown = false; }, caller.moveCooldown);

        switch (caller.behaviorSequence) {
          case 'skirmisher':
          default: {
        this.acquireTarget(caller, combatants);

        // ── check for cloning specials ──────────────────────────────────────
        if (!caller._hasCloned && !caller.dead && Array.isArray(caller.specials)) {
            // bifurcate fires as soon as energy is full (100) — no cooldown gate needed
            const bifSpecial = caller.specials.find(s => s && s.name === 'bifurcate');
            const dupSpecial = caller.specials.find(s => s && s.name === 'duplicate');

            if (bifSpecial && (caller.energy || 0) >= 100) {
                // Pass cooldown_position = 100 so the guard inside triggerBifurcate passes
                bifSpecial.cooldown_position = 100;
                this.triggerBifurcate(caller, combatants, bifSpecial);
                return; // original is now dead — nothing more to do this turn
            }
            if (dupSpecial && dupSpecial.cooldown_position >= 100 && (caller.energy || 0) >= 100) {
                this.triggerDuplicate(caller, combatants, dupSpecial);
                return;
            }
        }

        // ── minor magic missile (special, 33% chance) ──────────────────────
        // Only fires if: special is ready (cooldown 100), target exists and is
        // in far-range same lane, AND a 33% dice roll passes.
        // If the roll fails we save the energy toward bifurcate instead.
        if (!caller.dead && Array.isArray(caller.specials)) {
            const mmSpecial = caller.specials.find(s => s && s.name === 'minor magic missile');
            const target = combatants[caller.targetId];
            if (mmSpecial && mmSpecial.cooldown_position >= 100 && target && !target.dead) {
                const sameLane = (caller.coordinates.y === target.coordinates.y);
                if (sameLane && Math.random() < 0.33) {
                    console.log(`[BeholderMinion] firing minor magic missile (33% roll passed)`);
                    this.triggerMagicMissile(caller, target, 1500);
                    this.kickoffSpecialCooldown(mmSpecial);
                    return;
                }
            }
        }

        // ── Range-aware movement ────────────────────────────────────────────
        // Bifurcate copies only have claws — they should always close the gap.
        // The original (has void lance) prefers mid-range; backs off from melee 60% of the time.
        const hasMediumAttack = caller.attacks && caller.attacks.some(a => a && a.range === 'medium');
        const moveTarget = combatants[caller.targetId];
        if (moveTarget && !moveTarget.dead) {
            const dx = Math.abs(caller.coordinates.x - moveTarget.coordinates.x);
            const dy = Math.abs(caller.coordinates.y - moveTarget.coordinates.y);
            const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
            const isMedium   = dx >= 2 && dx <= 3;

            const someoneIsAt = (coords) => {
                return this._isOccupied(coords, combatants, caller);
            };

            const hasFlying = this._hasPassive(caller, 'flying');

            if (isAdjacent && hasMediumAttack) {
                // Has void lance — 60% chance to back off to mid-range, 40% stay and use claws
                if (Math.random() < 0.60) {
                    // Monsters live on the right side of the board (high x), fighters on the left (low x).
                    // "backing off" means moving away from the target along the x axis.
                    const awayX = caller.coordinates.x >= moveTarget.coordinates.x
                        ? Math.min(caller.coordinates.x + 1, this.MAX_DEPTH)   // we are to the right — step further right
                        : Math.max(caller.coordinates.x - 1, 0);               // we are to the left  — step further left
                    const retreatCoords = { x: awayX, y: caller.coordinates.y };
                    if (!someoneIsAt(retreatCoords) && retreatCoords.x >= 0 && retreatCoords.x <= this.MAX_DEPTH) {
                        caller.coordinates = retreatCoords;
                    } else {
                        // Straight retreat blocked — try diagonal retreat
                        const diagY = caller.coordinates.y < this.MAX_LANES - 1 ? caller.coordinates.y + 1 : caller.coordinates.y - 1;
                        const diagCoords = { x: awayX, y: diagY };
                        if (!someoneIsAt(diagCoords)) {
                            caller.coordinates = diagCoords;
                        }
                        // If all retreat paths blocked, stay in place — will use claws
                    }
                }
                // else: 40% chance — stay adjacent and use claws
            } else if (isAdjacent) {
                // Claws-only copy — stay put, will attack from here
            } else if (isMedium && hasMediumAttack) {
                // Already in ideal void-lance range — 65% chance to hold position, 35% to drift
                if (Math.random() < 0.35) {
                    // Small drift to align lane with target
                    if (dy > 0) {
                        const driftY = caller.coordinates.y < moveTarget.coordinates.y
                            ? caller.coordinates.y + 1
                            : caller.coordinates.y - 1;
                        const driftCoords = { x: caller.coordinates.x, y: driftY };
                        if (!someoneIsAt(driftCoords) && driftY >= 0 && driftY < this.MAX_LANES) {
                            caller.coordinates = driftCoords;
                        }
                    }
                }
                // else: hold position — already optimal for void lance
            } else {
                // Out of range — flyers can hop over blockers/walls.
                if (!(hasFlying && this._flyTowardTarget(caller, combatants, moveTarget))) {
                    data.methods.closeTheGap(caller, combatants);
                }
            }
        } else {
            // No target — standard movement
            if (!(this._hasPassive(caller, 'flying') && caller.targetId && this._flyTowardTarget(caller, combatants, combatants[caller.targetId]))) {
                data.methods.closeTheGap(caller, combatants);
            }
        }

        // Keep facing toward target
        if (caller.targetId && combatants[caller.targetId]) {
            const target = combatants[caller.targetId];
            caller.facing = (caller.coordinates.x <= target.coordinates.x) ? 'right' : 'left';
        }

        // Re-evaluate pendingAttack after movement — position may have changed
        // (e.g. retreated from adjacent to medium), so the chosen attack must reflect
        // the current position, not where the minion was before it moved.
        if (caller.targetId && combatants[caller.targetId]) {
            const postMoveTarget = combatants[caller.targetId];
            caller.pendingAttack = this.chooseAttackType(caller, postMoveTarget);
        }

        // Attack trigger
        {
            const era = caller.eras ? caller.eras[caller.eraIndex] : null;
            if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking && caller.pendingAttack) {
                const attackTarget = combatants[caller.targetId];
                if (attackTarget && !attackTarget.dead && !attackTarget.isVCT) {
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
        }
          } // end default/skirmisher case
        } // end switch
    };
}
