// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

export function Djinn(data, utilMethods, animationManager, overlayManager){
    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME
    
    this.animationManager = animationManager;

    this.monsterFacingUp = utilMethods.monsterFacingUp;
    this.monsterFacingDown = utilMethods.monsterFacingDown;
    this.monsterFacingRight = utilMethods.monsterFacingRight;
    this.broadcastDataUpdate = utilMethods.broadcastDataUpdate;
    this.kickoffAttackCooldown = utilMethods.kickoffAttackCooldown;
    this.missesTarget = utilMethods.missesTarget;
    this.hitsTarget = utilMethods.hitsTarget;
 
    this.initialize = (caller) => {
        caller.behaviorSequence = 'brawler';
    }

    this.acquireTarget = (caller, combatants) => {
        if(caller.targetId){
            const target = combatants[caller.targetId];
            if (target && target.isVCT) {
                caller.targetId = null;
                caller.pendingAttack = null;
                return;
            }
            console.log('already has target, just choose new attack');
            caller.pendingAttack = this.chooseAttackType(caller, target);
            return;
        }
        const liveEnemies = Object.values(combatants).filter(e=>!e.dead && (!e.isMonster && !e.isMinion) && !e.isVCT);
        const sorted = liveEnemies.sort((a,b)=>b.depth - a.depth);
        let target = sorted.length ? sorted[0] : null;
        if(!target) return;
        if (target.isVCT) {
            caller.targetId = null;
            caller.pendingAttack = null;
            return;
        }
        if(Object.values(combatants).filter(e=>e.isMonster||e.isMinion).some(e=>e.targetId === target.targetId) && sorted.length > 1){
            target = sorted[1]
        }
        caller.pendingAttack = this.chooseAttackType(caller, target);
        caller.targetId = target.id;
    }
    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            debugger;
            throw new Error('moveCooldown must be defined for all units');
        }

        switch (caller.behaviorSequence) {
            case 'brawler': {
                if(!caller.pendingAttack) break;
                // console.log('Djinn energy');
                caller.energy += 5;
                data.methods.moveTowardsCloseEnemyTarget(caller, combatants);
                // After moving, update facing to face target if one exists
                if (caller.targetId && combatants[caller.targetId]) {
                    const t = combatants[caller.targetId];
                    caller.facing = (caller.coordinates.x <= t.coordinates.x) ? 'right' : 'left';
                }

                // Attack trigger
                const era = caller.eras ? caller.eras[caller.eraIndex] : null;
                if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking) {
                    const target = combatants[caller.targetId];
                    if (target && !target.dead && !target.isVCT) {
                        era.attacked = true;
                        this.initiateAttack(caller, combatants);
                    }
                }
                break;
            }
            default:
                break;
        }
    }
    this.triggerVoidLance = (coords) => {
        console.log('TRIGGER VOID LANCE');
        const tileId = this.animationManager.getTileIdByCoords(coords)
        // console.log('tileId: ', tileId);
        if(tileId !== null){
            this.animationManager.rippleAnimation(tileId, 'red')
        }
    }
    this.goBehindAndAttack = (caller, target) => {
        console.log('go behind attack');
        caller.depth = target.depth-1;
        caller.position = target.position;
        caller.coordinates = {x : caller.depth, y: caller.position};
        this.initiateReverseAttack(caller, target)
    }
    this.initiateReverseAttack = (caller, target) => {
        // console.log('reverse attack');
        caller.attacking = caller.attackingReverse = true;
        this.hitsTarget(caller);
        // console.log('caller: ', caller);
        // // debugger
    }
    this.initiateAttack = (caller, combatants) => {
        if (caller.attacking) return;
        caller.attacking = true;
        try {
            const target = combatants[caller.targetId];
            if (!target || target.dead || target.isVCT) return;
            const distanceToTarget = data.methods.getDistanceToTarget(caller, target),
            laneDiff = data.methods.getLaneDifferenceToTarget(caller, target);
            if(caller.energy > 50){
                caller.energy -= 80;
                this.triggerVoidLance(target.coordinates);
                this.hitsTarget(caller)
            } else if(distanceToTarget > 0){
                this.goBehindAndAttack(caller, target)
            } else if(distanceToTarget === 1 && laneDiff === 0){
                this.hitsTarget(caller)
            } else {
                caller.energy += 20
                this.missesTarget(caller);
            }
        } finally {
            caller.attacking = false;
        }
    }
    this.chooseAttackType = (caller, target) => {
        let attack, available = caller.attacks.filter(e=>e.cooldown_position === 100);
        let percentCooledDown = 0,
            chosenAttack;

        const distanceToTarget = data.methods.getDistanceToTarget(caller, target);

        if(distanceToTarget === 1 && available.find(e=>e.range === 'close')){
            attack = available.find(e=>e.range === 'close');
            return attack;
        }

        if(available.length === 0){
            return null;
        } else {
            let nearestRangeAttacks = available.filter(e=>(e.range === 'far' || e.range === 'medium') && e.cooldown_position > 25)
            if(nearestRangeAttacks.length > 0){
                let percentCooledDown = 0;
                // choose the attack that is closest to 100 percent
                nearestRangeAttacks.forEach((e)=>{
                    if(e.cooldown_position > percentCooledDown){
                        percentCooledDown = e.cooldown_position;
                        chosenAttack = e;
                    }
                })
                attack = chosenAttack;
            } else {
                attack = data.methods.pickRandom(available);
            }
        }
        return attack
    }
}