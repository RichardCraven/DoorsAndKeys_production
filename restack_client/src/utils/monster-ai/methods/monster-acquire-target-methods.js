// src/utils/monster-ai/methods/monster-acquire-target-methods.js
// Methods for monster and minion target acquisition.

import { Methods } from '../../shared-ai-methods/basic-methods';

const MAX_DEPTH = 7;
const MAX_LANES = 5;

const getSurroundings = (coords) => {
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

const someoneIsInCoords = function(coords) {
    return Object.values(this.combatants).some(e => {
        try {
            if (!e) return false;
            if (e.coordinates && JSON.stringify(e.coordinates) === JSON.stringify(coords)) return true;
            if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => JSON.stringify(c) === JSON.stringify(coords));
            return false;
        } catch (err) { return false; }
    });
};

const someoneElseIsInCoords = function(caller, coords) {
    return Object.values(this.combatants).filter(c => c.id !== caller.id).some(e => {
        try {
            if (!e) return false;
            if (e.coordinates && JSON.stringify(e.coordinates) === JSON.stringify(coords)) return true;
            if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => JSON.stringify(c) === JSON.stringify(coords));
            return false;
        } catch (err) { return false; }
    });
};

export const MonsterAcquireTargetMethods = {
    // Find the closest enemy (not dead, not self)
    acquireClosestEnemy: (caller, combatants) => {
        const enemies = Object.values(combatants).filter(e => !e.dead && e.id !== caller.id && !e.isMonster && !e.isMinion);
        if (enemies.length === 0) return null;
        // Prefer Methods from caller if available, else fallback to imported Methods
        let getDistanceToTarget = Methods.getDistanceToTarget;
        if (caller.Methods && typeof caller.Methods.getDistanceToTarget === 'function') {
            getDistanceToTarget = caller.Methods.getDistanceToTarget;
        }
        const sorted = enemies.sort((a, b) => {
            if (getDistanceToTarget) {
                return Math.abs(getDistanceToTarget(caller, a)) - Math.abs(getDistanceToTarget(caller, b));
            }
            return Math.abs(a.coordinates.x - caller.coordinates.x) + Math.abs(a.coordinates.y - caller.coordinates.y) -
                (Math.abs(b.coordinates.x - caller.coordinates.x) + Math.abs(b.coordinates.y - caller.coordinates.y));
        });
        return sorted[0];
    },

    // Prioritize closest 'soft' target (wizard, sage, rogue), fallback to closest enemy
    acquireClosestSoftTarget: (caller, combatants) => {
        const SOFT_CLASSES = ['wizard', 'sage', 'rogue'];
        const enemies = Object.values(combatants).filter(e => !e.dead && e.id !== caller.id && !e.isMonster && !e.isMinion);
        if (enemies.length === 0) return null;
        const getDistanceToTarget = (caller.Methods && caller.Methods.getDistanceToTarget) ? caller.Methods.getDistanceToTarget : Methods.getDistanceToTarget;
        // First, filter to soft targets
        const softTargets = enemies.filter(e => SOFT_CLASSES.includes(e.type));
        let candidates = softTargets.length > 0 ? softTargets : enemies;
        console.log('soft targets:', softTargets);
        const sorted = candidates.sort((a, b) => {
            if (getDistanceToTarget) {
                return Math.abs(getDistanceToTarget(caller, a)) - Math.abs(getDistanceToTarget(caller, b));
            }
            return Math.abs(a.coordinates.x - caller.coordinates.x) + Math.abs(a.coordinates.y - caller.coordinates.y) -
                (Math.abs(b.coordinates.x - caller.coordinates.x) + Math.abs(b.coordinates.y - caller.coordinates.y));
        });
        console.log('sorted targets:', sorted);
        return sorted[0];
    }
}
