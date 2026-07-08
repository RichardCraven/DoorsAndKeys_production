// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

export function Skeleton(data, utilMethods, animationManager, overlayManager){
    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME
    
    this.animationManager = animationManager;
    this.overlayManager = overlayManager;
    
    // this.monsterFacingUp = utilMethods.monsterFacingUp;
    // this.monsterFacingDown = utilMethods.monsterFacingDown;
    // this.monsterFacingRight = utilMethods.monsterFacingRight;
    this.broadcastDataUpdate = utilMethods.broadcastDataUpdate;
    this.kickoffAttackCooldown = utilMethods.kickoffAttackCooldown;
    this.missesTarget = utilMethods.missesTarget;
    this.hitsTarget = utilMethods.hitsTarget;
    this.hitsCombatant = utilMethods.hitsCombatant;
    this.chooseAttackType = utilMethods.chooseAttackType

    this.initialize = (caller) => {
        caller.behaviorSequence = 'brawler'
    }
    this.acquireTarget = (caller, combatants) => {
    const { AcquireTargetMethods } = require('../../shared-ai-methods/acquire-target-methods');
    const target = AcquireTargetMethods.acquireClosestSoftTarget(caller, combatants);
        if (!target) return;
        caller.pendingAttack = this.chooseAttackType(caller, target);
        caller.targetId = target.id;
    }
    this.handleOverlap = (caller,combatants) => {
        data.methods.closeTheGap(caller, combatants)
        if(caller.targetId){
            // data.methods.
            data.methods.evade(caller, combatants)
        }
    }
    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            debugger;
            throw new Error('moveCooldown must be defined for all units');
        }
        caller.onMoveCooldown = true;
        setTimeout(() => {
            caller.onMoveCooldown = false;
        }, caller.moveCooldown);
        switch(caller.behaviorSequence){
            case 'brawler': {
                // Close in on target every era
                data.methods.closeTheGap(caller, combatants);

                // Attack trigger
                const era = caller.eras ? caller.eras[caller.eraIndex] : null;
                // Repopulate pendingAttack if cleared by restartTurnCycle
                if (!caller.pendingAttack) {
                    const repopTarget = combatants[caller.targetId];
                    if (repopTarget && !repopTarget.dead && !repopTarget.isVCT) {
                        caller.pendingAttack = this.chooseAttackType(caller, repopTarget);
                    }
                }
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
                            this.initiateAttack(caller, combatants);
                        }
                    }
                }
                break;
            }
            case 'panicked':
            case 'melee':
            default:
                break;
        }
        // facing is handled by recalculateFacing in combat-manager.processMove
    }

    this.triggerClawAttack = async (caller, target) => {
        // Use the animation manager's canvas-based clawSwipe
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
        if (caller.attacking) return;
        const target = combatants[caller.targetId];
        caller.attacking = true;
        try {
        if (!target || target.dead) {
            return;
        }
        let combatantHit;
        switch (caller.pendingAttack.name) {
            case 'claws':
                combatantHit = await this.triggerClawAttack(caller, target);
                if (combatantHit) {
                    const supplementalData = { increasedCritChance: false };
                    this.hitsCombatant(caller, combatantHit, supplementalData);
                } else {
                    this.missesTarget(caller);
                }
                break;
            default:
                // Fallback: for attacks not explicitly animated here (eg. bite, crush, tackle),
                // trigger a generic attack animation so humans can see the icon and timing.
                try {
                    if (target) {
                        // Determine the best source tile for the animation (for large monsters)
                        const allSourceCoords = (Array.isArray(caller.occupiedCoords) && caller.occupiedCoords.length > 0)
                            ? caller.occupiedCoords
                            : [caller.coordinates];

                        // Pick the tile closest to the target
                        let bestSource = caller.coordinates;
                        let minDist = Infinity;
                        allSourceCoords.forEach(c => {
                            const d = Math.abs(c.x - target.coordinates.x) + Math.abs(c.y - target.coordinates.y);
                            if (d < minDist) {
                                minDist = d;
                                bestSource = c;
                            }
                        });

                        // Trigger the visual icon flash/animation
                        if (this.animationManager && typeof this.animationManager.triggerAttackAnimation === 'function') {
                            await this.animationManager.triggerAttackAnimation({
                                coordinates: bestSource,
                                facing: caller.facing,
                                icon: caller.pendingAttack?.icon,
                                type: caller.pendingAttack?.name || 'grasp', // fallback animation type
                                selectedAction: caller.pendingAttack
                            });
                        }

                        // Use hitsCombatant to ensure wounded/damageIndicators are set
                        this.hitsCombatant(caller, target);
                    }
                } catch (e) {
                    console.warn('Fallback attack failed in Skeleton.initiateAttack', e);
                }
                break;
        }
        this.kickoffAttackCooldown(caller);
        caller.pendingAttack = null;
        } finally {
            caller.attacking = false;
        }
    }
}