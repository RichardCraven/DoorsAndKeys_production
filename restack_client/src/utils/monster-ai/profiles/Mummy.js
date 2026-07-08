// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

export function Mummy(data, utilMethods, animationManager, overlayManager) {
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
    this.getCombatants = utilMethods.getCombatants;
    this.getVct = utilMethods.getVct;
    this.triggerBoardEvent = utilMethods.triggerBoardEvent;

    // ── Custom attack selection ──────────────────────────────────────────────
    // Prefer grasp when the target is adjacent (distance ≤ 1).
    // Prefer energy_drain when the target is at medium range.
    // Falls back to whatever is off cooldown (most recovered first).
    this.chooseAttackType = (caller, target) => {

        if (!target || !target.coordinates || !caller.coordinates) {
            // No valid target yet — fall back to most-recovered attack
            return caller.attacks.reduce((best, a) => (a.cooldown_position > best.cooldown_position ? a : best), caller.attacks[0]);
        }

        // --- BEGIN 2x ADJACENCY LOGIC ---
        // For 2x monsters, check adjacency to all occupied tiles
        // Assume scale=2 means 2x2, anchor at (x, y)
        const occupiedTiles = [];
        const scale = caller.scale || caller["main-monster"] || caller.isMainMonster ? 2 : 1;
        const baseX = caller.coordinates.x;
        const baseY = caller.coordinates.y;
        for (let dx = 0; dx < scale; dx++) {
            for (let dy = 0; dy < scale; dy++) {
                occupiedTiles.push({ x: baseX + dx, y: baseY + dy });
            }
        }

        // Check if target is adjacent to any occupied tile
        const isAdjacent = occupiedTiles.some(tile => {
            const dx = Math.abs(target.coordinates.x - tile.x);
            const dy = Math.abs(target.coordinates.y - tile.y);
            return (dx + dy === 1); // 4-way adjacency
        });

        const available = caller.attacks.filter(e => e.cooldown_position === 100);
        const mostRecovered = (list) => list.reduce((best, a) => (a.cooldown_position > best.cooldown_position ? a : best), list[0]);

        if (isAdjacent) {
            // Adjacent — always try grasp first
            const grasp = available.find(a => a.name === 'grasp');
            if (grasp) return grasp;
            // grasp on cooldown — pick most-recovered close attack, then any
            const closeAttacks = caller.attacks.filter(a => a.range === 'close');
            if (closeAttacks.length) return mostRecovered(closeAttacks);
        }

        // Medium/far range — try energy_drain first
        const drain = available.find(a => a.name === 'energy drain' || a.name === 'energy_drain');
        if (drain) return drain;

        // energy_drain on cooldown — pick most-recovered medium/far, else most-recovered overall
        const rangedAttacks = caller.attacks.filter(a => a.range === 'medium' || a.range === 'far');
        if (rangedAttacks.length) return mostRecovered(rangedAttacks);

        // Absolute fallback
        return mostRecovered(caller.attacks);
    }

    this.initialize = (caller) => {
        caller.behaviorSequence = 'brawler';
    }

    this.acquireTarget = (caller, combatants) => {
        const { AcquireTargetMethods } = require('../../shared-ai-methods/acquire-target-methods');
        // Find all valid enemies (guaranteed VCT exclusion)
        const isMonsterOrMinion = caller.isMonster || caller.isMinion;
        const enemies = Object.values(combatants).filter(e => {
            if (isMonsterOrMinion) {
                return !e.dead && e.id !== caller.id && !e.isMonster && !e.isMinion && !e.isVCT;
            } else {
                return !e.dead && e.id !== caller.id && (e.isMonster || e.isMinion) && !e.isVCT;
            }
        });
        // Use virtually occupied tiles for adjacency checks (for 2x2 monsters)
        let occupiedTiles = Array.isArray(caller.occupiedTiles) && caller.occupiedTiles.length > 0
            ? caller.occupiedTiles
            : (() => {
                const scale = caller.scale || caller["main-monster"] || caller.isMainMonster ? 2 : 1;
                const baseX = caller.coordinates.x;
                const baseY = caller.coordinates.y;
                const tiles = [];
                for (let dx = 0; dx < scale; dx++) {
                    for (let dy = 0; dy < scale; dy++) {
                        tiles.push({ x: baseX + dx, y: baseY + dy });
                    }
                }
                return tiles;
            })();

        // Scan all enemies for best possible target/attack pair
        let best = null;
        for (const enemy of enemies) {
            if (enemy.isVCT) continue; // Extra guard
            // For each attack, check if enemy is in range and attack is ready
            for (const attack of caller.attacks) {
                if (attack.cooldown_position < 100) continue;
                let inRange = false;
                if (attack.range === 'close') {
                    inRange = occupiedTiles.some(tile => {
                        const dx = Math.abs(enemy.coordinates.x - tile.x);
                        const dy = Math.abs(enemy.coordinates.y - tile.y);
                        return (dx + dy === 1);
                    });
                } else if (attack.range === 'medium') {
                    const minDist = Math.min(...occupiedTiles.map(tile => {
                        const dx = Math.abs(enemy.coordinates.x - tile.x);
                        const dy = Math.abs(enemy.coordinates.y - tile.y);
                        return dx + dy;
                    }));
                    inRange = minDist <= 3;
                } else if (attack.range === 'far') {
                    const minDist = Math.min(...occupiedTiles.map(tile => {
                        const dx = Math.abs(enemy.coordinates.x - tile.x);
                        const dy = Math.abs(enemy.coordinates.y - tile.y);
                        return dx + dy;
                    }));
                    inRange = minDist <= 6;
                }
                if (inRange) {
                    // Prefer adjacent/close, then medium, then far, then most recovered
                    if (!best || (attack.range === 'close' && best.attack.range !== 'close') ||
                        (attack.range === 'medium' && best.attack.range === 'far') ||
                        (attack.cooldown_position > best.attack.cooldown_position)) {
                        best = { enemy, attack };
                    }
                }
            }
        }
        if (best && !best.enemy.isVCT) {
            caller.targetId = best.enemy.id;
            caller.pendingAttack = best.attack;
            return;
        }
        // Fallback: no one in range, use closest soft target (guaranteed VCT exclusion)
        let fallbackTarget = AcquireTargetMethods.acquireClosestSoftTarget(caller, combatants);
        if (fallbackTarget) {
            if (fallbackTarget.isVCT) {
                if (typeof console !== 'undefined') {
                    console.warn('[Mummy AI] Fallback target is a VCT! Excluding. id:', fallbackTarget.id, fallbackTarget);
                }
                fallbackTarget = null;
            }
        }
        if (fallbackTarget) {
            caller.targetId = fallbackTarget.id;
            caller.pendingAttack = this.chooseAttackType(caller, fallbackTarget);
        } else {
            caller.targetId = null;
            caller.pendingAttack = null;
        }
    }

    this.handleOverlap = (caller, combatants) => {
        data.methods.closeTheGap(caller, combatants);
        if (caller.targetId) {
            data.methods.evade(caller, combatants);
        }
    }

    // ── induce_fear helper ───────────────────────────────────────────────────
    this.triggerInduceFear = (caller, combatants, fearSpecial) => {
        if (!fearSpecial || fearSpecial.cooldown_position < 100) return;
        if ((caller.energy || 0) < 90) return;

        const FIGHT_INTERVAL = utilMethods.getFightInterval ? utilMethods.getFightInterval() : 40;
        const eraDuration = 5 * 100 * FIGHT_INTERVAL;

        // Spend energy
        caller.energy = (caller.energy || 0) - 90;

        // Apply 50% ATK and DEF reduction to all non-monster, non-minion combatants, excluding VCTs
        const enemies = Object.values(combatants).filter(c => !c.dead && !c.isMonster && !c.isMinion && !c.isVCT);
        enemies.forEach(enemy => {
            // Store originals before first application (guard against double-stack)
            if (!enemy._fearOriginalAtk) enemy._fearOriginalAtk = enemy.atk;
            if (!enemy._fearOriginalDef) enemy._fearOriginalDef = enemy.def;

            enemy.atk = Math.max(1, Math.floor(enemy._fearOriginalAtk * 0.5));
            enemy.def = Math.max(0, Math.floor(enemy._fearOriginalDef * 0.5));
            enemy.feared = true;
            // Only set feared_eras on first application. If already counting down,
            // do NOT reset to 5 — that would allow a second Mummy firing mid-countdown
            // to permanently extend fear and prevent it from ever expiring.
            if (!enemy.feared_eras || enemy.feared_eras <= 0) {
                // Use duration from the specials matrix (fearSpecial.duration) rather than
                // a hardcoded value.  specials-matrix.induce_fear.duration = 2.  The old
                // hardcoded 5 meant fear lasted ~83 s for a dex-6 fighter, which typically
                // exceeded the fight length and made fear appear to never end.
                const erasToApply = (fearSpecial && typeof fearSpecial.duration === 'number' && fearSpecial.duration > 0)
                    ? fearSpecial.duration
                    : 2; // fallback matches matrix default
                enemy.feared_eras = erasToApply;
            } else {
            }

            console.log(`[Mummy] FEAR applied to ${enemy.name || enemy.type}: atk ${enemy._fearOriginalAtk}→${enemy.atk}, def ${enemy._fearOriginalDef}→${enemy.def}`);
        });

        // Broadcast immediately so UI reflects reduced stats
        if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();

        // Push floating stat-debuff indicators above each affected fighter
        enemies.forEach(enemy => {
            if (!Array.isArray(enemy.damageIndicators)) enemy.damageIndicators = [];
            const atkId = Date.now() + Math.random();
            const atkObj = { id: atkId, value: 'ATK ↓', source: 'Mummy' };
            enemy.damageIndicators.push(atkObj);
            setTimeout(() => {
                const idx = enemy.damageIndicators.findIndex(e => e && e.id === atkId);
                if (idx !== -1) enemy.damageIndicators.splice(idx, 1);
                if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
            }, 1800);
        });
        if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
        setTimeout(() => {
            enemies.forEach(enemy => {
                if (enemy.dead) return;
                if (!Array.isArray(enemy.damageIndicators)) enemy.damageIndicators = [];
                const defId = Date.now() + Math.random();
                const defObj = { id: defId, value: 'DEF ↓', source: 'Mummy' };
                enemy.damageIndicators.push(defObj);
                setTimeout(() => {
                    const idx = enemy.damageIndicators.findIndex(e => e && e.id === defId);
                    if (idx !== -1) enemy.damageIndicators.splice(idx, 1);
                    if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
                }, 1800);
            });
            if (typeof this.broadcastDataUpdate === 'function') this.broadcastDataUpdate();
        }, 600);

        // Fire board-wide visual event
        if (typeof this.triggerBoardEvent === 'function') {
            this.triggerBoardEvent('induce_fear', { duration: eraDuration });
        }

        // Safety-net removed: fear is now only cleared by tick-based logic in restartTurnCycle.

        // Lock movement for the duration of the cast glow animation (matches fearCastingActive in UI)
        caller.castingLock = true;
        setTimeout(() => {
            caller.castingLock = false;
        }, 1800);

        // Start special cooldown recharge
        this.kickoffSpecialCooldown(fearSpecial);
    }

    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            throw new Error('moveCooldown must be defined for all units');
        }

        switch (caller.behaviorSequence) {
            case 'brawler': {
        // Retarget every turn to always track the closest enemy
        this.acquireTarget(caller, combatants);

        // --- FINAL UNCONDITIONAL VCT GUARD ---
        if (caller.targetId && combatants[caller.targetId] && combatants[caller.targetId].isVCT) {
            if (typeof console !== 'undefined') {
                console.warn('[Mummy][VCT-GUARD] TargetId was set to a VCT after acquireTarget! Forcing to null.', {
                    targetId: caller.targetId,
                    target: combatants[caller.targetId]
                });
            }
            caller.targetId = null;
            caller.pendingAttack = null;
        }

        //console.log(`[Mummy] processMove — eraIndex=${caller.eraIndex}, targetId=${caller.targetId}, pendingAttack=${caller.pendingAttack?.name}, attacking=${caller.attacking}, moveCooldown=${caller.moveCooldown}, energy=${Math.floor(caller.energy || 0)}`);
        //console.log('[Mummy][DEBUG] State at processMove:', {
        //    pendingAttack: caller.pendingAttack,
        //    attacking: caller.attacking,
        //    moveCooldown: caller.moveCooldown,
        //    onMoveCooldown: caller.onMoveCooldown,
        //    targetId: caller.targetId,
        //    hp: caller.hp,
        //    energy: caller.energy
        //});

        // Check if induce_fear should fire (energy ≥ 90 and special ready)
        const fearSpecial = Array.isArray(caller.specials)
            ? caller.specials.find(s => s && (s.name === 'induce fear' || s.name === 'induce_fear'))
            : null;
        if (fearSpecial) {
            this.triggerInduceFear(caller, combatants, fearSpecial);
        }

        caller.onMoveCooldown = true;
        setTimeout(() => {
            caller.onMoveCooldown = false;
        }, caller.moveCooldown);

        // Prevent movement if already adjacent to any enemy (stand and fight)
        if (!caller.castingLock) {
            // Use virtually occupied tiles for adjacency checks
            let occupiedTiles = Array.isArray(caller.occupiedTiles) && caller.occupiedTiles.length > 0
                ? caller.occupiedTiles
                : (() => {
                    const scale = caller.scale || caller["main-monster"] || caller.isMainMonster ? 2 : 1;
                    const baseX = caller.coordinates.x;
                    const baseY = caller.coordinates.y;
                    const tiles = [];
                    for (let dx = 0; dx < scale; dx++) {
                        for (let dy = 0; dy < scale; dy++) {
                            tiles.push({ x: baseX + dx, y: baseY + dy });
                        }
                    }
                    return tiles;
                })();
            // Only check adjacency to the current target
            let target = caller.targetId && combatants[caller.targetId] ? combatants[caller.targetId] : null;
            let isAdjacentToTarget = false;
            if (target) {
                isAdjacentToTarget = occupiedTiles.some(tile => {
                    const dx = Math.abs(target.coordinates.x - tile.x);
                    const dy = Math.abs(target.coordinates.y - tile.y);
                    return (dx + dy === 1);
                });
            }
            if (!isAdjacentToTarget) {
                // Try to move toward the target; if blocked, try to move around blocker
                // --- Enhanced: Prevent overlap for large monsters ---
                const tryMove = (moveFn) => {
                    // Simulate move
                    const origX = caller.coordinates.x;
                    const origY = caller.coordinates.y;
                    moveFn();
                    // Calculate new virtually occupied tiles
                    const scale = caller.scale || caller["main-monster"] || caller.isMainMonster ? 2 : 1;
                    const newTiles = [];
                    for (let dx = 0; dx < scale; dx++) {
                        for (let dy = 0; dy < scale; dy++) {
                            newTiles.push({ x: caller.coordinates.x + dx, y: caller.coordinates.y + dy });
                        }
                    }
                    // Check for overlap with any other unit
                    let overlap = false;
                    Object.values(combatants).forEach(e => {
                        if (e.dead || e.id === caller.id) return;
                        // Check anchor
                        if (newTiles.some(t => t.x === e.coordinates.x && t.y === e.coordinates.y)) overlap = true;
                        // Check virtually occupied tiles if present
                        if (Array.isArray(e.occupiedTiles)) {
                            if (newTiles.some(t => e.occupiedTiles.some(et => et.x === t.x && et.y === t.y))) overlap = true;
                        }
                    });
                    // Undo move if overlap
                    if (overlap) {
                        caller.coordinates.x = origX;
                        caller.coordinates.y = origY;
                        return false;
                    }
                    return true;
                };
                // Try closeTheGap
                const moved = tryMove(() => data.methods.closeTheGap(caller, combatants));
                if (!moved) {
                    // Movement was blocked or would overlap, try to move around blocker
                    tryMove(() => this.tryMoveAroundBlocker(caller, combatants));
                }
            }
        }

        // Keep facing toward target — full 4-directional so downward attacks
        // use 'down' instead of incorrectly snapping to 'right'.
        if (caller.targetId && combatants[caller.targetId]) {
            const target = combatants[caller.targetId];
            const _dx = target.coordinates.x - caller.coordinates.x;
            const _dy = target.coordinates.y - caller.coordinates.y;
            if (_dx === 0) {
                caller.facing = _dy > 0 ? 'down' : 'up';
            } else {
                caller.facing = _dx > 0 ? 'right' : 'left';
            }
            // --- Robust attack trigger: allow attack if target is adjacent to any occupied tile ---
            const occupiedTiles = Array.isArray(caller.occupiedTiles) && caller.occupiedTiles.length > 0
                ? caller.occupiedTiles
                : (() => {
                    const scale = caller.scale || caller["main-monster"] || caller.isMainMonster ? 2 : 1;
                    const baseX = caller.coordinates.x;
                    const baseY = caller.coordinates.y;
                    const tiles = [];
                    for (let dx = 0; dx < scale; dx++) {
                        for (let dy = 0; dy < scale; dy++) {
                            tiles.push({ x: baseX + dx, y: baseY + dy });
                        }
                    }
                    return tiles;
                })();
            let isAdjacentToTarget = false;
            if (target) {
                isAdjacentToTarget = occupiedTiles.some(tile => {
                    const dx = Math.abs(target.coordinates.x - tile.x);
                    const dy = Math.abs(target.coordinates.y - tile.y);
                    return (dx + dy === 1);
                });
            }
            // --- Attack trigger logic ---
            // Single unified path: check pendingAttack ready, then check range.
            // The old duplicate adjacency-only check has been removed — the range
            // check below already covers close (adjacent) attacks.
            // Repopulate pendingAttack if cleared by restartTurnCycle
            if (!caller.pendingAttack && target && !target.dead && !target.isVCT) {
                caller.pendingAttack = this.chooseAttackType(caller, target);
            }
            if (
                caller.pendingAttack &&
                !caller.attacking &&
                (!caller.castingLock) &&
                caller.pendingAttack.cooldown_position === 100 // attack is ready
            ) {
                // Check if target is in range for the pending attack
                const attackRange = caller.pendingAttack.range;
                // For 2x monsters, check adjacency to all occupied tiles
                const occupiedTiles = (caller.scale === 2 && Array.isArray(caller.occupiedTiles))
                    ? caller.occupiedTiles
                    : [caller.coordinates];
                let inRange = false;
                if (attackRange === 'close') {
                    // Adjacent to any occupied tile
                    inRange = occupiedTiles.some(tile => {
                        const dx = Math.abs(tile.x - target.coordinates.x);
                        const dy = Math.abs(tile.y - target.coordinates.y);
                        return (dx + dy === 1); // 4-way adjacency
                    });
                } else if (attackRange === 'medium' || attackRange === 'far') {
                    // Use Manhattan distance for range
                    const minDist = Math.min(...occupiedTiles.map(tile => {
                        const dx = Math.abs(tile.x - target.coordinates.x);
                        const dy = Math.abs(tile.y - target.coordinates.y);
                        return dx + dy;
                    }));
                    if (attackRange === 'medium') inRange = minDist <= 3;
                    if (attackRange === 'far') inRange = minDist <= 6;
                }
                if (inRange) {
                    // Fire the attack!
                    this.initiateAttack(caller, combatants);
                }
            }
        }
            break; // end case 'brawler'
            }
            default:
                break;
        } // end switch(behaviorSequence)
    }

    this.initiateAttack = async (caller, combatants) => {
        if (caller.attacking) return;
        const target = combatants[caller.targetId];
        //console.log('[Mummy][DEBUG] initiateAttack called', {
        //    pendingAttack: caller.pendingAttack,
        //    attacking: caller.attacking,
        //    moveCooldown: caller.moveCooldown,
        //    onMoveCooldown: caller.onMoveCooldown,
        //    targetId: caller.targetId,
        //    hp: caller.hp,
        //    energy: caller.energy
        //});
        caller.attacking = true;
        try {
        if (!target) {
            console.log('[Mummy] initiateAttack — NO TARGET!');
            return;
        }

        const attackName = caller.pendingAttack?.name;
        //console.log(`[Mummy] initiateAttack — attack=${attackName}, target=${target.name || target.type || target.id}`);

        // Log before executing the attack
        //console.log('[Mummy][DEBUG] About to execute attack', {
        //    attackName,
        //    pendingAttack: caller.pendingAttack,
        //    attacking: caller.attacking,
        //    moveCooldown: caller.moveCooldown,
        //    onMoveCooldown: caller.onMoveCooldown,
        //    targetId: caller.targetId,
        //    hp: caller.hp,
        //    energy: caller.energy
        //});
        switch (attackName) {
            case 'grasp': {
                // Find which occupied tile is adjacent to the target
                let graspTile = caller.coordinates;
                if (Array.isArray(caller.occupiedTiles) && caller.occupiedTiles.length > 1) {
                    const adjTile = caller.occupiedTiles.find(tile => {
                        const dx = Math.abs(tile.x - target.coordinates.x);
                        const dy = Math.abs(tile.y - target.coordinates.y);
                        return (dx + dy === 1);
                    });
                    if (adjTile) graspTile = adjTile;
                }
                // Trigger grasp animation using animationManager at the correct tile
                if (this.animationManager && typeof this.animationManager.triggerAttackAnimation === 'function') {
                    await this.animationManager.triggerAttackAnimation({
                        coordinates: graspTile,
                        facing: caller.facing,
                        icon: caller.pendingAttack.icon,
                        type: 'grasp',
                        animationType: 'grasp',
                        selectedAction: caller.pendingAttack // Pass the full attack object (has isGif, icon)
                    });
                }
                this.hitsCombatant(caller, target);
                break;
            }

            case 'energy drain':
            case 'energy_drain': {
                console.log('****************** ENERGY DRAIN **********');
                // Pick the source tile (main or VCT) that is most aligned with the target
                const vct = this.getVct && this.getVct(caller.id);
                let drainSourceCoords = caller.coordinates;
                if (vct) {
                    const mainDx = Math.abs(caller.coordinates.x - target.coordinates.x);
                    const mainDy = Math.abs(caller.coordinates.y - target.coordinates.y);
                    const vctDx  = Math.abs(vct.coordinates.x  - target.coordinates.x);
                    const vctDy  = Math.abs(vct.coordinates.y  - target.coordinates.y);
                    // Use whichever tile is closer (Manhattan distance) to the target
                    const mainDist = mainDx + mainDy;
                    const vctDist  = vctDx  + vctDy;
                    drainSourceCoords = vctDist <= mainDist ? vct.coordinates : caller.coordinates;
                }
                // Trigger tile animation before hit
                if (this.animationManager && typeof this.animationManager.triggerAttackAnimation === 'function') {
                    await this.animationManager.triggerAttackAnimation({
                        coordinates: drainSourceCoords,
                        facing: caller.facing,
                        icon: caller.pendingAttack?.icon,
                        type: 'energy_drain',
                        animationType: 'energy_drain',
                        selectedAction: caller.pendingAttack
                    });
                }
                // Apply hit damage first
                this.hitsCombatant(caller, target);

                // Only drain energy if the target survived
                if (target && !target.dead && target.hp > 0) {
                    const { applyDrainedEffect } = require('../../combat-effects');
                    applyDrainedEffect(target, this.broadcastDataUpdate);
                    // Boost mummy energy by 40 (capped at 100)
                    caller.energy = Math.min(100, (caller.energy || 0) + 40);
                }
                break;
            }

            default: {
                try {
                    this.hitsCombatant(caller, target);
                } catch (e) {
                    console.warn('[Mummy] Fallback attack failed in initiateAttack', e);
                }
                break;
            }
        }

        this.kickoffAttackCooldown(caller);
        caller.pendingAttack = null;
        } finally {
            caller.attacking = false;
        }
        //console.log('[Mummy][DEBUG] Attack complete. State after attack:', {
        //    pendingAttack: caller.pendingAttack,
        //    attacking: caller.attacking,
        //    moveCooldown: caller.moveCooldown,
        //    onMoveCooldown: caller.onMoveCooldown,
        //    targetId: caller.targetId,
        //    hp: caller.hp,
        //    energy: caller.energy
        //});
    }
}
