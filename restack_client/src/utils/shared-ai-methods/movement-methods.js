import {Methods} from './basic-methods';


// Teleport the caller to an empty tile on the back line (or next available column)
// Optionally accepts a callback (onTeleport) to notify when teleport occurs
const teleportToBackLine = (caller, combatants, onTeleport) => {
    const isMonster = !!caller.isMonster;
    const backCol = isMonster ? 0 : MAX_DEPTH;
    const secondBackCol = isMonster ? 1 : MAX_DEPTH - 1;
    const startLane = caller.coordinates.y;
    // Helper to find available tile in a column, searching vertically from startLane
    function findAvailableInCol(col) {
        for (let offset = 0; offset <= MAX_LANES; offset++) {
            // Try up and down from startLane
            const up = startLane - offset;
            const down = startLane + offset;
            if (up >= 0 && up < MAX_LANES && isAvailableToMoveInto({x: col, y: up}, combatants, null, caller)) {
                return {x: col, y: up};
            }
            if (offset !== 0 && down >= 0 && down < MAX_LANES && isAvailableToMoveInto({x: col, y: down}, combatants, null, caller)) {
                return {x: col, y: down};
            }
        }
        return null;
    }
    let dest = findAvailableInCol(backCol);
    if (!dest) dest = findAvailableInCol(secondBackCol);
    if (dest) {
        caller.coordinates = dest;
        if (typeof onTeleport === 'function') {
            onTeleport(caller);
        }
    }
}
// const clone = (val) => { return JSON.parse(JSON.stringify(val)) }
export let MAX_DEPTH = 7;
export function setMaxDepth(val) {
    MAX_DEPTH = val;
}
// ^ index 7, actual col count is 8
const MAX_LANES = 6
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
const PC_TYPES = ['soldier','ranger','wizard', 'monk', 'sage', 'barbarian']
const someoneIsInCoords = (coords, combatants)=>{
    if(!combatants) return false
    return Object.values(combatants).some(e=>{
        try {
            if(!e) return false;
            if (e.dead) return false;
            if (e.coordinates && JSON.stringify(e.coordinates) === JSON.stringify(coords)) return true;
            if (Array.isArray(e.occupiedCoords)) {
                return e.occupiedCoords.some(c => JSON.stringify(c) === JSON.stringify(coords));
            }
            return false;
        } catch (err) { return false; }
    })
}
const isOutOfBounds = (coords) => {
    return coords.x > MAX_DEPTH || coords.y >= MAX_LANES || coords.x < 0 || coords.y < 0
}

// ─── Shield Wall registry ─────────────────────────────────────────────────────
// Soldiers write their active wall here; movement methods read it.
// Structure: array of { x, lanesAffected, isFacingRight }
export const activeShieldWalls = [];

/**
 * Returns true if moving from `fromCoords` to `toCoords` would cross an
 * active shield wall line.
 */
