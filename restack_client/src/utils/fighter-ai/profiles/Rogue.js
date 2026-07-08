// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

export function Rogue(data, utilMethods, animationManager){
    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME

    this.animationManager = animationManager;
    this.hitsTarget = (utilMethods && typeof utilMethods.hitsTarget === 'function') ? utilMethods.hitsTarget : null;
    this.missesTarget = (utilMethods && typeof utilMethods.missesTarget === 'function') ? utilMethods.missesTarget : null;
    this.hitsCombatant = (utilMethods && typeof utilMethods.hitsCombatant === 'function') ? utilMethods.hitsCombatant : null;
    this.kickoffAttackCooldown = (utilMethods && typeof utilMethods.kickoffAttackCooldown === 'function') ? utilMethods.kickoffAttackCooldown : null;

    this.initialize = (caller) => {
        caller.behaviorSequence = 'brawler';
    };

    this.isFriendly = (e) => {
        return !e.isMonster && !e.isMinion;
    }

    this.friendlies = (combatants) => {
        return Object.values(combatants).filter(e=>this.isFriendly(e));
    }

    this.isEnemy = (e) => {
        return (e.isMonster || e.isMinion);
    }

    this.enemies = (combatants) => {
        return Object.values(combatants).filter(e=>this.isEnemy(e));
    }
    this.acquireTarget = (caller, combatants) => {
        const liveEnemies = Object.values(combatants).filter(e => !e.dead && (e.isMonster || e.isMinion) && !e.isVCT);
        const sorted = liveEnemies.sort((a,b)=>b.depth - a.depth);
        let target = sorted.length ? sorted[0] : null;
        if(!target) return
        // if(Object.values(combatants).filter(e=>e.isMonster||e.isMinion).some(e=>e.targetId === target.targetId) && sorted.length > 1){
        if(this.friendlies(combatants).some(e=>e.targetId === target.targetId) && sorted.length > 1){

            target = sorted[1]
        }
        caller.pendingAttack = this.chooseAttackType(caller, target);
        caller.targetId = target.id;
        console.log('rogue acquired target: ', target);
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
                // caller.aiming = true;
            } else {
                attack = data.methods.pickRandom(available);
            }
        }
        return attack
    }
    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            debugger;
            throw new Error('moveCooldown must be defined for all units');
        }
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        const distanceToTarget = data.methods.getDistanceToTarget(caller, enemyTarget), // eslint-disable-line no-unused-vars
        laneDiff = data.methods.getLaneDifferenceToTarget(caller, enemyTarget) // eslint-disable-line no-unused-vars

        // console.log('Rogue process move, pending attack: ', caller.pendingAttack);
        if(!caller.pendingAttack){
            return
        }
        caller.energy+=5

        // data.methods.moveTowardsCloseEnemyTarget(caller, combatants)

        if(
            // laneDiff === -1 && this.friendlies(combatants).some(e=>e.position === caller.position-1) ||
            // laneDiff === 1 && this.friendlies(combatants).some(e=>e.position === caller.position+1)
            data.methods.isFriendlyAtCoordinates({x: caller.coordinates.x, y: caller.coordinates.y}, data.methods.getFriendlies(caller, combatants))
        ){
            caller.position = 2
        } else {
            data.methods.stayOnX1(caller,combatants)
        }


        caller.coordinates.y = caller.position
        caller.coordinates.x = caller.depth

        // Attack trigger
        {
            const era = caller.eras ? caller.eras[caller.eraIndex] : null;
            if (era && !era.attacked && !caller.onGeneralAttackCooldown && !caller.attacking && caller.pendingAttack) {
                const atkTarget = combatants[caller.targetId];
                if (atkTarget && !atkTarget.dead && !atkTarget.isVCT) {
                    const dx = Math.abs(caller.coordinates.x - atkTarget.coordinates.x);
                    const dy = Math.abs(caller.coordinates.y - atkTarget.coordinates.y);
                    const dist = dx + dy;
                    const atkRange = caller.pendingAttack.range || 'far';
                    const inRange = atkRange === 'close' ? dist === 1 : atkRange === 'medium' ? dist <= 3 : dist <= 6;
                    if (inRange) {
                        era.attacked = true;
                        caller.attack();
                    }
                }
            }
        }
    }
    this.triggerNarrowBeamAttack = (callerCoords, targetCoords) => {
        const targetTileId = this.animationManager.getTileIdByCoords(targetCoords)
        const sourceTileId = this.animationManager.getTileIdByCoords(callerCoords)
        return new Promise((resolve) => {
            if(targetTileId !== null && sourceTileId !== null){
                this.animationManager.narrowBeamAnimation(targetTileId, sourceTileId, 'white', resolve)
            }
        })
    }
    this.initiateAttack = async (caller, manualAttack, combatants) => { // eslint-disable-line no-unused-vars
        if (!caller) return;
        caller.attacking = true;
        const target = combatants[caller.targetId];
        if (!target) { caller.attacking = false; return; }
        if (!caller.pendingAttack) { caller.attacking = false; return; }
        const laneDiff = data.methods.getLaneDifferenceToTarget(caller, target);

        switch (caller.pendingAttack.name) {
            case 'fire arrow':
                if (laneDiff === 0) {
                    await this.triggerNarrowBeamAttack(caller.coordinates, target.coordinates);
                    if (typeof this.hitsCombatant === 'function') this.hitsCombatant(caller, target);
                } else {
                    if (typeof this.missesTarget === 'function') this.missesTarget(caller);
                }
                break;
            default:
                if (typeof this.hitsCombatant === 'function') this.hitsCombatant(caller, target);
                else if (typeof this.hitsTarget === 'function') this.hitsTarget(caller);
                break;
        }
        if (typeof this.kickoffAttackCooldown === 'function') this.kickoffAttackCooldown(caller);
        caller.attacking = false;
    }
}