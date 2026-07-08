// This file has been removed as part of the refactoring process.

import {Methods} from './basic-methods';
import { activeShieldWalls } from '../../shared-ai-methods/movement-methods';

const MAX_DEPTH = 7
const MAX_LANES = 5

/**
 * Returns true if a move from `fromCoords` to `toCoords` would cross an
 * active shield wall. Used to block monster movement through the wall.
 */
const crossesShieldWall = (fromCoords, toCoords) => {
    if (!activeShieldWalls || !activeShieldWalls.length) return false;
    for (const wall of activeShieldWalls) {
        const { x: wallX, lanesAffected, isFacingRight } = wall;
        if (!lanesAffected || !lanesAffected.includes(toCoords.y)) continue;
        if (isFacingRight) {
            const fromSide = fromCoords.x < wallX ? 'left' : 'right';
            const toSide   = toCoords.x   < wallX ? 'left' : 'right';
            if (fromSide !== toSide) return true;
        } else {
            const boundaryX = wallX + 1;
            const fromSide = fromCoords.x < boundaryX ? 'left' : 'right';
            const toSide   = toCoords.x   < boundaryX ? 'left' : 'right';
            if (fromSide !== toSide) return true;
        }
    }
    return false;
}

const getSurroundings = (coords) => {
    const N = {x: coords.x, y: coords.y-1},
              S = {x: coords.x, y: coords.y+1},
              W = {x: coords.x-1, y: coords.y},
              E = {x: coords.x+1, y: coords.y},
              NW = {x: coords.x-1, y: coords.y-1},
              NE = {x: coords.x+1, y: coords.y-1},
              SW = {x: coords.x-1, y: coords.y+1},
              SE = {x: coords.x+1, y: coords.y+1}
    return {N,S,E,W,NW,NE,SW,SE}
}
const someoneIsInCoords = (coords)=>{
    return Object.values(this.combatants).some(e=>{
        try {
            if(!e) return false;
            if (e.coordinates && JSON.stringify(e.coordinates) === JSON.stringify(coords)) return true;
            if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => JSON.stringify(c) === JSON.stringify(coords));
            return false;
        } catch (err) { return false; }
    })
}
const someoneElseIsInCoords = (caller, coords)=>{
    return Object.values(this.combatants).filter(c=>c.id!==caller.id).some(e=>JSON.stringify(e.coordinates) == JSON.stringify(coords))
}