export const crossesShieldWall = (fromCoords, toCoords) => {
    if (!activeShieldWalls.length) return false;
    for (const wall of activeShieldWalls) {
        const { x: wallX, lanesAffected, isFacingRight } = wall;
        // Only matters if the destination lane is covered by the wall
        if (!lanesAffected.includes(toCoords.y)) continue;
        // A crossing happens when the move goes from one side to the other
        if (isFacingRight) {
            // Wall is a right-facing barrier: blocks movement from left→right across wallX
            // and from right→left across wallX (it's solid in both directions)
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

const LARGE_MOVER_TYPES = ['beholder','ogre','sphinx','manticore','wyvern','wyvern_alt','mummy','djinn','vampire','summoned_djinn','summoned_mummy','summoned_ogre','summoned_vampire'];

const isHugeMover = (caller) => {
    if (!caller) return false;
    if (typeof caller.huge === 'boolean' && caller.huge) return true;
    if (caller.type === 'dragon') return true;
    if (caller.tier === 4) return true;
    if (typeof caller.size === 'number' && caller.size === 3) return true;
    if (typeof caller.scale === 'number' && caller.scale === 3) return true;
    return false;
};

/**
 * Returns true if `caller` is a large (2-tile-tall) combatant that needs
 * both `coords` AND the tile directly above it to be free before moving in.
 */
const isLargeMover = (caller) => {
    if (!caller) return false;
    if (isHugeMover(caller)) return false;
    if (typeof caller.large === 'boolean' && caller.large) return true;
    if (caller.type && LARGE_MOVER_TYPES.includes(caller.type) && caller.isMinion !== true) return true;
    if (typeof caller.size === 'number' && caller.size >= 2) return true;
    if (typeof caller.scale === 'number' && caller.scale >= 2) return true;
    // Main battle monster (not a minion) always uses 2x portrait
    if (caller.isMonster === true && caller.isMinion !== true) return true;
    return false;
};

const isAvailableToMoveInto = (coords, combatants, fromCoords = null, caller = null) => {
    if (isOutOfBounds(coords)) return false;
    if (someoneIsInCoords(coords, combatants)) return false;
    if (fromCoords && crossesShieldWall(fromCoords, coords)) return false;
    // Huge movers occupy 3x3 tiles
    if (caller && isHugeMover(caller)) {
        const hOffsetDir = (coords.x >= 4) ? -1 : 1;
        const hugeCoords = [
            { x: coords.x, y: coords.y - 1 },
            { x: coords.x, y: coords.y - 2 },
            { x: coords.x + hOffsetDir, y: coords.y },
            { x: coords.x + hOffsetDir, y: coords.y - 1 },
            { x: coords.x + hOffsetDir, y: coords.y - 2 },
            { x: coords.x + 2 * hOffsetDir, y: coords.y },
            { x: coords.x + 2 * hOffsetDir, y: coords.y - 1 },
            { x: coords.x + 2 * hOffsetDir, y: coords.y - 2 }
        ];
        for (const hc of hugeCoords) {
            if (isOutOfBounds(hc)) return false;
            if (Object.values(combatants).some(e => {
                if (!e || e.id === caller.id) return false;
                if (e.coordinates && e.coordinates.x === hc.x && e.coordinates.y === hc.y) return true;
                if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => c.x === hc.x && c.y === hc.y);
                return false;
            })) return false;
        }
    }
    // Large movers occupy coords + tile above: both must be free
    else if (caller && isLargeMover(caller)) {
        const above = { x: coords.x, y: coords.y - 1 };
        // If above tile is out of bounds we can't fit — block the move
        if (above.y < 0) return false;
        // Check if anyone else (excluding caller) is in the above tile
        if (Object.values(combatants).some(e => {
            if (!e || e.id === caller.id) return false;
            if (e.coordinates && e.coordinates.x === above.x && e.coordinates.y === above.y) return true;
            if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => c.x === above.x && c.y === above.y);
            return false;
        })) return false;
    }
    // Patch: Prevent movement into spaces virtually occupied by large monsters (2x mummy)
    // Check if any other combatant (not self) has occupiedCoords that includes the destination
    if (combatants) {
        const blocked = Object.values(combatants).some(e => {
            if (!caller || e.id === caller.id) return false;
            if (Array.isArray(e.occupiedCoords)) {
                return e.occupiedCoords.some(c => c.x === coords.x && c.y === coords.y);
            }
            return false;
        });
        if (blocked) return false;
    }
    return true;
}

/**
 * Returns true if there is at least one healthy friendly combatant 
 * strictly between fromCoords and toCoords on the same horizontal lane.
 */
const isPathBlockedByFriendly = (fromCoords, toCoords, combatants) => {
    if (!fromCoords || !toCoords || !combatants) return false;
    if (fromCoords.y !== toCoords.y) return false;
    const y = fromCoords.y;
    const startX = Math.min(fromCoords.x, toCoords.x) + 1;
    const endX = Math.max(fromCoords.x, toCoords.x) - 1;
    if (startX > endX) return false;
    
    return Object.values(combatants).some(e => {
        if (!e || e.dead || e.isMonster || e.isMinion || e.isVCT) return false;
        return e.coordinates && e.coordinates.y === y && e.coordinates.x >= startX && e.coordinates.x <= endX;
    });
};

/**
 * Given a target entity (which might be large), this finds the nearest 
 * available lane (y) that has a clear horizontal LOS to ANY tile occupied 
 * by that target.
 */
const findLaneWithClearLOS = (caller, target, combatants) => {
    if (!caller || !target || !combatants) return null;
    
    const allTargetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0)
        ? target.occupiedCoords
        : [target.coordinates];
        
    const callerX = caller.coordinates.x;
    const possibleLanes = [0, 1, 2, 3, 4, 5]; // MAX_LANES is 5 (index 0-5)
    
    // Sort lanes by vertical distance to caller
    possibleLanes.sort((a, b) => Math.abs(a - caller.coordinates.y) - Math.abs(b - caller.coordinates.y));
    
    for (const y of possibleLanes) {
        // For each lane, check if any of the target's occupied tiles are in this lane
        // AND have a clear path from (callerX, y)
        const clearTileInLane = allTargetTiles.find(t => {
            if (t.y !== y) return false;
            return !isPathBlockedByFriendly({x: callerX, y: y}, t, combatants);
        });
        
        if (clearTileInLane) return y;
    }
    
    return null;
};

