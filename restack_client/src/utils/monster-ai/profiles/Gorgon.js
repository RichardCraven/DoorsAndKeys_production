// Gorgon AI Profile - Handles snake_strike, bite, and petrify gaze skills.

export function Gorgon(data, utilMethods, animationManager, overlayManager) {
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

    this.initialize = (caller) => {
        caller.behaviorSequence = 'brawler';
    };

    this.chooseAttackType = (caller, target) => {
        if (!caller || !Array.isArray(caller.attacks) || caller.attacks.length === 0) {
            return null;
        }

        const available = caller.attacks.filter(a => a.cooldown_position === 100);

        if (!target || !target.coordinates || !caller.coordinates) {
            return available.length > 0 ? available[0] : caller.attacks[0];
        }

        const dx = Math.abs(target.coordinates.x - caller.coordinates.x);
        const dy = Math.abs(target.coordinates.y - caller.coordinates.y);
        const dist = dx + dy;

        // If at medium range (2-3 tiles), prioritize petrify gaze
        if (dist >= 2 && dist <= 4) {
            const petrifySkill = available.find(a => (a.id === 'petrify' || a.name === 'Petrify' || (a.name || '').toLowerCase().includes('petrif')));
            if (petrifySkill) return petrifySkill;
        }

        // If adjacent (dist === 1), prioritize snake_strike then bite
        if (dist === 1) {
            const snakeStrike = available.find(a => (a.id === 'snake_strike' || (a.name || '').toLowerCase().includes('snake')));
            if (snakeStrike) return snakeStrike;
            const bite = available.find(a => (a.id === 'bite' || (a.name || '').toLowerCase().includes('bite')));
            if (bite) return bite;
        }

        // Fallback: pick any ready attack or highest cooldown position
        if (available.length > 0) return available[0];
        return caller.attacks.reduce((best, a) => (a.cooldown_position > best.cooldown_position ? a : best), caller.attacks[0]);
    };

    this.acquireTarget = (caller, combatants) => {
        if (!combatants || !caller) return;
        const enemies = Object.values(combatants).filter(e => e && !e.dead && !e.isMonster && !e.isMinion && !e.isVCT && !e.invisible);
        if (enemies.length === 0) {
            caller.targetId = null;
            caller.pendingAttack = null;
            return;
        }

        // Target closest enemy
        const sorted = enemies.sort((a, b) => {
            const distA = Math.abs(a.coordinates.x - caller.coordinates.x) + Math.abs(a.coordinates.y - caller.coordinates.y);
            const distB = Math.abs(b.coordinates.x - caller.coordinates.x) + Math.abs(b.coordinates.y - caller.coordinates.y);
            return distA - distB;
        });

        const target = sorted[0];
        caller.targetId = target.id;
        caller.pendingAttack = this.chooseAttackType(caller, target);
    };

    this.handleOverlap = (caller, combatants) => {
        if (data.methods && data.methods.closeTheGap) {
            data.methods.closeTheGap(caller, combatants);
        }
    };

    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            caller.moveCooldown = 1000;
        }

        switch (caller.behaviorSequence) {
            case 'brawler': {
                if (!caller.targetId || !combatants[caller.targetId] || combatants[caller.targetId].dead || combatants[caller.targetId].invisible) {
                    this.acquireTarget(caller, combatants);
                }

                const target = caller.targetId ? combatants[caller.targetId] : null;
                if (!target || target.dead || target.isVCT) break;

                // Move toward target if out of range
                if (data.methods && data.methods.moveTowardsCloseEnemyTarget) {
                    data.methods.moveTowardsCloseEnemyTarget(caller, combatants);
                }

                // Update facing direction
                const dx = target.coordinates.x - caller.coordinates.x;
                const dy = target.coordinates.y - caller.coordinates.y;
                if (dx === 0) {
                    caller.facing = dy > 0 ? 'down' : 'up';
                } else {
                    caller.facing = dx > 0 ? 'right' : 'left';
                }

                // Repopulate pendingAttack if cleared
                if (!caller.pendingAttack) {
                    caller.pendingAttack = this.chooseAttackType(caller, target);
                }

                // Attack execution trigger
                const era = caller.eras ? caller.eras[caller.eraIndex] : null;
                if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking && caller.pendingAttack) {
                    const dist = Math.abs(dx) + Math.abs(dy);
                    const range = caller.pendingAttack.range || 'close';
                    const inRange = range === 'close' ? dist === 1 : range === 'medium' ? dist <= 3 : dist <= 6;
                    if (inRange) {
                        era.attacked = true;
                        this.initiateAttack(caller, combatants);
                    }
                }
                break;
            }
            default:
                break;
        }
    };

    this.initiateAttack = async (caller, combatants) => {
        if (caller.attacking) return;
        const target = combatants[caller.targetId];
        if (!target || target.dead || target.isVCT || target.invisible) return;

        caller.attacking = true;
        try {
            const attack = caller.pendingAttack || this.chooseAttackType(caller, target);
            const attackKey = String(attack?.id || attack?.name || '').toLowerCase();

            if (this.animationManager && typeof this.animationManager.triggerAbility === 'function') {
                this.animationManager.triggerAbility(
                    caller.coordinates,
                    target.coordinates,
                    attackKey,
                    false,
                    null,
                    caller.id
                );
            }

            if (attackKey.includes('petrif')) {
                // Apply petrify CC + damage immunity effect
                const { applyPetrifyEffect } = require('../../combat-effects');
                applyPetrifyEffect(target, 2, this.broadcastDataUpdate);
                if (typeof this.hitsCombatant === 'function') {
                    this.hitsCombatant(caller, target, { name: 'petrify', type: 'debuff', damage: 0 });
                }
            } else if (attackKey.includes('snake')) {
                // Snake strike: swift physical damage + poison chance
                if (typeof this.hitsCombatant === 'function') {
                    this.hitsCombatant(caller, target, {
                        type: 'poison',
                        effect: { type: 'poison', chance: 75, duration: 'medium' }
                    });
                }
            } else {
                // Basic bite / attack
                if (typeof this.hitsCombatant === 'function') {
                    this.hitsCombatant(caller, target);
                }
            }

            if (typeof this.kickoffAttackCooldown === 'function') {
                this.kickoffAttackCooldown(caller);
            }
            caller.pendingAttack = null;
        } finally {
            caller.attacking = false;
        }
    };
}
