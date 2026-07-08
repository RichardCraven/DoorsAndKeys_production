import { Djinn } from './profiles/Djinn'
import { Sphinx } from './profiles/Sphinx'
import { Skeleton } from './profiles/Skeleton'
import { Goblin } from './profiles/Goblin'
import { Mummy } from './profiles/Mummy'
import { BeholderMinion } from './profiles/BeholderMinion'
import { Troll } from './profiles/Troll'
import {Methods, getSurroundings} from '../shared-ai-methods/basic-methods';
import {MovementMethods} from '../shared-ai-methods/movement-methods';

export function MonsterAI(MAX_DEPTH, MAX_LANES, INTERVAL_TIME){
    this.MAX_DEPTH = MAX_DEPTH;
    this.MAX_LANES = MAX_LANES;
    this.INTERVAL_TIME = INTERVAL_TIME

    const data = {
        methods: {
            ...Methods,
            ...MovementMethods,
            getSurroundings,
        },
        MAX_DEPTH: this.MAX_DEPTH,
        MAX_LANES: this.MAX_LANES,
        INTERVAL_TIME: this.INTERVAL_TIME
    }
    this.connectUtilMethods = (utilMethods) => {
        // Store the full utilMethods object so all profile methods are available.
        // Individual convenience references kept for MonsterAI-level use.
        this.broadcastDataUpdate = utilMethods.broadcastDataUpdate;
        this.kickoffAttackCooldown = utilMethods.kickoffAttackCooldown;
        this.missesTarget = utilMethods.missesTarget;
        this.hitsTarget = utilMethods.hitsTarget;
        this.hitsCombatant = utilMethods.hitsCombatant;

        // Pass the full utilMethods through to all profiles so any method added
        // to combat-manager's utilMethods object is automatically available.
        this.utilMethods = utilMethods;
    }

    this.connectOverlayManager = (instance) => {
        this.overlayManager = instance;
    }
    this.connectAnimationManager = (instance) => {
        this.animationManager = instance;
    }

    this.initializeRoster = () => {
        this.roster = {
            djinn: new Djinn(data, this.utilMethods, this.animationManager, this.overlayManager),
            sphinx: new Sphinx(data, this.utilMethods, this.animationManager, this.overlayManager),
            skeleton: new Skeleton(data, this.utilMethods, this.animationManager, this.overlayManager),
            goblin: new Goblin(data, this.utilMethods, this.animationManager, this.overlayManager),
            mummy: new Mummy(data, this.utilMethods, this.animationManager, this.overlayManager),
            beholder_minion: new BeholderMinion(data, this.utilMethods, this.animationManager, this.overlayManager),
            troll: new Troll(data, this.utilMethods, this.animationManager, this.overlayManager),
        }
    }

    this.methods = {
        ...Methods,
        ...MovementMethods
    }

    //UTILS
    this.getLaneDifferenceToTarget = (caller, target) => {
        if(!target) return 0;
        let d =  target.position - caller.position
        return d
    }
    this.getDistanceToTarget = (caller, target) => {
        if(!target) return 0;
        let d = target.depth - caller.depth
        return d
        // 0 = same tile
        // 1 = 1 tile in front
        // -1 = 1 tile behind
    }
    this.pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
    this.chooseAttackType = (caller, target) => {
        if(caller.type === 'sphinx'){
            // console.log('SPHINX CHOOSE ATTACK TYPE');
        }
        let attack, available = caller.attacks.filter(e=>e.cooldown_position === 100);
        let percentCooledDown = 0,
            chosenAttack;
        const distanceToTarget = this.methods.getDistanceToTarget(caller, target);

        if(distanceToTarget === 1 && available.find(e=>e.range === 'close')){
            attack = available.find(e=>e.range === 'close');
            return attack;
        }
        if(available.length === 0){
            return null;
        } else {
            if(available.filter(e=>(e.range === 'far' || e.range === 'medium') && e.cooldown_position > 25).length > 0){
                let attacks = available.filter(e=>(e.range === 'far' || e.range === 'medium') && e.cooldown_position > 25);
                let sortedAttacks = attacks.sort((a,b)=> b.cooldown_position - a.cooldown_position)
                if(sortedAttacks[1] && sortedAttacks[1].cooldown_position === sortedAttacks[0].cooldown_position){
                    attack = data.methods.pickRandom(sortedAttacks.filter(e=> e.cooldown_position === sortedAttacks[0].cooldown_position) )
                } else {
                    attack = sortedAttacks[0]
                }
                return attack
            } else {
                attack = data.methods.pickRandom(available);
            }
        }
        return attack
    }
    this.isAnEnemyDirectlyInFrontOfMe = function(caller, combatants){
        if(!combatants) return false
        const liveEnemies = Object.values(combatants).filter(e=>e.isMonster || (e.isMinion && !e.dead)),
        directlyInFront = liveEnemies.some(e=>e.depth === caller.depth + 1 && e.position === caller.position);
        return directlyInFront ? liveEnemies.find(e=>e.depth === caller.depth + 1 && e.position === caller.position) : null;
    }
    this.moveTowardsCloseFriendlyTarget = (caller, combatants) => {
        let newPosition, newDepth;
        let liveCombatants = Object.values(combatants).filter(e=>!e.dead)
        const friendlyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        const distanceToTarget = this.methods.getDistanceToTarget(caller, friendlyTarget),
        laneDiff = this.methods.getLaneDifferenceToTarget(caller, friendlyTarget)
        if(laneDiff === 1 || laneDiff === -1){
            if(distanceToTarget === 0){

            }
        } else if(laneDiff < -1){
            newPosition = caller.position - 1
        } else if(laneDiff > 1){
            newPosition = caller.position + 1
        } else if(laneDiff === 0 && distanceToTarget === 1){
            newPosition = caller.position - 1
        }
        if((distanceToTarget < 0 && laneDiff) !== 0 ||  
        (distanceToTarget < -1 && laneDiff === 0 && caller.depth > 1)){
            caller.depth--
        } else if(distanceToTarget > 1){
            caller.depth++
        }

        if(liveCombatants.some(e=>e.position === newPosition && e.depth === newDepth)){
            let targetPosition = {x: newDepth, y: newPosition};
            let upSpaceOccupied = liveCombatants.some(e=>e.depth === targetPosition.x && e.position === targetPosition.y - 1);
            let downSpaceOccupied = liveCombatants.some(e=>e.depth === targetPosition.x && e.position === targetPosition.y + 1);
            if(!upSpaceOccupied){
                newPosition = targetPosition.y-1;
            } else if(!downSpaceOccupied){
                newPosition = targetPosition.y+1;
            } else {
                newPosition = caller.position;
                newDepth = caller.depth;
            }
        }
        
        if(newPosition < 0) newPosition = 0
        if(newPosition > this.MAX_LANES) newPosition = this.MAX_LANES;
        if(newDepth < 0) newDepth = 0
        if(newDepth > this.MAX_DEPTH) newDepth = this.MAX_DEPTH;

        //set new values
        if(newDepth !== undefined) caller.depth = newDepth;
        if(newPosition !== undefined) caller.position = newPosition;
    }

    this.moveTowardsCloseEnemyTarget = (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        if(!enemyTarget) return;

        // If already adjacent and using a close attack, don't reposition.
        const pendingRange = caller.pendingAttack && caller.pendingAttack.range;
        if(pendingRange === 'close' || !pendingRange){
            const callerTiles = (Array.isArray(caller.occupiedCoords) && caller.occupiedCoords.length > 0)
                ? caller.occupiedCoords
                : [caller.coordinates];
            const targetTiles = (Array.isArray(enemyTarget.occupiedCoords) && enemyTarget.occupiedCoords.length > 0)
                ? enemyTarget.occupiedCoords
                : [enemyTarget.coordinates];
            const alreadyAdjacent = callerTiles.some(cc =>
                targetTiles.some(tc => {
                    const dx = Math.abs(cc.x - tc.x);
                    const dy = Math.abs(cc.y - tc.y);
                    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
                })
            );
            if(alreadyAdjacent) return;
        }

        const distanceToTarget = this.methods.getDistanceToTarget(caller, enemyTarget),
        laneDiff = this.methods.getLaneDifferenceToTarget(caller, enemyTarget)

        // handle position

        if(laneDiff === 1 || laneDiff === -1){
            if(distanceToTarget === 0){
                if(caller.depth !== 0) caller.depth--
            } else if(distanceToTarget === 1){
                if(laneDiff === 1){
                    caller.position++
                } else if(laneDiff === -1){
                    caller.position--
                }
            }
        } else if(laneDiff < -1){
            caller.position--
        } else if(laneDiff > 1){
            caller.position++
        } else if(laneDiff === 0 && distanceToTarget === 1){
            console.log('********enemy right in front, dont move!')
            return
        }

        // now handle depth

        if((distanceToTarget < 0 && laneDiff !== 0) ||  
        (distanceToTarget < -1 && laneDiff === 0 && caller.depth > 1)){
            caller.depth--
        }else if(distanceToTarget === -1 && laneDiff === 0){
            if(caller.depth > 1) caller.depth -= 2
        } else if(distanceToTarget > 1){
            caller.depth++
        }

        // Large monsters occupy 2 vertical tiles. If the tile above the proposed
        // destination is occupied (or off the top of the board), abort the move.
        const callerIsLargeMAI = (caller.isMonster === true && caller.isMinion !== true)
            || caller.large === true;
        if (callerIsLargeMAI) {
            const aboveY = caller.position - 1;
            const aboveOccupiedMAI = aboveY < 0 || Object.values(combatants).filter(c => c.id !== caller.id).some(e => {
                try {
                    if (!e) return false;
                    if (e.coordinates && e.coordinates.x === caller.depth && e.coordinates.y === aboveY) return true;
                    if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => c.x === caller.depth && c.y === aboveY);
                    return false;
                } catch (err) { return false; }
            });
            if (aboveOccupiedMAI) {
                // Can't fit — revert to original coordinates
                if (typeof caller.coordinates === 'object') {
                    caller.depth = caller.coordinates.x;
                    caller.position = caller.coordinates.y;
                }
                return;
            }
        }
    }

    this.defaultAquireTarget = (caller, combatants) => {
        // const target = combatants[caller.targetId],
        // distanceToTarget = this.methods.getDistanceToTarget(caller, target),
        // laneDiff = this.methods.getLaneDifferenceToTarget(caller, target);
        // let newPosition, newDepth;
    }
}