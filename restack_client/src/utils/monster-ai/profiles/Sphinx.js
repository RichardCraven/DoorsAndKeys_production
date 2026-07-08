// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

export function Sphinx(data, utilMethods, animationManager, overlayManager){
    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME
    
    this.animationManager = animationManager;
    this.overlayManager = overlayManager;
    
    this.monsterFacingUp = utilMethods.monsterFacingUp;
    this.monsterFacingDown = utilMethods.monsterFacingDown;
    this.monsterFacingRight = utilMethods.monsterFacingRight;
    this.broadcastDataUpdate = utilMethods.broadcastDataUpdate;
    this.kickoffAttackCooldown = utilMethods.kickoffAttackCooldown;
    this.missesTarget = utilMethods.missesTarget;
    this.hitsTarget = utilMethods.hitsTarget;
    this.hitsCombatant = utilMethods.hitsCombatant;
    this.chooseAttackType = utilMethods.chooseAttackType

    this.initialize = (caller) => {
        console.log('SPHINX initializing')
        caller.behaviorSequence = 'center-spellcaster'
    }
    this.acquireTarget = (caller, combatants) => {
        // if(caller.targetId){
        //     console.log('already has target, just choose new attack');
        //     const target = combatants[caller.targetId]
        //     caller.pendingAttack = this.chooseAttackType(caller, target);
        //     return
        // }
        const liveEnemies = Object.values(combatants).filter(e=>!e.dead && (!e.isMonster && !e.isMinion) && !e.isVCT);
        const sorted = liveEnemies.sort((a,b)=>a.depth - b.depth);
        const target = sorted[0];
        if(!target) return;
        // Final guard: never allow targeting a VCT
        if (target.isVCT) {
            caller.targetId = null;
            caller.pendingAttack = null;
            return;
        }
        caller.pendingAttack = this.chooseAttackType(caller, target);
        caller.targetId = target.id;
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
        // After moving, update facing to face target if one exists
        if (caller.targetId && combatants[caller.targetId]) {
            const target = combatants[caller.targetId];
            caller.facing = (caller.coordinates.x <= target.coordinates.x) ? 'right' : 'left';
        }
        switch(caller.behaviorSequence){
                case 'center-spellcaster':
                    
                    switch(caller.eraIndex){
                        case 0:
                            data.methods.centerBack(caller, combatants)
                        break;
                        case 1:
                            if(window.pickRandom([true,true, false])){
                                data.methods.centerBack(caller, combatants)
                                
                            } else {
                                if(window.pickRandom([true,false])){
                                    data.methods.goUp(caller, combatants)
                                } else {
                                    data.methods.goDown(caller, combatants)
                                }
                            }
                        break;
                        case 2:
                            data.methods.centerBack(caller, combatants)
                        break;
                        case 3:
                            if(window.pickRandom([true,true, false])){
                                data.methods.centerBack(caller, combatants)
                                
                            } else {
                                if(window.pickRandom([true,false])){
                                    data.methods.goUp(caller, combatants)
                                } else {
                                    data.methods.goDown(caller, combatants)
                                }
                            }
                        break;
                        case 4:
                            data.methods.centerBack(caller, combatants)
                        break;
                        default: 
                        break;
                    }
                break;
                case 'panicked':
                    switch(caller.eraIndex){
                        case 0:

                        break;
                        case 1:

                        break;
                        case 2:

                        break;
                        case 3:

                        break;
                        case 4:

                        break;
                        default: 
                        break;
                    }
                break;
                case 'melee':
                    switch(caller.eraIndex){
                        case 0:

                        break;
                        case 1:

                        break;
                        case 2:

                        break;
                        case 3:

                        break;
                        case 4:

                        break;
                        default: 
                        break;
                    }
                break;
            default:
            break;
            }


            // if(!caller.pendingAttack){
            //     return
            // }
            // let choice;
            // switch(caller.pendingAttack.name){
            //     case 'induce madness':
            //         console.log('picking random', window.pickRandom);
            //         choice = window.pickRandom([true, false])
            //         console.log('choice', choice);
            //         // if(choice){
            //         //     data.methods.stayInColumn(5, caller, combatants)
            //         // } else {
            //             data.methods.centerBack(caller)
            //         // }
            //         // data.methods.evade(caller, combatants)
            //     break;
            //     case 'claws':
            //     break;
            //     case 'lightning':
            //         choice = window.pickRandom([true, false])
            //         console.log('choice', choice);
            //         // if(choice){
            //             data.methods.stayInColumn(6, caller, combatants)
            //         // } else {
            //         //     data.methods.evade(caller, combatants)
            //         // }
            //     break;
            //     default:
            //         break;

            // }
            // if(caller.pendingAttack.name === 'meditate'){
            //     data.methods.moveTowardsCloseFriendlyTarget(caller, combatants)
            // }
        }
        // return new Promise((resolve) => {
        //     setTimeout(()=>{
        //         resolve(numSeconds, ' complete')
        //     }, numSeconds * 1000)
        // })
    this.triggerInduceMadness = (callerCoords, targetCoords) => {
        const targetTileId = this.animationManager.getTileIdByCoords(targetCoords)
        const sourceTileId = this.animationManager.getTileIdByCoords(callerCoords);
        return new Promise((resolve) => {
            if(targetTileId !== null && sourceTileId !== null){
                this.animationManager.zapBurstAnimation(targetTileId, sourceTileId, 'white', resolve)
            }
        })
    }
    this.triggerLightningAttack = (callerCoords) => {
        const sourceTileId = this.animationManager.getTileIdByCoords(callerCoords);
        return new Promise((resolve) => {
            if(sourceTileId !== null){
                this.animationManager.straightBeamNoTarget(sourceTileId, 'right-to-left', 'red', resolve)
            }
        })
    }
    this.triggerClawAttack = (callerCoords, targetCoords) => {
        const targetTileId = this.animationManager.getTileIdByCoords(targetCoords);
        const sourceTileId = this.animationManager.getTileIdByCoords(callerCoords);
        const facing = callerCoords.x < targetCoords.x ? 'right' :
                       callerCoords.x > targetCoords.x ? 'left' :
                       callerCoords.y < targetCoords.y ? 'down' : 'up';
        return new Promise((resolve) => {
            if (sourceTileId !== null) {
                this.animationManager.clawSwipe(targetTileId, sourceTileId, facing, resolve);
            }
        });
    }
    this.initiateAttack = async (caller, combatants) => {
        // caller.attacking = true;
        const target = combatants[caller.targetId];
        if (!target || target.dead || target.isVCT) return;
        const distanceToTarget = data.methods.getDistanceToTarget(caller, target), // eslint-disable-line no-unused-vars
        laneDiff = data.methods.getLaneDifferenceToTarget(caller, target);

        const animation = {
            type: 'glowing-eyes',
            id: caller.id,
            data:{
                color: 'white'
            }
        }
        this.overlayManager.addAnimation(animation)

        let combatantHit;
        switch(caller.pendingAttack.name){
            case 'induce madness':
                if(laneDiff === 0){
                    await this.triggerInduceMadness(caller.coordinates, target.coordinates)
                    console.log('induce madness hits');
                    this.hitsTarget(caller)
                } else {
                    this.missesTarget(caller);
                }
            break;
            case 'claws':
                combatantHit = await this.triggerClawAttack(caller.coordinates, target.coordinates)
                if(combatantHit){
                    const supplementalData = {increasedCritChance: true}
                    this.hitsCombatant(caller, combatantHit, supplementalData);
                } else {
                    this.missesTarget(caller);
                }
            break;
            case 'lightning':
                combatantHit = await this.triggerLightningAttack(caller.coordinates, target.coordinates)
                if(combatantHit){
                    this.hitsCombatant(caller, combatantHit);
                } else {
                    this.missesTarget(caller);
                }
            break;
            default:
                break;
        }
        this.kickoffAttackCooldown(caller)
        caller.pendingAttack = null;
    }
}