export const MonsterMovementMethods = {
    stayInColumn: (columnNum, caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId),
        laneDiff = Methods.getLaneDifferenceToTarget(caller, enemyTarget);
        let coords = caller.coordinates;
        let newCoords = JSON.parse(JSON.stringify(coords))
        let amount = window.pickRandom([1,2])
        newCoords.y += amount
        if(newCoords.y < 0){
            newCoords.y = 0;
        } else if(newCoords.y > MAX_LANES){
            newCoords.y = MAX_LANES
        }
        caller.coordinates = newCoords;
    },
    goUp: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId);
        let coords = caller.coordinates;
        let newCoords = JSON.parse(JSON.stringify(coords))
        let amount = window.pickRandom([1,2])
        newCoords.y -= amount
        if(newCoords.y < 0){
            newCoords.y = 0;
        } else if(newCoords.y > MAX_LANES){
            newCoords.y = MAX_LANES
        }
        caller.coordinates = newCoords;
    },
    goDown: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId);
        let coords = caller.coordinates;
        let newCoords = JSON.parse(JSON.stringify(coords))
        let amount = window.pickRandom([1,2])
        newCoords.y -= amount
        if(newCoords.y < 0){
            newCoords.y = 0;
        } else if(newCoords.y > MAX_LANES){
            newCoords.y = MAX_LANES
        }
        caller.coordinates = newCoords;
    },
    centerBack: (caller) => {
        let targetTile = {x: 6, y: 2}
        let coords = caller.coordinates;
        let newCoords = JSON.parse(JSON.stringify(coords))

        const {N,E,S,W,NW,SW,NE,SE} = getSurroundings(caller.coordinates)

        const targetIsNorthWest = targetTile.y < coords.y && targetTile.x < coords.x,
            targetIsNorth = targetTile.y < coords.y && targetTile.x === coords.x,
            targetIsNorthEast = targetTile.y < coords.y && targetTile.x > coords.x,
            targetIsWest = targetTile.y === coords.y && targetTile.x < coords.x,
            targetIsEast = targetTile.y === coords.y && targetTile.x > coords.x,
            targetIsSouthWest = targetTile.y > coords.y && targetTile.x < coords.x,
            targetIsSouth = targetTile.y > coords.y && targetTile.x === coords.x,
            targetIsSouthEast = targetTile.y > coords.y && targetTile.x > coords.x;

        if(targetTile.x > coords.x) newCoords.x = coords.x+1
        if(targetTile.x < coords.x) newCoords.x = coords.x-1
        if(targetTile.y > coords.y) newCoords.y = coords.y+1
        if(targetTile.y < coords.y) newCoords.y = coords.y-1
        caller.coordinates = newCoords;
    },
    evade: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId),
        laneDiff = Methods.getLaneDifferenceToTarget(caller, enemyTarget),
        depthDiff = Methods.getDistanceToTarget(caller, enemyTarget)
        let coords = caller.coordinates;
        if(laneDiff < 0){
            // caller.position--
            caller.coordinates = {x: depthDiff > 3 ? coords.x-1 : coords.x, y: coords.y+1}
        } else if(laneDiff > 0){
            // caller.position++
            caller.coordinates = {x: depthDiff > 3 ? coords.x-1 : coords.x, y: coords.y+1}
        }
    },
    closeTheGap: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        if(enemyTarget){
            // If the target is already adjacent and the pending attack is close range,
            // there is no need to move — skip to avoid the "dancing" behaviour.
            // For large callers (occupying multiple tiles) check adjacency against ALL
            // occupied tiles so a fighter standing on the virtual top tile also counts.
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
        }
        const isDirectlyAboveCaller = (caller, combatant) => {
            const combatantIsDirectlyAbove = (combatant.coordinates.y === caller.coordinates.y-1 && combatant.coordinates.x === caller.coordinates.x)
            return combatantIsDirectlyAbove;
        }
        const isDirectlyBelowCaller = (caller, combatant) => {
            const combatantIsDirectlyBelow = (combatant.coordinates.y === caller.coordinates.y+1 && combatant.coordinates.x === caller.coordinates.x)
            return combatantIsDirectlyBelow;
        }
        if(enemyTarget){
            const coords = caller.coordinates;
            const northCoords = {x: coords.x, y: coords.y-1},
                  soutCoords = {x: coords.x, y: coords.y+1},
                  westCoords = {x: coords.x-1, y: coords.y},
                  eastCoords = {x: coords.x+1, y: coords.y},
                  northWestCoords = {x: coords.x-1, y: coords.y-1},
                  northEastCoords = {x: coords.x+1, y: coords.y-1},
                  southWestCoords = {x: coords.x-1, y: coords.y+1},
                  southEastCoords = {x: coords.x+1, y: coords.y+1}

            const {N,E,S,W,NW,SW,NE,SE} = getSurroundings(caller.coordinates)


            // console.log('normal');
            
            let targetTile = {x: enemyTarget.coordinates.x, y: enemyTarget.coordinates.y}
            let newCoords = JSON.parse(JSON.stringify(coords))

            let someoneIsInCoords = (coords)=>{
                return Object.values(combatants).filter(c=>c.id!==caller.id).some(e=>{
                    try {
                        if(!e) return false;
                        if (e.coordinates && JSON.stringify(e.coordinates) === JSON.stringify(coords)) return true;
                        if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => JSON.stringify(c) === JSON.stringify(coords));
                        return false;
                    } catch (err) { return false; }
                })
            }
            const targetIsInCoords = (coords)=>{
                return JSON.stringify(targetTile) == JSON.stringify(coords);
            }


            const targetIsNorthWest = targetTile.y < coords.y && targetTile.x < coords.x,
            targetIsNorth = targetTile.y < coords.y && targetTile.x === coords.x,
            targetIsNorthEast = targetTile.y < coords.y && targetTile.x > coords.x,
            targetIsWest = targetTile.y === coords.y && targetTile.x < coords.x,
            targetIsEast = targetTile.y === coords.y && targetTile.x > coords.x,
            targetIsSouthWest = targetTile.y > coords.y && targetTile.x < coords.x,
            targetIsSouth = targetTile.y > coords.y && targetTile.x === coords.x,
            targetIsSouthEast = targetTile.y > coords.y && targetTile.x > coords.x;

            if(targetIsNorthWest){ /////////////////////////////////////  NW
                if(targetIsInCoords(NW)){
                    if(!someoneIsInCoords(W)){
                        newCoords = W;
                    } else if(!someoneIsInCoords(N)){
                        newCoords = N;
                    } else {
                        console.log('TARGET DIRECTLY NORTHWEST, but Im stuck');
                    }
                } else if(someoneIsInCoords(NW)){
                    //go up or left
                    if(!someoneIsInCoords(N)){
                        newCoords = N
                    } else if(!someoneIsInCoords(W)){
                        newCoords = W
                    } else {
                        console.log('nowhere to go, stay put');
                        return
                    }
                } else {
                    // space available go NW
                    newCoords = NW;
                }
            } else if(targetIsNorthEast){ /////////////////////// NE
                if(targetIsInCoords(NE)){
                    if(!someoneIsInCoords(E)){
                        newCoords = E;
                    } else if(!someoneIsInCoords(N)){
                        newCoords = N;
                    } else {
                        console.log('TARGET DIRECTLY NORTHEAST, but Im stuck');
                    }
                } else if(someoneIsInCoords(NE)){
                    //go up or right
                    if(!someoneIsInCoords(N)){
                        newCoords = N
                    } else if(!someoneIsInCoords(E)){
                        newCoords = E
                    } else {
                        console.log('nowhere to go, stay put');
                        return
                    }
                } else {
                    // space available go NW
                    newCoords = NE;
                }
            } else if(targetIsSouthWest){ ////////////////////////////////////// SW
                if(targetIsInCoords(SW)){
                    if(!someoneIsInCoords(W)){
                        newCoords = W;
                    } else if(!someoneIsInCoords(S)){
                        newCoords = S;
                    } else {
                        console.log('TARGET DIRECTLY SW, but Im stuck');
                    }
                } else if(someoneIsInCoords(SW)){
                    //go down or left
                    if(!someoneIsInCoords(S)){
                        newCoords = S
                    } else if(!someoneIsInCoords(W)){
                        newCoords = W
                    } else {
                        console.log('nowhere to go, stay put');
                        return
                    }
                } else {
                    // space available go SW
                    newCoords = SW;
                }
            } else if(targetIsSouthEast){ //////////////////////// SE
                if(targetIsInCoords(SE)){
                    if(!someoneIsInCoords(E)){
                        newCoords = E;
                    } else if(!someoneIsInCoords(S)){
                        newCoords = S;
                    } else {
                        console.log('TARGET DIRECTLY SE, but Im stuck');
                    }
                } else if(someoneIsInCoords(SE)){
                    //go down or right
                    if(!someoneIsInCoords(S)){
                        newCoords = S
                    } else if(!someoneIsInCoords(E)){
                        newCoords = E
                    } else {
                        console.log('nowhere to go, stay put');
                        return
                    }
                } else {
                    // space available go SW
                    newCoords = SE;
                }
            } else if(targetIsNorth){ ////////// N
                if(targetIsInCoords(N)){
                    console.log('TARGET DIRECTLY North');
                } else if(someoneIsInCoords(N)){
                    //go NW or NE
                    if(!someoneIsInCoords(NW)){
                        newCoords = NW
                    } else if(!someoneIsInCoords(NE)){
                        newCoords = NE
                    } else {
                        console.log('nowhere to go, stay put');
                        return
                    }
                } else {
                    // space available go SW
                    newCoords = N;
                }
            } else if(targetIsSouth){ //////////// S
                if(targetIsInCoords(S)){
                    // console.log('TARGET DIRECTLY South');
                } else if(someoneIsInCoords(S)){
                    //go SW or SE
                    if(!someoneIsInCoords(SW)){
                        newCoords = SW
                    } else if(!someoneIsInCoords(SE)){
                        newCoords = SE
                    } else {
                        console.log('nowhere to go, stay put');
                        return
                    }
                } else {
                    // space available go South
                    newCoords = S;
                }
            } else if(targetIsEast){ ///////////  E
                if(targetIsInCoords(E)){
                    // console.log('TARGET DIRECTLY east');
                } else if(someoneIsInCoords(E)){
                    //go NE or SE
                    if(!someoneIsInCoords(NE)){
                        newCoords = NE
                    } else if(!someoneIsInCoords(SE)){
                        newCoords = SE
                    } else {
                        console.log('nowhere to go, stay put');
                        return
                    }
                } else {
                    // space available go South
                    newCoords = eastCoords;
                }
            } else if(targetIsWest){
                if(targetIsInCoords(W)){
                } else if(someoneIsInCoords(W)){
                    //go NW or SW
                    if(!someoneIsInCoords(NW)){
                        newCoords = NW
                    } else if(!someoneIsInCoords(SW)){
                        newCoords = SW
                    } else {
                        console.log('nowhere to go, stay put');
                        return
                    }
                } else {
                    // space available go West
                    newCoords = W;
                }
            }
            // Block the move if it would cross an active shield wall
            if (!crossesShieldWall(coords, newCoords)) {
                // Large monsters (main non-minion monsters) occupy 2 tiles vertically.
                // Make sure the tile above the destination is also free before committing.
                const callerIsLarge = (caller.isMonster === true && caller.isMinion !== true)
                    || caller.large === true;
                if (callerIsLarge) {
                    const above = { x: newCoords.x, y: newCoords.y - 1 };
                    if (above.y < 0 || someoneIsInCoords(above)) {
                        return; // can't fit — abort move
                    }
                }
                caller.coordinates = newCoords;
            }
        } else {
            console.log('no enbemey target!!!, caller ', caller);
        }
    },
    moveTowardsCloseEnemyTarget: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        const distanceToTarget = Methods.getDistanceToTarget(caller, enemyTarget),
        laneDiff = Methods.getLaneDifferenceToTarget(caller, enemyTarget)
        const originalCoords = { x: caller.depth, y: caller.position };

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
        } else if(distanceToTarget === 2){
            caller.depth++
        } else if(distanceToTarget > 2){
            caller.depth += 2
        }

        const newCoordsMTCET = {x: caller.depth, y: caller.position};
        if (!crossesShieldWall(originalCoords, newCoordsMTCET)) {
            // Large monsters occupy 2 tiles — also check the tile above the destination.
            const callerIsLargeMTCET = (caller.isMonster === true && caller.isMinion !== true)
                || caller.large === true;
            if (callerIsLargeMTCET) {
                const aboveMTCET = { x: newCoordsMTCET.x, y: newCoordsMTCET.y - 1 };
                const aboveOccupied = aboveMTCET.y < 0 || Object.values(combatants).filter(c => c.id !== caller.id).some(e => {
                    try {
                        if (!e) return false;
                        if (e.coordinates && e.coordinates.x === aboveMTCET.x && e.coordinates.y === aboveMTCET.y) return true;
                        if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => c.x === aboveMTCET.x && c.y === aboveMTCET.y);
                        return false;
                    } catch (err) { return false; }
                });
                if (aboveOccupied) {
                    caller.depth = originalCoords.x;
                    caller.position = originalCoords.y;
                    return;
                }
            }
            caller.coordinates = newCoordsMTCET;
        } else {
            // Wall blocked the move — restore original position
            caller.depth = originalCoords.x;
            caller.position = originalCoords.y;
        }
    },
    moveTowardsCloseFriendlyTarget: (caller, combatants) => {
        let newPosition, newDepth;
        let liveCombatants = Object.values(combatants).filter(e=>!e.dead)
        const friendlyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        const distanceToTarget = Methods.getDistanceToTarget(caller, friendlyTarget),
        laneDiff = Methods.getLaneDifferenceToTarget(caller, friendlyTarget);
        if(!friendlyTarget) return

        const finalize = () => {
            if(newPosition < 0) newPosition = 0
            if(newPosition > MAX_LANES) newPosition = MAX_LANES;
            if(newDepth < 0) newDepth = 0
            if(newDepth > MAX_DEPTH) newDepth = MAX_DEPTH;

            //set new values
            if(newDepth !== undefined) caller.depth = newDepth;
            if(newPosition !== undefined) caller.position = newPosition;
            caller.coordinates = {x: caller.depth, y: caller.position}
        }

        if((laneDiff === 1 || laneDiff === -1 || laneDiff === 0) && Math.abs(distanceToTarget) < 2){
            newPosition = friendlyTarget.position
            newDepth = friendlyTarget.depth - 1;
            finalize();
            return
        } else if(laneDiff < -1){
            newPosition = caller.position - 1
        } else if(laneDiff > 1){
            newPosition = caller.position + 1
        } else if(laneDiff === 0 && distanceToTarget === 1){
            console.log('LORYASTES: BEHIND ADJACENT!');
            // newPosition = caller.position - 1
        }
        if((distanceToTarget < 0 && laneDiff !== 0) ||  
        (distanceToTarget < -1 && laneDiff === 0 && caller.depth > 1)){
            newDepth = caller.depth - 1
        } else if(distanceToTarget > 1){
            newDepth = caller.depth + 1
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
        
        finalize();
    }
}