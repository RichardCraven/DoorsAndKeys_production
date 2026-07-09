import { crossesShieldWall } from './movement-methods';

// Shared helpers for monster AI targeting/range/animation origin.
// Designed to mirror Mummy's VCT + occupied-tile logic so new monster profiles
// can include this once and avoid custom per-profile implementations.

export const MonsterTargetingHelpers = {
    getOccupiedTiles: (caller) => {
        if (Array.isArray(caller?.occupiedCoords) && caller.occupiedCoords.length > 0) return caller.occupiedCoords;
        if (Array.isArray(caller?.occupiedTiles) && caller.occupiedTiles.length > 0) return caller.occupiedTiles;
        return caller?.coordinates ? [caller.coordinates] : [];
    },

    // Resolve all occupied tiles for a combatant, including VCT -> parent indirection.
    getCombatantTiles: (combatant, combatants) => {
        if (!combatant) return [];

        if (combatant.isVCT && combatant.parentMonsterId && combatants && combatants[combatant.parentMonsterId]) {
            const parent = combatants[combatant.parentMonsterId];
            if (Array.isArray(parent?.occupiedCoords) && parent.occupiedCoords.length > 0) return parent.occupiedCoords;
            if (Array.isArray(parent?.occupiedTiles) && parent.occupiedTiles.length > 0) return parent.occupiedTiles;
            return parent?.coordinates ? [parent.coordinates] : [];
        }

        if (Array.isArray(combatant?.occupiedCoords) && combatant.occupiedCoords.length > 0) return combatant.occupiedCoords;
        if (Array.isArray(combatant?.occupiedTiles) && combatant.occupiedTiles.length > 0) return combatant.occupiedTiles;
        return combatant?.coordinates ? [combatant.coordinates] : [];
    },

    resolveTarget: (caller, combatants) => {
        if (!caller || !combatants || !caller.targetId) return null;

        let target = combatants[caller.targetId] || Object.values(combatants).find((e) => e && e.id === caller.targetId);

        // Redirect VCT targets to their parent combatant so attack/range checks use
        // the real unit (Mummy-style behavior).
        if (target && target.isVCT && target.parentMonsterId && combatants[target.parentMonsterId]) {
            target = combatants[target.parentMonsterId];
            caller.targetId = target ? target.id : null;
        }

        if (!target || target.dead || target.isVCT) return null;
        return target;
    },

    getDistanceToTarget: (caller, target) => {
        const occupiedTiles = MonsterTargetingHelpers.getOccupiedTiles(caller);
        if (!target || !target.coordinates || occupiedTiles.length === 0) return Infinity;

        return Math.min(...occupiedTiles.map((tile) => (
            Math.abs(tile.x - target.coordinates.x) + Math.abs(tile.y - target.coordinates.y)
        )));
    },

    isTargetInRange: (caller, target, attack) => {
        if (!caller || !target || !attack) return false;

        // Monsters/minions cannot target/attack through a Shield Wall
        if ((caller.isMonster || caller.isMinion) && caller.coordinates && target.coordinates) {
            const callerTiles = MonsterTargetingHelpers.getOccupiedTiles(caller);
            const targetTiles = (Array.isArray(target.occupiedCoords) && target.occupiedCoords.length > 0)
                ? target.occupiedCoords
                : [target.coordinates];
            const hasPath = callerTiles.some(cc => 
                targetTiles.some(tc => cc && tc && !crossesShieldWall(cc, tc))
            );
            if (!hasPath) return false;
        }

        const attackRange = attack.range || 'close';
        const dist = MonsterTargetingHelpers.getDistanceToTarget(caller, target);

        if (attackRange === 'close') return dist === 1;
        if (attackRange === 'medium') return dist <= 3;
        return dist <= 6;
    },

    getBestAttackSourceTile: (caller, target) => {
        const occupiedTiles = MonsterTargetingHelpers.getOccupiedTiles(caller);
        if (!target || !target.coordinates || occupiedTiles.length === 0) return caller.coordinates;

        let best = occupiedTiles[0];
        let minDist = Infinity;

        occupiedTiles.forEach((tile) => {
            const d = Math.abs(tile.x - target.coordinates.x) + Math.abs(tile.y - target.coordinates.y);
            if (d < minDist) {
                minDist = d;
                best = tile;
            }
        });

        return best;
    },

    // Generic line-of-sight helper for attacks that fire along a forward lane.
    // Returns enemy combatants in one or more target lanes, sorted from nearest
    // to furthest in caller-facing direction.
    getForwardLineTargets: (caller, target, combatants, options = {}) => {
        if (!caller || !target || !combatants || !caller.coordinates) {
            return {
                lineTargets: [],
                targetTiles: [],
                targetLanes: [],
                facingRight: true,
            };
        }

        const {
            // Default to selecting enemy fighters (non-monster, non-minion).
            candidateFilter = (e) => !e?.dead && !e?.isVCT && !e?.isMonster && !e?.isMinion,
        } = options;

        const targetTiles = MonsterTargetingHelpers.getCombatantTiles(target, combatants);
        if (targetTiles.length === 0) {
            return {
                lineTargets: [],
                targetTiles: [],
                targetLanes: [],
                facingRight: true,
            };
        }

        const primaryTargetTile = targetTiles.reduce((best, tile) => {
            if (!best) return tile;
            const bestDx = Math.abs((best.x || 0) - caller.coordinates.x);
            const tileDx = Math.abs((tile.x || 0) - caller.coordinates.x);
            return tileDx < bestDx ? tile : best;
        }, null);

        const facingRight = !!primaryTargetTile && primaryTargetTile.x >= caller.coordinates.x;
        const targetLaneSet = new Set(targetTiles.map((tile) => tile.y));

        const lineTargets = Object.values(combatants).filter((combatant) => {
            if (!candidateFilter(combatant)) return false;

            const tiles = MonsterTargetingHelpers.getCombatantTiles(combatant, combatants);
            if (tiles.length === 0) return false;

            const intersectsTargetLane = tiles.some((tile) => targetLaneSet.has(tile.y));
            if (!intersectsTargetLane) return false;

            if (facingRight) return tiles.some((tile) => tile.x > caller.coordinates.x);
            return tiles.some((tile) => tile.x < caller.coordinates.x);
        });

        lineTargets.sort((a, b) => {
            const aTiles = MonsterTargetingHelpers.getCombatantTiles(a, combatants);
            const bTiles = MonsterTargetingHelpers.getCombatantTiles(b, combatants);
            const aX = facingRight ? Math.min(...aTiles.map((tile) => tile.x)) : Math.max(...aTiles.map((tile) => tile.x));
            const bX = facingRight ? Math.min(...bTiles.map((tile) => tile.x)) : Math.max(...bTiles.map((tile) => tile.x));
            return facingRight ? (aX - bX) : (bX - aX);
        });

        return {
            lineTargets,
            targetTiles,
            targetLanes: Array.from(targetLaneSet),
            facingRight,
        };
    },
};