const someoneElseIsInCoords = (caller, coords)=>{ // eslint-disable-line no-unused-vars
    return Object.values(this.combatants).filter(c=>c.id!==caller.id).some(e=>JSON.stringify(e.coordinates) === JSON.stringify(coords))
}

const goTowards = (caller, combatants, targetTile, forwardFirst = false) => {
    if (!targetTile || typeof targetTile.x !== 'number' || typeof targetTile.y !== 'number') {
        // Prevent TypeError if targetTile is invalid
        return JSON.parse(JSON.stringify(caller.coordinates));
    }
    const fromCoords = caller.coordinates;
    const isTargetTileOccupied = someoneIsInCoords(targetTile, combatants);
    const {N,E,S,W,NW,SW,NE,SE} = getSurroundings(caller.coordinates)

    // Wall-aware availability check: passes fromCoords and caller so large-mover two-tile check is evaluated
    const canMoveTo = (coords, avoidLast = true) => {
        if (!isAvailableToMoveInto(coords, combatants, fromCoords, caller)) return false;
        if (avoidLast && caller.lastCoords && coords.x === caller.lastCoords.x && coords.y === caller.lastCoords.y) return false;
        return true;
    };

    const targetIsInCoords = (coords)=>{
        return JSON.stringify(targetTile) === JSON.stringify(coords);
    }

    const targetIsNorthWest = targetTile.y < caller.coordinates.y && targetTile.x < caller.coordinates.x,
        targetIsNorth = targetTile.y < caller.coordinates.y && targetTile.x === caller.coordinates.x,
        targetIsNorthEast = targetTile.y < caller.coordinates.y && targetTile.x > caller.coordinates.x,
        targetIsWest = targetTile.y === caller.coordinates.y && targetTile.x < caller.coordinates.x,
        targetIsEast = targetTile.y === caller.coordinates.y && targetTile.x > caller.coordinates.x,
        targetIsSouthWest = targetTile.y > caller.coordinates.y && targetTile.x < caller.coordinates.x,
        targetIsSouth = targetTile.y > caller.coordinates.y && targetTile.x === caller.coordinates.x,
        targetIsSouthEast = targetTile.y > caller.coordinates.y && targetTile.x > caller.coordinates.x;

    let newCoords = JSON.parse(JSON.stringify(caller.coordinates))

    if(targetIsNorthWest){ /////////////////////////////////////  NW
        if(targetIsInCoords(NW) && !isTargetTileOccupied && canMoveTo(NW)){
            newCoords = NW;
        } else if(targetIsInCoords(NW)){
            if(canMoveTo(W)){
                newCoords = W;
            } else if(canMoveTo(N)){
                newCoords = N;
            } else {
            }
        } else if(!canMoveTo(NW)){
            //go up or left
            if(canMoveTo(N)){
                newCoords = N
            } else if(canMoveTo(W)){
                newCoords = W
            } else if(canMoveTo(SW)){
                newCoords = SW
            } else if(canMoveTo(S)){
                newCoords = S
            } else if(canMoveTo(NE)){
                newCoords = NE
            } else if(canMoveTo(E)){
                newCoords = E
            } else if(canMoveTo(N, false)){
                newCoords = N
            } else if(canMoveTo(W, false)){
                newCoords = W
            }
        } else {
            // space available go NW
            newCoords = NW;
        }
    } else if(targetIsNorthEast){ /////////////////////// NE
        if(targetIsInCoords(NE) && !isTargetTileOccupied && canMoveTo(NE)){
            newCoords = NE;
        } else if(targetIsInCoords(NE)){
            if(canMoveTo(E)){
                newCoords = E;
            } else if(canMoveTo(N)){
                newCoords = N;
            } else {
            }
        } else if(!canMoveTo(NE)){
            //go up or right — when forwardFirst, prefer E (forward) over N (lane adjust)
            const first  = forwardFirst ? (canMoveTo(E) ? E : null) : (canMoveTo(N) ? N : null);
            const second = forwardFirst ? (canMoveTo(N) ? N : null) : (canMoveTo(E) ? E : null);
            if(first){
                newCoords = first
            } else if(second){
                newCoords = second
            } else if(canMoveTo(SE)){
                newCoords = SE
            } else if(canMoveTo(S)){
                newCoords = S
            } else if(canMoveTo(NW)){
                newCoords = NW
            } else if(canMoveTo(W)){
                newCoords = W
            } else if(canMoveTo(E, false)){
                newCoords = E
            } else if(canMoveTo(N, false)){
                newCoords = N
            }
        } else {
            // space available go NE
            newCoords = NE;
        }
    } else if(targetIsSouthWest){ ////////////////////////////////////// SW
        if(targetIsInCoords(SW) && !isTargetTileOccupied && canMoveTo(SW)){
            newCoords = SW;
        } else if(targetIsInCoords(SW)){
            if(canMoveTo(W)){
                newCoords = W;
            } else if(canMoveTo(S)){
                newCoords = S;
            } else {
            }
        } else if(!canMoveTo(SW)){
            //go down or left
            if(canMoveTo(S)){
                newCoords = S
            } else if(canMoveTo(W)){
                newCoords = W
            } else if(canMoveTo(NW)){
                newCoords = NW
            } else if(canMoveTo(N)){
                newCoords = N
            } else if(canMoveTo(SE)){
                newCoords = SE
            } else if(canMoveTo(E)){
                newCoords = E
            } else if(canMoveTo(S, false)){
                newCoords = S
            } else if(canMoveTo(W, false)){
                newCoords = W
            }
        } else {
            // space available go SW
            newCoords = SW;
        }
    } else if(targetIsSouthEast){ //////////////////////// SE
        if(targetIsInCoords(SE) && !isTargetTileOccupied && canMoveTo(SE)){
            newCoords = SE;
        } else if(!canMoveTo(SE)){
            //go down or right — when forwardFirst, prefer E (forward) over S (lane adjust)
            const first  = forwardFirst ? (canMoveTo(E) ? E : null) : (canMoveTo(S) ? S : null);
            const second = forwardFirst ? (canMoveTo(S) ? S : null) : (canMoveTo(E) ? E : null);
            if(first){
                newCoords = first
            } else if(second){
                newCoords = second
            } else if(canMoveTo(NE)){
                newCoords = NE
            } else if(canMoveTo(N)){
                newCoords = N
            } else if(canMoveTo(SW)){
                newCoords = SW
            } else if(canMoveTo(W)){
                newCoords = W
            } else if(canMoveTo(E, false)){
                newCoords = E
            } else if(canMoveTo(S, false)){
                newCoords = S
            }
        } else {
            // space available go SE
            newCoords = SE;
        }
    } else if(targetIsNorth){ ////////// N
        if(targetIsInCoords(N) && !isTargetTileOccupied && canMoveTo(N)){
            newCoords = N;
        } else if(targetIsInCoords(N)){
            // do nothing (original code is empty here)
        } else if(!canMoveTo(N)){
            //go NW or NE
            if(canMoveTo(NW)){
                newCoords = NW
            } else if(canMoveTo(NE)){
                newCoords = NE
            } else {
                // fallback: vertical blocked and side-steps blocked — try moving horizontally toward target
                const horizDir = targetTile.x > caller.coordinates.x ? 1 : -1;
                const horiz = { x: caller.coordinates.x + horizDir, y: caller.coordinates.y };
                if (canMoveTo(horiz)) {
                    newCoords = horiz;
                } else if(canMoveTo(W)) {
                    newCoords = W;
                } else if(canMoveTo(E)) {
                    newCoords = E;
                } else if(canMoveTo(SW)) {
                    newCoords = SW;
                } else if(canMoveTo(SE)) {
                    newCoords = SE;
                } else if(canMoveTo(S)) {
                    newCoords = S;
                } else if(canMoveTo(NW, false)){
                    newCoords = NW
                } else if(canMoveTo(NE, false)){
                    newCoords = NE
                }
            }
        } else {
            // space available go N
            newCoords = N;
        }
    } else if(targetIsSouth){ //////////// S
        if(targetIsInCoords(S) && !isTargetTileOccupied && canMoveTo(S)){
            newCoords = S;
        } else if(targetIsInCoords(S)){
            // do nothing (original code is empty here)
        } else if(!canMoveTo(S)){
            //go SW or SE
            if(canMoveTo(SW)){
                newCoords = SW
            } else if(canMoveTo(SE)){
                newCoords = SE
            } else {
                // fallback: vertical blocked and side-steps blocked — try moving horizontally toward target
                const horizDir = targetTile.x > caller.coordinates.x ? 1 : -1;
                const horiz = { x: caller.coordinates.x + horizDir, y: caller.coordinates.y };
                if (canMoveTo(horiz)) {
                    newCoords = horiz;
                } else if(canMoveTo(W)) {
                    newCoords = W;
                } else if(canMoveTo(E)) {
                    newCoords = E;
                } else if(canMoveTo(NW)) {
                    newCoords = NW;
                } else if(canMoveTo(NE)) {
                    newCoords = NE;
                } else if(canMoveTo(N)) {
                    newCoords = N;
                } else if(canMoveTo(SW, false)){
                    newCoords = SW
                } else if(canMoveTo(SE, false)){
                    newCoords = SE
                }
            }
        } else {
            // space available go South
            newCoords = S;
        }
    } else if(targetIsEast){ ///////////  E
        if(targetIsInCoords(E) && !isTargetTileOccupied && canMoveTo(E)){
            newCoords = E;
        } else if(targetIsInCoords(E)){
            // Target is directly East and occupied — already adjacent, don't move
        } else if(!canMoveTo(E)){
            //go NE or SE; for large movers fall back to pure N/S lane shift
            if(canMoveTo(NE)){
                newCoords = NE
            } else if(canMoveTo(SE)){
                newCoords = SE
            } else if(canMoveTo(N)){
                newCoords = N
            } else if(canMoveTo(S)){
                newCoords = S
            } else if(canMoveTo(NW)){
                newCoords = NW
            } else if(canMoveTo(SW)){
                newCoords = SW
            } else if(canMoveTo(W)){
                newCoords = W
            } else if(canMoveTo(NE, false)){
                newCoords = NE
            } else if(canMoveTo(SE, false)){
                newCoords = SE
            }
        } else {
            // space available go East
            newCoords = E;
        }
    } else if(targetIsWest){
        if(targetIsInCoords(W) && !isTargetTileOccupied && canMoveTo(W)){
            newCoords = W;
        } else if(targetIsInCoords(W)){
            // Target is directly West and occupied — already adjacent, don't move
        } else if(!canMoveTo(W)){
            //go NW or SW; for large movers fall back to pure N/S lane shift
            if(canMoveTo(NW)){
                newCoords = NW
            } else if(canMoveTo(SW)){
                newCoords = SW
            } else if(canMoveTo(N)){
                newCoords = N
            } else if(canMoveTo(S)){
                newCoords = S
            } else if(canMoveTo(NE)){
                newCoords = NE
            } else if(canMoveTo(SE)){
                newCoords = SE
            } else if(canMoveTo(E)){
                newCoords = E
            } else if(canMoveTo(NW, false)){
                newCoords = NW
            } else if(canMoveTo(SW, false)){
                newCoords = SW
            }
        } else {
            // space available go West
            newCoords = W;
        }
    }
    if(newCoords.x > MAX_DEPTH-1) newCoords.x = MAX_DEPTH -1;
    if(newCoords.x < 0) newCoords.x = 0
    if(newCoords.y > MAX_LANES-1) newCoords.y = MAX_LANES -1;
    if(newCoords.y < 0) newCoords.y = 0;
    // Final large-mover guard: after all clamping, validate the chosen tile with the
    // full isAvailableToMoveInto check (which includes the "above tile must be free"
    // rule for 2× monsters). This catches cases where the "space available" fast-paths
    // above bypass canMoveTo and assign a diagonal directly (e.g. newCoords = SW).
    if (isLargeMover(caller) && !isAvailableToMoveInto(newCoords, combatants, fromCoords, caller)) return;
    // Final shield-wall guard: even after clamping, block the move if it crosses a wall
    if (!crossesShieldWall(fromCoords, newCoords)) {
        if (caller.coordinates.x !== newCoords.x || caller.coordinates.y !== newCoords.y) {
            caller.lastCoords = { x: caller.coordinates.x, y: caller.coordinates.y };
            caller.coordinates = newCoords;
        }
    }
}

