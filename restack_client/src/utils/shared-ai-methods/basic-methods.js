export const getSurroundings = (coords) => {
    const N = { x: coords.x, y: coords.y - 1 },
        S = { x: coords.x, y: coords.y + 1 },
        W = { x: coords.x - 1, y: coords.y },
        E = { x: coords.x + 1, y: coords.y },
        NW = { x: coords.x - 1, y: coords.y - 1 },
        NE = { x: coords.x + 1, y: coords.y - 1 },
        SW = { x: coords.x - 1, y: coords.y + 1 },
        SE = { x: coords.x + 1, y: coords.y + 1 };
    return { N, S, E, W, NW, NE, SW, SE };
};
export const Methods = {
    getLaneDifferenceToTarget: (caller, target) => {
        if(!target) return 0;
        let d =  target.coordinates.y - caller.coordinates.y
        return d
    },
    getDistanceToTarget: (caller, target) => {
        if(!target) return 0;
        // Use coordinates.x (current system); fall back to legacy .depth if coordinates not set
        const callerX = (caller.coordinates && typeof caller.coordinates.x === 'number') ? caller.coordinates.x : (caller.depth || 0);
        const targetX = (target.coordinates && typeof target.coordinates.x === 'number') ? target.coordinates.x : (target.depth || 0);
        return targetX - callerX;
        // 0 = same tile
        // 1 = 1 tile in front
        // -1 = 1 tile behind
    },
    pickRandom: (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    },
    isAnEnemyDirectlyInFrontOfMe: (caller, combatants) => {
        // needs to be reconfigured for mnonsters
        
        if(!combatants) return false
        const liveEnemies = Object.values(combatants).filter(e => (e.isMonster || e.isMinion) && !e.dead),
        directlyInFront = liveEnemies.some(e=>e.depth === caller.depth + 1 && e.position === caller.position);
        return directlyInFront ? liveEnemies.find(e=>e.depth === caller.depth + 1 && e.position === caller.position) : null;
    }
}