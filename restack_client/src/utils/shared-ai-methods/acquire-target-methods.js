// src/utils/shared-ai-methods/acquire-target-methods.js
// Methods for monster, minion, and fighter target acquisition (shared).

import { Methods } from './basic-methods';

const MAX_DEPTH = 7; // eslint-disable-line no-unused-vars
const MAX_LANES = 5; // eslint-disable-line no-unused-vars

const TARGETING_TUNING = {
    PRESSURE_WEIGHT: 1.25,
    NON_SOFT_PENALTY: 0.2,
    SCORE_RANDOM_WINDOW: 0.9,
    SAME_COLUMN_DISTANCE_TOLERANCE: 2,
    SPREAD_DISTANCE_WINDOW: 1,
    PRESSURE_BUCKET_WINDOW: 1,
};

const getSurroundings = (coords) => { // eslint-disable-line no-unused-vars
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

const someoneIsInCoords = function(coords) { // eslint-disable-line no-unused-vars
    return Object.values(this.combatants).some(e => {
        try {
            if (!e) return false;
            if (e.coordinates && JSON.stringify(e.coordinates) === JSON.stringify(coords)) return true;
            if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => JSON.stringify(c) === JSON.stringify(coords));
            return false;
        } catch (err) { return false; }
    });
};

const someoneElseIsInCoords = function(caller, coords) { // eslint-disable-line no-unused-vars
    return Object.values(this.combatants).filter(c => c.id !== caller.id).some(e => {
        try {
            if (!e) return false;
            if (e.coordinates && JSON.stringify(e.coordinates) === JSON.stringify(coords)) return true;
            if (Array.isArray(e.occupiedCoords)) return e.occupiedCoords.some(c => JSON.stringify(c) === JSON.stringify(coords));
            return false;
        } catch (err) { return false; }
    });
};