export const MovementMethods = {
    isAvailableToMoveInto,
    isPathBlockedByFriendly,
    findLaneWithClearLOS,
    goTowards,
    teleportToBackLine,
    goUp: (caller, combatants) => {
        // const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId);
        let coords = caller.coordinates;
        let newCoords = JSON.parse(JSON.stringify(coords))
        let amount = window.pickRandom([1,2])
        newCoords.y += amount
        if(newCoords.y < 0){
            newCoords.y = 0;
        } else if(newCoords.y > MAX_LANES - 1){
            newCoords.y = MAX_LANES - 1
        }
        caller.coordinates = newCoords;
    },
    goDown: (caller, combatants) => {
        // const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId);
        let coords = caller.coordinates;
        let newCoords = JSON.parse(JSON.stringify(coords))
        let amount = window.pickRandom([1,2])
        newCoords.y -= amount
        if(newCoords.y < 0){
            newCoords.y = 0;
        } else if(newCoords.y > MAX_LANES - 1){
            newCoords.y = MAX_LANES - 1
        }
        caller.coordinates = newCoords;
    },
    centerBack: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId);
        // const {N,E,S,W,NW,SW,NE,SE} = getSurroundings(caller.coordinates)

    let centerTile;
    if(PC_TYPES.includes(caller.type)){
            // PC always go to x:1
            // let newCoords = JSON.parse(JSON.stringify(caller.coordinates))
            // newCoords.x = 1;
            // if(newCoords.x > MAX_DEPTH) newCoords.x = MAX_DEPTH
            // if(newCoords.x < 0) newCoords.x = 0
            // caller.coordinates = newCoords;
            // return
            centerTile = {x: 1, y: 2}
        } else {
            // NPC always go to x:6
            // let newCoords = JSON.parse(JSON.stringify(caller.coordinates))
            // newCoords.x = 6;
            // if(newCoords.x > MAX_DEPTH) newCoords.x = MAX_DEPTH
            // if(newCoords.x < 0) newCoords.x = 0
            // caller.coordinates = newCoords;
            // return
            centerTile = {x: 6, y: 2}
        }
        // let centerTile = {x: 1, y: 2}
        let targetTile = centerTile;
        if(enemyTarget){
            targetTile = {x: 1, y: enemyTarget.coordinates.y}
        }
        goTowards(caller, combatants, targetTile);
    },
    evade: (caller, combatants) => {
        if(!caller.targetId){
            // remove this when you figure how to dodge projectiles or something
            return
        }
        let newCoords = JSON.parse(JSON.stringify(caller.coordinates))
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        let targetTile = {x: enemyTarget.coordinates.x, y: enemyTarget.coordinates.y}
        const {N,E,S,W,NW,SW,NE,SE} = getSurroundings(caller.coordinates) // eslint-disable-line no-unused-vars

        const targetIsNorthWest = targetTile.y < caller.coordinates.y && targetTile.x < caller.coordinates.x, // eslint-disable-line no-unused-vars
        targetIsNorth = targetTile.y < caller.coordinates.y && targetTile.x === caller.coordinates.x,
        targetIsNorthEast = targetTile.y < caller.coordinates.y && targetTile.x > caller.coordinates.x, // eslint-disable-line no-unused-vars
        targetIsWest = targetTile.y === caller.coordinates.y && targetTile.x < caller.coordinates.x,
        targetIsEast = targetTile.y === caller.coordinates.y && targetTile.x > caller.coordinates.x, // eslint-disable-line no-unused-vars
        targetIsSouthWest = targetTile.y > caller.coordinates.y && targetTile.x < caller.coordinates.x, // eslint-disable-line no-unused-vars
        targetIsSouth = targetTile.y > caller.coordinates.y && targetTile.x === caller.coordinates.x,
        targetIsSouthEast = targetTile.y > caller.coordinates.y && targetTile.x > caller.coordinates.x; // eslint-disable-line no-unused-vars


        if(targetIsNorth){
            if(isAvailableToMoveInto(S)){
                newCoords = S
            }
        } else if(targetIsSouth){
            if(isAvailableToMoveInto(N)){
                newCoords = N
            }
        } else if(targetIsWest){
            if(isAvailableToMoveInto(E)){
                newCoords = E
            }
        } else {
            if(isAvailableToMoveInto(NE)){
                newCoords = NE
            } else if(isAvailableToMoveInto(SE)){
                newCoords = SE
            } else if(isAvailableToMoveInto(NW)){
                newCoords = NW
            }else if(isAvailableToMoveInto(SW)){
                newCoords = SW
            }
        }
        caller.coordinates = newCoords;
    },
    evadeBack: (caller, combatants) => {
        // Determine if caller is a monster/minion or a fighter
        // Fighters: back is x = 0 (left side)
        // Monsters: back is x = MAX_DEPTH (right side)
        const isMonster = !!caller.isMonster;
        const targetX = isMonster ? MAX_DEPTH : 0;
        let newCoords = { ...caller.coordinates };
        const atBack = caller.coordinates.x === targetX;
        // Helper to check if enemy is directly in front
        const inFront = isMonster
            ? { x: caller.coordinates.x - 1, y: caller.coordinates.y }
            : { x: caller.coordinates.x + 1, y: caller.coordinates.y };
        const enemyInFront = Object.values(combatants).some(e => {
            if (!e || e.dead || e.isVCT) return false;
            const otherIsMonster = !!e.isMonster;
            return (isMonster !== otherIsMonster) && e.coordinates.x === inFront.x && e.coordinates.y === inFront.y;
        });
        if (!atBack) {
            // Move toward back
            if (isMonster) {
                const nextCoords = { x: caller.coordinates.x + 1, y: caller.coordinates.y };
                if (isAvailableToMoveInto(nextCoords, combatants, null, caller)) {
                    newCoords = nextCoords;
                }
            } else {
                const nextCoords = { x: caller.coordinates.x - 1, y: caller.coordinates.y };
                if (isAvailableToMoveInto(nextCoords, combatants, null, caller)) {
                    newCoords = nextCoords;
                }
            }
        } else if (enemyInFront) {
            // At back and enemy in front: try to move up or down
            const up = { x: caller.coordinates.x, y: caller.coordinates.y - 1 };
            const down = { x: caller.coordinates.x, y: caller.coordinates.y + 1 };
            if (isAvailableToMoveInto(up, combatants, null, caller)) {
                newCoords = up;
            } else if (isAvailableToMoveInto(down, combatants, null, caller)) {
                newCoords = down;
            }
        }
        caller.coordinates = newCoords;
    },
    closeTheGap: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        if(enemyTarget){
            const coords = caller.coordinates;
            let targetTile = {x: enemyTarget.coordinates.x, y: enemyTarget.coordinates.y}
            // For large (multi-tile) targets, stop if the caller is orthogonally
            // adjacent to ANY tile the target occupies, not just its base coord.
            const allTargetTiles = (Array.isArray(enemyTarget.occupiedCoords) && enemyTarget.occupiedCoords.length > 0)
                ? enemyTarget.occupiedCoords
                : [targetTile];
            const alreadyAdjacent = allTargetTiles.some(t => {
                const dx = Math.abs(t.x - coords.x);
                const dy = Math.abs(t.y - coords.y);
                return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
            });
            if (alreadyAdjacent) return;
            goTowards(caller, combatants, targetTile);
        } else {
            
        }
    },
    // Like closeTheGap but always prioritises advancing forward (E) over
    // adjusting lane (N/S) when the target is diagonally ahead.
    closeTheGapForwardFirst: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        if(enemyTarget){
            const coords = caller.coordinates;
            let targetTile = {x: enemyTarget.coordinates.x, y: enemyTarget.coordinates.y}
            // For large (multi-tile) targets, stop if the caller is orthogonally
            // adjacent to ANY tile the target occupies, not just its base coord.
            const allTargetTiles = (Array.isArray(enemyTarget.occupiedCoords) && enemyTarget.occupiedCoords.length > 0)
                ? enemyTarget.occupiedCoords
                : [targetTile];
            const alreadyAdjacent = allTargetTiles.some(t => {
                const dx = Math.abs(t.x - coords.x);
                const dy = Math.abs(t.y - coords.y);
                return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
            });
            if (alreadyAdjacent) return;
            goTowards(caller, combatants, targetTile, true);
        }
    },
    moveTowardsCloseEnemyTarget: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        if (!enemyTarget) return;
        // const distanceToTarget = Methods.getDistanceToTarget(caller, enemyTarget),
        // laneDiff = Methods.getLaneDifferenceToTarget(caller, enemyTarget)
        let targetTile = {x: enemyTarget.coordinates.x, y: enemyTarget.coordinates.y}
        let coords = caller.coordinates;

        let newCoords = JSON.parse(JSON.stringify(coords))
        if(targetTile.x > coords.x) newCoords.x = coords.x+1
        if(targetTile.x < coords.x) newCoords.x = coords.x-1
        if(targetTile.y > coords.y) newCoords.y = coords.y+1
        if(targetTile.y < coords.y) newCoords.y = coords.y-1
        
        if (!crossesShieldWall(coords, newCoords)) {
            caller.coordinates = newCoords;
        }

        // if(laneDiff === 1 || laneDiff === -1){
        //     if(distanceToTarget === 0){
        //         if(caller.depth !== 0) caller.depth--
        //     } else if(distanceToTarget === 1){
        //         if(laneDiff === 1){
        //             caller.position++
        //         } else if(laneDiff === -1){
        //             caller.position--
        //         }
        //     }
        // } else if(laneDiff < -1){
        //     caller.position--
        // } else if(laneDiff > 1){
        //     caller.position++
        // } else if(laneDiff === 0 && distanceToTarget === 1){
        //     return
        // }


        // if((distanceToTarget < 0 && laneDiff) !== 0 ||  
        // (distanceToTarget < -1 && laneDiff === 0 && caller.depth > 1)){
        //     caller.depth++
        // }else if(distanceToTarget === -1 && laneDiff === 0){
        //     if(caller.depth > 1) caller.depth += 2
        // } else if(distanceToTarget === 2){
        //     caller.depth--
        // } else if(distanceToTarget > 2){
        //     caller.depth -= 2
        // }
    },
    stayOnBackRow: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        const distanceToTarget = Methods.getDistanceToTarget(caller, enemyTarget), // eslint-disable-line no-unused-vars
        laneDiff = Methods.getLaneDifferenceToTarget(caller, enemyTarget)

        if(enemyTarget){
            if(laneDiff > 0){
                caller.position ++
            } else if(laneDiff < 0){
                caller.position --
            }
            // if(laneDiff === 1 || laneDiff === -1){
            //     caller.position = enemyTarget.position;
            // } else if(laneDiff < -1){
            //     caller.position-= 2
            // } else if(laneDiff > 1){
            //     caller.position+= 2
            // } else if(laneDiff === 0 && distanceToTarget === 1){
            //     return
            // }
        } else {
            if(caller.position > 2){
                caller.position --
            } else if(caller.position < 2){
                caller.position ++
            }
        }
        if(caller.depth > 0){
            caller.depth -= 1
        } else {
            caller.depth = 0;
        }

        caller.coordinates.y = caller.position
        caller.coordinates.x = caller.depth
    },
    stayOnX1: (caller, combatants) => {
        const enemyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        const distanceToTarget = Methods.getDistanceToTarget(caller, enemyTarget),
        laneDiff = Methods.getLaneDifferenceToTarget(caller, enemyTarget)

        if(laneDiff === 1 || laneDiff === -1){
            caller.position = enemyTarget.position;
        } else if(laneDiff < -1){
            caller.position-= 2
        } else if(laneDiff > 1){
            caller.position+= 2
        } else if(laneDiff === 0 && distanceToTarget === 1){
            return
        }
        caller.depth = 1;
        caller.coordinates.y = caller.position
        caller.coordinates.x = caller.depth
    },
    moveTowardsCloseFriendlyTarget: (caller, combatants) => {
        const friendlyTarget = Object.values(combatants).find(e=>e.id === caller.targetId)
        if(!friendlyTarget) return

        const liveCombatants = Object.values(combatants).filter(e => !e.dead)

        const callerDepth = (caller.coordinates && typeof caller.coordinates.x === 'number') ? caller.coordinates.x : caller.depth;
        const callerLane = (caller.coordinates && typeof caller.coordinates.y === 'number') ? caller.coordinates.y : caller.position;
        const targetDepth = (friendlyTarget.coordinates && typeof friendlyTarget.coordinates.x === 'number') ? friendlyTarget.coordinates.x : friendlyTarget.depth;
        const targetLane = (friendlyTarget.coordinates && typeof friendlyTarget.coordinates.y === 'number') ? friendlyTarget.coordinates.y : friendlyTarget.position;

        let newDepth = callerDepth;
        let newPosition = callerLane;

        const dx = targetDepth - callerDepth;
        const dy = targetLane - callerLane;
        const manhattan = Math.abs(dx) + Math.abs(dy);

        const finalize = () => {
            if(newPosition < 0) newPosition = 0
            if(newPosition > MAX_LANES - 1) newPosition = MAX_LANES - 1;
            if(newDepth < 0) newDepth = 0
            if(newDepth > MAX_DEPTH) newDepth = MAX_DEPTH;

            caller.depth = newDepth;
            caller.position = newPosition;

            if (!caller.coordinates) caller.coordinates = { x: caller.depth, y: caller.position };
            caller.coordinates.x = caller.depth;
            caller.coordinates.y = caller.position;
        }

        // Already orthogonally adjacent to friendly target.
        if (manhattan === 1) {
            return;
        }

        // If diagonally adjacent, convert into orthogonal adjacency.
        if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
            newPosition = targetLane;
            newDepth = (callerDepth <= targetDepth) ? targetDepth - 1 : targetDepth + 1;
        } else {
            if (dy < 0) newPosition = callerLane - 1;
            if (dy > 0) newPosition = callerLane + 1;

            if (dx < 0) newDepth = callerDepth - 1;
            if (dx > 0) newDepth = callerDepth + 1;
        }

        const occupied = (x, y) => liveCombatants.some(e => {
            if (e.id === caller.id) return false;
            const ex = (e.coordinates && typeof e.coordinates.x === 'number') ? e.coordinates.x : e.depth;
            const ey = (e.coordinates && typeof e.coordinates.y === 'number') ? e.coordinates.y : e.position;
            return ex === x && ey === y;
        });

        if (occupied(newDepth, newPosition)) {
            if (!occupied(newDepth, newPosition - 1)) {
                newPosition = newPosition - 1;
            } else if (!occupied(newDepth, newPosition + 1)) {
                newPosition = newPosition + 1;
            } else {
                newDepth = callerDepth;
                newPosition = callerLane;
            }
        }

        finalize();
    }
}