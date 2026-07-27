export function GoblinChef(data, utilMethods, animationManager, overlayManager){
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

    this.initialize = (caller) => {
        caller.behaviorSequence = 'support';
    }

    this.acquireTarget = (caller, combatants) => {
        const liveEnemies = Object.values(combatants).filter(e => e && !e.dead && !e.isMonster && !e.isMinion && !e.isVCT);
        if (liveEnemies.length > 0) {
            caller.targetId = liveEnemies[0].id;
            caller.pendingAttack = this.chooseAttackType ? this.chooseAttackType(caller, liveEnemies[0]) : null;
        }
    }

    this.processMove = (caller, combatants) => {
        if (!caller || caller.dead) return;
        if (typeof caller.moveCooldown === 'undefined') {
            caller.moveCooldown = 1000;
        }
        caller.onMoveCooldown = true;
        setTimeout(() => {
            caller.onMoveCooldown = false;
        }, caller.moveCooldown);

        const otherFriendlies = Object.values(combatants).filter(c => c && !c.dead && (c.isMonster || c.isMinion) && c.id !== caller.id);
        const otherFriendliesAlive = otherFriendlies.length > 0;

        const liveEnemies = Object.values(combatants).filter(e => e && !e.dead && !e.isMonster && !e.isMinion && !e.isVCT);
        const adjacentEnemy = liveEnemies.find(e => {
            const dx = Math.abs((e.coordinates?.x || 0) - caller.coordinates.x);
            const dy = Math.abs((e.coordinates?.y || 0) - caller.coordinates.y);
            return (dx + dy) <= 1;
        });

        // Hang back at backline column (MAX_DEPTH) unless no other friendlies alive or adjacent enemy
        if (!adjacentEnemy && otherFriendliesAlive) {
            const backlineX = this.MAX_DEPTH || 7;
            if (caller.coordinates.x !== backlineX && data.methods.moveCloserToCoord) {
                data.methods.moveCloserToCoord(caller, backlineX, caller.coordinates.y, combatants);
            }
        } else {
            if (data.methods.closeTheGap) {
                data.methods.closeTheGap(caller, combatants);
            }
        }
    }

    this.initiateAttack = async (caller, combatants) => {
        const target = Object.values(combatants).find(e => e.id === caller.targetId);
        if (!target || target.dead) return;
        try {
            this.hitsCombatant(caller, target);
        } catch (e) {
            console.warn('[GoblinChef] Attack failed:', e);
        }
    }

    this.handleOverlap = (caller, combatants) => {
        if (data.methods.closeTheGap) {
            data.methods.closeTheGap(caller, combatants);
        }
    }
}
