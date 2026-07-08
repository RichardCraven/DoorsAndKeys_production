// const getLaneDifferenceToTarget = (caller, target) => {
//     if(!target) return 0;
//     let d =  target.coordinates.y - caller.coordinates.y
//     return d
// }
// const getDistanceToTarget =  (caller, target) => {
//     if(!target) return 0;
//     let d = target.depth - caller.depth
//     return d
//     // 0 = same tile
//     // 1 = 1 tile in front
//     // -1 = 1 tile behind
// }
// const pickRandom = (array) => {
//     let index = Math.floor(Math.random() * array.length)
//     return array[index]
// }
// const isAnEnemyDirectlyInFrontOfMe = (caller, combatants) => {
//     if(!combatants) return false
//     const liveEnemies = Object.values(combatants).filter(e=>e.isMonster || e.isMinion && !e.dead),
//     directlyInFront = liveEnemies.some(e=>e.depth === caller.depth + 1 && e.coordinates.y === caller.coordinates.y);
//     return directlyInFront ? liveEnemies.find(e=>e.depth === caller.depth + 1 && e.coordinates.y === caller.coordinates.y) : null;
// }

// export default Methods = { _
export const Methods = {
    getLaneDifferenceToTarget: (caller, target) => {
        // console.log('basic lane diff');
        if(!target) return 0;
        let d =  target.coordinates.y - caller.coordinates.y
        // console.log('target.coordinates.y', target.coordinates.y, '-', caller.coordinates.y, 'caller.coordinates.y' );
        // console.log('result', d);
        return d
    },
    getDistanceToTarget: (caller, target) => {
        if(!target) return 0;
        let d = target.coordinates.x - caller.coordinates.x
        return d
        // 0 = same tile
        // 1 = 1 tile in front
        // -1 = 1 tile behind
    },
    pickRandom: (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    },
    isAnEnemyDirectlyInFrontOfMe: (caller, combatants) => {
        console.log('need to make this agnostic');
        debugger
        if(!combatants) return false
        const liveEnemies = Object.values(combatants).filter(e=>e.isMonster || (e.isMinion && !e.dead)),
        directlyInFront = liveEnemies.some(e=>e.coordinates.x === caller.depth + 1 && e.coordinates.y === caller.coordinates.y);
        return directlyInFront ? liveEnemies.find(e=>e.depth === caller.depth + 1 && e.coordinates.y === caller.coordinates.y) : null;
    },
    isFriendly: (e) => {
        return !e.isMonster && !e.isMinion;
    },
    getFriendlies: (caller, combatants) => {
        return Object.values(combatants).filter(e=>!e.isMonster && !e.isMinion && e.name !== caller.name);
    },
    isEnemy: (e) => {
        return e.isMonster|| e.isMinion;
    },
    getEnemies: (combatants) => {
        return Object.values(combatants).filter(e=>e.isMonster|| e.isMinion);
    },
    isFriendlyAtCoordinates: (coords, friendlies) => {
        // console.log('coords: ', coords, 'friendlies: ', friendlies, 'blocked: ', friendlies.some(e=>e.coordinates.x === coords.x && e.coordinates.y === coords.y));
        // console.log('friendlies: ', friendlies);
        return friendlies.some(e=>e.coordinates.x === coords.x && e.coordinates.y === coords.y)
    },
}