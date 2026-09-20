import { MonsterManager } from '../../utils/monster-manager';

const monsterManager = new MonsterManager();

describe('Aggressive Monster System Tests', () => {
    test('monsterManager correctly identifies aggro monsters', () => {
        expect(monsterManager.monsters['goblin_thief']?.aggro).toBe(true);
        expect(monsterManager.monsters['goblin_warchief']?.aggro).toBe(true);
        // Non-aggro monster test
        if (monsterManager.monsters['goblin_scout']) {
            expect(monsterManager.monsters['goblin_scout']?.aggro).not.toBe(true);
        }
    });

    test('Orthogonal vs Diagonal adjacency distance calculation', () => {
        const playerPos = [5, 5];

        const isOrthogonalAdjacent = (pos1, pos2) => {
            const dx = Math.abs(pos1[0] - pos2[0]);
            const dy = Math.abs(pos1[1] - pos2[1]);
            return (dx + dy === 1);
        };

        // Directly North: [4, 5] -> dx=1, dy=0 -> dx+dy=1
        expect(isOrthogonalAdjacent(playerPos, [4, 5])).toBe(true);
        // Directly South: [6, 5] -> dx=1, dy=0 -> dx+dy=1
        expect(isOrthogonalAdjacent(playerPos, [6, 5])).toBe(true);
        // Directly West: [5, 4] -> dx=0, dy=1 -> dx+dy=1
        expect(isOrthogonalAdjacent(playerPos, [5, 4])).toBe(true);
        // Directly East: [5, 6] -> dx=0, dy=1 -> dx+dy=1
        expect(isOrthogonalAdjacent(playerPos, [5, 6])).toBe(true);

        // Diagonal North-West: [4, 4] -> dx=1, dy=1 -> dx+dy=2
        expect(isOrthogonalAdjacent(playerPos, [4, 4])).toBe(false);
        // Diagonal North-East: [4, 6] -> dx=1, dy=1 -> dx+dy=2
        expect(isOrthogonalAdjacent(playerPos, [4, 6])).toBe(false);
        // Diagonal South-West: [6, 4] -> dx=1, dy=1 -> dx+dy=2
        expect(isOrthogonalAdjacent(playerPos, [6, 4])).toBe(false);
        // Diagonal South-East: [6, 6] -> dx=1, dy=1 -> dx+dy=2
        expect(isOrthogonalAdjacent(playerPos, [6, 6])).toBe(false);

        // 2 steps away North: [3, 5] -> dx=2, dy=0 -> dx+dy=2
        expect(isOrthogonalAdjacent(playerPos, [3, 5])).toBe(false);
    });
});