export const AcquireTargetMethods = {
    _distanceToTarget: (caller, target) => {
        const getDistanceToTarget = (caller.Methods && caller.Methods.getDistanceToTarget)
            ? caller.Methods.getDistanceToTarget
            : Methods.getDistanceToTarget;
        if (getDistanceToTarget) return Math.abs(getDistanceToTarget(caller, target));
        return Math.abs(target.coordinates.x - caller.coordinates.x) + Math.abs(target.coordinates.y - caller.coordinates.y);
    },

    _pressureScore: (caller, target, combatants) => {
        if (!Array.isArray(target.targettedBy) || target.targettedBy.length === 0) return 0;
        const callerIsMonsterOrMinion = caller.isMonster || caller.isMinion;
        return target.targettedBy.reduce((count, targetterId) => {
            if (!targetterId || targetterId === caller.id) return count;
            const source = combatants[targetterId];
            if (!source || source.dead) return count;
            const sourceIsMonsterOrMinion = source.isMonster || source.isMinion;
            if (callerIsMonsterOrMinion === sourceIsMonsterOrMinion) return count + 1;
            return count;
        }, 0);
    },

    _pickSpreadTarget: (caller, candidates, combatants, softClassSet = null) => {
        if (!Array.isArray(candidates) || candidates.length === 0) return null;

        const scored = candidates.map(enemy => {
            const distance = AcquireTargetMethods._distanceToTarget(caller, enemy);
            const pressure = AcquireTargetMethods._pressureScore(caller, enemy, combatants);
            const softPenalty = softClassSet && !softClassSet.has(enemy.type) ? TARGETING_TUNING.NON_SOFT_PENALTY : 0;
            // Distance stays primary, but pressure introduces spread among similarly viable targets.
            const score = distance + (pressure * TARGETING_TUNING.PRESSURE_WEIGHT) + softPenalty;
            return { enemy, distance, pressure, score };
        }).sort((a, b) => a.score - b.score);

        const minDistance = Math.min(...scored.map(item => item.distance));
        const nearDistance = scored.filter(item => item.distance <= minDistance + TARGETING_TUNING.SPREAD_DISTANCE_WINDOW);

        // If multiple targets are similarly near, prefer the least-pressured bucket to spread aggro.
        const spreadBalanced = nearDistance.length > 1
            ? (() => {
                const minPressure = Math.min(...nearDistance.map(item => item.pressure));
                const pressureBucket = nearDistance.filter(item => item.pressure <= minPressure + TARGETING_TUNING.PRESSURE_BUCKET_WINDOW);
                return pressureBucket.length > 0 ? pressureBucket : nearDistance;
            })()
            : scored;

        const bestScore = spreadBalanced[0].score;
        // Keep slight randomness among near-equivalent choices to prevent hard lock.
        const viable = spreadBalanced.filter(item => item.score <= bestScore + TARGETING_TUNING.SCORE_RANDOM_WINDOW);
        const randomPick = viable[Math.floor(Math.random() * viable.length)];
        return randomPick.enemy;
    },

    // Find the closest enemy (not dead, not self)
    acquireClosestEnemy: (caller, combatants) => {
        // For monsters/minions: enemies are not monsters/minions. For fighters: enemies are monsters/minions.
        const isMonsterOrMinion = caller.isMonster || caller.isMinion;
        // Exclude VCTs from possible targets
        const enemies = Object.values(combatants).filter(e => {
            if (isMonsterOrMinion) {
                return !e.dead && !e.invisible && e.id !== caller.id && !e.isMonster && !e.isMinion;
            } else {
                return !e.dead && !e.invisible && e.id !== caller.id && (e.isMonster || e.isMinion);
            }
        });
        if (enemies.length === 0) return null;
        return AcquireTargetMethods._pickSpreadTarget(caller, enemies, combatants, null);
    },

    // Prioritize closest 'soft' target (wizard, sage, rogue), fallback to closest enemy
    acquireClosestSoftTarget: (caller, combatants) => {
        const SOFT_CLASSES = ['wizard', 'sage', 'rogue'];
        const SOFT_CLASS_SET = new Set(SOFT_CLASSES);
        const isMonsterOrMinion = caller.isMonster || caller.isMinion;
        // Exclude VCTs from possible targets
        const enemies = Object.values(combatants).filter(e => {
            if (isMonsterOrMinion) {
                return !e.dead && !e.invisible && e.id !== caller.id && !e.isMonster && !e.isMinion;
            } else {
                return !e.dead && !e.invisible && e.id !== caller.id && (e.isMonster || e.isMinion);
            }
        });
        if (enemies.length === 0) return null;

        // First, filter to soft targets.
        const softTargets = enemies.filter(e => SOFT_CLASS_SET.has(e.type));
        if (softTargets.length === 0) {
            return AcquireTargetMethods._pickSpreadTarget(caller, enemies, combatants, null);
        }

        // Keep soft targets preferred, but include same-column non-soft units when
        // they are not significantly farther away than the closest soft target.
        const nearestSoftDistance = Math.min(...softTargets.map(target => AcquireTargetMethods._distanceToTarget(caller, target)));
        const nonSoftSameColumnViable = enemies.filter(enemy => {
            if (SOFT_CLASS_SET.has(enemy.type)) return false;
            const distance = AcquireTargetMethods._distanceToTarget(caller, enemy);
            const sharesColumnWithSoft = softTargets.some(soft => soft.coordinates.x === enemy.coordinates.x);
            return sharesColumnWithSoft && distance <= nearestSoftDistance + TARGETING_TUNING.SAME_COLUMN_DISTANCE_TOLERANCE;
        });

        const candidateMap = new Map();
        [...softTargets, ...nonSoftSameColumnViable].forEach(enemy => candidateMap.set(enemy.id, enemy));
        const candidates = Array.from(candidateMap.values());

        return AcquireTargetMethods._pickSpreadTarget(caller, candidates, combatants, SOFT_CLASS_SET);
    },
};
