// shared-ai-methods/behaviors.js
// Abstraction for shared AI behaviors

/**
 * Handles the logic for the 'attackFromTheBack' behavior sequence.
 * @param {object} caller - The AI-controlled unit (e.g., Monk)
 * @param {object} combatants - All combatants in the battle
 * @param {object} data - Data and utility methods passed to the AI profile
 */
function attackFromTheBack(caller, combatants, data) {
    if(caller.type === 'monk'){
        
    }
    // Acquire all live enemies
    const liveEnemies = Object.values(combatants).filter(e => !e.dead && (e.isMonster || e.isMinion));
    if (liveEnemies.length === 0) return;

    // If already orthogonally adjacent to an enemy and a close-range attack is
    // available (or pending), there is nothing to be gained by repositioning —
    // skip the entire movement block so the Monk attacks in place rather than
    // shuffling away and back each tick.
    const alreadyAdjacentEnemy = liveEnemies.find(e => {
        const dx = Math.abs(e.coordinates.x - caller.coordinates.x);
        const dy = Math.abs(e.coordinates.y - caller.coordinates.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    });
    if (alreadyAdjacentEnemy) {
        const pendingRange = caller.pendingAttack && caller.pendingAttack.range;
        if (pendingRange === 'close' || !pendingRange) {
            // Lock onto this enemy and stop — no movement needed
            caller.targetId = alreadyAdjacentEnemy.id;
            if (typeof data.chooseAttackType === 'function') {
                caller.pendingAttack = data.chooseAttackType(caller, alreadyAdjacentEnemy);
            }
            return;
        }
    }

    const isOccupied = (coords) => {
        // Prefer combat-manager-provided helper when available
        if (data && data.methods && typeof data.methods.someoneIsInCoords === 'function') {
            try { return !!data.methods.someoneIsInCoords(coords, combatants); } catch (e) {}
        }
        // Fallback: check both direct coordinates and occupiedCoords arrays
        return Object.values(combatants).some(e => {
            try {
                if (!e) return false;
                if (e.coordinates && e.coordinates.x === coords.x && e.coordinates.y === coords.y) return true;
                if (Array.isArray(e.occupiedCoords) && e.occupiedCoords.some(c => c.x === coords.x && c.y === coords.y)) return true;
                return false;
            } catch (err) { return false; }
        });
    }

    // If the Monk is already to the right of (or at the same column as) all
    // enemies, it's in the backline. Just close the gap toward the nearest enemy
    // rather than trying to get further right — desiredX would be out of bounds.
    const maxEnemyX = Math.max(...liveEnemies.map(e => e.coordinates.x));
    if (caller.coordinates.x >= maxEnemyX) {
        // Already behind the pack — close the gap and face left to attack
        if (data.methods && typeof data.methods.closeTheGap === 'function') {
            data.methods.closeTheGap(caller, combatants);
        }
        // Try to acquire a target that is now adjacent
        const sortedByProximity = [...liveEnemies].sort((a, b) => {
            const da = Math.abs(a.coordinates.x - caller.coordinates.x) + Math.abs(a.coordinates.y - caller.coordinates.y);
            const db = Math.abs(b.coordinates.x - caller.coordinates.x) + Math.abs(b.coordinates.y - caller.coordinates.y);
            return da - db;
        });
        const nearest = sortedByProximity[0];
        if (nearest) {
            caller.targetId = nearest.id;
            if (typeof data.chooseAttackType === 'function') {
                caller.pendingAttack = data.chooseAttackType(caller, nearest);
            }
        }
        return;
    }

    // Try to find a target where caller can get to their back (right side)
    let foundBackTarget = false;
    // Sort enemies by depth (closest to front)
    const sortedByDepth = [...liveEnemies].sort((a, b) => a.depth - b.depth);

    for (const enemy of sortedByDepth) {
        const desiredX = enemy.coordinates.x + 1;
        const desiredY = enemy.coordinates.y;
        // MAX_DEPTH is passed as NUM_COLUMNS (8), but the valid max index is MAX_DEPTH-1 (7).
        // Use <= MAX_DEPTH - 1 so a monster at x=7 is not excluded.
        const isWithinBounds = desiredX <= data.MAX_DEPTH - 1;
        // Prefer AI helper that knows about occupiedCoords / virtual occupancy
        // Prefer AI helper that knows about occupiedCoords / virtual occupancy
        const occupied = isOccupied({ x: desiredX, y: desiredY });
        // If the desired tile is within bounds and not occupied (including virtual occupancy), consider it
        if (isWithinBounds && !occupied) {
            // Move only one space per turn toward the desired position
            const dx = desiredX - caller.coordinates.x;
            const dy = desiredY - caller.coordinates.y;
            let nextX = caller.coordinates.x;
            let nextY = caller.coordinates.y;
            if (dx !== 0) {
                nextX += Math.sign(dx);
            } else if (dy !== 0) {
                nextY += Math.sign(dy);
            }
            // Only move if the next tile is not occupied
            const nextOccupied = isOccupied({ x: nextX, y: nextY });
            if (!nextOccupied) {
                // move caller one step toward desired spot
                caller.coordinates.x = nextX;
                caller.coordinates.y = nextY;
            } else {
                // next tile is occupied (including virtual occupancy) - skip move
            }
            // Only set a pending attack if the caller is now adjacent to the enemy
            const adjX = Math.abs(caller.coordinates.x - enemy.coordinates.x);
            const adjY = Math.abs(caller.coordinates.y - enemy.coordinates.y);
                if (adjX <= 1 && adjY === 0) {
                    if (typeof data.chooseAttackType === 'function') {
                        caller.pendingAttack = data.chooseAttackType(caller, enemy);
                    }
                } else {
                    // not in range after move
                }
            caller.targetId = enemy.id;
            foundBackTarget = true;
            break;
        }
    }
    if (!foundBackTarget) {
        // Prioritize enemies closest to the back line (highest x)
        const sortedByBack = [...liveEnemies].sort((a, b) => b.coordinates.x - a.coordinates.x);
        let placed = false;
            for (const enemy of sortedByBack) {
                // fallback: evaluating enemy
            // Try to move above or below the enemy if can't go past their column
            const aboveY = enemy.coordinates.y - 1;
            const belowY = enemy.coordinates.y + 1;
            const x = enemy.coordinates.x;
            // Try above (move only one space per turn)
            if (aboveY >= 0 && !isOccupied({ x, y: aboveY })) {
                // Move caller one space toward aboveY if not already there
                let nextY = caller.coordinates.y;
                if (nextY > aboveY) {
                    nextY -= 1;
                } else if (nextY < aboveY) {
                    nextY += 1;
                } else {
                    nextY = aboveY;
                }
                if (!isOccupied({ x, y: nextY })) {
                    // place caller above enemy
                    caller.coordinates.x = x;
                    caller.coordinates.y = nextY;
                } else {
                    // desired above position occupied
                }
                // Only set pending attack if in adjacency after placement
                if (Math.abs(caller.coordinates.x - enemy.coordinates.x) <= 1 && Math.abs(caller.coordinates.y - enemy.coordinates.y) === 0) {
                    if (typeof data.chooseAttackType === 'function') {
                        caller.pendingAttack = data.chooseAttackType(caller, enemy);
                    }
                    // pendingAttack set after above placement
                } else {
                    // not adjacent after above placement
                }
                caller.targetId = enemy.id;
                placed = true;
                break;
            }
            // Try below (move only one space per turn)
            if (belowY < data.MAX_LANES && !isOccupied({ x, y: belowY })) {
                let nextY = caller.coordinates.y;
                if (nextY < belowY) {
                    nextY += 1;
                } else if (nextY > belowY) {
                    nextY -= 1;
                } else {
                    nextY = belowY;
                }
                if (!isOccupied({ x, y: nextY })) {
                    // place caller below enemy
                    caller.coordinates.x = x;
                    caller.coordinates.y = nextY;
                } else {
                    // desired below position occupied
                }
                if (Math.abs(caller.coordinates.x - enemy.coordinates.x) <= 1 && Math.abs(caller.coordinates.y - enemy.coordinates.y) === 0) {
                    if (typeof data.chooseAttackType === 'function') {
                        caller.pendingAttack = data.chooseAttackType(caller, enemy);
                    }
                    // pendingAttack set after below placement
                } else {
                    // not adjacent after below placement
                }
                caller.targetId = enemy.id;
                placed = true;
                break;
            }
        }
        // If still not placed, check if the Monk is already adjacent to any enemy
        // (i.e. surrounded). If so, target that enemy and attack in place rather
        // than trying to reposition — this prevents the Monk from freezing when
        // every surrounding tile is occupied.
        if (!placed) {
            const adjacentEnemy = liveEnemies.find(e => {
                const dx = Math.abs(e.coordinates.x - caller.coordinates.x);
                const dy = Math.abs(e.coordinates.y - caller.coordinates.y);
                return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
            });
            const enemy = adjacentEnemy || sortedByBack[0];
            if (typeof data.chooseAttackType === 'function') {
                caller.pendingAttack = data.chooseAttackType(caller, enemy);
            }
            caller.targetId = enemy.id;
            // Only attempt to reposition if we are NOT already adjacent —
            // if surrounded, closeTheGap will also fail (all tiles blocked) and
            // the call is wasteful; just stand and fight.
            if (!adjacentEnemy && data.methods && typeof data.methods.closeTheGap === 'function') {
                data.methods.closeTheGap(caller, combatants);
            }
        }
    }
    // No return value needed
}

module.exports = {
    attackFromTheBack,
};
