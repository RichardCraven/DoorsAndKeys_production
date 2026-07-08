// ⚠️  AGENTS: Before writing any attack logic, read the "Required Patterns for All AI Profiles"
//    section at the top of CHANGELOG.md — pendingAttack guard, attacking flag, resolve(null)
//    fallbacks, and attack-in-processMove are all mandatory.

export function Sage(data, utilMethods, animationManager, overlayManager){ // eslint-disable-line no-unused-vars
    this.MAX_DEPTH = data.MAX_DEPTH;
    this.MAX_LANES = data.MAX_LANES;
    this.INTERVAL_TIME = data.INTERVAL_TIME

    this.hitsTarget = (utilMethods && typeof utilMethods.hitsTarget === 'function') ? utilMethods.hitsTarget : null;
    this.missesTarget = (utilMethods && typeof utilMethods.missesTarget === 'function') ? utilMethods.missesTarget : null;
    this.hitsCombatant = (utilMethods && typeof utilMethods.hitsCombatant === 'function') ? utilMethods.hitsCombatant : null;
    this.kickoffAttackCooldown = (utilMethods && typeof utilMethods.kickoffAttackCooldown === 'function') ? utilMethods.kickoffAttackCooldown : null;
    
    this.acquireTarget = (caller, combatants, targetToAvoid = null) => {
            if(data.methods.isAnEnemyDirectlyInFrontOfMe(caller, combatants)){
                caller.targetId = data.methods.isAnEnemyDirectlyInFrontOfMe().id;
                caller.pendingAttack = caller.attacks.find(e=>e.name === 'meditate')
            } else {
                const protectee = data.methods.pickRandom(Object.values(combatants).filter(e=>!e.isMonster && !e.isMinion && !e.dead && e.id !== caller.id))
                if(!protectee) return
                caller.targetId = protectee.id;
                caller.pendingAttack = caller.attacks.find(e=>e.name === 'meditate');
            }
        }
    this.processMove = (caller, combatants) => {
        if (typeof caller.moveCooldown === 'undefined') {
            debugger;
            throw new Error('moveCooldown must be defined for all units');
        }
        if(!caller.pendingAttack){
            console.log('no pending attack ', caller);
            // debugger
            return
        }
        if(caller.pendingAttack.name === 'meditate'){
            data.methods.moveTowardsCloseFriendlyTarget(caller, combatants)
        } else if(caller.pendingAttack.name === 'cane_strike'){
            console.log('MAFUCKIN CAAAANNNEEE STRIKE!');
            debugger
        }
        }
    this.initiateAttack = (caller, manualAttack, combatants) => { // eslint-disable-line no-unused-vars
            const target = combatants[caller.targetId];
            if(!target){
                console.log('no target!!!');
                return
            }
            const distanceToTarget = data.methods.getDistanceToTarget(caller, target),
            laneDiff = data.methods.getLaneDifferenceToTarget(caller, target);
            if(target.isMonster || target.isMinion){
                if (typeof this.hitsCombatant === 'function') this.hitsCombatant(caller, target);
                else if (typeof this.hitsTarget === 'function') this.hitsTarget(caller);
            } else {
                if(distanceToTarget === 1 && laneDiff === 0){ 
                    caller.healing = true
                    target.hp += 10;
                    if(target.hp > target.starting_hp) target.hp = target.starting_hp;
                    setTimeout(()=>{
                        caller.healing = false
                        caller.active = false;
                        caller.tempo = 1;
                        caller.turnCycle();
                    }, this.INTERVAL_TIME * 50)
                } else if(distanceToTarget === 0 && (laneDiff === 1 || laneDiff === -1)){
                    console.log('LORYASTES: adjacent heal');
                    caller.position = target.position;
                    caller.depth = target.depth - 1
                    setTimeout(()=>{
                        caller.healing = true
                        target.hp += 10;
                        if(target.hp > target.starting_hp) target.hp = target.starting_hp;
                    }, 300)
                    setTimeout(()=>{
                        caller.healing = false
                        caller.active = false;
                        caller.tempo = 1;
                        caller.turnCycle();
                    }, this.INTERVAL_TIME * 50)
                } else if(distanceToTarget === 1 && (laneDiff === 1 || laneDiff === -1)){
                    if (typeof this.missesTarget === 'function') this.missesTarget(caller);
                } else {
                    if (typeof this.missesTarget === 'function') this.missesTarget(caller);
                }
            }
    }
}